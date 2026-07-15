---
tags:
  - 01_Projects/battery-advisor
ewok: 2026-07-15
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
- [ ] Fill the candidate table below per the runbook. Classify `company_type`; use `unknown` when the website doesn't make the delivery model clear — never guess.
- [ ] Passing rows → `installers.json` via `serviceArea.ts`, **one PR per company** (audit trail). Failing rows dropped, reason noted in the table.

### Desk-vet runbook (URLs verified 15 Jul 2026)

**The registers (bookmark these five tabs):**

| Check | Where | What to record |
|---|---|---|
| ABN active + age | ABN Lookup — abr.business.gov.au | Legal entity name, ABN, status=Active, registration date (≈ years-operating proxy) |
| SAA accreditation (installers) | saaustralia.com.au/accreditation-status-check/ | Accreditation number + status. **SAA accredits individuals, not companies** — see step 3 below |
| NETCC approval (retailers) | newenergytech.org.au — Approved Seller search | Listed yes/no, trading name as listed |
| QLD electrical contractor licence | electricalsafety.qld.gov.au/electrical-license-search | Contractor licence number + status (search business name or licence # from their website footer) |
| QBCC licence + disciplinary | my.qbcc.qld.gov.au/s/search-a-register (licensee register incl. history) | Licence status; any conditions/disciplinary history; also skim the cancelled-licences list |

**Per-company loop (~15–20 min each; do a 5-min triage pass on all 12 first):**

1. **Website skim (5 min):** legal name + ABN (footer, privacy page, or T&Cs — nearly always there), base suburb, stated service area (→ radius estimate: 25/50/100 km), work types offered (battery / solar / EV charger), and delivery-model language: "our in-house team / our electricians / we never subcontract" → `installer`; "our installer network / accredited installation partners" → `retailer`; silent → `unknown`.
2. **ABN Lookup:** paste ABN (or search the legal name). Record status + registration date. Fail if cancelled or <2 yrs. Watch for the trading-name-vs-entity gap (e.g. site says "X Solar", entity is "X Electrical Pty Ltd") — record BOTH; the entity name is what every other register needs.
3. **SAA check:** the register is per-person, so search the named lead electrician/founder (About page) or any accreditation number displayed on the site. If the company displays an SAA/CEC accreditation number, verify it. If no individual is nameable from the desk, note "SAA unverifiable from desk" — for an `installer`-type this is a **call-list item, not an auto-fail** (record as conditional pass; resolve in the Phase-4 call or a 2-min phone/email ask).
4. **NETCC check:** search trading name. Required for `retailer`-type (their headline check per design §4). For installers it's a bonus badge — record if present.
5. **QLD electrical licence:** search the electrical contractor licence number (usually in the site footer) or business name. Fail if none found — this one IS a hard fail for anyone doing electrical work, no exceptions.
6. **Disciplinary skim:** QBCC register history for conditions/actions + a 60-second news search ("<name> QBCC OR 'fair trading' OR ACCC"). Red flags → fail or park.
7. **Verdict:** Pass / Conditional pass (call-list item noted) / Fail (reason). Record the check date — it becomes `verified_on`, with `verified_by: "desk"`.

**Decision rules:** hard fails = ABN inactive, <2 yrs, no electrical contractor licence, disciplinary action. Soft gaps (SAA individual unverifiable, `company_type` unclear) = conditional pass with the gap noted — launch bar is ≥5 clean passes, so conditionals only matter if clean passes run short. Never resolve a soft gap by guessing; resolve it by asking the company or leaving the field `unknown`.

**Logistics tips:** work in Cowork so the table stays in this doc (then re-sync to `docs/` before Task D3); triage first — a company that fails step 2 or 5 costs 5 minutes, not 20; expect ~2–3 of the 12 to fail or go conditional (Reddit threads recommend people, not paperwork); Gold Coast/Sunshine Coast candidates are in-scope (SE QLD), just record their real base postcode and let distance ordering do its job.

### Brisbane seed candidates (sourced from one Brisbane Reddit thread, 13 Jul 2026 — desk-vet is the entry filter)

> **Pre-filled 15 Jul 2026** from company websites + ABR Lookup (record-extracted 15 Jul 2026). ✓ = verified against the register; (site) = claimed on their website, not yet register-verified; **bold** = flag needing your attention. Remaining manual checks are listed below the table.
>
> **Working copy = `brisbane-seed-desk-vet.csv`** (same folder, added 15 Jul 2026) — edit there; it has empty `todo_*` and `verdict` columns for the manual register checks. This table stays as the point-in-time snapshot; copy final verdicts back here (or just link the CSV) before Task D3.

| # | Website | Legal entity (ABR) | ABN + status | ≥2 yrs | QLD lic. (site) | company_type (evidence) | SAA/NETCC | Work types | Base |
|---|---------|--------------------|--------------|--------|-----------------|--------------------------|-----------|-----------|------|
| 1 | reasolar.com.au | Renewable Engineering Australia Pty Ltd | 93 660 148 185 (**check reg. date** — ACN suggests ~2022 entity vs "est. 2010" brand; site also claims "34 years experience") | ? | **none shown on site** | installer ("38 in-house installers") | NETCC logo (site) | solar, battery | Redland Bay 4165 |
| 2 | levelau.com.au | Organized Electrical Solutions Pty Ltd | 31 629 525 079 ✓ Active from 22 Oct 2018, GST ✓ | ✓ 7 yrs | 85719 (+NSW 349155C) | installer (family-run, own crews/vans) | — none shown | solar, battery, ev_charger | Arundel 4214 |
| 3 | springers.com.au | Springer Consulting Services Pty Ltd (bus. name "Springers Solar" since 2009) | 63 086 620 644 ✓ Active from 4 Feb 2000, GST ✓ | ✓ 26 yrs | 69003 | installer (in-house teams since 2002) | NETCC logo (site) | solar, battery, ev_charger | Lawnton 4501 (+Capalaba 4157, Warana 4575) |
| 4 | positronicsolar.com.au | **Ambiguous:** Positronic Solar Pty Ltd 80 606 428 559 (4500) OR bus. name "Positronic Solar, Data & Electrical" under 56 065 856 219 (4012, older — fits "30+ yrs" claim). **Resolve which.** | ? | ? | **none shown on site** | installer (probable — "we supply and install") | — none shown | solar, battery | Geebung 4034 |
| 5 | halcolenergy.com.au | Halcol Energy Solar & Batteries Pty Ltd (**footer says "Halcol Energy Pty Ltd" — name mismatch**) | 61 667 508 107 ✓ Active from 26 Apr 2023, GST ✓ | ✓ 3 yrs (**entity much younger than brand**) | 91114 | ? (verify in-house vs contractors) | badges image (site, unclear) | solar, battery, ev_charger | Bokarina 4575 + Hendra 4011 showroom |
| 6 | expertelectrical.com.au | ? (common name — **manual ABR lookup**) | ? | ? (site implies long-standing) | 87777 | installer ("our accredited electricians") | SAA logo + legacy ASR logo (site) | solar, battery, ev_charger | Brendale 4500 |
| 7 | paramountenergy.com.au | Paramount Energy Co Pty Ltd | 15 634 040 234 ✓ Active from 11 Jun 2019, GST ✓ | ✓ 7 yrs (matches "7+ years" claim) | **not shown on site** | installer ("we're expert electricians, not salespeople"; SAA claim) | NETCC logo + SAA claim (site) | solar, battery (EV via Tesla connector — confirm) | Newstead 4006 (SEQ + N NSW) |
| 8 | green.com.au | Green.com.au Pty Ltd | 93 642 440 711 ✓ (2060 NSW) | ✓ ~6 yrs (founded 2020) | 1503979 (QLD, one of 4 states) | **unknown → retailer-lean** (national, 5 state offices, "installed by Australia's best tradespeople") | NETCC page on site | solar, battery, ev_charger (+heat pumps) | QLD office: Brisbane CBD 4000 (**HQ Sydney**) |
| 9 | djedwardselectrical.com.au | ? (**manual ABR lookup**) | ? | ✓ (site: since 1999) | 55766 | installer ("No Subcontractors") | CEC-accredited claim (site) — **verify SAA** | solar, battery | Murarrie ~4172 (Bris/GC/Toowoomba/SunCoast ≈100 km) |
| 10 | mcelectrical.com.au | MC Solar & Electrical Pty Ltd, ACN 142 653 843 (**ACN has no ABN attached in ABR — resolve**; candidate: trading name "MC Electrical" ABN 23 108 903 807 at 4007 QLD) | ? | ✓ (since 2009) | ECL 72319 | installer ("We don't use subcontractors") | NETCC logo + Tesla certified (site) | solar, battery, ev_charger | Eagle Farm 4009 |
| 11 | lmselectrical.com.au | ? (**manual ABR lookup**) | ? | ✓ (site: since 2013, 2000+ systems) | 80649 | installer ("no subcontractors", in-house crews) | NETCC + SAA logos (site) | solar, battery, ev_charger | Slacks Creek 4127 (SE QLD wide) |
| 12 | gienergy.com.au | ? (**manual ABR lookup**) | ? | ✓ (site: since 2011) | **none shown on site** | **unknown** (multi-state: QLD/NSW/WA/SA offices — verify delivery model) | CEC designers/installers claim (site) | solar, battery | Loganholme 4129 |

**What's done:** all 12 websites read; 6 ABNs register-verified (Level, Springers, Paramount, Halcol, Green, + REA found-not-dated); base suburbs, work types, licence numbers (as displayed), and delivery-model evidence captured.

**Status 15 Jul 2026:** desk-vet substantially complete — see **`brisbane-seed-desk-vet-update2.csv`** (supersedes update1; all ABR dates re-verified after copy-paste artifacts found in update1). Founder decisions: **SAA check and QBCC history dropped from the desk tier** (moved to the Phase-4 call — design §4 revised accordingly, incl. the copy consequence: disclosure must describe only the checks actually run). Verdict scale = PASS / CONDITIONAL / BLOCKED / FAIL per design §4.

**GO-LIVE CONFIRMED 15 Jul 2026.** Verdicts locked: **6 PASS** (Level, Springers, Positronic, Expert, Paramount, Green) + **3 CONDITIONAL, listable with flags reflected** (REA, Halcol, LMS — entity-verifiable years shown, `unknown` type = no badge) = **9 at launch**. **2 held back pending ABN** (MC — email them; GI — grab entity/ABN from their NETCC register listing), join by follow-up PR. Level licence 85719 confirmed. Launch bar (≥5) met.

**Legal gate: WAIVED by founder decision 15 Jul 2026** — all listed data is public-register or self-published business information; founder accepts the residual risk. Mitigations that stand: disclosure copy claims only checks actually run (design §4), `unknown` never guesses a company's delivery model, `status: paused` allows instant takedown on complaint. **Revisit before Phase 4** — taking installer money changes the risk profile (referral/agency questions), so the legal opinion moves to the featured gate, not organic.

Go-live execution: runbook `BUILD-WITH-CLAUDE-CODE.md` §6b steps 4–7 (Task D3 final prompt, flag flips, maintenance, scaling).

Notes: several candidates are Gold Coast / Sunshine Coast rather than Brisbane proper — fine, scope is SE QLD and distance ordering handles it. Selection bias (one thread) is acceptable: Reddit is the sourcing filter, desk-vet is the entry filter. Brand-age vs entity-age gaps (#1, #5) aren't automatically disqualifying — restructures are common in this industry — but the listing should show entity-verifiable years, not marketing claims.

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
