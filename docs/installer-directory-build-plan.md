---
tags:
  - 01_Projects/battery-advisor
ewok: 2026-07-12
---
# Installer Directory — Claude Code Build Plan

**Status:** v2, 13 Jul 2026. Phase 3 reshaped as the **Brisbane seed slice** (12 real Reddit-sourced candidates, desk-vet entry path, installer/retailer badge). v1: 9 Jul 2026.
**Spec:** [[installer-directory-design]] (v3 — see §9 for the Brisbane seed launch + `company_type` split). Reference implementation of matching: `installer-directory-prototype.html` → `match()`.
**Workflow:** copy this file into the WSL repo's `docs/` and drive Claude Code from it, phase by phase. Each phase has exit criteria; don't start the next until they pass.
**Principle:** phases 1–2 are code (cheap, reversible, 4A-outcome-invariant — build any time on a branch). Phases 3–4 involve commitments (installer calls, invoices, legal) — their *human* prerequisites wait for the 4A go/no-go signal.

---

## Phase 1 — Scaffolding (standalone; placeholder data; no user-visible change)

Branch: `feature/installer-directory`. Nothing in this phase touches the results page.

- [ ] `src/data/zones.json` — schema per design §6.1. **Placeholder**: 3–4 hand-drawn SE QLD zones with postcode ranges is fine; the ABS-scripted real map is a Phase-3 item (and waits for 4A geography data — traffic may say the first zones aren't even in QLD).
- [ ] `src/data/postcode-centroids.json` — real data, one-time download (ABS POA centroids or Matthew Proctor CSV). Small enough to bundle; verify gzipped size is trivial.
- [ ] `src/data/installers.json` — schema per design §3 (slot-based `featured_slots`, **`company_type: installer|retailer|unknown` per design §9.2**). **Placeholder installers with obviously fake names** ("Test Solar Co") so a leaked build can't defame anyone real — include at least one of each `company_type` so the badge renders in dev.
- [ ] `src/directory/match.ts` — port `match()` from the prototype. **Location guardrail: a new `directory/` module, sibling to `core/`. `core/` must never import from `directory/` — add an ESLint boundary rule or a CI grep, don't rely on discipline.**
- [ ] `src/directory/serviceArea.ts` — derive postcode list from `base_postcode` + `radius_km` via centroid haversine (design §3); used at data-authoring time and by tests.
- [ ] Unit tests (Vitest, same pattern as `core`): match ordering (distance → years, fee-blind), featured cap ≤2, featured excluded from organic (no double-listing), expiry lapse (`until` in past ⇒ organic), vetting freshness (>12 months ⇒ omitted), zone resolution (postcode → exactly one zone), radius derivation.
- [ ] CI invariant checks on the JSON itself: ≤2 active slots per zone×work-type, slots reference existing zones, dates parse, every installer `status` valid, **`company_type` is a valid enum value**. Run on every PR — this is what makes hand-edited data safe.
- [ ] `<DirectorySection>` React component (design §2 anatomy: chips, featured strip, organic cards, do-nothing collapse, click-to-reveal, empty state, disclosure footer, **company-type badge + "Two ways to buy" explainer popover per design §9.2 — `unknown` renders no badge**) — rendered only on a **dev-only route** (e.g. `/dev/directory`) with scenario controls like the prototype's. Not mounted in the real flow yet.
- [ ] Unit test: organic comparator is `company_type`-blind (same blindness clause as fees — design §9.2 guardrail).

**Exit criteria:** all tests + CI invariants green; dev route renders all four scenarios (battery/solar/EV/do-nothing) and the empty state from placeholder data; `core/` has no import path to `directory/` (enforced, not assumed).

## Phase 2 — Feature flag

No DB and no flag service — flags are build-time env + runtime override:

- [ ] `VITE_FF_DIRECTORY` env var: `on` in dev (and Render PR previews if that add-on is enabled), `off` in production. Without previews, test locally via `npm run dev` or on prod with the override below.
- [ ] Runtime override for testing prod builds: `?ff_directory=1` query param (persist to `sessionStorage` for the session). Override works only when a second env var `VITE_FF_OVERRIDES=on` — so prod can ship with overrides disabled once launched.
- [ ] Mount `<DirectorySection>` in the real results flow **below the plan gate**, wrapped in the flag. Flag off ⇒ zero DOM, zero data fetched (the JSON imports must be lazy/dynamic so flagged-off prod bundles don't ship directory data).
- [ ] PostHog events per design §2 wired (they're harmless behind the flag and let preview testing validate the funnel shape).

**Exit criteria:** production build with flag off is byte-identical in behaviour to today (bundle diff shows no directory data); preview deploy shows the full directory below real engine results; toggling requires only an env change + redeploy.

## Phase 3 — Release: organic, Brisbane seed slice (reshaped 13 Jul 2026)

Code first, then the desk-vet + legal gate, then flag on. Launch shape per design §9: Brisbane/SE QLD real data, organic-only, everywhere else = existing empty state ("coming soon" + waitlist). Unlock untouched.

Code:
- [ ] ~~Replace placeholder zones with ABS map~~ **Deferred (design §9.4):** zones are featured-billing inventory only; organic matching is postcode-level. Placeholder zones stay until the first featured conversation.
- [ ] Empty-state waitlist wired to Resend Audiences (reuse the 4A endpoint pattern; tag contacts `directory-waitlist` + postcode).
- [ ] Disclosure copy finalised (design §2 footer + §9.2 explainer) + privacy policy updated to cover the waitlist (names processors — same obligation 4A already triggered).
- [ ] Featured strip stays dormant automatically (no `featured_slots` in data = no strip — the organic-only launch gate from design §6.2 needs no code).

Desk work (one afternoon — design §4 desk-vet tier, §9.3 runbook):
- [ ] Fill the candidate table below from public registers: ABR (ABN active; registration date ≈ years operating), SAA register (installers) / NETCC register (retailers), QLD electrical contractor licence lookup, QBCC + Fair Trading disciplinary search, work types + base suburb + estimated radius from website. Classify `company_type`; use `unknown` when the website doesn't make the delivery model clear — never guess.
- [ ] Passing rows → `installers.json` via `serviceArea.ts`, **one PR per company** (audit trail). Failing rows dropped, reason noted in the table.

### Brisbane seed candidates (sourced from one Brisbane Reddit thread, 13 Jul 2026 — desk-vet is the entry filter)

| # | Website | Name (confirm) | company_type | SAA/NETCC | QLD lic. | ABN ok | ≥2 yrs | Work types | Base | Pass? |
|---|---------|----------------|--------------|-----------|----------|--------|--------|-----------|------|-------|
| 1 | reasolar.com.au | | | | | | | | | |
| 2 | levelau.com.au | (Arundel/Gold Coast) | | | | | | | | |
| 3 | springers.com.au | | | | | | | | | |
| 4 | positronicsolar.com.au | | | | | | | | | |
| 5 | halcolenergy.com.au | | | | | | | | | |
| 6 | expertelectrical.com.au | | | | | | | | | |
| 7 | paramountenergy.com.au | | | | | | | | | |
| 8 | green.com.au | | | | | | | | | |
| 9 | djedwardselectrical.com.au | | | | | | | | | |
| 10 | mcelectrical.com.au | | | | | | | | | |
| 11 | lmselectrical.com.au | | | | | | | | | |
| 12 | gienergy.com.au | | | | | | | | | |

Notes: several candidates are Gold Coast / Sunshine Coast rather than Brisbane proper — fine, scope is SE QLD and distance ordering handles it. Selection bias (one thread) is acceptable: Reddit is the sourcing filter, desk-vet is the entry filter.

Human prerequisite (the one non-code, non-desk blocker):
- [ ] Legal check on listing obligations (**hard gate before flag-on in prod** — MORE urgent now that real businesses are named, not less).

**Exit criteria:** ≥5 desk-vetted companies live in `installers.json` with correct `company_type` (or `unknown`); legal check done; flag on in production for Brisbane postcodes; `directory_viewed` / `installer_phone_revealed` events flowing; non-SEQ postcodes show the waitlist empty state.

## Phase 4 — Release: featured (MVP for onboarding featured listings)

All consumer-side code already exists (built in Phase 1, dormant). This phase is operational:

- [ ] **Real ABS zone map** (moved here from Phase 3, 13 Jul 2026): draw where 4A/directory traffic actually is (check PostHog postcode distribution first). Needed before selling the first slot, not before organic launch.
- [ ] Sales one-pager for the vetting call: A$99/slot/quarter founding, free first quarter offerable selectively, "featured only when our engine recommends your work type in your zone — every impression pre-qualified", zero exposure on do-nothing results (honesty as pitch). **The call also deepens vetting** (design §4 desk-vet tier): confirm radius, work types, listing terms, and resolve any `company_type: unknown`.
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
7. Badge + explainer copy stays **neutral between installer and retailer**; organic comparator is `company_type`-blind (design §9.2). `unknown` renders no badge — never guess a company's delivery model in public.
