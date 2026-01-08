# TitleApp Capability Contracts

This directory is the canonical registry of all executable capabilities in the TitleApp platform.

If a capability is not declared here, it does not exist.

---

## 1. What Is a Capability?

A capability is a versioned, auditable, permission-gated action that may be invoked by:

- a human user
- a chat interface
- an AI Worker
- a system process

Capabilities are implemented as backend endpoints (e.g., Cloud Functions / services).

UI, chat, and workers may only call declared capabilities.

---

## 2. Source of Truth

The file `capabilities.json` is the **single source of truth** for:

- what actions exist
- who may call them
- under what context
- with what KYC level
- with which roles
- with what audit requirements

No endpoint may be implemented unless it is declared in `capabilities.json`.

---

## 3. Required Fields Per Capability

Every capability entry MUST declare:

- `id` — globally unique, versioned
- `class` — functional domain (identity, kyc, workers, documents, billing, etc.)
- `summary` — human-readable description
- `contexts` — allowed tenant contexts (`civilian`, `tenant`)
- `allowedCallers` — (`human`, `chat`, `worker`, `system`)
- `requiredKyc` — minimum KYC level
- `requiredRoles` — roles allowed to invoke
- `emitsEvent` — true/false
- `writesAudit` — true/false

Missing fields are invalid.

---

## 4. Versioning Rules (LEGO Model)

Capabilities are immutable once deployed.

Changes require:

- a new capability ID
- a version suffix increment (`_v1`, `_v2`, etc.)
- explicit deprecation (if applicable)

Example:
documents.generate_contract_v1
documents.generate_contract_v2

yaml
Copy code

Existing versions may not be silently modified.

---

## 5. Change Process (Required)

To add or modify a capability:

1. Update `capabilities.json`
2. Update any affected SOPs or permission docs
3. Commit documentation first
4. Implement backend endpoint
5. Deploy
6. Verify audit + event emission

Skipping steps is a violation of platform rules.

---

## 6. Forbidden Patterns

The following are explicitly disallowed:

- UI-only features
- chat-only logic
- undeclared endpoints
- bypassing permission or KYC checks
- reusing an existing capability ID for new behavior

Violations are considered defects.

---

## 7. Why This Exists

This system exists to ensure:

- trust
- auditability
- regulatory safety
- AI alignment
- long-term maintainability

The platform grows by **addition**, not mutation.
