import { CFG, rebate } from './config.ts';
import type { Intake, Option, OptionKey, Recommendation, EngineContext } from './types.ts';

/**
 * The deterministic core. Pure function: same Intake in -> same Recommendation out.
 * No I/O, no LLM, no randomness. This is the source of truth for every number.
 */
export function recommend(intake: Intake): Recommendation {
  const mult = intake.period === 'quarterly' ? 1 / 3 : 1;
  const impMo = intake.usageKwh * mult;
  const noSolar = intake.solarStatus === 'none';
  const expMo = (noSolar ? 0 : intake.exportKwh) * mult;
  const importRate = intake.importRateCents / 100;
  const fit = intake.fitCents / 100;
  const spread = Math.max(0, importRate - fit);
  const eveFrac = CFG.eveningFrac[intake.usageProfile] ?? 0.5;
  const eveningDay = (impMo * eveFrac) / 30;
  const daytimeUseDay = (impMo * (1 - eveFrac)) / 30;
  const existingSurplusDay = noSolar ? 0 : expMo / 30;
  const evNeedDay = (CFG.evAnnualKm / 100 * CFG.evKwhPer100) / 365;
  const evDaytime = intake.ev !== 'none' && intake.charge === 'daytime_home';

  const options: Option[] = [];
  let captureSurplusDay = existingSurplusDay;

  // --- SOLAR: install (none) or upgrade (have). Sets the surplus battery/EV can use. ---
  if (noSolar) {
    const target = daytimeUseDay + (evDaytime ? evNeedDay : 0);
    const recSolarKw = Math.min(13.2, Math.max(3, Math.round((target / CFG.genFactor) * 2) / 2));
    const genDay = recSolarKw * CFG.genFactor;
    const selfDay = Math.min(genDay, daytimeUseDay);
    const expDay = genDay - selfDay;
    const sSave = selfDay * 365 * importRate + expDay * 365 * fit;
    const sCost = recSolarKw * CFG.solarCostPerKw;
    captureSurplusDay = expDay;
    options.push({
      key: 'solar', name: `Install solar (~${recSolarKw} kW)`, cost: sCost, savingPerYear: sSave,
      paybackYears: sSave > 0 ? sCost / sSave : Infinity,
      reason: `You have no solar yet, so this is the foundation. A ~${recSolarKw} kW system generates ~${genDay.toFixed(1)} kWh/day; about ${selfDay.toFixed(1)} offsets daytime grid use at ${intake.importRateCents}c, the rest exports at ${intake.fitCents}c. Battery and EV charging only make sense once this is in.`,
    });
  } else {
    const addKw = Math.max(0, intake.addKw);
    const unmetDaytimeDay = Math.max(0, daytimeUseDay - existingSurplusDay);
    const extraGenDay = addKw * CFG.genFactor;
    const offsetDay = Math.min(extraGenDay, unmetDaytimeDay);
    const exportedExtraDay = extraGenDay - offsetDay;
    const solSaving = offsetDay * 365 * importRate + exportedExtraDay * 365 * fit;
    const solCost = addKw * CFG.solarCostPerKw;
    let solReason: string;
    if (addKw <= 0) solReason = 'Set "panels to add" to model a solar upgrade.';
    else if (unmetDaytimeDay < 0.5) solReason = `You already export a surplus (~${existingSurplusDay.toFixed(1)} kWh/day), so your daytime load is covered, and extra panels would mostly just export at ${intake.fitCents}c. Use the surplus you already have (e.g. charge an EV) before adding panels.`;
    else solReason = `About ${offsetDay.toFixed(1)} of the ~${extraGenDay.toFixed(1)} kWh/day from ${addKw} kW of new panels would offset daytime grid use at ${intake.importRateCents}c; the rest exports at ${intake.fitCents}c. Worth it when generation, not storage, is your constraint.`;
    options.push({
      key: 'solar', name: `Add ${addKw} kW more panels`, cost: solCost, savingPerYear: solSaving,
      paybackYears: solSaving > 0 ? solCost / solSaving : Infinity, reason: solReason,
    });
  }
  const seqNote = noSolar ? ' (assuming you install the recommended solar first)' : '';

  // --- BATTERY ---
  const shiftDay = Math.min(captureSurplusDay, eveningDay);
  const recKwh = Math.min(Math.max(shiftDay * 1.1, CFG.minBatteryKwh), 28);
  const crossesTaper = recKwh > 14;
  const batShiftDay = Math.min(shiftDay, recKwh * 0.9);
  const batSaving = batShiftDay * 365 * spread;
  const batCost = recKwh * CFG.batteryGrossPerKwh - rebate(recKwh);
  let batReason = `Shifts about ${batShiftDay.toFixed(1)} kWh/day of cheap daytime solar to cover evening use (you have ~${eveningDay.toFixed(1)} kWh/day evening load and ~${captureSurplusDay.toFixed(1)} kWh/day daytime surplus${seqNote}).`;
  if (eveningDay < 3) batReason = `Your evening use is small (~${eveningDay.toFixed(1)} kWh/day), so a battery has little to shift and can't save enough to pay back.`;
  else if (shiftDay < 0.5) batReason = `There's little daytime surplus to store${seqNote}, so a battery has nothing to shift yet.`;
  if (crossesTaper && batSaving > 0) batReason += ' Note: sizing past 14 kWh drops the rebate to 60% on the extra.';
  options.push({
    key: 'battery', name: `Add a battery (~${recKwh.toFixed(0)} kWh)`, cost: batCost, savingPerYear: batSaving,
    paybackYears: batSaving > 0 ? batCost / batSaving : Infinity, reason: batReason,
    extra: intake.goals.includes('backup') ? 'Also gives blackout backup (a non-$ reason some people value).' : null,
  });

  // --- EV DAYTIME CHARGING ---
  if (intake.ev !== 'none') {
    const chargeableDay = evDaytime ? Math.min(captureSurplusDay, evNeedDay) : 0;
    const evSaving = evDaytime ? chargeableDay * 365 * spread : 0;
    let evReason: string;
    if (evDaytime) evReason = `Fill the car from daytime solar instead of the grid: ~${chargeableDay.toFixed(1)} kWh/day${seqNote} avoids buying at ${intake.importRateCents}c, a ${(spread * 100).toFixed(0)}c/kWh saving (the car needs ~${evNeedDay.toFixed(1)} kWh/day).`;
    else if (intake.charge === 'night_home') evReason = 'Charging overnight pulls from the grid, not your solar, so a daytime charger saves nothing unless you shift charging to midday.';
    else evReason = "Charging away / on public chargers means your solar can't reach the car, so there's no solar-vs-grid saving from a home charger.";
    options.push({
      key: 'ev', name: 'EV charger (charge on daytime solar)', cost: CFG.evChargerCost, savingPerYear: evSaving,
      paybackYears: evSaving > 0 ? CFG.evChargerCost / evSaving : Infinity, reason: evReason,
      extra: intake.ev === 'buying' ? "You're about to buy an EV, so set the charging window to daytime to capture this." : null,
    });
  }

  // --- DO NOTHING (always a candidate) ---
  options.push({
    key: 'nothing', name: 'Do nothing (for now)', cost: 0, savingPerYear: 0, paybackYears: Infinity,
    reason: 'No option pays back well enough yet. The honest answer: wait, and re-check if your usage, an EV, or tariffs change.',
  });

  // --- RANK ---
  const doNothing = options.find((o) => o.key === 'nothing')!;
  const best = options.filter((o) => o.key !== 'nothing' && o.savingPerYear > 0).sort((a, b) => a.paybackYears - b.paybackYears)[0];
  let ordered: Option[];
  let winner: OptionKey;
  if (noSolar) {
    const solarOpt = options.find((o) => o.key === 'solar')!;
    const others = options.filter((o) => o.key !== 'nothing' && o.key !== 'solar').sort((a, b) => a.paybackYears - b.paybackYears);
    const recNothing = !(solarOpt.savingPerYear > 0 && solarOpt.paybackYears <= 12);
    winner = recNothing ? 'nothing' : 'solar';
    ordered = recNothing ? [doNothing, solarOpt, ...others] : [solarOpt, ...others, doNothing];
  } else {
    const viable = options.filter((o) => o.key !== 'nothing' && o.savingPerYear > 0).sort((a, b) => a.paybackYears - b.paybackYears);
    const dead = options.filter((o) => o.key !== 'nothing' && o.savingPerYear <= 0);
    const recommendNothing = !best || best.paybackYears > 12;
    winner = recommendNothing ? 'nothing' : best.key;
    ordered = recommendNothing ? [doNothing, ...viable, ...dead] : [...viable, doNothing, ...dead];
  }

  const ctx: EngineContext = { noSolar, importRate, fit, spread, eveningDay, daytimeUseDay, captureSurplusDay, evNeedDay };
  return { options: ordered, winner, best, ctx };
}
