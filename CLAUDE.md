# Your Local Hero — project guide for Claude Code

Independent solar / EV / battery advisor for Australian homes. **National tool, QLD-first** for any optional human service. Moat = consumer-aligned honesty + an always-current AU knowledge base. Full strategy lives in the parent folder: `solar-ev-battery-advisor-seed.md`, `claude-code-build-plan.md`, `frontend-and-pipeline.md`. Installer directory: `docs/installer-directory-design.md` + `docs/installer-directory-build-plan.md` (reference prototype: `docs/reference/installer-directory-prototype.html`).

## Golden rules (do not break)
1. **`src/core` is the source of truth for every number.** It is a pure, deterministic, fully-tested TypeScript library. The UI and any future LLM **render** its output — they must NEVER recompute or alter a figure or a ranking.
2. **"Do nothing" is a first-class result.** Never hide it; it is the trust differentiator. Keep the regression test green (the founder's case must NOT recommend a battery).
3. **Code-only generation. No LLM, no DB in the consumer path.** The free ballpark and the unlocked pack (scenarios, payback chart, PDF) are all generated in code. The only backend is a small stateless Node service (`server/`) — the 4A **email-gate** (`/api/unlock`, `/api/reserve`) via Resend. Stripe (`api/verify`) is **deferred (4B)**. No database.
4. **Every `core` change needs a passing `vitest` test.** Run `npm test` and `npm run typecheck` before a PR is mergeable.
5. **Money:** dollars (numbers) in the engine; integer cents only if/when persisted.
6. **Installer directory (branch `feature/installer-directory`):** Phase 1 scaffolding + Phase 2 flag can build anytime (placeholder data, dev route, `VITE_FF_DIRECTORY` off in prod); Phases 3–4 (organic/featured release) gated on the 4A go/no-go + legal check. Phases + exit criteria: `docs/installer-directory-build-plan.md`.

## Stack
Vite + React + TypeScript · Tailwind (brand tokens in `tailwind.config.ts`) · shadcn/ui (add as needed) · Vitest · client-side PDF (jsPDF) · **email-gate** via a small Node/Hono service (`server/`) + **Resend** · **PostHog** analytics · deployed on **Render** (auto-deploys from `main`). Stripe Checkout + `api/verify` deferred (4B).

## Deploy (Render)
- Hosting is **Render.com**, connected to the GitHub repo. Push to `main` → auto-deploy. Preview environments per PR are a paid Render add-on (optional); otherwise eyeball locally with `npm run build && npm start` before merge.
- The app runs as a **single Node web service** (`server/`, Hono via `tsx`; see `render.yaml`): serves the built `dist/` PWA **and** `/api/unlock` + `/api/reserve`. Build `npm ci && npm run build`, start `npm start`, plan **starter** (not free — must stay warm). Stateless, no DB.
- **Env vars** (Render dashboard → Service → Environment, never in the repo): `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `RESEND_FROM`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` (region). Stripe vars (`STRIPE_SECRET_KEY`, `UNLOCK_JWT_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`) arrive with 4B.
- **`?preview=1`** unlocks the paid view for founder/preview without the email form.
- **Task 4 (Stripe) is deferred** pending the 4A email-gate go/no-go gate (`Pivot-3.md` §6). When it lands, `api/verify` joins this same service.
- **Live at** `https://yourlocalhero-web.onrender.com` (service `ylh-web`, repo `naumovic/ylh`). Deploy topology + the manual founder to-dos (Resend domain, PostHog key, custom domain, cleanup) live in **`docs/ops-checklist.md`** — read it first when resuming ops work.

## Design
Trustworthy & clean, **light** theme. Amber `#F2A900` accent on deep navy `#14304B`. Inter, tabular numerals for money. Recommended option gets the amber accent; "do nothing" is a normal card. Plain, honest, calm copy — say the hard thing without hedging, never salesy.

## Build order (from the current scaffold)
1. `core` + tests — DONE (port verified against the prototype).
2. Intake form + free ballpark result + **scenario table** + **payback chart** (client-side from `core`/`report.ts`).
3. Paid pack: precise-inputs gate + **client-side PDF** + JSON export (unlimited re-runs — no cap).
4. **4A email-gate (replaces Stripe for now) — DONE:** Node/Hono service (`server/`) + Resend; email-gate unlock UI, survey, founder-reservation, waitlist; PostHog events; privacy/terms pages. See `docs/task-4a-email-gate-instructions.md`.
   **4B (deferred):** Stripe Checkout + `api/verify` unlock-token gate, pending the 4A go/no-go gate.
5. PWA service worker + polish + a11y pass. (Refund page not needed until something is sold.)

## Key files
- `src/core/types.ts` · `config.ts` (CFG + per-state rates + `deriveState`/`ratesFor`/`rebate`) · `engine.ts` (`recommend()`) · `report.ts` (`scenarios`, `cashflow`, `buildPlan`, `CHECKS`).
- `src/App.tsx` — path router + the wizard → ballpark → email-gate unlock → plan flow.
- `server/` — Node/Hono service: `app.ts` (routes), `validation.ts`, `resend.ts` (Resend wrapper), `rateLimit.ts`, `index.ts` (serves `dist/` + API).
- `src/lib/` — `analytics.ts` (PostHog, no-ops without key), `api.ts` (unlock/reserve calls), `exportPdf.ts` (`planPdfBase64`).
- `api/verify.ts` — deferred Stripe placeholder (`@ts-nocheck`), wired in 4B.

## Installer directory guardrails (non-negotiable)
1. `core/` NEVER imports `directory/` — the engine's answer is computed before directory code runs.
2. Organic ordering comparator = distance, then years_operating. It must never reference fees, tiers, slots, or company_type.
3. Featured cap = 2 per zone×work-type, enforced in match() AND CI.
4. Directory renders below the answer; "do nothing" collapses it behind explicit user action.
5. No per-lead/per-click/per-reveal billing; no user data transmitted to installers.
6. Expiry lives in data (`until`) — lapse takes effect with zero code.
7. Installer/retailer badge + explainer copy stays neutral between the two types; `company_type: unknown` renders NO badge — never guess a real company's delivery model.
8. Placeholder data uses obviously fake names until Phase 3 desk-vet passes.
