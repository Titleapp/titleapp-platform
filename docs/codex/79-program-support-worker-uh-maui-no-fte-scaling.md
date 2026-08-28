# CODEX 79 — Program Support Worker: UH Maui Pilot as the No-FTE Scaling Test

**Status:** 🟡 gate + persona built · **safetyContact activation gate built, wired, and edge-case-hardened** (§0C, §0D) · **Grace (the persona itself) named, spec'd, red-teamed, and built 2026-08-27 — see CODEX 80** · **real forcing function landed 2026-08-27** (§1A) · **red-teamed 2026-08-27, four rounds on this doc + one on CODEX 80** (§0, §0B, §0C, §0D)
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

## 0B. Red team round 2 — 2026-08-27

Second external pass on §0 itself. All six findings held up; fixed below rather than left as commentary.

**Tier 1 #1 — fair, and fixed with a second surface of proof, not a bigger assertion.** The reviewer correctly pointed out that "Claude verified Claude's own claim" is a weaker standard than this CODEX otherwise holds itself to. Rather than just re-asserting it more confidently, here is the actual terminal output the §0 claim was based on, so anyone (Sean, Anne's reviewer, a future hire) can check it independently instead of trusting a status-table cell:

```
$ find . -iname "platform_distress*"
./functions/functions/raas/rulesets/platform_distress_v1.json

$ git log -1 --format="%ai" 2a8eac99 -- functions/functions/raas/rulesets/platform_distress_v1.json
2026-08-17 23:14:10 -1000

$ wc -l functions/functions/raas/rulesets/platform_distress_v1.json
      58 functions/functions/raas/rulesets/platform_distress_v1.json

$ wc -l functions/functions/services/safety/distressProtocol.js
     237 functions/functions/services/safety/distressProtocol.js

$ grep -n "distressProtocol\|platform_distress_v1" functions/functions/index.js
3043:      // configuring the session. See services/safety/distressProtocol.js.
3046:      const { matchesTrigger, classifyDistress, buildRedResponse, buildYellowInjection,
           writeDistressAlert, notifySafetyContact } = require("./services/safety/distressProtocol");
3077:      console.error("[distressProtocol] pipeline error (non-blocking, no response
           substitution):", distressErr.message);
```

This is still self-reported in the sense that it came from this repo's own git history and source files — it is not a third-party attestation. For the Zoom call specifically, the reviewer's stronger ask stands: before relying on this in front of Anne's reviewer, get one more independent surface — e.g. trigger a real test conversation against the regex gate and capture the resulting `alertFeed` write, rather than resting solely on code-reads. Not done as part of this pass; flagged as a pre-call to-do (§4.9).

**Tier 1 #2 — agreed, this is a real residual safety gap, not a closed item.** Recommendation adopted: **(a) is preferred over (b)** — build the deploy-time `tenant.safetyContact`-required activation gate before UH Maui specifically goes live, since the ruleset's own scope describes it as a small, bounded check (block activation if the field is missing), not a new subsystem. If it doesn't land before the Zoom call, fallback (b) applies: the answer sheet must say the gate is enforced by manual checklist today, not automatically — checked against what was actually sent to Ruthie on 2026-08-27, and it does **not** overclaim this specific mechanism (it describes access controls and FERPA posture in general terms, never asserts an automatic activation gate exists). No correction needed to the sent email; the gap is inside this CODEX's build plan, not in what Anne will see. Added as an explicit build step (§6.1a).

**Tier 2 #3 — added.** This CODEX's build order proceeds now regardless of signature status, because the underlying work (distress-protocol gate, Support Worker guardrails, deflection metric) benefits any institutional tenant, not just UH Maui — but the *launch checklist* (§4) and *live-tenant* steps (setting the real subsidized-billing flag, sending Anne the escalation summary) are contingent on the deal actually closing. If data governance comes back with blockers, or January passes without signature, those tenant-specific steps simply have no tenant to apply to yet — the worker/protocol work isn't wasted, it's prerequisite for whichever institutional customer signs first. Stated explicitly in §6.

**Tier 2 #4 — agreed, pulled into §1A with its own deadline.** See new §1A item 3.

**Tier 2 #5 — agreed at the time, superseded 2026-08-27 (CODEX 80 self-red-team).** No new field needed. `supportSessions` already carries a `workerSlug` field, verified end-to-end (`ChatPanel.jsx` → `SupportEscalationCard.jsx` → `/v1/support:escalate` → the Firestore write) — it just hadn't been checked before this was written. The schema-change step is removed entirely; see §6.

**Tier 2 #6 — decided, not left open.** For v1: **prompt-level redirect only**, not a programmatic handoff. No worker-to-worker conversation-state transfer mechanism exists today (confirmed absent from §1's reuse table), and building one is a materially larger scope than this CODEX covers. The Support Worker tells the person to open a conversation with Hannah for clinical content; it does not attempt to transfer context automatically. If this friction proves to be a real problem in practice (tracked via the deflection metric or direct feedback), a real handoff mechanism becomes its own future CODEX — not silently assumed into this one's scope.

**Tier 3 — both fixed.** The sample-size caveat (§3.3) now accounts for Anne/Ruthie's admin traffic, not just student seat count. The Gmail-thread citation (§0, cross-references) is flagged to be swapped for the executed Order Form document once UH Maui actually signs.

## 0C. Red team round 3 — 2026-08-27, and the gate is now actually built

All round-2 findings confirmed addressed on review. Two new, narrower findings — plus this round the activation gate itself was built (§6.1a is done, not just planned), which changes what "built" means enough to need its own note.

**The gate is built — `checkSafetyContactGate()` in `services/safety/distressProtocol.js`, wired at the top of `/chat:message` in `index.js`, ruleset text updated to match.** Design choice made deliberately: **opt-in per tenant** via `tenant.requireSafetyContactGate === true`, not a blanket block. Flipping this on unconditionally for every existing production tenant would take down live chat for current paying customers who never configured `safetyContact` because nothing ever required it before 2026-08-17 — that's a worse outcome than the gap this gate exists to close. UH Maui gets `requireSafetyContactGate: true` set explicitly as part of its own launch checklist (§4.2) once `safetyContact` is populated; other tenants migrate to enforcement on their own schedule. The gate also fails **open** on a Firestore read error (deliberately, and documented inline) — this is a tenant-config availability check, not a per-message safety classification like the classifier, so failing closed here would take down chat platform-wide during a Firestore blip, which is the wrong tradeoff.

**New finding 1 (round 3) — a commit in git history isn't the same claim as "running in production."** §0B's terminal output proves the files exist and are committed; it doesn't prove commit `2a8eac99` is what's actually deployed and serving UH Maui's traffic today. For the Zoom call specifically, add to §4.9: confirm the deployed Cloud Functions revision actually includes this code (a `firebase functions:log` check or deploy-history lookup), not just `git log`.

**New finding 2 (round 3) — §6 step 2's tenant-agnostic claim conflicted with its own tenant-specific content.** The contingency paragraph claimed steps "1, 1a, 2, and 5–6... proceed now regardless of signature status," but step 2 as written bundled in "Locker-grounded on UH Maui's real Order Form/onboarding content" — which very much doesn't transfer to a different tenant. Fixed by splitting step 2 into its generic half (persona + guardrail logic, tenant-agnostic, proceeds now) and a new step 2a (Locker-grounding on UH Maui's actual content, contingent on signature like the other tenant-specific steps) — see §6.

**New finding 3 (round 3) — §3.4's "neither persona should guess" wasn't reflected symmetrically in the build order.** The ambiguous-routing fix requires both sides to ask a clarifying question rather than guess, but §6 only scoped writing the Support Worker's prompt — nothing touched Hannah's (CODEX 73) side. Fixed by adding an explicit dependency note on CODEX 73 rather than silently assuming it's covered — see §6 step 2's note and a new cross-reference.

## 0D. Red team round 4 — 2026-08-27, gate edge cases closed

Round 4 reviewed the gate design itself (§0C) rather than process/bookkeeping — all three findings were real gaps in the implementation, now fixed in code, not just noted here:

1. **New-tenant default was unspecified — fixed.** `checkSafetyContactGate()` now uses a three-way policy instead of a plain opt-in boolean: explicit `true`/`false` on the tenant always wins; if unset, tenants **created on/after 2026-08-27** (this gate's ship date) default to **enforced**, and tenants that predate it default to **not enforced** (the opt-in migration window). This closes the exact risk the reviewer named — every tenant created from now on lands protected by default, without needing every ad-hoc tenant-creation code path in the repo to be found and patched individually (there's no single canonical `createTenant()` function to hook — the check is centralized in the gate itself instead, keyed off `tenant.createdAt`).
2. **Fail-open had no distinct alerting — fixed.** On a Firestore read error, the gate now writes a structured, queryable alert (`alertFeed/platform-ops/items`, `type: "safety_gate_check_error"`) in addition to the existing `console.error` — so a fail-open event is something ops can query and monitor on, not just log noise that scrolls by. **Correction (2026-08-27, CODEX 81 round 3):** "queryable" was never actually paired with a named consumer — nobody was ever told to watch `alertFeed/platform-ops`. Default now set in CODEX 81 §5 item 6 (Sean, weekly glance), covering this alert type and the one CODEX 81 added alongside it.
3. **"Blocking" behavior was unspecified — fixed, and documented precisely.** Confirmed and written down explicitly (in both the code comment and this doc): blocking substitutes a static "not fully set up yet" reply for that one gated tenant's worker responses. It returns a normal `200 {ok: true}`, never an error status, never throws, and has zero effect on any other tenant's `/chat:message` traffic. "Blocks" means "holds back this tenant's worker output," not "takes the endpoint down" — exactly the narrow behavior the opt-in design was meant to guarantee, now explicit rather than implied.

All three are in `services/safety/distressProtocol.js` and the ruleset's `required_before_production_activation` text, verified via `node --check` and a JSON parse. This closes the gate design as generic, reusable infrastructure — not just "done for the one tenant currently being launched."

## 1A. Timeline forcing function (2026-08-27, from Ruthie/Anne)

Two concrete, dated items, not general context:

1. **Data Governance / vendor request form — Zoom call next week (week of 2026-09-01).** Anne is filling out UH's vendor request/data-governance paperwork now (this is pre-signature — see §0's correction, the contract itself isn't executed yet) and has questions; she wants Sean and Ruthie on a call about it. This is the single most time-sensitive item in this whole CODEX — it's procurement-gating, not a nice-to-have. Practical implication: whatever this CODEX says about FERPA handling, data access scope, and escalation guardrails (§3.2, §4) needs to be **true and defensible in that call**, not just aspirational in a spec doc. The plain-language answer sheet already sent to Ruthie (2026-08-27) covers this, grounded in `docs/TRUST_AND_DATA_INTEGRITY.md` §14 (FERPA school-official designation) and the now-confirmed-live distress protocol (§0) — it also states honestly that the FERPA addendum's attachment to the DPA and the VPAT/WCAG accessibility status are still open, rather than overclaiming either.
2. **Anne wants the CET live on SOCIII by January.** This resets the priority of this CODEX from "worth doing for the current NURS-366 pilot" to "must be functioning before CET rolls out beyond the single test course." CET going live means Anne, Ruthie, and likely more faculty/students start generating real operational tickets at a materially higher volume than today's single-course pilot — the Support Worker and its guardrails should be live *before* January, not built reactively after ticket volume shows up.
3. **Subsidized human-support billing terms — decide before the Data Governance Zoom (red team round 2, Tier 2 #4).** This was originally an unscheduled §5 bullet; given it sits on the same January cliff as everything else (the demo default lapses 2026-12-31, the same month CET ramps up) and Anne could plausibly ask about post-trial support costs on the call itself, it now has the same deadline as item 1: **resolved before the Zoom, not after.** See §5.2 for the actual decision to make.

Net effect on sequencing (see §6): the Data Governance call is the near-term deadline that forces §3.2's guardrails, the FERPA answers, and the subsidized-billing decision to be nailed down now; the January CET date is the deadline that forces the rest of the worker (persona, escalation wiring, deflection metric) to actually be live, not just spec'd.

## 1. What already exists — reuse, do not rebuild

| Capability | File | Status |
|---|---|---|
| Tier 0/1/2 escalation model (AI free / contractor $45/hr / Sean goodwill) | `docs/codex/44-human-support-billing.md` | Real, spec'd, red-teamed |
| Escalation trigger: regex + LLM-intent + demo overlay + Alex core rule | `apps/business/src/components/ChatPanel.jsx`, universal prompt append in `index.js`, `services/alex/prompts/core.js` | Shipped 2026-07-19 |
| Consent-gate UI (`SupportEscalationCard.jsx`) | 6 phases: loading/subsidized/outside_hours/no_credits/ready/confirmed | Shipped |
| `POST /v1/support:escalate`, `GET /v1/support:status` | `index.js` | Shipped — writes `supportSessions/{id}`, emails sean@sociii.ai, SMS |
| Subsidized-tenant flag | `billing.humanSupportSubsidized` + expiry, set for Makai/UH in `scripts/seedMakaiNursingDemo.js` through 2026-12-31 | Shipped as a **demo-seed default only** — verified 2026-08-27 against the real Order Form thread that this has **no contractual backing** (UH Maui isn't signed yet, and the sent Order Form contains no support-tier language at all). Real open decision, not a reconfirmation — see §5.2. |
| Distress-disclosure protocol | `raas/rulesets/platform_distress_v1.json`, `services/safety/distressProtocol.js` | **Built, wired, and hardened** — `checkSafetyContactGate()` at the top of `/chat:message` in `index.js`. Enforcement: explicit `true`/`false` per tenant always wins; unset defaults to enforced for tenants created on/after 2026-08-27 (this gate's ship date), not enforced for older tenants (opt-in migration). Fails open on a Firestore error with a queryable ops alert, not silent. "Blocked" = a static substituted reply for that one tenant, normal 200 response, zero effect on other tenants (§0D). Regex gate → classifier → alert write → SMS pipeline has been live since 2026-08-17. **Caveat (round 3):** "committed to git" isn't the same claim as "running against live traffic" — confirm the deployed Cloud Functions revision actually includes this before relying on it in the Zoom call (§4.9). Setting `requireSafetyContactGate: true` for UH Maui's tenant, alongside `safetyContact`, is still a launch-checklist action item (§4.2) — belt-and-suspenders, since UH Maui's tenant will predate the new-tenant default either way. |
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

Today's Tier 0 (CODEX 45) is invisible infrastructure bolted onto every worker's prompt — it only activates on distress-style phrasing mid-conversation. That's correct for "student is stuck talking to Hannah," but it is not a worker Anne can go to proactively with "how do I add a new faculty account" or "did the consent form language get approved." Build a real, addressable Support Worker persona (**named Grace, resolved 2026-08-27 — see CODEX 80**) that:

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
- Cheapest version: a query over existing `supportSessions/{id}` docs, filtered on the **already-existing** `workerSlug == "program-support-001"` field (verified end-to-end 2026-08-27 — see CODEX 80 §3, Tier 2 finding 3 — no schema change needed) joined against Support Worker conversation count for the same tenant/period — purely a read-side aggregate. Could be a small script first, a dashboard tile later.
- **Sample-size caveat (red team Tier 2 #4, sharpened in round 2 Tier 3):** the real near-term denominator isn't just student count — §2 already establishes that Anne and Ruthie's account/ops traffic is expected to dominate this worker's usage, and neither is a "student" for pricing purposes. UH Maui's real Order Form starts at the first 5 active students free, scaling toward Anne's stated ~90 BSN students by F28, but the actual early-weeks denominator is closer to **student-count-plus-two** (Anne + Ruthie) than student count alone. At that volume, one escalated ticket swings the weekly percentage by double digits regardless of which population you count. Track it from week one regardless, but do not treat any single week's number as thesis-confirming or thesis-denying until volume is meaningfully higher than the opening NURS-366 pilot — read it as a trend across several weeks, not a weekly verdict.
- This is the actual deliverable that proves or disproves Sean's thesis — track it from week one of the UH Maui pilot, not retroactively.

### 3.4 — Ambiguous-request routing between Hannah and the Support Worker (red team Tier 2 #5)

The Hannah/Support-Worker boundary in §2 is clean on paper but real messages won't sort cleanly — e.g. "why isn't my student's evaluation showing up" is simultaneously an account/access question and a clinical-tool question. No routing rule existed for this overlap in the original spec. Fix: neither persona should guess. When a message plausibly spans both domains, the receiving worker should ask one clarifying question to disambiguate ("are you asking about accessing the evaluation tool, or about the clinical content/scoring itself?") rather than either (a) the Support Worker attempting a clinical-judgment answer, or (b) Hannah attempting an account-admin action she has no capability to execute. Default to the safer failure mode — surface/escalate — when the ambiguity can't be resolved in one turn.

## 4. Launch checklist for UH Maui / NURS-366 (operational, not building the worker itself)

1. Support Worker guardrails written and reviewed before any real student/faculty message reaches it (§3.2).
2. **Set UH Maui's `tenant.safetyContact` (name/phone/email) AND `tenant.requireSafetyContactGate: true` in Firestore** before this worker goes live to real users — updated 2026-08-27 (§0C): the gate itself is now built and wired (`checkSafetyContactGate()`), but enforcement is opt-in per tenant, so both fields need to be set explicitly for UH Maui; setting only `safetyContact` without the flag leaves the gate un-enforced for this tenant.
3. Confirm FERPA handling for anything this worker can see or say about student records — same standard as Hannah.
4. Give Anne a one-paragraph explanation of the support/escalation path (what Tier 0 handles, when a human gets looped in, expected response time) before the semester starts — she should not discover the escalation flow by triggering it live.
5. **Decide, don't just reconfirm, the subsidized-billing terms** (§5.2) — corrected 2026-08-27: the real Order Form has no support-tier language and UH Maui isn't signed yet, so there is nothing to reconcile the demo-seed default against. This needs an actual pricing decision before it's set for the live tenant.
6. Watch `supportSessions` and the new deflection metric (§3.3) closely for the first 2–3 weeks of the semester — first real institutional customer, worth the extra attention regardless of the automation thesis, and read as a trend, not a single week's verdict (§3.3 sample-size caveat).
7. Data Governance Zoom prep (week of 2026-09-01) is **done** — the answer sheet was sent to Ruthie 2026-08-27, grounded in `docs/TRUST_AND_DATA_INTEGRITY.md` and the now-confirmed-live distress protocol, and states the FERPA-addendum-attachment and VPAT/WCAG gaps honestly rather than glossing over them.
8. **Confirm Hannah's student-tutor mode (CODEX 73) is actually live before this worker redirects clinical questions to her** (red team Tier 3) — "redirect to Hannah" is a dead end if her build slips past this worker's launch. Check status at go-live, don't assume.
9. **Before the Zoom specifically (red team round 2 Tier 1 #1, sharpened round 3):** get one more independent surface of proof for the distress protocol beyond this CODEX's own code-read — (a) trigger a real test conversation against the regex gate and capture the resulting `alertFeed` write, and (b) confirm the **deployed** Cloud Functions revision actually includes this code (`firebase functions:log` or deploy history), not just that it's committed to git. §0B's terminal-output block proves the code exists in source control; it does not by itself prove what's running against live traffic.

## 5. Open decisions (Sean's call)

1. ~~Name/persona for this worker~~ — **resolved 2026-08-27: Grace.** Matches the platform's existing warm-first-name convention (Alex, Hannah), tenant-agnostic per the goal below. Full persona/system prompt in CODEX 80.
2. **Set real subsidized-billing terms — this is a pricing decision, not a reconciliation (corrected 2026-08-27, §0), now with a deadline (round 2, §1A item 3): before the Data Governance Zoom.** The real Order Form ($99/mo + $5/active student, first 5 free) has no human-support-tier language at all, and UH Maui hasn't signed yet. Decide explicitly: does SOCIII want to offer subsidized Tier 1 human support through some date as part of closing this deal (as the demo default implies), and if so, what date — noting the current demo default (`2026-12-31`) lapses in the same month Anne wants CET to go live platform-wide, which is exactly when escalation volume is likely to increase. Whatever is decided should go into the actual signed Order Form/DPA, not just a Firestore flag copied from a demo seed script.
3. **SLA hours for Hawaii-timezone escalations.** CODEX 45 already flagged this as unresolved: 4 business hours Mon–Fri Pacific was proposed, but nursing students often study nights/weekends — confirm whether that SLA actually holds for this account or needs a Hawaii-aware exception. Compounding factor (red team Tier 3): a Tier-0 miss at 11pm Saturday currently has no stated behavior beyond "unresolved" — worth a concrete answer (e.g., what the student actually sees when they're outside subsidized/Tier-1 availability), not just a flagged open question.
4. **Scope of Grace vs. future accounts.** Should this be built as a generic, tenant-agnostic Support Worker template from day one (more upfront work, directly reusable for the next institutional customer), or scoped tightly to UH Maui first and generalized after it's proven? **Resolved 2026-08-27, per CODEX 80:** built generically from the start — Grace's system prompt is tenant-agnostic except for a single `{{PROGRAM_NAME}}` token; the guardrails in §3.2 are not UH-Maui-specific; only the Locker content (Order Form terms, onboarding FAQ) stays per-tenant as it naturally would anyway.

## 6. Suggested build order

**Resequenced 2026-08-27 around the two real dates in §1A** — the Data Governance call (week of 2026-09-01) and the January CET launch.

0. ~~Write the FERPA/data-governance answer sheet~~ — **done**, sent to Ruthie 2026-08-27 (§4.7).
1. ~~Confirm UH Maui's `tenant.safetyContact` is configured~~ — superseded by 1a below (setting the field alone doesn't enforce anything without the flag).
1a. ~~Build the deploy-time `tenant.safetyContact`-required activation gate itself~~ — **done, 2026-08-27** (`checkSafetyContactGate()` in `distressProtocol.js`, wired in `index.js`, opt-in per tenant via `requireSafetyContactGate`, ruleset text updated). Remaining action is tenant-specific, not a build item: set both `safetyContact` and `requireSafetyContactGate: true` for UH Maui's real tenant doc before go-live (§4.2) — this is data entry against a real gate now, not a code task.
2. ~~Write the Support Worker's system prompt + guardrails~~ — **done 2026-08-27** (§3.1–3.2, including the ambiguous-routing rule in §3.4 — prompt-level redirect only, no programmatic handoff, per round 2 Tier 2 #6). Full persona (named **Grace**) and prompt text in CODEX 80. Also fixed as part of that build: `ChatPanel.jsx`'s Layer 1 regex was hard-intercepting the exact "can't access X" messages Grace exists to answer, before she ever saw them — split so explicit human requests still intercept immediately for every worker, but Grace gets first crack at implicit-trouble phrasing (CODEX 80 §3, Tier 1). **Dependency (round 3, new finding 3) — still owed:** §3.4's routing fix is symmetric — Hannah also needs to ask a clarifying question rather than guess when approached about something account-related. Grace's side is done; Hannah's side is a CODEX 73 touch-up, not covered here.
2a. **Locker-ground the Support Worker on UH Maui's real Order Form/onboarding content** (round 3, new finding 2 — split out of step 2, which had wrongly bundled tenant-specific content into a step the contingency paragraph called tenant-agnostic). **This step is UH-Maui-specific and contingent on signature**, unlike step 2's generic persona/guardrail logic.
3. Wire it as an addressable worker/persona in the tenant's chat surface (not just the silent regex layer) — reuses `POST /v1/support:escalate` and the consent-gate UI unchanged.
4. **Decide and set the real subsidized-billing terms for the live UH Maui tenant** (§5.2) — a pricing decision to make **before the Data Governance Zoom** (§1A item 3), not a config value to copy from the demo seed.
5. ~~Add a `sourceWorker` field to `supportSessions` writes~~ — **removed 2026-08-27, superseded by CODEX 80's finding**: the field already exists as `workerSlug`, already correctly populated end-to-end. No schema change needed.
6. Ship the Tier-0 deflection-rate report, **scoped to the Support Worker specifically** (§3.3), filtered on the existing `workerSlug` field — even a one-off script counts as shipped for week one; a dashboard tile can follow. Not yet built (CODEX 80 §5).
7. Send Anne the escalation-path summary (§4.4) before go-live.
8. **Confirm Hannah's student-tutor mode (CODEX 73) is live** before treating "redirect to Hannah" as a real fallback (§4.8).
9. Monitor weeks 1–3 closely; read the deflection number as a multi-week trend, not a single-week verdict (§3.3 sample-size caveat), and decide whether it validates the no-FTE thesis for *informational* support load specifically (§3.2's scope caveat) or reveals gaps this worker can't cover.

**All of 1–7 above should be genuinely done well before January**, not just started — CET going live is when real ticket volume beyond the single NURS-366 pilot actually shows up, and this worker exists specifically so that volume doesn't require a hire.

**Contingency (round 2 Tier 2 #3, corrected round 3 finding 2):** step 1a (the gate — already built) and step 2 (the Support Worker's generic persona/guardrail logic, not its Locker content) proceed now regardless of UH Maui's signature status — genuinely tenant-agnostic infrastructure that benefits whichever institutional tenant signs first. Steps 2a (Locker-grounding on UH Maui's actual content), 3 (wiring the persona into UH Maui's tenant), 4 (setting UH Maui's live billing flag), 7 (sending Anne the summary), and 8–9 (UH Maui-specific monitoring) are contingent on the deal actually closing — if data governance comes back with blockers, or January passes without signature, those steps simply have no live tenant to apply to yet. Step 5 no longer exists (superseded — see above); step 6 (the deflection report) is tenant-agnostic and can be built and tested against any existing tenant's `workerSlug` data, even before UH Maui's own numbers exist. This CODEX's priority does not pause; the tenant-specific tail of it does, by necessity.

---

## Cross-references

- `docs/codex/44-human-support-billing.md` — Tier 0/1/2 billing model this worker reuses unchanged
- `docs/codex/45-support-escalation-and-human-billing.md` — the escalation trigger + consent-gate infra this worker sits on top of
- `docs/codex/66-worker-persona-and-distress-protocol.md` — distress protocol, shared hard prerequisite with CODEX 73
- `docs/codex/73-nurs366-hannah-student-tutor-and-study-pipeline.md` — Hannah's tutoring build; this CODEX explicitly does not duplicate it (§2). **Round 3 dependency:** §3.4's ambiguous-routing fix needs a small touch-up on Hannah's own prompt (ask a clarifying question rather than attempt account-admin actions) — not yet scoped into CODEX 73, flagged here as owed to that CODEX, not assumed covered by this one.
- `docs/codex/80-grace-program-support-worker-persona.md` — the actual persona, system prompt, and build for the Support Worker named here — resolves §5.1's naming decision and corrects §3.3/§6's `sourceWorker` assumption
- `docs/codex/81-grace-reach-routing-content-loop-adoption.md` — the actual no-FTE thesis (routing, content-freshness loop, adoption), rescoped out of CODEX 80 after a red team found persona quality alone can't get there
- `docs/TRUST_AND_DATA_INTEGRITY.md` — the real trust/security doc the Data Governance answer sheet was built from (§0, §1A, §4.7)
- Gmail thread "SOCIII / UH Maui College — Order Form for review" (2026-08-25/26) — source of the real, unsigned Order Form terms verified in §0. **Round 2 note:** a private email thread is a weak citation for anything that needs to hold up externally (a UH auditor, a future SOCIII hire without inbox access) — swap this citation for the executed Order Form document itself once UH Maui actually signs.
