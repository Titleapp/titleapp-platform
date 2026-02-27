# Title App — Phase 2: General File Uploads (MVP)

## What shipped
We added a general, binary-safe upload pipeline that supports arbitrary file types (PDF, DOCX, XLS/XLSX, images, CSV/TXT/JSON, etc.) without OCR/extraction.

### Canonical architecture (unchanged)
- Firebase Auth = identity
- Firestore = metadata + partitioning
- Firebase Storage = binary objects
- Cloudflare Frontdoor stays as-is
- GPT is orchestration, not storage

## Data model (MVP)
### Firestore
Collection: `files/{fileId}`

Key fields:
- `tenantId`
- `status`: `uploading` → `uploaded`
- `original.filename`, `original.contentType`, `original.sizeBytes`
- `storage.bucket`, `storage.path`
- legacy mirror: `storagePath` (kept for compatibility)
- `uploadedBy.userId`, `uploadedBy.email`
- `tags[]`, `purpose`, `related{}`

### Storage pathing
Tenant-scoped object paths:
`tenants/{tenantId}/uploads/{YYYY}/{MM}/{fileId}-{safeFilename}`

## API endpoints (Firebase HTTPS Function: /v1/*)
All endpoints require:
- `Authorization: Bearer <Firebase ID token>`
- `x-tenant-id: <tenantId>` (e.g., demo)

### 1) POST /v1/files:sign
Creates the file metadata record and returns a signed upload URL for direct PUT to Storage.

Request JSON:
- `filename` (required)
- `contentType` (optional; default `application/octet-stream`)
- `sizeBytes` (optional)
- `purpose` (optional)
- `tags` (optional array)
- `related` (optional object)

Response JSON:
- `fileId`
- `storagePath`
- `uploadUrl`
- `requiredHeaders` (must include Content-Type)
- `expiresAt`

### 2) PUT uploadUrl
Client uploads bytes directly to Storage using the signed URL.
Must include required headers (at minimum Content-Type).

### 3) POST /v1/files:finalize
Server verifies the object exists in Storage, reads metadata, updates Firestore record to `status=uploaded`.

Request JSON:
- `fileId` (required)

Response JSON:
- `status=uploaded`
- `sizeBytes`
- `contentType`
- `bucket`
- `path`

### 4) POST /v1/files:readUrl
Returns a short-lived signed read URL so Digital Workers/GPT can fetch the content when needed.

Request JSON:
- `fileId` (required)
- `expiresSeconds` (optional; 60–3600, default 900)

Response JSON:
- `readUrl`
- `expiresSeconds`
- `bucket`
- `path`

## Notes
- No OCR/extraction in MVP. Files are stored and addressable.
- Tenant partitioning is enforced via membership checks.
- This upload capability is the foundation for Analyst Digital Worker file binding and explainable workflows.
