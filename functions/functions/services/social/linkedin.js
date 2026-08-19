"use strict";

/**
 * linkedin.js — LinkedIn OAuth 2.0 + post publish (member-authored posts).
 *
 * Mirrors the tiktok.js / xUserAuth.js pattern: per-user OAuth, encrypted
 * token storage at users/{uid}/integrations/linkedin.
 *
 * Requires env:
 *   LINKEDIN_CLIENT_ID
 *   LINKEDIN_CLIENT_SECRET
 *   (optional) LINKEDIN_REDIRECT_URI — defaults to https://sociii.ai/auth/linkedin-callback
 *
 * Scope reality check (as of this writing):
 *   - "openid profile email w_member_social" — self-serve, approved instantly
 *     via LinkedIn's "Sign In with LinkedIn using OpenID Connect" + "Share on
 *     LinkedIn" products. This lets a user post to THEIR OWN profile feed.
 *   - Posting to a Company Page (what Settings.jsx currently promises —
 *     "Publish posts and articles to your company page") needs the
 *     Community Management API, which LinkedIn gates behind a partnership
 *     application — not instant, may be denied. postToLinkedIn() below
 *     posts as the authenticated member; company-page posting (a different
 *     author URN + w_organization_social scope) is NOT implemented until
 *     that access is confirmed.
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const LINKEDIN_POSTS_URL = "https://api.linkedin.com/v2/ugcPosts";
const SCOPES = "openid profile email w_member_social";

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
  return process.env.LINKEDIN_REDIRECT_URI || "https://sociii.ai/auth/linkedin-callback";
}

function getClientId() {
  const id = process.env.LINKEDIN_CLIENT_ID;
  if (!id) throw new Error("LINKEDIN_CLIENT_ID not configured");
  return id;
}

function getClientSecret() {
  const secret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!secret) throw new Error("LINKEDIN_CLIENT_SECRET not configured");
  return secret;
}

async function handleLinkedInAuthUrl(req, res, { userId }) {
  let clientId;
  try { clientId = getClientId(); } catch {
    return res.status(500).json({ ok: false, error: "LinkedIn not configured — LINKEDIN_CLIENT_ID missing" });
  }

  const state = `${userId}|linkedin|${crypto.randomBytes(8).toString("hex")}`;
  await getDb().collection("users").doc(userId)
    .collection("integrations").doc("linkedin-state")
    .set({ state, createdAt: admin.firestore.FieldValue.serverTimestamp() });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    state,
  });

  return res.json({ ok: true, authUrl: `${LINKEDIN_AUTH_URL}?${params.toString()}` });
}

async function handleLinkedInExchangeCode(req, res, { userId }) {
  const { code, state } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: "code required" });

  let clientId, clientSecret;
  try {
    clientId = getClientId();
    clientSecret = getClientSecret();
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }

  const stateSnap = await getDb().collection("users").doc(userId)
    .collection("integrations").doc("linkedin-state").get();
  const expectedState = stateSnap.exists ? stateSnap.data().state : null;
  if (!expectedState || (state && state !== expectedState)) {
    return res.status(400).json({ ok: false, error: "OAuth state mismatch or session expired — please try connecting again" });
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    return res.status(400).json({ ok: false, error: tokenData.error_description || tokenData.error || "Token exchange failed" });
  }

  const { access_token, expires_in } = tokenData;

  let name = null, email = null, sub = null;
  try {
    const meRes = await fetch(LINKEDIN_USERINFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const meData = await meRes.json();
    name = meData?.name || null;
    email = meData?.email || null;
    sub = meData?.sub || null; // LinkedIn member URN id
  } catch { /* non-fatal */ }

  const encryptedAccessToken = encrypt(access_token);

  const db = getDb();
  await db.collection("users").doc(userId).collection("integrations").doc("linkedin").set({
    connected: true,
    name,
    email,
    memberId: sub,
    encryptedAccessToken,
    expiresIn: expires_in || null,
    connectedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection("users").doc(userId).collection("integrations").doc("linkedin-state")
    .delete().catch(() => {});

  return res.json({ ok: true, name, email });
}

async function handleLinkedInStatus(req, res, { userId }) {
  const snap = await getDb().collection("users").doc(userId)
    .collection("integrations").doc("linkedin").get();
  if (!snap.exists || !snap.data().connected) {
    return res.json({ ok: true, connected: false });
  }
  const data = snap.data();
  return res.json({
    ok: true,
    connected: true,
    name: data.name || null,
    email: data.email || null,
    connectedAt: data.connectedAt || null,
  });
}

async function handleLinkedInDisconnect(req, res, { userId }) {
  await getDb().collection("users").doc(userId).collection("integrations").doc("linkedin")
    .set({ connected: false, disconnectedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return res.json({ ok: true });
}

/**
 * @private
 */
async function _getConnection(userId) {
  const snap = await getDb().collection("users").doc(userId)
    .collection("integrations").doc("linkedin").get();
  if (!snap.exists || !snap.data().connected) throw new Error("LinkedIn account not connected");
  const data = snap.data();
  return { accessToken: decrypt(data.encryptedAccessToken), memberId: data.memberId };
}

/**
 * Post a text update to the connected member's own LinkedIn feed.
 * Company-Page posting is not implemented — see file header.
 * @param {string} userId
 * @param {object} opts - { text, visibility? } visibility: "PUBLIC" | "CONNECTIONS"
 */
async function postToLinkedIn(userId, { text, visibility = "PUBLIC" } = {}) {
  if (!text) throw new Error("postToLinkedIn: text is required");
  const { accessToken, memberId } = await _getConnection(userId);
  if (!memberId) throw new Error("LinkedIn member id missing — reconnect the account");

  const body = {
    author: `urn:li:person:${memberId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": visibility },
  };

  const res = await fetch(LINKEDIN_POSTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`LinkedIn publish failed: HTTP ${res.status} ${errText.slice(0, 200)}`);
  }

  const postId = res.headers.get("x-restli-id") || null;
  return { ok: true, postId, url: postId ? `https://www.linkedin.com/feed/update/${postId}/` : null };
}

module.exports = {
  handleLinkedInAuthUrl,
  handleLinkedInExchangeCode,
  handleLinkedInStatus,
  handleLinkedInDisconnect,
  postToLinkedIn,
};
