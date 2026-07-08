import type { Recommendation, Option } from '../core/types.ts';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
const pb = (y: number) => (!isFinite(y) || y <= 0 ? '—' : y.toFixed(1) + ' yrs');

function pill(o: Option, unlocked: boolean) {
  if (o.key === 'nothing')
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warn/10 text-warn">baseline</span>;

  // Payback timing is a paid detail — while locked, show a lock cue instead of the number.
  if (!unlocked)
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
        🔒 payback
      </span>
    );

  const cls =
    o.savingPerYear <= 0
      ? 'bg-danger/10 text-danger'
      : o.paybackYears <= 6
        ? 'bg-good/10 text-good'
        : o.paybackYears <= 10
          ? 'bg-warn/10 text-warn'
          : 'bg-danger/10 text-danger';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full tnum ${cls}`}>
      {o.savingPerYear <= 0 ? 'no payback' : pb(o.paybackYears)}
    </span>
  );
}

interface Props {
  rec: Recommendation;
  unlocked: boolean;
}

export function ResultPanel({ rec, unlocked }: Props) {
  const win = rec.options.find((o) => o.key === rec.winner)!;

  return (
    <>
      {/* Headline */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-white to-amber-500/5 p-5 mb-4">
        <div className="text-xs uppercase tracking-wide text-muted">
          Recommended next move{unlocked ? '' : ' · ballpark'}
        </div>
        <div className="text-xl font-bold text-navy-900 mt-1">
          {rec.winner === 'nothing' ? 'Hold off, nothing pays back well enough yet' : win.name}
        </div>
        <p className="text-sm text-navy-700 mt-1">{win.reason}</p>
      </div>

      {/* Ranked option cards */}
      <div className="rounded-xl border border-hairline bg-surface p-5">
        <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Ranked options</h2>
        <div className="space-y-2.5">
          {rec.options.map((o) => {
            const winner = o.key === rec.winner;
            return (
              <div
                key={o.key}
                data-testid={`option-${o.key}`}
                className={`rounded-lg border p-3.5 ${winner ? 'border-amber-500 ring-1 ring-amber-500' : 'border-hairline'}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-sm text-navy-900">
                    {winner && o.key !== 'nothing' ? '★ ' : ''}
                    {o.name}
                  </span>
                  {pill(o, unlocked)}
                </div>
                {o.key !== 'nothing' && (
                  <div className="flex gap-5 my-1.5 text-sm tnum">
                    <div>
                      <div className="text-xs text-muted">Cost</div>
                      <b>{fmt(o.cost)}</b>
                    </div>
                    <div>
                      <div className="text-xs text-muted">Saving/yr</div>
                      <b>{o.savingPerYear > 0 ? fmt(o.savingPerYear) : '—'}</b>
                    </div>
                    {/* Payback timing is gated behind the unlock. */}
                    {unlocked && (
                      <div>
                        <div className="text-xs text-muted">Payback</div>
                        <b>{pb(o.paybackYears)}</b>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted">
                  {o.reason}
                  {o.extra ? <span className="text-navy-700"> {o.extra}</span> : null}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
