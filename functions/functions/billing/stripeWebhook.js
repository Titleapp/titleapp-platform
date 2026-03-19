/**
 * stripeWebhook.js — Master Stripe webhook handler.
 * Handles all Stripe events with signature verification.
 *
 * Cycle close logic bills all three revenue lines:
 *   Line 1 — Inference credit overage (Stripe meter)
 *   Line 2 — Data pass-through fees (Stripe invoice items)
 *   Line 3 — Audit trail records (Stripe meter)
 * Plus creator payout transfers via Stripe Connect.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");
const { logActivity } = require("../admin/logActivity");
const pricing = require("../config/pricing");

function getDb() {
  return admin.firestore();
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

async function updateAccountingSummary(db, category, amount) {
  const summaryRef = db.collection("accounting").doc("summary");
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(summaryRef);
    const data = snap.exists ? snap.data() : {};
    const revenue = data.revenue || { mtd: 0, ytd: 0, byCategory: {} };
    const expenses = data.expenses || { mtd: 0, ytd: 0, byCategory: {} };

    if (amount > 0) {
      revenue.mtd = (revenue.mtd || 0) + amount;
      revenue.ytd = (revenue.ytd || 0) + amount;
      revenue.byCategory[category] = (revenue.byCategory[category] || 0) + amount;
    } else {
      // Negative = refund or expense
      const absAmount = Math.abs(amount);
      if (category === "refund") {
        revenue.mtd = (revenue.mtd || 0) - absAmount;
        revenue.ytd = (revenue.ytd || 0) - absAmount;
      } else {
        expenses.mtd = (expenses.mtd || 0) + absAmount;
        expenses.ytd = (expenses.ytd || 0) + absAmount;
        expenses.byCategory[category] = (expenses.byCategory[category] || 0) + absAmount;
      }
    }

    tx.set(
      summaryRef,
      {
        revenue,
        expenses,
        netIncome: {
          mtd: revenue.mtd - expenses.mtd,
          ytd: revenue.ytd - expenses.ytd,
        },
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        lastMonth: monthKey,
      },
      { merge: true }
    );
  });
}

async function createLedgerEntry(db, data) {
  await db.collection("ledger").add({
    ...data,
    autoCategorized: true,
    categorizedBy: "alex",
    verified: false,
    verifiedBy: null,
    verifiedAt: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Bill all three revenue lines at cycle close for a customer.
 *
 * Called from invoice.created webhook to attach usage charges
 * before the invoice is finalized.
 */
async function handleCycleClose(db, stripe, invoiceData) {
  const customerId = invoiceData.customer;
  const invoiceId = invoiceData.id;

  // Find the user by Stripe customer ID
  const userSnap = await db.collection("users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (userSnap.empty) {
    console.log(`Cycle close: no user found for customer ${customerId}`);
    return;
  }

  const userId = userSnap.docs[0].id;

  // Determine billing period from invoice
  const periodEnd = invoiceData.period_end
    ? new Date(invoiceData.period_end * 1000)
    : new Date();
  const periodStart = invoiceData.period_start
    ? new Date(invoiceData.period_start * 1000)
    : new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Query all usage_events for this billing period
  const eventsSnap = await db.collection("usage_events")
    .where("user_id", "==", userId)
    .where("_written_at", ">=", periodStart)
    .where("_written_at", "<", periodEnd)
    .get();

  if (eventsSnap.empty) {
    console.log(`Cycle close: no usage events for user ${userId}`);
    return;
  }

  const events = eventsSnap.docs.map(d => d.data());

  // ── Line 1: Report overage credits to Stripe meter ─────────
  const totalOverageCredits = events.reduce((sum, e) => sum + (e.credits_overage || 0), 0);
  if (totalOverageCredits > 0) {
    try {
      await stripe.billing.meterEvents.create({
        event_name: pricing.stripeMeterEvents.inferenceOverage,
        payload: {
          stripe_customer_id: customerId,
          value: String(totalOverageCredits),
        },
      });
      await logActivity("revenue", `Cycle close: ${totalOverageCredits} overage credits billed for ${userId}`, "info");
    } catch (err) {
      console.error("Failed to report inference overage meter:", err.message);
    }
  }

  // ── Line 2: Add data fees as invoice line items ────────────
  const totalDataFees = events.reduce((sum, e) => sum + (e.data_fee_charged || 0), 0);
  if (totalDataFees > 0) {
    try {
      await stripe.invoiceItems.create({
        customer: customerId,
        amount: Math.round(totalDataFees * 100),
        currency: "usd",
        description: `Data API fees — actual cost + ${Math.round((pricing.dataFeeMarkupMultiplier - 1) * 100)}% markup`,
        invoice: invoiceId,
      });
      await logActivity("revenue", `Cycle close: $${totalDataFees.toFixed(2)} data fees for ${userId}`, "info");
    } catch (err) {
      console.error("Failed to add data fee invoice item:", err.message);
    }
  }

  // ── Line 3: Report audit trail records to Stripe meter ─────
  const totalAuditRecords = events.filter(e => e.audit_record_written).length;
  if (totalAuditRecords > 0) {
    try {
      await stripe.billing.meterEvents.create({
        event_name: pricing.stripeMeterEvents.auditTrailRecords,
        payload: {
          stripe_customer_id: customerId,
          value: String(totalAuditRecords),
        },
      });
      await logActivity("revenue", `Cycle close: ${totalAuditRecords} audit records billed for ${userId}`, "info");
    } catch (err) {
      console.error("Failed to report audit trail meter:", err.message);
    }
  }

  // ── Creator payouts — sum creator_share_amount by creator ──
  const creatorShares = {};
  events.forEach(e => {
    const { creator_id, creator_share_amount } = e;
    if (creator_id && creator_share_amount > 0) {
      creatorShares[creator_id] = (creatorShares[creator_id] || 0) + creator_share_amount;
    }
  });

  // Check for deferred payouts older than 4 weeks — force-process regardless of balance
  const maxHoldWeeks = pricing.creatorMaxPayoutHoldWeeks || 4;
  const maxHoldCutoff = new Date(Date.now() - maxHoldWeeks * 7 * 24 * 60 * 60 * 1000);
  try {
    const deferredSnap = await db.collection("creatorPayouts")
      .where("status", "==", "deferred")
      .where("timestamp", "<=", maxHoldCutoff)
      .limit(50)
      .get();
    for (const doc of deferredSnap.docs) {
      const deferred = doc.data();
      const dCreatorId = deferred.creatorId;
      if (!dCreatorId) continue;
      // Add deferred amount to current cycle's payout
      if (!creatorShares[dCreatorId]) creatorShares[dCreatorId] = 0;
      creatorShares[dCreatorId] += deferred.amount || 0;
      // Mark deferred record as absorbed into this cycle
      await doc.ref.update({ status: "absorbed", absorbedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
  } catch (e) {
    console.error("Deferred payout aggregation failed:", e.message);
  }

  for (const [creatorId, amount] of Object.entries(creatorShares)) {
    if (amount < pricing.creatorMinPayoutThreshold) continue;

    try {
      const creatorSnap = await db.collection("users").doc(creatorId).get();
      const creatorData = creatorSnap.exists ? creatorSnap.data() : {};
      const connectAccountId = creatorData.stripeConnectAccountId;

      if (!connectAccountId) {
        console.warn(`Creator ${creatorId} has no Connect account — skipping $${amount.toFixed(2)} payout`);
        await db.collection("creatorPayouts").add({
          creatorId,
          amount,
          status: "deferred",
          reason: "no_connect_account",
          billingPeriodEnd: periodEnd.toISOString(),
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        continue;
      }

      await stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        destination: connectAccountId,
        description: `TitleApp creator inference share — ${periodEnd.toISOString().slice(0, 10)}`,
      });

      await db.collection("creatorPayouts").add({
        creatorId,
        amount,
        status: "transferred",
        stripeConnectAccountId: connectAccountId,
        billingPeriodEnd: periodEnd.toISOString(),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      await logActivity("revenue", `Creator payout: $${amount.toFixed(2)} to ${creatorId}`, "success");
    } catch (err) {
      console.error(`Creator payout failed for ${creatorId}:`, err.message);
      await db.collection("creatorPayouts").add({
        creatorId,
        amount,
        status: "failed",
        error: err.message,
        billingPeriodEnd: periodEnd.toISOString(),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  // ── Write cycle close summary to ledger ────────────────────
  const totalRevLine1 = events.reduce((sum, e) => sum + (e.revenue_line_1 || 0), 0);
  const totalRevLine2 = events.reduce((sum, e) => sum + (e.revenue_line_2 || 0), 0);
  const totalRevLine3 = events.reduce((sum, e) => sum + (e.revenue_line_3 || 0), 0);
  const totalCreatorPaid = Object.values(creatorShares).reduce((sum, a) => sum + a, 0);

  await createLedgerEntry(db, {
    date: periodEnd.toISOString().slice(0, 10),
    type: "cycle_close",
    category: "usage_billing",
    subcategory: "three_line_summary",
    amount: totalRevLine1 + totalRevLine2 + totalRevLine3,
    description: `Cycle close for ${userId} — L1:$${totalRevLine1.toFixed(2)} L2:$${totalRevLine2.toFixed(2)} L3:$${totalRevLine3.toFixed(2)} Creator:$${totalCreatorPaid.toFixed(2)}`,
    metadata: {
      userId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      eventCount: events.length,
      revenue_line_1: totalRevLine1,
      revenue_line_2: totalRevLine2,
      revenue_line_3: totalRevLine3,
      creator_payouts: totalCreatorPaid,
      overage_credits: totalOverageCredits,
      data_fees_charged: totalDataFees,
      audit_records: totalAuditRecords,
    },
  });
}

async function handleStripeWebhook(req, res) {
  const db = getDb();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();

  let event;

  // Verify webhook signature
  if (webhookSecret) {
    const sig = req.headers["stripe-signature"];
    try {
      event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: "Invalid signature" });
    }
  } else {
    // Dev fallback — no signature check
    event = req.body;
  }

  const type = event.type;
  const data = event.data.object;

  try {
    switch (type) {
      // ---- PAYMENTS ----
      case "payment_intent.succeeded": {
        const amount = data.amount / 100;
        await db.collection("payments").add({
          stripePaymentId: data.id,
          amount,
          currency: data.currency,
          status: "succeeded",
          customerId: data.customer,
          metadata: data.metadata || {},
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        const category = data.metadata?.category || "subscription";
        await createLedgerEntry(db, {
          date: new Date().toISOString().slice(0, 10),
          type: "revenue",
          category,
          subcategory: data.metadata?.subcategory || "payment",
          amount,
          description: `Payment received — ${data.customer || "unknown"}`,
          stripePaymentId: data.id,
          debit: "cash",
          credit: `revenue_${category}`,
        });

        await updateAccountingSummary(db, category, amount);
        await logActivity("revenue", `Payment received: $${amount.toFixed(2)}`, "success", {
          stripePaymentId: data.id,
        });
        break;
      }

      case "invoice.paid": {
        const amount = data.amount_paid / 100;
        await db.collection("payments").add({
          stripeInvoiceId: data.id,
          amount,
          currency: data.currency,
          status: "paid",
          customerId: data.customer,
          subscriptionId: data.subscription,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        await createLedgerEntry(db, {
          date: new Date().toISOString().slice(0, 10),
          type: "revenue",
          category: "subscription",
          subcategory: "invoice_paid",
          amount,
          description: `Invoice paid — ${data.customer_email || data.customer}`,
          stripePaymentId: data.id,
          debit: "cash",
          credit: "revenue_subscription",
        });

        await updateAccountingSummary(db, "subscription", amount);
        await logActivity("revenue", `Invoice paid: $${amount.toFixed(2)} from ${data.customer_email || "subscriber"}`, "success");
        break;
      }

      // ---- CYCLE CLOSE (usage billing) ----
      case "invoice.created": {
        // Attach usage charges before the invoice is finalized
        if (data.billing_reason === "subscription_cycle") {
          try {
            await handleCycleClose(db, stripe, data);
          } catch (err) {
            console.error("Cycle close error:", err);
            await logActivity("error", `Cycle close failed for ${data.customer}: ${err.message}`, "error");
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const amount = (data.amount_due || 0) / 100;
        await logActivity("error", `Payment failed: $${amount.toFixed(2)} from ${data.customer_email || data.customer}`, "error", {
          stripeInvoiceId: data.id,
        });

        // Mark subscription as past_due in Firestore
        const failedUserId = data.metadata?.userId;
        if (failedUserId) {
          await db.collection("users").doc(failedUserId).set(
            { stripeSubscriptionStatus: "past_due" },
            { merge: true }
          );
        } else {
          // Look up user by customer ID
          const failedUserSnap = await db.collection("users")
            .where("stripeCustomerId", "==", data.customer)
            .limit(1)
            .get();
          if (!failedUserSnap.empty) {
            await failedUserSnap.docs[0].ref.set(
              { stripeSubscriptionStatus: "past_due" },
              { merge: true }
            );
          }
        }

        // Alert Sean if amount > $50
        if (amount > 50) {
          await db.collection("escalations").add({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            domain: "billing",
            reason: "payment_failure",
            context: `Invoice payment failed: $${amount.toFixed(2)} for ${data.customer_email || data.customer}`,
            alexAction: "escalated_to_owner",
            notifiedVia: ["dashboard"],
            resolved: false,
          });
        }
        break;
      }

      // ---- SUBSCRIPTIONS ----
      case "customer.subscription.created": {
        const userId = data.metadata?.userId;
        if (userId) {
          await db.collection("users").doc(userId).set(
            {
              stripeSubscriptionId: data.id,
              stripeSubscriptionStatus: data.status,
              tier: data.metadata?.tier || "pro",
              subscriptionCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
        await logActivity("revenue", `New subscription created: ${data.metadata?.tier || "pro"}`, "success");
        break;
      }

      case "customer.subscription.updated": {
        const userId = data.metadata?.userId;
        if (userId) {
          await db.collection("users").doc(userId).set(
            {
              stripeSubscriptionStatus: data.status,
              tier: data.metadata?.tier || "pro",
            },
            { merge: true }
          );
        }
        await logActivity("system", `Subscription updated: ${data.id} — status: ${data.status}`, "info");
        break;
      }

      case "customer.subscription.deleted": {
        const deletedUserId = data.metadata?.userId;
        if (deletedUserId) {
          await db.collection("users").doc(deletedUserId).set(
            {
              stripeSubscriptionStatus: "canceled",
              tier: "free",
              subscriptionCanceledAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          // Remove active worker subscriptions tied to this Stripe subscription
          try {
            const activeSubs = await db.collection("workerSubscriptions")
              .where("userId", "==", deletedUserId)
              .where("stripeSubscriptionId", "==", data.id)
              .get();
            for (const sub of activeSubs.docs) {
              await sub.ref.update({
                status: "cancelled",
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
            if (!activeSubs.empty) {
              await logActivity("system", `Removed ${activeSubs.size} worker subscription(s) for user ${deletedUserId}`, "info");
            }
          } catch (e) {
            console.error("[webhook] Worker subscription cleanup failed:", e.message);
          }
        }
        await logActivity("revenue", `Subscription canceled: ${data.id}`, "warning");
        break;
      }

      // ---- CHARGES ----
      case "charge.failed": {
        await logActivity("error", `Charge failed: ${data.failure_message || "unknown reason"}`, "error", {
          stripeChargeId: data.id,
        });
        break;
      }

      case "charge.refunded": {
        const refundAmount = data.amount_refunded / 100;
        await createLedgerEntry(db, {
          date: new Date().toISOString().slice(0, 10),
          type: "refund",
          category: "refund",
          subcategory: "charge_refund",
          amount: -refundAmount,
          description: `Refund issued — ${data.id}`,
          stripePaymentId: data.id,
          debit: "revenue_refund",
          credit: "cash",
        });

        await updateAccountingSummary(db, "refund", -refundAmount);
        await logActivity("revenue", `Refund issued: $${refundAmount.toFixed(2)}`, "warning", {
          stripeChargeId: data.id,
        });
        break;
      }

      // ---- CHECKOUT (Credit packs + Creator License) ----
      case "checkout.session.completed": {
        const checkoutType = data.metadata?.type;
        const userId = data.metadata?.userId;

        // Creator License activation
        if (checkoutType === "creator_license" && userId) {
          await db.collection("users").doc(userId).set(
            {
              creatorLicense: true,
              creatorLicenseActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          await logActivity("revenue", `Creator License activated for user ${userId}`, "success");
          break;
        }

        // Balance top-up (34.11-T2)
        if (checkoutType === "balance_topup" && userId) {
          const { creditBalanceFromCheckout } = require("./usageProcessor");
          await creditBalanceFromCheckout(data);
          await logActivity("revenue", `Balance top-up: $${data.metadata?.amount || "?"} for user ${userId}`, "success");
          break;
        }

        // Credit pack purchase
        const credits = parseInt(data.metadata?.credits || "0", 10);
        if (credits > 0 && userId) {
          await db.collection("users").doc(userId).set(
            {
              prepaidCredits: admin.firestore.FieldValue.increment(credits),
            },
            { merge: true }
          );
          await logActivity("revenue", `Credit pack purchased: ${credits} credits for user ${userId}`, "success");
        }

        // Creator Spotlight purchase
        if (data.metadata?.spotlightId) {
          try {
            await db.collection("creatorSpotlights").doc(data.metadata.spotlightId).update({
              stripePaymentIntentId: data.payment_intent || "",
              status: "pending",
            });
            await logActivity("revenue", `Creator Spotlight purchased: ${data.metadata.spotlightId} by ${data.metadata.creatorId}`, "success");
          } catch (e) {
            console.error("[webhook] Spotlight update failed:", e.message);
          }
        }

        // Track lead conversion if promo code was used
        if (data.metadata && data.metadata.promoCode) {
          try {
            const leadsSnap = await db.collection("leads")
              .where("email", "==", data.customer_email || "")
              .limit(1)
              .get();
            if (!leadsSnap.empty) {
              await leadsSnap.docs[0].ref.update({
                status: "converted",
                convertedAt: admin.firestore.FieldValue.serverTimestamp(),
                userId: data.metadata.userId || null,
              });
            }
          } catch (e) {
            console.error("Lead conversion tracking failed:", e);
          }
        }
        break;
      }

      // ---- CONNECT (Creator payouts) ----
      case "account.updated": {
        await logActivity("system", `Connect account updated: ${data.id}`, "info");
        break;
      }

      case "transfer.created": {
        const transferAmount = data.amount / 100;
        await db.collection("creatorPayouts").add({
          stripeTransferId: data.id,
          amount: transferAmount,
          currency: data.currency,
          destinationAccount: data.destination,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Emit creator event — look up creator by Connect account
        try {
          const creatorByConnect = await db.collection("users")
            .where("stripeConnectAccountId", "==", data.destination)
            .limit(1)
            .get();
          if (!creatorByConnect.empty) {
            const { emitCreatorEvent } = require("../services/sandbox/creatorEvents");
            emitCreatorEvent(creatorByConnect.docs[0].id, "payout_received", {
              amount: transferAmount,
              transferId: data.id,
            });
          }
        } catch (e) {
          console.error("[webhook] Creator event emit failed:", e.message);
        }

        await logActivity("revenue", `Creator payout: $${transferAmount.toFixed(2)}`, "info");
        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${type}`);
    }
  } catch (err) {
    console.error(`Error handling ${type}:`, err);
    return res.status(500).json({ error: "Webhook handler error" });
  }

  return res.json({ received: true });
}

module.exports = { handleStripeWebhook };
