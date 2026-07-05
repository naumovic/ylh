# Go/No-Go funnel — PostHog setup & decision rule

The 4A email-gate exists to answer one question: **is there enough demand and
willingness-to-pay to justify building 4B (Stripe)?** This doc defines the exact
PostHog insights that answer it and the rule for reading them. Final decided
numbers go into `Pivot-3.md` §6 (parent folder).

Events are defined in `src/lib/analytics.ts`; all 8 are anonymous-safe (no PII
required to count them). No `$pageview` is captured (pageview/autocapture are
off), so **Web Analytics will always be empty** — use Product Analytics only.

---

## Insight A — Unlock conversion funnel (the primary signal)

Product Analytics → New insight → **Funnel**. Steps, in order (sequential):

1. `results_viewed`   — a free ballpark was shown
2. `unlock_clicked`   — clicked "Unlock my plan"
3. `email_provided`   — submitted the email form
4. `plan_emailed`     — plan email dispatched

- **Conversion window:** 1 day (the whole flow is one session; a short window is fine).
- **Order:** sequential.
- **Save as:** `Go/No-Go — Unlock conversion`.

Headline metrics to watch:
- **`results_viewed → email_provided`** = the demand signal (do people want the pack enough to hand over an email?).
- **`unlock_clicked → email_provided`** = form-friction check (if this is low, the form/copy is the problem, not demand).

## Insight B — Willingness to pay (the pricing signal)

Product Analytics → New insight → **Trends**.

- Series: event = `survey_answered`
- Breakdown by: event property **`price_bucket`**
- Display: bar chart, total count
- **Save as:** `Go/No-Go — Price buckets`.

Buckets (from `PostUnlockPanel.tsx`): `a29_fair` (A$29 is fair), `closer_a10`
(yes ~A$10), `free_only` (free only), `no`. Also eyeball the `free_text` property
for qualitative "what would make it worth paying" notes.

## Insight C — Founder intent

Product Analytics → New insight → **Trends**.

- Series 1: `founder_reserved` (total)
- Series 2: `plan_emailed` (total) — to read the ratio
- **Save as:** `Go/No-Go — Founder reservations`.

`founder_reserved / plan_emailed` = concrete purchase intent at the A$9 founder
anchor. This is the strongest single signal — a reservation is a near-purchase.

## (Optional) Insight D — Engagement

`pdf_downloaded / plan_emailed` — did unlockers actually value the artefact.

Put A–C on a dashboard named **Go/No-Go** for one-glance monitoring.

---

## Decision rule

Read at the sample size in the ops-checklist (**~300 `results_viewed`**). Set the
project timezone to Australia first (Settings → Project) so daily buckets match.

Thresholds below are **starting hypotheses** — calibrate and record the final
call in `Pivot-3.md` §6.

**GO — build 4B (Stripe)** when the signals agree:
- `results_viewed → email_provided` ≳ **25%**, and
- willingness-to-pay: `a29_fair + closer_a10` ≳ **40%** of `survey_answered`, and
- `founder_reserved / plan_emailed` ≳ **15–20%**.

**NO-GO — slow-asset path** when:
- unlock conversion **< 10%**, and
- most respondents pick `free_only` / `no`, and
- founder reservations are negligible.

**Marginal** (mixed signals) → extend the sample, or iterate the unlock copy /
price anchor before deciding.

Guardrail: keep the "do nothing" recommendation honest regardless of what the
funnel says — willingness-to-pay must not become pressure to over-recommend.
