"use strict";

/**
 * documentControlService.js — Document Control lifecycle handlers
 *
 * Document Control is platform infrastructure — not a worker.
 * Firestore: documentControl/{operatorId}/documents/{docId}
 *
 * Handlers: upload, confirm revision, acknowledge, list, version history,
 * update distribution, acknowledgment status, admin overview, expiry check.
 */

const admin = require("firebase-admin");
const crypto = require("crypto");

const {
  AVIATION_DOC_TYPES,
  validateDocument,
  buildDocumentRecord,
  logUsageEvent,
} = require("./documentControlSchema");

function getDb() { return admin.firestore(); }

// Lazy-load signature + blockchain services
let _signatureService, _blockchain;
function getSignatureService() {
  if (!_signatureService) _signatureService = require("../services/signatureService");
  return _signatureService;
}
function getBlockchain() {
  if (!_blockchain) _blockchain = require("../services/signatureService/blockchain");
  return _blockchain;
}

// ═══════════════════════════════════════════════════════════════
//  UPLOAD DOCUMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Upload a new document. If an active doc of the same docType+workerId
 * already exists, returns it for the frontend to confirm revision.
 */
async function handleUploadDocument(req, res, { userId }) {
  const body = req.body || {};
  const { operatorId, workerId, docType, fileName, revisionNumber,
    effectiveDate, expiryDate, acknowledgmentType, blockchainEnabled,
    distributionList, storageUrl, sha256hash, chunkCount, forceNew } = body;

  if (!operatorId) return res.status(400).json({ ok: false, error: "operatorId required", code: "MISSING_FIELD" });

  // Validate
  const validation = validateDocument({ workerId, operatorId, docType, fileName, acknowledgmentType });
  if (!validation.valid) {
    return res.status(400).json({ ok: false, error: validation.errors.join("; "), code: "VALIDATION_ERROR" });
  }

  const db = getDb();
  const docsRef = db.collection("documentControl").doc(operatorId).collection("documents");

  // Check for existing active doc of same docType+workerId
  if (!forceNew) {
    const existingSnap = await docsRef
      .where("docType", "==", docType)
      .where("workerId", "==", workerId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0].data();
      return res.json({
        ok: true,
        promptRevision: true,
        existingDoc: {
          docId: existing.docId,
          fileName: existing.fileName,
          revisionNumber: existing.revisionNumber,
          effectiveDate: existing.effectiveDate,
          version: existing.version,
          uploadedAt: existing.uploadedAt,
        },
        message: `An active ${docType} document already exists for this worker. Confirm revision to supersede it.`,
      });
    }
  }

  // Build and write the document record
  const record = buildDocumentRecord({
    workerId, operatorId, docType, fileName, revisionNumber,
    effectiveDate, expiryDate, acknowledgmentType, blockchainEnabled,
    distributionList, storageUrl, sha256hash, chunkCount,
    uploadedBy: userId,
  });

  await docsRef.doc(record.docId).set(record);

  // If blockchain enabled, compute and store hash
  if (record.blockchainEnabled && sha256hash) {
    const blockchain = getBlockchain();
    const auditHash = blockchain.computePreSignHash({
      documentRef: record.docId,
      signers: (distributionList || []).map(uid => ({ email: uid })),
      createdAt: new Date().toISOString(),
      metadata: { docType, fileName, revisionNumber: revisionNumber || null },
    });
    await docsRef.doc(record.docId).update({ blockchainHash: auditHash });
    await logUsageEvent(operatorId, "blockchain_record", record.docId, userId);
  }

  // Log storage usage event
  await logUsageEvent(operatorId, "document_storage_gb", record.docId, userId);

  // Trigger distribution if distributionList is non-empty
  if (distributionList && distributionList.length > 0) {
    await _enqueueDistributionNotifications(operatorId, record, distributionList, "new_document");
  }

  return res.json({ ok: true, docId: record.docId, version: record.version });
}

// ═══════════════════════════════════════════════════════════════
//  CONFIRM REVISION (supersede existing doc)
// ═══════════════════════════════════════════════════════════════

/**
 * Supersede an existing document and create a new version.
 */
async function handleConfirmRevision(req, res, { userId }) {
  const body = req.body || {};
  const { operatorId, existingDocId, fileName, revisionNumber,
    effectiveDate, expiryDate, acknowledgmentType, blockchainEnabled,
    storageUrl, sha256hash, chunkCount } = body;

  if (!operatorId || !existingDocId) {
    return res.status(400).json({ ok: false, error: "operatorId and existingDocId required", code: "MISSING_FIELD" });
  }

  const db = getDb();
  const docsRef = db.collection("documentControl").doc(operatorId).collection("documents");

  // Load existing doc
  const existingSnap = await docsRef.doc(existingDocId).get();
  if (!existingSnap.exists) {
    return res.status(404).json({ ok: false, error: "Existing document not found", code: "NOT_FOUND" });
  }
  const existing = existingSnap.data();

  if (existing.status !== "active") {
    return res.status(400).json({ ok: false, error: "Can only supersede active documents", code: "INVALID_STATUS" });
  }

  // Create new version — carry forward distributionList
  const newRecord = buildDocumentRecord({
    workerId: existing.workerId,
    operatorId,
    docType: existing.docType,
    fileName: fileName || existing.fileName,
    revisionNumber: revisionNumber || null,
    effectiveDate: effectiveDate || null,
    expiryDate: expiryDate || null,
    acknowledgmentType: acknowledgmentType || existing.acknowledgmentType,
    blockchainEnabled: blockchainEnabled !== undefined ? blockchainEnabled : existing.blockchainEnabled,
    distributionList: existing.distributionList || [],
    storageUrl, sha256hash, chunkCount,
    uploadedBy: userId,
    version: (existing.version || 1) + 1,
  });

  // Supersede old doc
  await docsRef.doc(existingDocId).update({
    status: "superseded",
    supersededBy: newRecord.docId,
    supersededAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Write new doc
  await docsRef.doc(newRecord.docId).set(newRecord);

  // Blockchain hash if enabled
  if (newRecord.blockchainEnabled && sha256hash) {
    const blockchain = getBlockchain();
    const auditHash = blockchain.computePreSignHash({
      documentRef: newRecord.docId,
      signers: (newRecord.distributionList || []).map(uid => ({ email: uid })),
      createdAt: new Date().toISOString(),
      metadata: { docType: existing.docType, fileName: newRecord.fileName, revisionNumber, supersedes: existingDocId },
    });
    await docsRef.doc(newRecord.docId).update({ blockchainHash: auditHash });
    await logUsageEvent(operatorId, "blockchain_record", newRecord.docId, userId);
  }

  // Log storage usage event
  await logUsageEvent(operatorId, "document_storage_gb", newRecord.docId, userId);

  // Notify distribution list of new revision
  if (newRecord.distributionList.length > 0) {
    await _enqueueDistributionNotifications(operatorId, newRecord, newRecord.distributionList, "revision");
  }

  return res.json({
    ok: true,
    docId: newRecord.docId,
    version: newRecord.version,
    superseded: existingDocId,
  });
}

// ═══════════════════════════════════════════════════════════════
//  ACKNOWLEDGE DOCUMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Record acknowledgment of a document.
 * Supports checkbox (instant), dropbox_sign (creates signature request), none (error).
 */
async function handleAcknowledge(req, res, { userId }) {
  const body = req.body || {};
  const { operatorId, docId } = body;

  if (!operatorId || !docId) {
    return res.status(400).json({ ok: false, error: "operatorId and docId required", code: "MISSING_FIELD" });
  }

  const db = getDb();
  const docRef = db.collection("documentControl").doc(operatorId).collection("documents").doc(docId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return res.status(404).json({ ok: false, error: "Document not found", code: "NOT_FOUND" });
  }
  const doc = docSnap.data();

  if (doc.status !== "active") {
    return res.status(400).json({ ok: false, error: "Can only acknowledge active documents", code: "INVALID_STATUS" });
  }

  if (!doc.requiresAcknowledgment) {
    return res.status(400).json({ ok: false, error: "This document does not require acknowledgment", code: "NO_ACK_REQUIRED" });
  }

  // Check if already acknowledged by this user
  const alreadyAcked = (doc.acknowledgedBy || []).some(a => a.uid === userId);
  if (alreadyAcked) {
    return res.status(400).json({ ok: false, error: "Already acknowledged by this user", code: "ALREADY_ACKNOWLEDGED" });
  }

  // Validate user is on distribution list (if list is non-empty)
  if (doc.distributionList && doc.distributionList.length > 0 && !doc.distributionList.includes(userId)) {
    return res.status(403).json({ ok: false, error: "User not on distribution list", code: "NOT_ON_DISTRIBUTION" });
  }

  const ackEntry = {
    uid: userId,
    acknowledgedAt: new Date().toISOString(),
    method: doc.acknowledgmentType,
    signatureId: null,
    blockchainTxId: null,
  };

  if (doc.acknowledgmentType === "checkbox") {
    // Instant acknowledgment
    await docRef.update({
      acknowledgedBy: admin.firestore.FieldValue.arrayUnion(ackEntry),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Blockchain hash if enabled
    if (doc.blockchainEnabled) {
      const blockchain = getBlockchain();
      const ackHash = blockchain.sha256(JSON.stringify({
        docId, userId, acknowledgedAt: ackEntry.acknowledgedAt, method: "checkbox",
      }));
      ackEntry.blockchainTxId = ackHash;
      // Re-update with blockchain hash
      const currentDoc = await docRef.get();
      const ackList = currentDoc.data().acknowledgedBy || [];
      const idx = ackList.findIndex(a => a.uid === userId);
      if (idx >= 0) {
        ackList[idx].blockchainTxId = ackHash;
        await docRef.update({ acknowledgedBy: ackList });
      }
      await logUsageEvent(operatorId, "blockchain_record", docId, userId);
    }

    return res.json({ ok: true, method: "checkbox", acknowledged: true });

  } else if (doc.acknowledgmentType === "dropbox_sign") {
    // Create signature request via signatureService
    const sigService = getSignatureService();

    // Look up user email
    let userEmail = userId; // fallback
    try {
      const userRecord = await admin.auth().getUser(userId);
      userEmail = userRecord.email || userId;
    } catch (_) { /* use userId as fallback */ }

    const sigResult = await sigService.createRequest({
      tenantId: operatorId,
      userId,
      title: `Acknowledgment: ${doc.fileName}`,
      subject: `Please acknowledge ${doc.fileName} (Rev ${doc.revisionNumber || "1"})`,
      message: `This document requires your formal acknowledgment.`,
      signers: [{ email: userEmail, name: userEmail, userId }],
      documentType: doc.docType,
      metadata: { docControlDocId: docId, operatorId },
      documentRef: docId,
    });

    if (!sigResult.ok) {
      return res.status(500).json({ ok: false, error: "Failed to create signature request", code: "SIGNATURE_ERROR" });
    }

    // Record pending acknowledgment with signature request ID
    ackEntry.signatureId = sigResult.requestId;
    ackEntry.method = "dropbox_sign";
    ackEntry.acknowledgedAt = null; // not yet — pending signature

    await docRef.update({
      acknowledgedBy: admin.firestore.FieldValue.arrayUnion(ackEntry),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await logUsageEvent(operatorId, "signature_request", docId, userId);

    return res.json({
      ok: true,
      method: "dropbox_sign",
      acknowledged: false,
      pending: true,
      signatureRequestId: sigResult.requestId,
      signUrl: sigResult.signUrls ? Object.values(sigResult.signUrls)[0] : null,
    });
  }

  return res.status(400).json({ ok: false, error: "Unknown acknowledgment type", code: "UNKNOWN_ACK_TYPE" });
}

// ═══════════════════════════════════════════════════════════════
//  LIST DOCUMENTS
// ═══════════════════════════════════════════════════════════════

/**
 * List all documents for an operator, with per-user acknowledgment status.
 */
async function handleGetDocuments(req, res, { userId }) {
  const operatorId = req.query.operatorId || (req.body || {}).operatorId;
  const docType = req.query.docType;
  const status = req.query.status || "active";

  if (!operatorId) {
    return res.status(400).json({ ok: false, error: "operatorId required", code: "MISSING_FIELD" });
  }

  const db = getDb();
  let query = db.collection("documentControl").doc(operatorId).collection("documents")
    .where("status", "==", status);

  if (docType) {
    query = query.where("docType", "==", docType);
  }

  query = query.orderBy("createdAt", "desc").limit(100);

  const snap = await query.get();
  const docs = snap.docs.map(d => {
    const data = d.data();
    const userAcked = (data.acknowledgedBy || []).some(a => a.uid === userId && a.acknowledgedAt);
    return {
      docId: data.docId,
      docType: data.docType,
      fileName: data.fileName,
      revisionNumber: data.revisionNumber,
      effectiveDate: data.effectiveDate,
      expiryDate: data.expiryDate,
      status: data.status,
      version: data.version,
      requiresAcknowledgment: data.requiresAcknowledgment,
      acknowledgmentType: data.acknowledgmentType,
      blockchainEnabled: data.blockchainEnabled,
      uploadedAt: data.uploadedAt,
      uploadedBy: data.uploadedBy,
      workerId: data.workerId,
      userAcknowledged: userAcked,
      ackCount: (data.acknowledgedBy || []).filter(a => a.acknowledgedAt).length,
      distributionCount: (data.distributionList || []).length,
    };
  });

  return res.json({ ok: true, documents: docs, count: docs.length });
}

// ═══════════════════════════════════════════════════════════════
//  VERSION HISTORY
// ═══════════════════════════════════════════════════════════════

/**
 * Return all versions of a document (active + superseded chain).
 */
async function handleGetVersionHistory(req, res, { userId }) {
  const operatorId = req.query.operatorId || (req.body || {}).operatorId;
  const docId = req.query.docId || (req.body || {}).docId;

  if (!operatorId || !docId) {
    return res.status(400).json({ ok: false, error: "operatorId and docId required", code: "MISSING_FIELD" });
  }

  const db = getDb();
  const docsRef = db.collection("documentControl").doc(operatorId).collection("documents");

  // Load the requested doc to get its docType and workerId
  const docSnap = await docsRef.doc(docId).get();
  if (!docSnap.exists) {
    return res.status(404).json({ ok: false, error: "Document not found", code: "NOT_FOUND" });
  }
  const doc = docSnap.data();

  // Query all docs of same docType+workerId, ordered by version
  const allVersionsSnap = await docsRef
    .where("docType", "==", doc.docType)
    .where("workerId", "==", doc.workerId)
    .orderBy("version", "desc")
    .get();

  const versions = allVersionsSnap.docs.map(d => {
    const data = d.data();
    return {
      docId: data.docId,
      version: data.version,
      status: data.status,
      fileName: data.fileName,
      revisionNumber: data.revisionNumber,
      effectiveDate: data.effectiveDate,
      uploadedAt: data.uploadedAt,
      uploadedBy: data.uploadedBy,
      supersededBy: data.supersededBy,
      supersededAt: data.supersededAt,
      blockchainHash: data.blockchainHash || null,
    };
  });

  return res.json({ ok: true, versions, count: versions.length });
}

// ═══════════════════════════════════════════════════════════════
//  UPDATE DISTRIBUTION LIST
// ═══════════════════════════════════════════════════════════════

/**
 * Update a document's distribution list. Notifies newly added users.
 */
async function handleUpdateDistributionList(req, res, { userId }) {
  const body = req.body || {};
  const { operatorId, docId, distributionList } = body;

  if (!operatorId || !docId || !Array.isArray(distributionList)) {
    return res.status(400).json({ ok: false, error: "operatorId, docId, and distributionList (array) required", code: "MISSING_FIELD" });
  }

  const db = getDb();
  const docRef = db.collection("documentControl").doc(operatorId).collection("documents").doc(docId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return res.status(404).json({ ok: false, error: "Document not found", code: "NOT_FOUND" });
  }
  const doc = docSnap.data();

  const oldList = doc.distributionList || [];
  const newUsers = distributionList.filter(uid => !oldList.includes(uid));

  await docRef.update({
    distributionList,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Notify newly added users
  if (newUsers.length > 0) {
    await _enqueueDistributionNotifications(operatorId, doc, newUsers, "added_to_distribution");
  }

  return res.json({ ok: true, added: newUsers.length, total: distributionList.length });
}

// ═══════════════════════════════════════════════════════════════
//  ACKNOWLEDGMENT STATUS
// ═══════════════════════════════════════════════════════════════

/**
 * Per-document acknowledgment status: who acknowledged, who hasn't, pending, overdue.
 */
async function handleGetAcknowledgmentStatus(req, res, { userId }) {
  const operatorId = req.query.operatorId || (req.body || {}).operatorId;
  const docId = req.query.docId || (req.body || {}).docId;

  if (!operatorId || !docId) {
    return res.status(400).json({ ok: false, error: "operatorId and docId required", code: "MISSING_FIELD" });
  }

  const db = getDb();
  const docRef = db.collection("documentControl").doc(operatorId).collection("documents").doc(docId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return res.status(404).json({ ok: false, error: "Document not found", code: "NOT_FOUND" });
  }
  const doc = docSnap.data();

  const distributionList = doc.distributionList || [];
  const acknowledgedBy = doc.acknowledgedBy || [];

  const acknowledged = acknowledgedBy.filter(a => a.acknowledgedAt).map(a => ({
    uid: a.uid,
    acknowledgedAt: a.acknowledgedAt,
    method: a.method,
    signatureId: a.signatureId,
    blockchainTxId: a.blockchainTxId,
  }));

  const pendingSignature = acknowledgedBy.filter(a => !a.acknowledgedAt && a.signatureId).map(a => ({
    uid: a.uid,
    signatureId: a.signatureId,
  }));

  const acknowledgedUids = new Set(acknowledgedBy.map(a => a.uid));
  const notAcknowledged = distributionList.filter(uid => !acknowledgedUids.has(uid));

  return res.json({
    ok: true,
    docId,
    requiresAcknowledgment: doc.requiresAcknowledgment,
    acknowledgmentType: doc.acknowledgmentType,
    acknowledged,
    pendingSignature,
    notAcknowledged,
    summary: {
      total: distributionList.length,
      completed: acknowledged.length,
      pending: pendingSignature.length,
      outstanding: notAcknowledged.length,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN OVERVIEW
// ═══════════════════════════════════════════════════════════════

/**
 * Admin: overview of all operators' document inventory.
 */
async function handleAdminOverview(req, res) {
  const db = getDb();

  // List all operators that have documentControl docs
  const operatorsSnap = await db.collection("documentControl").listDocuments();
  const results = [];

  for (const opDoc of operatorsSnap) {
    const operatorId = opDoc.id;
    const docsSnap = await db.collection("documentControl").doc(operatorId)
      .collection("documents")
      .where("status", "==", "active")
      .get();

    const byType = {};
    let needsAck = 0;
    let expiringSoon = 0;
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    docsSnap.forEach(d => {
      const data = d.data();
      byType[data.docType] = (byType[data.docType] || 0) + 1;
      if (data.requiresAcknowledgment) {
        const acked = (data.acknowledgedBy || []).filter(a => a.acknowledgedAt).length;
        const total = (data.distributionList || []).length;
        if (total > 0 && acked < total) needsAck++;
      }
      if (data.expiryDate) {
        const exp = new Date(data.expiryDate);
        if (exp.getTime() - now.getTime() < thirtyDays && exp > now) expiringSoon++;
      }
    });

    results.push({
      operatorId,
      activeDocuments: docsSnap.size,
      byType,
      pendingAcknowledgments: needsAck,
      expiringSoon,
    });
  }

  return res.json({ ok: true, operators: results, count: results.length });
}

// ═══════════════════════════════════════════════════════════════
//  DOCUMENT EXPIRY CHECK (scheduled daily)
// ═══════════════════════════════════════════════════════════════

/**
 * Check all documents for upcoming/past expiry.
 * - 30 days before: enqueue notification
 * - 7 days before: second notification
 * - On expiry: set status = "expired"
 */
async function checkDocumentExpiry() {
  const db = getDb();
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let expired = 0;
  let warned = 0;

  // Get all operators
  const operatorsSnap = await db.collection("documentControl").listDocuments();

  for (const opDoc of operatorsSnap) {
    const operatorId = opDoc.id;

    // Query active docs with expiryDate set
    const docsSnap = await db.collection("documentControl").doc(operatorId)
      .collection("documents")
      .where("status", "==", "active")
      .get();

    for (const docSnap of docsSnap.docs) {
      const doc = docSnap.data();
      if (!doc.expiryDate) continue;

      const expiryDate = new Date(doc.expiryDate);

      if (expiryDate <= now) {
        // Expired — update status
        await docSnap.ref.update({
          status: "expired",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        expired++;

        // Notify distribution list
        if (doc.distributionList && doc.distributionList.length > 0) {
          await _enqueueDistributionNotifications(operatorId, doc, doc.distributionList, "expired");
        }

      } else if (expiryDate <= sevenDays) {
        // 7-day warning
        await _enqueueDistributionNotifications(operatorId, doc, [doc.uploadedBy], "expiry_7day");
        warned++;

      } else if (expiryDate <= thirtyDays) {
        // 30-day warning
        await _enqueueDistributionNotifications(operatorId, doc, [doc.uploadedBy], "expiry_30day");
        warned++;
      }
    }
  }

  console.log(`documentExpiryCheck: ${expired} expired, ${warned} warnings sent`);
  return { expired, warned };
}

// ═══════════════════════════════════════════════════════════════
//  INTERNAL: Distribution Notifications
// ═══════════════════════════════════════════════════════════════

const NOTIFICATION_SUBJECTS = {
  new_document: (doc) => `New document: ${doc.fileName}`,
  revision: (doc) => `Revised document: ${doc.fileName} (v${doc.version})`,
  added_to_distribution: (doc) => `Document shared with you: ${doc.fileName}`,
  expired: (doc) => `Document expired: ${doc.fileName}`,
  expiry_7day: (doc) => `Document expiring in 7 days: ${doc.fileName}`,
  expiry_30day: (doc) => `Document expiring in 30 days: ${doc.fileName}`,
};

const NOTIFICATION_BODIES = {
  new_document: (doc) =>
    `A new ${_docTypeLabel(doc.docType)} has been uploaded: ${doc.fileName}.\n\n` +
    (doc.requiresAcknowledgment ? `This document requires your acknowledgment (${doc.acknowledgmentType}).` : "No acknowledgment required."),
  revision: (doc) =>
    `${doc.fileName} has been updated to version ${doc.version}.\n\n` +
    (doc.requiresAcknowledgment ? `Please review and acknowledge the new revision.` : ""),
  added_to_distribution: (doc) =>
    `You have been added to the distribution list for ${doc.fileName}.\n\n` +
    (doc.requiresAcknowledgment ? `This document requires your acknowledgment.` : ""),
  expired: (doc) =>
    `${doc.fileName} has expired as of ${doc.expiryDate}. Please upload an updated version.`,
  expiry_7day: (doc) =>
    `${doc.fileName} will expire on ${doc.expiryDate}. Please prepare an updated revision.`,
  expiry_30day: (doc) =>
    `${doc.fileName} will expire on ${doc.expiryDate}. Consider preparing an updated revision.`,
};

function _docTypeLabel(docType) {
  return (AVIATION_DOC_TYPES[docType] || {}).label || docType;
}

/**
 * Enqueue email notifications to users via messageQueue.
 */
async function _enqueueDistributionNotifications(operatorId, doc, userIds, notificationType) {
  const db = getDb();
  const subject = (NOTIFICATION_SUBJECTS[notificationType] || (() => "Document Control Notification"))(doc);
  const body = (NOTIFICATION_BODIES[notificationType] || (() => ""))(doc);

  const batch = db.batch();
  for (const uid of userIds) {
    if (!uid) continue;
    const ref = db.collection("messageQueue").doc();
    batch.set(ref, {
      userId: uid,
      campaignId: `docControl_${notificationType}`,
      channel: "email",
      to: "", // messageProcessor resolves email from userId
      subject: `Alex — TitleApp: ${subject}`,
      body: `<p>${body.replace(/\n/g, "<br>")}</p><p style="color:#999;font-size:12px;">— Alex</p>`,
      textBody: body + "\n\n— Alex",
      scheduledAt: admin.firestore.Timestamp.fromDate(new Date()),
      status: "pending",
      sentAt: null,
      error: null,
      attempts: 0,
    });
  }
  await batch.commit();
}

module.exports = {
  handleUploadDocument,
  handleConfirmRevision,
  handleAcknowledge,
  handleGetDocuments,
  handleGetVersionHistory,
  handleUpdateDistributionList,
  handleGetAcknowledgmentStatus,
  handleAdminOverview,
  checkDocumentExpiry,
};
