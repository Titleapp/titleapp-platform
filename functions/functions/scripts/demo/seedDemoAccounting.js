// Seed DEMO SPACE as MEADOW CREEK VETERINARY CLINIC — a believable month of
// accounting for a 6-person small-animal practice (~40 patients/day).
// Also renames the workspace to "Meadow Creek Veterinary Clinic" so it reads
// real on camera. Idempotent: clears prior demo:true rows, then re-inserts.
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const TENANT = "ws_1781920656122_tl9dhn"; // DEMO SPACE
const Y = 2026, M = "06";
const d = (day) => `${Y}-${M}-${String(day).padStart(2, "0")}`;
const cents = (dollars) => Math.round(dollars * 100);

// Revenue (credits) — a vet clinic's real service lines
const REVENUE = [
  ["Office visits & exams — week 1", 19500, 5,  "exams"],
  ["Surgery & procedures",           21000, 6,  "surgery"],
  ["Vaccinations & wellness",         9200, 8,  "wellness"],
  ["Pharmacy dispensing — week 1",   11500, 9,  "pharmacy"],
  ["Diagnostics (x-ray / lab)",       8400, 11, "diagnostics"],
  ["Office visits & exams — week 2", 18800, 12, "exams"],
  ["Dental procedures",              11200, 13, "dental"],
  ["Boarding & grooming",             4600, 15, "boarding"],
  ["Surgery & procedures",           19500, 16, "surgery"],
  ["Pharmacy dispensing — week 2",   10800, 17, "pharmacy"],
  ["Office visits & exams — week 3", 17900, 19, "exams"],
];

// Expenses (debits)
const EXPENSES = [
  ["Payroll — vets & techs (1st)",        28000, 1,  "payroll"],
  ["Rent — clinic facility",               8500, 1,  "rent"],
  ["Veterinary pharmaceuticals & supplies",19000, 3,  "supplies"],
  ["Medical equipment lease (X-ray/anesthesia)", 4200, 4, "equipment"],
  ["Utilities",                            2100, 5,  "utilities"],
  ["Practice management software & SaaS",  1400, 6,  "software"],
  ["Lab / outside diagnostics",            5500, 9,  "diagnostics"],
  ["Marketing — community & social",       3200, 10, "marketing"],
  ["Veterinary supplies — restock",       15500, 12, "supplies"],
  ["Insurance (malpractice + property)",   4800, 13, "insurance"],
  ["Payroll — vets & techs (15th)",       28000, 15, "payroll"],
  ["Biohazard / medical waste disposal",   1100, 17, "compliance"],
  ["Continuing education — staff CE",      1800, 18, "training"],
];

(async () => {
  // Rename the workspace so it reads as a real business on camera.
  try {
    const user = await admin.auth().getUserByEmail("sean@sociii.ai");
    const wsRef = db.collection("users").doc(user.uid).collection("workspaces").doc(TENANT);
    await wsRef.update({ name: "Meadow Creek Veterinary Clinic", tagline: "Small-animal & exotic practice · DEMO", vertical: "veterinary" });
    console.log("✓ renamed workspace → Meadow Creek Veterinary Clinic");
  } catch (e) { console.warn("rename skipped:", e.message); }

  // Clear prior demo rows (idempotent reset).
  for (const coll of ["transactions", "connectedAccounts"]) {
    const prior = await db.collection(coll).where("tenantId", "==", TENANT).where("demo", "==", true).get();
    const b = db.batch(); prior.forEach((doc) => b.delete(doc.ref));
    if (!prior.empty) { await b.commit(); console.log(`cleared ${prior.size} demo ${coll}`); }
  }

  let revTotal = 0, expTotal = 0;
  const batch = db.batch();
  for (const [desc, amt, day, cls] of REVENUE) {
    revTotal += amt;
    batch.set(db.collection("transactions").doc(), {
      tenantId: TENANT, demo: true, direction: "credit", status: "committed",
      amountCents: cents(amt), date: d(day), description: desc, classification: cls,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  for (const [desc, amt, day, cls] of EXPENSES) {
    expTotal += amt;
    batch.set(db.collection("transactions").doc(), {
      tenantId: TENANT, demo: true, direction: "debit", status: "committed",
      amountCents: cents(amt), date: d(day), description: desc, classification: cls,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  batch.set(db.collection("connectedAccounts").doc(), {
    tenantId: TENANT, demo: true, status: "active",
    name: "Operating account ····4471", institution: "First Community Bank",
    type: "checking", balanceCents: cents(91800),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();

  console.log(`✓ Meadow Creek accounting seeded — ${REVENUE.length} revenue + ${EXPENSES.length} expense txns`);
  console.log(`  Revenue MTD  $${revTotal.toLocaleString()}`);
  console.log(`  Expenses MTD $${expTotal.toLocaleString()}`);
  console.log(`  Net income   $${(revTotal - expTotal).toLocaleString()}`);
  console.log(`  Cash on hand $91,800`);
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
