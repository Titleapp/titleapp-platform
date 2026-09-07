
---

## Frontdoor (Cloudflare Worker) Routing — LOCKED

**Rewritten 2026-09-07** (CODEX S52.64) — the original worker's source was
unrecoverable (lived only on a machine that died). This section is
rewritten to match the TRUE traffic surface, confirmed by grepping the
real frontend (`apps/business/src`), not just the previously-documented
subset — that gap (documenting only 3 routes when the real surface was
much larger) is exactly what made this worker's loss so hard to reason
about. Source: `infra/cloudflare/titleapp-frontdoor/` (now version
controlled — see that directory's README for deploy instructions).

**Public Edge Base**
- https://titleapp-frontdoor.titleapp-core.workers.dev
- This is a bare `*.workers.dev` subdomain — no custom domain, no Cloudflare
  Route, no customer DNS layer in between. Cloudflare serves it directly at
  their edge. A deploy to this exact script name takes effect for new
  requests essentially immediately (no DNS TTL/propagation delay);
  "rollback" means redeploying a previous known-good version via
  `wrangler versions deploy <version-id>@100%` or the dashboard, which is
  the same near-instant mechanism.

**The dominant real traffic pattern — used by nearly every page/component
in `apps/business/src`:**

- `GET|POST|PUT|DELETE /api?path=/v1/...`
  - Generic proxy. `path` query param must match `/v1/[A-Za-z0-9_:./-]+` —
    enforced by an explicit allowlist regex in the worker (a bare pass-through
    of any string here was a real bypass-surface gap, closed in the rewrite).
  - The frontend sets its own `Authorization`/`x-tenant-id` headers; the
    **backend independently verifies** the Firebase token
    (`requireFirebaseUser` in `functions/functions/index.js`) — the worker
    does not re-verify tokens on this route, just proxies.
  - The backend also owns CORS for its own responses on this route
    (`ALLOWED_ORIGINS`/`setCorsHeaders` in `functions/functions/index.js`).
  - `X-Vertical`/`X-Jurisdiction` pass through from the client unchanged —
    confirmed these are non-authoritative ruleset-selection hints only, not
    an access-control boundary (real admin pages like `PipelineMonitor.jsx`,
    `BogoManager.jsx` rely on this today).
  - `X-User-Id` and `X-Edge-Secret` are stripped from any incoming request
    on this route before proxying — a client can never inject these.

**Door 2 / Embedded GPT Action Endpoints** — a separate, worker-verified
path for an external GPT Action integration (not the main web app, which
uses `/api?path=/v1/chat:message` like everything else above):

- `POST /workflows`
  - Proxies to backend: `/v1/raas:workflows`
  - Worker verifies the Firebase ID token itself (RS256, via `jose` against
    Google's live JWKS; `aud`/`iss` checked explicitly against
    `title-app-alpha`)
  - Forwards `X-Vertical`/`X-Jurisdiction` from the request as-is

- `POST /chat`
  - Proxies to backend: `/v1/chat:message`
  - Worker verifies the Firebase token; injects a worker-derived `X-User-Id`
    (stripping any client-supplied value first). Note: the backend does not
    currently read `X-User-Id` for anything — it derives the real uid from
    its own independent token verification — so this header is currently
    informational/future-proofing, not a live trust dependency.

- `GET /reportStatus?jobId=...`
  - Proxies to backend: `/v1/report:status`. Not worker-verified (matches
    original documented behavior) — the backend requires its own auth and
    additionally checks `data.tenantId !== ctx.tenantId` before returning a
    job (confirmed in code during the S52.64 review — closes the IDOR
    concern of one tenant reading another tenant's report by guessing a
    `jobId`).

**Edge-secret defense in depth (X-Edge-Secret)** — every request this
worker proxies carries `X-Edge-Secret`, set from a Wrangler secret
(`EDGE_SHARED_SECRET`, never plain-text). The backend checks it via
constant-time comparison **only if `EDGE_SHARED_SECRET` is configured in
Secret Manager** — deliberately inert until explicitly activated, so
deploying this check is safe on its own; activating it (setting the actual
secret value in Secret Manager) is a separate, coordinated step that must
happen only after the new worker is confirmed fully live in production,
never before or during a partial rollout. See
`docs/CODEX-S52.64-Frontdoor-Worker-Rebuild-and-Redteam.md` for the full
cutover sequencing plan.

**Known, confirmed-out-of-scope for this worker:**
- `apps/business/src/components/DriveImportModal.jsx` calls
  `https://api-feyfibglbq-uc.a.run.app/v1/drive:...` / `/vault:...`
  **directly**, bypassing this worker entirely. Confirmed via grep — a
  pre-existing architectural inconsistency elsewhere in the app, not a
  routing gap in this worker.

**Important Notes**
- Do NOT call `/v1/workflows` (or any `/v1/...` backend path) directly from
  clients — always go through this worker.
- All clients (Door 1 UI + Door 2 GPT) must call the public edge paths
  above.

This routing is verified against the worker source in
`infra/cloudflare/titleapp-frontdoor/src/index.js` — read that file
directly if this doc and the code ever diverge; the code is the source of
truth, this doc is the summary. Keep both in sync going forward — the
previous version of this doc silently fell out of sync with reality
(documenting 3 routes when the real surface was much larger), which is
part of why recovering from the source loss required real investigation
instead of just reading this file.
