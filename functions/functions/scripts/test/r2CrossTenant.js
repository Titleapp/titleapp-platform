"use strict";
/**
 * r2CrossTenant.js — Surface 1 / R2 live cross-tenant isolation test.
 *
 * Seeds two tenants + two users (userA ∈ tenantA, userB ∈ tenantB, A ∉ B),
 * mints real Firebase ID tokens, and hits the DEPLOYED api function to prove:
 *   1. a member can edit their own tenant's worker overlay        → 200
 *   2. a NON-member is blocked from another tenant's overlay      → 403  (R2)
 *   3. a NON-member is blocked from another tenant's workers:list → 403  (R2)
 *   4. tenant A's overlay exists only in A's space; B sees none   → isolation
 *   5. clear reverts A to base                                    → 200
 * Cleans up all test records at the end.
 *
 * Run from functions/functions:  node scripts/test/r2CrossTenant.js
 */
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const FV = admin.firestore.FieldValue;

const API_KEY = "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY";
const API_BASE = "https://api-feyfibglbq-uc.a.run.app";

const TA = "r2test_tenantA", TB = "r2test_tenantB";
const SLUG = "r2test-worker-001";
const PW = "R2testPass!2026";
// uids are assigned by Firebase Auth on sign-up (filled in during setup).
let UA = null, UB = null, tokA = null, tokB = null;

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`  ✅ ${name}`); pass++; }
  else { console.log(`  ❌ ${name} — ${detail || ""}`); fail++; }
}

// Create-or-sign-in a real email/password user via Identity Toolkit REST.
// Returns { uid, idToken } using only the web API key (no service-account signing).
async function signUpOrIn(email, password) {
  let r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  let j = await r.json();
  if (j.error && (j.error.message === "EMAIL_EXISTS" || /EMAIL_EXISTS/.test(j.error.message || ""))) {
    r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    j = await r.json();
  }
  if (!j.idToken) throw new Error("auth failed: " + JSON.stringify(j));
  return { uid: j.localId, idToken: j.idToken };
}
async function api(path, token, { method = "GET", body, tenantId } = {}) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  if (tenantId) headers["x-tenant-id"] = tenantId;
  const r = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: r.status, json };
}

async function setup() {
  const a = await signUpOrIn("r2a@test.sociii.ai", PW);
  const b = await signUpOrIn("r2b@test.sociii.ai", PW);
  UA = a.uid; tokA = a.idToken;
  UB = b.uid; tokB = b.idToken;
  await db.doc(`tenants/${TA}`).set({ name: "R2 Test A" }, { merge: true });
  await db.doc(`tenants/${TB}`).set({ name: "R2 Test B" }, { merge: true });
  // userA ∈ tenantA, userB ∈ tenantB, userA ∉ tenantB (the isolation boundary).
  await db.doc(`memberships/r2test_${UA}_${TA}`).set({ userId: UA, tenantId: TA, role: "admin", status: "active", createdAt: FV.serverTimestamp() });
  await db.doc(`memberships/r2test_${UB}_${TB}`).set({ userId: UB, tenantId: TB, role: "admin", status: "active", createdAt: FV.serverTimestamp() });
  await db.doc(`digitalWorkers/${SLUG}`).set({ slug: SLUG, name: "R2 Test Worker", display_name: "R2 Test Worker", raas_tier_1: ["BASE RULE"], status: "live" }, { merge: true });
}

async function cleanup() {
  if (UA) await db.doc(`memberships/r2test_${UA}_${TA}`).delete().catch(() => {});
  if (UB) await db.doc(`memberships/r2test_${UB}_${TB}`).delete().catch(() => {});
  await db.doc(`tenants/${TA}/workerOverlays/${SLUG}`).delete().catch(() => {});
  await db.doc(`tenants/${TA}`).delete().catch(() => {});
  await db.doc(`tenants/${TB}`).delete().catch(() => {});
  await db.doc(`digitalWorkers/${SLUG}`).delete().catch(() => {});
  if (UA) await admin.auth().deleteUser(UA).catch(() => {});
  if (UB) await admin.auth().deleteUser(UB).catch(() => {});
}

(async () => {
  console.log("\n=== Surface 1 / R2 live cross-tenant isolation test ===\n");
  await setup();

  console.log("Test 1 — member edits OWN tenant's overlay (expect 200):");
  const t1 = await api("/v1/worker:overlay:set", tokA, { method: "POST", tenantId: TA, body: { tenantId: TA, slug: SLUG, overlay: { raas_tier_1: ["MY RULE: tenant A only"] } } });
  check("userA sets overlay on tenantA → 200 ok", t1.status === 200 && t1.json.ok === true, `got ${t1.status} ${JSON.stringify(t1.json)}`);

  console.log("Test 2 — NON-member edits OTHER tenant's overlay (expect 403) [THE R2 TEST]:");
  const t2 = await api("/v1/worker:overlay:set", tokA, { method: "POST", tenantId: TB, body: { tenantId: TB, slug: SLUG, overlay: { raas_tier_1: ["EVIL: cross-tenant write"] } } });
  check("userA sets overlay on tenantB → 403 blocked", t2.status === 403, `got ${t2.status} ${JSON.stringify(t2.json)}`);

  console.log("Test 3 — NON-member lists OTHER tenant's workers (expect 403):");
  const t3 = await api("/v1/workers:list", tokA, { method: "GET", tenantId: TB });
  check("userA workers:list on tenantB → 403 blocked", t3.status === 403, `got ${t3.status} ${JSON.stringify(t3.json)}`);

  console.log("Test 4 — isolation: A's overlay exists only in A's space:");
  const t4a = await api(`/v1/worker:overlay?tenantId=${TA}&slug=${SLUG}`, tokA, { method: "GET", tenantId: TA });
  check("tenantA overlay present (MY RULE)", t4a.status === 200 && t4a.json.overlay && JSON.stringify(t4a.json.overlay).includes("MY RULE"), `got ${t4a.status} ${JSON.stringify(t4a.json)}`);
  const t4b = await api(`/v1/worker:overlay?tenantId=${TB}&slug=${SLUG}`, tokB, { method: "GET", tenantId: TB });
  check("tenantB overlay absent (null) — unaffected by A", t4b.status === 200 && t4b.json.overlay === null, `got ${t4b.status} ${JSON.stringify(t4b.json)}`);

  console.log("Test 5 — member clears OWN overlay (rollback, expect 200):");
  const t5 = await api("/v1/worker:overlay:clear", tokA, { method: "POST", tenantId: TA, body: { tenantId: TA, slug: SLUG } });
  check("userA clears overlay on tenantA → 200 reverted", t5.status === 200 && t5.json.reverted === true, `got ${t5.status} ${JSON.stringify(t5.json)}`);

  console.log("\nCleaning up test records...");
  await cleanup();

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error("TEST ERROR:", e); cleanup().finally(() => process.exit(1)); });
