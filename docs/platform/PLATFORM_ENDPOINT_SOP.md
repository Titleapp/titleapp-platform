# PLATFORM ENDPOINT SOP (v1.0)
Status: Enforceable
Applies to: All endpoints, all verticals, all clients (Chat + Web UI), all workers

This document defines the required behavior for any endpoint implemented in the TitleApp platform.
If an endpoint implementation violates this SOP, it is considered a bug.

---

## 1. Core Rules (Non-Negotiable)

1. No endpoint may be implemented unless it is declared in `/contracts/capabilities.json`.
2. Chat and Web UI are equal clients. No chat-only or UI-only capabilities.
3. Every endpoint must enforce:
   - tenant context rules (civilian vs tenant)
   - role rules
   - KYC rules
   - allowed caller types (human/chat/worker/system)
4. Every mutating endpoint must:
   - write an immutable audit record
   - emit an event into the event bus
5. The LEGO rule: add new endpoints; do not silently repurpose existing endpoints.

---

## 2. Endpoint Interface Standard

All endpoints must accept:
- `requestId` (string, required, idempotency key)
- `actor` (object, required)
- `context` (object, required)
- `payload` (object, required)

### 2.1 Actor Object (required)
- `userId`
- `tenantId` (nullable for civilian)
- `roles` (array)
- `callerType` (human|chat|worker|system)
- `kycLevel` (KYC-0|KYC-1|KYC-2)
- `kycExpiresAt` (timestamp or null)

### 2.2 Context Object (required)
- `tenantContext` (civilian|tenant)
- `verticalId` (optional)
- `sessionId` (optional)
- `ip` (optional)
- `userAgent` (optional)

### 2.3 Payload Object
Payload is endpoint-specific but must be validated and typed.

---

## 3. Authorization + KYC Enforcement

Every endpoint must perform checks in this order:

1. Confirm endpoint ID exists in capabilities registry.
2. Confirm tenant context is allowed.
3. Confirm callerType is allowed.
4. Confirm KYC requirement is met:
   - If requiredKyc > actor.kycLevel → deny
   - If KYC is expired → deny (unless endpoint is kyc.verify_identity_v1)
5. Confirm role requirement is met (if requiredRoles not empty):
   - actor.roles must intersect requiredRoles
6. Confirm tenant membership for tenant context endpoints:
   - user must be in `/tenants/{tenantId}/staff/{userId}` (or equivalent)
7. Confirm any object-level access rules (resource ownership, lead assignment, etc.)

Failure must return a structured 403 error.

---

## 4. Input Validation

All endpoints must:
- Treat all input as untrusted
- Validate required fields and types
- Reject unknown fields in payload (strict mode recommended)
- Normalize known string fields (trim, lower-case for emails, etc.)
- Enforce size limits on text and files
- Prevent injection into prompts or templates (escape or strip as appropriate)

Failure must return a structured 400 error.

---

## 5. Idempotency and Replay Safety

All mutating endpoints must be idempotent.

Required behavior:
- `requestId` must be stored and checked before mutation.
- If the same requestId is seen again, return the original result without duplicating side effects.
- If a downstream system (Stripe, Venly, email) is called, its external id must be stored for replay safety.

---

## 6. Audit Record (Immutable)

Every mutating endpoint must write exactly one audit record to:

`/events/audit/{auditId}` (or equivalent immutable collection)

Minimum required fields:
- `auditId`
- `requestId`
- `endpointId`
- `timestamp`
- `actor.userId`
- `actor.tenantId`
- `actor.roles`
- `actor.callerType`
- `actor.kycLevel`
- `tenantContext`
- `verticalId` (if any)
- `resourceRefs` (array of {type,id})
- `diffSummary` (string)
- `status` (success|denied|error)
- `errorCode` (nullable)
- `errorMessage` (nullable)

Audit records must never be edited after creation.

---

## 7. Event Emission (Event Bus)

Every mutating endpoint must emit an event to:

`/events/{eventId}`

Required fields:
- `eventId`
- `requestId`
- `endpointId`
- `timestamp`
- `actor.userId`
- `actor.tenantId`
- `tenantContext`
- `type` (e.g., "LEAD_STATE_UPDATED")
- `payloadRef` (pointer to relevant resource)
- `workerHints` (optional routing hints)

Events are append-only.

Workers must react to events rather than directly calling other workers.

---

## 8. Error Semantics (Standardized)

Endpoints must return structured errors:

### 400 Bad Request
- validation failure
- missing required field
- invalid type

### 401 Unauthorized
- not logged in / invalid token

### 403 Forbidden
- role/KYC/callerType/context violation
- resource access denied

### 404 Not Found
- resource id does not exist

### 409 Conflict
- state machine violation (invalid transition)
- concurrency conflict

### 429 Too Many Requests
- rate limit exceeded

### 500 Internal Error
- unexpected exception

All errors must include:
- `requestId`
- `endpointId`
- `errorCode`
- `message`

---

## 9. Versioning + Change Control

- Endpoint IDs are immutable.
- Breaking changes require a new version suffix (`_v2`) and a new entry in capabilities registry.
- Changes to permissions/KYC/roles require updates to:
  - Permission matrix
  - Capabilities registry
  - Changelog entry (in this file or CHANGELOG.md)

---

## 10. Chat + Web Parity Requirements

If Chat can do it, Web UI must be able to do it (via same endpoint).
If Web UI can do it, Chat can do it (subject to permission gating).
All UI-specific conveniences must be implemented as client behavior, not server-side divergence.

---

## 11. Worker Rules (AI Worker Calls)

Workers are treated as a callerType and must obey:
- capabilities registry
- permission matrix
- endpoint SOP

Workers may:
- read data
- draft content
- propose actions
- call endpoints when allowed

Workers may not:
- bypass approvals
- bypass KYC
- change permissions
- execute payments or signatures unless explicitly allowed and declared

---

## 12. Minimum Observability

All endpoints must log (server-side):
- requestId
- endpointId
- latency
- status code
- tenantId (when present)

Sensitive data must not be logged.

---

End of document.
