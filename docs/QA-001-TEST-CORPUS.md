# QA-001 — Test Corpus

**Author:** Sean + Claude · 2026-05-29 (initiated mid-debug)
**Purpose:** Living catalog of failure modes captured from real production bugs. When QA-001 ships, every test case below becomes an assertion in the harness. Each bug we hit going forward gets added here.
**Predecessor:** [CODEX-51.27 Framing Doc](./CODEX-51.27-QA-001-and-Intent-Spec-Framework.md)

## Why this file exists

Sean's question to Claude on 2026-05-29 ~09:35 HT: *"Based on your conversation yesterday you said that we could capture this kind of stuff without a human having sit and screen shot. Are we learning from this round on what that worker will be looking for?"*

Honest answer: not until that moment. Debugging the HR/Fundraise canvas tabs surfaced ~6 distinct failure modes across three layers (catalog, sync helper, frontend) — and Claude was fixing each one without writing them down as test cases. This file fixes that. Every bug captured here is one QA-001 will catch the moment a regression re-introduces it.

**Discipline:** Whenever a worker bug is diagnosed, before fixing it, add it here. The fix can come second.

---

## Test families (from framing doc, recapped)

1. **Catalog ↔ Firestore parity** — does the Firestore mirror match the JSON catalog?
2. **Headless Playwright canvas walkthrough** — does each declared tab render without crash?
3. **Endpoint smoke** — do declared backend endpoints return 2xx?
4. **Chat LLM-as-judge** — do responses satisfy successCriteria?
5. **RAAS module load + isolation** — does the right ruleset load per worker?

---

## Test cases captured during S51.28 debug session

### TC-001 — workerSync helper writes all catalog structural fields
- **Family:** 1 (Catalog ↔ Firestore parity)
- **Severity:** P0 (load-bearing — silently dropped 4 fields for every worker)
- **Real bug:** `helpers/workerSync.js` `.set()` call did not include `canvasTabs`, `constraintRaasSources`, `controlCenterContribution`, or `intent`. Any catalog edit to those fields silently failed to reach `digitalWorkers/{slug}`. Frontend fell back to generic Overview/Activity/Resources defaults.
- **Test:** For every worker in catalog, pick one of the four fields, modify the catalog JSON, run sync, read Firestore mirror, assert Firestore value matches catalog value.
- **Pass:** Firestore.canvasTabs === catalog.canvasTabs (deep equal)
- **Fail signal:** Firestore field missing OR generic defaults (`[Overview, Activity, Resources]`)
- **Discovery method:** Direct Firestore read after sync showed 3 generic tabs instead of declared 9. Diagnosed by reading helper source.

### TC-002 — Slug-aliased Firestore docs stay in sync
- **Family:** 1 (Catalog ↔ Firestore parity)
- **Severity:** P1 (affects workers whose canonical slug changed at some point)
- **Real bug:** Catalog declared `slug: "hr-people"` but workspace memberships still keyed by legacy `platform-hr` slug. Sync wrote to `digitalWorkers/hr-people` but `digitalWorkers/platform-hr` had stale 4-tab data. Frontend looked up `platform-hr` and got stale view.
- **Test:** For each catalog entry, check if Firestore has additional docs with related slug patterns (legacy aliases). If found, assert they have identical canvasTabs.
- **Pass:** All slug-aliased docs have matching canvasTabs (or no aliases exist)
- **Fail signal:** Two docs with same `intent.problem` but different `canvasTabs`
- **Discovery method:** Sean reloaded; saw old tabs despite verified sync. Listed all Firestore docs for `*hr*` slugs — found two.
- **Follow-up needed:** Aliasing should be declarative. Add `aliases: ["platform-hr"]` to catalog entry so workerSync writes both. Then deprecate aliases over time.

### TC-003 — Sidebar sub-nav matches catalog canvasTabs
- **Family:** 2 (Headless Playwright walkthrough — extended to navigation)
- **Severity:** P1 (UX inconsistency confuses users about what worker can do)
- **Real bug:** `Sidebar.jsx` line 880-891 hardcodes `platform-hr` and `hr-people` sub-nav as `[Employees, Scheduling, Compliance, Onboarding]`. Catalog declares 9 different tabs. Sidebar expansion shows 4 legacy items, top-bar shows 9 catalog items — same worker, two truth sources.
- **Test:** For each worker in catalog, headless-render sidebar expansion. Compare sub-nav labels to catalog.canvasTabs labels.
- **Pass:** Sub-nav labels are a subset (or equal) of catalog.canvasTabs labels
- **Fail signal:** Sub-nav contains labels not in catalog.canvasTabs (= hardcoded legacy)
- **Discovery method:** Sean's screenshot showed conflicting tab sets. Grep'd Sidebar.jsx for hardcoded HR.
- **Follow-up needed:** Sidebar should derive sub-nav from worker.canvasTabs filtered to view=admin (or similar). Kill the hardcoded dictionary.

### TC-004 — Worker default landing page reflects current catalog
- **Family:** 2 (Headless Playwright walkthrough)
- **Severity:** P2 (cosmetic but signals stale content to users)
- **Real bug:** `WorkerCanvas` component renders worker default landing view with hardcoded KPI cards ("Pipeline Value $28.5M", "Team Size --") that predate the canvas-tab system. New users see content unrelated to the worker's declared intent.
- **Test:** Render worker home (no tab selected). Extract visible KPI labels. Assert they appear in catalog `intent.canonicalJourneys` or `controlCenterContribution.kpis`.
- **Pass:** Landing KPIs map to declared intent
- **Fail signal:** Landing shows KPIs unrelated to declared journeys (legacy content)
- **Discovery method:** Screenshots showed $28.5M LP-side data on FOUNDER-side Fundraise worker. Mismatch between landing content and worker purpose.

### TC-005 — Demo fixtures fire on tab click
- **Family:** 2 + 4 (Playwright + behavioral)
- **Severity:** P2 (first-visit UX — new users see empty state instead of demo)
- **Real bug:** `WorkerHomeRenderer` first-visit logic explicitly keeps the landing page until user clicks a tab. New users see hardcoded landing instead of fixtures showing what the worker can do.
- **Test:** Render worker home. Click each declared canvas tab. Assert each click produces a canvas card with `demoMode === true` (SAMPLE chip rendered).
- **Pass:** Each tab click renders a non-empty fixture card
- **Fail signal:** Tab click does nothing OR fixture missing for that tab id
- **Discovery method:** Sean noted that screenshots showed default landing with tabs above but no fixture content visible. Behavior is by-design but worth measuring.

### TC-006 — Worker slug consistency across all touchpoints
- **Family:** 1 (Catalog ↔ Firestore parity — extended)
- **Severity:** P1 (cascading failures when slug doesn't match)
- **Real bug:** HR has THREE slug variants in active use:
  - Catalog: `hr-people`
  - Sample fixture keys: `platform-hr`
  - Sidebar sub-nav keys: both `platform-hr` AND `hr-people`
  - Workspace subscription: `platform-hr` (legacy)
- **Test:** For each catalog worker, grep frontend codebase for usages of the slug. If multiple variants found, fail.
- **Pass:** Only one slug variant referenced
- **Fail signal:** Multiple slug variants → frontend/backend/fixtures will diverge
- **Discovery method:** Six grep searches across this debug session. Multiple variants in different places.
- **Follow-up needed:** Pick ONE canonical slug per worker. Add to catalog as `slug` + `aliases: []`. Use aliases for migration; treat any code reference to alias as a deprecation warning.

### TC-007 — Frontend rebuild includes latest catalog read paths
- **Family:** 1 (Catalog ↔ Firestore parity)
- **Severity:** P2 (transient — appears as "old tabs" until rebuild + deploy)
- **Real bug:** Catalog edits change Firestore. But if frontend JS bundle is cached / outdated, users see stale UI for hours after fix.
- **Test:** After catalog deploy, hit hosting URL and inspect `<script>` references. Assert `index-{hash}.js` hash is newer than catalog deploy timestamp.
- **Pass:** Bundle hash newer than last catalog write
- **Fail signal:** Bundle predates catalog change (users still getting stale content)
- **Discovery method:** Multiple "hard reload" instructions needed during debug.

### TC-008 — Fixture key matches actual worker slug
- **Family:** 1 + 4
- **Severity:** P1 (fixtures don't render even when wired correctly)
- **Real bug:** `sampleData.js` `WORKER_SAMPLES["platform-hr"]` was authored, but worker slug in workspace is `hr-people` (or now `platform-hr` after alias mirror — but the canonical catalog slug is `hr-people`). Fixture lookup by `worker.slug` might not match.
- **Test:** For each catalog worker, iterate canvas tabs, call `getFixtureForTab(worker, tab.id)`. Assert non-null fixture returned for at least one tab.
- **Pass:** Every worker has at least one tab with a fixture matching its slug
- **Fail signal:** All fixture lookups return null (slug mismatch with sampleData keys)
- **Discovery method:** Anticipated during sampleData.js authoring — flagged as known mismatch risk for HR specifically.

---

## Open / not-yet-captured failure modes

### TC-009 — Tab `signal` field required for click handler to fire
- **Family:** 2 (Headless Playwright walkthrough)
- **Severity:** P0 (tabs render but are entirely non-interactive — discoverable only via human click)
- **Real bug:** Catalog `canvasTabs` entries declare `{id, label, view, description}` but no `signal` field. WorkerHomeRenderer calls `lookupSignal(tab.signal)` on click; with `tab.signal === undefined` the lookup returns null, the click handler silently exits, and nothing happens. Tabs LOOK clickable but are dead. Hard to notice visually since hover state still applies.
- **Test:** For each declared canvas tab, assert `signal` field is non-empty string AND `lookupSignal(signal)` resolves to a valid signal definition.
- **Pass:** Every tab has a resolvable signal
- **Fail signal:** Tab missing `signal` field, OR signal string doesn't match any registered signal
- **Discovery method:** Sean clicked "People" tab on HR; nothing happened. Confirmed by reading WorkerHomeRenderer code: `const resolved = lookupSignal(def.signal); if (!resolved) return;`
- **Why this matters for QA-001:** This is the EXACT class of bug QA-001 catches and Sean's eyeballs can't. The tabs render so a visual diff looks fine; the click is non-interactive so only an automated click-and-assert catches it.

---

## Outbound-comms / ID / Documents test families

Sean 2026-05-29 (post S51.30 deploy): many workers will require outbound comms (email/SMS), ID checks (Stripe Identity), and document signing (Dropbox Sign). These are external-system integrations with their own failure modes that QA-001 must verify. Three new families:

- **Family 6 — Outbound comms delivery.** Email queued → SendGrid 2xx → deliverable address → not spam. SMS via Twilio analogous.
- **Family 7 — ID check lifecycle.** Stripe Identity session create → user submits → webhook → entity state updated → obligation marked complete.
- **Family 8 — Document signing lifecycle.** Dropbox Sign request → signature email → user signs → webhook → signed PDF persisted to storage → obligation marked complete.

### TC-010 — pendingInvite obligations must reflect existing entity state
- **Family:** 1 (Catalog ↔ Firestore parity — extended to invite ↔ entity)
- **Severity:** P1 (banner shows "Start" on already-completed steps; confusing for resumed flows)
- **Real bug:** `recordPendingInvite` writes the default obligation list whenever an invite is re-fired, even if the entity (advisor/investor/creator) already has `kycStatus=approved` or `flowStep=signature_complete`. The banner then shows "verify-identity" as open even though the existing advisor record has it done. Test fire of aspensean@gmail.com re-invite on 2026-05-29 surfaced this — advisor adv_a6702cc819e40f23 is at `kyc=approved step=signature_pending`, but the pending-invite obligations still show all 3 as not-yet-completed.
- **Test:** After `recordPendingInvite` runs, for each obligation check the corresponding entity field (kycStatus / flowStep / agreementAcceptedAt) and assert `completedAt` is populated if the entity already shows that step done.
- **Pass:** Open obligations only include steps not already complete on the entity.
- **Fail signal:** Banner renders "Start" button for an action that won't actually do anything new (e.g., Stripe Identity refuses to re-verify an approved user).
- **Discovery method:** Re-fired aspensean advisor invite while existing advisor record was mid-flow. Banner would show stale obligations.
- **Fix sketch:** `recordPendingInvite` reads the entity doc and pre-populates `completedAt` on each obligation that's already done on the entity side. Idempotent re-runs heal stale state.

### TC-011 — Missing email-provider credentials fail loudly
- **Family:** 6 (Outbound comms delivery)
- **Severity:** P1 (silent failure — invite "succeeds" but recipient never gets it)
- **Real bug:** `advisorFlow.initiateAdvisorFlow` returns `{ ok: true, magicLinkUrl, emailQueued: false }` when `SENDGRID_API_KEY` env var is missing. The flow looks successful, the magic link is generated, but no email goes out. Test on 2026-05-29 logged "SENDGRID_API_KEY not set — invite email NOT sent" but the API response still claims `ok: true`. Production with misconfigured secrets ships invites that never arrive.
- **Test:** After initiate, assert email actually queued (SendGrid 2xx) OR response explicitly carries `emailQueued: false` AND surfaces the failure to the caller (not buried in a warning log). For external recipients, post-condition check: SendGrid delivery webhook fires within N minutes.
- **Pass:** Recipient inbox received the message (verified via SendGrid event webhook OR mailbox poll).
- **Fail signal:** `emailQueued: false` returned with `ok: true` (current state) — should be `ok: false, reason: "email_provider_unconfigured"` instead.
- **Discovery method:** Test fire on 2026-05-29 caught this in the log; would not be caught by any current automation.
- **Fix sketch:** When `emailQueued: false` AND the recipient is real (not Sean himself dogfooding), return `ok: false`. Optionally fall back to a different provider.

### TC-012 — Stripe Identity session re-use vs re-create
- **Family:** 7 (ID check lifecycle)
- **Severity:** P2 (charge double for redundant verifications, OR fail with "already verified")
- **Real bug:** Banner click for "verify-identity" calls `/v1/ir:advisor:step` with action `start_identity`. If advisor already has `kycStatus=approved`, Stripe Identity will either return a useless session or charge again. Behavior is currently undefined.
- **Test:** Call `start_identity` on an entity with `kycStatus=approved`. Assert one of: (a) backend returns `{ok: true, alreadyVerified: true}` without hitting Stripe; (b) Stripe session is created but obligation closes immediately on next status check.
- **Pass:** No duplicate Stripe charge, no user-visible "already verified" error.
- **Fail signal:** Stripe charge fires for an approved user, OR user lands on Stripe Identity and sees "we couldn't process your request."
- **Discovery method:** Anticipated from TC-010 — already-approved entities shouldn't enter the verify-identity action path.
- **Fix sketch:** Backend pre-check on `kycStatus` before creating a new identity session. If approved, return inline-complete; banner marks obligation done.

### TC-013 — Dropbox Sign signing-link delivery (no inline URL)
- **Family:** 8 (Document signing lifecycle)
- **Severity:** P1 (banner click does nothing visible; user doesn't know to check email)
- **Real bug:** `advisorFlow.startAdvisorSigning` returns `{ok, requestId, hellosignRequestId, recipientEmail}` — NO `signingUrl`. Dropbox Sign delivers the signing link via its own email. Banner click currently calls `await refresh()` after the response, which shows no visible change. User is left wondering if anything happened.
- **Test:** After `start_signature` action returns without `signingUrl`/`identitySession`, banner must show a "Check your email — Dropbox Sign sent a signing link to {recipientEmail}" status message inline. Webhook then fires on signed → obligation marked complete → banner row crosses off.
- **Pass:** User sees clear inline confirmation that the action triggered an email, plus the recipient address (for self-verification).
- **Fail signal:** Banner click goes silent. Nothing in UI tells the user what to do next.
- **Discovery method:** Code-read of advisorFlow.startAdvisorSigning during S51.30 deploy. Will manifest as a user complaint ("clicked Sign Agreement, nothing happened") if not pre-fixed.
- **Fix sketch:** Banner detects `hellosignRequestId || signatureRequestId` in response and renders "Email sent to {recipientEmail} — check inbox" instead of redirecting.

### TC-014 — Magic-link redirect carries invite param through Cloudflare
- **Family:** 1 + 6 (parity + outbound)
- **Severity:** P0 (without invite param, banner can't fetch obligations; flow degrades to legacy /onboard/* prompt-state)
- **Real bug:** AuthMagic.jsx sets `window.location.href = "/?worker=hr-people&invite=" + id`. If Cloudflare frontdoor or the hosting rewrites strip the query string, the banner gets no inviteId and falls back to `/v1/invites:current` (which also works once the invite is claimed, but is a different code path).
- **Test:** Hit the AuthMagic URL with a known token in headless browser; assert that after redirect, `window.location.search` contains `invite=<id>`.
- **Pass:** Invite param survives redirect.
- **Fail signal:** Invite param missing in final URL after redirect; banner relies on `/v1/invites:current` fallback only.
- **Discovery method:** Anticipated from "magic link landed at /auth/magic with no params" report on Friday morning.
- **Fix sketch:** If detected, use hash routing (`/#invite=<id>`) which survives more aggressively, or set a sessionStorage token AuthMagic writes and the banner reads.

### TC-016 — Step-action response shape varies across flows
- **Family:** 3 + 7 (Endpoint smoke + ID check lifecycle)
- **Severity:** P0 (Stripe Identity redirect fails silently — button "doesn't work" from user's perspective)
- **Real bug:** `creatorFlow.startIdentityVerification` returns `{ ok: true, identitySession: result }` — wraps the Stripe session under `identitySession.url`. `advisorFlow.startIdentityVerification` returns the bare Stripe result `{ ok, sessionId, client_secret, url }` — flat. Banner code only checked the wrapped shape (`data.identitySession?.url`), so the advisor button click would silently fall through to a `refresh()` instead of redirecting. From the user's POV: click does nothing.
- **Test:** For each role's step:start_identity action, assert the response contains EITHER `identitySession.url` OR `(url AND sessionId)`. Banner should redirect on either.
- **Pass:** Banner navigates to Stripe Identity within 2s of button click.
- **Fail signal:** Click resolves silently with no navigation (network-200 but no UI change).
- **Discovery method:** Dogfood click on Verify Identity → no redirect. Server logs showed 200 OK on /v1/ir:advisor:step. Diff between creatorFlow and advisorFlow return shapes surfaced the inconsistency.
- **Fix sketch:** Banner accepts both shapes (shipped in S51.32). Long-term: normalize step-action response shape across all flows — every role's startIdentityVerification returns `{ ok, identitySession: { sessionId, url } }`. Document the contract in `services/_shared/`.

### TC-018 — Stripe Identity webhook doesn't fire, only fallback works
- **Family:** 7 (ID check lifecycle)
- **Severity:** P0 (every advisor/investor/creator who completes ID stays in identity_pending forever until manual sync)
- **Real bug:** Sean completed Stripe Identity verification (real ID, name verified) at 2026-05-29 ~10:50. Advisor doc stayed `kycStatus: not_submitted, flowStep: identity_pending` indefinitely. Stripe webhook was either not configured, not delivered, or silently failed. Manual call to `advisorFlow.syncKycFromStripe({ advisorId })` immediately flipped advisor to `kycStatus: approved, flowStep: identity_complete, kycApprovedAt: set`. So the recovery path works; the webhook does not.
- **Test:** After Stripe Identity verification completes (mock or live), assert the entity's `kycStatus === "approved"` within 30s. If not, fail and capture: was the webhook delivered? Stripe webhook console shows event status.
- **Pass:** Webhook lands within 30s and flips entity state without user action.
- **Fail signal:** Entity stuck at identity_pending after 30s post-verification. Banner shows Verify Identity as still "Start" even though Stripe says approved.
- **Discovery method:** Live dogfood 2026-05-29. Sean said "Did the ID check but it didn't register on the workspace." Manual sync via /tmp/sync_kyc.js confirmed Stripe verified, advisor flipped.
- **Fix sketch (two pieces):**
  1. Diagnose webhook: is endpoint registered in Stripe dashboard? Is signing secret correct? Does the handler match the event type? Check function logs for any `stripe webhook` calls — if none, webhook is not delivered.
  2. Defensive: banner auto-fires `sync_kyc` action when it detects an open verify-identity obligation with a `stripeIdentitySessionId` set on the entity. Single backend poll that takes ~500ms and recovers the state without depending on the webhook landing first. This is the right UX even when the webhook works.

### TC-017 — No welcome chat message for invited users
- **Family:** 4 (Chat LLM-as-judge — extended to opener)
- **Severity:** P2 (no broken behavior, but the chat panel sits empty during onboarding — wastes the two-screen-movie effect)
- **Real bug:** Invited user lands in workspace with obligation banner on canvas + empty chat panel. The hr-people chat header is visible but no message kicks off. Sean's observation 2026-05-29: chat should auto-fire "Welcome FIRSTNAME, let's get you set up with your advisor role at SOCIII" when an invite is detected.
- **Test:** Land in workspace with `?invite=<id>` for each role. Within 3s of mount, assert chat panel has ≥1 assistant message AND message content matches the role-appropriate welcome template.
- **Pass:** Chat opens with role-specific welcome referencing the user's first name.
- **Fail signal:** Chat panel empty 5s after invite-driven workspace load.
- **Discovery method:** Sean's screenshot of incognito dogfood — empty chat panel above the visible obligation banner.
- **Fix sketch:** Detect invite param on workspace mount; fire a chat opener with role-aware copy. Templates live in `services/_shared/chatOpeners.js` (new). Worker prompt registry takes a `welcome` field for invited users.

### TC-015 — requireFirebaseUser return-shape misuse silently 403s
- **Family:** 3 (Endpoint smoke — extended to auth-helper contract)
- **Severity:** P0 (every authenticated call to the new endpoint silently fails; banner appears to "just not render")
- **Real bug:** `/v1/invites:current` and `/v1/invites:get` consumed `await requireFirebaseUser(req, res)` as if it returned the decoded user directly. The helper actually returns `{ handled, user, res? }`. So my `user.uid` was `undefined`. The 403 guard `invite.claimedByUserId !== user.uid` evaluated `"<aspensean uid>" !== undefined` = true. Every call returned 403. Function logs at 20:11:22Z 2026-05-29 showed `❌ API ERROR: 403 not your invite {}` even though Firestore had the matching claimedByUserId.
- **Test:** For every authenticated route, assert the auth-helper destructure matches the helper's contract (`auth.user.uid`, not `user.uid` directly). Shipped pattern across `index.js` is `const auth = await requireFirebaseUser(...); if (auth.handled) return;` then `auth.user.uid`.
- **Pass:** New endpoint returns 200 with the invite body when caller IS the claimer.
- **Fail signal:** 403 on a route the user should own; no error in client logs (silent banner-empty state).
- **Discovery method:** Live dogfood by Sean 2026-05-29 — aspensean clicked the magic link, banner didn't appear, function log showed 403. Caught via `firebase functions:log` grep for the route + timestamp window.
- **Why this matters for QA-001:** Auth-helper contract violations are the single most common class of "endpoint exists, looks deployed, silently 4xxs" bug. QA-001 must hit every new authenticated route at least once with a known-authorized caller and assert 2xx + expected body shape.

### TC-019 — Dropbox Sign sync defensive path + "user opened email but didn't sign" failure mode
- **Family:** 8 (Document signing lifecycle)
- **Severity:** P1 (UX dead-end — user thinks they signed, banner correctly shows incomplete, but no surface tells them what's actually pending on the DBX Sign side)
- **Real bug** (the surprise — *not* the bug we expected): Sean signed the SOCIII Advisor Agreement via Dropbox Sign at 2026-05-29 ~10:54 (screenshot of "Review & sign" email + completed in-browser flow). Reported "agreement worked, but didn't update status on the worksapce." We built `syncSignatureFromDropboxSign` assuming a webhook-miss (same archetype as TC-018) and ran it. Result: `is_complete: false`, `aspensean@gmail.com signed=false`, `seanlcombs@gmail.com signed=false`. DBX Sign reports the document is NOT signed by either party. So the advisor doc state is correct — it's the **user's mental model** that diverged from DBX Sign. Either: (a) the in-browser signing flow opened but never reached final submit, or (b) the two-signer template requires both Sean's accounts to sign and only the first leg was attempted. Webhook is not broken; user is stuck mid-flow with no surface telling them so.
- **Test:** After a user opens a DBX Sign packet and the workspace banner detects an open sign-* obligation, the banner should poll DBX Sign and surface signer-level state ("Aspen Sean — not yet signed; Sean L Combs — not yet signed") instead of staying silent. Assert: when DBX Sign reports `is_complete: false` AND at least one signer.signed=false, banner shows a per-signer status line.
- **Pass:** Banner sub-text shows which signers still need to sign, with a Resume Signing link if the current user is a pending signer.
- **Fail signal:** Banner shows generic "Start" / "Working..." with no indication that the DBX Sign side knows nothing has actually been signed.
- **Discovery method:** Live dogfood 2026-05-29 ~10:54. Defensive sync we'd shipped to handle TC-018-style webhook miss actually surfaced a different problem class — user-side signing-flow drop-off.
- **Recovery shipped:**
  1. `hellosign.getSignatureRequest()` wrapper for DBX Sign `GET /signature_request/{id}`.
  2. `advisorFlow.syncSignatureFromDropboxSign({ advisorId })` — pulls current state, replays `onSignaturePacketSigned()` if `is_complete=true`, otherwise returns per-signer status.
  3. `/v1/ir:advisor:step` action `sync_signature` + parallel `hr:advisor:step` route.
  4. Banner defensive auto-sync — when an open `sign-*` obligation is present, banner fires `sync_signature` once per (invite, mount) so a webhook miss can self-heal on next page load.
  5. ID-mapping fix: sync uses `hellosignRequestId` (real DBX Sign id, e.g. `77d6711e3459...`) not `signatureRequestId` (our internal `sig_*` handle — DBX Sign rejects it as invalid).
- **What still needs building:**
  1. Banner should display per-signer signed/not-signed state when sync returns `note: "not_yet_signed"`, with a Resume Signing CTA for any signer whose email matches the current user.
  2. DBX Sign has a separate "Reminder" API — surface that as the Resume Signing action.
  3. If the same user is BOTH signers (Sean's two-Gmail dogfood case), banner needs to tell the second account to sign too. (Real production case = recipient + countersigning officer; same fix applies.)
- **Generalization:** TC-018 + TC-019 are *not* actually the same archetype, even though we initially treated them that way. TC-018 = webhook miss → entity stuck despite provider being done. TC-019 = user-side drop-off → entity correctly pending, but user thinks they're done. The defensive sync pattern covers both: it always re-pulls provider truth at workspace mount, and the response shape (`is_complete` + per-signer) tells the banner which case it's in. QA-001 should distinguish these in assertion language: "provider says complete, entity says pending" (webhook miss) vs. "provider says incomplete, user thinks complete" (UX gap).

---

## Test cases captured during S51.37 IR worker dogfood (2026-05-29)

Single end-to-end SAFE walkthrough (aspensean@gmail.com invited to SOCIII Seed Round 2026) surfaced 8 P0 bugs across 7 distinct failure classes. **None would have been caught by code review or unit tests** — each required live execution against real third-party services with state propagation. See `~/.claude/projects/-Users-seancombs/memory/project_ir_dogfood_2026_05_29.md` for the meta-analysis.

### TC-020 — Email subject triggers Gmail Promotions filter
- **Family:** 6 (Outbound comms)
- **Severity:** P0
- **Real bug:** Invite subject "Welcome to SOCIII, Sean — pre-seed access" lands in Gmail Promotions, not Primary. Adjacent emails (Veterans United Home Giveaway, Upwork Hiring Needs) confirm classifier reading "Welcome to..." + financial language as marketing. Real Storyhouse-style investors would miss it.
- **Test:** For every outbound provider email send, assert delivered-to-Primary via SendGrid event log OR Gmail Postmaster signals. Subject lines should be personalized ("{firstName} — SOCIII intro") not announcement-shaped ("Welcome to...").
- **Fix:** Lead with recipient firstname, no product name in subject. Validated: subject "Sean — SOCIII intro" lands in Primary.

### TC-021 — Obligation action string doesn't match backend route; sync_kyc missing
- **Family:** 3 (Endpoint smoke) + 7 (ID check lifecycle)
- **Severity:** P0
- **Real bug:** Two distinct bugs in one click. (1) `pendingInvites.DEFAULT_OBLIGATIONS` declared action `ir:investor:step:start_safe_signing` but `/v1/ir:investor:step` route only knew `start_signature` → "Unknown action" error. (2) Investor route had no `sync_kyc` handler and investorFlow had no `syncKycFromStripe` → same TC-018 stuck-state with no recovery.
- **Test:** For every obligation declaration in pendingInvites.js, assert the action string is handled by the route handler. Cross-flow: every flow that has Stripe Identity must have syncKycFromStripe.
- **Fix:** Added `start_safe_signing` as alias for `start_signature`. Ported `syncKycFromStripe` from advisorFlow and wired `sync_kyc` action on investor route.

### TC-022 — Hardcoded valuation cap ignores fundraise's actual cap
- **Family:** 1 (Catalog ↔ Firestore parity) extended to cross-doc fidelity
- **Severity:** P0 (existential — SAFE with wrong terms ships to investor)
- **Real bug:** `DEFAULT_VALUATION_CAP = 10_000_000` hardcoded in 7 places throughout investorFlow.js (sharesIssued calc, SAFE packet vars, email template, investor doc stamp). Sean's SOCIII Seed Round had `valuation_cap: 25000000` on the fundraise doc — entirely ignored. Email + DBX Sign packet would have shipped a $10M-cap SAFE for a $25M-cap round.
- **Test:** For every entity field used in an outbound document, assert the source-of-truth path is the parent record (fundraise.valuation_cap), not a hardcoded constant. QA-001 should grep for `DEFAULT_*` constants in flow code and flag any that override tenant-level config.
- **Fix:** Read fundraise.valuation_cap in startSafeSigning, initiateInvestorFlow (email), and `_investorInviteEmail`. DEFAULT only as fallback when fundraise has no cap set.

### TC-023 — SAFE signing required investmentAmount but banner doesn't have it
- **Family:** 3 (Endpoint smoke) + 8 (Document signing lifecycle)
- **Severity:** P0
- **Real bug:** `startSafeSigning` validates `investmentAmount >= 100` and rejects when missing. The workspace banner fires `start_safe_signing` with `{ investorId, fundraiseId, action }` — no amount context. Result: "investmentAmount must be >= 100" error every click. Banner has no UX surface to ask for amount either.
- **Test:** For every flow action, assert the caller's payload contract matches the function signature's required fields. Missing fields should have a fallback source on the entity doc, not just a hard error.
- **Fix:** Backend falls back to investor.commitment_amount (stamped at invite time) when caller doesn't supply investmentAmount. Explicit caller-supplied amount still wins.

### TC-024 — Email promises materials the workspace doesn't surface
- **Family:** 6 (Outbound comms) + UX gap class (new)
- **Severity:** P0
- **Real bug:** Email body section 2 says "Inside the portal you'll find the SOCIII pre-seed deck and the SOCIII whitepaper." Investor lands in workspace, completes ID, signs SAFE — at no point sees deck or whitepaper anywhere. Email promised, workspace doesn't deliver. Real investor would feel misled.
- **Test:** For every claim an outbound communication makes about a UI surface, assert the UI surface exists and is reachable for the recipient. QA-001 needs a semantic check across email content + workspace render trees.
- **Fix (fast):** Rewrote email to "I'll follow up directly with [deck] and [whitepaper]". **Fix (real):** Built WorkspaceInvestorMaterials component (S51.38) — card on investor's workspace landing showing deck/whitepaper/data-room/office-hours. Renders when verify-identity is complete; uses placeholder text when URL not configured.

### TC-025 — Template ID secret points at phantom (no template with that ID exists)
- **Family:** 8 (Document signing lifecycle) + secret-validity check
- **Severity:** P0
- **Real bug:** `DROPBOX_SIGN_TEMPLATE_INVESTOR_SAFE` firebase secret was set to `a449d959c7fad977625e56c19b5e33400cefd459`. Real SAFE template in the DBX Sign account is `b02348bc530d225d1a913cc38d55aa4ed03a8bbf` ("SOCIII, Inc. SAFE note"). Phantom ID → "Template not found" on send. NDA secret (`e0c73be8...`) is also phantom; real NDA is `cde2a301...`. Latent: warrant + creator template secrets aren't set at all.
- **Test:** At deploy time (or as part of QA-001 startup), for every `DROPBOX_SIGN_TEMPLATE_*` secret, hit DBX Sign `/v3/template/{id}` and assert the template exists with the expected signer_roles.
- **Fix:** Updated SAFE secret to correct template ID. Others tracked.

### TC-026 — Role name case mismatch returns cryptic "No recipients specified"
- **Family:** 8 (Document signing lifecycle)
- **Severity:** P0
- **Real bug:** `ROLE_TEMPLATE_ENV` in signatureService used ALL CAPS role names ("INVESTOR", "COMPANY", "CREATOR", "COUNTERPARTY", "HOLDER", "PLATFORM"). DBX Sign templates have Title Case role names ("Investor", "Company"). Case mismatch → DBX Sign API returns "No recipients specified" (misleading — recipients ARE specified, just under unrecognized role names). Only advisor cfg had the correct case (which is why advisor flow worked).
- **Test:** For every cfg entry in `ROLE_TEMPLATE_ENV`, fetch the template via `/v3/template/{id}` and assert `signer_roles[*].name` exactly equals `signerRole` and `companyRole` from cfg (case-sensitive).
- **Fix:** Investor cfg corrected to "Investor"/"Company". Creator/NDA/warrant still wrong (latent).

### TC-027 — State-name drift between flow code and obligation enrichment
- **Family:** 1 (Catalog ↔ Firestore parity) extended to state-machine consistency
- **Severity:** P0
- **Real bug:** `onSignaturePacketSigned` (investorFlow) writes `flowStep: "signature_complete"`. The pendingInvites enrichment for `sign-safe` obligation only checked `["safe_signed", "safe_complete", "closed"]` — none of those match. Result: SAFE actually closed in Firestore, DBX Sign returned is_complete=true, webhook fired and propagated, BUT the workspace banner still showed Step 2 as "Start" because the enrichment didn't recognize the actual state value.
- **Test:** For every flowStep value written by any flow's `onSignaturePacketSigned` (or equivalent), assert that value appears in pendingInvites enrichment's "completed" list for the corresponding obligation. State-machine cross-file consistency check.
- **Fix:** Added "signature_complete" to the recognized list. Keep legacy "safe_signed"/"safe_complete" for compat. **Deeper fix is the shared `onboardingFlow.js` refactor (task #306) which would have a single source of truth for state names.**

---

## Meta-finding: dogfood density

Above 8 P0 bugs were caught in **one single SAFE walkthrough** (one investor, one action sequence). That's the strongest signal yet for QA-001 ROI sizing: every outbound flow has 6-8 latent P0s at any given moment, and they only surface in real execution against real third-party services.

QA-001 doesn't need to be sophisticated to be valuable. A simple harness that runs each outbound flow end-to-end weekly would catch all 8 of these bugs before they shipped to any real customer.

---

## TC-041 — Cold-invite CTA dead-ends at "Missing advisorId" (HR worker dogfood)

- **Date:** 2026-05-30
- **Worker:** Fundraise + Platform HR
- **Family:** 4 (Outbound delivery) + 5 (Onboarding sequencing)
- **Severity:** P0
- **Real bug:** Cold-invite email templates (`ir.cold_invite` + `hr.advisor_cold_invite`) hardcoded a CTA pointing at `/onboard/advisor?ref=<email>` (and `/onboard/investor?ref=<email>`). `AdvisorOnboarding.jsx` requires `?advisorId=<id>` and bails with the literal text "Missing advisorId." IR side appeared to work because `InvestorInquiry.jsx` accepted `ref=email` and provisioned inline — but per Phase 2.D the `/onboard/*` routes are deprecated; both should land in materialized workspace via `/auth/magic`.
- **Onboarding sequence violation (deeper):** Composer also exposed `safe` (IR) + `advisor_agreement` (HR) as founder one-click templates. The intended flow is **deck → ID check → sign** with Step 3 firing from the recipient's workspace obligation card post-KYC, not as a founder ad-hoc send.
- **Test:** Send a cold invite via `/v1/hr:send-advisor-invite` and `/v1/ir:send-cold-invite`; assert the CTA URL in the rendered HTML matches `/auth/magic?token=...` AND that an advisor/investor record + magic-link record exist in Firestore tied to the same recipient email. Separate assertion: `/v1/hr:notice-templates` and `/v1/ir:notice-templates` MUST NOT return `safe` or `advisor_agreement` (composerVisible=false gate).
- **Fix (S51.43.5):** `hr:send-advisor-invite` + `ir:send-cold-invite` now call `initiateAdvisorFlow`/`initiateInvestorFlow` with `suppressEmail: true, allowMissingEquity: true` to mint pending records, then thread `magicLinkUrl` into the cold-invite template body. Both templates lists filter on `composerVisible !== false`. `/onboard/advisor` without `advisorId` redirects to `/`. Click tracking disabled (was rewriting magic URL through url813.sociii.ai without HTTPS).
- **Out of scope:** personalized per-advisor deck generation (deck pipeline is its own work — Sean confirms decks are pre-made per recipient for current cohort).

## TC-042 — HR signature templates need DBX Sign provisioning (stub captured)

- **Date:** 2026-05-30
- **Worker:** Platform HR
- **Family:** 6 (Template lifecycle)
- **Severity:** P1 (won't fire until used; surfaced as stub for visibility)
- **Real bug (latent):** Added HR template stubs (`employment_agreement`, `independent_contractor_agreement`) marked `signaturePacket: true` + `stub: true`. `signatureService.sendSignaturePacket` will fail with "no template configured" if invoked because the DBX Sign account doesn't have these templates uploaded.
- **Test:** Boot-time assertion: every template with `signaturePacket: true` has a corresponding DBX Sign template ID configured in signatureService role configs. Templates flagged `stub: true` are excluded.
- **Fix:** Templates flagged `stub: true` and not exposed in the composer (gated by `composerVisible` separately for the agreements, exposed for the email notices `performance_improvement` + `termination_notice` since those have placeholder legal copy). Real fix is upload DBX templates + wire IDs into signatureService. Performance Improvement Plan + Termination Notice email templates ship as stubs with placeholder legal copy pending counsel review.

---

## TC-043 — Composer per-recipient PDF deck attachment + 15MB cap

- **Date:** 2026-05-30
- **Worker:** Platform HR (composer)
- **Family:** 4 (Outbound delivery)
- **Severity:** P1
- **Real bug (latent):** Composer accepts a per-recipient deck PDF inlined via base64 in the SendGrid `attachments` array. Without a client-side size cap, a >22MB file would blow past the 32MB Cloud Functions request body limit (33% base64 expansion). Currently capped at 15MB.
- **Test:** Pick a 16MB PDF in the per-recipient picker; assert client-side rejects with filename + size error before send. Also: pick a 14MB PDF; assert send succeeds and SendGrid receives `attachments[0].content` as valid base64.
- **Fix:** `handleDeckFile` in `NoticeComposerPanel.jsx` rejects `file.size > 15 * 1024 * 1024` with `setStatus({ kind: "err" })`.

## TC-044 — Composer per-recipient `customBodyHtml` override

- **Date:** 2026-05-30
- **Worker:** Platform HR (composer)
- **Family:** 4 (Outbound delivery) + 5 (Onboarding sequencing)
- **Severity:** P0
- **Real bug (latent):** Different advisors need different email copy in the same send (e.g. Kent gets a "final draft, sign or revise" follow-up while six others get the standard cold-invite). Without per-recipient override, founder has to send each as a separate batch.
- **Test:** Build a 2-recipient send. Set `customBodyHtml` on recipient #1 only. Assert: recipient #1's rendered HTML uses the custom body with `{firstName}` interpolated; recipient #2's HTML uses the default template body with `magicUrl` interpolated. No cross-contamination.
- **Fix:** `/v1/hr:send-advisor-invite` checks `r.customBodyHtml`; if truthy, substitutes `{firstName}`/`{name}`/`{magicUrl}` tokens and uses as the body; if blank, falls back to `tpl.bodyHtml(...)`. SendGrid `custom_args.customBody` = "1"|"0" for tracking.

## TC-045 — Custom body token substitution with empty firstName

- **Date:** 2026-05-30
- **Worker:** Platform HR (composer)
- **Family:** 4 (Outbound delivery)
- **Severity:** P2
- **Real bug (latent):** Token interpolation uses `r.firstName || (r.name || "").split(" ")[0] || ""`. If both blank (composer row filled email-only), `{firstName}` substitutes to empty → "Dear ,". Should fallback to email localpart or skip the salutation.
- **Test:** Send to recipient with email only. Assert rendered body either: (a) substitutes firstName to title-cased email-localpart, or (b) detects empty + uses name-less salutation. "Dear ," is not acceptable.
- **Fix (deferred):** Explicit fallback chain in token substitution OR frontend requires either name or firstName before send.

## TC-046 — CC default address routing post-rebrand

- **Date:** 2026-05-30
- **Worker:** Platform HR (composer)
- **Family:** 4 (Outbound delivery)
- **Severity:** P2
- **Real bug:** Composer CC defaulted to `sean@titleapp.ai` (legacy). Sean's working inbox is `sean@sociii.ai`. Sends were CC'd to the legacy address; founder didn't see them in his working inbox.
- **Test:** Open composer in cold-invite mode; assert default CC = `sean@sociii.ai`. Send to test recipient; assert SendGrid `personalizations.cc` contains `sean@sociii.ai`.
- **Fix (S51.43.7):** Flipped `ccList` initial state + placeholder + hint in `NoticeComposerPanel.jsx`.

## TC-047 — Cold-invite recipient lands in wrong workspace context

- **Date:** 2026-05-30
- **Worker:** Platform HR + magic-link + App.jsx tenant resolution
- **Family:** 5 (Onboarding sequencing) + 1 (Workspace context)
- **Severity:** P0
- **Real bug:** Magic-link claim correctly identifies the pendingInvite + redirects to `/?worker=hr-people&invite=<id>`. The `WorkspaceObligationsBanner` renders correctly with the right obligations (verify-identity, sign-agreement). BUT App.jsx tenant resolution lands recipient in their PERSONAL workspace, not the inviting tenant's workspace. Sidebar shows their own stuff; SOCIII branding doesn't appear; recipient confused about WHOSE workspace they're in.
- **Test:** Cold-invite to `dev@homdao.io` (no SOCIII membership). Click magic link in incognito. Assert: (a) URL contains `?invite=<id>`, (b) WorkspaceObligationsBanner renders with right obligations, (c) **active tenant in App.jsx is `sociii-platform`, NOT user's personal workspace**, (d) sidebar's MY WORKSPACES section shows "SOCIII, Inc." as active, (e) page header shows SOCIII branding.
- **Fix (pending S51.43.8 — tonight or Sunday):** CODEX 51.43.6 Phase A — magic-link claim creates an entitlement record + App.jsx tenant resolver prefers active entitlement when invite param is present + sidebar renders entitled workspace.

## TC-048 — Workspace obligation → Stripe Identity ID check

- **Date:** 2026-05-30
- **Worker:** Platform HR + IR (Stripe Identity)
- **Family:** 5 (Onboarding sequencing)
- **Severity:** P0
- **Real bug:** ID check is Step 2 of obligation sequence (deck → ID → sign). Verify-identity card calls `/v1/ir:advisor:step` with `action: "start_identity"` → backend creates Stripe Identity session → returns `data.identitySession.url` → frontend redirects to verify.stripe.com. On return, defensive sync polls `sync_kyc` to recover from missed webhook.
- **Test:** Fresh cold-invite + magic link. Land on workspace. Click "Start" on verify-identity. Assert: (a) browser redirects to `https://verify.stripe.com/...`, (b) after completing in Stripe test mode, callback returns to workspace, (c) verify-identity card → "Complete" (green check), (d) sign-agreement card unlocks, (e) Firestore `advisors/{id}.kyc_status === "approved"`.
- **Fix:** Existing infra; assertion captures for regression.

## TC-049 — Workspace obligation → DBX Sign signing card

- **Date:** 2026-05-30
- **Worker:** Platform HR + IR (DBX Sign)
- **Family:** 5 (Onboarding sequencing)
- **Severity:** P0
- **Real bug:** Sign-agreement card calls `/v1/ir:advisor:step` with `action: "request_signature"` → backend creates DBX Sign signature_request → DBX emails recipient → backend returns `{ hellosignRequestId, recipientEmail }` (NOT a `signingUrl`). Frontend surfaces "Signing link sent to {email} — check your inbox" (TC-013 fix).
- **Test:** With KYC complete, click "Start" on sign-agreement card. Assert: (a) banner shows info message with recipient email, (b) Firestore `signaturePackets/{id}` created, (c) DBX Sign email received, (d) on completion, webhook fires → sign-agreement card → Complete.
- **Fix:** Existing infra; assertion captures for regression.

## TC-050 — Bundled advisor + warrant pendingInvites (Eric/Scott/Robert case)

- **Date:** 2026-05-30
- **Worker:** Platform HR + IR
- **Family:** 5 (Onboarding sequencing)
- **Severity:** P0 (when warrant bundling ships)
- **Real bug (not yet shipped):** Advisors with prior HOM contribution (Eric $75K, Scott $50K services, Robert $175K) need BOTH advisor + warrant_holder pendingInvites. Failure mode: only advisor invite minted → workspace shows advisor obligations only → no warrant signing → recipient confused about how warrant gets executed.
- **Test:** Cold-invite send with `warrantCoverage > 0`. Assert: (a) two pendingInvites created (advisor + warrant_holder), both tied to same recipient email, (b) workspace renders obligations from BOTH invites — materials review + verify-identity (shared, single prompt) + sign-advisor + sign-warrant. KYC obligation deduplicated across invites.
- **Fix (pending S51.43.8):** Backend `initiateWarrantFlow` mirrors `initiateAdvisorFlow`. Composer per-recipient `warrantCoverage` field. `/v1/hr:send-advisor-invite` mints both invites when `warrantCoverage > 0`. WorkspaceObligationsBanner already handles multi-invite case.

## TC-051 — Warrant agreement coverage amount matches composer input

- **Date:** 2026-05-30
- **Worker:** IR (warrant minting)
- **Family:** 6 (Template lifecycle) + 7 (Cap table integrity)
- **Severity:** P0
- **Real bug (latent):** When composer sends `warrantCoverage: 75000` (Eric), the resulting warrant agreement document must reflect $75K, not the default template value. Mismatch between email body + signing document = legal/trust failure.
- **Test:** Cold-invite send with `warrantCoverage: 75000`. Assert: (a) warrant pendingInvite carries `coverage: 75000`, (b) DBX Sign template merge → `coverage_amount` token = "$75,000", (c) email body "Your $75K warrant" matches doc "to purchase common stock equal to $75,000 of make-whole coverage".
- **Fix (pending S51.43.8):** Add coverage merge field to HOMMIE warrant DBX template + thread through `initiateWarrantFlow` → signaturePacket creation.

## TC-052 — Services-warrant variant (Scott's $50K case)

- **Date:** 2026-05-30
- **Worker:** IR (warrant minting)
- **Family:** 6 (Template lifecycle) + 7 (Cap table integrity)
- **Severity:** P0
- **Real bug (latent):** Scott's warrant is for SERVICES rendered to HOM, not cash contributed. Different Reg D 506(b) recital language; different tax treatment (compensation income at grant vs capital event at exercise). Using cash-creditor warrant template for Scott creates securities-law + tax-reporting issues.
- **Test:** When composer flags warrant as `warrantType: "services"`, resulting DBX Sign packet uses DIFFERENT template ID than `warrantType: "cash_creditor"`. Assert: (a) `signaturePacket.templateId` differs, (b) recital paragraph differs in rendered PDF.
- **Fix (pending S51.43.8 + counsel review):** New DBX Sign template for services-warrant variant. Counsel-finalize recital language distinguishing services from cash. Wire `warrantType` field through composer → backend → signatureService.

## TC-053 — Robert two-email pattern (loan separate from advisor+warrant)

- **Date:** 2026-05-30
- **Worker:** Platform HR (composer) + IR (loan flow)
- **Family:** 5 (Onboarding sequencing)
- **Severity:** P1
- **Real bug (latent):** Robert receives TWO emails Monday: (a) loan-only thread for the $100K formalization, (b) advisor+warrant bundle. Composer needs to support both as distinct sends. Failure mode: founder accidentally bundles loan into advisor+warrant email → muddies all three legal threads.
- **Test:** Loan email send: Robert's row has `loanAmount > 0`, `warrantCoverage` empty, `templateId === "loan_formalization"`. Advisor+warrant email send: `warrantCoverage: 175000`, `loanAmount` empty, `templateId === "advisor_cold_invite"`. Two separate sends; two separate pendingInvite arrays.
- **Fix (pending S51.43.8):** Composer per-recipient `loanAmount` field (only Robert tonight). Backend `initiateLoanFlow` mints creditor-loan pendingInvite. New HR template `loan_formalization`.

## TC-054 — Email markdown italics render correctly in Gmail

- **Date:** 2026-05-30
- **Worker:** Platform HR (composer)
- **Family:** 4 (Outbound delivery)
- **Severity:** P2
- **Real bug (latent):** Drafts use markdown `*italics*` for the AI-disclaimer line. Backend `customBodyHtml` substitution wraps plain text in `<p>` blocks but doesn't convert markdown. If founder pastes markdown directly, recipient sees literal asterisks in Gmail.
- **Test:** Custom body containing `*Claude (my AI assistant) ran a quick valuation read*`. Assert: rendered HTML has `<em>` or `<i>` wrapping the line, not literal `*`. Either (a) backend converts markdown to HTML, OR (b) composer instructs founder to write HTML directly.
- **Fix (option):** Server-side simple markdown-to-HTML for `*emphasis*` + `**bold**` + line breaks. Or document HTML expectation explicitly.

## TC-055 — Kent custom body has no `{magicUrl}` token (existing user case)

- **Date:** 2026-05-30
- **Worker:** Platform HR (composer)
- **Family:** 4 (Outbound delivery)
- **Severity:** P2
- **Real bug (latent):** Kent already has a SOCIII account. His custom body is a follow-up ("final draft, sign or revise"), NOT a cold invite — no magic link needed. Backend still mints a magic-link record via `initiateAdvisorFlow` which is wasted but non-fatal.
- **Test:** Cold-invite send where `customBodyHtml` doesn't contain `{magicUrl}`. Assert: (a) rendered HTML identical to custom body (no token replacement artifacts), (b) **optional optimization:** skip `initiateAdvisorFlow` minting when custom body doesn't reference the magic link.
- **Fix (deferred):** Add `r.skipMagicLink === true` flag to skip pendingInvite minting. Edge case; not P0.

## TC-056 — Universal P.S. attribution rendering

- **Date:** 2026-05-30
- **Worker:** Platform HR (composer) — all advisor emails
- **Family:** 4 (Outbound delivery)
- **Severity:** P2
- **Real bug (latent):** Every email must end with P.S. attributing draft to Alex + worker. If composer's customBodyHtml omits it, recipient won't see dogfood + AI-cover message. Sean's universal rule per `feedback_ai_attribution_postscript.md`.
- **Test:** Send a cold-invite. Assert rendered HTML contains P.S. pattern matching `/Alex.*AI chief of staff.*Digital Worker/`. Either the default `tpl.bodyHtml` includes it OR the custom body author includes it.
- **Fix (deferred):** Backend appends canonical P.S. block automatically if not detected. Risk: founder may want different attribution for some sends; needs opt-out flag.

## TC-057 — PDF deck picker too visually deemphasized

- **Date:** 2026-05-30 (caught in dogfood)
- **Worker:** Platform HR (composer)
- **Family:** 4 (Outbound delivery)
- **Severity:** P2
- **Real bug:** Per-recipient PDF picker was inline with the firstName field + Remove button as a small dashed-border element. Sean missed it entirely during dogfood and asked "is there no way to attach a deck?" — visual hierarchy made it invisible.
- **Test:** Open composer, click cold-invite template. Assert: per-recipient PDF picker is visually prominent (its own row, ≥2px purple dashed border, ≥13px font, file emoji prefix), and flips to green ✓ state with filename visible after attachment.
- **Fix (S51.43.7):** Moved picker to its own row below firstName/Remove. Used `border: 2px dashed #c4b5fd` (purple-300), `background: #faf5ff`, `📎` icon + "Attach personalized deck (PDF) for this recipient" label. Selected state flips to green border + "Attached: {filename} · click to replace".

## TC-058 — "Acknowledge advisor terms" was a no-op (no content shown)

- **Date:** 2026-05-30 (caught in dogfood)
- **Worker:** Platform HR + WorkspaceObligationsBanner
- **Family:** 5 (Onboarding sequencing)
- **Severity:** P0
- **Real bug:** Step 1 of advisor onboarding was an "Acknowledge advisor terms" card. Clicking Start fired `ir:advisor:step:acknowledge_terms` immediately, flipping the card to green without ever showing the recipient any terms to acknowledge. Acknowledgment without content = meaningless gate. Sean: "There should probably be an agreement and a deck. And this should probably read through the deck and terms of the advisor to see if you want to do it."
- **Test:** Click Start on an obligation card with id matching `/acknowledge|accept-license|accept-terms/i`. Assert: a modal opens with (a) clear "Before we get started" heading, (b) bullet list of advisor expectations (time commitment, responsiveness, conflicts, confidentiality, mutual termination), (c) explicit reference to the personalized deck attached to the invitation email, (d) clarification that the legal binding happens at Step 3 (not here), (e) two buttons: "Not yet" (closes modal, action NOT fired) and "I acknowledge and agree to proceed" (closes modal AND fires the backend action). Assert backend `acknowledge_terms` is NOT called unless the second button is clicked.
- **Fix (S51.43.7):** Added `termsModal` state to `WorkspaceObligationsBanner.jsx`. Click handler routes acknowledge-* obligations into the modal first; non-acknowledge obligations (verify-identity, sign-agreement, etc.) still fire `runAction` directly. Modal includes per-role copy (using `ROLE_LABEL`) for advisor/investor/warrant_holder/creator differentiation.

## TC-059 — Signing complete didn't auto-refresh obligation card (TC-019 sequel)

- **Date:** 2026-05-30 (caught in dogfood)
- **Worker:** Platform HR + WorkspaceObligationsBanner + DBX Sign webhook
- **Family:** 5 (Onboarding sequencing)
- **Severity:** P1
- **Real bug:** After completing DBX Sign in a different tab, returning to the workspace tab did NOT flip the sign-agreement obligation card to "Complete" — required manual page refresh. The defensive `sync_signature` polling was firing once per (invite, action) per mount via `syncedRef.current` Set; the gate didn't reset on tab refocus.
- **Test:** With ID verified and sign-agreement obligation open, click Start → DBX Sign email arrives → open + complete signing in separate tab → return focus to workspace tab. Assert: within 2 seconds of refocus, refresh fires automatically AND sync_signature retries if the obligation is still flagged open. Card transitions to Complete without page refresh.
- **Fix (S51.43.7):** Added `window.focus` + `document.visibilitychange` event listeners to `WorkspaceObligationsBanner.jsx` that (1) clear `syncedRef.current` so the defensive sync polling can re-fire, AND (2) call `refresh()` to pull the latest invite state from Firestore. Handles both webhook-already-fired (refresh picks up the new completedAt) and webhook-delayed (sync_signature retry recovers) cases.

## TC-060 — Workspace context still locked to personal vault for existing-user case (TC-047 sequel)

- **Date:** 2026-05-30 (caught in dogfood)
- **Worker:** AuthMagic + App.jsx tenant resolution
- **Family:** 1 (Workspace context) + 5 (Onboarding sequencing)
- **Severity:** P0
- **Real bug:** Initial TC-047 fix set `localStorage.TENANT_ID = invite.tenantId` in `AuthMagic.jsx` before redirect. But `App.jsx` at line 5253–5260 has a fast-path: if `localStorage.TENANT_ID` is set AND no `sessionStorage` overrides are present, it skips the membership-fetch entirely and calls `transitionTo("app")`. Result: TENANT_ID switched to `sociii-platform` but `COMPANY_NAME` / `WORKSPACE_NAME` localStorage values stayed at the user's previous vault, so sidebar displayed wrong workspace name. Dogfood: Vishal's Vault rendered as active even though TENANT_ID was sociii-platform.
- **Test:** Cold-invite to an email tied to an existing SOCIII user (not a new account). Click magic link. Assert: (a) sidebar's MY WORKSPACES section shows the inviting tenant as the active workspace with correct companyName, (b) page header shows the inviting tenant's branding, (c) `/v1/me:memberships` was called (visible in Network tab), (d) `localStorage.WORKSPACE_NAME` matches the inviting tenant's name (not the user's previous workspace).
- **Fix (S51.43.7):** Changed `AuthMagic.jsx` to use `sessionStorage.setItem("ta_preselected_tid", primaryInvite.tenantId)` instead of `localStorage.TENANT_ID`. This triggers App.jsx's full preselectedTid resolution path (membership validation, COMPANY_NAME + WORKSPACE_NAME refresh from tenant doc, vertical/jurisdiction updates) instead of the fast-path that skipped all of those.

---

### TC-028: Creator Journey rendered as standalone page, broke three-part workspace

- **Date:** 2026-05-31 (S51.50)
- **Worker:** Creator Journey page (`apps/business/src/pages/CreatorJourney.jsx`)
- **Family:** New family — **6 (Layout / surface conventions)**
- **Severity:** P0 (structural — every user-facing surface affected)
- **Real bug:** Built `/creators/journey` as a full-page surface with its own header/footer. No sidebar nav, no Alex chat panel, no canvas right rail. User lands and can't navigate elsewhere without browser back; can't ask Alex for help on a step. Same pattern broken on `/data-room` (separate fix queued).
- **Rule established:** [[feedback_three_part_workspace_layout]] — every authenticated SOCIII surface MUST preserve sidebar + chat + canvas three rails. Standalone full-page is reserved for public/unauthenticated routes only.
- **Test:** Load any authenticated surface. Assert: (a) `.sidebar` element renders in DOM, (b) Alex chat is reachable from the current view, (c) browser back button is not the only navigation affordance.
- **Fix (S52.2):** Refactor Creator Journey to render inside AppShell as a section, preserving sidebar+chat+canvas. Build sequence + QA-001 assertions in `docs/specs/CODEX-S52.2-Creator-Journey-v2-with-QA-001.md`.

### TC-029: Sidebar nav item rendered invisible — `color: inherit` overrode `.navItem` CSS

- **Date:** 2026-05-31 (S51.48 → S51.49 fix)
- **Worker:** Sidebar.jsx
- **Family:** 6 (Layout / surface conventions)
- **Severity:** P1 (link existed but was unreachable visually)
- **Real bug:** First version of the Creator Journey sidebar link used `<a>` with inline `style={{ color: "inherit" }}`. The `.navItem` CSS class sets `color: #e5e7eb` but inline styles win — so the link inherited the parent's transparent/dark color and rendered invisible against the dark sidebar background.
- **Test:** For every sidebar nav item, assert `window.getComputedStyle(el).color` is NOT the same as the sidebar's background color, AND is NOT `transparent`.
- **Fix (S51.49):** Replaced `<a>` with `<button>` using the same styling pattern as adjacent buttons.

### TC-030: User-facing copy contained time references

- **Date:** 2026-05-31 (S51.50)
- **Worker:** Creator Journey page copy
- **Family:** New family — **7 (Copy / voice)**
- **Severity:** P1
- **Real bug:** Step descriptions and progress text included phrases like "30 minutes invested in your monetization path" and "13 beats from..." Time-in-copy violates Sean's rule that AI has no real sense of time.
- **Rule established:** [[feedback_user_facing_copy_rules]] — no time references in any user-facing copy.
- **Test:** Regex scan user-facing strings for `/\d+\s*(minute|hour|second|day|week|month)s?/i` — no matches allowed.
- **Fix (S51.50):** Removed all time references.

### TC-031: User-facing status copy was humblebrag-manipulative

- **Date:** 2026-05-31 (S51.50)
- **Worker:** Creator Journey page status thread copy
- **Family:** 7 (Copy / voice)
- **Severity:** P1
- **Real bug:** "Most people close this tab. You're still reading." appearing one sentence into Step 1. Reads as manipulation, especially for Type C creators who see through it instantly.
- **Test:** Regex scan for known patterns: `/Most people (close|scroll past|don't|never)/i` — no matches allowed.
- **Fix (S51.50):** Rewrote status thread to be direct + factual ("You discovered SOCIII") instead of comparative-manipulative.

### TC-032: "Beat" jargon in user-facing copy

- **Date:** 2026-05-31 (S51.50)
- **Worker:** Creator Journey page
- **Family:** 7 (Copy / voice)
- **Severity:** P1
- **Real bug:** Used "Beat" (internal jargon from the Creator Experience Brief) in user-facing copy. Should be "Step."
- **Test:** Regex scan rendered text for `/Beat \d/` — no matches in user-facing strings.
- **Fix (S51.50):** Renamed all instances to "Step."

### TC-033: Journey had 13 steps; should be 10 max

- **Date:** 2026-05-31 (S51.50)
- **Worker:** Creator Journey page
- **Family:** 7 (Copy / voice)
- **Severity:** P2
- **Real bug:** Journey rendered 13 beats. Sean's intuition: 10 max — fewer feels achievable, more feels long.
- **Test:** Assert journey state has `<= 10` steps.
- **Fix (S51.50):** Compressed to 10 steps.

### TC-034: Step 2 link pointed at `/onboard/creator` without required token

- **Date:** 2026-05-31 (S51.50)
- **Worker:** Creator Journey page Step 2 action link
- **Family:** New family — **8 (Routing / link validity)**
- **Severity:** P0 (broken user flow)
- **Real bug:** Step 2 "Go to commitment" linked to `/onboard/creator` which requires `?creator=<id>` token. Without it, "Link looks incomplete" error renders.
- **Test:** Click every CTA in the journey. Assert no resulting page renders an error state.
- **Fix (S51.50):** Changed link to `/meet-alex?intent=creator-signup` which works without a token.

### TC-035: Creator Journey link buried in Account section instead of top-level persona

- **Date:** 2026-05-31 (S51.49)
- **Worker:** Sidebar.jsx
- **Family:** 6 (Layout / surface conventions)
- **Severity:** P1
- **Real bug:** First placement put "Creator Journey" as the last item in the Account section. Being a Creator is a major persona — should be a first-class top-level nav item.
- **Rule established:** Persona-first navigation per [[feedback_user_facing_copy_rules]] — major personas (Creator, Investor, Advisor) get their own top-level sidebar sections.
- **Test:** Assert the Creator section appears above the Account section.
- **Fix (S51.50):** Moved to top of sidebar as its own "Creator" section labeled "Become a Creator," placed above MY DRIVE.

### TC-036: Contacts spine isolated from IR worker — no bulk import path

- **Date:** 2026-06-01 (S52.1)
- **Worker:** IR Worker / Contacts Spine
- **Family:** 4 (Data integration / cross-worker)
- **Severity:** P0 (blocker for IR scale-out)
- **Real bug:** Investor records and contact records lived in parallel without back-references. Every investor invite had to be hand-typed; engagement events on the IR side never landed on the contact's history. No path to filter contacts → bulk-invite as investors.
- **Test:** Given N contacts with `types_index: ["investor"]`, calling `GET /v1/ir:eligible-contacts?persona_type=investor` returns ≥ N rows; subsequent `POST /v1/ir:import-from-contacts` with their IDs creates N investor records each carrying `contactId` back-reference.
- **Fix (S52.1):** `services/ir/contactsBridge.js` + 3 routes (`ir:eligible-contacts`, `ir:import-from-contacts`, `ir:investor-contact-link`).

### TC-037: IR lifecycle events don't surface on source contact

- **Date:** 2026-06-01 (S52.1)
- **Worker:** IR Worker → Contacts Spine
- **Family:** 4 (Data integration / cross-worker)
- **Severity:** P0
- **Real bug:** When an investor advanced through magic-link → identity → signed-SAFE, none of those events showed up on the contact's `engagementHistory`. The contacts spine was blind to the worker's activity.
- **Test:** After investor flow completes through `markStepComplete("signature_complete")` AND `onSignaturePacketSigned`, the linked contact has `engagementHistory[]` containing `ir.signed_safe` event AND `fundraiseStatus.{fundraiseId} === "signed"`.
- **Fix (S52.1):** Sync hooks in `markStepComplete`, `onSignaturePacketSigned`, and `syncKycFromStripe` call `recordIrEventOnContact` non-blockingly.

### TC-039: Creator Journey "Tools" panel double-counts Claude

- **Date:** 2026-06-01
- **Worker:** CreatorJourney page Tools section
- **Family:** 7 (Copy / voice)
- **Severity:** P1
- **Real bug:** Tools panel renders three cards: "Claude (subscription or free)", "Claude Chat (your browser)", "Claude Code (your terminal)". The first two are the same Anthropic account — one sign-up surfaces both Claude Chat (browser) and Claude Code (terminal). Reads as three install steps when it's two.
- **Test:** No card may describe the same purchase/install action as the prior card.
- **Fix (S52.1c):** Collapse cards 1+2 into one ("Claude account · chat + code"). Reuse the third slot for GitHub (genuinely new).

### TC-040: Creator Journey missing GitHub as a tool

- **Date:** 2026-06-01
- **Worker:** CreatorJourney page Tools section
- **Family:** 7 (Copy / voice) + 8 (Routing / link validity)
- **Severity:** P0 (blocks Step 8 "Ship it")
- **Real bug:** Step 8 says "Push your code. Open a pull request." which requires a GitHub account. Tools panel does not list GitHub. Target audience may not know what GitHub is.
- **Test:** Every install referenced in any step body MUST have a corresponding ToolCard.
- **Fix (S52.1c):** Add GitHub tool card with non-coder-friendly description + sign-up link.

### TC-041: "Discover SOCIII" step has no link or action

- **Date:** 2026-06-01
- **Worker:** CreatorJourney page Step 1
- **Family:** 8 (Routing / link validity)
- **Severity:** P1
- **Real bug:** Step 1 says "Read what SOCIII is and what creators do here" but offers no link, no doc, no Alex deep-link. User cannot fulfill the step from the page itself.
- **Test:** Every step that asks the user to *read* something must link to that thing OR offer an Alex deep-link with a pre-filled prompt.
- **Fix (S52.1c):** Add `action: { label: "Ask Alex what SOCIII is", url: "/meet-alex?intent=what-is-sociii" }` to Step 1; also surface a static "What is SOCIII" reference (to be authored next).

### TC-042: Creator Journey violates three-part workspace rule

- **Date:** 2026-06-01
- **Worker:** /creators/journey
- **Family:** 6 (Layout / surface conventions)
- **Severity:** P0 per [[feedback_three_part_workspace_layout]]
- **Real bug:** Page renders as full-page surface with no sidebar, no Alex chat. Violates the universal rule that authenticated surfaces must have sidebar + Alex chat + canvas. User confirmed: "we completely step away from our three part workspace."
- **Test:** Every authed route under `/creators/*` must render AppShell with Alex chat present.
- **Fix (S52.2):** Refactor into a canvas card surfaced via the Creator Journey worker — content stays the same, lives inside the canvas.

### TC-038: KYC-complete event mismapped to `ir.identity_started`

- **Date:** 2026-06-01 (S52.1)
- **Worker:** IR Worker → Contacts Spine sync hook
- **Family:** 7 (Copy / voice — but for event-type strings)
- **Severity:** P1
- **Real bug:** First pass of the eventTypeMap in `markStepComplete` mapped `"identity_complete"` → `"ir.identity_started"` (typo), which collided with the actual `identity_started` event. Contacts would see two `ir.identity_started` entries and never see `ir.kyc_complete`.
- **Test:** Trigger `markStepComplete(_, _, "identity_complete")` → assert linked contact's last engagement event is `ir.kyc_complete` AND `fundraiseStatus === "kyc_verified"`.
- **Fix (S52.1):** Mapped to `"ir.kyc_complete"`.

---

### TC-043: Catalog schema regex rejects multi-hyphen worker IDs

- **Date:** 2026-06-02 (S52.16/S52.17 catalog build)
- **Worker:** All catalogs — surfaced by `catalog-completeness` check
- **Family:** 1 (Catalog ↔ Firestore parity)
- **Severity:** P0 (warn-only at load, so prod still runs — but every validation pass flags 10+ false-positives)
- **Real bug:** `services/alex/catalogs/schema.js` regex is `^[A-Z][A-Z0-9]{0,3}-[A-Z0-9]{1,4}$` — exactly one hyphen. Production catalogs ship `BANK-FUND-001`, `INV-FUND-001`, `INV-ANALYST-001`, etc. — all rejected. Forced PAT-001 (not PATENT-001) for new Patent Worker just to pass.
- **Test:** Run `catalog-completeness` check; assert all live workers in all catalogs pass the regex.
- **Fix:** Loosen regex to `^[A-Z][A-Z0-9]{0,5}(-[A-Z0-9]{1,8})+$` (or pick the canonical shape and migrate IDs). Pre-existing tech debt; non-blocking.

### TC-044: `type:individual` not in VALID_TYPES enum

- **Date:** 2026-06-02
- **Worker:** RES-001 in `real-estate-professional.json`
- **Family:** 1 (Catalog ↔ Firestore parity)
- **Severity:** P0 (warn-only at load)
- **Real bug:** `services/alex/catalogs/schema.js` VALID_TYPES allows only `[standalone, pipeline, composite, copilot, orchestrator, platform]`. RES-001 declares `type: "individual"`. Loader warns and continues; runtime impact unknown — anything depending on type semantics fails silently.
- **Test:** `catalog-completeness` check asserts every worker.type ∈ VALID_TYPES.
- **Fix:** Either add `individual` to VALID_TYPES (if it's a legitimate worker shape — solo-professional template), or fix RES-001 to use the right one.

### TC-045: New worker spec → catalog → QA validator end-to-end pass

- **Date:** 2026-06-02 (S52.16/S52.17 worker build)
- **Worker:** PARA-001 (Paralegal) + PAT-001 (Patent Worker)
- **Family:** 1 + 5 (Catalog parity + RAAS module load)
- **Severity:** P0 (the build-discipline test — does the new-worker pipeline actually work?)
- **The build:** legal.json drafted from CODEX S52.16/S52.17 specs. canvasTabs (7 + 9), constraintRaasSources (4 + 7), controlCenterContribution, intent, vault, referrals, coming_soon all declared.
- **The validator:** Added `catalog-completeness` check to `scripts/qa-001/checks/`. Validates structural fields, canvas tab schema, RAAS source shape.
- **Pass:** 0 findings against legal vertical on first run. Test catches the future bug class where a creator (or session-future-me) drops a worker into a catalog without the structural fields — frontend would fall back to generic [Overview, Activity, Resources] and the worker would look broken.
- **What QA-001 caught BEFORE Sean dogfooded:** 11 P0 + 957 P1 findings across legacy catalogs — pre-existing debt, not introduced by this build. Filed task #382 for triage. Sean was clean to dogfood the new legal workers immediately.
- **Success-metric impact:** First worker build under new QA-001 discipline. Catches written into the validator on the same day as the spec — the right ratio shape.

---

## TC-061 — Creator-journey Alex snags permanently after long pasted message (snag loop)

- **Date:** 2026-06-05 (caught in dogfood — SITE-RECON-001 build test, CODE+ALEX+CLAUDE loop)
- **Worker:** Alex / Worker authoring intercept (`index.js` ~2095, S52.29d/f block)
- **Family:** 5 (Chat engine resilience)
- **Severity:** P0 (kills the creator authoring flow — the Sandbox's core surface)
- **Real bug:** Sean pasted a long (~2.5KB) Claude Code report-back into the authoring chat. Alex returned "Hit a snag generating that response" — and then returned the same snag on the NEXT, short message ("Can you save our work to date?"). Two compounding defects:
  1. **Timeout fallback never matches.** The 25s race rejects with `new Error("anthropic_timeout_25s")` — `.code` is undefined and the message string doesn't equal `'anthropic_timeout'`, so the `errCode === 'anthropic_timeout'` check at index.js:2133 can NEVER be true. Real timeouts display the generic "Hit a snag" text, masking the root cause.
  2. **No self-heal / likely poisoned session.** The catch path pushes the fallback assistant message into `creatorAuthoringHistory` and persists it. Whatever condition made the first call fail (25s timeout on long history, or a malformed history entry from the resume-clean path) persists into the session doc, so every subsequent turn re-fails → permanent snag loop. The fallback retries nothing and repairs nothing.
- **Likely root cause:** 25s `Promise.race` timeout. The function itself has `timeoutSeconds: 300`; 25s is far more conservative than the platform allows, and a 30-message history + 2.5KB paste plausibly exceeds it. Confirm via Cloud Run logs: `[creator-journey intercept] failed:` lines carry the actual error message + stack.
- **Test:** (a) Paste a 3KB user message into /creators/journey authoring chat with 25+ messages of history. Assert: a real response returns (raise/remove the 25s race, or stream). (b) Simulate Anthropic timeout. Assert: the timeout-specific fallback text renders, not the generic snag. (c) After ANY snag response, send "hello". Assert: next turn succeeds — the session must self-heal, not loop. (d) Assert the snag fallback is NOT persisted into history more than once consecutively (or history is compacted on failure).
- **Fix:** (T1 session — pending)

---

## TC-062 — Alex context drift: surface-to-surface spec citation conflict

- **Date:** 2026-06-06 (caught in dogfood — SITE-RECON-001 Step 3, CODE+ALEX+CLAUDE loop)
- **Worker:** Alex (web `/creators/journey` instance vs terminal instance)
- **Family:** 6 (Alex context coherence) — new family; distinct from TC-061 (chat engine resilience)
- **Severity:** P0 (would have shipped a spec-violating audit trail on the platform whose thesis IS the audit trail)
- **Real bug:** Two active Alex instances held conflicting Step 3 specs. Terminal-Alex authored + committed CODEX S52.31 (anchor failure → 503 rollback per RULE-03). Hours later, web-Alex issued a Step 3 prompt from stale context that (1) cited **RULE-10 incorrectly** to make the audit anchor non-blocking — directly contradicting RULE-03's `on_fail: rollback_pull`; (2) put `blockchainAnchor` + Crossmint in the response schema, violating the vocabulary lock; (3) directed an HTTP call to a nonexistent endpoint (`/api/workers/plat-008/audit-trail/anchor`) instead of the in-process `auditTrailService.writeAuditRecord()`. The danger class: **citing a real rule number incorrectly sounds authoritative** — worse than pure hallucination, because a first-time creator has no basis to doubt it. Secondary symptom: web-Alex's own acknowledgment mislabeled TC-061 as "Supabase/Firebase stack confusion" (TC-061 is the snag loop; the stack drift was never a TC).
- **Test:** (a) After any CODEX commit that changes worker-build guidance, assert the `/creators/journey` Alex system prompt / knowledge surface reflects it before the next authoring turn (staleness check: compare CODEX HEAD referenced by web-Alex vs repo HEAD). (b) Adversarial: ask both Alex surfaces the same spec question (e.g., "what happens when the audit anchor write fails for site-recon-001?") — assert identical rule citation AND identical on_fail behavior. (c) Lint Alex authoring prompts for vocabulary-lock violations (blockchain/crypto/NFT/mint/Crossmint in proposed response schemas) before they reach the creator.
- **Mitigation that worked:** Claude Code (creator side) cross-checked the prompt against the spec + committed CODEX before building, per the "flag and stop, don't paper over" constraint. The loop's defense-in-depth held — but only because the creator-side agent was instructed to verify. Platform-side fix should not depend on that.
- **Fix:** (pending — Alex knowledge-refresh-on-CODEX-commit, candidate for the daily housekeeping checklist's "Alex refresh across ALL surfaces" step becoming an automated hook)

---

## When to ship QA-001

The corpus grows organically. When we have ~15-20 test cases captured (we have 8 from one debug session — extrapolate), the harness has enough scope to be useful. At that point:

1. Phase 0 from framing doc — HR Intent Spec backfill
2. Phase 2 — Catalog↔FS parity test (TC-001, TC-002, TC-006, TC-007, TC-008 all live in this family)
3. Phase 6 — Playwright walkthrough (TC-003, TC-004, TC-005)

That's three test families lit up from the corpus we've already captured. Each one prevents a real bug we just hit.

---

## Discipline going forward (rule)

**Before fixing a worker bug:** add it to this corpus. The fix can come second. Never let a bug get fixed without capturing the test case — that's how the harness gets built without a separate sprint.

This file is the QA-001 backlog. It's also Anthropic-style "feedback memory" but at the platform level.
