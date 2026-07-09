"use strict";
/**
 * services/esign/googleESign.js — Google eSignature connector
 *
 * OAuth lifecycle + Drive-based document signing. Replaces Dropbox Sign
 * for new signing requests. Existing signed documents in Dropbox Sign are
 * unaffected (access until July 26, 2026).
 *
 * Flow:
 *   1. User connects Google eSign in Settings → stores refresh token
 *   2. Send a document: upload PDF/docx to Drive → share with signer (Google sends email)
 *   3. Signer opens Drive link → signs via Google's native eSignature UI
 *   4. Completion is confirmed via esign:anchor side effect (already wired in Alex)
 *
 * Same AES-256-GCM encryption as driveAuth.js (same GDRIVE_ENCRYPTION_KEY env var).
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

const ALGORITHM = "aes-256-gcm";
const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "email",
];

function getDb() { return admin.firestore(); }

let _google;
function getGoogle() {
  if (!_google) _google = require("googleapis").google;
  return _google;
}

// ── Encryption (same as driveAuth.js) ──────────────────────────────

function getEncryptionKey() {
  const key = process.env.GDRIVE_ENCRYPTION_KEY;
  if (!key || key.length !== 64) throw new Error("GDRIVE_ENCRYPTION_KEY must be 64-char hex (32 bytes)");
  return Buffer.from(key, "hex");
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return { encrypted, iv: iv.toString("hex"), authTag: cipher.getAuthTag().toString("hex") };
}

function decrypt({ encrypted, iv, authTag }) {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ── OAuth2 client ───────────────────────────────────────────────────

function createOAuth2Client() {
  const google = getGoogle();
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

// ── Handlers ────────────────────────────────────────────────────────

async function handleAuthUrl(req, res, { userId }) {
  const oauth2Client = createOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: userId + "|esign",
  });
  return res.json({ ok: true, authUrl });
}

async function handleExchangeCode(req, res, { userId }) {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: "Missing authorization code" });

  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    return res.status(400).json({ ok: false, error: "No refresh token. Disconnect and reconnect." });
  }

  oauth2Client.setCredentials(tokens);
  let email = "connected";
  try {
    const google = getGoogle();
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const info = await oauth2.userinfo.get();
    email = info.data.email || "connected";
  } catch (_) {}

  const db = getDb();
  await db.collection("users").doc(userId).collection("integrations").doc("googleESign").set({
    connected: true,
    email,
    encryptedRefreshToken: encrypt(tokens.refresh_token),
    scopes: SCOPES,
    connectedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUsedAt: null,
  });

  return res.json({ ok: true, email });
}

async function handleDisconnect(req, res, { userId }) {
  const db = getDb();
  const ref = db.collection("users").doc(userId).collection("integrations").doc("googleESign");
  const snap = await ref.get();
  if (snap.exists && snap.data().encryptedRefreshToken) {
    try {
      const oauth2Client = createOAuth2Client();
      await oauth2Client.revokeToken(decrypt(snap.data().encryptedRefreshToken));
    } catch (e) {
      console.warn("[googleESign] token revocation failed:", e.message);
    }
  }
  if (snap.exists) await ref.delete();
  return res.json({ ok: true });
}

async function handleStatus(req, res, { userId }) {
  const db = getDb();
  const snap = await db.collection("users").doc(userId).collection("integrations").doc("googleESign").get();
  if (!snap.exists) return res.json({ ok: true, connected: false });
  const d = snap.data();
  return res.json({ ok: true, connected: d.connected || false, email: d.email || null, connectedAt: d.connectedAt || null });
}

// ── Internal: get authenticated Drive client via eSign token ────────

async function getESignDriveClient(userId) {
  const db = getDb();
  const snap = await db.collection("users").doc(userId).collection("integrations").doc("googleESign").get();
  if (!snap.exists || !snap.data().connected) {
    throw new Error("Google eSignature not connected. Connect in Settings → Integrations.");
  }
  const data = snap.data();
  if (!data.encryptedRefreshToken) throw new Error("No stored eSign token. Please reconnect.");
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: decrypt(data.encryptedRefreshToken) });
  db.collection("users").doc(userId).collection("integrations").doc("googleESign")
    .update({ lastUsedAt: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
  return getGoogle().drive({ version: "v3", auth: oauth2Client });
}

// ── Send for signature ──────────────────────────────────────────────

/**
 * Upload a document to the user's Drive and share it with signers.
 * Google sends a standard sharing email; signers open Drive and sign
 * using Google's native eSignature UI.
 *
 * @param {string} userId
 * @param {object} opts
 *   title        {string}   — document title (used as filename in Drive)
 *   signers      {Array<{email: string, name: string}>}
 *   message      {string}   — optional message in the sharing email
 *   fileBuffer   {Buffer}   — document bytes (PDF or docx)
 *   mimeType     {string}   — source MIME type (uploaded as-is; Drive converts to Doc if possible)
 *   tenantId     {string}
 *   metadata     {object}
 */
async function sendForSignature(userId, { title, signers, message, fileBuffer, mimeType, tenantId, metadata }) {
  const drive = await getESignDriveClient(userId);
  const { Readable } = require("stream");

  // Upload to Drive (convert to Google Doc for native eSign support)
  const uploadResp = await drive.files.create({
    requestBody: {
      name: title || "Signature Request",
      mimeType: "application/vnd.google-apps.document",
    },
    media: {
      mimeType: mimeType || "application/pdf",
      body: Readable.from(fileBuffer),
    },
    fields: "id,webViewLink,name",
  });

  const fileId = uploadResp.data.id;
  const fileUrl = uploadResp.data.webViewLink;

  // Share with each signer; Google sends a notification email automatically
  for (const signer of (signers || [])) {
    await drive.permissions.create({
      fileId,
      requestBody: { type: "user", role: "writer", emailAddress: signer.email },
      emailMessage: message || `Please review and sign: ${title}`,
      sendNotificationEmail: true,
    }).catch(err => console.warn(`[googleESign] permission grant failed for ${signer.email}:`, err.message));
  }

  // Record in Firestore (same collection as Dropbox Sign requests)
  const requestId = "esign_" + crypto.randomUUID().replace(/-/g, "");
  const db = getDb();
  await db.collection("signatureRequests").doc(requestId).set({
    requestId,
    tenantId: tenantId || null,
    userId,
    title: title || "Signature Request",
    message: message || null,
    signers: (signers || []).map(s => ({ email: s.email, name: s.name || "", status: "pending", signedAt: null })),
    method: "google-esignature",
    driveFileId: fileId,
    driveFileUrl: fileUrl,
    status: "pending",
    metadata: metadata || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true, requestId, fileId, fileUrl };
}

/**
 * List recent signing requests for a user.
 */
async function listRequests(userId, tenantId) {
  const db = getDb();
  const snap = await db.collection("signatureRequests")
    .where("userId", "==", userId)
    .where("method", "==", "google-esignature")
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();
  return snap.docs.map(d => d.data());
}

/**
 * Get a single request's status.
 */
async function getRequest(requestId) {
  const db = getDb();
  const snap = await db.collection("signatureRequests").doc(requestId).get();
  return snap.exists ? snap.data() : null;
}

module.exports = {
  handleAuthUrl,
  handleExchangeCode,
  handleDisconnect,
  handleStatus,
  sendForSignature,
  listRequests,
  getRequest,
  getESignDriveClient,
};
