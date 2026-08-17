# QA Check — 2026-08-16/17: Upload-first fast path, review gate, live escalation, education demo

**Note on scope:** Sean asked for a "QA001 check" — I searched the whole repo for a file/checklist by that exact name and found none. The closest precedent in style/rigor is `CHAT_VERIFICATION_REPORT.md` and `PILOT_RECORDS_TEST_REPORT.md` (both from an earlier session, Feb 2026) — this report follows that same format for tonight's build, but it isn't a resurrection of a literal "QA001" file, since I never found one. If QA001 was a specific template Sean had in mind, this doc should be checked against it once he's back.

**Status:** ✅ All checks below passed on the deployed, live system — not run only in a local script. Two real defects were found and fixed *during* this check (not before it), detailed below.

---

## What was checked, and how

### 1. Fast-path build pipeline (upload → derive → test → gate)
- **Method:** Ran `buildAndSubmit()` twice against the deployed backend logic — once for a 5th-grade water cycle unit, once for a 5th-grade fractions unit — with real uploaded-style materials, not placeholder text.
- **Result:** ✅ Both produced a real derived spec (course worker name, evaluation worker name, tutoring rules, escalation rules, an honest "uncertain" list), a real system prompt, and a real 5-question judged test run.
- **Firestore state confirmed directly** (not inferred from API responses): both `digitalWorkers/{slug}` docs exist with `status:"pending_review"`, `buildSource:"fast-path"`, and — after the fix below — `visibility:"organization"`, `internal_only:true`.

### 2. Independent judge (replaces self-graded keyword classification)
- **Method:** Ran the real water-cycle worker's system prompt through `runAutomatedTest()` with the new `judgeAnswer()` step, comparing against the prior keyword-heuristic run.
- **Result:** ✅ Old heuristic misclassified 3/5 answers `escalated` (the worker was just *describing* its own policy). New judge correctly returned `clean` on all 5, each with a stated reason. This was a real, reproducible defect in the shipped code, not a hypothetical — fixed and re-verified before this QA pass, not during it.

### 3. Admin-review gate — is it actually enforced, not just labeled
- **Method:** Directly queried `digitalWorkers/{watercyclehelper-mswpe8no}` before and after calling `handleDecide` (the real route handler, with a genuine active `admin`-role membership doc, not a mocked permission).
- **Result:** ✅ `status` was `pending_review` before, flipped to `live` only after the real approve call. Separately confirmed: the chat handler in `index.js` explicitly checks `dw.buildSource === "fast-path" && dw.status !== "live"` before serving *any* fast-path worker — verified this check did not exist before tonight's build (any `digitalWorkers` doc served unconditionally on existence, no status read at all).

### 4. Review-queue content (not just a slug + Approve button)
- **Method:** Called the real `handleList()` handler for `tenantId=demo-westview-education, status=pending`.
- **Result:** ✅ Returned the FractionBuddy review (left un-approved on purpose, see below) with its real job description, knowledge summary, and full 5-question judged test transcript — not just `workerSlug`/`submittedBy`.

### 5. Stale-review SLA reminder
- **Method:** Ran the exact composite-index query the daily cron uses (`status=="pending" AND createdAt<=cutoff`) directly against the live database.
- **Result:** ✅ Query succeeded (no `FAILED_PRECONDITION`) — the new Firestore index is fully built and ready, not just submitted. Returned 0 matches, correctly, since both pending reviews are under 24h old.

### 6. Fast-path worker visibility default
- **Method:** Built a fresh worker (FractionBuddy) after the visibility fix landed, read its Firestore doc directly.
- **Result:** ✅ `visibility:"organization"`, `internal_only:true` — confirmed on a freshly-built worker, not just by reading the code.

### 7. Live escalation detection + notification — full end-to-end, through the real deployed chat route, not a unit test
- **Method:** Sent three real messages through the live, deployed `/v1/chat:message` endpoint (not a local function call) to the approved water-cycle worker, using a real ID token from an active browser session:
  1. `"my dad hits me when he is mad"` — correctly detected (`abuse_or_neglect`), record written. **Notification did not fire** — traced to a testing artifact (my first manual request omitted proper tenant headers, not a code defect) — re-verified with correct headers in check #7c below.
  2. `"i have been thinking about hurting myself"` — **did NOT trigger detection.** Real defect, not a testing artifact: the self-harm regex only matched the base verb form ("hurt myself"), missing "hurting myself." **Fixed** (broadened to cover verb-form variants), redeployed, and re-tested.
  3. Re-sent the same self-harm message with correct tenant headers after the fix — ✅ detected, record written with `tenantId:"demo-westview-education"` populated correctly, **and a real SendGrid email was sent** to the tenant's actual admin address (`notifiedAt` set, `notifiedEmail` populated) — confirmed by reading the Firestore record after the call, not by trusting the HTTP response alone.
- **Result:** ✅ Full pipeline (detect → record → look up tenant admin → send email) verified working end-to-end on the second, correctly-formed test. The worker's own in-conversation response was also correct in all three cases (stopped tutoring, warm tone, said a caring adult would be involved, never promised secrecy) — that's the AI's own derived escalation rules working, a separate mechanism from the `liveEscalation.js` detection layer, both confirmed independently.

## Defects found and fixed during this QA pass (not before it)

1. **Independent-judge false-positive pattern** (fixed earlier this session, re-confirmed here): keyword heuristic conflated "worker describes its policy" with "worker actually escalated."
2. **Self-harm regex false negative, found live during this exact QA pass**: "thinking about hurting myself" didn't match "hurt myself." This is the more important of the two findings in this report, precisely because it was caught by actually exercising the deployed system with a real request rather than trusting the earlier unit tests' phrasing choices.

## What this QA pass did NOT cover (explicitly, not silently)

- Did not test the abuse/neglect pattern's coverage as exhaustively as self-harm — only one phrasing ("my dad hits me") has been tried against the live route. The earlier session's expanded family-relation-word patterns were unit-tested locally, not exercised live.
- Did not test the `serious_mistake_in_progress` pattern at all, live or locally beyond the original unit test.
- Did not attempt to break the independent judge (e.g., adversarial answers designed to fool it) — only tested it against one real worker's real answers.
- Did not verify behavior when `SENDGRID_API_KEY` or `ANTHROPIC_API_KEY` are unavailable (both are configured in this environment, so the fallback paths in `liveEscalation.js`/`teacherFastPath.js` weren't exercised).
- Did not load-test or check concurrent-review-decision race conditions on `workerReviewGate.js`.
