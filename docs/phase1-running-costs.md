# Phase 1 — Rough Running Costs (validation)

> **Goal of Phase 1:** show the free ranked answer from a few inputs, and **measure willingness-to-pay via clicks on the “unlock” button.** Prices verified mid-2026 (sources at end). FX assumed ~**A$1.50 = US$1**. Cloud bills are in USD; the A$29 price and Stripe fees are in AUD.

---

## TL;DR

- **Chosen path: Scenario C — a production-ready, *code-only*, real-paywall tool for ~US$20/month on Render** (or ~$0 on Cloudflare/Firebase). Because the plan is generated deterministically (no LLM) and Stripe holds payments + discount codes, the only real fixed cost is hosting. Gives a *real* willingness-to-pay signal (people actually paying, not just clicking).
- **Hosting note:** the app is deployed on **Render** (auto-deploys from `main`). A Render web-service starter tier (~US$20/mo, commercial use fine) hosts the PWA *and* the Stripe-verify endpoint, so no GCP/Firebase needed for the MVP. (Today it runs as a Render static site; the verify endpoint arrives in Task 4 as a single Node web service.)
- **No database, no LLM, no Temporal/Redis needed** for the paid flow: static PWA + Stripe Checkout + one stateless serverless verify function. **Discount codes** are native Stripe promotion codes (config, not build).
- **The big costs are things you should NOT turn on yet:** Temporal Cloud (~US$100/mo min), Memorystore Redis (~US$16–36/mo), Postgres, GKE — defer each until a stateful feature actually needs it.
- **The real per-sale cost isn't compute — it's Stripe:** ~**A$0.89 on a A$29 sale** (~3%).
- *(Scenarios A/B below kept for reference: A = fake-door waitlist; B = if you later add LLM-generated prose.)*

---

## The architecture insight that makes Phase 1 cheap

The free ranked answer is **deterministic** — it runs **client-side in the React PWA** (the same engine the prototype already runs in the browser). So:

- serving the free answer to national traffic costs **~nothing** (no server compute, no LLM, no DB write unless you log the lead);
- the **“unlock” click is the conversion event** — capture it (and optionally an email) to measure willingness-to-pay;
- you do **not** need the LLM, Temporal, or Redis to run this test. Those only matter once you actually *deliver* the paid AI plan.

So Phase 1 has two flavours, cheapest first:

---

## Scenario A — “Fake-door” validation (recommended first step)

Unlock click → record intent (+ email / “we’re building your plan”), **no AI plan generated yet.** Pure measurement of conversion.

**No database, no backend required.** The engine runs client-side; the only things to persist are the *conversion event* and the *waitlist signups*, which off-the-shelf tools capture for free. Don't run Postgres for a fake-door test.

**The unlock button points at a waitlist form** (decided): clicking “Unlock plan — A$29” opens a **Tally / Typeform email-capture form** — "We're putting the finishing touches on personalised plans. Leave your email and we'll let you know the moment it's ready (and you'll get early-bird pricing)." Submissions live **in that form tool or the email provider** — no DB to run. This does three jobs at once: it **measures willingness-to-pay** (who clicks → who actually leaves an email), it **respects the user** (they get something — a spot in line — instead of feeling baited), and it **builds a warm launch list** of people who wanted the paid plan.

| Item | Choice | ~Monthly |
|---|---|---|
| Frontend hosting (PWA) | Firebase Hosting / Cloud Storage + CDN free tier | **$0** |
| Backend API + Database | **none needed** (engine is client-side) | **$0** |
| **Unlock → waitlist form** | **Tally** or **Typeform** email capture; submissions in the tool / email provider | **$0** (free tier) |
| Funnel analytics (optional) | PostHog / GA4 — fire `unlock_clicked` with state + recommended option as properties | **$0** |
| Real-money signal (optional, stronger) | **Stripe Payment Link** as an A/B against the waitlist — do some users *pay* vs just leave an email? | $0 fixed (per-sale fee only) |
| Redis / Temporal / LLM | **not needed** (nothing generated) | **$0** |
| Domains (`.com.au` + `.app`) | annual, amortised | ~**$2–3** |
| **Total** | | **≈ US$0–5 / month** |

**Two signals worth separating:** (1) *clicked unlock* = curiosity; (2) *left email on the waitlist* = real intent. The gap between them is your conversion read. Optionally A/B a small slice against a real **Stripe Payment Link** to see how many would actually pay now vs wait.

> When do you actually need a datastore? Only once you *deliver* the paid plan (accounts, purchases, re-run cap) — that's Scenario B. For click + waitlist measurement, a form tool + analytics is enough. (Collecting emails means you need a short **privacy-policy page** and a clear opt-in — a page, not infrastructure.)

---

## Scenario B — Validation that delivers an *LLM-generated* plan

Unlock → take payment (Stripe) → generate the plan with the LLM → deliver. Lean (no Temporal/Redis/GKE; generate synchronously, store in a small DB).

| Item | Choice | ~Monthly |
|---|---|---|
| Frontend + API | Firebase Hosting + Cloud Run | **$0–5** |
| Database | Cloud SQL `db-f1-micro` | **$8–10** |
| LLM (plan generation) | Claude Haiku 4.5, ~1–3¢/plan | **$ (volume × ~2¢)** |
| Redis / Temporal / GKE | deferred | **$0** |
| Domains | amortised | ~**$2–3** |
| **Fixed total** | | **≈ US$15–25 / month** + ~2¢/plan + Stripe per sale |

---

## Scenario C — Production-ready, **code-only**, real paywall **(chosen)**

> Decided 30 Jun 2026. Ship a real, payable tool to learn whether people *pay* — but generate the plan **deterministically in code** (no LLM), gate it with a **stateless serverless payment check**, and use **Stripe discount codes** for early feedback users. No LLM, no DB, no Temporal/Redis.

| Item | Choice | ~Monthly |
|---|---|---|
| Hosting (PWA **+** verify endpoint) | **Render** — auto-deploys from `main`; a web-service starter tier hosts the PWA *and* the Stripe-verify endpoint in one place | **~US$20** (commercial use fine) |
| — *or* ~$0 alternative | **Cloudflare Pages / Firebase Hosting** (free tiers permit commercial) + free Workers/Functions | **$0** |
| Plan + PDF generation | **code-only, client-side** (engine + bundled KB; jsPDF/print) | **$0** |
| Payments + discount codes | **Stripe Checkout** + native **promotion codes** (Stripe holds it all) | $0 fixed (per-sale fee only) |
| Database / LLM / Temporal / Redis | **none needed** | **$0** |
| Analytics + waitlist fallback | PostHog/GA4 + Tally/Typeform (free tiers) | **$0** |
| Domains (`.com.au` canonical, `.app` redirect) | amortised | ~**$2–3** |
| **Total** | | **~US$20/mo on Render** (or ~**$0** on Cloudflare/Firebase) **+ Stripe per sale** |

**Why this is the pick:** it's a *real* paywall (true willingness-to-pay signal, not just a click), yet near-free because deterministic generation means **no tokens, no DB, no orchestration**. The hosting line is the only real fixed cost, and it's a choice: **~US$20/mo on a Render web service** (smoothest, already set up; commercial use is fine) **or ~$0** on a host whose free tier allows commercial use (Cloudflare Pages / Firebase). Discount codes onboard feedback users at A$0–14 manually. Marginal cost per sale is just **Stripe (~A$0.89 per A$29)**.

> Hardening note: a pure client-side paywall is "soft" (JS is inspectable). The serverless verify function stops casual bypass; if you ever need hard protection, **generate the pack inside that function after payment** — still no LLM, no DB.

---

## Per-unit economics

**LLM cost per generated plan** (one call: ranked result + knowledge-base snippets in, prose plan out). Assume ~**4k input + ~0.8k output tokens**:

| Model | Input $/M | Output $/M | ~Cost / plan |
|---|---|---|---|
| **Haiku 4.5** | $1 | $5 | **~US$0.008** (~1¢) |
| Sonnet 4.6 | $3 | $15 | ~US$0.024 (~3.5¢) |

Prompt-caching the system prompt + KB (90% off cached input) pushes this lower still. **Net: ~1–3 cents per plan.** At a A$29 price that's ~0.1% of revenue — the LLM is rounding error.

**Stripe on a A$29 sale:** 1.75% + A$0.30, +10% GST on the fee ≈ **A$0.89 per sale (~3%)**. This — not compute — is your real marginal cost per paid customer.

---

## If it gets traction (sanity check)

Say **10,000 free users/month**, **5% click unlock = 500 paid @ A$29** (≈ A$14,500 revenue):

| Cost | Amount |
|---|---|
| LLM (500 × ~2¢) | ~US$10 |
| Stripe (500 × ~A$0.89) | ~A$445 |
| Cloud Run (likely still ~free tier; modest if not) | ~US$0–20 |
| Cloud SQL | ~US$10–25 |
| **Now worth adding:** Redis (re-run cap) + Temporal (durable generation) | ~US$120–140 |
| **Total run cost** | **~A$700–900/mo against ~A$14,500 revenue** |

Margins stay ~90%+. The model is not compute-bound at any realistic scale — it's bound by **conversion rate**, which is exactly what Phase 1 measures.

---

## What to defer, and the trigger to add it

| Component | ~Cost when on | Add it when… |
|---|---|---|
| **Temporal Cloud** | US$100/mo min | you’re delivering enough paid plans that durable, retryable generation + PDF + email matters (lost jobs = refunds) |
| **Memorystore Redis** | US$16–36/mo | live paid generation needs the re-run cap + caching enforced server-side |
| **GKE (Kubernetes)** | cluster + nodes | traffic/job volume/team size outgrow Cloud Run’s simplicity |

Until then: Cloud Run + a small/free Postgres + synchronous Haiku generation. **The unlock-click number tells you when to spend more.**

---

## Sources (verified 30 Jun 2026)

- Claude API pricing — Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
- Cloud Run pricing (free tier) — Google Cloud: https://cloud.google.com/run/pricing
- Cloud SQL pricing — Google Cloud: https://cloud.google.com/sql/pricing
- Memorystore for Redis pricing — Google Cloud: https://cloud.google.com/memorystore/docs/redis/pricing
- Temporal Cloud pricing: https://temporal.io/pricing
- Stripe Australia pricing: https://stripe.com/au/pricing

*Rough estimates for planning only; cloud prices vary by region/configuration and change over time — verify against the live calculators before committing. FX ~A$1.50/US$1.*
