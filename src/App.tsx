import { useCallback, useMemo, useState } from 'react';
import { recommend } from './core/engine.ts';
import { ratesFor } from './core/config.ts';
import { scenarios, cashflow } from './core/report.ts';
import type { Intake } from './core/types.ts';
import { IntakeForm } from './components/IntakeForm.tsx';
import { ResultPanel } from './components/ResultPanel.tsx';
import { ScenarioTable } from './components/ScenarioTable.tsx';
import { PaybackChart } from './components/PaybackChart.tsx';

const FOUNDER_DEFAULTS: Intake = (() => {
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
})();

export function App() {
  const [intake, setIntake] = useState<Intake>(FOUNDER_DEFAULTS);

  const handleChange = useCallback((next: Intake) => {
    setIntake(next);
  }, []);

  const rec = useMemo(() => recommend(intake), [intake]);
  const scenarioRows = useMemo(() => scenarios(rec), [rec]);
  const win = rec.options.find((o) => o.key === rec.winner)!;
  const points = useMemo(() => cashflow(win.cost, win.savingPerYear), [win.cost, win.savingPerYear]);

  return (
    <div className="min-h-full">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-4 flex items-center gap-3">
          <img src="/logo.svg" width={32} height={32} alt="" />
          <div>
            <div className="font-bold text-navy-900 leading-none">Your Local Hero</div>
            <div className="text-xs text-muted">
              Honest solar, EV &amp; battery advice — even if the answer is &quot;do nothing&quot;.
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6 grid gap-5 md:grid-cols-[340px_1fr]">
        <IntakeForm initial={FOUNDER_DEFAULTS} onChange={handleChange} />

        <section>
          <ResultPanel rec={rec} />
          <ScenarioTable rows={scenarioRows} />
          <PaybackChart points={points} />

          {/* Unlock CTA (static — wired in Task 4) */}
          <div className="mt-4 rounded-lg border border-dashed border-amber-500 bg-amber-500/5 p-4">
            <div className="font-bold text-sm text-navy-900">Unlock your precise, personalised plan — A$29</div>
            <p className="text-sm text-muted mt-0.5">
              Your exact tariff &amp; usage &rarr; scenario comparison, payback chart, the rebates for your
              postcode, and a downloadable PDF.
            </p>
            <button className="mt-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-sm px-4 py-2">
              Unlock plan — A$29
            </button>
          </div>

          <p className="mt-3 text-[11px] text-muted italic">
            General information only — not personal financial or product advice. Figures reflect Australia
            mid-2026 and change over time.
          </p>
        </section>
      </main>
    </div>
  );
}
