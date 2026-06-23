"use strict";
/**
 * s4TamperHole.js — Surface 4 T5 live test: tamper-evidence preserved on valuation.
 *
 * Seeds a vehicle DTC with a real contentHash (the Bitcoin-anchor leaf), calls
 * dtc:refresh-value against the DEPLOYED api, and proves:
 *   1. metadata (the HASHED canonical content) is UNCHANGED
 *   2. contentHash still verifies (re-derived == stored == original) — anchor intact
 *   3. the live value moved into the non-hashed `currentValue` field
 *   4. an append-only valuation_update logbook entry was written
 *   5. net-worth (wallet:assets) reflects the live currentValue, not the stale base
 * Self-cleaning. Run from functions/functions: node scripts/test/s4TamperHole.js
 */
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const { contentHash } = require("../../services/anchor/hashAnchor");

const API_KEY = "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY";
const API_BASE = "https://api-feyfibglbq-uc.a.run.app";
const PW = "S4tamper!2026";
const DTC_ID = "s4tamper-dtc-001";
let UA = null, tokA = null;

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`  ✅ ${name}`); pass++; } else { console.log(`  ❌ ${name} — ${detail || ""}`); fail++; }
}
async function signUpOrIn(email, password) {
  let r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  let j = await r.json();
  if (j.error && /EMAIL_EXISTS/.test(j.error.message || "")) {
    r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
    j = await r.json();
  }
  if (!j.idToken) throw new Error("auth failed: " + JSON.stringify(j));
  return { uid: j.localId, idToken: j.idToken };
}
async function api(path, token, { method = "GET", body, tenantId } = {}) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  if (tenantId) headers["x-tenant-id"] = tenantId;
  const r = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t }; }
  return { status: r.status, json: j };
}

// The canonical record (exactly the fields hashAnchor hashes).
function buildRecord(uid) {
  return {
    userId: uid, tenantId: "vault", type: "vehicle",
    metadata: { vin: "TESTVIN1234567890", value: 30000, title: "Test Car", make: "Tesla", model: "3" },
    fileIds: [], version: 1, createdAt: "2026-06-01T00:00:00.000Z",
  };
}

async function setup() {
  const a = await signUpOrIn("s4tamper@test.sociii.ai", PW); UA = a.uid; tokA = a.idToken;
  const rec = buildRecord(UA);
  const ch = contentHash(rec);
  await db.collection("dtcs").doc(DTC_ID).set({ ...rec, contentHash: ch });
  return ch;
}
async function cleanup() {
  await db.collection("dtcs").doc(DTC_ID).delete().catch(() => {});
  const lb = await db.collection("logbookEntries").where("dtcId", "==", DTC_ID).get().catch(() => ({ docs: [] }));
  for (const d of lb.docs) await d.ref.delete().catch(() => {});
  if (UA) await admin.auth().deleteUser(UA).catch(() => {});
}

(async () => {
  console.log("\n=== Surface 4 T5 live tamper-evidence test ===\n");
  const originalHash = await setup();
  console.log("  seeded DTC: metadata.value=30000, contentHash=" + originalHash.slice(0, 16) + "…");

  const refresh = await api("/v1/dtc:refresh-value", tokA, { method: "POST", tenantId: "vault", body: { dtcId: DTC_ID } });
  console.log("  refresh:", refresh.status, "newValue=" + (refresh.json.newValue));
  check("refresh succeeded", refresh.status === 200 && refresh.json.ok === true, JSON.stringify(refresh.json));

  const after = (await db.collection("dtcs").doc(DTC_ID).get()).data();
  check("metadata.value UNCHANGED (still 30000)", after.metadata.value === 30000, `got ${after.metadata.value}`);
  check("stored contentHash UNCHANGED", after.contentHash === originalHash, `got ${after.contentHash}`);

  // Re-derive the hash over the canonical fields of the post-refresh record.
  const rederived = contentHash({ userId: after.userId, tenantId: after.tenantId, type: after.type, metadata: after.metadata, fileIds: after.fileIds, version: after.version, createdAt: after.createdAt });
  check("re-derived contentHash still verifies (anchor intact)", rederived === originalHash, `rederived ${rederived.slice(0,16)} vs ${originalHash.slice(0,16)}`);

  check("live value moved to non-hashed currentValue", typeof after.currentValue === "number" && after.currentValue !== 30000, `currentValue=${after.currentValue}`);

  const lb = await db.collection("logbookEntries").where("dtcId", "==", DTC_ID).where("entryType", "==", "valuation_update").get();
  check("append-only valuation_update logbook entry written", lb.size >= 1, `count=${lb.size}`);

  const assets = await api("/v1/wallet:assets", tokA, { method: "GET", tenantId: "vault" });
  check("net-worth uses live currentValue (not stale 30000)", assets.json.ok && assets.json.assets.vehicles.value === after.currentValue, `vehicles.value=${assets.json.assets && assets.json.assets.vehicles.value} currentValue=${after.currentValue}`);

  console.log("\nCleaning up...");
  await cleanup();
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error("TEST ERROR:", e); cleanup().finally(() => process.exit(1)); });
