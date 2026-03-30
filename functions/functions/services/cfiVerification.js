/**
 * cfiVerification.js — CFI/CFII Academy Instructor free access verification
 *
 * Gates free Pilot Pro+ ($49 value) for flight instructors on academy staff.
 * Private/independent CFIs do NOT qualify — must be employed by an academy.
 *
 * Flow: submit (cert + academy ID) → FAA spot-check → admin queue → annual re-verify
 * Departure: CFIPRO coupon (3 months free) → $29/mo Pilot Pro
 *
 * Coupons used:
 *   CFIACADEMY — 100% off pilot_pro_plus for 12 months (renewable)
 *   CFIPRO     — 100% off pilot_pro for 3 months (transition grace)
 *
 * FAA Airmen Inquiry: public lookup at https://amsrvs.registry.faa.gov/airmeninquiry/
 * Used for spot-check only — falls back to manual_review if unavailable.
 */

"use strict";

const admin = require("firebase-admin");
const Stripe = require("stripe");
const { callWithHealthCheck } = require("./apiHealth");

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
    console.warn("[cfiVerification] SENDGRID_API_KEY not set — skipping email");
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
    console.error("[cfiVerification] SendGrid error:", res.status, errText);
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
//  FAA AIRMEN INQUIRY
// ═══════════════════════════════════════════════════════════════

/**
 * Spot-check a CFI/CFII cert number against the FAA Airmen Inquiry.
 * This is a public lookup — no API key needed.
 * Returns { found: bool, hasCfi: bool, ratings: string[] } or null on failure.
 *
 * If the endpoint is unavailable, returns null (falls back to manual_review).
 */
async function checkFaaCert(certNumber) {
  const url = `https://amsrvs.registry.faa.gov/airmeninquiry/Main.aspx?certNum=${encodeURIComponent(certNumber)}`;

  const healthResult = await callWithHealthCheck({
    serviceName: "faa_airmen",
    fn: async () => {
      const r = await fetch(url, {
        method: "GET",
        headers: { "User-Agent": "TitleApp-Verification/1.0" },
      });
      if (!r.ok) throw new Error(`FAA lookup returned ${r.status}`);
      return r.text();
    },
    timeout: 10000,
  });

  if (!healthResult.success) {
    console.warn("[cfiVerification] FAA lookup failed:", healthResult.error);
    return null; // Fail open → manual_review
  }

  const html = healthResult.data;

  // Look for certificate type indicators in the response
  const hasCfi = /flight instructor/i.test(html) || /CFI/i.test(html);
  const hasCfii = /instrument/i.test(html) && hasCfi;
  const hasMei = /multi.?engine/i.test(html) && /instructor/i.test(html);

  const ratings = [];
  if (hasCfi) ratings.push("CFI");
  if (hasCfii) ratings.push("CFII");
  if (hasMei) ratings.push("MEI");

  const found = html.length > 1000 && !(/no records found/i.test(html));

  return { found, hasCfi, ratings };
}

// ═══════════════════════════════════════════════════════════════
//  STRIPE HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Apply a coupon to an existing subscription, or create a new subscription
 * with the coupon if none exists.
 *
 * @param {string} userId
 * @param {string} couponId - Stripe coupon ID
 * @param {string} product - 'pilot_pro_plus' or 'pilot_pro'
 */
async function applyCoupon(userId, couponId, product = "pilot_pro_plus") {
  const db = getDb();
  const stripe = getStripe();
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new Error("User not found");
  const userData = userSnap.data();

  // Ensure Stripe customer
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
    try {
      await stripe.subscriptions.update(subscriptionId, { coupon: couponId });
      return { action: "coupon_applied", subscriptionId };
    } catch (e) {
      console.error(`[cfiVerification] Failed to apply coupon ${couponId}:`, e.message);
      throw e;
    }
  } else {
    const configSnap = await db.collection("config").doc("stripe").get();
    const stripeConfig = configSnap.exists ? configSnap.data() : {};
    const priceKey = product === "pilot_pro_plus" ? "pilot_pro_plus_month" : "pilot_pro_month";
    const priceId = stripeConfig.prices?.[priceKey]
      || process.env[`STRIPE_PRICE_${priceKey.toUpperCase()}`];

    if (!priceId) {
      console.warn(`[cfiVerification] No ${product} price configured`);
      return { action: "coupon_deferred", reason: "no_price_configured" };
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      coupon: couponId,
      metadata: { userId, tier: product, source: "cfi_verification" },
    });

    await userRef.set({
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      tier: product,
      subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { action: "subscription_created", subscriptionId: subscription.id };
  }
}

async function replaceCoupon(userId, newCouponId) {
  const db = getDb();
  const stripe = getStripe();
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) throw new Error("User not found");
  const subscriptionId = userSnap.data().stripeSubscriptionId;
  if (!subscriptionId) throw new Error("No active subscription");

  await stripe.subscriptions.update(subscriptionId, { coupon: "" });
  await stripe.subscriptions.update(subscriptionId, { coupon: newCouponId });
  return { subscriptionId };
}

// ═══════════════════════════════════════════════════════════════
//  SUBMIT VERIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Submit CFI/CFII verification.
 * Called from POST /v1/verify:cfi
 *
 * Body: {
 *   cfi_cert_number, cfi_rating: ['CFI','CFII','MEI'],
 *   academy_name, academy_employee_id_photo: { name, type, data }
 * }
 */
async function submitCfiVerification(req, res) {
  const db = getDb();
  const user = req._user;
  const uid = user.uid;
  const { cfi_cert_number, cfi_rating, academy_name, academy_employee_id_photo } = req.body || {};

  if (!cfi_cert_number || !academy_name) {
    return res.status(400).json({ ok: false, error: "cfi_cert_number and academy_name required" });
  }

  const validRatings = ["CFI", "CFII", "MEI"];
  const ratings = Array.isArray(cfi_rating) ? cfi_rating.filter(r => validRatings.includes(r)) : [];
  if (ratings.length === 0) {
    return res.status(400).json({ ok: false, error: "At least one valid cfi_rating required (CFI, CFII, MEI)" });
  }

  // Upload academy employee ID photo
  let photoUrl = null;
  if (academy_employee_id_photo && academy_employee_id_photo.data) {
    try {
      const bucket = admin.storage().bucket();
      const timestamp = Date.now();
      const ext = (academy_employee_id_photo.name || "photo.jpg").split(".").pop() || "jpg";
      const storagePath = `users/${uid}/verification/cfi_id_${timestamp}.${ext}`;
      const base64Data = academy_employee_id_photo.data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const dlToken = require("crypto").randomUUID();
      const file = bucket.file(storagePath);
      await file.save(buffer, {
        metadata: {
          contentType: academy_employee_id_photo.type || "image/jpeg",
          metadata: { firebaseStorageDownloadTokens: dlToken },
        },
      });
      photoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${dlToken}`;
    } catch (e) {
      console.error("[cfiVerification] Photo upload failed:", e.message);
    }
  }

  // FAA Airmen Inquiry spot-check
  const faaResult = await checkFaaCert(cfi_cert_number);
  let verificationStatus;
  let faaCheckStatus;

  if (faaResult === null) {
    // FAA endpoint unavailable — fall back to manual review
    verificationStatus = "manual_review";
    faaCheckStatus = "unavailable";
  } else if (faaResult.found && faaResult.hasCfi) {
    // Cert found with CFI rating — auto-approve
    verificationStatus = "cert_verified";
    faaCheckStatus = "verified";
  } else {
    // Cert not found or no CFI rating — manual review
    verificationStatus = "manual_review";
    faaCheckStatus = faaResult.found ? "no_cfi_rating" : "not_found";
  }

  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + 365 * 24 * 60 * 60 * 1000);

  // Update user record
  const userRef = db.collection("users").doc(uid);
  await userRef.set({
    cfi_verified: true,
    cfi_verified_at: now,
    cfi_cert_number,
    cfi_ratings: ratings,
    academy_name,
    academy_employee_id_photo_url: photoUrl,
    cfi_year_expires_at: expiresAt,
    verification_status: verificationStatus,
    faa_check_status: faaCheckStatus,
  }, { merge: true });

  // Add to admin queue
  const userSnap = await userRef.get();
  const userData = userSnap.data();
  await db.collection("admin").doc("verification").collection("cfi_queue").doc(uid).set({
    name: userData.displayName || userData.name || userData.email,
    email: userData.email,
    cert_number: cfi_cert_number,
    ratings,
    academy: academy_name,
    photo_url: photoUrl,
    submitted_at: now,
    faa_check_status: faaCheckStatus,
    status: verificationStatus === "cert_verified" ? "cert_verified" : "pending",
  });

  // Apply coupon only if cert verified (auto-approved)
  let stripeResult = null;
  if (verificationStatus === "cert_verified") {
    try {
      stripeResult = await applyCoupon(uid, "CFIACADEMY", "pilot_pro_plus");
    } catch (e) {
      console.error("[cfiVerification] Coupon application failed:", e.message);
    }

    // Welcome email
    const firstName = (userData.displayName || userData.name || "").split(" ")[0] || "there";
    await sendEmail({
      to: userData.email,
      subject: `Welcome, ${firstName}. Your Pro+ access is active.`,
      htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your CFI credentials are verified. Here's what you get with Pilot Pro+:</p>
  <ul style="font-size: 16px; color: #1a202c; line-height: 1.8; padding-left: 20px;">
    <li>Everything in Pilot Pro</li>
    <li>Unlimited aircraft profiles</li>
    <li>Personal flight planning and weather</li>
    <li>Personal FRAT</li>
    <li>Alex — your personal aviation assistant</li>
  </ul>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Free while you're on academy staff. We'll ask you to re-verify once a year — takes less than a minute.</p>`),
    });
  } else {
    // Manual review notification
    const firstName = (userData.displayName || userData.name || "").split(" ")[0] || "there";
    await sendEmail({
      to: userData.email,
      subject: "We're reviewing your credentials",
      htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">We're reviewing your CFI credentials. This usually takes less than 24 hours.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Once approved, you'll get full Pilot Pro+ access — free while you're on academy staff.</p>`),
    });
  }

  return res.json({
    ok: true,
    verification_status: verificationStatus,
    faa_check_status: faaCheckStatus,
    cfi_year_expires_at: expiresAt.toDate().toISOString(),
    stripe: stripeResult,
  });
}

// ═══════════════════════════════════════════════════════════════
//  RENEW VERIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Annual re-verification (user-initiated).
 * Called from POST /v1/verify:cfi:renew
 *
 * Body: { academy_employee_id_photo: { name, type, data } } (optional)
 */
async function renewCfiVerification(req, res) {
  const db = getDb();
  const uid = req._user.uid;
  const { academy_employee_id_photo } = req.body || {};

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return res.status(404).json({ ok: false, error: "User not found" });
  const userData = userSnap.data();

  if (!userData.cfi_verified && !userData.cfi_departure_grace) {
    return res.status(400).json({ ok: false, error: "No active CFI verification to renew" });
  }

  // Upload new photo if provided
  let photoUrl = userData.academy_employee_id_photo_url;
  if (academy_employee_id_photo && academy_employee_id_photo.data) {
    try {
      const bucket = admin.storage().bucket();
      const timestamp = Date.now();
      const ext = (academy_employee_id_photo.name || "photo.jpg").split(".").pop() || "jpg";
      const storagePath = `users/${uid}/verification/cfi_id_${timestamp}.${ext}`;
      const base64Data = academy_employee_id_photo.data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const dlToken = require("crypto").randomUUID();
      const file = bucket.file(storagePath);
      await file.save(buffer, {
        metadata: {
          contentType: academy_employee_id_photo.type || "image/jpeg",
          metadata: { firebaseStorageDownloadTokens: dlToken },
        },
      });
      photoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${dlToken}`;
    } catch (e) {
      console.error("[cfiVerification] Renewal photo upload failed:", e.message);
    }
  }

  // Re-check FAA cert
  const faaResult = await checkFaaCert(userData.cfi_cert_number);
  const faaCheckStatus = faaResult === null ? "unavailable"
    : (faaResult.found && faaResult.hasCfi) ? "verified" : "needs_review";

  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + 365 * 24 * 60 * 60 * 1000);

  await userRef.set({
    cfi_verified: true,
    cfi_year_expires_at: expiresAt,
    academy_employee_id_photo_url: photoUrl,
    faa_check_status: faaCheckStatus,
    verification_status: faaCheckStatus === "verified" ? "cert_verified" : "pending_review",
    reminder_30_sent: false,
    reminder_7_sent: false,
    cfi_departure_grace: admin.firestore.FieldValue.delete(),
    cfi_departure_confirmed: admin.firestore.FieldValue.delete(),
  }, { merge: true });

  // Re-apply CFIACADEMY coupon
  try {
    await replaceCoupon(uid, "CFIACADEMY");
  } catch (e) {
    console.error("[cfiVerification] Coupon renewal failed:", e.message);
    try { await applyCoupon(uid, "CFIACADEMY", "pilot_pro_plus"); } catch (_) {}
  }

  // Update tier back to pro+
  await userRef.set({ tier: "pilot_pro_plus" }, { merge: true });

  // Update admin queue
  await db.collection("admin").doc("verification").collection("cfi_queue").doc(uid).set({
    name: userData.displayName || userData.name || userData.email,
    email: userData.email,
    cert_number: userData.cfi_cert_number,
    ratings: userData.cfi_ratings,
    academy: userData.academy_name,
    photo_url: photoUrl,
    submitted_at: now,
    faa_check_status: faaCheckStatus,
    status: "pending",
  });

  const firstName = (userData.displayName || userData.name || "").split(" ")[0] || "there";
  await sendEmail({
    to: userData.email,
    subject: "You're good for another year.",
    htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your CFI credentials are re-verified. Pilot Pro+ stays free for another 12 months.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Keep instructing, keep logging.</p>`),
  });

  return res.json({
    ok: true,
    cfi_year_expires_at: expiresAt.toDate().toISOString(),
    faa_check_status: faaCheckStatus,
  });
}

// ═══════════════════════════════════════════════════════════════
//  DEPARTURE (mirrors student graduation)
// ═══════════════════════════════════════════════════════════════

/**
 * CFI reports departure from academy.
 * Called from POST /v1/verify:cfi:departed
 */
async function reportDeparture(req, res) {
  const db = getDb();
  const uid = req._user.uid;

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return res.status(404).json({ ok: false, error: "User not found" });
  const userData = userSnap.data();

  if (!userData.cfi_verified) {
    return res.status(400).json({ ok: false, error: "No active CFI verification" });
  }

  // Apply CFIPRO coupon (3 months free on Pilot Pro — downgrade from Pro+)
  try {
    await replaceCoupon(uid, "CFIPRO");
  } catch (e) {
    console.error("[cfiVerification] CFIPRO coupon failed:", e.message);
    try { await applyCoupon(uid, "CFIPRO", "pilot_pro"); } catch (_) {}
  }

  await userRef.set({
    cfi_departure_confirmed: true,
    cfi_verified: false,
    cfi_departure_grace: true,
    cfi_departed_at: admin.firestore.Timestamp.now(),
    tier: "pilot_pro", // Downgrade from pro+ to pro
  }, { merge: true });

  // Remove from CFI queue
  await db.collection("admin").doc("verification").collection("cfi_queue").doc(uid).delete().catch(() => {});

  const firstName = (userData.displayName || userData.name || "").split(" ")[0] || "there";
  await sendEmail({
    to: userData.email,
    subject: `Congrats on your next chapter, ${firstName}.`,
    htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Congrats on your next chapter. Your next 3 months are on us.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">After that, Pilot Pro is $29/month. Everything you built — logbook hours, student endorsements, aircraft profiles — is still yours.</p>`),
  });

  return res.json({ ok: true, grace_months: 3 });
}

// ═══════════════════════════════════════════════════════════════
//  DAILY VERIFICATION CHECK (scheduled Cloud Function)
// ═══════════════════════════════════════════════════════════════

/**
 * Runs daily at 6 AM ET. Checks for expiring CFI verifications.
 */
async function checkCfiVerifications() {
  const db = getDb();
  const now = Date.now();
  const thirtyDaysFromNow = admin.firestore.Timestamp.fromMillis(now + 30 * 24 * 60 * 60 * 1000);
  const nowTs = admin.firestore.Timestamp.fromMillis(now);

  const snapshot = await db.collection("users")
    .where("cfi_verified", "==", true)
    .where("cfi_year_expires_at", "<=", thirtyDaysFromNow)
    .get();

  let reminded30 = 0, reminded7 = 0, departed = 0, errors = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const uid = doc.id;
    const firstName = (data.displayName || data.name || "").split(" ")[0] || "there";
    const expiresAt = data.cfi_year_expires_at;

    if (data.cfi_departure_confirmed) continue;

    try {
      const expiresMs = expiresAt.toMillis();
      const daysLeft = Math.ceil((expiresMs - now) / (24 * 60 * 60 * 1000));

      if (daysLeft > 7 && !data.reminder_30_sent) {
        await sendEmail({
          to: data.email,
          subject: "Your free Pro+ access renews in 30 days",
          htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your free CFI access renews in about ${daysLeft} days. Still on academy staff?</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Re-verify your academy employment in your account settings to keep Pro+ free for another year.</p>`),
        });
        await doc.ref.set({ reminder_30_sent: true }, { merge: true });
        reminded30++;
      } else if (daysLeft <= 7 && daysLeft > 0 && !data.reminder_7_sent) {
        await sendEmail({
          to: data.email,
          subject: "Your free Pro+ access expires in 7 days",
          htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your free CFI access expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Still at the academy? Re-verify now to keep Pilot Pro+ free for another year.</p>`),
        });
        await doc.ref.set({ reminder_7_sent: true }, { merge: true });
        reminded7++;
      } else if (daysLeft <= 0) {
        // Expired — apply CFIPRO transition grace
        try {
          await replaceCoupon(uid, "CFIPRO");
        } catch (e) {
          try { await applyCoupon(uid, "CFIPRO", "pilot_pro"); } catch (_) {}
        }

        await doc.ref.set({
          cfi_verified: false,
          cfi_departure_grace: true,
          tier: "pilot_pro",
        }, { merge: true });

        await db.collection("admin").doc("verification").collection("cfi_queue").doc(uid).delete().catch(() => {});

        await sendEmail({
          to: data.email,
          subject: "Your CFI access has ended — 3 months on us",
          htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">It looks like you may have moved on from the academy. Your next 3 months of Pilot Pro are on us.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">After that, Pilot Pro is $29/month. Everything you built is still yours.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Still on academy staff? Reply to this email and we'll extend your Pro+ access.</p>`),
        });
        departed++;
      }
    } catch (e) {
      console.error(`[checkCfiVerifications] Error processing ${uid}:`, e.message);
      errors++;
    }
  }

  console.log(`[checkCfiVerifications] Complete: ${reminded30} 30-day, ${reminded7} 7-day, ${departed} departed, ${errors} errors`);
  return { reminded30, reminded7, departed, errors };
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN: APPROVE / REJECT
// ═══════════════════════════════════════════════════════════════

/**
 * Admin approves a CFI verification.
 * Called from PUT /v1/admin:verify:cfi:approve
 * Body: { userId }
 */
async function approveCfi(req, res) {
  const db = getDb();
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: "userId required" });

  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return res.status(404).json({ ok: false, error: "User not found" });
  const userData = userSnap.data();

  await userRef.set({ verification_status: "approved" }, { merge: true });

  await db.collection("admin").doc("verification").collection("cfi_queue").doc(userId).update({
    status: "approved",
    approved_at: admin.firestore.Timestamp.now(),
  });

  // If was in manual_review, apply coupon now
  if (userData.verification_status === "manual_review") {
    try {
      await applyCoupon(userId, "CFIACADEMY", "pilot_pro_plus");
    } catch (e) {
      console.error("[cfiVerification] Coupon apply on admin approve failed:", e.message);
    }

    // Send approval email
    const firstName = (userData.displayName || userData.name || "").split(" ")[0] || "there";
    await sendEmail({
      to: userData.email,
      subject: `You're approved, ${firstName}. Pro+ is active.`,
      htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Your CFI credentials are approved. Pilot Pro+ is now active — free while you're on academy staff.</p>`),
    });
  }

  return res.json({ ok: true, status: "approved" });
}

/**
 * Admin rejects a CFI verification.
 * Called from PUT /v1/admin:verify:cfi:reject
 * Body: { userId, reason }
 */
async function rejectCfi(req, res) {
  const db = getDb();
  const stripe = getStripe();
  const { userId, reason } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: "userId required" });

  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return res.status(404).json({ ok: false, error: "User not found" });
  const userData = userSnap.data();

  // Remove coupon if applied
  if (userData.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.update(userData.stripeSubscriptionId, { coupon: "" });
    } catch (e) {
      console.error("[cfiVerification] Failed to remove coupon on reject:", e.message);
    }
  }

  await userRef.set({
    cfi_verified: false,
    verification_status: "rejected",
  }, { merge: true });

  await db.collection("admin").doc("verification").collection("cfi_queue").doc(userId).update({
    status: "rejected",
    rejected_at: admin.firestore.Timestamp.now(),
    rejection_reason: reason || "",
  });

  const firstName = (userData.displayName || userData.name || "").split(" ")[0] || "there";
  await sendEmail({
    to: userData.email,
    subject: "Update on your CFI verification",
    htmlBody: emailTemplate(firstName, `
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">We couldn't verify your academy employment${reason ? ": " + reason : ""}.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Note: free Pro+ access is for CFI/CFII instructors currently on staff at a flight academy. Private or independent instructors are not eligible for this program.</p>
  <p style="font-size: 16px; color: #1a202c; line-height: 1.6;">Reply to this email if you think this is an error.</p>`),
  });

  return res.json({ ok: true, status: "rejected" });
}

/**
 * Get CFI verification queue.
 * Called from GET /v1/admin:verify:cfi:queue
 */
async function getCfiQueue(req, res) {
  const db = getDb();
  const { status } = req.query || {};

  let query = db.collection("admin").doc("verification").collection("cfi_queue")
    .orderBy("submitted_at", "desc")
    .limit(100);

  if (status) {
    query = db.collection("admin").doc("verification").collection("cfi_queue")
      .where("status", "==", status)
      .orderBy("submitted_at", "desc")
      .limit(100);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return res.json({ ok: true, items, count: items.length });
}

module.exports = {
  submitCfiVerification,
  renewCfiVerification,
  reportDeparture,
  checkCfiVerifications,
  approveCfi,
  rejectCfi,
  getCfiQueue,
  checkFaaCert,
};
