/**
 * studentVerification.js — Student Pilot free access verification
 *
 * Gates free Pilot Pro ($29 value) for students enrolled in:
 *   - University aviation programs
 *   - Pro-pilot programs
 *   - GI Bill flight training
 *
 * Flow: submit verification → admin spot-check queue → annual re-verify
 * Graduation: GRADPILOT coupon (3 months free) → $29/mo Pilot Pro
 *
 * Coupons used:
 *   STUDENT   — 100% off pilot_pro for 12 months (renewable)
 *   GRADPILOT — 100% off pilot_pro for 3 months (one-time grace)
 */

"use strict";

const admin = require("firebase-admin");
const Stripe = require("stripe");

function getDb() { return admin.firestore(); }
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";

// ═══════════════════════════════════════════════════════════════
//  EMAIL HELPERS
// ═══════════════════════════════════════════════════════════════

async function sendEmail({ to, subject, htmlBody, textBody }) {
  if (!SENDGRID_API_KEY) {
    console.warn("[studentVerification] SENDGRID_API_KEY not set — skipping email");
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
    console.error("[studentVerification] SendGrid error:", res.status, errText);
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
//  STRIPE HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Apply a coupon to an existing subscription, or create a new pilot_pro
 * subscription with the coupon if none exists.
 */
async function applyCoupon(userId, couponId) {
  const db = getDb();
  const stripe = getStripe();
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new Error("User not found");
  const userData = userSnap.data();

  // Ensure Stripe customer exists
  let customerId = userData.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.email,
      name: userData.displayName || userData.name || undefined,
      metadata: { userId },
    });
    customerId = customer.id;
    await userRef.set({ stripeCustomerId: customerId }, { merge: true });
  }

  const subscriptionId = userData.stripeSubscriptionId;

  if (subscriptionId) {
    // Update existing subscription with coupon
    try {
      await stripe.subscriptions.update(subscriptionId, { coupon: couponId });
      return { action: "coupon_applied", subscriptionId };
    } catch (e) {
      console.error(`[studentVerification] Failed to apply coupon ${couponId} to ${subscriptionId}:`, e.message);
      throw e;
    }
  } else {
    // Create new pilot_pro subscription with coupon
    const configSnap = await db.collection("config").doc("stripe").get();
    const stripeConfig = configSnap.exists ? configSnap.data() : {};
    const pilotProPriceId = stripeConfig.prices?.pilot_pro_month
      || process.env.STRIPE_PRICE_PILOT_PRO_MONTH;

    if (!pilotProPriceId) {
      console.warn("[studentVerification] No pilot_pro price configured — coupon applied to customer only");
      return { action: "coupon_deferred", reason: "no_price_configured" };
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: pilotProPriceId }],
      coupon: couponId,
      metadata: { userId, tier: "pilot_pro", source: "student_verification" },
    });

    await userRef.set({
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      tier: "pilot_pro",
      subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { action: "subscription_created", subscriptionId: subscription.id };
  }
}

/**
 * Remove coupon from subscription, then re-apply a new one.
 */
async function replaceCoupon(userId, newCouponId) {
  const db = getDb();
  const stripe = getStripe();
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) throw new Error("User not found");
  const subscriptionId = userSnap.data().stripeSubscriptionId;
  if (!subscriptionId) throw new Error("No active subscription");

  // Remove existing coupon
  await stripe.subscriptions.update(subscriptionId, { coupon: "" });
  // Apply new coupon
  await stripe.subscriptions.update(subscriptionId, { coupon: newCouponId });
  return { subscriptionId };
}

// ═══════════════════════════════════════════════════════════════
//  SUBMIT VERIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Submit student verification.
 * Called from POST /v1/verify:student
 *
 * Body: { school_name, enrollment_type, student_id_photo: { name, type, data } }
 */
async function submitStudentVerification(req, res) {
  const db = getDb();
  const user = req._user; // set by requireFirebaseUser
  const uid = user.uid;
  const { school_name, enrollment_type, student_id_photo } = req.body || {};

  if (!school_name || !enrollment_type) {
    return res.status(400).json({ ok: false, error: "school_name and enrollment_type required" });
  }

  const validTypes = ["university_aviation", "propilot_program", "gi_bill"];
  if (!validTypes.includes(enrollment_type)) {
    return res.status(400).json({ ok: false, error: `enrollment_type must be one of: ${validTypes.join(", ")}` });
  }

  // Upload student ID photo to Firebase Storage
  let photoUrl = null;
  if (student_id_photo && student_id_photo.data) {
    try {
      const bucket = admin.storage().bucket();
      const timestamp = Date.now();
      const ext = (student_id_photo.name || "photo.jpg").split(".").pop() || "jpg";
      const storagePath = `users/${uid}/verification/student_id_${timestamp}.${ext}`;

      const base64Data = student_id_photo.data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const dlToken = require("crypto").randomUUID();
      const file = bucket.file(storagePath);
      await file.save(buffer, {
        metadata: {
          contentType: student_id_photo.type || "image/jpeg",
          metadata: { firebaseStorageDownloadTokens: dlToken },
        },
      });
      photoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${dlToken}`;
    } catch (e) {
      console.error("[studentVerification] Photo upload failed:", e.message);
      // Continue without photo — admin can request it later
    }
  }

  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + 365 * 24 * 60 * 60 * 1000);

  // Update user record
  const userRef = db.collection("users").doc(uid);
  await userRef.set({
    student_verified: true,
    student_verified_at: now,
    student_school_name: school_name,
    student_id_photo_url: photoUrl,
    student_enrollment_type: enrollment_type,
    student_year_expires_at: expiresAt,
    verification_status: "pending_review",
  }, { merge: true });

  // Add to admin spot-check queue
  const userSnap = await userRef.get();
  const userData = userSnap.data();
  await db.collection("admin").doc("verification").collection("student_queue").doc(uid).set({
    name: userData.displayName || userData.name || userData.email,
    email: userData.email,
    school: school_name,
    enrollment_type,
    photo_url: photoUrl,
    submitted_at: now,
    status: "pending",
  });

  // Apply STUDENT coupon
  let stripeResult = null;
  try {
    stripeResult = await applyCoupon(uid, "STUDENT");
  } catch (e) {
    console.error("[studentVerification] Coupon application failed:", e.message);
    // Don't block verification — admin can fix Stripe manually
  }

  // Send welcome email
  const firstName = (userData.displayName || userData.name || "").split(" ")[0] || "there";
  await sendEmail({
    to: userData.email,
    subject: `Welcome to TitleApp, ${firstName}. Your logbook is ready.`,
    htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your student pilot verification is confirmed. Here's what you get:</p>
  <ul style="font-size: 16px; color: #1a202c; line-height: 1.8; padding-left: 20px;">
    <li>Pilot Pro — free while you're enrolled</li>
    <li>Blockchain-verified digital logbook</li>
    <li>ForeFlight auto-import</li>
    <li>PRIA-ready export for checkrides</li>
    <li>AI oral exam prep</li>
  </ul>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your free access renews automatically each year. We'll ask you to re-verify your enrollment about 30 days before renewal — takes less than a minute.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Everything you build in your logbook is yours forever, whether you're a student or not.</p>`),
  });

  return res.json({
    ok: true,
    verification_status: "pending_review",
    student_year_expires_at: expiresAt.toDate().toISOString(),
    stripe: stripeResult,
  });
}

// ═══════════════════════════════════════════════════════════════
//  RENEW VERIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Annual re-verification (user-initiated).
 * Called from POST /v1/verify:student:renew
 *
 * Body: { student_id_photo: { name, type, data } } (optional new photo)
 */
async function renewStudentVerification(req, res) {
  const db = getDb();
  const uid = req._user.uid;
  const { student_id_photo } = req.body || {};

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return res.status(404).json({ ok: false, error: "User not found" });
  const userData = userSnap.data();

  if (!userData.student_verified && !userData.graduation_grace) {
    return res.status(400).json({ ok: false, error: "No active student verification to renew" });
  }

  // Upload new photo if provided
  let photoUrl = userData.student_id_photo_url;
  if (student_id_photo && student_id_photo.data) {
    try {
      const bucket = admin.storage().bucket();
      const timestamp = Date.now();
      const ext = (student_id_photo.name || "photo.jpg").split(".").pop() || "jpg";
      const storagePath = `users/${uid}/verification/student_id_${timestamp}.${ext}`;
      const base64Data = student_id_photo.data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const dlToken = require("crypto").randomUUID();
      const file = bucket.file(storagePath);
      await file.save(buffer, {
        metadata: {
          contentType: student_id_photo.type || "image/jpeg",
          metadata: { firebaseStorageDownloadTokens: dlToken },
        },
      });
      photoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${dlToken}`;
    } catch (e) {
      console.error("[studentVerification] Renewal photo upload failed:", e.message);
    }
  }

  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + 365 * 24 * 60 * 60 * 1000);

  // Extend verification
  await userRef.set({
    student_verified: true,
    student_year_expires_at: expiresAt,
    student_id_photo_url: photoUrl,
    verification_status: "pending_review",
    reminder_30_sent: false,
    reminder_7_sent: false,
    graduation_grace: admin.firestore.FieldValue.delete(),
    graduation_confirmed: admin.firestore.FieldValue.delete(),
  }, { merge: true });

  // Re-apply STUDENT coupon (remove old, apply new)
  try {
    await replaceCoupon(uid, "STUDENT");
  } catch (e) {
    console.error("[studentVerification] Coupon renewal failed:", e.message);
    // Try fresh apply as fallback
    try { await applyCoupon(uid, "STUDENT"); } catch (_) {}
  }

  // Update admin queue
  await db.collection("admin").doc("verification").collection("student_queue").doc(uid).set({
    name: userData.displayName || userData.name || userData.email,
    email: userData.email,
    school: userData.student_school_name,
    enrollment_type: userData.student_enrollment_type,
    photo_url: photoUrl,
    submitted_at: now,
    status: "pending",
  });

  // Confirmation email
  const firstName = (userData.displayName || userData.name || "").split(" ")[0] || "there";
  await sendEmail({
    to: userData.email,
    subject: "You're good for another year.",
    htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your student enrollment is re-verified. Pilot Pro stays free for another 12 months.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Same logbook, same tools, same access. Keep flying.</p>`),
  });

  return res.json({
    ok: true,
    student_year_expires_at: expiresAt.toDate().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════
//  SELF-REPORTED GRADUATION
// ═══════════════════════════════════════════════════════════════

/**
 * User reports they've graduated.
 * Called from POST /v1/verify:student:graduated
 */
async function reportGraduation(req, res) {
  const db = getDb();
  const uid = req._user.uid;

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return res.status(404).json({ ok: false, error: "User not found" });
  const userData = userSnap.data();

  if (!userData.student_verified) {
    return res.status(400).json({ ok: false, error: "No active student verification" });
  }

  // Apply GRADPILOT coupon (3 months free)
  try {
    await replaceCoupon(uid, "GRADPILOT");
  } catch (e) {
    console.error("[studentVerification] GRADPILOT coupon failed:", e.message);
    try { await applyCoupon(uid, "GRADPILOT"); } catch (_) {}
  }

  // Update user record
  await userRef.set({
    graduation_confirmed: true,
    student_verified: false,
    graduation_grace: true,
    graduated_at: admin.firestore.Timestamp.now(),
  }, { merge: true });

  // Remove from student queue
  await db.collection("admin").doc("verification").collection("student_queue").doc(uid).delete().catch(() => {});

  // Congrats email
  const firstName = (userData.displayName || userData.name || "").split(" ")[0] || "there";
  await sendEmail({
    to: userData.email,
    subject: `Congratulations, ${firstName}!`,
    htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Congratulations on graduating. That's a real accomplishment.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your next 3 months of Pilot Pro are on us. After that, it's $29/month — same platform, same logbook, everything you built is still yours.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">The hours you've logged, the currency you've tracked, the checkride prep you've done — none of that goes anywhere. It's your record.</p>`),
  });

  return res.json({ ok: true, grace_months: 3 });
}

// ═══════════════════════════════════════════════════════════════
//  DAILY VERIFICATION CHECK (scheduled Cloud Function)
// ═══════════════════════════════════════════════════════════════

/**
 * Runs daily at 6 AM ET. Checks for expiring student verifications.
 * Sends 30-day and 7-day reminders, applies GRADPILOT on expiry.
 */
async function checkStudentVerifications() {
  const db = getDb();
  const now = Date.now();
  const thirtyDaysFromNow = admin.firestore.Timestamp.fromMillis(now + 30 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = admin.firestore.Timestamp.fromMillis(now + 7 * 24 * 60 * 60 * 1000);
  const nowTs = admin.firestore.Timestamp.fromMillis(now);

  // Query users with active student verification expiring within 30 days
  const snapshot = await db.collection("users")
    .where("student_verified", "==", true)
    .where("student_year_expires_at", "<=", thirtyDaysFromNow)
    .get();

  let reminded30 = 0, reminded7 = 0, graduated = 0, errors = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const uid = doc.id;
    const firstName = (data.displayName || data.name || "").split(" ")[0] || "there";
    const expiresAt = data.student_year_expires_at;

    if (data.graduation_confirmed) continue;

    try {
      const expiresMs = expiresAt.toMillis();
      const daysLeft = Math.ceil((expiresMs - now) / (24 * 60 * 60 * 1000));

      if (daysLeft > 7 && !data.reminder_30_sent) {
        // 30-day reminder
        await sendEmail({
          to: data.email,
          subject: "Your free Pilot Pro access renews in 30 days",
          htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your free student access renews in about ${daysLeft} days. Still enrolled?</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Re-verify in 60 seconds to keep it free. Just upload a current student ID in your account settings.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">If you've graduated — congratulations. Your next 3 months are on us.</p>`),
        });
        await doc.ref.set({ reminder_30_sent: true }, { merge: true });
        reminded30++;
      } else if (daysLeft <= 7 && daysLeft > 0 && !data.reminder_7_sent) {
        // 7-day reminder
        await sendEmail({
          to: data.email,
          subject: "Your free Pilot Pro access expires in 7 days",
          htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your free student access expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Still enrolled? Re-verify now to keep Pilot Pro free for another year.</p>`),
        });
        await doc.ref.set({ reminder_7_sent: true }, { merge: true });
        reminded7++;
      } else if (daysLeft <= 0) {
        // Expired — apply graduation grace
        try {
          await replaceCoupon(uid, "GRADPILOT");
        } catch (e) {
          try { await applyCoupon(uid, "GRADPILOT"); } catch (_) {}
        }

        await doc.ref.set({
          student_verified: false,
          graduation_grace: true,
        }, { merge: true });

        // Remove from student queue
        await db.collection("admin").doc("verification").collection("student_queue").doc(uid).delete().catch(() => {});

        await sendEmail({
          to: data.email,
          subject: "Your student access has ended — 3 months on us",
          htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Looks like you may have graduated — congrats!</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your next 3 months are on us. After that, Pilot Pro is $29/month.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Everything you built — logbook hours, currency tracking, checkride prep — is still yours.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Still enrolled? Reply to this email and we'll extend your free access.</p>`),
        });
        graduated++;
      }
    } catch (e) {
      console.error(`[checkStudentVerifications] Error processing ${uid}:`, e.message);
      errors++;
    }
  }

  console.log(`[checkStudentVerifications] Complete: ${reminded30} 30-day, ${reminded7} 7-day, ${graduated} graduated, ${errors} errors`);
  return { reminded30, reminded7, graduated, errors };
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN: APPROVE / REJECT
// ═══════════════════════════════════════════════════════════════

/**
 * Admin approves a student verification.
 * Called from PUT /v1/admin:verify:student:approve
 * Body: { userId }
 */
async function approveStudent(req, res) {
  const db = getDb();
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: "userId required" });

  await db.collection("users").doc(userId).set({
    verification_status: "approved",
  }, { merge: true });

  await db.collection("admin").doc("verification").collection("student_queue").doc(userId).update({
    status: "approved",
    approved_at: admin.firestore.Timestamp.now(),
  });

  return res.json({ ok: true, status: "approved" });
}

/**
 * Admin rejects a student verification.
 * Called from PUT /v1/admin:verify:student:reject
 * Body: { userId, reason }
 */
async function rejectStudent(req, res) {
  const db = getDb();
  const stripe = getStripe();
  const { userId, reason } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: "userId required" });

  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return res.status(404).json({ ok: false, error: "User not found" });
  const userData = userSnap.data();

  // Remove coupon from subscription
  if (userData.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.update(userData.stripeSubscriptionId, { coupon: "" });
    } catch (e) {
      console.error("[studentVerification] Failed to remove coupon on reject:", e.message);
    }
  }

  await userRef.set({
    student_verified: false,
    verification_status: "rejected",
  }, { merge: true });

  await db.collection("admin").doc("verification").collection("student_queue").doc(userId).update({
    status: "rejected",
    rejected_at: admin.firestore.Timestamp.now(),
    rejection_reason: reason || "",
  });

  // Notify user
  const firstName = (userData.displayName || userData.name || "").split(" ")[0] || "there";
  await sendEmail({
    to: userData.email,
    subject: "Update on your student verification",
    htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">We couldn't verify your enrollment${reason ? ": " + reason : ""}.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Reply to this email if you think this is an error — we'll sort it out.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">You can still use TitleApp. Pilot Pro is $29/month with a 60-day money-back guarantee.</p>`),
  });

  return res.json({ ok: true, status: "rejected" });
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN: LIST QUEUE
// ═══════════════════════════════════════════════════════════════

/**
 * Get student verification queue.
 * Called from GET /v1/admin:verify:student:queue
 */
async function getStudentQueue(req, res) {
  const db = getDb();
  const { status } = req.query || {};

  let query = db.collection("admin").doc("verification").collection("student_queue")
    .orderBy("submitted_at", "desc")
    .limit(100);

  if (status) {
    query = db.collection("admin").doc("verification").collection("student_queue")
      .where("status", "==", status)
      .orderBy("submitted_at", "desc")
      .limit(100);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return res.json({ ok: true, items, count: items.length });
}

module.exports = {
  submitStudentVerification,
  renewStudentVerification,
  reportGraduation,
  checkStudentVerifications,
  approveStudent,
  rejectStudent,
  getStudentQueue,
};
