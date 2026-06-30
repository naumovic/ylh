import { describe, it, expect } from 'vitest';
import { recommend } from './engine.ts';
import { ratesFor, rebate, deriveState } from './config.ts';
import type { Intake } from './types.ts';

function make(p: Partial<Intake> & Pick<Intake, 'postcode'>): Intake {
  const r = ratesFor(p.postcode, p.network);
  return {
    state: r.state, importRateCents: r.importCents, fitCents: r.fitCents,
    network: p.network, solarStatus: 'have', period: 'monthly',
    usageKwh: 200, exportKwh: 400, usageProfile: 'day_heavy',
    solarKw: 6.6, addKw: 3, ev: 'none', charge: 'night_home', goals: ['bill_savings'],
    ...p,
  } as Intake;
}

describe('rebate', () => {
  it('matches the documented worked figure (10 kWh ~= $2,516)', () => {
    expect(Math.round(rebate(10))).toBe(2516);
  });
  it('marginal value drops past the 14 kWh band', () => {
    const per10 = rebate(10) / 10;
    const per20 = rebate(20) / 20;
    expect(per20).toBeLessThan(per10);
  });
});

describe('postcode -> state', () => {
  it('derives the right states', () => {
    expect(deriveState('4000')).toBe('QLD');
    expect(deriveState('3350')).toBe('VIC');
    expect(deriveState('2170')).toBe('NSW');
    expect(deriveState('2600')).toBe('ACT');
    expect(deriveState('5000')).toBe('SA');
  });
});

describe('recommend — founder case (the trust differentiator)', () => {
  it('does NOT recommend a battery; favours EV daytime charging', () => {
    const rec = recommend(make({ postcode: '4000', network: 'energex', ev: 'buying', charge: 'daytime_home', goals: ['bill_savings', 'go_electric'] }));
    expect(rec.winner).toBe('ev');
    const battery = rec.options.find((o) => o.key === 'battery')!;
    expect(battery.paybackYears).toBeGreaterThan(12);
  });
});

describe('recommend — state sensitivity', () => {
  it('a battery pays back faster in SA than QLD for the same household', () => {
    const base = { solarStatus: 'have', usageKwh: 450, exportKwh: 350, usageProfile: 'even', ev: 'none', charge: 'night_home', goals: ['bill_savings', 'backup'] } as Partial<Intake>;
    const sa = recommend(make({ postcode: '5000', ...base }));
    const qld = recommend(make({ postcode: '4000', network: 'energex', ...base }));
    const saBat = sa.options.find((o) => o.key === 'battery')!;
    const qldBat = qld.options.find((o) => o.key === 'battery')!;
    expect(saBat.paybackYears).toBeLessThan(qldBat.paybackYears);
  });
});

describe('recommend — no solar yet', () => {
  it('leads with installing solar', () => {
    const rec = recommend(make({ postcode: '2170', solarStatus: 'none', usageKwh: 900, exportKwh: 0, solarKw: 0, addKw: 0, ev: 'buying', charge: 'daytime_home' }));
    expect(rec.winner).toBe('solar');
    expect(rec.options[0].key).toBe('solar');
  });
});
