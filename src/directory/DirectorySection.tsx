// Consumer-facing directory (design §2 anatomy), brand-styled per CLAUDE.md (light
// theme, amber accent on navy). Renders BELOW the engine's answer. When the answer is
// "do nothing" it collapses behind an explicit click — the trust moment.
//
// Phase 1: mounted only on the dev route. It does NOT wire real PostHog (Phase 2 does);
// instead it emits events through an optional `onEvent` callback so the dev page can show
// them as a toast, exactly like the prototype. No user data is ever sent to installers.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import installersData from '../data/installers.json' with { type: 'json' };
import zonesData from '../data/zones.json' with { type: 'json' };
import centroidsData from '../data/postcode-centroids.json' with { type: 'json' };
import { match } from './match.ts';
import type {
  Centroids,
  CompanyType,
  InstallersFile,
  MatchedInstaller,
  WorkType,
  ZonesFile,
} from './types.ts';

// JSON imports infer arrays as `number[]`, not tuples — cast through `unknown`.
const INSTALLERS = (installersData as unknown as InstallersFile).installers;
const ZONES = zonesData as unknown as ZonesFile;
const CENTROIDS = centroidsData as unknown as Centroids;

const WORK_LABEL: Record<WorkType, string> = {
  battery: 'Battery',
  solar: 'Solar',
  ev_charger: 'EV charger',
};
const WORK_ORDER: WorkType[] = ['battery', 'solar', 'ev_charger'];

// Company-type badge (design §9.2). `unknown` renders NO badge — we never guess a
// company's delivery model in public. Copy stays neutral between the two models.
const COMPANY_BADGE: Record<Exclude<CompanyType, 'unknown'>, string> = {
  installer: 'Local installer',
  retailer: 'Retailer — uses contracted installers',
};

/** PostHog events for the directory (design §2). Kept as a named union so the real
 *  analytics layer can type-check that it handles every one. */
export type DirectoryEventName =
  | 'directory_viewed'
  | 'directory_shown_anyway'
  | 'installer_phone_revealed'
  | 'installer_site_clicked'
  | 'featured_impression'
  | 'featured_clicked'
  | 'empty_state_waitlist_joined';

export type DirectoryEvent = (name: DirectoryEventName, props?: Record<string, unknown>) => void;

interface DirectorySectionProps {
  postcode: string;
  /** The engine's winning work type, or null when the answer is "do nothing". */
  recommendedWork: WorkType | null;
  onEvent?: DirectoryEvent;
}

export function DirectorySection({ postcode, recommendedWork, onEvent }: DirectorySectionProps) {
  const isDoNothing = recommendedWork === null;
  const [workFilter, setWorkFilter] = useState<WorkType>(recommendedWork ?? 'battery');
  const [showAnyway, setShowAnyway] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [waitlisted, setWaitlisted] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false); // shared "Two ways to buy" (§9.2)

  // Re-sync when the engine result changes (e.g. the dev scenario switcher).
  useEffect(() => {
    setShowAnyway(false);
    setRevealed({});
    setWaitlisted(false);
    if (recommendedWork) setWorkFilter(recommendedWork);
  }, [recommendedWork, postcode]);

  const collapsed = isDoNothing && !showAnyway;

  const { featured, organic } = useMemo(
    () => match({ installers: INSTALLERS, zones: ZONES, centroids: CENTROIDS, postcode, work: workFilter }),
    [postcode, workFilter],
  );

  useEffect(() => {
    if (collapsed) {
      onEvent?.('directory_viewed', { postcode, collapsed: true });
      return;
    }
    onEvent?.('directory_viewed', {
      postcode,
      work: workFilter,
      featured: featured.length,
      organic: organic.length,
    });
    // One pre-qualified impression per featured slot shown (the number that prices the slot).
    featured.forEach((i, position) =>
      onEvent?.('featured_impression', { id: i.id, postcode, work: workFilter, position }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, postcode, workFilter, featured.length, organic.length]);

  function reveal(inst: MatchedInstaller, isFeatured: boolean) {
    setRevealed((r) => ({ ...r, [inst.id]: true }));
    onEvent?.('installer_phone_revealed', { id: inst.id, featured: isFeatured, postcode });
  }

  return (
    <section
      className="mt-8 rounded-xl border border-navy-900/10 bg-navy-900/[0.035] p-5"
      data-testid="directory-section"
      aria-label="Vetted installers"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-700/80">
        Ready to act? · Find an installer
      </div>
      <h2 className="mt-0.5 text-base font-bold text-navy-900">Vetted installers near {postcode}</h2>

      {collapsed ? (
        <DoNothingCollapse
          onShow={() => {
            setShowAnyway(true);
            onEvent?.('directory_shown_anyway', { postcode });
          }}
        />
      ) : (
        <>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Every installer here passed the same vetting — accreditation, licence and history checked.
            Featured spots are paid, clearly marked, capped at two, and{' '}
            <b className="text-ink">never affect your recommendation or the ordering below them</b>.
          </p>

          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Work type">
            {WORK_ORDER.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWorkFilter(w)}
                aria-pressed={w === workFilter}
                data-testid={`chip-${w}`}
                className={
                  w === workFilter
                    ? 'rounded-full border border-navy-900 bg-navy-900 px-3 py-1 text-xs font-semibold text-white'
                    : 'rounded-full border border-navy-900/15 bg-surface px-3 py-1 text-xs text-navy-700 hover:border-navy-700'
                }
              >
                {WORK_LABEL[w]}
              </button>
            ))}
          </div>

          {explainerOpen && <TwoWaysExplainer onClose={() => setExplainerOpen(false)} />}

          {featured.length === 0 && organic.length === 0 ? (
            <EmptyState
              postcode={postcode}
              joined={waitlisted}
              onJoin={() => {
                setWaitlisted(true);
                onEvent?.('empty_state_waitlist_joined', { postcode });
              }}
            />
          ) : (
            <>
              {featured.length > 0 && (
                <>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                    Featured (paid placement — max 2, capped)
                  </p>
                  <div className="mt-2 space-y-3">
                    {featured.map((i) => (
                      <InstallerCard
                        key={i.id}
                        installer={i}
                        featured
                        revealed={!!revealed[i.id]}
                        onReveal={() => reveal(i, true)}
                        onVisit={() => onEvent?.('featured_clicked', { id: i.id, postcode })}
                        onShowExplainer={() => setExplainerOpen(true)}
                      />
                    ))}
                  </div>
                </>
              )}

              {organic.length > 0 && (
                <>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    All vetted installers — ordered by distance, never by fees
                  </p>
                  <div className="mt-2 space-y-3">
                    {organic.map((i) => (
                      <InstallerCard
                        key={i.id}
                        installer={i}
                        featured={false}
                        revealed={!!revealed[i.id]}
                        onReveal={() => reveal(i, false)}
                        onVisit={() => onEvent?.('installer_site_clicked', { id: i.id, postcode })}
                        onShowExplainer={() => setExplainerOpen(true)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      <DisclosureFooter />
    </section>
  );
}

function DoNothingCollapse({ onShow }: { onShow: () => void }) {
  return (
    <div
      className="mt-3 rounded-lg border border-dashed border-navy-900/15 bg-surface p-4 text-center text-sm text-muted"
      data-testid="do-nothing-collapse"
    >
      Our advice is <b className="text-ink">do nothing</b> — so we&apos;re not showing you installers.
      <br />
      No one here pays us per lead, and we&apos;d rather you keep your money.
      <div>
        <button
          type="button"
          onClick={onShow}
          data-testid="show-anyway"
          className="mt-3 rounded-lg border border-hairline bg-surface px-4 py-2 text-sm font-semibold text-navy-900 hover:border-navy-700"
        >
          Show installers anyway
        </button>
      </div>
    </div>
  );
}

function InstallerCard({
  installer,
  featured,
  revealed,
  onReveal,
  onVisit,
  onShowExplainer,
}: {
  installer: MatchedInstaller;
  featured: boolean;
  revealed: boolean;
  onReveal: () => void;
  onVisit: () => void;
  onShowExplainer: () => void;
}) {
  const { vetting } = installer;
  const dist = Number.isFinite(installer.distanceKm) ? `~${Math.round(installer.distanceKm)} km` : '—';
  // `unknown` shows no badge — never guess a company's delivery model in public (§9.2).
  const badgeLabel =
    installer.company_type === 'unknown' ? null : COMPANY_BADGE[installer.company_type];
  return (
    <div
      data-testid={`installer-${installer.id}`}
      data-featured={featured}
      className={
        'relative rounded-lg border p-4 ' +
        (featured ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500' : 'border-hairline bg-surface')
      }
    >
      {featured && (
        <span
          title="This installer pays a flat, disclosed fee for this position. It never changes your recommendation or who is allowed on this list."
          className="absolute -top-2 right-3 cursor-help rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-900"
        >
          Featured — paid placement
        </span>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-bold text-navy-900">{installer.name}</span>
        <span className="whitespace-nowrap text-xs text-muted tabular-nums">
          {installer.suburb} · {dist}
        </span>
      </div>

      {badgeLabel && (
        <div className="mt-1.5">
          <span
            data-testid={`company-badge-${installer.id}`}
            className="inline-flex items-center gap-1 rounded-full border border-navy-900/15 bg-surface px-2 py-0.5 text-[11px] font-semibold text-navy-700"
          >
            {badgeLabel}
            <button
              type="button"
              onClick={onShowExplainer}
              data-testid={`badge-info-${installer.id}`}
              aria-label="How this works: two ways to buy"
              className="grid h-3.5 w-3.5 place-items-center rounded-full bg-navy-900/10 text-[9px] font-bold text-navy-700 hover:bg-navy-900/20"
            >
              i
            </button>
          </span>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {installer.work_types.map((w) => (
          <span key={w} className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-muted">
            {WORK_LABEL[w]}
          </span>
        ))}
        {vetting.cec_accredited && (
          <span className="rounded-full bg-good/15 px-2 py-0.5 text-[11px] font-semibold text-good">
            CEC accredited ✓
          </span>
        )}
        <span className="rounded-full bg-navy-700/10 px-2 py-0.5 text-[11px] font-semibold text-navy-700">
          Lic {vetting.electrical_licence}
        </span>
        <span className="rounded-full bg-navy-700/10 px-2 py-0.5 text-[11px] font-semibold text-navy-700 tabular-nums">
          {vetting.years_operating} yrs operating
        </span>
      </div>

      <div className="mt-2 text-xs text-muted">Vetting last verified {vetting.verified_on}</div>

      <div className="mt-3 flex flex-wrap gap-2">
        {revealed ? (
          <span
            data-testid={`phone-${installer.id}`}
            className="rounded-lg border border-dashed border-good px-3 py-2 text-sm font-bold text-ink tabular-nums"
          >
            {installer.phone}
          </span>
        ) : (
          <button
            type="button"
            onClick={onReveal}
            data-testid={`reveal-${installer.id}`}
            className="rounded-lg bg-navy-900 px-3 py-2 text-sm font-semibold text-white hover:bg-navy-700"
          >
            Show phone
          </button>
        )}
        <a
          href={installer.website}
          target="_blank"
          rel="noreferrer"
          onClick={onVisit}
          className="rounded-lg border border-hairline px-3 py-2 text-sm font-semibold text-navy-700 hover:border-navy-900"
        >
          Visit website
        </a>
      </div>
    </div>
  );
}

function EmptyState({
  postcode,
  joined,
  onJoin,
}: {
  postcode: string;
  joined: boolean;
  onJoin: () => void;
}) {
  const [email, setEmail] = useState('');
  return (
    <div
      className="mt-4 rounded-lg border border-dashed border-navy-900/15 bg-surface p-4 text-center text-sm text-muted"
      data-testid="empty-state"
    >
      {joined ? (
        <span>Thanks — we&apos;ll email you when vetted installers reach your area.</span>
      ) : (
        <>
          No vetted installers in <b className="text-ink">{postcode}</b> yet — we&apos;re expanding region by region.
          <form
            className="mt-3 flex flex-col justify-center gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              onJoin();
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              aria-label="Email to be notified"
              className="rounded-lg border border-hairline bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-700/30 sm:w-60"
            />
            <button
              type="submit"
              data-testid="waitlist-notify"
              className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-bold text-white hover:bg-navy-700"
            >
              Notify me
            </button>
          </form>
        </>
      )}
    </div>
  );
}

/** Shared "Two ways to buy" explainer (design §9.2). Neutral between the two models —
 *  opened from any company-type badge's ⓘ. Rendered as a centred modal (portaled to
 *  <body>) so it's always in view no matter how far down the list the clicked card is. */
function TwoWaysExplainer({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Lock background scroll while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4"
      data-testid="two-ways-overlay"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Two ways to buy"
        tabIndex={-1}
        data-testid="two-ways-explainer"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-navy-900/15 bg-surface p-5 shadow-xl focus:outline-none"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-bold text-navy-900">Two ways to buy</span>
          <button
            type="button"
            onClick={onClose}
            data-testid="two-ways-close"
            aria-label="Close explainer"
            className="text-xs font-semibold text-muted hover:text-navy-900"
          >
            Got it
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Some companies here are <b className="text-ink">local installers</b> — the accredited electricians
          who&apos;ll do the work are on their own staff. Others are <b className="text-ink">retailers</b> — they
          design and sell the system, then send contracted installers to do the job. Neither is automatically
          better: installers are often smaller and more direct; retailers can be bigger, with longer track
          records and stronger buying power. Either way, the physical installation must be done by
          SAA-accredited installers for your rebates to apply — everyone listed here meets our vetting bar for
          their type.
        </p>
      </div>
    </div>,
    document.body,
  );
}

function DisclosureFooter() {
  return (
    <p className="mt-4 border-t border-dashed border-hairline pt-3 text-[11px] leading-relaxed text-muted">
      <b className="text-ink">How this list works.</b> We vet every installer against public registers
      (CEC accreditation, electrical licence, ABN) before listing — free and featured alike. Featured
      installers pay a <b className="text-ink">flat, disclosed fee</b> for position only; we are never
      paid per lead, per click, or per sale, and <b className="text-ink">we never send your details to
      anyone</b> — you choose who to contact. Our recommendation engine has no access to this list.
    </p>
  );
}
