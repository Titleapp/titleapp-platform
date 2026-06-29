"use strict";
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const TENANT = "ws_1781920656122_tl9dhn";
const NOW = admin.firestore.Timestamp.now();
function ts(y, m, d) { return admin.firestore.Timestamp.fromDate(new Date(y, m - 1, d)); }

async function seed() {
  // 1. Balance snapshot — provides Total Liabilities
  const bsSnap = await db.collection("balanceSnapshots").where("tenantId", "==", TENANT).limit(1).get();
  if (bsSnap.empty) {
    await db.collection("balanceSnapshots").add({
      tenantId: TENANT,
      lineItems: [
        { section: "ASSETS", name: "Operating Checking ····4471", valueCents: 16500000, isTotal: false },
        { section: "ASSETS", name: "Savings Reserve", valueCents: 2800000, isTotal: false },
        { section: "ASSETS", name: "Medical Equipment", valueCents: 28500000, isTotal: false },
        { section: "ASSETS", name: "Leasehold Improvements", valueCents: 12000000, isTotal: false },
        { section: "ASSETS", name: "Accounts Receivable", valueCents: 3500000, isTotal: false },
        { section: "ASSETS", name: "Prepaid Insurance", valueCents: 680000, isTotal: false },
        { section: "ASSETS", name: "Total Assets", valueCents: 63980000, isTotal: true },
        { section: "LIABILITIES", name: "Equipment Loan (Chase)", valueCents: 18600000, isTotal: false },
        { section: "LIABILITIES", name: "SBA Practice Loan", valueCents: 24200000, isTotal: false },
        { section: "LIABILITIES", name: "Accounts Payable", valueCents: 2800000, isTotal: false },
        { section: "LIABILITIES", name: "Accrued Payroll", valueCents: 1100000, isTotal: false },
        { section: "LIABILITIES", name: "Credit Line (BofA)", valueCents: 1100000, isTotal: false },
        { section: "LIABILITIES", name: "Total Liabilities", valueCents: 47800000, isTotal: true },
        { section: "EQUITY", name: "Owner Equity", valueCents: 16180000, isTotal: false },
        { section: "EQUITY", name: "Total Equity", valueCents: 16180000, isTotal: true },
      ],
      sectionTotals: {
        ASSETS: { knownTotalCents: 63980000 },
        LIABILITIES: { knownTotalCents: 47800000 },
        EQUITY: { knownTotalCents: 16180000 },
      },
      asOfDate: "2026-06-01",
      createdAt: NOW,
    });
    console.log("✓ balanceSnapshots — seeded (Total Liabilities = $478,000)");
  } else {
    console.log("SKIP balanceSnapshots — already exists");
  }

  // 2. Forward budget — provides Budget vs Actual + Runway
  const fbSnap = await db.collection("forwardBudgets").where("tenantId", "==", TENANT).limit(1).get();
  if (fbSnap.empty) {
    await db.collection("forwardBudgets").add({
      tenantId: TENANT,
      year: 2026,
      monthlyRunRateCents: 2063000, // $20,630/mo matches existing burn
      lineItems: [
        { section: "Operations", name: "Payroll — Clinical Staff", monthlyCents: 1350000 },
        { section: "Operations", name: "Payroll — Admin", monthlyCents: 320000 },
        { section: "Facilities", name: "Lease — Suite 101", monthlyCents: 320000 },
        { section: "Supplies", name: "Medical & Pharmacy Supplies", monthlyCents: 180000 },
        { section: "Overhead", name: "Utilities + Internet", monthlyCents: 45000 },
        { section: "Overhead", name: "Malpractice & General Insurance", monthlyCents: 68000 },
        { section: "Overhead", name: "Software & Tools", monthlyCents: 30000 },
        { section: "Marketing", name: "Local Marketing", monthlyCents: 40000 },
        { section: "Overhead", name: "Miscellaneous", monthlyCents: 30000 },
      ],
      createdAt: NOW,
    });
    console.log("✓ forwardBudgets — seeded ($20,630/mo run rate)");
  } else {
    console.log("SKIP forwardBudgets — already exists");
  }

  // 3. Additional transactions — 12 months for avg burn + revenue for Budget vs Actual
  const txSnap = await db.collection("transactions").where("tenantId", "==", TENANT).get();
  if (txSnap.size <= 5) {
    console.log("Seeding transactions (12 months history)...");
    const months = [
      [2025, 7], [2025, 8], [2025, 9], [2025, 10], [2025, 11], [2025, 12],
      [2026, 1], [2026, 2], [2026, 3], [2026, 4], [2026, 5], [2026, 6],
    ];

    const expenses = [
      { desc: "Payroll — Clinical & Admin", amt: 1670000, cls: "payroll" },
      { desc: "Suite 101 Lease", amt: 320000, cls: "rent" },
      { desc: "Medical & Pharmacy Supplies", amt: 180000, cls: "supplies" },
      { desc: "Utilities", amt: 45000, cls: "utilities" },
      { desc: "Insurance", amt: 68000, cls: "insurance" },
      { desc: "Software (PIMS + accounting)", amt: 30000, cls: "software" },
      { desc: "Marketing", amt: 40000, cls: "marketing" },
    ];

    const revenue = [
      { desc: "Exam Fees + Consults", amt: 2150000, cls: "revenue" },
      { desc: "Pharmacy Sales", amt: 680000, cls: "revenue" },
      { desc: "Surgery & Procedures", amt: 1100000, cls: "revenue" },
      { desc: "Grooming + Boarding", amt: 320000, cls: "revenue" },
    ];

    let count = 0;
    for (const [y, m] of months) {
      for (const e of expenses) {
        await db.collection("transactions").add({
          tenantId: TENANT,
          direction: "debit",
          status: "committed",
          date: `${y}-${String(m).padStart(2, "0")}-01`,
          description: e.desc,
          amountCents: e.amt + Math.floor((Math.random() - 0.5) * 20000),
          classification: e.cls,
          createdAt: ts(y, m, 1),
        });
        count++;
      }
      for (const r of revenue) {
        await db.collection("transactions").add({
          tenantId: TENANT,
          direction: "credit",
          status: "committed",
          date: `${y}-${String(m).padStart(2, "0")}-15`,
          description: r.desc,
          amountCents: r.amt + Math.floor((Math.random() - 0.5) * 50000),
          classification: r.cls,
          createdAt: ts(y, m, 15),
        });
        count++;
      }
    }
    console.log(`✓ transactions — seeded ${count} records (12 months)`);
  } else {
    console.log(`SKIP transactions — already has ${txSnap.size} records`);
  }

  console.log("\nDone. Canvas should now show: Cash + Burn + Runway + Total Liabilities + Budget vs Actual.");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
