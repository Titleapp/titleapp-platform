# CODEX S52.65 — Cross-Tenant Chat Session Bleed: Root Cause, Fix, and Prevention

**Status:** Fixed and deployed (code + index); needs Sean's review of prevention recommendations below.
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
