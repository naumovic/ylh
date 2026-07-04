import { useCallback, useMemo, useState } from 'react';
import { recommend } from './core/engine.ts';
import { buildPlan } from './core/report.ts';
import type { Intake } from './core/types.ts';
import { Wizard } from './components/Wizard.tsx';
import { RefinePanel } from './components/RefinePanel.tsx';
import { ResultPanel } from './components/ResultPanel.tsx';
import { LockedPaybackChart } from './components/LockedPaybackChart.tsx';
import { PlanView } from './components/PlanView.tsx';
import { exportPdf } from './lib/exportPdf.ts';
import { exportJson } from './lib/exportJson.ts';

export function App() {
  // null until the wizard is complete — the wizard is the entry point.
  const [intake, setIntake] = useState<Intake | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  const handleRefine = useCallback((next: Intake) => setIntake(next), []);
  const restart = useCallback(() => setIntake(null), []);

  return (
    <div className="min-h-full">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-4 flex items-center gap-3">
          <img src="/logo.svg" width={32} height={32} alt="" />
          <div>
            <div className="font-bold text-navy-900 leading-none">Your Local Hero</div>
            <div className="text-xs text-muted">
              Supercharge your solar strategy
            </div>
          </div>
          {/* Dev toggle — remove when Stripe is wired (Task 4) */}
          <label className="ml-auto flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none" data-testid="dev-toggle">
            <input
              type="checkbox"
              checked={unlocked}
              onChange={(e) => setUnlocked(e.target.checked)}
              className="accent-amber-500"
            />
            Unlocked (dev)
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        {intake === null ? (
          <>
            <div className="text-center mb-8 max-w-xl mx-auto">
              <h1 className="text-2xl font-bold text-navy-900">Should I upgrade my home solar, battery and EV strategy?</h1>
              <p className="text-sm text-muted mt-2">
                Three quick steps. We&apos;ll give you a straight, honest ballpark, even if the answer is &quot;do nothing&quot;.
              </p>
            </div>
            <Wizard onComplete={setIntake} />
          </>
        ) : (
          <Result
            intake={intake}
            unlocked={unlocked}
            onRefine={handleRefine}
            onRestart={restart}
            onUnlock={() => setUnlocked(true)}
          />
        )}
      </main>
    </div>
  );
}

interface ResultProps {
  intake: Intake;
  unlocked: boolean;
  onRefine: (next: Intake) => void;
  onRestart: () => void;
  onUnlock: () => void;
}

function Result({ intake, unlocked, onRefine, onRestart, onUnlock }: ResultProps) {
  const rec = useMemo(() => recommend(intake), [intake]);

  // Compute the paid plan (which contains the real cashflow series) ONLY when
  // unlocked. While locked it is never built, so the real payback numbers never
  // enter React state or the DOM; the teaser chart uses hard-coded dummy data.
  const plan = useMemo(() => (unlocked ? buildPlan(rec, intake) : null), [unlocked, rec, intake]);
  const year = new Date().getFullYear();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={onRestart}
          data-testid="restart"
          className="text-xs text-muted hover:text-navy-900 underline underline-offset-2"
        >
          Start over
        </button>
      </div>

      {/* Ranked options stay visible in both states; payback timing is gated. */}
      <ResultPanel rec={rec} unlocked={unlocked} />

      {unlocked && plan ? (
        <>
          {/* Refining is a paid feature: only available once unlocked. */}
          <RefinePanel intake={intake} onChange={onRefine} />
          <PlanView
            plan={plan}
            showHeadline={false}
            onDownloadPdf={() => exportPdf(plan)}
            onDownloadJson={() => exportJson(plan)}
          />
        </>
      ) : (
        <>
          {/* Flagship paid visual: teaser only while locked (no real cashflow computed). */}
          <LockedPaybackChart onUnlock={onUnlock} />

          {/* Unlock CTA (wired to Stripe in Task 4) */}
          <div data-testid="unlock-cta" className="mt-4 rounded-lg border border-dashed border-amber-500 bg-amber-500/5 p-4">
            <div className="font-bold text-sm text-navy-900">Unlock your precise, personalised plan for A$29</div>
            <p className="text-sm text-muted mt-0.5">
              Your exact tariff &amp; usage &rarr; scenario comparison, payback timeline, refine-your-numbers,
              the rebates for your postcode, and a downloadable PDF. Unlimited re-runs included.
            </p>
            <button
              onClick={onUnlock}
              data-testid="unlock-cta-btn"
              className="mt-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-sm px-4 py-2"
            >
              Unlock full timeline
            </button>
          </div>

          <p className="mt-3 text-[11px] text-muted italic">
            General information only. Not personal financial or product advice. Figures reflect Australia {year} and may change over time.
          </p>
        </>
      )}
    </div>
  );
}
