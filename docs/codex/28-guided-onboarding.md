# CODEX 28 — Guided Onboarding: Alex as Activation Agent

**Created:** 2026-07-09  
**Revised:** 2026-07-09 (third review pass — vertical taxonomy reconciled, CAS state machine clarified, sign-off gate expanded)  
**Priority:** Critical — blocks customer activation at scale  
**Owner:** Sean  
**Status:** Spec — revised. Two independent red teams + one synthesis review completed. Build blocked on RT2-2 + RT2-3 prerequisites (see "Immediate Actions Required" section below).

---

## ⚠️ Immediate Actions Required Before Build (Pre-existing Production Defects)

These are NOT onboarding-specific issues. They are existing defects in the codebase that this feature will inherit. They must be resolved first. The onboarding build is blocked until both are fixed.

### [CRITICAL] RT2-2 — Possible Plaintext OAuth Token at Legacy Firestore Path

`driveAuth.js` stores the encrypted Drive token at `users/{uid}/integrations/googleDrive`. The chat engine reads from `users/{uid}/integrations/drive` (different path, different field: `accessToken`, no encryption check). A legacy unencrypted token may exist at the `drive` path — live secret exposure if it does.

**Fix before building:** Audit all documents at `users/*/integrations/drive`. If any have a plaintext `accessToken` field, rotate and re-encrypt immediately. Consolidate to one canonical path (`googleDrive`) and update all readers.

### [HIGH] RT2-3 — Append-Only Invariant Already Violated in driveImport.js

`driveImport.js` lines 102–115 call `docRef.update({ superseded: true })` on committed records. Every CODEX in this series (property-manager-001, W-037, Vault) depends on the append-only guarantee. The `drive:pull` feature would inherit this violation.

**Fix before building:** Write a new version record with `{ version: 2, supersedesId: oldDocId }` and never touch the original. Queries filter `superseded === false` on the new record only.

---

## The Problem (Sean's Words)

> "We're just waving a wand to make up the data to drive this demo, but a user is going to
> have to do this and if it's not really easy the friction and switching costs will block
> adoption."

This is the adoption wall. Right now, a new customer lands in their workspace and sees:
- A sidebar of workers in "setup mode" (checklists)
- An Alex chat that asks generic intake questions
- No visible path from "I just signed up" to "Alex is running my business"

We manually seed demo data to make the platform look alive. Real customers have to populate it themselves. If that process requires effort, expertise, or patience — they won't do it. The platform stays half-populated, workers stay in setup mode, and the customer churns before they ever see the value.

**The switching cost problem is real:** If a customer has their files in Google Drive, their contacts in a CRM, their financials in QuickBooks, and their property data in some spreadsheet — and SOCIII can't pull from those automatically — then every piece of data is a manual re-entry decision. That's a real cost the customer weighs every day they consider leaving.

---

## Current State (What Happens Today)

1. User signs up via Google SSO or email
2. Alex appears with generic chat intake: "Tell me about your business"
3. Workers are assigned (via marketplace or default bundle)
4. Every worker shows in setup mode — all checklists incomplete
5. Alex can answer questions but has no workspace data to ground on
6. User is alone with empty forms and a list of things they should connect
7. Most users: partial setup, reduced value, eventual churn
8. Power users (like Sean): manually seed the database via scripts

**The gap is not the product — it's the activation path.**

---

## The Ideal State: Alex Drives Setup

When a new workspace is detected, Alex should run a structured **first-session flow** — not a form, not a modal, but a conversation with clear actions:

```
Alex: "Good morning — I need to ask one thing before we do anything else:
what kind of business are you running? That determines which connections
matter most and what I'll look for."

[User selects: Real Estate / Education / Healthcare / Retail / Other]

Alex: "Got it — CRE. The fastest way to get me working for you is to
connect your Google account. I'll scan a folder you pick for existing
files — rent rolls, leases, financial statements — and show you what
I find before touching anything. Takes about 30 seconds. Want to start?"

[User selects folder → OAuth with folder scope]

Alex: "I found 23 files in that folder that look relevant to a real
estate operation. Let me show you what I found before I do anything
with them — you approve each one individually."

[Shows classified file list — user reviews + approves each item]

Alex: "Great. I've pulled your rent roll into Property Manager, your
two lease agreements into the tenant roster, and your Q1 financial
summary into Accounting. 4 workers are now live. 3 more need one
manual step each — want to go through them now or later?"
```

This is the activation path. Everything else is downstream of this moment working.

---

## Architecture: Three Phases

### Phase 1 — New Workspace Detection

**Trigger:** User's first session in a new workspace (no prior activity).

**Signal:** `workspaces/{tenantId}` document has an explicit `onboarding_status: "not_started"` field.
Never infer state from empty collections — that breaks if a technical founder pre-populates before
a co-founder logs in, and it fails on mid-flight interruptions.

**Onboarding status field** (single field, two purposes: stage tracking + write-once CAS lock):

```
onboarding_status: "not_started" | "in_progress" | "complete" | "abandoned"
onboarding_step: string  // current step name within in_progress, e.g. "vertical_selection"
```

Note: `onboarding_status` tracks the stage; `onboarding_step` tracks position within `in_progress`.
These are two separate fields with separate roles — do not collapse them.

**Action:** Alex enters "onboarding mode" — asks vertical first, then guides connections.

**Backend:** Write `onboarding_status: "not_started"` atomically when tenant is created.
Use a Firestore transaction to set `onboarding_status: "in_progress"` and `onboarding_step: "vertical_selection"` — abort if field already has any value other than `not_started` or `abandoned` (see recovery path below).

**`abandoned` state recovery:** Once a workspace reaches `abandoned`, `workspace:onboard` CAN be called again — the CAS lock accepts `not_started | abandoned` as valid starting states. Recovery from `abandoned` is handled by re-calling `workspace:onboard`, which transitions back to `in_progress` from `abandoned` and resumes from the last saved `onboarding_step`. This is NOT handled client-side only — the server must support the `abandoned → in_progress` transition explicitly in the transaction.

---

### Phase 2 — Vertical Detection + Connection Sequencing

**Step 0: Ask vertical first.** Before any scanning, Alex asks one question: "What kind of business are you running?" The options presented must match the platform's canonical vertical taxonomy from CODEX-22 (`getVerticalConfig`-enforced list): **Real Estate, Aviation, Education, Healthcare, Finance**. Plus **"Something else"** for unassigned.

Do NOT offer "Retail" or "Professional Services" as top-level verticals — those are not in the canonical five, and writing a non-canonical value to `workspace.vertical` would violate Amendment A Fix 5's publish-time validation. Commerce/Shopify operators select "Something else" and are routed to the foundation + commerce-connector path (not treated as a peer vertical). Aviation gets its own onboarding path when that vertical matures (CODEX 54). For now: present Real Estate, Education, Healthcare, Finance as the four active verticals, with "Something else" as the catch-all.

Do not infer vertical from bundle — a law firm and a property manager could buy the same bundle. Getting it wrong means wrong file taxonomy, wrong workers, irrelevant first intelligence. Vertical sets `workspace.vertical` and injects the vertical context block into COS.

**Connection order matters.** Each connection unlocks the next. Vertical SaaS and Drive are **additive, not alternative** — a RE operator will likely connect AppFolio AND Drive (AppFolio has the rent roll; Drive has HOA minutes and purchase agreements). The path below shows sequence, not exclusion:

```
Step 1: Vertical detection (Alex asks — no inference)
  → Sets: workspace.vertical (canonical value only — real-estate / aviation / education / healthcare / finance)
  → Injects vertical context block into COS prompt

Step 2: Vertical-native connector (if applicable — high-value first)
  AppFolio / Yardi / Buildium → RE operators (structured rent roll + tenant data)
  Canvas LMS / SIS → nursing schools (student rosters + clinical records)
  QuickBooks / Xero → any business with an accounting system (P&L from day one)
  [These customers are most likely to pay $99/mo — structured data unlocks immediate intelligence]

Step 3: Google OAuth (email + Drive) — folder-scoped (additive, not alternative)
  → Unlocks: email history for Alex, Drive scan within selected folder
  → Captures what vertical SaaS doesn't: HOA minutes, purchase agreements, legal docs, ad-hoc financials

Step 4: Drive scan + content classification (async)
  → Returns: classified manifest for user approval (per-item, not bulk)
  → Unlocks: pre-populated workers from approved files

Step 5: Any remaining vertical-specific connection
  ATTOM for RE, ATI/LTI for nursing, etc.
  → Unlocks: vertical intelligence enrichment
```

**Key insight:** For customers already in AppFolio or QuickBooks, those are the first load-bearing unlocks. Drive is a complementary layer, not a fallback. The onboarding UI should present both as "connect both for the full picture" — not as an either/or branch.

**Alex's role:** Guide through each step conversationally. Never show the user a form or settings panel — Alex presents the connection, shows the result, and moves to the next. Alex opens every session after an interruption with "you left off at X, want to continue?" — resumability is the design target, not 30-minute completion.

---

### Phase 3 — Drive Scan + Content Classification

This is the hard technical problem and the highest-value unlock.

**Pre-scan consent gate (unifies RT1-3 + RT2-7):**
Before issuing the Drive OAuth URL, Alex presents a plain-English disclosure:

- What will be scanned (only the folder you pick — nothing outside it)
- What leaves the platform (nothing — classification runs inside SOCIII infrastructure)
- Gemini exception: if `settings.allowThirdPartyAIClassification === true`, a notice that Gemini may process file content; this toggle defaults to `false` and must be explicitly enabled by the tenant admin
- Education hard-block: `vertical === "education"` tenants are permanently blocked from the Gemini path regardless of setting (FERPA)
- How to undo it: the "remove this connection" path is shown before confirmation

This is one gate, not two separate consent screens. It satisfies both the UX trust requirement (RT1-3) and the legal data-processing requirement (RT2-7).

**Drive scope:** Require user to pick a root folder or Shared Drive before issuing auth URL.
`drive:scan` accepts a required `rootFolderId` parameter. All file listing queries constrained with `'${rootFolderId}' in parents`. No full-Drive scans — ever (RT2-4).

**Classification approach:**
1. **Heuristic pass (immediate):** filename + MIME type + file size → serves the manifest instantly; no external API call
2. **Gemini refinement (async, off critical path):** if `allowThirdPartyAIClassification === true`, Gemini refines confidence scores in the background. Manifest is shown to user before Gemini completes. Never block user on external API during onboarding.

**User approval model:** Every manifest item requires explicit per-item user click to approve.
No auto-route at any confidence threshold — not even 99%. If confidence is high, present it at the top of the manifest with a clear label; still require a click. Auto-route was removed entirely in response to RT1-1 and RT2-6.

**Pre-scan consent gate** (rendered before any Drive OAuth URL is issued — this is separate from the per-item approval at manifest time):
- What will be scanned (only the folder you pick — nothing outside it)
- What leaves the platform (nothing — unless Gemini is enabled)
- If `settings.allowThirdPartyAIClassification === true`: notice that Gemini may process file content for deeper classification. Toggle defaults to `false`.
- Education hard-block: `vertical === "education"` → Gemini path blocked regardless of setting (FERPA)
- How to undo: remove connection path shown before confirmation

This gate answers the question "what gets scanned" before OAuth. The per-item manifest approval answers "what gets written to Firestore." They are two distinct consent moments addressing different questions — not two redundant screens.

**Classification taxonomy (RE example):**

| File signature | Classification | Route to |
|---------------|---------------|----------|
| Spreadsheet with "unit", "rent", "tenant" columns | `rent_roll` | Property Manager > Tenants |
| PDF with "Lease Agreement", tenant name, start/end dates | `lease` | Property Manager > Leasing |
| PDF/DOCX with "Purchase Agreement", "Buyer", "Seller" | `purchase_agreement` | Title / Brokerage |
| Spreadsheet with LP names, commitment amounts, capital calls | `cap_table` | Investor Relations > Capital |
| Spreadsheet with revenue, expenses, net income | `financial_statement` | Accounting > Reports |
| PDF/DOCX with "Permit", "Inspection", "Certificate of Occupancy" | `permit` | Property Manager > Compliance |
| Spreadsheet with contact name, email, phone | `contact_list` | Contacts |
| PDF with "Insurance", "policy", "coverage" | `insurance_doc` | Control Center / Vault |

**Manifest presentation:** Show top 10 most likely files rather than full Drive dump. Files below classification confidence threshold are shown last, labeled "I'm not sure about this one — skip or review manually."

**Manual fallback (required):** Workers stay in setup mode if Drive connection is skipped or fails. Alex surfaces a single "pick up where you left off" CTA next session. Every worker has a manual data-entry path that does not depend on Drive. Fewer empty states: workers are hidden until first relevant data is approved + pulled, then shown in intelligence mode.

---

## What Alex Needs to Know (Grounding)

When `workspace.vertical` is set, COS injects a vertical context block:

**RE example:**
```
Vertical: Real Estate (CRE)
Known entities: properties (buildings), units, tenants, leases, LPs, GPs, permits,
maintenance tickets, HOA boards, capital calls, escrow, title chains.
Key file types to look for in Drive: rent rolls, lease agreements, cap tables,
financial statements, permit documents, HOA meeting minutes, purchase agreements.
Onboarding priority: rent roll first (tells me the full property + tenant picture in
one file), then leases, then cap table, then financials.
```

This block is dynamically injected when `workspace.vertical === "real-estate"`. Each vertical has its own block. Generic onboarding is not acceptable — a nursing school administrator and a CRE developer need completely different paths.

---

## Sean's Specific Concerns (The Cowloads)

1. **Half-populated workspaces are worse than empty ones.** A workspace with 2 of 5 workers active and 3 in setup mode reads as "broken" to a new user. The activation path must either complete workers fully or not show them until ready. Workers are hidden until first data is approved.

2. **The switching cost calculation.** Every day a user keeps their old system (spreadsheet, property management software, CRM) is a day they're not switching. Alex must demonstrate value within the first session — not after a week of data entry.

3. **Onboarding can't require technical help.** Scott shouldn't need a customer success call to set up his workspace. The path from sign-up to "Alex is running my morning brief" must be completable without any human assistance. (30-minute completion is best-case on a clean Drive; design for 72-hour resumability.)

4. **The Drive scan must feel like magic, not surveillance.** The framing matters: "I found your files" not "I accessed your Drive." Alex presents results, user approves, then it feels like a gift. The pre-scan consent gate must be presented as empowerment, not legal boilerplate.

5. **Vertical-specific onboarding is mandatory.** Ask vertical first, always — before any connection attempt. Alex must detect the vertical from the user's answer and adapt immediately.

6. **Empty Contacts worker is a silent killer.** If Alex can't see Scott's buyer list, LP list, and vendor contacts, every chat answer is generic. Contacts being empty is the #1 reason AI chat feels like ChatGPT instead of a Chief of Staff.

7. **Accounting without transactions is a blank canvas.** P&L, cash flow, and net worth views are all zero until real transactions are seeded. For a real customer this makes the Accounting worker look useless until connected. QuickBooks/Xero connection is a first-class unlock, not an afterthought.

8. **Workers should visibly progress.** The setup checklist items should have a clear "Alex will do this" button alongside the manual option. Users should see the worker percentage fill as Alex pulls data in — not just a static checklist.

---

## Vertical Onboarding Paths

All paths begin with vertical detection. The first action Alex takes in every new workspace is asking vertical — before any connection, any scan, any OAuth.

### Real Estate (CRE — Scott's path)

```
0. Alex asks: "What kind of business are you running?" → Real Estate
1. Alex asks: "Do you use AppFolio, Yardi, or Buildium?" 
   → Yes: connect vertical SaaS first (highest-quality data)
   → No: proceed to Drive
2. User picks a folder in Google Drive (work folder, not all of Drive)
3. Pre-scan consent gate presented + accepted
4. Drive scan runs (heuristic immediate + Gemini async if enabled)
5. Manifest presented — user approves each item individually
6. Property Manager pre-populates: tenants, lease table, MX (empty, shown as "add first ticket")
7. Investor Relations pre-populates: LP table from cap table file
8. Accounting pre-populates: P&L from financial statement
9. Alex asks: "I see properties but no addresses yet — drop in your building addresses 
   and I'll pull ATTOM data for each."
10. ATTOM lookups populate property overview cards with real parcel data
11. Contacts imports buyer list + vendor list from Drive contacts files
12. Workers reach intelligence mode: platform-control-center-pro shows portfolio KPIs
```

### Education (Nursing School — Ruthie's path)

```
0. Alex asks: "What kind of business are you running?" → Education
1. Alex asks: "What program are you running? ADN, BSN, or LPN?"
   Program type sets clinical hour requirements + NCLEX prep track immediately
2. Alex asks: "Does your school use Canvas, Blackboard, or another LMS?"
   → Yes: LTI connector path (SIS data, roster already exists)
   → No: proceed to Drive
3. User picks a folder in Google Drive
4. Pre-scan consent gate (Gemini path hard-blocked for education — FERPA)
5. Student Eval Worker pre-populates: student list, cohort, clinical hours (after manual approval)
6. HR pre-populates: faculty roster from Drive
7. Alex asks: "Want me to check your state board's CE requirements against your faculty records?"
8. Compliance items auto-populate
```

### E-commerce / Shopify (Elise's path)

```
0. Alex asks: "What kind of business are you running?" → Retail
1. Connect Shopify (existing OAuth — already built) — this is the load-bearing unlock
2. Alex pulls: product catalog, order history, customer list, inventory
3. Contacts imports customer email list from Shopify
4. Accounting pre-populates: revenue from order history
5. Alex asks: "I see you sell batteries — do you want me to set up a Digital Product Passport?"
6. DPP worker activates with product data from Shopify
```

---

## Open Questions / Decisions Needed

1. **Vertical-native SaaS connectors — build order.** AppFolio, Yardi, QuickBooks, Canvas LMS — these are the connectors that matter most for paying customers. What's the build priority? Recommend: QuickBooks (horizontal, applies to all verticals), then AppFolio (RE), then Canvas LTI (education).

2. **Consent model for Drive scan.** One gate at OAuth time vs. per-file at manifest time? Decision: blanket consent at folder-selection time (what gets scanned) + per-item approval at manifest time (what gets written to Firestore). Both gates exist; they address different questions.

3. **What if Drive is empty or no relevant files found?** Alex's fallback: "I didn't find anything I could use automatically. Let me ask you a few questions and we'll set this up manually." Every worker has a manual entry path.

4. **Multi-entity onboarding (PREREQUISITE — not deferred).** Scott has two entities (MCG + MPG). A CRE operator with 3 LLCs cannot commingle records. But 3 separate workspaces = $297/mo and 3 separate Alex instances. This must be decided before CRE launch — it is a blocking architectural decision, not a future problem. Options: workspace maps to a person, a company, or a portfolio. Each has different Firestore data model implications. Add as explicit task in CODEX-21 amendment lineage.

5. **Worker visibility during onboarding.** Decision: workers hidden until first relevant data is approved + pulled, then shown in intelligence mode (not setup mode). Empty states are eliminated by not showing the worker until it has something to show.

6. **Gemini MCP vs. Claude-only for Drive classification.** Decision: Gemini as async refinement only, behind `allowThirdPartyAIClassification` toggle, never on the critical path. Heuristic (filename + MIME) serves the immediate manifest.

---

## Technical Build Checklist (Fully Regenerated Against Both Red Teams)

### Prerequisites (block build until complete)

- [ ] **[CRITICAL]** Audit `users/*/integrations/drive` in Firestore for plaintext `accessToken` fields. Rotate and re-encrypt any found. Consolidate to `users/{uid}/integrations/googleDrive` path only.
- [ ] **[HIGH]** Fix `driveImport.js` to write new version records instead of `update({ superseded: true })`. New record format: `{ version: 2, supersedesId: oldDocId }`.

### Backend (index.js additions)

- [ ] `POST /v1/workspace:onboard` — trigger onboarding; uses Firestore transaction to set `onboarding_status: "in_progress"` only if current value is `not_started`. Writes `onboarding_step: "vertical_selection"`. Returns 409 if already in_progress or complete.
- [ ] `POST /v1/drive:authorize` — issue Drive OAuth URL with user-selected `rootFolderId` scope. Requires `rootFolderId` param (no full-Drive scans). Generates `crypto.randomBytes(32)` nonce, stores at `users/{uid}/pendingOAuthNonce` with 5-minute TTL.
- [ ] `GET /v1/drive:callback` — OAuth callback. Validates `state === nonce` from `pendingOAuthNonce` before completing token exchange (CSRF fix RT2-1). Deletes nonce on use. Stores encrypted token at `users/{uid}/integrations/googleDrive`.
- [ ] `POST /v1/drive:scan` — accepts `{ rootFolderId, tenantId }`. Writes `driveScanJobs/{jobId}` record, enqueues Cloud Task, returns `{ jobId }` immediately. Never synchronous (Cloud Run timeout would silently truncate). No Gemini calls on this path.
- [ ] `POST /v1/drive:pull` — accepts approved manifest items. Idempotency key: `importJobs` doc keyed by `pull_${tenantId}_${sha256(sortedFileIds)}`. Returns existing jobId on second call. All writes are new append-only records — no updates to existing docs.
- [ ] Tenant document: add `onboarding_status: "not_started" | "in_progress" | "complete" | "abandoned"`, `onboarding_step: string`, `vertical: string`. Write `not_started` atomically at tenant creation.
- [ ] COS system prompt: inject vertical context block when `workspace.vertical` is set. Block is vertical-specific — no generic content.
- [ ] Gemini classification Cloud Task: gated behind `settings.allowThirdPartyAIClassification` (default: `false`). Education vertical hard-blocked regardless of setting. Runs async after manifest is already shown to user.
- [ ] `vault:purge` capability: tombstone doc + chunks, revoke embeddings, delete Storage object. Required before any `drive:pull` writes go to production — the recall path for misclassified files.

### Frontend

- [ ] New workspace detection: if `onboarding_status === "not_started"`, show onboarding mode in chat (skip generic intake).
- [ ] Vertical selection step: one question, 6 options, sets `workspace.vertical`. This is step 0 — before any OAuth or scanning.
- [ ] Pre-scan consent gate UI: plain-English disclosure of what's scanned, what leaves the platform, Gemini toggle state, FERPA hard-block message for education. One screen, not two.
- [ ] Folder picker UI: before Drive OAuth, prompt user to select a root folder. Pass `rootFolderId` to `drive:authorize`.
- [ ] Drive scan result UI: file manifest list, top 10 by confidence, per-item approve/skip buttons. No "approve all" button. Items below threshold shown at bottom labeled "not sure about this one."
- [ ] Worker visibility: hide workers from sidebar until first data approved + pulled. Show in intelligence mode on first appearance.
- [ ] Worker progress indicator: show % complete as Drive content populates.
- [ ] "Alex will do this" button on each checklist item (alongside manual option).
- [ ] Session resumability: if `onboarding_status === "in_progress"`, Alex opens with "You left off at [onboarding_step] — want to continue?" Do not restart from scratch.
- [ ] Connection status: show which services are connected vs. pending, per-vertical.

### AI Tooling

- [ ] COS tool: `start_drive_scan(rootFolderId, vertical)` → enqueues Cloud Task, returns jobId.
- [ ] COS tool: `check_scan_status(jobId)` → returns manifest when ready or current status.
- [ ] COS tool: `pull_approved_files(manifest_items)` → idempotent, routes approved content to correct Firestore collections via append-only writes.
- [ ] COS tool: `check_onboarding_progress()` → returns current `onboarding_status`, `onboarding_step`, and worker activation summary.
- [ ] COS tool: `set_workspace_vertical(vertical)` → writes to tenant doc, triggers vertical context injection.

---

## Success Metrics

Activation is defined as **first valuable AI output acted on** — not Drive connected, not manifest approved, not `activated: true` in Firestore. Those are inputs, not the outcome.

- **Time-to-first-intelligence:** From sign-up to first worker showing intelligence mode. Target: < 72 hours (not 30 minutes — design for resumability, not speed runs).
- **Activation rate:** % of new workspaces where user acts on an AI recommendation (approves a contact follow-up, views an AI-generated brief, clicks through an alert). Target: > 60% within 7 days.
- **Worker population rate:** % of workers showing intelligence mode (not setup mode) 30 days after sign-up. Target: > 4 of 5 assigned workers.
- **Support-contact rate:** % of new customers who contact support during onboarding. Target: < 10%.
- **Misclassification rate:** % of Drive-pulled documents that are later purged via `vault:purge`. Target: < 2%. Track this from day one.

---

## Revised Design Decisions (Full — Post Both Red Teams)

All original spec decisions reviewed against RT1 and RT2:

| Original | Revised | Source |
|----------|---------|--------|
| >85% confidence → auto-route | All manifest items require explicit per-item user approval. No auto-route at any threshold. | RT1-1, RT2-6 |
| Google Drive is the primary first connector | Ask vertical first. Vertical SaaS (AppFolio, QuickBooks, Shopify) are first-class paths. | RT1-2, RT1-6 |
| New workspace detected from empty collections | Explicit `onboarding_status` field written atomically at tenant creation. Never inferred. | RT1-4, RT2-8 |
| 30-minute time-to-first-intelligence target | Design for 72-hour resumability. 30 minutes is best-case clean-Drive; not a KPI. | RT1-5 |
| Gemini on the critical path for classification | Gemini async only, off critical path, behind per-tenant boolean. Education hard-blocked. | RT1-8, RT2-7 |
| Activation metric = Drive connected + manifest approved | Activation = first valuable AI output acted on. | RT1-10 |
| `drive:scan` scans full Drive | Requires user-selected root folder before scan. `rootFolderId` required param. | RT2-4 |
| `drive:pull` is synchronous | Both `drive:scan` and `drive:pull` are async Cloud Tasks. JobId returned immediately. | RT2-10 |
| No recall path for misclassified files | `vault:purge` capability required before launch. No auto-approved writes to Firestore. | RT2-6 |
| Vertical detected from bundle | Vertical detected by asking the user first, before any scanning. | RT1-6 |
| Trust issue handled by framing | Pre-scan consent gate — explicit disclosure UI before any OAuth is issued. | RT1-3, RT2-7 |
| Multi-entity deferred to later | Multi-entity is a launch-blocking prerequisite for CRE. Decide before CRE onboarding ships. | RT1-9 |
| OAuth state = userId | OAuth state = server-side CSRF nonce (32-byte random, 5-min TTL, validated on callback). | RT2-1 |
| RT2-2 handled by Drive connector build | CRITICAL: audit + rotate possible plaintext token at legacy `integrations/drive` path NOW. | RT2-2 |
| RT2-3 handled by new feature writes | HIGH: fix `driveImport.js` append-only violation before building `drive:pull`. | RT2-3 |
| Drive token stored at one path | Consolidated to `users/{uid}/integrations/googleDrive`. All readers updated. | RT2-2 |
| `workspace:onboard` can be called multiple times | Firestore transaction CAS lock: `onboarding_status: "in_progress"` only if currently `not_started`. | RT2-8 |
| `body.tenantId` accepted as fallback | Onboarding + drive routes require `x-tenant-id` header only. Body fallback removed. | RT2-9 |
| onboarding_status + onboarding_step = same field | Two separate fields: `onboarding_status` (stage) + `onboarding_step` (position within stage). | RT1-4 + RT2-8 reconciled |

---

## Sign-Off Gate (Required Before Ship)

Every item below must be verifiable before this feature goes to any real customer:

**Security (from RT2)**
- [ ] OAuth callback validates `state` against a server-side nonce — verified by attempting a callback with a crafted `state` value and confirming it is rejected (RT2-1)
- [ ] `drive:scan` refuses to execute without a valid `rootFolderId` — no full-Drive scans possible (RT2-4)
- [ ] `drive:pull` returns existing jobId on a duplicate submit with the same file set (RT2-5)
- [ ] Education vertical tenants cannot enable `allowThirdPartyAIClassification` — hard-coded block confirmed regardless of setting (RT2-7)
- [ ] `onboarding:start` endpoint requires `x-tenant-id` header only — `body.tenantId` fallback rejected (RT2-9)
- [ ] `users/*/integrations/drive` plaintext token audit completed; no unencrypted `accessToken` fields in production (RT2-2 prerequisite)
- [ ] `driveImport.js` fix confirmed — no `update({ superseded: true })` calls remain in production (RT2-3 prerequisite)

**Data integrity**
- [ ] Zero manifest items reach Firestore without an explicit per-item user approval click — verified by intercepting network calls during a test import (RT2-6, RT1-1)
- [ ] `vault:purge` successfully tombstones a record and revokes its embeddings
- [ ] `onboarding_status` is written atomically at tenant creation; a second call to `workspace:onboard` from `in_progress` returns 409; from `abandoned` transitions to `in_progress` (RT1-4, RT2-8)

**Flow ordering**
- [ ] No Drive OAuth URL is issued before `workspace.vertical` is set — confirmed by intercepting the authorize call and verifying the vertical write precedes it (RT1-6)
- [ ] Pre-scan consent gate renders before any OAuth redirect fires — confirmed by staging test with network inspection (RT1-3, RT2-7)
- [ ] Session resumption: if `onboarding_status === "in_progress"`, Alex opens with "You left off at [step] — want to continue?" and does NOT restart from vertical selection (RT1-5)

**Taxonomy**
- [ ] `workspace.vertical` only accepts canonical values: `real-estate | aviation | education | healthcare | finance | unassigned` — write of any other value is rejected at the transaction layer (CODEX-22 Amendment A Fix 5)

---

## Forward References

- Alex vertical grounding (RAAS rules for RE chat): CODEX 25 + existing RE RAAS rules in `raas/real-estate/`
- Drive connector security + token consolidation: prerequisite work, not owned by this CODEX
- Gemini MCP evaluation: CODEX 4 (MCP audit)
- Worker population from Drive content: ties to CODEX 27 (picture-first input — same pipeline for documents)
- Shopify onboarding: already partially built (CODEX 17)
- Multi-entity architecture decision: must be added to CODEX 21 amendment lineage before CRE onboarding ships
- `vault:purge` capability: must be added to `contracts/capabilities.json` and built before this feature ships
