"use strict";

/**
 * xUserAuth.js — Per-user X (Twitter) OAuth 2.0 + PKCE.
 *
 * Platform account (@SOCIIIai) still uses OAuth 1.0a via x.js.
 * This module lets any SOCIII user connect their own X account so
 * Alex can post from it. Tokens stored at users/{uid}/integrations/twitter.
 *
 * Requires env:
 *   X_OAUTH2_CLIENT_ID     — from Twitter Developer Portal → App → Keys & Tokens → OAuth 2.0
 *   X_OAUTH2_CLIENT_SECRET — same; needed for confidential-client token refresh
 *   (optional) TWITTER_REDIRECT_URI — defaults to https://sociii.ai/auth/twitter-callback
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const TWITTER_REVOKE_URL = "https://api.twitter.com/2/oauth2/revoke";
const TWITTER_ME_URL = "https://api.twitter.com/2/users/me";
const SCOPES = "tweet.read tweet.write users.read offline.access";

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
  let d = decipher.update(encrypted, "hex", "utf8");
  d += decipher.final("utf8");
  return d;
}

function getRedirectUri() {
  return process.env.TWITTER_REDIRECT_URI || "https://sociii.ai/auth/twitter-callback";
}

function getClientId() {
  const id = process.env.X_OAUTH2_CLIENT_ID;
  if (!id) throw new Error("X_OAUTH2_CLIENT_ID not configured");
  return id;
}

function getClientSecret() {
  return process.env.X_OAUTH2_CLIENT_SECRET || null;
}

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

async function handleXAuthUrl(req, res, { userId }) {
  let clientId;
  try { clientId = getClientId(); } catch (e) {
    return res.status(500).json({ ok: false, error: "X OAuth 2.0 not configured — X_OAUTH2_CLIENT_ID missing" });
  }

  const { verifier, challenge } = generatePKCE();
  const state = `${userId}|twitter`;

  await getDb().collection("users").doc(userId)
    .collection("integrations").doc("twitter-pkce")
    .set({ verifier, createdAt: admin.firestore.FieldValue.serverTimestamp() });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return res.json({ ok: true, authUrl: `${TWITTER_AUTH_URL}?${params.toString()}` });
}

async function handleXExchangeCode(req, res, { userId }) {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: "code required" });

  let clientId;
  try { clientId = getClientId(); } catch (e) {
    return res.status(500).json({ ok: false, error: "X OAuth 2.0 not configured" });
  }
  const clientSecret = getClientSecret();

  const pkceSnap = await getDb().collection("users").doc(userId)
    .collection("integrations").doc("twitter-pkce").get();
  const verifier = pkceSnap.exists ? pkceSnap.data().verifier : null;
  if (!verifier) return res.status(400).json({ ok: false, error: "PKCE session expired — please try connecting again" });

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    code_verifier: verifier,
  });

  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  if (clientSecret) {
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers["Authorization"] = `Basic ${creds}`;
  }

  const tokenRes = await fetch(TWITTER_TOKEN_URL, { method: "POST", headers, body: body.toString() });
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    return res.status(400).json({ ok: false, error: tokenData.error_description || tokenData.error || "Token exchange failed" });
  }

  const { access_token, refresh_token, expires_in } = tokenData;

  let handle = null, name = null, xId = null;
  try {
    const meRes = await fetch(`${TWITTER_ME_URL}?user.fields=name,username`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const meData = await meRes.json();
    handle = meData?.data?.username ? `@${meData.data.username}` : null;
    name = meData?.data?.name || null;
    xId = meData?.data?.id || null;
  } catch { /* non-fatal */ }

  const encryptedAccessToken = encrypt(access_token);
  const encryptedRefreshToken = refresh_token ? encrypt(refresh_token) : null;

  const db = getDb();
  await db.collection("users").doc(userId).collection("integrations").doc("twitter").set({
    connected: true,
    handle,
    name,
    xId,
    encryptedAccessToken,
    ...(encryptedRefreshToken ? { encryptedRefreshToken } : {}),
    expiresIn: expires_in || null,
    connectedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection("users").doc(userId).collection("integrations").doc("twitter-pkce")
    .delete().catch(() => {});

  return res.json({ ok: true, handle, name });
}

async function handleXStatus(req, res, { userId }) {
  const snap = await getDb().collection("users").doc(userId)
    .collection("integrations").doc("twitter").get();
  if (!snap.exists || !snap.data().connected) {
    return res.json({ ok: true, connected: false });
  }
  const data = snap.data();
  return res.json({
    ok: true,
    connected: true,
    handle: data.handle || null,
    name: data.name || null,
    connectedAt: data.connectedAt || null,
  });
}

async function handleXDisconnect(req, res, { userId }) {
  const snap = await getDb().collection("users").doc(userId)
    .collection("integrations").doc("twitter").get();
  if (snap.exists && snap.data().encryptedAccessToken) {
    try {
      const token = decrypt(snap.data().encryptedAccessToken);
      const clientId = getClientId();
      const clientSecret = getClientSecret();
      const body = new URLSearchParams({ token, token_type_hint: "access_token", client_id: clientId });
      const headers = { "Content-Type": "application/x-www-form-urlencoded" };
      if (clientSecret) {
        headers["Authorization"] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
      }
      await fetch(TWITTER_REVOKE_URL, { method: "POST", headers, body: body.toString() });
    } catch { /* best-effort revoke */ }
  }
  await getDb().collection("users").doc(userId).collection("integrations").doc("twitter")
    .set({ connected: false, disconnectedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return res.json({ ok: true });
}

/**
 * Get a valid access token for a user (no auto-refresh yet).
 * @param {string} userId
 */
async function getXAccessToken(userId) {
  const snap = await getDb().collection("users").doc(userId)
    .collection("integrations").doc("twitter").get();
  if (!snap.exists || !snap.data().connected) throw new Error("X account not connected");
  return decrypt(snap.data().encryptedAccessToken);
}

/**
 * Post a tweet from the connected user's X account.
 * @param {string} userId
 * @param {object} opts - { text, mediaUrl? }
 */
async function postTweetAsUser(userId, { text, mediaUrl } = {}) {
  if (!text) throw new Error("Tweet text is required");
  const accessToken = await getXAccessToken(userId);

  const { TwitterApi } = require("twitter-api-v2");
  const client = new TwitterApi(accessToken);

  let media;
  if (mediaUrl) {
    try {
      const resp = await fetch(mediaUrl);
      if (resp.ok) {
        const buffer = Buffer.from(await resp.arrayBuffer());
        const ext = String(mediaUrl).toLowerCase().split("?")[0].split(".").pop();
        const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
        const mediaId = await client.v1.uploadMedia(buffer, { mimeType: mime, target: "tweet" });
        media = { media_ids: [mediaId] };
      }
    } catch { /* skip media if it fails */ }
  }

  const tweet = await client.v2.tweet(media ? { text, media } : { text });
  const tweetId = tweet?.data?.id;
  return {
    ok: true,
    tweetId: tweetId || null,
    url: tweetId ? `https://x.com/i/status/${tweetId}` : null,
    text,
  };
}

module.exports = {
  handleXAuthUrl,
  handleXExchangeCode,
  handleXStatus,
  handleXDisconnect,
  getXAccessToken,
  postTweetAsUser,
};
