/**
 * magicLink.js — Magic Link Generation, Delivery & Authentication
 *
 * Subscriber sign-up flow for Worker Share landing.
 * No password, no OAuth — email-only magic link.
 *
 * Flow:
 *   1. Recipient enters email in chat → POST /v1/magic-link:send
 *   2. SendGrid delivers magic link email (15-min expiry)
 *   3. Recipient clicks link → GET /v1/magic-link:verify?token=xxx
 *   4. Token validated, Firebase Auth custom token returned, session created
 *   5. Trial starts on successful authentication
 *
 * Firestore: magicLinks/{tokenId}
 */

"use strict";

const admin = require("firebase-admin");
const crypto = require("crypto");

function getDb() { return admin.firestore(); }

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const MAGIC_LINK_EXPIRY_MINUTES = 15;

// ═══════════════════════════════════════════════════════════════
//  EMAIL
// ═══════════════════════════════════════════════════════════════

async function sendEmail({ to, subject, htmlBody }) {
  if (!SENDGRID_API_KEY) {
    console.warn("[magicLink] SENDGRID_API_KEY not set — skipping email");
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
      from: { email: "alex@titleapp.ai", name: "TitleApp" },
      reply_to: { email: "support@titleapp.ai", name: "TitleApp Support" },
      subject,
      content: [{ type: "text/html", value: htmlBody }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[magicLink] SendGrid error:", res.status, errText);
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  GENERATE & SEND MAGIC LINK
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a magic link and send it to the recipient.
 * POST /v1/magic-link:send
 * Body: { email, workerId, workerSlug, workerName, creatorName }
 *
 * No auth required — this is the sign-up entry point.
 */
async function sendMagicLink(req, res) {
  const db = getDb();
  const { email, workerId, workerSlug, workerName, creatorName } = req.body || {};

  if (!email) return res.status(400).json({ ok: false, error: "email required" });
  if (!workerId) return res.status(400).json({ ok: false, error: "workerId required" });

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ ok: false, error: "Invalid email format" });
  }

  // Rate limit: max 3 magic links per email per hour
  const oneHourAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
  const recentLinks = await db.collection("magicLinks")
    .where("email", "==", email.toLowerCase())
    .where("createdAt", ">", oneHourAgo)
    .get();

  if (recentLinks.size >= 3) {
    return res.status(429).json({ ok: false, error: "Too many magic links sent. Please wait and try again." });
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");
  const tokenId = crypto.createHash("sha256").update(token).digest("hex").substring(0, 20);
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000
  );

  // Store token
  await db.collection("magicLinks").doc(tokenId).set({
    token,
    email: email.toLowerCase(),
    workerId,
    workerSlug: workerSlug || null,
    workerName: workerName || null,
    creatorName: creatorName || null,
    createdAt: now,
    expiresAt,
    usedAt: null,
    used: false,
  });

  // Build magic link URL
  const baseUrl = "https://app.titleapp.ai";
  const magicUrl = `${baseUrl}/magic?token=${token}&worker=${workerSlug || workerId}`;

  // Send email
  const displayName = workerName || "your AI worker";
  const sent = await sendEmail({
    to: email,
    subject: `Here's your access to ${displayName}`,
    htmlBody: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span>
  </div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">
    Tap the button below to access <strong>${displayName}</strong>${creatorName ? ` from ${creatorName}` : ""}.
  </p>
  <div style="margin: 32px 0;">
    <a href="${magicUrl}" style="display: inline-block; padding: 14px 32px; background: #7c3aed; color: white; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600;">
      Open ${displayName}
    </a>
  </div>
  <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
    This link expires in ${MAGIC_LINK_EXPIRY_MINUTES} minutes and can only be used once.
  </p>
  <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
    If you didn't request this, you can safely ignore this email.
  </p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 13px; color: #94a3b8;">TitleApp LLC | Your Data Is Always Yours.</p>
  </div>
</div>`,
  });

  if (!sent) {
    // Clean up token if email failed
    await db.collection("magicLinks").doc(tokenId).delete();
    return res.status(500).json({ ok: false, error: "Failed to send magic link email" });
  }

  return res.json({
    ok: true,
    message: "Magic link sent",
    expiresInMinutes: MAGIC_LINK_EXPIRY_MINUTES,
  });
}

// ═══════════════════════════════════════════════════════════════
//  VERIFY MAGIC LINK TOKEN
// ═══════════════════════════════════════════════════════════════

/**
 * Verify a magic link token and authenticate the user.
 * POST /v1/magic-link:verify
 * Body: { token }
 *
 * Returns Firebase custom token for client-side signInWithCustomToken.
 * Creates user account if none exists.
 * Starts trial on the associated worker.
 */
async function verifyMagicLink(req, res) {
  const db = getDb();
  const { token } = req.body || {};

  if (!token) return res.status(400).json({ ok: false, error: "token required" });

  // Look up token by hash
  const tokenId = crypto.createHash("sha256").update(token).digest("hex").substring(0, 20);
  const linkRef = db.collection("magicLinks").doc(tokenId);
  const linkSnap = await linkRef.get();

  if (!linkSnap.exists) {
    return res.status(404).json({ ok: false, error: "Invalid or expired link" });
  }

  const linkData = linkSnap.data();

  // Check if already used
  if (linkData.used) {
    return res.status(410).json({ ok: false, error: "This link has already been used" });
  }

  // Check expiry
  const now = Date.now();
  const expiresMs = linkData.expiresAt._seconds
    ? linkData.expiresAt._seconds * 1000
    : linkData.expiresAt.toMillis ? linkData.expiresAt.toMillis() : new Date(linkData.expiresAt).getTime();

  if (now > expiresMs) {
    return res.status(410).json({ ok: false, error: "This link has expired. Please request a new one." });
  }

  // Mark token as used
  await linkRef.update({
    used: true,
    usedAt: admin.firestore.Timestamp.now(),
  });

  const email = linkData.email;

  // Find or create Firebase Auth user
  let uid;
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    uid = userRecord.uid;
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      // Create new user
      const newUser = await admin.auth().createUser({
        email,
        emailVerified: true,
      });
      uid = newUser.uid;

      // Create Firestore user doc
      await db.collection("users").doc(uid).set({
        email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "magic_link",
        sourceWorkerId: linkData.workerId,
        sourceWorkerSlug: linkData.workerSlug || null,
      }, { merge: true });
    } else {
      throw e;
    }
  }

  // Start trial on the worker
  const { startTrial } = require("./workerTrial");
  const trialResult = await startTrial(uid, linkData.workerId);

  // Generate Firebase custom token
  const customToken = await admin.auth().createCustomToken(uid);

  return res.json({
    ok: true,
    customToken,
    uid,
    email,
    workerId: linkData.workerId,
    workerSlug: linkData.workerSlug,
    trial: trialResult,
  });
}

module.exports = {
  sendMagicLink,
  verifyMagicLink,
};
