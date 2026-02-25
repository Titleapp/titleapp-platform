/**
 * purchaseWorker.js — Marketplace purchase with 75/25 split.
 * Subscriber buys/subscribes to a Worker. 75% to creator, 25% to TitleApp.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");
const { logActivity } = require("../admin/logActivity");

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

  // Get creator's Connect account
  const creatorSnap = await db.collection("users").doc(worker.creatorId).get();
  if (!creatorSnap.exists || !creatorSnap.data().stripeConnectAccountId) {
    return res.status(400).json({ ok: false, error: "Creator has no payout account" });
  }
  const creatorConnectId = creatorSnap.data().stripeConnectAccountId;

  const amount = priceAmount || worker.priceMonthly || 999; // cents

  // Get platform fee config
  const configSnap = await db.collection("config").doc("stripe").get();
  const config = configSnap.exists ? configSnap.data() : {};
  const feePercent = config.connect?.platformFeePercent || 25;

  // Create payment intent with Connect
  const paymentIntent = await stripe.paymentIntents.create({
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
    },
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
  });

  // Log marketplace purchase
  await db.collection("marketplacePurchases").add({
    buyerUserId,
    workerId,
    creatorId: worker.creatorId,
    amount: amount / 100,
    platformFee: Math.round(amount * (feePercent / 100)) / 100,
    creatorShare: (amount - Math.round(amount * (feePercent / 100))) / 100,
    stripePaymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logActivity(
    "revenue",
    `Marketplace purchase: ${worker.name || workerId} — $${(amount / 100).toFixed(2)} (${feePercent}% platform fee)`,
    "success",
    { buyerUserId, workerId, creatorId: worker.creatorId }
  );

  return res.json({
    ok: true,
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
    amount: amount / 100,
    platformFee: Math.round(amount * (feePercent / 100)) / 100,
    creatorShare: (amount - Math.round(amount * (feePercent / 100))) / 100,
  });
}

module.exports = { purchaseWorker };
