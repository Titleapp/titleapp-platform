# CODEX S52.48 — Max Agentic Loop & Worker-Knowledge Consolidation

**Status:** DRAFT — awaiting Sean's review/sign-off before build proceeds. Sequenced ahead of HR/Marketing/Contacts/IR evaluation per Sean's direction: fix the platform-level foundation once, rather than repeat the same half-baked pattern per worker.
**Author:** Sean Lee Combs + Claude Code (2026-08-15)
**Predecessors:** CODEX-S52.23-Audit-Trail-Architecture (established `constraintRaasModules`), `raas/horizontal/GLOBAL/ACCT-001-gaap-reconciliation-rules.md` (the ruleset that surfaced this whole investigation)
**Applies to:** `platform-accounting` first (proof of pattern), then every Back of House worker (`platform-hr`, `platform-marketing`, `platform-contacts`, `investor-relations`/`ir-worker`, and any future one).

---

## Why this exists — two problems, one root cause

**Problem 1 — Max cannot verify like a careful human can.** Today's chat loop for `platform-accounting` is architecturally single-shot: one model call, at most one tool call, one fixed follow-up. There is no way for Max to read one statement, decide it needs a second source, read that too, then compare and answer — the exact pattern that actually caught today's real errors.

**Problem 2 — worker knowledge/rules grounding is not one system, or four, but at least fourteen**, built up over many sprints without consolidation ("vibe coding," Sean's own diagnosis). A full audit (2026-08-15) found:

### Complete inventory & disposition

| # | Mechanism | File(s) | Status today | Disposition |
|---|---|---|---|---|
| 1 | `constraintRaasModules/{moduleId}` | `services/raas/workerPromptComposer.js`, `constraintModules.js` | **LIVE.** Admin-authored, versioned, draft→review→live workflow. Today's `accounting_gaap_v1` lives here. | **CANONICAL — the one admin-rules system.** |
| 2 | `studioLocker/{vertical}/baseline`+`tenants` | `services/studioLocker/index.js` | **LIVE for non-`platform` verticals only** — real two-tier precedence/conflict logic, but gated to skip every Back of House worker. | **PORT the precedence/conflict-resolution logic** into the canonical composer (below); retire this collection for `platform-*` workers once ported. Leave it running as-is for real-estate/auto/etc. verticals — not broken there, just out of scope for this consolidation. |
| 3 | `raas/rulesets/*.json` + `services/sandbox/tenantLocker.js` + `WorkerLockerPanel.jsx` / `WorkerLibrarySection.jsx` / `VaultDocuments.jsx` | static files + Firestore `tenantLockers/{tenantId}/workers/{workerId}/documents` | **LIVE**, confirmed injected (index.js ~4157–4170) — real, working, user-facing UI, already used for real content (e.g. nursing's OpenStax textbook load). | **CANONICAL — the one tenant-editable knowledge system.** Repoint its `buildSystemDocs()` to read live from `constraintRaasModules` instead of the static JSON files (see Part 2). |
| 4 | `services/sandbox/studioLocker.js` | Sandbox worker-authoring ingestion | **LIVE**, different lifecycle (creator building a *new* worker). | **Leave alone** — not part of this consolidation. |
| 5 | `knowledgeService/index.js` (`loadWorkerKnowledge`) | static markdown (brand guidelines, feature boundaries) | **LIVE**, injected for every `platform-*` slug (index.js ~4098). | **FOLD IN** as `constraintRaasModules` sections (or tenant-tier docs if genuinely per-tenant-editable) — stop it being a third silent injector. |
| 6 | `dw.knowledgeBase` inline field | `digitalWorkers/{slug}` doc | **LIVE** (index.js ~4110), creator-authored at publish time. | **FOLD IN** to the tenant/creator tier — one field, one place creators edit worker-specific grounding. |
| 7 | `services/alex/knowledge/*.md` (e.g. nursing context) | static per-worker files + `CREATOR_KNOWLEDGE` map | **LIVE**, view-mode-aware (student/instructor directives). | **FOLD IN** — same disposition as #5/#6, this is a third near-duplicate of "static per-worker knowledge file." |
| 8 | `raas/documentMode.js` + `documentResolver.js` + `modeEngine.js` | aviation CoPilot only | **LIVE**, but scoped exclusively to one worker (PC12-47E), never wired into the general worker-chat path. | **KEEP SEPARATE** — legitimate, purpose-built system for a different worker with genuinely different document-hierarchy needs (operator-controlled > operator-upload > baseline > public-regulatory). Not redundant, just easy to mistake for the same thing. Do not touch. |
| 9 | `documentControlService.js` | admin Document Control pillar (versioning, e-sign ack via Dropbox Sign) | **LIVE**, feeds #8's top tier. | **KEEP SEPARATE** — same reasoning as #8. |
| 10 | Regulatory ingest pipeline (`services/compliance/regulatoryIngest/`) | SEC EDGAR / Federal Register / CFPB adapters, daily cron (`regulatoryIngestDaily`) | **LIVE ingestion, ZERO consumers.** Real money/compute spent daily producing data nobody reads. | **FIX AND WIRE UP** (separate follow-on, not blocking this spec) — this is real, valuable, current regulatory data; worth connecting as a reference-tier source for compliance-heavy workers (IR/securities, HR/employment law) rather than deleting. Flagged as future work, not part of the accounting consolidation. |
| 11 | Alex's parallel prompt stack (`services/alex/promptBuilder.js` + `prompts/*` + `buildRegistryContext.js`) | platform concierge "Alex" | **LIVE**, fully independent of the per-worker RAAS chat path. | **KEEP SEPARATE** — Alex is a different product surface (platform concierge, not a Back of House worker). Do not merge. |
| 12 | `services/alex/rulePacks/alex-rule-pack-v1.js` | 6-layer rule pack, regex hard-stops | **DEAD.** Never `require()`'d; only a version-label string references it elsewhere. | **DELETE** after a quick diff against Alex's live `prompts/rules` — if it has any content not already covered there, port that content first, then delete the file. No value in leaving fully-unused code as a red herring for the next person who finds it. |
| 13 | `digitalWorkers.raas.knowledge_base` array field | edited via "Knowledge Base" input in `CreatorDashboard.jsx` | **DEAD — actively misleading.** Creators type into a real UI field; nothing in the backend has ever read it. This is the naming-collision twin of #6 (`dw.knowledgeBase`, which IS live). | **REPOINT, don't delete** — cheapest real fix: change the Creator Dashboard input to write to `dw.knowledgeBase` (the field that's actually read) instead of `dw.raas.knowledge_base`. Turns dead UI into working UI for free. |
| 14 | `services/alex/deliveryRulesFilter.js` | output-format enforcement (forbidden phrases, canvas-marker requirement) | **LIVE**, but governs response *format*, not knowledge content. | **KEEP SEPARATE** — adjacent concern, not part of this consolidation. |

**Naming collisions to not confuse with any of the above** (flagged so nobody chases a false lead later): `escrowLockers` (escrow transaction stage machine, unrelated "Locker" name), `canonicalDocs`/`dataRoomDocs` (investor Data Room, not chat-injected), `services/compliance/ofac/*` (sanctions screening, not prompt content), `vault/embeddingService.js` (Vault Drive-search, not confirmed tied to worker chat grounding).

---

## Target architecture — two systems, not fourteen

**System A — admin-authored hard rules: `constraintRaasModules`.** Versioned, draft→review→live, counsel/founder-reviewed. This is where universal, non-negotiable discipline lives (GAAP reconciliation rules, regulatory hard-stops). Absorbs #2's precedence/conflict logic and #5's static knowledge content where it's genuinely universal (not tenant-specific).

**System B — tenant/creator-editable knowledge: `tenantLocker.js` + its UI panels.** One place a subscriber (or a worker's creator) adds their own grounding — company SOPs, chart-of-accounts quirks, textbook content, brand voice. Absorbs #6, #7, and the repointed #13.

Both are read live and composed together at chat time; System B's panel display and the model's actual injected prompt read the **same** underlying data, so there is no possible drift between what a user sees and what actually binds the model (unlike #3's current dependency on static JSON files, which live had already drifted from at least one already-written ruleset).

Kept deliberately separate and untouched: #4 (Sandbox authoring), #8/#9 (aviation CoPilot's document hierarchy), #11/#14 (Alex the concierge). These solve different problems for different surfaces and merging them would create the exact kind of accidental coupling this spec is trying to eliminate.

Flagged as valuable future work, explicitly out of scope here: #10 (wire the regulatory ingest pipeline to an actual consumer).

Deleted after a content check: #12.

---

## Part 1 — Generalize the tool-call loop

### Current state (confirmed 2026-08-15)
- Dominant pattern (`functions/functions/index.js`, e.g. lines 5116–5455, 7916–8632): one `anthropic.messages.create({tools})` call → if `tool_use`, execute → exactly one follow-up call, often with `tool_choice: {type:"none"}`. Hard 2-round cap.
- Exception: `search_drive`/`read_drive_file` already loop up to `_MAX_DRIVE_ROUNDS = 3` (lines 5972–6033), each round racing a 30s timeout. This is the pattern to generalize, not invent from scratch.
- `platform-accounting` sits in `_STREAMING_WORKERS` and runs the plain-text SSE branch (lines 4988–5113) with **no `tools` array at all**, unless Drive happens to be connected (`_switchToToolMode`, line 4987).
- `max_tokens` for accounting: 8192 (line 4971). Timeout: global 60s default (line 403), except the Drive loop's 30s/round override.
- No dedicated cross-check/verification tool exists.

### Target state
- Generalize the 3-round Drive-specific loop into a real agentic loop: arbitrary tool set, `while` loop bounded by a round cap (proposed: 5 rounds for accounting), accumulating `tool_result` blocks, each round racing its own timeout so total worst-case latency stays bounded (proposed: 25s/round × 5 = 125s worst case — **needs Sean's sign-off** on whether that's acceptable blocking-chat latency, or whether this becomes a streamed-progress UX instead).
- Route `platform-accounting` into tool-mode **by default**, not only when Drive is connected.
- New tool to consider: a lightweight cross-check helper (e.g. `compare_totals(sourceA, sourceB)`), or simply let the model call `read_drive_file` twice and reason over both — TBD, needs its own design pass.

---

## Build sequence (proposed)

1. Repoint the dead field (#13): Creator Dashboard "Knowledge Base" input writes to `dw.knowledgeBase` instead of `dw.raas.knowledge_base`. Small, safe, immediately fixes a lying UI.
2. Port #2's precedence/conflict-resolution logic and #5's universal static content into `constraintRaasModules/accounting_gaap_v1` as additional sections.
3. Repoint `tenantLocker.js`'s `buildSystemDocs()`/`getLockerContext()` to read live from `constraintRaasModules` instead of static `raas/rulesets/*.json` files.
4. Diff #12 against Alex's live `prompts/rules`; port anything unique, then delete the orphaned file.
5. Mark `accounting_gaap_v1` counsel-reviewed, transition to `live`, wire `constraintRaasSources` onto `digitalWorkers/platform-accounting`.
6. Generalize the tool-call loop (Part 1); route accounting into tool-mode by default.
7. Deploy; test a real reconciliation conversation end-to-end in the live app before declaring Max "useful."
8. Repeat steps 2–3, 5 (module porting + panel repoint + go-live) for HR, Marketing, Contacts, IR — step 6 (tool-loop) is shared infrastructure, built once.

## Open decisions needing Sean's sign-off
- Tool-loop round cap and per-round timeout (proposed: 5 rounds / 25s each).
- Whether long verification turns should become a streamed/async UX rather than a blocking wait.
- Timing on wiring up the regulatory ingest pipeline (#10) — separate initiative, not blocking, but real money is being spent on it today for zero benefit until someone builds the consumer.
- Whether to delete #2's/#5's/#12's now-superseded source files immediately after porting, or leave them dormant for a rollback window.
