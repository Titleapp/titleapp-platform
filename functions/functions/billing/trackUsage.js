/**
 * trackUsage.js — Track AI usage per user.
 * Call from enforcement engine / AI call handler.
 *
 * Reads rates from config/pricing.js — no hardcoded pricing.
 * Returns { allowed: true/false, remaining, message, tier, usageThisMonth }
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");
const pricing = require("../config/pricing");

function getDb() { return admin.firestore(); }
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

const HARD_CAP_MULTIPLIER = 5;
const WARNING_THRESHOLD = 0.8;

async function trackUsage(userId, callType = "ai_call") {
  const db = getDb();
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    return { allowed: false, message: "User not found" };
  }

  const userData = userSnap.data();
  const tier = userData.tier || "free";
  const usageThisMonth = userData.usageThisMonth || 0;
  const prepaidCredits = userData.prepaidCredits || 0;

  // Read tier config from canonical pricing source
  const tierConfig = pricing.subscriptionTiers[tier] || pricing.subscriptionTiers.free;
  const monthlyAllowance = tierConfig.creditsIncluded || 100;
  const hardCap = monthlyAllowance * HARD_CAP_MULTIPLIER;

  // Check hard cap
  if (usageThisMonth >= hardCap && prepaidCredits <= 0) {
    return {
      allowed: false,
      remaining: 0,
      tier,
      usageThisMonth,
      message: `You've reached your usage limit (${hardCap} credits). Please upgrade your plan or purchase a credit pack.`,
    };
  }

  // Increment usage
  await userRef.set(
    { usageThisMonth: admin.firestore.FieldValue.increment(1) },
    { merge: true }
  );

  const newUsage = usageThisMonth + 1;
  const result = { allowed: true, remaining: monthlyAllowance - newUsage, tier, usageThisMonth: newUsage };

  // Over included allowance — bill overage or deduct credits
  if (newUsage > monthlyAllowance) {
    if (prepaidCredits > 0) {
      await userRef.set(
        { prepaidCredits: admin.firestore.FieldValue.increment(-1) },
        { merge: true }
      );
      result.creditDeducted = true;
    } else if (userData.stripeMeteredItemId) {
      try {
        const stripe = getStripe();
        await stripe.subscriptionItems.createUsageRecord(
          userData.stripeMeteredItemId,
          { quantity: 1, timestamp: Math.floor(Date.now() / 1000) }
        );
        result.overageBilled = true;
      } catch (err) {
        console.error("Failed to report metered usage:", err.message);
      }
    }
  }

  // Warning at 80%
  const warningAt = Math.floor(monthlyAllowance * WARNING_THRESHOLD);
  if (newUsage === warningAt) {
    result.warning = `You've used ${newUsage} of ${monthlyAllowance} included credits this month.`;
  }

  // At 100%
  if (newUsage === monthlyAllowance) {
    result.warning = `You've exceeded your included allowance. Additional credits are $${pricing.creditRate} each, or buy a credit pack to save.`;
  }

  return result;
}

module.exports = { trackUsage };
