"use strict";
/**
 * Storage Service — CODEX 49.5 Phase A
 * Upload, download, delete, list, getMetadata for document vault.
 * Hierarchy: users/{uid}/personal/, users/{uid}/business/{orgId}/, users/{uid}/shared/
 */

const admin = require("firebase-admin");
const path = require("path");
const crypto = require("crypto");
const { checkQuota, recordEvent } = require("./quota");
const { canWrite, canRead } = require("./access");

function getDb() { return admin.firestore(); }
function getBucket() { return admin.storage().bucket(); }

// Allowed MIME types — server-side enforcement
const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  "text/csv",
  "image/png",
  "image/jpeg",
  "text/plain",
  "text/markdown",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB default

/**
 * Sanitize a filename — strip HTML, path traversal, control chars.
 */
function sanitizeFilename(name) {
  if (!name) return `file_${Date.now()}`;
  return name
    .replace(/[<>:"\/\\|?*\x00-\x1f]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 255);
}

/**
 * Build the canonical storage path.
 * @param {string} uid
 * @param {string} scope — personal | business | shared
 * @param {string} orgId — required if scope=business
 * @param {string} subdir — documents | campaigns | financials | temporary
 * @param {string} filename
 */
function buildStoragePath(uid, scope, orgId, subdir, filename) {
  const safe = sanitizeFilename(filename);
  if (scope === "business" && orgId) {
    return `users/${uid}/business/${orgId}/${subdir || "documents"}/${safe}`;
  }
  if (scope === "shared") {
    return `users/${uid}/shared/${subdir || "documents"}/${safe}`;
  }
  return `users/${uid}/personal/${subdir || "documents"}/${safe}`;
}

/**
 * Upload a file buffer to storage + write Firestore metadata.
 * @param {object} opts
 * @returns {{ ok, objectId, storagePath, downloadUrl }}
 */
async function upload({
  uid, orgId, scope = "personal", subdir = "documents",
  filename, buffer, mimeType, createdByWorker, parentProjectId, tags = [],
}) {
  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: "file_type_not_allowed", message: `MIME type ${mimeType} is not allowed` };
  }

  // Validate file size
  if (buffer.length > MAX_FILE_SIZE) {
    return { ok: false, error: "file_too_large", message: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB limit` };
  }

  // Check quota
  const quotaCheck = await checkQuota(uid, orgId, buffer.length);
  if (!quotaCheck.ok) return quotaCheck;

  // Check write permission
  const accessCheck = canWrite(uid, uid, scope, orgId);
  if (!accessCheck.ok) return accessCheck;

  const db = getDb();
  const bucket = getBucket();
  const objectId = `doc_${crypto.randomBytes(12).toString("hex")}`;
  const storagePath = buildStoragePath(uid, scope, orgId, subdir, `${objectId}_${sanitizeFilename(filename)}`);

  // Upload to Cloud Storage
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    metadata: { contentType: mimeType, metadata: { objectId, uid, orgId: orgId || "" } },
  });

  // Get signed download URL (1 hour)
  const [downloadUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 3600 * 1000,
  });

  // Write Firestore metadata
  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.doc(`storageObjects/${objectId}`).set({
    objectId,
    ownerUid: uid,
    orgId: orgId || null,
    scope,
    storagePath,
    filename: sanitizeFilename(filename),
    mimeType,
    sizeBytes: buffer.length,
    version: 1,
    createdByWorker: createdByWorker || null,
    parentProjectId: parentProjectId || null,
    tags: tags || [],
    accessList: [{ uid, permission: "admin" }],
    createdAt: now,
    updatedAt: now,
  });

  // Record metering event
  await recordEvent(uid, orgId, buffer.length, objectId, "upload");

  // Log access
  await db.collection("accessLog").add({
    uid, objectId, action: "upload", storagePath, sizeBytes: buffer.length,
    timestamp: now,
  });

  return { ok: true, objectId, storagePath, downloadUrl, sizeBytes: buffer.length };
}

/**
 * Get a signed download URL for a stored object.
 */
async function download(uid, objectId) {
  const db = getDb();
  const doc = await db.doc(`storageObjects/${objectId}`).get();
  if (!doc.exists) return { ok: false, error: "not_found" };

  const data = doc.data();
  const accessCheck = canRead(uid, data.ownerUid, data.scope, data.orgId, data.accessList);
  if (!accessCheck.ok) return accessCheck;

  const bucket = getBucket();
  const file = bucket.file(data.storagePath);
  const [exists] = await file.exists();
  if (!exists) return { ok: false, error: "file_missing", message: "Storage file not found" };

  const [downloadUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 3600 * 1000,
  });

  // Log access
  await db.collection("accessLog").add({
    uid, objectId, action: "download",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true, downloadUrl, filename: data.filename, mimeType: data.mimeType, sizeBytes: data.sizeBytes };
}

/**
 * Delete a stored object (soft-delete in Firestore, hard-delete from Storage).
 */
async function deleteObject(uid, objectId) {
  const db = getDb();
  const doc = await db.doc(`storageObjects/${objectId}`).get();
  if (!doc.exists) return { ok: false, error: "not_found" };

  const data = doc.data();
  if (data.ownerUid !== uid) return { ok: false, error: "forbidden", message: "Only the owner can delete" };

  // Delete from Storage
  const bucket = getBucket();
  try {
    await bucket.file(data.storagePath).delete();
  } catch (e) {
    console.warn(`Storage delete failed for ${data.storagePath}:`, e.message);
  }

  // Mark deleted in Firestore
  await db.doc(`storageObjects/${objectId}`).update({
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: "deleted",
  });

  // Record metering (negative delta)
  await recordEvent(uid, data.orgId, -(data.sizeBytes || 0), objectId, "delete");

  return { ok: true, objectId };
}

/**
 * List storage objects for a user.
 */
async function list(uid, { scope, orgId, parentProjectId, limit: lim = 50, offset = 0 } = {}) {
  const db = getDb();
  let q = db.collection("storageObjects")
    .where("ownerUid", "==", uid)
    .where("status", "!=", "deleted")
    .orderBy("createdAt", "desc")
    .limit(lim);

  if (scope) q = q.where("scope", "==", scope);
  if (parentProjectId) q = q.where("parentProjectId", "==", parentProjectId);

  const snap = await q.get();
  const objects = snap.docs.map(d => {
    const data = d.data();
    return {
      objectId: data.objectId,
      filename: data.filename,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      scope: data.scope,
      version: data.version,
      createdByWorker: data.createdByWorker,
      parentProjectId: data.parentProjectId,
      tags: data.tags,
      createdAt: data.createdAt,
    };
  });

  return { ok: true, objects, total: objects.length };
}

/**
 * Get metadata for a single storage object.
 */
async function getMetadata(uid, objectId) {
  const db = getDb();
  const doc = await db.doc(`storageObjects/${objectId}`).get();
  if (!doc.exists) return { ok: false, error: "not_found" };

  const data = doc.data();
  const accessCheck = canRead(uid, data.ownerUid, data.scope, data.orgId, data.accessList);
  if (!accessCheck.ok) return accessCheck;

  return { ok: true, ...data };
}

module.exports = { upload, download, deleteObject, list, getMetadata, sanitizeFilename, buildStoragePath, ALLOWED_MIME_TYPES };
