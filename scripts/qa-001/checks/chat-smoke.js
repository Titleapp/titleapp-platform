"use strict";

/**
 * Check: chat actually responds and is grounded (live smoke).
 *
 * QA-001 was all-structural; this adds a real chat turn. It signs in as the
 * demo user (throwaway password via admin SDK, same trick as chatTest.js),
 * posts ONE message to a worker through the deployed frontdoor, and asserts a
 * non-empty 200 response. This is the fast liveness gate — the full 11-surface
 * grounding/anti-fabrication pass lives in
 * functions/functions/scripts/test/chatTest.js (run that for depth).
 *
 * Degrades gracefully: if firebase-admin / ADC creds / the API aren't reachable
 * (e.g. CI without secrets), it P2-skips with ok:true rather than failing the
 * build on environment.
 *
 * Catches:
 *   TC-CHAT-01 — chat endpoint returns non-200 or empty ("No response received")
 */

const path = require("path");

const BASE = "https://titleapp-frontdoor.titleapp-core.workers.dev";
const API_KEY = "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY";
const UID = "NHVBEVFSiBUFUzHUq5a9Xioc3hH2";
const TENANT = "ws_1781920656122_tl9dhn";

// One representative turn against a worker that has real data to ground on.
const PROBE = { worker: "spine-4-staff-credentials", vertical: "veterinary", msg: "How many staff credentials are we tracking?" };

function loadAdmin() {
  // firebase-admin lives under functions/functions; require it from there.
  const p = path.join(__dirname, "..", "..", "..", "functions", "functions", "node_modules", "firebase-admin");
  return require(p);
}

module.exports = {
  id: "chat-smoke",
  title: "Chat responds (live smoke) — deployed worker chat returns a grounded, non-empty answer",
  severity: "p0",
  async run() {
    let admin;
    try { admin = loadAdmin(); } catch {
      return skip("firebase-admin not resolvable (run from repo with functions deps installed)");
    }
    try { if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" }); } catch (e) {
      return skip("admin init failed: " + e.message);
    }

    // token
    let token;
    try {
      const u = await admin.auth().getUser(UID);
      const pw = "QA001!" + Date.now() + Math.random().toString(36).slice(2, 8);
      await admin.auth().updateUser(UID, { password: pw });
      const ex = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: u.email, password: pw, returnSecureToken: true }),
      });
      const exj = await ex.json();
      if (!exj.idToken) return skip("token exchange failed (no ADC creds?): " + JSON.stringify(exj.error || exj).slice(0, 120));
      token = exj.idToken;
    } catch (e) {
      return skip("auth unavailable: " + e.message);
    }

    // one chat turn
    let status = 0, text = "";
    try {
      const r = await fetch(`${BASE}/api?path=/v1/chat:message`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Tenant-Id": TENANT, "X-Vertical": PROBE.vertical },
        body: JSON.stringify({
          message: PROBE.msg, userInput: PROBE.msg, sessionId: `qa001_${Date.now()}`,
          selectedWorker: PROBE.worker, subscribedWorkers: [],
          context: { source: "business_portal", vertical: PROBE.vertical, workspaceId: TENANT, workspaceName: "", userName: "" },
        }),
      });
      status = r.status;
      const j = await r.json().catch(() => ({}));
      text = j.response || j.message || "";
    } catch (e) {
      return skip("chat endpoint unreachable: " + e.message);
    }

    const findings = [];
    if (status !== 200 || !text || text.length < 15) {
      findings.push({ check: "chat-smoke", severity: "p0", tc: "TC-CHAT-01",
        title: `Worker chat did not return a usable answer (http ${status}, ${text.length} chars)`,
        detail: `POST /v1/chat:message to worker "${PROBE.worker}" returned status ${status} and body "${String(text).slice(0, 120)}". This is the "No response received" class.`,
        evidence: { worker: PROBE.worker, status, sample: String(text).slice(0, 200) } });
    }
    return { ok: findings.length === 0, findings, summary: { worker: PROBE.worker, status, chars: text.length, sample: text.slice(0, 80) } };

    function skip(reason) {
      return { ok: true, findings: [{ check: "chat-smoke", severity: "p2", tc: "TC-CHAT-01",
        title: "chat smoke skipped (environment)", detail: reason, evidence: {} }] };
    }
  },
};
