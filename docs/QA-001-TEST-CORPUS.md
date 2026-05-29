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

---

(slot for next bug)

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
