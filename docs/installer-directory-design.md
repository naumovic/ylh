---
tags:
  - 01_Projects/battery-advisor
ewok: 2026-07-12
---
# Installer Directory — Design (consumer list + backend/data model)

**Status:** v3, 13 Jul 2026 — adds §9 Brisbane seed launch, installer/retailer split (`company_type`), and a desk-vet tier in §4. Previous: v2, 8 Jul 2026 (pricing/zone mechanics + checklist §7). Companion prototype: `installer-directory-prototype.html` (its `match()` is the reference implementation).
**Scope chosen:** consumer-facing list + backend/data model. Variant: **free curated list, with a small number of paid "Featured" slots per result** (founder call, 8 Jul 2026 — a 1A/1B hybrid).
**Not in this doc:** installer self-serve portal, dynamic onboarding forms, billing UI (all post-MVP; §7 defines what MVP deliberately excludes).
**Related:** [[installer-directory-build-plan]]

---

## 1. The honesty constraint, restated for this variant

Pivot-3 scored pure paid placement (2B) as moat-destroying. The chosen hybrid survives **only** if the paid slot buys *visibility*, never *influence*. The line that must stay true: *"we're paid by you, so we can tell you to buy nothing."*

Hard guardrails (non-negotiable, encode in code and copy):

1. **The engine never sees the directory.** Recommendation ranking is computed before, and independent of, any installer data. Separate modules, no imports from directory → core.
2. **The list renders below the answer — including below "do nothing".** If the answer is "do nothing", the list is collapsed behind an explicit user action ("Show installers anyway"), never auto-expanded.
3. **Featured = flat fee, disclosed, capped, labelled.** Max **2 featured slots** per result. Label on the card ("Featured — paid placement"), plus a page-level disclosure line with a "how this works" link. Fee is flat per period, never per-lead, never per-click.
4. **Same vetting bar for featured and free.** Money cannot buy entry — only position among already-vetted installers.
5. **Organic ordering is deterministic and fee-blind:** service-area match → distance → (later) rating. Featured slots sit in a visually distinct strip; they do not displace or reorder organic results, they sit above them *within the directory section only*.
6. **No lead sale.** "Contact" = reveal phone / link to installer's own site / mailto. We never transmit user details to an installer without an explicit user-initiated send (and even then it's the user's action, not a sold lead).

If any future change violates 1–6, we've become SolarQuotes with worse SEO. Say no.

---

## 2. Consumer-facing UX

### Placement in the flow
```
[intake] → [ranked answer + options] → [paid-plan gate (4A/4B)] → [INSTALLER DIRECTORY]
```
The directory is the *actionability* layer: "you've decided what to do — here's who can do it."

### Directory section anatomy (top → bottom)
1. **Section header:** "Vetted installers near {postcode}" + trust line: "Every installer here passed our vetting. Featured spots are paid, clearly marked, and never affect your recommendation."
2. **Context filter chips** — auto-set from the engine's winning option: `Battery` / `Solar` / `EV charger`. User can toggle. An installer only shows if they service the relevant work type. (EV-charging wins map to `ev_charger` — copy notes the smart charger is optional.)
3. **Featured strip** (0–2 cards): amber-bordered, "Featured — paid placement" tag. The strip **follows the active work-type filter** (recommendation sets the default; if the user toggles chips, featured switches with organic — a battery slot-holder never lingers while the user browses solar). If no featured installers match zone + work type, the strip simply doesn't render (no filler). **The recommendation drives the directory, never the reverse** — the engine finishes before any directory code runs.
4. **Organic list** (all vetted matches, distance-ordered): plain cards.
5. **Empty state:** "No vetted installers in your area yet" + waitlist capture ("tell us your postcode, we'll notify you") — doubles as expansion-demand data.
6. **Disclosure footer:** how vetting works, how featured pricing works, "we never sell your details".

### Installer card contents
- Name, suburb + distance ("Brisbane — services 4000–4179")
- **Company-type badge (added 13 Jul 2026):** "Local installer" (in-house accredited crews) or "Retailer — uses contracted installers". If we can't confirm the delivery model, show **no badge** rather than guess (`company_type: "unknown"`). A small ⓘ on the badge opens the "two ways to buy" explainer (§9.2).
- Work types (battery / solar / EV charger chips)
- Vetting badges: CEC-accredited ✓, licence # (state electrical licence), years operating, warranty stance
- (later) rating once we have a review source we trust
- Actions: **Show phone** (click-to-reveal, fires PostHog event), **Visit website**. No form that sends user data to installer in v1.

### "Do nothing" case (the trust moment)
Collapsed by default under: *"Our advice is do nothing — so we're not showing you installers. If you still want the list: [Show installers anyway]"*. This one interaction **demonstrates** the moat better than any copy. Featured installers get **zero exposure** on do-nothing results unless the user clicks through — state this in installer-facing sales material too: *"you're featured when our engine recommends your kind of work in your zone"* — every impression is pre-qualified, which is what makes the slot worth paying for.

### Instrumentation (PostHog)
`directory_viewed`, `directory_shown_anyway` (do-nothing case), `installer_phone_revealed`, `installer_site_clicked`, `featured_impression`, `featured_clicked`, `empty_state_waitlist_joined` — each with postcode, work type, position, featured flag. Phone-reveals per listing per month is exactly the number that later prices the 1B flat fee ("your listing was viewed 240×, phone revealed 31× last month — $X/mo").

---

## 3. Backend & data model (no-DB-first, consistent with 4A architecture)

### v1 storage: bundled static JSON, no DB
Same pattern as the KB: the directory ships as a static, versioned JSON file (`src/data/installers.json`), edited by hand (or by a back-office OpenClaw job later), reviewed via PR, deployed with the app. At QLD-first scale (tens of installers) this is correct: zero cost, zero PII, auditable history in git.

```jsonc
{
  "version": "2026-07-08",
  "installers": [
    {
      "id": "sunward-electrical",          // slug, stable key
      "name": "Sunward Electrical",
      "suburb": "Capalaba",
      "state": "QLD",
      "base_postcode": "4157",             // for distance calc
      "service_postcodes": { "ranges": [[4000, 4179], [4200, 4230]] },
      "work_types": ["battery", "solar", "ev_charger"],
      "company_type": "installer",         // installer | retailer | unknown (§9.2) — who does the physical install

      "phone": "07 3xxx xxxx",
      "website": "https://…",
      "vetting": {
        "cec_accredited": true,
        "accreditation_id": "A1234567",
        "electrical_licence": "QLD 12345",
        "abn": "11 222 333 444",
        "years_operating": 9,
        "verified_on": "2026-07-01",       // staleness driver
        "verified_by": "manual"            // manual | openclaw-job
      },
      "listing": {
        // featured is bought per ZONE × WORK TYPE slot, not per installer (see §6)
        "featured_slots": [
          { "zone": "bne-east", "work": "battery", "until": "2026-10-01", "stripe_sub": "sub_…" },
          { "zone": "bne-east", "work": "solar",   "until": "2026-10-01", "stripe_sub": "sub_…" }
        ]
      },
      "status": "active"                   // active | paused | delisted
    }
  ]
}
```

Design notes:
- **Service areas are derived, not hand-mapped (decided 8 Jul 2026).** Input = base postcode + travel radius ("how far will you travel?" 25/50/100 km — one question on the vetting call). Haversine against the bundled postcode-centroid table → derived postcode list → installer confirms and adds/removes exceptions (islands, rivers). ~10 lines of code, no Maps/driving API, $0. Store the derivation (`base_postcode`, `radius_km`) plus the confirmed `service_postcodes` (exceptions applied); re-derive only when the installer asks. Featured-eligible zones = zones intersecting the confirmed area — falls out automatically.
- **Postcode ranges, not lists** — AU postcodes are contiguous enough; keeps the file human-editable.
- **Distance** = haversine between postcode centroids (bundle a small AU postcode→lat/lng table, already useful for the engine's state detection). Good enough for ordering; no geocoding API.
- **`featured_until` hard expiry in data**, so a lapsed payment can never silently keep a featured slot — the render layer demotes automatically.
- **`verified_on` drives freshness**: render layer flags/omits listings not re-verified within 12 months. Re-verification is a scheduled OpenClaw back-office job (matches the seed's "KB freshness loop").
- **No user PII anywhere in this system.** Directory data is public-facing business info only, so no Privacy Act surface added by v1. (Empty-state waitlist emails go to Resend Audiences like 4A, not into this file.)

### Matching + ordering algorithm (deterministic, ~30 lines)
```
match(postcode, workType):
  candidates = installers where status=active
               and workType in work_types
               and postcode in service_postcodes
               and fresh(verified_on)
  zone = zoneOf(postcode)                  // each postcode maps to exactly one zone
  featured = candidates having a slot where slot.zone==zone
             and slot.work==workType and now < slot.until
             → order by distance → take max 2   // cap also enforced at sale time, §6
  organic  = all candidates (INCLUDING featured ones)  // featured also appear organically? NO —
             exclude the ones shown in featured strip to avoid double-listing
             → order by distance asc, then years_operating desc
  return { featured, organic }
```
Rule 5 encoded: fee never appears in the organic comparator.

### Migration path (when it outgrows JSON)
JSON file → same shape in Postgres when installer *self-serve* arrives (that's the point at which installers edit their own data and a PR-per-change stops scaling). The `id` slug and schema stay; only the storage moves. Nothing in v1 has to be thrown away.

### Featured billing
See §6 — zone-based slot inventory, traffic-band pricing, Stripe Billing as source of truth, nightly sync job.

---

## 4. Vetting criteria v1 (to be confirmed — open Q from Pivot-3 §7)

Entry bar (all required): CEC/SAA accreditation (verifiable on public register) · state electrical contractor licence (verifiable) · ABN active (ABR lookup) · ≥2 years operating · no current Fair Trading/QBCC disciplinary action found · agrees to listing terms (accuracy of info, notify on licence change).
Each is checkable from public registers → future OpenClaw verification job. Record the check date per item if we want per-field freshness later.

**Desk-vet tier (added 13 Jul 2026 — the v1 organic entry path):** all register-checkable items above, done from the desk, **no phone call required**. `verified_by: "desk"` in the data (extends the existing `manual | openclaw-job` enum). The phone call moves to featured onboarding (Phase 4) — it's a sales call that happens to also deepen vetting (travel radius confirmation, listing-terms agreement, work-type confirmation). Until an installer has been called, radius/work types are estimated from their website and marked so. "Passed our vetting" header copy remains true: every listed company passed the register checks; the call adds depth, not entry.

**Retailer bar (added 13 Jul 2026):** for `company_type: "retailer"` the company-level analogue applies — **NETCC approval** (New Energy Tech Consumer Code register, successor to the CEC Approved Solar Retailer scheme) replaces individual SAA accreditation as the headline check, plus ABN, ≥2 years, no disciplinary action. Note in the explainer: whoever sells the system, the physical install must still be done by SAA-accredited installers for STC/rebate eligibility — that's the consumer-relevant guarantee either way. (Verify current NETCC register URL and QLD rebate wording during the legal check — schemes have shifted names before.)

**Open legal question (carried from Pivot-3):** does listing (even unpaid) create referral/agency obligations? Get one legal opinion before public launch of the directory; disclosure copy in §2 drafted to help ("we list, we don't recommend or introduce").

---

## 5. What the prototype demonstrates

`installer-directory-prototype.html` (standalone, same visual language as `recommender-prototype.html`):
- Result-context banner with a scenario switcher: **battery-wins / solar-wins / do-nothing**
- Featured strip (capped at 2, labelled) above organic distance-ordered list
- Do-nothing collapsed state with "show anyway"
- Work-type filter chips, click-to-reveal phone, empty state (try postcode 4870), disclosure footer
- All from an inline `INSTALLERS` array mirroring the JSON schema above — the render code is a straight port target for the React app

---

## 6. Featured pricing & zone mechanics (added 8 Jul 2026)

### 6.1 The sellable unit: zone × work type

Postcodes are the *matching* unit but the wrong *selling* unit — 50-postcode invoices, near-zero traffic per postcode, contention chaos. Instead: bundle a static `zones.json` grouping postcodes into named zones (SE QLD ≈ 8–12 to start: Brisbane North / South / East / West, Logan–Ipswich, Gold Coast, Sunshine Coast, …; ABS SA4 boundaries are a reasonable template). Each postcode maps to exactly one zone.

```jsonc
// zones.json (bundled, versioned like installers.json)
{ "bne-east":   { "name": "Brisbane East",  "ranges": [[4151,4179]] },
  "gold-coast": { "name": "Gold Coast",     "ranges": [[4207,4230]] } }
```

- **One featured slot = (zone × work type), max 2 sold per combination.** Inventory is finite and explicit: `zones × 3 work types × 2 slots`. Scarcity is the product.
- **Zone map is a one-time platform job, never installer-defined.** Draw once from ABS SA4/SA3 boundaries (public shapefiles, scriptable), version in git. Zones are pricing inventory — letting installers shape them invites gerrymandered slots and breaks cap enforcement. Redraws only at renewal boundaries.
- An installer servicing 50 postcodes buys 2–3 *zones*, not 50 line items. Their **organic listing still covers every postcode they service, free** — featured is a positional upgrade in the zones they choose.
- Zone boundaries are versioned; redrawing a zone mid-subscription is a no (grandfather until renewal).

### 6.2 Pricing: flat per slot per quarter, traffic-banded at renewal

- **Launch gate: organic-only first.** The featured strip does not render until the first real slot is sold — a "paid placement" label with nobody paying is fake. No code needed: no `featured_slots` in data = no strip.
- **Founding phase (DECIDED 8 Jul 2026): A$99 per slot per quarter**, same across zones — deliberately underpriced (≈1.5 SolarQuotes leads; a one-phone-call yes). A **free first quarter may be offered selectively on the vetting call as a closer** (e.g. to land the first two installers in a zone) — not advertised as the default. Label stays regardless ("Featured — paid placement" even during a free founding quarter — the label describes the *mechanism*, not the amount).
- **Pricing rationale (anchors):** installers already pay SolarQuotes $55–60+GST *per lead*; our phone reveal is a warmer, engine-pre-qualified contact. Job margins ($2–4k on five-figure tickets) mean one converted job pays for years of a slot. Even future Band A at ~$900/qtr with ~100 reveals ≈ $9/contact — ~85% under the market reference, leaving headroom to raise at renewal. Rejected: reveal-count-linked pricing (per-lead psychology by the back door — every price becomes a negotiation and recouples revenue to clicks).
- **Steady state:** reprice at renewal only, from measured traffic — PostHog gives `directory_viewed` and `installer_phone_revealed` per zone. Publish bands (indicative, set with real data): Band C <300 zone views/quarter ≈ A$150 · Band B 300–1,500 ≈ A$450 · Band A >1,500 ≈ A$900; each band = a flat price. Quarterly billing cadence (matches manual invoicing + calendar-quarter slot expiry; monthly deferred). This is performance-*reported* flat pricing: the installer sees "your slot: 240 views, 31 reveals last quarter" and the price follows the band, never the clicks.
- **Never:** per-click, per-reveal, per-lead billing; auctions; "bid for position". Slot order within the featured strip stays distance-based.

### 6.3 Allocation when a zone×work-type is full

First-come-first-served. Incumbent gets right of first refusal at renewal (stability beats squeezing). Full combinations get a waitlist — which is also the demand signal for the price band. No outbidding: an installer can never pay to displace another, only wait.

### 6.4 Billing pipeline

**v1 (manual, fine below ~10 paying installers):** quarterly Stripe Payment Link / invoice, one line item per slot; on payment, edit `featured_slots` (set `until` = end of paid quarter), commit. Calendar-quarter aligned; prorate the first invoice. Lapse handling is automatic — `until` is a hard expiry in data, so a non-payment simply never gets extended and the render layer demotes to organic with zero code.

**v2 (when manual editing gets old):** Stripe Billing becomes the **source of truth** — one subscription per installer, one subscription item per slot, metadata `{installer_id, zone, work}`. A nightly back-office job (OpenClaw machine, same pattern as KB freshness):
1. Pull active subscriptions from Stripe API.
2. Regenerate every `featured_slots` block from them (`until` = current period end — auto-extends on payment, auto-lapses on churn/`past_due`).
3. **Validate invariants:** ≤2 slots per zone×work, zones exist, installer is `active` + vetting-fresh (a delisted installer's subscription gets flagged for refund, never rendered).
4. Commit / open PR → deploy. CI runs the same invariant checks on `installers.json` so a hand edit can't violate the cap either.

**Reporting job (monthly, same machine):** pull per-zone/per-installer stats from PostHog API → email each featured installer their views/reveals. This is the renewal engine and the pricing evidence in one.

### 6.5 What this preserves

Revenue stays decoupled from any individual user's click (flat per period), the engine and organic order remain fee-blind, the cap is enforced in data + CI + sale-time, and expiry-in-data means a lapsed payment can never silently keep a slot. The only new moving part is one nightly read-Stripe-write-JSON job — no DB, no billing UI, no installer portal required until self-serve.

## 7. MVP build checklist

> **Superseded 9 Jul 2026** by `installer-directory-build-plan.md` — the same items restructured into four phases (scaffolding → feature flag → organic release → featured release), with exit criteria per phase and human/legal gates placed explicitly. Kept below for reference.

### Original checklist (8 Jul 2026)

**Scope decisions:** recommender stays **national**; only the directory section is **QLD-only** for now. "Coming soon" elsewhere = the existing empty state (postcode + email waitlist) — it doubles as the where-to-expand-next signal. **No DB. No onboarding forms. No billing code.** Launch **organic-only** (§6.2 gate).

### One-time scripted (Claude Code)
- [ ] `zones.json` — SE QLD zone map scripted from ABS SA4/SA3 boundaries (~8–12 zones), postcode ranges per zone, versioned
- [ ] Postcode→centroid table bundled (free source: ABS POA centroids or Matthew Proctor CSV)
- [ ] `installers.json` schema per §3 (slot-based `featured_slots`), seeded with founding installers as they're vetted
- [ ] Port `match()` from `installer-directory-prototype.html` into `core`-adjacent module (NOT inside `core` — guardrail 1: engine never imports directory)
- [ ] Directory React section: featured strip (gated on slots existing) + organic list + chips + do-nothing collapse + click-to-reveal phone + empty state
- [ ] Empty-state waitlist wired to Resend Audiences (same endpoint pattern as 4A)
- [ ] PostHog events per §2 instrumentation list
- [ ] CI invariant tests on `installers.json`: ≤2 slots per zone×work, valid zones, expiry dates parse, vetting freshness

### Recurring scripted (Claw back-office, can lag launch)
- [ ] Re-verification job: CEC register / licence / ABN checks → update `verified_on`, flag failures
- [ ] Monthly installer stats email: views, phone reveals, and **how often each work type won in their zone** (PostHog API) — the renewal engine
- [ ] (post first ~10 payers) Stripe Billing → `featured_slots` nightly sync per §6.4 v2

### Human-only (the pacing item — and the moat)
- [ ] Source + call founding QLD installers: vetting checks, base postcode + travel radius (service area derives automatically per §3), work types
- [ ] Manual invoicing per §6.4 v1 (Stripe Payment Link; edit `until`, commit)
- [ ] Legal check on listing obligations (**gate before public launch**)
- [ ] Privacy copy update naming processors if waitlist collects emails (same obligation as 4A)

Estimated app-side build: **days, not weeks** — the prototype is the spec. The schedule is set by installer phone calls, not code.

## 8. Decisions taken here / still open (see also §9)

Taken: hybrid free+featured with cap 2 · static JSON no-DB v1 · postcode-range matching + centroid distance · click-to-reveal contact (no lead forms) · featured expiry in data · same vetting bar for both tiers · flat fee, not PPC (revenue must stay decoupled from clicks — PPC makes every "do nothing" result measurable lost income) · zones one-time platform-drawn, service areas radius-derived · recommendation drives directory, featured follows active work-type filter · organic-only launch gate · QLD-only directory inside national recommender.

Open: ~~confirm vetting list §4~~ **desk-vet tier added 13 Jul 2026 (§4)** · [ ] legal check on listing obligations · ~~founding slot price~~ **A$99/qtr decided 8 Jul 2026 (§6.2)** · [ ] draw the SE QLD zone map — one-time script from ABS boundaries (§6.1); **not needed for Brisbane organic launch (§9.4)** · [ ] source the AU postcode-centroid table (free options: ABS POA centroids, Matthew Proctor CSV) · [ ] whether featured also needs a "why am I seeing this" per-card popover (recommended: yes, cheap trust win) · [ ] rating source (park until real users).

---

## 9. Brisbane seed launch + installer/retailer split (added 13 Jul 2026)

Founder context driving this section: limited ongoing time, wants a real production directory for the Brisbane region seeded from 12 companies found via Reddit, everything else "coming soon". Unlock mechanism unchanged. **No DB** — the founder asked for "very basic db functionality"; the answer is that v1 §3 already is the minimum-maintenance store: bundled static JSON edited by hand via PR. A database would *add* maintenance, not remove it, at this scale. Revisit only at installer self-serve (§3 migration path).

### 9.1 Launch shape

- **Brisbane/SE QLD only, real data, organic-only** (featured strip stays dormant per §6.2 gate). Every other postcode hits the existing §2 empty state — waitlist + "coming soon" — which is already the expansion-demand instrument. No new code for "coming soon".
- Directory renders below the plan gate exactly as in §2; **Unlock is untouched**.
- Seed source = 12 companies from one Brisbane Reddit thread (list in build plan Phase 3). Selection bias is acknowledged and acceptable: Reddit recommendation is the *sourcing* filter, desk-vet (§4) is the *entry* filter. Any that fail register checks are dropped without ceremony. Launch bar stays ≥5 passing (build plan Phase 3 exit criteria).

### 9.2 Installer vs retailer split (decision: badge + explainer, one list)

Market reality the founder observed: actual installers are usually smaller operators; bigger companies are **retailers** who sign the contract and send their own contracted crews. The consumer-relevant distinction is **who does the physical install**, so `company_type` is defined by delivery model, not company size:

- `installer` — in-house SAA-accredited crews do the work (may still be a large firm, e.g. an established outfit with employed installers).
- `retailer` — sells the system, subcontracts the install to accredited third parties.
- `unknown` — can't confirm from desk research; **render no badge** rather than guess wrong (misclassifying a company publicly is a defamation-adjacent risk; the call in Phase 4 resolves these).

UX: **one list, one badge per card, one shared explainer** ("Two ways to buy") opened from the badge ⓘ. Rejected alternatives: two separate sections (awkward when one side is empty in a zone, doubles empty states) and a filter chip (zero education value — the education *is* the point).

Explainer copy (draft, keep neutral — we don't rank the two models):

> **Two ways to buy.** Some companies here are **local installers** — the accredited electricians who'll do the work are on their own staff. Others are **retailers** — they design and sell the system, then send contracted installers to do the job. Neither is automatically better: installers are often smaller and more direct; retailers can be bigger, with longer track records and stronger buying power. Either way, the physical installation must be done by SAA-accredited installers for your rebates to apply — everyone listed here meets our vetting bar for their type.

Guardrail extension: the badge and explainer must stay **neutral between the two types** — the moment copy nudges toward one model, we've editorialised and both sides can accuse us of bias. Organic ordering stays distance → years, blind to `company_type` (same clause as fee-blindness, rule 5).

### 9.3 Vetting the seed (desk-vet, §4)

One afternoon of register lookups per the desk-vet tier: ABR (ABN active, registration date as years-operating proxy), SAA register (installer accreditation) **or** NETCC register (retailer approval), QLD electrical contractor licence lookup, QBCC/Fair Trading disciplinary search, work types + base suburb from website, radius estimated from stated service area. Output = filled candidate table in the build plan → passing rows become `installers.json` entries via `serviceArea.ts`, one PR per company (audit trail unchanged).

### 9.4 What this defers

- **Zones**: organic matching is postcode-level (§3) — `zones.json` is featured-billing inventory only, so the real ABS zone map can wait for the first featured conversation. Placeholder zones from Phase 1 are fine indefinitely.
- **Phone-call vetting depth**: moves to featured onboarding (§4 desk-vet tier).
- **The legal check does NOT defer** — it remains the hard gate before prod flag-on (§4 open question). Listing real Brisbane businesses by name makes it *more* urgent than the placeholder phase, not less. It is the only blocker that isn't code or desk work.
