"use strict";
/**
 * diagnoseContacts.js — S52.45 read-only. Groups the contacts collection by
 * tenantId and lists tenants + Sean's memberships so we can see exactly where
 * the contacts live (titleapp vs SOCIII) and what needs porting.
 */
const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

(async () => {
  // 1. contacts grouped by tenantId
  const snap = await db.collection("contacts").get();
  const byTenant = {};
  let investorCount = {};
  snap.forEach((d) => {
    const c = d.data();
    const t = c.tenantId || "(none)";
    byTenant[t] = (byTenant[t] || 0) + 1;
    const types = c.types_index || (c.type ? [c.type] : []);
    if (types.includes("investor")) investorCount[t] = (investorCount[t] || 0) + 1;
  });
  console.log(`\n=== contacts collection: ${snap.size} total docs ===`);
  Object.entries(byTenant).sort((a, b) => b[1] - a[1]).forEach(([t, n]) =>
    console.log(`  ${t.padEnd(28)} ${n} contacts  (${investorCount[t] || 0} investor)`));

  // 2. tenants
  const tSnap = await db.collection("tenants").get();
  console.log(`\n=== tenants (${tSnap.size}) ===`);
  tSnap.forEach((d) => {
    const t = d.data();
    console.log(`  ${d.id.padEnd(28)} name="${t.name || t.tenantName || ""}" vertical=${t.vertical || "-"}`);
  });

  // 3. Sean's memberships
  const mSnap = await db.collection("memberships").get();
  console.log(`\n=== memberships (${mSnap.size}) ===`);
  mSnap.forEach((d) => {
    const m = d.data();
    console.log(`  user=${(m.userId || m.uid || "").slice(0, 10)} tenant=${(m.tenantId || "").padEnd(24)} role=${m.role || "-"}`);
  });

  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
