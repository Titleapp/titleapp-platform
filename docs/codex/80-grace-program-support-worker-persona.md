# CODEX 80 — Grace: Program Support Worker Persona, System Prompt & Guardrails

**Status:** 🟢 built and wired 2026-08-27 (self-red-teamed, one round, before build)
**Owner:** Sean / Claude Code
**Date:** 2026-08-27
**Trigger:** CODEX 79 specs the Program Support Worker but leaves its name/voice as an open decision (§5.1, placeholder "Front Desk"). Sean: *"pick one that is comforting for people. And build up the codex first please. You know the drill. Codex, Red team, refinement, then build the deploy."*

**Naming decision, resolved:** **Grace.** Matches the platform's existing convention of plain, warm human first names for personas (Alex — Chief of Staff, Hannah — tutor) rather than a functional label ("Front Desk"). The word itself carries the tone this worker needs — ease, patience, no judgment — and it's tenant-agnostic, which matters since CODEX 79 wants this persona reusable beyond UH Maui.

---

## 1. Scope (inherited from CODEX 79 §2–§3, not re-litigated here)

Grace is the operational front door for an institutional account — access/onboarding/"how do I" questions from faculty and students — never coursework, never clinical judgment, never unilateral account changes. Hannah stays the tutor. See CODEX 79 for the full boundary; this CODEX is about Grace's actual persona and prompt, not the architecture around her.

## 2. The system prompt (tenant-agnostic template)

```
You are Grace, the program support assistant for {{PROGRAM_NAME}} on SOCIII.

YOU SERVE: faculty, program administrators, and students who have a question
about the PLATFORM or the PROGRAM'S OPERATIONS — not the coursework itself.
Think: "how do I," "where do I find," "who do I talk to," "is this set up
correctly" — not "explain this concept" or "grade my reflection."

WHAT YOU KNOW: only what's actually been loaded into your Studio Locker for
this program — onboarding steps, account setup, the program's own FAQ, and
whatever operational documentation the program has given you. If something
isn't in there, say so plainly. Never guess at a process you don't actually
have documented, and never state a policy, price, or deadline you can't
point to in your locker.

WHAT YOU DO:
- Answer account/access/setup questions directly, using your locker content
- Walk someone through a "how do I" step by step, patiently, without jargon
- Tell someone plainly when you don't have the answer, and what to do next
- Recognize when a question actually belongs to the course tutor, not you

WHAT YOU DO NOT DO:
- Discuss clinical content, coursework, or grading — that's the course
  tutor's job. If a question is really about the material, say so and point
  them there rather than attempting it.
- Make an actual account or role change yourself (adding a faculty account,
  changing permissions, resetting something in a system of record). You can
  tell someone exactly what needs to happen and who can do it — you don't
  execute it. Say what you'd need to make it happen, not that you've done it.
- Resolve a billing dispute beyond what you're explicitly told is
  pre-authorized for this program.

AMBIGUOUS QUESTIONS — DO NOT GUESS:
Some questions sound like yours but are actually about coursework, or vice
versa — e.g. "why isn't my student's evaluation showing up" could be an
access problem (yours) or a scoring/content question (not yours). When it's
genuinely unclear which, ask ONE clarifying question to find out before
answering — do not guess, and do not attempt a clinical-judgment answer to
sound helpful. If it's still unclear after that one question, say plainly
that you want to make sure they get the right help and suggest they also
reach out to their course tutor or instructor.

WHEN YOU GENUINELY CAN'T HELP: try to answer from your locker content first,
step by step, before considering escalation — that's the entire reason this
role exists, so someone doesn't have to wait on a person for something you
can walk them through directly. Only if you've actually tried and the
locker genuinely doesn't cover it should you fall back to the platform's
standard support path.

TONE: warm, plain-spoken, patient. Faculty and students may be stressed,
busy, or unfamiliar with the platform — never make anyone feel behind for
asking something basic. Short, clear answers over long ones. No jargon
unless they used it first.
```

`{{PROGRAM_NAME}}` is the one piece of tenant-specific content in an otherwise reusable prompt — filled from the tenant's actual name at registration (e.g. "UH Maui College's NURS-366 program"), consistent with CODEX 79 §0C's split between tenant-agnostic guardrail logic and tenant-specific Locker content.

## 3. Self-red-team pass — 2026-08-27, before build

Sean asked for the full drill run in one pass. Two real, codebase-specific findings — not generic prompt-engineering commentary — plus one correction to CODEX 79 itself.

### Tier 1 — blocking, must fix before this is usable

**1. The platform's existing pre-LLM regex would intercept exactly the messages Grace exists to answer, before she ever sees them.** `ChatPanel.jsx`'s Layer 1 escalation trigger (`_escalationRe`, line ~1536) matches `\b(can't|cannot)\s+(log[\s-]*in|sign[\s-]*in|get\s+in|access)\b` and immediately shows the support-escalation consent card — **no LLM call happens at all.** A student typing "I can't access the evaluation tool" — precisely Grace's core competency — would never reach her; it goes straight to the human-escalation path. Left as-is, Grace can never resolve the exact category of question CODEX 79's deflection metric is supposed to measure her on. **Fix:** split the regex into (a) explicit human-request phrases ("talk to a human," "contact support," "need human help") — always honored immediately, for every worker, since overriding an explicit request for a person undermines user consent — and (b) implicit-trouble phrases ("can't log in," "can't access," "something broken/crashed") — still hard-intercepted for every other worker (correct default; Hannah, Skye, etc. aren't built to handle these), but **skipped specifically when Grace is the active worker**, letting her attempt her own answer first. Implemented in §4 below.

**2. The universal LLM-level SUPPORT ESCALATION rule is appended *after* every worker's prompt specifically to act as a "final override" (`index.js`, the comment literally says so) — which could push Grace toward reflexive escalation on borderline phrasing even when she has a real answer.** This is a softer, model-judgment-level version of finding 1, not a hard regex block, so it's fixable in Grace's own prompt rather than in shared platform code: her prompt now explicitly instructs her to attempt her own answer from locker content *first*, and only fall back to the standard path if she's actually tried and it isn't covered (see "WHEN YOU GENUINELY CAN'T HELP" in §2). This doesn't change the universal rule for any other worker — it just gives Grace, specifically, a clear instruction not to treat every "access" mention as an automatic hand-off.

### Tier 2 — correction to CODEX 79, not a new problem

**3. CODEX 79 §3.3/§6.5 proposed adding a new `sourceWorker` field to `supportSessions` writes as its own schema-change build step — unnecessary. The field already exists, under the name `workerSlug`, and is already correctly populated end-to-end:** `ChatPanel.jsx` computes `_activeSlug` → passes it through `structuredData.workerSlug` → `SupportEscalationCard.jsx` forwards it as `workerSlug` in the `/v1/support:escalate` request body → the backend writes it straight onto the `supportSessions` doc. Verified by reading all four points in the chain, not assumed. **This removes an entire build step from CODEX 79** (no schema change, no rollback plan needed) — the deflection-rate report can query the existing `workerSlug` field directly once Grace's slug (`program-support-001`) exists to filter on. CODEX 79 updated to reflect this (§6, §3.3).

## 4. What got built

1. **Grace registered as a real, addressable worker** — `program-support-001` in `DEMO_WORKER_FALLBACKS` (the same registry Hannah/Morgan/Clara/Skye live in, in `index.js`), with the system prompt from §2 and `{{PROGRAM_NAME}}` filled per-tenant.
2. **`ChatPanel.jsx`'s Layer 1 regex split** (Tier 1 finding 1) — explicit human-request phrases still intercept immediately for every worker; implicit-trouble phrases skip the pre-LLM intercept specifically when Grace is active, letting her attempt an answer first.
3. **CODEX 79 corrected** (Tier 2 finding 3) — the `sourceWorker` schema-change step removed; the deflection-rate report now specified against the existing `workerSlug` field.

## 5. Still open (not built this pass, scope bounded deliberately)

- **The deflection-rate report itself** — CODEX 79 §3.3's query, now simpler (filter existing `supportSessions.workerSlug == "program-support-001"`), but not yet written as a script or dashboard tile.
- **Locker-grounding Grace on UH Maui's actual content** — contingent on signature, per CODEX 79 §6 step 2a.
- **A `digitalWorkers/program-support-001` catalog doc + admin bootstrap route**, mirroring Hannah's `/admin:bootstrap-nursing-education-001`, if Grace needs to appear in a worker-picker UI rather than only being reachable by slug.
- **CODEX 73 touch-up** for Hannah's side of the ambiguous-routing fix (CODEX 79 round 3 finding, still owed, not this CODEX's job to close).

---

## Cross-references

- `docs/codex/79-program-support-worker-uh-maui-no-fte-scaling.md` — the architecture and thesis this persona serves; corrected in §6/§3.3 per Tier 2 finding 3 above
- `docs/codex/44-human-support-billing.md`, `45-support-escalation-and-human-billing.md` — the escalation/billing infra Grace sits on top of unchanged
- `apps/business/src/components/ChatPanel.jsx` — Layer 1 regex, modified per Tier 1 finding 1
- `functions/functions/index.js` — Grace's registration (`DEMO_WORKER_FALLBACKS`) and the universal SUPPORT ESCALATION append her prompt works around (Tier 1 finding 2)
