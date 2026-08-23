/**
 * purchaseWorker.js — Marketplace SUBSCRIPTION with revenue split.
 * Creator workers: 75% to creator via Connect, 25% to SOCIII.
 * Platform workers: 100% to SOCIII, no split.
 *
 * 2026-08-22, Sean: this used to be a one-time PaymentIntent — the real
 * per-worker Stripe Prices (config/pricing.js's stripeProducts.workerTier1/
 * 2/3, always intended for "per-worker subscriptions" per their own
 * comment) were never actually used, so nothing re-billed a buyer the
 * following month. Rewritten to create a real recurring Subscription,
 * same pattern already proven correct in /box:checkout.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");
const { logActivity } = require("../admin/logActivity");
const { validateWorkerPrice } = require("../helpers/workerSchema");
const pricing = require("../config/pricing");

function getDb() { return admin.firestore(); }
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

// $29 -> workerTier1, $49 -> workerTier2, $79 -> workerTier3.
const TIER_PRICE_ID_BY_DOLLARS = {
  29: pricing.stripeProducts.workerTier1,
  49: pricing.stripeProducts.workerTier2,
  79: pricing.stripeProducts.workerTier3,
};

async function purchaseWorker(req, res) {
  const db = getDb();
  const stripe = getStripe();

  const { buyerUserId, workerId, priceAmount } = req.body || {};
  if (!buyerUserId || !workerId) {
    return res.status(400).json({ ok: false, error: "buyerUserId and workerId required" });
  }

  const buyerSnap = await db.collection("users").doc(buyerUserId).get();
  if (!buyerSnap.exists) {
    return res.status(404).json({ ok: false, error: "Buyer not found" });
  }
  const buyer = buyerSnap.data();
  if (!buyer.stripeCustomerId) {
    return res.status(400).json({ ok: false, error: "Buyer has no payment method" });
  }

  const workerSnap = await db.collection("marketplace").doc(workerId).get();
  if (!workerSnap.exists) {
    return res.status(404).json({ ok: false, error: "Worker not found in marketplace" });
  }
  const worker = workerSnap.data();

  const amount = priceAmount || worker.priceMonthly || 0; // cents
  const amountDollars = Math.round(amount / 100);

  try {
    validateWorkerPrice(amountDollars);
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }

  // Free workers — no subscription needed.
  if (amountDollars === 0) {
    await db.collection("marketplacePurchases").add({
      buyerUserId,
      workerId,
      creatorId: worker.creatorId || "titleapp-platform",
      amount: 0,
      platformFee: 0,
      creatorShare: 0,
      stripeSubscriptionId: null,
      status: "free",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    await logActivity("revenue", `Free worker activated: ${worker.name || workerId}`, "info", { buyerUserId, workerId });
    return res.json({ ok: true, status: "free", amount: 0 });
  }

  const tierPriceId = TIER_PRICE_ID_BY_DOLLARS[amountDollars];
  if (!tierPriceId) {
    return res.status(500).json({ ok: false, error: `No Stripe price configured for $${amountDollars}/mo tier` });
  }

  const isPlatformWorker = worker.creatorId === "titleapp-platform" || !worker.creatorId;

  let subscription;
  let platformFee = 0;
  let creatorShare = 0;

  if (isPlatformWorker) {
    subscription = await stripe.subscriptions.create({
      customer: buyer.stripeCustomerId,
      items: [{ price: tierPriceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        buyerUserId, workerId, creatorId: "titleapp-platform",
        workerName: worker.name || workerId, type: "platform_worker",
      },
    });
    platformFee = amountDollars;
    creatorShare = 0;
  } else {
    const creatorSnap = await db.collection("users").doc(worker.creatorId).get();
    if (!creatorSnap.exists || !creatorSnap.data().stripeConnectAccountId) {
      return res.status(400).json({ ok: false, error: "Creator has no payout account" });
    }
    const creatorConnectId = creatorSnap.data().stripeConnectAccountId;

    const configSnap = await db.collection("config").doc("stripe").get();
    const config = configSnap.exists ? configSnap.data() : {};
    const feePercent = config.connect?.platformFeePercent || 25;

    platformFee = Math.round(amountDollars * (feePercent / 100) * 100) / 100;
    creatorShare = amountDollars - platformFee;

    subscription = await stripe.subscriptions.create({
      customer: buyer.stripeCustomerId,
      items: [{ price: tierPriceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      application_fee_percent: feePercent,
      transfer_data: { destination: creatorConnectId },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        buyerUserId, workerId, creatorId: worker.creatorId,
        workerName: worker.name || workerId, type: "creator_worker",
      },
    });
  }

  const paymentIntent = subscription.latest_invoice && subscription.latest_invoice.payment_intent;

  const purchaseRef = await db.collection("marketplacePurchases").add({
    buyerUserId,
    workerId,
    creatorId: worker.creatorId || "titleapp-platform",
    amount: amountDollars,
    platformFee,
    creatorShare,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: buyer.stripeCustomerId,
    status: subscription.status, // "incomplete" until the client confirms the payment intent
    isPlatformWorker,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logActivity(
    "revenue",
    `Marketplace subscription started: ${worker.name || workerId} — $${amountDollars}/mo (${isPlatformWorker ? "100% platform" : "75/25 split"})`,
    "success",
    { buyerUserId, workerId, creatorId: worker.creatorId || "titleapp-platform", subscriptionId: subscription.id }
  );

  return res.json({
    ok: true,
    purchaseId: purchaseRef.id,
    subscriptionId: subscription.id,
    status: subscription.status,
    clientSecret: paymentIntent ? paymentIntent.client_secret : null,
    amount: amountDollars,
    platformFee,
    creatorShare,
  });
}

module.exports = { purchaseWorker };
