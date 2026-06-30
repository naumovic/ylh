---
tags:
  - project:battery-advisor
ewok: 2026-06-29
---

# Venture 2 — Solar · EV · Battery Advisor — National Tool, QLD-First Service


> **Purpose of this file:** Complete, self-contained project knowledge to load into a Cowork project. Captures the (pivoted) thesis, the core product, the scorecard against our four decision factors, the market/incentive facts as at mid-2026, the AI-vs-human operating model, an explicit **AI-templatable vs human** map (built for scale from day one), competitors, revenue, a phased plan, risks, and open decisions. Written to be read cold.
>
> **Status:** Pre-launch hypothesis, pre-build. Validating demand and the revenue model first.
>
> **Direction locked (29 Jun 2026):** **National, AI-led, low-cost.** Free recommender (ranked answer) Australia-wide → **low one-off unlock (~A$19–39)** for a full **AI-generated personalised plan**. The product is fully scalable AI; a **human expert review is an *optional* premium add-on** (e.g. +A$99), not the core cost base — so we're not bound to building a regional human service to launch. Moat = **consumer-aligned independence** (consumer-paid, so we can say "do nothing") **+ an always-current, Australia-specific knowledge base** (per-state tariffs/rebates, products, fair pricing) that a generic LLM can't match — *not* installer vetting (incumbents already vet nationally; see §10).
>
> *Revised 29 Jun 2026 (same day): dropped human-validation-as-core — it doesn't scale at the per-deal cost. Human is now an optional upsell; the scalable AI report is the product.*
>
> **This supersedes** `solar-battery-advisor-seed.md` and `phase0-quote-analyzer-calculator-plan.md`. The quote analyzer is **removed** (too complex to ingest reliably; not the moat). See the companion build doc [[claude-code-build-plan.md]].

---

## 0. What changed in this pivot (and why)

The original concept was a *battery upgrade advisor* whose sharpest tool was a *quote analyzer*. Real-world testing (the founder's own household) broke two assumptions:

1. **A battery often isn't the right answer.** Founder's case: ~200 kWh/month imported from grid, ~400 kWh/month exported as solar. With QLD feed-in tariffs now tiny, that export is nearly worthless — but adding a battery still didn't pencil out, because there isn't enough *evening* grid usage for the battery to offset. The honest recommendation was **do nothing** (to a battery). No incumbent will ever tell you that.
2. **The real question is broader than "which battery?"** It's **"given my solar, my bills, my usage pattern, and whether I'm about to buy an EV, what should I actually do?"** The right answer might be: a battery, *more solar panels*, an *EV charging setup that soaks up daytime solar*, or *nothing yet*.

So the venture pivots:

- **Scope broadens** from battery-only to **Solar + EV + Battery** as one decision.
- **Quote analyzer is removed.** It was the deepest-to-build piece and the least defensible (it's the most LLM-able, and ingesting arbitrary quote PDFs reliably is a slog).
- **The core product becomes a needs/solution recommender** — a guided "what do I actually need?" engine.
- **The tool goes national, the service stays regional (29 Jun 2026 update).** Two national referral incumbents already do simple calculators Australia-wide (see §10), so geography is not a moat and the engine is cheap to run nationally (per-state config keyed off postcode). The **free recommender is Australia-wide**; the **paid human + vetted-installer service starts in QLD** and expands region by region.
- **The moat is consumer-aligned honesty, not installer vetting (29 Jun 2026 update).** Incumbents vet installers hard *and nationally* — that's table stakes, not a differentiator. What they **structurally cannot do** is tell you "don't buy anything," because they're paid per installer referral. A **consumer-paid / freemium** model lets us give the honest, cross-domain answer (including "do nothing"). That independence is the durable wedge.
- **The value is the *logistics of working out the solution*** — the cross-domain reasoning across solar/EV/battery economics — done by an AI engine the business runs, with a human validating, connecting the dots, quality-checking, and talking to people.
- **Installer vetting stays** — but as a *service feature*, not the moat.

---

## 1. One-line positioning

**An independent AI advisor that works out what a solar household actually needs next — battery, more panels, EV charging, or nothing — and, because you pay us (not installers), is free to tell you the truth, even when the truth is "don't buy anything."** Free ranked answer for everyone; a small one-off unlock for the full personalised plan. Optional human expert review if you want a person to sanity-check it. No referral kickbacks dictating the answer.

**Tagline options (placeholders):** "Find out what you actually need — even if the answer is nothing." / "The only solar advice that gets paid the same whether you buy or not."

**Brand / assets.** Founder holds **`yourlocalhero.com.au`** and **`yourlocalhero.app`**. **Decision (30 Jun 2026): `yourlocalhero.com.au` is the single canonical domain** — everything (marketing, the tool, the paywall) lives there; **`.app` is kept and 301-redirected to `.com.au`** to protect the brand without splitting SEO authority. Rationale: trust is the moat, and in Australia `.com.au` *is* a trust signal (requires an ABN → reads as a legitimate local business), wins local SEO, and is more familiar to everyday-homeowner buyers. Since the product is now a single code-only PWA, splitting marketing vs tool across two domains would fragment link equity and confuse users — consolidate. *(Practical: `.com.au` needs a valid ABN; a free sole-trader ABN also serves Stripe payouts and credibility.)* The name still fits the AI-led model — the *hero* is the on-your-side advice itself (plus the optional human reviewer); "local" reads as *location-specific* (postcode/state-accurate) rather than promising a person in every town.

---

## 2. The thesis

A once-in-a-decade electrification wave is hitting Australian homes with a trust vacuum on top of it, and three decisions (solar, EV, battery) that most people face *together* but get advised on *separately* by parties who each sell only one of them — and who only get paid if you buy.

- **The honest answer is structurally unprofitable for the incumbents.** SolarQuotes and SolarCalculator are paid **per installer referral** (~$55–60 + GST), earning $0 when the right answer is "don't buy anything." That conflict is baked into their revenue, not a fixable UX flaw — so "tell people the truth, including do-nothing" is a position only a **consumer-paid** advisor can hold. That is the wedge, and it travels nationally. (See §10.)
- **Solar export is now nearly worthless**, which flips the whole calculation. QLD SEQ (Energex) feed-in tariffs are market-driven and small (~3–10c/kWh); regional QLD (Ergon) drops to **6.006 c/kWh from 1 July 2026**; other states are similar (VIC ~4c, SA ~4c, WA ~3c). When exporting pays almost nothing, the value is in **self-consuming your own solar** — which is exactly the question a battery *or* an EV *or* more daytime load answers. Nobody is advising households across all three.
- **The battery retrofit wave is real but over-sold.** ~3.7M Australian homes have solar without a battery, and the federal rebate triggered mass uptake — but the rebate tapers hard above 14 kWh and a battery only pays off with the right *evening* usage profile. Plenty of households are being sold batteries that won't pay back.
- **EVs change the maths but the purchase incentives are mostly gone.** QLD's $3,000 (closed Dec 2023) and $6,000 ZEV (closed 2 Sep 2024) purchase rebates have ended; what remains is a $200/yr rego discount, concessional stamp duty, and the federal **FBT exemption on novated leases**. So the EV decision is now about **charging economics** — and a work-from-home owner charging on daytime solar can use that near-worthless exported solar to fuel the car instead of buying grid power, which is often a *better* return than a battery.
- **The trust is broken and the advice is conflicted.** The Clean Energy Regulator warns about deceptive retailer behaviour; doorknockers and fake-urgency ads abound; cheap installers collapse and leave systems unsupported. The national comparison sites (SolarQuotes, SolarCalculator, Solar Choice, Energy Matters) are referral middlemen monetised by sending you to installers — and none reason across solar+EV+battery as one decision.

The wedge: **be the calm, independent brain — paid by the homeowner, not the installer — that works out the whole picture across solar, EV and battery and tells you the truth, including "don't buy anything yet."**

---

## 3. The core product — the Needs/Solution Recommender

A guided intake → AI crunch → plain-English recommendation, validated by a human.

**Intake (what we collect — kept deliberately short):**
**postcode** (derives state + network, and auto-sets typical import rate, feed-in tariff and a generation factor so the homeowner doesn't have to know them — an "advanced" override exists), **solar status (have / none)** which branches the question, grid import and solar export (kWh/month — read off the bill; if no solar, just total usage), existing solar size, usage pattern (day-heavy / night-heavy / WFH), goals (lower bills / backup / go electric), and **EV status (own / about to buy / no plans)** plus charging window (daytime-home vs night/away). Deriving the rates from postcode is what makes the form *simpler than the incumbents'* **and** national from one mechanism.

**The crunch (what the engine reasons about):**
- **Self-consumption gap.** How much solar is currently exported for near-nothing, and how much of it *could* be captured — by a battery (shift to evening), by an EV charging in the daytime, or by more daytime load.
- **Battery case.** Right-sized recommendation against the rebate taper (don't push past the 14 kWh 100% band without reason), realistic payback range — and a willingness to say *"a battery won't pay back for you."*
- **EV-charging case.** If an EV is in play and charging can happen on daytime solar, model the value of charging from daytime solar **instead of the grid** (each solar kWh into the car saves the import−feed-in spread, rather than exporting for near-nothing) — often the highest-return move for a WFH household.
- **More-solar / install-solar case.** When the constraint is *generation* — a small/old array, or **no solar at all** — recommend expanding (or installing) panels before a battery. For a **no-solar household** this becomes the headline: size a system to cover daytime load (plus an EV if it charges in the daytime), then sequence battery/EV behind it as "next, once solar is in." This opens the funnel to the large no-solar market the incumbents serve.
- **Do-nothing case.** Explicitly supported and surfaced when nothing pays back yet. This is the trust-builder.

**Output (two tiers):**
- **Free — the ranked answer.** "Here's your best next move, here's why, rough numbers, what to ignore." Genuinely useful alone; deterministic (no LLM needed), so free-tier volume is ~free to serve. This is what goes national and earns trust/SEO.
- **Paid unlock (~A$19–39) — the personalised plan.** An **AI-generated** write-up for *their* numbers: right-sizing, the exact rebates/tariffs that apply to their postcode (from the knowledge base), what to ask installers, and what to watch for. **Optional add-on: a human expert review (~A$99)** for those who want a person to pressure-test it and point them to a vetted installer.

**Why this is the moat (not the calculator itself):** **consumer-aligned independence** (paid by the homeowner, so "do nothing" is a sayable answer) + a **proprietary, always-current, Australia-specific knowledge base** (per-state tariffs/rebates, CEC product data, fair-price benchmarks) that makes the AI answer better than free ChatGPT and more current than a static calculator + the cross-domain *logic* across solar/EV/battery. The raw maths is LLM-able and incumbents vet installers nationally — so the defensible part is the *honest, conflict-free, current, whole-picture recommendation*, which their referral revenue forbids and a generic chatbot can't keep current.

---

## 4. Scorecard against our four decision factors

| Factor | Verdict | Why |
|---|:--:|---|
| **1. AI does the whole job; human is optional** | **Strong** | AI does intake reasoning, self-consumption modelling, sizing, rebate calc, EV-charging economics, payback **and** the personalised written plan. No human in the core path — that's what makes it scale nationally at low cost. A human expert review exists only as an *optional premium*. |
| **2. Larger transactions** | **Strong** | Battery ~A$8–15k; solar install/expansion ~A$3–10k; EV charger ~A$1.5–3k. The fee (~A$19–39) is trivial against a five-figure decision — easy to justify, easy to impulse-buy. |
| **3. Takes the pain out of menial work** | **Strong** | Decoding tariffs/feed-in, working out self-consumption, right-sizing against the taper, comparing options across three domains — exactly what the engine removes. |
| **4. Not easily LLM-able by the consumer** | **Moderate — and now the central risk** | Without the human, "an honest cross-domain calculator + write-up" is more copyable, and ChatGPT is free. The defensible answer: (a) **consumer-aligned independence** — paid by the homeowner, so we can say "do nothing," which conflicted free tools can't; (b) **a proprietary, always-current AU knowledge base** (per-state/retailer tariffs, live rebate step-downs, CEC products, fair-price benchmarks) that a generic LLM gets wrong and that's costly to maintain — *this is the new core moat*; (c) **brand/UX/SEO**. The bet rides on people paying for *unconflicted + current + whole-picture* — Phase 0 must prove it. |

Three strong, one moderate (now the make-or-break factor). The governing design constraint, sharpened: **the moat is consumer-aligned independence + the live knowledge base — not the human (dropped from core), not the raw maths, not vetting (incumbents own it).**

---

## 5. Market & incentive facts (build to these — mid-2026)

> Accuracy matters for the engine and the advice. These step down / change over time — keep them in **per-state versioned config keyed off postcode**, not hard-coded. The **federal battery rebate is national**; **feed-in tariffs, import rates and EV concessions are per-state** (QLD detailed below; other states seeded with defaults in `incentives.yaml`, refined as the service expands). Sources at the end.

**Federal — Cheaper Home Batteries Program (SRES) — national:**
- ~**30% off** upfront, delivered as a **point-of-sale STC discount** (installer claims STCs; consumer doesn't apply). Not means-tested.
- Value mid-2026: ~**A$252 per usable kWh** (≈ 6.8 STCs/kWh × ~A$37/STC after costs) → ~A$2,500 on a 10 kWh battery.
- **Taper by size (from 1 May 2026):** 100% of STC factor on the first **14 kWh**, **60%** for 14–28 kWh, **15%** for 28–50 kWh; only the first **50 kWh** eligible. → *Right-sizing matters; bigger isn't better.*
- **Step-down:** STC factor decreases roughly every 6 months toward ~2.1/kWh by 2030 (legislated to only decrease — a genuine, honest "sooner is worth more" signal).
- **Eligibility:** battery must be installed with **new or existing solar PV** (battery-only NOT eligible — perfect for the retrofit niche); CEC-approved product; SAA-accredited installer; AS/NZS 5139:2019; VPP-capable (participation optional); **one rebate per premises/NMI**; no means test.

**Feed-in tariffs (per-state — the pivot's key driver):**
- **QLD SEQ (Energex):** no mandatory minimum; market-driven, typically **~3–10 c/kWh**. **Regional QLD (Ergon):** QCA-set minimum, **6.006 c/kWh from 1 July 2026** (down from 8.66c).
- **Other states (rough mid-2026 defaults in config):** NSW ~5c, VIC ~4c, SA ~4c, WA (DEBS) ~3c, TAS ~9c, ACT ~6c. Import rates vary too (SA highest ~44c, ACT lowest ~25c), and the **import−FiT spread is what drives every recommendation** — so a battery that fails in QLD can pay back in SA. The tool must be rate-aware per postcode.
- *Implication:* exported solar is worth very little everywhere → the value is in **self-consumption** (battery, EV daytime charging, or more daytime load). This is why the recommender exists.

**QLD EV incentives (mostly ended — EV value is now about charging, not purchase):**
- Purchase rebates **closed** ($3,000 Dec 2023; $6,000 ZEV 2 Sep 2024).
- Still available: **$200/yr rego discount** for ZEVs; **concessional stamp duty** (2% up to A$100k); federal **FBT exemption on novated leases** (the big one for eligible employees).
- *Implication:* model the EV decision on charging economics — daytime solar charging for WFH owners can beat a battery on return.

---

## 6. Operating model — AI-led, human optional (built for scale)

**Free — AI engine (the funnel):**
intake → self-consumption analysis → battery / EV-charging / more-or-new-solar / do-nothing → ranked recommendation + rough numbers. Deterministic, instant, ~free to serve, national.

**Paid unlock — AI personalised plan (the core revenue):**
the engine's ranked result + the **knowledge base** → an AI-written plan for the household's exact numbers: sizing, the rebates/tariffs that apply to their postcode, what to ask installers, what to watch for. One-off ~A$19–39. Scales with zero human marginal cost beyond the (tiny) LLM token cost.

**Optional premium — human expert review (~A$99):**
a person pressure-tests the AI plan, answers the homeowner's specific worries, and points them to a vetted installer. *Optional, not core* — an upsell for the anxious/high-value buyer and a path into a vetted-installer relationship, but the business doesn't depend on it to operate or scale.

**Transparency principle (the whole moat):** state plainly how we're paid — by the homeowner, never per installer referral. The moment we're seen steering to the highest-commission installer, we become the conflicted lead-gen we're replacing. Independence *is* the differentiator.

---

## 7. AI-templatable vs human — architect the split from day one

> Requirement: scale as a real, mostly-automated business, be honest about AI, and design **early** for which parts run by AI on a cadence vs which (now *optional*) need a person. With the 29 Jun pivot, **the consumer path is fully AI**; humans appear only in optional premium and back-office.

| Function | Runs on | Cadence | Human role |
|---|---|---|---|
| **Intake** (structured numbers via typed tool/form) | Validation tool, no LLM | Per case, instant | None (homeowner enters numbers) |
| **Self-consumption + sizing + payback crunch** | Deterministic engine | Per case, instant | None |
| **EV-charging / solar-install economics** | Deterministic engine | Per case, instant | None |
| **Free ranked answer** | Templated/deterministic | Per case, instant | None — keeps free tier token-free |
| **Paid personalised plan** | **LLM** + knowledge base | Per **paid** unlock | None (auto-generated) |
| **Knowledge-base freshness** (per-state tariffs, STC step-downs, products, fair price) | AI watches sources, drafts updates | Scheduled | **Approve before live** — this is the moat, so accuracy is owned |
| **Installer vetting (for the optional premium / directory)** | AI gathers, flags | Scheduled | Verify the vetted list |
| **Optional human expert review** | Human | Per paid add-on only | The person — but only when the buyer pays for it |
| **Edge cases flagged low-confidence** | — | As raised | Optional human follow-up |

**Design rules this implies:**
1. **Deterministic core, LLM only for the paid plan.** Intake + maths are pure/testable; the free answer renders with no LLM; the LLM writes only the *paid* personalised plan (using engine output + knowledge base). Token cost therefore scales with paying customers, not free traffic.
2. **The knowledge base is the asset.** Per-state/retailer tariffs, live rebate mechanics, CEC product data, fair-price benchmarks — versioned, AI-proposed, human-approved. It's what makes the paid plan better than free ChatGPT and is the thing worth investing in.
3. **Config over code for anything that changes** — so a rebate step-down or FiT change is a reviewed data edit, not a rebuild.
4. **Everything logged.** Each case (intake → crunch → plan → outcome) persists — dataset to tune the engine/prompts, the seed of a CRM, and evidence for the willingness-to-pay question.
5. **Human is an upsell, not the cost base.** "AI did the analysis; pay extra if you want a person to check it." Optional, high-margin, and it keeps the brand's human angle alive without bounding scale.

---

## 8. Revenue model

**Decision (30 Jun 2026, revised): consumer-aligned, low one-off unlock, code-generated deliverable.** Paid by the homeowner, never per referral — the only structure under which "do nothing" is sayable. The free answer is the hook; a **small one-off real payment** unlocks the personalised plan; a human review is an **optional** add-on.

**The ladder:**
1. **Free — ranked answer.** National, instant, deterministic. The funnel + SEO engine.
2. **Paid unlock — personalised plan, ~A$19–39 one-off** *(core revenue)*. **Generated deterministically in code** (engine + knowledge base; *no LLM*), so it's instant, reproducible, and near-zero marginal cost. **The gate is precision + a real deliverable:** free is a *ballpark* on typical postcode rates; paid uses the household's *exact* tariff/usage and returns an **action pack** — **scenario comparison** (buy now vs wait, size A vs B), a **payback chart**, the **rebates/rates for their postcode**, a **downloadable PDF**, and **unlimited tweak-and-re-run** (deterministic generation has no per-run cost — better product, and the old token-guard cap is gone). This is what makes A$29 feel like a custom plan, not "a few AI paragraphs." *(An LLM prose-polish pass is an optional later upgrade if templated wording ever feels generic.)*
   - **Real, payable from day one (not a fake-door):** **Stripe Checkout** takes the payment and a **tiny stateless serverless function verifies it** before unlocking — so we learn whether people actually *pay*, not just click. No DB needed (Stripe is the source of truth).
   - **Discount codes for feedback:** native **Stripe promotion codes** (capped, expiring) shared manually to onboard early users cheaply in exchange for feedback — zero build.
3. **Optional — human expert review, ~A$99 add-on.** For buyers who want a person to pressure-test it and point them to a vetted installer. High-margin, low-volume; not required for the business to run.

**Explicitly avoided:** the **$55–60 per-referral installer fee** the incumbents use — it reintroduces the exact conflict that is our wedge. (Any installer money, if ever taken, must be **flat + disclosed + non-biasing**, never the core.)

**Who pays — and why.** A homeowner at a **$5–20k decision**, marketed at from all sides, trusting none of it. The fear that justifies even a small fee is **"am I about to waste $10k or get ripped off."** At ~A$19–39 it's a near-impulse purchase — the price of a couple of coffees to de-risk a five-figure decision with an answer that has no incentive to upsell. Cheap enough to buy on the spot, which suits a once-in-a-while decision.

**Conversion moment:** the free answer ends with "Here's your best move and the rough numbers — unlock the full plan for *your* situation (sizing, your exact rebates/tariffs, what to ask installers) for **A$29**." Highest intent is right after they see a recommendation they believe.

**Economics note (vs incumbents):** their ~A$55 referral needs a routed-to-installer customer; our A$19–39 needs only a *believer*, at near-zero marginal cost and **national** reach with no regional build-out. Lower price per unit, but vastly larger addressable base and ~100% gross margin. The whole model lives or dies on **conversion rate × willingness-to-pay** — the single thing Phase 0 must measure.

**Validate before building (fake-door + waitlist).** First test is a static tool with the unlock button pointing at a **waitlist email-capture** ("we'll tell you when personalised plans are ready") — no backend, no DB, ≈A$0/mo (see `phase1-running-costs.md`). It measures willingness-to-pay (click → email left), **respects users** (a spot in line, not a dead end — on-brand), and builds a **warm launch list**. Only build the real paid pipeline once that signal is there.

---

## 9. Phased plan

**Phase 0 — Validate (Weeks 1–4).**
Build the recommender as a Claude App / AI-powered artifact (see build doc; the prototype already runs national, postcode-derived). Put up a one-pager: "Solar household? Find out what you actually need next — battery, EV charging, more panels, or nothing." Get it in front of 30 real solar owners (founder's network, FB groups), QLD-weighted. Test: do they value an independent cross-domain answer enough to (a) use it and (b) **pay** / take the call? **Go/no-go:** enough genuine "yes, I'd pay."

**Phase 1 — Ship the paid AI plan + payment (Months 2–3).**
Wire the **paid unlock** (Stripe) and the **AI personalised-plan generator** (engine output + knowledge base → written plan). Seed the knowledge base for all states well enough to be trustworthy (QLD deepest). Launch **nationally** — no regional build-out needed, because there's no human in the core path. Measure the only number that matters: **free→paid conversion**.

**Phase 2 — Build the web app + knowledge base ops (Months 3–6).**
Turn the prototype into a hosted web app (local build → deploy; see build doc). Stand up the scheduled **knowledge-base freshness** jobs and a light CRM. Invest in **content/SEO** ("do I need a battery or an EV charger?") to compete with incumbents on national reach — now viable because the product is national from day one.

**Phase 3 — Layer the optional human + installer network.**
Where conversion and volume justify it (QLD first), add the **optional human expert review** and a **vetted-installer** hand-off as a premium tier. This is additive margin, not a prerequisite — the AI product already stands and scales without it.

---

## 10. Competitive landscape + the wedge

**The incumbents are strong and validate the demand — read them carefully.**
- **SolarQuotes** — calculator → quotes; paid **$55+GST per solar referral, $60+GST for solar+battery**; covers solar, batteries, heat pumps, EV chargers; ~992k users across ~2,943 postcodes (national); **vets installers hard**; and is **paid whether or not you buy** (so long as you're routed to an installer). Published fixed-price leads.
- **SolarCalculator** — 3-step calculator → matched to "handpicked" installers (**rejects ~75% of applicants**); rebate baked into the maths; referral-monetised.

What this tells us:
1. **Their vetting is national and serious — so vetting is table stakes, not our moat.** Don't build the pitch on "we vet installers."
2. **Their conflict is structural, not cosmetic.** Revenue requires routing you to an installer; they earn **$0 on "don't buy anything."** They literally cannot lead with the honest answer.
3. **Their UX is heavier and their answer isn't transparent** (founder's read) — and **none reason across solar + EV + battery as one decision.**

**Our wedge (sharpened):** **consumer-aligned** (paid by you, so "do nothing" is sayable — forbidden by their referral revenue) + **whole-picture** (solar + EV + battery in one ranked answer) + **always-current, AU-specific knowledge base** (better than free ChatGPT, more current than a static calculator) + **simpler inputs** (postcode auto-derives rates). We don't beat them on reach or vetting; we beat them on the **honest, current, conflict-free, whole-picture answer** their model forbids — delivered as a cheap, instant, national AI product. (A human review is an optional extra, not the wedge.)

**The watch-out:** without a human, the gap to "a good free chatbot" narrows. The knowledge base is what keeps the gap real — so it must be genuinely current and AU-specific, not a thin wrapper.

---

## 11. Risks & caveats

- **Thinner moat without the human (the big one).** Dropping human-in-the-core makes us closer to "a good calculator + chatbot," which a free LLM approximates. Mitigation is the whole bet: **consumer-aligned independence + a genuinely current, AU-specific knowledge base + brand/UX/SEO.** If the knowledge base is thin, there's no moat — so it must be a real, maintained asset, not a prompt.
- **Consumer willingness-to-pay is unproven (central risk).** We ask homeowners to pay where incumbents *and* ChatGPT are free. The low price (~A$19–39) lowers the bar, but conversion is the make-or-break number — test it in Phase 0/1 before over-building.
- **Entrenched, well-funded incumbents.** SolarQuotes/SolarCalculator own reach, SEO and installer networks. Don't fight on reach or vetting — only on honesty + currency + whole-picture + UX. Drifting to a referral model makes us a worse-funded clone.
- **Knowledge-base accuracy at national scale.** Going national multiplies the tariff/incentive surface; non-QLD data is rough until refined. Wrong numbers destroy the only moat — label estimates, and the §7 freshness loop must keep all states current.
- **Regulatory positioning.** We **advise/guide**; we don't sell or install (no SAA accreditation needed) and don't claim STCs (the installer does). Keep payback/EV-savings talk as **general information, not personal financial product advice** (avoids AFSL). *Verify the advice boundary with a lawyer.*
- **Episodic demand.** A household decides this rarely. Acquisition is repeat-effort; mitigate with content/SEO and referrals (installers, electricians, EV/solar communities).
- **EV scope creep.** Stay an *advisor on charging economics*, not an EV dealer or charger installer.

---

## 12. Open decisions (resolve next)

- [x] **Geography/moat:** national, AI-led; moat = consumer-aligned independence + always-current AU knowledge base (decided 29 Jun 2026).
- [x] **Revenue model:** free answer → **low one-off unlock (~A$19–39)** for the AI plan; **human review optional (~A$99)** (decided 29 Jun 2026); exact price to test.
- [ ] **Price point:** test A$19 vs A$29 vs A$39 (and the optional A$99) for conversion in Phase 0/1.
- [ ] **Knowledge base scope/build:** what data, what sources, how maintained — this is now the moat (see build doc).
- [ ] **First wedge:** full recommender vs a lighter "battery, EV charger, or more panels?" triage quiz as the hook.
- [ ] **Per-state data:** verify import rate / FiT / generation factor for each state — accuracy *is* the moat.
- [ ] **Advice legal boundary** — confirm with a lawyer (general-information framing; AFSL avoidance).

---

## Sources (verified 29 Jun 2026)

- Cheaper Home Batteries Program — DCCEEW: https://www.dcceew.gov.au/energy/programs/cheaper-home-batteries
- Changes to Cheaper Home Batteries Program (1 May 2026) — Solar Choice: https://www.solarchoice.net.au/learn/solar-rebates/government-battery-rebate/changes-1-may-2026/
- QLD feed-in tariff 2026 — Canstar: https://www.canstar.com.au/energy/best-solar-feed-in-tariffs-qld/
- Price changes from 1 July 2026 — Ergon Energy: https://www.ergon.com.au/retail/residential/tariffs-and-prices/price-changes-from-1-july
- Zero Emission Vehicle (ZEV) Rebate Scheme — Queensland Government: https://www.qld.gov.au/transport/projects/electricvehicles/zero-emission-vehicle-rebate
- EV incentives Australia state-by-state — RACV: https://www.racv.com.au/royalauto/transport/electric-vehicles/electric-car-discounts-government-incentives-australia.html
- SolarQuotes business model / referral pricing — How does SolarQuotes make money?: https://support.solarquotes.com.au/hc/en-us/articles/115000931934
- SolarQuotes about / scale / vetting: https://www.solarquotes.com.au/about-us/
- SolarCalculator how it works / installer vetting: https://solarcalculator.com.au/about-us/

*This document is a strategy hypothesis, not legal or financial advice. Incentive and tariff figures reflect Australia as at mid-2026 and change over time; per-state defaults beyond QLD are rough estimates — verify current STC factors, feed-in tariffs, import rates and EV concessions before relying on them, and confirm the advice positioning with appropriate professionals.*
