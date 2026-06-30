import { useMemo, useState } from 'react';
import { recommend } from './core/engine.ts';
import { ratesFor } from './core/config.ts';
import type { Intake, Option } from './core/types.ts';

// NOTE (for Claude Code): this is a minimal, themed shell proving the engine wiring +
// brand. Build the full product from here: precise-inputs gate, scenario table, payback
// chart, client-side PDF, Stripe Checkout + /api/verify unlock, PostHog, waitlist, PWA.
// The deterministic `core` is the source of truth — never recompute numbers in the UI.

const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
const pb = (y: number) => (!isFinite(y) || y <= 0 ? '—' : y.toFixed(1) + ' yrs');

function pill(o: Option) {
  if (o.key === 'nothing') return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warn/10 text-warn">baseline</span>;
  const cls = o.savingPerYear <= 0 ? 'bg-danger/10 text-danger'
    : o.paybackYears <= 6 ? 'bg-good/10 text-good'
    : o.paybackYears <= 10 ? 'bg-warn/10 text-warn' : 'bg-danger/10 text-danger';
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full tnum ${cls}`}>{o.savingPerYear <= 0 ? 'no payback' : pb(o.paybackYears)}</span>;
}

const field = 'w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40';
const label = 'block text-xs text-muted mb-1';

export function App() {
  const [postcode, setPostcode] = useState('4000');
  const [solarStatus, setSolar] = useState<'have' | 'none'>('have');
  const [usageKwh, setUsage] = useState(200);
  const [exportKwh, setExport] = useState(400);
  const [profile, setProfile] = useState<Intake['usageProfile']>('day_heavy');
  const [solarKw, setSolarKw] = useState(6.6);
  const [ev, setEv] = useState<Intake['ev']>('buying');
  const [charge, setCharge] = useState<Intake['charge']>('daytime_home');

  const rec = useMemo(() => {
    const r = ratesFor(postcode);
    const intake: Intake = {
      postcode, state: r.state, importRateCents: r.importCents, fitCents: r.fitCents,
      solarStatus, period: 'monthly', usageKwh, exportKwh: solarStatus === 'none' ? 0 : exportKwh,
      usageProfile: profile, solarKw: solarStatus === 'none' ? 0 : solarKw, addKw: 3,
      ev, charge, goals: ['bill_savings'],
    };
    return { intake, result: recommend(intake) };
  }, [postcode, solarStatus, usageKwh, exportKwh, profile, solarKw, ev, charge]);

  const win = rec.result.options.find((o) => o.key === rec.result.winner)!;

  return (
    <div className="min-h-full">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto max-w-5xl px-5 py-4 flex items-center gap-3">
          <img src="/logo.svg" width={32} height={32} alt="" />
          <div>
            <div className="font-bold text-navy-900 leading-none">Your Local Hero</div>
            <div className="text-xs text-muted">Honest solar, EV &amp; battery advice — even if the answer is "do nothing".</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6 grid gap-5 md:grid-cols-[340px_1fr]">
        {/* Intake */}
        <section className="rounded-xl border border-hairline bg-surface p-5 h-fit">
          <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Your details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Postcode</label><input className={field} value={postcode} onChange={(e) => setPostcode(e.target.value)} /></div>
            <div><label className={label}>Solar?</label>
              <select className={field} value={solarStatus} onChange={(e) => setSolar(e.target.value as 'have' | 'none')}>
                <option value="have">I have solar</option><option value="none">No solar yet</option>
              </select>
            </div>
            <div><label className={label}>{solarStatus === 'none' ? 'Total usage (kWh/mo)' : 'Grid import (kWh/mo)'}</label><input type="number" className={field} value={usageKwh} onChange={(e) => setUsage(+e.target.value)} /></div>
            {solarStatus === 'have' && <div><label className={label}>Solar export (kWh/mo)</label><input type="number" className={field} value={exportKwh} onChange={(e) => setExport(+e.target.value)} /></div>}
            {solarStatus === 'have' && <div><label className={label}>Solar size (kW)</label><input type="number" className={field} value={solarKw} onChange={(e) => setSolarKw(+e.target.value)} /></div>}
            <div><label className={label}>Usage pattern</label>
              <select className={field} value={profile} onChange={(e) => setProfile(e.target.value as Intake['usageProfile'])}>
                <option value="day_heavy">Day-heavy (WFH)</option><option value="even">Even</option><option value="night_heavy">Night-heavy</option><option value="unknown">Not sure</option>
              </select>
            </div>
            <div><label className={label}>EV</label>
              <select className={field} value={ev} onChange={(e) => setEv(e.target.value as Intake['ev'])}>
                <option value="none">None</option><option value="buying">Buying one</option><option value="own">Own one</option>
              </select>
            </div>
            <div className="col-span-2"><label className={label}>EV charging</label>
              <select className={field} value={charge} onChange={(e) => setCharge(e.target.value as Intake['charge'])}>
                <option value="daytime_home">Daytime at home</option><option value="night_home">Overnight</option><option value="away">Away / public</option>
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">Rates auto-set from postcode ({rec.intake.state}: {rec.intake.importRateCents}c import / {rec.intake.fitCents}c feed-in).</p>
        </section>

        {/* Result */}
        <section>
          <div className="rounded-xl border border-hairline bg-gradient-to-br from-white to-canvas p-5 mb-4">
            <div className="text-xs uppercase tracking-wide text-muted">Recommended next move · ballpark</div>
            <div className="text-xl font-bold text-navy-900 mt-1">{rec.result.winner === 'nothing' ? 'Hold off — nothing pays back well enough yet' : `✓ ${win.name}`}</div>
            <p className="text-sm text-navy-700 mt-1">{win.reason}</p>
          </div>

          <div className="rounded-xl border border-hairline bg-surface p-5">
            <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Ranked options</h2>
            <div className="space-y-2.5">
              {rec.result.options.map((o) => {
                const winner = o.key === rec.result.winner;
                return (
                  <div key={o.key} className={`rounded-lg border p-3.5 ${winner ? 'border-amber-500 ring-1 ring-amber-500' : 'border-hairline'}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold text-sm text-navy-900">{winner ? '★ ' : ''}{o.name}</span>
                      {pill(o)}
                    </div>
                    {o.key !== 'nothing' && (
                      <div className="flex gap-5 my-1.5 text-sm tnum">
                        <div><div className="text-xs text-muted">Cost</div><b>{fmt(o.cost)}</b></div>
                        <div><div className="text-xs text-muted">Saving/yr</div><b>{o.savingPerYear > 0 ? fmt(o.savingPerYear) : '—'}</b></div>
                        <div><div className="text-xs text-muted">Payback</div><b>{pb(o.paybackYears)}</b></div>
                      </div>
                    )}
                    <p className="text-sm text-muted">{o.reason}{o.extra ? <span className="text-navy-700"> {o.extra}</span> : null}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg border border-dashed border-amber-500 bg-amber-500/5 p-4">
              <div className="font-bold text-sm text-navy-900">🔓 Unlock your precise, personalised plan — A$29</div>
              <p className="text-sm text-muted mt-0.5">Your exact tariff &amp; usage → scenario comparison, payback chart, the rebates for your postcode, and a downloadable PDF. <i>(Wire to Stripe Checkout + /api/verify.)</i></p>
              <button className="mt-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-navy-900 font-bold text-sm px-4 py-2">Unlock plan — A$29</button>
            </div>
            <p className="mt-3 text-[11px] text-muted italic">General information only — not personal financial or product advice. Figures reflect Australia mid-2026 and change over time.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
