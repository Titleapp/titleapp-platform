"use strict";

/**
 * esignService.js — E-signature backend
 *
 * Two-track signing:
 *   TRACK A — BoldSign (platform account, no per-user OAuth needed)
 *     POST /v1/document/send to BoldSign API; signers receive email links automatically.
 *     Cost: $0.75 per document. Platform-level API key (BOLDSIGN_API_KEY).
 *
 *   TRACK B — SOCIII Native Signing (fallback, zero dependency)
 *     Generates a signed-URL page (/sign/:token).
 *     Signer opens URL, draws signature, submits.
 *     Signed event written to Firestore (append-only). PDF stored in Storage.
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }
function getStorage() { return admin.storage(); }

// ── Encryption (same key as Drive) ───────────────────────────────
const ALGORITHM = "aes-256-gcm";

function getEncKey() {
  const k = process.env.GDRIVE_ENCRYPTION_KEY;
  if (!k || k.length !== 64) throw new Error("GDRIVE_ENCRYPTION_KEY not set");
  return Buffer.from(k, "hex");
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(16);
  const c = crypto.createCipheriv(ALGORITHM, getEncKey(), iv);
  let enc = c.update(plaintext, "utf8", "hex");
  enc += c.final("hex");
  return { encrypted: enc, iv: iv.toString("hex"), authTag: c.getAuthTag().toString("hex") };
}

function decrypt({ encrypted, iv, authTag }) {
  const d = crypto.createDecipheriv(ALGORITHM, getEncKey(), Buffer.from(iv, "hex"));
  d.setAuthTag(Buffer.from(authTag, "hex"));
  let dec = d.update(encrypted, "hex", "utf8");
  dec += d.final("utf8");
  return dec;
}

// ── STATUS ────────────────────────────────────────────────────────
// BoldSign is platform-level — no per-user OAuth. Just confirm the key is set.
async function handleESignStatus(req, res) {
  const configured = !!(process.env.BOLDSIGN_API_KEY);
  return res.json({ ok: true, connected: configured, provider: "boldsign" });
}

// ── SEND FOR SIGNATURE ────────────────────────────────────────────
async function handleESignSend(req, res, { userId, tenantId }) {
  const { title, signers, message, fileBase64, mimeType, driveFileId, metadata } = req.body || {};
  if (!title) return res.status(400).json({ ok: false, error: "title required" });
  if (!Array.isArray(signers) || !signers.length) return res.status(400).json({ ok: false, error: "signers required" });

  const boldSignKey = process.env.BOLDSIGN_API_KEY;
  if (boldSignKey && (fileBase64 || driveFileId)) {
    try {
      return await _sendViaBoldSign({ res, userId, tenantId, title, signers, message, fileBase64, mimeType, driveFileId, metadata, boldSignKey });
    } catch (boldSignErr) {
      console.warn("[esign] BoldSign failed, falling back to native:", boldSignErr.message);
    }
  }

  return await _sendViaNativeSigning({ res, userId, tenantId, title, signers, message, fileBase64, mimeType, metadata });
}

// ── BOLDSIGN TRACK A ──────────────────────────────────────────────
async function _sendViaBoldSign({ res, userId, tenantId, title, signers, message, fileBase64, mimeType, driveFileId, metadata, boldSignKey }) {
  let fileBuffer;
  let fileName = `${title.replace(/[^a-z0-9]/gi, "_")}.pdf`;

  if (fileBase64) {
    fileBuffer = Buffer.from(fileBase64, "base64");
  } else if (driveFileId) {
    const { getAuthenticatedDriveClient } = require("../vault/driveAuth");
    const driveClient = await getAuthenticatedDriveClient(userId);
    const dlRes = await driveClient.files.get({ fileId: driveFileId, alt: "media" }, { responseType: "arraybuffer" });
    fileBuffer = Buffer.from(dlRes.data);
    try {
      const metaRes = await driveClient.files.get({ fileId: driveFileId, fields: "name" });
      fileName = metaRes.data.name || fileName;
    } catch (_) {}
  }

  if (!fileBuffer) throw new Error("No file provided — pass fileBase64 or driveFileId");

  const form = new FormData();
  form.append("Title", title);
  if (message) form.append("Message", message);

  signers.forEach((signer, i) => {
    form.append(`Signers[${i}][Name]`, signer.name || signer.email);
    form.append(`Signers[${i}][EmailAddress]`, signer.email);
    form.append(`Signers[${i}][SignerType]`, "Signer");
    form.append(`Signers[${i}][DeliveryMode]`, "Email");
    // Signature field placed near the bottom of page 1
    form.append(`Signers[${i}][FormFields][0][Id]`, `sig_${i}`);
    form.append(`Signers[${i}][FormFields][0][Name]`, "Signature");
    form.append(`Signers[${i}][FormFields][0][FieldType]`, "Signature");
    form.append(`Signers[${i}][FormFields][0][PageIndex]`, "1");
    form.append(`Signers[${i}][FormFields][0][Bounds][X]`, "50");
    form.append(`Signers[${i}][FormFields][0][Bounds][Y]`, "600");
    form.append(`Signers[${i}][FormFields][0][Bounds][Width]`, "200");
    form.append(`Signers[${i}][FormFields][0][Bounds][Height]`, "50");
  });

  const blob = new Blob([fileBuffer], { type: mimeType || "application/pdf" });
  form.append("Files", blob, fileName);

  const response = await fetch("https://api.boldsign.com/v1/document/send", {
    method: "POST",
    headers: { "X-API-KEY": boldSignKey },
    body: form,
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.title || errBody.message || `BoldSign error ${response.status}`);
  }

  const result = await response.json();
  const documentId = result.documentId;

  const db = getDb();
  const reqRef = await db.collection("esignRequests").add({
    tenantId, userId, title,
    signers: signers.map(s => ({ email: s.email, name: s.name || null, status: "pending" })),
    message: message || null,
    boldSignDocumentId: documentId,
    track: "boldsign",
    status: "sent",
    metadata: metadata || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return res.json({
    ok: true,
    requestId: reqRef.id,
    track: "boldsign",
    documentId,
    message: `Sent to ${signers.map(s => s.email).join(", ")} via BoldSign. They'll receive an email with a signing link automatically.`,
  });
}

// ── BOLDSIGN: GET DOCUMENT STATUS ─────────────────────────────────
async function handleBoldSignDocumentStatus(req, res) {
  const { documentId } = req.query || {};
  if (!documentId) return res.status(400).json({ ok: false, error: "documentId required" });
  const boldSignKey = process.env.BOLDSIGN_API_KEY;
  if (!boldSignKey) return res.status(503).json({ ok: false, error: "BoldSign not configured" });
  const response = await fetch(`https://api.boldsign.com/v1/document/properties?documentId=${encodeURIComponent(documentId)}`, {
    headers: { "X-API-KEY": boldSignKey, "Accept": "application/json" },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return res.status(response.status).json({ ok: false, error: err.title || "Failed to get document status" });
  }
  const data = await response.json();
  return res.json({ ok: true, status: data.status, signers: data.signerDetails });
}

// ── LIST REQUESTS (from Firestore) ────────────────────────────────
async function handleESignRequests(req, res, { userId, tenantId }) {
  const db = getDb();
  const snap = await db.collection("esignRequests")
    .where("tenantId", "==", tenantId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  const requests = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.()?.toISOString() || null }));
  return res.json({ ok: true, requests });
}

// ── SOCIII NATIVE TRACK B ─────────────────────────────────────────
async function _sendViaNativeSigning({ res, userId, tenantId, title, signers, message, fileBase64, mimeType, metadata }) {
  const db = getDb();

  let storagePath = null;
  if (fileBase64) {
    try {
      const bucket = getStorage().bucket();
      storagePath = `esign/${tenantId}/${Date.now()}_${title.replace(/[^a-z0-9]/gi, "_")}.pdf`;
      const fileBuffer = Buffer.from(fileBase64, "base64");
      await bucket.file(storagePath).save(fileBuffer, {
        metadata: { contentType: mimeType || "application/pdf" },
      });
    } catch (e) {
      console.warn("[esign] Storage upload failed:", e.message);
    }
  }

  const reqRef = await db.collection("esignRequests").add({
    tenantId, userId, title,
    signers: signers.map(s => ({ email: s.email, name: s.name || null, status: "pending" })),
    message: message || null,
    storagePath,
    track: "native",
    status: "sent",
    metadata: metadata || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const signingLinks = signers.map(signer => {
    const payload = JSON.stringify({ requestId: reqRef.id, email: signer.email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    const encryptedToken = encrypt(payload);
    const tokenStr = Buffer.from(JSON.stringify(encryptedToken)).toString("base64url");
    return { email: signer.email, signingUrl: `${process.env.APP_BASE_URL || "https://sociii.ai"}/sign/${tokenStr}` };
  });

  return res.json({
    ok: true,
    requestId: reqRef.id,
    track: "native",
    signingLinks,
    message: `Signing request created. Share the signing link with ${signers.map(s => s.email).join(", ")}.`,
  });
}

// ── PUBLIC: VIEW SIGNING PAGE DATA ───────────────────────────────
async function handleESignView(req, res) {
  const { token } = req.query || {};
  if (!token) return res.status(400).json({ ok: false, error: "Missing token" });
  try {
    const payload = JSON.parse(Buffer.from(token, "base64url").toString());
    const decrypted = JSON.parse(decrypt(payload));
    if (decrypted.exp < Date.now()) return res.status(410).json({ ok: false, error: "Signing link expired" });
    const db = getDb();
    const snap = await db.collection("esignRequests").doc(decrypted.requestId).get();
    if (!snap.exists) return res.status(404).json({ ok: false, error: "Request not found" });
    const d = snap.data();
    const signer = (d.signers || []).find(s => s.email === decrypted.email);
    if (!signer) return res.status(403).json({ ok: false, error: "Signer not found" });
    return res.json({ ok: true, title: d.title, message: d.message, signerEmail: decrypted.email, signerName: signer.name, status: signer.status, storagePath: d.storagePath || null });
  } catch (e) {
    return res.status(400).json({ ok: false, error: "Invalid token" });
  }
}

// ── PUBLIC: SUBMIT SIGNATURE (native track) ───────────────────────
async function handleESignSign(req, res) {
  const { token, signatureData, signerName } = req.body || {};
  if (!token || !signatureData) return res.status(400).json({ ok: false, error: "token and signatureData required" });
  try {
    const payload = JSON.parse(Buffer.from(token, "base64url").toString());
    const decrypted = JSON.parse(decrypt(payload));
    if (decrypted.exp < Date.now()) return res.status(410).json({ ok: false, error: "Signing link expired" });

    const db = getDb();
    const ref = db.collection("esignRequests").doc(decrypted.requestId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ ok: false, error: "Request not found" });

    const d = snap.data();
    const signers = (d.signers || []).map(s =>
      s.email === decrypted.email ? { ...s, status: "signed", signedAt: new Date().toISOString(), signerName: signerName || s.name } : s
    );
    const allSigned = signers.every(s => s.status === "signed");

    await db.collection("esignEvents").add({
      requestId: decrypted.requestId,
      tenantId: d.tenantId,
      signerEmail: decrypted.email,
      signerName: signerName || null,
      signatureData,
      signedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await ref.update({ signers, status: allSigned ? "completed" : "partial", updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    return res.json({ ok: true, allSigned, message: allSigned ? "Document fully signed." : "Signature recorded. Waiting for remaining signers." });
  } catch (e) {
    return res.status(400).json({ ok: false, error: "Signing failed: " + e.message });
  }
}

module.exports = {
  handleESignStatus,
  handleESignSend,
  handleBoldSignDocumentStatus,
  handleESignRequests,
  handleESignView,
  handleESignSign,
};
