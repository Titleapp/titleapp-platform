"use strict";

/**
 * gmail.js — Gmail OAuth lifecycle + Gmail API operations.
 *
 * Same Google OAuth client (GOOGLE_OAUTH_*) and token encryption
 * (GDRIVE_ENCRYPTION_KEY) as YouTube/Drive/Calendar. Tokens stored at
 * users/{uid}/integrations/gmail.
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
//  TOKEN STORAGE
// ═══════════════════════════════════════════════════════════════

async function storeTokens(uid, tokens) {
  const db = getDb();
  const data = {
    accessToken: encrypt(tokens.access_token),
    refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    expiryDate: tokens.expiry_date || null,
    scope: tokens.scope || SCOPES.join(" "),
    connectedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.doc(`users/${uid}/integrations/gmail`).set(data, { merge: true });
}

async function loadTokens(uid) {
  const db = getDb();
  const snap = await db.doc(`users/${uid}/integrations/gmail`).get();
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

async function buildAuthedClient(uid) {
  const tokens = await loadTokens(uid);
  if (!tokens) throw new Error("Gmail not connected — call /v1/gmail:authUrl first");
  const auth = buildOAuthClient();
  auth.setCredentials(tokens);
  // Auto-refresh and persist
  auth.on("tokens", async (newTokens) => {
    await storeTokens(uid, { ...tokens, ...newTokens });
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

async function handleGmailExchangeCode(req, res, { userId }) {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: "code required" });
  const auth = buildOAuthClient();
  const { tokens } = await auth.getToken(code);
  await storeTokens(userId, tokens);

  // Immediately pull connected account email for display
  auth.setCredentials(tokens);
  const google = getGoogle();
  const gmail = google.gmail({ version: "v1", auth });
  let email = null;
  try {
    const profile = await gmail.users.getProfile({ userId: "me" });
    email = profile.data.emailAddress;
    await getDb().doc(`users/${userId}/integrations/gmail`).update({ email });
  } catch (_) {}

  return res.json({ ok: true, email });
}

async function handleGmailStatus(req, res, { userId }) {
  const snap = await getDb().doc(`users/${userId}/integrations/gmail`).get();
  if (!snap.exists || !snap.data().accessToken) {
    return res.json({ ok: true, connected: false });
  }
  const data = snap.data();
  return res.json({ ok: true, connected: true, email: data.email || null, connectedAt: data.connectedAt || null });
}

async function handleGmailDisconnect(req, res, { userId }) {
  await getDb().doc(`users/${userId}/integrations/gmail`).delete();
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
  const { maxMessages = 500 } = opts;
  const auth = await buildAuthedClient(uid);
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
async function searchEmails(uid, query, opts = {}) {
  const { maxResults = 10 } = opts;
  const auth = await buildAuthedClient(uid);
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
 */
async function sendEmail(uid, { to, subject, body, htmlBody, cc, replyTo }) {
  const auth = await buildAuthedClient(uid);
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

  let raw = `To: ${toLine}\r\n`;
  if (ccLine) raw += `Cc: ${ccLine}\r\n`;
  if (replyTo) raw += `Reply-To: ${replyTo}\r\n`;
  raw += `Subject: ${encodeSubject(subject)}\r\n`;
  raw += `MIME-Version: 1.0\r\n`;

  if (htmlBody) {
    raw += `Content-Type: text/html; charset=utf-8\r\n\r\n${htmlBody}`;
  } else {
    raw += `Content-Type: text/plain; charset=utf-8\r\n\r\n${body || ""}`;
  }

  const encoded = Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  await gmail.users.messages.send({ userId: "me", requestBody: { raw: encoded } });
  return { ok: true };
}

/**
 * listRecentSummary — compact summary of recent inbox for chat context injection.
 * Returns a short text block.
 */
async function listRecentSummary(uid, opts = {}) {
  const { maxResults = 8 } = opts;
  const auth = await buildAuthedClient(uid);
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

module.exports = {
  handleGmailAuthUrl,
  handleGmailExchangeCode,
  handleGmailStatus,
  handleGmailDisconnect,
  syncContacts,
  searchEmails,
  sendEmail,
  listRecentSummary,
  buildAuthedClient,
};
