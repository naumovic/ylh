import { describe, it, expect } from 'vitest';
import { planPdfBase64 } from './exportPdf.ts';
import { recommend } from '../core/engine.ts';
import { buildPlan } from '../core/report.ts';
import { ratesFor } from '../core/config.ts';
import type { Intake } from '../core/types.ts';

function founderPlan() {
  const r = ratesFor('4000');
  const intake: Intake = {
    postcode: '4000', state: r.state, importRateCents: r.importCents, fitCents: r.fitCents,
    solarStatus: 'have', period: 'monthly', usageKwh: 200, exportKwh: 400, usageProfile: 'day_heavy',
    solarKw: 6.6, addKw: 3, ev: 'buying', charge: 'daytime_home', goals: ['bill_savings'],
  };
  return buildPlan(recommend(intake), intake);
}

describe('planPdfBase64', () => {
  it('returns raw base64 of a PDF (no data: prefix)', () => {
    const b64 = planPdfBase64(founderPlan());
    expect(typeof b64).toBe('string');
    expect(b64).not.toMatch(/^data:/);
    // base64 of "%PDF" is "JVBER..." — the PDF magic bytes.
    expect(b64.startsWith('JVBER')).toBe(true);
  });
});
