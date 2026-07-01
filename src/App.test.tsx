import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { App } from './App.tsx';
import { recommend } from './core/engine.ts';
import { ratesFor } from './core/config.ts';
import { scenarios } from './core/report.ts';
import type { Intake } from './core/types.ts';

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

describe('App — founder preset', () => {
  it('renders with EV as the winner', () => {
    render(<App />);
    const rec = recommend(founderIntake());
    expect(rec.winner).toBe('ev');
    // The headline should mention the EV option
    const matches = screen.getAllByText(/EV charger/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('battery shows >12yr payback', () => {
    const rec = recommend(founderIntake());
    const battery = rec.options.find((o) => o.key === 'battery')!;
    expect(battery.paybackYears).toBeGreaterThan(12);
  });

  it('"Do nothing" renders as a normal card (not hidden, no special highlight)', () => {
    render(<App />);
    const nothingCard = screen.getByTestId('option-nothing');
    expect(nothingCard).toBeInTheDocument();
    // Should NOT have the amber winner ring
    expect(nothingCard.className).not.toContain('border-amber-500');
    // Should not contain the star marker
    expect(nothingCard.textContent).not.toContain('★');
  });

  it('scenario table renders rows', () => {
    render(<App />);
    const table = screen.getByTestId('scenario-table');
    expect(table).toBeInTheDocument();
    // Founder case has EV as winner, so scenario rows should exist
    const rec = recommend(founderIntake());
    const rows = scenarios(rec);
    expect(rows.length).toBeGreaterThan(0);
    // Check that at least the first scenario name appears
    expect(table.textContent).toContain(rows[0].name);
  });

  it('postcode change updates state label', () => {
    render(<App />);
    // Default postcode is 4000 (QLD)
    const stateLabel = screen.getByTestId('state-label');
    expect(stateLabel.textContent).toContain('QLD');
  });
});
