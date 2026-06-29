"use strict";

/**
 * tiktok.js — TikTok OAuth 2.0 + video publish lifecycle.
 *
 * Uses TikTok Login Kit v2 (PKCE required for web flows).
 * App credentials: TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET.
 * Tokens stored per-user at users/{uid}/integrations/tiktok.
 * Refresh token encrypted with same AES-256-GCM key as Drive/YouTube.
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const SCOPES = "user.info.basic,video.upload,video.publish";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const key = process.env.GDRIVE_ENCRYPTION_KEY;
  if (!key || key.length !== 64) throw new Error("GDRIVE_ENCRYPTION_KEY must be 64-char hex");
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

function getRedirectUri() {
  return process.env.TIKTOK_REDIRECT_URI || "https://sociii.ai/auth/tiktok-callback";
}

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

async function handleTikTokAuthUrl(req, res, { userId }) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) return res.status(500).json({ ok: false, error: "TikTok not configured" });

  const { verifier, challenge } = generatePKCE();
  const state = `${userId}|tiktok`;

  // Store verifier so exchangeCode can retrieve it
  await getDb().collection("users").doc(userId)
    .collection("integrations").doc("tiktok-pkce")
    .set({ verifier, createdAt: admin.firestore.FieldValue.serverTimestamp() });

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: SCOPES,
    response_type: "code",
    redirect_uri: getRedirectUri(),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return res.json({ ok: true, authUrl: `${TIKTOK_AUTH_URL}?${params.toString()}` });
}

async function handleTikTokExchangeCode(req, res, { userId }) {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: "code required" });

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) return res.status(500).json({ ok: false, error: "TikTok not configured" });

  // Retrieve PKCE verifier
  const pkceSnap = await getDb().collection("users").doc(userId)
    .collection("integrations").doc("tiktok-pkce").get();
  const verifier = pkceSnap.exists ? pkceSnap.data().verifier : null;
  if (!verifier) return res.status(400).json({ ok: false, error: "PKCE session expired — please try connecting again" });

  const params = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: getRedirectUri(),
    code_verifier: verifier,
  });

  const tokenRes = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: params.toString(),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || tokenData.error) {
    return res.status(400).json({ ok: false, error: tokenData.error_description || tokenData.error || "Token exchange failed" });
  }

  const { access_token, refresh_token, open_id, scope, expires_in, refresh_expires_in } = tokenData;

  // Fetch user display name
  let displayName = null;
  try {
    const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userData = await userRes.json();
    displayName = userData?.data?.user?.display_name || null;
  } catch { /* non-fatal */ }

  const encryptedAccessToken = encrypt(access_token);
  const encryptedRefreshToken = refresh_token ? encrypt(refresh_token) : null;

  const db = getDb();
  await db.collection("users").doc(userId).collection("integrations").doc("tiktok").set({
    connected: true,
    openId: open_id,
    displayName,
    scopes: scope ? scope.split(",") : [],
    encryptedAccessToken,
    ...(encryptedRefreshToken ? { encryptedRefreshToken } : {}),
    expiresIn: expires_in || null,
    refreshExpiresIn: refresh_expires_in || null,
    connectedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Clean up PKCE doc
  await db.collection("users").doc(userId).collection("integrations").doc("tiktok-pkce").delete().catch(() => {});

  return res.json({ ok: true, displayName, openId: open_id });
}

async function handleTikTokStatus(req, res, { userId }) {
  const snap = await getDb().collection("users").doc(userId)
    .collection("integrations").doc("tiktok").get();
  if (!snap.exists) return res.json({ ok: true, connected: false });
  const data = snap.data();
  return res.json({
    ok: true,
    connected: data.connected || false,
    displayName: data.displayName || null,
    openId: data.openId || null,
    connectedAt: data.connectedAt || null,
  });
}

async function handleTikTokDisconnect(req, res, { userId }) {
  await getDb().collection("users").doc(userId).collection("integrations").doc("tiktok")
    .set({ connected: false, disconnectedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return res.json({ ok: true });
}

/**
 * Get a valid access token for a user (refreshing if needed).
 * @private
 */
async function _getAccessToken(userId) {
  const snap = await getDb().collection("users").doc(userId)
    .collection("integrations").doc("tiktok").get();
  if (!snap.exists || !snap.data().connected) throw new Error("TikTok account not connected");
  const data = snap.data();
  return decrypt(data.encryptedAccessToken);
}

/**
 * Post a video to TikTok using the Content Posting API (PULL_FROM_URL).
 * The video must be publicly accessible (use a signed URL or public CDN link).
 *
 * @param {string} userId
 * @param {object} opts - { videoUrl, title, privacyLevel }
 *   privacyLevel: "SELF_ONLY" | "MUTUAL_FRIEND_FRIENDS" | "FOLLOWER_OF_CREATOR" | "PUBLIC_TO_EVERYONE"
 */
async function postVideoToTikTok(userId, { videoUrl, title, privacyLevel = "SELF_ONLY" }) {
  if (!videoUrl) throw new Error("postVideoToTikTok: videoUrl is required");
  const accessToken = await _getAccessToken(userId);

  const body = {
    post_info: {
      title: (title || "").slice(0, 2200) || "Video",
      privacy_level: privacyLevel,
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
    },
    source_info: {
      source: "PULL_FROM_URL",
      video_url: videoUrl,
    },
  };

  const res = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok || data.error?.code !== "ok") {
    const msg = data.error?.message || data.error?.code || `HTTP ${res.status}`;
    throw new Error(`TikTok publish failed: ${msg}`);
  }

  const publishId = data.data?.publish_id;
  return { ok: true, publishId, url: null };
}

module.exports = {
  handleTikTokAuthUrl,
  handleTikTokExchangeCode,
  handleTikTokStatus,
  handleTikTokDisconnect,
  postVideoToTikTok,
};
