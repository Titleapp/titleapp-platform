# CODEX S51.43 — IR User+Admin Continuity & Worker-001 Pattern

**Date:** 2026-05-29
**Session:** ~12 hours of dogfood-driven build, sean@sociii.ai ↔ aspensean@gmail.com
**Foundational insight surfaced:** the company ↔ end-user surface continuity pattern (worker-001 cornerstone)

## What shipped

### Investor-side (aspensean@gmail.com end-to-end)

1. **`apps/business/src/pages/DataRoom.jsx`** — `/data-room` standalone React route. Lists 6 canonical docs grouped by Investment Thesis / Deal Documents / IP + Technical. Direct downloads.
2. **`apps/business/src/sections/InvestorHome.jsx`** — rendered by `WorkerHomeRenderer` when the active worker is `"fundraise"` AND the user holds an active `investor_portal` entitlement. Greeting + "Your investment" card + "Round summary" + "Direct line to founder" (mailto + data-room). Notifications + Voting scaffolds with empty states.
3. **Sidebar synthetic workspace row** — `AppShell.jsx` merges `entitledWorkers` into `workspacesWithEntitlements`; entries with `type: "entitlement"` + `role: "investor"` surface in MY WORKSPACES with cyan `INVESTOR` badge. Click dispatches `ta:select-worker` (no localStorage workspace switch).
4. **`WorkspaceInvestorMaterials.jsx`** — whitepaper fallback URL now `app.titleapp.ai/whitepaper`; office hours field renamed from `office` → `officeHours` to match fundraise materials schema; mailto + data-room buttons open in new tab.
5. **`/whitepaper`** — already existed; updated `apps/business/public/whitepaper/SOCIII-Whitepaper.docx` with May 28 version.

### Founder-side (sean@sociii.ai dogfood)

6. **`apps/business/src/pages/FundraiseAdmin.jsx`** at `/fundraise/admin` — membership-gated React page. Lists fundraises the signed-in user can admin. Per-fundraise materials config (whitepaperUrl / deckUrl / dataRoomUrl / officeHoursUrl) saving direct to Firestore. SMS smoke-test panel pre-filled with +1-310-430-0780.
7. **Founder Data Room tab binding** — `apps/business/src/components/canvas/liveData.js` `data-room` builder now reads `digitalWorkers/fundraise/canonicalDocs` via new `/v1/canonical-docs` endpoint. Groups by category, shows "Documents: 7" (was 0/0/0 hardcoded). First proof of role-shared canvas content (same docs shown to investor + founder, different role-adaptive controls coming).

### Backend endpoints added (`functions/functions/index.js`)

- `GET /v1/canonical-docs?workerSlug=fundraise` — returns docs from `digitalWorkers/{slug}/canonicalDocs`
- `GET /v1/fundraise-admin:list` — membership-gated, returns fundraises caller can admin
- `POST /v1/fundraise-admin:set-materials` — gated by `userCanAdminFundraise()` helper (checks `ownerUid`/`createdBy` direct match OR memberships role admin|owner)
- `POST /v1/sms:test` — authenticated, fires `sendSMSDirect` for Twilio integration smoke test. **Blocked until Twilio number provisioned.**

### Firestore writes (production data)

- `fundraises/fr_d291731b90725d12.materials` populated with whitepaperUrl, deckUrl, dataRoomUrl pointing at app.titleapp.ai paths (officeHoursUrl: null pending Calendly)
- `digitalWorkers/fundraise/canonicalDocs/*` — 7 canonical docs attached to IR worker (Whitepaper, Memorandum, Deck, SAFE, NDA, Warrant, Patent Portfolio)
- `pendingInvites/inv_e3f1430c8cc762b3` archived (aspensean stale advisor invite from prior dogfood)

### Files staged in `apps/business/public/`

- `whitepaper/SOCIII-Whitepaper.docx` (May 28 version)
- `data-room/SOCIII-Investor-Memorandum-v2.docx`
- `data-room/SOCIII-InvestorDeck-v3.pptx`
- `data-room/SOCIII-Post-Money-SAFE.docx`
- `data-room/SOCIII-Mutual-NDA.docx`
- `data-room/SOCIII-HOMMIE-Warrant.docx`
- `data-room/SOCIII-Patent-Portfolio.docx`

## The foundational insight: Worker-001 company ↔ end-user pattern

**Every meaningful worker has TWO sides** — surfaced organically tonight by dogfooding the IR worker end-to-end:

| Side | Identity | Surface |
|---|---|---|
| **Tenant** (admin) | Business operating the worker | Workspace membership + admin tabs |
| **End-user** (customer) | Customer/investor/patient/client | Entitlement + role-adaptive tabs |

Same canvas tab grammar, role-adaptive payloads:

| Tab | Tenant view | End-user view |
|---|---|---|
| Pipeline | All entries, stages, conversion | (role-adaptive empty/hidden) |
| Capital Raised | Aggregate target/committed/received | Hidden or summary |
| Data Room | Upload, share links, view stats | Read-only doc list |
| Cap Table | Full table they edit | Own row highlighted |
| Governance | Call ballots | Cast ballot |
| Notices | Outbound queue + analytics | Inbox |
| Updates | Compose | Read |
| Vote | Open ballot management | Cast vote |
| My Position | Aggregate | Own position |
| Documents | Template library | Own signed docs |

**Generalizes across verticals:**

| Vertical | Tenant | End-user (entitlement) |
|---|---|---|
| Investor Relations | Company raising | Investor |
| Title & Escrow | Title agent | Buyer |
| Healthcare | Clinic / practice | Patient |
| Legal | Law firm | Client |
| Marketing | Business | Contact / lead / prospect |
| Auto Dealer | Dealership | Customer |
| Aviation | Operator / FBO | Pilot |

This replaces the bifurcated `InvestorHome` vs founder canvas split shipped today. Tonight's split was a stopgap; unified canvas tabs + role-adaptive payloads is the end state.

## QA-001 corpus growth tonight (TC-028 through TC-039, 12 new cases)

P0:
- **TC-028** Entitled investor worker chat denied — permission gate checks tenant membership only, ignores entitlements
- **TC-032** Founder Data Room not bound to canonical docs (✓ shipped tonight)
- **TC-033** Cap Table / My Position / Notices / Documents on founder view show SAMPLE data; needs role-adaptive binding
- **TC-035** DBX Sign FROM identity is single-account; multi-tenant requires embedded signing + SendGrid tenant-FROM envelope
- **TC-038** Founder canvas relationship-specific tabs render investor sample data — bifurcation symptom, fixed by unified renderer
- **TC-039** Twilio account has no provisioned phone number — SMS primitives untestable until purchased

P1:
- **TC-031** Canvas tab highlight stuck on Pipeline (matches #338); should fall out when unified canvas-tabs land
- **TC-034** Founder needs compose-kickoff-letter surface in Notices

P2:
- **TC-036** sociii.ai landing-page logo still wrong (old geoscape, not parent-child hex) — 10+ user reports
- **TC-037** `app.titleapp.ai/login` lands on hub splash, not auth form

## Known infra gaps blocking outbound communications

1. **No Twilio phone number** — purchase + set `TWILIO_PHONE_NUMBER` secret (5 min, $1.15/mo)
2. **A2P 10DLC approval status** — unknown until first real SMS attempt
3. **DBX Sign FROM identity** — single-account, needs embedded signing rebuild for multi-tenant (deferred 1-2 days per Sean)
4. **Tenant-FROM SendGrid envelope** — same architectural answer as DBX

## Memories captured

- `project_ir_worker_session_2026_05_29.md` — what shipped + patterns
- `project_worker_001_tenant_user_pattern.md` — foundational architecture (8-vertical mapping table, cross-cutting infra TODOs)
- `project_tomorrow_2026_05_30.md` — prioritized tomorrow plan
- `feedback_session_cadence_process.md` — 3-4 sessions/day, 2-2.5 hr cap, reset rituals, circuit breakers

## Next session priorities

**P0 (morning, ≤2 hr):**
1. Update worker-001 spec with the company ↔ end-user continuity pattern
2. Wrap IR worker: outbound investor email + tracking who visits the data room
3. Buy Twilio number → smoke test SMS endpoint

**P0 (afternoon, ≤2 hr):**
4. HR worker → Kent outbound email capability (SendGrid integration, reply tracking)
5. Audit marketing channel APIs (Google Ads, X, LinkedIn, TikTok, Reddit)

**P1 (late afternoon, ≤2 hr):**
6. Marketing worker SCOPED to Sunday-5pm fallback:
   - Google Search awareness campaign live
   - X organic posting via API
   - TikTok organic posting via API
   - Manual override surface for founder direct posting

**Deferred to next week:**
- Unified canvas tabs + role-adaptive payloads refactor (foundational, deserves dedicated session block)
- DBX Sign embedded + SendGrid tenant-FROM POC
- Full marketing worker (8-item scope: strategy AI, channel automation, PR/content, influencer ID, post optimization loop, drip with hooks, budget deployment)
