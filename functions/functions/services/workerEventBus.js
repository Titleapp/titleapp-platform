/**
 * workerEventBus.js — Internal worker-to-worker event bus
 *
 * Append-only Firestore collection for cross-worker event flows.
 * Matches existing platform pattern (event-sourced, immutable).
 *
 * 14 event types defined for Government In A Box:
 *   DMV:        dmv.title.fraud_flag, dmv.title.intake.submitted, dmv.title.intake.issued
 *   Permitting: perm.intake.routed_for_review, perm.intake.event_permit,
 *               perm.intake.env_review_required, perm.intake.fee_required,
 *               perm.review.notice_required, perm.co.issued
 *   Inspector:  insp.violation.reinspection_required, insp.completed
 *   Recorder:   rec.intake.recorded, rec.deed.transfer_recorded, rec.fraud.hold_required
 */

const admin = require("firebase-admin");

function getDb() {
  return admin.firestore();
}

// ═══════════════════════════════════════════════════════════════
//  EVENT TYPES — Registered cross-worker event flows
// ═══════════════════════════════════════════════════════════════

const GOV_EVENT_TYPES = {
  // DMV
  "dmv.title.intake.submitted":     { source: "GOV-001", targets: [] },
  "dmv.title.intake.issued":        { source: "GOV-001", targets: [] },
  "dmv.title.intake.held":          { source: "GOV-001", targets: [] },
  "dmv.title.intake.rejected":      { source: "GOV-001", targets: [] },
  "dmv.title.fraud_flag":           { source: "GOV-001", targets: ["GOV-003"] },

  // Permitting
  "perm.intake.routed_for_review":  { source: "GOV-016", targets: ["GOV-018"] },
  "perm.intake.event_permit":       { source: "GOV-016", targets: ["GOV-022"] },
  "perm.intake.env_review_required":{ source: "GOV-016", targets: ["GOV-023"] },
  "perm.intake.fee_required":       { source: "GOV-016", targets: ["GOV-024"] },
  "perm.review.notice_required":    { source: "GOV-018", targets: ["GOV-025"] },
  "perm.co.issued":                 { source: "GOV-027", targets: ["GOV-052"] },

  // Inspector
  "insp.violation.reinspection_required": { source: "GOV-031", targets: ["GOV-037"] },
  "insp.completed":                       { source: "GOV-031", targets: ["GOV-038"] },

  // Recorder
  "rec.intake.recorded":            { source: "GOV-041", targets: ["GOV-042", "GOV-049"] },
  "rec.deed.transfer_recorded":     { source: "GOV-043", targets: ["GOV-052"] },
  "rec.fraud.hold_required":        { source: "GOV-047", targets: ["GOV-041"] },
};

// ═══════════════════════════════════════════════════════════════
//  EMIT — Write an event to the workerEvents collection
// ═══════════════════════════════════════════════════════════════

/**
 * Emit a worker event. Append-only write to Firestore.
 *
 * @param {string} eventType — one of GOV_EVENT_TYPES keys
 * @param {object} payload — event-specific data
 * @param {object} context — { jurisdictionFips, tenantId, userId }
 * @returns {Promise<{ok: boolean, eventId: string}>}
 */
async function emitEvent(eventType, payload, context = {}) {
  const db = getDb();
  const eventDef = GOV_EVENT_TYPES[eventType];

  const doc = {
    eventType,
    sourceWorker: eventDef ? eventDef.source : null,
    targetWorkers: eventDef ? eventDef.targets : [],
    jurisdictionFips: context.jurisdictionFips || null,
    tenantId: context.tenantId || null,
    userId: context.userId || null,
    payload: payload || {},
    processed: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection("workerEvents").add(doc);
  console.log(`[workerEventBus] Emitted ${eventType} → ${ref.id}`);
  return { ok: true, eventId: ref.id };
}

// ═══════════════════════════════════════════════════════════════
//  QUERY — Read events by filters
// ═══════════════════════════════════════════════════════════════

/**
 * Query worker events with filters.
 *
 * @param {object} filters
 * @param {string} [filters.eventType] — filter by event type
 * @param {string} [filters.jurisdictionFips] — filter by jurisdiction
 * @param {string} [filters.targetWorker] — filter by target worker ID
 * @param {boolean} [filters.unprocessedOnly=false] — only unprocessed events
 * @param {number} [filters.limit=50] — max results
 * @returns {Promise<object[]>}
 */
async function queryEvents(filters = {}) {
  const db = getDb();
  let q = db.collection("workerEvents").orderBy("createdAt", "desc");

  if (filters.eventType) {
    q = q.where("eventType", "==", filters.eventType);
  }
  if (filters.jurisdictionFips) {
    q = q.where("jurisdictionFips", "==", filters.jurisdictionFips);
  }
  if (filters.targetWorker) {
    q = q.where("targetWorkers", "array-contains", filters.targetWorker);
  }
  if (filters.unprocessedOnly) {
    q = q.where("processed", "==", false);
  }

  q = q.limit(filters.limit || 50);

  const snap = await q.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ═══════════════════════════════════════════════════════════════
//  MARK PROCESSED — Update event as consumed
// ═══════════════════════════════════════════════════════════════

/**
 * Mark an event as processed by a target worker.
 *
 * @param {string} eventId
 * @param {string} processedBy — worker ID that consumed the event
 * @returns {Promise<{ok: boolean}>}
 */
async function markProcessed(eventId, processedBy) {
  const db = getDb();
  await db.doc(`workerEvents/${eventId}`).update({
    processed: true,
    processedBy,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
}

module.exports = {
  GOV_EVENT_TYPES,
  emitEvent,
  queryEvents,
  markProcessed,
};
