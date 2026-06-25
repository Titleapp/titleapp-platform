# CODEX Surface 11 — Demo-Readiness Sprint + "Data Must Live in the DB"

**Status:** 🟢 active · most items shipped 2026-06-24 · **Owner:** Sean
**Source:** 2026-06-24 working session — Sean walked the full Meadow Creek Veterinary demo (Dr. Maya Chen) worker-by-worker and generated a live punch-list. This codex captures what shipped, the **DB-vs-fixture data audit** (the keystone principle: *nothing a worker shows may be hardcoded frontend text*), and the remaining gaps.

---

## Objective
Get the Meadow Creek demo recording-ready, and enforce one non-negotiable principle Sean set:

> **"All the data we are seeing in any worker or Alex must live in the database for the User/Client — not just text on the page."**

Fixture-as-fact is the same failure class as the fabrication bugs (Bishop Vet, the CoS "I posted to Accounting" lie). If it isn't a tenant-scoped Firestore record, it's a liability.

---

## What shipped 2026-06-24 (all deployed, both remotes)

**Trust / correctness**
- **"Bishop Veterinary Clinic" hallucination killed.** The CoS identity anchor was gated to business workspaces, so *personal* space had no grounding — that's where Alex invented a clinic name. Both contexts now anchored (`!isPersonalVault` branch added) + an explicit "never invent a business/clinic/person name; say so if unknown."
- Cleared 44 stale `messageEvents` for the demo user (messed-up CoS chat remnants).

**Nav IA (accordion)**
- Active persona expands **inline under its own row** (Workers / Drive / Games / worker-tabs / Account); switching moves the block with the highlight.
- **Two-ink color discipline**: section labels = persona color, items = white (killed the purple-Workers / green-Games rainbow).
- **Creator** is a first-class persona row with its own expanded nav; un-stuck via route-based `creatorActive` + navigate-off-`/creators` on persona switch (the Creator Dashboard canvas no longer freezes).
- ACCOUNT collapses like the other sections. My Drive is a clean label (no folder icon). Removed the "Back to `real_estate_development`" breadcrumb (leaked raw vertical keys).

**The overlay (task #36 family)**
- Discovery / "<vertical> Workers" cards can no longer hijack an open worker's canvas. Added `isDiscovery` flag in `canvasTypes.js` + `isDiscoveryCanvas()` helper; **guarded BOTH mount paths** (App.jsx was guarded with brittle string-prefix; RightPanel had no guard at all).

**Drive → worker handoff**
- Drive rows are draggable + have a **"→ Chat"** action; ChatPanel receives the in-app drop / `ta:drive-to-chat` event and hands the file to the active worker. "Open" no longer dies silently on metadata-only files.
- **4 real credit-card statement PDFs** (pdfkit → Cloud Storage) seeded → the Accounting worker's existing **Import from Drive → `/accounting:statements:parse`** flow genuinely parses + categorizes them (real Claude extraction, not narration).

**Generated-image persistence**
- The image URL was already saved on the message; history just never re-showed it. `loadConversationHistory` now re-emits the last generated image onto the canvas (no costly regeneration to "see it again").

---

## The DB-vs-FIXTURE audit (the keystone reference)

Render path (both mounts): `getLiveDataForTab(worker, tab)` (Firestore via `/v1/...`) → **fallback** `getFixtureForTab` (hardcoded `sampleData.js`). A worker is "real" only when its live builder returns data.

### ✅ DB-backed + seeded for Meadow Creek (`ws_1781920656122_tl9dhn`)
| Worker | Endpoint | Collection(s) | Seed |
|---|---|---|---|
| vet-003-drug-dosing | `/v1/vet:dosing` | `dosing_orders`, `protocol_library` | seedVet003 (12 orders, 4 protocols) |
| edu-001-cvt-exam-prep | `/v1/edu:cohort` | `course_enrollments`, `module_completions`, `curriculum_modules`, `cohort_analytics` | seedEdu001 (8 students, 9 modules) |
| spine-4-staff-credentials | `/v1/staff-credentials:list` | `staff_credentials`, `training_completions`, `credential_reminders` | seedSpine4 (5 staff, 18 creds) |
| platform-accounting (overview) | `/v1/accounting:dashboard:summary` | `transactions`, `coaAccounts`, `connectedAccounts` | **seedAccountingDemo (new): 12 CoA + 84 txns/6mo + fiscal year → setup 6/6, real cash/burn/runway** |
| platform-marketing | `/v1/marketing:campaigns` | `campaigns` | seedDemoMarketing (6 campaigns) |
| platform-contacts | `/v1/contacts:list` | `contacts` | seedDemoContacts (160 clients) |

### ⚠️ Still FIXTURE ("text on the page") — gap list for task #70
| Worker / tabs | Why it's not DB yet | Fix |
|---|---|---|
| **platform-hr** — people/onboarding/schedule/compliance/documents (5 of 6) | Live endpoints EXIST (`/hr:people:list` etc.) **but the HR service reads a GLOBAL, non-tenant-scoped `advisors` collection** → wiring it would leak SOCIII advisors (Kent, Eric) into Meadow Creek. Fixtures were re-contextualized to real vet staff (Dr. Park, Sam Rivera CVT, Alex Torres, Casey Kim) as the honest interim. | **Refactor `services/hr/people.js` to be tenant-scoped** (filter advisors by tenant; source onboarding/compliance from per-tenant collections) + seed `tenants/{tid}/hrSchedules`. Ties to #43/#44 (tenant isolation). |
| **title-abstract-001** + all `RE_CANVAS`/`RE_FIXTURES` | Separate render path (`RealEstateWorkerCanvas` ← `reCanvasData.js`); hardcoded Pinedale WY property. Only live touch is on-demand `/v1/re:lookup`. | Move the default canvas to a tenant `titleAbstracts` collection + seed. |
| platform-accounting — pl/balance-sheet/cash-flow/invoices/tax | Only `overview` computes from `transactions`; sub-tabs are fixtures. | Compute P&L/BS/CF from `transactions`+`coaAccounts`; add an `invoices` collection. |
| fundraise — cap-table/governance/voting/communication/documents | partial: pipeline/progress/data-room/notices are live | seed remaining IR collections. |
| CRE Analyst, Aviation CoPilots, site-recon-001, control-center-pro | baked files (`creAnalystData.js`) / `AVIATION_COPILOT_FIXTURES`; no DB, no seed | per-worker collections + seeds. |

**Drift fixed:** deleted `seedDemoStaff.js` (wrote `staffCredentials`; live reads `staff_credentials` — dead, superseded by `seedSpine4.js`).

---

## Demo punch-list still open (need Sean's live eyes — render/wiring, not done blind)
- **HR tabs don't activate** — tab IDs match fixtures + wiring is correct in one mount path; it's the dual-mount issue (#36). Needs a live click-test to pin which path the authed demo uses.
- **Marketing**: Creative = real Fal.ai image/video ads; campaign click → big picture.
- **Vet**: patient photos in Order History; order rows → click through to the filed logbook entry (hash).
- **Edu**: clickable curriculum → open video/coursework; populate the empty Dashboard tab.
- **"General guidance mode" empty Dashboard** (Edu/Spine 4) — populate or default to a rich tab (render-path change).
- **Drive → Accounting one-click** — route a statement straight into the parse pipeline instead of CoS narrating it.

---

## Red-team / sign-off
- ✅ Build clean; lint baseline unchanged (424 pre-existing errors are codebase-wide react-refresh/purity — not regressions); pruned the 2 imports tonight's refactor orphaned.
- ✅ Every DB-backed worker re-seeded + verified (accounting dashboard recomputed: $165k cash, $20.6k avg burn, ~8mo runway).
- ⚠️ **Do not claim a worker is "real" until its live builder returns Firestore data.** The fixture fallback is a silent liar — see the audit table before any "it works on camera" claim.
- ⚠️ HR is the #1 honesty gap: looks real (vet staff) but is still frontend fixture pending the tenant-scope refactor.
