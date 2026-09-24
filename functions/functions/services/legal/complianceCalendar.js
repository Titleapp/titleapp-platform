"use strict";

/**
 * complianceCalendar.js — Sterling's compliance calendar (CODEX 103, Section 1a).
 *
 * Source of truth is `legalComplianceItems/{itemId}`: dates entered once,
 * from a real source document, by a human (via chat with Sterling or
 * directly) — never re-derived by an LLM reading a document fresh each
 * session. Severity is never stored — it's recomputed deterministically
 * from the date every time it's read (services/accounting/obligations.js's
 * severityFromDate), so it can never go stale.
 *
 * Each item is mirrored into `customObligations` — the existing surface
 * services/accounting/obligations.js already reads, and that Max's
 * query_compliance_filings chat tool and workspaceBrief.js already
 * consume. That comment in obligations.js named "Patent Worker" as an
 * expected future seeder of this exact collection — Sterling is that
 * seeder. No changes needed to the reading side beyond the per-item
 * lead-time window support already added to severityFromDate().
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

// Calibrated to how long the underlying task actually takes (CODEX 103
// Section 4), not a fixed number of days. amberDays is when the first
// alert should fire; redDays is the escalation point (roughly half the
// lead time) for an item still unacknowledged.
const LEAD_TIME_POLICY = {
  uspto_nonprovisional_conversion: { amberDays: 90, redDays: 30 },
  pct_filing: { amberDays: 90, redDays: 30 },
  foreign_qualification: { amberDays: 60, redDays: 14 },
  regcf_annual_report: { amberDays: 45, redDays: 14 },
  material_contract_followup: { amberDays: 14, redDays: 3 },
  other: { amberDays: 30, redDays: 7 },
};

function itemsCollection() { return getDb().collection("legalComplianceItems"); }

async function addComplianceItem({ tenantId, type, label, dueDate, dateConfidence, sourceNote, addedBy }) {
  if (!tenantId) throw new Error("addComplianceItem: tenantId is required");
  if (!label) throw new Error("addComplianceItem: label is required");
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    throw new Error("addComplianceItem: dueDate must be an exact YYYY-MM-DD entered from a real source document, never guessed");
  }
  const itemType = LEAD_TIME_POLICY[type] ? type : "other";
  const ref = itemsCollection().doc();
  const item = {
    tenantId,
    type: itemType,
    label,
    dueDate,
    // "exact" unless the caller says otherwise — e.g. Sterling only knows a
    // provisional filing happened "in May 2026" with no confirmed day, so it
    // records the real known fact (month) rather than inventing a day.
    dateConfidence: dateConfidence || "exact",
    sourceNote: sourceNote || null,
    addedBy: addedBy || "unspecified",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set(item);
  await syncItemToObligations(ref.id, item);
  return { ok: true, id: ref.id, item: { id: ref.id, ...item } };
}

async function listComplianceItems({ tenantId }) {
  if (!tenantId) throw new Error("listComplianceItems: tenantId is required");
  const snap = await itemsCollection().where("tenantId", "==", tenantId).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function markComplianceItemDone({ tenantId, itemId, userId }) {
  if (!tenantId || !itemId) throw new Error("markComplianceItemDone: tenantId and itemId are required");
  const ref = itemsCollection().doc(itemId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().tenantId !== tenantId) {
    throw new Error("markComplianceItemDone: item not found for this tenant");
  }
  const { markComplete } = require("../accounting/obligations");
  await markComplete({ tenantId, userId, obligationKey: `sterling_compliance:${itemId}` });
  return { ok: true };
}

async function syncItemToObligations(itemId, item) {
  const policy = LEAD_TIME_POLICY[item.type] || LEAD_TIME_POLICY.other;
  const confidenceNote = item.dateConfidence && item.dateConfidence !== "exact"
    ? `Date confidence: ${item.dateConfidence} — confirm the exact date with the source document/counsel.`
    : null;
  const detailParts = [item.sourceNote, confidenceNote].filter(Boolean);
  await getDb().collection("customObligations").doc(`sterling_compliance__${itemId}`).set({
    tenantId: item.tenantId,
    obligationKey: `sterling_compliance:${itemId}`,
    label: item.label,
    detail: detailParts.join(" "),
    dueDate: item.dueDate,
    amberDays: policy.amberDays,
    redDays: policy.redDays,
    kind: item.type,
    createdByWorker: "sterling",
  }, { merge: true });
}

// Re-derive every mirror doc for a tenant. Idempotent (deterministic doc
// IDs) — safe to call after any edit, or just to repair drift.
async function syncComplianceCalendarToObligations(tenantId) {
  if (!tenantId) throw new Error("syncComplianceCalendarToObligations: tenantId is required");
  const items = await listComplianceItems({ tenantId });
  for (const item of items) {
    await syncItemToObligations(item.id, item);
  }
  return { ok: true, synced: items.length };
}

module.exports = {
  LEAD_TIME_POLICY,
  addComplianceItem,
  listComplianceItems,
  markComplianceItemDone,
  syncComplianceCalendarToObligations,
};
