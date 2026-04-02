/**
 * workerTrial.js — Trial State Machine & Subscription Tracking
 *
 * States: not_started → trial_active → trial_ending → trial_expired → subscribed | cancelled
 *
 * Trial clock starts on magic link authentication — not on email submission.
 *
 * Collection: subscriptions/{userId}_{workerId}
 *
 * Cloud Scheduler runs daily to check trial expiry:
 *   - Day 12: send in-chat message (trial_ending)
 *   - Day 14: send final message
 *   - Day 15: suspend access (trial_expired)
 *
 * Suite subscriptions: all suite workers added in one transaction.
 */

"use strict";

const admin = require("firebase-admin");
const { TRIAL_ACTIVE, SUBSCRIBED, TRIAL_EXPIRED, CANCELLED, TRIAL_ENDING, NOT_STARTED } = require("../config/subscriptionStatus");

function getDb() { return admin.firestore(); }

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";

async function sendEmail({ to, subject, htmlBody }) {
  if (!SENDGRID_API_KEY) {
    console.warn("[workerTrial] SENDGRID_API_KEY not set — skipping email");
    return;
  }
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "alex@titleapp.ai", name: "TitleApp" },
      subject,
      content: [{ type: "text/html", value: htmlBody }],
    }),
  });
}

// ═══════════════════════════════════════════════════════════════
//  START TRIAL
// ═══════════════════════════════════════════════════════════════

/**
 * Start a trial for a user on a worker.
 * Called from magic link verification — not directly by T1.
 */
async function startTrial(userId, workerId) {
  const db = getDb();
  const subId = `${userId}_${workerId}`;
  const subRef = db.collection("subscriptions").doc(subId);
  const subSnap = await subRef.get();

  // If already subscribed, don't overwrite
  if (subSnap.exists) {
    const data = subSnap.data();
    if (data.trialStatus === SUBSCRIBED) {
      return { status: "already_subscribed", trialStatus: SUBSCRIBED };
    }
    if (data.trialStatus === TRIAL_ACTIVE || data.trialStatus === TRIAL_ENDING) {
      return { status: "trial_already_active", trialStatus: data.trialStatus };
    }
  }

  // Get worker to read trialDays
  const workerSnap = await db.collection("workers").doc(workerId).get();
  const trialDays = workerSnap.exists ? (workerSnap.data().trialDays || 14) : 14;

  const now = admin.firestore.Timestamp.now();
  const trialEndsAt = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + trialDays * 24 * 60 * 60 * 1000
  );

  const subscriptionData = {
    userId,
    workerId,
    trialStatus: trialDays === 0 ? NOT_STARTED : TRIAL_ACTIVE,
    trialStartedAt: now,
    trialDays,
    trialEndsAt,
    day12NotifiedAt: null,
    day14NotifiedAt: null,
    subscribedAt: null,
    cancelledAt: null,
    createdAt: now,
  };

  await subRef.set(subscriptionData, { merge: true });

  // If trialDays is 0, subscriber must pay immediately
  if (trialDays === 0) {
    return {
      status: "no_trial",
      trialStatus: NOT_STARTED,
      requiresPayment: true,
    };
  }

  return {
    status: "trial_started",
    trialStatus: TRIAL_ACTIVE,
    trialDays,
    trialEndsAt: trialEndsAt.toDate().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
//  GET SUBSCRIPTION STATUS
// ═══════════════════════════════════════════════════════════════

/**
 * Get subscription/trial status for a user + worker.
 * GET /v1/subscription:status
 * Query: ?workerId=xxx
 */
async function getSubscriptionStatus(req, res) {
  const db = getDb();
  const user = req._user;
  const { workerId } = req.query || {};

  if (!workerId) return res.status(400).json({ ok: false, error: "workerId required" });

  const subId = `${user.uid}_${workerId}`;
  const subSnap = await db.collection("subscriptions").doc(subId).get();

  if (!subSnap.exists) {
    return res.json({ ok: true, subscription: null, trialStatus: NOT_STARTED });
  }

  const data = subSnap.data();

  // Calculate days remaining
  let daysRemaining = null;
  if (data.trialEndsAt && (data.trialStatus === TRIAL_ACTIVE || data.trialStatus === TRIAL_ENDING)) {
    const endsMs = data.trialEndsAt._seconds
      ? data.trialEndsAt._seconds * 1000
      : data.trialEndsAt.toMillis ? data.trialEndsAt.toMillis() : 0;
    daysRemaining = Math.max(0, Math.ceil((endsMs - Date.now()) / (24 * 60 * 60 * 1000)));
  }

  return res.json({
    ok: true,
    subscription: {
      trialStatus: data.trialStatus,
      trialStartedAt: data.trialStartedAt || null,
      trialEndsAt: data.trialEndsAt || null,
      trialDays: data.trialDays || 14,
      daysRemaining,
      subscribedAt: data.subscribedAt || null,
      cancelledAt: data.cancelledAt || null,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
//  ACTIVATE SUBSCRIPTION (after Stripe checkout)
// ═══════════════════════════════════════════════════════════════

/**
 * Mark a trial as converted to paid subscription.
 * POST /v1/subscription:activate
 * Body: { workerId, stripeSubscriptionId }
 */
async function activateSubscription(req, res) {
  const db = getDb();
  const user = req._user;
  const { workerId, stripeSubscriptionId } = req.body || {};

  if (!workerId) return res.status(400).json({ ok: false, error: "workerId required" });

  const subId = `${user.uid}_${workerId}`;
  const subRef = db.collection("subscriptions").doc(subId);

  await subRef.set({
    trialStatus: SUBSCRIBED,
    subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
    stripeSubscriptionId: stripeSubscriptionId || null,
  }, { merge: true });

  return res.json({ ok: true, trialStatus: SUBSCRIBED });
}

// ═══════════════════════════════════════════════════════════════
//  CANCEL SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════

/**
 * Cancel a subscription. Access continues to end of billing period.
 * POST /v1/subscription:cancel
 * Body: { workerId }
 */
async function cancelSubscription(req, res) {
  const db = getDb();
  const user = req._user;
  const { workerId } = req.body || {};

  if (!workerId) return res.status(400).json({ ok: false, error: "workerId required" });

  const subId = `${user.uid}_${workerId}`;
  const subRef = db.collection("subscriptions").doc(subId);
  const subSnap = await subRef.get();

  if (!subSnap.exists) {
    return res.status(404).json({ ok: false, error: "No subscription found" });
  }

  await subRef.update({
    trialStatus: CANCELLED,
    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return res.json({ ok: true, trialStatus: CANCELLED });
}

// ═══════════════════════════════════════════════════════════════
//  SUITE SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════

/**
 * Subscribe to all workers in a suite at once.
 * POST /v1/subscription:suite
 * Body: { suiteId, stripeSubscriptionId }
 */
async function subscribeSuite(req, res) {
  const db = getDb();
  const user = req._user;
  const { suiteId, stripeSubscriptionId } = req.body || {};

  if (!suiteId) return res.status(400).json({ ok: false, error: "suiteId required" });

  const suiteSnap = await db.collection("suites").doc(suiteId).get();
  if (!suiteSnap.exists) return res.status(404).json({ ok: false, error: "Suite not found" });

  const suiteData = suiteSnap.data();
  const workerIds = suiteData.workerIds || [];

  if (workerIds.length === 0) {
    return res.status(400).json({ ok: false, error: "Suite has no workers" });
  }

  // Add all suite workers in one batch
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const workerId of workerIds) {
    const subId = `${user.uid}_${workerId}`;
    const subRef = db.collection("subscriptions").doc(subId);
    batch.set(subRef, {
      userId: user.uid,
      workerId,
      trialStatus: SUBSCRIBED,
      subscribedAt: now,
      suiteId,
      stripeSubscriptionId: stripeSubscriptionId || null,
      createdAt: now,
    }, { merge: true });
  }

  await batch.commit();

  return res.json({
    ok: true,
    suiteId,
    workerCount: workerIds.length,
    trialStatus: SUBSCRIBED,
  });
}

// ═══════════════════════════════════════════════════════════════
//  TRIAL EXPIRY CHECK — Cloud Scheduler (daily)
// ═══════════════════════════════════════════════════════════════

/**
 * Runs daily. Checks all active trials and applies expiry logic:
 *   - Day 12: set trial_ending, send day 12 notification
 *   - Day 14: send final notification
 *   - Day 15+: set trial_expired, suspend access
 */
async function checkTrialExpiry() {
  const db = getDb();
  const now = Date.now();
  let day12Count = 0, day14Count = 0, expiredCount = 0, errors = 0;

  // Query active trials
  const activeTrials = await db.collection("subscriptions")
    .where("trialStatus", "in", [TRIAL_ACTIVE, TRIAL_ENDING])
    .get();

  for (const doc of activeTrials.docs) {
    const data = doc.data();
    const endsMs = data.trialEndsAt?._seconds
      ? data.trialEndsAt._seconds * 1000
      : data.trialEndsAt?.toMillis ? data.trialEndsAt.toMillis() : 0;

    if (!endsMs) continue;

    const daysLeft = Math.ceil((endsMs - now) / (24 * 60 * 60 * 1000));

    try {
      // Day 12 notification (2 days left)
      if (daysLeft <= 2 && daysLeft > 0 && !data.day12NotifiedAt) {
        await doc.ref.update({
          trialStatus: TRIAL_ENDING,
          day12NotifiedAt: admin.firestore.Timestamp.now(),
        });

        // Write in-chat message via chatMessages
        await db.collection("chatMessages").add({
          userId: data.userId,
          workerId: data.workerId,
          role: "worker",
          type: "trial_ending",
          content: buildDay12Message(data, daysLeft),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          system: true,
        });

        // Also email the subscriber
        const userSnap = await db.collection("users").doc(data.userId).get();
        if (userSnap.exists && userSnap.data().email) {
          const workerSnap = await db.collection("workers").doc(data.workerId).get();
          const workerName = workerSnap.exists ? workerSnap.data().name : "your worker";
          const price = workerSnap.exists ? (workerSnap.data().monthlyPrice || 49) : 49;
          await sendEmail({
            to: userSnap.data().email,
            subject: `Your trial of ${workerName} ends in ${daysLeft} days`,
            htmlBody: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <span style="font-size: 20px; font-weight: 700; color: #7c3aed;">TitleApp</span>
              <p style="margin-top: 24px; font-size: 16px; color: #1a202c;">Your free trial of <strong>${workerName}</strong> ends in ${daysLeft} days.</p>
              <p style="font-size: 16px; color: #1a202c;">Subscribe for $${price}/month to keep access.</p>
              <a href="https://app.titleapp.ai" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #7c3aed; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Subscribe Now</a>
            </div>`,
          });
        }

        day12Count++;
      }

      // Day 14 notification (last day)
      if (daysLeft <= 0 && daysLeft > -1 && !data.day14NotifiedAt) {
        await doc.ref.update({
          day14NotifiedAt: admin.firestore.Timestamp.now(),
        });

        await db.collection("chatMessages").add({
          userId: data.userId,
          workerId: data.workerId,
          role: "worker",
          type: "trial_expired",
          content: buildDay14Message(data),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          system: true,
        });

        day14Count++;
      }

      // Day 15+: expire trial
      if (daysLeft < -1 && data.trialStatus !== TRIAL_EXPIRED) {
        await doc.ref.update({
          trialStatus: TRIAL_EXPIRED,
        });
        expiredCount++;
      }
    } catch (e) {
      console.error(`[checkTrialExpiry] Error processing ${doc.id}:`, e.message);
      errors++;
    }
  }

  console.log(`[checkTrialExpiry] day12: ${day12Count}, day14: ${day14Count}, expired: ${expiredCount}, errors: ${errors}`);
  return { day12Count, day14Count, expiredCount, errors };
}

function buildDay12Message(data, daysLeft) {
  return `Your free trial wraps up in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Subscribe to keep access — no interruption, no data loss.`;
}

function buildDay14Message(data) {
  return `Your trial has ended. Subscribe to keep using this worker. Your conversation history is saved and waiting for you.`;
}

module.exports = {
  startTrial,
  getSubscriptionStatus,
  activateSubscription,
  cancelSubscription,
  subscribeSuite,
  checkTrialExpiry,
};
