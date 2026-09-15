# CODEX S52.76 — Chat History Root Cause: Wrong Collection, Not Wrong Query

**Status:** Root cause #1 fixed and live-verified against real Firestore data tonight. Root cause #2 (worker-identity inconsistency across entry points) diagnosed, not yet fixed — scoped below.

**Why now:** Elise (Traitly/DPP) reported "chat history disappears" 2026-08-19. A fix shipped 2026-09-07 (tenant-scoping the session query). Live re-verification this week (2026-09-14) found it still broken. Tonight (2026-09-15), fixing the *frontend chat-panel bugs* (history/scroll/output-disappearing) surfaced something the 9/7 fix never could have caught: **the frontend has been querying a Firestore collection the live backend stopped writing to.**

---

## Root cause #1 (FIXED tonight): `loadConversationHistory()` read the wrong collection

**The bug:** `apps/business/src/components/ChatPanel.jsx`'s `loadConversationHistory()` queried the `messageEvents` collection for chat history. The live `POST /v1/chat:message` route in `functions/functions/index.js` (line ~3810) — confirmed by that route's own code comment to be *"the path the frontend ChatPanel hits"* — writes real conversation turns to a completely different place: `chatSessions/{sessionId}.state.salesHistory`. It does not write to `messageEvents` anywhere in its handler. `messageEvents` writes do still exist elsewhere in the file (`handleAIChatFallthrough`, and several other worker-specific handlers), but not in the one route the frontend actually calls.

**How this was confirmed, not guessed:** Direct Firestore queries against the real `title-app-alpha` project tonight, using `gcloud`/`firebase-admin` application-default credentials (read-only):
- `messageEvents` for the DPP demo tenant has real entries from 2026-08-16 through 2026-09-08, then **nothing** — no writes at all, on any session, on the whole platform, in the 2+ hours around this investigation (verified with a `createdAt >= now-2h` query returning 0 documents platform-wide).
- A real, coherent test conversation held with the DPP Compliance Tracker worker tonight (3 real exchanges, all with contextually accurate answers referencing live dashboard data) produced **zero** `messageEvents` writes — but was fully and correctly present in `chatSessions/wkr_demo-traitly-elise-001_demo-volta-advisory-001_eu-battery-dpp-001.state.salesHistory`, verbatim, in order.
- The same test was repeated against real production `sociii.ai` (Alex/chief-of-staff, `sean@sociii.ai`), not just the demo tenant, with the same result: real response generated, zero `messageEvents` write, platform-wide, in the following 10 minutes.

**Important correction to my own live findings earlier tonight:** I initially escalated this as "the audit trail is broken" — a plausible read given `messageEvents` looks like an event-sourced audit log and SOCIII's whole pitch rests on comprehensive, tamper-evident audit trail coverage. That framing was too alarming. **The data was never lost.** `chatSessions` correctly and reliably held every message the whole time. The bug is specifically that the *frontend's history loader* was pointed at a collection the backend abandoned, not that persistence itself failed. Whether `chatSessions` (a mutable per-session document, updated in place) is an adequate substrate for the patent-pending, cryptographically-anchored Audit Trail feature described in Settings/Addendum E, or whether that's a genuinely separate system scoped to other action types (DTCs, capability invocations), is an open question below — not something this doc claims to have resolved.

**The fix (shipped in the working tree tonight, not yet committed/deployed):** `loadConversationHistory()` now reads `chatSessions/{sessionId}` directly via `getDoc(doc(db, 'chatSessions', sidToUse))` and maps `state.salesHistory` entries to chat bubbles, instead of querying `messageEvents`. The old `messageEvents` query is kept only as a fallback for the one case that genuinely still needs it (no `sessionId` at all, only a `tenantId` — pre-dates per-worker session scoping). Verified live: rebuilt, deployed to an isolated Firebase Hosting preview channel (`dpp-skye-fix-verify-0915`, not production), reloaded fresh, and the real 3-exchange conversation from earlier in the session came back correctly, verbatim, with no fabrication.

**Not yet done:**
- Not committed or deployed to production. Sitting in `apps/business/src/components/ChatPanel.jsx` in the working tree pending review.
- `messageEvents` being effectively dead for the live chat route (since ~2026-09-08, going by the last real entry) may be worth its own decision: intentional deprecation that just needs its remaining reader (this function) updated, or an unintentional regression from whatever change stopped the writes. This doc doesn't establish which — worth a quick git-blame/history check on the `/chat:message` route before treating it as fully closed.
- Whether `chatSessions` should *also* feed the real, patent-pending Audit Trail anchor system (`dailyBatchAnchor.js` anchors DTCs today — unconfirmed whether chat turns are or should be part of that same anchor set) is a real product question, not a bug fix. Flagging for Sean, not assuming an answer.

---

## Root cause #2 (DIAGNOSED, not fixed): worker identity forks depending on entry point

Separate from #1, and would still cause problems even after #1 ships: **the same logical worker can resolve to different `sessionId` values depending on how the user navigated to it**, because two different fields carry the "which worker is this" identity and different consumers prefer different ones.

**The two fields:** `WorkerStateContext.jsx` (`selectWorker()`, ~line 106-108) builds the active-worker object as:
```js
workerId: snap.id,           // the Firestore digitalWorkers document ID
slug: d.slug || snap.id,     // the document's own "slug" data field (often unset, falls back to doc ID)
```
For the DPP Compliance Tracker specifically, live-checked tonight: the doc `digitalWorkers/eu-battery-dpp-001` exists and has **no `slug` field set at all** — so for this worker, `workerId` and `slug` actually resolve to the identical string (`eu-battery-dpp-001`) via the fallback. This doc does *not* currently exhibit the divergence — an earlier version of this doc speculated it did; corrected after direct verification.

**Where the real inconsistency lives instead:** the 12 places across the app that dispatch a `ta:select-worker` event or otherwise set the active worker each source their "slug" value independently, from independently-maintained catalog/list data (Sidebar.jsx's own worker list, WorkerListCanvas.jsx's `w.id || w.slug || w.workerId` fallback chain, the aviation canvas's own role list, etc.) rather than from one shared, canonical lookup. `WorkerListCanvas.jsx`'s three-way fallback chain is itself the clearest evidence this is a known, defended-against inconsistency, not a hypothetical one — someone already hit divergent field names across worker data sources and patched around it locally rather than fixing the source.

**Full inventory of dispatch sites** (`grep -rn "dispatchEvent(new CustomEvent(\"ta:select-worker\"" apps/business/src`):
- `App.jsx:4016`, `WorkerHome.jsx:179`, `VaultDashboard.jsx:214`, `ChatPanel.jsx:1702`, `ChatPanel.jsx:2341`, `Sidebar.jsx:1153`, `Sidebar.jsx:1191` (clears selection), `CrewRolePrompt.jsx:24`, `AppShell.jsx:233`, `AppShell.jsx:245`, `AviationWorkerCanvas.jsx:3070`, `WorkerListCanvas.jsx:70`
(ChatPanel.jsx line numbers as of this doc's last edit — they've already drifted once tonight from other fixes in the same file; re-grep before acting on them.)

**Severity — deliberately not overstated:** In every path checked, `uid` and (via the `wkr_{uid}_{tenantId}_{slug}` format) tenant scoping stay correct. This is **not** a repeat of CODEX-S52.65's cross-tenant/cross-user leak class. It's narrower: a single user can lose track of *their own* conversation with a worker depending on which UI element got them there, because that determines which `chatSessions` document key gets read/written. Annoying and worth fixing platform-wide; not a privacy or security leak on its own.

This isn't just reasoning about sessionId string structure — there's a real, server-enforced backstop independent of anything the client sends. `firestore.rules` (~line 125-129):
```
match /chatSessions/{docId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  ...
}
```
Even a malformed, guessed, or buggy sessionId can't leak another user's session: Firestore itself rejects the read unless the *document's own* `userId` field matches the real authenticated caller, regardless of what document ID was requested. The "self-fragmentation, not a leak" conclusion rests on this rule, not just on the id format being well-behaved in the paths checked.

**Live-reproduced tonight:** clicking into the DPP Compliance Tracker via the sidebar nav item produced a `ta_chat_session_id` matching the same `eu-battery-dpp-001`-keyed session as before — i.e., in this specific instance, the entry points actually agreed. The inconsistency is real (the fallback chains and independent slug sourcing are genuinely there in the code) but was not cleanly reproduced end-to-end in the time available tonight; flagged as **needs a dedicated repro pass**, not as a confirmed live symptom the way root cause #1 was.

**Recommended fix, not implemented:** pick one canonical identifier (recommend: always the `digitalWorkers` Firestore document ID — it's guaranteed unique and is what the backend's own `chatSessions` scoping already keys off of) and make all 12 dispatch sites resolve it through one shared helper instead of each reading whatever field happens to be on whatever object they have locally. This is a real, if mechanical, refactor touching most of the app's worker-switching surface — recommend scoping it as its own tracked pass rather than another point-patch tonight, given this exact file's documented history of three prior regressions in this area (S52.65 and its two follow-ups).

---

## Open questions for Sean

1. Should root cause #1's fix be committed and deployed now, or held with the other two fix batches from tonight (SKYE bugs, FRAT scoring) for one combined review/deploy?
2. Is `chatSessions` an acceptable long-term substrate for chat history, or should chat turns also flow into whatever collection actually feeds the patent-pending Audit Trail anchor (if that's a different one)? This doc doesn't have visibility into the anchor system's real inputs.
3. Worth a quick git-blame on the `/chat:message` route (functions/functions/index.js ~3810) to confirm whether `messageEvents` going stale on 2026-09-08 was a deliberate migration or an accidental side effect of an unrelated change — changes whether `messageEvents` needs any further attention (e.g., a cleanup/deprecation note) beyond just fixing the one remaining reader.
4. Priority of root cause #2 (worker-identity refactor) relative to everything else queued this week (DPP market-readiness, SKYE gap-closure, the VC push, Insurance scoping) — this doc recommends treating it as real but not urgent, given root cause #1 alone resolves the reported symptom in the common case.
