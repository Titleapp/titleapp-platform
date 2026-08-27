# CODEX 79 — Program Support Worker: UH Maui Pilot as the No-FTE Scaling Test

**Status:** ⚪ spec — not yet built · **real forcing function landed 2026-08-27** (§1A) · **red-teamed 2026-08-27** (§0)
**Owner:** Sean / Claude Code
**Date:** 2026-08-26 (updated 2026-08-27)
**Trigger:** Sean, on UH Maui / NURS-366 going live as SOCIII's first real institutional customer: *"I don't think me as a support person would be optimal. Maybe we can build a 24-7 worker? Do I hire some support staff?"* — and, on why this specific worker matters beyond this one pilot: *"if this worker works, then we can scale without FTE."*

**Update 2026-08-27 (Ruthie, via text, relaying Anne):** this is no longer a hypothetical timeline. Anne wants the CET (Clinical Evaluation Tool) **live on SOCIII by January**, and separately — more urgent — **Anne is actively filling out a vendor request / Data Governance form** for the account and wants to Zoom with Sean and Ruthie **next week** about her questions on it. See §1A.

**Framing:** this is not a new support system. CODEX 44/45 already built and shipped a real Tier 0/1/2 escalation + billing pipeline, live across every worker. What's missing is a **named, first-class Support Worker** that is the front door for a whole institutional account's *operational* questions (access, onboarding, "how do I use this," account admin) — as opposed to today's design, which only fires reactively when a student is stuck mid-conversation with a *different* worker (Hannah). UH Maui is the first tenant where this gets tested end to end. If Tier 0 handles the large majority of real ticket volume here with no dedicated human hire, that's the evidence SOCIII needs that support cost doesn't scale linearly with institutional customers — which is the actual thesis worth proving before it's asserted to investors or the next customer.

---

## 0. Red team pass — 2026-08-27

External review (Claude) plus independent verification against the live repo and the actual UH Maui email thread. One review finding was built on a stale claim in this CODEX's own §1 table — corrected below rather than left standing.

**Correction to the review's Tier 1 #1 (distress protocol "race to ship"):** the review took this CODEX's §1 table at face value — "spec only, not built" — and flagged real risk in betting a safety-critical component ships in under a week before the Data Governance call. **On verification, that premise is stale.** `raas/rulesets/platform_distress_v1.json` (58 lines) and its enforcement code `services/safety/distressProtocol.js` (237 lines) both exist and are wired into the chat handler in `index.js` (regex gate → classifier → alert write → SMS), committed **2026-08-17** — nine days before this CODEX was even written, as part of the aviation worker suite build. §1's table and CODEX 73's carried-forward "spec only" framing were simply never updated after that shipped. **The actual remaining gap is narrower**, per the ruleset's own text: *"the deploy-time activation-blocking gate itself is not yet wired... tracked as a fast-follow, not silently dropped."* i.e., the pipeline runs and fails closed on classifier error, but nothing yet blocks a tenant from going to production without a configured `tenant.safetyContact`. Fixed throughout below (§1, §1A, §4, §6): no more "ship this by the call," replaced with "confirm UH Maui's `safetyContact` is configured" — a data-entry task, not a build race.

**Confirmed and sharpened — Tier 1 #2 (subsidized billing mismatch):** verified against the actual Order Form thread (`sean@sociii.ai` → Ruthie/Anne, 2026-08-25). Real terms: **$99/month base + $5/active-student/month, first 5 students free** — no mention anywhere of human-support tiers, subsidization, or an expiry date. Worse than the review stated: **the contract isn't signed yet.** Anne's reply (2026-08-25): *"I'll submit this to the data governance peeps and see what they ask for. Once it gets through them, we work on getting the contract signed."* So this CODEX's framing of UH Maui as an already-"signed account" (§1, §4, §5 as originally written) was itself premature — fixed below. The `humanSupportSubsidizedUntil: 2026-12-31` flag is a **demo-seed default with no contractual backing**, sitting right on top of the January CET ramp-up. This is a real open pricing decision for Sean, not a config reconciliation — see revised §5.2.

**Confirmed — Tier 2 #3, #4, #5, #6:** the deflection metric as originally written was tenant-scoped rather than worker-scoped (conflates the new persona's performance with Hannah's existing Tier-0 triggers); the ≥90% target will be noisy at UH Maui's actual near-term scale (starts at the first 5 free students, per the real Order Form, before scaling toward Anne's stated ~90 students by F28); there was no stated routing rule for messages that are simultaneously account-ops and clinical-tool questions; and the no-FTE thesis wasn't scoped to explicitly exclude admin actions the worker is barred from executing. All four fixed below (§3.2–§3.4).

**Tracked, not blocking (Tier 3):** Hannah-readiness as a go-live dependency, the deflection-metric denominator definition, and the still-unresolved Hawaii-timezone SLA question from CODEX 45 are now stated explicitly rather than implied — see §4 and §5.3. The review's file/line citations for CODEX 44/45/66/73 were independently re-verified this session by direct file reads (not just cited from memory) — they hold.

## 1A. Timeline forcing function (2026-08-27, from Ruthie/Anne)

Two concrete, dated items, not general context:

1. **Data Governance / vendor request form — Zoom call next week (week of 2026-09-01).** Anne is filling out UH's vendor request/data-governance paperwork now (this is pre-signature — see §0's correction, the contract itself isn't executed yet) and has questions; she wants Sean and Ruthie on a call about it. This is the single most time-sensitive item in this whole CODEX — it's procurement-gating, not a nice-to-have. Practical implication: whatever this CODEX says about FERPA handling, data access scope, and escalation guardrails (§3.2, §4) needs to be **true and defensible in that call**, not just aspirational in a spec doc. The plain-language answer sheet already sent to Ruthie (2026-08-27) covers this, grounded in `docs/TRUST_AND_DATA_INTEGRITY.md` §14 (FERPA school-official designation) and the now-confirmed-live distress protocol (§0) — it also states honestly that the FERPA addendum's attachment to the DPA and the VPAT/WCAG accessibility status are still open, rather than overclaiming either.
2. **Anne wants the CET live on SOCIII by January.** This resets the priority of this CODEX from "worth doing for the current NURS-366 pilot" to "must be functioning before CET rolls out beyond the single test course." CET going live means Anne, Ruthie, and likely more faculty/students start generating real operational tickets at a materially higher volume than today's single-course pilot — the Support Worker and its guardrails should be live *before* January, not built reactively after ticket volume shows up.

Net effect on sequencing (see §6): the Data Governance call is the near-term deadline that forces §3.2's guardrails and FERPA answers to be nailed down now; the January CET date is the deadline that forces the rest of the worker (persona, escalation wiring, deflection metric) to actually be live, not just spec'd.

## 1. What already exists — reuse, do not rebuild

| Capability | File | Status |
|---|---|---|
| Tier 0/1/2 escalation model (AI free / contractor $45/hr / Sean goodwill) | `docs/codex/44-human-support-billing.md` | Real, spec'd, red-teamed |
| Escalation trigger: regex + LLM-intent + demo overlay + Alex core rule | `apps/business/src/components/ChatPanel.jsx`, universal prompt append in `index.js`, `services/alex/prompts/core.js` | Shipped 2026-07-19 |
| Consent-gate UI (`SupportEscalationCard.jsx`) | 6 phases: loading/subsidized/outside_hours/no_credits/ready/confirmed | Shipped |
| `POST /v1/support:escalate`, `GET /v1/support:status` | `index.js` | Shipped — writes `supportSessions/{id}`, emails sean@sociii.ai, SMS |
| Subsidized-tenant flag | `billing.humanSupportSubsidized` + expiry, set for Makai/UH in `scripts/seedMakaiNursingDemo.js` through 2026-12-31 | Shipped as a **demo-seed default only** — verified 2026-08-27 against the real Order Form thread that this has **no contractual backing** (UH Maui isn't signed yet, and the sent Order Form contains no support-tier language at all). Real open decision, not a reconfirmation — see §5.2. |
| Distress-disclosure protocol | `raas/rulesets/platform_distress_v1.json` (58 lines), `services/safety/distressProtocol.js` (237 lines) | **Built and wired**, verified 2026-08-27 — regex gate → classifier → alert write → SMS, live in the chat handler since 2026-08-17. Remaining gap is narrow: the deploy-time gate blocking production activation without a configured `tenant.safetyContact` is not yet wired (ruleset's own text calls this a tracked fast-follow). Confirm UH Maui's `safetyContact` is set before go-live (§4.2) — do not re-treat this as an unbuilt prerequisite. |
| NURS-366 / Hannah build context | `docs/codex/73-nurs366-hannah-student-tutor-and-study-pipeline.md` | In progress — this CODEX is scoped separately from Hannah's tutoring work; see §2 for the boundary. |

**Do not duplicate the escalation plumbing.** Everything in the table above is infrastructure. What this CODEX adds is a *persona and a surface* on top of it, plus one missing measurement capability (§4).

## 2. Scope boundary: this worker vs. Hannah

Two different jobs, easy to conflate:

- **Hannah** (CODEX 73) — clinical/academic tutor. Socratic coaching on NURS-366 content, Tanner-framework reflection, quiz mode. Never handles account admin.
- **Program Support Worker (this CODEX)** — the operational front door for the *account*, not the coursework. Handles: login/access issues, "how do I get my students set up," "where do I find X in the platform," roster/onboarding questions from Anne or Ruthie, status questions about consent/FERPA setup, and routing anything it can't resolve to Tier 1/2 per the existing escalation model.

Audience is broader than students: **Anne** (dept chair, contract owner), **Ruthie** (building/running the course), and **students** all need this, but Anne and Ruthie's questions are almost entirely account/operations, not tutoring — which is exactly the traffic Sean, not Hannah, would otherwise absorb.

If a message is actually a clinical/coursework question, the Support Worker should redirect to Hannah rather than attempt it — it is not a second tutor.

## 3. What's actually new

### 3.1 — A named persona, not just a silent regex layer

Today's Tier 0 (CODEX 45) is invisible infrastructure bolted onto every worker's prompt — it only activates on distress-style phrasing mid-conversation. That's correct for "student is stuck talking to Hannah," but it is not a worker Anne can go to proactively with "how do I add a new faculty account" or "did the consent form language get approved." Build a real, addressable Support Worker persona (working name: **"Front Desk"** — placeholder, Sean/Ruthie should confirm) that:

- Is reachable directly, not just triggered reactively — a real entry point in the chat surface for UH Maui's tenant.
- Answers from the tenant's real setup (Studio Locker–grounded on the actual Order Form terms, onboarding steps, and whatever operational FAQ gets written for this account) — same no-fabrication pattern already proven for Hannah and `nursing-courses-001`, not a generic canned-answer bot.
- Escalates through the *existing* Tier 1/2 pipeline the moment it can't resolve something itself — reuses `POST /v1/support:escalate` unchanged.
- Explicitly cannot: make grading/clinical-competency determinations, override FERPA-relevant access, or resolve billing disputes above what's pre-authorized (all route to Tier 2/Sean).

### 3.2 — Guardrails specific to a program-support (not tutoring) worker

- No clinical content answers — redirect to Hannah.
- No unilateral account/role changes (e.g., adding a faculty account) — surface the request, don't execute it, until there's a defined capability contract for it in `contracts/capabilities.json`. **Explicit scope caveat (added 2026-08-27, red team Tier 2 #6):** the no-FTE thesis this worker is meant to prove (§3.3) applies to *informational/how-to* support load — anything requiring an actual account/role change still routes to a human regardless of how well Tier 0 performs. Do not let a strong deflection number get read, internally or when pitched to the next institutional customer, as proof that admin-action load is also FTE-free — it isn't, by design.
- Distress-disclosure handling is **already built and live** (§0, §1) — this worker inherits it the same way every worker does, since it's also a raw text-input surface for real people. No additional build needed here; just confirm UH Maui's `tenant.safetyContact` is configured (§4.2).
- FERPA: this worker's own logs and any account data it surfaces must follow the same handling standard already used for `get_nursing_cohort`/`get_nursing_student` (FERPA-gated allowlist, per CODEX 73).

### 3.3 — The missing measurement capability: Tier 0 deflection rate

CODEX 44 states the model's target outright: *"Tier 0 is always free and should handle ≥90% of requests."* Nothing currently reports whether that's actually true for a given tenant. Since the entire point of this worker is testing whether support scales without FTE growth, this number has to be visible, not assumed:

- **Scope the metric to the Support Worker specifically, not the whole tenant** (red team Tier 2 #3, confirmed): a tenant-wide aggregate would conflate Hannah's existing mid-conversation Tier-0 triggers with this new persona's performance, which is a different question than the one this metric exists to answer. Track `supportSessions` escalated *from the Support Worker persona* against *Support Worker conversation count*, and report Hannah's own deflection rate separately if useful — never blended into one number.
- Add a simple report: `(Tier-0-only Support Worker conversations) / (Tier-0-only Support Worker conversations + Support-Worker-originated supportSessions escalated)` per tenant, per week.
- Cheapest version: a query over existing `supportSessions/{id}` docs (already has tenant + timestamp; needs a `sourceWorker` or equivalent field to distinguish origin) joined against Support Worker conversation count for the same tenant/period — no new write path needed beyond that field, just a read-side aggregate. Could be a small script first, a dashboard tile later.
- **Sample-size caveat (red team Tier 2 #4, confirmed):** UH Maui's real Order Form starts at the first 5 active students free (per the actual signed terms once executed — see §0), scaling toward Anne's stated ~90 BSN students by F28. At single-digit-to-low-double-digit weekly users, one escalated ticket swings the weekly percentage by double digits. Track it from week one regardless, but do not treat any single week's number as thesis-confirming or thesis-denying until volume is meaningfully higher than the opening NURS-366 pilot — read it as a trend across several weeks, not a weekly verdict.
- This is the actual deliverable that proves or disproves Sean's thesis — track it from week one of the UH Maui pilot, not retroactively.

### 3.4 — Ambiguous-request routing between Hannah and the Support Worker (red team Tier 2 #5)

The Hannah/Support-Worker boundary in §2 is clean on paper but real messages won't sort cleanly — e.g. "why isn't my student's evaluation showing up" is simultaneously an account/access question and a clinical-tool question. No routing rule existed for this overlap in the original spec. Fix: neither persona should guess. When a message plausibly spans both domains, the receiving worker should ask one clarifying question to disambiguate ("are you asking about accessing the evaluation tool, or about the clinical content/scoring itself?") rather than either (a) the Support Worker attempting a clinical-judgment answer, or (b) Hannah attempting an account-admin action she has no capability to execute. Default to the safer failure mode — surface/escalate — when the ambiguity can't be resolved in one turn.

## 4. Launch checklist for UH Maui / NURS-366 (operational, not building the worker itself)

1. Support Worker guardrails written and reviewed before any real student/faculty message reaches it (§3.2).
2. **Confirm UH Maui's `tenant.safetyContact` (name/phone/email) is configured in Firestore** before this worker goes live to real users — corrected 2026-08-27 (§0): the distress protocol itself is already built and live; the one remaining gap is that nothing yet blocks production activation without this field set, so it has to be checked manually rather than assumed enforced.
3. Confirm FERPA handling for anything this worker can see or say about student records — same standard as Hannah.
4. Give Anne a one-paragraph explanation of the support/escalation path (what Tier 0 handles, when a human gets looped in, expected response time) before the semester starts — she should not discover the escalation flow by triggering it live.
5. **Decide, don't just reconfirm, the subsidized-billing terms** (§5.2) — corrected 2026-08-27: the real Order Form has no support-tier language and UH Maui isn't signed yet, so there is nothing to reconcile the demo-seed default against. This needs an actual pricing decision before it's set for the live tenant.
6. Watch `supportSessions` and the new deflection metric (§3.3) closely for the first 2–3 weeks of the semester — first real institutional customer, worth the extra attention regardless of the automation thesis, and read as a trend, not a single week's verdict (§3.3 sample-size caveat).
7. Data Governance Zoom prep (week of 2026-09-01) is **done** — the answer sheet was sent to Ruthie 2026-08-27, grounded in `docs/TRUST_AND_DATA_INTEGRITY.md` and the now-confirmed-live distress protocol, and states the FERPA-addendum-attachment and VPAT/WCAG gaps honestly rather than glossing over them.
8. **Confirm Hannah's student-tutor mode (CODEX 73) is actually live before this worker redirects clinical questions to her** (red team Tier 3) — "redirect to Hannah" is a dead end if her build slips past this worker's launch. Check status at go-live, don't assume.

## 5. Open decisions (Sean's call)

1. **Name/persona for this worker.** "Front Desk" is a placeholder in §3.1 — needs a real name/voice, ideally something that generalizes across future institutional tenants rather than being UH-Maui-specific, since the whole point is that this pattern should be reusable, not bespoke per customer.
2. **Set real subsidized-billing terms — this is a pricing decision, not a reconciliation (corrected 2026-08-27, §0).** The real Order Form ($99/mo + $5/active student, first 5 free) has no human-support-tier language at all, and UH Maui hasn't signed yet. Decide explicitly: does SOCIII want to offer subsidized Tier 1 human support through some date as part of closing this deal (as the demo default implies), and if so, what date — noting the current demo default (`2026-12-31`) lapses in the same month Anne wants CET to go live platform-wide, which is exactly when escalation volume is likely to increase. Whatever is decided should go into the actual signed Order Form/DPA, not just a Firestore flag copied from a demo seed script.
3. **SLA hours for Hawaii-timezone escalations.** CODEX 45 already flagged this as unresolved: 4 business hours Mon–Fri Pacific was proposed, but nursing students often study nights/weekends — confirm whether that SLA actually holds for this account or needs a Hawaii-aware exception. Compounding factor (red team Tier 3): a Tier-0 miss at 11pm Saturday currently has no stated behavior beyond "unresolved" — worth a concrete answer (e.g., what the student actually sees when they're outside subsidized/Tier-1 availability), not just a flagged open question.
4. **Scope of "Front Desk" vs. future accounts.** Should this be built as a generic, tenant-agnostic Support Worker template from day one (more upfront work, directly reusable for the next institutional customer), or scoped tightly to UH Maui first and generalized after it's proven? Recommendation: build the persona generically from the start — the guardrails in §3.2 are not UH-Maui-specific — but let the Locker content (Order Form terms, onboarding FAQ) stay per-tenant as it naturally would anyway.

## 6. Suggested build order

**Resequenced 2026-08-27 around the two real dates in §1A** — the Data Governance call (week of 2026-09-01) and the January CET launch.

0. ~~Write the FERPA/data-governance answer sheet~~ — **done**, sent to Ruthie 2026-08-27 (§4.7).
1. **Confirm UH Maui's `tenant.safetyContact` is configured** (§4.2) — corrected 2026-08-27: this is a data-entry check against an already-built, already-live protocol, not a build race against the Zoom call.
2. Write the Support Worker's system prompt + guardrails (§3.1–3.2, including the ambiguous-routing rule in §3.4), Locker-grounded on UH Maui's real Order Form/onboarding content.
3. Wire it as an addressable worker/persona in the tenant's chat surface (not just the silent regex layer) — reuses `POST /v1/support:escalate` and the consent-gate UI unchanged.
4. **Decide and set the real subsidized-billing terms for the live UH Maui tenant** (§5.2) — a pricing decision to make now, not a config value to copy from the demo seed.
5. Ship the Tier-0 deflection-rate report, **scoped to the Support Worker specifically** (§3.3) — even a one-off script counts as shipped for week one; a dashboard tile can follow.
6. Send Anne the escalation-path summary (§4.4) before go-live.
7. **Confirm Hannah's student-tutor mode (CODEX 73) is live** before treating "redirect to Hannah" as a real fallback (§4.8).
8. Monitor weeks 1–3 closely; read the deflection number as a multi-week trend, not a single-week verdict (§3.3 sample-size caveat), and decide whether it validates the no-FTE thesis for *informational* support load specifically (§3.2's scope caveat) or reveals gaps this worker can't cover.

**All of 1–6 above should be genuinely done well before January**, not just started — CET going live is when real ticket volume beyond the single NURS-366 pilot actually shows up, and this worker exists specifically so that volume doesn't require a hire.

---

## Cross-references

- `docs/codex/44-human-support-billing.md` — Tier 0/1/2 billing model this worker reuses unchanged
- `docs/codex/45-support-escalation-and-human-billing.md` — the escalation trigger + consent-gate infra this worker sits on top of
- `docs/codex/66-worker-persona-and-distress-protocol.md` — distress protocol, shared hard prerequisite with CODEX 73
- `docs/codex/73-nurs366-hannah-student-tutor-and-study-pipeline.md` — Hannah's tutoring build; this CODEX explicitly does not duplicate it (§2)
- `docs/TRUST_AND_DATA_INTEGRITY.md` — the real trust/security doc the Data Governance answer sheet was built from (§0, §1A, §4.7)
- Gmail thread "SOCIII / UH Maui College — Order Form for review" (2026-08-25/26) — source of the real, unsigned Order Form terms verified in §0
