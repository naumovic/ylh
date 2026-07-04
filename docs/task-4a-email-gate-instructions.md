# Task 4A — Email-Gate Unlock (replaces Stripe for now)

**For Claude Code. Read this first — it supersedes parts of the older docs in `docs/`.**
**Date:** 5 Jul 2026 · **Source of decisions:** `Pivot-3.md` §6 (iteration 2)

---

## 0. Orientation — what's true in this repo right now

You (Claude Code) have already built, and it is live on **Render**:

- Tasks 1–3 of `BUILD-WITH-CLAUDE-CODE.md`: core engine, full free tier, gated plan view with client-side PDF + JSON export, `unlocked` boolean behind a dev toggle.
- All of `v2-design-changes.md`: 3-step wizard, "Refine your numbers" panel, payback chart as blurred teaser behind the Unlock button (dummy data while locked).

**Doc corrections — apply these readings to the older docs:**

| Older doc | What still applies | What is superseded |
|---|---|---|
| `BUILD-WITH-CLAUDE-CODE.md` | Tasks 1–3 (done), guardrails, Task 6–7 (later) | **Task 4 (Stripe) — deferred, replaced by this doc.** Task 5 — partially pulled forward here (PostHog, waitlist, privacy). All **Vercel** references — dead; hosting is **Render**, auto-deploy from `main`. |
| `v2-design-changes.md` | Everything (implemented) | Nothing |
| `CLAUDE.md` guardrails | **All unchanged:** `core` computes all numbers; UI never recomputes; "do nothing" first-class; founder regression test stays green; no LLM; core changes need tests | Deploy target line (Vercel → Render) |

**Why 4A exists (one line):** before wiring real payments we validate willingness-to-pay with an email-gate — the user "pays" with first name + last name + email, gets the full product, and tells us (survey + founder-reservation click) whether A$29 would fly. No Stripe. No OAuth. No database.

---

## 1. Architecture (small, deliberate)

```
Browser (existing PWA)
  │  POST /api/unlock  { firstName, lastName, email, consent, pdfBase64? }
  ▼
Node service on Render (NEW — replaces static-site hosting)
  ├─ serves dist/ (built PWA)
  ├─ validates input → creates contact in Resend Audience
  ├─ sends "your plan" email via Resend (PDF attached if provided)
  └─ returns { ok: true }
PostHog (client-side) — all funnel events
```

- **One small Node web service** (Express or Hono, your call) serving `dist/` statics **and** `/api/unlock`. Add `render.yaml`. This same service will host `api/verify` when Stripe (4B) lands — don't build any Stripe code now.
- **No database.** Resend Audiences is the contact store (free tier: 1,000 contacts, 3,000 emails/mo, 100/day). PostHog `identify(email)` carries the analytics identity.
- **No OAuth.** Two/three-field form only.
- **Env vars (Render dashboard + `.env.local`):** `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `VITE_POSTHOG_KEY`. Document them in README.

---

## 2. The unlock flow (user-facing spec)

1. **Locked state (exists today):** blurred payback teaser + Unlock button. Change the button/overlay copy to a free-unlock framing, e.g. *"Unlock your full plan — free while we're in early access. Just tell us where to send it."*
2. **Unlock click → modal/inline form:** First name · Last name · Email · a consent checkbox (*"Email me my plan and occasional updates. Privacy policy."* — link required, checked = required). Submit → `POST /api/unlock`.
3. **On `{ok:true}`:**
   - `unlocked = true`; **persist in `localStorage`** so a reload does NOT re-lock (supersedes the v2/Task-3 "reload re-locks" behaviour — there's no revenue to protect yet, and losing access feels broken).
   - Full plan renders (real payback chart, scenarios, checklist) — exactly the Task-3 view.
   - PDF: user can download as today, **and** the service emails it — generate the PDF client-side as now, send it in the unlock POST as base64 (attach in the Resend send; skip attachment gracefully if >5 MB and send a "come back anytime" email instead).
4. **Post-unlock panel — "What's coming" + the two questions.** Below the plan, a calm on-brand panel:
   - Upcoming features list (short): personalised written explanation of your situation · adjust your usage over time + when-to-charge strategy · saved scenarios with an account · plan delivered by email.
   - **Q1 — price-anchored survey (single choice, required-optional, dismissible):** *"Would you pay for this once those land?"* → `Yes, A$29 is fair` / `Yes, but closer to A$10` / `I'd use it free only` / `No` + optional free-text *"What would make it worth paying for?"*
   - **Q2 — founder reservation (one click, no payment):** *"Lock in founder pricing — A$29 becomes A$9 for you at launch. Reserve my spot."* → records event + tags the Resend contact (`founder_reserved: true`). Confirmation copy only; no card, no charge.
5. **Non-clickers — waitlist:** if the user never clicks Unlock, show the existing-plan waitlist capture (email only, same `/api/unlock` endpoint with a `source: 'waitlist'` flag, no PDF) framed as *"we'll tell you when new features land."*

Copy tone throughout: plain, honest, calm, never salesy — "do nothing" remains a proud first-class answer.

---

## 3. `/api/unlock` endpoint spec

- Validate: email format, names non-empty (waitlist: email only), consent true. Reject oversized bodies (>7 MB).
- Resend: upsert contact into `RESEND_AUDIENCE_ID` with `firstName`, `lastName`, and properties `source` (`unlock` | `waitlist`), `founder_reserved` (set via a second lightweight call or a `PATCH`-style follow-up when Q2 is clicked — a separate `POST /api/reserve` with the email is fine).
- Send email (unlock source only): branded, short, PDF attached when provided. From a project subdomain sender (document DNS steps in README).
- Return `{ ok: true }`; on Resend failure return `{ ok: true, emailQueued: false }` and **still unlock** (never block the user on a third-party hiccup) — log the failure.
- Basic abuse guard: simple in-memory rate limit per IP (e.g. 5/min). No captcha for now.
- **No secrets in client code.** The Resend key lives only in the service.

## 4. PostHog events (client-side)

`results_viewed` · `unlock_clicked` · `email_provided` (fire `posthog.identify(email)` here) · `pdf_downloaded` · `plan_emailed` · `survey_answered` (property: price bucket + free-text) · `founder_reserved` · `waitlist_joined`. Keep names exactly as listed — the go/no-go gate in `Pivot-3.md` §6 reads these.

## 5. Privacy (ships WITH 4A, not after)

Static pages: **privacy policy** (name the processors: Resend, PostHog; what we store, why, how to be deleted — deletion = email us for now) and **terms**; linked in the footer and from the consent checkbox. Refund page is NOT needed yet (nothing is sold). Plain-English, short.

---

## 6. Build order — feed one task at a time

**Task 4A-1 — Node service + Render**
```
Read docs/task-4a-email-gate-instructions.md (§0–§1, §3). Convert hosting from static site to a
single small Node web service (Express or Hono) that serves dist/ and implements POST /api/unlock
and POST /api/reserve per §3, with Resend integration behind RESEND_API_KEY / RESEND_AUDIENCE_ID.
Add render.yaml and README notes (env vars, Resend DNS/sender setup, local dev with .env.local).
Unit-test the validation and the Resend client wrapper (mock Resend). No Stripe code. No UI changes
yet. Tests + typecheck green.
```

**Task 4A-2 — Unlock UX, survey, waitlist, analytics**
```
Read docs/task-4a-email-gate-instructions.md (§2, §4). Replace the dev-toggle unlock with the
email-gate flow exactly as specified: form + consent, localStorage persistence of unlocked, client
PDF passed as base64 to /api/unlock, post-unlock "what's coming" panel with the price-anchored
survey and the founder-reservation click, and the waitlist capture for non-unlockers. Wire all
eight PostHog events with the exact names in §4. The blurred-teaser locked state and all engine/
report rendering are unchanged — no numbers recomputed in the UI. Component tests for the form
validation and locked/unlocked states; founder regression test stays green.
```

**Task 4A-3 — Privacy pages + doc alignment**
```
Read docs/task-4a-email-gate-instructions.md (§5, §0). Add the privacy and terms static pages,
footer links, and the consent-checkbox link. Update README and CLAUDE.md: hosting is Render
(auto-deploy from main), Task 4 (Stripe) is deferred pending the 4A go/no-go gate, env var table
current. Do not modify docs/BUILD-WITH-CLAUDE-CODE.md or docs/v2-design-changes.md (historical).
Tests green; npm run build clean.
```

---

## 7. Acceptance (whole of 4A)

- Fresh visitor: wizard → ballpark → blurred teaser → Unlock → form → full plan renders; reload keeps it unlocked; plan PDF arrives by email with attachment.
- Waitlist path works without unlocking; contact appears in Resend with `source: waitlist`.
- Survey + reservation each fire their events and tag the contact; all eight PostHog events visible in a test session.
- Resend outage does not block unlocking.
- No real cashflow data in DOM while locked (v2 rule still holds); founder regression test green; typecheck + tests green; deployed on Render starter (service must not spin down).

## 8. Founder to-dos (manual, not Claude Code)

- [ ] Resend account: create audience, verify sending domain (DNS), generate API key; set env vars in Render.
- [ ] Render: switch service to starter tier (~US$7/mo) so it never spins down.
- [ ] Write the go/no-go numbers from `Pivot-3.md` §6 into that doc as final, before launch.
- [ ] After ~300 free results: read the funnel, apply the gate, decide 4B (Stripe) vs slow-asset path.

