// Accounting obligations — the "Actions you must take" surface.
//
// Born from the $20K DE filing-penalty rule (feedback memory:
// workers must prevent missed filings/deadlines). The principle:
// trusting the human to remember is the failure mode. Workers
// surface deadlines persistently.
//
// V1 derives obligations dynamically from existing data + statutory
// dates — no new "obligations" collection. Append-only
// `obligationCompletions` is the only write surface, so a user can
// say "I filed Q1 taxes" and the item drops off until next period.

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const STATEMENT_AMBER_DAYS = 35;
const STATEMENT_RED_DAYS = 60;
const TAX_AMBER_WINDOW_DAYS = 30;
const TAX_RED_WINDOW_DAYS = 7;

function today() { return new Date(); }

function isoDay(d) { return d.toISOString().slice(0, 10); }

function daysBetween(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function tsToDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts === "string") return new Date(ts);
  if (typeof ts === "number") return new Date(ts);
  return null;
}

// US federal estimated tax due dates by tax year. Adjusts when the
// statutory date falls on a weekend/holiday — Treasury rolls forward
// to the next business day. We hard-code rather than compute a holiday
// calendar; if a date needs adjusting, update here.
function quarterlyTaxDates(year) {
  // Standard quarterly dates: Apr 15, Jun 15, Sep 15, Jan 15 (next year)
  return [
    { quarter: "Q1", year, date: `${year}-04-15` },
    { quarter: "Q2", year, date: `${year}-06-15` },
    { quarter: "Q3", year, date: `${year}-09-15` },
    { quarter: "Q4", year, date: `${year + 1}-01-15` },
  ];
}

function federalAnnualReturn(year) {
  return { type: "federal_return", year, date: `${year + 1}-04-15` };
}

function delawareCorpAnnual(year) {
  // DE C-corp: annual report + franchise tax due March 1 each year.
  // This is the obligation Sean tripped on — surface it loudly.
  return { type: "delaware_corp_annual", year, date: `${year + 1}-03-01` };
}

function severityFromTaxDate(dueDateIso) {
  const due = new Date(dueDateIso + "T00:00:00Z");
  const days = daysBetween(today(), due);
  if (days < 0) return { severity: "red", daysUntilDue: days };
  if (days <= TAX_RED_WINDOW_DAYS) return { severity: "red", daysUntilDue: days };
  if (days <= TAX_AMBER_WINDOW_DAYS) return { severity: "amber", daysUntilDue: days };
  return { severity: "green", daysUntilDue: days };
}

async function getActiveConnectedAccounts(tenantId) {
  const snap = await getDb().collection("connectedAccounts")
    .where("tenantId", "==", tenantId)
    .limit(200)
    .get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(a => a.status !== "deleted");
}

// For each tenant, find the most recent `statementIngest`-class import
// per connectedAccount. Falls back to the last import of any kind if
// we can't tie it to a specific account.
async function getLatestImportPerAccount(tenantId) {
  const snap = await getDb().collection("importEvents")
    .where("tenantId", "==", tenantId)
    .limit(500)
    .get();
  const byAccount = {};
  let mostRecentAny = null;
  for (const d of snap.docs) {
    const e = { id: d.id, ...d.data() };
    const at = tsToDate(e.createdAt);
    if (!at) continue;
    if (!mostRecentAny || at > mostRecentAny.at) mostRecentAny = { ...e, at };
    const accountId = e.connectedAccountId || e.accountId || null;
    if (accountId) {
      if (!byAccount[accountId] || at > byAccount[accountId].at) {
        byAccount[accountId] = { ...e, at };
      }
    }
  }
  return { byAccount, mostRecentAny };
}

async function getCompletions(tenantId) {
  const snap = await getDb().collection("obligationCompletions")
    .where("tenantId", "==", tenantId)
    .limit(500)
    .get();
  const byKey = {};
  for (const d of snap.docs) {
    const c = d.data();
    if (!c.obligationKey) continue;
    const at = tsToDate(c.completedAt);
    if (!byKey[c.obligationKey] || (at && at > byKey[c.obligationKey].at)) {
      byKey[c.obligationKey] = { ...c, at };
    }
  }
  return byKey;
}

function statementObligationFor(account, lastImportAt, mostRecentAny) {
  // Plaid-source accounts auto-sync, so they don't get a manual SLA.
  if (account.source === "plaid") return null;

  const at = lastImportAt || (mostRecentAny ? mostRecentAny.at : null);
  const daysSince = at ? daysBetween(at, today()) : null;
  let severity;
  let detail;
  if (daysSince == null) {
    severity = "amber";
    detail = "No statement on file yet — upload your most recent monthly statement.";
  } else if (daysSince > STATEMENT_RED_DAYS) {
    severity = "red";
    detail = `Last statement ${daysSince} days ago — overdue by ${daysSince - STATEMENT_AMBER_DAYS} days.`;
  } else if (daysSince > STATEMENT_AMBER_DAYS) {
    severity = "amber";
    detail = `Last statement ${daysSince} days ago — getting stale.`;
  } else {
    return null; // green — no action surfaced
  }

  const last4 = account.last4 ? ` ••${account.last4}` : "";
  return {
    id: `stmt_upload:${account.id}`,
    obligationKey: `stmt_upload:${account.id}`,
    type: "statement_upload",
    category: "Accounting",
    workerSlug: "PLAT-001",
    label: `Upload statement for ${account.name}${last4}`,
    detail,
    dueDate: null,
    daysUntilDue: null,
    severity,
    lastCompletedAt: at ? at.toISOString() : null,
    action: { kind: "upload_statement", accountId: account.id },
  };
}

function taxObligation({ obligationKey, label, detail, dueDate, action, completedKeys }) {
  // Skip if already marked complete for this period.
  if (completedKeys[obligationKey]) return null;
  const { severity, daysUntilDue } = severityFromTaxDate(dueDate);
  if (severity === "green") return null;
  return {
    id: obligationKey,
    obligationKey,
    type: action.kind,
    category: "Accounting",
    workerSlug: "PLAT-001",
    label,
    detail,
    dueDate,
    daysUntilDue,
    severity,
    lastCompletedAt: null,
    action,
  };
}

// Returns ordered list of obligations. Red first, then amber, then by due date.
async function listObligations({ tenantId }) {
  if (!tenantId) throw new Error("Missing tenantId");

  const [accounts, imports, completedKeys] = await Promise.all([
    getActiveConnectedAccounts(tenantId),
    getLatestImportPerAccount(tenantId),
    getCompletions(tenantId),
  ]);

  const out = [];

  // 1. Per-account statement SLAs.
  for (const acct of accounts) {
    const o = statementObligationFor(acct, imports.byAccount[acct.id]?.at, imports.mostRecentAny);
    if (!o) continue;
    if (completedKeys[o.obligationKey]) {
      const completedAt = completedKeys[o.obligationKey].at;
      if (completedAt && daysBetween(completedAt, today()) < 25) continue;
    }
    out.push(o);
  }

  // 2. Statutory tax dates.
  // Surface the current calendar year's obligations within 30 days.
  const y = today().getUTCFullYear();
  // Also check prior year for items still open (e.g. Jan 15 Q4 falls in next calendar year).
  const yearsToCheck = [y - 1, y, y + 1];
  for (const yy of yearsToCheck) {
    for (const q of quarterlyTaxDates(yy)) {
      const o = taxObligation({
        obligationKey: `tax_estimated:${q.year}:${q.quarter}`,
        label: `Federal estimated tax — ${q.quarter} ${q.year}`,
        detail: `Quarterly estimated tax payment for ${q.quarter} ${q.year}. Due ${q.date}.`,
        dueDate: q.date,
        action: { kind: "mark_complete" },
        completedKeys,
      });
      if (o) out.push(o);
    }
    const ann = federalAnnualReturn(yy);
    const annO = taxObligation({
      obligationKey: `tax_federal_return:${ann.year}`,
      label: `Federal tax return — ${ann.year}`,
      detail: `IRS Form 1120/1065/1040 for ${ann.year}. Due ${ann.date}.`,
      dueDate: ann.date,
      action: { kind: "mark_complete" },
      completedKeys,
    });
    if (annO) out.push(annO);

    const de = delawareCorpAnnual(yy);
    const deO = taxObligation({
      obligationKey: `de_corp_annual:${de.year}`,
      label: `Delaware annual report + franchise tax — ${de.year}`,
      detail: `Delaware C-corp annual report + franchise tax for ${de.year}. Due March 1 — missing this is the $20K penalty trap. If you don't have a DE entity, mark complete to dismiss.`,
      dueDate: de.date,
      action: { kind: "mark_complete" },
      completedKeys,
    });
    if (deO) out.push(deO);
  }

  // Sort: red first, then amber; within each, by daysUntilDue ascending.
  const order = { red: 0, amber: 1, green: 2 };
  out.sort((a, b) => {
    const s = (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
    if (s !== 0) return s;
    return (a.daysUntilDue ?? 9999) - (b.daysUntilDue ?? 9999);
  });

  const counts = out.reduce((acc, o) => {
    acc[o.severity] = (acc[o.severity] || 0) + 1;
    acc.total = (acc.total || 0) + 1;
    return acc;
  }, {});

  return { ok: true, obligations: out, counts, asOf: isoDay(today()) };
}

// Append a completion record. Idempotent at the application layer: a
// repeat call just writes another record (newer wins on read).
async function markComplete({ tenantId, userId, obligationKey, evidenceFileId = null, note = null }) {
  if (!tenantId) throw new Error("Missing tenantId");
  if (!obligationKey) throw new Error("Missing obligationKey");
  const db = getDb();
  const ref = db.collection("obligationCompletions").doc();
  await ref.set({
    tenantId,
    userId: userId || null,
    obligationKey,
    evidenceFileId,
    note,
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true, id: ref.id };
}

module.exports = { listObligations, markComplete };
