import { useState } from 'react';
import type { Intake, Period, ChargeWindow } from '../core/types.ts';

const field = 'w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm tnum focus:outline-none focus:ring-2 focus:ring-amber-500/40';
const lbl = 'block text-xs text-muted mb-1';

interface Props {
  intake: Intake;
  onChange: (next: Intake) => void;
}

/**
 * "Refine your numbers" — the presets the wizard set, editable below the result.
 * Fully controlled off `intake`; every edit calls onChange so the engine re-runs
 * instantly. It never computes a result figure — only the inputs.
 */
export function RefinePanel({ intake, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const patch = <K extends keyof Intake>(k: K, v: Intake[K]) => onChange({ ...intake, [k]: v });

  const hasSolar = intake.solarStatus === 'have';
  const hasEv = intake.ev !== 'none';
  const per = intake.period === 'quarterly' ? 'qtr' : 'mo';

  return (
    <section className="rounded-xl border border-hairline bg-surface mt-4" data-testid="refine-panel">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid="refine-toggle"
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <span>
          <span className="font-semibold text-sm text-navy-900">Refine your numbers</span>
          <span className="block text-xs text-muted">We estimated these. Adjust any and the result updates instantly.</span>
        </span>
        <span className="text-muted text-sm shrink-0 ml-3">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-hairline pt-4" data-testid="refine-body">
          <div className="grid grid-cols-2 gap-3">
            {/* Billing period */}
            <div>
              <label className={lbl}>Billing period</label>
              <select className={field} data-testid="refine-period" value={intake.period} onChange={(e) => patch('period', e.target.value as Period)}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>

            {/* Grid import / total usage */}
            <div>
              <label className={lbl}>{hasSolar ? `Grid import (kWh/${per})` : `Total usage (kWh/${per})`}</label>
              <input type="number" className={field} data-testid="refine-usage" value={intake.usageKwh} onChange={(e) => patch('usageKwh', +e.target.value)} />
            </div>

            {hasSolar && (
              <div>
                <label className={lbl}>Solar export (kWh/{per})</label>
                <input type="number" className={field} data-testid="refine-export" value={intake.exportKwh} onChange={(e) => patch('exportKwh', +e.target.value)} />
              </div>
            )}

            {hasSolar && (
              <div>
                <label className={lbl}>Solar size (kW)</label>
                <input type="number" step={0.1} className={field} value={intake.solarKw} onChange={(e) => patch('solarKw', +e.target.value)} />
              </div>
            )}

            {hasSolar && (
              <div>
                <label className={lbl}>Panels to add (kW)</label>
                <input type="number" step={0.5} className={field} data-testid="refine-addkw" value={intake.addKw} onChange={(e) => patch('addKw', +e.target.value)} />
              </div>
            )}

            {hasEv && (
              <div className="col-span-2">
                <label className={lbl}>EV charging habits</label>
                <select className={field} value={intake.charge} onChange={(e) => patch('charge', e.target.value as ChargeWindow)}>
                  <option value="daytime_home">Daytime at home</option>
                  <option value="night_home">Overnight</option>
                  <option value="away">Away / public</option>
                </select>
              </div>
            )}

            {/* Rate overrides */}
            <div>
              <label className={lbl}>Import rate (c/kWh)</label>
              <input type="number" step={0.1} className={field} data-testid="refine-import" value={intake.importRateCents} onChange={(e) => patch('importRateCents', +e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Feed-in tariff (c/kWh)</label>
              <input type="number" step={0.1} className={field} value={intake.fitCents} onChange={(e) => patch('fitCents', +e.target.value)} />
            </div>
          </div>

          <p className="mt-3 text-xs text-muted" data-testid="state-label">
            Rates for {intake.state}: {intake.importRateCents}c import / {intake.fitCents}c feed-in.
          </p>
        </div>
      )}
    </section>
  );
}
