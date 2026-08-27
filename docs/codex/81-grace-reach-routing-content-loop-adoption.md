# CODEX 81 — Grace's Actual Reach: Routing, Content-Freshness, and Adoption

**Status:** 🟡 two of three structural gaps built this session; the third (adoption) is a people problem, not a code one, and is specified but not "solved"
**Owner:** Sean / Claude Code
**Date:** 2026-08-27
**Trigger:** A red team on CODEX 80, evaluated against the actual bar CODEX 79 sets ("can this carry 99% of support load with zero human hires," not "is this a reasonable worker"), found that a well-written persona sitting on a static knowledge base with no cross-persona routing can't get anywhere near that number — no matter how good the prompt is. Sean: *"I think we have to step back here and rescope your codex."*

**What changed from CODEX 80:** CODEX 80 is now correctly scoped to just Grace's persona and system prompt — that part held up in review. This CODEX owns the three things that actually determine whether the no-FTE thesis is real: (1) does Grace ever see the traffic she exists for, (2) does her ceiling rise over time or stay fixed at day-one Locker content, (3) does anyone actually go to her instead of texting a person they already know. None of these are prompt-engineering problems.

---

## 1. Routing — built and verified this session

**The gap:** if a message like "I can't access the evaluation tool" is typed to Hannah (plausibly where most people land first), `ChatPanel.jsx`'s Layer 1 regex hard-intercepted it to human escalation before Grace — or anyone — ever got a chance. CODEX 80's fix only covered the case where Grace was *already* the active worker; it did nothing for the far more common case where someone is mid-conversation with a different persona entirely.

**What got built:**
- `ChatPanel.jsx`'s escalation logic is now a genuine three-way split: **explicit** human requests ("talk to a human") always intercept immediately, for every worker — overriding that would undermine real consent. **Implicit trouble** phrasing ("can't access X," "something's broken"), when the active worker is *not* Grace, now triggers a visible, deterministic handoff: a short message ("let me bring in Grace...") plus an actual worker switch, reusing the same `ta:select-worker` mechanism the platform already uses for the `[[SWITCH_WORKER:...]]` marker elsewhere (CODEX 50.28) — same pattern, just triggered client-side before any network call instead of parsed out of an LLM response. When Grace herself is already active, implicit-trouble phrasing falls through to her directly, as CODEX 80 originally specified.
- **A real dependency this surfaced:** the switch only works if Grace's slug exists in the live worker catalog (`digitalWorkers/*` in Firestore, read by `useWorkerCatalog()`). She wasn't in it — only in the backend's inline prompt registry. Added `/admin:bootstrap-program-support-001` (mirrors the existing Hannah bootstrap route exactly) to publish that catalog doc. **This route has to actually be run once, per the same "commit ≠ deployed" discipline CODEX 79 took five rounds to establish — it is not run yet.** Until it is, the code fails safe: `ChatPanel.jsx` checks for Grace in the catalog before attempting the switch, and falls back to the old human-escalation path with a console warning if she isn't found, rather than silently dropping the message.

**Explicitly not done — and stated honestly rather than asserted away:** the reviewer's finding #5 (no evidence the prompt-level "try first" instruction actually beats the universal SUPPORT ESCALATION append, which the code's own comment calls a "final override") is **still open** for the case where Grace is already the active worker. The routing fix above sidesteps this for the Hannah→Grace handoff case specifically, but doesn't resolve it for someone who opens a conversation with Grace directly and phrases a real question ambiguously. That needs an actual test transcript against a deployed environment — not available in this session — before it's trusted. Flagged as the top item in §4.

## 2. Content-freshness loop — built this session

**The gap:** Grace's system prompt (correctly) tells her to say "I don't have that" rather than guess. But nothing described what happens to that miss afterward. Without a loop, the same gap recurs for the next person forever, and her effective ceiling is fixed at whatever the Locker happened to contain on day one — 99% never becomes achievable, only asymptotically approached by luck.

**What got built:**
- Grace's system prompt now instructs her to end a reply with `[[CONTENT_GAP: one-sentence description]]` — invisible to the person she's talking to — specifically and only when she's genuinely tried to help from her Locker and come up short. Not on every message; not instead of trying.
- `ChatPanel.jsx` parses that marker out of her response (same pattern as the `SWITCH_WORKER` marker), strips it from what the user sees, and fires a non-blocking `POST /v1/support:content-gap`.
- The new backend route writes to a `supportContentGaps` Firestore collection: `tenantId`, `workerSlug`, the gap description, `status: "open"`, timestamp. Fails silently (returns `ok: true` either way) so a logging failure never interrupts someone's actual conversation with Grace.

**Explicitly not done:** this is a *log*, not a *loop* yet. Nothing currently reads `supportContentGaps` — no digest email, no admin view, no automatic Locker update. Closing the loop for real means someone (Ruthie, most likely, since she owns the program's operational content) periodically reviews this collection and updates Grace's Locker. That's a process step, not a code one, and it's listed as an open action in §4 rather than assumed to happen on its own.

## 3. Adoption — specified, not solved, because it isn't a code problem

**The gap, restated precisely:** the actual pattern that triggered this whole CODEX was Anne texting Ruthie, who texted Sean. Grace living inside the chat surface does nothing for that pathway unless Anne's own habit changes to "ask Grace first." No amount of routing or content-loop engineering fixes a behavior-change problem.

**What this needs (not yet done, needs Sean/Ruthie, not more code):**
1. Anne needs to actually be told Grace exists and how to reach her — not discovered by accident. This belongs in the escalation-path summary CODEX 79 §4.4 already calls for sending her before go-live; it should explicitly say "try Grace first" rather than only explaining what happens *after* something breaks.
2. The first few times Anne texts Ruthie out of habit instead of asking Grace, that's expected, not a failure — the plan should say what happens then (Ruthie redirects her to Grace for that specific question, rather than just answering it herself, so the habit actually shifts) rather than leaving it to chance.
3. This is worth watching in the deflection metric once it exists (§1's dependency, CODEX 79 §3.3) — but the metric can only measure traffic that reaches Grace at all. If Anne never tries her, a perfect deflection rate on zero volume looks identical to success and isn't. Worth an explicit, separate check: is Anne (or Ruthie, on her behalf) actually initiating contact with Grace at all in week 1–2, independent of what the deflection percentage says.

## 4. Structural ceiling — stated explicitly, per the reviewer's Tier 2 finding

The "always honor an explicit request for a human" design (§1) is the right call ethically — overriding someone's stated wish for a person would be worse than a lower deflection number. But it means **some fraction of traffic reaches for that phrase out of impatience or lack of trust, especially early on, regardless of how good Grace is.** This is a real, structural cap below 100%, not a bug to be engineered away. CODEX 79's ≥90% target should be read against this ceiling, not as if 100% were the honest asymptote.

## 5. What's actually open, ranked

1. **Run `/admin:bootstrap-program-support-001`** — without this, the routing fix in §1 fails safe to the old behavior every time (harmless, but Grace's whole reach depends on this one step happening).
2. **Get a real test transcript** verifying Grace attempts an answer rather than reflexively escalating on borderline "can't access" phrasing said directly to her — the one part of §1's fix that's still an assertion, not a verified behavior.
3. **Decide who reviews `supportContentGaps` and how often** — the loop in §2 only closes if someone actually looks.
4. **Write the actual adoption plan for Anne** — §3, needs Sean/Ruthie's input on tone and timing, not more engineering.
5. **The deflection-rate report itself** (CODEX 79 §3.3/§6) — still not built; now that routing exists, it can finally measure something real once it is.

---

## Cross-references

- `docs/codex/79-program-support-worker-uh-maui-no-fte-scaling.md` — the thesis this CODEX exists to make real, not just claimed
- `docs/codex/80-grace-program-support-worker-persona.md` — Grace's persona/prompt, now correctly scoped to just that
- `apps/business/src/components/ChatPanel.jsx` — the three-way escalation split (§1) and the `CONTENT_GAP` marker parsing (§2)
- `functions/functions/index.js` — `/admin:bootstrap-program-support-001`, `/v1/support:content-gap`, and Grace's updated system prompt
