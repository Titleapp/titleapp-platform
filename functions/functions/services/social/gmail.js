"use strict";

/**
 * gmail.js — Gmail OAuth lifecycle + Gmail API operations.
 *
 * Same Google OAuth client (GOOGLE_OAUTH_*) and token encryption
 * (GDRIVE_ENCRYPTION_KEY) as YouTube/Drive/Calendar. Tokens stored at
 * users/{uid}/workspaces/{tenantId}/integrations/gmail — SCOPED BY BOTH
 * uid AND tenantId (fixed 2026-08-22; previously users/{uid}/integrations/gmail,
 * keyed by uid only, which meant every workspace a user could access shared
 * the SAME connected Gmail account. See services/_shared/tenantIntegrationMigration.js
 * for the one-time, per-tenant migration behavior off the old uid-only path).
 *
 * What this unlocks for workers:
 *  - syncContacts: pull sent-to/received-from addresses → enrich contacts
 *  - searchEmails: search threads for context (Marketing, IR, HR)
 *  - sendEmail: send through user's Gmail on behalf
 *  - listRecent: recent inbox/sent summary for chat context
 *
 * SCOPE NOTE: gmail.readonly + gmail.send are "restricted" Google scopes.
 * Until the OAuth app passes Google verification, only test users can connect.
 * For production rollout, submit for verification via Google Cloud Console.
 * contacts.readonly (People API) is "sensitive" — same verification path.
 */

const crypto = require("crypto");
const admin = require("firebase-admin");
const { resolveTenantIntegrationDoc, resolveTenantIntegrationCollection } = require("../_shared/tenantIntegrationMigration");

function getDb() { return admin.firestore(); }

let _google;
function getGoogle() {
  if (!_google) _google = require("googleapis").google;
  return _google;
}

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/contacts.readonly",
];

// ═══════════════════════════════════════════════════════════════
//  TOKEN ENCRYPTION — AES-256-GCM (shared key with Drive/Calendar/YouTube)
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
  let enc = cipher.update(plaintext, "utf8", "hex");
  enc += cipher.final("hex");
  return iv.toString("hex") + ":" + enc + ":" + cipher.getAuthTag().toString("hex");
}

function decrypt(ciphertext) {
  const [ivHex, enc, tagHex] = ciphertext.split(":");
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  let dec = decipher.update(enc, "hex", "utf8");
  dec += decipher.final("utf8");
  return dec;
}

// ═══════════════════════════════════════════════════════════════
//  OAUTH CLIENT
// ═══════════════════════════════════════════════════════════════

function buildOAuthClient() {
  const google = getGoogle();
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_GMAIL_REDIRECT_URI || "https://sociii.ai/auth/gmail-callback"
  );
}

// ═══════════════════════════════════════════════════════════════
//  TOKEN STORAGE — tenant-scoped, with fallback migration off the
//  old uid-only path (see services/_shared/tenantIntegrationMigration.js)
// ═══════════════════════════════════════════════════════════════

function requireTenantId(tenantId) {
  if (!tenantId) throw new Error("Gmail operations require a tenantId (workspace context)");
  return tenantId;
}

function primaryRef(uid, tenantId) {
  return getDb().doc(`users/${uid}/workspaces/${tenantId}/integrations/gmail`);
}
function legacyPrimaryRef(uid) {
  return getDb().doc(`users/${uid}/integrations/gmail`);
}
function extraAccountsColl(uid, tenantId) {
  return getDb().collection(`users/${uid}/workspaces/${tenantId}/gmailAccounts`);
}
function legacyExtraAccountsColl(uid) {
  return getDb().collection(`users/${uid}/gmailAccounts`);
}

const isGmailConnected = (d) => !!(d && d.accessToken);

async function storeTokens(uid, tenantId, tokens) {
  requireTenantId(tenantId);
  const data = {
    accessToken: encrypt(tokens.access_token),
    refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    expiryDate: tokens.expiry_date || null,
    scope: tokens.scope || SCOPES.join(" "),
    connectedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await primaryRef(uid, tenantId).set(data, { merge: true });
}

async function loadTokens(uid, tenantId) {
  requireTenantId(tenantId);
  const { snap } = await resolveTenantIntegrationDoc({
    newRef: primaryRef(uid, tenantId),
    legacyRef: legacyPrimaryRef(uid),
    isConnected: isGmailConnected,
    tenantId,
  });
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data.accessToken) return null;
  return {
    access_token: decrypt(data.accessToken),
    refresh_token: data.refreshToken ? decrypt(data.refreshToken) : null,
    expiry_date: data.expiryDate || null,
    scope: data.scope || "",
  };
}

async function buildAuthedClient(uid, tenantId) {
  requireTenantId(tenantId);
  const tokens = await loadTokens(uid, tenantId);
  if (!tokens) throw new Error("Gmail not connected — call /v1/gmail:authUrl first");
  const auth = buildOAuthClient();
  auth.setCredentials(tokens);
  // Auto-refresh and persist
  auth.on("tokens", async (newTokens) => {
    await storeTokens(uid, tenantId, { ...tokens, ...newTokens });
  });
  return auth;
}

// ═══════════════════════════════════════════════════════════════
//  HANDLERS (called from index.js routes)
// ═══════════════════════════════════════════════════════════════

async function handleGmailAuthUrl(req, res, { userId }) {
  const auth = buildOAuthClient();
  const url = auth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: userId,
  });
  return res.json({ ok: true, authUrl: url });
}

async function handleGmailExchangeCode(req, res, { userId, tenantId }) {
  if (!tenantId) return res.status(400).json({ ok: false, error: "tenantId required (x-tenant-id header)" });
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: "code required" });
  const auth = buildOAuthClient();
  const { tokens } = await auth.getToken(code);
  await storeTokens(userId, tenantId, tokens);

  // Immediately pull connected account email for display
  auth.setCredentials(tokens);
  const google = getGoogle();
  const gmail = google.gmail({ version: "v1", auth });
  let email = null;
  try {
    const profile = await gmail.users.getProfile({ userId: "me" });
    email = profile.data.emailAddress;
    await primaryRef(userId, tenantId).update({ email });
  } catch (_) {}

  return res.json({ ok: true, email });
}

async function handleGmailStatus(req, res, { userId, tenantId }) {
  if (!tenantId) return res.json({ ok: true, connected: false });
  const { snap } = await resolveTenantIntegrationDoc({
    newRef: primaryRef(userId, tenantId),
    legacyRef: legacyPrimaryRef(userId),
    isConnected: isGmailConnected,
    tenantId,
  });
  if (!snap.exists || !snap.data().accessToken) {
    return res.json({ ok: true, connected: false });
  }
  const data = snap.data();
  return res.json({ ok: true, connected: true, email: data.email || null, connectedAt: data.connectedAt || null });
}

async function handleGmailDisconnect(req, res, { userId, tenantId }) {
  if (!tenantId) return res.status(400).json({ ok: false, error: "tenantId required (x-tenant-id header)" });
  await primaryRef(userId, tenantId).delete();
  return res.json({ ok: true, disconnected: true });
}

// ═══════════════════════════════════════════════════════════════
//  GMAIL OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * syncContacts — pull unique email addresses from sent mail + received-from,
 * upsert into contacts collection for the user's active tenant.
 * Returns { added, updated, total }.
 */
async function syncContacts(uid, tenantId, opts = {}) {
  requireTenantId(tenantId);
  const { maxMessages = 500 } = opts;
  const auth = await buildAuthedClient(uid, tenantId);
  const google = getGoogle();
  const gmail = google.gmail({ version: "v1", auth });
  const people = google.people({ version: "v1", auth });
  const db = getDb();

  const seen = new Set();
  const contacts = [];

  // Pull from Google People API first (most complete)
  try {
    let pageToken;
    do {
      const r = await people.people.connections.list({
        resourceName: "people/me",
        personFields: "names,emailAddresses,organizations,phoneNumbers",
        pageSize: 1000,
        pageToken,
      });
      for (const person of r.data.connections || []) {
        const email = person.emailAddresses?.[0]?.value?.toLowerCase();
        if (!email || seen.has(email)) continue;
        seen.add(email);
        const name = person.names?.[0]?.displayName || null;
        contacts.push({
          email,
          name,
          first_name: person.names?.[0]?.givenName || null,
          last_name: person.names?.[0]?.familyName || null,
          company: person.organizations?.[0]?.name || null,
          title: person.organizations?.[0]?.title || null,
          phone: person.phoneNumbers?.[0]?.value || null,
          source: "gmail-contacts",
        });
      }
      pageToken = r.data.nextPageToken;
    } while (pageToken && contacts.length < 2000);
  } catch (e) {
    console.warn("[gmail:syncContacts] People API failed:", e.message);
  }

  // Supplement with sent-mail addresses
  try {
    const sentSnap = await gmail.users.messages.list({
      userId: "me",
      labelIds: ["SENT"],
      maxResults: maxMessages,
    });
    for (const msg of sentSnap.data.messages || []) {
      const full = await gmail.users.messages.get({ userId: "me", id: msg.id, format: "metadata", metadataHeaders: ["To", "Cc"] });
      const headers = full.data.payload?.headers || [];
      for (const h of headers) {
        if (!["To", "Cc"].includes(h.name)) continue;
        const addresses = (h.value || "").split(",");
        for (const addr of addresses) {
          const m = addr.match(/<([^>]+)>/) || addr.match(/([^\s@,]+@[^\s@,]+)/);
          if (!m) continue;
          const email = m[1].toLowerCase().trim();
          if (!email || seen.has(email)) continue;
          seen.add(email);
          const nameMatch = addr.match(/^"?([^"<]+)"?\s*</);
          contacts.push({ email, name: nameMatch ? nameMatch[1].trim() : null, source: "gmail-sent" });
        }
      }
    }
  } catch (e) {
    console.warn("[gmail:syncContacts] Sent scan failed:", e.message);
  }

  // Upsert to Firestore contacts collection
  let added = 0, updated = 0;
  const batch = db.batch();
  let batchCount = 0;

  for (const c of contacts) {
    const existing = await db.collection("contacts")
      .where("tenantId", "==", tenantId)
      .where("email", "==", c.email)
      .limit(1)
      .get();

    if (existing.empty) {
      const ref = db.collection("contacts").doc();
      batch.set(ref, {
        tenantId,
        email: c.email,
        name: c.name,
        first_name: c.first_name || null,
        last_name: c.last_name || null,
        company: c.company || null,
        title: c.title || null,
        phone: c.phone || null,
        source: c.source,
        schema_version: "spine_v2.1",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      added++;
    } else if (c.name || c.company || c.title) {
      const ref = existing.docs[0].ref;
      const patch = {};
      if (c.name && !existing.docs[0].data().name) patch.name = c.name;
      if (c.company && !existing.docs[0].data().company) patch.company = c.company;
      if (c.title && !existing.docs[0].data().title) patch.title = c.title;
      if (Object.keys(patch).length) { batch.update(ref, patch); updated++; }
    }

    batchCount++;
    if (batchCount >= 400) {
      await batch.commit();
      batchCount = 0;
    }
  }
  if (batchCount > 0) await batch.commit();

  return { added, updated, total: contacts.length };
}

/**
 * searchEmails — keyword search over the user's inbox.
 * Returns [{subject, from, snippet, date, messageId}] trimmed to maxResults.
 */
async function searchEmails(uid, tenantId, query, opts = {}) {
  const { maxResults = 10 } = opts;
  const auth = await buildAuthedClient(uid, tenantId);
  const google = getGoogle();
  const gmail = google.gmail({ version: "v1", auth });

  const snap = await gmail.users.messages.list({ userId: "me", q: query, maxResults });
  const messages = [];
  for (const msg of snap.data.messages || []) {
    const full = await gmail.users.messages.get({ userId: "me", id: msg.id, format: "metadata", metadataHeaders: ["Subject", "From", "Date"] });
    const headers = Object.fromEntries((full.data.payload?.headers || []).map(h => [h.name, h.value]));
    messages.push({
      messageId: msg.id,
      subject: headers.Subject || "(no subject)",
      from: headers.From || "",
      date: headers.Date || "",
      snippet: full.data.snippet || "",
    });
  }
  return messages;
}

/**
 * sendEmail — send via Gmail as the connected user.
 * attachments: [{ url, filename, mimeType? }] — fetched server-side and attached as base64 MIME parts.
 * fromEmail — optional; if provided, routes to the matching extra account (or primary if it matches).
 *
 * Fall-back chain: primary slot → extra account matching fromEmail → first available extra account.
 * This handles the case where a user removes+re-adds their account via "+ Add account" (which goes
 * to the extra-accounts subcollection, leaving the primary slot empty).
 */
async function sendEmail(uid, tenantId, { to, subject, body, htmlBody, cc, replyTo, attachments, fromEmail, threadId, inReplyTo, references }) {
  requireTenantId(tenantId);
  // Red-team round 2, point #1: gate every persona send here, in the one
  // function every send path (auto-send, the approval-flow send) actually
  // goes through — not duplicated at each call site, and not limited to
  // whichever call site someone remembers to add it to. A non-persona
  // fromEmail (a human's own connected Gmail) is unaffected.
  let personaSlug = null;
  if (fromEmail) {
    const { getWorkerSlugForEmail } = require("../../config/personaEmailIdentities");
    personaSlug = getWorkerSlugForEmail(fromEmail);
    if (personaSlug) {
      await require("../../config/capabilityGates").assertGatesPass("persona-email-inbound-listener");
      // Safeguard #1 (CODEX 97): per-persona rate limiter / circuit breaker.
      // Throws (fails closed) if suspended or over its day/hour cap — before
      // any Gmail API call is made, not after.
      const { assertWithinLimit } = require("../communications/personaSendRateLimiter");
      await assertWithinLimit(personaSlug);
    }
  }
  let auth;
  try {
    auth = await buildAuthedClient(uid, tenantId);
  } catch (primaryErr) {
    // Primary slot missing or failed — try extra accounts (tenant-scoped)
    const extras = await resolveTenantIntegrationCollection({
      newColl: extraAccountsColl(uid, tenantId),
      legacyColl: legacyExtraAccountsColl(uid),
      isConnected: isGmailConnected,
      tenantId,
    });
    if (extras.empty) throw primaryErr;
    let targetDoc = null;
    if (fromEmail) {
      const aId = accountId(fromEmail);
      targetDoc = extras.docs.find(d => d.id === aId) || null;
    }
    if (!targetDoc) {
      // Prefer sean@sociii.ai if present, otherwise first available
      targetDoc = extras.docs.find(d => (d.data().email || "").includes("sociii.ai")) || extras.docs[0];
    }
    if (!targetDoc || !targetDoc.data().accessToken) throw primaryErr;
    auth = await buildAuthedClientForAccount(uid, tenantId, targetDoc.id);
  }
  const google = getGoogle();
  const gmail = google.gmail({ version: "v1", auth });

  const toLine = Array.isArray(to) ? to.join(", ") : to;
  const ccLine = cc ? (Array.isArray(cc) ? cc.join(", ") : cc) : null;

  // RFC 2047 encode the subject when it contains non-ASCII (em dashes, smart
  // quotes, etc.) — otherwise Gmail double-encodes UTF-8 bytes as Latin-1.
  const encodeSubject = (s) => {
    if (/[^\x00-\x7F]/.test(s)) {
      return `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`;
    }
    return s;
  };

  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  const boundary = `----=_Part_${Date.now()}`;

  // Safeguard #2 (CODEX 97): AI-disclosure footer, appended by CODE — not
  // left to the drafting model or moderation gate to decide to include.
  // Idempotent: skips if the exact marker is already present (e.g. a draft
  // that already included it), so it's never doubled.
  if (personaSlug) {
    const { buildDisclosureFooter, DISCLOSURE_MARKER } = require("../../config/personaEmailIdentities");
    const footer = buildDisclosureFooter(personaSlug);
    if (htmlBody && !htmlBody.includes(DISCLOSURE_MARKER)) {
      htmlBody = `${htmlBody}<br><br>—<br>${footer}`;
    }
    if (body && !body.includes(DISCLOSURE_MARKER)) {
      body = `${body}\n\n—\n${footer}`;
    }
    if (!htmlBody && !body) {
      body = `—\n${footer}`;
    }
  }

  let raw = `To: ${toLine}\r\n`;
  // fromEmail, when it matches a Workspace domain alias of the authenticated
  // account (e.g. ivy@sociii.ai is an alias of alex@sociii.ai), is a valid
  // From: address without any separate "send as" verification — Google
  // accepts sending on behalf of a domain alias by default. This does NOT
  // work for arbitrary external addresses; it only holds for alias domains
  // the authenticated mailbox actually owns.
  if (fromEmail) raw += `From: ${fromEmail}\r\n`;
  if (ccLine) raw += `Cc: ${ccLine}\r\n`;
  if (replyTo) raw += `Reply-To: ${replyTo}\r\n`;
  // Threading: Gmail groups by these headers (plus matching subject), not
  // just by the API's threadId param — both are needed for a reply to land
  // in the original thread instead of starting a new one.
  if (inReplyTo) raw += `In-Reply-To: ${inReplyTo}\r\n`;
  if (references) raw += `References: ${references}\r\n`;
  raw += `Subject: ${encodeSubject(subject)}\r\n`;
  raw += `MIME-Version: 1.0\r\n`;

  if (!hasAttachments) {
    if (htmlBody) {
      raw += `Content-Type: text/html; charset=utf-8\r\n\r\n${htmlBody}`;
    } else {
      raw += `Content-Type: text/plain; charset=utf-8\r\n\r\n${body || ""}`;
    }
  } else {
    raw += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    raw += `--${boundary}\r\n`;
    if (htmlBody) {
      raw += `Content-Type: text/html; charset=utf-8\r\n\r\n${htmlBody}\r\n`;
    } else {
      raw += `Content-Type: text/plain; charset=utf-8\r\n\r\n${body || ""}\r\n`;
    }
    for (const att of attachments) {
      try {
        let buf;
        if (att.buf) {
          // Pre-fetched buffer (campaign sends pre-cache once to avoid N downloads)
          buf = att.buf;
        } else if (att.url && att.url.startsWith("gs://")) {
          // Firebase Storage path — download directly via Admin SDK (no signed URL needed)
          const gsMatch = att.url.match(/^gs:\/\/([^/]+)\/(.+)$/);
          if (!gsMatch) { console.warn(`[gmail] invalid gs:// path: ${att.url}`); continue; }
          const [, bucket, filePath] = gsMatch;
          const [fileBuffer] = await admin.storage().bucket(bucket).file(filePath).download();
          buf = fileBuffer;
        } else if (att.url && att.url.startsWith("gdrive://")) {
          // Google Drive file — download via Drive API with user's OAuth token
          const fileId = att.url.replace("gdrive://", "");
          const { getAuthenticatedDriveClient } = require("../vault/driveAuth");
          const driveClient = await getAuthenticatedDriveClient(uid, tenantId);
          const driveResp = await driveClient.files.get(
            { fileId, alt: "media" },
            { responseType: "arraybuffer" }
          );
          buf = Buffer.from(driveResp.data);
        } else {
          const resp = await fetch(att.url);
          if (!resp.ok) { console.warn(`[gmail] attachment fetch failed for ${att.filename}: ${resp.status}`); continue; }
          buf = Buffer.from(await resp.arrayBuffer());
        }
        const mime = att.mimeType || "application/pdf";
        const name = att.filename || "attachment.pdf";
        raw += `--${boundary}\r\n`;
        raw += `Content-Type: ${mime}; name="${name}"\r\n`;
        raw += `Content-Disposition: attachment; filename="${name}"\r\n`;
        raw += `Content-Transfer-Encoding: base64\r\n\r\n`;
        raw += buf.toString("base64") + "\r\n";
      } catch (e) {
        console.warn(`[gmail] attachment error for ${att.filename}:`, e.message);
      }
    }
    raw += `--${boundary}--`;
  }

  const encoded = Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const requestBody = { raw: encoded };
  if (threadId) requestBody.threadId = threadId;
  const sent = await gmail.users.messages.send({ userId: "me", requestBody });
  return { ok: true, messageId: sent.data?.id || null, threadId: sent.data?.threadId || null };
}

/**
 * watchMailbox — starts Gmail push notifications for a connected account
 * (primary or extra) via Cloud Pub/Sub. Must be renewed before Google's
 * 7-day expiry (see services/communications/gmailWatchRenewal.js).
 *
 * Gated (2026-09-22, red-team finding): this is the ONE function both the
 * "official" startPersonaWatch route and the Cloud Scheduler renewal route
 * call — gating it here, not just at one call site, closes both paths at
 * once. Fails closed via assertGatesPass(); see config/capabilityGates.js.
 * Do not remove this call without wiring the underlying gates to something
 * real first — this exists specifically because that sequencing was
 * gotten wrong once already the same night this function was written.
 *
 * @param {string} topicName — full Pub/Sub topic resource name, e.g.
 *   "projects/title-app-alpha/topics/gmail-persona-email-push"
 */
async function watchMailbox(uid, tenantId, { fromEmail, topicName, labelIds } = {}) {
  requireTenantId(tenantId);
  if (!topicName) throw new Error("watchMailbox: topicName is required");
  // Gate every call, unconditionally — this function currently has exactly
  // one real use (the persona-email inbound listener). If it ever gains a
  // second, unrelated use, that call site needs its own registered gate,
  // not a silent bypass of this one.
  await require("../../config/capabilityGates").assertGatesPass("persona-email-inbound-listener");
  let auth;
  if (fromEmail) {
    const extras = await resolveTenantIntegrationCollection({
      newColl: extraAccountsColl(uid, tenantId),
      legacyColl: legacyExtraAccountsColl(uid),
      isConnected: isGmailConnected,
      tenantId,
    });
    const aId = accountId(fromEmail);
    const targetDoc = extras.docs.find((d) => d.id === aId);
    if (!targetDoc) throw new Error(`watchMailbox: no connected account found for ${fromEmail}`);
    auth = await buildAuthedClientForAccount(uid, tenantId, targetDoc.id);
  } else {
    auth = await buildAuthedClient(uid, tenantId);
  }
  const google = getGoogle();
  const gmail = google.gmail({ version: "v1", auth });
  const resp = await gmail.users.watch({
    userId: "me",
    requestBody: { topicName, labelIds: labelIds || ["INBOX"], labelFilterAction: "include" },
  });
  const historyId = resp.data?.historyId || null;
  const expiration = resp.data?.expiration || null;
  // Persisted so Dev (CODEX 100 check #2) has ground truth to check watch
  // health against — watchMailbox()/stopWatch() previously returned this to
  // the HTTP caller only and discarded it otherwise, meaning there was no
  // stored answer to "does a watch currently exist" at all. Single shared
  // doc since there is currently exactly one shared mailbox (alex@sociii.ai).
  await getDb().doc("config/gmailPersonaWatchState").set({
    active: true, historyId, expiration, topicName,
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    stoppedAt: null, stoppedReason: null,
  }, { merge: true });
  return { ok: true, historyId, expiration };
}

async function stopWatch(uid, tenantId, { fromEmail, reason } = {}) {
  requireTenantId(tenantId);
  let auth;
  if (fromEmail) {
    const extras = await resolveTenantIntegrationCollection({
      newColl: extraAccountsColl(uid, tenantId),
      legacyColl: legacyExtraAccountsColl(uid),
      isConnected: isGmailConnected,
      tenantId,
    });
    const aId = accountId(fromEmail);
    const targetDoc = extras.docs.find((d) => d.id === aId);
    if (!targetDoc) throw new Error(`stopWatch: no connected account found for ${fromEmail}`);
    auth = await buildAuthedClientForAccount(uid, tenantId, targetDoc.id);
  } else {
    auth = await buildAuthedClient(uid, tenantId);
  }
  const google = getGoogle();
  const gmail = google.gmail({ version: "v1", auth });
  await gmail.users.stop({ userId: "me" });
  await getDb().doc("config/gmailPersonaWatchState").set({
    active: false,
    stoppedAt: admin.firestore.FieldValue.serverTimestamp(),
    stoppedReason: reason || "manual stopWatch() call",
  }, { merge: true });
  return { ok: true };
}

/**
 * historySince — fetch message-added events since a stored historyId, for
 * the Pub/Sub push webhook. Returns the raw history records; callers filter
 * for the events they care about (new messages in INBOX).
 */
async function historySince(uid, tenantId, { fromEmail, startHistoryId } = {}) {
  requireTenantId(tenantId);
  let auth;
  if (fromEmail) {
    const extras = await resolveTenantIntegrationCollection({
      newColl: extraAccountsColl(uid, tenantId),
      legacyColl: legacyExtraAccountsColl(uid),
      isConnected: isGmailConnected,
      tenantId,
    });
    const aId = accountId(fromEmail);
    const targetDoc = extras.docs.find((d) => d.id === aId);
    if (!targetDoc) throw new Error(`historySince: no connected account found for ${fromEmail}`);
    auth = await buildAuthedClientForAccount(uid, tenantId, targetDoc.id);
  } else {
    auth = await buildAuthedClient(uid, tenantId);
  }
  const google = getGoogle();
  const gmail = google.gmail({ version: "v1", auth });
  const resp = await gmail.users.history.list({
    userId: "me",
    startHistoryId,
    historyTypes: ["messageAdded"],
  });
  return resp.data?.history || [];
}

async function getMessageRaw(uid, tenantId, { fromEmail, messageId } = {}) {
  requireTenantId(tenantId);
  let auth;
  if (fromEmail) {
    const extras = await resolveTenantIntegrationCollection({
      newColl: extraAccountsColl(uid, tenantId),
      legacyColl: legacyExtraAccountsColl(uid),
      isConnected: isGmailConnected,
      tenantId,
    });
    const aId = accountId(fromEmail);
    const targetDoc = extras.docs.find((d) => d.id === aId);
    if (!targetDoc) throw new Error(`getMessageRaw: no connected account found for ${fromEmail}`);
    auth = await buildAuthedClientForAccount(uid, tenantId, targetDoc.id);
  } else {
    auth = await buildAuthedClient(uid, tenantId);
  }
  const google = getGoogle();
  const gmail = google.gmail({ version: "v1", auth });
  const resp = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
  return resp.data;
}

/**
 * listRecentSummary — compact summary of recent inbox for chat context injection.
 * Returns a short text block.
 */
async function listRecentSummary(uid, tenantId, opts = {}) {
  const { maxResults = 8 } = opts;
  const auth = await buildAuthedClient(uid, tenantId);
  const google = getGoogle();
  const gmail = google.gmail({ version: "v1", auth });

  const snap = await gmail.users.messages.list({ userId: "me", maxResults, labelIds: ["INBOX"] });
  const lines = [];
  for (const msg of snap.data.messages || []) {
    const full = await gmail.users.messages.get({ userId: "me", id: msg.id, format: "metadata", metadataHeaders: ["Subject", "From", "Date"] });
    const headers = Object.fromEntries((full.data.payload?.headers || []).map(h => [h.name, h.value]));
    lines.push(`  • From: ${headers.From || "?"} | ${headers.Subject || "(no subject)"} | ${headers.Date || ""}`);
  }
  return lines.length ? `RECENT INBOX (${lines.length} threads):\n${lines.join("\n")}` : null;
}

// ═══════════════════════════════════════════════════════════════
//  MULTI-ACCOUNT SUPPORT
//  Primary account: users/{uid}/workspaces/{tenantId}/integrations/gmail
//  Additional accounts: users/{uid}/workspaces/{tenantId}/gmailAccounts/{accountId}
//  accountId = email.replace(/[@.+]/g, "_")
// ═══════════════════════════════════════════════════════════════

function accountId(email) {
  return (email || "").toLowerCase().replace(/[@.+]/g, "_").replace(/[^a-z0-9_]/g, "");
}

async function storeExtraAccount(uid, tenantId, email, tokens) {
  requireTenantId(tenantId);
  const aId = accountId(email);
  const data = {
    email,
    accountId: aId,
    accessToken: encrypt(tokens.access_token),
    refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    expiryDate: tokens.expiry_date || null,
    scope: tokens.scope || SCOPES.join(" "),
    connectedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await extraAccountsColl(uid, tenantId).doc(aId).set(data, { merge: true });
  return aId;
}

async function loadExtraAccountTokens(uid, tenantId, aId) {
  requireTenantId(tenantId);
  const { snap } = await resolveTenantIntegrationDoc({
    newRef: extraAccountsColl(uid, tenantId).doc(aId),
    legacyRef: legacyExtraAccountsColl(uid).doc(aId),
    isConnected: isGmailConnected,
    tenantId,
  });
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data.accessToken) return null;
  return {
    access_token: decrypt(data.accessToken),
    refresh_token: data.refreshToken ? decrypt(data.refreshToken) : null,
    expiry_date: data.expiryDate || null,
    scope: data.scope || "",
    email: data.email,
  };
}

async function buildAuthedClientForAccount(uid, tenantId, aId) {
  const tokens = await loadExtraAccountTokens(uid, tenantId, aId);
  if (!tokens) throw new Error(`Gmail account ${aId} not found`);
  const auth = buildOAuthClient();
  auth.setCredentials(tokens);
  auth.on("tokens", async (newTokens) => {
    await storeExtraAccount(uid, tenantId, tokens.email, { ...tokens, ...newTokens });
  });
  return auth;
}

async function handleGmailAddAccountUrl(req, res, { userId }) {
  const auth = buildOAuthClient();
  const url = auth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent select_account",
    state: `${userId}|gmail-add`,
  });
  return res.json({ ok: true, authUrl: url });
}

async function handleGmailAddAccountExchange(req, res, { userId, tenantId }) {
  if (!tenantId) return res.status(400).json({ ok: false, error: "tenantId required (x-tenant-id header)" });
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: "code required" });
  const auth = buildOAuthClient();
  const { tokens } = await auth.getToken(code);
  auth.setCredentials(tokens);

  const google = getGoogle();
  const gmail = google.gmail({ version: "v1", auth });
  let email = null;
  try {
    const profile = await gmail.users.getProfile({ userId: "me" });
    email = profile.data.emailAddress;
  } catch (_) {}
  if (!email) return res.status(400).json({ ok: false, error: "Could not determine account email" });

  // Check if this is already the primary account (tenant-scoped, with legacy fallback)
  const { snap: primary } = await resolveTenantIntegrationDoc({
    newRef: primaryRef(userId, tenantId),
    legacyRef: legacyPrimaryRef(userId),
    isConnected: isGmailConnected,
    tenantId,
  });
  if (primary.exists && primary.data().email === email) {
    return res.status(409).json({ ok: false, error: `${email} is already connected as your primary Gmail account.` });
  }

  const aId = await storeExtraAccount(userId, tenantId, email, tokens);
  return res.json({ ok: true, email, accountId: aId });
}

async function handleGmailListAccounts(req, res, { userId, tenantId }) {
  if (!tenantId) return res.json({ ok: true, accounts: [] });
  const accounts = [];

  // Primary
  try {
    const { snap } = await resolveTenantIntegrationDoc({
      newRef: primaryRef(userId, tenantId),
      legacyRef: legacyPrimaryRef(userId),
      isConnected: isGmailConnected,
      tenantId,
    });
    if (snap.exists && snap.data().accessToken) {
      accounts.push({
        accountId: "primary",
        email: snap.data().email || null,
        primary: true,
        connectedAt: snap.data().connectedAt || null,
      });
    }
  } catch (_) {}

  // Extra accounts
  try {
    const extras = await resolveTenantIntegrationCollection({
      newColl: extraAccountsColl(userId, tenantId),
      legacyColl: legacyExtraAccountsColl(userId),
      isConnected: isGmailConnected,
      tenantId,
    });
    for (const doc of extras.docs) {
      const data = doc.data();
      if (data.accessToken) {
        accounts.push({
          accountId: doc.id,
          email: data.email || null,
          primary: false,
          connectedAt: data.connectedAt || null,
        });
      }
    }
  } catch (_) {}

  return res.json({ ok: true, accounts });
}

async function handleGmailRemoveAccount(req, res, { userId, tenantId }) {
  if (!tenantId) return res.status(400).json({ ok: false, error: "tenantId required (x-tenant-id header)" });
  const { accountId: aId } = req.body || {};
  if (!aId) return res.status(400).json({ ok: false, error: "accountId required" });
  if (aId === "primary") {
    await primaryRef(userId, tenantId).delete();
  } else {
    await extraAccountsColl(userId, tenantId).doc(aId).delete();
  }
  return res.json({ ok: true });
}

/**
 * Merge inbox summaries from primary + all extra accounts.
 * Cap 6 threads per account so context doesn't bloat.
 */
async function listRecentSummaryAllAccounts(uid, tenantId, opts = {}) {
  requireTenantId(tenantId);
  const { maxPerAccount = 6 } = opts;
  const sections = [];

  // Primary
  try {
    const { snap: primarySnap } = await resolveTenantIntegrationDoc({
      newRef: primaryRef(uid, tenantId),
      legacyRef: legacyPrimaryRef(uid),
      isConnected: isGmailConnected,
      tenantId,
    });
    if (primarySnap.exists && primarySnap.data().accessToken) {
      const primaryEmail = primarySnap.data().email || "primary";
      const summary = await listRecentSummary(uid, tenantId, { maxResults: maxPerAccount });
      if (summary) sections.push(`[${primaryEmail}]\n${summary}`);
    }
  } catch (_) {}

  // Extra accounts
  try {
    const extras = await resolveTenantIntegrationCollection({
      newColl: extraAccountsColl(uid, tenantId),
      legacyColl: legacyExtraAccountsColl(uid),
      isConnected: isGmailConnected,
      tenantId,
    });
    for (const doc of extras.docs) {
      const data = doc.data();
      if (!data.accessToken) continue;
      try {
        const auth = await buildAuthedClientForAccount(uid, tenantId, doc.id);
        const google = getGoogle();
        const gmail = google.gmail({ version: "v1", auth });
        const snap = await gmail.users.messages.list({ userId: "me", maxResults: maxPerAccount, labelIds: ["INBOX"] });
        const lines = [];
        for (const msg of snap.data.messages || []) {
          const full = await gmail.users.messages.get({ userId: "me", id: msg.id, format: "metadata", metadataHeaders: ["Subject", "From", "Date"] });
          const headers = Object.fromEntries((full.data.payload?.headers || []).map(h => [h.name, h.value]));
          lines.push(`  • From: ${headers.From || "?"} | ${headers.Subject || "(no subject)"} | ${headers.Date || ""}`);
        }
        if (lines.length) sections.push(`[${data.email}]\nRECENT INBOX (${lines.length} threads):\n${lines.join("\n")}`);
      } catch (_) { /* skip accounts with expired tokens */ }
    }
  } catch (_) {}

  return sections.length ? sections.join("\n\n") : null;
}

/**
 * searchEmailsAllAccounts — fan-out keyword search across primary + all extra Gmail accounts.
 * account: "all" (default) | "primary" | specific accountId (sanitized email)
 */
async function searchEmailsAllAccounts(uid, tenantId, query, opts = {}) {
  requireTenantId(tenantId);
  const { maxResults = 15, account = "all" } = opts;
  const results = [];

  const fetchForAuth = async (oauthClient, emailLabel) => {
    const google = getGoogle();
    const gmail = google.gmail({ version: "v1", auth: oauthClient });
    const snap = await gmail.users.messages.list({ userId: "me", q: query, maxResults });
    const msgs = [];
    for (const msg of snap.data.messages || []) {
      const full = await gmail.users.messages.get({ userId: "me", id: msg.id, format: "metadata", metadataHeaders: ["Subject", "From", "Date"] });
      const headers = Object.fromEntries((full.data.payload?.headers || []).map(h => [h.name, h.value]));
      msgs.push({ account: emailLabel, messageId: msg.id, subject: headers.Subject || "(no subject)", from: headers.From || "", date: headers.Date || "", snippet: full.data.snippet || "" });
    }
    return msgs;
  };

  if (account === "all" || account === "primary") {
    try {
      const auth = await buildAuthedClient(uid, tenantId);
      const { snap: primarySnap } = await resolveTenantIntegrationDoc({
        newRef: primaryRef(uid, tenantId),
        legacyRef: legacyPrimaryRef(uid),
        isConnected: isGmailConnected,
        tenantId,
      });
      const primaryEmail = (primarySnap.exists && primarySnap.data().email) || "primary";
      results.push(...await fetchForAuth(auth, primaryEmail));
    } catch (_) {}
  }

  if (account === "all" || account !== "primary") {
    try {
      const extras = await resolveTenantIntegrationCollection({
        newColl: extraAccountsColl(uid, tenantId),
        legacyColl: legacyExtraAccountsColl(uid),
        isConnected: isGmailConnected,
        tenantId,
      });
      for (const doc of extras.docs) {
        const data = doc.data();
        if (!data.accessToken) continue;
        if (account !== "all" && doc.id !== account) continue;
        try {
          const auth = await buildAuthedClientForAccount(uid, tenantId, doc.id);
          results.push(...await fetchForAuth(auth, data.email || doc.id));
        } catch (_) {}
      }
    } catch (_) {}
  }

  return results;
}

module.exports = {
  handleGmailAuthUrl,
  handleGmailExchangeCode,
  handleGmailStatus,
  handleGmailDisconnect,
  handleGmailAddAccountUrl,
  handleGmailAddAccountExchange,
  handleGmailListAccounts,
  handleGmailRemoveAccount,
  syncContacts,
  searchEmails,
  searchEmailsAllAccounts,
  sendEmail,
  listRecentSummary,
  listRecentSummaryAllAccounts,
  buildAuthedClient,
  watchMailbox,
  stopWatch,
  historySince,
  getMessageRaw,
};
