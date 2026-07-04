import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { App } from './App.tsx';
import { recommend } from './core/engine.ts';
import { ratesFor } from './core/config.ts';
import { scenarios, buildPlan } from './core/report.ts';
import type { Intake } from './core/types.ts';

// --- helpers ---------------------------------------------------------------

interface WizardPath {
  solar?: 'have' | 'none';
  postcode?: string;
  tier?: 'little' | 'medium' | 'large';
  profile?: 'day_heavy' | 'even' | 'night_heavy' | 'unknown';
  ev?: 'none' | 'buying' | 'own';
}

/** Drive the 3-step wizard to a result. Unspecified answers keep their defaults. */
function completeWizard(p: WizardPath = {}) {
  // Step 1
  if (p.solar) fireEvent.click(screen.getByTestId(`opt-solar-${p.solar}`));
  if (p.postcode !== undefined) {
    fireEvent.change(screen.getByTestId('postcode-input'), { target: { value: p.postcode } });
  }
  fireEvent.click(screen.getByTestId('wizard-next'));
  // Step 2
  if (p.tier) fireEvent.click(screen.getByTestId(`opt-tier-${p.tier}`));
  if (p.profile) fireEvent.click(screen.getByTestId(`opt-profile-${p.profile}`));
  fireEvent.click(screen.getByTestId('wizard-next'));
  // Step 3
  if (p.ev) fireEvent.click(screen.getByTestId(`opt-ev-${p.ev}`));
  fireEvent.click(screen.getByTestId('wizard-next'));
}

function openRefine() {
  fireEvent.click(screen.getByTestId('refine-toggle'));
}

/** The founder intake, exactly as the engine regression test uses it. */
function founderIntake(): Intake {
  const r = ratesFor('4000');
  return {
    postcode: '4000',
    state: r.state,
    importRateCents: r.importCents,
    fitCents: r.fitCents,
    solarStatus: 'have',
    period: 'monthly',
    usageKwh: 200,
    exportKwh: 400,
    usageProfile: 'day_heavy',
    solarKw: 6.6,
    addKw: 3,
    ev: 'buying',
    charge: 'daytime_home',
    goals: ['bill_savings'],
  };
}

/** Refine the wizard result down to the founder's exact numbers. */
function refineToFounder() {
  openRefine();
  fireEvent.change(screen.getByTestId('refine-period'), { target: { value: 'monthly' } });
  fireEvent.change(screen.getByTestId('refine-usage'), { target: { value: '200' } });
  fireEvent.change(screen.getByTestId('refine-export'), { target: { value: '400' } });
  fireEvent.change(screen.getByTestId('refine-addkw'), { target: { value: '3' } });
}

// --- wizard flow -----------------------------------------------------------

describe('Wizard — flow & defaults', () => {
  it('starts on step 1 with no result yet', () => {
    render(<App />);
    expect(screen.getByTestId('step-1')).toBeInTheDocument();
    expect(screen.queryByTestId('scenario-table')).not.toBeInTheDocument();
  });

  it('progress advances and Back returns, preserving answers', () => {
    render(<App />);
    expect(screen.getByTestId('wizard-progress').textContent).toContain('Step 1 of 3');
    fireEvent.click(screen.getByTestId('opt-solar-none'));
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByTestId('wizard-progress').textContent).toContain('Step 2 of 3');
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByTestId('step-1')).toBeInTheDocument();
    // Answer preserved: "none" still selected
    expect(screen.getByTestId('opt-solar-none')).toHaveAttribute('aria-checked', 'true');
  });

  it('blocks advancing on an invalid postcode', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('postcode-input'), { target: { value: '40' } });
    expect(screen.getByTestId('postcode-error')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByTestId('step-1')).toBeInTheDocument(); // did not advance
  });

  it('all defaults (Next x3) produce a sane ballpark with no NaN/Infinity', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('wizard-next'));
    const table = screen.getByTestId('scenario-table');
    expect(table).toBeInTheDocument();
    expect(table.textContent).not.toMatch(/NaN|Infinity/);
    expect(screen.getByTestId('payback-chart').textContent).not.toMatch(/NaN|Infinity/);
  });
});

// --- founder regression, via the wizard ------------------------------------

describe('Founder path (via wizard + refine) — the trust differentiator', () => {
  it('EV wins, battery pays back >12yr, "do nothing" is a normal card', () => {
    render(<App />);
    completeWizard({ solar: 'have', postcode: '4000', tier: 'medium', profile: 'day_heavy', ev: 'buying' });
    refineToFounder();

    // Winner is the EV charger
    const rec = recommend(founderIntake());
    expect(rec.winner).toBe('ev');
    const battery = rec.options.find((o) => o.key === 'battery')!;
    expect(battery.paybackYears).toBeGreaterThan(12);

    // UI reflects it: EV charger card is highlighted, do-nothing is a plain card
    const evCard = screen.getByTestId('option-ev');
    expect(evCard.className).toContain('border-amber-500');
    const nothingCard = screen.getByTestId('option-nothing');
    expect(nothingCard).toBeInTheDocument();
    expect(nothingCard.className).not.toContain('border-amber-500');
    expect(nothingCard.textContent).not.toContain('★');
  });
});

// --- refine re-runs the engine ---------------------------------------------

describe('Refine panel — edits re-run the engine instantly', () => {
  it('changing grid import updates the rendered figures', () => {
    render(<App />);
    completeWizard({ solar: 'have', tier: 'medium', profile: 'even', ev: 'none' });
    const before = screen.getByTestId('scenario-table').textContent;
    openRefine();
    fireEvent.change(screen.getByTestId('refine-usage'), { target: { value: '3000' } });
    const after = screen.getByTestId('scenario-table').textContent;
    expect(after).not.toBe(before);
  });

  it('rate label reflects a postcode-derived state', () => {
    render(<App />);
    completeWizard({ postcode: '4000' });
    openRefine();
    expect(screen.getByTestId('state-label').textContent).toContain('QLD');
  });

  it('EV charging habits field only appears when an EV is selected', () => {
    render(<App />);
    completeWizard({ ev: 'none' });
    openRefine();
    expect(within(screen.getByTestId('refine-body')).queryByText('EV charging habits')).not.toBeInTheDocument();
  });
});

// --- paid plan view --------------------------------------------------------

describe('App — paid plan view', () => {
  function toResult() {
    render(<App />);
    completeWizard({ solar: 'have', tier: 'medium', profile: 'day_heavy', ev: 'buying' });
  }

  it('shows plan view when unlocked via dev toggle', () => {
    toResult();
    expect(screen.queryByTestId('plan-view')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dev-toggle').querySelector('input')!);
    expect(screen.getByTestId('plan-view')).toBeInTheDocument();
  });

  it('plan view contains scenario table, checklist, rebates, and export buttons', () => {
    toResult();
    fireEvent.click(screen.getByTestId('dev-toggle').querySelector('input')!);
    expect(screen.getByTestId('scenario-table')).toBeInTheDocument();
    expect(screen.getByTestId('plan-checklist')).toBeInTheDocument();
    expect(screen.getByTestId('plan-rebates')).toBeInTheDocument();
    expect(screen.getByTestId('plan-exports')).toBeInTheDocument();
    expect(screen.getByText('Download PDF')).toBeInTheDocument();
    expect(screen.getByText('Export JSON')).toBeInTheDocument();
  });

  it('hides the ballpark unlock CTA when unlocked', () => {
    toResult();
    expect(screen.getByText(/Unlock plan/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dev-toggle').querySelector('input')!);
    expect(screen.queryByText(/Unlock plan/)).not.toBeInTheDocument();
  });
});

// --- pure report tracing (unchanged) ---------------------------------------

describe('report — buildPlan traces core', () => {
  it('founder plan has scenarios, 16 cashflow points, checklist, QLD rebates', () => {
    const intake = founderIntake();
    const rec = recommend(intake);
    const plan = buildPlan(rec, intake);
    expect(plan.headline).toBeTruthy();
    expect(plan.scenarios.length).toBeGreaterThan(0);
    expect(scenarios(rec).length).toBe(plan.scenarios.length);
    expect(plan.cashflow.length).toBe(16);
    expect(plan.checklist.length).toBeGreaterThan(0);
    expect(plan.rebatesNote).toContain('QLD');
  });
});
