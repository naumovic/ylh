# Build "Your Local Hero" with Claude Code — Runbook

A step-by-step guide to take the `app/` scaffold from this folder into your WSL2 setup and build it out with Claude Code. You already have: a verified TypeScript `core` engine, a themed React PWA shell, an `api/verify` Stripe stub, brand tokens, and a `CLAUDE.md` of guardrails. This runbook covers **moving the files**, **setting up WSL2 + Claude Code**, and the **exact sequence of prompts** to feed Claude Code.

---

## 0. What you're building (one line)
A national, code-only, real-paywall PWA: free ballpark answer for everyone → A$29 unlock for a precise, code-generated plan (scenarios + payback chart + PDF). No LLM, no DB; one stateless Stripe-verify endpoint. Deployed on Render (auto-deploys from `main`). Full strategy: `solar-ev-battery-advisor-seed.md`, `claude-code-build-plan.md`, `frontend-and-pipeline.md`, `phase1-running-costs.md`.

---

## 1. Move the scaffold into WSL2 (on the Linux filesystem)

> **Important:** keep the project under your Linux home (`~/projects/...`), **not** under `/mnt/c` or `/mnt/z`. Running a Node project off the Windows mount is slow and breaks file-watching.

The scaffold is at `Z:\01_Projects\battery-advisor\app` on Windows.

**Easiest (Explorer GUI):**
1. In Windows Explorer, open `Z:\01_Projects\battery-advisor`.
2. In the address bar type `\\wsl.localhost\Ubuntu\home\<your-wsl-username>\projects\` (create the `projects` folder if needed; swap `Ubuntu` for your distro name).
3. Copy the **`app`** folder into there and rename it `yourlocalhero` (your repo root).
4. Also copy the strategy `.md` files into `yourlocalhero/docs/` so Claude Code has full context (see step 3).

**Or from the WSL shell** (if your `Z:` drive is auto-mounted at `/mnt/z`):
```bash
mkdir -p ~/projects/yourlocalhero
cp -r "/mnt/z/01_Projects/battery-advisor/app/." ~/projects/yourlocalhero/
mkdir -p ~/projects/yourlocalhero/docs
cp /mnt/z/01_Projects/battery-advisor/*.md ~/projects/yourlocalhero/docs/
```
If `Z:` is a mapped **network** drive and isn't under `/mnt/`, mount it first:
```bash
sudo mkdir -p /mnt/z && sudo mount -t drvfs Z: /mnt/z
```
(then re-run the `cp` commands).

After copying, point the CLAUDE.md context line at the local docs:
```bash
cd ~/projects/yourlocalhero
sed -i 's#in the parent folder:#in ./docs/:#' CLAUDE.md   # optional tidy-up
```

---

## 1b. How Cowork (planning) and Claude Code (build) work together

**Cowork cannot mount a WSL/UNC path** (`\\wsl.localhost\...` is rejected), and it can only connect to Windows paths — while Node/Claude Code are fastest on the WSL Linux filesystem. So we **don't** force one shared mounted folder. Instead:

- **Canonical repo lives in WSL** (`~/projects/yourlocalhero`) — full Linux-fs speed. **Claude Code builds here.**
- **Cowork stays the planning surface** and the author of the strategy + instruction docs. Those docs are copied into the repo's **`docs/`** so Claude Code reads them for context.
- **Sync = a lightweight hand-off:** when a doc changes in Cowork, copy that one file into `~/projects/yourlocalhero/docs/` and commit. Updates are occasional, so this is low-friction. (Alternatively, let Claude Code edit `docs/` directly for small changes and return to Cowork for bigger strategic passes.)

**One-time import from the OpenClaw drive (`Z:`):**
```bash
sudo mkdir -p /mnt/z && sudo mount -t drvfs 'Z:' /mnt/z   # if Z: isn't already visible to WSL
cd ~/projects/yourlocalhero
cp -r /mnt/z/01_Projects/battery-advisor/app/. .          # scaffold -> repo root
mkdir -p docs
cp /mnt/z/01_Projects/battery-advisor/{solar-ev-battery-advisor-seed,claude-code-build-plan,frontend-and-pipeline,phase1-running-costs,BUILD-WITH-CLAUDE-CODE}.md docs/
cp /mnt/z/01_Projects/battery-advisor/recommender-prototype.html docs/
```
(If `Z:` won't mount, copy via Explorer: from `Z:\01_Projects\battery-advisor\app` into `\\wsl.localhost\ubuntu\home\naumovic\projects\yourlocalhero`.)

**Notes:**
- **Keep the repo in `~/` (Linux fs)** — never `/mnt/c|z` — for Node speed and reliable HMR.
- **Line endings:** the included `.gitattributes` (`* text=auto eol=lf`) keeps things consistent even though docs originate from Cowork (Windows-side).
- **The `Z:` (OpenClaw) folder is a different machine** — it's only the source you import from; once imported, the **WSL repo is canonical**.

---

## 2. Install prerequisites + Claude Code (inside WSL)

```bash
# Node via NVM (do NOT use sudo npm -g)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
exec $SHELL
nvm install 22 && nvm use 22 && nvm alias default 22
node -v        # v22.x

# git + GitHub CLI (if not present)
sudo apt update && sudo apt install -y git
# gh: https://github.com/cli/cli  (optional but handy)

# Claude Code
npm install -g @anthropic-ai/claude-code
claude --version
```

Then launch Claude Code **from the project directory** and authenticate when prompted:
```bash
cd ~/projects/yourlocalhero
claude
```

---

## 3. First run — confirm the baseline

In the WSL shell (or let Claude Code do it — see Task 1):
```bash
cd ~/projects/yourlocalhero
npm install
npm test            # Vitest — the core engine tests must pass
npm run typecheck   # tsc --noEmit
npm run dev         # http://localhost:5173 — the themed shell should render
```
If `npm test` is green and the dev page shows ranked options, your foundation is sound.

> `CLAUDE.md` is already in the repo root — Claude Code reads it automatically. **Do not** run `/init` to overwrite it; it contains the project guardrails.

---

## 4. Git + GitHub + Render (the auto-deploy loop)

```bash
cd ~/projects/yourlocalhero
git init && git add -A && git commit -m "scaffold: core engine + PWA shell + verify fn"
gh repo create yourlocalhero --private --source=. --push   # or create on github.com and push
```

Connect the repo to **Render** (render.com → New → Static Site → connect the repo):
- Build command: `npm run build`. Publish directory: `dist`. (Optional SPA rewrite: `/*` → `/index.html`.)
- **Push to `main` → auto-deploy to production** — the core of the workflow. Render *preview environments* per PR are a paid add-on (optional); otherwise eyeball locally with `npm run dev` before merge.
- Commercial use is fine on Render; the web-service starter tier is comparable to the old Vercel Pro (~US$20/mo). (When Task 4 adds `api/verify`, this static site becomes a single Node web service — see Task 4.)

---

## 5. Secrets / environment variables

Local dev → `~/projects/yourlocalhero/.env.local` (git-ignored). Production → Render dashboard → Service → Environment. Same names:

| Var | Where | What |
|---|---|---|
| `STRIPE_SECRET_KEY` | server | Stripe secret (test key for dev, live for prod) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | client | Stripe publishable key |
| `UNLOCK_JWT_SECRET` | server | random string to sign the unlock token (`openssl rand -hex 32`) |
| `VITE_POSTHOG_KEY` | client | PostHog project key |

Use **Stripe test mode** until launch, and the **Stripe CLI** (`stripe listen`) for local webhook/verify testing.

---

## 6. Build it — the Claude Code task sequence

Feed these to Claude Code **one at a time**. After each: review the diff, eyeball it locally with `npm run dev` (or the Render deploy once merged), ensure `npm test` + `npm run typecheck` are green, then merge and move on. Every task assumes the `CLAUDE.md` rules (core is the source of truth; UI never recomputes numbers; "do nothing" stays first-class; every core change needs a test).

**Task 1 — Orient (no code changes)**
```
Read CLAUDE.md and the files in docs/ for full context. Do not change code yet.
Run `npm install`, `npm test`, and `npm run typecheck` and report the results. Start the
dev server and confirm src/App.tsx renders the engine output. Then summarise the current
architecture and the exact build order you'll follow from here.
```

**Task 2 — Full free tier (intake + ranked result + scenario table + payback chart)**
```
Replace the placeholder src/App.tsx with the full free-tier experience, driven entirely by
src/core. Build a proper intake form covering every field in the Intake type: postcode
(auto-derives state + rates via ratesFor, with an "Advanced" override for import rate / FiT),
solar status (have/none, which branches the form), billing period (monthly/quarterly),
usage, export, usage pattern, solar size, panels-to-add, EV status + charging window, goals.
Render: the headline recommendation, the ranked option cards, the SCENARIO COMPARISON TABLE
(report.ts `scenarios`), and a PAYBACK CHART (report.ts `cashflow`, cumulative net with a
break-even marker) as an inline SVG or a small chart lib. Use the brand tokens in
tailwind.config.ts; label the free result a "ballpark". All numbers come from core/report —
never recompute in the UI. Add component tests where sensible. Keep tests + typecheck green.
Acceptance: the founder preset (4000, have solar, 200 import / 400 export, day-heavy, EV
buying, daytime charging) shows EV as the winner with the battery at >12yr payback, and
"do nothing" renders as a normal card.
```

**Task 3 — Paid pack + client-side PDF (code-only, no LLM)**
```
Add the paid deliverable, generated entirely in code. Introduce the ballpark-vs-precise
split: the free result stays a ballpark; the paid "plan" uses precise inputs and renders
report.ts `buildPlan()` into a polished plan view — scenarios, payback chart, the rebates/
rates note, and the per-option checklist (CHECKS). Add a CLIENT-SIDE PDF export (jsPDF or
@react-pdf/renderer) and a JSON export. Allow unlimited tweak-and-re-run (no cap). Gate the
plan view behind an `unlocked` boolean (payment wired next task; for now a dev toggle).
Acceptance: with unlocked=true the plan renders and downloads a clean, branded PDF; every
figure traces to core/report; re-running with new inputs regenerates instantly.
```

**Task 4 — Stripe Checkout + the stateless verify (on Render)**
```
Wire real payment, no database. Because Render runs a Node process (not @vercel/node
serverless functions), build a single small Node web service (Express or Hono) that serves
the built dist/ statics AND the API (/api/verify, /api/create-checkout); add a render.yaml.
Add stripe + jsonwebtoken. Create a Stripe Checkout flow for a A$29 one-off in TEST mode
with promotion codes enabled (allow_promotion_codes: true). Unlock click → create a Checkout
Session (or a Stripe Payment Link) → redirect → on return, call /api/verify with session_id →
on {ok:true} store the signed token in memory and set unlocked=true. Document the env vars
(STRIPE_SECRET_KEY, UNLOCK_JWT_SECRET, VITE_STRIPE_PUBLISHABLE_KEY). Add Stripe CLI
instructions for local testing. One service, still stateless, no DB.
Acceptance: a Stripe test-card payment unlocks the plan; a promotion code (e.g. FEEDBACK100)
yields a free unlock; reloading without a valid token re-locks.
```

**Task 5 — Analytics, waitlist, legal**
```
Add PostHog (posthog-js, VITE_POSTHOG_KEY) and fire events: intake_completed,
unlock_clicked, purchased. For users who don't buy, show a waitlist capture (embed a Tally
form or a simple email field posting to a form/email tool) — framed as "we'll tell you when
new features land", on-brand. Add static privacy policy, terms, and refund pages, linked in
the footer. Acceptance: events appear in PostHog; waitlist submit works; legal pages reachable.
```

**Task 6 — PWA + polish + accessibility**
```
Finalise the PWA (vite-plugin-pwa is present): installability, an offline shell for the free
tool, app icons derived from public/logo.svg. Do an accessibility pass (labels, focus rings,
colour contrast against the brand tokens), make the layout fully responsive/mobile-first, and
run Lighthouse. Acceptance: installs as an app; Lighthouse PWA installable and a11y ≥ 90.
```

**Task 7 — Production-ready**
```
Prep for launch: ensure `npm run build` is clean, env vars are documented in README, Stripe
switches to live mode behind an env flag, and do a final copy pass — plain, honest, calm,
never salesy; "do nothing" stays a proud first-class answer. List anything I must do manually
(Render env, domain, Stripe live keys, Stripe promotion codes for feedback users).
```

---

## 7. The working loop (and the guardrails that keep it safe)

1. Paste one task → Claude Code implements it **on a branch** and writes/updates tests.
2. `git`-review the diff; open a PR (`gh pr create`); eyeball the real UI locally with `npm run dev` (or the Render deploy once merged to `main`).
3. Confirm `npm test` + `npm run typecheck` are green (wire these as required GitHub checks).
4. Merge → production. Next task.

**Non-negotiables (in CLAUDE.md, restate if Claude drifts):** the deterministic `core` is the only place numbers are computed; the UI/PDF render its output and must never recompute or fudge a figure; the founder's-case regression test (no battery → EV) must stay green; no LLM and no database in the consumer path.

---

## 8. Go-live checklist
- [ ] `npm run build` clean; tests + typecheck green in CI.
- [ ] Render service live, env vars set (live Stripe + JWT secret + PostHog).
- [ ] Domain: **yourlocalhero.com.au** added as canonical; **yourlocalhero.app** 301-redirects to it (Render → Settings → Custom Domains).
- [ ] Stripe in **live** mode; A$29 product created; **promotion codes** created (e.g. `FEEDBACK`, capped + expiring) for early users.
- [ ] Privacy / terms / refund pages live; PostHog receiving events.
- [ ] Test a real card end-to-end (then refund yourself).

---

## Appendix — troubleshooting
- **Slow / file-watch broken:** the project must live under `~/` (Linux fs), not `/mnt/c` or `/mnt/z`.
- **`npm -g` EACCES:** you used sudo or the system Node — use **NVM** instead (step 2), never `sudo npm install -g`.
- **`Z:` not visible in WSL:** it's a mapped network drive — mount with `sudo mount -t drvfs Z: /mnt/z`, or just copy via Explorer to `\\wsl.localhost\...`.
- **Claude Code auth:** run `claude` from inside WSL (not PowerShell) and follow the login prompt; `claude --version` confirms install.
- **Stripe local testing:** `stripe login` then `stripe listen --forward-to localhost:5173/api/verify` (or your checkout webhook).

*Sources: Claude Code setup docs (code.claude.com/docs/en/setup). This is a build runbook, not legal/financial advice.*
