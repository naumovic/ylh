import { PaybackChart } from './PaybackChart.tsx';
import type { CashflowPoint } from '../core/report.ts';

/**
 * Hard-coded teaser series — deliberately NOT derived from the user's numbers.
 * The real cashflow is never computed while locked (see App), so there is
 * nothing in the DOM or JS state that devtools could un-blur to reveal it.
 * These values are illustrative only.
 */
const DUMMY_POINTS: CashflowPoint[] = Array.from({ length: 16 }, (_, year) => ({
  year,
  net: -9000 + 1500 * year,
}));

interface Props {
  onUnlock: () => void;
}

/** Blurred placeholder of the flagship payback chart, with an unlock overlay. */
export function LockedPaybackChart({ onUnlock }: Props) {
  return (
    <div className="relative mt-4" data-testid="locked-payback">
      {/* Decorative, blurred dummy chart — aria-hidden so SR users skip it. */}
      <div className="pointer-events-none select-none blur-[6px] opacity-70" aria-hidden="true">
        <PaybackChart points={DUMMY_POINTS} testId="payback-teaser" />
      </div>

      {/* Unlock overlay */}
      <div className="absolute inset-0 rounded-xl bg-white/40 flex flex-col items-center justify-center text-center gap-2 px-6">
        <div className="text-2xl" aria-hidden="true">🔒</div>
        <div className="font-bold text-sm text-navy-900">Unlock your full payback timeline</div>
        <p className="text-xs text-muted max-w-xs">
          See the exact year your investment breaks even, charted for your place.
        </p>
        <button
          onClick={onUnlock}
          data-testid="unlock-chart"
          className="mt-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-sm px-4 py-2"
        >
          Unlock full timeline
        </button>
      </div>
    </div>
  );
}
