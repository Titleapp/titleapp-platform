"use strict";

/**
 * googleCalendarAuth.js — Google Calendar OAuth lifecycle
 *
 * Parallel to vault/driveAuth.js. Calendar is a connector, not a worker —
 * every worker reads/writes calendar events tagged with worker:<slug> in the
 * event description metadata block.
 *
 * Tokens are encrypted with AES-256-GCM before storage. Same key as Drive
 * (GDRIVE_ENCRYPTION_KEY) — single shared key for all Google OAuth refresh
 * tokens. Different doc per integration; no cross-leak.
 *
 * Exports: handleCalendarAuthUrl, handleCalendarExchangeCode,
 *          handleCalendarDisconnect, handleCalendarStatus,
 *          getAuthenticatedCalendarClient
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

let _google;
function getGoogle() {
  if (!_google) _google = require("googleapis").google;
  return _google;
}

// calendar.events covers read + write on the user's primary calendar.
// calendar.readonly is included so we can list secondary calendars (Family,
// shared work calendars) even when we don't write to them.
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

// ═══════════════════════════════════════════════════════════════
//  TOKEN ENCRYPTION — AES-256-GCM (shared key with Drive)
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

async function handleCalendarAuthUrl(req, res, { userId }) {
  const oauth2Client = createOAuth2Client();
  // state encodes both userId AND the flow type. The shared callback page
  // (apps/business/public/auth/google-drive-callback.html) uses the flow
  // suffix to decide whether to postMessage "google-drive-auth-code" or
  // "google-calendar-auth-code" to opener.
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: `${userId}|calendar`,
    include_granted_scopes: true,
  });
  return res.json({ ok: true, authUrl });
}

async function handleCalendarExchangeCode(req, res, { userId }) {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: "Missing authorization code" });

  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    return res.status(400).json({ ok: false, error: "No refresh token received. Disconnect Google Calendar in your Google account permissions and reconnect." });
  }

  oauth2Client.setCredentials(tokens);
  const google = getGoogle();
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email || "unknown";

  const encryptedRefreshToken = encrypt(tokens.refresh_token);

  const db = getDb();
  await db.collection("users").doc(userId)
    .collection("integrations").doc("googleCalendar").set({
      connected: true,
      email,
      encryptedRefreshToken,
      scopes: SCOPES,
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsedAt: null,
    });

  return res.json({ ok: true, email });
}

async function handleCalendarDisconnect(req, res, { userId }) {
  const db = getDb();
  const docRef = db.collection("users").doc(userId)
    .collection("integrations").doc("googleCalendar");
  const snap = await docRef.get();

  if (snap.exists) {
    const data = snap.data();
    if (data.encryptedRefreshToken) {
      try {
        const refreshToken = decrypt(data.encryptedRefreshToken);
        const oauth2Client = createOAuth2Client();
        await oauth2Client.revokeToken(refreshToken);
      } catch (revokeErr) {
        console.warn("Calendar token revocation failed:", revokeErr.message);
      }
    }
    await docRef.delete();
  }

  return res.json({ ok: true });
}

async function handleCalendarStatus(req, res, { userId }) {
  const db = getDb();
  const snap = await db.collection("users").doc(userId)
    .collection("integrations").doc("googleCalendar").get();

  if (!snap.exists) return res.json({ ok: true, connected: false });

  const data = snap.data();
  return res.json({
    ok: true,
    connected: data.connected || false,
    email: data.email || null,
    connectedAt: data.connectedAt || null,
    scopes: data.scopes || [],
  });
}

// ═══════════════════════════════════════════════════════════════
//  INTERNAL — Authenticated Calendar client for other modules
// ═══════════════════════════════════════════════════════════════

async function getAuthenticatedCalendarClient(userId) {
  const db = getDb();
  const snap = await db.collection("users").doc(userId)
    .collection("integrations").doc("googleCalendar").get();

  if (!snap.exists || !snap.data().connected) {
    throw new Error("Google Calendar not connected. Please connect in Settings.");
  }

  const data = snap.data();
  if (!data.encryptedRefreshToken) {
    throw new Error("No stored Calendar token. Please reconnect Google Calendar.");
  }

  const refreshToken = decrypt(data.encryptedRefreshToken);
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // Touch lastUsedAt — non-blocking
  db.collection("users").doc(userId)
    .collection("integrations").doc("googleCalendar")
    .update({ lastUsedAt: admin.firestore.FieldValue.serverTimestamp() })
    .catch(() => {});

  const google = getGoogle();
  return google.calendar({ version: "v3", auth: oauth2Client });
}

module.exports = {
  handleCalendarAuthUrl,
  handleCalendarExchangeCode,
  handleCalendarDisconnect,
  handleCalendarStatus,
  getAuthenticatedCalendarClient,
};
