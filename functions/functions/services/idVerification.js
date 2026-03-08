/**
 * idVerification.js — Creator ID Verification State Machine
 *
 * P0 hard gate: no worker publishes without verified creator identity.
 *
 * State machine:
 *   not_submitted → pending → approved (terminal)
 *                          → rejected → pending (resubmit)
 *
 * Firestore:
 *   users/{userId}       — idVerificationStatus, idSubmittedAt, idVerifiedAt, etc.
 *   adminQueue/{requestId} — verification queue for admin review
 *
 * Firebase Storage:
 *   /verifications/{userId}/ — photo ID files (deleted on rejection, 90-day lifecycle on approval)
 *
 * SIMULATE_ID_VERIFY flag: when true, submission → instant approval (no queue, no notifications)
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const SIMULATE_ID_VERIFY = process.env.SIMULATE_ID_VERIFY === "true";

// ═══════════════════════════════════════════════════════════════
//  EMAIL HELPERS
// ═══════════════════════════════════════════════════════════════

async function sendEmail({ to, subject, htmlBody, textBody }) {
  if (!SENDGRID_API_KEY) {
    console.warn("[idVerification] SENDGRID_API_KEY not set — skipping email");
    return;
  }
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "alex@titleapp.ai", name: "Alex — TitleApp" },
      reply_to: { email: "sean@titleapp.ai", name: "Sean Combs" },
      subject,
      content: [
        ...(textBody ? [{ type: "text/plain", value: textBody }] : []),
        ...(htmlBody ? [{ type: "text/html", value: htmlBody }] : []),
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[idVerification] SendGrid error:", res.status, errText);
  }
}

function emailTemplate(firstName, bodyHtml) {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span>
  </div>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Hi ${firstName},</p>
  ${bodyHtml}
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">— Alex</p>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 13px; color: #94a3b8;">TitleApp LLC | Start Free. 60-Day Money Back. Your Data Is Always Yours.</p>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════
//  SUBMIT ID VERIFICATION (not_submitted → pending)
// ═══════════════════════════════════════════════════════════════

/**
 * Creator submits photo ID for verification.
 * POST /v1/id-verify:submit
 *
 * Body: { photoId: { name, type, data } }
 */
async function submitIdVerification(req, res) {
  const db = getDb();
  const user = req._user;
  const uid = user.uid;
  const { photoId } = req.body || {};

  // Check current state
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() : {};
  const currentStatus = userData.idVerificationStatus || "not_submitted";

  if (currentStatus === "approved") {
    return res.json({ ok: true, idVerificationStatus: "approved", message: "Already verified" });
  }

  if (currentStatus === "pending") {
    return res.status(400).json({ ok: false, error: "Verification already pending. Please wait for admin review." });
  }

  // --- SIMULATE MODE: instant approval ---
  if (SIMULATE_ID_VERIFY) {
    const now = admin.firestore.FieldValue.serverTimestamp();
    await userRef.set({
      idVerificationStatus: "approved",
      idSubmittedAt: now,
      idVerifiedAt: now,
      idRejectedAt: null,
      idRejectionReason: null,
      idVerifiedBy: "SIMULATE_ID_VERIFY",
    }, { merge: true });

    return res.json({
      ok: true,
      idVerificationStatus: "approved",
      simulated: true,
    });
  }

  // Upload photo ID to Firebase Storage
  let storagePath = null;
  if (photoId && photoId.data) {
    try {
      const bucket = admin.storage().bucket();
      const timestamp = Date.now();
      const ext = (photoId.name || "photo.jpg").split(".").pop() || "jpg";
      storagePath = `verifications/${uid}/photo_id_${timestamp}.${ext}`;

      const base64Data = photoId.data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const file = bucket.file(storagePath);
      await file.save(buffer, {
        metadata: {
          contentType: photoId.type || "image/jpeg",
        },
      });
    } catch (e) {
      console.error("[idVerification] Photo upload failed:", e.message);
      return res.status(500).json({ ok: false, error: "Failed to upload photo ID" });
    }
  } else {
    return res.status(400).json({ ok: false, error: "photoId with base64 data is required" });
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  // If resubmitting after rejection, clear prior rejection fields
  const updates = {
    idVerificationStatus: "pending",
    idSubmittedAt: now,
    idRejectedAt: null,
    idRejectionReason: null,
  };
  await userRef.set(updates, { merge: true });

  // Write to admin queue
  const requestId = db.collection("adminQueue").doc().id;
  await db.collection("adminQueue").doc(requestId).set({
    userId: uid,
    type: "id_verification",
    name: userData.displayName || userData.name || userData.email || uid,
    email: userData.email || "",
    phone: userData.phone || null,
    photoIdStoragePath: storagePath,
    submittedAt: admin.firestore.Timestamp.now(),
    status: "pending",
    nudgeSent: false,
  });

  // Notify admins
  await sendEmail({
    to: "sean@titleapp.ai",
    subject: `New ID verification: ${userData.displayName || userData.name || userData.email || uid}`,
    htmlBody: `<p>A creator has submitted their photo ID for verification.</p>
<p><strong>Name:</strong> ${userData.displayName || userData.name || "Unknown"}</p>
<p><strong>Email:</strong> ${userData.email || "Unknown"}</p>
<p>Review in the Admin Center verification queue.</p>`,
  });

  return res.json({
    ok: true,
    idVerificationStatus: "pending",
    requestId,
  });
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN: APPROVE (pending → approved)
// ═══════════════════════════════════════════════════════════════

/**
 * Admin approves ID verification.
 * PUT /v1/admin:verify:id:approve
 * Body: { userId }
 */
async function approveIdVerification(req, res) {
  const db = getDb();
  const adminUser = req._user;
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: "userId required" });

  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return res.status(404).json({ ok: false, error: "User not found" });
  const userData = userSnap.data();

  if (userData.idVerificationStatus !== "pending") {
    return res.status(400).json({ ok: false, error: `Cannot approve — current status is '${userData.idVerificationStatus}'` });
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  // Update user record
  await userRef.set({
    idVerificationStatus: "approved",
    idVerifiedAt: now,
    idVerifiedBy: adminUser.uid,
  }, { merge: true });

  // Update admin queue record
  const queueSnap = await db.collection("adminQueue")
    .where("userId", "==", userId)
    .where("type", "==", "id_verification")
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!queueSnap.empty) {
    await queueSnap.docs[0].ref.update({
      status: "approved",
      approvedAt: admin.firestore.Timestamp.now(),
      approvedBy: adminUser.uid,
    });
  }

  // Email creator
  const firstName = (userData.displayName || userData.name || "").split(" ")[0] || "there";
  await sendEmail({
    to: userData.email,
    subject: "You're verified. Time to publish.",
    htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your identity has been verified. You can now publish workers on the TitleApp marketplace.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="https://app.titleapp.ai" style="color: #7c3aed; font-weight: 600;">Go to your Vault</a> to publish your first worker.</p>`),
  });

  // SMS if phone on file
  if (userData.phone) {
    try {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = process.env.TWILIO_FROM_NUMBER;
      if (twilioSid && twilioToken && twilioFrom) {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From: twilioFrom,
            To: userData.phone,
            Body: "You're verified on TitleApp. Publish your worker now: https://app.titleapp.ai",
          }).toString(),
        });
      }
    } catch (e) {
      console.error("[idVerification] SMS failed:", e.message);
    }
  }

  return res.json({ ok: true, status: "approved" });
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN: REJECT (pending → rejected)
// ═══════════════════════════════════════════════════════════════

/**
 * Admin rejects ID verification.
 * PUT /v1/admin:verify:id:reject
 * Body: { userId, reason }
 */
async function rejectIdVerification(req, res) {
  const db = getDb();
  const { userId, reason } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: "userId required" });
  if (!reason) return res.status(400).json({ ok: false, error: "Rejection reason is required" });

  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return res.status(404).json({ ok: false, error: "User not found" });
  const userData = userSnap.data();

  if (userData.idVerificationStatus !== "pending") {
    return res.status(400).json({ ok: false, error: `Cannot reject — current status is '${userData.idVerificationStatus}'` });
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  // Update user record
  await userRef.set({
    idVerificationStatus: "rejected",
    idRejectedAt: now,
    idRejectionReason: reason,
    idSubmittedAt: null, // Clear so T1 re-opens upload UI
  }, { merge: true });

  // Update admin queue record
  const queueSnap = await db.collection("adminQueue")
    .where("userId", "==", userId)
    .where("type", "==", "id_verification")
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!queueSnap.empty) {
    await queueSnap.docs[0].ref.update({
      status: "rejected",
      rejectedAt: admin.firestore.Timestamp.now(),
      rejectionReason: reason,
    });
  }

  // Delete photo from Storage on rejection
  try {
    if (!queueSnap.empty) {
      const queueData = queueSnap.docs[0].data();
      if (queueData.photoIdStoragePath) {
        const bucket = admin.storage().bucket();
        await bucket.file(queueData.photoIdStoragePath).delete();
      }
    }
  } catch (e) {
    console.error("[idVerification] Failed to delete photo on rejection:", e.message);
  }

  // Email creator
  const firstName = (userData.displayName || userData.name || "").split(" ")[0] || "there";
  await sendEmail({
    to: userData.email,
    subject: "Update on your ID verification",
    htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">We couldn't verify your identity. Reason: ${reason}</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Please resubmit a clear photo of your government-issued ID.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;"><a href="https://app.titleapp.ai" style="color: #7c3aed; font-weight: 600;">Resubmit now</a></p>`),
  });

  return res.json({ ok: true, status: "rejected" });
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN: LIST QUEUE
// ═══════════════════════════════════════════════════════════════

/**
 * Get ID verification queue.
 * GET /v1/admin:verify:id:queue
 * Query: ?status=pending (optional filter)
 */
async function getIdVerificationQueue(req, res) {
  const db = getDb();
  const { status } = req.query || {};

  let query = db.collection("adminQueue")
    .where("type", "==", "id_verification")
    .orderBy("submittedAt", "asc")
    .limit(100);

  if (status) {
    query = db.collection("adminQueue")
      .where("type", "==", "id_verification")
      .where("status", "==", status)
      .orderBy("submittedAt", "asc")
      .limit(100);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return res.json({ ok: true, items, count: items.length });
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN: GET SIGNED PHOTO URL
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a 5-minute signed URL for viewing a creator's photo ID.
 * GET /v1/admin:verify:id:photo
 * Query: ?requestId=xxx
 */
async function getIdVerificationPhoto(req, res) {
  const db = getDb();
  const { requestId } = req.query || {};
  if (!requestId) return res.status(400).json({ ok: false, error: "requestId required" });

  const queueSnap = await db.collection("adminQueue").doc(requestId).get();
  if (!queueSnap.exists) return res.status(404).json({ ok: false, error: "Request not found" });

  const queueData = queueSnap.data();
  if (!queueData.photoIdStoragePath) {
    return res.status(404).json({ ok: false, error: "No photo on file" });
  }

  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(queueData.photoIdStoragePath);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    });
    return res.json({ ok: true, url, expiresIn: 300 });
  } catch (e) {
    console.error("[idVerification] Failed to generate signed URL:", e.message);
    return res.status(500).json({ ok: false, error: "Failed to generate photo URL" });
  }
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN NUDGE — 4-HOUR TRIGGER
// ═══════════════════════════════════════════════════════════════

/**
 * Runs every 30 minutes via Cloud Scheduler.
 * Sends nudge email to admin for requests pending > 4 hours.
 * Fires once per request (nudgeSent: true).
 */
async function checkIdVerificationNudge() {
  const db = getDb();
  const fourHoursAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 4 * 60 * 60 * 1000);

  const snapshot = await db.collection("adminQueue")
    .where("type", "==", "id_verification")
    .where("status", "==", "pending")
    .where("nudgeSent", "==", false)
    .where("submittedAt", "<", fourHoursAgo)
    .get();

  let nudged = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    try {
      await sendEmail({
        to: "sean@titleapp.ai",
        subject: `ID verification pending 4+ hours: ${data.name || data.email || data.userId}`,
        htmlBody: `<p>A creator ID verification request has been pending for over 4 hours.</p>
<p><strong>Creator:</strong> ${data.name || "Unknown"}</p>
<p><strong>Email:</strong> ${data.email || "Unknown"}</p>
<p><strong>Submitted:</strong> ${data.submittedAt ? new Date(data.submittedAt._seconds ? data.submittedAt._seconds * 1000 : data.submittedAt).toISOString() : "Unknown"}</p>
<p>Please review in the Admin Center verification queue.</p>`,
      });
      await doc.ref.update({ nudgeSent: true });
      nudged++;
    } catch (e) {
      console.error(`[idVerification] Nudge failed for ${doc.id}:`, e.message);
    }
  }

  console.log(`[idVerificationNudge] Sent ${nudged} nudge(s)`);
  return { nudged };
}

module.exports = {
  submitIdVerification,
  approveIdVerification,
  rejectIdVerification,
  getIdVerificationQueue,
  getIdVerificationPhoto,
  checkIdVerificationNudge,
};
