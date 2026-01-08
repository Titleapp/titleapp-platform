# TitleApp Client Onboarding SOP v1.0

## 1. Purpose
Define the canonical onboarding flow for all TitleApp clients (civilian and tenant),
ensuring identity verification, permission assignment, billing setup, and system activation
are consistent, auditable, and endpoint-driven.

This SOP governs onboarding behavior only.
No UI or GPT may bypass or re-implement this logic.

---

## 2. Onboarding Contexts

### A. Civilian (Vault User)
- Individual user
- May create DTCs, logbooks, escrows
- Optional upgrade to tenant later

### B. Tenant (Organization)
- Business or institution
- Has roles, billing authority, AI Workers, and operational permissions

---

## 3. Required Preconditions

| Requirement | Source |
|------------|-------|
| Identity verification | KYC_SOP.md |
| Permissions | PERMISSION_MATRIX.md |
| Executable actions | contracts/capabilities.json |

No onboarding step may proceed unless its preconditions are satisfied.

---

## 4. Canonical Onboarding States

### State 0 — Lead / Unverified
- No KYC token
- Read-only access
- Allowed: discovery, demos, estimates

### State 1 — Identity Verified
- Valid `kyc_token` present
- Token age < 12 months
- Stored in Record of Truth

### State 2 — Account Initialized
- User account created
- Tenant created if applicable
- Default roles assigned

### State 3 — Billing Authorized
- Stripe customer created
- Payment method attached
- Subscription or commission model selected

### State 4 — Platform Activated
- Features unlocked per plan
- Workers may be configured (not deployed)
- Data ingestion allowed

### State 5 — Operational
- Workers deployed (if applicable)
- Endpoints executable per permission matrix
- Ongoing audit + monitoring enabled

---

## 5. Role Assignment Rules

### Civilian
- Default role: `user_standard`
- Elevated permissions require KYC-1 or higher

### Tenant
- First verified user becomes `owner_admin`
- Additional users require:
  - explicit invite
  - individual KYC if operational

---

## 6. GPT + UI Rules
- Chat and Web UI are equal clients
- GPT may:
  - explain steps
  - collect consent
  - trigger endpoints
- GPT may NOT:
  - skip steps
  - assign roles directly
  - activate billing without KYC

---

## 7. Audit & Logging
Every onboarding transition must log:
- userId
- tenantId (if any)
- previousState → newState
- triggering endpoint
- timestamp

Logs are immutable.

---

## 8. Change Control
- Changes require version bump
- Must remain consistent with:
  - KYC_SOP.md
  - PERMISSION_MATRIX.md
  - capabilities.json

---

## 9. Status
**Binding**
Violations are considered defects.
