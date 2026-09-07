// titleapp-frontdoor — Cloudflare Worker edge router
//
// REWRITE 2026-09-07. The original worker's source lived only on a machine
// that has since died and was not recoverable (Cloudflare's script-content
// API endpoint does not work with scoped API tokens, and Wrangler has no
// download command). This is a clean reimplementation based on:
//   - docs/STATE.md (the documented, "locked" Door 2 GPT-action routes)
//   - the confirmed live bindings (BACKEND_ORIGIN, FIREBASE_PROJECT_ID)
//   - grepping the real frontend (apps/business/src) for how it actually
//     calls this worker in production
//
// ROUTING REALITY (confirmed by grep, not assumed):
//   - The web app (99% of real traffic) calls `${apiBase}/api?path=/v1/...`
//     — a single generic proxy path, path-to-forward encoded in a query
//     param. The frontend sets its own Authorization/x-tenant-id headers,
//     and the BACKEND verifies the Firebase token itself
//     (`requireFirebaseUser` in functions/functions/index.js) — this worker
//     does NOT need to re-verify tokens for this path, just proxy cleanly.
//   - The backend also owns CORS end-to-end (see `ALLOWED_ORIGINS` /
//     `setCorsHeaders` in functions/functions/index.js) — so this worker
//     does not need its own CORS logic for the generic proxy either. Do not
//     reintroduce duplicate/conflicting CORS headers here.
//   - Separately, docs/STATE.md documents three "Door 2" GPT Action
//     endpoints (`/workflows`, `/chat`, `/reportStatus`) where the WORKER
//     itself verifies the Firebase ID token and injects headers before
//     proxying — this is for an external GPT Action integration, distinct
//     from the main web app's chat panel (which uses `/api?path=/v1/chat:message`
//     like everything else). Both paths must keep working.
//
// THE BUG THIS REWRITE FIXES: the previous worker leaked raw
// `data: {...}` SSE lines as a client-facing JSON-parse error on streaming
// (accounting-worker) chat responses. The fix is structural: this worker
// NEVER buffers or re-parses a proxied response body. It always returns
// `new Response(originResponse.body, ...)` — the body is streamed straight
// through, and every response header from the origin (including
// `Content-Type: text/event-stream`) is copied over unmodified. There is
// no code path here that touches, decodes, or re-serializes the body.

/**
 * @typedef {Object} Env
 * @property {string} BACKEND_ORIGIN  e.g. https://api-feyfibglbq-uc.a.run.app
 * @property {string} FIREBASE_PROJECT_ID  e.g. title-app-alpha
 */

const GOOGLE_JWK_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

// Cache fetched Google public keys for the life of the isolate.
let cachedJwks = null;
let cachedJwksAt = 0;
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour — matches Google's own cache-control on this endpoint

async function getGoogleJwks() {
  const now = Date.now();
  if (cachedJwks && now - cachedJwksAt < JWKS_TTL_MS) return cachedJwks;
  const res = await fetch(GOOGLE_JWK_URL);
  if (!res.ok) throw new Error(`Failed to fetch Google JWKS: HTTP ${res.status}`);
  const jwks = await res.json();
  cachedJwks = jwks;
  cachedJwksAt = now;
  return jwks;
}

function base64UrlToUint8Array(base64Url) {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlDecodeToString(base64Url) {
  return new TextDecoder().decode(base64UrlToUint8Array(base64Url));
}

/**
 * Verify a Firebase ID token per Google's documented algorithm:
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 *
 * Checks: RS256 signature against Google's current public JWKS, `alg`,
 * `exp`, `iat`, `aud` (== project id), `iss` (== securetoken.google.com/<project>),
 * `sub` (non-empty). Throws with a descriptive message on any failure —
 * never returns a partially-valid result.
 *
 * @returns {Promise<{uid: string, email?: string, claims: Record<string, any>}>}
 */
async function verifyFirebaseIdToken(idToken, projectId) {
  if (!idToken || typeof idToken !== "string") throw new Error("missing token");
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("malformed token");
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = JSON.parse(base64UrlDecodeToString(headerB64));
  const payload = JSON.parse(base64UrlDecodeToString(payloadB64));

  if (header.alg !== "RS256") throw new Error(`unexpected alg: ${header.alg}`);

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) throw new Error("token expired");
  if (typeof payload.iat !== "number" || payload.iat > nowSeconds + 60) throw new Error("token issued in the future");
  if (payload.aud !== projectId) throw new Error(`unexpected aud: ${payload.aud}`);
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error(`unexpected iss: ${payload.iss}`);
  if (!payload.sub || typeof payload.sub !== "string") throw new Error("missing sub");

  const jwks = await getGoogleJwks();
  const jwk = (jwks.keys || []).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error(`no matching Google public key for kid: ${header.kid}`);

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToUint8Array(signatureB64);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, signature, signedData);
  if (!valid) throw new Error("signature verification failed");

  return { uid: payload.sub, email: payload.email, claims: payload };
}

/** Proxy a request to the backend, streaming the response body through untouched. */
async function proxyToBackend(request, targetUrl, extraHeaders = {}) {
  const headers = new Headers(request.headers);
  for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, v);
  // Host header must match the target origin, not the worker's own host.
  headers.delete("host");

  const init = {
    method: request.method,
    headers,
    // GET/HEAD must not carry a body.
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual",
  };

  const originResponse = await fetch(targetUrl, init);

  // Stream the body straight through. Do NOT call .json()/.text() or
  // otherwise consume/re-encode it here — that is exactly the class of bug
  // this rewrite exists to fix for SSE/streaming responses.
  return new Response(originResponse.body, {
    status: originResponse.status,
    statusText: originResponse.statusText,
    headers: originResponse.headers,
  });
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  /** @param {Request} request @param {Env} env */
  async fetch(request, env) {
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return jsonError(400, "invalid URL");
    }

    if (!env.BACKEND_ORIGIN) {
      return jsonError(500, "worker misconfigured: BACKEND_ORIGIN not set");
    }

    // ── Generic proxy: /api?path=/v1/... ─────────────────────────────
    // This is the dominant, real traffic pattern used by the entire web
    // app. The frontend already sets Authorization/x-tenant-id itself and
    // the backend verifies/authorizes independently — this worker just
    // proxies, no auth logic, no CORS logic (backend owns both).
    if (url.pathname === "/api") {
      const path = url.searchParams.get("path");
      if (!path || !path.startsWith("/")) {
        return jsonError(400, "missing or invalid 'path' query parameter");
      }
      const target = new URL(env.BACKEND_ORIGIN);
      // `path` may itself carry a query string (e.g. /reportStatus?jobId=1)
      const [pathOnly, pathQuery] = path.split("?");
      target.pathname = pathOnly;
      if (pathQuery) target.search = pathQuery;
      return proxyToBackend(request, target.toString());
    }

    // ── Door 2 / embedded GPT Action endpoints — see docs/STATE.md ───
    // These are LOCKED routes for an external GPT Action integration,
    // separate from the main web app. The worker verifies the Firebase
    // token itself and injects headers the backend expects.
    if (url.pathname === "/workflows" && request.method === "POST") {
      return handleDoor2(request, env, {
        backendPath: "/v1/raas:workflows",
        requireAuth: true,
        forwardHeaders: ["X-Vertical", "X-Jurisdiction"],
      });
    }

    if (url.pathname === "/chat" && request.method === "POST") {
      return handleDoor2(request, env, {
        backendPath: "/v1/chat:message",
        requireAuth: true,
        injectUserId: true,
      });
    }

    if (url.pathname === "/reportStatus" && request.method === "GET") {
      const target = new URL(env.BACKEND_ORIGIN);
      target.pathname = "/v1/report:status";
      target.search = url.search; // forwards ?jobId=...
      return proxyToBackend(request, target.toString());
    }

    return jsonError(404, "not found");
  },
};

/**
 * Shared handler for the two Door-2 routes that require worker-side
 * Firebase token verification before proxying.
 */
async function handleDoor2(request, env, { backendPath, requireAuth, forwardHeaders = [], injectUserId = false }) {
  const authHeader = request.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer (.+)$/);

  if (requireAuth && !match) {
    return jsonError(401, "missing Authorization: Bearer <Firebase ID token>");
  }

  let verified = null;
  if (match) {
    try {
      verified = await verifyFirebaseIdToken(match[1], env.FIREBASE_PROJECT_ID);
    } catch (err) {
      return jsonError(401, `invalid Firebase ID token: ${err.message}`);
    }
  }

  const extraHeaders = {};
  if (injectUserId && verified) extraHeaders["X-User-Id"] = verified.uid;
  for (const h of forwardHeaders) {
    const v = request.headers.get(h);
    if (v) extraHeaders[h] = v;
  }

  const target = new URL(env.BACKEND_ORIGIN);
  target.pathname = backendPath;
  return proxyToBackend(request, target.toString(), extraHeaders);
}
