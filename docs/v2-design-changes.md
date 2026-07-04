# v2 Design Changes — Stepped Intake + Gated Payback + Render

**Status:** Draft v2.0 (4 Jul 2026) — iterating in Cowork. When marked READY, hand to Claude Code.
**Applies after:** Tasks 1–2 of `BUILD-WITH-CLAUDE-CODE.md` (core engine + full free tier), now live on Render.
**Guardrails unchanged:** `core` is the only place numbers are computed; UI never recomputes; "do nothing" stays first-class; every core change needs a test; no LLM, no DB.

---

## Change 1 — Stepped intake wizard (replaces the one-page form)

### Why
The current intake feels like a clunky one-page form. Replace it with a welcoming 3-step wizard: two simple questions per step, sensible defaults preselected, result generated immediately after step 3. Detail fields become presets the user can refine *after* seeing the result.

### The flow

**Step 1 — Your place**

| Q | Prompt | Choices | Maps to |
|---|---|---|---|
| 1a | I have solar | Yes / No | `solarStatus: 'have' \| 'none'` |
| 1b | Postcode | text, default `4000` | `postcode` → derives `state`, `network`, rates via `ratesFor` |

**Step 2 — Your usage**

| Q | Prompt | Choices | Maps to |
|---|---|---|---|
| 2a | How much electricity do we use? | Little (solo or couple) / Medium (small family) / Large (big tribe) | usage tier → preset `usageKwh` (see preset table) |
| 2b | My usage habits | Day-heavy (WFH) / Even / Night-heavy / Not sure | `usageProfile: 'day_heavy' \| 'even' \| 'night_heavy' \| 'unknown'` |

**Step 3 — Your future**

| Q | Prompt | Choices | Maps to |
|---|---|---|---|
| 3a | Own an EV? | Not yet / Buying one / Own one | `ev: 'none' \| 'buying' \| 'own'` |
| 3b | My goals | Lower bills / Go electric / Blackout backup (multi-select, default Lower bills) | `goals: ['bill_savings' \| 'go_electric' \| 'backup']` |

On completing step 3 → generate the ballpark result immediately from the preset Intake. No review screen.

### UX requirements
- Progress indicator (1 of 3), Back always available, answers preserved when navigating.
- Every question has a default preselected — the user can smash Next three times and still get a valid result (solar Yes, 4000, Medium, Not sure, Not yet, Lower bills).
- Big tappable option cards, not radio dots. Mobile-first. Keyboard navigable, labelled for a11y.
- Postcode is the only free-text field; validate 4-digit AU postcode, fall back to state-level rates outside QLD as today.
- Copy tone: plain, warm, zero jargon (match choice labels above verbatim).

### Presets → the "Refine your numbers" panel
Everything not asked in the wizard is preset and shown **below the result** in a collapsible "Refine your numbers" panel. Editing any field re-runs the engine instantly. Fields:

`period` (default quarterly), `usageKwh` (grid import), `exportKwh` (solar export), `solarKw` (existing size), `addKw` (panels to add), `charge` (EV charging habits — only when ev ≠ none), rate overrides (`importRateCents`, `fitCents`).

**Preset derivation** lives in one pure, tested function — `presetIntake(wizardAnswers): Intake` in `src/core/presets.ts` — with all constants named and documented. Anchor values (Claude Code may tune ±, but must document constants and cover with a test):

| Tier | kWh/day anchor | No solar: `usageKwh`/qtr | Have solar (6.6 kW default): import / export per qtr |
|---|---|---|---|
| Little | 10 | ~910 | ~500 / ~1,300 |
| Medium | 18 | ~1,640 | ~950 / ~1,000 |
| Large | 28 | ~2,550 | ~1,600 / ~750 |

Profile adjustment: day-heavy shifts import down ~15% and export down; night-heavy the reverse; even/unknown = anchor.
Other presets: `solarKw` = 6.6 when has solar else 0; `addKw` = 0; `charge` = `daytime_home` if day-heavy else `night_home` (when ev ≠ none); rates from `ratesFor(postcode)`.

### Acceptance
- Founder path via wizard (solar Yes, 4000, then refine to 200 import / 400 export, day-heavy, EV buying, daytime charging) still shows EV winner, battery >12 yr payback, "do nothing" as a normal card — regression test stays green.
- Wizard-only path (all defaults) produces a sane ballpark with no NaN/Infinity rendered.
- Editing any refine field re-runs and updates all figures from `core/report` only.
- Tests + typecheck green.

---

## Change 2 — Payback timeline behind the Unlock

### Why
The payback timeline currently renders on first generation. It's the flagship paid visual — free users should see *that it exists*, not its contents.

### Spec (blurred teaser)
- Free tier: scenario comparison table and ranked cards stay free. The payback chart area renders a **blurred placeholder chart with an Unlock overlay** (button + one line, e.g. "Unlock your full payback timeline — see the exact break-even year").
- **No data leakage:** when locked, the chart must be drawn from hard-coded dummy data — the real `cashflow` series must not exist in the DOM/JS state where devtools could un-blur it. Compute real cashflow only when `unlocked === true`.
- Unlock uses the existing `unlocked` boolean (dev toggle now; Stripe in Task 4).
- Unlocked: full chart with break-even marker, exactly as built in Task 2.

### Acceptance
- Locked: blur + overlay visible, no real cashflow values in DOM or React state.
- Dev-toggle unlock: real chart renders instantly, all numbers from `core/report`.

---

## Change 3 — Vercel → Render (deployment reality check)

The app is live on **Render.com**, auto-deploying from GitHub on push to `main`. All Vercel references in `BUILD-WITH-CLAUDE-CODE.md`, `frontend-and-pipeline.md`, and `CLAUDE.md` are superseded:

- **Hosting:** Render, connected to the GitHub repo. Push to `main` → auto-deploy. (Render *preview environments* per PR are available on paid plans — optional; otherwise eyeball locally with `npm run dev` before merge.)
- **`api/verify` (Task 4, when we get there):** `@vercel/node` functions don't run on Render. Convert to a single small **Node web service** (Express or Hono) that serves the built `dist/` statics *and* `/api/verify` (and later `/api/create-checkout`). Add a `render.yaml`. One service, still stateless, no DB.
- **Env vars:** set in Render dashboard (Service → Environment), same names as before: `STRIPE_SECRET_KEY`, `UNLOCK_JWT_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_POSTHOG_KEY`.
- **Cost note:** replaces the "Vercel Pro ~US$20/mo" line; Render web service starter tier is comparable and commercial use is fine.

---

## Claude Code task prompts (feed one at a time)

**Task V2-A — Stepped intake wizard**
```
Read docs/v2-design-changes.md, Change 1. Replace the one-page intake with the 3-step wizard
exactly as specified (steps, labels, defaults, mapping to the Intake type). Add
src/core/presets.ts with a pure presetIntake(wizardAnswers): Intake function implementing the
preset table, with named constants and unit tests. After step 3, generate the ballpark result
immediately and render a collapsible "Refine your numbers" panel below the result containing:
billing period, grid import, solar export, solar size, panels to add, EV charging habits
(only when ev !== 'none'), and rate overrides. Any edit re-runs the engine instantly. All
numbers from core/report — never recompute in the UI. Keep the founder regression test green;
add wizard component tests. Tests + typecheck green.
```

**Task V2-B — Gate the payback timeline**
```
Read docs/v2-design-changes.md, Change 2. The payback chart must no longer render for free
users. When unlocked === false, render a blurred placeholder chart from hard-coded dummy data
with an overlaid Unlock button — ensure the real cashflow series is not computed or present
in DOM/state while locked. When unlocked === true, render the real chart as before. Scenario
table and ranked cards remain free. Add a test asserting locked state contains no real
cashflow values. Tests + typecheck green.
```

**Task V2-C — Render pipeline doc + config alignment**
```
Read docs/v2-design-changes.md, Change 3. Update CLAUDE.md and docs to replace Vercel with
Render (auto-deploy from main). Do not build the payment API yet, but note in the README that
api/verify will become a Node web service (Express/Hono) serving dist/ + /api on Render, with
a render.yaml, when Task 4 lands. Verify npm run build output matches the current Render
static-site config; document Render env var setup. No behaviour changes; tests green.
```

---

## Open questions / iteration log

- [ ] Confirm preset anchor numbers against real QLD bills before launch copy says "typical".
- [ ] 3b multi-select vs single — spec'd multi (engine accepts Goal[]); flip to single if it clutters step 3.
- [ ] Unlock overlay copy — draft above is placeholder; write final line during Task V2-B review.

| Ver | Date | Change |
|---|---|---|
| 2.0 | 2026-07-04 | Initial draft: wizard, gated payback, Render migration |

