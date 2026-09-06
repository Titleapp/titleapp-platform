// CODEX 70 Surface 2 — Course Uploader API client.
//
// Thin wrapper over the new /v1/edu:instructor:*, /v1/edu:course:* routes,
// plus a couple of chat/knowledge helpers reused unchanged from
// sandboxWorkerApi.js (ingestDocument, listDocuments — the exact same Studio
// Locker ingest path local file uploads already use in the Worker Sandbox).
//
// Auth model: OTP send/verify are public (no token). Everything else is
// authenticated with whatever Firebase session is currently signed in —
// the instructor's own session right after OTP verify, then the course's
// own ephemeral session (courseUid) after /edu:course:create hands back a
// courseToken and the wizard signs into it. See courseSession.js on the
// backend for why course docs live under a separate uid.

import { waitForAuth } from "./sandboxWorkerApi";

export { ingestDocument, listDocuments, waitForAuth } from "./sandboxWorkerApi";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function getToken() {
  // Reuses sandboxWorkerApi's auth-hydration wait — it already handles the
  // fresh-sign-in race correctly (see its comment on waitForAuth) so this
  // module doesn't need its own copy of the same logic.
  const user = await waitForAuth();
  if (!user) return null;
  try {
    return await user.getIdToken(true);
  } catch (e) {
    console.error("[educationApi] getIdToken failed:", e);
    return null;
  }
}

async function call(method, path, { body, query, auth: requireAuth = true } = {}) {
  try {
    const headers = { "Content-Type": "application/json" };
    if (requireAuth) {
      const token = await getToken();
      if (!token) return { ok: false, error: "Not authenticated" };
      headers.Authorization = `Bearer ${token}`;
    }
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
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && data.ok === undefined) {
      return { ok: false, error: `Server error ${res.status}` };
    }
    return data;
  } catch (e) {
    console.error(`[educationApi] ${method} ${path} threw:`, e);
    return { ok: false, error: e.message || "Network error" };
  }
}

// ─── Step 1 — Instructor identity (Path A: institutional email OTP) ────────

export function sendInstructorOtp(email) {
  return call("POST", "/v1/edu:instructor:sendOtp", { body: { email }, auth: false });
}

export function verifyInstructorOtp(email, code) {
  return call("POST", "/v1/edu:instructor:verifyOtp", { body: { email, code }, auth: false });
}

// ─── Step 2-4 — Course session ─────────────────────────────────────────────

export function createCourse({ courseName, courseNumber, institution, level, tutorName, description }) {
  return call("POST", "/v1/edu:course:create", {
    body: { courseName, courseNumber, institution, level, tutorName, description },
  });
}

export function getCourseToken(slug) {
  return call("GET", "/v1/edu:course:token", { query: { slug }, auth: false });
}

export function publishCourse(slug) {
  return call("POST", "/v1/edu:course:publish", { body: { slug } });
}

// ─── Step 3 — Google Drive import ──────────────────────────────────────────

export function driveImportCourseFiles({ workerId, files }) {
  return call("POST", "/v1/edu:course:driveImport", { body: { workerId, files } });
}

// ─── Course chat (Step 4 preview + /course/:slug) ──────────────────────────

export async function sendCourseChatMessage({ userInput, conversationHistory, workerId, courseName, tutorName, description }) {
  return call("POST", "/v1/chat:message", {
    body: {
      sessionId: `course_${workerId}_${Date.now()}`,
      userInput,
      context: {
        source: "course_chat",
        workerId,
        courseName,
        tutorName,
        description,
        conversationHistory: conversationHistory || [],
      },
    },
  });
}
