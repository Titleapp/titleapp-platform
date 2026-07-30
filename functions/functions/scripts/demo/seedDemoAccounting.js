// Seed DEMO SPACE as MEADOW CREEK VETERINARY CLINIC — 5 months of accounting history
// (Feb–Jun 2026) with coaAccountId on every transaction so the dashboard computes.
// Idempotent: clears prior demo:true rows, then re-inserts.
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const TENANT = "ws_1781920656122_tl9dhn"; // DEMO SPACE
const cents = (dollars) => Math.round(dollars * 100);
const d = (y, m, day) => `${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

// Classification → COA account name lookup
const COA_MAP = {
  exams:       "Office Visits & Exams",
  surgery:     "Surgery & Procedures",
  wellness:    "Vaccinations & Wellness",
  pharmacy:    "Pharmacy Dispensing",
  diagnostics_rev: "Diagnostics Revenue",
  dental:      "Dental Procedures",
  boarding:    "Boarding & Grooming revenue",
  payroll:     "Payroll & Labor",
  rent:        "Rent & Occupancy",
  supplies:    "Veterinary Supplies",
  equipment:   "Equipment & Leases",
  utilities:   "Utilities expense",
  software:    "Software & Subscriptions expense",
  diagnostics: "Outside Lab & Diagnostics",
  marketing:   "Marketing & Advertising expense",
  insurance:   "Insurance expense",
  compliance:  "Compliance & Waste Disposal",
  training:    "Staff Training & CE",
};

// Template for a typical month — amounts vary slightly by month index
const REVENUE_TPL = [
  ["Office visits & exams — week 1", [18500,19000,19200,19500,19500], 5,  "exams"],
  ["Surgery & procedures",           [19000,20000,20500,21000,21000], 6,  "surgery"],
  ["Vaccinations & wellness",        [ 8500, 9000, 9000, 9200, 9200], 8,  "wellness"],
  ["Pharmacy dispensing — week 1",   [10500,10800,11000,11500,11500], 9,  "pharmacy"],
  ["Diagnostics (x-ray / lab)",      [ 7800, 8000, 8200, 8400, 8400], 11, "diagnostics_rev"],
  ["Office visits & exams — week 2", [17900,18000,18500,18800,18800], 12, "exams"],
  ["Dental procedures",              [10500,10800,11000,11200,11200], 13, "dental"],
  ["Boarding & grooming",            [ 4200, 4300, 4500, 4600, 4600], 15, "boarding"],
  ["Surgery & procedures — week 3",  [18000,19000,19200,19500,19500], 16, "surgery"],
  ["Pharmacy dispensing — week 2",   [10200,10500,10600,10800,10800], 17, "pharmacy"],
  ["Office visits & exams — week 3", [17000,17400,17600,17900,17900], 19, "exams"],
];

const EXPENSE_TPL = [
  ["Payroll — vets & techs (1st)",        [27000,27000,28000,28000,28000], 1,  "payroll"],
  ["Rent — clinic facility",              [ 8500, 8500, 8500, 8500, 8500], 1,  "rent"],
  ["Veterinary pharmaceuticals & supplies",[18000,18500,18800,19000,19000], 3,  "supplies"],
  ["Medical equipment lease",             [ 4200, 4200, 4200, 4200, 4200], 4,  "equipment"],
  ["Utilities",                           [ 2000, 2000, 2100, 2100, 2100], 5,  "utilities"],
  ["Practice management software & SaaS", [ 1400, 1400, 1400, 1400, 1400], 6,  "software"],
  ["Lab / outside diagnostics",           [ 5000, 5200, 5300, 5500, 5500], 9,  "diagnostics"],
  ["Marketing — community & social",      [ 3000, 3000, 3200, 3200, 3200], 10, "marketing"],
  ["Veterinary supplies — restock",       [14500,15000,15200,15500,15500], 12, "supplies"],
  ["Insurance (malpractice + property)",  [ 4800, 4800, 4800, 4800, 4800], 13, "insurance"],
  ["Payroll — vets & techs (15th)",       [27000,27000,28000,28000,28000], 15, "payroll"],
  ["Biohazard / medical waste disposal",  [ 1100, 1100, 1100, 1100, 1100], 17, "compliance"],
  ["Continuing education — staff CE",     [ 1500, 1500, 1800, 1800, 1800], 18, "training"],
];

// Months: Feb–Jun 2026
const MONTHS = [[2026,2],[2026,3],[2026,4],[2026,5],[2026,6]];

(async () => {
  // Rename the workspace.
  try {
    const user = await admin.auth().getUserByEmail("sean@sociii.ai");
    const wsRef = db.collection("users").doc(user.uid).collection("workspaces").doc(TENANT);
    await wsRef.update({ name: "Meadow Creek Veterinary Clinic", tagline: "Small-animal & exotic practice · DEMO", vertical: "veterinary" });
    console.log("✓ renamed workspace → Meadow Creek Veterinary Clinic");
  } catch (e) { console.warn("rename skipped:", e.message); }

  // Build COA name→id map
  const coaSnap = await db.collection("coaAccounts").where("tenantId","==",TENANT).get();
  const coaByName = {};
  coaSnap.forEach(doc => { coaByName[doc.data().name] = doc.id; });
  // Also try partial/lowercase match
  const coaLookup = (cls) => {
    const target = COA_MAP[cls];
    if (!target) return null;
    if (coaByName[target]) return coaByName[target];
    // fuzzy: find any key that contains the first word of target
    const first = target.split(" ")[0].toLowerCase();
    const match = Object.entries(coaByName).find(([k]) => k.toLowerCase().includes(first));
    return match ? match[1] : null;
  };

  // Clear prior demo rows.
  for (const coll of ["transactions", "connectedAccounts"]) {
    const prior = await db.collection(coll).where("tenantId","==",TENANT).where("demo","==",true).get();
    const b = db.batch(); prior.forEach(doc => b.delete(doc.ref));
    if (!prior.empty) { await b.commit(); console.log(`cleared ${prior.size} demo ${coll}`); }
  }

  let totalTxns = 0;
  // Write in chunks of 499 (Firestore batch limit)
  for (let mi = 0; mi < MONTHS.length; mi++) {
    const [y, m] = MONTHS[mi];
    const batch = db.batch();
    for (const [desc, amts, day, cls] of REVENUE_TPL) {
      batch.set(db.collection("transactions").doc(), {
        tenantId: TENANT, demo: true, direction: "credit", status: "committed",
        amountCents: cents(amts[mi]), date: d(y, m, day), description: desc, classification: cls,
        coaAccountId: coaLookup(cls) || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      totalTxns++;
    }
    for (const [desc, amts, day, cls] of EXPENSE_TPL) {
      batch.set(db.collection("transactions").doc(), {
        tenantId: TENANT, demo: true, direction: "debit", status: "committed",
        amountCents: cents(amts[mi]), date: d(y, m, day), description: desc, classification: cls,
        coaAccountId: coaLookup(cls) || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      totalTxns++;
    }
    await batch.commit();
  }

  // Connected account
  const b2 = db.batch();
  b2.set(db.collection("connectedAccounts").doc(), {
    tenantId: TENANT, demo: true, status: "active",
    name: "Operating account ····4471", institution: "First Community Bank",
    type: "checking", balanceCents: cents(91800),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await b2.commit();

  console.log(`✓ Meadow Creek accounting seeded — ${totalTxns} txns across ${MONTHS.length} months (Feb–Jun 2026)`);
  console.log(`  COA accounts mapped: ${coaSnap.size} found`);
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
