// services/documentEngine/storage.js
// Cloud Storage persistence + Firestore audit trail for generated documents

const admin = require("firebase-admin");
const crypto = require("crypto");

const STORAGE_BUCKET =
  process.env.STORAGE_BUCKET || "title-app-alpha.firebasestorage.app";

function getDb() { return admin.firestore(); }
function getBucket() { return admin.storage().bucket(STORAGE_BUCKET); }
function nowServerTs() { return admin.firestore.FieldValue.serverTimestamp(); }

function sanitizeFilename(name) {
  const base = String(name || "document")
    .split("/")
    .pop()
    .split("\\")
    .pop();
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

async function saveGeneratedDocument({
  tenantId,
  userId,
  buffer,
  filename,
  contentType,
  templateId,
  templateName,
  inputHash,
  metadata,
}) {
  const docId = "doc_" + crypto.randomUUID().replace(/-/g, "");
  const d = new Date();
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const safeName = sanitizeFilename(filename);
  const ext = safeName.split(".").pop() || "bin";
  const storagePath = `tenants/${tenantId}/documents/${yyyy}/${mm}/${docId}.${ext}`;

  const bucket = getBucket();
  const fileRef = bucket.file(storagePath);
  const dlToken = crypto.randomUUID();

  await fileRef.save(buffer, {
    contentType,
    metadata: { firebaseStorageDownloadTokens: dlToken },
  });

  await getDb()
    .collection("generatedDocuments")
    .doc(docId)
    .set({
      tenantId,
      userId,
      templateId,
      templateName: templateName || null,
      filename: safeName,
      contentType,
      sizeBytes: buffer.length,
      storage: { bucket: STORAGE_BUCKET, path: storagePath },
      storagePath,
      inputHash: inputHash || null,
      metadata: metadata || {},
      status: "ready",
      createdAt: nowServerTs(),
    });

  return { docId, storagePath };
}

async function getDownloadUrl({ tenantId, userId, docId, expiresInSec }) {
  const db = getDb();
  const snap = await db.collection("generatedDocuments").doc(docId).get();
  if (!snap.exists) return { error: "not_found" };

  const data = snap.data();
  if (data.tenantId !== tenantId) return { error: "forbidden" };

  const filePath = (data.storage && data.storage.path) || data.storagePath;
  if (!filePath) return { error: "no_storage_path" };

  const exp = Number(expiresInSec || 300);
  const [url] = await getBucket()
    .file(filePath)
    .getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + exp * 1000,
    });

  // Audit: append-only access log
  await db.collection("documentAccessLog").add({
    docId,
    tenantId,
    userId,
    action: "download_url_generated",
    expiresInSec: exp,
    createdAt: nowServerTs(),
  });

  return { url, expiresInSec: exp };
}

async function listDocuments({ tenantId, limit, offset, templateId }) {
  let query = getDb()
    .collection("generatedDocuments")
    .where("tenantId", "==", tenantId)
    .orderBy("createdAt", "desc");

  if (templateId) {
    query = query.where("templateId", "==", templateId);
  }

  query = query.limit(limit || 50).offset(offset || 0);
  const snap = await query.get();

  return snap.docs.map((d) => {
    const doc = d.data();
    return {
      id: d.id,
      templateId: doc.templateId,
      templateName: doc.templateName,
      filename: doc.filename,
      contentType: doc.contentType,
      sizeBytes: doc.sizeBytes,
      format: doc.metadata && doc.metadata.format,
      status: doc.status,
      createdAt: doc.createdAt,
    };
  });
}

module.exports = { saveGeneratedDocument, getDownloadUrl, listDocuments };
