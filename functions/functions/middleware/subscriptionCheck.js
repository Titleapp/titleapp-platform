/**
 * subscriptionCheck.js — Subscription enforcement middleware
 *
 * Checks that a jurisdiction has an active Stripe subscription for a given worker
 * before allowing execution. Enforces:
 *   - Active subscription required (stripe_required from TIER_0)
 *   - 7-day grace period after lapse
 *   - Read-only mode when grace period active
 *   - Full block after grace expires
 */

const admin = require("firebase-admin");
const { isActive, normalizeLegacyStatus } = require("../config/subscriptionStatus");

function getDb() {
  return admin.firestore();
}

const GRACE_PERIOD_DAYS = 7;
const MS_PER_DAY = 86400000;

/**
 * Check if a jurisdiction/tenant has an active subscription for a worker.
 *
 * @param {string} workerId — e.g. "GOV-001"
 * @param {string} tenantId — tenant or jurisdiction FIPS
 * @param {object} [opts]
 * @param {boolean} [opts.isWriteOperation=true] — false for read-only queries
 * @returns {Promise<{allowed: boolean, readOnly: boolean, reason: string|null, subscription: object|null}>}
 */
async function requireActiveSubscription(workerId, tenantId, opts = {}) {
  const { isWriteOperation = true } = opts;
  const db = getDb();

  // FREE workers (Alex, GOV-000) skip subscription check
  const freeWorkers = [
    "GOV-000", "GOV-015", "GOV-030", "GOV-040", "GOV-057",
    "ESC-012",
  ];
  if (freeWorkers.includes(workerId)) {
    return { allowed: true, readOnly: false, reason: null, subscription: null };
  }

  // Look up subscription status. Stripe webhook writes to two places:
  //   1. users/{uid} — stripeSubscriptionId, stripeSubscriptionStatus, tier
  //   2. subscriptions/{id} — if worker-level subscriptions are created
  // Check both: worker-level subscriptions collection first, then user-level fallback.

  // Strategy 1: Worker-level subscriptions collection (GOV workers use this)
  const subSnap = await db.collection("subscriptions")
    .where("tenantId", "==", tenantId)
    .where("workerId", "==", workerId)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  let sub = null;

  if (!subSnap.empty) {
    sub = { id: subSnap.docs[0].id, ...subSnap.docs[0].data() };
  } else {
    // Strategy 2: User-level subscription on the users collection
    // (existing Stripe webhook writes stripeSubscriptionStatus to users/{uid})
    const userSnap = await db.collection("users")
      .where("tenantId", "==", tenantId)
      .where("stripeSubscriptionStatus", "in", ["active", "past_due", "canceled"])
      .limit(1)
      .get();

    if (!userSnap.empty) {
      const userData = userSnap.docs[0].data();
      sub = {
        id: userSnap.docs[0].id,
        status: userData.stripeSubscriptionStatus || "canceled",
        stripeSubscriptionId: userData.stripeSubscriptionId || null,
        tier: userData.tier || "free",
        pastDueSince: userData.subscriptionPastDueSince || null,
      };
    }
  }

  if (!sub) {
    return {
      allowed: false,
      readOnly: false,
      reason: "no_subscription",
      subscription: null,
    };
  }

  // Active subscription — full access (canonical trialStatus, with legacy fallback)
  if (isActive(sub.trialStatus || normalizeLegacyStatus(sub.status))) {
    return { allowed: true, readOnly: false, reason: null, subscription: sub };
  }

  // Past due — check grace period (Stripe writes stripeSubscriptionStatus on user doc)
  if (sub.stripeSubscriptionStatus === "past_due" || sub.status === "past_due") {
    const pastDueSince = sub.pastDueSince
      ? (sub.pastDueSince.toDate ? sub.pastDueSince.toDate() : new Date(sub.pastDueSince))
      : new Date();
    const daysPastDue = (Date.now() - pastDueSince.getTime()) / MS_PER_DAY;

    if (daysPastDue <= GRACE_PERIOD_DAYS) {
      // Grace period — read-only mode
      if (isWriteOperation) {
        return {
          allowed: false,
          readOnly: true,
          reason: "grace_period_write_blocked",
          subscription: sub,
        };
      }
      return { allowed: true, readOnly: true, reason: "grace_period", subscription: sub };
    }

    // Grace expired — fully blocked
    return {
      allowed: false,
      readOnly: false,
      reason: "grace_period_expired",
      subscription: sub,
    };
  }

  // Canceled — blocked
  return {
    allowed: false,
    readOnly: false,
    reason: "subscription_canceled",
    subscription: sub,
  };
}

/**
 * Express-style middleware wrapper for use in route handlers.
 * Returns a JSON error if subscription check fails.
 *
 * @param {string} workerId
 * @param {string} tenantId
 * @param {object} res — Express response object
 * @param {object} [opts]
 * @returns {Promise<{allowed: boolean, readOnly: boolean}>}
 */
async function checkSubscriptionOrReject(workerId, tenantId, res, opts = {}) {
  const result = await requireActiveSubscription(workerId, tenantId, opts);

  if (!result.allowed) {
    const messages = {
      no_subscription: "Active subscription required for this worker.",
      grace_period_write_blocked: "Subscription past due. Read-only mode active during grace period.",
      grace_period_expired: "Subscription grace period expired. Please renew to continue.",
      subscription_canceled: "Subscription has been canceled.",
    };
    res.status(402).json({
      ok: false,
      error: messages[result.reason] || "Subscription required.",
      reason: result.reason,
      readOnly: result.readOnly,
    });
    return { allowed: false, readOnly: result.readOnly };
  }

  return { allowed: true, readOnly: result.readOnly };
}

module.exports = {
  requireActiveSubscription,
  checkSubscriptionOrReject,
  GRACE_PERIOD_DAYS,
};
