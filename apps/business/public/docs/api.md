# API reference

The HTTP surface workers can call. Most of this is invoked by the platform automatically (your worker doesn't need to call billing, identity, or audit endpoints directly). Documented here for completeness.

> **Stability promise.** Endpoints listed here are stable v1. Breaking changes get 90 days' notice + a v2 alternative.

## Authentication

All API calls require a Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

Workers running in the platform receive their token automatically. Outside-platform calls (testing) require you to sign in via Firebase Auth first.

## Base URL

```
https://api.sociii.ai/v1/
```

The api.sociii.ai domain proxies through Cloudflare to the Firebase Functions backend. Direct Cloud Run calls (`api-feyfibglbq-uc.a.run.app`) are not part of the stable surface.

## Capability namespaces

Endpoints are grouped by capability:

| Namespace | Purpose |
|---|---|
| `worker:*` | Worker invocation, listing, ratings |
| `raas:*` | Rule pack loading, constraint checks |
| `dtc:*` | Digital Title Certificate operations |
| `contacts:*` | Contacts spine reads/writes |
| `files:*` | Drive + Vault storage |
| `ir:*` | Investor relations (per-fundraise) |
| `hr:*` | HR notice composer + scheduling |
| `identity:*` | Stripe Identity orchestration |

## Common endpoints

### POST /v1/worker:invoke

Invokes a worker with input. Returns the worker's output + audit event id.

```http
POST /v1/worker:invoke
Authorization: Bearer <token>
Content-Type: application/json

{
  "slug": "nurse-eval-001",
  "input": { "patient_chart": "...", "hospital_protocol": "..." },
  "version": "latest"
}
```

Response:

```json
{
  "ok": true,
  "output": { "soap_note": {...}, "flagged_labs": [...] },
  "audit_event_id": "evt_abc123",
  "billing_charged": 0.04
}
```

### GET /v1/worker:catalog

Lists workers (paginated).

```http
GET /v1/worker:catalog?vertical=healthcare&lane=marketplace&limit=50
```

### POST /v1/files:finalize

Persists a file uploaded to the platform's Drive surface.

### GET /v1/dtc:list

Lists Digital Title Certificates the user has access to.

### GET /v1/journey:state

Returns the current Creator Journey state for the signed-in user.

## Rate limits

Per-user, per-endpoint:

| Endpoint family | Limit |
|---|---|
| `worker:invoke` | Per-worker quota (default 100/hr, configurable) |
| `worker:catalog` | 600/hr |
| Everything else | 300/hr |

Rate limit headers in response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1717241400
```

## Errors

Standard shape:

```json
{
  "ok": false,
  "error": "INSUFFICIENT_ROLE",
  "message": "This action requires admin role on the workspace.",
  "request_id": "req_xyz789"
}
```

Common error codes: `UNAUTHENTICATED`, `INSUFFICIENT_ROLE`, `INSUFFICIENT_CREDITS`, `NOT_FOUND`, `RATE_LIMITED`, `INVALID_INPUT`, `WORKER_NOT_PUBLISHED`.

## Webhook events

The platform emits webhooks on these events (configurable per worker in Creator Dashboard):

- `worker.invoked` — worker output produced
- `worker.refused` — refusal condition triggered
- `subscription.created` — new customer
- `subscription.canceled` — customer cancelled
- `review.published` — Forge or customer review posted

Webhooks are signed with HMAC-SHA256; signature in `X-SOCIII-Signature` header.

## SDK clients

There are no official client SDKs at v1 — the API is intentionally a thin HTTP surface so Claude Code can call it directly from any language. If you want client libraries, they ship in v2.

## What's not in v1

- Streaming worker responses (SSE) — v2
- Webhook retry/replay UI — v2
- Direct DB access — never (audit integrity)

## What comes next

**[→ Worker anatomy](/docs/worker-anatomy)**
**[→ Glossary](/docs/glossary)** — terminology
