# TitleApp Permission Matrix v1.0

## 0. Purpose

This document defines which roles and KYC levels may call which endpoint classes across:
- Civilian (personal vault) usage
- Tenant (business) usage
- Vertical overlays (real_estate, auto_dealer, etc.)

This matrix is enforceable. Endpoint implementations must validate:
- caller type (human / chat / worker / system)
- tenant context (civilian vs tenant)
- required role
- required KYC level
- audit + event emission

Any endpoint not covered here must be added before implementation.

---

## 1. Definitions

### 1.1 Caller Types
- human: direct UI action initiated by a logged-in user
- chat: action requested via GPT/chat surface
- worker: background automation (AI worker / scheduled job)
- system: internal platform automation (billing, webhooks, provisioning)

### 1.2 Tenant Context
- civilian: personal vault usage (no tenantId required)
- tenant: business tenant usage (tenantId required)

### 1.3 KYC Levels
- KYC-0: unverified (email only)
- KYC-1: individual verified
- KYC-2: operational authority verified (admin-level)

### 1.4 Roles (Tenant Context)
- owner_admin: tenant owner / primary admin
- admin_ops: operational admin (billing, docs, worker deployment)
- agent_sales: sales agent / broker / rep
- staff_standard: internal staff with limited permissions
- auditor_readonly: read-only access to records and audit

Civilian context does not use tenant roles.

---

## 2. Permission Model (Hard Rules)

1. Chat and Web UI must have identical permissions.
   - If human can do it, chat can request it (subject to same KYC/role).
2. Draft creation is broadly allowed; execution is gated.
3. Any operation that creates value, authority, automation, billing, or governance requires KYC.
4. Tenant-wide configuration and document governance requires KYC-2 and admin role.
5. Any endpoint that changes state must write an audit record and emit an event.

---

## 3. Endpoint Classes (Registry Categories)

- identity: login, session, profile
- tenant: tenant creation, membership, roles
- vertical: install/enable vertical packages
- leads: lead capture, lead state, assignment, summaries
- docs: upload/list/version/approve documents, Rules & Resources library
- drafts: generate drafts, revise drafts, populate templates
- approvals: explicit approvals for sending/executing
- comms: outbound messages (email/SMS), marketing sync
- scheduling: showing/appointment scheduling
- dtc: create/mint/transfer DTCs, logbooks
- token: create/deploy tokens, governance actions
- kyc: verification, refresh, status
- billing: invoices, payment methods, metering
- workers: create/test/deploy workers, automation enablement
- audit: query audit logs, export
- events: write/read event bus entries (internal)

---

## 4. Matrix — Civilian (Personal Vault)

| Endpoint Class | Example Actions | Allowed Caller Types | Required KYC | Notes |
|---|---|---|---|---|
| identity | register/login/update profile | human, chat | KYC-0 | profile edits allowed |
| docs | upload personal docs | human, chat | KYC-0 | non-authoritative storage ok |
| drafts | generate drafts (non-binding) | human, chat | KYC-0 | must label Draft |
| dtc | mint DTC for asset of value | human, chat | KYC-1 | KYC required when value/authority |
| dtc | mint identity/credential DTC | human, chat | KYC-1 | e.g., pilot cert, realtor license |
| token | create/deploy any token | human, chat | KYC-1 | includes memecoins/governance |
| approvals | approve sending/execution | human, chat | KYC-1 | explicit acceptance required |
| comms | send transactional comms | human, chat | KYC-1 | only after explicit approval |
| audit | view own audit log | human, chat | KYC-0 | user can view own records |
| billing | pay for KYC/ID check | human, chat | KYC-0 | payment allowed pre-KYC |

---

## 5. Matrix — Tenant (Business)

### 5.1 Tenant Setup & Governance

| Endpoint Class | Example Actions | Allowed Caller Types | Required KYC | Required Roles |
|---|---|---|---|---|
| tenant | create tenant | human, chat | KYC-1 | (none) |
| tenant | invite staff / set roles | human, chat | KYC-2 | owner_admin, admin_ops |
| docs | upload/replace contracts, SOPs, RRL docs | human, chat | KYC-2 | owner_admin, admin_ops |
| vertical | install/enable vertical package | human, chat | KYC-2 | owner_admin, admin_ops |
| workers | enable automation / deploy workers | human, chat | KYC-2 | owner_admin, admin_ops |
| billing | manage billing/payment methods | human, chat | KYC-2 | owner_admin, admin_ops |
| audit | export tenant audit logs | human, chat | KYC-2 | owner_admin, admin_ops, auditor_readonly |

### 5.2 Leads, Sales, and Operational Workflows

| Endpoint Class | Example Actions | Allowed Caller Types | Required KYC | Required Roles |
|---|---|---|---|---|
| leads | capture lead / create lead | human, chat | KYC-0 | agent_sales, staff_standard |
| leads | update lead state | human, chat | KYC-0 | agent_sales, staff_standard |
| leads | assign sales owner | human, chat | KYC-1 | admin_ops, agent_sales |
| leads | generate daily lead digest | worker, system | KYC-0 | (system-controlled) |
| scheduling | schedule showings/appointments | human, chat | KYC-0 | agent_sales, staff_standard |
| drafts | generate offer/contract drafts | human, chat | KYC-0 | agent_sales |
| approvals | approve sending offers/contracts | human, chat | KYC-2 | agent_sales, owner_admin |
| comms | send offers/contracts to client | human, chat | KYC-2 | agent_sales, owner_admin |
| comms | sync outbound marketing system | system, worker | KYC-2 | admin_ops |

### 5.3 DTC, Tokens, and On-Chain Actions (Tenant)

| Endpoint Class | Example Actions | Allowed Caller Types | Required KYC | Required Roles |
|---|---|---|---|---|
| dtc | create DTC record (pending mint) | human, chat | KYC-1 | agent_sales, admin_ops |
| dtc | mint on-chain (Venly) | worker, system | KYC-1 | (system-controlled) |
| token | create/deploy tenant token | human, chat | KYC-2 | owner_admin |
| token | governance/voting actions | human, chat | KYC-1 | staff_standard, agent_sales (if granted) |

---

## 6. Hard Gates (Non-Negotiable)

1. Any doc that will be used as a contract must be either:
   - uploaded by client, or
   - generated as a draft AND explicitly approved by an authorized human.
2. “Send”, “Execute”, “Deploy”, “Enable Automation”, “Billing” are always KYC-gated.
3. Token creation always requires KYC.
4. AI Workers never bypass approvals:
   - worker may draft and recommend
   - human must approve execution
5. All state transitions must log:
   - who requested
   - who approved (if applicable)
   - what changed
   - timestamp
   - tenantId/userId

---

## 7. Change Control

Updates to this permission matrix require:
- version bump
- changelog entry
- corresponding updates to contracts/capabilities.json

No endpoint may be implemented without an entry in:
- this matrix, and
- the capabilities registry
