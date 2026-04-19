CODEX 49.1 — Execution Guide
How T1 activates The Spine — phase by phase

READ THIS FIRST — T1
This document is your execution guide for CODEX 49.1 — The Spine.

The main CODEX 49.1 document contains all decisions, schemas, and specifications.
This guide gives you the exact commands and file changes for each phase.

THE ONE RULE: Complete each phase smoke test and report back to the Claude.ai chat.
Wait for Sean to confirm before starting the next phase.
Never skip a smoke test. Never start a new phase with uncommitted changes.

First Time Setup — Run Once
// Step 1 — Confirm you are in the right repo and state is clean
cd ~/titleapp-platform
git status
git log --oneline -3

// Step 2 — Pull latest main
git checkout main
git pull origin main

// Step 3 — Tag current state as pre-Spine baseline
git tag spine-baseline
git push origin --tags

// Step 4 — Create your working branch
git checkout -b sean/spine-0418

// Step 5 — Confirm you are on the branch
git branch
// Expected: * sean/spine-0418

Phase A1 — Schema Decisions (documentation only, no code)
What you are doing: Adding four entity schemas to documentation files.
What you are NOT doing: Touching any .js or .jsx file. Zero code changes in this phase.

A1 Step 1 — Append schemas to FIRESTORE_DATA_CONTRACT.md
Open docs/platform/FIRESTORE_DATA_CONTRACT.md and APPEND these four sections to the bottom. Do not modify existing content.

// APPEND to end of docs/platform/FIRESTORE_DATA_CONTRACT.md

## workspaces/{workspaceId}/contacts/{contactId}
Purpose: Cross-vertical contact records. One record per person/org.
Fields:
  id: string (system generated)
  identity_id: string (optional - link to verified KYC record)
  name: string (required)
  type: enum - customer|vendor|investor|tenant|employee|
               patient|student|contractor|personal
  workspaces: array (which workspaces this contact belongs to)
  added_by: string (userId)
  notes: string (free text, Alex populates from conversation)
  created_at: timestamp
RAAS: Contact with identity_id = verified = unlocks KYC-1 capabilities.
      Unverified contacts cannot sign documents or receive payments.

## workspaces/{workspaceId}/transactions/{transactionId}
Purpose: Financial transactions per workspace ledger.
Fields:
  id: string (system generated)
  workspace: string (required - workspace ledger owner)
  amount: number (required, always positive)
  direction: enum - income|expense|transfer
  category: string (Alex assigns, user can override, plain English)
  description: string
  date: timestamp (required)
  contact_id: string (optional)
  asset_id: string (optional)
  document_id: string (optional)
  source: enum - manual|stripe|gdrive_import|bank_statement
  status: enum - pending|cleared|reconciled
  debit_account: string (system generated, GAAP, user never sees)
  credit_account: string (system generated, GAAP, user never sees)
  gaap_category: enum - asset|liability|equity|revenue|expense
  created_at: timestamp
RAAS: All financial output includes disclaimer (Tier 0 enforced).
      Alex never gives tax advice.

## workspaces/{workspaceId}/assets/{assetId}
Purpose: Business assets - things you own with value and obligations.
Note: Different from dtcs/ (blockchain) and users/{uid}/assets/ (images).
Fields:
  id: string (system generated)
  name: string (required, free text)
  type: enum - vehicle|property|aircraft|equipment|
               intellectual_property|other
  owner_workspace: string (required)
  current_value: number (optional)
  purchase_date: timestamp (optional)
  purchase_price: number (optional)
  linked_documents: array of document IDs
  linked_transactions: array of transaction IDs
  linked_contacts: array of contact IDs
  dtc_id: string (optional - link to DTC blockchain record)
  logbook_id: string (optional - link to logbook)
  audit_trail_default: enum - on_chain|firebase
  notes: string
  created_at: timestamp
RAAS: on_chain entries immutable (Tier 0).
      audit_trail_default is Tier 2 (operator sets).
      User overrides per entry within Tier 3.

## workspaces/{workspaceId}/employees/{employeeId}
Purpose: HR records. Links to Contact. Compliance-focused not payroll.
Fields:
  id: string (system generated)
  contact_id: string (required - links to Contact record)
  workspace: string (required)
  role: string (free text)
  employment_type: enum - full_time|part_time|contractor|volunteer
  start_date: timestamp (required)
  end_date: timestamp (optional)
  status: enum - active|onboarding|offboarding|inactive
  compensation: object - {amount, frequency, currency}
  documents: array of document IDs
  schedule: object - {days, hours_per_day, timezone}
  compliance_flags: array (Alex populates)
  created_at: timestamp
RAAS: compensation field requires KYC-1 to read or write.
      PII protected at Tier 0 - never logged or exposed.
      Alex reminds about missing docs and expiring agreements.
      Alex does NOT run payroll.

A1 Step 2 — Add capabilities to capabilities.json
Open contracts/capabilities.json. Add the following entries. Add-only rule — do NOT modify any existing entries.

// ADD these entries to contracts/capabilities.json
// Follow the exact format of existing entries
// Do NOT modify any existing _v1 entries

contacts.create_contact_v1:
  class: contacts
  required_kyc: KYC-0
  caller_types: human, chat, worker
  emitsEvent: true
  writesAudit: true

contacts.update_contact_v1:
  class: contacts
  required_kyc: KYC-0
  caller_types: human, chat, worker
  emitsEvent: true
  writesAudit: true

contacts.delete_contact_v1:
  class: contacts
  required_kyc: KYC-1
  caller_types: human
  emitsEvent: true
  writesAudit: true

contacts.link_identity_v1:
  class: contacts
  required_kyc: KYC-1
  caller_types: human
  emitsEvent: true
  writesAudit: true

transactions.create_transaction_v1:
  class: transactions
  required_kyc: KYC-0
  caller_types: human, chat, worker
  emitsEvent: true
  writesAudit: true

transactions.import_statement_v1:
  class: transactions
  required_kyc: KYC-0
  caller_types: human, chat
  emitsEvent: true
  writesAudit: true

assets.create_asset_v1:
  class: assets
  required_kyc: KYC-0
  caller_types: human, chat, worker
  emitsEvent: true
  writesAudit: true

assets.link_dtc_v1:
  class: assets
  required_kyc: KYC-1
  caller_types: human
  emitsEvent: true
  writesAudit: true

employees.create_employee_v1:
  class: employees
  required_kyc: KYC-1
  caller_types: human, chat
  emitsEvent: true
  writesAudit: true

employees.update_employee_v1:
  class: employees
  required_kyc: KYC-1
  caller_types: human, chat
  emitsEvent: true
  writesAudit: true

A1 Step 3 — Add W-041 HR worker spec
Open docs/platform/catalog/Part2D-Phase5-7-Horizontal-New-Workers.md and ADD the W-041 spec between W-040 and W-042.

// ADD between W-040 and W-042 in the catalog file

---
id: W-041
name: HR and People Worker
slug: hr-people
type: horizontal
phase: horizontal
pricing: 29/mo
status: planned
description: Employee onboarding, scheduling, compliance reminders,
  and contractor management. Applies to all verticals.
  Alex reminds you what needs attention. Does not run payroll.
raas:
  tier_0: inherited from Part1-Universal-RAAS-Scaffold
  tier_1:
    - FLSA wage and hour rules
    - FMLA eligibility rules
    - ADA accommodation rules
    - I-9 employment eligibility verification
    - W-4 withholding form requirements
  tier_2:
    - Operator HR policies and employee handbook
    - Company-specific onboarding checklist
    - PTO and leave policies
  tier_3:
    - Employee personal schedule preferences
    - Communication preferences
canvas_sections:
  - employees
  - schedule
  - compliance
  - documents
---

A1 Step 4 — Commit
git add docs/platform/FIRESTORE_DATA_CONTRACT.md
git add contracts/capabilities.json
git add docs/platform/catalog/Part2D-Phase5-7-Horizontal-New-Workers.md
git commit -m "49.1-A1 Spine schema decisions Contact Transaction Asset Employee HR"
git push origin sean/spine-0418

A1 Smoke Test — Run These, Paste Results to Claude.ai
// Check FIRESTORE_DATA_CONTRACT.md has all 4 new sections
grep -c 'contacts\|transactions\|employees' docs/platform/FIRESTORE_DATA_CONTRACT.md

// Check W-041 exists
grep 'W-041' docs/platform/catalog/Part2D-Phase5-7-Horizontal-New-Workers.md

// CRITICAL: Confirm no .js or .jsx files were changed
git diff --name-only HEAD~1
// Must show ONLY .md and .json files. If any .js or .jsx appears, STOP.

AFTER A1 SMOKE TEST
Paste the smoke test output into the Claude.ai chat.
Sean will confirm before Phase A2 starts.
Do not proceed to Phase A2 on your own.
Phase A2 instructions will be provided by the Claude.ai chat after confirmation.

Phases A2 through E
Instructions for Phases A2 through E are in CODEX 49.1 — The Spine (the main document).
After each phase the Claude.ai chat will provide execution instructions for the next phase in the same format as this document.

The pattern for every phase:
Read the phase section in CODEX 49.1
Cut rollback tag: git tag spine-[phase]-pre and push
Execute the changes per the CODEX
Run the smoke test
Commit and push
Report smoke test results to Claude.ai chat
Wait for confirmation

THE ONE RULE
Never start the next phase until the current phase smoke test passes
and Sean confirms in the Claude.ai chat.

This is not bureaucracy.
This is how we avoid spending a full day unwinding production crashes.