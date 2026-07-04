# Your Local Hero

Independent solar · EV · battery advisor for Australian homes. Free ballpark answer for everyone; a low one-off unlock buys a precise, personalised plan (generated **in code** — no LLM). Built as an installable PWA, deployed on Render.

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
- **`api/verify.ts`** — the only backend (arrives in Task 4): a stateless check that verifies a Stripe payment and returns a signed unlock token. No database. It's currently written as a Vercel-style function; since `@vercel/node` functions don't run on Render, **Task 4 will convert it into a single small Node web service (Express/Hono)** that serves the built `dist/` statics *and* `/api/verify` (and later `/api/create-checkout`), with a `render.yaml`. One service, still stateless, no DB.

## Deploy (Render)
The app is live on **Render.com**, connected to the GitHub repo — push to `main` and it auto-deploys. Render *preview environments* per PR are a paid add-on (optional); otherwise eyeball locally with `npm run dev` before merge.

1. Push this repo to GitHub (already connected to Render).
2. **Today it's a static site.** Render config → Build command: `npm run build` · Publish directory: `dist`. (Optional SPA rewrite: `/*` → `/index.html`.) Verified: `npm run build` emits `dist/index.html` + hashed `dist/assets/*` + the PWA service worker.
3. Set env vars in the Render dashboard (**Service → Environment**, never in the repo): `STRIPE_SECRET_KEY`, `UNLOCK_JWT_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_POSTHOG_KEY`.
4. Add the domain **yourlocalhero.com.au** (canonical); set **yourlocalhero.app** to 301-redirect to it.
5. Commercial use is fine on Render; the web-service starter tier is comparable to the old Vercel Pro (~US$20/mo). When Task 4 lands, the static site becomes the single Node web service described above (add `render.yaml`).

## Payments + discounts
Stripe Checkout for the A$29 unlock. Discount codes for early feedback users are **Stripe promotion codes** (capped, expiring) — configured in the Stripe dashboard, no code.

See `CLAUDE.md` for the rules Claude Code must follow, and the parent folder for full strategy + costs.
