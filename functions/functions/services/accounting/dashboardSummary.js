// Dashboard KPI rollup for the Accounting worker.
//
// CODEX 51.1 Phase 2 follow-on. Reads tenant's transactions, balance
// snapshots, forward budgets, and connected accounts; computes the values
// the Dashboard pane shows (Cash on Hand, Burn 30D, Runway, etc).
//
// Append-only model: every Firestore record is treated as a historical
// observation. For "latest snapshot" we pick the most recent createdAt.

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

function isoToday() { return new Date().toISOString().slice(0, 10); }

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function monthsAgo(n) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString().slice(0, 10);
}

function currentMonthBounds() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const firstOfMonth = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const daysElapsed = d.getUTCDate();
  return { firstOfMonth, daysInMonth, daysElapsed };
}

// Look up the most recent balanceSnapshot for the tenant — if any.
// Returns the snapshot data + a heuristic "cash" line-item lookup so we
// can populate Cash on Hand from the imported balance sheet when the
// user hasn't connected bank accounts yet.
async function getLatestBalanceSnapshot(tenantId) {
  const db = getDb();
  const snap = await db.collection("balanceSnapshots")
    .where("tenantId", "==", tenantId)
    .limit(50)
    .get();
  if (snap.empty) return null;
  // Sort by createdAt descending in-memory (Firestore doesn't index
  // automatically on createdAt unless we add a composite index, and
  // these are low-volume per tenant).
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => {
    const at = a.createdAt?.toMillis?.() || 0;
    const bt = b.createdAt?.toMillis?.() || 0;
    return bt - at;
  });
  return docs[0];
}

async function getLatestForwardBudget(tenantId) {
  const db = getDb();
  const snap = await db.collection("forwardBudgets")
    .where("tenantId", "==", tenantId)
    .limit(50)
    .get();
  if (snap.empty) return null;
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => {
    const at = a.createdAt?.toMillis?.() || 0;
    const bt = b.createdAt?.toMillis?.() || 0;
    return bt - at;
  });
  return docs[0];
}

function findCashLineItemCents(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.lineItems)) return null;
  // Find the first "Cash"-ish asset line.
  const cashLine = snapshot.lineItems.find(l => {
    if (!l || l.section !== "ASSETS") return false;
    const name = (l.name || "").toLowerCase();
    return name.startsWith("cash") || name.includes("bank account");
  });
  if (!cashLine) return null;
  // valueCents can legitimately be 0 (e.g. Sean's SOCIII, Inc. has $0 cash).
  return typeof cashLine.valueCents === "number" ? cashLine.valueCents : null;
}

function findLiabilitiesTotalCents(snapshot) {
  if (!snapshot || !snapshot.sectionTotals) return null;
  const liab = snapshot.sectionTotals["LIABILITIES"];
  if (!liab) return null;
  return typeof liab.knownTotalCents === "number" ? liab.knownTotalCents : null;
}

async function getConnectedAccountsTotalCents(tenantId) {
  const db = getDb();
  const snap = await db.collection("connectedAccounts")
    .where("tenantId", "==", tenantId)
    .limit(100)
    .get();
  if (snap.empty) return null;
  let total = 0;
  let any = false;
  snap.docs.forEach(d => {
    const a = d.data();
    if (a.status === "deleted") return;
    if (typeof a.balanceCents === "number") {
      total += a.balanceCents;
      any = true;
    } else if (typeof a.balance === "number") {
      // legacy: dollar value
      total += Math.round(a.balance * 100);
      any = true;
    }
  });
  return any ? total : null;
}

// Sum debit-direction expense transactions whose date is within the
// rolling window from <from> (YYYY-MM-DD) to today. Refunds and
// internal transfers are excluded by classification.
async function sumDebitsSince(tenantId, fromDate) {
  const db = getDb();
  const snap = await db.collection("transactions")
    .where("tenantId", "==", tenantId)
    .limit(5000)
    .get();
  let total = 0;
  let count = 0;
  snap.docs.forEach(d => {
    const t = d.data();
    if (!t.date || t.date < fromDate) return;
    if (t.direction !== "debit") return;
    if (t.classification === "internal_transfer" || t.classification === "refund") return;
    if (t.status !== "committed") return;
    total += Math.abs(t.amountCents || 0);
    count += 1;
  });
  return { totalCents: total, count };
}

async function computeSummary({ tenantId }) {
  if (!tenantId) throw new Error("Missing tenantId");

  const { firstOfMonth, daysInMonth, daysElapsed } = currentMonthBounds();
  const [snapshot, budget, connectedTotal, burn30, burn12mo, mtd] = await Promise.all([
    getLatestBalanceSnapshot(tenantId),
    getLatestForwardBudget(tenantId),
    getConnectedAccountsTotalCents(tenantId),
    sumDebitsSince(tenantId, daysAgo(30)),
    sumDebitsSince(tenantId, monthsAgo(12)),
    sumDebitsSince(tenantId, firstOfMonth),
  ]);

  // --- Cash on Hand ---
  let cashOnHandCents = 0;
  let cashSource = "default";
  if (connectedTotal != null) {
    cashOnHandCents = connectedTotal;
    cashSource = "connectedAccounts";
  } else {
    const cashFromSnapshot = findCashLineItemCents(snapshot);
    if (cashFromSnapshot != null) {
      cashOnHandCents = cashFromSnapshot;
      cashSource = "balanceSnapshot";
    }
  }

  // --- Burn (30D) ---
  const burn30dCents = burn30.totalCents;

  // --- Avg monthly burn (last 12 months observed) ---
  // Useful for tenants like SOCIII, Inc. whose 30D might be light but
  // 12mo gives a realistic operating-burn picture.
  const avgMonthlyBurnCents = burn12mo.totalCents > 0
    ? Math.round(burn12mo.totalCents / 12) : 0;

  // --- Runway ---
  let runwayMonths = null;
  let runwayHint = null;
  // Prefer the forward budget run rate (forward-looking; what the company
  // INTENDS to burn). Fall back to historical avg monthly burn if no
  // budget is on file.
  const forwardRunRateCents = budget?.monthlyRunRateCents || 0;
  const effectiveBurnCents = forwardRunRateCents > 0
    ? forwardRunRateCents
    : avgMonthlyBurnCents;
  if (effectiveBurnCents > 0 && cashOnHandCents > 0) {
    runwayMonths = cashOnHandCents / effectiveBurnCents;
    runwayHint = forwardRunRateCents > 0
      ? "Cash ÷ forward run rate (from budget)"
      : "Cash ÷ avg monthly burn (last 12 mo)";
  } else if (effectiveBurnCents > 0) {
    runwayMonths = 0;
    runwayHint = "$0 cash on file — runway is 0 at current state";
  }

  // --- Budget vs Actual (MTD) ---
  // More useful than rolling 30D burn: are we tracking against the forward
  // budget THIS month? Pro-rate the monthly run rate by days elapsed and
  // compare to actual spend since the 1st.
  let budgetVsActual = null;
  if (forwardRunRateCents > 0) {
    const proratedBudgetCents = Math.round(forwardRunRateCents * (daysElapsed / daysInMonth));
    const actualMtdCents = mtd.totalCents;
    const varianceCents = actualMtdCents - proratedBudgetCents;
    budgetVsActual = {
      actualCents: actualMtdCents,
      proratedBudgetCents,
      monthlyBudgetCents: forwardRunRateCents,
      varianceCents,
      daysElapsed,
      daysInMonth,
      transactionCount: mtd.count,
    };
  }

  // --- Liabilities (bonus context, even though no tile exists yet) ---
  const totalLiabilitiesCents = findLiabilitiesTotalCents(snapshot);

  return {
    cashOnHand: { cents: cashOnHandCents, source: cashSource },
    mrr: { cents: null, source: "stripe_not_connected" },
    burn30d: { cents: burn30dCents, transactionCount: burn30.count },
    avgMonthlyBurn: { cents: avgMonthlyBurnCents, monthsObserved: 12 },
    budgetVsActual,
    forwardRunRate: forwardRunRateCents > 0
      ? { cents: forwardRunRateCents, source: "import_prebuilt", year: budget?.year || null }
      : null,
    runway: runwayMonths != null
      ? { months: runwayMonths, hint: runwayHint } : null,
    totalLiabilities: totalLiabilitiesCents != null
      ? { cents: totalLiabilitiesCents, source: "balanceSnapshot" } : null,
    unpaidInvoicesCount: 0, // no invoices feature yet
    openExpensesCount: 0,
    asOf: isoToday(),
  };
}

module.exports = { computeSummary };
