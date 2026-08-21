"use strict";
// seedTenantLease.js — seeds a real lease + maintenance history for the
// merged title/RE product's tenant customer portal (Sara Kahele, Merritt
// Capital Group, Unit 214 — matches ClientPortal.jsx's "tenant" persona and
// the re-tenant demo uid). Backs GET /v1/tenant:customer:lease for real,
// entitlement-checked data instead of the portal's scripted fixtures.
//
// Idempotent — safe to run more than once (uses a fixed doc id).
//
// Run from functions/functions/:
//   node scripts/demo/seedTenantLease.js
const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const TENANT_ID = "ws_1783659066844_o7m1pm"; // Merritt Capital Group (operator tenant)
const LEASE_ID = "lease-merritt-214";
const RESIDENT_UID = "sara-kahele-demo";

const daysAgo = (n) => admin.firestore.Timestamp.fromMillis(Date.parse("2026-08-20T12:00:00Z") - n * 86400000);

(async () => {
  console.log("═══ seedTenantLease.js ═══\n");

  await db.collection("leases").doc(LEASE_ID).set({
    tenantId: TENANT_ID,
    uid: RESIDENT_UID,
    residentName: "Sara Kahele",
    residentEmail: null, // demo persona — matches uid, no real email (same pattern as title-client)
    propertyName: "Lakeview Commons",
    unitLabel: "Unit 214",
    rentAmountCents: 185000,
    rentDueDay: 1,
    leaseStart: "2026-06-01",
    leaseEnd: "2027-05-31",
    securityDepositCents: 185000,
    paidThroughDate: "2026-09-01",
    status: "active",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`  ✓ leases/${LEASE_ID} — Sara Kahele, Unit 214, Lakeview Commons`);

  const requests = [
    { id: "req-001", category: "Plumbing", description: "Kitchen faucet dripping steadily, worse at night.", status: "resolved", createdAt: daysAgo(52), resolvedAt: daysAgo(50) },
    { id: "req-002", category: "HVAC", description: "AC filter due for replacement — musty smell when running.", status: "resolved", createdAt: daysAgo(18), resolvedAt: daysAgo(16) },
  ];
  for (const r of requests) {
    const { id, ...data } = r;
    await db.collection("leases").doc(LEASE_ID).collection("maintenanceRequests").doc(id).set(data, { merge: true });
    console.log(`  ✓ leases/${LEASE_ID}/maintenanceRequests/${id} — ${r.category}: ${r.status}`);
  }

  console.log("\n═══ Done ═══");
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
