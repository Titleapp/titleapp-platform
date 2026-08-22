"use strict";

/**
 * services/clients/clientPortalInvite.js — CODEX S52.61 Phase 1
 *
 * Invite-based account access for a newly-added client. Modeled directly on
 * `services/magicLink.js` (find-or-create Firebase Auth user + emailed
 * token + custom-token exchange on redemption) — deliberately a SEPARATE
 * collection/token namespace, same convention `services/workspaceInvite.js`
 * already uses ("different collection, different token namespace, no
 * shared state" — index.js:14113-14117), because this grants *client*
 * portal access (scoped to specific worker slugs) rather than staff
 * workspace membership (admin/member/viewer).
 *
 * Why not just reuse workspaceInvite.js's /workspace:invite:redeem flow?
 * That flow requires the invitee to already be signed in with a Firebase
 * session before redeeming (index.js:14300-14309 reads `auth.user.email`) —
 * wrong shape for a brand-new client with no account at all. magicLink.js's
 * pattern (public redeem endpoint, find-or-create account, hand back a
 * custom token) is the one that actually fits "no account yet."
 *
 * Firestore: clientPortalInvites/{tokenId}
 */

const admin = require("firebase-admin");
const crypto = require("crypto");

function getDb() {
  return admin.firestore();
}

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const APP_BASE_URL = process.env.APP_BASE_URL || "https://app.sociii.ai";
const INVITE_EXPIRY_DAYS = 14;

async function sendEmail({ to, subject, htmlBody }) {
  if (!SENDGRID_API_KEY) {
    console.warn("[clientPortalInvite] SENDGRID_API_KEY not set — skipping email send");
    return false;
  }
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "alex@sociii.ai", name: "SOCIII" },
      reply_to: { email: "support@sociii.ai", name: "SOCIII Support" },
      subject,
      content: [{ type: "text/html", value: htmlBody }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[clientPortalInvite] SendGrid error:", res.status, errText.slice(0, 200));
    return false;
  }
  return true;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Create + email a client portal invite.
 *
 * @param {object} params
 * @param {FirebaseFirestore.Firestore} [params.db]
 * @param {string} params.tenantId
 * @param {string} params.contactId
 * @param {string} params.email
 * @param {string} [params.name]
 * @param {string} [params.workspaceName]
 * @param {string[]} params.workerSlugs
 * @param {string} [params.invitedBy] — staff uid, null for automated/self-serve triggers
 * @param {string|null} [params.esignSigningUrl] — if present, included in the email
 *   so the client can complete the disclosure step from the same message.
 * @returns {Promise<{ok:boolean, token:string, inviteUrl:string, emailed:boolean}>}
 */
async function sendClientPortalInvite({ db, tenantId, contactId, email, name, workspaceName, workerSlugs, invitedBy = null, esignSigningUrl = null }) {
  if (!tenantId) throw new Error("sendClientPortalInvite: tenantId required");
  if (!contactId) throw new Error("sendClientPortalInvite: contactId required");
  if (!email) throw new Error("sendClientPortalInvite: email required");

  const database = db || getDb();
  const normalizedEmail = String(email).toLowerCase().trim();

  const token = crypto.randomBytes(32).toString("hex");
  const tokenId = crypto.createHash("sha256").update(token).digest("hex").substring(0, 20);
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await database.collection("clientPortalInvites").doc(tokenId).set({
    token,
    tenantId,
    contactId,
    email: normalizedEmail,
    name: name || null,
    workspaceName: workspaceName || null,
    workerSlugs: Array.isArray(workerSlugs) ? workerSlugs : [],
    invitedBy,
    status: "pending",
    createdAt: now,
    expiresAt,
    redeemedAt: null,
    redeemedByUid: null,
  });

  const inviteUrl = `${APP_BASE_URL}/client-portal/claim?token=${token}`;
  const displayWorkspace = escapeHtml(workspaceName || "your service provider");
  const displayName = escapeHtml(name || "there");

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color:#1a202c;">
  <p style="font-size: 16px; line-height: 1.6;">Hi ${displayName},</p>
  <p style="font-size: 16px; line-height: 1.6;"><strong>${displayWorkspace}</strong> has set up your secure client portal.</p>
  ${esignSigningUrl ? `<p style="margin: 24px 0;"><a href="${esignSigningUrl}" style="display:inline-block; padding:12px 24px; background:#111827; color:#fff; text-decoration:none; border-radius:8px; font-weight:600;">Review &amp; sign your engagement document</a></p>` : ""}
  <p style="margin: 24px 0;"><a href="${inviteUrl}" style="display:inline-block; padding:12px 24px; background:#7c3aed; color:#fff; text-decoration:none; border-radius:8px; font-weight:600;">Access your portal</a></p>
  <p style="font-size: 14px; color:#6b7280;">This link expires in ${INVITE_EXPIRY_DAYS} days.</p>
  <p style="margin-top: 32px; color:#6b7280; font-size:14px;">— SOCIII</p>
</div>`;

  const emailed = await sendEmail({
    to: normalizedEmail,
    subject: `${workspaceName || "Your service provider"} invited you to your client portal`,
    htmlBody,
  });

  return { ok: true, token, inviteUrl, emailed };
}

/**
 * Redeem a client portal invite — finds or creates the Firebase Auth
 * account for the invited email (same idiom as magicLink.js's
 * verifyMagicLink) and returns a custom token for client-side
 * `signInWithCustomToken`. Public endpoint — no prior auth required, the
 * token itself is the credential (same trust model as magicLink.js and
 * esignService.js's native signing tokens).
 *
 * @param {object} params
 * @param {FirebaseFirestore.Firestore} [params.db]
 * @param {string} params.token
 * @returns {Promise<{ok:boolean, customToken:string, uid:string, tenantId:string, contactId:string, workerSlugs:string[]}>}
 */
async function redeemClientPortalInvite({ db, token }) {
  if (!token) throw new Error("redeemClientPortalInvite: token required");
  const database = db || getDb();

  const tokenId = crypto.createHash("sha256").update(token).digest("hex").substring(0, 20);
  const ref = database.collection("clientPortalInvites").doc(tokenId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err = new Error("Invalid or expired invite");
    err.statusCode = 404;
    throw err;
  }
  const invite = snap.data();

  if (invite.status === "redeemed") {
    // Idempotent — re-clicking the same email link should just sign you in
    // again, not error.
    const customToken = await admin.auth().createCustomToken(invite.redeemedByUid);
    return {
      ok: true,
      customToken,
      uid: invite.redeemedByUid,
      tenantId: invite.tenantId,
      contactId: invite.contactId,
      workerSlugs: invite.workerSlugs || [],
    };
  }

  const expiresMs = invite.expiresAt?.toMillis ? invite.expiresAt.toMillis() : new Date(invite.expiresAt).getTime();
  if (Date.now() > expiresMs) {
    const err = new Error("This invite has expired");
    err.statusCode = 410;
    throw err;
  }

  let uid;
  try {
    const existing = await admin.auth().getUserByEmail(invite.email);
    uid = existing.uid;
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
    const created = await admin.auth().createUser({ email: invite.email, emailVerified: true, displayName: invite.name || undefined });
    uid = created.uid;
  }

  await ref.update({
    status: "redeemed",
    redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
    redeemedByUid: uid,
  });

  // Stamp the uid onto the contact + membership so entitlement checks (and
  // the KYC webhook correlation, which keys off contacts.uid) have it.
  const { stampClientUid } = require("./clientOnboarding");
  await stampClientUid({ db: database, tenantId: invite.tenantId, contactId: invite.contactId, uid });

  const customToken = await admin.auth().createCustomToken(uid);
  return {
    ok: true,
    customToken,
    uid,
    tenantId: invite.tenantId,
    contactId: invite.contactId,
    workerSlugs: invite.workerSlugs || [],
  };
}

module.exports = { sendClientPortalInvite, redeemClientPortalInvite };
