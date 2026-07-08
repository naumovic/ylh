---
tags:
  - 01_Projects/battery-advisor
created: 2026-07-09
---
# Installer Directory — Claude Code Build Plan

**Status:** v1, 9 Jul 2026. Phased structure per founder decision: scaffolding → flag → organic release → featured release.
**Spec:** `installer-directory-design.md` (v2). Reference implementation of matching: `installer-directory-prototype.html` → `match()`.
**Workflow:** copy this file into the WSL repo's `docs/` and drive Claude Code from it, phase by phase. Each phase has exit criteria; don't start the next until they pass.
**Principle:** phases 1–2 are code (cheap, reversible, 4A-outcome-invariant — build any time on a branch). Phases 3–4 involve commitments (installer calls, invoices, legal) — their *human* prerequisites wait for the 4A go/no-go signal.

**Progress:** ✅ **Phase 1 + Phase 2 built** on branch `feature/installer-directory` (9 Jul 2026). Directory renders below the results behind `VITE_FF_DIRECTORY` (on in dev, off in prod); dev harness at `/dev/directory`; 193 tests green; flag-off prod bundle verified to ship zero directory code/data. **Next code:** Phase 3 (real ABS zone map + waitlist→Resend + disclosure/privacy copy). **Blocking human gates before any prod flag-on:** legal check + first vetted installers (see "Outstanding founder actions" at the bottom). See the per-phase checkboxes below for detail.

---

## Phase 1 — Scaffolding (standalone; placeholder data; no user-visible change)

Branch: `feature/installer-directory`. Nothing in this phase touches the results page.

- [x] `src/data/zones.json` — placeholder: 4 non-overlapping SE QLD zones (`bne-central`, `bne-south`, `bne-east`, `gold-coast`). Real ABS map deferred to Phase 3.
- [x] `src/data/postcode-centroids.json` — real data (Matthew Proctor CSV, localities averaged per postcode). **Filtered to QLD** (452 codes, 14 KB raw / 4 KB gz — trivial; full-AU was ~10× for no Phase-1 benefit). Re-source national coverage when the directory expands past QLD. Provenance in `src/data/README.md`.
- [x] `src/data/installers.json` — design §3 slot schema, 6 fake-named placeholders covering every case (valid slot, expired slot, free-tier, stale vetting, out-of-area, cap-filling second slot-holder).
- [x] `src/directory/match.ts` — port of the prototype `match()` onto the slot schema. Pure over its inputs. Boundary enforced by `boundary.test.ts` (grep-style CI check — **no ESLint is configured in this repo**, so the equivalent CI test is used; proven to fail on a bad import).
- [x] `src/directory/serviceArea.ts` — haversine distance + `deriveServiceRanges(base, radius)`.
- [x] Unit tests (`match.test.ts`, `serviceArea.test.ts`): ordering, cap ≤2, no double-listing, expiry lapse, vetting freshness, zone resolution, radius derivation, fee-blindness.
- [x] CI invariants (`data.test.ts`): ≤2 active slots per zone×work, slots reference existing zones, dates parse, valid `status`, unique ids, ranges well-formed, base postcodes in centroid table, zones non-overlapping.
- [x] `<DirectorySection>` (design §2 anatomy) on a **dev-only route `/dev/directory`** (`DevDirectoryPage`, gated on `import.meta.env.DEV`) with the prototype's scenario switcher + postcode input + event toast. Component smoke test in `DirectorySection.test.tsx`.

**Exit criteria — MET:** 193 tests + typecheck green; `/dev/directory` renders all four scenarios + empty state (postcode 4870) from placeholder data; `core/` has no import path to `directory/` (enforced + proven); prod build excludes the dev route and all directory data.

## Phase 2 — Feature flag

No DB and no flag service — flags are build-time env + runtime override (`src/lib/flags.ts`):

- [x] `VITE_FF_DIRECTORY` env var: on in dev (auto, via `import.meta.env.DEV`), `off` in production. **Note: hosting is Render, not Vercel** — set in the Render dashboard / `render.yaml` (added, value `""` = off). "Preview" = a Render branch/preview deploy with the var set to `on`.
- [x] Runtime override `?ff_directory=1` (persists to `sessionStorage`; `?ff_directory=0` clears), gated on `VITE_FF_OVERRIDES=on` — no-op once prod ships with overrides off.
- [x] `<DirectorySection>` mounted in the real results flow **below the plan gate** (`App.tsx` `Result`), behind `directoryEnabled()`. Lazy `import()` behind a compile-time-foldable gate (`DIRECTORY_BUNDLE_ENABLED`): flag-off prod ⇒ zero DOM, zero data, Rollup drops the chunk. Winner→work-type: battery→battery, solar→solar, ev→ev_charger, nothing→null (collapses).
- [x] PostHog events per design §2 wired via the section's `onEvent` → `capture` (`analytics.ts` `AnalyticsEvent` extended with `DirectoryEventName`, incl. `featured_impression`). No-ops without a PostHog key; the dev harness shows them as a toast.

**Exit criteria — MET:** flag-off prod build ships no directory data (grep of `dist/assets` clean); with `VITE_FF_OVERRIDES=on` the directory is a *separate lazy chunk* (`DirectorySection-*.js`), absent from the eager main bundle; flag-on renders the directory below real engine results (App integration test); toggling = env change + redeploy only. Tests: `flags.test.ts` + the directory suites.

## Phase 3 — Release: organic (MVP for all organic listings)

Code first, then the human gate, then flag on.

Code:
- [ ] Replace placeholder zones with the scripted ABS zone map — **draw where 4A traffic actually is**, not where we assumed (check PostHog postcode distribution first).
- [ ] Empty-state waitlist wired to Resend Audiences (reuse the 4A endpoint pattern; tag contacts `directory-waitlist` + postcode).
- [ ] Disclosure copy finalised (design §2 footer) + privacy policy updated to cover the waitlist (names processors — same obligation 4A already triggered).
- [ ] Featured strip stays dormant automatically (no `featured_slots` in data = no strip — the organic-only launch gate from design §6.2 needs no code).

Human prerequisites (the pacing items — start only on a 4A pass or a conscious decision to proceed regardless):
- [ ] Legal check on listing obligations (**hard gate before flag-on in prod**).
- [ ] Vetting criteria confirmed (design §4) and first founding installers called: vetting checks + base postcode + radius + work types → `installers.json` via `serviceArea.ts`, PR per installer (audit trail).

**Exit criteria:** ≥ N real vetted installers live (pick N, suggest ≥5 so the list isn't embarrassing); legal check done; flag on in production; `directory_viewed` / `installer_phone_revealed` events flowing.

## Phase 4 — Release: featured (MVP for onboarding featured listings)

All consumer-side code already exists (built in Phase 1, dormant). This phase is operational:

- [ ] Sales one-pager for the vetting call: A$99/slot/quarter founding, free first quarter offerable selectively, "featured only when our engine recommends your work type in your zone — every impression pre-qualified", zero exposure on do-nothing results (honesty as pitch).
- [ ] Manual invoicing runbook (design §6.4 v1): Stripe Payment Link per slot → on payment, edit `featured_slots.until` to quarter end → PR (CI invariants catch cap violations) → deploy. First merged slot turns the strip on — no launch code.
- [ ] Monthly stats email job (Claw back-office): per-installer views, phone reveals, and work-type win-rate in their zone, from PostHog API. This is the renewal engine — ship it the same month as the first paid slot, not later.
- [ ] Re-verification job (Claw): CEC/licence/ABN register checks → `verified_on` updates, failures flagged. (Can lag, but must exist before the first `verified_on` turns 12 months old.)
- [ ] Defer until >~10 paying installers: Stripe Billing as source of truth + nightly sync (design §6.4 v2).

**Exit criteria:** first real featured slot sold, invoiced, merged, and rendering with the "Featured — paid placement" tag; stats email delivered to that installer at month end.

---

## Standing guardrails (repeat in every Claude Code session prompt)

1. `core/` never imports `directory/` — engine output is computed before directory code runs.
2. Organic ordering comparator must never reference fees, tiers, or slots.
3. Featured cap = 2, enforced in `match()` **and** CI **and** at sale time.
4. Directory renders below the answer; do-nothing collapses it behind explicit user action.
5. No per-lead, per-click, per-reveal billing; no auctions; no user data transmitted to installers.
6. Expiry lives in data (`until`) — lapse must require zero code to take effect.

---

## Outstanding founder actions (as of 9 Jul 2026 — Phases 1–2 done)

The code is ready and dormant. Nothing below is a code task; these are the human gates that
pace Phases 3–4. **None blocks merging the branch** — prod ships with the flag off, so `main`
behaviour is unchanged.

### Do now (cheap, unblocks review)
- [ ] **Review + merge `feature/installer-directory` → `main`.** Safe: flag-off prod is verified
  to ship no directory code/data. Merging just lands the dormant scaffolding and the dev route.
- [ ] **Eyeball it:** `npm run dev` → `/dev/directory` (scenario switcher) and `/` → complete the
  wizard to see it below a real result. Try postcodes 4000 / 4157 / 4215 / 4870 (empty state).

### Before turning the directory ON in production (Phase 3 — hard gates)
- [ ] **Legal check on listing obligations** (referral/agency? disclosure sufficiency?). *Hard gate
  before any prod flag-on.* Design §4 open question; disclosure copy already drafted to help.
- [ ] **Confirm vetting criteria** (design §4) — the entry bar you'll actually check per installer.
- [ ] **Source + call ≥5 founding QLD installers**, vet them, capture base postcode + travel radius
  + work types → one PR per installer into `installers.json` (audit trail). Replaces the fake
  placeholders. `serviceArea.deriveServiceRanges()` turns "base + radius" into the range list.
- [ ] **Privacy policy update** naming processors, *before* the empty-state waitlist collects any
  email (same Resend-Audiences obligation 4A already triggered).
- [ ] **Draw the real SE QLD zone map** (Phase 3 code) — but decide the boundaries *from PostHog
  postcode distribution*, i.e. after 4A traffic exists. The 4 current zones are placeholders.

### To actually launch (once the gates above pass)
- [ ] Render dashboard → set **`VITE_FF_DIRECTORY=on`** → redeploy. That's the whole switch.
- [ ] To probe the prod build *before* launch: set **`VITE_FF_OVERRIDES=on`**, visit any page with
  **`?ff_directory=1`**. Set it back to off/unset once the directory is live for everyone.

### Phase 4 (featured slots) — all operational, code already built & dormant
- [ ] Only when you have a paying installer: sales one-pager, manual Stripe Payment Link invoicing,
  edit `featured_slots.until` → PR (CI catches cap violations) → deploy. First merged slot turns
  the strip on with no launch code. Monthly stats email + re-verification jobs per Phase 4 below.

### Housekeeping (minor)
- [ ] `CLAUDE.md` references the prototype at `docs/reference/installer-directory-prototype.html`,
  but it currently lives at `docs/installer-directory-prototype.html` (untracked). Move it into
  `docs/reference/` (and `git add` it) or fix the path — pick one so the reference resolves.
