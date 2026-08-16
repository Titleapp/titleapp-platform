# CODEX S52.49 — Max Verification Loop Shipped, Rolled Out to 3 Workers, Multilingual Rule Added

**Status:** SHIPPED (2026-08-15), one item still open (see "Not done yet")
**Author:** Sean Lee Combs + Claude Code
**Predecessor:** CODEX-S52.48-Max-Agentic-Loop-and-Studio-Locker-Consolidation (this session executes and extends that spec's build sequence)

---

## Why this CODEX exists

This session (resumed after a hardware crash mid-work) closed out the load-bearing pieces of S52.48's build sequence for `platform-accounting`, then rolled the same pattern out to three more Back of House workers, and added a platform-wide requirement that wasn't in the original spec: every worker should answer in whatever language the user is writing in, with particular fluency in Mandarin, Dutch, and German.

## What shipped

### 1. Workspace-ID / demo-bleed bug fixed (`apps/business/src/components/AppShell.jsx`)
Root cause of two reported symptoms — demo-tenant content bleeding into a real workspace, and workers not showing up in the sidebar after sign-in. `loadWorkspaces()` read `localStorage.WORKSPACE_ID` and, when it didn't match any of the user's real workspaces (e.g. left over from a `/demo/*` sign-in that stamps the same shared keys), silently no-op'd instead of correcting it. Fix: fall back to the user's first real workspace and reset `WORKSPACE_ID`/`TENANT_ID`/etc. when the stored value is stale — mirrors the logic `handleSwitchWorkspace` already had.

### 2. S52.48 step 5 completed — `accounting_gaap_v1` live
Confirmed via direct Firestore read: `constraintRaasModules/accounting_gaap_v1` is `status: "live"`, counsel-reviewed by Sean per the spec's own carve-out (internal accounting-process rules, not external regulatory), and wired onto `digitalWorkers/platform-accounting` via `constraintRaasSources`. Verified live in a real conversation — Max refused a "just plug the $340 difference" request, cited the no-fabricated-figures rule, and proposed a real reconciliation.

### 3. S52.48 step 6 completed — generalized tool-call loop (`functions/functions/index.js`)
- New `query_ledger` tool: reads this tenant's actual `transactions` collection by keyword/date range, available to Max regardless of Drive connection.
- **Found and fixed a real bug along the way**: `_driveClient` and `_readOneFile` were `const`-declared inside the first tool-dispatch `try` block, but the multi-round follow-up loop that calls them lives in a sibling block after that `try` closes — every round-2+ Drive follow-up was hitting a silently-caught `ReferenceError` and falling back to a canned summary. Fixed by hoisting both to the enclosing scope.
- Round cap/timeout for accounting tuned to 5 rounds x 25s (was 6x30s), agreed with Sean as the tradeoff between thorough cross-checking and worst-case latency.
- `platform-accounting` now always routes into tool-mode, Drive connected or not (`_switchToToolMode`).
- New Firestore composite index: `transactions` on `(tenantId ASC, date DESC)` — required for `query_ledger`'s range queries.

### 4. S52.48 step 8 — rolled out to 3 of 4 remaining Back of House workers
Same pattern (own-tenant-data query tool, tool-mode-by-default, shared multi-round loop) extended to:
- **Contacts** (`platform-contacts`) — `query_contacts` over the real `contacts` collection. Verified live: correctly found "John Boyer / High Alpine Sales" against 3,380 real contacts.
- **Marketing** (`platform-marketing`/`marketing-content`) — `query_campaigns` over `campaigns`. Verified live: correctly reported zero active campaigns rather than inventing performance numbers.
- **Investor Relations** (`investor-relations`/`ir-worker`) — `query_investors` over `investors`. Verified live: correctly distinguished "zero formal investors in the pipeline" from real cap-table/loan-holder data instead of conflating the two.
- **HR** (`platform-hr`) — **no query tool built.** No real employee/roster data store exists yet (only `hr_notices` and onboarding-ack logs) — building a tool against nothing would be a fabricated placeholder, not a real fix. HR still got the language rule and remains tool-mode-eligible for when Drive is connected; a real HR data model is future work, not scoped here.

The dispatch logic (`_OWN_DATA_TOOL_WORKERS` registry, `_execOwnDataTool`) is written so adding a fifth worker's tool going forward is a small, additive change, not another copy-paste of the whole loop.

### 5. Global language rule (new — not in original S52.48 scope)
Added to the universal delivery-rules block in `index.js` (applies to every RAAS worker) and separately to Alex's `services/alex/prompts/core.js` (Alex runs its own prompt stack, per S52.48's own inventory item #11): match the user's language turn-by-turn, native fluency expected especially for Mandarin/Dutch/German, canvas payload text in-language too, JSON keys/status enums stay in English. Verified live in German (Max) and Mandarin (HR) — both fluent, not stilted machine translation.

### 6. Studio Locker/RAAS wiring verified live for all 5 Back of House workers
Confirms S52.48 step 3 (repoint `tenantLocker.js` to read live from `constraintRaasModules`) actually works platform-wide, not just for accounting: Accounting shows its full 9k-char GAAP module; Contacts, HR, Marketing, and IR each show their own existing baseline docs (625/2k/715/853 chars respectively) — thin placeholder content, not yet built out like accounting's, but genuinely live and correctly scoped per worker with no cross-worker bleed.

## Not done yet — open items

- **Progress UX for the verification loop.** Accounting's loop can now take up to 125s (5 rounds x 25s worst case) with no incremental "still checking a second source..." indicator in the chat UI — currently just a longer wait. Flagged at the time, being picked up this session as the next task.
- **S52.48 step 1** (repoint Creator Dashboard's dead `dw.raas.knowledge_base` field to the live `dw.knowledgeBase` field) — investigated 2026-08-16, turned out bigger than scoped: `CreatorDashboard.jsx` writes to a `workers/{id}` collection, and no pipeline could be found that syncs `workers/{id}` into `digitalWorkers/{slug}` (where chat prompts actually read `knowledgeBase` from) — `onContentSync.js`'s `worker_approved` event feeds a *different* system (`alex/knowledge/workers/{id}`, item #7, not this one). Renaming the field alone would not fix anything real. Needs the actual creator-draft → live-catalog publish pipeline traced first — bigger than a rename, not done.
- **S52.48 step 4** (diff dead `services/alex/rulePacks/alex-rule-pack-v1.js` against Alex's live rules, port anything unique, delete) — diffed 2026-08-16: NOT redundant with `services/alex/prompts/rules.js` as assumed — the dead file's six layers (terminology hard-stops like "no Install button"/"no $99 tier"/"no AI assistant", per-vertical handoff triggers, sales upsell caps, 45-day inactivity nudges) have zero overlap with what's live today. Content is real but some of it (pricing figures) may be stale. Left in place rather than deleted or hastily ported — needs a verification pass against current pricing/copy before either action, not a rushed one under time pressure.
- **HR data model.** No employee/roster collection exists. Needed before HR can get a real cross-check tool the way the other four workers now have.
- **Content authoring for Contacts/Marketing/IR/HR constraint modules.** Unlike accounting (which had a pre-existing `ACCT-001-gaap-reconciliation-rules.md` to port), no equivalent source rules doc exists for these domains. Employment law (HR) and securities compliance (IR) in particular are external regulatory domains where Sean self-certifying as "counsel" the way he did for accounting's internal rules may not be appropriate — this needs either Sean's real domain input or actual counsel review, not fabricated rule text.
