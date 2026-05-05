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

module.exports = { processRefund, walkBackInteractionEvents };
