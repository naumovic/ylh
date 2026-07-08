# Your Local Hero

Independent solar · EV · battery advisor for Australian homes. Free ballpark answer for everyone; an **email-gate unlock** (free while in early access — first name, last name, email) reveals the full personalised plan (generated **in code** — no LLM) and emails it. Built as an installable PWA, deployed on Render. Real payments (Stripe) are deferred pending the 4A go/no-go gate.

## Quick start
```bash
npm install
npm run dev        # client-only dev server → http://localhost:5173
npm test           # unit tests (Vitest): core engine + server
npm run typecheck  # tsc --noEmit
npm run build      # production build → dist/

# Full stack locally (serves dist/ + the API on one port):
npm run build && npm start          # → http://localhost:3000
npm run dev:server                  # same, with reload (tsx watch)
```
`npm run dev` (Vite, :5173) is client-only and does **not** serve `/api/*`. To exercise the
email-gate endpoints locally, build and run the Node service (`npm start`, :3000).

## Architecture (MVP)
- **`src/core`** — the deterministic engine (pure TS, fully tested). Source of truth for every number.
- **PWA (React + Vite + Tailwind)** — runs the free engine + paid pack + client-side PDF entirely in the browser.
- **`server/` (Node + Hono)** — one small web service that serves the built `dist/` PWA **and** the email-gate API (Task 4A): `POST /api/unlock` (validate → upsert a Resend contact → email the plan, PDF attached) and `POST /api/reserve` (founder reservation). Stateless — **no database**; Resend Audiences is the contact store. Started with `npm start` (`tsx server/index.ts`).
- **`api/verify.ts`** — a `@ts-nocheck` placeholder for **Stripe (Task 4B, deferred)**. Not wired; it will join the same `server/` service after the 4A go/no-go gate.

## Deploy (Render)
The app is live on **Render.com** as a **single Node web service**, connected to the GitHub repo — push to `main` and it auto-deploys (`render.yaml` in the repo root). Preview environments per PR are a paid add-on (optional); otherwise eyeball locally (`npm run build && npm start`) before merge.

- **Service config** (see `render.yaml`): runtime `node`, plan **starter** (not free — the free tier spins down and the API must stay warm), Build `npm ci && npm run build`, Start `npm start`, health check `/`.
- **Env vars** — set in the Render dashboard (**Service → Environment**), never in the repo:

  | Var | Where | Purpose |
  |---|---|---|
  | `RESEND_API_KEY` | server | Resend API key (contacts + email send) |
  | `RESEND_AUDIENCE_ID` | server | Resend Audience the contacts upsert into |
  | `RESEND_FROM` | server | Verified sender, e.g. `Your Local Hero <plan@mail.yourlocalhero.com.au>` |
  | `VITE_POSTHOG_KEY` | client (build-time) | PostHog project key (`phc_…`, publishable). Analytics no-ops if unset. |
  | `VITE_POSTHOG_HOST` | client (build-time) | PostHog region host, e.g. `https://us.i.posthog.com` (default) or `https://eu.i.posthog.com` |
  | `VITE_FF_DIRECTORY` | client (build-time) | `on` renders the installer directory below results. **Leave unset/off in prod** until launch (see Feature flags). |
  | `VITE_FF_OVERRIDES` | client (build-time) | `on` enables the `?ff_directory=1` runtime override. Ship off/unset once the directory is live. |

  If `RESEND_API_KEY`/`RESEND_AUDIENCE_ID` are unset, the service still runs and `/api/unlock` returns `{ ok: true, emailQueued: false }` — it just doesn't store or email.
- **Domain:** add **yourlocalhero.com.au** (canonical); set **yourlocalhero.app** to 301-redirect to it.

## Feature flags
No DB, no flag service — flags are **build-time env + a runtime override** (`src/lib/flags.ts`). Currently one flag gates the **installer directory** (a QLD-first list of vetted installers shown below the results; see `docs/installer-directory-build-plan.md`).

- **`VITE_FF_DIRECTORY`** — set to `on` to render the directory in the real results flow. It is **always on in `npm run dev`** (via `import.meta.env.DEV`) and **off in production** unless you set it. Keep it off in prod until the Phase-3 organic-release gate (legal check + real vetted installers) passes.
- **`VITE_FF_OVERRIDES`** — set to `on` to allow a **runtime override** for probing a prod build before launch: append **`?ff_directory=1`** to any URL to switch the directory on for the session (persists in `sessionStorage`; `?ff_directory=0` clears it). The override is a no-op unless `VITE_FF_OVERRIDES=on`, so once the directory is live for everyone you can ship with overrides off.

Both are `VITE_`-prefixed, so they're **inlined at build time** — changing them means a redeploy (or a fresh `npm run build`), not a runtime toggle.

**Bundle safety:** when both flags are off (default prod), the directory's code and data are behind a compile-time-foldable gate, so Rollup **drops the chunk entirely** — a flag-off build ships zero directory code or data. With `VITE_FF_OVERRIDES=on` the directory becomes a **separate lazy chunk** (`DirectorySection-*.js`), fetched only when the override fires; it's never eager in the main bundle.

**Dev-only harness:** `npm run dev` → **`/dev/directory`** renders the directory in isolation with a scenario switcher (battery / solar / EV / do-nothing) + postcode input + an event toast. This route is gated on `import.meta.env.DEV` and is excluded from production builds.

### Resend setup (founder, one-time)
1. Create a Resend account → **Audiences** → create an audience; copy its ID → `RESEND_AUDIENCE_ID`.
2. **Domains** → add a sending subdomain (e.g. `mail.yourlocalhero.com.au`) and add the shown **DNS records** (SPF/`TXT`, DKIM `CNAME`s, and a return-path/MX) at your DNS host; wait for "Verified".
3. Set `RESEND_FROM` to an address on that verified subdomain.
4. **API Keys** → create a key with send access → `RESEND_API_KEY`.
5. Free tier: 1,000 contacts, 3,000 emails/mo, 100/day — enough for the 4A validation run.

### Local dev with `.env.local`
The service loads `./.env.local` in non-production (`process.loadEnvFile`, already git-ignored). Create it to test the real Resend path locally:
```bash
# .env.local  (do NOT commit)
RESEND_API_KEY=re_...
RESEND_AUDIENCE_ID=...
RESEND_FROM=Your Local Hero <plan@mail.yourlocalhero.com.au>
```
Then `npm run build && npm start` and POST to `http://localhost:3000/api/unlock`.

**Previewing without the form:** append **`?preview=1`** to the URL to unlock the full plan without filling the email form (founder/preview shortcut; unlock also persists in `localStorage`).

**Privacy & terms:** static pages at `/privacy` and `/terms` (client-routed; the Node service serves `index.html` for both). Linked in the footer and from the unlock form's consent checkbox. Update the contact email in `src/pages/legal.tsx` (`CONTACT_EMAIL`) to a mailbox you actually receive.

> **Note on Resend custom fields:** Resend Audience contacts persist only email / first name / last name / unsubscribed. The funnel properties `source` (`unlock`/`waitlist`) and `founder_reserved` are captured authoritatively in **PostHog** (Task 4A §4); on the contact they're best-effort.

## Payments + discounts (deferred — Task 4B)
Stripe Checkout for the A$29 unlock is **deferred** pending the Task 4A email-gate go/no-go. When it lands: one-off A$29 product + **Stripe promotion codes** (capped, expiring) for early users — dashboard config, no code.

See `CLAUDE.md` for the rules Claude Code must follow, and the parent folder for full strategy + costs.
