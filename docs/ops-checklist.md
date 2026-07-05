# Deployment & founder DevOps checklist

**Living doc — update as you go.** Snapshot: 5 Jul 2026, at commit `d5c598b` (Task 4A complete + live: PostHog key deployed, Resend domain verified, legal contact email set, duplicate Render service suspended).

This captures the deploy topology and the manual founder steps that Claude Code **can't** do (accounts, DNS, dashboards). Code + tests are done; these are the ops around them.

---

## Current state (what's live)

- **Repo (canonical):** `https://github.com/naumovic/ylh` — this is `origin`; all code lives here. Render deploys from `main` (auto-deploy on push).
- **Render service:** `ylh-web` (Web Service, **Starter** plan) → **https://yourlocalhero-web.onrender.com**
  - Runtime: Node 22 · Build: `npm ci && npm run build` · Start: `npm start` · Health check: `/`
  - Serves the built PWA (`dist/`) **and** the API (`/api/unlock`, `/api/reserve`) from one service.
- **Env vars set on the service:** `NODE_VERSION=22`, `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `RESEND_FROM` (verified domain), and `VITE_POSTHOG_KEY` (**confirmed baked into the live bundle** — `phc_qFcT…`).
- **Resend:** account live, using the **General** audience; sending domain verified. (Real-user delivery to a non-signup inbox still to be confirmed via the browser test below.)
- **Smoke test (prod, 5 Jul):** `GET /` 200 · `/privacy` 200 · bad-email → 400 · waitlist unlock → `{ok:true,emailQueued:false}` · `/api/reserve` → `{ok:true}`. PostHog key + `vergeco@hey.com` contact email confirmed in the deployed bundle. Full email-gate bundle deployed.

---

## Founder to-dos (manual — not Claude Code)

- [x] **Verify a Resend sending domain.** ~~Right now `RESEND_FROM=onboarding@resend.dev`~~ Domain verified and `RESEND_FROM` set to the domain address on the Render service. **Still confirm** a real plan email actually lands in a **non-signup** inbox via the browser test below (that's the true proof the domain path works).
- [x] **PostHog** (the go/no-go signal). Project created, `VITE_POSTHOG_KEY` set on the Render service and **confirmed baked into the live bundle** (`phc_qFcT…`). Region default (US host). Next: confirm events actually land in PostHog → Live events during the browser test below.
- [ ] **Custom domain.** Attach `yourlocalhero.com.au` to the **`ylh-web`** service (Settings → Custom Domains), add the DNS records Render shows (apex usually needs ALIAS/ANAME or A records; `www` a CNAME); TLS auto-issues. Point `yourlocalhero.app` to 301-redirect to the canonical domain.
- [x] **Legal contact email.** `CONTACT_EMAIL` in `src/pages/legal.tsx` set to `vergeco@hey.com` (forwards to founder's private inbox); live in prod as of `d5c598b`. **Still confirm** the forward actually delivers — send a test to `vergeco@hey.com` and check it arrives (deletion requests go there).
- [ ] **Verify the real unlock flow** in a browser at the live URL: wizard → Unlock → form (your signup email) → **plan email with PDF arrives**, reload stays unlocked, survey + reservation + `/privacy` all work.
- [ ] **Keep the service on Starter** (not Free) so it never spins down.
- [ ] **Go/no-go gate:** after ~300 free results, read the PostHog funnel and decide **4B (Stripe)** vs the slow-asset path. Write the final go/no-go numbers into `Pivot-3.md` §6.

## Cleanup (safe to do anytime)

- [ ] **Delete the suspended duplicate `ylh-web`.** A **blueprint-managed** `ylh-web` (URL **`ylh-web.onrender.com`**, older build, no PostHog key) was running alongside the canonical service. **Now suspended** (5 Jul) — delete it via the **Blueprints** page when convenient (blueprint-managed services can't be deleted directly). ⚠️ Both services are *named* `ylh-web` in the dashboard — tell them apart by **URL**: keep `yourlocalhero-web.onrender.com` (live, has the PostHog key), remove `ylh-web.onrender.com`. Note the latent name collision: `render.yaml` declares `name: ylh-web`, so re-applying the blueprint would recreate it.
- [ ] **Delete the stale Render bits** on the wrong repo: the old **Blueprint(s)** and the **suspended `yourlocalhero` service** (they're wired to `github.com/naumovic/yourlocalhero`, not `ylh`). Delete via the **Blueprints** page.
- [ ] **Decide on the old GitHub repo.** Two repos exist: `naumovic/ylh` (canonical) and `naumovic/yourlocalhero` (old/stale scaffold). Simplest is to keep using `ylh`; if you want the repo *named* `yourlocalhero`, rename/delete the old one first (the name is taken). Local + Render both use `ylh`.
- [ ] **Delete test contacts** from the Resend audience (a `waitlist`/reserve contact for your own email was added during smoke testing).

---

## Env var reference

| Var | Where | Purpose |
|---|---|---|
| `NODE_VERSION` | build | Pin Node (22) |
| `RESEND_API_KEY` | server | Resend key (contacts + send). Full-access key. |
| `RESEND_AUDIENCE_ID` | server | The audience contacts upsert into (General is fine) |
| `RESEND_FROM` | server | Verified sender. `onboarding@resend.dev` = testing only (your address). |
| `VITE_POSTHOG_KEY` | client (build-time) | PostHog project key `phc_…`. Analytics no-ops if unset. |
| `VITE_POSTHOG_HOST` | client (build-time) | Only if EU region: `https://eu.i.posthog.com` |
| `STRIPE_*` | — | **Deferred to 4B**; not needed for the email-gate. |

Local dev uses a git-ignored `.env.local` (see `.env.local.example`); run the full stack with `npm run build && npm start`.

---

## Gotchas learned the hard way

- **Repo mismatch was the deploy blocker.** Render was originally connected to `naumovic/yourlocalhero` (old repo, no lockfile → `npm ci` failed). All code is in `naumovic/ylh`. Always confirm the build log's `Cloning from …/ylh` line. Associating an existing service to a Blueprint does **not** repoint its repo — create a fresh service instead.
- **PWA service worker caches aggressively.** After a deploy, hard-refresh (Ctrl/Cmd+Shift+R) or use incognito, or you'll see the old build.
- **Never-block behaviour:** if Resend or the network fails, `/api/unlock` still returns `{ok:true, emailQueued:false}` and the user is unlocked. That's intended (no revenue to protect yet).
- **Stripe is deferred (4B)** pending this 4A go/no-go gate — don't wire payments until the funnel says go.
