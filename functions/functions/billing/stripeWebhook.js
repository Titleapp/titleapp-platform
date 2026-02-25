/**
 * stripeWebhook.js — Master Stripe webhook handler.
 * Handles all Stripe events with signature verification.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");
const { logActivity } = require("../admin/logActivity");

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

      case "invoice.payment_failed": {
        const amount = (data.amount_due || 0) / 100;
        await logActivity("error", `Payment failed: $${amount.toFixed(2)} from ${data.customer_email || data.customer}`, "error", {
          stripeInvoiceId: data.id,
        });

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
        const userId = data.metadata?.userId;
        if (userId) {
          await db.collection("users").doc(userId).set(
            {
              stripeSubscriptionStatus: "canceled",
              tier: "free",
              subscriptionCanceledAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
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

      // ---- CHECKOUT (Credit packs) ----
      case "checkout.session.completed": {
        const credits = parseInt(data.metadata?.credits || "0", 10);
        const userId = data.metadata?.userId;
        if (credits > 0 && userId) {
          await db.collection("users").doc(userId).set(
            {
              prepaidCredits: admin.firestore.FieldValue.increment(credits),
            },
            { merge: true }
          );
          await logActivity("revenue", `Credit pack purchased: ${credits} credits for user ${userId}`, "success");
        }
        break;
      }

      // ---- CONNECT (Creator payouts) ----
      case "account.updated": {
        await logActivity("system", `Connect account updated: ${data.id}`, "info");
        break;
      }

      case "transfer.created": {
        const amount = data.amount / 100;
        await db.collection("creatorPayouts").add({
          stripeTransferId: data.id,
          amount,
          currency: data.currency,
          destinationAccount: data.destination,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        await logActivity("revenue", `Creator payout: $${amount.toFixed(2)}`, "info");
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
