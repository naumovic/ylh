import { CFG, rebate } from './config.ts';
import type { Recommendation, Intake, Option, OptionKey, StateCode } from './types.ts';

// What to ask / verify before committing — the substance a buyer actually needs.
export const CHECKS: Record<OptionKey, string[]> = {
  solar: [
    'Quote priced in $/kW and the STC solar discount shown as an upfront deduction',
    'CEC-approved panels AND inverter (check both model numbers)',
    'SAA-accredited installer; product + workmanship warranties in writing',
    "Inverter size / export limit matches your network's rules",
    'System sized to your daytime load, not oversized just to export at a few cents',
    'Roof orientation & shading assessed (not just a desktop estimate)',
  ],
  battery: [
    'CEC-listed battery model; installed to AS/NZS 5139',
    "Sized to your evening load; don't pay for capacity past the 14 kWh 100%-rebate band without a reason",
    'Federal rebate applied as an upfront STC discount on the quote (you do not claim it)',
    'Warranty stated in cycles AND years; usable vs nominal kWh clarified',
    'Backup capability confirmed if you want blackout cover',
    'VPP participation optional; understand any lock-in',
  ],
  ev: [
    'A smart charger (OCPP) that can schedule to midday so it soaks up solar',
    "'Solar-following' / green-charging mode if you want it automatic",
    'Switchboard / supply capacity checked for the charger load',
    'Install cost itemised separately from the unit',
  ],
  nothing: [
    'Re-check if you get an EV (especially daytime charging)',
    'Re-check if your usage shifts (more evening load makes a battery work harder)',
    'Watch your tariff & feed-in rate at renewal',
    'The battery rebate steps down ~6-monthly, so revisit before it shrinks',
  ],
};

export interface ScenarioRow { name: string; cost: number; saving: number; paybackYears: number; }

/** Deterministic what-ifs for the recommended option (the paid scenario table). */
export function scenarios(rec: Recommendation): ScenarioRow[] {
  const { ctx } = rec;
  const win = rec.options.find((o) => o.key === rec.winner)!;
  const row = (name: string, cost: number, saving: number): ScenarioRow => ({ name, cost, saving, paybackYears: saving > 0 ? cost / saving : Infinity });
  const rows: ScenarioRow[] = [];
  if (rec.winner === 'battery') {
    rows.push(row('As recommended now', win.cost, win.savingPerYear));
    rows.push(row('Wait 12 months (rebate ~15% lower)', win.cost + (win.cost > 0 ? rebate(8) * 0.15 : 0), win.savingPerYear));
    rows.push(row('Bigger: +3 kWh capacity', win.cost + 3 * CFG.batteryGrossPerKwh - (rebate(11) - rebate(8)), win.savingPerYear));
  } else if (rec.winner === 'ev') {
    rows.push(row('Charge on daytime solar (recommended)', win.cost, win.savingPerYear));
    rows.push(row('If you charged overnight instead', win.cost, 0));
  } else if (rec.winner === 'solar') {
    rows.push(row('As recommended', win.cost, win.savingPerYear));
    rows.push(row('Bigger: +3 kW', win.cost + 3 * CFG.solarCostPerKw, win.savingPerYear + 3 * CFG.genFactor * 0.4 * 365 * ctx.fit));
  } else {
    rows.push(row('Do nothing (recommended now)', 0, 0));
    rows.push(row('If you add an EV charging in the day', CFG.evChargerCost, Math.min(ctx.captureSurplusDay, ctx.evNeedDay) * 365 * ctx.spread));
  }
  return rows;
}

export interface CashflowPoint { year: number; net: number; }

/** Cumulative net cashflow for the recommended option (the paid payback chart). */
export function cashflow(cost: number, savingPerYear: number, years = 15): CashflowPoint[] {
  const pts: CashflowPoint[] = [];
  for (let y = 0; y <= years; y++) pts.push({ year: y, net: -cost + savingPerYear * y });
  return pts;
}

export interface Plan {
  generatedAt: string;
  state: StateCode;
  postcode: string;
  headline: string;
  recommended: Option;
  scenarios: ScenarioRow[];
  cashflow: CashflowPoint[];
  checklist: string[];
  rebatesNote: string;
  disclaimer: string;
}

/**
 * Build the full paid deliverable — entirely in code, no LLM.
 * The UI renders this object to screen and to a client-side PDF.
 */
export function buildPlan(rec: Recommendation, intake: Intake): Plan {
  const win = rec.options.find((o) => o.key === rec.winner)!;
  const spreadC = Math.max(0, intake.importRateCents - intake.fitCents).toFixed(0);
  const headline = rec.winner === 'nothing'
    ? 'Hold off, nothing pays back well enough yet.'
    : win.name;
  const rebatesNote =
    `Federal battery rebate: ~A$252 per usable kWh (point-of-sale STC discount), tapering above 14 kWh and stepping down ~6-monthly. ` +
    `Your state (${intake.state}): ~${intake.importRateCents}c/kWh import, ~${intake.fitCents}c/kWh feed-in, so the ${spreadC}c gap is what every self-consumed kWh is worth.`;
  return {
    generatedAt: new Date().toISOString(),
    state: intake.state,
    postcode: intake.postcode,
    headline,
    recommended: win,
    scenarios: scenarios(rec),
    cashflow: cashflow(win.cost, win.savingPerYear),
    checklist: CHECKS[rec.winner] ?? [],
    rebatesNote,
    disclaimer: `General information only. Not personal financial or product advice. Figures reflect Australia ${new Date().getFullYear()} and may change over time.`,
  };
}
