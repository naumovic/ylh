import type { ScenarioRow } from '../core/report.ts';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
const pb = (y: number) => (!isFinite(y) || y <= 0 ? '—' : y.toFixed(1) + ' yrs');

interface Props {
  rows: ScenarioRow[];
}

export function ScenarioTable({ rows }: Props) {
  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-hairline bg-surface p-5 mt-4" data-testid="scenario-table">
      <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Scenario comparison · ballpark</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-muted">
              <th className="pb-2 pr-4 font-medium">Scenario</th>
              <th className="pb-2 pr-4 font-medium text-right">Cost</th>
              <th className="pb-2 pr-4 font-medium text-right">Saving/yr</th>
              <th className="pb-2 font-medium text-right">Payback</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-hairline last:border-0">
                <td className="py-2 pr-4 text-navy-900">{r.name}</td>
                <td className="py-2 pr-4 text-right tnum">{r.cost > 0 ? fmt(r.cost) : '—'}</td>
                <td className="py-2 pr-4 text-right tnum">{r.saving > 0 ? fmt(r.saving) : '—'}</td>
                <td className="py-2 text-right tnum">{pb(r.paybackYears)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
