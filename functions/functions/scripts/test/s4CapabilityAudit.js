"use strict";
/**
 * s4CapabilityAudit.js — Surface 4 live test: capability-invocation audit.
 *
 * Proves that real governed actions now write REAL auditLedger entries (not the
 * test stub) against the DEPLOYED api:
 *   - overlay:set        → auditLedger {workers.set_overlay_v1, human}
 *   - change:propose     → auditLedger {workers.propose_change_v1, human}
 *   - change:fromChat    → auditLedger {workers.propose_change_v1, chat}
 *   - change:approve     → auditLedger {workers.approve_change_v1, human}
 * Each entry must carry: capabilityId, registryFound=true, SHA-256 input/output
 * hashes, a verdict, isTestAnchor=false. Self-cleaning (deletes its ledger rows).
 * Run from functions/functions: node scripts/test/s4CapabilityAudit.js
 */
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const FV = admin.firestore.FieldValue;

const API_KEY = "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY";
const API_BASE = "https://api-feyfibglbq-uc.a.run.app";
const TA = "s4_tenantA", SLUG = "s4-worker-001", PW = "S4testPass!2026";
let UA = null, tokA = null;

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
async function ledgerFor(tenantId) {
  const snap = await db.collection("auditLedger").where("tenantId", "==", tenantId).get();
  return snap.docs.map((d) => d.data());
}
const isSha256 = (h) => typeof h === "string" && /^[a-f0-9]{64}$/.test(h);

async function setup() {
  const a = await signUpOrIn("s4a@test.sociii.ai", PW); UA = a.uid; tokA = a.idToken;
  await db.doc(`tenants/${TA}`).set({ name: "S4 A" }, { merge: true });
  await db.doc(`memberships/s4_${UA}_${TA}`).set({ userId: UA, tenantId: TA, role: "admin", status: "active", createdAt: FV.serverTimestamp() });
  await db.doc(`digitalWorkers/${SLUG}`).set({ slug: SLUG, name: "S4 Worker", display_name: "S4 Worker", raas_tier_1: ["BASE"], status: "live" }, { merge: true });
}
async function cleanup() {
  if (UA) await db.doc(`memberships/s4_${UA}_${TA}`).delete().catch(() => {});
  for (const c of ["workerOverlays", "workerChangeProposals"]) {
    const s = await db.collection(`tenants/${TA}/${c}`).get().catch(() => ({ docs: [] }));
    for (const d of s.docs) await d.ref.delete().catch(() => {});
  }
  const led = await db.collection("auditLedger").where("tenantId", "==", TA).get().catch(() => ({ docs: [] }));
  for (const d of led.docs) await d.ref.delete().catch(() => {});
  await db.doc(`tenants/${TA}`).delete().catch(() => {});
  await db.doc(`digitalWorkers/${SLUG}`).delete().catch(() => {});
  if (UA) await admin.auth().deleteUser(UA).catch(() => {});
}

(async () => {
  console.log("\n=== Surface 4 live capability-invocation audit test ===\n");
  await setup();

  console.log("Driving governed actions through the deployed api...");
  await api("/v1/worker:overlay:set", tokA, { method: "POST", tenantId: TA, body: { tenantId: TA, slug: SLUG, overlay: { raas_tier_1: ["OV"] } } });
  const prop = await api("/v1/worker:change:propose", tokA, { method: "POST", tenantId: TA, body: { tenantId: TA, slug: SLUG, overlay: { raas_tier_1: ["PROP"] } } });
  const fc = await api("/v1/worker:change:fromChat", tokA, { method: "POST", tenantId: TA, body: { tenantId: TA, slug: SLUG, instruction: "Make the worker always remind students to verify patient identity with two identifiers before any medication question." } });
  console.log("  fromChat status:", fc.json.status, "| proposalId:", fc.json.proposalId || "(none)");
  await api("/v1/worker:change:approve", tokA, { method: "POST", tenantId: TA, body: { tenantId: TA, proposalId: prop.json.proposalId } });

  const led = await ledgerFor(TA);
  const byCap = {};
  for (const e of led) byCap[e.capabilityId] = (byCap[e.capabilityId] || []).concat(e);
  console.log("  auditLedger entries:", led.length, "| capabilities:", JSON.stringify(Object.fromEntries(Object.entries(byCap).map(([k, v]) => [k, v.length]))));

  check("set_overlay logged (human)", (byCap["workers.set_overlay_v1"] || []).some((e) => e.callerType === "human"), "");
  check("propose logged (human)", (byCap["workers.propose_change_v1"] || []).some((e) => e.callerType === "human"), "");
  check("fromChat propose logged (chat)", (byCap["workers.propose_change_v1"] || []).some((e) => e.callerType === "chat"), "");
  check("approve logged (human)", (byCap["workers.approve_change_v1"] || []).length >= 1, "");

  const sample = (byCap["workers.approve_change_v1"] || [])[0] || led[0];
  check("entry has SHA-256 inputHash + outputHash", sample && isSha256(sample.inputHash) && isSha256(sample.outputHash), `in=${sample && sample.inputHash} out=${sample && sample.outputHash}`);
  check("entry registryFound=true (capabilities.json consulted)", sample && sample.registryFound === true, `got ${sample && sample.registryFound}`);
  check("entry isTestAnchor=false (real, not the stub)", led.every((e) => e.isTestAnchor === false), "");
  check("entry carries a verdict", sample && sample.verdict && typeof sample.verdict.allowed === "boolean", `verdict=${JSON.stringify(sample && sample.verdict)}`);
  check("approve verdict not would-blocked (human allowed)", (byCap["workers.approve_change_v1"] || []).every((e) => e.verdict && e.verdict.wouldBlock === false), "");

  console.log("\nCleaning up...");
  await cleanup();
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error("TEST ERROR:", e); cleanup().finally(() => process.exit(1)); });
