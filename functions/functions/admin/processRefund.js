/**
 * processRefund.js — Admin issues a refund via Stripe.
 * Handles creator earnings reversal for marketplace purchases.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");
const { logActivity } = require("./logActivity");
const { USAGE_EVENTS_COLLECTION } = require("../config/usageEvents");

function getDb() { return admin.firestore(); }
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

/**
 * CODEX 50.5 — Walk back all usage events tied to a single chat interaction.
 * Reduces deferred/pending creatorPayouts; records clawback obligations
 * against transferred ones. Idempotent — events already marked refunded_at
 * are skipped.
 *
 * @param {string} parentInteractionId — id from /chat:message
 * @param {object} ctx — { paymentIntentId, refundId, reason, adminUserId }
 * @returns {Promise<{eventsWalked, deferredReduced, clawbacksRecorded, totalShareWalked}>}
 */
async function walkBackInteractionEvents(parentInteractionId, ctx = {}) {
  if (!parentInteractionId) {
    return { eventsWalked: 0, deferredReduced: 0, clawbacksRecorded: 0, totalShareWalked: 0 };
  }
  const db = getDb();
  const summary = { eventsWalked: 0, deferredReduced: 0, clawbacksRecorded: 0, totalShareWalked: 0 };

  // Idempotency: only walk events that have not already been refunded.
  const eventsSnap = await db.collection(USAGE_EVENTS_COLLECTION)
    .where("parent_interaction_id", "==", parentInteractionId)
    .get();

  if (eventsSnap.empty) return summary;

  for (const doc of eventsSnap.docs) {
    const ev = doc.data();
    if (ev.refunded_at) continue; // already walked

    const billingPeriodEnd = ev.billing_period; // ISO month string
    const eventShares = [
      { creatorId: ev.creator_id, amount: Number(ev.creator_share_amount || 0), role: "creator" },
      { creatorId: ev.parent_creator_id, amount: Number(ev.parent_share_amount || 0), role: "parent" },
    ].filter(s => s.creatorId && s.amount > 0);

    for (const share of eventShares) {
      summary.totalShareWalked += share.amount;

      // Look for an unsettled creatorPayouts row to reduce.
      const deferredSnap = await db.collection("creatorPayouts")
        .where("creatorId", "==", share.creatorId)
        .where("status", "in", ["deferred", "pending"])
        .limit(5)
        .get();

      let remaining = share.amount;
      for (const pdoc of deferredSnap.docs) {
        if (remaining <= 0) break;
        const pdata = pdoc.data();
        const reducible = Number(pdata.amount || 0);
        if (reducible <= 0) continue;
        const reduce = Math.min(reducible, remaining);
        if (reduce >= reducible) {
          await pdoc.ref.update({
            status: "reversed",
            reversedAt: admin.firestore.FieldValue.serverTimestamp(),
            reversalReason: `Refund ${ctx.refundId || ""} interaction ${parentInteractionId}`,
          });
        } else {
          await pdoc.ref.update({
            amount: admin.firestore.FieldValue.increment(-reduce),
            partialReversals: admin.firestore.FieldValue.arrayUnion({
              amount: reduce,
              parentInteractionId,
              refundId: ctx.refundId || null,
              at: admin.firestore.Timestamp.now(),
            }),
          });
        }
        remaining -= reduce;
        summary.deferredReduced += reduce;
      }

      // Anything not absorbed by deferred rows becomes a clawback against the
      // creator's NEXT payout. Cycle-close applies these in payoutToCreator().
      if (remaining > 0) {
        await db.collection("creatorClawbacks").add({
          creatorId: share.creatorId,
          role: share.role,
          amount: remaining,
          status: "pending",
          parentInteractionId,
          eventId: doc.id,
          billingPeriodEnd: billingPeriodEnd || null,
          paymentIntentId: ctx.paymentIntentId || null,
          refundId: ctx.refundId || null,
          reason: ctx.reason || "refund_walkback",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        summary.clawbacksRecorded++;
      }
    }

    // Mark event refunded so future walks skip it.
    await doc.ref.update({
      refunded_at: admin.firestore.FieldValue.serverTimestamp(),
      refund_payment_intent: ctx.paymentIntentId || null,
      refund_id: ctx.refundId || null,
    });
    summary.eventsWalked++;
  }

  return summary;
}

/**
 * Reverse a creator's share for a refunded marketplace purchase — shared by
 * the admin processRefund flow and the self-serve worker:cancel flow (2026-
 * 08-22, Sean's 100%-money-back policy) so this financial logic exists in
 * exactly one place. Mutates the purchase doc, reverses/escalates the
 * creator's payout, and emits the creatorEvents record. Returns the same
 * status string processRefund already returned inline.
 */
async function reverseCreatorShareForPurchase(purchaseDoc, { refundId, refundAmount, paymentIntentId = null }) {
  const db = getDb();
  const purchase = purchaseDoc.data();
  const creatorId = purchase.creatorId;
  if (!creatorId || creatorId === "titleapp-platform" || !(purchase.creatorShare > 0)) {
    return null;
  }

  await purchaseDoc.ref.update({
    refundedAt: admin.firestore.FieldValue.serverTimestamp(),
    refundId,
    refundAmount,
  });

  const payoutSnap = await db.collection("creatorPayouts")
    .where("creatorId", "==", creatorId).where("status", "==", "transferred")
    .orderBy("timestamp", "desc").limit(5).get();

  const deferredSnap = await db.collection("creatorPayouts")
    .where("creatorId", "==", creatorId).where("status", "in", ["deferred", "pending"])
    .limit(5).get();

  let creatorReversalStatus = null;
  if (!deferredSnap.empty) {
    for (const doc of deferredSnap.docs) {
      await doc.ref.update({
        status: "reversed",
        reversedAt: admin.firestore.FieldValue.serverTimestamp(),
        reversalReason: `Refund ${refundId} for ${paymentIntentId || purchaseDoc.id}`,
      });
    }
    creatorReversalStatus = "reversed_deferred";
  } else if (!payoutSnap.empty) {
    await db.collection("escalations").add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      domain: "billing",
      reason: "refund_requires_manual_reversal",
      context: `Refund of $${refundAmount.toFixed(2)} for ${paymentIntentId || purchaseDoc.id}. Creator ${creatorId} was already paid $${purchase.creatorShare.toFixed(2)}. Manual transfer reversal required.`,
      creatorId,
      paymentIntentId,
      refundId,
      creatorShareAmount: purchase.creatorShare,
      alexAction: "escalated_to_owner",
      notifiedVia: ["dashboard"],
      resolved: false,
    });
    creatorReversalStatus = "flagged_manual_review";
  }

  try {
    const { emitCreatorEvent } = require("../services/sandbox/creatorEvents");
    emitCreatorEvent(creatorId, "refund_processed", {
      amount: refundAmount, paymentIntentId, refundId, creatorShare: purchase.creatorShare,
    });
  } catch (e) {
    console.error("[reverseCreatorShareForPurchase] Creator event emit failed:", e.message);
  }

  return creatorReversalStatus;
}

async function processRefund(req, res) {
  const db = getDb();
  const stripe = getStripe();

  const { paymentIntentId, amount, reason, adminUserId, parentInteractionId } = req.body || {};
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

  // Check if this was a marketplace purchase with creator split. Legacy
  // one-time purchases are keyed by stripePaymentIntentId; subscription
  // purchases (2026-08-22 rewrite) don't have a fixed payment_intent (a new
  // one is generated each billing cycle), so fall back to looking up the
  // subscription behind this specific payment_intent's invoice.
  let creatorReversalStatus = null;
  try {
    let purchaseSnap = await db.collection("marketplacePurchases")
      .where("stripePaymentIntentId", "==", paymentIntentId)
      .limit(1)
      .get();

    if (purchaseSnap.empty) {
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["invoice"] });
        const subscriptionId = pi.invoice && pi.invoice.subscription;
        if (subscriptionId) {
          purchaseSnap = await db.collection("marketplacePurchases")
            .where("stripeSubscriptionId", "==", subscriptionId)
            .limit(1)
            .get();
        }
      } catch (lookupErr) {
        console.error("[processRefund] subscription lookup fallback failed:", lookupErr.message);
      }
    }

    if (!purchaseSnap.empty) {
      creatorReversalStatus = await reverseCreatorShareForPurchase(purchaseSnap.docs[0], {
        refundId: refund.id, refundAmount, paymentIntentId,
      });
    }
  } catch (e) {
    console.error("[processRefund] Creator reversal check failed:", e.message);
  }

  // CODEX 50.5 — atomic walkback of all usage events tied to this interaction.
  // Walks deferred creatorPayouts, records clawbacks for transferred ones,
  // and stamps refunded_at on each event for idempotency.
  let interactionWalkSummary = null;
  if (parentInteractionId) {
    try {
      interactionWalkSummary = await walkBackInteractionEvents(parentInteractionId, {
        paymentIntentId,
        refundId: refund.id,
        reason,
        adminUserId,
      });
      await logActivity(
        "revenue",
        `Interaction walkback ${parentInteractionId}: ${interactionWalkSummary.eventsWalked} events, $${interactionWalkSummary.deferredReduced.toFixed(2)} reduced, ${interactionWalkSummary.clawbacksRecorded} clawbacks`,
        "info",
        interactionWalkSummary,
      );
    } catch (walkErr) {
      console.error("[processRefund] interaction walkback failed:", walkErr.message);
    }
  }

  await logActivity(
    "revenue",
    `Refund issued: $${refundAmount.toFixed(2)} — ${reason || "Admin-initiated"}${creatorReversalStatus ? ` (creator: ${creatorReversalStatus})` : ""}`,
    "warning",
    { paymentIntentId, refundId: refund.id, adminUserId, creatorReversalStatus, parentInteractionId }
  );

  return res.json({
    ok: true,
    refundId: refund.id,
    amount: refundAmount,
    creatorReversalStatus,
    interactionWalkSummary,
  });
}

module.exports = { processRefund, walkBackInteractionEvents, reverseCreatorShareForPurchase };
