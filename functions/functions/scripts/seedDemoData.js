/**
 * seedDemoData.js — CODEX 49.5 Fix 2
 * Seeds realistic demo data into Sean's account for investor/contributor demos.
 * All records flagged with isTestData: true for easy cleanup.
 */

const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const SEAN_UID = "4WHjuUgEseQfBr0Tg92YXXhu6Mj1";
const WORKSPACE = "vault";

(async () => {
  const batch = db.batch();
  const now = new Date();

  // ═══════════════════════════════════════════════════════════════
  //  CONTACTS (3 records)
  // ═══════════════════════════════════════════════════════════════

  const contacts = [
    {
      name: "Century Title Company",
      type: "customer",
      tenantId: WORKSPACE,
      schema_version: "spine_v1",
      notes: "Title company in Phoenix. Interested in Title & Escrow suite. Demo scheduled.",
      isTestData: true,
      created_at: now,
    },
    {
      name: "Pacific Ventures",
      type: "investor",
      tenantId: WORKSPACE,
      schema_version: "spine_v1",
      notes: "Seed stage VC. Reviewed deck. Follow up after PearX demo.",
      isTestData: true,
      created_at: now,
    },
    {
      name: "Ruthie Clearwater RN",
      type: "contractor",
      tenantId: WORKSPACE,
      schema_version: "spine_v1",
      notes: "Nursing vertical lead. Advisor agreement in progress with Kent.",
      isTestData: true,
      created_at: now,
    },
  ];

  for (const c of contacts) {
    batch.set(db.collection("contacts").doc(), c);
  }

  // ═══════════════════════════════════════════════════════════════
  //  TRANSACTIONS (5 records)
  // ═══════════════════════════════════════════════════════════════

  const transactions = [
    {
      tenantId: WORKSPACE, amount: 2900, direction: "income",
      category: "Platform Subscriptions", description: "Monthly subscription revenue",
      date: now, source: "stripe", status: "cleared",
      gaap_category: "revenue",
      debit_account: "1100-Accounts Receivable",
      credit_account: "4000-Subscription Revenue",
      isTestData: true,
    },
    {
      tenantId: WORKSPACE, amount: 847, direction: "expense",
      category: "Cloud Infrastructure", description: "Firebase + Cloudflare monthly",
      date: now, source: "manual", status: "cleared",
      gaap_category: "expense",
      debit_account: "6100-Infrastructure Costs",
      credit_account: "2000-Accounts Payable",
      isTestData: true,
    },
    {
      tenantId: WORKSPACE, amount: 4900, direction: "income",
      category: "Platform Subscriptions", description: "Enterprise pilot — Century Title",
      date: now, source: "stripe", status: "pending",
      gaap_category: "revenue",
      debit_account: "1100-Accounts Receivable",
      credit_account: "4000-Subscription Revenue",
      isTestData: true,
    },
    {
      tenantId: WORKSPACE, amount: 1200, direction: "expense",
      category: "AI API Costs", description: "Anthropic Claude API — April",
      date: now, source: "manual", status: "cleared",
      gaap_category: "expense",
      debit_account: "6200-AI API Costs",
      credit_account: "2000-Accounts Payable",
      isTestData: true,
    },
    {
      tenantId: WORKSPACE, amount: 500, direction: "income",
      category: "Consulting", description: "Aviation worker setup — client onboarding",
      date: now, source: "stripe", status: "cleared",
      gaap_category: "revenue",
      debit_account: "1100-Accounts Receivable",
      credit_account: "4100-Services Revenue",
      isTestData: true,
    },
  ];

  for (const t of transactions) {
    batch.set(db.collection("transactions").doc(), t);
  }

  // ═══════════════════════════════════════════════════════════════
  //  EMPLOYEES (2 records)
  // ═══════════════════════════════════════════════════════════════

  const employees = [
    {
      tenantId: WORKSPACE,
      role: "Founder & CEO",
      employment_type: "full_time",
      start_date: new Date("2023-01-01"),
      status: "active",
      compliance_flags: [],
      isTestData: true,
    },
    {
      tenantId: WORKSPACE,
      role: "CFO — Part Time",
      employment_type: "contractor",
      start_date: new Date("2024-06-01"),
      status: "active",
      compliance_flags: ["W-9 on file — verify annually"],
      isTestData: true,
    },
  ];

  for (const e of employees) {
    batch.set(db.collection("employees").doc(), e);
  }

  // ═══════════════════════════════════════════════════════════════
  //  BUSINESS ASSETS (1 record)
  // ═══════════════════════════════════════════════════════════════

  batch.set(db.collection("businessAssets").doc(), {
    name: "TitleApp Platform — Intellectual Property",
    type: "intellectual_property",
    tenantId: WORKSPACE,
    current_value: 5000000,
    purchase_date: new Date("2023-01-01"),
    purchase_price: 0,
    notes: "Core platform IP including RAAS engine, worker catalog, and SDK.",
    audit_trail_default: "firebase",
    isTestData: true,
  });

  // Commit all records
  await batch.commit();
  console.log("Demo data seeded: 3 contacts, 5 transactions, 2 employees, 1 asset");

  // ═══════════════════════════════════════════════════════════════
  //  UPDATE BRIEFING with real totals
  // ═══════════════════════════════════════════════════════════════

  const today = now.toISOString().slice(0, 10);
  await db.collection("briefings").doc(SEAN_UID).set({
    date: today,
    runType: "manual",
    spine: {
      contacts: 3,
      transactions: 5,
      pendingTransactions: 1,
      employees: 2,
      assets: 1,
      incomeMtd: 8300,
      expenseMtd: 2047,
      complianceFlags: 1,
    },
    priority: {
      level: "yellow",
      text: "1 pending transaction needs review — Century Title $4,900",
    },
    generatedAt: now.toISOString(),
    source: "manual-seed",
  }, { merge: true });

  console.log("Briefing updated: incomeMtd=$8,300, expenseMtd=$2,047, 1 pending tx");
  console.log("Done.");
  process.exit(0);
})();
