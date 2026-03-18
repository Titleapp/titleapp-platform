/**
 * purchaseWorker.js — Marketplace purchase with revenue split.
 * Creator workers: 75% to creator via Connect, 25% to TitleApp.
 * Platform workers: 100% to TitleApp, no split.
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

async function purchaseWorker(req, res) {
  const db = getDb();
  const stripe = getStripe();

  const { buyerUserId, workerId, priceAmount } = req.body || {};
  if (!buyerUserId || !workerId) {
    return res.status(400).json({ ok: false, error: "buyerUserId and workerId required" });
  }

  // Get buyer
  const buyerSnap = await db.collection("users").doc(buyerUserId).get();
  if (!buyerSnap.exists) {
    return res.status(404).json({ ok: false, error: "Buyer not found" });
  }
  const buyer = buyerSnap.data();
  if (!buyer.stripeCustomerId) {
    return res.status(400).json({ ok: false, error: "Buyer has no payment method" });
  }

  // Get worker listing
  const workerSnap = await db.collection("marketplace").doc(workerId).get();
  if (!workerSnap.exists) {
    return res.status(404).json({ ok: false, error: "Worker not found in marketplace" });
  }
  const worker = workerSnap.data();

  const amount = priceAmount || worker.priceMonthly || 0; // cents
  const amountDollars = Math.round(amount / 100);

  // Pricing floor validation — reject prices outside approved set
  try {
    validateWorkerPrice(amountDollars);
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }

  // Free workers — no charge needed
  if (amountDollars === 0) {
    await db.collection("marketplacePurchases").add({
      buyerUserId,
      workerId,
      creatorId: worker.creatorId || "titleapp-platform",
      amount: 0,
      platformFee: 0,
      creatorShare: 0,
      stripePaymentIntentId: null,
      status: "free",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    await logActivity("revenue", `Free worker activated: ${worker.name || workerId}`, "info", { buyerUserId, workerId });
    return res.json({ ok: true, status: "free", amount: 0 });
  }

  // Determine if platform worker (100% TitleApp) or creator worker (75/25 split)
  const isPlatformWorker = worker.creatorId === "titleapp-platform" || !worker.creatorId;

  let paymentIntent;
  let platformFee = 0;
  let creatorShare = 0;

  if (isPlatformWorker) {
    // Platform worker — 100% TitleApp, no split
    paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      customer: buyer.stripeCustomerId,
      metadata: {
        buyerUserId,
        workerId,
        creatorId: "titleapp-platform",
        workerName: worker.name || workerId,
        type: "platform_worker",
      },
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    });
    platformFee = amount / 100;
    creatorShare = 0;
  } else {
    // Creator worker — 75/25 split via Stripe Connect
    const creatorSnap = await db.collection("users").doc(worker.creatorId).get();
    if (!creatorSnap.exists || !creatorSnap.data().stripeConnectAccountId) {
      return res.status(400).json({ ok: false, error: "Creator has no payout account" });
    }
    const creatorConnectId = creatorSnap.data().stripeConnectAccountId;

    const configSnap = await db.collection("config").doc("stripe").get();
    const config = configSnap.exists ? configSnap.data() : {};
    const feePercent = config.connect?.platformFeePercent || 25;

    platformFee = Math.round(amount * (feePercent / 100)) / 100;
    creatorShare = (amount - Math.round(amount * (feePercent / 100))) / 100;

    paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      customer: buyer.stripeCustomerId,
      application_fee_amount: Math.round(amount * (feePercent / 100)),
      transfer_data: {
        destination: creatorConnectId,
      },
      metadata: {
        buyerUserId,
        workerId,
        creatorId: worker.creatorId,
        workerName: worker.name || workerId,
        type: "creator_worker",
      },
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    });
  }

  // Log marketplace purchase
  await db.collection("marketplacePurchases").add({
    buyerUserId,
    workerId,
    creatorId: worker.creatorId || "titleapp-platform",
    amount: amount / 100,
    platformFee,
    creatorShare,
    stripePaymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
    isPlatformWorker,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logActivity(
    "revenue",
    `Marketplace purchase: ${worker.name || workerId} — $${(amount / 100).toFixed(2)} (${isPlatformWorker ? "100% platform" : "75/25 split"})`,
    "success",
    { buyerUserId, workerId, creatorId: worker.creatorId || "titleapp-platform" }
  );

  return res.json({
    ok: true,
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
    amount: amount / 100,
    platformFee,
    creatorShare,
  });
}

module.exports = { purchaseWorker };
