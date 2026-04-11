// CODEX 47.4 Phase B (T2) — Worker Sandbox API client.
//
// Thin wrappers over the 11 sandbox:worker:* routes added in Phase A.
// Returns { ok, ... } consistently — never throws to the caller. Auth via
// Firebase ID token, falling back to localStorage. All routes go through
// the Cloudflare Frontdoor at /api?path=/v1/...
//
// This file deliberately mirrors the existing w1Api/getFreshToken pattern in
// DeveloperSandbox.jsx so future consolidation is a straight rename.

import { auth as firebaseAuth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// CODEX 47.4 Phase C-0 fix — auth race.
//
// The original helper assumed firebaseAuth.currentUser was already populated
// by the time it ran. That holds for DeveloperSandbox because App.jsx gates
// the route on sandboxReady, but WorkerSandbox is a parallel surface that
// renders immediately. On a fresh page load currentUser is still null until
// onAuthStateChanged fires once, and the helper would silently fall through
// to whatever stale ID_TOKEN sat in localStorage — Firebase ID tokens last
// one hour, so the typical real-world fallback was an expired token and a
// 401 from the backend.
//
// waitForAuth resolves with the authenticated user as soon as Firebase has
// hydrated its session, or null after a short timeout if no one is signed in.
// Cached as a module-level promise so concurrent first-call requests share a
// single onAuthStateChanged subscription.

let _authReadyPromise = null;

function waitForAuth(timeoutMs = 5000) {
  if (firebaseAuth?.currentUser) return Promise.resolve(firebaseAuth.currentUser);
  if (_authReadyPromise) return _authReadyPromise;

  _authReadyPromise = new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { unsub(); } catch (_) {}
      resolve(null);
    }, timeoutMs);

    const unsub = onAuthStateChanged(firebaseAuth, (user) => {
      if (settled) return;
      // First non-null callback wins. We deliberately do NOT resolve on the
      // initial null callback because that fires synchronously before the
      // session has been read from IndexedDB.
      if (user) {
        settled = true;
        clearTimeout(timer);
        try { unsub(); } catch (_) {}
        resolve(user);
      }
    });
  });

  // Reset the cached promise once it settles so a future sign-out / sign-in
  // cycle in the same tab can re-await cleanly.
  _authReadyPromise.finally(() => { _authReadyPromise = null; });
  return _authReadyPromise;
}

async function getFreshToken() {
  // Wait for Firebase to hydrate the session. Returns immediately if
  // currentUser is already set.
  const user = await waitForAuth();
  if (user) {
    try {
      const token = await user.getIdToken(/* forceRefresh */ true);
      localStorage.setItem("ID_TOKEN", token);
      return token;
    } catch (e) {
      console.error("[sandboxWorkerApi] getIdToken failed:", e);
    }
  }
  // Last-ditch fallback. This will only be exercised if Firebase auth has
  // not resolved within the timeout — meaning the user is genuinely signed
  // out and any cached token is almost certainly stale.
  const stored = localStorage.getItem("ID_TOKEN");
  if (stored && stored !== "undefined" && stored !== "null") return stored;
  return null;
}

// Exposed so the page can also gate its own first call on auth resolution
// instead of relying purely on the in-flight call to do it.
export { waitForAuth };

function buildHeaders(token) {
  const h = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  const tenantId = localStorage.getItem("TENANT_ID");
  if (tenantId) h["X-Tenant-Id"] = tenantId;
  return h;
}

async function call(method, path, { body, query } = {}) {
  try {
    const token = await getFreshToken();
    if (!token) return { ok: false, error: "Not authenticated" };

    let qs = "";
    if (query && Object.keys(query).length > 0) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) params.set(k, String(v));
      }
      qs = `&${params.toString()}`;
    }

    const url = `${API_BASE}/api?path=${encodeURIComponent(path)}${qs}`;

    const res = await fetch(url, {
      method,
      headers: buildHeaders(token),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[sandboxWorkerApi] ${method} ${path} returned ${res.status}:`, text);
      return { ok: false, error: `Server error ${res.status}` };
    }

    return await res.json();
  } catch (e) {
    console.error(`[sandboxWorkerApi] ${method} ${path} threw:`, e);
    return { ok: false, error: e.message || "Network error" };
  }
}

// ─── Build flow ─────────────────────────────────────────────────────────────

export function initWorkerFlow({ sessionId, workerName } = {}) {
  return call("POST", "/v1/sandbox:worker:init", { body: { sessionId, workerName } });
}

/**
 * @param {object} args
 * @param {string} args.sessionId
 * @param {string} args.stepId
 * @param {"start"|"complete"} args.action
 * @param {object} [args.data]  — step-specific data merged into workerSteps[stepId].data
 */
export function advanceWorkerStep({ sessionId, stepId, action, data }) {
  return call("POST", "/v1/sandbox:worker:advance", { body: { sessionId, stepId, action, data } });
}

export function getWorkerFlowState(sessionId) {
  return call("GET", "/v1/sandbox:worker:state", { query: { sessionId } });
}

// ─── Studio Locker ──────────────────────────────────────────────────────────

/**
 * Ingest a document into the Studio Locker.
 * For files, pass `file` (a File object) and we base64-encode here.
 *
 * @param {object} args
 * @param {string} args.workerId
 * @param {string} args.name
 * @param {"pdf"|"docx"|"text"|"url"|"paste"|"auto"} args.sourceType
 * @param {number} [args.tier]   — 1/2/3, defaults to 3
 * @param {File}   [args.file]   — for pdf/docx/text/auto
 * @param {string} [args.url]    — for url
 * @param {string} [args.text]   — for paste
 */
export async function ingestDocument({ workerId, name, sourceType, tier, file, url, text }) {
  let base64 = null;
  let mime = null;
  if (file) {
    try {
      const buffer = await file.arrayBuffer();
      base64 = arrayBufferToBase64(buffer);
      mime = file.type || null;
    } catch (e) {
      return { ok: false, error: "Could not read file" };
    }
  }
  return call("POST", "/v1/sandbox:worker:knowledge:ingest", {
    body: { workerId, name, sourceType, tier, base64, mime, url, text },
  });
}

export function listDocuments(workerId) {
  return call("GET", "/v1/sandbox:worker:knowledge:list", { query: { workerId } });
}

export function setDocumentTier({ workerId, docId, tier }) {
  return call("POST", "/v1/sandbox:worker:knowledge:tier", { body: { workerId, docId, tier } });
}

export function deleteDocument({ workerId, docId }) {
  return call("DELETE", "/v1/sandbox:worker:knowledge:doc", { body: { workerId, docId } });
}

// ─── Build Log ──────────────────────────────────────────────────────────────

export function getBuildLog(sessionId) {
  return call("GET", "/v1/sandbox:worker:buildlog", { query: { sessionId } });
}

export function appendBuildLogNote({ sessionId, text }) {
  return call("POST", "/v1/sandbox:worker:buildlog:note", { body: { sessionId, text } });
}

// ─── Test Protocol ──────────────────────────────────────────────────────────

export function getTestQuestions(sessionId) {
  return call("GET", "/v1/sandbox:worker:test:questions", { query: { sessionId } });
}

export function recordTestRun({ sessionId, responses }) {
  return call("POST", "/v1/sandbox:worker:test:run", { body: { sessionId, responses } });
}

// ─── File Upload ──────────────────────────────────────────────────────────

/**
 * Upload an image or video file to Cloud Storage via the sandbox file upload endpoint.
 * Documents (PDF/DOCX/TXT/MD/CSV) should use ingestDocument() instead.
 */
export async function uploadFile(file) {
  let base64 = null;
  try {
    const buffer = await file.arrayBuffer();
    base64 = arrayBufferToBase64(buffer);
  } catch (e) {
    return { ok: false, error: "Could not read file" };
  }
  return call("POST", "/v1/sandbox:file:upload", {
    body: {
      name: file.name,
      data: `data:${file.type || "application/octet-stream"};base64,${base64}`,
      type: file.type || "application/octet-stream",
    },
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer) {
  // Chunked conversion to avoid call-stack overflow on large files.
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
