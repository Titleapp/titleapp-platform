"use strict";

/**
 * driveAuth.js — Google Drive OAuth lifecycle
 *
 * Handles OAuth consent URL generation, code exchange, token encryption,
 * automatic refresh, disconnect, and status check.
 *
 * Tokens are encrypted with AES-256-GCM before storage. Never logged or exposed.
 *
 * Exports: handleDriveAuthUrl, handleDriveExchangeCode, handleDriveDisconnect,
 *          handleDriveStatus, getAuthenticatedDriveClient
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

// Lazy-load googleapis
let _google;
function getGoogle() {
  if (!_google) _google = require("googleapis").google;
  return _google;
}

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

// ═══════════════════════════════════════════════════════════════
//  TOKEN ENCRYPTION — AES-256-GCM
// ═══════════════════════════════════════════════════════════════

const ALGORITHM = "aes-256-gcm";

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
  const authTag = cipher.getAuthTag().toString("hex");
  return { encrypted, iv: iv.toString("hex"), authTag };
}

function decrypt({ encrypted, iv, authTag }) {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ═══════════════════════════════════════════════════════════════
//  OAUTH2 CLIENT FACTORY
// ═══════════════════════════════════════════════════════════════

function createOAuth2Client() {
  const google = getGoogle();
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

// ═══════════════════════════════════════════════════════════════
//  HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate OAuth consent URL for Google Drive access.
 * Frontend opens this in a popup window.
 */
async function handleDriveAuthUrl(req, res, { userId }) {
  const oauth2Client = createOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: userId, // Used to verify on callback
  });

  return res.json({ ok: true, authUrl });
}

/**
 * Exchange authorization code for tokens. Called by frontend after
 * popup callback sends the code via postMessage.
 */
async function handleDriveExchangeCode(req, res, { userId }) {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: "Missing authorization code" });

  const oauth2Client = createOAuth2Client();

  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    return res.status(400).json({ ok: false, error: "No refresh token received. Try disconnecting and reconnecting." });
  }

  // Get user's Google email for display
  oauth2Client.setCredentials(tokens);
  const google = getGoogle();
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email || "unknown";

  // Encrypt refresh token
  const encryptedRefreshToken = encrypt(tokens.refresh_token);

  // Store in Firestore
  const db = getDb();
  await db.collection("users").doc(userId)
    .collection("integrations").doc("googleDrive").set({
      connected: true,
      email,
      encryptedRefreshToken,
      scopes: SCOPES,
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsedAt: null,
    });

  return res.json({ ok: true, email });
}

/**
 * Disconnect Google Drive — revoke token and delete from Firestore.
 */
async function handleDriveDisconnect(req, res, { userId }) {
  const db = getDb();
  const docRef = db.collection("users").doc(userId)
    .collection("integrations").doc("googleDrive");
  const snap = await docRef.get();

  if (snap.exists) {
    const data = snap.data();
    // Attempt to revoke the token
    if (data.encryptedRefreshToken) {
      try {
        const refreshToken = decrypt(data.encryptedRefreshToken);
        const oauth2Client = createOAuth2Client();
        await oauth2Client.revokeToken(refreshToken);
      } catch (revokeErr) {
        // Non-fatal — token may already be invalid
        console.warn("Drive token revocation failed:", revokeErr.message);
      }
    }
    await docRef.delete();
  }

  return res.json({ ok: true });
}

/**
 * Check Drive connection status. Never exposes tokens.
 */
async function handleDriveStatus(req, res, { userId }) {
  const db = getDb();
  const snap = await db.collection("users").doc(userId)
    .collection("integrations").doc("googleDrive").get();

  if (!snap.exists) {
    return res.json({ ok: true, connected: false });
  }

  const data = snap.data();
  return res.json({
    ok: true,
    connected: data.connected || false,
    email: data.email || null,
    connectedAt: data.connectedAt || null,
  });
}

// ═══════════════════════════════════════════════════════════════
//  INTERNAL — Authenticated Drive client for other modules
// ═══════════════════════════════════════════════════════════════

/**
 * Get an authenticated Google Drive API client for a user.
 * Decrypts stored refresh token, handles automatic token refresh.
 *
 * @param {string} userId — Firebase user ID
 * @returns {Promise<object>} — google.drive({ version: "v3" }) instance
 */
async function getAuthenticatedDriveClient(userId) {
  const db = getDb();
  const snap = await db.collection("users").doc(userId)
    .collection("integrations").doc("googleDrive").get();

  if (!snap.exists || !snap.data().connected) {
    throw new Error("Google Drive not connected. Please connect in Settings.");
  }

  const data = snap.data();
  if (!data.encryptedRefreshToken) {
    throw new Error("No stored Drive token. Please reconnect Google Drive.");
  }

  const refreshToken = decrypt(data.encryptedRefreshToken);
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // Update lastUsedAt
  db.collection("users").doc(userId)
    .collection("integrations").doc("googleDrive")
    .update({ lastUsedAt: admin.firestore.FieldValue.serverTimestamp() })
    .catch(() => {}); // Non-blocking

  const google = getGoogle();
  return google.drive({ version: "v3", auth: oauth2Client });
}

module.exports = {
  handleDriveAuthUrl,
  handleDriveExchangeCode,
  handleDriveDisconnect,
  handleDriveStatus,
  getAuthenticatedDriveClient,
};
