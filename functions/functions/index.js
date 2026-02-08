const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ✅ Real Firebase Storage bucket (enabled in console)
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || "title-app-alpha.firebasestorage.app";

// ----------------------------
// Helpers
// ----------------------------

function getRoute(req) {
  let p = req.path || "/";
  if (p.startsWith("/v1/")) p = p.slice(3);
  return p;
}

function jsonError(res, status, error, extra = {}) {
  console.error("❌ API ERROR:", status, error, extra);
  return res.status(status).json({ ok: false, error, ...extra });
}

function getAuthBearerToken(req) {
  const raw = req.headers?.authorization || "";
  const parts = raw.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1];
}

async function requireFirebaseUser(req, res) {
  const token = getAuthBearerToken(req);
  if (!token) return { handled: true, user: null, res: jsonError(res, 401, "Unauthorized", { reason: "Missing bearer token" }) };

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return { handled: false, user: decoded };
  } catch (e) {
    return { handled: true, user: null, res: jsonError(res, 401, "Unauthorized", { reason: "Invalid token" }) };
  }
}

async function requireMembershipIfNeeded({ uid, tenantId }, res) {
  console.log("🔍 Membership check:", { uid, tenantId });

  if (!tenantId || tenantId === "public") {
    console.log("✅ Public tenant — membership bypass");
    return { ok: true };
  }

  const snap = await db
    .collection("memberships")
    .where("userId", "==", uid)
    .where("tenantId", "==", tenantId)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (snap.empty) {
    return jsonError(res, 403, "Forbidden", { reason: "No active membership", uid, tenantId });
  }

  console.log("✅ Membership OK");
  return { ok: true };
}

function getCtx(req, body, user) {
  const tenantId = (req.headers["x-tenant-id"] || body.tenantId || "public").toString().trim();
  return { tenantId, userId: user.uid, email: user.email || null };
}

function sanitizeFilename(name) {
  const base = String(name || "upload").split("/").pop().split("\\").pop();
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

function yyyymm() {
  const d = new Date();
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return { yyyy, mm };
}

function getBucket() {
  return admin.storage().bucket(STORAGE_BUCKET);
}

// ✅ Backward compatible: accept both {storage:{path}} and {storagePath}
function getPathFromMeta(meta) {
  return (meta && meta.storage && meta.storage.path) || meta.storagePath || null;
}

// ----------------------------
// API
// ----------------------------
exports.api = onRequest(async (req, res) => {
  console.log("✅ API_VERSION", "2026-02-08-full-uploads-2-pathfix");

  const route = getRoute(req);
  const method = req.method;
  const body = req.body || {};

  console.log("➡️ REQUEST:", { route, method });

  const auth = await requireFirebaseUser(req, res);
  if (auth.handled) return;

  const ctx = getCtx(req, body, auth.user);
  console.log("🧠 CTX:", ctx);

  const gate = await requireMembershipIfNeeded({ uid: auth.user.uid, tenantId: ctx.tenantId }, res);
  if (!gate.ok) return;

  // ----------------------------
  // ADMIN IMPORT (kept)
  // ----------------------------
  if (route === "/admin/import" && method === "POST") {
    if (!body.type || !body.csvText) return jsonError(res, 400, "Missing type or csvText");

    const ref = await db.collection("imports").add({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: body.type,
      source: body.source || {},
      mode: body.mode || "upsert",
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      rowCount: String(body.csvText).split("\n").length - 1,
      status: "completed",
    });

    return res.json({ ok: true, importId: ref.id, rows: String(body.csvText).split("\n").length - 1 });
  }

  if (route === "/admin/imports" && method === "GET") {
    const snap = await db.collection("imports").orderBy("createdAt", "desc").limit(10).get();
    return res.json({ ok: true, items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  }

  // ----------------------------
  // FILE UPLOADS (general)
  // ----------------------------

  // POST /v1/files:sign
  if (route === "/files:sign" && method === "POST") {
    const { filename, contentType, sizeBytes, purpose, tags, related } = body || {};
    if (!filename) return jsonError(res, 400, "Missing filename");

    const fileId = "file_" + crypto.randomUUID().replace(/-/g, "");
    const safeName = sanitizeFilename(filename);
    const { yyyy, mm } = yyyymm();
    const storagePath = `tenants/${ctx.tenantId}/uploads/${yyyy}/${mm}/${fileId}-${safeName}`;

    const ct = contentType || "application/octet-stream";
    const expiresMs = 15 * 60 * 1000;

    await db.collection("files").doc(fileId).set({
      tenantId: ctx.tenantId,
      uploadedBy: { userId: ctx.userId, email: ctx.email },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "uploading",
      original: {
        filename: String(filename),
        contentType: ct,
        sizeBytes: typeof sizeBytes === "number" ? sizeBytes : null,
      },
      storage: {
        bucket: getBucket().name,
        path: storagePath,
      },
      // legacy mirror for safety during transition:
      storagePath,
      purpose: purpose || null,
      tags: Array.isArray(tags) ? tags : [],
      related: related || {},
    });

    const file = getBucket().file(storagePath);
    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + expiresMs,
      contentType: ct,
    });

    return res.json({
      ok: true,
      fileId,
      storagePath,
      uploadUrl,
      requiredHeaders: { "Content-Type": ct },
      expiresAt: Date.now() + expiresMs,
      bucket: getBucket().name,
    });
  }

  // POST /v1/files:finalize
  if (route === "/files:finalize" && method === "POST") {
    const { fileId } = body || {};
    if (!fileId) return jsonError(res, 400, "Missing fileId");

    const ref = db.collection("files").doc(fileId);
    const snap = await ref.get();
    if (!snap.exists) return jsonError(res, 404, "Unknown fileId");

    const meta = snap.data();
    if (meta.tenantId !== ctx.tenantId) {
      return jsonError(res, 403, "Forbidden", { reason: "Cross-tenant file access" });
    }

    const path = getPathFromMeta(meta);
    if (!path) return jsonError(res, 400, "Missing storage path on file record", { fileId });

    const file = getBucket().file(path);
    const [exists] = await file.exists();
    if (!exists) return jsonError(res, 400, "Upload not found in storage", { path });

    const [gcsMeta] = await file.getMetadata();

    await ref.update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "uploaded",
      storage: {
        bucket: getBucket().name,
        path,
        generation: gcsMeta.generation || null,
        metageneration: gcsMeta.metageneration || null,
      },
      storagePath: path, // keep legacy mirror
      finalized: {
        sizeBytes: gcsMeta.size ? Number(gcsMeta.size) : null,
        contentType: gcsMeta.contentType || meta.original?.contentType || null,
        md5Hash: gcsMeta.md5Hash || null,
        crc32c: gcsMeta.crc32c || null,
        etag: gcsMeta.etag || null,
        timeCreated: gcsMeta.timeCreated || null,
        updated: gcsMeta.updated || null,
      },
    });

    return res.json({
      ok: true,
      fileId,
      status: "uploaded",
      sizeBytes: gcsMeta.size ? Number(gcsMeta.size) : null,
      contentType: gcsMeta.contentType || null,
      bucket: getBucket().name,
      path,
    });
  }

  // POST /v1/files:readUrl
  if (route === "/files:readUrl" && method === "POST") {
    const { fileId, expiresSeconds } = body || {};
    if (!fileId) return jsonError(res, 400, "Missing fileId");

    const ref = db.collection("files").doc(fileId);
    const snap = await ref.get();
    if (!snap.exists) return jsonError(res, 404, "Unknown fileId");

    const meta = snap.data();
    if (meta.tenantId !== ctx.tenantId) {
      return jsonError(res, 403, "Forbidden", { reason: "Cross-tenant file access" });
    }

    const path = getPathFromMeta(meta);
    if (!path) return jsonError(res, 400, "Missing storage path on file record", { fileId });

    const seconds = typeof expiresSeconds === "number" ? Math.max(60, Math.min(3600, expiresSeconds)) : 900;
    const file = getBucket().file(path);

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + seconds * 1000,
    });

    return res.json({ ok: true, fileId, readUrl: url, expiresSeconds: seconds, path, bucket: getBucket().name });
  }

  return jsonError(res, 404, "Unknown endpoint", { route, method });
});
