"use strict";

/**
 * instructorAuth.js — CODEX 70 Surface 2, Step 1 (Path A only).
 *
 * Institutional email OTP verification for the Course Uploader wizard.
 * This is the "only new backend work" the CODEX 70 doc calls out — send +
 * verify. Everything downstream (Studio Locker ingest, chat) is existing
 * infrastructure.
 *
 * Path A: send a 6-digit code to an institutional email, verify it, find or
 * create a Firebase Auth user for that email, write an `instructors/{uid}`
 * record, and mint a custom token.
 *
 * Path B (license/board API) and Path C (employment letter, manual review)
 * are explicitly v2 per the doc — not implemented here. The UI should show
 * them as "coming soon."
 *
 * IMPORTANT — honesty about robustness: "institutional" here is a heuristic
 * (reject well-known consumer webmail domains, accept everything else). It
 * is NOT a verified accreditation check. A determined bad actor could still
 * get through with a non-.edu domain they control. This matches what the
 * CODEX 70 doc scoped for v1 ("Path A... simplest to ship") but should be
 * called out explicitly to reviewers.
 */

const admin = require("firebase-admin");
const crypto = require("crypto");

function getDb() { return admin.firestore(); }

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_SENDS_PER_HOUR = 5;
const OTP_MAX_VERIFY_ATTEMPTS = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Best-effort "institutional" heuristic. Not exhaustive — deliberately a
// blocklist of major consumer webmail providers rather than an allowlist of
// TLDs, since many real institutions do not use .edu (e.g. community
// colleges, international schools, hospital-affiliated nursing programs).
const CONSUMER_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
  "aol.com", "protonmail.com", "proton.me", "live.com", "msn.com",
  "mail.com", "gmx.com", "yandex.com", "zoho.com", "me.com", "hey.com",
]);

function emailDomain(email) {
  const m = /@([^\s@]+)$/.exec(String(email || "").trim().toLowerCase());
  return m ? m[1] : "";
}

function isLikelyInstitutional(email) {
  const domain = emailDomain(email);
  if (!domain) return false;
  return !CONSUMER_EMAIL_DOMAINS.has(domain);
}

function institutionNameFromDomain(domain) {
  const base = String(domain || "").replace(/\.(edu|ac\.[a-z]{2}|org|com|net)$/i, "");
  return base
    .split(".")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ") || domain;
}

function otpDocId(email) {
  return crypto.createHash("sha256").update(String(email).trim().toLowerCase()).digest("hex").slice(0, 40);
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

/**
 * POST /v1/edu:instructor:sendOtp — public. Body: { email }
 */
async function sendInstructorOtp(req, res) {
  const db = getDb();
  const { email } = req.body || {};
  const trimmed = String(email || "").trim().toLowerCase();

  if (!trimmed || !EMAIL_RE.test(trimmed)) {
    return res.status(400).json({ ok: false, error: "Valid email required" });
  }
  if (!isLikelyInstitutional(trimmed)) {
    return res.status(400).json({
      ok: false,
      code: "NOT_INSTITUTIONAL",
      error: "Please use your institutional email address (not a personal Gmail/Yahoo/etc. account). License and employment-letter verification are coming soon.",
    });
  }

  const docId = otpDocId(trimmed);
  const ref = db.collection("instructorOtps").doc(docId);
  const existing = await ref.get();
  const now = Date.now();

  const prevSendLog = existing.exists ? (existing.data().sendLog || []) : [];
  const recentSends = prevSendLog.filter((ts) => now - ts < 60 * 60 * 1000);
  if (recentSends.length >= OTP_MAX_SENDS_PER_HOUR) {
    return res.status(429).json({ ok: false, error: "Too many verification codes requested. Try again later." });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = now + OTP_EXPIRY_MINUTES * 60 * 1000;

  await ref.set({
    email: trimmed,
    codeHash: hashCode(code),
    expiresAt,
    attempts: 0,
    consumed: false,
    sendLog: [...recentSends, now],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  let delivered = false;
  try {
    const { sendEmail } = require("../magicLink");
    delivered = await sendEmail({
      to: trimmed,
      subject: "Your SOCIII instructor verification code",
      htmlBody: `<p>Your verification code is:</p>` +
        `<p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p>` +
        `<p>This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>`,
    });
  } catch (e) {
    console.error("[instructorAuth] sendEmail failed:", e.message);
  }

  const response = { ok: true, sent: delivered, expiresInMinutes: OTP_EXPIRY_MINUTES };
  if (!delivered) {
    // Real gap, surfaced honestly rather than silently pretending the email
    // sent: SENDGRID_API_KEY may not be configured in this environment.
    response.warning = "Email delivery is not confirmed in this environment. If you don't receive a code, contact support.";
  }
  return res.json(response);
}

/**
 * POST /v1/edu:instructor:verifyOtp — public. Body: { email, code }
 */
async function verifyInstructorOtp(req, res) {
  const db = getDb();
  const { email, code } = req.body || {};
  const trimmed = String(email || "").trim().toLowerCase();
  if (!trimmed || !code) return res.status(400).json({ ok: false, error: "email and code required" });

  const docId = otpDocId(trimmed);
  const ref = db.collection("instructorOtps").doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return res.status(400).json({ ok: false, error: "No verification code found for this email. Request a new one." });
  const data = snap.data();

  if (data.consumed) return res.status(400).json({ ok: false, error: "Code already used. Request a new one." });
  if (Date.now() > data.expiresAt) return res.status(400).json({ ok: false, error: "Code expired. Request a new one." });
  if ((data.attempts || 0) >= OTP_MAX_VERIFY_ATTEMPTS) {
    return res.status(429).json({ ok: false, error: "Too many attempts. Request a new code." });
  }

  if (hashCode(String(code)) !== data.codeHash) {
    await ref.update({ attempts: admin.firestore.FieldValue.increment(1) });
    return res.status(400).json({ ok: false, error: "Invalid code." });
  }

  await ref.update({ consumed: true, consumedAt: admin.firestore.FieldValue.serverTimestamp() });

  let uid;
  try {
    const userRecord = await admin.auth().getUserByEmail(trimmed);
    uid = userRecord.uid;
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      const newUser = await admin.auth().createUser({ email: trimmed, emailVerified: true });
      uid = newUser.uid;
    } else {
      throw e;
    }
  }

  const domain = emailDomain(trimmed);
  const institution = institutionNameFromDomain(domain);

  await db.collection("instructors").doc(uid).set({
    verificationMethod: "institutional_email",
    verifiedEmail: trimmed,
    institution,
    institutionDomain: domain,
    verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: "active",
  }, { merge: true });

  // Real-billing wiring (CODEX 70 rework, gap #2) — resolve this instructor
  // to (or create) exactly one real 'education' tenant, the same
  // createWorkspace()-backed mechanism AddWorkspaceWizard.jsx uses. Every
  // course this instructor builds attaches to this tenant (see
  // courseSession.js) instead of living only inside an anonymous,
  // unbilled courseUid. Non-blocking: if tenant resolution fails, OTP
  // verification still succeeds — courseSession.js retries tenant
  // resolution at course-creation time as a second chance.
  let tenantId = null;
  try {
    const { getOrCreateInstructorTenant } = require("./instructorTenant");
    const tenantResult = await getOrCreateInstructorTenant({ uid }, { institution });
    tenantId = tenantResult.tenantId;
    await db.collection("instructors").doc(uid).set({ tenantId }, { merge: true });
  } catch (e) {
    console.error("[instructorAuth] tenant resolution failed (non-blocking):", e.message);
  }

  const claims = { instructor: true };
  if (tenantId) claims.tenantId = tenantId;
  const token = await admin.auth().createCustomToken(uid, claims);
  return res.json({ ok: true, uid, token, institution, tenantId });
}

module.exports = {
  sendInstructorOtp,
  verifyInstructorOtp,
  isLikelyInstitutional,
  institutionNameFromDomain,
};
