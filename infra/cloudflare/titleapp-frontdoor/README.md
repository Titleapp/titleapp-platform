# titleapp-frontdoor (Cloudflare Worker)

Edge router in front of the backend Firebase Function (`api-feyfibglbq-uc.a.run.app`).
Every real client request to the app passes through this worker — see
`CLAUDE.md`: `[Admin UI / Chat AI] → [Cloudflare Worker Frontdoor] → [Firebase Functions → Cloud Run]`.

## Why this exists (again)

The original worker's source only ever lived on one machine, which died.
It was not recoverable — Cloudflare's script-content download API does not
work with scoped API tokens, and Wrangler has no download command. This
is a clean rewrite, done 2026-09-07, **now committed to git so this can
never happen again.**

## What it does

1. **`/api?path=/v1/...`** — the real, dominant traffic pattern. Nearly
   every component in `apps/business/src` calls
   `${apiBase}/api?path=/v1/whatever`. The frontend sets its own
   `Authorization`/`x-tenant-id` headers; the **backend** verifies the
   Firebase token and owns CORS (see `ALLOWED_ORIGINS` /
   `setCorsHeaders` in `functions/functions/index.js`). This worker does
   **not** duplicate auth or CORS logic here — it just proxies, streaming
   the response body straight through untouched.
2. **`/workflows`, `/chat`, `/reportStatus`** — the "Door 2" GPT Action
   endpoints documented as LOCKED in `docs/STATE.md`, for an external GPT
   Action integration (separate from the main web app, which uses
   `/api?path=/v1/chat:message` like everything else). For these three,
   the worker itself verifies the Firebase ID token (RS256 against
   Google's public JWKS) and injects `X-User-Id` / forwards
   `X-Vertical`/`X-Jurisdiction` before proxying.

## The bug this rewrite fixes

The prior worker leaked raw `data: {...}` SSE lines as a client-facing
JSON-parse error on streaming (accounting-worker) chat responses. Root
cause was outside the app's own frontend/backend code (both traced clean)
— almost certainly this worker buffering, re-encoding, or dropping the
`Content-Type: text/event-stream` header on a streaming origin response.

**This rewrite never touches a proxied response body.** Every proxy path
returns `new Response(originResponse.body, { headers: originResponse.headers, ... })`
— the body is streamed through as-is, and all origin headers (including
`Content-Type`) are copied over unmodified. There is no `.json()`/`.text()`
call anywhere on a proxied response.

## Deploying

```bash
cd infra/cloudflare/titleapp-frontdoor
CLOUDFLARE_API_TOKEN=<a token scoped to Workers Edit> \
CLOUDFLARE_ACCOUNT_ID=943ae2cdf19f03a1e4ab86a97d28f657 \
  npx wrangler deploy
```

**Do not deploy straight to `titleapp-frontdoor` without testing first.**
Deploy under a different `name` in `wrangler.toml` (e.g.
`titleapp-frontdoor-test`) to get an isolated `*.workers.dev` URL, verify
it against the real backend, and only then repoint `name` back to
`titleapp-frontdoor` and redeploy for a real cutover — with explicit
sign-off, since this is a full swap of the edge router for the entire
live app.

## Bindings (plain-text vars, confirmed from the live worker's last
deployed version via the Cloudflare API before this rewrite)

- `BACKEND_ORIGIN` = `https://api-feyfibglbq-uc.a.run.app`
- `FIREBASE_PROJECT_ID` = `title-app-alpha`

Both are already set in `wrangler.toml` — no secrets involved, these are
public plain-text vars.
