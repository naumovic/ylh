# Your Local Hero

Independent solar · EV · battery advisor for Australian homes. Free ballpark answer for everyone; a low one-off unlock buys a precise, personalised plan (generated **in code** — no LLM). Built as an installable PWA, deployed on Vercel.

## Quick start
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # core engine unit tests (Vitest)
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

## Architecture (MVP)
- **`src/core`** — the deterministic engine (pure TS, fully tested). Source of truth for every number.
- **PWA (React + Vite + Tailwind)** — runs the free engine + paid pack + client-side PDF entirely in the browser.
- **`api/verify.ts`** — the only backend: a stateless Vercel function that verifies a Stripe payment and returns a signed unlock token. No database.

## Deploy (Vercel)
1. Push this folder to a GitHub repo.
2. Import it in Vercel (framework: Vite). Every PR gets a **preview URL**; `main` deploys to production.
3. Set env vars in Vercel: `STRIPE_SECRET_KEY`, `UNLOCK_JWT_SECRET` (and `VITE_POSTHOG_KEY` for analytics).
4. Add the domain **yourlocalhero.com.au** (canonical); set **yourlocalhero.app** to 301-redirect to it.
5. Commercial use → **Vercel Pro** (~US$20/mo); the free Hobby tier is non-commercial.

## Payments + discounts
Stripe Checkout for the A$29 unlock. Discount codes for early feedback users are **Stripe promotion codes** (capped, expiring) — configured in the Stripe dashboard, no code.

See `CLAUDE.md` for the rules Claude Code must follow, and the parent folder for full strategy + costs.
