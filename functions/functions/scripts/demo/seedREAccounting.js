// Seed rent roll transactions for the RE demo so Accounting worker shows live data.
// Collection: transactions with tenantId field (same as existing accounting substrate).
// Seeds 3 months of Creekwood rent roll + HOA income + Domain Point draws.
const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const RE_DEMO_UID    = "qJZesWZclFZO0Xwp1l5PxE16Bnj2";
const RE_DEMO_TENANT = "ws_1783659066844_o7m1pm";
if (!RE_DEMO_UID || !RE_DEMO_TENANT) throw new Error("Fill in RE_DEMO_UID and RE_DEMO_TENANT before running");

const monthTs = (monthsAgo, day = 1) => {
  const d = new Date();
  d.setDate(day);
  d.setMonth(d.getMonth() - monthsAgo);
  d.setHours(0, 0, 0, 0);
  return admin.firestore.Timestamp.fromDate(d);
};

const tx = (overrides) => ({
  tenantId: RE_DEMO_TENANT,
  ownerUid: RE_DEMO_UID,
  source: "import_prebuilt",
  status: "posted",
  reconciled: true,
  demo: true,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  ...overrides,
});

// Build rent roll: 142 units × $1,840 avg = $261,280/mo
// We seed aggregate monthly entries (not per-unit) for performance
const buildRentRollMonth = (monthsAgo) => [
  tx({
    id: `rr_creekwood_${monthsAgo}`,
    date: monthTs(monthsAgo, 1).toDate().toISOString().slice(0, 10),
    description: `Creekwood Commons — Rent Roll (${monthsAgo === 0 ? "June" : monthsAgo === 1 ? "May" : "April"} 2026, 142 units)`,
    type: "credit",
    amount: 261280,
    category: "rental_income",
    property: "creekwood-commons",
    unitCount: 142,
    avgRent: 1840,
    coaAccountId: "revenue_rental",
  }),
  tx({
    id: `rr_creekwood_vacancy_${monthsAgo}`,
    date: monthTs(monthsAgo, 1).toDate().toISOString().slice(0, 10),
    description: `Creekwood Commons — Vacancy loss (${monthsAgo === 0 ? "6" : monthsAgo === 1 ? "5" : "7"} vacant units)`,
    type: "debit",
    amount: monthsAgo === 0 ? 11040 : monthsAgo === 1 ? 9200 : 12880,
    category: "vacancy_loss",
    property: "creekwood-commons",
    coaAccountId: "expense_vacancy",
  }),
  tx({
    id: `rr_creekwood_opex_${monthsAgo}`,
    date: monthTs(monthsAgo, 5).toDate().toISOString().slice(0, 10),
    description: `Creekwood Commons — Operating expenses (${monthsAgo === 0 ? "June" : monthsAgo === 1 ? "May" : "April"} 2026)`,
    type: "debit",
    amount: 38400,
    category: "operating_expense",
    property: "creekwood-commons",
    coaAccountId: "expense_operating",
  }),
];

const TRANSACTIONS = [
  // Creekwood rent roll — 3 months
  ...buildRentRollMonth(0),
  ...buildRentRollMonth(1),
  ...buildRentRollMonth(2),

  // Meridian HOA management fee income
  tx({
    id: "hoa_mgmt_jun",
    date: monthTs(0, 1).toDate().toISOString().slice(0, 10),
    description: "Meridian at Flamingo — HOA management fee (June 2026)",
    type: "credit",
    amount: 8900,
    category: "management_fee",
    property: "meridian-flamingo",
    coaAccountId: "revenue_management_fee",
  }),
  tx({
    id: "hoa_mgmt_may",
    date: monthTs(1, 1).toDate().toISOString().slice(0, 10),
    description: "Meridian at Flamingo — HOA management fee (May 2026)",
    type: "credit",
    amount: 8900,
    category: "management_fee",
    property: "meridian-flamingo",
    coaAccountId: "revenue_management_fee",
  }),

  // Domain Point — construction draw history
  tx({
    id: "dp_draw_1",
    date: "2026-03-15",
    description: "Domain Point — Construction draw #1 (foundation + framing)",
    type: "debit",
    amount: 820000,
    category: "construction_draw",
    property: "domain-point",
    coaAccountId: "asset_construction",
  }),
  tx({
    id: "dp_draw_2",
    date: "2026-05-10",
    description: "Domain Point — Construction draw #2 (MEP rough-in)",
    type: "debit",
    amount: 610000,
    category: "construction_draw",
    property: "domain-point",
    coaAccountId: "asset_construction",
  }),
  tx({
    id: "dp_lp_capital_1",
    date: "2026-02-01",
    description: "Domain Point — LP capital contribution #1 (7 of 8 LPs funded)",
    type: "credit",
    amount: 3300000,
    category: "equity_contribution",
    property: "domain-point",
    coaAccountId: "liability_equity",
  }),
  tx({
    id: "dp_lp_capital_2",
    date: "2026-04-15",
    description: "Domain Point — LP capital contribution #2",
    type: "credit",
    amount: 100000,
    category: "equity_contribution",
    property: "domain-point",
    coaAccountId: "liability_equity",
  }),

  // Payroll
  tx({
    id: "payroll_jun",
    date: monthTs(0, 15).toDate().toISOString().slice(0, 10),
    description: "Merritt Property Group — Payroll (June 2026, 9 W2 employees)",
    type: "debit",
    amount: 72400,
    category: "payroll",
    coaAccountId: "expense_payroll",
  }),
  tx({
    id: "payroll_may",
    date: monthTs(1, 15).toDate().toISOString().slice(0, 10),
    description: "Merritt Property Group — Payroll (May 2026)",
    type: "debit",
    amount: 72400,
    category: "payroll",
    coaAccountId: "expense_payroll",
  }),

  // Brokerage commission income — Unit 704 close
  tx({
    id: "comm_unit704",
    date: monthTs(0, 8).toDate().toISOString().slice(0, 10),
    description: "Meridian Unit 704 — Commission (2.5%, $875K sale)",
    type: "credit",
    amount: 21875,
    category: "commission_income",
    property: "meridian-flamingo",
    coaAccountId: "revenue_commission",
  }),
];

(async () => {
  // Clear existing demo transactions for this tenant
  const existing = await db.collection("transactions")
    .where("tenantId", "==", RE_DEMO_TENANT).where("demo", "==", true).get();
  const batch = db.batch();
  existing.docs.forEach(d => batch.delete(d.ref));
  if (!existing.empty) await batch.commit();
  console.log(`• Cleared ${existing.size} existing demo transactions`);

  for (const t of TRANSACTIONS) {
    await db.collection("transactions").doc(t.id).set(t);
    const dir = t.type === "credit" ? "+" : "-";
    console.log(`  ✓ [${t.type}] ${dir}$${t.amount.toLocaleString()} — ${t.description.slice(0, 55)}…`);
  }

  const revenue = TRANSACTIONS.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const expenses = TRANSACTIONS.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  console.log(`\n✓ Seeded ${TRANSACTIONS.length} transactions`);
  console.log(`  Revenue:  $${revenue.toLocaleString()}`);
  console.log(`  Expenses: $${expenses.toLocaleString()}`);
  console.log("  Accounting worker will now show live data (not sample fixture)");
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
