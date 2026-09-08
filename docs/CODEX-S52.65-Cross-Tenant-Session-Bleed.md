# CODEX S52.65 — Cross-Tenant Chat Session Bleed: Root Cause, Fix, and Prevention

**Status:** Original chat-session bug fixed and deployed. Follow-up codebase sweep (below) found the same bug class in ~57 other query sites of varying severity — most NOT fixed in this pass, flagged for a dedicated follow-up given real risk of hasty fixes causing regressions (see "near-miss" below). Needs Sean's review and prioritization.
**Owner:** Sean (direction) · Claude (investigation, fix)
**Severity:** Real, live production data-isolation gap — highest priority item of the day.

---

## Why this exists

Sean's exact words: *"the concern is that this is not the first time the accounting worker data seems to have disappeared and reappeared. We can't have this happening when other customers are using this or we're DOA. How do we prevent this cross bleed and data wiping?"*

Today's audit repeatedly reproduced a same-tenant symptom: the chat panel shows one worker's header (e.g. "Alex · Chief of Staff") while rendering a DIFFERENT worker's conversation content (e.g. an Ivy/Marketing or Sage/Contacts thread). One contributing cause was found and fixed earlier (`0d89aa63` — stale default persona names), but the bug kept reproducing after that fix. This CODEX is the actual root cause, and — critically — answers the harder question nobody had tested yet: **could the same mechanism cross tenant boundaries**, not just worker boundaries within one tenant?

## Root cause, precisely

`functions/functions/index.js`, the `/v1/chat:message` handler (the path `ChatPanel.jsx` always hits). When a client sends a `sessionId` that doesn't exist yet in Firestore, the backend has a "session continuity" fallback: instead of starting a blank session, it looks up **the user's most recently updated session across ANY worker or surface**, within an 8-hour window, and resumes it:

```js
const recentSnap = await db.collection("chatSessions")
  .where("userId", "==", authUser.uid)
  .orderBy("updatedAt", "desc")
  .limit(1)
  .get();
```

This query — before today's fix — had **no tenant scoping whatsoever**. It matched on `userId` alone. That fully explains the same-tenant symptom: open Ivy, then open Alex for the first time in a while (client doesn't have a matching cached session id) — the backend grabs Sean's most recent session (Ivy's) and serves it back under the Alex-labeled panel.

**The harder question — does this cross tenants — was directly investigated, not assumed.** This codebase's own data model answers it: `memberships` collection doc IDs are literally `${uid}_${tenantId}` (`functions/functions/index.js`, multiple sites, e.g. line ~2343) — a genuine many-to-many join between users and tenants. **A single Firebase `uid` holding memberships in more than one tenant is a real, designed case here, not a hypothetical edge case.** (Sean's own account plausibly demonstrated this today: his real `SOCIII, Inc.` tenant and the separate `Sean's Accounting` guest tenant from the `meet-alex/guest-chat` flow are both very likely tied to the same uid.) Given that, the unscoped resume query could — and, absent this fix, eventually would — resume a **different tenant's** conversation state under the current session: one company's chat history rendered to a different company's login, if they happen to share a uid (e.g., an advisor or admin with memberships in more than one workspace).

**Direct answer to "can this cross tenants": yes, this exact mechanism could, for any uid with more than one tenant membership.** Not "probably fine" — the code had no check that would have prevented it.

Checked separately and confirmed NOT the cause: no `chatSessions` document, across all 30 write sites in this file, ever stored a `tenantId` field at all before this fix — this wasn't a missing query filter on an otherwise-present field, it was a missing field across the whole write path.

## The fix, deployed today

1. Computed `reqTenantId` once at the top of the `/chat:message` handler (from `X-Tenant-Id` header / `body.tenantId`, falling back to `"vault"` — the same pattern already used elsewhere in this file).
2. Stamped `tenantId: reqTenantId` onto **all 30** `chatSessions` write sites in this handler (mechanical, additive — no branching logic changed).
3. Added `.where("tenantId", "==", reqTenantId)` to the resume-most-recent-session query, plus a belt-and-suspenders re-check comparing the fetched doc's `tenantId` against the request's before using it — never trust a query filter alone for something this sensitive.
4. Added the required Firestore composite index (`userId` ASC, `tenantId` ASC, `updatedAt` DESC) to `firestore.indexes.json`, deployed.
5. **Fails in the safe direction during rollout**: documents written before this fix have no `tenantId` field, so they simply won't match the new filter — the resume feature goes quiet for old sessions (no continuity) rather than ever resuming the wrong one. The existing `try/catch` around this whole block also means that if the new composite index hasn't finished building yet, the query throws, gets caught, and resume is skipped — same safe direction, not a wrong-tenant leak.

**Deployed**: `firebase deploy --only firestore:indexes` and `firebase deploy --only functions:api`, both succeeded. Commit `90457d6c`.

**Honest gap**: could not run a full authenticated end-to-end test in this pass (no real Firebase user token available in this isolated environment) — basic reachability confirmed (function responds normally, no crash), but a real logged-in round-trip test is recommended before considering this fully verified in production.

**Not fixed in this pass, same root-cause family but separate**: the original same-tenant symptom (wrong header, right tenant, wrong worker) may still have a SECOND contributor beyond the resume-query issue — `ChatPanel.jsx`'s own client-side thread-switching state wasn't re-audited in this pass. If the header-mismatch bug still reproduces after this fix, the remaining cause is very likely in the frontend, not the backend.

## Permanent prevention — Sean asked directly "how do we prevent this"

1. **Standing rule, add to `CLAUDE.md` or an engineering-practices doc**: any new Firestore collection or query involving user-owned data must include `tenantId` in both the write schema and every read/query path that could return more than one record — never rely on `userId` alone as the sole scoping key, because this codebase's own data model allows one user to span multiple tenants.
2. **Add a real integration test**: authenticate as a single test uid with memberships in two distinct test tenants, open a worker chat under Tenant A, then under Tenant B (fresh session id each time), and assert Tenant B's response never contains any content that originated in Tenant A's session. This is exactly the test that would have caught this before it shipped, and would catch a regression if the resume-query fix is ever "simplified" back to userId-only by a future change.
3. **Audit other `userId`-only queries in this file** for the same pattern — the fix here covered `chatSessions`, but the same class of bug (scope by `userId` alone, no `tenantId`) could exist in other collections. Worth a dedicated grep-and-review pass, not assumed to be isolated to chat sessions.
4. **Consider a lint/code-review checklist item**: any `db.collection(...).where("userId", ...)` without an accompanying `tenantId` filter should be flagged in review — this is a mechanical, checkable pattern.

---

## Follow-up sweep (2026-09-07): "what else could this be happening in?"

Sean's directive: find every other instance of the same bug class before a customer finds it. This was a full-codebase grep-and-triage, not another isolated bug hunt.

### Method and scale

Grepped `functions/functions/` for every `.where("userId", ...)` Firestore query (103 raw hits), then checked each for a nearby `tenantId`/`reqTenantId` reference. **58 sites had no nearby tenant-scoping reference.** For each, traced back to the actual `.collection(...)` call to identify the real collection being queried — all 58 are on flat, top-level collections (not tenant-scoped by document path), so none are automatically safe by structure.

### Critical lesson from this pass: the fix is NOT a mechanical find-and-replace

A first attempt to quickly patch `subscriptions` (same shape as the chat fix — add a `tenantId` filter) was caught before shipping: **`subscriptions` documents don't use a plain `tenantId` field at all** — they use an `ownerType`/`ownerId` discriminator pair (see the "49.32 discriminator fields drive resolveSubscription" comment near subscription writes, and `middleware/resolveSubscription.js`, which already exists specifically to handle this correctly elsewhere in the codebase). A naive `.where("tenantId", ...)` filter would have matched **zero real documents** and silently broken subscription-status checks for every customer — a worse outcome than the original bug, just a different failure mode (denies real access instead of leaking someone else's). **This is why most of the findings below are reported, not fixed** — each collection's actual tenant-representation must be verified individually before any filter is added.

### What was actually verified and fixed this pass

- **`chatMessages`** (`index.js` ~L17474, inside `/v1/worker:subscription-status`) — a "recent conversation history preview" query, same vulnerability shape as the original bug (`userId`-only, no tenant filter), returning real conversation snippet text directly in the API response. Fixed: added `.where("tenantId", ...)`. **Confirmed zero regression risk** — grepped the entire codebase and this collection has no write sites anywhere; it's currently dead/unpopulated, so the fix is inert today but correct for whenever this feature is actually wired up. Commit below.
- **`dtcs`** and **`logbookEntries`** — spot-checked write sites and confirmed these DO already store a real `tenantId` field (e.g. `index.js:1157`, `index.js:28611`). Their `userId`-only read sites (`index.js:30147`, `services/education/clinicalEvaluation.js:126`, `api/routes/assets.js:15`, `services/aviation/pilotCurrency.js:51,59`, and others) are genuinely, safely fixable the same way the chat fix worked — **but not fixed in this pass**, because older documents may predate the field being populated (same historical-gap risk the original chatSessions fix had to account for), and verifying how many existing records would silently stop matching needs dedicated time this pass didn't have. Flagged as the next-easiest real fix.
- **`escrows`** (`index.js:30052`) — confirmed this collection stores NO tenant-identifying field at all (same situation as `subscriptions`) — would need the fuller stamp-existing-writes treatment, not a quick filter add.
- **`memberships`** (`index.js:1031`, `11495`, `16874`; `services/commandCenter/userRollupBrief.js:320`) — investigated and confirmed **NOT a bug**. Querying by `userId` alone is correct by design here — this is the "list every workspace this user belongs to" enumeration (e.g. a workspace switcher), and the collection's own doc-ID scheme (`${uid}_${tenantId}`) is what makes that enumeration meaningful. Added as the documented exception in `CLAUDE.md`.
- **Reed's (IR) `query_investors` tool** — re-verified specifically per Sean's question about the earlier wrong-investor-data finding. **Confirmed properly tenant-scoped** (`index.js` `_queryInvestors`: `db.collection("investors").where("tenantId", "==", reqTenantId)`). The materially wrong investor numbers found earlier today (loan at $23,500 instead of $10,017.88, a nonexistent "Michael Gibson," Kent's unearned shares shown as issued) are **confirmed a data-quality problem within the correct tenant, not a cross-tenant or scoping leak.**

### Remaining unverified sites, by rough severity (NOT fixed, need dedicated follow-up)

**High — core business/financial records, same-shape fix likely safe pending backfill check:** `dtcs`, `logbookEntries` reads listed above; `capTables` (`index.js:30229`, a `/wallet:captables:list` route returning full cap-table documents by `ctx.userId` alone — directly relevant given today's cap-table/investor-data concerns, though this appears to be a separate legacy "/wallet:" feature from Reed's own properly-scoped tool).

**High — needs the fuller stamp+backfill treatment (no tenant field exists yet), same risk class as `subscriptions`:** `escrows`; `subscriptions` itself (~11 sites across `index.js`, `middleware/resolveSubscription.js`, `helpers/workspaces.js`, `helpers/userProvisioning.js`, `services/magicLink.js` — this is core billing/access-control logic, the highest-consequence collection in this whole list, and the riskiest to touch without `resolveSubscription.js`'s existing discriminator logic in hand).

**Medium — real customer content, lower immediate financial/legal stakes:** `raasPackages`, `messageEvents`, `messageQueue`, `emailQueue`, `marketingDrafts`, `socialPosts`, `emailLists`, `adminQueue` (identity-verification queue — could be higher severity, worth a closer look given it's KYC-adjacent), `sandboxSessions`, `credentials`, `gpts`, `tokens`, `usageHistory`, `workerSubscriptions`.

**Not investigated in this pass at all** — a full second pass should re-run the same grep, since 58 sites were triaged at the collection-name level but not all individually schema-verified: several `index.js` sites in the 15000-16900 range (subscription-adjacent, likely same `ownerType`/`ownerId` pattern as `subscriptions`) and everything under `scripts/` (manual/one-off admin scripts, not live customer-facing paths, so lower urgency, but `scripts/test/s5AdvisorAffirm.js` models a `userId`-only pattern against `auditLedger` — the actual audit trail — worth checking that this pattern was never copied into a live path).

### Client-side finding: a real, likely second contributor to the original header-bleed symptom

`apps/business/src/components/ChatPanel.jsx` stores `TENANT_ID` in a single global `localStorage` key (not scoped per tab, per worker, or per session) — set at `L963`, `L1336`, `L1351`, read at `L1168` to scope a direct-Firestore chat-history read. If this key is stale (left over from a previous tenant context — e.g. switching between Sean's real tenant and the separate guest-demo tenant seen today) at the moment a worker panel loads its history, the query would filter on the *wrong* tenant. A code comment already on this exact code path (`L1150-1156`) documents a **previously-fixed race condition in this same synchronization area** ("crashed with 'Cannot read properties of null' on every worker switch... same class of bug as the earlier workspaceRole race") — strong evidence this general area is fragile and prone to exactly this bug class. **Not fixed in this pass** (timing/staleness bugs need careful reproduction, not a guessed patch) — this is very likely the "second contributor" the original write-up flagged as still open. Recommended fix direction: derive tenant ID fresh from the authenticated session/context at the moment of each fetch rather than trusting a cached `localStorage` value, or at minimum scope the key more tightly and guarantee synchronous update on every tenant switch before any chat fetch fires.

### Prevention mechanism implemented

Added an explicit, permanent invariant to `CLAUDE.md`'s "Core Architectural Invariants" (item 5): tenant scoping is mandatory on every user-owned-data query, names the real vulnerability class, points at this CODEX, and explicitly calls out that the field pattern varies by collection (verify before filtering) plus the one legitimate exception (`memberships`). A regex/AST lint script was considered and deliberately NOT built this pass — the `subscriptions` near-miss above proves a naive "flag every `userId`-only query" rule would have high false-positive noise (legitimate `memberships` enumeration, `ownerType`/`ownerId`-based collections) without real collection-schema awareness, which is a bigger, separate build than this pass's time allowed. A future version of this check should be schema-aware (an explicit per-collection allowlist/rule), not a blind regex.

### Commits this pass
- `functions/functions/index.js` — `chatMessages` tenant-scoping fix (see diff for exact lines).
- `CLAUDE.md` — new Core Architectural Invariant #5.
- `docs/CODEX-S52.65-Cross-Tenant-Session-Bleed.md` — this section.
