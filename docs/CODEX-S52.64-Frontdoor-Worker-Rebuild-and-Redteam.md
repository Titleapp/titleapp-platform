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

Sean asked for this explicitly: a red-team pass to make sure nothing is missed, since this is auth-verification + routing infrastructure for the whole app. **Expanded twice on 2026-09-07 after two rounds of Sean's own red-team review.** Restructured into cutover-sequencing risks (things that can break production during the rollout itself, independent of whether the new code is correct) and request-time verification correctness (things that must be true of every request once live).

### Cutover sequencing — can break production during rollout, not just after

- [ ] **BLOCKING — backend must be unreachable except through the Worker.** Test directly: `curl` the Cloud Run origin (`https://api-feyfibglbq-uc.a.run.app`) skipping the Worker entirely, with self-supplied `X-User-Id`/`X-Vertical`/`X-Jurisdiction` headers. If the backend accepts this, the whole "Worker verifies auth and injects trusted headers" model is decorative — anyone can impersonate any user by hitting the origin directly. Fix: a shared-secret header (e.g. `X-Edge-Secret`) that the Worker sets on every proxied request from a Worker secret (`wrangler secret put`, never a plain-text binding), which the backend must check and reject any request missing or mismatching it. Two-sided fix — both the new Worker AND `functions/functions/index.js` need changes. Distinct failure mode from token verification; do not fold it into that checkbox.
- [ ] **BLOCKING — deployment sequencing on the shared secret is itself a landmine.** The *current* production Worker doesn't send `X-Edge-Secret` — it doesn't exist yet. If the backend change ships and starts rejecting requests without the secret before the new Worker is fully cut over, **every user on the still-live old Worker breaks immediately**, mid-rollout, before the fix is even done. Sequence one of two ways: (a) backend accepts "valid secret OR no secret" during a transition window, then tighten to "secret required" only after the new Worker is confirmed fully live; or (b) both changes land in the exact same atomic cutover with zero window where old-Worker traffic hits new-backend code. This is a rollout-ordering problem, separate from the secret's existence — get the sequencing plan explicit before touching the backend.
- [ ] **BLOCKING — the generic `/api?path=/v1/...` proxy is a second, separate bypass surface**, and gets no real scrutiny by default because it looks like a minor catch-all. Two distinct things to verify: (a) **path allowlisting** — does the Worker validate `path` against a known-safe prefix/allowlist before calling `fetch(BACKEND_ORIGIN + path)`, or does it forward whatever string arrives in the query param, potentially reaching backend routes never meant to be edge-exposed? (b) **auth-check parity** — does this route run through the *exact same* token-verification code path as the 3 documented routes, or was it bolted on separately (common when a catch-all gets added later) and might skip verification/header-stripping/CORS that the named routes got? Run the full malformed/expired/wrong-project-token matrix against this route specifically, not just the named ones.
- [ ] **Rollback mechanics, confirmed not assumed**: is production traffic routed to the Worker via a Cloudflare Route/Custom Domain binding (near-instant to repoint) or via DNS (subject to TTL/propagation delay — a bad cutover could stay live for minutes)? Confirm which, explicitly, before calling rollback "fast."

### Request-time verification correctness

- [ ] **JWT verification, precisely** (a `jose`-library swap does not make this automatic):
  - Pin the algorithm to RS256 **explicitly** in the verification call — don't trust whatever `alg` the token header claims. This closes the classic "alg confusion" attack where a multi-algorithm-accepting verifier can be tricked into treating an RSA public key as an HMAC secret, letting an attacker self-sign a token.
  - Check `aud` (must equal `title-app-alpha` exactly) and `iss` (must equal `https://securetoken.google.com/title-app-alpha`) explicitly — a signature-valid token from a different Firebase project or Google service must not pass.
  - **Fail closed** if the JWKS fetch fails and there's no cached key for the token's `kid` — reject the request, never fall back to "allow through" to keep things working. This is exactly the kind of check someone quietly weakens under production pressure later if it isn't explicit now.
- [ ] **Authorization, not just authentication, on `GET /reportStatus?jobId=...`.** Every check above verifies *who the request claims to be*. Nothing verifies the authenticated user actually **owns** the `jobId` they're asking about. A valid, correctly-verified token from User A requesting User B's `jobId` would pass every check on this list and still leak User B's report — a distinct vulnerability class (IDOR) from token verification. Confirm this ownership check exists in the backend (likely, since it's business logic) — but verify explicitly, don't assume "the Worker verified the token" already answers the access-control question.
- [ ] **Timing-safe comparison for `X-Edge-Secret`.** A plain `===` string comparison leaks timing information character-by-character in theory. Low real-world risk over the public internet given network jitter, but it's a one-line fix (constant-time comparison) and cheap insurance given this secret is now the entire backend-bypass defense.
- [ ] **CORS implementation, not just presence.** Confirm the allowed-origin check is an **exact-match allowlist** — not `.includes()` or a loose regex, both bypassable with a crafted origin like `evil.com/titleapp.com` or `titleapp.com.evil.com`. This matters even more if `Access-Control-Allow-Credentials: true` is set. Also confirm `Authorization` is explicitly listed in `Access-Control-Allow-Headers` for preflight, since bearer tokens ride in that header.
- [ ] **Header trust boundary on the way IN, not just out.** If a client request arrives with its own `X-User-Id`/`X-Vertical`/`X-Jurisdiction` already set, the Worker must **strip** these before injecting its own verified values — not merge/append, which would leave both present for the backend to potentially read the wrong one.
- [ ] **Streaming correctness under real concurrent load**, not just one clean test request.
- [ ] **Full traffic surface coverage** — every real path the frontend calls, not just the 3 documented "Door 2" routes.
- [ ] **Test-load hygiene**: since there's no separate staging backend/Firebase project, use dedicated test accounts (not real user tokens) for verification, and confirm exercised actions (workflows, chat) don't trigger real side effects — real emails, real billing events, real downstream workflow execution.
- [ ] **Secrets hygiene**: are `BACKEND_ORIGIN`/`FIREBASE_PROJECT_ID` still fine as plain-text bindings (they are — not sensitive), and is `X-Edge-Secret` stored as a real Wrangler secret, never a plain-text binding?
- [ ] **Documentation debt**: once the rebuild finds the TRUE full traffic surface, `docs/STATE.md` must be updated to match reality and re-marked LOCKED — otherwise the next person trusts the same stale subset that caused this whole investigation to require archaeology in the first place.

## Opportunity list — built 9 months ago, worth upgrading while we're in here

Sean's explicit prompt: since this is a full rebuild anyway, look for real improvements over the 9-month-old original, not just a like-for-like clone. Candidates, roughly in priority order:

1. **Enable Cloudflare Workers Observability** (currently OFF on the live worker — confirmed via dashboard). This is directly why today's bug took real archaeology to even locate. Turning on logs/traces is cheap and would make the next issue like this fast to diagnose instead of slow. **Caveat, must be handled when this is enabled, not after**: confirm what gets logged by default — if request headers or bodies are captured, this system will start writing every user's Firebase bearer token (and the new `X-Edge-Secret`) into Cloudflare's log storage. Redact `Authorization` and `X-Edge-Secret` from anything that hits logs/traces before this ships, not as a follow-up.
2. **Real deploy pipeline, not a laptop.** At minimum, a documented `npm run deploy:frontdoor` script checked into this repo; ideally Cloudflare's native Git integration or a GitHub Actions workflow using Wrangler, so "someone's machine died" can never again mean "we lost production infrastructure."
3. **Use a vetted JWT library** (e.g. `jose`, Workers-compatible) for Firebase token verification rather than hand-rolled RS256 verification — reduces the chance of a subtle, hard-to-spot auth bug.
4. **Minimal automated tests** (Vitest + Miniflare is Cloudflare's own recommended pattern) covering at least: valid-token pass-through, invalid/expired-token rejection, and SSE passthrough — so a future change can be verified without live production testing.
5. **Edge rate limiting** — Cloudflare now offers native Rate Limiting Rules / a Workers rate-limiting binding; worth considering now that this is a real production app with real users, not something that existed as a lightweight tool 9 months ago.
6. **Consistent, non-leaky error responses** — structured JSON errors on auth/routing failures rather than whatever ad hoc shape existed before, so the frontend can handle them predictably.

Not all of these need to happen before the SSE fix ships — flagging them now so the decision of what to include in this pass (vs. defer) is Sean's, not silently decided by the rebuild.
