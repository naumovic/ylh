---
tags:
  - project:battery-advisor
ewok: 2026-06-29
---

# Claude Code Build Plan — Solar · EV · Battery Recommender (national tool, QLD-first service)


> **Scope:** A buildable plan for the pivoted product — the **Needs/Solution Recommender** — built with **Claude Code**.
> **Design intent:** deterministic economic core, AI only at one edge (drafting prose), templated everywhere a human repeats themselves, and architected so the prototype ports cleanly to a hosted app.
> **Source of truth for thesis + facts:** `solar-ev-battery-advisor-seed.md` (build to §3, §5, §7).
> **Supersedes** `phase0-quote-analyzer-calculator-plan.md`. The quote analyzer is **out of scope** — removed in the pivot.
> **Status:** Design doc, pre-build. We haven't started; this is a fresh start, not a refactor.
>
> **Build surface (decided 29 Jun 2026, stack revised): a modern, Linear-style installable PWA on a typed cloud stack — not an Ewok/OpenClaw prototype.** The product has too many moving parts (national per-state config, a branching engine, a paid tier, accounts, durable AI workloads) for a script-runner to carry the consumer surface. The single-file `recommender-prototype.html` is the **spec**, not the architecture; its JS engine ports directly to TypeScript. **Temporal supersedes OpenClaw/Ewok** as the production orchestrator for durable/agentic background work (OpenClaw remains only a dev-time convenience, if at all). See the **Technology stack** section below.

---

## 0. Guiding principles

1. **Deterministic core, AI at the edges.** All economic maths (self-consumption, sizing, rebate, EV-charging value, payback) is pure, testable, reproducible — defensible on a trust call. AI is used only for (a) reading a messy electricity bill into structured fields and (b) drafting the plain-English recommendation. AI never produces the numbers.
2. **The engine must be able to say "do nothing."** A "no value-add" outcome is a first-class result, not a failure path. This is the trust differentiator (it's the founder's own case).
3. **Reason across all three domains in one pass.** Battery, EV-charging, and more-solar are compared against the *same* self-consumption gap, then ranked. Don't build three siloed calculators.
4. **Config over code for anything that changes.** STC factor/taper, QLD feed-in tariffs (Energex vs Ergon), stamp-duty bands, generation factors, tariff spreads — all in versioned config the AI can propose updates to and a human approves (seed §7).
5. **Template every repeated human action.** Recommendation write-up, vetting checklist, trust-call script, config-update proposal — all templated so a person reviews/approves rather than recreates. This is how one human serves many cases (seed §7).
6. **Port path baked in.** `core` is a typed library (TypeScript) with stable signatures; the **GraphQL API, Temporal workers, and the React PWA** are just callers. `core` never imports from any interface — so the same engine runs server-side and client-side.

---

## 1. Architecture overview

```
  consumer / operator
        │
        ▼
  ┌──────────────────────────────┐
  │ INTAKE TOOL                   │   structured numbers in (NOT a bill).
  │  PWA form / GraphQL / JSON ─► │   validates + derives state+network from
  │  validate · derive · default  │   postcode → emits canonical intake.json
  └──────────────────────────────┘
        │  intake.json (schema-versioned)
        ▼
  ┌───────────────────────────────────────────────┐
  │  core/  (pure, deterministic — no I/O, no LLM)  │
  │   ├ self_consumption   (export gap)             │
  │   ├ battery_model      (sizing + rebate taper)  │
  │   ├ ev_charging_model  (daytime-solar value)    │
  │   ├ solar_upgrade_model(generation-constrained) │
  │   ├ payback            (low/high ranges)         │
  │   └ recommend          (rank the options)       │
  └───────────────────────────────────────────────┘
                     │  ranked result
                     ▼
          ┌────────────────────┐
          │ plan generator     │  ← CODE-ONLY (templates over core+KB),
          │ (deterministic)    │     client-side PDF. No LLM, no DB.
          └────────────────────┘
                     │
                     ▼
   paywall: Stripe Checkout (+ promo codes) → stateless verify fn → signed token
                     │
                     ▼
          (optional premium) human review · route to vetted installer

  bundled KB (static config)        (later, when stateful features appear)
  feeds the generator               Postgres · Temporal · Redis

  (later, optional) bill auto-reader ──► fills the SAME intake fields
```

**Layering (strict, for portability):**

| Layer | Responsibility | Implementation |
|---|---|---|
| `core` (TS pkg) | All economic logic + ranking | Pure, typed functions — ports from the prototype's JS; imported by API **and** Temporal workers |
| intake | Validate structured numbers → canonical `intake` object | GraphQL mutation (web) / typed module; same schema everywhere |
| AI edge | Plan-narrative drafting only (one LLM step) | Claude API call inside a **Temporal activity** (durable, retryable) |
| data access | Read/write store; load config/KB | Postgres (Cloud SQL) via a typed repo; Redis (Memorystore) for cache + counters |
| orchestration | Run a case / durable jobs | GraphQL resolvers (sync) + **Temporal workflows** (async/agentic) |
| interface | How a consumer triggers it | **React PWA** → **GraphQL API** |
| reference data (KB) | STC config, per-state tariffs, products, fair price | Postgres tables, AI-proposed → human-approved (seed §7) |

**The one rule:** `core` never imports from interface, AI, or storage. Dependencies point inward — so the same typed engine runs in the API, in Temporal workers, and (for the free tier) can even run client-side.

---

## 1b. Technology stack (target — Linear-style PWA)

> **Decided 29 Jun 2026.** Aim for a modern, installable PWA on a typed, cloud-native stack. Build it with Claude Code; the prototype is the functional spec.

| Concern | Choice | Why / what it carries |
|---|---|---|
| **Frontend** | **React** (TypeScript) as an installable **PWA** | App-like, offline-capable shell, instant free-tier UX (engine can run client-side); charts/PDF render client-side (no tokens). Vite + service worker + web manifest. |
| **API** | **GraphQL** (Apollo Server on Node) | One typed contract for intake → recommendation → unlock → report → account; the `intake` schema (§1a) maps to a GraphQL input type. |
| **Backend** | **Node.js (TypeScript)** + **Temporal** *(later)* | The MVP backend is just a **stateless serverless verify function** (§4) — no Temporal needed, because plan generation is **code-only**. **Temporal** earns its place later for genuinely durable/agentic work: emailed PDFs, the optional human-review workflow, automated **KB-freshness** sweeps (§6), **installer-vetting** sweeps (§7). |
| **Database** | **Cloud SQL for PostgreSQL** | Cases, intake, results, **knowledge base** (per-state tariffs/rebates/products/fair-price, each `source`+`as_of`), users, purchases. Money in integer cents. |
| **Cache** | **Memorystore for Redis** *(later)* | Caching/rate-limiting at volume. *Not* needed for a re-run cap — code-only generation has no cap. |
| **Infra** | **GCP** · **Docker** · **Kubernetes (GKE)** | Containerised services (web, GraphQL API, Temporal workers) orchestrated on GKE; Cloud SQL + Memorystore managed. |

**Where the two tiers live (revised 30 Jun 2026 — code-only):**
- **Free (deterministic):** the `core` engine + charts run **client-side in the PWA**. Going national costs ~nothing.
- **Paid (also deterministic):** the precise pack + PDF are **generated in code** (client-side, or server-side behind the paywall for hard gating). Gated by a **stateless serverless function** that verifies the Stripe payment and returns a signed unlock token (§4). **No LLM, no DB, no Temporal/Redis** on this path.

**The table above is the *eventual* target, not the production MVP.** Because generation is code-only and Stripe holds payments + discount codes, the **production MVP needs almost none of it** — just **static PWA hosting + Stripe Checkout + one serverless verify function**. Add the heavier pieces only when a feature actually demands state:
- **GraphQL API + Postgres** — when you add **accounts, saved history, or your own sales/audit records** (Stripe + analytics cover the basics without them).
- **Temporal** — when durable multi-step jobs appear (e.g. emailed PDFs, the optional human-review workflow, KB-freshness automation).
- **Redis** — when you need server-side caching/rate-limiting at volume (the re-run cap is gone, so not needed for that).
- **GKE** — when traffic/team size outgrow Cloud Run.
- Rationale: every component is the right *long-term* choice, but code-only generation pushes the need for most of them well past first revenue. Cloud Run → GKE is a packaging step (same Docker images), so nothing is wasted by starting lean.

---

## 1a. Intake tool — structured numbers in (the entry point)

> **Decision (29 Jun 2026):** the product starts with **raw structured numeric inputs**, not bill ingestion. Reading a bill is the least reliable step and not the moat; making it the entry point would gate the whole engine on an OCR/extraction problem. So intake is a **typed tool with a schema**; a bill auto-reader is a *later, optional convenience* that fills the same fields.

> **Decision (29 Jun 2026):** the tool is **national** — postcode derives the **state + network**, and the state's config supplies the **import rate, feed-in tariff and generation factor** so the homeowner never has to know them (an "advanced" override exists). This single mechanism both **shortens the form** (two confusing fields removed) and makes the tool work **Australia-wide**. The paid human service is still QLD-first; the tool is not.

**What "expose the intake step as a tool" means here:** intake is a contract, not a UI. The tool takes structured fields, **validates** them, **derives** what it can (state + network + default rates from postcode), applies **config defaults** for anything left `unknown`, and emits one canonical **`intake.json`**. The deterministic core only ever reads that JSON. The *same* schema is produced by every surface:

| Surface | Phase | How |
|---|---|---|
| **JSON fixture / test** | dev | a typed `intake` object drives unit tests and seeds |
| **GraphQL `createCase` mutation** | core | typed input = the form fields → returns `{ caseId, intake }` |
| **React PWA form** | core | binds to the same GraphQL input type |
| **Bill auto-reader** (optional, later) | later | LLM fills the same fields |

Because all surfaces emit the identical schema (a single TS type, mirrored as the GraphQL input), swapping surfaces never touches the engine — the "interface is just a caller" rule.

**Canonical `intake.json` (schema-versioned):**
```json
{
  "schema_version": "2026-06",
  "case_id": "auto-or-supplied",
  "location": { "postcode": "4000", "state": "QLD", "network": "energex" },
  "tariff": { "type": "tou", "import_rate_cents": 30, "fit_cents": 5, "supply_charge_cents_day": 120, "source": "derived" },
  "usage": {
    "period": "monthly",
    "grid_import_kwh": 200,
    "solar_export_kwh": 400,
    "usage_profile": "day_heavy"
  },
  "solar": { "status": "have", "size_kw": 6.6, "age_years": 4 },
  "ev": { "status": "buying", "charging_window": "daytime_home" },
  "goals": ["bill_savings", "go_electric"]
}
```

**Field rules:**
- `location.state` — **derived** from postcode first digit (2→NSW, 3→VIC, 4→QLD, 5→SA, 6→WA, 7→TAS, 0→NT, with ACT pockets in 2600–2618 / 2900–2920); explicit value overrides.
- `location.network` — QLD only (`energex` | `ergon`, derived from postcode); ignored for other states.
- `tariff.import_rate_cents` / `tariff.fit_cents` — **auto-filled from the state's config default** (`source: "derived"`); if the user supplies them, `source: "user"` and confidence rises. This is the field pair that used to be asked directly and is now derived.
- `tariff.type` — `flat` | `tou` | `unknown`.
- `solar.status` — `have` | `none`. When `none`, `size_kw`/`solar_export_kwh` are ignored and the engine runs the **install-solar** path (`grid_import_kwh` is treated as total usage); the solar install becomes the headline recommendation.
- `usage.period` — `monthly` | `quarterly`; the tool **normalises to monthly** so the core always gets monthly kWh.
- `usage.usage_profile` — `day_heavy` | `night_heavy` | `even` | `unknown`.
- `ev.status` — `own` | `buying` | `none`; `ev.charging_window` — `daytime_home` | `night_home` | `away` | `unknown`.
- `goals` — any of `bill_savings`, `backup`, `go_electric`.

**Validation (lives in the tool, so `core/` can trust its input):** required fields present; numbers within sane ranges (e.g. `0 ≤ kWh`, `size_kw` 0–30); enums valid; `period` recognised. On failure the tool returns errors, not a partial JSON. Each field carries an implicit confidence: supplied > derived > defaulted; the engine surfaces overall confidence in its result.

```
intake_tool(fields) -> { case_id, intake_json, warnings[], confidence }   # validate · derive · default · normalise
```

---

## 2. The deterministic core (`core/`)

Pure **TypeScript** functions, primitives/typed objects in and out, fully unit-testable (the prototype's JS engine ports here almost verbatim). Money in **integer cents**; energy in kWh.

**2.1 Self-consumption (`self_consumption.py`)**
```
analyse(import_kwh_month, export_kwh_month, usage_profile, solar_kw)
  -> { exported_value_now_cents, capturable_kwh, daytime_surplus_kwh, evening_load_kwh }
```
Turns the bill's import/export into "how much solar is wasted at near-zero FiT, and how much could be captured."

**2.2 Battery model (`battery_model.py`)**
```
stc_count(usable_kwh, config) -> float          # taper bands 100/60/15, cap 50 kWh
rebate_estimate(usable_kwh, config) -> cents     # stc_count * price_per_stc
recommend_size(evening_load_kwh, daytime_surplus_kwh, config)
  -> { recommended_kwh, reason, crosses_taper: bool }
```
Surfaces "bigger isn't better past 14 kWh." Returns *no-battery* when evening load is too small to pay back.

**2.3 EV-charging model (`ev_charging_model.py`)**
```
value_of_daytime_charging(capturable_kwh, ev_need_kwh, charging_window, import_rate_cents, fit_cents)
  -> { annual_value_cents, chargeable_kwh, assumes }
```
Models charging the car from daytime solar **vs from the grid**: each solar kWh into the car avoids a grid kWh (import rate) instead of exporting it (FiT), so the value is the **import−FiT spread**. No petrol/ICE comparison — that would conflate the *buy-an-EV* decision with the *charging* decision. (Often the highest-return move when an EV is in play and the owner is home in the day.)

**2.4 Solar model — upgrade *or* install (`solar_model.py`)**
```
value_of_expansion(add_kw, current_kw, daytime_load_kwh, export_surplus_kwh,
                   generation_factor, import_rate_cents, fit_cents, config)
  -> { annual_saving_cents, offset_kwh, exported_kwh, reason }

recommend_install(daytime_load_kwh, ev_daytime_need_kwh, generation_factor,
                  import_rate_cents, fit_cents, config)        # used when has_solar == false
  -> { recommended_kw, gen_kwh, self_used_kwh, export_surplus_kwh,
       annual_saving_cents, payback, reason }
```
- **Upgrade (has solar):** new panels first offset any **unmet** daytime grid load (valued at import rate), then export the rest (valued at FiT). A household already exporting a surplus has little/no unmet daytime load, so extra solar is mostly low-value export — the model correctly returns a poor payback (more panels is the wrong move when the surplus is already going unused).
- **Install (no solar — added 29 Jun 2026):** size a system to cover daytime load **plus EV daytime need** if applicable, capped to a typical roof; value = daytime load offset at import rate + surplus exported at FiT. This becomes the **headline** for no-solar households, and the model returns the **projected export surplus** that the battery and EV-charging models then evaluate against ("next, once solar is in"). The ranker sequences solar first for these cases — battery/EV are meaningless without it.

**2.5 Payback (`payback.py`)**
```
payback_range(net_cost_cents, annual_saving_low_cents, annual_saving_high_cents)
  -> { low_years, high_years, disclaimer }
```
Every output carries the general-information disclaimer string from config.

**2.6 Ranker (`recommend.py`)**
```
rank(case) -> ordered list of options, each:
  { option: battery|ev_charging|more_solar|do_nothing,
    headline, est_cost_cents, est_annual_saving_cents,
    payback_years_range, confidence, reason, what_to_ignore }
```
**`do_nothing` is always a candidate** and wins when nothing else pays back.

---

## 3. Config (versioned, human-approved)

`config/incentives.yaml` — the single place all mechanics live; carries a `version` recorded on every saved result. Split into a **national** block (the federal battery rebate) and a **per-state** block (import rate, FiT, generation factor, EV concessions) keyed off the postcode-derived state.

```yaml
version: "2026-06"

# ---- National (federal battery rebate, same everywhere) ----
battery_stc:
  factor_per_kwh: 6.8           # mid-2026; steps down ~6-monthly toward ~2.1 by 2030
  price_per_stc: 37.0           # net after installer handling
  taper_bands:
    - { up_to_kwh: 14, multiplier: 1.00 }
    - { up_to_kwh: 28, multiplier: 0.60 }
    - { up_to_kwh: 50, multiplier: 0.15 }
  max_eligible_kwh: 50
  requires_existing_or_new_pv: true   # battery-only NOT eligible

# ---- Per-state defaults (rough mid-2026; refine before offering paid service in a state) ----
states:
  QLD: { import_cents: 30, fit_cents: 5,   gen_factor: 4.0,  networks: { energex: { fit_cents: 5 }, ergon: { fit_cents: 6.006, effective: "2026-07-01" } } }
  NSW: { import_cents: 32, fit_cents: 5,   gen_factor: 3.9 }
  VIC: { import_cents: 28, fit_cents: 4,   gen_factor: 3.6 }
  SA:  { import_cents: 44, fit_cents: 4,   gen_factor: 4.2 }   # high import → battery/EV pay back faster
  WA:  { import_cents: 30, fit_cents: 3,   gen_factor: 4.4 }   # DEBS time-varying FiT
  TAS: { import_cents: 30, fit_cents: 9,   gen_factor: 3.2 }
  ACT: { import_cents: 25, fit_cents: 6,   gen_factor: 3.8 }
  NT:  { import_cents: 28, fit_cents: 9,   gen_factor: 4.6 }

disclaimer: "General information only, not personal financial product advice."
```

**Worked sanity numbers** (unit-tested): 10 kWh → 68 STC → ~A$2,516 (~A$252/kWh, matches seed §5); marginal value drops past 14 kWh (the "don't oversize" signal). **State sensitivity (also tested):** the *same* "wants backup" household gets a battery payback of ~5.7 yrs in SA (44c import) vs ~9.1 yrs in QLD (30c) — the import−FiT spread, set per state, is what moves the answer. Non-QLD state rows are **rough defaults flagged for refinement** before that state gets paid service.

---

## 4. The two tiers — code-only generation, real paywall

> **Model (30 Jun 2026): code-only deliverable, no LLM, no DB in the core path.** Both tiers are generated **deterministically in code** from inputs + the bundled knowledge base. The paid tier is gated by a **real Stripe payment** verified by a **tiny stateless serverless function** — production-ready so we learn whether people actually *pay*, not just click. No LLM, no database, no Temporal/Redis on the consumer path.

**Free tier — ballpark ranked answer.** Engine runs **client-side in the PWA** on a few inputs + typical postcode rates. Instant, deterministic, ~zero marginal cost, national. This is the funnel.

**Paid tier — the precise action pack (~A$19–39, real payment).** Uses the household's exact tariff/usage and returns a pack, all **generated in code**:
- **scenario comparison** — deterministic what-ifs (buy now vs wait as the rebate steps down; size A vs B; daytime vs night EV charging);
- **payback chart** — cumulative cashflow with break-even marker (client-side SVG);
- **rebates/rates applied** — the postcode's current figures from the bundled KB, each dated;
- **downloadable PDF** (client-side: jsPDF / pdfmake / print-to-PDF) + **data export (JSON)**;
- **tweak-and-re-run as much as you like** — **no cap** (deterministic generation costs nothing; the token-guard re-run cap is *gone*, which is also a better product).

**No LLM in the generation.** The personalised prose is produced by **templates with conditional logic** over the engine output + KB facts — 100% accurate, reproducible, free. (An LLM "polish pass" on the narrative is an **optional later upgrade**, scoped to wording only, *if* real user feedback says the templated prose feels generic. Even then it never touches a number.)

### Paywall — stateless serverless payment check (the only backend)

1. User clicks **Unlock — A$29** → **Stripe Checkout** (Stripe hosts the page, holds the payment, and natively applies **promotion / discount codes** — redemption limits + expiry configured in Stripe, no custom code).
2. On success, a **single stateless serverless function** (Cloud Run / Cloud Functions / Cloudflare Worker) **verifies the Stripe Checkout session** (`payment_status === 'paid'`) and returns a **short-lived signed unlock token** (e.g. a JWT signed with a secret).
3. The PWA renders/exports the paid pack only on a valid token.

This needs **no database** (Stripe is the source of truth for payments + codes) and **no LLM**. It stops casual bypass (clicking unlock without paying).
- **Honest limit:** because the engine ships to the client, a determined developer could reproduce the *computation* from the JS. For A$29 consumer pricing that's an acceptable risk. **If you ever need hard protection,** generate the precise pack **inside the serverless function after payment** (compute server-side, return the finished PDF) — still **no LLM, no DB**, just deterministic code behind the paywall.

**Discount codes (for early feedback users).** Create Stripe **promotion codes** (e.g. `FEEDBACK` for 50–100% off, capped redemptions, expiry) and share them manually to get people using the tool in exchange for feedback. Zero build — it's Stripe configuration.

Intake is structured input (§1a), so there is **no AI anywhere in the consumer path** — fully deterministic and testable end to end.

**Optional, later:** a bill auto-reader (LLM extracts intake fields) and/or the narrative polish pass — both out of the production-MVP critical path.

---

## 4a. Knowledge base — the moat (`kb/`)

With the human dropped from the core, the **knowledge base is the defensible asset** (seed §4/§7). It's what makes the paid plan better than free ChatGPT (which doesn't know today's per-retailer tariffs or the live STC step-down) and more current than a static calculator.

**What it holds (versioned, sourced, dated):**
- **Per-state / per-retailer tariffs** — import rates, feed-in tariffs, supply charges, TOU windows.
- **Rebate mechanics** — federal battery STC factor + taper + step-down dates; any state schemes; EV concessions.
- **Products** — CEC-approved batteries/inverters/panels, usable kWh, warranty norms.
- **Fair-price benchmarks** — installed $/kW and $/kWh ranges by region (so the plan can flag "that quote looks high").
- **Checklists** — what to ask installers / what to verify, per option (solar / battery / EV charger).

**How it's used:** the **code-only generator** (§4) reads the snippets relevant to the case (postcode → state/retailer rows, the recommended option's checklist, applicable rebate) and renders them into the plan — every figure traceable to a dated KB entry. In the MVP the KB ships as **bundled static config** (updated on deploy); it graduates to Postgres only when you want to edit it without redeploying.

**How it's maintained:** at MVP, **edited by hand and shipped on deploy**. Later, scheduled jobs (Temporal) watch sources and draft updates with citations for human approval (seed §7). Each entry carries `source` + `as_of` so the plan can say "current as at <date>" — turning *freshness* into a visible trust signal. **This is the single thing most worth investing in; a thin KB means no moat.**

---

## 5. Templates (the scale mechanism)

Stored as versioned files so a human reviews/approves rather than recreates:
- `templates/recommendation.md` — the consumer-facing write-up skeleton.
- `templates/trust_call_script.md` — what the human covers on the validation call.
- `templates/vetting_checklist.md` — installer accreditation/ABN/financial-signal checks.
- `templates/config_update_proposal.md` — what the freshness job hands a human to approve.

---

## 6. Data freshness loop (seed §7)

A **Temporal scheduled workflow** watches the moving numbers (STC step-downs, FiT changes at 1 Jul, per-state rates), drafts a `config_update_proposal` citing sources, and a **human approves before it's written to the KB tables**. Wrong incentive numbers kill the only moat, so this is in-scope early — manual at first, then a Temporal cron workflow. Each KB row carries `source` + `as_of` so the paid plan can show "current as at <date>".

---

## 7. Installer vetting (for the optional premium / directory)

A **Temporal scheduled workflow** gathers accreditation (CEC/SAA), ABN status, and review/financial-distress signals and flags them; **a human verifies and owns the vetted list.** Records live in Postgres next to cases (proto-CRM). Note (post-pivot): vetting feeds the *optional* human-review tier and a directory — it's a feature, not the moat (seed §4/§10).

---

## 8. Build order (production MVP — real, payable, code-only)

> **Decision (30 Jun 2026): ship a production-ready paid tool, not a fake-door.** We need to learn whether people *pay*, not just click. Because generation is code-only and Stripe holds payments + discount codes, "production-ready" is still small: **static PWA + Stripe Checkout + one serverless verify function.** No DB, no LLM, no Temporal/Redis. (The waitlist remains as a fallback CTA for users who don't buy.)

1. **`core` engine (TS) + unit tests** — port the prototype's JS: self-consumption, battery, EV-charging, solar-install/upgrade, payback, ranker. Regression-test the founder's case (returns **do-nothing / EV-charging**) and state-sensitivity (SA battery ~5.7y vs QLD ~9.1y). Bundle the **KB as static config** (`incentives` per-state).
2. **React PWA — free tier** — installable shell, intake form, ballpark ranked answer + charts, all client-side from `core`. The national funnel.
3. **Paid pack generation (code-only)** — precise inputs → scenario table, payback chart, dated rebates/rates, **client-side PDF** (jsPDF/pdfmake), JSON export. No cap.
4. **Stripe Checkout + discount codes** — one-off A$29 product; **promotion codes** (`FEEDBACK…`, capped, expiring) configured in Stripe for manual sharing. Optional A$99 human-review as a second product.
5. **Stateless verify endpoint** — a small **Node web service on Render (Express/Hono)** serving `dist/` + `/api/verify`: confirm the Stripe session is paid → return a short-lived **signed unlock token**; PWA renders the paid pack on a valid token. (For hard gating, generate the pack inside this endpoint post-payment.)
6. **Analytics + waitlist fallback** — `unlock_clicked` / `purchased` events (PostHog/GA4); non-buyers see a waitlist CTA. Add **privacy policy + terms + refund** pages.
7. **Deploy on Render** — the PWA **and** the verify endpoint on one service (auto-deploys from `main`); point `yourlocalhero.com.au` here, redirect `.app`. Measure **free → paid conversion and actual revenue** (seed §9). **~US$20/mo (Render web service — commercial use fine)** or ~$0 on Cloudflare Pages/Firebase, + Stripe per sale (see `phase1-running-costs.md`).

**Defer until a feature demands state:** GraphQL API + Postgres (accounts/history/audit), Temporal (emailed PDFs, human-review workflow, KB-freshness automation), Redis (caching at volume), GKE (scale), bill auto-reader, optional LLM narrative-polish pass.

---

## 9. Verification & quality gates

- **Economic math:** unit tests assert worked figures to the dollar; a test fails loudly if config changes outputs (so a step-down is a conscious, reviewed act).
- **Do-nothing correctness:** a regression test on the founder's own case must return a non-battery recommendation.
- **Intake validation:** the intake tool rejects out-of-range/invalid input (returns errors, never a partial JSON), derives network correctly from postcode, and normalises quarterly→monthly. Schema-validate every `intake.json` before the core runs.
- **Bill-extraction accuracy** *(only if/when the optional auto-reader is built):* labelled fixtures; measure precision/recall before unattended use.
- **Explainability:** every recommendation cites the inputs and assumptions that drove it — no headline without a reason and rough numbers.
- **Determinism:** same inputs + same `config.version` → identical ranking. Snapshot-tested.
- **No advice overreach:** every payback/saving output carries the disclaimer string; a test checks it's present.

---

## 10. Scaling map (Phase 1 lean → Phase 2 full)

Same code throughout; only the operational footprint grows. Cloud Run → GKE is a packaging step (identical Docker images), so nothing is wasted.

| Concern | Phase 1 (validate) | Phase 2 (scale) | Migration |
|---|---|---|---|
| Economic logic | `core` (TS), client- + server-side | identical | none |
| Compute | Cloud Run (serverless containers) | **GKE** (same images) | redeploy manifests |
| DB | Cloud SQL Postgres | same (bigger tier / replicas) | none |
| Cache / counters | Memorystore Redis | same | none |
| Durable/agentic jobs | Temporal Cloud | self-hosted or Cloud Temporal | none (same workflows) |
| API | GraphQL on Node | same | none |
| Frontend | React PWA | same | none |
| Money | integer cents | same | none |

---

## 11. Open items (resolve before/while building)

- [ ] **SE QLD generation factor** (kWh/kW/day) — pick a defensible default.
- [ ] **Tariff spread / TOU defaults** — per-retailer or single SE QLD default for Phase 0.
- [ ] **EV assumptions** — default efficiency (kWh/100km) and annual-km default for the solar-vs-grid charging calc.
- [ ] **Hosting start point** — confirm Cloud Run for Phase 1 (defer GKE) and **Temporal Cloud vs self-hosted** for first durable jobs.
- [ ] **GraphQL server** — Apollo Server vs alternative; codegen for shared TS types.
- [ ] **Auth & payments** — account/auth provider and Stripe product setup for the one-off unlock + optional A$99 review.
- [ ] **Intake schema fields** — confirm the v1 field set is sufficient (anything missing for sizing/EV?).
- [ ] **Bill formats** *(deferred)* — only relevant if/when the optional auto-reader is built.

---

*Build to the seed's facts (§3, §5) and the AI-vs-human split (§7). Figures live in `incentives.yaml` so the prototype stays correct with a one-line, human-approved edit. This is a build plan, not legal or financial advice; confirm the advice/referral boundary before taking installer fees.*
