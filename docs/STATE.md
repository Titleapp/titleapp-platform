
---

## Frontdoor (Cloudflare Worker) Routing — LOCKED

**Public Edge Base**
- https://titleapp-frontdoor.titleapp-core.workers.dev

**Door 2 / Embedded GPT Action Endpoints**
These paths are handled directly by the Cloudflare Worker and must be used as-is.

- `POST /workflows`
  - Proxies to backend: `/v1/raas:workflows`
  - Requires Firebase ID token (`Authorization: Bearer <token>`)
  - Routing headers: `X-Vertical`, `X-Jurisdiction`

- `POST /chat`
  - Proxies to backend: `/v1/chat:message`
  - Cloudflare Worker verifies Firebase token
  - Worker injects `X-User-Id` header

- `GET /reportStatus?jobId=...`
  - Proxies to backend: `/v1/report:status`

**Important Notes**
- Do NOT call `/v1/workflows` directly from clients.
- `/api?path=...` is a generic proxy but is NOT used for Door 2 action wiring.
- All clients (Door 1 UI + Door 2 GPT) must call the public edge paths above.

This routing is verified against deployed Cloudflare Worker source.
