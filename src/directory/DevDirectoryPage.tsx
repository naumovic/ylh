// Dev-only harness for <DirectorySection> (build plan §1). Mounted at /dev/directory and
// gated behind import.meta.env.DEV so it — and all directory data it pulls in — is dead
// code that Rollup drops from production bundles. Mirrors the prototype's controls: a
// scenario switcher (battery / solar / EV / do-nothing) + a postcode input, plus a toast
// showing the analytics event that WOULD fire (real PostHog wiring is Phase 2).

import { useMemo, useState } from 'react';
import { DirectorySection } from './DirectorySection.tsx';
import type { WorkType } from './types.ts';

type Scenario = 'battery' | 'solar' | 'ev' | 'nothing';

const SCENARIOS: { key: Scenario; label: string; big: string; why: string; work: WorkType | null }[] = [
  { key: 'battery', label: 'Battery wins', big: 'Add a battery (≈13 kWh)', why: 'Payback ≈ 6.1 yrs at your usage. Federal rebate applies.', work: 'battery' },
  { key: 'solar', label: 'More solar wins', big: 'Upgrade your solar (6.6 → 10 kW)', why: 'Your daytime load outgrew the array; export is minimal.', work: 'solar' },
  { key: 'ev', label: 'EV daytime charging', big: 'Charge your EV in the daytime', why: 'Your surplus covers ~13 kWh/day — a smart charger helps.', work: 'ev_charger' },
  { key: 'nothing', label: 'Do nothing', big: 'Do nothing — your setup is already optimal', why: 'A battery would take 14+ years to pay back. Keep exporting.', work: null },
];

export default function DevDirectoryPage() {
  const [scenario, setScenario] = useState<Scenario>('battery');
  const [postcode, setPostcode] = useState('4000');
  const [toast, setToast] = useState<string | null>(null);

  const active = useMemo(() => SCENARIOS.find((s) => s.key === scenario)!, [scenario]);

  function onEvent(name: string, props?: Record<string, unknown>) {
    setToast(`posthog: ${name} ${props ? JSON.stringify(props) : ''}`);
    window.clearTimeout((onEvent as { _t?: number })._t);
    (onEvent as { _t?: number })._t = window.setTimeout(() => setToast(null), 2500);
  }

  return (
    <div className="min-h-full bg-canvas">
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-xl font-bold text-navy-900">
          Installer Directory <span className="font-normal text-muted">— dev harness</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          This section renders <b>below</b> the ranked answer. Use the switcher to see how it adapts —
          especially the &ldquo;do nothing&rdquo; case. Try postcode <b>4870</b> (Cairns) for the empty
          state. Bottom-right toast = the PostHog event that would fire.
        </p>

        <div className="mt-4 rounded-xl border border-hairline bg-surface p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Prototype controls — simulate the engine result
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <div>
              <div className="mb-1 text-xs text-muted">Scenario (what the engine recommended)</div>
              <div className="flex flex-wrap gap-2">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setScenario(s.key)}
                    aria-pressed={s.key === scenario}
                    data-testid={`scenario-${s.key}`}
                    className={
                      s.key === scenario
                        ? 'rounded-lg border border-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-600'
                        : 'rounded-lg border border-hairline px-3 py-1.5 text-xs text-navy-700 hover:border-navy-700'
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted">Postcode</div>
              <input
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.trim())}
                inputMode="numeric"
                data-testid="dev-postcode"
                className="w-24 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
          </div>
        </div>

        {/* Result-context banner — stands in for the real ranked answer + plan gate. */}
        <div className="mt-4 rounded-xl border border-hairline bg-gradient-to-br from-canvas to-surface p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted">Your result</div>
          <div className="mt-1 text-lg font-bold text-navy-900">{active.big}</div>
          <div className="text-sm text-muted">{active.why}</div>
          <div className="mt-2 text-xs italic text-muted">
            …(options table, paid-plan gate etc. sit here — omitted in this harness)…
          </div>
        </div>

        <DirectorySection
          key={scenario /* reset internal state on scenario switch, like the prototype */}
          postcode={postcode || '4000'}
          recommendedWork={active.work}
          onEvent={onEvent}
        />
      </main>

      {toast && (
        <div className="fixed bottom-3 right-3 max-w-xs rounded-lg border border-hairline bg-surface px-3 py-2 text-[11px] text-navy-700 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
