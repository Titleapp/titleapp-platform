# CODEX 79 — Program Support Worker: UH Maui Pilot as the No-FTE Scaling Test

**Status:** ⚪ spec — not yet built · **real forcing function landed 2026-08-27** (§1A)
**Owner:** Sean / Claude Code
**Date:** 2026-08-26 (updated 2026-08-27)
**Trigger:** Sean, on UH Maui / NURS-366 going live as SOCIII's first real institutional customer: *"I don't think me as a support person would be optimal. Maybe we can build a 24-7 worker? Do I hire some support staff?"* — and, on why this specific worker matters beyond this one pilot: *"if this worker works, then we can scale without FTE."*

**Update 2026-08-27 (Ruthie, via text, relaying Anne):** this is no longer a hypothetical timeline. Anne wants the CET (Clinical Evaluation Tool) **live on SOCIII by January**, and separately — more urgent — **Anne is actively filling out a vendor request / Data Governance form** for the account and wants to Zoom with Sean and Ruthie **next week** about her questions on it. See §1A.

**Framing:** this is not a new support system. CODEX 44/45 already built and shipped a real Tier 0/1/2 escalation + billing pipeline, live across every worker. What's missing is a **named, first-class Support Worker** that is the front door for a whole institutional account's *operational* questions (access, onboarding, "how do I use this," account admin) — as opposed to today's design, which only fires reactively when a student is stuck mid-conversation with a *different* worker (Hannah). UH Maui is the first tenant where this gets tested end to end. If Tier 0 handles the large majority of real ticket volume here with no dedicated human hire, that's the evidence SOCIII needs that support cost doesn't scale linearly with institutional customers — which is the actual thesis worth proving before it's asserted to investors or the next customer.

---

## 1A. Timeline forcing function (2026-08-27, from Ruthie/Anne)

Two concrete, dated items, not general context:

1. **Data Governance / vendor request form — Zoom call next week (week of 2026-09-01).** Anne is filling out UH's vendor request/data-governance paperwork now and has questions; she wants Sean and Ruthie on a call about it. This is the single most time-sensitive item in this whole CODEX — it's procurement-gating, not a nice-to-have. Practical implication: whatever this CODEX says about FERPA handling, data access scope, and escalation guardrails (§3.2, §4) needs to be **true and defensible in that call**, not just aspirational in a spec doc. Before the call: pull together a plain-language answer sheet covering data storage/location, who can see student records, retention, and how support/escalation handles anything FERPA-relevant — reusing the real mechanisms already cited here (FERPA-gated allowlist per CODEX 73, `platform_distress_v1` session-link-gated reviewer access per CODEX 66) rather than inventing new claims for the call.
2. **Anne wants the CET live on SOCIII by January.** This resets the priority of this CODEX from "worth doing for the current NURS-366 pilot" to "must be functioning before CET rolls out beyond the single test course." CET going live means Anne, Ruthie, and likely more faculty/students start generating real operational tickets at a materially higher volume than today's single-course pilot — the Support Worker and its guardrails should be live *before* January, not built reactively after ticket volume shows up.

Net effect on sequencing (see §6): the Data Governance call is the near-term deadline that forces §3.2's guardrails and FERPA answers to be nailed down now; the January CET date is the deadline that forces the rest of the worker (persona, escalation wiring, deflection metric) to actually be live, not just spec'd.

## 1. What already exists — reuse, do not rebuild

| Capability | File | Status |
|---|---|---|
| Tier 0/1/2 escalation model (AI free / contractor $45/hr / Sean goodwill) | `docs/codex/44-human-support-billing.md` | Real, spec'd, red-teamed |
| Escalation trigger: regex + LLM-intent + demo overlay + Alex core rule | `apps/business/src/components/ChatPanel.jsx`, universal prompt append in `index.js`, `services/alex/prompts/core.js` | Shipped 2026-07-19 |
| Consent-gate UI (`SupportEscalationCard.jsx`) | 6 phases: loading/subsidized/outside_hours/no_credits/ready/confirmed | Shipped |
| `POST /v1/support:escalate`, `GET /v1/support:status` | `index.js` | Shipped — writes `supportSessions/{id}`, emails sean@sociii.ai, SMS |
| Subsidized-tenant flag | `billing.humanSupportSubsidized` + expiry, set for Makai/UH in `scripts/seedMakaiNursingDemo.js` through 2026-12-31 | Shipped — **needs reconfirmation against the real UH Maui Order Form, not just the demo seed (§5.2)** |
| Distress-disclosure protocol | `docs/codex/66-worker-persona-and-distress-protocol.md`, `raas/rulesets/platform_distress_v1.json` | **Spec only, not built** — CODEX 73 §4 already flags this as a hard prerequisite before any real student reaches Hannah's student mode. Applies here too: a support worker fielding open-ended messages needs the same fail-closed safety net. |
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
- No unilateral account/role changes (e.g., adding a faculty account) — surface the request, don't execute it, until there's a defined capability contract for it in `contracts/capabilities.json`.
- Same distress-disclosure fail-closed requirement as CODEX 73 §4 applies here too, since this worker is also a raw text-input surface for real people.
- FERPA: this worker's own logs and any account data it surfaces must follow the same handling standard already used for `get_nursing_cohort`/`get_nursing_student` (FERPA-gated allowlist, per CODEX 73).

### 3.3 — The missing measurement capability: Tier 0 deflection rate

CODEX 44 states the model's target outright: *"Tier 0 is always free and should handle ≥90% of requests."* Nothing currently reports whether that's actually true for a given tenant. Since the entire point of this worker is testing whether support scales without FTE growth, this number has to be visible, not assumed:

- Add a simple report: `(Tier-0-only conversations) / (Tier-0-only conversations + supportSessions escalated)` per tenant, per week.
- Cheapest version: a query over existing `supportSessions/{id}` docs (already has tenant + timestamp) joined against total worker-conversation count for the same tenant/period — no new write path needed, just a read-side aggregate. Could be a small script first, a dashboard tile later.
- This is the actual deliverable that proves or disproves Sean's thesis — track it from week one of the UH Maui pilot, not retroactively.

## 4. Launch checklist for UH Maui / NURS-366 (operational, not building the worker itself)

1. Support Worker guardrails written and reviewed before any real student/faculty message reaches it (§3.2).
2. `platform_distress_v1.json` shipped (CODEX 73 §4 / CODEX 66) — blocks this worker going live to real users the same way it blocks Hannah's student mode.
3. Confirm FERPA handling for anything this worker can see or say about student records — same standard as Hannah.
4. Give Anne a one-paragraph explanation of the support/escalation path (what Tier 0 handles, when a human gets looped in, expected response time) before the semester starts — she should not discover the escalation flow by triggering it live.
5. Confirm the subsidized-billing flag and its expiry actually match the real UH Maui Order Form terms, not just the `demo-makai-nursing` seed script default (§5.2 below) — these have likely diverged now that this is a signed account, not a demo.
6. Watch `supportSessions` and the new deflection metric (§3.3) closely for the first 2–3 weeks of the semester — first real institutional customer, worth the extra attention regardless of the automation thesis.
7. **Before the Data Governance Zoom (week of 2026-09-01):** prepare a plain-language answer sheet for Anne covering data storage/location, who can access student records, retention, and how the support-escalation path handles anything FERPA-relevant. Ground every answer in a real, already-cited mechanism (FERPA-gated allowlist, `platform_distress_v1` session-link-gated review) — do not represent anything as built that is currently only spec'd (the distress protocol itself is the clearest example, per §1 table).

## 5. Open decisions (Sean's call)

1. **Name/persona for this worker.** "Front Desk" is a placeholder in §3.1 — needs a real name/voice, ideally something that generalizes across future institutional tenants rather than being UH-Maui-specific, since the whole point is that this pattern should be reusable, not bespoke per customer.
2. **Reconfirm subsidized billing terms against the real Order Form.** The `humanSupportSubsidizedUntil: 2026-12-31` flag in `scripts/seedMakaiNursingDemo.js` was set for a demo/pilot context before this became a signed customer — confirm it still reflects what Anne actually agreed to, and set it live in Firestore for the real tenant (not just the seed script) rather than assuming the demo default carries over.
3. **SLA hours for Hawaii-timezone escalations.** CODEX 45 already flagged this as unresolved: 4 business hours Mon–Fri Pacific was proposed, but nursing students often study nights/weekends — confirm whether that SLA actually holds for this account or needs a Hawaii-aware exception.
4. **Scope of "Front Desk" vs. future accounts.** Should this be built as a generic, tenant-agnostic Support Worker template from day one (more upfront work, directly reusable for the next institutional customer), or scoped tightly to UH Maui first and generalized after it's proven? Recommendation: build the persona generically from the start — the guardrails in §3.2 are not UH-Maui-specific — but let the Locker content (Order Form terms, onboarding FAQ) stay per-tenant as it naturally would anyway.

## 6. Suggested build order

**Resequenced 2026-08-27 around the two real dates in §1A** — the Data Governance call (week of 2026-09-01) and the January CET launch.

0. **Immediately, before the Zoom call:** write the FERPA/data-governance answer sheet (§4.7). This is documentation, not a build item, and it's due first regardless of everything else below.
1. `platform_distress_v1.json` + alert pipeline — already the top blocker in CODEX 73 §4; this worker inherits the same prerequisite, and it's also one of the concrete things Anne's data-governance questions will likely touch (session-gated review, fail-closed behavior). Do once, benefits both, and do it before claiming it's true on the call.
2. Write the Support Worker's system prompt + guardrails (§3.1–3.2), Locker-grounded on UH Maui's real Order Form/onboarding content.
3. Wire it as an addressable worker/persona in the tenant's chat surface (not just the silent regex layer) — reuses `POST /v1/support:escalate` and the consent-gate UI unchanged.
4. Reconfirm and set the real subsidized-billing flag for the live UH Maui tenant (§5.2).
5. Ship the Tier-0 deflection-rate report (§3.3) — even a one-off script counts as shipped for week one; a dashboard tile can follow.
6. Send Anne the escalation-path summary (§4.4) before go-live.
7. Monitor weeks 1–3 closely; revisit the deflection number and decide whether it validates the no-FTE thesis or reveals gaps this worker can't cover.

**All of 1–6 above should be genuinely done well before January**, not just started — CET going live is when real ticket volume beyond the single NURS-366 pilot actually shows up, and this worker exists specifically so that volume doesn't require a hire.

---

## Cross-references

- `docs/codex/44-human-support-billing.md` — Tier 0/1/2 billing model this worker reuses unchanged
- `docs/codex/45-support-escalation-and-human-billing.md` — the escalation trigger + consent-gate infra this worker sits on top of
- `docs/codex/66-worker-persona-and-distress-protocol.md` — distress protocol, shared hard prerequisite with CODEX 73
- `docs/codex/73-nurs366-hannah-student-tutor-and-study-pipeline.md` — Hannah's tutoring build; this CODEX explicitly does not duplicate it (§2)
