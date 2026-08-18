"use strict";

/**
 * signOff.js — real internal sign-off for aviation instructor endorsements
 * and ground-training records.
 *
 * Sean, 2026-08-17: "The instructor sign off workflow should be done with
 * internal sign off (we don't need to pay $1-3 signoff fees via the API)
 * and it should be initiated by either the instructor OR the student, but
 * ideally initiated at the conclusion of the flight or training period by
 * Skye so we don't see that dependency fall through the cracks."
 *
 * This reuses the exact same internal hash-chain mechanism already real and
 * working for nursing's signed clinical evaluations
 * (services/education/clinicalEvaluation.js + signatureService/blockchain.js)
 * — no paid e-signature API, no per-envelope fee. What's new here is the
 * request/initiate step: a sign-off starts as a PENDING request (raised by
 * the instructor, the student, or Skye automatically) and only becomes a
 * real signature once the instructor actually attests.
 *
 * Firestore:
 *   logbooks/{pilotId}/signOffRequests/{id}
 *     — {entryCollection, entryId, initiatedBy, status, createdAt, signature?}
 *   The underlying logbooks/{pilotId}/endorsements/{id} and
 *   .../groundTraining/{id} docs get their signatureStatus + signature
 *   fields updated on completion — same collections handlers.js already
 *   writes to, just with a real signature instead of the old
 *   name+cert-number-present proxy.
 */

const admin = require("firebase-admin");
const { computePreSignHash, computeSignHash, computeFinalHash } = require("../signatureService/blockchain");

const VALID_ENTRY_COLLECTIONS = ["endorsements", "groundTraining"];
const VALID_INITIATORS = ["instructor", "student", "skye"];

/**
 * Request a sign-off — the initiation step. Does not sign anything yet.
 */
async function requestSignOff(db, { pilotId, entryCollection, entryId, initiatedBy, requestedByUid }) {
  if (!pilotId || !entryCollection || !entryId) {
    return { ok: false, error: "pilotId, entryCollection, and entryId required" };
  }
  if (!VALID_ENTRY_COLLECTIONS.includes(entryCollection)) {
    return { ok: false, error: `entryCollection must be one of: ${VALID_ENTRY_COLLECTIONS.join(", ")}` };
  }
  const initiator = VALID_INITIATORS.includes(initiatedBy) ? initiatedBy : "instructor";

  const entryRef = db.collection("logbooks").doc(pilotId).collection(entryCollection).doc(entryId);
  const entrySnap = await entryRef.get();
  if (!entrySnap.exists) return { ok: false, error: "entry not found" };

  const ref = db.collection("logbooks").doc(pilotId).collection("signOffRequests").doc();
  await ref.set({
    entryCollection, entryId,
    initiatedBy: initiator,
    requestedByUid: requestedByUid || null,
    status: "pending",
    pilotId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true, signOffRequestId: ref.id };
}

/**
 * Complete a sign-off — the instructor attests. Computes a real,
 * recomputable hash-chain signature (same method nursing's clinical
 * evaluations use) and writes it onto both the request and the underlying
 * endorsement/ground-training record.
 */
async function completeSignOff(db, { pilotId, signOffRequestId, signer }) {
  if (!pilotId || !signOffRequestId) return { ok: false, error: "pilotId and signOffRequestId required" };
  if (!signer || !signer.name) return { ok: false, error: "signer.name required (the attesting instructor)" };

  const requestRef = db.collection("logbooks").doc(pilotId).collection("signOffRequests").doc(signOffRequestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) return { ok: false, error: "sign-off request not found" };
  const request = requestSnap.data();
  if (request.status === "signed") return { ok: false, error: "already signed" };

  const entryRef = db.collection("logbooks").doc(pilotId).collection(request.entryCollection).doc(request.entryId);
  const entrySnap = await entryRef.get();
  if (!entrySnap.exists) return { ok: false, error: "underlying entry no longer exists" };
  const entry = entrySnap.data();

  const signedAt = new Date().toISOString();
  const signerEmail = signer.email || `${String(signer.name).toLowerCase().replace(/[^a-z0-9]+/g, ".")}@instructor.local`;
  const signers = [{ email: signerEmail, name: signer.name }];

  const preSignHash = computePreSignHash({
    documentRef: `${request.entryCollection}:${pilotId}:${request.entryId}`,
    signers,
    createdAt: signedAt,
    metadata: { type: entry.type || request.entryCollection, subject: entry.subject || entry.endorsementText || null, date: entry.date || null },
  });
  const signHash = computeSignHash({ preSignHash, previousSignHashes: [], signerEmail, signedAt });
  const signHashes = [{ signerEmail, signedAt, hash: signHash }];
  const finalHash = computeFinalHash({ preSignHash, signHashes });

  const signature = {
    method: "sociii_signature_chain_v1",
    signer: { name: signer.name, credential: signer.credential || null, email: signerEmail },
    signedAt,
    preSignHash,
    signHashes,
    finalHash,
  };

  const batch = db.batch();
  batch.update(requestRef, { status: "signed", signature, resolvedAt: admin.firestore.FieldValue.serverTimestamp() });
  batch.update(entryRef, {
    signatureStatus: "signed",
    instructorName: signer.name,
    instructorCertNumber: signer.credential || entry.instructorCertNumber || null,
    signature,
  });
  await batch.commit();

  return { ok: true, signature };
}

async function listPendingSignOffs(db, pilotId) {
  const snap = await db.collection("logbooks").doc(pilotId).collection("signOffRequests")
    .where("status", "==", "pending").get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Skye's auto-initiation hook — call this right after a flight or training
 * entry is logged. Raises a pending sign-off automatically whenever the
 * entry represents dual instruction (dualGiven/dualReceived > 0) or is a
 * ground-training/endorsement-worthy event, so the request never depends on
 * a human remembering to ask for it (Sean's stated concern).
 */
async function autoInitiateSignOffIfNeeded(db, { pilotId, entryCollection, entryId, entryData }) {
  const needsSignOff = entryCollection === "groundTraining"
    ? true
    : (Number(entryData?.dualGiven) > 0 || Number(entryData?.dualReceived) > 0);
  if (!needsSignOff) return { ok: true, requested: false };

  const result = await requestSignOff(db, { pilotId, entryCollection, entryId, initiatedBy: "skye" });
  return { ok: result.ok, requested: result.ok, signOffRequestId: result.signOffRequestId, error: result.error };
}

module.exports = { requestSignOff, completeSignOff, listPendingSignOffs, autoInitiateSignOffIfNeeded };
