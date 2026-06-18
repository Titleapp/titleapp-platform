"use strict";

/**
 * youtube.js — YouTube (Google) OAuth lifecycle + video upload.
 *
 * Built on the same pattern as services/calendar/googleCalendarAuth.js and
 * services/vault/driveAuth.js: same Google OAuth client (GOOGLE_OAUTH_*),
 * same AES-256-GCM refresh-token encryption (GDRIVE_ENCRYPTION_KEY), tokens
 * stored per-user at users/{uid}/integrations/youtube. The marketing worker
 * (and Sean's sociii.ai channel) connect once, then publish videos.
 *
 * ── IMPORTANT real-world constraints (see notes to Sean) ──
 *  • youtube.upload is a SENSITIVE scope. Until the Google Cloud project
 *    passes Google's OAuth audit, uploaded videos are LOCKED to privacyStatus
 *    "private" regardless of what we request, and only test users can connect.
 *  • videos.insert costs ~1600 quota units; default daily quota is 10,000
 *    (~6 uploads/day) until a quota increase is granted. For a 30-video sprint,
 *    upload via YouTube Studio; use this API path for the demo + automation.
 *
 * Exports: handleYouTubeAuthUrl, handleYouTubeExchangeCode,
 *          handleYouTubeDisconnect, handleYouTubeStatus,
 *          getAuthenticatedYouTubeClient, uploadVideo, uploadVideoFromStorage
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

let _google;
function getGoogle() {
  if (!_google) _google = require("googleapis").google;
  return _google;
}

// youtube.upload — publish videos. youtube.readonly — read channel/video state
// (so we can confirm which channel is connected and report upload status).
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

// ═══════════════════════════════════════════════════════════════
//  TOKEN ENCRYPTION — AES-256-GCM (shared key with Drive/Calendar)
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
//  OAUTH HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handleYouTubeAuthUrl(req, res, { userId }) {
  const oauth2Client = createOAuth2Client();
  // state carries userId + flow suffix; the shared callback page
  // (apps/business/public/auth/google-drive-callback.html) postMessages
  // "google-youtube-auth-code" to the opener for the "youtube" flow.
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: `${userId}|youtube`,
    include_granted_scopes: true,
  });
  return res.json({ ok: true, authUrl });
}

async function handleYouTubeExchangeCode(req, res, { userId }) {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: "Missing authorization code" });

  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    return res.status(400).json({ ok: false, error: "No refresh token received. Remove SOCIII from your Google account permissions and reconnect." });
  }

  oauth2Client.setCredentials(tokens);
  const google = getGoogle();

  // Identify the connected Google account + YouTube channel.
  let email = "unknown";
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    email = userInfo.data.email || "unknown";
  } catch (_) { /* userinfo scope may be absent; non-fatal */ }

  let channel = null;
  try {
    const yt = google.youtube({ version: "v3", auth: oauth2Client });
    const chRes = await yt.channels.list({ part: "snippet", mine: true });
    const ch = chRes.data.items && chRes.data.items[0];
    if (ch) channel = { id: ch.id, title: ch.snippet && ch.snippet.title };
  } catch (_) { /* channel read is best-effort */ }

  const encryptedRefreshToken = encrypt(tokens.refresh_token);

  const db = getDb();
  await db.collection("users").doc(userId)
    .collection("integrations").doc("youtube").set({
      connected: true,
      email,
      channelId: channel ? channel.id : null,
      channelTitle: channel ? channel.title : null,
      encryptedRefreshToken,
      scopes: SCOPES,
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsedAt: null,
    });

  return res.json({ ok: true, email, channel });
}

async function handleYouTubeDisconnect(req, res, { userId }) {
  const db = getDb();
  const docRef = db.collection("users").doc(userId)
    .collection("integrations").doc("youtube");
  const snap = await docRef.get();

  if (snap.exists) {
    const data = snap.data();
    if (data.encryptedRefreshToken) {
      try {
        const refreshToken = decrypt(data.encryptedRefreshToken);
        const oauth2Client = createOAuth2Client();
        await oauth2Client.revokeToken(refreshToken);
      } catch (revokeErr) {
        console.warn("YouTube token revocation failed:", revokeErr.message);
      }
    }
    await docRef.delete();
  }

  return res.json({ ok: true });
}

async function handleYouTubeStatus(req, res, { userId }) {
  const db = getDb();
  const snap = await db.collection("users").doc(userId)
    .collection("integrations").doc("youtube").get();

  if (!snap.exists) return res.json({ ok: true, connected: false });

  const data = snap.data();
  return res.json({
    ok: true,
    connected: data.connected || false,
    email: data.email || null,
    channelId: data.channelId || null,
    channelTitle: data.channelTitle || null,
    connectedAt: data.connectedAt || null,
    scopes: data.scopes || [],
  });
}

// ═══════════════════════════════════════════════════════════════
//  INTERNAL — Authenticated YouTube client
// ═══════════════════════════════════════════════════════════════

async function getAuthenticatedYouTubeClient(userId) {
  const db = getDb();
  const snap = await db.collection("users").doc(userId)
    .collection("integrations").doc("youtube").get();

  if (!snap.exists || !snap.data().connected) {
    throw new Error("YouTube not connected. Connect your channel in the Marketing worker first.");
  }

  const data = snap.data();
  if (!data.encryptedRefreshToken) {
    throw new Error("No stored YouTube token. Please reconnect YouTube.");
  }

  const refreshToken = decrypt(data.encryptedRefreshToken);
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  db.collection("users").doc(userId)
    .collection("integrations").doc("youtube")
    .update({ lastUsedAt: admin.firestore.FieldValue.serverTimestamp() })
    .catch(() => {});

  const google = getGoogle();
  return google.youtube({ version: "v3", auth: oauth2Client });
}

// ═══════════════════════════════════════════════════════════════
//  UPLOAD
// ═══════════════════════════════════════════════════════════════

/**
 * Upload a video to the connected channel.
 * @param {string} userId
 * @param {object} opts
 * @param {ReadableStream} opts.stream  - the video bytes (required)
 * @param {string} opts.title
 * @param {string} [opts.description]
 * @param {string[]} [opts.tags]
 * @param {string} [opts.privacyStatus] - "private" | "unlisted" | "public"
 *        (NOTE: forced to "private" by YouTube until the app passes audit)
 * @param {string} [opts.categoryId]    - default "22" (People & Blogs)
 * @returns {Promise<{ok:true, videoId, url, privacyStatus}>}
 */
async function uploadVideo(userId, opts = {}) {
  const { stream, title, description = "", tags = [], privacyStatus = "private", categoryId = "22" } = opts;
  if (!stream) throw new Error("uploadVideo: a video stream is required");
  if (!title) throw new Error("uploadVideo: a title is required");

  const youtube = await getAuthenticatedYouTubeClient(userId);
  const insertRes = await youtube.videos.insert({
    part: "snippet,status",
    requestBody: {
      snippet: { title, description, tags, categoryId },
      status: { privacyStatus, selfDeclaredMadeForKids: false },
    },
    media: { body: stream },
  });

  const videoId = insertRes.data.id;
  return {
    ok: true,
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    privacyStatus: (insertRes.data.status && insertRes.data.status.privacyStatus) || privacyStatus,
  };
}

/**
 * Upload a video that already lives in Cloud Storage (the platform stores
 * generated/uploaded videos there — same source the X poster reads from).
 * @param {string} userId
 * @param {string} storagePath - object path in the default bucket
 * @param {object} metadata    - { title, description, tags, privacyStatus, categoryId }
 */
async function uploadVideoFromStorage(userId, storagePath, metadata = {}) {
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) throw new Error(`uploadVideoFromStorage: object not found: ${storagePath}`);
  const stream = file.createReadStream();
  return uploadVideo(userId, { ...metadata, stream });
}

module.exports = {
  handleYouTubeAuthUrl,
  handleYouTubeExchangeCode,
  handleYouTubeDisconnect,
  handleYouTubeStatus,
  getAuthenticatedYouTubeClient,
  uploadVideo,
  uploadVideoFromStorage,
  SCOPES,
};
