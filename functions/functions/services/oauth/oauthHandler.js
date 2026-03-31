"use strict";

/**
 * Universal OAuth Handler — one flow for all platforms.
 *
 * getAuthorizationUrl() — generates auth URL + stores state token
 * handleCallback() — exchanges code for token, stores in Firestore
 * getToken() — returns valid token, auto-refreshes if expired
 * disconnectPlatform() — removes stored token
 * getConnectionStatus() — returns connection status for a subscriber + platform
 */

const { OAUTH_PLATFORMS } = require("./oauthConfig");
const crypto = require("crypto");
const https = require("https");
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

/**
 * POST form data to a token endpoint using Node https.
 */
function postTokenExchange(url, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Token exchange failed: ${data.substring(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Generate the authorization URL for a platform.
 * Stores a state token in Firestore for CSRF verification.
 * @param {string} platformId — key in OAUTH_PLATFORMS
 * @param {string} subscriberId — Firebase UID
 * @returns {Promise<string>} — full authorization URL
 */
async function getAuthorizationUrl(platformId, subscriberId) {
  const platform = OAUTH_PLATFORMS[platformId];
  if (!platform) throw new Error(`Unknown platform: ${platformId}`);

  const state = crypto.randomBytes(16).toString("hex");
  const db = getDb();

  // Store state for verification on callback
  await db.collection("oauthStates").doc(state).set({
    platformId,
    subscriberId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const clientId = process.env[platform.clientIdEnv];
  if (!clientId) throw new Error(`Missing env var: ${platform.clientIdEnv}`);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: platform.redirectUri,
    response_type: "code",
    state,
  });

  // Only add scope if scopes are defined
  if (platform.scopes.length > 0) {
    params.set("scope", platform.scopes.join(" "));
  }

  return `${platform.authUrl}?${params.toString()}`;
}

/**
 * Handle the OAuth callback — exchange code for token and store.
 * @param {string} platformId
 * @param {string} code — authorization code from platform
 * @param {string} state — CSRF state token
 * @returns {Promise<{ success: boolean, platformId: string, subscriberId: string }>}
 */
async function handleCallback(platformId, code, state) {
  const platform = OAUTH_PLATFORMS[platformId];
  if (!platform) throw new Error(`Unknown platform: ${platformId}`);

  const db = getDb();

  // Verify state token
  const stateDoc = await db.collection("oauthStates").doc(state).get();
  if (!stateDoc.exists) {
    throw new Error("Invalid or expired OAuth state");
  }
  const stateData = stateDoc.data();
  if (stateData.platformId !== platformId) {
    throw new Error("OAuth state mismatch");
  }
  if (stateData.expiresAt && Date.now() > stateData.expiresAt) {
    await db.collection("oauthStates").doc(state).delete();
    throw new Error("OAuth state expired");
  }

  const { subscriberId } = stateData;
  await db.collection("oauthStates").doc(state).delete();

  // Exchange code for token
  const clientId = process.env[platform.clientIdEnv];
  const clientSecret = process.env[platform.clientSecretEnv];
  if (!clientId || !clientSecret) {
    throw new Error(`Missing OAuth credentials for ${platformId}`);
  }

  const tokenData = await postTokenExchange(platform.tokenUrl, {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: platform.redirectUri,
    grant_type: "authorization_code",
  });

  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token || null;
  const expiresIn = tokenData.expires_in;

  if (!accessToken) {
    throw new Error(`Token exchange failed: ${JSON.stringify(tokenData).substring(0, 200)}`);
  }

  // Store token against subscriber
  await db.collection("subscribers").doc(subscriberId)
    .collection("oauthTokens").doc(platformId).set({
      platformId,
      accessToken,
      refreshToken,
      expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      connectorId: platform.connectorId,
      status: "connected",
    });

  console.log(`[oauth] ${platformId} connected for subscriber ${subscriberId}`);
  return { success: true, platformId, subscriberId };
}

/**
 * Get a valid access token for a subscriber + platform.
 * Auto-refreshes if the token is expired or near-expiry.
 * @param {string} platformId
 * @param {string} subscriberId
 * @returns {Promise<string|null>}
 */
async function getToken(platformId, subscriberId) {
  const db = getDb();
  const tokenDoc = await db.collection("subscribers").doc(subscriberId)
    .collection("oauthTokens").doc(platformId).get();

  if (!tokenDoc.exists) return null;
  const token = tokenDoc.data();
  if (token.status !== "connected") return null;

  // Check expiry — refresh if within 60 seconds of expiring
  if (token.expiresAt && Date.now() > token.expiresAt - 60000) {
    if (!token.refreshToken) return null; // can't refresh
    return await refreshToken(platformId, subscriberId, token.refreshToken);
  }

  return token.accessToken;
}

/**
 * Refresh an expired token.
 */
async function refreshToken(platformId, subscriberId, refreshTokenValue) {
  const platform = OAUTH_PLATFORMS[platformId];
  if (!platform) return null;

  const clientId = process.env[platform.clientIdEnv];
  const clientSecret = process.env[platform.clientSecretEnv];

  try {
    const tokenData = await postTokenExchange(platform.tokenUrl, {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshTokenValue,
      grant_type: "refresh_token",
    });

    const accessToken = tokenData.access_token;
    const newRefresh = tokenData.refresh_token || refreshTokenValue;
    const expiresIn = tokenData.expires_in;

    if (!accessToken) return null;

    const db = getDb();
    await db.collection("subscribers").doc(subscriberId)
      .collection("oauthTokens").doc(platformId).update({
        accessToken,
        refreshToken: newRefresh,
        expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
      });

    console.log(`[oauth] ${platformId} token refreshed for subscriber ${subscriberId}`);
    return accessToken;
  } catch (err) {
    console.error(`[oauth] Token refresh failed for ${platformId}:`, err.message);
    return null;
  }
}

/**
 * Disconnect a platform — removes stored token.
 */
async function disconnectPlatform(platformId, subscriberId) {
  const db = getDb();
  await db.collection("subscribers").doc(subscriberId)
    .collection("oauthTokens").doc(platformId).delete();
  console.log(`[oauth] ${platformId} disconnected for subscriber ${subscriberId}`);
  return { success: true, platformId, connected: false };
}

/**
 * Get connection status for a subscriber + platform.
 */
async function getConnectionStatus(platformId, subscriberId) {
  const db = getDb();
  const tokenDoc = await db.collection("subscribers").doc(subscriberId)
    .collection("oauthTokens").doc(platformId).get();

  if (!tokenDoc.exists) {
    return { connected: false, platformId };
  }

  const data = tokenDoc.data();
  return {
    connected: data.status === "connected",
    platformId,
    connectedAt: data.connectedAt,
    connectorId: data.connectorId,
  };
}

module.exports = {
  getAuthorizationUrl,
  handleCallback,
  getToken,
  disconnectPlatform,
  getConnectionStatus,
};
