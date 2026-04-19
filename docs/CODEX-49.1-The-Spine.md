CODEX 49.1
The Spine — TitleApp Operating System Foundation
Master build document — one surface, all phases
Document
CODEX 49.1
Type
Master build document — contains all phases A1 through E
Terminal
T1 (build) + T2 (research as needed per phase)
Date
April 18, 2026
Depends on
CODEX 48.x complete. Worker click working. Engineering Protocol v1.1 in force.
Phase order
A1 → A2 → B → C0 → C → D → E (sequential, no phase starts until previous passes smoke test)
Red-teamed
Yes — 8 challenges identified and incorporated before writing
Research
T2 full audit April 18, 2026 — 60+ docs reviewed, all findings incorporated
Lives in
docs/CODEX-49.1-The-Spine.md in repo

THE NORTH STAR
TitleApp is not a collection of tools. It is one operating system for your life and business.

Every worker is a lens into the same underlying data. Alex sees all of it. Control Center rolls it up. The individual Spine workers (Accounting, HR, Contacts, Marketing, Vault) each manage their slice. The data flows between them — a contact in Contacts shows up in Accounting, in HR, in Marketing. You are not switching apps. You are switching views.

RAAS + AI = Salesforce velocity without Salesforce headcount, with compliance built in at the infrastructure level rather than bolted on afterward.

The Spine is the foundation every domain worker builds on. An aircraft mechanic building a maintenance worker doesn’t build scheduling — they plug into HR/Scheduling. They don’t build payments — they plug into Stripe via Accounting. They inherit the entire Spine and build their expertise on top.

What Already Exists — Do Not Rebuild
Full T2 audit completed April 18, 2026. These are confirmed live. Build on them, not around them.

Component
Location
Status
Alex (Worker Zero)
digitalWorkers/alex-worker-zero
Live
Daily Brief generator
admin/generateDailyDigest.js
Live — reads 8 Firestore collections
Control Center data gatherer
services/cosScheduler.js:139
Live — gatherControlCenterData()
RevenueDashboardCard
components/canvas/RevenueDashboardCard.jsx
Live — self-loads from briefings/{uid}
12 canvas cards
components/canvas/
Render-ready, need data wired
CanvasCardShell
components/canvas/CanvasCardShell.jsx
Stable shared shell
Workspace/tenant model
helpers/workspaces.js
Live — handles multiple contexts
KYC identity layer
contracts/capabilities.json
Live — kyc.verify_identity_v1
Stripe
index.js + billing/
Live — payments, subscriptions, Connect
GDrive OAuth + import
services/vault/driveImport.js
Live
DropBox Sign
signatures/
Live — e-signatures
Twilio
campaigns/otpAuth.js
Live — SMS/OTP
SendGrid
campaigns/
Live — email
RAAS Tier 0
helpers/workerSchema.js
Live — universal rules enforced
Transactions read API
api/routes/transactions.js
Partial — read-only, no write
DTC/Vault assets
api/routes/assets.js
Live — blockchain assets
Studio Locker
services/sandbox/studioLocker.js
Live — knowledge ingestion
Capabilities registry
contracts/capabilities.json
Live — add-only versioning

Canvas Design Language — The PFD Principle
Defined April 18, 2026. Applies to every canvas built in this CODEX and every canvas built after it.

THE FIVE PRINCIPLES
1. STATUS AT A GLANCE — The CAS model. Green = normal. Yellow = advisory, pay attention. Red = requires immediate action. White/Blue = informational. Every canvas has a status layer. A subscriber opens any canvas and knows within 3 seconds whether anything needs attention.

2. THE PFD PRINCIPLE — Data in relationship to something real, not rows and columns. A real estate canvas shows deals on a map. An aviation canvas shows systems as diagrams. A nursing canvas shows vitals as trends. Ask for every data point: what is this in relationship to?

3. FAMILIARITY OVER NOVELTY — People use Gmail, Google Maps, Instagram every day. The canvas should feel like the best consumer app in that domain. For real estate: Zillow/Maps. For aviation: ForeFlight. Meet users where they are.

4. SPECIFIC BEATS GENERIC — The canvas knows who you are and what you’re working on. It shows your data, not sample data. A checklist with your aircraft’s tail number is specific. A generic checklist is not.

5. PROGRESSIVE DISCLOSURE — Show the 3-5 most important things. Everything else is one tap deeper. The PFD doesn’t show every system parameter — it shows what matters for flight.

Color system — keep existing brand palette, add PFD status layer
Token name
Hex
Use
Meaning
--color-workers
#6B46C1
Workers accent
Brand purple — unchanged
--color-games
#16A34A
Games accent
Brand green — unchanged
--color-status-green
#16A34A
Status: normal
In range, no action needed
--color-status-yellow
#EAB308
Status: advisory
Pay attention, decision needed
--color-status-red
#DC2626
Status: urgent
Requires immediate action
--color-status-blue
#3B82F6
Status: info
Advisory, informational
--color-status-white
#F8FAFC
Status: neutral
No data or not applicable
--color-text-primary
#1e293b
Primary text
Unchanged
--color-text-muted
#64748B
Muted text
Unchanged
--color-border
#E2E8F0
Borders
Unchanged
--color-bg
#F8FAFC
Background
Unchanged
--color-canvas-bg
#0f172a
Canvas dark bg
For data-dense sections

PHASE A1 — Schema Decisions — Product Sign-Off

Risk
Low
Status
Not started

PHASE A1 RULE
This phase produces decisions and documentation, not code. T1 does not touch any file until A1 is complete and committed to docs/.
All four schemas below are signed off by Sean Combs on April 18, 2026.

Contact Schema
Anti-Salesforce principle: 8 fields, AI fills the rest from context. One record per verified identity.
Contact field
Type
Required
Notes
id
string
Yes
System generated
identity_id
string
No
Optional link to verified KYC. Changes worker behavior — unverified contacts cannot sign documents, receive payments, or access KYC-1 capabilities
name
string
Yes
Free text
type
enum
Yes
customer | vendor | investor | tenant | employee | patient | student | contractor | personal
workspaces
array
Yes
Which workspace(s) this contact belongs to
added_by
string
Yes
userId of creator
notes
string
No
Free text. Alex fills from conversation context
created_at
timestamp
Yes
System generated

RAAS rule: A contact with a verified identity_id is trusted. All others are unverified. Workers enforce different capabilities based on trust level.
Firestore path: workspaces/{workspaceId}/contacts/{contactId}

Transaction Schema
User never sees debits and credits. Alex assigns GAAP categories under the hood. Output is GAAP-compliant for accountants, plain English for users.
Transaction field
Type
Required
Notes
id
string
Yes
System generated
workspace
string
Yes
Which ledger this belongs to. One ledger per workspace — personal, business, property never bleed into each other
amount
number
Yes
Always positive
direction
enum
Yes
income | expense | transfer
category
string
Yes
Alex assigns from context. User can override. Plain English.
description
string
Yes
Free text
date
timestamp
Yes
Transaction date
contact_id
string
No
Who this is with
asset_id
string
No
What asset this relates to
document_id
string
No
Linked receipt, statement, or contract
source
enum
Yes
manual | stripe | gdrive_import | bank_statement
status
enum
Yes
pending | cleared | reconciled
debit_account
string
Yes
System generated. GAAP double-entry. User never sees.
credit_account
string
Yes
System generated. GAAP double-entry. User never sees.
gaap_category
enum
Yes
asset | liability | equity | revenue | expense. Alex assigns.
created_at
timestamp
Yes
System generated

RAAS rule: All financial calculations include 'these are estimates, not advice' disclaimer (Tier 0 default already enforced). Tax-relevant transactions flagged but Alex never gives tax advice.
GDrive input: Bank statements (PDF or CSV) imported via existing driveImport.js. Alex reads, categorizes, flags unusual items, asks for confirmation on ambiguous ones.
Firestore path: workspaces/{workspaceId}/transactions/{transactionId}

Business Asset Schema
Not DTC blockchain assets (those exist separately). Business assets — the things you own that have value and generate obligations.
The DTC hierarchy: Asset → DTC (blockchain anchor) → Logbook → Logbook Entry (on-chain OR Firebase)
Business Asset field
Type
Required
Notes
id
string
Yes
System generated
name
string
Yes
Free text. '2022 RAV4', '123 Main St Unit 4', 'Cessna 172 N12345'
type
enum
Yes
vehicle | property | aircraft | equipment | intellectual_property | other
owner_workspace
string
Yes
Which workspace owns this asset
current_value
number
No
Optional. Alex can update from market data.
purchase_date
timestamp
No
Optional
purchase_price
number
No
Optional
linked_documents
array
No
Array of document IDs: title, insurance, maintenance records
linked_transactions
array
No
Array of transaction IDs: costs, income generated
linked_contacts
array
No
Array of contact IDs: tenants, vendors, insurers
dtc_id
string
No
Link to DTC blockchain record in dtcs/ collection
logbook_id
string
No
Link to logbook. Logbook entries can be on-chain or Firebase per entry
audit_trail_default
enum
No
on_chain | firebase. Operator sets default. User overrides per entry within operator allowance.
notes
string
No
Free text
created_at
timestamp
Yes
System generated

RAAS rule: Once minted on-chain, a logbook entry cannot be deleted or modified by anyone (Tier 0). Audit trail toggle is Tier 2 (operator-editable). User can override per entry within Tier 3.
Firestore path: workspaces/{workspaceId}/assets/{assetId}

Employee/HR Schema
Not ADP. Not Workday. What a small business owner, household manager, or solo founder actually needs. Compliance-focused, not payroll-focused. Alex handles reminders, not pay runs.
Contact link: Every Employee links to a Contact record. Same person, different view.
Employee field
Type
Required
Notes
id
string
Yes
System generated
contact_id
string
Yes
Links to Contact record. One person, multiple views.
workspace
string
Yes
Which workspace they work in
role
string
Yes
Free text
employment_type
enum
Yes
full_time | part_time | contractor | volunteer
start_date
timestamp
Yes
Required
end_date
timestamp
No
If applicable
status
enum
Yes
active | onboarding | offboarding | inactive
compensation
object
No
{ amount, frequency, currency }. KYC-1 required to access.
documents
array
No
Offer letter, NDA, I-9, W-4 linked document IDs
schedule
object
No
{ days: [], hours_per_day, timezone }
compliance_flags
array
No
Items needing attention. Alex populates.
created_at
timestamp
Yes
System generated

RAAS rule: HR data is Tier 2 (employer-editable, workspace-specific). PII protected at Tier 0. Compensation data requires KYC-1 to access. Alex reminds about missing docs and expiring agreements — she does not run payroll.
Firestore path: workspaces/{workspaceId}/employees/{employeeId}

✓
SMOKE TEST — MUST PASS BEFORE NEXT PHASE
□
All four schemas documented in docs/FIRESTORE_DATA_CONTRACT.md (append, do not replace existing entries)
□
Contact, Transaction, BusinessAsset, Employee capabilities added to contracts/capabilities.json (add-only rule)
□
No existing collections modified
□
Committed to docs/ before Phase A2 starts
ROLLBACK
// Phase A1 produces no code. If decisions change, update the document.

PHASE A2 — Schema Implementation + YAML Loader
Depends on: Phase A1 complete and committed
Risk
Medium
Status
Not started

A2.1 — Firestore collections
Create the four new Firestore collections defined in Phase A1. Each follows the workspace-scoped path pattern.
// New collections to create:
workspaces/{workspaceId}/contacts/{contactId}
workspaces/{workspaceId}/transactions/{transactionId}
workspaces/{workspaceId}/assets/{assetId}
workspaces/{workspaceId}/employees/{employeeId}

// Add to docs/platform/FIRESTORE_DATA_CONTRACT.md
// Do NOT modify existing collection definitions

A2.2 — Capabilities registry update
Add new capabilities to contracts/capabilities.json. Add-only rule — never modify existing _v1 entries.
// Add to contracts/capabilities.json:
contacts.create_contact_v1       KYC-0  human/chat/worker
contacts.update_contact_v1       KYC-0  human/chat/worker
contacts.delete_contact_v1       KYC-1  human only
contacts.link_identity_v1        KYC-1  human only
transactions.create_transaction_v1  KYC-0  human/chat/worker
transactions.import_statement_v1    KYC-0  human/chat
assets.create_asset_v1           KYC-0  human/chat/worker
assets.link_dtc_v1               KYC-1  human only
employees.create_employee_v1     KYC-1  human/chat
employees.update_employee_v1     KYC-1  human/chat

A2.3 — YAML to Firestore loader
Build a seeder script that reads the YAML catalog docs and seeds workers into Firestore. Follows the pattern of existing seedWorkerRegistry.js and seedDigitalWorkerCatalog.js but reads from files instead of hardcoded data.
// New file: functions/functions/scripts/seedFromCatalog.js
// Reads: docs/platform/catalog/*.md (YAML blocks)
// Writes to: raasCatalog/ and digitalWorkers/ collections
// Pattern: same as seedWorkerRegistry.js but file-driven
// Run: node scripts/seedFromCatalog.js --dry-run first
//      node scripts/seedFromCatalog.js --commit to write

A2.4 — HR worker spec (W-041 gap)
The catalog skips from W-040 (Tax) to W-042 (Insurance). HR worker needs to be defined and added.
// Add to docs/platform/catalog/Part2D-Phase5-7-Horizontal-New-Workers.md
// W-041: HR & People Worker
// type: horizontal (applies to all verticals)
// pricing: $29/mo
// RAAS: Tier 1 = employment law (FLSA, FMLA, ADA)
//        Tier 2 = operator HR policies
//        Tier 3 = employee preferences

✓
SMOKE TEST — MUST PASS BEFORE NEXT PHASE
□
All four Firestore collections created and confirmed in Firebase console
□
capabilities.json updated with new capabilities, all add-only
□
seedFromCatalog.js --dry-run runs without errors
□
seedFromCatalog.js --commit seeds horizontal workers to Firestore
□
W-041 HR worker spec added to catalog doc
□
git tag spine-a2-stable before deploying
ROLLBACK
git checkout spine-a2-stable -- contracts/capabilities.json
// Delete new Firestore collections manually in Firebase console
// Revert catalog doc changes

PHASE B — Backend Routes — Spine Workers
Depends on: Phase A2 complete
Risk
Medium
Status
Not started

Build the backend API routes for each Spine worker. Each route follows the existing Express router pattern in functions/functions/api/routes/. Every write operation emits an audit event per capabilities.json rules.

B.1 — Contacts routes
// New file: functions/functions/api/routes/contacts.js
GET    /v1/workspaces/:id/contacts
POST   /v1/workspaces/:id/contacts
PUT    /v1/workspaces/:id/contacts/:contactId
DELETE /v1/workspaces/:id/contacts/:contactId
POST   /v1/workspaces/:id/contacts/:contactId/link-identity

// All routes: requireFirebaseUser, tenant-scoped, emit audit event
// link-identity: requires KYC-1, calls kyc.verify_identity_v1

B.2 — Transactions write routes
Read-only route already exists at api/routes/transactions.js. Add write routes to the same file.
// Add to existing functions/functions/api/routes/transactions.js
POST   /v1/workspaces/:id/transactions
PUT    /v1/workspaces/:id/transactions/:txId
POST   /v1/workspaces/:id/transactions/import-statement

// import-statement: accepts PDF or CSV from GDrive
// Calls existing driveImport.js + pdf-parse
// Alex categorizes via chat handler
// Writes GAAP fields automatically

B.3 — Assets routes
DTC assets route already exists at api/routes/assets.js. Add business asset routes as a separate resource.
// Add to existing functions/functions/api/routes/assets.js
GET    /v1/workspaces/:id/business-assets
POST   /v1/workspaces/:id/business-assets
PUT    /v1/workspaces/:id/business-assets/:assetId
POST   /v1/workspaces/:id/business-assets/:assetId/link-dtc

// link-dtc: connects business asset to existing DTC record
// Requires KYC-1

B.4 — HR/Employees routes
// New file: functions/functions/api/routes/employees.js
GET    /v1/workspaces/:id/employees
POST   /v1/workspaces/:id/employees
PUT    /v1/workspaces/:id/employees/:employeeId
GET    /v1/workspaces/:id/employees/:employeeId/compliance

// Compensation data: requires KYC-1 on read and write
// Compliance endpoint: returns Alex-generated compliance flags

B.5 — Ensure Spine data feeds Alex’s existing collections
Alex’s daily brief already reads from accounting/summary, pipeline/b2b/deals, pipeline/investors/deals, campaigns. The Spine workers must write to these collections so Alex’s brief stays accurate.
// When a transaction is created/updated:
// → Update accounting/summary (revenue MTD, expense MTD)

// When a contact status changes (deal stage):
// → Update pipeline/b2b/deals or pipeline/investors/deals

// When a marketing campaign is created:
// → Write to campaigns collection

// These are write-through patterns, not separate syncs

✓
SMOKE TEST — MUST PASS BEFORE NEXT PHASE
□
POST /v1/workspaces/:id/contacts creates a contact in Firestore
□
POST /v1/workspaces/:id/transactions creates a transaction with GAAP fields
□
import-statement endpoint accepts a PDF and returns categorized transactions
□
POST /v1/workspaces/:id/employees creates an employee linked to a contact
□
Creating a transaction updates accounting/summary (Alex brief source)
□
All write routes emit audit events
□
firebase deploy --only functions after all routes wired
□
git tag spine-b-stable
ROLLBACK
// Disable new routes in index.js (comment out router registrations)
firebase deploy --only functions
// New Firestore data remains but is inaccessible without routes
// Revert write-through updates to Alex collections if needed

PHASE C0 — Design System Tokens — Gate Before Canvas
Depends on: Phase B complete
Risk
Low
Status
Not started

Must complete before any canvas component work starts. Converts the de facto color palette into CSS variables. Adds PFD status layer. Updates CanvasCardShell to use tokens.

// Add to apps/business/src/App.css :root block
:root {
  /* Brand — unchanged */
  --color-workers: #6B46C1;
  --color-games: #16A34A;

  /* PFD Status layer */
  --status-green: #16A34A;
  --status-yellow: #EAB308;
  --status-red: #DC2626;
  --status-blue: #3B82F6;
  --status-white: #F8FAFC;

  /* Typography */
  --text-primary: #1e293b;
  --text-muted: #64748B;
  --text-heading-size: 28px;
  --text-heading-weight: 700;

  /* Canvas */
  --canvas-bg: #F8FAFC;
  --canvas-dark-bg: #0f172a;
  --canvas-border: #E2E8F0;
  --canvas-card-padding: 16px;

  /* Status indicator sizes */
  --status-dot-size: 8px;
  --status-arrow-size: 14px;
}

Update CanvasCardShell.jsx to use CSS variables instead of hardcoded hex values. No visual change — same colors, now tokenized.

✓
SMOKE TEST — MUST PASS BEFORE NEXT PHASE
□
CSS variables defined in App.css :root
□
CanvasCardShell.jsx uses CSS variables, no hardcoded colors
□
Visual appearance unchanged from before tokens
□
npm run build succeeds
□
git tag spine-c0-stable
ROLLBACK
git checkout spine-c0-stable -- apps/business/src/App.css
git checkout spine-c0-stable -- apps/business/src/components/canvas/CanvasCardShell.jsx
npm run build && firebase deploy --only hosting

PHASE C — Canvas Wiring — Spine Workers
Depends on: Phase B + C0 complete
Risk
Medium
Status
Not started

Wire existing canvas cards to Phase B backend data. Build 3 new cards. Register all in CanvasComponentMap.jsx. All cards follow the existing { resolved, context, onDismiss } pattern.

C.1 — Wire existing cards
Card
Data source
What to wire
PLSummaryCard
GET /transactions + accounting/summary
Populate context.plData from workspace transactions
InvoiceListCard
GET /transactions (direction=income, status=pending)
Populate context.invoices from pending income transactions
ChartOfAccountsCard
GET /transactions grouped by gaap_category
Populate context.chartOfAccounts from GAAP-categorized transactions
EmployeeRegisterCard
GET /employees
Populate context.employees from workspace employees
ContentCalendarCard
GET /campaigns
Populate context.contentCalendar from active campaigns
RevenueDashboardCard
Already self-loading from briefings/{uid}
No change needed — already works

C.2 — Build new cards
Three new cards following the existing { resolved, context, onDismiss } pattern. Wrap in CanvasCardShell. Use CSS tokens from Phase C0.

ContactCard.jsx — context.contacts = array from GET /contacts. Shows name, type, verified status (green dot if identity_id set, grey if not), last interaction.
BusinessAssetCard.jsx — context.assets = array from GET /business-assets. Shows name, type, current value, status (green/yellow/red based on linked compliance items).
TransactionCard.jsx — context.transaction = single transaction from GET /transactions/:id. Shows amount, direction (green arrow up / red arrow down), category, date, linked contact.

C.3 — Register in CanvasComponentMap.jsx
// Add to apps/business/src/components/canvas/CanvasComponentMap.jsx
ContactCard: () => import('./ContactCard'),
BusinessAssetCard: () => import('./BusinessAssetCard'),
TransactionCard: () => import('./TransactionCard'),

C.4 — Wire Spine worker nav items to canvas sections
Each Spine worker nav item needs a case in App.jsx renderSection(). Currently they all fall through to WorkerHome.
// Add to App.jsx renderSection() switch:
case 'accounting':
case 'pl-summary': return <PLSummaryCard />;
case 'invoices': return <InvoiceListCard />;
case 'chart-of-accounts': return <ChartOfAccountsCard />;
case 'contacts': return <ContactCard />;
case 'employees': return <EmployeeRegisterCard />;
case 'content-calendar': return <ContentCalendarCard />;
case 'assets': return <BusinessAssetCard />;
case 'transactions': return <TransactionCard />;

✓
SMOKE TEST — MUST PASS BEFORE NEXT PHASE
□
Click Accounting in Spine worker nav → PLSummaryCard renders with real data
□
Click Contacts nav item → ContactCard renders with workspace contacts
□
Click Employees nav item → EmployeeRegisterCard renders with workspace employees
□
Verified contact shows green dot, unverified shows grey dot
□
Transaction arrows: income = green up, expense = red down
□
All cards use CSS tokens — no hardcoded colors
□
npm run build succeeds, no lint errors
□
git tag spine-c-stable
ROLLBACK
git checkout spine-c-stable -- apps/business/src/App.jsx
git checkout spine-c-stable -- apps/business/src/components/canvas/CanvasComponentMap.jsx
// Delete new card files if needed
npm run build && firebase deploy --only hosting

PHASE D — Alex Integration — Per-User Daily Brief
Depends on: Phase C complete
Risk
Medium
Status
Not started

CAREFUL PHASE
Alex is live production. Users depend on the daily brief every morning.
Tag spine-d-pre before touching generateDailyDigest.js.
Test all changes in a staging environment before production deploy.
If anything breaks Alex, roll back immediately using the tag.

The daily brief generator already reads from 8 Firestore collections. Phase B wired Spine data to those collections. Phase D extends the brief to be per-user rather than admin-only.

D.1 — Per-user brief generation
Currently generateDailyDigest.js runs once and sends to Sean. Extend it to run for each active user.
// generateDailyDigest.js changes:
// 1. Query all active workspaces (not just admin)
// 2. For each workspace, call gatherUserBriefData(workspaceId)
// 3. gatherUserBriefData reads from workspace-scoped collections:
//    workspaces/{id}/transactions (accounting/summary)
//    workspaces/{id}/contacts (pipeline status)
//    workspaces/{id}/employees (compliance flags)
// 4. Generate brief using existing template
// 5. Write to dailyDigest/{userId}/{date}
// 6. Send via SendGrid/Twilio to user preferences

D.2 — Alex reads per-user brief in chat
ChatPanel already reads from briefings/{uid}. Ensure dailyDigest/{userId}/{date} is also accessible to Alex’s context when user opens chat.

✓
SMOKE TEST — MUST PASS BEFORE NEXT PHASE
□
Daily brief generates for test user with workspace data (not just admin)
□
Brief includes Spine data: transactions summary, contact pipeline, employee flags
□
Alex chat context includes today’s brief data
□
Original admin brief still works (no regression)
□
Email and SMS delivery confirmed for test user
□
git tag spine-d-stable after confirming
ROLLBACK
git checkout spine-d-pre -- functions/functions/admin/generateDailyDigest.js
firebase deploy --only functions
// Admin brief returns to previous behavior immediately

PHASE E — Control Center — Customizable Dashboard
Depends on: Phase D complete
Risk
Low
Status
Not started

Last phase. Depends on everything else working. gatherControlCenterData() already exists in services/cosScheduler.js. Phase E builds the dedicated section/page and makes KPIs customizable per user.

E.1 — Control Center section
Create apps/business/src/sections/ControlCenter.jsx. Currently the chief-of-staff case renders AlexPipelines. Replace with a full Control Center dashboard.

E.2 — Default KPI sets by context
Context
Default KPIs
TitleApp business
Workers published, active subscribers, pipeline ARR, investor stages, monthly burn, data credit usage
Small business
Revenue MTD vs target, outstanding invoices, active customers, top expense category, employee headcount
Household
Bills due this week, savings vs target, asset values, upcoming renewals (insurance, registration)
Property management
Rent collected vs expected, maintenance requests open, lease expirations, vacancy rate

E.3 — PFD status indicators on Control Center
Every KPI on the Control Center shows a status indicator using the Phase C0 tokens:
Green arrow up — trending better than target
Yellow arrow sideways — flat, at target
Red arrow down — trending worse than target
Grey dash — no data yet
User never has to interpret a number in isolation. The arrow tells them instantly whether to pay attention.

E.4 — User-customizable KPIs
Each user can add, remove, and reorder KPIs on their Control Center. Alex suggests additions based on what data exists in their workspace. Settings stored in users/{userId}/controlCenterConfig.

✓
SMOKE TEST — MUST PASS BEFORE NEXT PHASE
□
Control Center section renders at /dashboard with default KPIs for workspace type
□
All KPIs show PFD status arrows (green/yellow/red)
□
User can add and remove KPIs from the Control Center
□
Control Center reads from gatherControlCenterData() (existing, no rewrite)
□
TitleApp workspace shows correct platform metrics
□
npm run build succeeds
□
git tag spine-e-stable — this is the Spine complete tag
ROLLBACK
git checkout spine-e-stable -- apps/business/src/sections/ControlCenter.jsx
git checkout spine-e-stable -- apps/business/src/App.jsx
npm run build && firebase deploy --only hosting

What The Spine Enables After Completion

FOR YOU
Build and optimize all Spine workers without waiting for the sandbox.
Alex’s daily brief is personalized to your actual workspace data.
Control Center shows your real TitleApp metrics with status indicators.
Every contact is tracked across all your workspaces.
Bank statements in → GAAP-compliant books out. No QuickBooks.

FOR RUTHIE AND KENT
Ruthie builds a nursing worker that inherits HR/Scheduling, Contacts, and document signing from the Spine. She only builds the domain expertise.
Kent builds finance/accounting workers that plug into the existing Transaction schema and GAAP output. He doesn’t build double-entry bookkeeping.
Both contribute on branches per Engineering Protocol v1.1. PRs reviewed before merge.

FOR THE MARKETPLACE
An aircraft mechanic building a maintenance worker inherits scheduling from HR, payments from Accounting, document signing from Vault, and contacts from Contacts.
A real estate attorney building a closing worker inherits document signing, contacts, transactions, and KYC identity verification.
They build their domain expertise. The Spine handles everything else.
This is the platform moat. RAAS is the compliance moat. Together they are what makes TitleApp defensible.

Next CODEX After 49.1
CODEX 49.2 — SDK Documentation (how to build a worker outside the sandbox)
CODEX 49.3 — Ruthie’s Nursing Worker (first external contributor build)
CODEX 49.4 — Game Sandbox completion (when Spine is stable)
CODEX 49.5 — Worker Sandbox completion (when Game Sandbox is stable)