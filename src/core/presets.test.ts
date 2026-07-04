import { describe, it, expect } from 'vitest';
import {
  presetIntake,
  WIZARD_DEFAULTS,
  DAILY_KWH,
  DAYS_PER_QUARTER,
  HAVE_SOLAR_IMPORT_PER_QTR,
  HAVE_SOLAR_EXPORT_PER_QTR,
  DEFAULT_SOLAR_KW,
  PROFILE_SHIFT,
  type WizardAnswers,
} from './presets.ts';
import { recommend } from './engine.ts';
import { ratesFor } from './config.ts';

const answers = (p: Partial<WizardAnswers> = {}): WizardAnswers => ({ ...WIZARD_DEFAULTS, ...p });

describe('presetIntake — rates & derived state', () => {
  it('derives state and rates from the postcode', () => {
    const i = presetIntake(answers({ postcode: '3000' }));
    const r = ratesFor('3000');
    expect(i.state).toBe('VIC');
    expect(i.importRateCents).toBe(r.importCents);
    expect(i.fitCents).toBe(r.fitCents);
    expect(i.period).toBe('quarterly');
  });
});

describe('presetIntake — no solar: total usage from daily anchor', () => {
  it.each(['little', 'medium', 'large'] as const)('tier %s => anchor * days/qtr, no export', (tier) => {
    const i = presetIntake(answers({ solarStatus: 'none', usageTier: tier }));
    expect(i.usageKwh).toBe(Math.round(DAILY_KWH[tier] * DAYS_PER_QUARTER));
    expect(i.exportKwh).toBe(0);
    expect(i.solarKw).toBe(0);
    expect(i.addKw).toBe(0);
  });

  it('matches the documented ~910 / ~1,640 / ~2,550 anchors', () => {
    expect(presetIntake(answers({ solarStatus: 'none', usageTier: 'little' })).usageKwh).toBe(910);
    expect(presetIntake(answers({ solarStatus: 'none', usageTier: 'medium' })).usageKwh).toBe(1638);
    expect(presetIntake(answers({ solarStatus: 'none', usageTier: 'large' })).usageKwh).toBe(2548);
  });

  it('usage profile does not change total usage when there is no solar', () => {
    const day = presetIntake(answers({ solarStatus: 'none', usageProfile: 'day_heavy' })).usageKwh;
    const night = presetIntake(answers({ solarStatus: 'none', usageProfile: 'night_heavy' })).usageKwh;
    expect(day).toBe(night);
  });
});

describe('presetIntake — have solar: import/export baselines', () => {
  it.each(['little', 'medium', 'large'] as const)('tier %s uses the table baselines on even/unknown profile', (tier) => {
    const i = presetIntake(answers({ solarStatus: 'have', usageTier: tier, usageProfile: 'even' }));
    expect(i.usageKwh).toBe(HAVE_SOLAR_IMPORT_PER_QTR[tier]);
    expect(i.exportKwh).toBe(HAVE_SOLAR_EXPORT_PER_QTR[tier]);
    expect(i.solarKw).toBe(DEFAULT_SOLAR_KW);
  });

  it('day-heavy shifts both import and export DOWN by ~15%', () => {
    const even = presetIntake(answers({ usageProfile: 'even' }));
    const day = presetIntake(answers({ usageProfile: 'day_heavy' }));
    expect(day.usageKwh).toBe(Math.round(even.usageKwh * (1 - PROFILE_SHIFT)));
    expect(day.exportKwh).toBe(Math.round(even.exportKwh * (1 - PROFILE_SHIFT)));
    expect(day.usageKwh).toBeLessThan(even.usageKwh);
  });

  it('night-heavy shifts both import and export UP by ~15%', () => {
    const even = presetIntake(answers({ usageProfile: 'even' }));
    const night = presetIntake(answers({ usageProfile: 'night_heavy' }));
    expect(night.usageKwh).toBe(Math.round(even.usageKwh * (1 + PROFILE_SHIFT)));
    expect(night.exportKwh).toBe(Math.round(even.exportKwh * (1 + PROFILE_SHIFT)));
    expect(night.usageKwh).toBeGreaterThan(even.usageKwh);
  });
});

describe('presetIntake — EV charging window', () => {
  it('day-heavy home defaults to daytime charging', () => {
    expect(presetIntake(answers({ usageProfile: 'day_heavy', ev: 'buying' })).charge).toBe('daytime_home');
  });
  it('other profiles default to overnight charging', () => {
    expect(presetIntake(answers({ usageProfile: 'even', ev: 'buying' })).charge).toBe('night_home');
    expect(presetIntake(answers({ usageProfile: 'unknown', ev: 'own' })).charge).toBe('night_home');
  });
});

describe('presetIntake — goals fallback', () => {
  it('empty goals fall back to bill savings', () => {
    expect(presetIntake(answers({ goals: [] })).goals).toEqual(['bill_savings']);
  });
  it('preserves selected goals', () => {
    expect(presetIntake(answers({ goals: ['backup', 'go_electric'] })).goals).toEqual(['backup', 'go_electric']);
  });
});

describe('presetIntake — every wizard path yields a finite ballpark', () => {
  const tiers = ['little', 'medium', 'large'] as const;
  const profiles = ['day_heavy', 'even', 'night_heavy', 'unknown'] as const;
  const evs = ['none', 'buying', 'own'] as const;
  for (const solarStatus of ['have', 'none'] as const)
    for (const usageTier of tiers)
      for (const usageProfile of profiles)
        for (const ev of evs)
          it(`no NaN/Infinity cost for ${solarStatus}/${usageTier}/${usageProfile}/${ev}`, () => {
            const rec = recommend(presetIntake(answers({ solarStatus, usageTier, usageProfile, ev })));
            for (const o of rec.options) {
              expect(Number.isFinite(o.cost)).toBe(true);
              expect(Number.isFinite(o.savingPerYear)).toBe(true);
            }
            expect(rec.winner).toBeTruthy();
          });
});

describe('presetIntake — all-defaults path', () => {
  it('produces a sane, engine-valid intake', () => {
    const rec = recommend(presetIntake(WIZARD_DEFAULTS));
    expect(rec.winner).toBeTruthy();
    const win = rec.options.find((o) => o.key === rec.winner)!;
    expect(Number.isFinite(win.cost)).toBe(true);
  });
});
