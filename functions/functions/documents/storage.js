"use strict";

const admin = require("firebase-admin");
const crypto = require("crypto");

const STORAGE_BUCKET = process.env.STORAGE_BUCKET || "title-app-alpha.firebasestorage.app";

const CONTENT_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const FILE_EXTENSIONS = { pdf: ".pdf", docx: ".docx", xlsx: ".xlsx", pptx: ".pptx" };

function yyyymm() {
  const d = new Date();
  return {
    yyyy: String(d.getFullYear()),
    mm: String(d.getMonth() + 1).padStart(2, "0"),
  };
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 128);
}

async function saveDocument({ tenantId, userId, templateId, format, title, buffer, pageCount, metadata }) {
  const db = admin.firestore();
  const bucket = admin.storage().bucket(STORAGE_BUCKET);

  const docId = "doc_" + crypto.randomUUID().replace(/-/g, "");
  const safeName = sanitizeFilename(title) + (FILE_EXTENSIONS[format] || "");
  const { yyyy, mm } = yyyymm();
  const storagePath = `tenants/${tenantId}/documents/${yyyy}/${mm}/${docId}-${safeName}`;
  const contentType = CONTENT_TYPES[format] || "application/octet-stream";

  // Upload to Cloud Storage
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    metadata: { contentType },
    resumable: false,
  });

  // Create Firestore record
  const record = {
    tenantId,
    createdBy: userId,
    templateId,
    format,
    title: title || templateId,
    filename: safeName,
    storage: { bucket: STORAGE_BUCKET, path: storagePath },
    storagePath,
    sizeBytes: buffer.length,
    pageCount: pageCount || null,
    status: "ready",
    metadata: metadata || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("generatedDocuments").doc(docId).set(record);

  // Generate a signed download URL (1 hour)
  const [downloadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 3600 * 1000,
  });

  return { docId, filename: safeName, storagePath, sizeBytes: buffer.length, pageCount, downloadUrl };
}

async function getDocumentUrl(docId, tenantId, expiresInSec) {
  const db = admin.firestore();
  const snap = await db.collection("generatedDocuments").doc(docId).get();
  if (!snap.exists) return null;

  const data = snap.data() || {};
  if (data.tenantId !== tenantId) return null;

  const bucket = admin.storage().bucket(STORAGE_BUCKET);
  const exp = Number(expiresInSec || 300);
  const [url] = await bucket.file(data.storagePath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + exp * 1000,
  });

  return {
    docId,
    filename: data.filename,
    format: data.format,
    downloadUrl: url,
    expiresInSec: exp,
  };
}

async function getDocumentMetadata(docId, tenantId) {
  const db = admin.firestore();
  const snap = await db.collection("generatedDocuments").doc(docId).get();
  if (!snap.exists) return null;

  const data = snap.data() || {};
  if (data.tenantId !== tenantId) return null;

  return { docId, ...data };
}

async function listDocuments(tenantId, { limit: lim, offset } = {}) {
  const db = admin.firestore();
  const pageSize = Math.min(Number(lim) || 20, 100);
  const skip = Number(offset) || 0;

  let query = db.collection("generatedDocuments")
    .where("tenantId", "==", tenantId)
    .orderBy("createdAt", "desc")
    .limit(pageSize + skip);

  const snap = await query.get();
  const all = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
  const documents = all.slice(skip, skip + pageSize).map((d) => ({
    docId: d.docId,
    title: d.title,
    templateId: d.templateId,
    format: d.format,
    sizeBytes: d.sizeBytes,
    pageCount: d.pageCount,
    createdAt: d.createdAt,
  }));

  return { documents, total: all.length };
}

module.exports = { saveDocument, getDocumentUrl, getDocumentMetadata, listDocuments, CONTENT_TYPES };
