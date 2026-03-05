// services/signatureService/storage.js
// Firestore CRUD for signature requests, pending signatures, delegations, audit.
// Follows getDb() pattern — lazy Firestore access.

const admin = require("firebase-admin");
const crypto = require("crypto");

function getDb() { return admin.firestore(); }
function nowServerTs() { return admin.firestore.FieldValue.serverTimestamp(); }

// ----------------------------
// Signature Requests
// ----------------------------

/**
 * Create a new signature request + denormalized pending entries for each signer.
 */
async function createSignatureRequest(data) {
  const db = getDb();
  const {
    requestId,
    tenantId,
    userId,
    title,
    subject,
    message,
    signers,
    documentType,
    vertical,
    metadata,
    documentRef,
    method,
    hellosignRequestId,
    preSignHash,
    status,
    expiresAt,
  } = data;

  const batch = db.batch();

  // Main signature request document
  const reqRef = db.collection("signatureRequests").doc(requestId);
  batch.set(reqRef, {
    requestId,
    tenantId,
    createdBy: userId,
    title: title || null,
    subject: subject || null,
    message: message || null,
    signers: signers || [],
    documentType: documentType || null,
    vertical: vertical || null,
    metadata: metadata || {},
    documentRef: documentRef || null,
    method: method || "typed_consent",
    hellosignRequestId: hellosignRequestId || null,
    blockchain: {
      preSignHash: preSignHash || null,
      signHashes: [],
      finalHash: null,
    },
    status: status || "pending",
    expiresAt: expiresAt || null,
    createdAt: nowServerTs(),
    updatedAt: nowServerTs(),
  });

  // Denormalized pending entries for each signer with a userId
  for (const signer of (signers || [])) {
    if (signer.userId) {
      const pendingRef = db
        .collection("users")
        .doc(signer.userId)
        .collection("pendingSignatures")
        .doc(requestId);
      batch.set(pendingRef, {
        requestId,
        tenantId,
        title: title || null,
        documentType: documentType || null,
        vertical: vertical || null,
        signerEmail: signer.email,
        signerRole: signer.role || "signer",
        status: "pending",
        expiresAt: expiresAt || null,
        createdAt: nowServerTs(),
      });
    }
  }

  await batch.commit();
  return { ok: true, requestId };
}

/**
 * Get a signature request by ID, validating tenant ownership.
 */
async function getSignatureRequest(tenantId, requestId) {
  const db = getDb();
  const snap = await db.collection("signatureRequests").doc(requestId).get();
  if (!snap.exists) return null;

  const data = snap.data();
  if (data.tenantId !== tenantId) return null;

  return { id: snap.id, ...data };
}

/**
 * Update a specific signer's status within the signers array.
 */
async function updateSignerStatus(requestId, signerEmail, updates) {
  const db = getDb();
  const ref = db.collection("signatureRequests").doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "not_found" };

  const data = snap.data();
  const signers = (data.signers || []).map(s => {
    if (s.email === signerEmail) {
      return { ...s, ...updates };
    }
    return s;
  });

  await ref.update({
    signers,
    updatedAt: nowServerTs(),
  });

  return { ok: true };
}

/**
 * Update top-level fields on a signature request.
 */
async function updateRequestStatus(requestId, updates) {
  const db = getDb();
  await db.collection("signatureRequests").doc(requestId).update({
    ...updates,
    updatedAt: nowServerTs(),
  });
  return { ok: true };
}

/**
 * Get all pending signatures for a user within a tenant.
 */
async function getPendingForUser(tenantId, userId) {
  const db = getDb();
  const snap = await db
    .collection("users")
    .doc(userId)
    .collection("pendingSignatures")
    .where("tenantId", "==", tenantId)
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Remove a pending signature entry for a user.
 */
async function removePendingSignature(userId, requestId) {
  const db = getDb();
  await db
    .collection("users")
    .doc(userId)
    .collection("pendingSignatures")
    .doc(requestId)
    .delete();
  return { ok: true };
}

// ----------------------------
// Delegations
// ----------------------------

/**
 * Create a signing authority delegation.
 */
async function createDelegation(data) {
  const db = getDb();
  const delegationId = "del_" + crypto.randomUUID().replace(/-/g, "");
  const {
    tenantId,
    grantedBy,
    grantedTo,
    scope,
    scopeValue,
    expiresAt,
  } = data;

  await db.collection("delegations").doc(delegationId).set({
    delegationId,
    tenantId,
    grantedBy,
    grantedTo,
    scope: scope || "all", // "all", "vertical", "documentType"
    scopeValue: scopeValue || null,
    active: true,
    expiresAt: expiresAt || null,
    createdAt: nowServerTs(),
    revokedAt: null,
  });

  return { ok: true, delegationId };
}

/**
 * Get active delegations for a user within a tenant, optionally filtered by scope.
 */
async function getDelegation(tenantId, grantedTo, scope) {
  const db = getDb();
  let query = db
    .collection("delegations")
    .where("tenantId", "==", tenantId)
    .where("grantedTo", "==", grantedTo)
    .where("active", "==", true);

  if (scope) {
    query = query.where("scope", "==", scope);
  }

  const snap = await query.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Revoke a delegation.
 */
async function revokeDelegation(delegationId, userId) {
  const db = getDb();
  const ref = db.collection("delegations").doc(delegationId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "not_found" };

  const data = snap.data();
  if (data.grantedBy !== userId && data.grantedTo !== userId) {
    return { ok: false, error: "forbidden" };
  }

  await ref.update({
    active: false,
    revokedAt: nowServerTs(),
  });

  return { ok: true };
}

// ----------------------------
// Audit Trail
// ----------------------------

/**
 * Append an entry to the signature audit trail.
 */
async function logAudit(data) {
  const db = getDb();
  const auditId = "aud_" + crypto.randomUUID().replace(/-/g, "");
  await db.collection("signatureAudit").doc(auditId).set({
    auditId,
    requestId: data.requestId || null,
    tenantId: data.tenantId || null,
    userId: data.userId || null,
    action: data.action || "unknown",
    details: data.details || {},
    ipAddress: data.ipAddress || null,
    timestamp: nowServerTs(),
  });
  return { ok: true, auditId };
}

/**
 * Get the full audit trail for a signature request, ordered by timestamp.
 */
async function getAuditTrail(requestId) {
  const db = getDb();
  const snap = await db
    .collection("signatureAudit")
    .where("requestId", "==", requestId)
    .orderBy("timestamp", "asc")
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

module.exports = {
  createSignatureRequest,
  getSignatureRequest,
  updateSignerStatus,
  updateRequestStatus,
  getPendingForUser,
  removePendingSignature,
  createDelegation,
  getDelegation,
  revokeDelegation,
  logAudit,
  getAuditTrail,
};
