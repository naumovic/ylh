# Your Local Hero — project guide for Claude Code

Independent solar / EV / battery advisor for Australian homes. **National tool, QLD-first** for any optional human service. Moat = consumer-aligned honesty + an always-current AU knowledge base. Full strategy lives in the parent folder: `solar-ev-battery-advisor-seed.md`, `claude-code-build-plan.md`, `frontend-and-pipeline.md`.

## Golden rules (do not break)
1. **`src/core` is the source of truth for every number.** It is a pure, deterministic, fully-tested TypeScript library. The UI and any future LLM **render** its output — they must NEVER recompute or alter a figure or a ranking.
2. **"Do nothing" is a first-class result.** Never hide it; it is the trust differentiator. Keep the regression test green (the founder's case must NOT recommend a battery).
3. **Code-only generation. No LLM, no DB in the consumer path.** The free ballpark and the paid pack (scenarios, payback chart, PDF) are all generated in code. The only backend is `api/verify.ts` (stateless Stripe check).
4. **Every `core` change needs a passing `vitest` test.** Run `npm test` and `npm run typecheck` before a PR is mergeable.
5. **Money:** dollars (numbers) in the engine; integer cents only if/when persisted.

## Stack
Vite + React + TypeScript · Tailwind (brand tokens in `tailwind.config.ts`) · shadcn/ui (add as needed) · Vitest · client-side PDF (jsPDF / @react-pdf) · Stripe Checkout + `api/verify` · PostHog · deploy on Vercel (PWA + function).

## Design
Trustworthy & clean, **light** theme. Amber `#F2A900` accent on deep navy `#14304B`. Inter, tabular numerals for money. Recommended option gets the amber accent; "do nothing" is a normal card. Plain, honest, calm copy — say the hard thing without hedging, never salesy.

## Build order (from the current scaffold)
1. `core` + tests — DONE (port verified against the prototype).
2. Intake form + free ballpark result + **scenario table** + **payback chart** (client-side from `core`/`report.ts`).
3. Paid pack: precise-inputs gate + **client-side PDF** + JSON export (unlimited re-runs — no cap).
4. Stripe Checkout (+ promotion codes for discounts) + `api/verify` unlock-token gate.
5. PostHog events (`unlock_clicked`, `purchased`) + waitlist fallback for non-buyers + privacy/terms/refund pages.
6. PWA service worker + polish + a11y pass.

## Key files
- `src/core/types.ts` · `config.ts` (CFG + per-state rates + `deriveState`/`ratesFor`/`rebate`) · `engine.ts` (`recommend()`) · `report.ts` (`scenarios`, `cashflow`, `buildPlan`, `CHECKS`).
- `src/App.tsx` — minimal themed shell wiring the engine (replace with the full product).
- `api/verify.ts` — stateless Stripe payment check → signed unlock token.
