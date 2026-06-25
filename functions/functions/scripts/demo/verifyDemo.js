// Demo health-check — run before any recording session to confirm every Meadow
// Creek worker has real, tenant-scoped, temporally-correct data in Firestore.
// Read-only. Exit code 1 if anything is red.
//
//   node scripts/demo/verifyDemo.js
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const T = "ws_1781920656122_tl9dhn";

let red = 0;
const ok = (cond, label, detail = "") => {
  console.log((cond ? "✅" : "❌"), label.padEnd(40), detail);
  if (!cond) red++;
};
const cnt = async (coll, field = "tenantId", val = T) => {
  try { return (await db.collection(coll).where(field, "==", val).limit(1000).get()).size; }
  catch (e) { return -1; }
};

(async () => {
  console.log("DEMO HEALTH-CHECK · Meadow Creek Veterinary ·", new Date().toISOString().slice(0, 10), "\n");

  // Workspace identity
  const t = await db.collection("tenants").doc(T).get();
  ok(t.exists && t.data().name === "Meadow Creek Veterinary Clinic", "tenant.name anchored", t.data()?.name || "");
  ok(t.exists && !!t.data().fiscalYearStart, "accounting fiscal year set", t.data()?.fiscalYearStart || "");

  // Vet dosing
  const orders = await db.collection("dosing_orders").where("tenantId", "==", T).get();
  const proposed = orders.docs.filter(d => d.data().status === "proposed" || d.data().proposed).length;
  ok(orders.size >= 10, "vet · dosing orders", `${orders.size} orders`);
  ok(await cnt("protocol_library") >= 4, "vet · protocols", "");

  // Edu
  ok(await cnt("course_enrollments") >= 5, "edu · students", "");
  ok(await cnt("curriculum_modules") >= 8, "edu · curriculum modules", "");

  // Spine-4 credentials — TEMPORAL checks (Alex OSHA still overdue, DEA still soon)
  const staff = await db.collection("staff_credentials").where("tenantId", "==", T).get();
  let oshaOverdue = false, deaSoon = false;
  staff.forEach(d => (d.data().credentials || []).forEach(c => {
    if (c.credential_name && c.credential_name.includes("OSHA") && c.status === "overdue" && (d.data().full_name || "").includes("Alex")) oshaOverdue = true;
    if (c.credential_name && c.credential_name.includes("DEA Controlled") && c.status === "expiring_soon") deaSoon = true;
  }));
  ok(staff.size === 5, "spine-4 · staff count", `${staff.size}`);
  ok(oshaOverdue, "spine-4 · Alex OSHA still OVERDUE today", "");
  ok(deaSoon, "spine-4 · DEA still expiring-soon today", "");

  // Accounting — recompute setup completeness + dashboard
  const tx = await db.collection("transactions").where("tenantId", "==", T).get();
  const committed = tx.docs.filter(d => d.data().status === "committed");
  const categorized = tx.docs.filter(d => d.data().coaAccountId).length;
  const months = new Set(tx.docs.filter(d => d.data().date).map(d => String(d.data().date).slice(0, 7)));
  const coa = await cnt("coaAccounts");
  ok(coa > 5, "accounting · chart of accounts (>5)", `${coa}`);
  ok(categorized >= 30, "accounting · ≥30 categorized txns", `${categorized}`);
  ok(months.size >= 5, "accounting · ≥5 months history", `${months.size}`);
  try {
    const { computeSummary } = require("../../services/accounting/dashboardSummary");
    const s = await computeSummary({ tenantId: T });
    ok(s.cashOnHand?.cents > 0 && s.avgMonthlyBurn?.cents > 0, "accounting · dashboard computes", `cash $${(s.cashOnHand.cents/100).toLocaleString()} · burn $${(s.avgMonthlyBurn.cents/100).toLocaleString()}`);
  } catch (e) { ok(false, "accounting · dashboard computes", e.message); }

  // Marketing + contacts
  ok(await cnt("campaigns") >= 4, "marketing · campaigns", "");
  ok(await cnt("contacts") >= 50, "contacts · clients", "");

  // HR — via the live service (post-tenant-scope fix)
  try {
    const people = require("../../services/hr/people");
    const roster = await people.listPeople(T);
    ok(roster.summary.humans === 5 && roster.summary.advisors === 0, "hr · roster (5 staff, 0 advisor leak)", JSON.stringify(roster.summary));
    const comp = await people.getComplianceStatus(T);
    const hasOsha = comp.obligations.some(o => /OSHA/i.test(o.action) && o.severity === "hard_stop");
    ok(hasOsha, "hr · compliance shows OSHA hard-stop", `${comp.obligationsCount} obligations`);
  } catch (e) { ok(false, "hr · service", e.message); }

  // Drive — statements + HR docs
  const drive = await db.collection("storageObjects").where("orgId", "==", T).get();
  const statements = drive.docs.filter(d => /Business Card Statement/.test(d.data().filename || "")).length;
  const hrDocs = drive.docs.filter(d => d.data().createdByWorker === "platform-hr").length;
  ok(statements >= 1, "drive · credit-card statements", `${statements}`);
  ok(hrDocs >= 1, "drive · HR documents", `${hrDocs}`);

  console.log("\n" + (red === 0 ? "🟢 ALL GREEN — demo is recording-ready." : `🔴 ${red} red — fix before recording.`));
  process.exit(red === 0 ? 0 : 1);
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
