/**
 * materialChangeDetection.js — Creator Agreement Material Change Detection
 *
 * Detects material changes to worker config that require re-acceptance:
 *   - Jurisdiction change
 *   - Compliance suite change
 *   - Worker visibility change (internal_only → public)
 *   - Pricing tier change
 *   - Blockchain toggle (first-time enable)
 *
 * On material change: flags worker as PENDING_RE_ACCEPTANCE,
 * saves pending changes but does NOT apply to live worker until re-acceptance.
 *
 * Re-acceptance endpoint: POST /v1/workers/{workerId}/reaccept
 */

"use strict";

const admin = require("firebase-admin");
const { sendError, CODES } = require("../helpers/apiResponse");

function getDb() { return admin.firestore(); }

const MATERIAL_FIELDS = [
  "jurisdiction",
  "complianceSuite",
  "internal_only",
  "pricingTier",
  "blockchainEnabled",
];

// ═══════════════════════════════════════════════════════════════
//  DETECT MATERIAL CHANGES
// ═══════════════════════════════════════════════════════════════

/**
 * Compare incoming worker update against current live snapshot.
 * Returns { isMaterial, changes[] } where changes is a human-readable list.
 */
function detectMaterialChanges(currentData, incomingData) {
  const changes = [];

  // Jurisdiction change
  if (incomingData.jurisdiction !== undefined &&
      incomingData.jurisdiction !== currentData.jurisdiction) {
    changes.push(`Jurisdiction (${currentData.jurisdiction || "none"} → ${incomingData.jurisdiction})`);
  }

  // Compliance suite change
  if (incomingData.complianceSuite !== undefined) {
    const current = (currentData.complianceSuite || []).sort().join(",");
    const incoming = (incomingData.complianceSuite || []).sort().join(",");
    if (current !== incoming) {
      changes.push(`Compliance suite updated`);
    }
  }

  // Visibility change (internal_only: true → false)
  if (incomingData.internal_only === false && currentData.internal_only === true) {
    changes.push(`Visibility (internal → public)`);
  }

  // Pricing tier change
  if (incomingData.pricingTier !== undefined &&
      incomingData.pricingTier !== currentData.pricingTier) {
    const tierLabels = { 1: "$29", 2: "$49", 3: "$79" };
    changes.push(`Pricing (${tierLabels[currentData.pricingTier] || currentData.pricingTier || "none"} → ${tierLabels[incomingData.pricingTier] || incomingData.pricingTier})`);
  }

  // Blockchain toggle (first-time enable only)
  if (incomingData.blockchainEnabled === true && currentData.blockchainEnabled !== true) {
    changes.push(`Blockchain enabled`);
  }

  return {
    isMaterial: changes.length > 0,
    changes,
    summary: changes.length > 0 ? `You changed: ${changes.join(", ")}` : null,
  };
}

// ═══════════════════════════════════════════════════════════════
//  APPLY MATERIAL CHANGE CHECK ON WORKER SAVE
// ═══════════════════════════════════════════════════════════════

/**
 * Called when a worker document is being updated.
 * If material change detected:
 *   - Sets agreementStatus = 'pending_re_acceptance'
 *   - Stores materialChangeSummary
 *   - Stores priorLiveSnapshot (current config before change)
 *   - Saves new changes to Firestore but marks as pending
 *
 * POST /v1/workers/{workerId}/save
 * Body: worker update fields
 */
async function saveWorkerWithChangeDetection(req, res) {
  const db = getDb();
  const user = req._user;
  const uid = user.uid;
  const { workerId } = req.params || {};
  const updates = req.body || {};

  if (!workerId) return sendError(res, 400, CODES.MISSING_FIELDS, "workerId required");

  // Get current worker doc
  const workerRef = db.collection("workers").doc(workerId);
  const workerSnap = await workerRef.get();

  if (!workerSnap.exists) {
    return sendError(res, 404, CODES.NOT_FOUND, "Worker not found");
  }

  const currentData = workerSnap.data();

  // Verify ownership
  if (currentData.creatorId !== uid && currentData.ownerId !== uid) {
    return sendError(res, 403, CODES.FORBIDDEN, "Not the owner of this worker");
  }

  // Check for material changes
  const { isMaterial, summary } = detectMaterialChanges(currentData, updates);

  if (isMaterial && currentData.agreementStatus === "accepted") {
    // Material change on a live/accepted worker — require re-acceptance
    const priorSnapshot = {};
    for (const field of MATERIAL_FIELDS) {
      if (currentData[field] !== undefined) {
        priorSnapshot[field] = currentData[field];
      }
    }

    // Save updates to Firestore but flag as pending re-acceptance
    await workerRef.update({
      ...updates,
      agreementStatus: "pending_re_acceptance",
      lastMaterialChangeAt: admin.firestore.FieldValue.serverTimestamp(),
      materialChangeSummary: summary,
      priorLiveSnapshot: priorSnapshot,
    });

    return res.json({
      ok: true,
      agreementStatus: "pending_re_acceptance",
      materialChangeSummary: summary,
      message: "Material change detected. Re-acceptance required before changes go live.",
    });
  }

  // No material change (or worker not yet accepted) — save normally
  await workerRef.update(updates);

  return res.json({
    ok: true,
    agreementStatus: currentData.agreementStatus || "none",
  });
}

// ═══════════════════════════════════════════════════════════════
//  RE-ACCEPTANCE
// ═══════════════════════════════════════════════════════════════

/**
 * Creator re-accepts agreement after material change.
 * POST /v1/workers/{workerId}/reaccept
 */
async function reacceptWorkerAgreement(req, res) {
  const db = getDb();
  const user = req._user;
  const uid = user.uid;
  const { workerId } = req.params || {};

  if (!workerId) return sendError(res, 400, CODES.MISSING_FIELDS, "workerId required");

  const workerRef = db.collection("workers").doc(workerId);
  const workerSnap = await workerRef.get();

  if (!workerSnap.exists) {
    return sendError(res, 404, CODES.NOT_FOUND, "Worker not found");
  }

  const workerData = workerSnap.data();

  // Verify ownership
  if (workerData.creatorId !== uid && workerData.ownerId !== uid) {
    return sendError(res, 403, CODES.FORBIDDEN, "Not the owner of this worker");
  }

  if (workerData.agreementStatus !== "pending_re_acceptance") {
    return sendError(res, 400, CODES.BAD_REQUEST, "No pending re-acceptance required");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  // Update user agreement record
  const userRef = db.collection("users").doc(uid);
  await userRef.set({
    agreementTimestamp: now,
    agreementVersion: "v1.0",
    agreementAccepted: true,
  }, { merge: true });

  // Update worker — accept changes and clear pending state
  await workerRef.update({
    agreementStatus: "accepted",
    lastMaterialChangeAt: now,
    materialChangeSummary: null,
    priorLiveSnapshot: null,
  });

  return res.json({
    ok: true,
    agreementStatus: "accepted",
    message: "Agreement re-accepted. Changes are now live.",
  });
}

// ═══════════════════════════════════════════════════════════════
//  INITIAL AGREEMENT ACCEPTANCE
// ═══════════════════════════════════════════════════════════════

/**
 * Creator accepts agreement for the first time (on initial publish).
 * POST /v1/workers/{workerId}/accept-agreement
 */
async function acceptWorkerAgreement(req, res) {
  const db = getDb();
  const user = req._user;
  const uid = user.uid;
  const { workerId } = req.params || {};

  if (!workerId) return sendError(res, 400, CODES.MISSING_FIELDS, "workerId required");

  const workerRef = db.collection("workers").doc(workerId);
  const workerSnap = await workerRef.get();

  if (!workerSnap.exists) {
    return sendError(res, 404, CODES.NOT_FOUND, "Worker not found");
  }

  const workerData = workerSnap.data();

  if (workerData.creatorId !== uid && workerData.ownerId !== uid) {
    return sendError(res, 403, CODES.FORBIDDEN, "Not the owner of this worker");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  // Update user
  await db.collection("users").doc(uid).set({
    agreementAccepted: true,
    agreementTimestamp: now,
    agreementVersion: "v1.0",
  }, { merge: true });

  // Update worker
  await workerRef.update({
    agreementStatus: "accepted",
  });

  return res.json({ ok: true, agreementStatus: "accepted" });
}

module.exports = {
  detectMaterialChanges,
  saveWorkerWithChangeDetection,
  reacceptWorkerAgreement,
  acceptWorkerAgreement,
};
