# CODEX 50.11 — Worker Improvement Loop (SPEC)

**Author:** T1 (codebase-validating engineer)
**Date drafted:** 2026-05-04
**Status:** v1 decisions locked. v1.1 design intent documented but not yet executable. Sequencing per cross-cutting brief — runs after the 50.13/50.14 foundation work.
**Source memo:** [CODEX-50.11-Improvement-Loop-Memo.docx](../../Downloads/CODEX-50.11-Improvement-Loop-Memo.docx)
**Companion specs:** [CODEX-50.13 Drive/Vault/DTC](CODEX-50.13-Drive-Vault-DTC-Logbook-Integration.md), [CODEX-50.14 Chain & Hash Anchor](CODEX-50.14-Chain-Anchor-Hash-Anchor.md)

---

## What we're doing

Three v1 sub-systems plus design intent for v1.1:

**v1 (ships at launch):**

1. **Per-message chat feedback.** Thumbs up/down on AI responses in `ChatPanel.jsx`. New `workerFeedback/` collection (parallel to the existing sparse `ratings/`, not an extension). New `/v1/chat:feedback` route. Captures user identity, sessionId, messageId, workerSlug, type, optional comment, scope.

2. **Improvement Request surface.** Domain experts and subscribers can file specific improvements against any worker. New `improvementRequests/` collection. State machine reuses the **shape** of `idVerification` (`open` → `in_review` → `approved_into_beta` | `declined` → `open`) but as a separate collection (different domain, different routing). Attachments via `storageObjects` with `tags: ['improvement-request']` and `related: <requestId>`. New routes for create / list / transition.

3. **Audit-layer version pinning.** `worker_version` field captured at session start on `chatSessions` and `messageEvents` writes. Extends the CODEX 50.5 lineage-snapshot pattern (already at `index.js:18350-18351` with `forkedFrom` / `forkedFromCollection`). One-field schema extension; one-line write extension at the session-start path.

**v1.1 (design intent, ships shortly after launch):**

- **Beta channel infrastructure.** New `releaseChannel` field on `digitalWorkers` (separate from `status` — orthogonal axes). `betaOptIn` map on `users` keyed by workerSlug. Runtime resolver branches based on opt-in.
- **Domain expert role.** Extends existing `admins/{uid}` collection (confirmed at `seedAdminData.js:82`) with a `domains: string[]` array. Worker owners' improvement-request queue surfaces expert-flagged items at top.
- **Canvas card feedback.** `CanvasCardShell.jsx` (currently has only `onDismiss` UI handler at lines 62-80, no telemetry write) gains feedback affordance. Likely ships as part of a CanvasCardShell redesign pass.

**v2 or later:**

- **Editor as productized worker.** Cross-worker analytics aggregation already exists (`aggregateAnalytics:19403`, `generateDailyDigest:19496`, `subscriberDigest:19528`, `briefings/{uid}:10356`); the construction is the worker definition (system prompt + RAAS + canvas). Included with $49 Creator annual subscription.

## Why we're doing it

The platform is approaching the point where 226+ workers exceed any one person's ability to maintain. Sean cannot test every worker, and the bottleneck for improvements cannot be his personal attention. Without per-message feedback at launch, the platform collects no signal during the most data-rich window of the year (the first 90 days). Without an Improvement Request surface, Kent (CFO) and Ruthie (RN, healthcare advisor) — domain experts who will catch issues no subscriber will — have no contribution path. Without audit-layer version pinning, future feedback is unmoored: a thumbs-down doesn't tell you which version of the worker the user was reacting to.

These three v1 pieces are a small construction effort with a high-leverage outcome: every interaction starts producing structured signal that a future Editor worker (v2) can read and act on. The read substrate is already built (the audit confirmed `aggregateAnalytics`, daily digests, briefings, `ta:chatPrompt` injection). The write side is the gap.

## Decisions locked (T1 from code visibility, 2026-05-04)

**Q-1 — Sequencing.** Audit-version pinning ships first within this spec (1-line extension to existing write paths). Then per-message feedback (small UI + route + collection). Then Improvement Request surface (largest of the three, full state machine). Cross-cutting sequence places this whole spec after 50.13 + 50.14 land. Detail in the cross-cutting brief.

**Q-2 — Per-message feedback collection naming and shape.** Parallel collection `workerFeedback/`, NOT an extension of `ratings/`. The audit confirmed `ratings/` schema is sparse (write at `index.js:7711`); extending it to capture messageId, sessionId, qualitative comment, scope, and rate-limiting is more work than building parallel. `ratings/` stays as legacy 1-5 star rating signal; `workerFeedback/` is the new richer per-message/per-canvas/per-worker signal that the Editor will eventually read.

Schema:
```js
workerFeedback/{feedbackId} {
  userId: string,
  tenantId: string,
  workerSlug: string,
  worker_version: string,    // pinned to source version (links to Q-4 below)
  scope: 'chat_message' | 'canvas_card' | 'worker_overall',
  type: 'thumbs_up' | 'thumbs_down',
  messageId: string | null,  // populated for scope=chat_message
  sessionId: string | null,
  cardSignal: string | null, // populated for scope=canvas_card (e.g. 'card:accounting-pl')
  comment: string | null,    // optional qualitative
  createdAt: Timestamp,
}
```

**Q-3 — Improvement Request workflow primitive.** Reuse the **shape** of `idVerification` (states: `open` → `in_review` → `approved_into_beta` | `declined` → `open` resubmission), but as a **separate collection** `improvementRequests/`. The domain is different enough (worker-targeted, not user-identity-targeted) that parameterizing the existing `idVerification` writer would tangle two unrelated concerns. The audit confirmed `idVerification` lives at `services/idVerification.js` with states `not_submitted`, `pending`, `approved`, `rejected` (lines 7-8, 96, 102, 110, 213). Mirror those state-transition functions in a new `services/improvementRequests.js`.

Schema:
```js
improvementRequests/{requestId} {
  workerSlug: string,
  workerOwnerId: string,         // creatorId of the target worker
  submitterId: string,           // user filing the request
  submitterRole: 'subscriber' | 'domain_expert' | 'owner',
  domainExpertBadge: string | null,  // e.g. 'healthcare' if filed by expert
  severity: 'my_opinion' | 'important' | 'urgent_regulatory_or_safety',
  title: string,
  description: string,
  attachments: string[],         // storageObjects IDs (tagged 'improvement-request')
  status: 'open' | 'in_review' | 'approved_into_beta' | 'declined',
  statusHistory: Array<{ status, at, byUid, note? }>,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

Routes:
- `POST /v1/improvementRequests:create`
- `GET /v1/improvementRequests:list?workerOwnerId=<uid>` (creator-facing dashboard query)
- `GET /v1/improvementRequests:list?submitterId=<uid>` (user-facing "my requests" view)
- `POST /v1/improvementRequests:transition` — moves status forward; only worker owner or platform admin can transition.

**Q-4 — Audit-layer version pinning.** Extend the lineage-snapshot pattern from `recordUsageEvent.js:156-157` (`forkedFrom`, `forkedFromCollection`). At session start (`chatSessions` write), capture `worker_version` by reading from `digitalWorkers/{slug}.version` (a new field that 50.11 v1.1 beta channel introduces; for v1, default to the literal string `"v1"` until beta channel ships). Store on:
- `chatSessions/{sessionId}` — captured once at session start.
- `messageEvents/{eventId}` — captured per message at write time, copying from the parent session.

Implementation: ~10-line extension at the session-start helper. Read the worker doc once, snapshot the version, write to the session doc. Subsequent message writes read from the session.

**Q-5 — Beta channel field strategy (v1.1 design intent).** Add separate `releaseChannel` field on `digitalWorkers` rather than extending the `status` enum. Reasoning: `status` carries lifecycle (`live`, `draft`, `deprecated`, `waitlist`); `releaseChannel` is orthogonal (`stable`, `beta`). Mixing them tangles two state machines. v1.1 schema: `digitalWorkers/{slug}.releaseChannel: 'stable' | 'beta'` (default `'stable'`). User opt-in: `users/{uid}.betaOptIn: { [workerSlug]: true }`. Runtime resolver in chat handler reads opt-in and routes accordingly.

**Q-6 — Domain expert routing (v1.1 design intent).** Extend `admins/{uid}` (audit confirmed exists at `seedAdminData.js:82`) with `domains: string[]` (e.g. `["healthcare", "aviation"]`). When an expert files an improvement request:
- The request lands in `improvementRequests/` with `submitterRole: 'domain_expert'` and `domainExpertBadge: 'healthcare'`.
- Worker owner's queue (filtered by `workerOwnerId`) surfaces expert-flagged items at top with badge + credentials.
- Platform admins can see all requests across all owners.

No new dashboard surface for v1.1 — the existing creator-facing dashboard (per Phase 2's `useWorkerCatalog` pattern) gains one new query: `improvementRequests where workerOwnerId === me`. Domain expert badges render inline.

**Q-7 — Editor worker scope and timing.** v2+. The lighter-weight option (weekly digest job per Creator producing a static improvement summary) is worth considering as a v1.1 stepping stone but is out of scope for this spec. If desired, write a separate brief.

## How we're doing it

### Layer A — Audit-layer version pinning (smallest, ships first)

**File touched:** `functions/functions/index.js` near the chatSessions write at line ~1332 and the messageEvents write at line ~879.

**Change:** at session start, read `digitalWorkers/{slug}.version` once. Default to `"v1"` if the field doesn't exist (it won't until v1.1 beta channel ships). Snapshot to the session doc:

```js
const workerDoc = await db.collection("digitalWorkers").doc(workerSlug).get();
const workerVersion = workerDoc.data()?.version || "v1";
await db.collection("chatSessions").doc(sessionId).set({
  // ...existing fields...
  worker_version: workerVersion,
}, { merge: true });
```

Per-message events copy the version from the session (one cache lookup, not a separate doc read).

**Effort:** ~1 hr including the test that confirms the version is captured.

### Layer B — Per-message feedback

**Frontend:** `ChatPanel.jsx` adds two small icon buttons (👍/👎) to each AI response. On click, dispatch `POST /v1/chat:feedback` with `{ messageId, sessionId, type, comment? }`. Optional comment input expands inline on click. Optimistic UI update; persist on success.

**Backend:** new route `/v1/chat:feedback` writes to `workerFeedback/`. Reads `worker_version` from the parent `chatSessions` doc. Rate-limit: 5 feedback events per user per minute (hash-table in memory, eject after window). No identity required beyond the session's existing auth.

**Storage:** `workerFeedback/` collection, per the schema in Q-2 above.

**Effort:** ~4 hr — UI affordance, optimistic state, route handler, schema validation, rate limit.

### Layer C — Improvement Request surface

**Backend:**
- New service file `functions/functions/services/improvementRequests.js` modeled on `services/idVerification.js`. Exports `createRequest`, `listForOwner`, `listForSubmitter`, `transitionStatus`.
- Four routes wired into `index.js` route handler.
- Attachment integration: requests reference `storageObjects` IDs; uploads tag with `tags: ['improvement-request']` and `related: <requestId>`.

**Frontend:**
- "Suggest Improvement" button on every worker landing page (top-right corner, near the canvas tab bar). Opens a modal with severity selector, title/description fields, optional file upload.
- "My Improvement Requests" section in the user's account/profile area showing their submissions and current status.
- Creator-facing "Improvement Requests" tab on each owned worker showing inbound requests sorted by domain-expert flagging then severity then recency.

**State machine:**
```
open ─→ in_review ─→ approved_into_beta (terminal for request — beta change has its own lifecycle)
                  ─→ declined ─→ open (resubmission allowed)
```

`approved_into_beta` doesn't yet do anything in v1 (beta channel ships v1.1) — it's the documented intent and the state machine accepts the value. v1.1 beta-channel work picks up from `approved_into_beta` and routes the change into the beta version of the worker.

**Effort:** ~6-8 hr — service file + 4 routes + frontend modal + creator queue surface + status transitions.

### Layer D — v1.1 design intent (not built; documented)

The following are designed but not implemented in this spec:

**Beta channel:**
- Schema: add `releaseChannel: 'stable' | 'beta'` to `digitalWorkers`. Add `betaOptIn: Record<workerSlug, true>` to `users/{uid}`.
- Runtime: chat handler resolves which `releaseChannel` to use based on user opt-in. Resolution point lives at the worker-direct path (audit suggests around `index.js:11809` based on the `chiefOfStaff.enabled` check; specific line shifts as `index.js` evolves).
- Authoring: Studio Locker writes go to `releaseChannel: 'beta'` until promoted to stable. Promotion is a separate flow (out of scope for this spec).

**Domain expert role:**
- Extend `admins/{uid}` with `domains: string[]`. Backfill Ruthie (`["healthcare"]`) and Kent (`["finance"]`) from existing admin records.
- Improvement-request queue rendering reads the submitter's `domains` to attach the badge.
- No write privileges granted to domain experts — they file requests, owners approve.

**Canvas card feedback:**
- `CanvasCardShell.jsx` (currently lines 62-80) gains thumbs UI in the header, beside the SAMPLE chip from T4.
- `POST /v1/chat:feedback` accepts `scope: 'canvas_card'` with `cardSignal` field (e.g. `'card:accounting-pl'`).
- Rendering and persistence are reuse from Layer B.

## Open questions answered (T1 from code visibility)

| Memo Q | T1 answer |
|---|---|
| Sequencing within launch sprint | Audit-version pinning first, then per-message feedback, then Improvement Request surface. Whole spec runs after 50.13 + 50.14 foundation. Detail in cross-cutting brief. |
| Per-message feedback collection naming and shape | Parallel `workerFeedback/`; schema in Q-2. |
| Improvement Request workflow primitive | Mirror `idVerification` shape, separate `improvementRequests/` collection. |
| Beta channel field strategy | Separate `releaseChannel` field, not status enum extension. |
| Domain expert routing | Extend `admins/{uid}` with `domains` array; existing dashboard infra renders flagged items. |
| Editor worker scope and timing | v2+. Optional v1.1 weekly-digest stepping stone is out of scope for this spec. |

## Action sequencing within this spec (v1)

1. **Audit-layer version pinning** (~1 hr) — extend chatSessions/messageEvents writes; default `"v1"` until beta channel ships.
2. **Per-message feedback** (~4 hr) — `workerFeedback/` collection, `/v1/chat:feedback` route, ChatPanel UI buttons.
3. **Improvement Request surface** (~6-8 hr) — service file, 4 routes, frontend modal, creator queue surface, state machine.

**Total v1: ~11-13 hr engineering-Claude shipping pace.**

## Out of scope (v1)

- **Beta channel runtime selection.** v1.1.
- **Domain expert role and badge rendering.** v1.1.
- **Canvas card feedback.** v1.1 (likely as part of CanvasCardShell redesign pass).
- **Editor as productized worker.** v2+.
- **Implicit feedback signals** (session length, dead-end conversations, canvas dismissal, tab abandonment). Lower priority; explicit signal is higher quality.
- **Beta-channel promotion flow** for approved improvement requests. v1.1 picks up from the `approved_into_beta` state.

## Acceptance criteria (v1)

- New `chatSessions` documents have `worker_version` populated from the worker doc at session start.
- New `messageEvents` documents have `worker_version` populated from the parent session.
- `ChatPanel.jsx` renders thumbs up/down on every AI response.
- Clicking thumbs writes a `workerFeedback/` document with all required fields.
- Rate limit: 6th feedback within 60 seconds returns `429`.
- "Suggest Improvement" button on worker landing pages opens the modal.
- Submitting the modal writes an `improvementRequests/` document with state `open`.
- Worker owner's queue shows inbound requests sorted by severity + recency.
- Status transitions (`open` → `in_review` → `approved_into_beta` | `declined`) work end-to-end.
- Resubmission from `declined` back to `open` works.

## Acceptance evidence (post-build)

- A test chat session shows `worker_version: "v1"` on the session doc and on every message event.
- Clicking 👎 on an AI response shows the comment input; submitting persists to `workerFeedback/` with the right scope and worker_version.
- Filing an improvement request as a test user shows up in the creator-facing queue for that worker's owner; status transitions log entries to `statusHistory`.
- Domain expert filing (mocked by setting `submitterRole: 'domain_expert'` server-side) surfaces the badge in the queue rendering.

---

*End of spec. v1 execution begins after 50.13 + 50.14 land. v1.1 design intent is locked but not in this spec's build scope.*
