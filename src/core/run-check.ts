// Standalone sanity run (no test runner needed): node --experimental-strip-types run-check.ts
import { recommend } from './engine.ts';
import { buildPlan } from './report.ts';
import { ratesFor, rebate } from './config.ts';
import type { Intake } from './types.ts';

function make(p: Partial<Intake> & { postcode: string }): Intake {
  const r = ratesFor(p.postcode, p.network);
  return {
    state: r.state, importRateCents: r.importCents, fitCents: r.fitCents, network: p.network,
    solarStatus: 'have', period: 'monthly', usageKwh: 200, exportKwh: 400, usageProfile: 'day_heavy',
    solarKw: 6.6, addKw: 3, ev: 'none', charge: 'night_home', goals: ['bill_savings'], ...p,
  } as Intake;
}
const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
const pb = (y: number) => (!isFinite(y) || y <= 0 ? '-' : y.toFixed(1) + 'y');

console.log('rebate(10) =', Math.round(rebate(10)), ' rebate(20) =', Math.round(rebate(20)));

const cases: Array<[string, Intake]> = [
  ['Founder QLD (EV buyer, WFH)', make({ postcode: '4000', network: 'energex', ev: 'buying', charge: 'daytime_home', goals: ['bill_savings', 'go_electric'] })],
  ['Backup SA', make({ postcode: '5000', usageKwh: 450, exportKwh: 350, usageProfile: 'even', goals: ['bill_savings', 'backup'] })],
  ['Backup QLD (compare)', make({ postcode: '4000', network: 'energex', usageKwh: 450, exportKwh: 350, usageProfile: 'even', goals: ['bill_savings', 'backup'] })],
  ['No solar yet NSW', make({ postcode: '2170', solarStatus: 'none', usageKwh: 900, exportKwh: 0, solarKw: 0, addKw: 0, ev: 'buying', charge: 'daytime_home' })],
];
for (const [name, intake] of cases) {
  const rec = recommend(intake);
  console.log('\n=== ' + name + ' === [' + intake.state + '] WINNER: ' + rec.winner);
  for (const o of rec.options) console.log('   ' + o.name.padEnd(34) + ' cost ' + fmt(o.cost).padStart(8) + '  save/yr ' + (o.savingPerYear > 0 ? fmt(o.savingPerYear) : '-').padStart(8) + '  pb ' + pb(o.paybackYears));
}
// prove the paid plan builds in code (no LLM)
const plan = buildPlan(recommend(cases[0][1]), cases[0][1]);
console.log('\nPaid plan headline:', plan.headline, '| scenarios:', plan.scenarios.length, '| cashflow pts:', plan.cashflow.length, '| checklist:', plan.checklist.length);
