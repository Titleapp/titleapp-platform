# CODEX S51.43.8 — Saturday 2026-05-30

**Session window:** Sat 2026-05-30, multiple blocks across the day
**Theme:** HR worker dogfood completion + open-SDK/closed-platform thesis + Ruthie's worker scaffold + Alex grounding hygiene
**Status:** Shipping. Hosting + functions deployed. Commits pending.

---

## TL;DR — what changed today, what to know for next session

1. **HR Schedule tab is live inside the HR worker canvas** — sidebar Scheduling sub-nav removed. Workers-are-self-contained principle codified.
2. **HR tenantId pipe fix shipped** — reactive `useState` + `ta:workspace-changed` listener; bootstrap defaults (Sean + Kent) now populate on first list call.
3. **Ruthie's worker scaffold started** at `creators/ruthie/nursing-education-001/` — intent spec, 9 canvas tabs, real NURS 220/320 sample data, `preview.html` browser-openable demo of Sarah K.'s 8-month longitudinal journey.
4. **Open SDK + Closed Platform thesis decided** (RedHat / Hugging Face pattern). Apache 2.0 LICENSE + creator onboarding docs drafted.
5. **Alex grounding deep-swept** — slug bug fix (`platform-hr-people` → `platform-hr`), brand cutover stragglers cleaned, comprehensive `sociii-platform-context.md` knowledge file added, `core.js` updated with `CURRENT PLATFORM STATE` digest, UX-NAVIGATION.md modernized.
6. **Ruthie joined the chat directly** to outline her project + Tuesday goals. Real data in hand from her Master Config Sheet.
7. **Anthropic Team plan + sociii.ai email pivot** decided (Sunday IT block).

---

## 1. HR Schedule canvas wire-up (S51.43.7-continuation → S51.43.8)

### What shipped

**`apps/business/src/App.jsx`** — `WorkerHomeRenderer`:
- Added `activeTabId` state, reset on `worker?.slug` change
- `handleTabSelect` + auto-fire effect set `activeTabId(tab.id)`
- Added flag: `showHRScheduleLive = worker?.slug === "platform-hr" && (payloadTitle === "coverage" || (!payloadTitle && activeTabId === "schedule"))` — discriminator is `payload.title` because all HR canvas tabs share signal `card:work-product` (QA-001 P0 catch — chat-emitted signals would otherwise stale-stick to HRSchedulePanel)
- Conditional render in CANVAS branch swaps `CanvasPanel` for `<HRSchedulePanel />` when HR + Schedule
- Removed dead `case "scheduling"` route

**`apps/business/src/components/Sidebar.jsx`**:
- Removed `{ id: "scheduling", label: "Scheduling" }` from `platform-hr` and `hr-people` sub-nav lists
- Removed orphan `SPINE_NAV_CANVAS_MAP["scheduling"]` entry

**`apps/business/src/sections/HRSchedulePanel.jsx`** (tenantId fix):
- `tenantId` now read via reactive `useState` + `readTenantId()` helper
- Listeners on `ta:workspace-changed`, `focus`, `storage` events
- Fallback to `WORKSPACE_ID` if `TENANT_ID` not set
- Mutations close over reactive value (auto-pick-up on workspace switch)

### Why

When Sean signed in to SOCIII workspace in incognito, HRSchedulePanel rendered but with `listPeople: tenantId required` error. Cause: `tenantId` was captured at mount from localStorage, but workspace switching had updated `TENANT_ID` after mount without re-rendering the panel. Sample fixture for Schedule tab (Coverage roll-up with Maya/Jordan/Priya) was still showing because canvas Schedule tab wasn't wired to the live HRSchedulePanel.

### Result

Schedule tab in HR worker canvas now renders `<HRSchedulePanel />` for tenant admin. Sean + Kent bootstrap on first call. Time-off chips, Add/Remove team member, inline schedule edits, W2/W9/W4/I-9 modals, Policies & Procedures link all live.

### QA-001 catch ratio

QA-001 ran 6 findings before Sean dogfooded:
- **P0** (1, fixed): chat-signal collision on shared `card:work-product` signal
- **P1** (2, 1 fixed + 1 deferred): orphan `scheduling` case in App.jsx cleaned; non-admin 403 UX still raw
- **P2** (3, deferred): HTTP status not checked in apiFetch, optimistic timeOff revert race, PTO key collision (vanishingly low risk)

Catch ratio: 4/6 fixed in same window. Baseline catches/total now > 0.6 target.

---

## 2. Open SDK + Closed Platform thesis (locked 2026-05-30)

### Decision

SOCIII follows RedHat / Hugging Face / WordPress pattern. Open-source the worker SDK to fuel developer adoption (NanoClaw-style buzz but with a real product underneath). Monetize the platform layer (audit, payments, identity, regulatory, marketplace) — patent-protected by the 6 provisionals filed 2026-05-24.

### Three tiers

| Tier | Dev gets | Revenue |
|---|---|---|
| **1. Free fork** | SDK + repo + ability to run worker on own infra | $0 |
| **2. Marketplace listing** | Worker runs on SOCIII infra w/ audit + payments + identity + customers | 75% creator / 25% SOCIII |
| **3. Enterprise self-host** | License to run platform on own infra | License + per-seat |

### Files shipped

- `LICENSE` (Apache 2.0 + SOCIII trademark/platform-service notice)
- `docs/CREATOR-ONBOARDING.md` (fork → clone → install Claude Code → branch → PR walkthrough)
- `docs/CREATOR-WORKER-BUILD.md` (intent spec + canvas tabs + service module + sample data + assertions pattern)

### Files pending Sunday

- README.md "Build a worker, list it, get paid" header section
- CONTRIBUTING.md rewrite from "external contributions not accepted" to open creator flow
- `creators/_template/` skeleton
- CODEOWNERS file
- GitHub org migration (titleapp → sociii) per task #260

### Memory saved

`project_open_sdk_closed_platform_thesis.md` covers the strategy in full.

---

## 3. Ruthie's nursing-education-001 worker scaffold

### Context

Ruthie Clearwater (CRNA, nursing instructor at UH, `ruthiec@hawaii.edu`) has been building a Google Apps Script + Sheets tool since 2026-04-24. Sean shared the Master Config Sheet and her Apps Script project URL.

**Her existing data model (parsed from xlsx):**
- 5 nursing courses (NURS 210/220/230/320/360)
- 46 SLOs with ANA Standards mapping
- 46 reflection templates using Tanner Clinical Judgment Framework (Noticing → Interpreting → Responding → Reflecting)
- 32 clinical sites
- 26 instructors
- 7 cohorts (Faculty Playground, ASN20, others)
- 50-entry audit log she built in from day one

**Tuesday 2026-06-02:** introducing the tool to 7 faculty + her supportive boss. Goal: 3-4 faculty commit to fall semester pilot.

### Ruthie's direct answers (joined chat)

1. **Problem solved:** Automation + longitudinal student tracking. Before: Word/Google docs flying between every student-instructor pair. Wants to follow students day 1 → graduation. Easy for instructors AND students.
2. **Tuesday audience:** 7 instructors + her + possibly the boss who pays them. Boss is supportive. 20-30 students in program.
3. **What's broken:** Doesn't know yet — Tuesday IS the first user test. Design principle: always mindful of time-to-complete and ease of use.
4. **Faculty hook:** Security and stability of data. "What happens if we lose the database?" FERPA compliance.

**Plus:**
- "Demo for now" (OK with demo-not-production for Tuesday)
- "All of the above" on where longitudinal view breaks down (course-to-course, instructor-to-instructor, didactic-to-clinical) → killer demo feature is single timeline that survives all three
- "No worries with anyone" in the room → design aspirational, not defensive

### Files shipped at `creators/ruthie/nursing-education-001/`

- **`intent.md`** — full contract. Longitudinal student record. Tanner framework. Time-budget bugs. Audit-anchored events. Open questions for worker name + branding + Sarah persona pick.
- **`canvas-tabs.json`** — 9 tabs: Students (default), Student Journey, Cohorts, Reflections, SLOs, Audit Trail, Settings + member-side My Reflections, My Journey
- **`sample-data.js`** — uses HER real NURS 220/320 SLO data + Tanner framework + clinical sites. Three demo personas (Sarah K., Maya L., James C.) with Sarah having a real 8-month journey across NURS 210→220→230 (Sep 2025 → May 2026). Audit trail sample shows grade-lock + chain-anchor + unlock-attempt-rejected flow.
- **`preview.html`** — standalone browser preview of Sarah's Journey view. Color-coded timeline (purple reflection, green observation, amber chain-anchored locked grade), course chips, Sarah-at-a-glance right rail, sample Alex chat response. Tested locally.

### Tuesday demo arc (agreed with Ruthie)

1. "Here's Sarah — let me show you her journey" → longitudinal timeline (the hook)
2. Chat with Alex: "who needs support this week?" → grounded answer
3. Instructor view: cohort at a glance + one reflection in Tanner frame
4. Lock a grade → audit trail → "even I can't change this now"
5. "Pilot with me next semester?"

### Pending Sunday/Monday

- Backend endpoints `/v1/nurse-eval:*` (courses, SLOs, students, reflections, grades, audit)
- Frontend React components (currently sample-data only)
- Migration script: Master Config Sheet → Firestore (so Tuesday shows her real data)
- Worker name decision (placeholder "Nursing Education"; Ruthie picks Monday)
- "Sarah" persona pick (real student or stay anonymized?)
- Workspace branding (logo, color)

### Memory saved

`project_ruthie_developer_pattern.md` covers strategy + Ruthie's existing work + Sean's quick-win decision.

---

## 4. Alex grounding hygiene (deep sweep)

### Bugs caught + fixed

**`prompts/surfaces.js:451`** — HR slug bug (P0): said `platform-hr-people`, actual is `platform-hr`. Alex was emitting worker cards with bad slug → 404. Fixed.

**`prompts/surfaces.js:124`** — stale legacy URL `https://us-central1-title-app-alpha.cloudfunctions.net/publicApi/v1/docs`. Replaced with `app.sociii.ai/api/docs`.

**`prompts/core.js`** — BOGO creatorId said `"titleapp-platform"`; now accepts both `"sociii-platform"` and legacy during cutover. Education was marked "planned"; now reflects `nursing-education-001` in flight.

### Added: `CURRENT PLATFORM STATE` section in `prompts/core.js`

~50-line digest of today's reality covering: spine worker slugs + canvas tab structure, IR worker live state, identity + signing infrastructure, patent family, business model thesis, design discipline rules. Alex reads this on every reply.

### Added: `functions/functions/services/alex/knowledge/sociii-platform-context.md`

Comprehensive knowledge file (~300 lines): company status, governance, all 5 spine workers, IR worker, identity + audit, patents, business model, current creator work (Ruthie), design discipline, "when users ask Alex about..." quick reference. Not auto-wired yet (CODEX 51.15 follow-up), but humans can read it and the digest in `core.js` covers Alex's needs for now.

### Updated: `docs/UX-NAVIGATION.md`

- Brand cutover (TitleApp → SOCIII at top)
- Last-updated bumped from 2026-05-05 to 2026-05-30
- New section: "Workers are self-contained" — codifies HR Schedule canvas-only placement + signal disambiguation pattern
- New section: "Open SDK / Closed Platform pattern" — points at LICENSE + docs
- New section: "Spine workers (5)" table with bespoke-UI mapping

### Defer to Sunday

- Full RAAS rule pack review (need Sean walking through)
- Worker prompt audit per-vertical (broader sweep)
- Knowledge file auto-loading (CODEX 51.15)

---

## 5. Anthropic Team plan + sociii.ai email pivot

### Decision

- **Team plan at $20/seat (annual)** or $25/seat (monthly), 5-seat minimum
- Seat split: 1 Premium ($100/mo) for Sean, 4 Standard ($20/mo) for Ruthie + Elise + Kent + spare
- Total: ~$180/mo annual
- Bonus: SSO + domain capture lets `@sociii.ai` users auto-join

### Pivot

Sean realized he must sign out of personal Anthropic on browser + create SOCIII account from `sean@sociii.ai` email. IT-guy annoyance but right for IP protection (all Claude Code work product attributable to SOCIII).

### Sunday IT block (45 min)

1. Create `sean@sociii.ai` Anthropic account
2. Buy Team plan, claim `sociii.ai` domain
3. Sign out personal Anthropic on browser
4. Provision `ruthie@sociii.ai` + `elise@sociii.ai` Workspace mailboxes
5. Invite Ruthie + Elise to SOCIII Team (Kent maybe)

### For outside devs (not Team plan)

Bring their own Anthropic subscription. Security boundary is the PR gate, not the Claude license. Per CREATOR-ONBOARDING.md flow.

---

## 6. Memory updates

New memory files saved:
- `project_ruthie_developer_pattern.md` — Ruthie as prototype creator; simple+safe constraints; existing work; Sean's quick-win decision
- `project_open_sdk_closed_platform_thesis.md` — RedHat-style business model
- `feedback_coming_soon_transparency.md` — "Coming soon" section UX pattern
- `feedback_advisor_outreach_warmth.md` (referenced) — universal warmth scaffold
- `feedback_kyc_user_level_one_year.md` (referenced) — KYC architectural rule

Updated:
- `MEMORY.md` index with new entries

---

## 7. Today's other notable shipments (for context)

- **Universal P.S. attribution** ("Alex / AI chief of staff") added to advisor + investor emails
- **Subject line tone shift** — "Your invitation to advise SOCIII" (HR-tone, not marketing-tone)
- **Composer CC default** flipped `sean@titleapp.ai` → `sean@sociii.ai`
- **Microsoft Safe Links fix** (TC-061) — AuthMagic uses click-to-continue
- **Bug fixes** TC-057 through TC-060: PDF picker visibility, Acknowledge modal content, workspace context, signing webhook refresh
- **Scott bumped $10K → $50K** warrant coverage (Sean's relationship reasoning)
- **Storyhouse $2M** captured as committed pending Kent cofounder formalization

---

## 8. Tomorrow (Sunday 2026-05-31)

### Track A — Marketing day (Sean drives)
1. Wed teaser bundle staging (highest urgency, 3 days out)
2. LinkedIn campaign setup for Sean + Kent's 3K contacts
3. Reddit/X positioning test post

### Track B — Ruthie's worker (Claude scaffolds)
1. Backend endpoints `/v1/nurse-eval:*`
2. Frontend React canvas panels (Students, Journey, Reflections)
3. Master Config Sheet → Firestore migration script
4. Monday: Ruthie validates demo with her real data

### Track C — Open repo go-public
1. GitHub org `sociii` migration (task #260)
2. Make repo public with Apache 2.0 LICENSE
3. `creators/_template/` + CODEOWNERS + branch protection
4. Anthropic Team plan + provision Ruthie + Elise + Kent

### Track D — DBX template upload block (Sean, 90 min, dental-visit-grade)
W-9, W-4, I-9 + Kent bespoke Cofounder Advisor (Section 3 from counsel)

### Track E — Loan agreements (Sean writes)
Robert $100K, Chris $10K, Michael Gibson

---

## 9. Hot links

- **Live HR Schedule (deployed):** app.titleapp.ai → SOCIII workspace → HR & People → Schedule tab
- **Ruthie's preview:** `creators/ruthie/nursing-education-001/preview.html`
- **Ruthie's worker scaffold:** `creators/ruthie/nursing-education-001/`
- **Creator onboarding docs:** `docs/CREATOR-ONBOARDING.md`, `docs/CREATOR-WORKER-BUILD.md`
- **Apache 2.0 LICENSE:** `/LICENSE`
- **Alex platform knowledge:** `functions/functions/services/alex/knowledge/sociii-platform-context.md`
- **UX nav reference:** `docs/UX-NAVIGATION.md`
- **QA-001 corpus:** `docs/QA-001-TEST-CORPUS.md`

---

## 10. Risks / open items

- **HRSchedulePanel non-admin UX** — 403 returns raw "Not authorized" string. Low risk while Sean is only admin; punch list for when Kent or others join HR admin.
- **Knowledge file auto-wiring** — `sociii-platform-context.md` not yet loaded into prompt assembly. CODEX 51.15 follow-up. Digest in `core.js` covers immediate needs.
- **Ruthie's Apps Script code** — Sean hasn't shared via `clasp` yet (needs her to grant `sean@sociii.ai` Editor access). Tuesday timeline assumes parallel-build path, not Apps-Script-debug path.
- **Anthropic Team plan** — needs Sean to actually sign up before Ruthie/Elise can be invited. Sunday IT block.

— End CODEX S51.43.8 —
