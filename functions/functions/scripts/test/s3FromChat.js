"use strict";
/**
 * s3FromChat.js — Surface 3 T6: Alex GENERATES the change from natural language.
 *
 * Proves worker:change:fromChat against the DEPLOYED api:
 *   1. a plain-English instruction → a PENDING proposal with sensible fields
 *      (NOT applied yet), and the drafted rule reflects the instruction
 *   2. approving that proposal makes it go live (the full loop end-to-end)
 *   3. a non-member instruction on another tenant → 403
 *   4. a nonsense/irrelevant instruction → no_change (no proposal)
 * Self-cleaning. Run from functions/functions: node scripts/test/s3FromChat.js
 */
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const FV = admin.firestore.FieldValue;

const API_KEY = "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY";
const API_BASE = "https://api-feyfibglbq-uc.a.run.app";
const TA = "s3fc_tenantA", TB = "s3fc_tenantB", SLUG = "s3fc-worker-001";
const PW = "S3fcPass!2026";
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
async function setup() {
  const a = await signUpOrIn("s3fca@test.sociii.ai", PW); UA = a.uid; tokA = a.idToken;
  const b = await signUpOrIn("s3fcb@test.sociii.ai", PW); UB = b.uid; tokB = b.idToken;
  await db.doc(`tenants/${TA}`).set({ name: "S3FC A" }, { merge: true });
  await db.doc(`tenants/${TB}`).set({ name: "S3FC B" }, { merge: true });
  await db.doc(`memberships/s3fc_${UA}_${TA}`).set({ userId: UA, tenantId: TA, role: "admin", status: "active", createdAt: FV.serverTimestamp() });
  await db.doc(`memberships/s3fc_${UB}_${TB}`).set({ userId: UB, tenantId: TB, role: "admin", status: "active", createdAt: FV.serverTimestamp() });
  await db.doc(`digitalWorkers/${SLUG}`).set({
    slug: SLUG, name: "Student Eval Worker", display_name: "Student Eval Worker",
    description: "Evaluates nursing students.", status: "live",
    raas_tier_1: ["Be objective.", "Cite the rubric."],
  }, { merge: true });
}
async function cleanup() {
  if (UA) await db.doc(`memberships/s3fc_${UA}_${TA}`).delete().catch(() => {});
  if (UB) await db.doc(`memberships/s3fc_${UB}_${TB}`).delete().catch(() => {});
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
  console.log("\n=== Surface 3 T6 (Alex generates the change) live test ===\n");
  await setup();

  console.log("Test 1 — natural-language instruction → pending proposal (not applied):");
  const instr = "Make the worker always remind students to verify patient identity with two identifiers before any medication question.";
  const t1 = await api("/v1/worker:change:fromChat", tokA, { method: "POST", tenantId: TA, body: { tenantId: TA, slug: SLUG, instruction: instr } });
  console.log("    Alex:", t1.json.message);
  console.log("    drafted fields:", JSON.stringify((t1.json.summary || []).map((s) => s.field)));
  check("fromChat → 200 pending with a proposalId", t1.status === 200 && t1.json.status === "pending" && t1.json.proposalId, `got ${t1.status} ${JSON.stringify(t1.json)}`);
  check("drafted a rules/prompt change", Array.isArray(t1.json.summary) && t1.json.summary.some((s) => /raas_tier|systemPrompt/.test(s.field)), `summary=${JSON.stringify(t1.json.summary)}`);
  const draftText = JSON.stringify(t1.json.summary || []).toLowerCase();
  check("draft reflects the instruction (mentions identifier/identity/patient)", /identif|identity|patient|two/.test(draftText), `draft=${draftText.slice(0, 300)}`);
  // not applied yet
  const ov1 = await api(`/v1/worker:overlay?tenantId=${TA}&slug=${SLUG}`, tokA, { method: "GET", tenantId: TA });
  check("NOT applied yet (overlay absent)", ov1.json.overlay === null, `overlay=${JSON.stringify(ov1.json.overlay)}`);

  console.log("Test 2 — approve the AI-drafted proposal → goes live:");
  const t2 = await api("/v1/worker:change:approve", tokA, { method: "POST", tenantId: TA, body: { tenantId: TA, proposalId: t1.json.proposalId } });
  const ov2 = await api(`/v1/worker:overlay?tenantId=${TA}&slug=${SLUG}`, tokA, { method: "GET", tenantId: TA });
  check("approve → live (overlay now present)", t2.status === 200 && t2.json.status === "approved" && ov2.json.overlay !== null, `got ${t2.status} ${JSON.stringify(t2.json)} overlay=${JSON.stringify(ov2.json.overlay)}`);

  console.log("Test 3 — non-member instruction on other tenant → 403:");
  const t3 = await api("/v1/worker:change:fromChat", tokA, { method: "POST", tenantId: TB, body: { tenantId: TB, slug: SLUG, instruction: "change something" } });
  check("cross-tenant fromChat → 403", t3.status === 403, `got ${t3.status} ${JSON.stringify(t3.json)}`);

  console.log("Test 4 — irrelevant instruction → no_change (no proposal):");
  const t4 = await api("/v1/worker:change:fromChat", tokA, { method: "POST", tenantId: TA, body: { tenantId: TA, slug: SLUG, instruction: "what's the weather in Maui today?" } });
  check("irrelevant → no_change", t4.json.status === "no_change" && !t4.json.proposalId, `got ${JSON.stringify(t4.json)}`);

  console.log("\nCleaning up...");
  await cleanup();
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error("TEST ERROR:", e); cleanup().finally(() => process.exit(1)); });
