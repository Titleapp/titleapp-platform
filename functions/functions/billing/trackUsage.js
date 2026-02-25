/**
 * trackUsage.js — Track AI usage per user.
 * Call from enforcement engine / AI call handler.
 *
 * Returns { allowed: true/false, remaining, message }
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");

function getDb() { return admin.firestore(); }
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

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

  // Get tier config
  const configSnap = await db.collection("config").doc("stripe").get();
  const config = configSnap.exists ? configSnap.data() : {};
  const tierConfig = config.tiers?.[tier] || { monthlyCredits: 50 };
  const usageConfig = config.usage || {
    hardCapMultiplier: 5,
    warningThreshold: 0.8,
  };

  const monthlyAllowance = tierConfig.monthlyCredits;
  const hardCap = monthlyAllowance * usageConfig.hardCapMultiplier;

  // Check hard cap
  if (usageThisMonth >= hardCap && prepaidCredits <= 0) {
    return {
      allowed: false,
      remaining: 0,
      message: `You've reached your usage limit (${hardCap} calls). Please upgrade your plan or purchase a credit pack.`,
    };
  }

  // Increment usage
  await userRef.set(
    { usageThisMonth: admin.firestore.FieldValue.increment(1) },
    { merge: true }
  );

  const newUsage = usageThisMonth + 1;
  const result = { allowed: true, remaining: monthlyAllowance - newUsage };

  // Over included allowance — bill overage or deduct credits
  if (newUsage > monthlyAllowance) {
    if (prepaidCredits > 0) {
      // Deduct from prepaid credits
      await userRef.set(
        { prepaidCredits: admin.firestore.FieldValue.increment(-1) },
        { merge: true }
      );
      result.creditDeducted = true;
    } else if (userData.stripeMeteredItemId) {
      // Report to Stripe metered billing
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
  const threshold = Math.floor(monthlyAllowance * usageConfig.warningThreshold);
  if (newUsage === threshold) {
    result.warning = `You've used ${newUsage} of ${monthlyAllowance} included AI calls this month.`;
  }

  // At 100%
  if (newUsage === monthlyAllowance) {
    result.warning = `You've exceeded your included allowance. Additional calls are $0.01 each, or buy a credit pack to save.`;
  }

  return result;
}

module.exports = { trackUsage };
