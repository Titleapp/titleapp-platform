"use strict";
/**
 * s5AdvisorAffirm.js — Surface 5 live test: advisor affirm → DTC in personal Vault.
 *
 * Seeds a signed-but-unaffirmed advisor, signs in as that advisor, calls
 * /ir:advisor:step action=affirm_agreement against the DEPLOYED api, and proves:
 *   1. the agreement is minted as a REAL DTC in the advisor's PERSONAL Vault
 *      (dtcs, userId=advisor, type advisor_agreement) with a valid contentHash
 *   2. an append-only "affirmation" attestation logbook entry is written
 *   3. the advisor doc flips to affirmed + personalVaultDtcId
 *   4. the capability invocation is audited (auditLedger, ir.affirm_advisor_agreement_v1)
 *   5. re-affirming is idempotent (same DTC, no duplicate)
 * Self-cleaning. Run from functions/functions: node scripts/test/s5AdvisorAffirm.js
 */
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const { contentHash } = require("../../services/anchor/hashAnchor");

const API_KEY = "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY";
const API_BASE = "https://api-feyfibglbq-uc.a.run.app";
const PW = "S5advisor!2026";
const ADVISOR_ID = "s5test-advisor-001";
let UA = null, tokA = null;

let pass = 0, fail = 0;
function check(name, cond, detail) { if (cond) { console.log(`  ✅ ${name}`); pass++; } else { console.log(`  ❌ ${name} — ${detail || ""}`); fail++; } }
async function signUpOrIn(email, password) {
  let r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  let j = await r.json();
  if (j.error && /EMAIL_EXISTS/.test(j.error.message || "")) {
    r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
    j = await r.json();
  }
  if (!j.idToken) throw new Error("auth failed: " + JSON.stringify(j));
  return { uid: j.localId, idToken: j.idToken };
}
async function affirm(token) {
  const r = await fetch(`${API_BASE}/v1/ir:advisor:step`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "affirm_agreement", advisorId: ADVISOR_ID }) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t }; }
  return { status: r.status, json: j };
}
async function setup() {
  const a = await signUpOrIn("s5advisor@test.sociii.ai", PW); UA = a.uid; tokA = a.idToken;
  // A signed-but-not-affirmed advisor (post Dropbox Sign).
  await db.collection("advisors").doc(ADVISOR_ID).set({
    name: "Test Advisor", email: "s5advisor@test.sociii.ai",
    flowStep: "signature_complete", advisorVaultDocId: `advisor_${ADVISOR_ID}_req123`,
    advisorMetadata: { advisorName: "Test Advisor", equityPct: 0.25, vestingMonths: 24, cliffMonths: 6, advisorRole: "Technical Advisor", executedAt: "2026-06-20T00:00:00.000Z", signatureRequestId: "req123" },
  });
}
async function cleanup() {
  await db.collection("advisors").doc(ADVISOR_ID).delete().catch(() => {});
  if (UA) {
    const dt = await db.collection("dtcs").where("userId", "==", UA).get().catch(() => ({ docs: [] }));
    for (const d of dt.docs) {
      const lb = await db.collection("logbookEntries").where("dtcId", "==", d.id).get().catch(() => ({ docs: [] }));
      for (const l of lb.docs) await l.ref.delete().catch(() => {});
      await d.ref.delete().catch(() => {});
    }
    const led = await db.collection("auditLedger").where("userId", "==", UA).get().catch(() => ({ docs: [] }));
    for (const d of led.docs) await d.ref.delete().catch(() => {});
    await admin.auth().deleteUser(UA).catch(() => {});
  }
}

(async () => {
  console.log("\n=== Surface 5 live advisor-affirm test ===\n");
  await setup();

  const r1 = await affirm(tokA);
  console.log("  affirm:", r1.status, "dtcId=" + (r1.json.dtcId));
  check("affirm → 200 with a dtcId", r1.status === 200 && r1.json.ok && r1.json.dtcId, JSON.stringify(r1.json));
  const dtcId = r1.json.dtcId;

  const dtc = dtcId ? (await db.collection("dtcs").doc(dtcId).get()).data() : null;
  check("DTC minted in advisor's PERSONAL vault (userId + type)", dtc && dtc.userId === UA && dtc.type === "advisor_agreement" && dtc.tenantId === "vault", JSON.stringify(dtc && { u: dtc.userId, t: dtc.type, tn: dtc.tenantId }));
  // re-derive the content hash
  const rederived = dtc && contentHash({ userId: dtc.userId, tenantId: dtc.tenantId, type: dtc.type, metadata: dtc.metadata, fileIds: dtc.fileIds, version: dtc.version, createdAt: dtc.createdAt });
  check("DTC contentHash valid (anchorable)", dtc && dtc.contentHash && dtc.contentHash === rederived, `stored ${dtc && dtc.contentHash && dtc.contentHash.slice(0,12)} vs ${rederived && rederived.slice(0,12)}`);

  const aff = await db.collection("logbookEntries").where("dtcId", "==", dtcId).where("entryType", "==", "affirmation").get();
  check("append-only affirmation attestation written", aff.size >= 1, `count=${aff.size}`);

  const adv = (await db.collection("advisors").doc(ADVISOR_ID).get()).data();
  check("advisor doc flips to affirmed + personalVaultDtcId", adv.flowStep === "affirmed" && adv.personalVaultDtcId === dtcId && adv.affirmedBy === UA, JSON.stringify({ s: adv.flowStep, d: adv.personalVaultDtcId }));

  const led = (await db.collection("auditLedger").where("userId", "==", UA).get()).docs.map((d) => d.data());
  check("capability invocation audited (ir.affirm_advisor_agreement_v1)", led.some((e) => e.capabilityId === "ir.affirm_advisor_agreement_v1" && e.isTestAnchor === false), `ledger=${JSON.stringify(led.map((e) => e.capabilityId))}`);

  const r2 = await affirm(tokA);
  check("re-affirm is idempotent (same dtcId, alreadyAffirmed)", r2.json.dtcId === dtcId && (r2.json.alreadyAffirmed === true), JSON.stringify(r2.json));
  const dtcCount = (await db.collection("dtcs").where("userId", "==", UA).get()).size;
  check("no duplicate DTC on re-affirm", dtcCount === 1, `dtc count=${dtcCount}`);

  console.log("\nCleaning up...");
  await cleanup();
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error("TEST ERROR:", e); cleanup().finally(() => process.exit(1)); });
