"use strict";

/**
 * documentControlSchema.js — Schema validation, doc type configs, usage event logging
 *
 * Document Control is platform infrastructure — not a worker.
 * Firestore: documentControl/{operatorId}/documents/{docId}
 *
 * Aviation V1 is the reference implementation. Other verticals follow the same pattern.
 */

const admin = require("firebase-admin");
const crypto = require("crypto");
const { USAGE_EVENTS_COLLECTION } = require("../config/usageEvents");
const { computeRevenueAttribution } = require("../billing/recordUsageEvent");
const pricing = require("../config/pricing");

function getDb() { return admin.firestore(); }

// ═══════════════════════════════════════════════════════════════
//  VALID STATUSES & ACKNOWLEDGMENT TYPES
// ═══════════════════════════════════════════════════════════════

const VALID_STATUSES = ["active", "superseded", "expired", "pending_review"];
const VALID_ACK_TYPES = ["checkbox", "dropbox_sign", "none"];

// ═══════════════════════════════════════════════════════════════
//  AVIATION V1 DOCUMENT TYPE DEFAULTS
// ═══════════════════════════════════════════════════════════════

const AVIATION_DOC_TYPES = {
  poh: {
    label: "POH/AFM (Pilot Operating Handbook)",
    acknowledgmentType: "none",
    blockchainEnabled: false,
    expiryDefault: null,
    description: "Aircraft-specific operating handbook",
  },
  qrh: {
    label: "QRH (Quick Reference Handbook)",
    acknowledgmentType: "none",
    blockchainEnabled: false,
    expiryDefault: null,
    description: "Emergency and abnormal procedure quick reference",
  },
  gom: {
    label: "GOM (General Operations Manual)",
    acknowledgmentType: "dropbox_sign",
    blockchainEnabled: true,
    expiryDefault: 365, // annual review recommended
    description: "Company operations manual — requires formal acknowledgment",
  },
  mel: {
    label: "MEL (Minimum Equipment List)",
    acknowledgmentType: "checkbox",
    blockchainEnabled: false,
    expiryDefault: null, // per aircraft
    description: "Minimum equipment list for dispatch",
  },
  opspecs: {
    label: "OpSpecs (Operations Specifications)",
    acknowledgmentType: "dropbox_sign",
    blockchainEnabled: true,
    expiryDefault: null, // per FAA issuance
    description: "FAA operations specifications — requires formal acknowledgment",
  },
  training: {
    label: "Training Records",
    acknowledgmentType: "dropbox_sign",
    blockchainEnabled: true,
    expiryDefault: null,
    description: "Training completion records",
  },
  wb: {
    label: "W&B (Weight & Balance)",
    acknowledgmentType: "none",
    blockchainEnabled: false,
    expiryDefault: null,
    description: "Aircraft weight and balance data",
  },
  maintenance: {
    label: "Maintenance Documents",
    acknowledgmentType: "checkbox",
    blockchainEnabled: false,
    expiryDefault: null,
    description: "Maintenance records and inspections",
  },
  sop: {
    label: "SOP (Standard Operating Procedures)",
    acknowledgmentType: "checkbox",
    blockchainEnabled: false,
    expiryDefault: 365,
    description: "Standard operating procedures",
  },
  other: {
    label: "Other Document",
    acknowledgmentType: "none",
    blockchainEnabled: false,
    expiryDefault: null,
    description: "Miscellaneous document",
  },
};

// ═══════════════════════════════════════════════════════════════
//  SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Validate a document control record before writing.
 * @param {object} doc — document fields
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateDocument(doc) {
  const errors = [];

  if (!doc.workerId) errors.push("workerId required");
  if (!doc.operatorId) errors.push("operatorId required");
  if (!doc.docType) errors.push("docType required");
  if (!doc.fileName) errors.push("fileName required");

  if (doc.status && !VALID_STATUSES.includes(doc.status)) {
    errors.push(`Invalid status: ${doc.status}. Must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  if (doc.acknowledgmentType && !VALID_ACK_TYPES.includes(doc.acknowledgmentType)) {
    errors.push(`Invalid acknowledgmentType: ${doc.acknowledgmentType}. Must be one of: ${VALID_ACK_TYPES.join(", ")}`);
  }

  if (doc.distributionList && !Array.isArray(doc.distributionList)) {
    errors.push("distributionList must be an array");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Build a complete document record with defaults applied.
 * @param {object} input — user-provided fields
 * @returns {object} — complete document record
 */
function buildDocumentRecord(input) {
  const docType = input.docType || "other";
  const defaults = AVIATION_DOC_TYPES[docType] || AVIATION_DOC_TYPES.other;
  const docId = input.docId || `dc_${crypto.randomUUID().replace(/-/g, "")}`;

  return {
    docId,
    workerId: input.workerId,
    operatorId: input.operatorId,
    docType,
    fileName: input.fileName,
    revisionNumber: input.revisionNumber || null,
    effectiveDate: input.effectiveDate || null,
    expiryDate: input.expiryDate || null,
    status: "active",
    requiresAcknowledgment: input.acknowledgmentType ? input.acknowledgmentType !== "none" : defaults.acknowledgmentType !== "none",
    acknowledgmentType: input.acknowledgmentType || defaults.acknowledgmentType,
    blockchainEnabled: input.blockchainEnabled !== undefined ? input.blockchainEnabled : defaults.blockchainEnabled,
    distributionList: input.distributionList || [],
    storageUrl: input.storageUrl || null,
    sha256hash: input.sha256hash || null,
    chunkCount: input.chunkCount || 0,
    uploadedBy: input.uploadedBy || input.operatorId,
    uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
    acknowledgedBy: [],
    supersededBy: null,
    supersededAt: null,
    version: input.version || 1,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// ═══════════════════════════════════════════════════════════════
//  USAGE EVENT LOGGING (billing metering — processed in 34.11-T2)
// ═══════════════════════════════════════════════════════════════

/**
 * Log a billable usage event.
 * @param {string} operatorId
 * @param {string} eventType — signature_request|blockchain_record|document_storage_gb
 * @param {string} docId
 * @param {string} uid — user who triggered the event
 * @param {number} [amount=1] — metering amount
 */
async function logUsageEvent(operatorId, eventType, docId, uid, amount = 1, opts = {}) {
  const db = getDb();
  const eventId = `evt_${crypto.randomUUID().replace(/-/g, "")}`;

  // CODEX 50.5 — merge revenue-attribution fields. Document Control events
  // bill at fixed rates from pricing.overageRates (signature_request,
  // blockchain_record). Use those as the revenue basis when computing share.
  const ratePerEvent = (pricing.overageRates && pricing.overageRates[eventType]) || 0;
  const attribution = await computeRevenueAttribution({
    workerId: opts.workerId || null,
    userId: uid,
    tenantId: operatorId,
    revenueBasis: ratePerEvent > 0 ? "credit_pack" : "system",
    revenueAmount: ratePerEvent * amount,
    timestamp: new Date(),
    parentInteractionId: opts.parentInteractionId || null,
  }).catch(e => { console.warn("[50.5] doc-control attribution failed:", e.message); return {}; });

  await db.collection(USAGE_EVENTS_COLLECTION).doc(operatorId)
    .collection("events").doc(eventId).set({
      eventId,
      operatorId,
      eventType,
      docId,
      uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      amount,
      billed: false,
      billedAt: null,
      ...attribution,
    });

  return eventId;
}

module.exports = {
  VALID_STATUSES,
  VALID_ACK_TYPES,
  AVIATION_DOC_TYPES,
  validateDocument,
  buildDocumentRecord,
  logUsageEvent,
};
