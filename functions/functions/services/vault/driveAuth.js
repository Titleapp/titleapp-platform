"use strict";

/**
 * driveAuth.js — Google Drive OAuth lifecycle
 *
 * Handles OAuth consent URL generation, code exchange, token encryption,
 * automatic refresh, disconnect, and status check.
 *
 * Tokens are encrypted with AES-256-GCM before storage. Never logged or exposed.
 *
 * TENANT SCOPING (fixed 2026-08-22): tokens are now stored at
 * users/{uid}/workspaces/{tenantId}/integrations/googleDrive — previously
 * users/{uid}/integrations/googleDrive, keyed by uid only, which meant every
 * workspace a user could access shared the SAME connected Drive account.
 * getAuthenticatedDriveClient(userId, tenantId) — tenantId is now the
 * preferred second argument. Callers that still omit it fall back to reading
 * ONLY the legacy uid-only doc (unchanged historical behavior, no migration
 * attempted) so any not-yet-updated caller keeps working exactly as before —
 * see services/_shared/tenantIntegrationMigration.js for the migration
 * behavior used by tenant-aware callers.
 *
 * Exports: handleDriveAuthUrl, handleDriveExchangeCode, handleDriveDisconnect,
 *          handleDriveStatus, getAuthenticatedDriveClient
 */

const crypto = require("crypto");
const admin = require("firebase-admin");
const { resolveTenantIntegrationDoc } = require("../_shared/tenantIntegrationMigration");

function getDb() { return admin.firestore(); }

// Lazy-load googleapis
let _google;
function getGoogle() {
  if (!_google) _google = require("googleapis").google;
  return _google;
}

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "email",
];

// Scopes required to write files — subset of SCOPES above
const WRITE_SCOPES = ["https://www.googleapis.com/auth/drive.file"];

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
//  TENANT-SCOPED DOC REFS
// ═══════════════════════════════════════════════════════════════

function newDriveRef(uid, tenantId) {
  return getDb().doc(`users/${uid}/workspaces/${tenantId}/integrations/googleDrive`);
}
function legacyDriveRef(uid) {
  return getDb().collection("users").doc(uid).collection("integrations").doc("googleDrive");
}
const isDriveConnected = (d) => !!(d && d.connected);

/**
 * Resolve the Drive integration doc for a (uid, tenantId) pair, migrating a
 * legacy uid-only connection forward on first use if one exists and hasn't
 * already been claimed by a different tenant. See
 * services/_shared/tenantIntegrationMigration.js for full semantics.
 */
async function resolveDriveDoc(uid, tenantId) {
  return resolveTenantIntegrationDoc({
    newRef: newDriveRef(uid, tenantId),
    legacyRef: legacyDriveRef(uid),
    isConnected: isDriveConnected,
    tenantId,
  });
}

/**
 * Lightweight, read-only status check used to decide whether to even offer
 * Drive-backed chat tools (search_drive / read_drive_file) for this tenant.
 * Tenant-aware with the same one-time legacy-migration fallback as
 * getAuthenticatedDriveClient, but does not construct an OAuth client or
 * touch lastUsedAt — safe to call on every chat turn.
 */
async function isDriveConnectedForTenant(uid, tenantId) {
  if (!tenantId) return false;
  try {
    const { snap } = await resolveDriveDoc(uid, tenantId);
    return snap.exists && isDriveConnected(snap.data());
  } catch (_) {
    return false;
  }
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
async function handleDriveExchangeCode(req, res, { userId, tenantId }) {
  if (!tenantId) return res.status(400).json({ ok: false, error: "tenantId required (x-tenant-id header)" });
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
  let email = "connected";
  try {
    const google = getGoogle();
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    email = userInfo.data.email || "connected";
  } catch (_) {
    // Non-fatal — email is display-only
  }

  // Encrypt refresh token
  const encryptedRefreshToken = encrypt(tokens.refresh_token);

  // Store in Firestore (tenant-scoped)
  await newDriveRef(userId, tenantId).set({
    connected: true,
    email,
    encryptedRefreshToken,
    scopes: SCOPES,
    tokenInvalid: false,
    connectedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUsedAt: null,
  });

  return res.json({ ok: true, email });
}

/**
 * Disconnect Google Drive — revoke token and delete from Firestore.
 * Only touches this tenant's scoped doc; the legacy uid-only doc (if any
 * other, not-yet-tenant-aware code path still depends on it) is left alone.
 */
async function handleDriveDisconnect(req, res, { userId, tenantId }) {
  if (!tenantId) return res.status(400).json({ ok: false, error: "tenantId required (x-tenant-id header)" });
  const docRef = newDriveRef(userId, tenantId);
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
async function handleDriveStatus(req, res, { userId, tenantId }) {
  if (!tenantId) return res.json({ ok: true, connected: false });
  const { snap } = await resolveDriveDoc(userId, tenantId);

  if (!snap.exists) {
    return res.json({ ok: true, connected: false });
  }

  const data = snap.data();
  if (data.tokenInvalid) {
    return res.json({ ok: true, connected: false, tokenExpired: true, email: data.email || null });
  }
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
 * @param {string} [tenantId] — active workspace/tenant. Strongly preferred —
 *   scopes the lookup (with one-time legacy migration) to this tenant. If
 *   omitted, falls back to the legacy uid-only doc directly with no
 *   migration, preserving old behavior for any caller not yet updated to
 *   pass tenant context.
 * @returns {Promise<object>} — google.drive({ version: "v3" }) instance
 */
async function getAuthenticatedDriveClient(userId, tenantId) {
  const docRef = tenantId ? null : legacyDriveRef(userId);
  const snap = tenantId ? (await resolveDriveDoc(userId, tenantId)).snap : await docRef.get();
  const effectiveRef = tenantId ? newDriveRef(userId, tenantId) : docRef;

  if (!snap.exists || !snap.data().connected) {
    throw new Error("Google Drive not connected. Please connect in Settings → Integrations → Google Drive.");
  }

  const data = snap.data();
  if (data.tokenInvalid) {
    throw new Error("Google Drive token expired. Please reconnect in Settings → Integrations → Google Drive.");
  }
  if (!data.encryptedRefreshToken) {
    throw new Error("No stored Drive token. Please reconnect Google Drive in Settings.");
  }

  const refreshToken = decrypt(data.encryptedRefreshToken);
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // Save any newly-refreshed access tokens back to Firestore
  oauth2Client.on("tokens", (newTokens) => {
    if (newTokens.refresh_token) {
      try {
        const encryptedNew = encrypt(newTokens.refresh_token);
        effectiveRef.update({ encryptedRefreshToken: encryptedNew, tokenInvalid: false }).catch(() => {});
      } catch (_) {}
    }
  });

  // Update lastUsedAt and clear any previous invalid flag
  effectiveRef.update({ lastUsedAt: admin.firestore.FieldValue.serverTimestamp(), tokenInvalid: false })
    .catch(() => {});

  const google = getGoogle();
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  // Wrap only the specific methods we call — avoids Proxy breaking googleapis internals.
  function wrapDriveMethod(fn, ctx) {
    return async (...args) => {
      try {
        return await fn.apply(ctx, args);
      } catch (err) {
        const msg = err.message || "";
        if (msg.includes("invalid_grant") || msg.includes("Token has been expired or revoked") || msg.includes("invalid_rapt")) {
          effectiveRef.update({ tokenInvalid: true, connected: false }).catch(() => {});
          throw new Error("Google Drive token expired. Please go to Settings → Integrations → Google Drive and reconnect.");
        }
        throw err;
      }
    };
  }

  const files = drive.files;

  // Check if stored scopes include drive.file (write capability)
  const storedScopes = data.scopes || [];
  const canWrite = storedScopes.includes("https://www.googleapis.com/auth/drive.file");

  return {
    canWrite,
    files: {
      list:   wrapDriveMethod(files.list.bind(files),   files),
      get:    wrapDriveMethod(files.get.bind(files),    files),
      export: wrapDriveMethod(files.export.bind(files), files),
      create: canWrite ? wrapDriveMethod(files.create.bind(files), files) : null,
    },
  };
}

module.exports = {
  handleDriveAuthUrl,
  handleDriveExchangeCode,
  handleDriveDisconnect,
  handleDriveStatus,
  getAuthenticatedDriveClient,
  isDriveConnectedForTenant,
  WRITE_SCOPES,
};
