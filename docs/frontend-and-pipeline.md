# Front-end Design + Claude Code Build Pipeline

> Companion to `claude-code-build-plan.md`. Covers the visual/brand direction and the **recommended workflow for building the app with Claude Code doing the coding**. The scaffold lives in `./app/`.

---

## 1. Design direction (decided 30 Jun 2026)

**Personality: trustworthy & clean.** Advisor-grade, calm, credible — it's reassuring someone about a ~$10k decision. Generous whitespace, restrained colour, clear hierarchy, no gimmicks.

**Theme: light, not dark.** Because the brief is "trustworthy/clean" (not "bold/techy"), the app uses a **light** surface (white cards on a soft off-white) with deep-navy ink — reads more like a financial advisor than a startup tool. (The prototype's dark theme was fine for a demo; the product goes light.)

**Palette — solar warm + deep navy:**

| Token | Value | Use |
|---|---|---|
| `navy-900` | `#14304B` | primary ink / headings / primary buttons |
| `navy-700` | `#27465F` | secondary text on light |
| `amber-500` | `#F2A900` | accent — the "hero" highlight, recommended-option, CTAs |
| `amber-600` | `#D9930A` | accent hover |
| `ink` | `#1A2433` | body text |
| `muted` | `#5B6B7C` | secondary/labels |
| `bg` | `#F7F9FB` | page background |
| `surface` | `#FFFFFF` | cards |
| `border` | `#E6EBF0` | hairlines |
| `good` | `#2E9E6B` | strong payback / positive |
| `warn` | `#E0922F` | marginal payback |
| `danger`| `#D1483B` | poor payback / "no payback" |

**Type:** **Inter** (clean, neutral, highly legible) for UI; system-stack fallback. Tabular numerals for the money/payback figures.

**Feel cues:** rounded-12px cards, soft 1px borders (not heavy shadows), the **recommended option** gets an amber left-accent + subtle amber tint, "do nothing" is a first-class card (never hidden). Charts are simple and labelled. The brand mark is a **sun + shield** motif (energy + protection/"on your side"); wordmark "Your Local Hero".

**Brand voice:** plain, honest, calm. Short sentences. Says the hard thing ("a battery won't pay back for you") without hedging. Never salesy.

---

## 2. Recommended pipeline — Claude Code does the coding

The goal: a tight loop where **Claude Code writes code + tests on a branch, Vercel gives you a live preview URL, you eyeball it, merge.**

**Stack (all Claude-Code-friendly, all TypeScript):**
- **Vite + React + TypeScript** — fast dev server, simple, great PWA support.
- **Tailwind CSS** + **shadcn/ui** — shadcn gives accessible, unstyled-but-polished components you theme with the tokens above; it's the fastest way to a clean, consistent UI without hand-rolling everything.
- **Vitest** — unit tests for the deterministic `core` engine (the part that *must* be correct).
- **jsPDF** (or `@react-pdf/renderer`) — client-side PDF for the paid pack.
- **Stripe Checkout** + **Stripe CLI** (local webhook/verify testing) + **PostHog** (funnel analytics).
- **Vercel** — hosting for the PWA **and** the `api/verify` function.

**Repo + flow:**
1. **GitHub repo** (push `./app`). This is where Claude Code works.
2. **Connect the repo to Vercel** — every branch/PR gets a **preview deployment** (a real URL); `main` auto-deploys to production. This is the magic with Claude Code: you get a clickable preview of every change.
3. **`CLAUDE.md` at the app root** (included in the scaffold) gives Claude Code the project context, conventions, and guardrails — most importantly: *the deterministic `core` is the source of truth; UI/AI never change a number; every `core` change needs a passing test.*
4. **Loop:** describe a feature → Claude Code implements it + tests on a branch → open PR → Vercel preview → you review the diff + click the preview → merge → production. Keep `core` behind Vitest so regressions are caught automatically.
5. **Secrets** (Stripe keys, signing secret) live in **Vercel env vars**, never in the repo. Use Stripe **test mode** until launch.

**Quality gates (wire into CI / pre-merge):**
- `vitest run` green (core math correct — the founder + state-sensitivity cases are in the scaffold).
- `tsc --noEmit` clean (types).
- the **do-nothing regression test** must pass (founder's case must NOT recommend a battery).

**Suggested build order for Claude Code** (after this scaffold):
1. Port/confirm `core` + tests (scaffolded).
2. Intake form + free ballpark result + charts (client-side).
3. Paid pack generation (code-only) + client-side PDF.
4. Stripe Checkout + `api/verify` + unlock-token gate.
5. PostHog events + waitlist fallback + legal pages.
6. PWA manifest/service worker + polish.

---

## 3. Why this pipeline fits *this* product
- The **deterministic core** is the ideal Claude-Code target: pure functions, fully testable, no ambiguity — Claude writes it and tests prove it.
- **Preview deploys** turn "is the UI right?" into a click, which is exactly the feedback Claude Code can't self-assess.
- **No backend to speak of** (one stateless function) means little infra for Claude Code to get wrong, and ~US$20/mo all-in on Vercel Pro.

*This is a plan, not legal/financial advice. Brand mark and exact palette are starting points — adjust to taste.*
