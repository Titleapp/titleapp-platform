# KYC_SOP.md (v1.0)

## 1. Purpose
KYC exists to protect:
- users and tenants from impersonation and fraud
- TitleApp from abuse of high-trust actions (payments, token creation, worker deployment, billing changes)
- downstream counterparties (customers receiving contracts, offers, escrow actions)

KYC is not a product feature. It is a platform safety and authorization gate.

## 2. Definitions
**Civilian context**
- an individual using the consumer vault (DTCs, logbooks, escrows, wallets)

**Tenant context**
- an organization account (auto dealer, brokerage, law firm, aviation operator, etc.)

**KYC Levels**
- KYC-0: no identity verification (email/phone verification only)
- KYC-1: standard identity verification (annual refresh)
- KYC-2: elevated verification for high-trust actions (annual refresh + stricter role gating)

**Refresh**
- KYC expires after 12 months and must be re-verified.
- If a user has a valid KYC result on file, they do not repeat KYC for new actions unless:
  - verification expired, or
  - policy version changed materially, or
  - risk escalation is triggered (fraud signals)

## 3. Platform Rule: Soft Gate Default
TitleApp uses a soft-gate model:
- Users may draft, preview, and plan without KYC where possible.
- Execution, deployment, and financial actions are blocked until KYC requirements are met.

No endpoint may weaken this policy without explicitly updating:
- PERMISSION_MATRIX.md
- contracts/capabilities.json
- this KYC_SOP.md

## 4. When KYC is Required

### 4.1 Civilian Context (Consumer Vault)
KYC-1 is required when a civilian attempts to do any of the following:
1) Create a DTC for an asset above a configured value threshold
2) Create a DTC representing identity or credentials (examples: pilot certificate, student ID, realtor license)
3) Create or initiate an escrow locker / multi-party escrow workflow
4) Initiate transfer of a DTC that is configured as “high-value” or “identity”
5) Create a token (including memecoins) or publish token metadata in the wallet section

Notes:
- Drafting a DTC is allowed without KYC; minting/publishing is not.
- Token creation always requires KYC (see 4.3).

### 4.2 Tenant Context (Business Platform)
KYC-2 is required for:
- the primary tenant owner/admin (first admin)
- any user who can perform operational control actions, including:
  - editing or uploading authoritative documents used in workflows
  - changing billing/payment settings
  - enabling automation modes
  - deploying AI workers to production
  - creating tokens or tenant-issued voting coins
  - modifying permission roles

KYC-1 may be sufficient for standard staff roles that do not control high-trust actions.

### 4.3 Token Creation (All Contexts)
Token creation always requires KYC:
- Civilian token creation: KYC-1 minimum
- Tenant token creation: KYC-2 + owner_admin role

Token creation includes:
- creating a new token contract/asset
- configuring supply/metadata
- publishing token to wallet UI
- enabling governance/voting token use cases (HOA, law, clubs)

Rationale:
Tokens can be used for scams and impersonation; TitleApp must treat this as high-risk.

## 5. KYC-Triggered Actions (Hard List)
The following actions are always KYC-gated (minimum KYC level defined in contracts/capabilities.json):
- “Send” to external parties (email/SMS/document delivery) when content is contractual or binding
- “Execute” any payment or billing change
- “Deploy” workers or enable automation modes
- “Enable Automation” that can change state without human approval
- “Billing” changes, payment method updates, invoices
- Token creation / token publishing
- Any action that grants permissions, changes roles, or modifies tenant-level configuration

## 6. Enforcement Requirements
All KYC gating must be enforced server-side:
- UI/chat must not implement KYC logic as the source of truth.
- Endpoints must check:
  - requiredKyc
  - tenantContext
  - requiredRoles
  - callerType
  - policy version acceptance (if required)

If a call fails KYC:
- return a structured “KYC_REQUIRED” response
- include required level
- include the action being attempted
- include a safe redirect (“start KYC flow” endpoint)

## 7. Audit Requirements
Every KYC event must write:
- userId
- tenantId (if applicable)
- kycLevel achieved
- verification timestamp
- expiry timestamp
- provider reference (tokenized / not raw PII)
- policy version accepted

Every blocked action must log:
- attempted endpointId
- requiredKyc
- userKycLevel
- denial reason
- timestamp

## 8. KYC Provider and Data Handling
- TitleApp must not store raw identity documents.
- Store only provider tokens/receipts + minimal metadata needed for authorization and audit.
- KYC results are immutable records; updates create a new record with a new timestamp.

## 9. Change Control
Changes to KYC rules require:
- version bump in this document
- corresponding update in PERMISSION_MATRIX.md
- corresponding update in contracts/capabilities.json

No silent changes.
