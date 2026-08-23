# CODEX S52.63 — Persistent Memory & Cross-Worker Understanding

**Status:** DRAFT — awaiting Sean's review/sign-off before build proceeds.
**Author:** Sean Lee Combs + Claude Code (2026-08-22)
**Predecessors:** CODEX S52.48 (Max Agentic Loop & Worker-Knowledge Consolidation — the 14-system knowledge/rules audit, adjacent to but distinct from this doc), CODEX-S52.61 (Add-Client — the client-onboarding/consent flow this doc's privacy section depends on), `docs/codex/68-studio-locker-architecture.md` (Studio Locker — a knowledge-freshness system, confirmed below to be a genuinely different problem from what this doc addresses).
**Origin:** Sean, reviewing live MSR and Title demos, 2026-08-22: workers should have persistent memory of prior conversations, and "cross-sibling understanding" between workers on the same tenant.

---

## Why this exists — and why it's two problems being asked as one

Sean's request bundles two related but distinct capabilities:

1. **Persistent memory** — a worker remembering a prior conversation with the *same* client/user, across sessions. Today, every chat session starts cold.
2. **Cross-sibling understanding** — one worker being aware of what a *different* worker discussed or decided with the same client/tenant. Today, this barely exists, and where it does, it's scoped to uploaded documents, not conversations.

Both are real gaps. Neither is a small patch on existing infrastructure — this codex exists to scope them honestly before any build starts, the same discipline CODEX S52.48 applied to the knowledge/rules mess.

---

## Part 1 — What actually exists today, verified directly (not guessed)

**No general persistent conversation memory exists.** A full search of `services/alex/` (the chat orchestration layer) and `functions/functions` for memory/summarization/recall patterns found exactly one real hit: `services/alex/guestSummary.js` — a one-off post-session summary generator for guest/sales chat sessions (marketing lead capture). It writes a summary; nothing reads it back into a future session's prompt. Every other worker starts every session with zero awareness of prior sessions with the same client. Zero matches anywhere in the codebase for `previousSession`, `priorSession`, or `pastConversation`.

**Partial cross-worker awareness exists, but only for uploaded documents, not conversations.** `services/alex/promptBuilder.js`'s `buildVaultSummarySection()` (~line 260-284) formats a tenant-wide summary of Vault documents, tagged by `[workerSlug]`, and folds it into every worker's prompt — so a document uploaded via one worker is visible (as a summary) to a sibling worker's prompt. This is real, working, and proves a pattern (tag by workerSlug, fold into prompt) — but it only covers files, never conversation content, decisions, or client interactions.

**Studio Locker is a different system, confirmed, not a memory system.** `docs/codex/68-studio-locker-architecture.md` describes a knowledge-freshness and trust-tiering system for reference documents (regulations, fee schedules, clinical standards) — it answers "is this document still trustworthy to cite," not "what happened in a past conversation" or "what does a sibling worker already know about this client." Easy to conflate by name association; genuinely unrelated to this codex's problem.

**CODEX S52.48's 14-system audit is adjacent infrastructure, not this either.** That consolidation (admin-authored `constraintRaasModules` + tenant-editable `tenantLocker`) governs what *rules and reference knowledge* a worker is grounded in — not what happened in prior conversations. Even fully consolidated, it doesn't give one worker awareness of another's conversation history with the same client. Worth knowing so this codex doesn't get scoped as "finish S52.48 and this is solved" — it isn't.

**Bottom line:** this is close to a from-scratch build. The one proven analog (Vault cross-tagging) is a useful architectural pattern to reuse, not an existing feature to extend.

---

## Part 2 — Two capabilities, scoped separately

### 2.1 Persistent memory (same worker, same client, across sessions)

**What it should do:** when a client (staff user or, per CODEX S52.61's new client-portal flow, an actual external client) starts a new session with a worker they've talked to before, the worker should have access to a durable summary of what was previously discussed — not the raw transcript, a summary, the same idiom `guestSummary.js` already proves out for one narrow case.

**Candidate approach:** generalize `guestSummary.js`'s pattern platform-wide. After a session ends (or on a rolling basis during a long session), generate a structured summary — key facts established, open items, decisions made — and write it as an **append-only event** (consistent with this platform's core invariant: "all canonical records are event-sourced; never overwrite," per CLAUDE.md) to a new collection, e.g. `workerMemory/{tenantId}/{workerSlug}/{contactId}/events`. On a new session, fold the most recent N summaries (or a running summary-of-summaries once the history gets long) into the worker's system prompt, the same "read live, compose at chat time" idiom CODEX S52.48 established for knowledge content.

**Real open question, not resolved here:** summary generation costs a model call. Doing this after every single turn is expensive; doing it only at session-end risks losing a summary if a session drops ungracefully. Needs its own design pass on trigger timing — flagged, not decided.

### 2.2 Cross-sibling understanding (worker A aware of worker B's history with the same client)

**What it should do:** when Contacts (Sage) or Accounting (Max) or any other worker is asked about a client, it should be able to surface relevant context from what that same client discussed with a *different* worker — the same way `buildVaultSummarySection()` already does for documents, generalized to conversation summaries.

**Candidate approach:** if 2.1 ships first, this is a materially smaller lift — it becomes "read the same `workerMemory/{tenantId}/*/{contactId}/events` path across *all* worker slugs for this tenant+contact, not just the current worker's own slug," reusing the exact tag-and-fold pattern `buildVaultSummarySection()` already proves works in production. This is the strongest argument for sequencing 2.1 before 2.2 rather than building them as one combined system.

**Real open question:** how wide is "cross-sibling"? Every worker on the tenant, or only a defined cluster (e.g., the "Back of House" workers Sean already groups together in the demo nav)? A staff-facing worker (Accounting) seeing a summary of a client's conversation with a customer-facing worker (the Title client portal) raises a real scope question, addressed next.

---

## Part 3 — The privacy question this doc cannot skip

CODEX S52.61 (shipped today, same session) just built real, external, client-facing portal access — a title company's actual client, or a DPP manufacturer's authorized signer, now talks to a worker directly, gated by an e-signed consent disclosure. If cross-sibling memory means a **staff-facing** worker (internal Accounting, HR) can see a summary of what an **external client** said to a **customer-facing** worker, that is a materially different privacy surface than two internal staff workers sharing context about the same internal matter — and CODEX S52.61's disclosure language was never written with "this conversation may be summarized and shared with other workers on this platform" in mind.

**This needs an explicit decision, not a default:** does cross-sibling memory apply only among internal/staff-facing workers, or does it include client-facing conversations too? If the latter, CODEX S52.61's disclosure templates (`DISCLOSURE_TEMPLATES` in `clientOnboarding.js`) need updated consent language before this ships — not after.

---

## Part 4 — Token budget, learned the hard way once already

CODEX S52.48's addendum already caught a real version of this exact mistake: Studio Locker's 600k-character injection budget was reasoned against Claude's real context window, but a separate 8k-token budget elsewhere was never reconciled against it — harmless only by accident, because that second system was empty. Any memory-summary injection this codex proposes adds a **third** budget line competing for the same context window, alongside Studio Locker's knowledge injection and whatever `constraintRaasModules` content applies. This needs to be sized and reconciled against the other two before it ships, not discovered the same way after the fact.

---

## Recommended sequencing (proposal, not a decision)

1. Build 2.1 (persistent memory, single worker/single client) first — smaller surface, no cross-sibling privacy question yet, reuses the `guestSummary.js` idiom directly.
2. Resolve Part 3's privacy scope decision before touching 2.2 at all.
3. Build 2.2 (cross-sibling) as a generalization of 2.1's storage, reusing `buildVaultSummarySection()`'s tag-and-fold pattern.
4. Reconcile the token budget (Part 4) as part of 2.1's design, not deferred to 2.2.

## Open decisions needing Sean's sign-off

- Summary-generation trigger: end-of-session, rolling during long sessions, or both.
- Cross-sibling scope: all workers on a tenant, a defined cluster (e.g. "Back of House" only), or per-worker opt-in.
- Whether client-facing (customer-portal) conversations are ever included in cross-sibling memory, and if so, what CODEX S52.61's disclosure language needs to say about it before it ships.
- Retention/staleness policy for memory events — does a memory item ever expire, or is "append-only, keep forever" the right default here the same way it is for the audit-trail pattern elsewhere on this platform.
- Token budget allocation for memory injection, reconciled against Studio Locker's existing 600k-char cap.
