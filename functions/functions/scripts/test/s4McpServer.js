"use strict";
/**
 * s4McpServer.js — Surface 4 T6 live test: the MCP server.
 *
 * Simulates an MCP client (Claude) against the DEPLOYED /v1/mcp endpoint:
 *   1. initialize        → protocolVersion + serverInfo
 *   2. tools/list        → discovers get_worker_overlay + propose_worker_change
 *   3. tools/call propose_worker_change → creates a PENDING proposal (governed),
 *      audited to auditLedger with via=mcp; NOT applied
 *   4. tools/call get_worker_overlay   → reads overlay (null = base)
 *   5. governance: the proposal still requires a HUMAN approve to go live, and
 *      MCP exposes no approve tool (human-only by design)
 *   6. tools/call on another tenant the user isn't a member of → not authorized
 * Self-cleaning. Run from functions/functions: node scripts/test/s4McpServer.js
 */
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const FV = admin.firestore.FieldValue;

const API_KEY = "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY";
const API_BASE = "https://api-feyfibglbq-uc.a.run.app";
const TA = "s4mcp_tenantA", TB = "s4mcp_tenantB", SLUG = "s4mcp-worker-001", PW = "S4mcp!2026";
let UA = null, tokA = null;

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`  ✅ ${name}`); pass++; }
  else { console.log(`  ❌ ${name} — ${detail || ""}`); fail++; }
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
// JSON-RPC call to the MCP endpoint
async function mcp(token, method, params, id = 1) {
  const r = await fetch(`${API_BASE}/v1/mcp`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: r.status, json };
}
async function setup() {
  const a = await signUpOrIn("s4mcp@test.sociii.ai", PW); UA = a.uid; tokA = a.idToken;
  await db.doc(`tenants/${TA}`).set({ name: "S4MCP A" }, { merge: true });
  await db.doc(`tenants/${TB}`).set({ name: "S4MCP B" }, { merge: true });
  await db.doc(`memberships/s4mcp_${UA}_${TA}`).set({ userId: UA, tenantId: TA, role: "admin", status: "active", createdAt: FV.serverTimestamp() });
  await db.doc(`digitalWorkers/${SLUG}`).set({ slug: SLUG, name: "S4MCP Worker", display_name: "S4MCP Worker", raas_tier_1: ["BASE"], status: "live" }, { merge: true });
}
async function cleanup() {
  if (UA) await db.doc(`memberships/s4mcp_${UA}_${TA}`).delete().catch(() => {});
  for (const c of ["workerOverlays", "workerChangeProposals"]) {
    const s = await db.collection(`tenants/${TA}/${c}`).get().catch(() => ({ docs: [] }));
    for (const d of s.docs) await d.ref.delete().catch(() => {});
  }
  const led = await db.collection("auditLedger").where("tenantId", "==", TA).get().catch(() => ({ docs: [] }));
  for (const d of led.docs) await d.ref.delete().catch(() => {});
  await db.doc(`tenants/${TA}`).delete().catch(() => {});
  await db.doc(`tenants/${TB}`).delete().catch(() => {});
  await db.doc(`digitalWorkers/${SLUG}`).delete().catch(() => {});
  if (UA) await admin.auth().deleteUser(UA).catch(() => {});
}

(async () => {
  console.log("\n=== Surface 4 T6 live MCP server test ===\n");
  await setup();

  console.log("1. initialize:");
  const init = await mcp(tokA, "initialize", { protocolVersion: "2025-06-18", capabilities: {} }, 1);
  console.log("   server:", JSON.stringify(init.json.result && init.json.result.serverInfo), "proto", init.json.result && init.json.result.protocolVersion);
  check("initialize returns serverInfo + protocolVersion", init.status === 200 && init.json.result && init.json.result.serverInfo && init.json.result.protocolVersion, JSON.stringify(init.json));

  console.log("2. tools/list:");
  const list = await mcp(tokA, "tools/list", {}, 2);
  const toolNames = (list.json.result && list.json.result.tools || []).map((t) => t.name);
  console.log("   tools:", toolNames.join(", "));
  check("discovers get_worker_overlay + propose_worker_change", toolNames.includes("get_worker_overlay") && toolNames.includes("propose_worker_change"), JSON.stringify(toolNames));
  check("does NOT expose an approve tool (human-only)", !toolNames.some((n) => /approve/i.test(n)), JSON.stringify(toolNames));

  console.log("3. tools/call propose_worker_change (governed, via MCP):");
  const call = await mcp(tokA, "tools/call", { name: "propose_worker_change", arguments: { tenantId: TA, slug: SLUG, overlay: { raas_tier_1: ["BASE", "MCP-PROPOSED: double-check dosage units"] }, rationale: "Claude noticed unit errors" } }, 3);
  const result = call.json.result || {};
  const payload = result.content && result.content[0] ? JSON.parse(result.content[0].text) : {};
  console.log("   →", result.isError ? `ERROR ${result.content[0].text}` : `proposalId ${payload.proposalId} status ${payload.status}`);
  check("propose via MCP → pending proposal", call.status === 200 && !result.isError && payload.status === "pending" && payload.proposalId, JSON.stringify(call.json));
  // not applied
  const ov = await db.doc(`tenants/${TA}/workerOverlays/${SLUG}`).get();
  check("NOT applied (no overlay yet — needs human approve)", !ov.exists, `overlay exists=${ov.exists}`);
  // audited with via=mcp
  const led = (await db.collection("auditLedger").where("tenantId", "==", TA).get()).docs.map((d) => d.data());
  check("invocation audited to auditLedger with via=mcp", led.some((e) => e.capabilityId === "workers.propose_change_v1" && e.meta && e.meta.via === "mcp" && e.isTestAnchor === false), `ledger=${JSON.stringify(led.map((e) => ({ c: e.capabilityId, v: e.meta && e.meta.via })))}`);

  console.log("4. tools/call get_worker_overlay (read):");
  const read = await mcp(tokA, "tools/call", { name: "get_worker_overlay", arguments: { tenantId: TA, slug: SLUG } }, 4);
  const rp = read.json.result && read.json.result.content ? JSON.parse(read.json.result.content[0].text) : {};
  check("read overlay → hasOverlay:false (base)", read.status === 200 && rp.hasOverlay === false, JSON.stringify(read.json));

  console.log("5. governance — human approves the MCP-proposed change → goes live:");
  const appr = await fetch(`${API_BASE}/v1/worker:change:approve`, { method: "POST", headers: { Authorization: `Bearer ${tokA}`, "Content-Type": "application/json", "x-tenant-id": TA }, body: JSON.stringify({ tenantId: TA, proposalId: payload.proposalId }) });
  const apprJson = await appr.json();
  const ov2 = await db.doc(`tenants/${TA}/workerOverlays/${SLUG}`).get();
  check("human approve applies the MCP proposal", apprJson.status === "approved" && ov2.exists, JSON.stringify(apprJson));

  console.log("6. tools/call on a tenant the user is NOT a member of → not authorized:");
  const xt = await mcp(tokA, "tools/call", { name: "get_worker_overlay", arguments: { tenantId: TB, slug: SLUG } }, 6);
  const xr = xt.json.result || {};
  check("cross-tenant MCP call → isError (not authorized)", xr.isError === true && /not authorized/i.test(xr.content[0].text), JSON.stringify(xt.json));

  console.log("\nCleaning up...");
  await cleanup();
  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error("TEST ERROR:", e); cleanup().finally(() => process.exit(1)); });
