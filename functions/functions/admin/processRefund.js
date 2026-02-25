/**
 * processRefund.js — Admin issues a refund via Stripe.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");
const { logActivity } = require("./logActivity");

function getDb() { return admin.firestore(); }
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

async function processRefund(req, res) {
  const db = getDb();
  const stripe = getStripe();

  const { paymentIntentId, amount, reason, adminUserId } = req.body || {};
  if (!paymentIntentId) {
    return res.status(400).json({ ok: false, error: "paymentIntentId required" });
  }

  const refundParams = { payment_intent: paymentIntentId };
  if (amount) refundParams.amount = Math.round(amount * 100); // dollars to cents

  const refund = await stripe.refunds.create(refundParams);
  const refundAmount = refund.amount / 100;

  // Create negative ledger entry
  await db.collection("ledger").add({
    date: new Date().toISOString().slice(0, 10),
    type: "refund",
    category: "refund",
    subcategory: "admin_refund",
    amount: -refundAmount,
    description: `Refund: ${reason || "Admin-initiated"} — ${paymentIntentId}`,
    stripePaymentId: paymentIntentId,
    stripeRefundId: refund.id,
    debit: "revenue_refund",
    credit: "cash",
    autoCategorized: true,
    categorizedBy: adminUserId || "admin",
    verified: true,
    verifiedBy: adminUserId || "admin",
    verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logActivity(
    "revenue",
    `Refund issued: $${refundAmount.toFixed(2)} — ${reason || "Admin-initiated"}`,
    "warning",
    { paymentIntentId, refundId: refund.id, adminUserId }
  );

  return res.json({ ok: true, refundId: refund.id, amount: refundAmount });
}

module.exports = { processRefund };
