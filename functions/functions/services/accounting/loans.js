// Accounting loan register — SOCIII Inc. bridge loans + founder contributions.
// Data model: `loans` collection, tenant-scoped, append-only (updates go to
// obligations/transactions; the loan record itself is immutable).
//
// Schema per document:
//   tenantId, lender, lenderEntity, principalCents, outstandingPrincipalCents,
//   interestRatePct, originationDate, formalDocsDate, accruedFrom,
//   interestPaidCents, interestAdvancedThrough, repaymentTrigger, dueDate,
//   status (active|paid|deferred), payments[], notes, importTag, createdAt

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

function daysBetween(a, b) {
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
}

// Dynamic accrual: compute interest owed as of today, net of payments.
function computeAccruedInterestCents(loan) {
  const rate = loan.interestRatePct || 0;
  if (!rate) return 0;
  const fromDate = loan.accruedFrom || loan.formalDocsDate || loan.originationDate;
  if (!fromDate) return 0;
  const origin = new Date(fromDate + "T00:00:00Z");
  const days = daysBetween(origin, new Date());
  const grossCents = Math.round(
    (loan.principalCents || 0) * (rate / 100) * (days / 365)
  );
  const paid = loan.interestPaidCents || 0;
  return Math.max(0, grossCents - paid);
}

function serializeLoan(doc) {
  const d = doc.data ? doc.data() : doc;
  const id = doc.id || d.id;
  const accruedCents = computeAccruedInterestCents(d);
  return {
    id,
    lender: d.lender || null,
    lenderEntity: d.lenderEntity || null,
    principalCents: d.principalCents || 0,
    outstandingPrincipalCents: d.outstandingPrincipalCents ?? d.principalCents ?? 0,
    interestRatePct: d.interestRatePct || 0,
    originationDate: d.originationDate || null,
    formalDocsDate: d.formalDocsDate || null,
    accruedFrom: d.accruedFrom || null,
    interestPaidCents: d.interestPaidCents || 0,
    interestAdvancedThrough: d.interestAdvancedThrough || null,
    accruedInterestCents: accruedCents,
    totalOwedCents: (d.outstandingPrincipalCents ?? d.principalCents ?? 0) + accruedCents,
    repaymentTrigger: d.repaymentTrigger || null,
    dueDate: d.dueDate || null,
    status: d.status || "active",
    payments: d.payments || [],
    contributionSchedule: d.contributionSchedule || null,
    notes: d.notes || null,
    importTag: d.importTag || null,
    createdAt: d.createdAt || null,
  };
}

async function listLoans({ tenantId }) {
  if (!tenantId) throw new Error("Missing tenantId");
  const snap = await getDb().collection("loans")
    .where("tenantId", "==", tenantId)
    .limit(100)
    .get();
  const loans = snap.docs
    .map(serializeLoan)
    .filter(l => l.status !== "archived");
  // Sort: active first, then by principal desc
  loans.sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;
    return (b.principalCents || 0) - (a.principalCents || 0);
  });
  const totalPrincipalCents = loans.reduce((s, l) => s + (l.outstandingPrincipalCents || 0), 0);
  const totalAccruedCents = loans.reduce((s, l) => s + (l.accruedInterestCents || 0), 0);
  const totalOwedCents = loans.reduce((s, l) => s + (l.totalOwedCents || 0), 0);
  return {
    ok: true,
    loans,
    summary: { totalPrincipalCents, totalAccruedCents, totalOwedCents, count: loans.length },
  };
}

module.exports = { listLoans };
