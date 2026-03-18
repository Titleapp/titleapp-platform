/**
 * createSubscription.js — User upgrades to a paid plan.
 * Creates Stripe customer + subscription with flat fee + metered usage.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");
const { logActivity } = require("../admin/logActivity");
const { validateWorkerPrice } = require("../helpers/workerSchema");

function getDb() { return admin.firestore(); }
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

async function createSubscription(req, res) {
  const db = getDb();
  const stripe = getStripe();

  const { userId, paymentMethodId, priceId, tier, promoCode } = req.body || {};
  if (!userId || !paymentMethodId || !priceId) {
    return res.status(400).json({ ok: false, error: "userId, paymentMethodId, and priceId required" });
  }

  // Get user doc
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }
  const userData = userSnap.data();

  // Validate tier price against approved pricing floor
  const pricingConfig = require("../config/pricing");
  const tierKey = tier || "tier1";
  const requestedTier = pricingConfig.subscriptionTiers[tierKey];
  if (!requestedTier) {
    return res.status(400).json({ ok: false, error: `Unknown tier: ${tierKey}` });
  }
  if (requestedTier.price !== null) {
    try {
      validateWorkerPrice(requestedTier.price);
    } catch (e) {
      return res.status(400).json({ ok: false, error: e.message });
    }
  }

  // Get or create Stripe customer
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

  // Attach payment method
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  // Get stripe config for metered price
  const configSnap = await db.collection("config").doc("stripe").get();
  const stripeConfig = configSnap.exists ? configSnap.data() : {};
  const meteredPriceId = stripeConfig.prices?.usageMetered;

  // Build subscription items
  const items = [{ price: priceId }];
  if (meteredPriceId) {
    items.push({ price: meteredPriceId });
  }

  // Apply promo code if provided
  let couponId = null;
  if (promoCode) {
    try {
      const promoDoc = await getDb().doc(`promoCodes/${promoCode.toUpperCase().trim()}`).get();
      if (promoDoc.exists && promoDoc.data().active) {
        couponId = promoDoc.data().stripeId;
        // Increment redemption count
        await promoDoc.ref.update({
          redemptionCount: admin.firestore.FieldValue.increment(1),
        });
      }
    } catch (e) {
      console.error("Promo code lookup failed:", e);
    }
  }

  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items,
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
    metadata: { userId, tier: tier || "pro", ...(promoCode ? { promoCode } : {}) },
    ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
  });

  // Get the metered subscription item ID for usage reporting
  let meteredItemId = null;
  if (meteredPriceId) {
    const meteredItem = subscription.items.data.find(
      (item) => item.price.id === meteredPriceId
    );
    if (meteredItem) meteredItemId = meteredItem.id;
  }

  // Determine monthly credits based on tier (canonical rates from config/pricing.js)
  const pricing = require("../config/pricing");
  const canonicalTier = pricing.subscriptionTiers[tier || "tier1"] || pricing.subscriptionTiers.free;
  const tierConfig = stripeConfig.tiers?.[tier || "pro"] || { monthlyCredits: canonicalTier.creditsIncluded };

  // Update user record
  await userRef.set(
    {
      tier: tier || "pro",
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      stripeMeteredItemId: meteredItemId,
      usageThisMonth: 0,
      monthlyCredits: tierConfig.monthlyCredits,
      subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await logActivity("revenue", `Subscription created: ${tier || "pro"} for ${userData.email}`, "success", { userId });

  return res.json({
    ok: true,
    subscriptionId: subscription.id,
    clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
    status: subscription.status,
  });
}

module.exports = { createSubscription };
