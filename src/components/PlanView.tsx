import type { Plan } from '../core/report.ts';
import { ScenarioTable } from './ScenarioTable.tsx';
import { PaybackChart } from './PaybackChart.tsx';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
const pb = (y: number) => (!isFinite(y) || y <= 0 ? '—' : y.toFixed(1) + ' yrs');

interface Props {
  plan: Plan;
  onDownloadPdf: () => void;
  onDownloadJson: () => void;
}

export function PlanView({ plan, onDownloadPdf, onDownloadJson }: Props) {
  const win = plan.recommended;

  return (
    <div data-testid="plan-view">
      {/* Headline */}
      <div className="rounded-xl border border-amber-500 bg-gradient-to-br from-white to-canvas p-5 mb-4">
        <div className="text-xs uppercase tracking-wide text-amber-600 font-semibold">
          Your personalised plan
        </div>
        <div className="text-xl font-bold text-navy-900 mt-1">{plan.headline}</div>
        <p className="text-sm text-navy-700 mt-1">{win.reason}</p>
        {win.key !== 'nothing' && (
          <div className="flex gap-5 mt-3 text-sm tnum">
            <div>
              <div className="text-xs text-muted">Cost</div>
              <b className="text-navy-900">{fmt(win.cost)}</b>
            </div>
            <div>
              <div className="text-xs text-muted">Saving/yr</div>
              <b className="text-navy-900">{win.savingPerYear > 0 ? fmt(win.savingPerYear) : '—'}</b>
            </div>
            <div>
              <div className="text-xs text-muted">Payback</div>
              <b className="text-navy-900">{pb(win.paybackYears)}</b>
            </div>
          </div>
        )}
      </div>

      {/* Scenario table */}
      <ScenarioTable rows={plan.scenarios} />

      {/* Payback chart */}
      <PaybackChart points={plan.cashflow} />

      {/* Rebates & rates */}
      <div className="rounded-xl border border-hairline bg-surface p-5 mt-4" data-testid="plan-rebates">
        <h2 className="text-xs uppercase tracking-wide text-muted mb-2">Rebates &amp; rates for {plan.state}</h2>
        <p className="text-sm text-navy-700">{plan.rebatesNote}</p>
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-hairline bg-surface p-5 mt-4" data-testid="plan-checklist">
        <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Before you commit — checklist</h2>
        <ul className="space-y-2">
          {plan.checklist.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-amber-500 shrink-0">▸</span>
              <span className="text-navy-700">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Export buttons */}
      <div className="flex gap-3 mt-4" data-testid="plan-exports">
        <button
          onClick={onDownloadPdf}
          className="rounded-lg bg-navy-900 hover:bg-navy-700 text-white font-semibold text-sm px-4 py-2"
        >
          Download PDF
        </button>
        <button
          onClick={onDownloadJson}
          className="rounded-lg border border-hairline hover:border-navy-900 text-navy-900 font-semibold text-sm px-4 py-2"
        >
          Export JSON
        </button>
      </div>

      {/* Disclaimer */}
      <p className="mt-3 text-[11px] text-muted italic">{plan.disclaimer}</p>
    </div>
  );
}
