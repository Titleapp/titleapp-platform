// Seed Meadow Creek's Accounting worker with a real chart of accounts + 6 months
// of committed transactions so the Setup checklist auto-completes (6/6) and the
// dashboard shows real revenue / burn / runway instead of "—" and "1 of 6".
//
// Setup auto-detection (index.js /accounting:setupState):
//   connect-bank   : connectedAccounts >= 1   (already seeded)
//   pick-coa       : coaAccounts > 5          ← this seed (12 accounts)
//   categorize-30  : txns w/ coaAccountId >=30 ← this seed (~60, all categorized)
//   fiscal-year    : tenants.fiscalYearStart   ← this seed ("01-01")
//   upload-history : distinct months >= 5      ← this seed (Jan–Jun = 6)
//   first-recurring: txns.recurring >= 1       ← this seed (rent/payroll/etc.)
//
// Idempotent: clears prior demo coaAccounts + transactions for the tenant first.
//   node scripts/demo/seedAccountingDemo.js
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const TS = admin.firestore.Timestamp;

const UID = "NHVBEVFSiBUFUzHUq5a9Xioc3hH2";
const TENANT = "ws_1781920656122_tl9dhn"; // Meadow Creek Veterinary

const ts = (d) => TS.fromDate(new Date(d + "T12:00:00Z"));
const c = (dollars) => Math.round(dollars * 100);

// ── Chart of accounts (12 — comfortably > 5) ──
const COA = [
  { code: "4000", name: "Patient Services Revenue", type: "revenue" },
  { code: "4100", name: "Boarding & Grooming",      type: "revenue" },
  { code: "4200", name: "Retail / Pharmacy Sales",  type: "revenue" },
  { code: "5000", name: "Medical & Surgical Supplies", type: "expense", recurring: true },
  { code: "5100", name: "Pharmacy / Drugs",         type: "expense", recurring: true },
  { code: "5200", name: "Lab & Diagnostics",        type: "expense" },
  { code: "6000", name: "Payroll & Wages",          type: "expense", recurring: true },
  { code: "6100", name: "Rent",                     type: "expense", recurring: true },
  { code: "6200", name: "Utilities",                type: "expense", recurring: true },
  { code: "6300", name: "Software & Subscriptions", type: "expense", recurring: true },
  { code: "6400", name: "Marketing & Advertising",  type: "expense" },
  { code: "6500", name: "Insurance",                type: "expense", recurring: true },
];

const MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];

// Per-month transaction template (description, day, account code, $amount, direction).
// recurring is inferred from the account's recurring flag.
const MONTHLY = [
  // Revenue (credits)
  ["Patient services — client payments (batch)", "06", "4000", 41200, "credit"],
  ["Patient services — client payments (batch)", "20", "4000", 39850, "credit"],
  ["Boarding & grooming revenue",                "22", "4100",  9400, "credit"],
  ["Retail / pharmacy counter sales",            "25", "4200",  7650, "credit"],
  // Expenses (debits)
  ["Patterson Veterinary Supply",  "03", "5000",  4120, "debit"],
  ["MWI Animal Health",            "05", "5000",  6480, "debit"],
  ["Zoetis Inc — pharmacy",        "08", "5100",  3920, "debit"],
  ["IDEXX Laboratories",           "10", "5200",  2740, "debit"],
  ["Payroll — clinical staff",     "15", "6000", 14800, "debit"],
  ["Rent — clinic premises",       "01", "6100",  6200, "debit"],
  ["PG&E utilities",               "09", "6200",   640, "debit"],
  ["Comcast Business + software",  "12", "6300",   460, "debit"],
  ["Marketing — Meta + Google",    "18", "6400",   720, "debit"],
  ["Professional liability insurance", "14", "6500", 1180, "debit"],
];

(async () => {
  // Clear prior demo accounting data
  for (const coll of ["coaAccounts", "transactions"]) {
    const snap = await db.collection(coll).where("tenantId", "==", TENANT).where("demo", "==", true).get();
    if (!snap.empty) {
      for (let i = 0; i < snap.docs.length; i += 400) {
        const b = db.batch();
        snap.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
        await b.commit();
      }
      console.log(`cleared ${snap.size} prior demo ${coll}`);
    }
  }

  // Fiscal year
  await db.collection("tenants").doc(TENANT).set({ fiscalYearStart: "01-01", fiscalYearUpdatedAt: TS.now() }, { merge: true });
  console.log("set fiscalYearStart = 01-01");

  // Chart of accounts → keep code→docId map for transactions
  const codeToId = {};
  let b = db.batch();
  for (const a of COA) {
    const ref = db.collection("coaAccounts").doc();
    codeToId[a.code] = ref.id;
    b.set(ref, {
      tenantId: TENANT, code: a.code, name: a.name, type: a.type,
      monthlyCapCents: null, source: "demo:vet-clinic", status: "active",
      demo: true, createdAt: TS.now(), createdBy: UID,
    });
  }
  await b.commit();
  console.log(`seeded ${COA.length} chart-of-accounts`);

  // Transactions across 6 months
  const coaByCode = Object.fromEntries(COA.map(a => [a.code, a]));
  let txns = [];
  for (const m of MONTHS) {
    for (const [desc, day, code, amt, direction] of MONTHLY) {
      txns.push({
        tenantId: TENANT,
        date: `${m}-${day}`,
        description: desc,
        amountCents: c(amt),
        direction,
        classification: direction === "credit" ? "revenue" : "expense",
        coaAccountId: codeToId[code],
        coaConfidence: 0.98,
        recurring: !!coaByCode[code].recurring,
        source: "seed",
        sourceFileId: `demo_stmt_${m}`,
        sourceFileName: `Operating Account — ${m}.csv`,
        status: "committed",
        demo: true,
        createdAt: TS.now(),
        createdBy: UID,
      });
    }
  }
  for (let i = 0; i < txns.length; i += 400) {
    const batch = db.batch();
    txns.slice(i, i + 400).forEach(t => batch.set(db.collection("transactions").doc(), t));
    await batch.commit();
  }
  console.log(`seeded ${txns.length} committed transactions across ${MONTHS.length} months`);

  // Bump operating-account cash so runway stays healthy with the added burn.
  const conn = await db.collection("connectedAccounts").where("tenantId", "==", TENANT).get();
  if (!conn.empty) {
    await conn.docs[0].ref.set({ balanceCents: c(165000) }, { merge: true });
    console.log("set operating account balance = $165,000");
  }

  console.log("\n✓ Accounting setup is now 6/6 and the dashboard has real numbers.");
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
