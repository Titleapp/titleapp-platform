# Firestore Contracts (Alpha MVP)

Status: **LOCKED (Alpha Demo Green)**  
Project: `title-app-alpha`  
Owner: TitleApp RAAS Platform  
Rule: **Additive changes only** (never rename/remove fields without a versioned migration plan).

---

## Global Conventions

- All timestamps are **Firestore serverTimestamp()**
- IDs:
  - `chatSessions/{sessionId}` uses client-provided `sessionId`
  - Other collections use Firestore auto IDs
- Multi-tenant:
  - `tenantId` is always present (default: `"public"`)
- Vertical/jurisdiction routing:
  - `vertical` is always present
  - `jurisdiction` is nullable where applicable

---

## 1) chatSessions

### Document
Path: `chatSessions/{sessionId}`

Required fields:
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `status` (string) — `"active"` | `"closed"` (future)
- `source` (string) — e.g. `"api/v1/chat:message"`
- `ctx` (map)
  - `tenantId` (string)
  - `vertical` (string)
  - `jurisdiction` (string|null)

Optional fields:
- `autoState` (map)
  - `workflow` (string|null)
  - `inputs` (map)

### Subcollection: messages
Path: `chatSessions/{sessionId}/messages/{messageId}`

Required fields:
- `role` (string) — `"user"` | `"assistant"`
- `text` (string)
- `createdAt` (timestamp)

Optional fields:
- `meta` (map)
  - `workflow` (string|null)
  - `inputs` (map|null)

---

## 2) autoJobs

Path: `autoJobs/{autoJobId}`

Required fields:
- `createdAt` (timestamp)
- `tenantId` (string)
- `sessionId` (string)
- `jurisdiction` (string)
- `kind` (string) — workflow id (e.g. `"service_appt_to_ro"`)
- `status` (string) — `"created"` | `"in_progress"` | `"completed"` | `"failed"` (future)

Required map:
- `inputs` (map) — key/value strings captured from workflow

Optional fields:
- `result` (map|null)
- `error` (string|null)

---

## 3) inquiries

Path: `inquiries/{inquiryId}`

Required fields:
- `createdAt` (timestamp)
- `status` (string) — `"created"` | `"queued"` | `"completed"` | `"failed"` (future)
- `source` (string) — e.g. `"api/v1/inquiry:create"`
- `intent` (string) — e.g. `"research"`, `"order_preliminary"`, `"order_full"`
- `address` (map)
  - `line1` (string)
  - `city` (string)
  - `state` (string)

Optional fields:
- `notes` (string)
- `tenantId` (string) — if created via chat front door later
- `vertical` (string)
- `jurisdiction` (string)

---

## 4) reportJobs

Path: `reportJobs/{jobId}`

Required fields:
- `createdAt` (timestamp)
- `inquiryId` (string) — references `inquiries/{inquiryId}`
- `reportType` (string) — `"inquiry"` | `"preliminary"` | `"full_blockchain"`
- `status` (string) — `"queued"` | `"running"` | `"completed"` | `"failed"`
- `progress` (number 0-100)
- `source` (string) — e.g. `"api/v1/report:request"`

Optional fields:
- `startedAt` (timestamp|null)
- `completedAt` (timestamp|null)
- `result` (map|null)
- `error` (string|null)

---

## Compatibility Rules

- ✅ Allowed: add new optional fields, add new enum values, add new collections
- ❌ Not allowed (without migration): rename/remove fields, change field types

