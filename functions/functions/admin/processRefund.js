/**
 * processRefund.js — Admin issues a refund via Stripe.
 * Handles creator earnings reversal for marketplace purchases.
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

  // Check if this was a marketplace purchase with creator split
  let creatorReversalStatus = null;
  try {
    const purchaseSnap = await db.collection("marketplacePurchases")
      .where("stripePaymentIntentId", "==", paymentIntentId)
      .limit(1)
      .get();

    if (!purchaseSnap.empty) {
      const purchase = purchaseSnap.docs[0].data();
      const creatorId = purchase.creatorId;

      if (creatorId && creatorId !== "titleapp-platform" && purchase.creatorShare > 0) {
        // Mark the purchase as refunded
        await purchaseSnap.docs[0].ref.update({
          refundedAt: admin.firestore.FieldValue.serverTimestamp(),
          refundId: refund.id,
          refundAmount,
        });

        // Check if payout was already sent
        const payoutSnap = await db.collection("creatorPayouts")
          .where("creatorId", "==", creatorId)
          .where("status", "==", "transferred")
          .orderBy("timestamp", "desc")
          .limit(5)
          .get();

        // Check for deferred/pending payouts we can reverse
        const deferredSnap = await db.collection("creatorPayouts")
          .where("creatorId", "==", creatorId)
          .where("status", "in", ["deferred", "pending"])
          .limit(5)
          .get();

        if (!deferredSnap.empty) {
          // Deferred payout — mark as reversed
          for (const doc of deferredSnap.docs) {
            await doc.ref.update({
              status: "reversed",
              reversedAt: admin.firestore.FieldValue.serverTimestamp(),
              reversalReason: `Refund ${refund.id} for payment ${paymentIntentId}`,
            });
          }
          creatorReversalStatus = "reversed_deferred";
        } else if (!payoutSnap.empty) {
          // Payout already sent — flag for manual review
          await db.collection("escalations").add({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            domain: "billing",
            reason: "refund_requires_manual_reversal",
            context: `Refund of $${refundAmount.toFixed(2)} for payment ${paymentIntentId}. Creator ${creatorId} was already paid $${purchase.creatorShare.toFixed(2)}. Manual transfer reversal required.`,
            creatorId,
            paymentIntentId,
            refundId: refund.id,
            creatorShareAmount: purchase.creatorShare,
            alexAction: "escalated_to_owner",
            notifiedVia: ["dashboard"],
            resolved: false,
          });
          creatorReversalStatus = "flagged_manual_review";
        }

        // Emit refund event to creatorEvents
        try {
          const { emitCreatorEvent } = require("../services/sandbox/creatorEvents");
          emitCreatorEvent(creatorId, "refund_processed", {
            amount: refundAmount,
            paymentIntentId,
            refundId: refund.id,
            creatorShare: purchase.creatorShare,
          });
        } catch (e) {
          console.error("[processRefund] Creator event emit failed:", e.message);
        }
      }
    }
  } catch (e) {
    console.error("[processRefund] Creator reversal check failed:", e.message);
  }

  await logActivity(
    "revenue",
    `Refund issued: $${refundAmount.toFixed(2)} — ${reason || "Admin-initiated"}${creatorReversalStatus ? ` (creator: ${creatorReversalStatus})` : ""}`,
    "warning",
    { paymentIntentId, refundId: refund.id, adminUserId, creatorReversalStatus }
  );

  return res.json({ ok: true, refundId: refund.id, amount: refundAmount, creatorReversalStatus });
}

module.exports = { processRefund };
