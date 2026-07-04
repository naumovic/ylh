import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { App } from './App.tsx';
import { recommend } from './core/engine.ts';
import { ratesFor } from './core/config.ts';
import { scenarios, buildPlan } from './core/report.ts';
import { presetIntake, type WizardAnswers } from './core/presets.ts';
import type { Intake } from './core/types.ts';

// --- fetch mock (postUnlock / postReserve) ---------------------------------
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/'); // no ?preview
  fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', fetchMock);
});

// --- helpers ---------------------------------------------------------------
interface WizardPath { solar?: 'have' | 'none'; postcode?: string; tier?: 'little' | 'medium' | 'large'; profile?: 'day_heavy' | 'even' | 'night_heavy' | 'unknown'; ev?: 'none' | 'buying' | 'own'; }

function completeWizard(p: WizardPath = {}) {
  if (p.solar) fireEvent.click(screen.getByTestId(`opt-solar-${p.solar}`));
  if (p.postcode !== undefined) fireEvent.change(screen.getByTestId('postcode-input'), { target: { value: p.postcode } });
  fireEvent.click(screen.getByTestId('wizard-next'));
  if (p.tier) fireEvent.click(screen.getByTestId(`opt-tier-${p.tier}`));
  if (p.profile) fireEvent.click(screen.getByTestId(`opt-profile-${p.profile}`));
  fireEvent.click(screen.getByTestId('wizard-next'));
  if (p.ev) fireEvent.click(screen.getByTestId(`opt-ev-${p.ev}`));
  fireEvent.click(screen.getByTestId('wizard-next'));
}

const FOUNDER_WIZARD: Required<WizardPath> = { solar: 'have', postcode: '4000', tier: 'medium', profile: 'day_heavy', ev: 'buying' };
const founderWizardAnswers: WizardAnswers = { solarStatus: 'have', postcode: '4000', usageTier: 'medium', usageProfile: 'day_heavy', ev: 'buying', goals: ['bill_savings'] };

function founderIntake(): Intake {
  const r = ratesFor('4000');
  return { postcode: '4000', state: r.state, importRateCents: r.importCents, fitCents: r.fitCents, solarStatus: 'have', period: 'monthly', usageKwh: 200, exportKwh: 400, usageProfile: 'day_heavy', solarKw: 6.6, addKw: 3, ev: 'buying', charge: 'daytime_home', goals: ['bill_savings'] };
}

async function fillAndSubmitUnlock(over: Partial<{ first: string; last: string; email: string; consent: boolean }> = {}) {
  const { first = 'Ada', last = 'Lovelace', email = 'ada@example.com', consent = true } = over;
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: first } });
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: last } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  if (consent) fireEvent.click(screen.getByTestId('uf-consent'));
  fireEvent.click(screen.getByTestId('uf-submit'));
}

function lastFetchBody(path: string) {
  const call = fetchMock.mock.calls.find((c) => c[0] === path);
  return call ? JSON.parse((call[1] as RequestInit).body as string) : undefined;
}

// --- locked state ----------------------------------------------------------
describe('Locked ballpark (default, no unlock)', () => {
  it('shows the teaser + free-unlock CTA + waitlist; hides paid surfaces', () => {
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    expect(screen.getByTestId('locked-payback')).toBeInTheDocument();
    expect(screen.getByTestId('unlock-cta')).toBeInTheDocument();
    expect(screen.getByTestId('waitlist')).toBeInTheDocument();
    expect(screen.queryByTestId('plan-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('scenario-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('refine-panel')).not.toBeInTheDocument();
  });

  it('founder path: EV wins, "do nothing" is a normal card', () => {
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    const rec = recommend(founderIntake());
    expect(rec.winner).toBe('ev');
    expect(rec.options.find((o) => o.key === 'battery')!.paybackYears).toBeGreaterThan(12);
    expect(screen.getByTestId('option-ev').className).toContain('border-amber-500');
    const nothing = screen.getByTestId('option-nothing');
    expect(nothing.className).not.toContain('border-amber-500');
    expect(nothing.textContent).not.toContain('★');
  });

  it('no real cashflow in the DOM while locked (dummy teaser only)', () => {
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    const rec = recommend(presetIntake(founderWizardAnswers));
    const win = rec.options.find((o) => o.key === rec.winner)!;
    const real = `Break-even: ${(win.cost / win.savingPerYear).toFixed(1)} yrs`;
    expect(document.body).toHaveTextContent('Break-even: 6.0 yrs'); // dummy
    expect(real).not.toBe('Break-even: 6.0 yrs');
    expect(document.body).not.toHaveTextContent(real);
  });
});

// --- unlock flow -----------------------------------------------------------
describe('Email-gate unlock', () => {
  it('opens the form, submits, and renders the full plan + post-unlock panel', async () => {
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    fireEvent.click(screen.getByTestId('unlock-cta-btn'));
    expect(screen.getByTestId('unlock-dialog')).toBeInTheDocument();

    await fillAndSubmitUnlock({ email: 'ada@example.com' });

    expect(await screen.findByTestId('plan-view')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-table')).toBeInTheDocument();
    expect(screen.getByTestId('payback-chart')).toBeInTheDocument();
    expect(screen.getByTestId('post-unlock-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('unlock-dialog')).not.toBeInTheDocument();

    // POSTed to /api/unlock with the right shape
    const body = lastFetchBody('/api/unlock');
    expect(body).toMatchObject({ email: 'ada@example.com', consent: true, source: 'unlock' });
    expect(typeof body.pdfBase64).toBe('string');
    expect(localStorage.getItem('ylh_unlocked')).toBe('1');
  });

  it('requires consent and does not unlock without it', async () => {
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    fireEvent.click(screen.getByTestId('unlock-cta-btn'));
    await fillAndSubmitUnlock({ consent: false });
    expect(screen.getByTestId('uf-error').textContent).toMatch(/consent/i);
    expect(screen.queryByTestId('plan-view')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a bad email (JS backstop) and does not call the API', () => {
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    fireEvent.click(screen.getByTestId('unlock-cta-btn'));
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Lovelace' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByTestId('uf-consent'));
    // type="email" makes the browser block a click-submit natively; submit the
    // form directly to exercise our own JS validation backstop.
    fireEvent.submit(screen.getByTestId('unlock-dialog').querySelector('form')!);
    expect(screen.getByTestId('uf-error').textContent).toMatch(/valid email/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('persists unlock across a reload (localStorage) — no form the second time', () => {
    localStorage.setItem('ylh_unlocked', '1');
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    expect(screen.getByTestId('plan-view')).toBeInTheDocument();
    expect(screen.queryByTestId('unlock-cta')).not.toBeInTheDocument();
  });

  it('?preview=1 unlocks without the form', () => {
    window.history.pushState({}, '', '/?preview=1');
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    expect(screen.getByTestId('plan-view')).toBeInTheDocument();
  });
});

// --- post-unlock survey + reservation --------------------------------------
describe('Post-unlock panel', () => {
  async function toUnlocked() {
    localStorage.setItem('ylh_unlocked', '1');
    localStorage.setItem('ylh_email', 'ada@example.com');
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    return screen.findByTestId('post-unlock-panel');
  }

  it('price survey records and thanks the user', async () => {
    await toUnlocked();
    fireEvent.click(screen.getByTestId('price-a29_fair'));
    fireEvent.click(screen.getByTestId('survey-submit'));
    expect(screen.getByTestId('survey-thanks')).toBeInTheDocument();
  });

  it('founder reservation confirms and calls /api/reserve', async () => {
    await toUnlocked();
    fireEvent.click(screen.getByTestId('reserve-btn'));
    expect(screen.getByTestId('reserve-thanks')).toBeInTheDocument();
    await waitFor(() => expect(lastFetchBody('/api/reserve')).toMatchObject({ email: 'ada@example.com' }));
  });
});

// --- waitlist --------------------------------------------------------------
describe('Waitlist (non-unlockers)', () => {
  it('submits email with source waitlist and confirms', async () => {
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    fireEvent.change(screen.getByTestId('waitlist-email'), { target: { value: 'wait@b.co' } });
    fireEvent.click(screen.getByTestId('waitlist-submit'));
    expect(await screen.findByTestId('waitlist-joined')).toBeInTheDocument();
    await waitFor(() => expect(lastFetchBody('/api/unlock')).toMatchObject({ email: 'wait@b.co', source: 'waitlist' }));
  });
});

// --- paid plan view content ------------------------------------------------
describe('Paid plan view', () => {
  it('contains scenario table, checklist, rebates, and PDF export', () => {
    localStorage.setItem('ylh_unlocked', '1');
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    expect(screen.getByTestId('plan-view')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-table')).toBeInTheDocument();
    expect(screen.getByTestId('plan-checklist')).toBeInTheDocument();
    expect(screen.getByTestId('plan-rebates')).toBeInTheDocument();
    expect(screen.getByTestId('refine-panel')).toBeInTheDocument();
    expect(screen.getByText('Download PDF')).toBeInTheDocument();
    // Ranked EV card now shows a real payback figure.
    expect(screen.getByTestId('option-ev').textContent).toMatch(/\d+(\.\d+)?\s*yrs/);
  });

  it('unlocked: DOM shows the real break-even', () => {
    localStorage.setItem('ylh_unlocked', '1');
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    const rec = recommend(presetIntake(founderWizardAnswers));
    const win = rec.options.find((o) => o.key === rec.winner)!;
    expect(document.body).toHaveTextContent(`Break-even: ${(win.cost / win.savingPerYear).toFixed(1)} yrs`);
  });
});

// --- legal pages + footer --------------------------------------------------
describe('Privacy / Terms pages', () => {
  it('renders the privacy policy at /privacy, naming both processors + deletion contact', () => {
    window.history.pushState({}, '', '/privacy');
    render(<App />);
    expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument();
    expect(document.body).toHaveTextContent('Resend');
    expect(document.body).toHaveTextContent('PostHog');
    expect(screen.getAllByRole('link', { name: /hello@yourlocalhero/i }).length).toBeGreaterThan(0);
    // not the wizard
    expect(screen.queryByTestId('step-1')).not.toBeInTheDocument();
  });

  it('renders terms at /terms', () => {
    window.history.pushState({}, '', '/terms');
    render(<App />);
    expect(screen.getByRole('heading', { name: /terms of use/i })).toBeInTheDocument();
  });

  it('main app footer links to privacy and terms', () => {
    render(<App />);
    const footer = document.querySelector('footer')!;
    expect(footer.querySelector('a[href="/privacy"]')).toBeInTheDocument();
    expect(footer.querySelector('a[href="/terms"]')).toBeInTheDocument();
  });
});

// --- pure report tracing ---------------------------------------------------
describe('report — buildPlan traces core', () => {
  it('founder plan has scenarios, 16 cashflow points, checklist, QLD rebates', () => {
    const intake = founderIntake();
    const rec = recommend(intake);
    const plan = buildPlan(rec, intake);
    expect(scenarios(rec).length).toBe(plan.scenarios.length);
    expect(plan.cashflow.length).toBe(16);
    expect(plan.checklist.length).toBeGreaterThan(0);
    expect(plan.rebatesNote).toContain('QLD');
  });
});
