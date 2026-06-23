"use strict";
/**
 * s3FixLoop.js — Surface 3 (Alex-dispatches-Code) live consent-gate test.
 *
 * Proves the propose → approve → apply flow against the DEPLOYED api:
 *   1. member proposes a change                 → 200 pending, NOT yet applied
 *   2. NON-member proposes on other tenant      → 403 (gate)
 *   3. proposal is listed as pending
 *   4. member approves                          → change goes LIVE (overlay applied)
 *   5. re-approve same proposal                 → rejected ("already approved")
 *   6. propose + REJECT                         → not applied (overlay unchanged)
 * Self-cleaning. Run from functions/functions: node scripts/test/s3FixLoop.js
 */
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const FV = admin.firestore.FieldValue;

const API_KEY = "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY";
const API_BASE = "https://api-feyfibglbq-uc.a.run.app";
const TA = "s3test_tenantA", TB = "s3test_tenantB", SLUG = "s3test-worker-001";
const PW = "S3testPass!2026";
let UA = null, UB = null, tokA = null, tokB = null;

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`  ✅ ${name}`); pass++; }
  else { console.log(`  ❌ ${name} — ${detail || ""}`); fail++; }
}
async function signUpOrIn(email, password) {
  let r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }) });
  let j = await r.json();
  if (j.error && /EMAIL_EXISTS/.test(j.error.message || "")) {
    r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }) });
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
async function overlayRules(token, tenantId) {
  const r = await api(`/v1/worker:overlay?tenantId=${tenantId}&slug=${SLUG}`, token, { method: "GET", tenantId });
  return r.json.overlay && r.json.overlay.raas_tier_1;
}
async function setup() {
  const a = await signUpOrIn("s3a@test.sociii.ai", PW); UA = a.uid; tokA = a.idToken;
  const b = await signUpOrIn("s3b@test.sociii.ai", PW); UB = b.uid; tokB = b.idToken;
  await db.doc(`tenants/${TA}`).set({ name: "S3 Test A" }, { merge: true });
  await db.doc(`tenants/${TB}`).set({ name: "S3 Test B" }, { merge: true });
  await db.doc(`memberships/s3test_${UA}_${TA}`).set({ userId: UA, tenantId: TA, role: "admin", status: "active", createdAt: FV.serverTimestamp() });
  await db.doc(`memberships/s3test_${UB}_${TB}`).set({ userId: UB, tenantId: TB, role: "admin", status: "active", createdAt: FV.serverTimestamp() });
  await db.doc(`digitalWorkers/${SLUG}`).set({ slug: SLUG, name: "S3 Test Worker", display_name: "S3 Test Worker", raas_tier_1: ["BASE RULE"], status: "live" }, { merge: true });
}
async function cleanup() {
  if (UA) await db.doc(`memberships/s3test_${UA}_${TA}`).delete().catch(() => {});
  if (UB) await db.doc(`memberships/s3test_${UB}_${TB}`).delete().catch(() => {});
  for (const c of ["workerOverlays", "workerChangeProposals"]) {
    const snap = await db.collection(`tenants/${TA}/${c}`).get().catch(() => ({ docs: [] }));
    for (const d of snap.docs) await d.ref.delete().catch(() => {});
  }
  await db.doc(`tenants/${TA}`).delete().catch(() => {});
  await db.doc(`tenants/${TB}`).delete().catch(() => {});
  await db.doc(`digitalWorkers/${SLUG}`).delete().catch(() => {});
  if (UA) await admin.auth().deleteUser(UA).catch(() => {});
  if (UB) await admin.auth().deleteUser(UB).catch(() => {});
}

(async () => {
  console.log("\n=== Surface 3 (Alex-fix-loop) live consent-gate test ===\n");
  await setup();

  console.log("Test 1 — member proposes a change (expect 200 pending, NOT applied):");
  const t1 = await api("/v1/worker:change:propose", tokA, { method: "POST", tenantId: TA, body: { tenantId: TA, slug: SLUG, overlay: { raas_tier_1: ["FIXED RULE: be more cautious"] }, rationale: "Worker was too aggressive" } });
  check("propose → 200 pending + summary", t1.status === 200 && t1.json.status === "pending" && Array.isArray(t1.json.summary), `got ${t1.status} ${JSON.stringify(t1.json)}`);
  const proposalId = t1.json.proposalId;
  const r1 = await overlayRules(tokA, TA);
  check("NOT yet applied (overlay still base/absent)", !r1 || !JSON.stringify(r1).includes("FIXED RULE"), `overlay=${JSON.stringify(r1)}`);

  console.log("Test 2 — NON-member proposes on other tenant (expect 403):");
  const t2 = await api("/v1/worker:change:propose", tokA, { method: "POST", tenantId: TB, body: { tenantId: TB, slug: SLUG, overlay: { raas_tier_1: ["EVIL"] } } });
  check("cross-tenant propose → 403", t2.status === 403, `got ${t2.status} ${JSON.stringify(t2.json)}`);

  console.log("Test 3 — pending proposal is listed:");
  const t3 = await api(`/v1/worker:changes?tenantId=${TA}&slug=${SLUG}`, tokA, { method: "GET", tenantId: TA });
  check("changes list includes the pending proposal", t3.status === 200 && t3.json.proposals.some((p) => p.id === proposalId), `got ${JSON.stringify(t3.json)}`);

  console.log("Test 4 — member approves → change goes LIVE:");
  const t4 = await api("/v1/worker:change:approve", tokA, { method: "POST", tenantId: TA, body: { tenantId: TA, proposalId } });
  check("approve → 200 approved", t4.status === 200 && t4.json.status === "approved", `got ${t4.status} ${JSON.stringify(t4.json)}`);
  const r4 = await overlayRules(tokA, TA);
  check("overlay NOW applied (FIXED RULE live)", JSON.stringify(r4).includes("FIXED RULE"), `overlay=${JSON.stringify(r4)}`);

  console.log("Test 5 — re-approve same proposal (expect rejected):");
  const t5 = await api("/v1/worker:change:approve", tokA, { method: "POST", tenantId: TA, body: { tenantId: TA, proposalId } });
  check("double-approve blocked", t5.json.ok === false && /already approved/.test(t5.json.error || ""), `got ${JSON.stringify(t5.json)}`);

  console.log("Test 6 — propose then REJECT (expect not applied):");
  const t6a = await api("/v1/worker:change:propose", tokA, { method: "POST", tenantId: TA, body: { tenantId: TA, slug: SLUG, overlay: { raas_tier_1: ["REJECTED RULE"] } } });
  const t6b = await api("/v1/worker:change:reject", tokA, { method: "POST", tenantId: TA, body: { tenantId: TA, proposalId: t6a.json.proposalId, reason: "not what I meant" } });
  check("reject → 200 rejected", t6b.status === 200 && t6b.json.status === "rejected", `got ${t6b.status} ${JSON.stringify(t6b.json)}`);
  const r6 = await overlayRules(tokA, TA);
  check("overlay unchanged by reject (still FIXED RULE, not REJECTED)", JSON.stringify(r6).includes("FIXED RULE") && !JSON.stringify(r6).includes("REJECTED RULE"), `overlay=${JSON.stringify(r6)}`);

  console.log("\nCleaning up...");
  await cleanup();
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error("TEST ERROR:", e); cleanup().finally(() => process.exit(1)); });
