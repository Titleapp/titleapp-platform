# TitleApp KYC & Trust Verification SOP v1.1

## 1. Purpose

This SOP defines when identity verification (KYC) is required across the TitleApp platform, including:
- civilian (personal vault) usage,
- tenant (business) usage,
- and on-platform token creation for governance, utility, or other purposes.

The objective is to enable low-friction use while ensuring trust, auditability, and defensibility for actions that create value, authority, or systemic impact.

---

## 2. Core Principles

1. KYC is capability-based, not feature-based.
2. One verified identity is reused across personal and tenant contexts.
3. KYC expires after 12 months and must be refreshed.
4. Least privilege by default.

---

## 3. KYC Levels

### KYC-0 — Unverified User
Email verified only.

Allowed:
- Browse platform
- Create drafts
- Store non-authoritative records
- View wallet features (read-only)

Blocked:
- Minting DTCs of value
- Identity or credential issuance
- Token creation
- Automation
- Financial or governance actions

---

### KYC-1 — Individual Identity Verified

Allowed:
- Mint Digital Title Certificates (DTCs) for assets of value
- Mint DTCs representing identity or credentials
- Create authoritative logbook entries
- Create and deploy personal or tenant-scoped tokens
- Participate in governance or voting systems

Blocked:
- Tenant-wide automation
- Billing and payments
- AI worker deployment

---

### KYC-2 — Business / Operational Authority Verified

Allowed:
- All KYC-1 permissions
- Create and manage tenant-level tokens
- Update and approve Rules & Resources
- Enable AI workers and automation
- Configure lead maturation
- Manage billing and payments
- Approve contracts, offers, escrows, and signatures

---

## 4. Civilian (Personal Vault) KYC Requirements

KYC-1 is required when a user attempts to:
- Mint a DTC for an asset of value
- Mint a DTC representing identity or credentials
- Create, deploy, or issue any token (including memecoins or governance tokens)
- Share or transfer authoritative records or tokens

KYC is not required for drafting or private storage.

---

## 5. Tenant (Business) KYC Requirements

KYC-2 is required for any user who can:
- Act as primary admin
- Create or manage tenant-level tokens
- Update or approve SOPs or contracts
- Enable AI workers or automation
- Configure billing or payments
- Approve offers, escrows, or signatures

View-only or draft-only roles do not require KYC unless privileges escalate.

---

## 6. KYC Trigger Model

KYC is triggered by intent, not sign-up.

Examples:
- Mint DTC → KYC-1
- Create token → KYC-1
- Approve contract → KYC-2
- Enable automation → KYC-2

---

## 7. Expiration & Reverification

- KYC expires after 12 months
- Expired users retain read-only access
- Reverification restores prior permissions

---

## 8. Audit & Logging

All KYC events must log:
- user_id
- tenant_id (if applicable)
- KYC level
- verification provider
- timestamp
- expiration date

---

## 9. Governing Scope

This SOP governs:
- Client Onboarding
- Endpoint Permissions
- AI Worker Creation
- Token & Wallet Operations
- Billing & Escrow
- Lead Automation

No endpoint may bypass this SOP.

---

## 10. Summary

KYC is required when:
- value is created,
- authority is asserted,
- automation is enabled,
- or governance is exercised.

This SOP defines who is trusted to act on the TitleApp platform.
