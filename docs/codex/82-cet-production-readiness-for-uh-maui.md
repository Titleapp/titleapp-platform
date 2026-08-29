# CODEX 82 — CET Production Readiness for UH Maui

**Status:** 🟢 built and deployed 2026-08-29 — items 0-6 of the punch list live in production, bootstrap run; §7 (Tanner schema) intentionally deferred pending Ruthie/Dr. Tanner
**Owner:** Sean / Claude Code
**Date:** 2026-08-29
**Trigger:** Sean: "Let's build the CET." The Order Form UH Maui just received promises a "Clinical Evaluation Tool (CET) for signed, auditable clinical evaluations" live by the January 2027 term. Per the standing convention (CODEX 79-81), spec/audit first, red-team, then build — not straight to code.

**Round-1 red team verdict:** every file:line citation below was independently re-verified against the live codebase and checked out exactly. Three things changed: §4's risk was overstated (it's lower-risk than written), §6 goes from "unresolved" to "confirmed unreachable," and a new, more urgent finding surfaced — §3's gap may already be live in production on a real route, not just a pre-launch to-do. See the "Round-2 finding" callouts inline.

---

## 0. First correction — "the CET" is two different things, not one

Before scoping the work, a naming collision needs to be resolved, because it changes what "build the CET" even means:

1. **The signing loop** — an instructor fills out one evaluation, approves it, it's digitally signed and minted into the student's Vault. This is **already real and functional** (§1-6 below detail exactly how far). Small, mostly wiring work to get institution-ready.
2. **The cohort/SLO/audit-trail dashboard** — a much bigger fixture covering cohorts, reflections, SLOs, and an audit trail across an entire program, not one evaluation at a time. Per CODEX 73 §2 (2026-08-18, not yet fixed): this is rendered by `apps/business/src/sections/NursingEducationPanel.jsx` (978 lines) off `apps/business/src/data/nursingEducationData.json` (4,685 lines of **fake** data — Sarah K., Maya L., James C. — with zero connection to the real `nursingStudents`/`nursingCourses` Firestore collections). CODEX 73 explicitly flagged this as "a real, substantial rebuild (comparable in scope to today's aviation MX/Dispatch work)" and did not add it to any build order.

The Order Form's language ("signed, auditable clinical evaluations") matches **#1**, not #2. This CODEX scopes #1 to production-ready. #2 is named here so it doesn't get silently assumed as "already covered" — it is a separate, much larger decision for Sean to schedule or not, and is out of scope for this CODEX.

**Round-2 finding:** #2's concrete driver is `nursing-education-001` — a real, bootstrapped, catalog-registered worker (`/admin:bootstrap-nursing-education-001`, `index.js:12079`), whose own system prompt (`DEMO_WORKER_FALLBACKS`, `index.js:3811-3843`) is explicitly a faculty-facing cohort/records persona ("you are an educational records system, not a clinical system") with tools (`get_nursing_cohort`/`get_nursing_student`, `index.js:6513/6517`) hardcoded to tenant `"demo-makai-nursing"`. This is the actual worker behind CODEX 73 §2's fake-data dashboard — naming it here makes #2 concrete instead of abstract, for whenever that separate decision gets made.

**Also verified directly (not taken on relayed summary) — a real external dependency, not a code gap:** CODEX 73 §7 records that Ruthie is *"separately emailing Dr. Tanner for permission to use her rubric."* That permission is **not confirmed as granted**. The evaluation schema below must not hard-bake Tanner's proprietary Clinical Judgment Model rubric language as if that's settled — see §7.

---

## 1. What's actually built today (the signing loop)

Real, not fabricated:
- `functions/functions/services/education/clinicalEvaluation.js` — `signAndMintEvaluation()`: a genuine recomputable SHA-256 hash chain (`services/signatureService/blockchain.js`), written as an append-only record into the student's Vault (`services/vault/vaultWriter.js`'s `mintDtc`). `listStudentEvaluations()` recomputes and returns a verification verdict on read — not just stored-and-trusted.
- `POST /v1/edu:evaluation:sign` and `GET /v1/edu:evaluations` (`index.js` ~33869, ~33891) — real routes, not demo stubs.
- `apps/business/src/components/canvas/ClinicalEvalCard.jsx` — a real instructor-facing form calling the live API, plus a records list showing the recomputed verification badge per record. This is genuinely "click and watch it work," not a mock.

This is a solid foundation. The gaps below are real, but they're wiring gaps on top of working infrastructure — not a rebuild.

## 2. Gap — instructors can only sign their own Vault, not a real student's

**The gap:** the route defaults `studentId` to the signed-in caller (`index.js:33877`, comment: *"demo: sign your own Vault"*). There's no lookup by name/roster in the sign flow itself.

**What already exists that this should use:** a real, tenant-scoped roster — `tenants/{tenantId}/nursingStudents` — read and written by `/v1/student:customer:profile` (`index.js:21075-21119`) and `/v1/education:student:add` (`index.js:21129-21160`, wired to `NursingWorkerCanvas.jsx`'s `RecordsCanvas`). The eval-sign route never queries this collection today. The roster infrastructure exists; it's just disconnected from signing.

**Fix:** the sign form needs a real student picker/search against `tenants/{tenantId}/nursingStudents`, not a text field defaulting to self. Confirmed buildable without a new route or index: `/v1/student:customer:profile` (`index.js:21075-21119`) shows the `nursingStudents` doc shape already carries `name`/`email`/`uid`, so a name-searchable picker is a small addition, not new infrastructure.

**FERPA note (not a blocker, stated so it isn't left silent given how FERPA-sensitive this engagement is):** an instructor searching/browsing their own institution's roster to find a student is normal "school official" activity under the same FERPA basis this whole engagement already relies on — it doesn't require separate per-search consent.

## 3. Gap — no authorization check; any authenticated user can sign for anyone

**The gap:** `/v1/edu:evaluation:sign` and `/v1/edu:evaluations` call only `requireFirebaseUser` (`index.js:33871`, `33893`) — no role or membership check. Today, any signed-in account can sign an evaluation attributed to any name, for any `studentId`.

**What already exists that this should use:** `requireMembershipIfNeeded({uid, tenantId}, res)` (`index.js:674`) — already used by `/v1/education:student:add` (`index.js:21137`) and already special-cases personal-vault tenants as synthesized "owner" membership (`index.js:685-687`). This is the exact pattern missing here.

**Fix:** gate signing to an explicit instructor/evaluator role on the tenant membership, using the existing helper — not a new authorization system.

**Round-2 finding, then confirmed live (2026-08-29, direct probe) — this is not one layer of defense among several, it's the only one, and it's already exploitable in production.** `firestore.rules` has no rule at all for the `dtcs` or `nursingStudents` collections — every real read/write in this flow goes through Cloud Functions on the Admin SDK, which bypasses Firestore rules entirely. That makes the `requireMembershipIfNeeded` check this section proposes the **single load-bearing security control** for a FERPA-regulated record type, not defense-in-depth. Confirmed via unauthenticated `curl` against the production endpoint (`https://api-feyfibglbq-uc.a.run.app/v1/edu:evaluations`) that this route is live today — returns the real `requireFirebaseUser` 401 shape, not a 404. **This means, right now, any authenticated platform account (any tenant, not just UH Maui) can call `/v1/edu:evaluation:sign` with an arbitrary `studentId` and mint a fabricated "signed clinical evaluation" into a stranger's Vault, and `/v1/edu:evaluations?studentId=` to read anyone's.** Treat as fix-now, deployed ASAP — not bundled into the rest of the CET build sequence.

## 4. Gap — every signed evaluation is tagged `tenantId: "vault"`, with zero institution linkage

**The gap:** `clinicalEvaluation.js:92` hardcodes `tenantId: "vault"` in the `mintDtc` call. `mintDtc` (`services/vault/vaultWriter.js:53-93`) stores whatever `tenantId` it's given directly on the record (line 70) and treats `"vault"` as personal-scope (`isPersonal`, line 63 → `modification_authority: "owner_only"`, line 78) — correct for the student's ownership of their own record, but it means **there is no way to query "all evaluations signed under UH Maui"** as an institution. Every record looks identical regardless of which institution it came from.

**Fix:** record the real institution tenantId as a separate field on the minted metadata (not as the `mintDtc` scoping tenantId, which should stay `"vault"` for correct student-ownership semantics) — e.g. `metadata.institutionTenantId`. This needs both fields, not one replacing the other: student ownership and institution attribution are different things.

**Round-2 finding — lower risk than originally written.** `mintDtc(` resolves to two unrelated functions sharing a name: `vaultWriter.js`'s (used here) and a completely separate blockchain-minting `mintDtc({dtcId, dtc})` in `crossmintMinter.js` (called from `index.js:18137` and `processChainMints.js:35` — do not confuse the two when searching the codebase). **`clinicalEvaluation.js` is the only real caller of `vaultWriter.js`'s `mintDtc` in the entire codebase** — there's no second caller or generic metadata-rendering UI that a new field could break. Adding `metadata.institutionTenantId` is safe to do directly.

## 5. Gap — signing an evaluation doesn't count as usage, and shares a real prerequisite with §4

**The gap:** `recordInteraction()` (`billing/boxPlanUsage.js:55`), which drives the per-student usage reports promised in the Order Form (CODEX 76), is called exactly once in the whole codebase — from `index.js:3058`, inside `/chat:message`. The eval-sign route is a separate REST endpoint that never touches `/chat:message`, so **signing an evaluation is invisible to the usage/billing system entirely.**

**Round-2 finding — the real shared blocker, stated precisely.** `recordInteraction(db, usageTenantId)` reads a real institution tenantId (`req.headers["x-tenant-id"] || body.tenantId`, the same pattern `/chat:message` uses via `getCtx()`). The actual blocker isn't §4's stored metadata field — it's that **`/edu:evaluation:sign` reads no tenant context from the request at all today**, not via `getCtx()`, not via header, nothing. §4 and §5 share one real prerequisite: thread a real institution tenantId into the route in the first place. Do that once, and both §4's metadata field and §5's `recordInteraction()` call read from the same value — that's the actual reason to build §4 before §5, not just list order.

**Fix:** add tenant-context reading (`getCtx()`) to the eval-sign route, then use that value for both §4's `metadata.institutionTenantId` and §5's `recordInteraction()` call. This matters for two reasons: (a) it's real usage the Order Form's semester review is supposed to see, and (b) it's a real signal of "active student" for billing purposes even in a month where a student never chats with Hannah.

## 6. Gap — confirmed unreachable, not just unverified

**What's known:** `canvasTypes.js:320-321` maps the signal `"card:clinical-eval"` to `ClinicalEvalCard`. But no worker prompt anywhere in the codebase was found to actually emit `card:clinical-eval` as a marker, and `NursingWorkerCanvas.jsx`'s own slug→component map (`1709-1723`) routes to `RecordsCanvas`/`CoursesCanvas`/`TutorCanvas`/`CommsCanvas`/`AccreditationCanvas`/`MicroCanvas`/`OBCanvas` — **not** to `ClinicalEvalCard`. `ChatPanel.jsx`'s `ED_RANKED` array is a marketplace bundle-listing order, unrelated to triggering a canvas.

**Round-2 finding — upgraded from "unresolved" to confirmed.** An exhaustive grep across `apps/business/src` for `"card:clinical-eval"` finds exactly two hits: the signal's own definition in `canvasTypes.js:320` and the doc-comment header inside `ClinicalEvalCard.jsx` itself. No worker prompt, marker-emission logic, or tab config anywhere in the codebase emits this signal. One plausible-looking lead was checked and ruled out: `nursing-education-001` (§0's round-2 finding) routes non-"content" tabs through `buildClinicalEvalPayload` in `liveData.js:653` — but that's a payload-builder function, not the canvas-signal dispatch that decides which React component mounts; nothing connects that worker's tabs to the `card:clinical-eval` signal either. **Verdict: the sign form is provably unreachable today through any normal chat flow** — a perfectly production-ready signing backend that no real UH Maui instructor can currently find.

**Fix:** build an explicit trigger path — a direct worker slug (e.g. `clinical-evaluation-001`) that an instructor can select the same way they select Hannah or Grace today, with its own prompt or tab config that actually emits `card:clinical-eval`.

## 7. Gap — evaluation schema doesn't reflect the actual pedagogical framework, and the framework's rights aren't settled

**The gap:** today's schema (`competency`, `course`, `clinical_site`, `outcome`, `score`, `narrative`) is a flat, generic form. CODEX 73 §5/§7 (verified directly, not via relayed summary) establishes that the real framework Ruthie is building around is **Tanner's Clinical Judgment Model** (Noticing → Interpreting → Responding → Reflecting) — the same framing as her own symposium abstract, *"Developing Clinical Judgment Using AI Digital Workers in Nursing Education."*

**The dependency that isn't a code problem:** CODEX 73 §7 also records, plainly, that Ruthie is *"separately emailing Dr. Tanner for permission to use her rubric."* That is not yet confirmed granted. **Do not hard-code Tanner's specific rubric language into the schema or UI copy until that permission is confirmed** — doing so risks shipping something that has to be ripped out or relicensed later. It's fine to structure the schema around the four *phase names* (Noticing/Interpreting/Responding/Reflecting), since the underlying clinical judgment model is widely taught and cited academically — but the specific proprietary rubric wording/scoring instrument is the part that needs Dr. Tanner's permission.

**Separately, per CODEX 73 §3 correction (Ruthie, 2026-08-18):** Hannah's existing "45-SLO framework" belongs to the CET specifically, not to NURS-366's course content (which uses its own syllabus CLOs instead). If the CET's evaluation schema is meant to tag against those 45 SLOs, that mapping needs to come from Ruthie directly — it hasn't been retrieved or reviewed in this codebase yet.

**Fix:** restructure the evaluation form/schema around the four Tanner phases at a structural level (field names, not rubric text), and get the actual 45-SLO list from Ruthie before building any SLO-tagging UI. Until Dr. Tanner's permission is confirmed, keep phase labels generic enough to not represent a specific licensed rubric as already-cleared for use.

## 8. Smaller, fast fixes found along the way

- `ClinicalEvalCard.jsx`'s `SignForm` defaults to placeholder values copy-pasted from a different vertical: `student_name: "Alex Torres"`, `signerName: "Dr. Maya Chen"`, `signerCredential: "DVM"` — DVM is a veterinary credential, wrong for a nursing evaluation. These should be blank fields once §2's real student picker replaces the free-text default, and the credential placeholder should read something like "e.g. RN, MSN, CNE" as it already does for the label hint — just fix the default value to match.

## 9. Punch list — in build order

0. ✅ **Built.** Cross-account exploit closed: `/v1/edu:evaluation:sign` and `/v1/edu:evaluations` now default to self-sign/self-view only unless the caller has a real tenant context and role.
1. ✅ **Built — §6 trigger path.** Registered `clinical-evaluation-001` ("Student Evaluation") as a real, selectable worker (`DEMO_WORKER_FALLBACKS` + `/admin:bootstrap-clinical-evaluation-001`, mirroring Grace's pattern exactly), and gave it its own rule in `signalExtractor.js` so selecting it reliably surfaces the sign/records canvas. **Not yet deployed, and the bootstrap route has not yet been run** — same "commit ≠ live" discipline as CODEX 81.
2. ✅ **Built — §3 gate.** Signing/viewing for a different `studentId` now requires `x-tenant-id` + an active admin/owner membership on that tenant + confirming the target uid is a real roster entry there. Self-sign/self-view is always allowed regardless, unchanged from before.
3. ✅ **Built — shared prerequisite.** Both routes now read real tenant context via `getCtx()`.
4. ✅ **Built — §2 student picker.** New `GET /v1/education:students:list` route (admin/owner-gated) plus a real picker in `ClinicalEvalCard.jsx`'s `SignForm` — falls back to the original free-text name field when no roster is available (personal/demo use, unchanged). **Scope cut, stated plainly:** only the SIGN flow got a picker; viewing a *different* student's records from the UI isn't wired yet, even though the backend supports it (`GET /v1/edu:evaluations?studentId=`) — self-view works today, an instructor-browse-any-student's-records UI does not exist yet.
5. ✅ **Built — §4 institution attribution.** `metadata.institutionTenantId` recorded alongside the unchanged `"vault"` scoping tenantId; cross-institution record leakage prevented in the GET route by filtering to the requesting instructor's own tenant.
6. ✅ **Built — §5 billing hookup.** `recordInteraction()` now fires on every evaluation signed for another student (not on self-sign, which has no institution to bill).
7. ✅ **Built — §8 placeholder fix.** Demo defaults ("Alex Torres," "Dr. Maya Chen, DVM") removed; form now requires a real student selection/name before submitting.
8. **Not started, deliberately deferred — §7 Tanner/SLO schema.** Still blocked on Ruthie confirming the 45-SLO list and Dr. Tanner's rubric-permission status. Layered on top of a working sign flow, not a prerequisite for it.

**Round-3 finding (build-time, 2026-08-29) — a real bug found while implementing §3, not fixed beyond this CODEX's own new code.** `requireMembershipIfNeeded` returns the raw, already-sent Express response object on failure — not `{handled: true, res}`. The pattern `if (memberGate && memberGate.handled) return memberGate.res;`, copy-pasted at **five pre-existing call sites** (`/aviation:squawks`, a second aviation route near it, `/aviation:dispatch:releases`, `/msr:operator:loan:add`, `/education:student:add`), never actually short-circuits on failure, since a plain Express response has no `.handled` property. In practice this means each of those routes likely continues executing its write/read *after* an unauthorized-membership response has already been sent, risking both a real authorization gap and a second-response server error on every rejection. **This CODEX's own three new call sites use the correct `.ok` check and are not affected** — but the five pre-existing sites are a real, separate finding that deserves its own audit, not a silent fix bundled into this CODEX.

**Not in this CODEX's scope, flagged for a separate decision:** the cohort/SLO/audit-trail dashboard (`NursingEducationPanel.jsx` + `nursingEducationData.json`, §0) — a real rebuild comparable in size to the aviation MX/Dispatch work, entirely fake-data-backed today. Worth its own CODEX and its own build-or-defer decision from Sean, not assumed as part of "build the CET."

## 10. Deploy checklist

1. ✅ `firebase deploy --only functions:api` — done 2026-08-29.
2. ✅ `firebase deploy --only hosting` (apps/business) — done 2026-08-29.
3. ✅ `/admin:bootstrap-clinical-evaluation-001` run — `clinical-evaluation-001` published to the live `digitalWorkers` catalog.
4. ✅ Baseline sanity-checked post-deploy: both routes still correctly 401 unauthenticated (no regression to the auth requirement itself).
5. **Still open — real live-test, not yet done:** verify end-to-end with an actual authenticated account — self-sign with no tenant header, then (once a real tenant/membership exists) sign for a real roster entry as an admin/owner, and confirm the 403 paths actually fire for a non-admin member and for a cross-tenant `studentId`. This needs a real Firebase ID token, which isn't something to fabricate from the CLI — do this the next time there's a live account to test with.
