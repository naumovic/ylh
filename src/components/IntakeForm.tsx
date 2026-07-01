import { useState, useEffect, useCallback } from 'react';
import { ratesFor } from '../core/config.ts';
import type { Intake, SolarStatus, Period, UsageProfile, EvStatus, ChargeWindow, Goal } from '../core/types.ts';

const field = 'w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40';
const lbl = 'block text-xs text-muted mb-1';

const GOALS: { key: Goal; label: string }[] = [
  { key: 'bill_savings', label: 'Lower bills' },
  { key: 'backup', label: 'Blackout backup' },
  { key: 'go_electric', label: 'Go electric' },
];

interface Props {
  initial: Intake;
  onChange: (intake: Intake) => void;
}

export function IntakeForm({ initial, onChange }: Props) {
  const [postcode, setPostcode] = useState(initial.postcode);
  const [solarStatus, setSolar] = useState<SolarStatus>(initial.solarStatus);
  const [period, setPeriod] = useState<Period>(initial.period);
  const [usageKwh, setUsage] = useState(initial.usageKwh);
  const [exportKwh, setExport] = useState(initial.exportKwh);
  const [profile, setProfile] = useState<UsageProfile>(initial.usageProfile);
  const [solarKw, setSolarKw] = useState(initial.solarKw);
  const [addKw, setAddKw] = useState(initial.addKw);
  const [ev, setEv] = useState<EvStatus>(initial.ev);
  const [charge, setCharge] = useState<ChargeWindow>(initial.charge);
  const [goals, setGoals] = useState<Goal[]>(initial.goals);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [importOverride, setImportOverride] = useState<number | null>(null);
  const [fitOverride, setFitOverride] = useState<number | null>(null);

  const rates = ratesFor(postcode);

  const build = useCallback((): Intake => {
    const r = ratesFor(postcode);
    return {
      postcode,
      state: r.state,
      importRateCents: importOverride ?? r.importCents,
      fitCents: fitOverride ?? r.fitCents,
      solarStatus,
      period,
      usageKwh,
      exportKwh: solarStatus === 'none' ? 0 : exportKwh,
      usageProfile: profile,
      solarKw: solarStatus === 'none' ? 0 : solarKw,
      addKw: solarStatus === 'none' ? 0 : addKw,
      ev,
      charge,
      goals,
    };
  }, [postcode, solarStatus, period, usageKwh, exportKwh, profile, solarKw, addKw, ev, charge, goals, importOverride, fitOverride]);

  useEffect(() => {
    onChange(build());
  }, [build, onChange]);

  const toggleGoal = (g: Goal) => {
    setGoals((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const hasSolar = solarStatus === 'have';
  const hasEv = ev !== 'none';

  return (
    <section className="rounded-xl border border-hairline bg-surface p-5 h-fit">
      <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Your details</h2>
      <div className="grid grid-cols-2 gap-3">
        {/* Postcode */}
        <div>
          <label className={lbl}>Postcode</label>
          <input className={field} value={postcode} onChange={(e) => setPostcode(e.target.value)} />
        </div>

        {/* Solar status */}
        <div>
          <label className={lbl}>Solar?</label>
          <select className={field} value={solarStatus} onChange={(e) => setSolar(e.target.value as SolarStatus)}>
            <option value="have">I have solar</option>
            <option value="none">No solar yet</option>
          </select>
        </div>

        {/* Billing period */}
        <div>
          <label className={lbl}>Billing period</label>
          <select className={field} value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>

        {/* Usage */}
        <div>
          <label className={lbl}>{hasSolar ? `Grid import (kWh/${period === 'quarterly' ? 'qtr' : 'mo'})` : `Total usage (kWh/${period === 'quarterly' ? 'qtr' : 'mo'})`}</label>
          <input type="number" className={field} value={usageKwh} onChange={(e) => setUsage(+e.target.value)} />
        </div>

        {/* Export — only with solar */}
        {hasSolar && (
          <div>
            <label className={lbl}>Solar export (kWh/{period === 'quarterly' ? 'qtr' : 'mo'})</label>
            <input type="number" className={field} value={exportKwh} onChange={(e) => setExport(+e.target.value)} />
          </div>
        )}

        {/* Solar size — only with solar */}
        {hasSolar && (
          <div>
            <label className={lbl}>Solar size (kW)</label>
            <input type="number" className={field} value={solarKw} step={0.1} onChange={(e) => setSolarKw(+e.target.value)} />
          </div>
        )}

        {/* Add panels — only with solar */}
        {hasSolar && (
          <div>
            <label className={lbl}>Panels to add (kW)</label>
            <input type="number" className={field} value={addKw} step={0.5} onChange={(e) => setAddKw(+e.target.value)} />
          </div>
        )}

        {/* Usage pattern */}
        <div>
          <label className={lbl}>Usage pattern</label>
          <select className={field} value={profile} onChange={(e) => setProfile(e.target.value as UsageProfile)}>
            <option value="day_heavy">Day-heavy (WFH)</option>
            <option value="even">Even</option>
            <option value="night_heavy">Night-heavy</option>
            <option value="unknown">Not sure</option>
          </select>
        </div>

        {/* EV */}
        <div>
          <label className={lbl}>EV</label>
          <select className={field} value={ev} onChange={(e) => setEv(e.target.value as EvStatus)}>
            <option value="none">None</option>
            <option value="buying">Buying one</option>
            <option value="own">Own one</option>
          </select>
        </div>

        {/* Charging window — only when EV != none */}
        {hasEv && (
          <div className="col-span-2">
            <label className={lbl}>EV charging</label>
            <select className={field} value={charge} onChange={(e) => setCharge(e.target.value as ChargeWindow)}>
              <option value="daytime_home">Daytime at home</option>
              <option value="night_home">Overnight</option>
              <option value="away">Away / public</option>
            </select>
          </div>
        )}

        {/* Goals */}
        <div className="col-span-2">
          <label className={lbl}>Goals</label>
          <div className="flex gap-3 flex-wrap">
            {GOALS.map((g) => (
              <label key={g.key} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={goals.includes(g.key)}
                  onChange={() => toggleGoal(g.key)}
                  className="accent-amber-500"
                />
                {g.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="mt-3 text-xs text-muted hover:text-navy-900 underline underline-offset-2"
      >
        {showAdvanced ? 'Hide advanced' : 'Advanced: override rates'}
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <label className={lbl}>Import rate (c/kWh)</label>
            <input
              type="number"
              className={field}
              value={importOverride ?? rates.importCents}
              onChange={(e) => setImportOverride(+e.target.value)}
              step={0.1}
            />
          </div>
          <div>
            <label className={lbl}>Feed-in tariff (c/kWh)</label>
            <input
              type="number"
              className={field}
              value={fitOverride ?? rates.fitCents}
              onChange={(e) => setFitOverride(+e.target.value)}
              step={0.1}
            />
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-muted" data-testid="state-label">
        Rates auto-set from postcode ({rates.state}: {importOverride ?? rates.importCents}c import / {fitOverride ?? rates.fitCents}c feed-in).
      </p>
    </section>
  );
}
