import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { App } from './App.tsx';
import { recommend } from './core/engine.ts';
import { ratesFor } from './core/config.ts';
import { scenarios, buildPlan } from './core/report.ts';
import { presetIntake, type WizardAnswers } from './core/presets.ts';
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
  if (p.solar) fireEvent.click(screen.getByTestId(`opt-solar-${p.solar}`));
  if (p.postcode !== undefined) {
    fireEvent.change(screen.getByTestId('postcode-input'), { target: { value: p.postcode } });
  }
  fireEvent.click(screen.getByTestId('wizard-next'));
  if (p.tier) fireEvent.click(screen.getByTestId(`opt-tier-${p.tier}`));
  if (p.profile) fireEvent.click(screen.getByTestId(`opt-profile-${p.profile}`));
  fireEvent.click(screen.getByTestId('wizard-next'));
  if (p.ev) fireEvent.click(screen.getByTestId(`opt-ev-${p.ev}`));
  fireEvent.click(screen.getByTestId('wizard-next'));
}

const openRefine = () => fireEvent.click(screen.getByTestId('refine-toggle'));
const devUnlock = () => fireEvent.click(screen.getByTestId('dev-toggle').querySelector('input')!);

/** Founder-shaped wizard answers (yield an EV winner via the preset). */
const FOUNDER_WIZARD: Required<WizardPath> = {
  solar: 'have', postcode: '4000', tier: 'medium', profile: 'day_heavy', ev: 'buying',
};
const founderWizardAnswers: WizardAnswers = {
  solarStatus: 'have', postcode: '4000', usageTier: 'medium', usageProfile: 'day_heavy',
  ev: 'buying', goals: ['bill_savings'],
};

/** The founder intake as the engine regression test uses it. */
function founderIntake(): Intake {
  const r = ratesFor('4000');
  return {
    postcode: '4000', state: r.state, importRateCents: r.importCents, fitCents: r.fitCents,
    solarStatus: 'have', period: 'monthly', usageKwh: 200, exportKwh: 400, usageProfile: 'day_heavy',
    solarKw: 6.6, addKw: 3, ev: 'buying', charge: 'daytime_home', goals: ['bill_savings'],
  };
}

// --- wizard flow -----------------------------------------------------------

describe('Wizard — flow & defaults', () => {
  it('starts on step 1 with no result yet', () => {
    render(<App />);
    expect(screen.getByTestId('step-1')).toBeInTheDocument();
    expect(screen.queryByTestId('option-ev')).not.toBeInTheDocument();
  });

  it('progress advances and Back returns, preserving answers', () => {
    render(<App />);
    expect(screen.getByTestId('wizard-progress').textContent).toContain('Step 1 of 3');
    fireEvent.click(screen.getByTestId('opt-solar-none'));
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByTestId('wizard-progress').textContent).toContain('Step 2 of 3');
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByTestId('step-1')).toBeInTheDocument();
    expect(screen.getByTestId('opt-solar-none')).toHaveAttribute('aria-checked', 'true');
  });

  it('blocks advancing on an invalid postcode', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('postcode-input'), { target: { value: '40' } });
    expect(screen.getByTestId('postcode-error')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByTestId('step-1')).toBeInTheDocument();
  });

  it('all defaults (Next x3) produce a sane ballpark with no NaN/Infinity', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('wizard-next'));
    // Ranked options + locked teaser render; no leaked garbage.
    expect(screen.getByTestId('option-nothing')).toBeInTheDocument();
    expect(screen.getByTestId('locked-payback')).toBeInTheDocument();
    expect(document.querySelector('main')!.textContent).not.toMatch(/NaN|Infinity/);
  });
});

// --- founder regression, via the wizard ------------------------------------

describe('Founder path (via wizard) — the trust differentiator', () => {
  it('EV wins, battery pays back >12yr, "do nothing" is a normal card', () => {
    render(<App />);
    completeWizard(FOUNDER_WIZARD);

    // Engine (pure) — the source of truth.
    const rec = recommend(founderIntake());
    expect(rec.winner).toBe('ev');
    expect(rec.options.find((o) => o.key === 'battery')!.paybackYears).toBeGreaterThan(12);

    // UI reflects the preset-driven winner (also EV).
    expect(screen.getByTestId('option-ev').className).toContain('border-amber-500');
    const nothingCard = screen.getByTestId('option-nothing');
    expect(nothingCard).toBeInTheDocument();
    expect(nothingCard.className).not.toContain('border-amber-500');
    expect(nothingCard.textContent).not.toContain('★');
  });
});

// --- V2-tweak: scenario table, refine & payback timing gated behind unlock --

describe('Gating — free vs unlocked surfaces', () => {
  it('locked: scenario table, refine panel and payback numbers are hidden', () => {
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    expect(screen.queryByTestId('scenario-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('refine-panel')).not.toBeInTheDocument();
    // Ranked EV card shows a lock cue, no payback years.
    const evCard = screen.getByTestId('option-ev');
    expect(evCard.textContent).toMatch(/payback/i);
    expect(evCard.textContent).not.toMatch(/\d+(\.\d+)?\s*yrs/);
  });

  it('unlocked: scenario table, refine panel and payback numbers appear', () => {
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    devUnlock();
    expect(screen.getByTestId('scenario-table')).toBeInTheDocument();
    expect(screen.getByTestId('refine-panel')).toBeInTheDocument();
    // Ranked EV card now shows a real payback figure.
    expect(screen.getByTestId('option-ev').textContent).toMatch(/\d+(\.\d+)?\s*yrs/);
  });
});

// --- refine re-runs the engine (unlocked) ----------------------------------

describe('Refine panel — edits re-run the engine instantly (unlocked)', () => {
  it('changing grid import updates the rendered figures', () => {
    render(<App />);
    completeWizard({ solar: 'have', tier: 'medium', profile: 'even', ev: 'none' });
    devUnlock();
    const before = screen.getByTestId('scenario-table').textContent;
    openRefine();
    fireEvent.change(screen.getByTestId('refine-usage'), { target: { value: '3000' } });
    expect(screen.getByTestId('scenario-table').textContent).not.toBe(before);
  });

  it('rate label reflects a postcode-derived state', () => {
    render(<App />);
    completeWizard({ postcode: '4000' });
    devUnlock();
    openRefine();
    expect(screen.getByTestId('state-label').textContent).toContain('QLD');
  });

  it('EV charging habits field only appears when an EV is selected', () => {
    render(<App />);
    completeWizard({ ev: 'none' });
    devUnlock();
    openRefine();
    expect(within(screen.getByTestId('refine-body')).queryByText('EV charging habits')).not.toBeInTheDocument();
  });
});

// --- paid plan view --------------------------------------------------------

describe('App — paid plan view', () => {
  function toResult() {
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
  }

  it('shows plan view when unlocked via dev toggle', () => {
    toResult();
    expect(screen.queryByTestId('plan-view')).not.toBeInTheDocument();
    devUnlock();
    expect(screen.getByTestId('plan-view')).toBeInTheDocument();
  });

  it('plan view contains scenario table, checklist, rebates, and export buttons', () => {
    toResult();
    devUnlock();
    expect(screen.getByTestId('scenario-table')).toBeInTheDocument();
    expect(screen.getByTestId('plan-checklist')).toBeInTheDocument();
    expect(screen.getByTestId('plan-rebates')).toBeInTheDocument();
    expect(screen.getByTestId('plan-exports')).toBeInTheDocument();
    expect(screen.getByText('Download PDF')).toBeInTheDocument();
  });

  it('hides the ballpark unlock CTA when unlocked', () => {
    toResult();
    expect(screen.getByTestId('unlock-cta')).toBeInTheDocument();
    devUnlock();
    expect(screen.queryByTestId('unlock-cta')).not.toBeInTheDocument();
  });
});

// --- V2-B: payback timeline gated behind the unlock -------------------------

describe('Payback timeline — gated behind the unlock', () => {
  function realBreakEvenLabel(intake: Intake): string {
    const rec = recommend(intake);
    const win = rec.options.find((o) => o.key === rec.winner)!;
    return `Break-even: ${(win.cost / win.savingPerYear).toFixed(1)} yrs`;
  }

  it('locked: shows the blurred teaser, not the real chart', () => {
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    expect(screen.getByTestId('locked-payback')).toBeInTheDocument();
    expect(screen.getByTestId('unlock-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('payback-chart')).not.toBeInTheDocument();
  });

  it('locked: DOM contains NO real cashflow values (only the dummy teaser)', () => {
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    const realLabel = realBreakEvenLabel(presetIntake(founderWizardAnswers));
    expect(document.body).toHaveTextContent('Break-even: 6.0 yrs'); // dummy
    expect(realLabel).not.toBe('Break-even: 6.0 yrs'); // guard
    expect(document.body).not.toHaveTextContent(realLabel);
  });

  it('unlocked: the real chart renders with the real break-even', () => {
    render(<App />);
    completeWizard(FOUNDER_WIZARD);
    devUnlock();
    const realLabel = realBreakEvenLabel(presetIntake(founderWizardAnswers));
    expect(screen.getByTestId('payback-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('locked-payback')).not.toBeInTheDocument();
    expect(document.body).toHaveTextContent(realLabel);
  });
});

// --- pure report tracing ---------------------------------------------------

describe('report — buildPlan traces core', () => {
  it('founder plan has scenarios, 16 cashflow points, checklist, QLD rebates', () => {
    const intake = founderIntake();
    const rec = recommend(intake);
    const plan = buildPlan(rec, intake);
    expect(plan.headline).toBeTruthy();
    expect(scenarios(rec).length).toBe(plan.scenarios.length);
    expect(plan.cashflow.length).toBe(16);
    expect(plan.checklist.length).toBeGreaterThan(0);
    expect(plan.rebatesNote).toContain('QLD');
  });
});
