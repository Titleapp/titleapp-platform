// One-off verification script (NOT part of the app) for the new education
// self-serve onboarding path. Mirrors the pattern in
// scripts/mintQaPersonaTokens.js: creates a REAL throwaway Firebase Auth user
// via Identity Toolkit signUp (gets a real idToken back directly, no
// iam.serviceAccounts.signBlob needed), then drives the REAL deployed
// POST /v1/workspaces and GET /v1/nursing:cohort routes over HTTPS exactly
// like the browser wizard does. Cleans up everything it creates at the end.
//
// Run from functions/functions so node_modules resolves firebase-admin:
//   cd functions/functions && node scripts/test/educationSelfServeOnboarding.js
//
// Verifies, end to end, against the REAL deployed prod API:
//   1. POST /v1/workspaces with vertical:"education" + workerIds for the two
//      real nursing worker slugs actually activates them immediately
//      (activeWorkers on the create response, and again on the follow-up
//      GET /v1/workspaces list) with the creator as admin.
//   2. GET /v1/nursing:cohort on the brand-new tenant returns a real (empty)
//      roster scoped to that tenant, not another tenant's data.
//   3. The same caller is REJECTED (403) when pointed at a real, unrelated
//      tenant (demo-uh-nursing) — cross-tenant FERPA scoping holds from the
//      moment of creation, not just for hand-seeded demo tenants.
// Cleans up the throwaway auth user + workspace + membership docs it
// creates; asserts no tenants/{id} doc was ever created by this path.
"use strict";
const admin = require("firebase-admin");
const https = require("https");

const WEB_API_KEY = "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY";
const PROJECT_ID = "title-app-alpha";
const API_BASE = "https://titleapp-frontdoor.titleapp-core.workers.dev";
// A real, existing OTHER tenant this throwaway user will NOT be a member of —
// used only to confirm cross-tenant isolation still holds on this new path.
const FOREIGN_TENANT_ID = "demo-uh-nursing";

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

function identityToolkit(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      { hostname: "identitytoolkit.googleapis.com", path: `${path}?key=${WEB_API_KEY}`, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function apiCall(method, path, { idToken, tenantId, body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (idToken) headers.Authorization = `Bearer ${idToken}`;
    if (tenantId) headers["X-Tenant-Id"] = tenantId;
    if (payload) headers["Content-Length"] = Buffer.byteLength(payload);
    const req = https.request(
      `${API_BASE}/api?path=${encodeURIComponent(path)}`,
      { method, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let parsed;
          try { parsed = JSON.parse(data); } catch (e) { parsed = { _raw: data }; }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const results = { steps: [] };
  const suffix = Math.random().toString(36).slice(2, 8);
  const email = `qa-education-onboard-${suffix}@sociii-qa.internal.test`;
  const password = `Qa-${Math.random().toString(36).slice(2)}-Test1!`;
  let uid, idToken, workspaceId;

  try {
    // 1. Create a REAL throwaway Firebase Auth user (real prod auth, isolated
    // by the sociii-qa.internal.test email domain).
    const signUp = await identityToolkit("/v1/accounts:signUp", { email, password, returnSecureToken: true });
    if (!signUp.idToken) throw new Error(`signUp failed: ${JSON.stringify(signUp)}`);
    uid = signUp.localId;
    idToken = signUp.idToken;
    results.steps.push({ step: "create_test_user", ok: true, uid, email });

    // 2. POST /v1/workspaces exactly like AddWorkspaceWizard.jsx's handleCreate,
    // vertical: 'education', workerIds for both real nursing worker slugs.
    const createResp = await apiCall("POST", "/v1/workspaces", {
      idToken,
      body: {
        vertical: "education",
        name: "QA TEST Riverside School of Nursing (DELETE ME)",
        tagline: "Automated onboarding verification — safe to delete",
        jurisdiction: "HI",
        onboardingComplete: false,
        type: "org",
        workerIds: ["nursing-education-001", "clinical-evaluation-001"],
      },
    });
    results.steps.push({ step: "create_workspace", status: createResp.status, body: createResp.body });
    if (!createResp.body.ok) throw new Error(`create_workspace failed: ${JSON.stringify(createResp.body)}`);
    workspaceId = createResp.body.workspace.id;
    const createdActiveWorkers = createResp.body.workspace.activeWorkers || [];
    const createHasBoth =
      createdActiveWorkers.includes("nursing-education-001") &&
      createdActiveWorkers.includes("clinical-evaluation-001");
    results.steps.push({ step: "create_workspace_activeWorkers_check", ok: createHasBoth, activeWorkers: createdActiveWorkers });

    // 3. GET /v1/workspaces (the list the real sidebar/hub renders from) —
    // confirm the workspace shows up with both real workers active and role admin.
    const listResp = await apiCall("GET", "/v1/workspaces", { idToken });
    const listedWs = (listResp.body.workspaces || []).find(w => w.id === workspaceId);
    const listHasBoth = !!listedWs &&
      (listedWs.activeWorkers || []).includes("nursing-education-001") &&
      (listedWs.activeWorkers || []).includes("clinical-evaluation-001");
    results.steps.push({
      step: "list_workspaces_check",
      ok: listHasBoth && listedWs.role === "admin",
      role: listedWs && listedWs.role,
      activeWorkers: listedWs && listedWs.activeWorkers,
    });

    // 4. GET /v1/nursing:cohort scoped to the NEW tenant — must succeed (admin
    // membership was created by createWorkspace()) and return an EMPTY, real
    // roster (no seeded students on a brand-new tenant), not another tenant's data.
    const cohortResp = await apiCall("GET", "/v1/nursing:cohort", { idToken, tenantId: workspaceId });
    results.steps.push({ step: "nursing_cohort_own_tenant", status: cohortResp.status, body: cohortResp.body });

    // 5. Cross-tenant isolation check — same user, same idToken, but pointed at
    // a REAL OTHER tenant they are not a member of. Must be rejected (403).
    const foreignResp = await apiCall("GET", "/v1/nursing:cohort", { idToken, tenantId: FOREIGN_TENANT_ID });
    results.steps.push({
      step: "nursing_cohort_foreign_tenant_rejected",
      ok: foreignResp.status === 403,
      status: foreignResp.status,
      body: foreignResp.body,
    });

    // 6. Also hit /v1/nursing:student for a nonexistent id on OUR tenant — should
    // 404 "not on this tenant's roster", never leak another tenant's student.
    const studentResp = await apiCall("GET", "/v1/nursing:student?id=does-not-exist", { idToken, tenantId: workspaceId });
    results.steps.push({ step: "nursing_student_own_tenant_404", status: studentResp.status, body: studentResp.body });

  } catch (e) {
    results.error = e.message;
  } finally {
    // ---- Cleanup: hard-delete everything this script created. ----
    const cleanup = {};
    try {
      if (workspaceId) {
        await db.collection("users").doc(uid).collection("workspaces").doc(workspaceId).delete();
        cleanup.workspaceDoc = "deleted";
      }
    } catch (e) { cleanup.workspaceDoc = `error: ${e.message}`; }
    try {
      if (uid && workspaceId) {
        const memSnap = await db.collection("memberships")
          .where("userId", "==", uid).where("tenantId", "==", workspaceId).get();
        await Promise.all(memSnap.docs.map(d => d.ref.delete()));
        cleanup.memberships = `deleted ${memSnap.size}`;
      }
    } catch (e) { cleanup.memberships = `error: ${e.message}`; }
    try {
      // Confirm no tenants/{workspaceId} doc was ever created by this flow
      // (createWorkspace() only writes users/{uid}/workspaces/{id} + memberships).
      if (workspaceId) {
        const tenantDoc = await db.collection("tenants").doc(workspaceId).get();
        cleanup.tenantsDocExisted = tenantDoc.exists;
        if (tenantDoc.exists) await db.collection("tenants").doc(workspaceId).delete();
      }
    } catch (e) { cleanup.tenantsDocCheck = `error: ${e.message}`; }
    try {
      if (uid) {
        await admin.auth().deleteUser(uid);
        cleanup.authUser = "deleted";
      }
    } catch (e) { cleanup.authUser = `error: ${e.message}`; }
    results.cleanup = cleanup;
    console.log(JSON.stringify(results, null, 2));
  }
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
