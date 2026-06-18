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
const { TRIAL_ACTIVE, CANCELLED } = require("../config/subscriptionStatus");
const { USAGE_EVENTS_COLLECTION } = require("../config/usageEvents");

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
  // ISO YYYY-MM bucket — matches billing_period stamped by every emission
  // point at write time (recordUsageEvent.billingPeriodFromTimestamp).
  const billingPeriod = periodEnd.toISOString().slice(0, 7);

  // Query all usage events for this billing period. The five emission points
  // write { userId, billing_period }; this query matches that shape exactly.
  // (Predecessor read user_id + _written_at, neither of which were written —
  // events were never findable. Test 5d caught this.)
  const eventsSnap = await db.collection(USAGE_EVENTS_COLLECTION)
    .where("userId", "==", userId)
    .where("billing_period", "==", billingPeriod)
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

  // CODEX 50.5 — Creator payouts. Sum two streams:
  //   creator_share_amount → current owner of each worker
  //   parent_share_amount  → immediate parent creator on forks of Creator-authored workers
  // Events that pre-date 50.5 don't have these fields; treat missing as zero
  // (they contribute nothing, which is correct — they had no Creator share by definition).
  // Refunded events (refunded_at present) are skipped.
  const creatorShares = {};
  const parentShares = {};
  // Track event creator_status so we can short-circuit transfer attempts for
  // deleted Creators without a fresh Firestore lookup per event.
  const lastSeenStatus = {};
  events.forEach(e => {
    if (e.refunded_at) return;
    const cId = e.creator_id;
    const cAmt = Number(e.creator_share_amount || 0);
    if (cId && cAmt > 0) {
      creatorShares[cId] = (creatorShares[cId] || 0) + cAmt;
      if (e.creator_status) lastSeenStatus[cId] = e.creator_status;
    }
    const pId = e.parent_creator_id;
    const pAmt = Number(e.parent_share_amount || 0);
    if (pId && pAmt > 0) {
      parentShares[pId] = (parentShares[pId] || 0) + pAmt;
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

  // CODEX 50.5 — single per-creator payout helper. Used for both
  // creatorShares and parentShares streams. Handles:
  //   - Below-threshold deferral (existing)
  //   - No Connect account → defer (active) OR escheat (deleted/suspended)
  //   - Pending clawbacks against this creator → reduce payout, record applied
  //   - Transfer + record creatorPayouts row
  async function payoutToCreator(creatorId, amount, role /* "creator"|"parent" */) {
    if (amount < pricing.creatorMinPayoutThreshold) {
      // Below threshold — defer to next cycle (matches existing semantics).
      return;
    }

    // Apply any pending clawbacks against this creator's next payout.
    let clawbackApplied = 0;
    try {
      const clawSnap = await db.collection("creatorClawbacks")
        .where("creatorId", "==", creatorId)
        .where("status", "==", "pending")
        .limit(20)
        .get();
      for (const c of clawSnap.docs) {
        const cAmt = Number(c.data().amount || 0);
        const reduce = Math.min(cAmt, amount - clawbackApplied);
        if (reduce > 0) {
          clawbackApplied += reduce;
          await c.ref.update({
            status: reduce >= cAmt ? "applied" : "partial",
            appliedAmount: admin.firestore.FieldValue.increment(reduce),
            appliedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        if (clawbackApplied >= amount) break;
      }
    } catch (cErr) {
      console.warn(`[cycle-close] clawback lookup failed for ${creatorId}:`, cErr.message);
    }
    const netAmount = amount - clawbackApplied;
    if (netAmount <= 0) {
      await logActivity("revenue", `Cycle close: ${creatorId} payout fully consumed by clawback ($${amount.toFixed(2)})`, "info");
      return;
    }

    try {
      const creatorSnap = await db.collection("users").doc(creatorId).get();
      const creatorData = creatorSnap.exists ? creatorSnap.data() : {};
      const connectAccountId = creatorData.stripeConnectAccountId;
      const eventStatus = lastSeenStatus[creatorId];
      const userDeleted = !!(creatorData.deleted_at || creatorData.deletedAt) || eventStatus === "deleted";
      const userSuspended = creatorData.suspended === true || creatorData.status === "suspended" || eventStatus === "suspended";

      // Escheat path — deleted/suspended Creator with no live Connect account.
      // Per D6, money is recorded as platform-owned rather than lost.
      if (!connectAccountId && (userDeleted || userSuspended)) {
        await db.collection("platformEscheats").add({
          creatorId,
          role,
          grossAmount: amount,
          clawbackApplied,
          netAmount,
          reason: userDeleted ? "creator_deleted_no_connect" : "creator_suspended_no_connect",
          billingPeriodEnd: periodEnd.toISOString(),
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        await logActivity("revenue", `Escheat: $${netAmount.toFixed(2)} from ${creatorId} (${role}) — no Connect account, status ${eventStatus || "unknown"}`, "info");
        return;
      }

      if (!connectAccountId) {
        console.warn(`Creator ${creatorId} (${role}) has no Connect account — deferring $${netAmount.toFixed(2)}`);
        await db.collection("creatorPayouts").add({
          creatorId,
          role,
          grossAmount: amount,
          clawbackApplied,
          amount: netAmount,
          status: "deferred",
          reason: "no_connect_account",
          billingPeriodEnd: periodEnd.toISOString(),
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      await stripe.transfers.create({
        amount: Math.round(netAmount * 100),
        currency: "usd",
        destination: connectAccountId,
        description: role === "parent"
          ? `SOCIII parent-creator share — ${periodEnd.toISOString().slice(0, 10)}`
          : `SOCIII creator inference share — ${periodEnd.toISOString().slice(0, 10)}`,
      });

      await db.collection("creatorPayouts").add({
        creatorId,
        role,
        grossAmount: amount,
        clawbackApplied,
        amount: netAmount,
        status: "transferred",
        stripeConnectAccountId: connectAccountId,
        billingPeriodEnd: periodEnd.toISOString(),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      await logActivity("revenue", `Creator payout (${role}): $${netAmount.toFixed(2)} to ${creatorId}${clawbackApplied ? ` (after $${clawbackApplied.toFixed(2)} clawback)` : ""}`, "success");
    } catch (err) {
      console.error(`Creator payout failed for ${creatorId} (${role}):`, err.message);
      await db.collection("creatorPayouts").add({
        creatorId,
        role,
        amount: netAmount,
        grossAmount: amount,
        clawbackApplied,
        status: "failed",
        error: err.message,
        billingPeriodEnd: periodEnd.toISOString(),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  for (const [creatorId, amount] of Object.entries(creatorShares)) {
    await payoutToCreator(creatorId, amount, "creator");
  }
  // CODEX 50.5 — pay parent creators on forks of Creator-authored workers.
  for (const [parentId, amount] of Object.entries(parentShares)) {
    await payoutToCreator(parentId, amount, "parent");
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
                trialStatus: CANCELLED,
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

        // Box plan activation (Business in a Box / Academia in a Box)
        if (checkoutType === "box_subscription") {
          const boxTenantId = data.metadata?.tenantId;
          const boxPlan = data.metadata?.plan;
          const boxSubId = data.metadata?.subscriptionId;
          const boxSeats = parseInt(data.metadata?.seatCount || "0", 10) || null;
          if (boxTenantId) {
            await db.collection("tenants").doc(boxTenantId).set({
              boxPlan,
              boxPlanStatus: "active",
              boxPlanSeats: boxSeats,
              boxPlanActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
              boxPlanStripeSubscriptionId: data.subscription || null,
            }, { merge: true });
            if (boxSubId) {
              await db.collection("subscriptions").doc(boxSubId).update({
                status: "active",
                stripeSubscriptionId: data.subscription || null,
                stripeCheckoutSessionId: data.id,
                activatedAt: admin.firestore.FieldValue.serverTimestamp(),
              }).catch((e) => console.warn("[webhook] box sub update failed:", e.message));
            }
            await logActivity("revenue", `Box plan activated: ${boxPlan} for tenant ${boxTenantId} (${boxSeats || "?"} seats)`, "success");
          }
          break;
        }

        // Worker subscription activation (Stripe Checkout for paid workers)
        if (checkoutType === "worker_subscription" && userId) {
          const wsWorkerId = data.metadata?.workerId;
          const wsSubscriptionId = data.metadata?.subscriptionId;
          const wsWorkerName = data.metadata?.workerName || "Digital Worker";

          if (wsWorkerId) {
            // Activate the pending subscription
            if (wsSubscriptionId) {
              await db.collection("subscriptions").doc(wsSubscriptionId).update({
                trialStatus: TRIAL_ACTIVE,
                stripeSubscriptionId: data.subscription || null,
                stripeCheckoutSessionId: data.id,
                activatedAt: admin.firestore.FieldValue.serverTimestamp(),
                trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              });
            } else {
              await db.collection("subscriptions").add({
                userId,
                workerId: wsWorkerId,
                slug: wsWorkerId,
                workerName: wsWorkerName,
                trialStatus: TRIAL_ACTIVE,
                stripeSubscriptionId: data.subscription || null,
                stripeCheckoutSessionId: data.id,
                activatedAt: admin.firestore.FieldValue.serverTimestamp(),
                trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }

            // Add to vault
            await db.doc(`vaults/${userId}/workers/${wsWorkerId}`).set({
              workerId: wsWorkerId,
              workerName: wsWorkerName,
              slug: wsWorkerId,
              subscriptionId: wsSubscriptionId || null,
              addedAt: admin.firestore.FieldValue.serverTimestamp(),
              source: "stripe_checkout",
            });

            // Queue opening message
            await db.collection("workerMessages").add({
              userId,
              workerId: wsWorkerId,
              direction: "worker_to_user",
              message: `Hi, I'm ${wsWorkerName}. I'm ready to help. What would you like to start with?`,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
            });

            // 49.32 — tenant-aware. When this subscription is tenant-scoped,
            // do NOT write to users/{userId} or allocate user credits;
            // allocate to tenant pool instead. Credits remain 49 tier defaults.
            const wsOwnerType = data.metadata?.ownerType || "user";
            const wsOwnerId = data.metadata?.ownerId || userId;
            const wsTenantId = wsOwnerType === "tenant" ? wsOwnerId : null;

            if (wsOwnerType === "user" && data.subscription) {
              await db.collection("users").doc(userId).set({
                stripeSubscriptionId: data.subscription,
                stripeSubscriptionStatus: "trialing",
              }, { merge: true });
            } else if (wsOwnerType === "tenant" && wsTenantId && data.subscription) {
              await db.collection("tenants").doc(wsTenantId).set({
                stripeSubscriptionIds: admin.firestore.FieldValue.arrayUnion(data.subscription),
                lastSubscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
              }, { merge: true });
            }

            // Initialize credit balance based on worker tier (route to right pool).
            try {
              const TIER_CREDITS = { 0: 100, 29: 500, 49: 1500, 79: 3000 };
              const dwSnap = await db.doc(`digitalWorkers/${wsWorkerId}`).get();
              const workerTier = dwSnap.exists ? (dwSnap.data().pricing_tier || dwSnap.data().price || 49) : 49;
              const creditAllocation = TIER_CREDITS[workerTier] || 500;

              if (wsOwnerType === "tenant" && wsTenantId) {
                await db.doc(`tenants/${wsTenantId}`).set({
                  prepaidCredits: admin.firestore.FieldValue.increment(creditAllocation),
                  lastCreditAllocationAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                console.log(`[stripeWebhook] Allocated ${creditAllocation} credits to tenant ${wsTenantId} (tier: $${workerTier})`);
              } else {
                await db.doc(`users/${userId}`).set({
                  prepaidCredits: admin.firestore.FieldValue.increment(creditAllocation),
                  billing: {
                    prepaidCredits: admin.firestore.FieldValue.increment(creditAllocation),
                    tier: `$${workerTier}`,
                    lastCreditAllocationAt: admin.firestore.FieldValue.serverTimestamp(),
                  },
                }, { merge: true });
                console.log(`[stripeWebhook] Allocated ${creditAllocation} credits to ${userId} (tier: $${workerTier})`);
              }
            } catch (creditErr) {
              console.error(`[stripeWebhook] Credit allocation failed for ${userId}:`, creditErr.message);
            }

            await logActivity("revenue", `Worker subscription: ${wsWorkerName} for ${userId}`, "success", {
              workerId: wsWorkerId, userId,
            });
          }
          break;
        }

        // Balance top-up (34.11-T2)
        if (checkoutType === "balance_topup" && userId) {
          const { creditBalanceFromCheckout } = require("./usageProcessor");
          await creditBalanceFromCheckout(data);
          await logActivity("revenue", `Balance top-up: $${data.metadata?.amount || "?"} for user ${userId}`, "success");
          break;
        }

        // Credit pack purchase (49.32 — tenant-aware)
        const credits = parseInt(data.metadata?.credits || "0", 10);
        const ckScope = data.metadata?.scope || (data.metadata?.tenantId ? "tenant" : "user");
        const ckTenantId = data.metadata?.tenantId || null;
        if (credits > 0 && ckScope === "tenant" && ckTenantId) {
          await db.collection("tenants").doc(ckTenantId).set(
            {
              prepaidCredits: admin.firestore.FieldValue.increment(credits),
              lastCreditTopupAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          await logActivity("revenue", `Credit pack purchased (tenant): ${credits} credits for tenant ${ckTenantId} (admin ${userId})`, "success");
        } else if (credits > 0 && userId) {
          // 49.32 — write to root prepaidCredits AND legacy billing.prepaidCredits
          // so reads from either path see the increment until the cleanup CODEX.
          await db.collection("users").doc(userId).set(
            {
              prepaidCredits: admin.firestore.FieldValue.increment(credits),
              billing: { prepaidCredits: admin.firestore.FieldValue.increment(credits) },
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

      // ---- STRIPE IDENTITY (IR investor flow) ----
      case "identity.verification_session.verified":
      case "identity.verification_session.requires_input":
      case "identity.verification_session.processing":
      case "identity.verification_session.canceled":
      case "identity.verification_session.created": {
        try {
          const stripeIdentity = require("../services/identity/stripeIdentity");
          const result = await stripeIdentity.handleIdentityWebhookEvent(event);
          if (result?.action === "approved") {
            await logActivity(
              "system",
              `IR investor identity verified: ${result.fundraiseId}/${result.investorId}`,
              "success"
            );
          }
        } catch (e) {
          console.error("Stripe Identity webhook handler failed:", e.message);
          await logActivity("error", `Stripe Identity webhook failed: ${e.message}`, "error");
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
