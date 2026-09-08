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

---

## URGENT ADDENDUM (2026-09-07, same day): the real, LIVE symptom — public demo cross-visitor bleed

While the follow-up sweep above was in progress, Sean reproduced a **live, on-camera symptom**: recording a Loom of the public `/demo/title` demo, it answered a question in Chinese out of nowhere — reproduced twice, also seen independently by a separate audit fork. Sean's hypothesis: *"we have a situation in which the demo doesn't reset when a new user comes in, but rather leaves a remnant."* Confirmed correct, and root-caused precisely.

### Why the original fix didn't cover this

Every public one-click demo (`/demo/title`, `/demo/skye`, `/demo/vet`, and ~15 other personas — the full `PERSONAS` map inside the `/demo:token` route, `functions/functions/index.js` ~L2072) signs **every real visitor into the exact same fixed Firebase `uid` and `tenantId`** — e.g. `title` → uid `demo-title-admin-001`, tenant `demo-attorneys-title-001`, for literally everyone who ever loads `/demo/title`. This is intentional (a real, designed one-click-demo mechanism, confirmed via `TitleDemoSignIn.jsx` → `GET /v1/demo:token&persona=title` → `signInWithCustomToken`) — but it means the tenantId scoping fix from earlier today provides **zero protection here**: that fix correctly stops one uid's session from resuming under a *different* tenant, but here the tenant and uid are the same for every visitor by design. The missing dimension is per-**visitor** identity, which these shared demo logins never had. A code comment already on this exact line (dated 2026-08-20, predating today) documents this bug having already surfaced once before ("a demo/title walkthrough from yesterday was silently carried into today's session") — that earlier fix only bounded the resume window to 8 hours, it never addressed *who* the resumed session could belong to.

### Fix, deployed today

Added `DEMO_SHARED_UIDS` (`index.js`, module scope, near the top of the file) — an explicit set of all 14 unique fixed demo uids currently in the `PERSONAS` map — and excluded them from the session-resume-continuity path (the same `if (!sessionSnap.exists && authUser && ...)` gate already used to skip resume for other special surfaces like `invest`/`developer`/`sandbox`). Any visitor to any public demo now always starts a genuinely fresh session; no visitor can inherit a prior visitor's in-progress conversation, language, or context.

**Known limitation, not fixed in this pass**: this closes the "resume most recent session for this uid" path. It does NOT change what happens if the same browser reuses its own cached `ta_chat_session_id` from a previous visit (`localStorage`, client-side) — a genuinely fresh visitor with a clean browser is fully protected, but repeated manual testing in the same non-incognito browser tab could still show the previous test's session directly (a different, lower-severity mechanism, expected behavior for a literal repeat visit from the identical browser state, not a cross-visitor leak).

**Also not fixed, flagged as technical debt**: `DEMO_SHARED_UIDS` is a manually-maintained list that must be kept in sync with `PERSONAS` by hand — a future refactor should hoist `PERSONAS` to module scope and derive this list from it directly (`Object.values(PERSONAS).map(p => p.uid)`) rather than maintaining two lists that can drift.

**Verified**: `node -c` syntax check passed; deployed (`firebase deploy --only functions:api`, succeeded); confirmed the live `/demo:token?persona=title` endpoint still responds correctly post-deploy (still mints a token for `demo-title-admin-001` as expected — this fix doesn't change token minting, only session-resume behavior). **Full behavioral end-to-end verification** (two sequential fresh-browser visits within the resume window, confirming visitor B never sees visitor A's conversation) was not performed in this pass — recommended before Sean's next demo recording.

### Commit
- `functions/functions/index.js` — `DEMO_SHARED_UIDS` registry + resume-skip condition.

---

## Second follow-up (2026-09-07, same day): Sean's ask — "it needs to spin up when a user sees it (it's a demo)"

The `DEMO_SHARED_UIDS` fix above stops one visitor's *conversation* from bleeding into the next. It does NOT stop actual Firestore writes one visitor's session triggers from persisting and being visible to every future visitor of that same demo, since every visitor of `/demo/title` (or any of the other ~16 personas) is genuinely the same fixed uid+tenant. Sean's direct instruction: check all the demos for this, and make them "spin up" fresh per visitor, not stay one persistent shared instance forever.

### Full enumeration — every public demo persona (`PERSONAS` map, `index.js` ~L2124)

17 personas, 14 unique shared uids (some personas intentionally share a uid — e.g. `sara-kahele-demo` is nursing-student/uh-student/vet-client/re-tenant, demonstrating the "one consumer identity across several businesses" story):

| Persona (URL param) | uid | tenantId | Workspace | Real seed script found? |
|---|---|---|---|---|
| `vet` | `NHVBEVFSiBUFUzHUq5a9Xioc3hH2` | `ws_1781920656122_tl9dhn` | Meadow Creek Veterinary | `scripts/demo/seedVet003.js` (not wired this pass) |
| `realestate` | `qJZesWZclFZO0Xwp1l5PxE16Bnj2` | `ws_1783659066844_o7m1pm` | Merritt Capital Group | Multiple `seedRE*.js` scripts, no single entry point (not wired) |
| `nursing-admin` / `nursing-student` | `demo-nursing-admin-001` / `sara-kahele-demo` | `demo-makai-nursing` | Makai School of Nursing | Not identified with confidence this pass |
| `uh-admin` / `uh-student` | `demo-uh-admin-001` / `sara-kahele-demo` | `demo-uh-nursing` | UH Maui College Nursing | Not identified with confidence this pass |
| `vet-client` | `sara-kahele-demo` | (vet tenant) | — | shares vet's seed |
| `re-tenant` | `sara-kahele-demo` | (realestate tenant) | — | scripted/non-real-backed per existing code comment — likely doesn't need reseed |
| `msr-servicing` / `msr-borrower` | `demo-msr-compliance-001` / `demo-msr-borrower-001` | `demo-meridian-servicing-001` | Meridian Loan Servicing | `scripts/demo/seedMsrServicing.js` (not wired this pass) |
| **`title` / `title-client`** | `demo-title-admin-001` / `demo-title-buyer-001` | `demo-attorneys-title-001` | Attorneys Title Company | **`scripts/demo/seedTitleDemo.js` — WIRED, live** |
| **`aviation` / `skye-pilot`** | `demo-aviation-alex-001` / `demo-skye-pilot-001` | `demo-pacific-air-001` | Pacific Air Partners | **`skye-pilot` half wired via `seedSkyePilotDemo.js`; the broader `aviation` persona (CoPilot/MX/Dispatch/ground-school/crew-scheduling) has no identified single reseed script this pass** |
| `brokerage` | `demo-brokerage-jordan-001` | `demo-summit-realty` | Summit Realty Group | Not identified this pass |
| `education` | `demo-education-patricia-001` | `demo-westview-education` | Westview Elementary | Possibly `seedEdu001.js`, not confirmed this pass |
| `traitly` | `demo-traitly-elise-001` | `demo-volta-advisory-001` | Volta Advisory (Traitly) | `scripts/demo/seedDppDemo.js` (not wired this pass) |

### Priority assessment

`/demo/title` is the clear highest-priority: real, current prospect data (Henderson County, TX / Attorneys Title), a live incident already reproduced on camera (the Chinese-response bleed), and confirmed real recent use in two separate audits today. `/demo/skye` is second: also audited today, aviation is a real go-to-market vertical, and its seed script computes time-relative currency-expiration dates that go stale on their own regardless of visitor pollution — it benefits from periodic re-seeding even absent the bleed concern. Everything else in the table is real product surface but without today's same evidence of active real-world traffic; recommend the same treatment as a follow-up in priority order: `realestate`/`brokerage` (adjacent to the actively-selling title vertical), `traitly` (real named customer, Elise van der Bel, per other work today), then the nursing/education personas, then `vet` (oldest, most generic demo — still real, lowest urgency).

### What was actually implemented, and why not full per-visit provisioning

**True "spin up a fresh tenant per visitor"** (a new tenant + uid + full reseed on every single page load) was assessed and deliberately NOT attempted this pass: every persona's real seed data is bespoke and, for at least the aviation one, computed relative to the current date — building a safe, generic "provision on demand" path for all 17 without risking subtly breaking any one of them was judged too large a change to ship in one pass without dedicated design time. It would also add real latency to the demo's first paint (a multi-second reseed on the visitor's critical path) or require a more complex pre-warming scheme — a genuinely bigger architectural project, not a quick fix.

**What was implemented instead — a bounded, scheduled reset — for `/demo/title` and `/demo/skye`:**
1. Both seed scripts (`scripts/demo/seedTitleDemo.js`, `scripts/demo/seedSkyePilotDemo.js`) were already written to be idempotent (each documents this explicitly, and `seedTitleDemo.js`'s `clearCollection()` helper carries a comment describing a REAL prior incident on 2026-08-20 where an earlier, unscoped version of this exact helper deleted every tenant's `demo:true` records platform-wide — the same "missing tenant scope" bug class as today's chat-session bug, already bitten once before in this exact file).
2. Both were previously bare CLI scripts ending in `process.exit()` — refactored to export their seed logic as a plain async function (`seedTitleDemo`, `seedSkyePilotDemo`), gated behind `if (require.main === module)` so the original `node scripts/demo/seedX.js` standalone usage is unchanged and still verified working (ran both manually post-refactor, confirmed identical successful output).
3. Wired two new scheduled Cloud Functions, `resetTitleDemo` and `resetSkyeDemo`, each running every 2 hours (`0 */2 * * *`, `America/Chicago`), calling the corresponding seed function to restore canonical state.
4. Deployed (`firebase deploy --only functions:api,functions:resetTitleDemo,functions:resetSkyeDemo`) — both new scheduled functions confirmed created and listed as type `scheduled`; `api` health-checked post-deploy (200 on `/v1/demo:token?persona=title`).

**Honest framing of what this does and does not achieve**: this bounds any pollution from one visitor's session (chat writes, tool-call side effects) to at most a 2-hour window on these two demos — it does NOT deliver genuine per-visitor isolation the way Sean's "spin up when a user sees it" phrasing asks for literally. Two visitors within the same 2-hour window can still, in principle, see each other's incidental writes (though the separate `DEMO_SHARED_UIDS` fix already stops the specific symptom Sean witnessed — conversation/session bleed). If true per-visit isolation is wanted, that's a real follow-up project: provision a fresh ephemeral tenant + uid per visit (reusing these now-exported seed functions to populate it) and expire/delete it after some TTL, rather than sharing one persistent tenant at all.

### Scoped follow-up, not done this pass
- Apply the same export-and-schedule pattern to the remaining ~15 personas, prioritized per the table above. `seedVet003.js`, `seedMsrServicing.js`, and `seedDppDemo.js` look like probable direct matches (structure not yet confirmed); `realestate` and `aviation` (the broader admin persona, not just `skye-pilot`) don't have an identified single-entry-point script and need investigation into whether one exists across the several `seedRE*.js` files or needs to be composed.
- Consider whether any of these demo tenants' seed scripts also need the SAME data-loss-incident-shaped tenant-scoping check that `seedTitleDemo.js`'s `clearCollection()` already got in the 2026-08-20 fix — worth explicitly verifying each script's own clear/reset helper is tenant-scoped, given this is now a second real, confirmed instance of that bug class in this codebase.
- If per-visit true isolation is ultimately wanted (Sean's literal ask), design that as its own project rather than extending the scheduled-reset pattern indefinitely — the scheduled reset is a mitigation, not the end state.

### Commits this section
- `functions/functions/scripts/demo/seedTitleDemo.js` — exported as callable function, CLI usage preserved.
- `functions/functions/scripts/demo/seedSkyePilotDemo.js` — exported as callable function, CLI usage preserved.
- `functions/functions/index.js` — `resetTitleDemo` and `resetSkyeDemo` scheduled functions.

---

## Third follow-up (2026-09-07, same day): rolling the reset pattern out to more personas

Continuing the scoped follow-up above. Result: **5 more personas now have a real scheduled reset** (7 of 17 total, up from 2), 2 more confirmed as needing dedicated work first, and one real near-miss bug caught before it shipped.

### Investigated and wired

- **`vet`** — `scripts/demo/seedVet003.js`, self-documented "Idempotent," refactored to the proven export pattern and manually re-run standalone (confirmed: correctly cleared 12 prior dosing orders, reseeded 12 fresh, no errors). New scheduled function: `resetVetDemo`.
- **`msr-servicing` / `msr-borrower`** — `scripts/demo/seedMsrServicing.js`, self-documented "Idempotent — safe to run more than once," same treatment. New scheduled function: `resetMsrServicingDemo`.
- **`traitly`, the broader `aviation` persona (Pacific Air, distinct from `skye-pilot` which `resetSkyeDemo` already covers), `brokerage`, `education`, and partially `uh-admin`** (nursing) — all five covered by a single script, `scripts/demo/seedSpineCanvasDemo.js`, discovered while investigating the `education`/`nursing` gap the prior pass couldn't identify with confidence. This script seeds the "back-of-house spine" layer only (`transactions`/`campaigns`/`contacts`/`teamMembers` — what the Accounting/Marketing/HR/Contacts dashboards actually read) for these five tenants in one already-tenant-scoped pass, with an explicit code comment citing the *same* 2026-08-20 unscoped-clear incident and confirming its own `clearDemo()` helper requires `tenantId` and throws if it's missing. Manually re-run standalone: confirmed correct, tenant-scoped clear+reseed logged for all five, and confirmed it correctly skips `demo-makai-nursing` (different persona, already has 90 real transactions, deliberately not touched) and correctly limits `uh-nursing` to transactions+teamMembers only (matching that tenant's real `activeWorkers` — no campaigns/contacts spine workers subscribed there). New scheduled function: `resetSpineCanvasDemos`.
  - **Honest limitation**: this is a *partial* reset for these five — only the spine/back-office layer, not each tenant's vertical-specific data (DPP passport data, nursing clinical records, aviation worker-specific state, etc.), which have no scheduled reset yet.

### Real near-miss caught before shipping

`seedVet003.js` called `admin.initializeApp({ projectId: "title-app-alpha" })` with **no `admin.apps.length` guard** — unlike every other seed script in this codebase. Requiring it from `index.js` (which already has a default Firebase app initialized) crashed the entire function deployment at analysis time (`FirebaseAppError: The default Firebase app already exists`). Caught by the deploy itself, not a code review — fixed with the same one-line guard (`if (!admin.apps.length) admin.initializeApp(...)`) every other script already had, re-verified working standalone, redeployed clean. Worth a quick audit of any *other* not-yet-wired seed scripts for this same missing guard before wiring them — this specific failure mode only surfaces at require-time, not at standalone-CLI-run time, so a script can look perfectly fine running alone and still break the whole deploy once `require()`'d from `index.js`.

### Investigated, deliberately NOT wired — flagged for dedicated follow-up

- **`realestate`** (Merritt Capital Group) — no single seed script exists; the tenant's data is spread across 8 separate `seedRE*.js` files (`seedREAccounting.js`, `seedREContacts.js`, `seedREHRPeople.js`, `seedREInvestors.js`, `seedREMaintenanceTickets.js`, `seedREMarketingCampaigns.js`, `seedREOperatingFeed.js`, `seedREVaultDTCs.js`), none exported, none documented as idempotent as a set, no orchestrator. Composing these into one safe reset is real new work (untangling execution order and cross-script assumptions), not "wire up an existing proven script" — exactly the category this pass was told not to attempt. Flagged for dedicated design time.
- **`traitly`'s own vertical-specific data** (beyond what `seedSpineCanvasDemo.js`'s spine layer covers) — the apparent canonical script, `scripts/demo/seedDppDemo.js`, is **not** self-documented as idempotent, and its own header comment says it was "not runnable from this environment (no Firebase CLI / service account configured on this machine as of 2026-08-13)" — meaning it may have **never actually been executed even once**. Wiring an unverified, possibly-never-run script into a recurring production schedule is a real risk (first-ever execution against live Firestore data, on a schedule, unattended) — not attempted. A related script, `seedDppPassport.js`, IS self-documented idempotent but seeds a different thing entirely (end-consumer product-passport data, not the `traitly` operator persona's own tenant) — out of scope for this specific persona's reset.
- Also identified but not re-investigated this pass, since the naming is a trap worth flagging explicitly: `scripts/demo/seedEdu001.js` sounds education/nursing-related by name but actually seeds the **`vet`** persona's "EDU-001 CVT Exam Prep Worker" (veterinary technician exam prep, not human nursing/education) — confirmed via its hardcoded UID/tenant matching the `vet` persona exactly. Do not wire this thinking it's the `education`/nursing gap.

### Updated rollout status: 7 of 17 personas now have a real scheduled reset
`title`, `skye-pilot` (prior pass) + `vet`, `msr-servicing`/`msr-borrower`, `traitly`/`aviation`/`brokerage`/`education`/`uh-admin` (spine layer only, this pass) = 7 personas with some form of bounded reset; `realestate`, `nursing-admin`/`nursing-student` (`demo-makai-nursing`, deliberately untouched), and `traitly`'s non-spine data remain open, each requiring either composing multiple scripts safely or verifying/writing a script that doesn't exist yet — not something to rush.

### Commits this section
- `functions/functions/scripts/demo/seedVet003.js` — exported as callable function (with the `initializeApp` guard fix), CLI usage preserved.
- `functions/functions/scripts/demo/seedMsrServicing.js` — exported as callable function, CLI usage preserved.
- `functions/functions/scripts/demo/seedSpineCanvasDemo.js` — exported as callable function, CLI usage preserved.
- `functions/functions/index.js` — `resetVetDemo`, `resetMsrServicingDemo`, `resetSpineCanvasDemos` scheduled functions.

---

## Fourth follow-up (2026-09-07, same day): closing out the client-side finding

Closes the "Client-side finding" flagged above (`L88-90`) as the likely second contributor to the original header-bleed symptom.

### Root cause, confirmed by code trace (not guessed)

`ChatPanel.jsx` generates a deterministic chat-session ID for each worker (`wkr_{uid}_{slug}`, or `cos_{uid}` for the Chief of Staff), used both to key the Firestore history read and to fall back on if a message is sent before that ID exists. The generator never included `tenantId`. Meanwhile, `loadConversationHistory()` filters the same read by a *separate* `tenantId` value pulled from a single global `localStorage.TENANT_ID` key — and `localStorage` is scoped per browser **origin**, shared across every tab of `sociii.ai` in the same profile, not per-tab. With one `uid` able to hold real memberships in more than one tenant (see `CLAUDE.md` invariant #5) and dozens of `sociii.ai` tabs open across today's concurrent forks/testing, whichever tab last wrote `TENANT_ID` could make any *other* tab's next chat-history read silently use the wrong tenant, while the session-ID string itself stayed identical either way — so nothing about the fetch would look wrong until the wrong content rendered under a correct-looking worker header. This is the same class of bug already independently documented in [[feedback_demo_qa_sequential_only]] (shared-localStorage session clobber across parallel demo-persona tabs), and the same failure shape as the backend `chatMessages` fix earlier today (`90457d6c`) — except there the vulnerable dimension was a missing query filter; here it's the client-generated ID itself not encoding tenant, so a stale/wrong cached `TENANT_ID` couldn't be caught downstream.

### Fix, deployed today

Embedded `tenantId` directly into the session-ID string at both generation sites in `ChatPanel.jsx` — `handleWorkerSelect` (the `ta:select-worker` handler) and the send-time fallback IIFE — changing `wkr_{uid}_{slug}` / `cos_{uid}` to `wkr_{uid}_{tenantId}_{slug}` / `cos_{uid}_{tenantId}`, with `tenantId` read the same way the existing query filter already reads it (`localStorage.getItem('TENANT_ID') || localStorage.getItem('WORKSPACE_ID') || 'vault'`). Fail-safe, not fail-open: the ID and the query filter now always agree, even when both are stale/wrong, so a bad cached tenant value at worst produces an empty/fresh conversation, never another tenant's real one. Build (`npm run build`) and deploy (`firebase deploy --only hosting`) both succeeded; live on `title-app-alpha`.

**Not fixed, flagged as follow-up** (same spirit as the original write-up's recommendation): the underlying smell that `TENANT_ID` is a single cross-tab-shared `localStorage` key at all. A fuller fix would source tenant context per-tab from a React context/prop instead of `localStorage`; grepped for one and found none already built, and building it is a bigger change than this pass's scope warranted.

### Live verification

Verified in the real deployed workspace (Elise's "Volta Advisory" tenant, the only real tenant reachable in this browser profile's open tabs). Rapid same-tab worker switching — Elara (DPP Compliance Tracker) → Max (Accounting) → Ivy (Marketing & Content) → Alex (Chief of Staff) — was performed with screenshots after each switch: every header matched its own worker's own greeting/content correctly, no cross-worker bleed, confirming **no regression** to normal chat-history loading post-fix.

**Honest limitation**: the specific traced mechanism is a *cross-tab, cross-tenant* race (Tab A reads a `TENANT_ID` last written by Tab B, a different tenant). Every currently-open browser tab in this profile is authenticated as the same tenant (Elise/Volta Advisory), so the true two-different-tenant race could not be reproduced live in this pass — doing so would require signing into a second real tenant, which was not attempted (no credential entry). The fix itself does not depend on reproducing the race to be correct: it closes the traced mechanism directly (the session ID can no longer collide across tenants regardless of `TENANT_ID`'s staleness), and the same failure class is already independently corroborated by [[feedback_demo_qa_sequential_only]]. Flagging this rather than claiming a live repro that didn't happen, per this session's standing discipline against shipping unverified guesses.

### Commits this section
- `apps/business/src/components/ChatPanel.jsx` — tenant-scoped chat session IDs at both generation sites.
- `docs/CODEX-S52.65-Cross-Tenant-Session-Bleed.md` — this section.
