# CODEX S52.64 — Frontdoor Worker: Source Loss, Rebuild, and Red-Team Checklist

**Status:** In progress · 2026-09-07
**Owner:** Sean (direction, final production cutover sign-off) · Claude (investigation, rebuild)
**Scope:** the Cloudflare Worker `titleapp-frontdoor` — the edge router every client request to the backend passes through

---

## Why this exists

While investigating a real SSE-streaming bug in Max's (Accounting worker) chat responses (raw `Unexpected token 'd', "data: {"pr"...` leaking to users), the bug was traced to something outside the application codebase entirely: the Cloudflare Worker that proxies all traffic between clients and the backend. Both the frontend (`ChatPanel.jsx`) and backend (`functions/functions/index.js`) SSE handling were independently verified correct — the likely cause is this Worker not transparently passing through streaming responses and their `Content-Type` header.

**The Worker's source code is unrecoverable.** It was deployed via Wrangler CLI from Sean's previous machine, which has since died — per Sean: "I built that 9 months ago." A real recovery attempt was made using a scoped Cloudflare API token (list scripts, list all 102 historical versions, pull version metadata) but the actual content-download endpoint doesn't support scoped API tokens (a genuine Cloudflare platform limitation, not a permissions mistake), and Wrangler CLI has no download capability by design. Recovery was abandoned in favor of a clean rebuild, approved directly by Sean.

**This means the Worker has been running for 9 months with zero version control, zero backup, and zero deploy pipeline** — a real single point of failure for the entire application's edge routing and auth verification. Fixing that architecture problem is as much the point of this CODEX as fixing the SSE bug.

## What's confirmed real (not guessed)

- Account ID: `943ae2cdf19f03a1e4ab86a97d28f657`.
- Live bindings on the current production version (pulled via real Cloudflare API call): `BACKEND_ORIGIN` = `https://api-feyfibglbq-uc.a.run.app`, `FIREBASE_PROJECT_ID` = `title-app-alpha`.
- Documented routing contract (`docs/STATE.md`, marked LOCKED):
  - `POST /workflows` → backend `/v1/raas:workflows`, requires `Authorization: Bearer <Firebase ID token>`, forwards `X-Vertical`/`X-Jurisdiction` headers.
  - `POST /chat` → backend `/v1/chat:message`; Worker verifies the Firebase token and injects `X-User-Id`.
  - `GET /reportStatus?jobId=...` → backend `/v1/report:status`.
  - `/api?path=/v1/...` generic proxy pattern also exists (per `CLAUDE.md`).
- The Worker's actual real-world traffic surface is almost certainly larger than these 3 documented "Door 2" routes — it's described in `CLAUDE.md` as the edge router for the entire app (chat UI, worker interactions, everything), not just GPT-action wiring. The rebuild task includes finding the true full surface by grepping frontend `apiFetch` call sites, not just trusting STATE.md's documented subset.

## Rebuild plan and safety rails

1. Research the real, full traffic surface (frontend call sites, CORS origins needed, what headers the backend expects only the Worker to set).
2. Reimplement: CORS, Firebase ID token verification (JWKS-based, RS256, checked against `title-app-alpha`), documented route proxying with correct header injection, and — the actual fix — fully transparent streaming proxy behavior (no buffering, correct `Content-Type` passthrough) for SSE responses.
3. Deploy the rewrite under a **separate, isolated test Worker name** first (`titleapp-frontdoor-v2-test` or similar) with its own `workers.dev` URL — test thoroughly against the real backend before anything touches production.
4. **Do not cut real traffic over without Sean's explicit, separate sign-off on that specific step.** This is an all-or-nothing swap for a domain every user depends on.
5. Commit the full source, `wrangler.toml`, and deploy instructions into `titleapp-platform` git — permanently closing the "lives on one laptop" problem.

## Red-team checklist — please review before production cutover

Sean asked for this explicitly: a red-team pass to make sure nothing is missed, since this is auth-verification + routing infrastructure for the whole app.

- [ ] **Auth bypass check**: can any request reach the backend without a valid, correctly-verified Firebase ID token where one is required? Check every route, not just the happy path — including malformed tokens, expired tokens, tokens signed for a different Firebase project, and missing-header cases.
- [ ] **JWKS handling**: are Google's public keys cached with a sane TTL (respecting their `Cache-Control` header), not fetched fresh on every request (latency + rate-limit risk) and not cached forever (misses key rotation)?
- [ ] **CORS correctness on error paths**: do 401/403/500 responses still carry correct CORS headers? (A common gap — the frontend can't even see an auth error if the error response itself fails CORS.)
- [ ] **Streaming correctness**: does the SSE fix actually hold under real concurrent load, not just a single clean test request?
- [ ] **Full traffic surface coverage**: did the rebuild find and handle every real path the frontend calls, not just the 3 documented "Door 2" routes? A gap here silently breaks some feature in production.
- [ ] **Secrets hygiene**: are `BACKEND_ORIGIN`/`FIREBASE_PROJECT_ID` still fine as plain-text bindings (they are — not sensitive), and is there a documented path (`wrangler secret put`) for anything that becomes genuinely sensitive later?
- [ ] **Rollback plan**: if the new Worker misbehaves after cutover, what's the fastest way back to a known-good state? (With the old source gone, "roll back to the old version" is no longer an option — the rollback plan has to be "redeploy the previous *new* version," so get at least one clean version live and stable before iterating further.)

## Opportunity list — built 9 months ago, worth upgrading while we're in here

Sean's explicit prompt: since this is a full rebuild anyway, look for real improvements over the 9-month-old original, not just a like-for-like clone. Candidates, roughly in priority order:

1. **Enable Cloudflare Workers Observability** (currently OFF on the live worker — confirmed via dashboard). This is directly why today's bug took real archaeology to even locate. Turning on logs/traces is cheap and would make the next issue like this fast to diagnose instead of slow.
2. **Real deploy pipeline, not a laptop.** At minimum, a documented `npm run deploy:frontdoor` script checked into this repo; ideally Cloudflare's native Git integration or a GitHub Actions workflow using Wrangler, so "someone's machine died" can never again mean "we lost production infrastructure."
3. **Use a vetted JWT library** (e.g. `jose`, Workers-compatible) for Firebase token verification rather than hand-rolled RS256 verification — reduces the chance of a subtle, hard-to-spot auth bug.
4. **Minimal automated tests** (Vitest + Miniflare is Cloudflare's own recommended pattern) covering at least: valid-token pass-through, invalid/expired-token rejection, and SSE passthrough — so a future change can be verified without live production testing.
5. **Edge rate limiting** — Cloudflare now offers native Rate Limiting Rules / a Workers rate-limiting binding; worth considering now that this is a real production app with real users, not something that existed as a lightweight tool 9 months ago.
6. **Consistent, non-leaky error responses** — structured JSON errors on auth/routing failures rather than whatever ad hoc shape existed before, so the frontend can handle them predictably.

Not all of these need to happen before the SSE fix ships — flagging them now so the decision of what to include in this pass (vs. defer) is Sean's, not silently decided by the rebuild.
