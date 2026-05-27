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

// Tenant formation date — used to skip tax obligations for years before the
// entity existed. Derived from the earliest membership createdAt for the
// tenant (same-batch write as workspace creation, so it's effectively the
// formation date for SOCIII-style new tenants). Older tenants that migrated
// in can override by setting an explicit incorporationDate on the workspace
// doc (post-launch enhancement). Returns null if not determinable, in which
// case the caller keeps the legacy [y-1, y, y+1] behavior.
async function getTenantFormationDate(tenantId, userId = null) {
  // Personal Vault / no-tenant case: gate on the user's account creation
  // instead. A freshly-signed-up personal user cannot be on the hook for
  // 2025 corporate taxes; surfacing them is the same bug class as showing
  // pre-formation obligations to a new C-corp tenant.
  if (!tenantId || tenantId === "vault" || tenantId === "personal") {
    if (!userId) return null;
    try {
      const uSnap = await getDb().doc(`users/${userId}`).get();
      const at = tsToDate(uSnap.exists ? uSnap.data()?.createdAt : null);
      if (at) return at;
    } catch (e) {
      console.warn("[obligations] personal-vault formation lookup failed:", e.message);
    }
    try {
      const userRec = await admin.auth().getUser(userId);
      const at = userRec?.metadata?.creationTime ? new Date(userRec.metadata.creationTime) : null;
      if (at) return at;
    } catch (e) {
      console.warn("[obligations] auth-metadata formation lookup failed:", e.message);
    }
    // Last-resort fallback: treat "now" as formation so only forward-looking
    // statutory dates surface. Better to under-surface than to scare a brand-
    // new user with 2025 overdue items they cannot possibly owe.
    return today();
  }
  try {
    const snap = await getDb().collection("memberships")
      .where("tenantId", "==", tenantId)
      .limit(20)
      .get();
    let earliest = null;
    for (const d of snap.docs) {
      const at = tsToDate(d.data()?.createdAt);
      if (at && (!earliest || at < earliest)) earliest = at;
    }
    return earliest;
  } catch (e) {
    console.warn("[obligations] getTenantFormationDate failed:", e.message);
    return null;
  }
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
// Load custom obligations created by other workers (e.g. Business Law worker
// seeding LLC wind-down deadlines, or Patent Worker seeding USPTO response
// dates). Schema mirrors the synthetic obligations built below: each record
// is { tenantId, obligationKey, label, detail, dueDate (ISO YYYY-MM-DD),
// severity?, kind?, createdByWorker }.
async function getCustomObligations(tenantId) {
  if (!tenantId) return [];
  try {
    const snap = await getDb().collection("customObligations")
      .where("tenantId", "==", tenantId)
      .limit(200)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("[obligations] getCustomObligations failed:", e.message);
    return [];
  }
}

async function listObligations({ tenantId, userId = null }) {
  if (!tenantId) throw new Error("Missing tenantId");

  const [accounts, imports, completedKeys, formationDate, customs] = await Promise.all([
    getActiveConnectedAccounts(tenantId),
    getLatestImportPerAccount(tenantId),
    getCompletions(tenantId),
    getTenantFormationDate(tenantId, userId),
    getCustomObligations(tenantId),
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
  // 2026-05-22 (#237 follow-up) — Skip tax obligations for years before the
  // tenant's formation date. SOCIII was formed 2026-05; surfacing 2025 Q1-Q4
  // estimated tax and 2025 Delaware franchise to a freshly-incorporated tenant
  // is a hard miss (a tenant cannot owe taxes for a period when it did not
  // exist). Within the formation year, also skip obligations whose due date
  // already passed before the tenant was created.
  const formationYear = formationDate ? formationDate.getUTCFullYear() : null;
  function tenantExistedAt(dueDateIso) {
    if (!formationDate) return true; // unknown formation → preserve legacy behavior
    return new Date(dueDateIso + "T23:59:59Z") >= formationDate;
  }
  for (const yy of yearsToCheck) {
    // Skip entire tax year if it ended before the tenant existed.
    if (formationYear != null && yy < formationYear) continue;
    for (const q of quarterlyTaxDates(yy)) {
      if (!tenantExistedAt(q.date)) continue;
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
    if (tenantExistedAt(ann.date)) {
      const annO = taxObligation({
        obligationKey: `tax_federal_return:${ann.year}`,
        label: `Federal tax return — ${ann.year}`,
        detail: `IRS Form 1120/1065/1040 for ${ann.year}. Due ${ann.date}.`,
        dueDate: ann.date,
        action: { kind: "mark_complete" },
        completedKeys,
      });
      if (annO) out.push(annO);
    }

    const de = delawareCorpAnnual(yy);
    if (tenantExistedAt(de.date)) {
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
  }

  // 3. Custom obligations seeded by other workers (Business Law,
  // Patent Worker, etc.). Each record carries its own dueDate and
  // optionally severity; we recompute severity from the date so it stays
  // truthful as time passes.
  for (const c of customs) {
    if (!c.dueDate) continue;
    if (completedKeys[c.obligationKey]) continue;
    const { severity, daysUntilDue } = severityFromTaxDate(c.dueDate);
    out.push({
      obligationKey: c.obligationKey,
      label: c.label || c.obligationKey,
      detail: c.detail || "",
      dueDate: c.dueDate,
      daysUntilDue,
      severity: c.severity && ["red","amber","green"].includes(c.severity) && daysUntilDue >= 0 ? c.severity : severity,
      lastCompletedAt: null,
      action: { kind: "mark_complete" },
      source: c.createdByWorker || "custom",
      kind: c.kind || null,
    });
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
