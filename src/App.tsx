import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { recommend } from './core/engine.ts';
import { buildPlan } from './core/report.ts';
import type { Intake } from './core/types.ts';
import { Wizard } from './components/Wizard.tsx';
import { RefinePanel } from './components/RefinePanel.tsx';
import { ResultPanel } from './components/ResultPanel.tsx';
import { LockedPaybackChart } from './components/LockedPaybackChart.tsx';
import { PlanView } from './components/PlanView.tsx';
import { UnlockDialog } from './components/UnlockDialog.tsx';
import { PostUnlockPanel } from './components/PostUnlockPanel.tsx';
import { WaitlistCapture } from './components/WaitlistCapture.tsx';
import { Footer } from './components/Footer.tsx';
import { PrivacyPage, TermsPage } from './pages/legal.tsx';
import { exportPdf, planPdfBase64 } from './lib/exportPdf.ts';
import { exportJson } from './lib/exportJson.ts';
import { initAnalytics, capture } from './lib/analytics.ts';

const UNLOCK_KEY = 'ylh_unlocked';
const EMAIL_KEY = 'ylh_email';

// Dev-only installer-directory harness (Phase 1). Gated on import.meta.env.DEV so the
// ternary folds to `null` in production and Rollup drops the dynamic import + its chunk —
// no directory code or data ships in prod builds. Phase 2 mounts it in the real flow
// behind VITE_FF_DIRECTORY instead.
const DevDirectoryPage = import.meta.env.DEV
  ? lazy(() => import('./directory/DevDirectoryPage.tsx'))
  : null;

interface UnlockState {
  unlocked: boolean;
  email: string;
}

/** Unlocked persists across reloads (Task 4A §2.3 — no revenue to protect yet).
 *  `?preview=1` is a founder/preview shortcut that also unlocks. */
function readUnlockState(): UnlockState {
  try {
    const previewed = new URLSearchParams(window.location.search).get('preview') === '1';
    return {
      unlocked: previewed || localStorage.getItem(UNLOCK_KEY) === '1',
      email: localStorage.getItem(EMAIL_KEY) ?? '',
    };
  } catch {
    return { unlocked: false, email: '' };
  }
}

/** Tiny path router — the Node service serves index.html for every non-API route,
 *  so a full-page load of /privacy or /terms lands here and renders the right page. */
export function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (DevDirectoryPage && path === '/dev/directory') {
    return (
      <Suspense fallback={null}>
        <DevDirectoryPage />
      </Suspense>
    );
  }
  if (path === '/privacy') return <PrivacyPage />;
  if (path === '/terms') return <TermsPage />;
  return <MainApp />;
}

function MainApp() {
  const [intake, setIntake] = useState<Intake | null>(null);
  const [unlock, setUnlock] = useState<UnlockState>(readUnlockState);

  useEffect(() => {
    initAnalytics();
  }, []);

  const handleRefine = useCallback((next: Intake) => setIntake(next), []);
  const restart = useCallback(() => setIntake(null), []);

  const handleUnlocked = useCallback(({ email, emailQueued }: { email: string; emailQueued: boolean }) => {
    setUnlock({ unlocked: true, email });
    try {
      localStorage.setItem(UNLOCK_KEY, '1');
      if (email) localStorage.setItem(EMAIL_KEY, email);
    } catch {
      /* private mode / storage disabled — unlock still holds for this session */
    }
    if (emailQueued) capture('plan_emailed');
  }, []);

  return (
    <div className="min-h-full">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-4 flex items-center gap-3">
          <img src="/logo.svg" width={32} height={32} alt="" />
          <div>
            <div className="font-bold text-navy-900 leading-none">Your Local Hero</div>
            <div className="text-xs text-muted">Supercharge your solar strategy</div>
          </div>
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
            unlocked={unlock.unlocked}
            email={unlock.email}
            onRefine={handleRefine}
            onRestart={restart}
            onUnlocked={handleUnlocked}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

interface ResultProps {
  intake: Intake;
  unlocked: boolean;
  email: string;
  onRefine: (next: Intake) => void;
  onRestart: () => void;
  onUnlocked: (r: { email: string; emailQueued: boolean }) => void;
}

function Result({ intake, unlocked, email, onRefine, onRestart, onUnlocked }: ResultProps) {
  const rec = useMemo(() => recommend(intake), [intake]);
  // Real cashflow (in buildPlan) is only materialised once unlocked — while locked
  // it never enters state/DOM (v2 rule). The unlock form builds a PDF transiently.
  const plan = useMemo(() => (unlocked ? buildPlan(rec, intake) : null), [unlocked, rec, intake]);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    capture('results_viewed');
  }, []);

  const openUnlock = useCallback(() => {
    capture('unlock_clicked');
    setFormOpen(true);
  }, []);

  const makePdfBase64 = useCallback(() => planPdfBase64(buildPlan(rec, intake)), [rec, intake]);

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

      <ResultPanel rec={rec} unlocked={unlocked} />

      {unlocked && plan ? (
        <>
          <RefinePanel intake={intake} onChange={onRefine} />
          <PlanView
            plan={plan}
            showHeadline={false}
            onDownloadPdf={() => {
              capture('pdf_downloaded');
              exportPdf(plan);
            }}
            onDownloadJson={() => exportJson(plan)}
          />
          <PostUnlockPanel email={email} />
        </>
      ) : (
        <>
          <LockedPaybackChart onUnlock={openUnlock} />

          {/* Unlock CTA — free while in early access (Task 4A) */}
          <div data-testid="unlock-cta" className="mt-4 rounded-lg border border-dashed border-amber-500 bg-amber-500/5 p-4">
            <div className="font-bold text-sm text-navy-900">Unlock your full plan, free while we&apos;re in early access</div>
            <p className="text-sm text-muted mt-0.5">
              Tell us where to send it &rarr; scenario comparison, payback timeline, the rebates for your
              postcode, and a downloadable PDF. No payment.
            </p>
            <button
              onClick={openUnlock}
              data-testid="unlock-cta-btn"
              className="mt-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-sm px-4 py-2"
            >
              Unlock my plan (free)
            </button>
          </div>

          <WaitlistCapture />

          <p className="mt-3 text-[11px] text-muted italic">
            General information only. Not personal financial or product advice. Figures reflect Australia{' '}
            {new Date().getFullYear()} and may change over time.
          </p>
        </>
      )}

      {formOpen && (
        <UnlockDialog
          onClose={() => setFormOpen(false)}
          onUnlocked={(r) => {
            setFormOpen(false);
            onUnlocked(r);
          }}
          makePdfBase64={makePdfBase64}
        />
      )}
    </div>
  );
}
