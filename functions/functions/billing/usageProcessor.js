"use strict";

/**
 * usageProcessor.js — Usage event processing, deposit/prepay balance, billing status
 *
 * Processes usageEvents logged by Document Control (34.10-T2) against tier
 * allowances. Handles deposit top-up, auto-recharge, and billing status endpoints.
 *
 * Event types: signature_request, blockchain_record, document_storage_gb
 * Overage: $1 per event after monthly allowance (per config/pricing.js)
 *
 * ⚠ Flagged for Kent Redwine review before going live to paying customers.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");
const pricing = require("../config/pricing");

function getDb() { return admin.firestore(); }
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

// ═══════════════════════════════════════════════════════════════
//  USAGE EVENT PROCESSOR — scheduled hourly
// ═══════════════════════════════════════════════════════════════

/**
 * Process all unbilled usage events across all operators.
 * Calculates overage, deducts from balance or reports to Stripe metering.
 */
async function processUsageEvents() {
  const db = getDb();
  let totalProcessed = 0;
  let totalOverage = 0;

  // Get all operators with documentControl docs
  const operatorDocs = await db.collection("documentControl").listDocuments();

  for (const opDoc of operatorDocs) {
    const operatorId = opDoc.id;

    try {
      // Query unbilled events
      const unbilledSnap = await db.collection("usageEvents").doc(operatorId)
        .collection("events")
        .where("billed", "==", false)
        .limit(500)
        .get();

      if (unbilledSnap.empty) continue;

      // Group by eventType
      const byType = {};
      const eventDocs = [];
      unbilledSnap.forEach(doc => {
        const data = doc.data();
        const type = data.eventType;
        if (!byType[type]) byType[type] = 0;
        byType[type] += (data.amount || 1);
        eventDocs.push(doc);
      });

      // Look up operator tier
      const userSnap = await db.collection("users").doc(operatorId).get();
      const userData = userSnap.exists ? userSnap.data() : {};
      const tier = userData.tier || "free";
      const billing = userData.billing || {};

      // Get already-billed counts this month for this operator
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const billedSnap = await db.collection("usageEvents").doc(operatorId)
        .collection("events")
        .where("billed", "==", true)
        .where("billedAt", ">=", admin.firestore.Timestamp.fromDate(monthStart))
        .get();

      const billedByType = {};
      billedSnap.forEach(doc => {
        const data = doc.data();
        const type = data.eventType;
        if (!billedByType[type]) billedByType[type] = 0;
        billedByType[type] += (data.amount || 1);
      });

      // Calculate overage per type
      const allowances = pricing.documentControlAllowances[tier] || pricing.documentControlAllowances.free;
      const overages = {};

      for (const [eventType, newCount] of Object.entries(byType)) {
        const alreadyUsed = billedByType[eventType] || 0;
        let allowance = 0;

        if (eventType === "signature_request") {
          allowance = allowances.signatures ?? 0;
        } else if (eventType === "blockchain_record") {
          allowance = allowances.blockchainRecords ?? 0;
        } else {
          // document_storage_gb — no overage billing yet
          continue;
        }

        // Enterprise with null allowance = unlimited
        if (allowance === null) continue;

        const totalUsed = alreadyUsed + newCount;
        const overageCount = Math.max(0, totalUsed - allowance);
        // Only count NEW overage (subtract previously billed overage)
        const previousOverage = Math.max(0, alreadyUsed - allowance);
        const newOverage = Math.max(0, overageCount - previousOverage);

        if (newOverage > 0) {
          overages[eventType] = newOverage;
        }
      }

      // Process overages
      const totalOverageAmount = Object.entries(overages).reduce((sum, [type, count]) => {
        const rate = pricing.overageRates[type] || 0;
        return sum + (count * rate);
      }, 0);

      if (totalOverageAmount > 0) {
        totalOverage += totalOverageAmount;

        if (billing.balance && billing.balance >= totalOverageAmount) {
          // Deduct from prepaid balance
          const newBalance = +(billing.balance - totalOverageAmount).toFixed(2);
          await db.collection("users").doc(operatorId).update({
            "billing.balance": newBalance,
            "billing.lastDeductedAt": admin.firestore.FieldValue.serverTimestamp(),
          });

          // Check if balance warning needed
          if (newBalance <= (billing.autoRechargeThreshold || pricing.autoRechargeThresholdDefault)) {
            await _enqueueAlexNotification(operatorId, "low_balance", {
              balance: newBalance,
              threshold: billing.autoRechargeThreshold || pricing.autoRechargeThresholdDefault,
            });
          }
        } else if (userData.stripeMeteredItemId) {
          // Report to Stripe metered billing
          try {
            const stripe = getStripe();
            for (const [type, count] of Object.entries(overages)) {
              const meterEvent = type === "signature_request"
                ? pricing.stripeMeterEvents.signatureOverage
                : pricing.stripeMeterEvents.blockchainOverage;

              await stripe.billing.meterEvents.create({
                event_name: meterEvent,
                payload: {
                  stripe_customer_id: userData.stripeCustomerId,
                  value: String(count),
                },
              }).catch(err => {
                console.error(`Stripe meter report failed for ${operatorId}/${type}:`, err.message);
              });
            }
          } catch (stripeErr) {
            console.error(`Stripe metering failed for ${operatorId}:`, stripeErr.message);
          }
        } else {
          // No balance, no Stripe metering — flag operator
          await db.collection("users").doc(operatorId).update({
            "billing.degraded": true,
            "billing.degradedAt": admin.firestore.FieldValue.serverTimestamp(),
            "billing.degradedReason": "insufficient_balance",
          });
          await _enqueueAlexNotification(operatorId, "billing_degraded", {
            overageAmount: totalOverageAmount,
            overages,
          });
        }
      }

      // Mark all events as billed
      const batchSize = 450;
      for (let i = 0; i < eventDocs.length; i += batchSize) {
        const batch = db.batch();
        const slice = eventDocs.slice(i, i + batchSize);
        for (const doc of slice) {
          batch.update(doc.ref, {
            billed: true,
            billedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        await batch.commit();
      }

      totalProcessed += eventDocs.length;

    } catch (opErr) {
      console.error(`usageProcessor: error processing operator ${operatorId}:`, opErr.message);
    }
  }

  console.log(`usageEventProcessor: ${totalProcessed} events processed, $${totalOverage.toFixed(2)} overage`);
  return { processed: totalProcessed, overageTotal: totalOverage };
}

// ═══════════════════════════════════════════════════════════════
//  BALANCE TOP-UP — Stripe Checkout
// ═══════════════════════════════════════════════════════════════

/**
 * Create a Stripe Checkout session for balance top-up.
 */
async function handleTopUpBalance(req, res, { userId }) {
  const { amount, successUrl, cancelUrl } = req.body || {};

  if (!pricing.depositAmounts.includes(amount)) {
    return res.status(400).json({
      ok: false,
      error: `Invalid amount. Choose one of: $${pricing.depositAmounts.join(", $")}`,
      code: "INVALID_AMOUNT",
    });
  }

  const db = getDb();
  const stripe = getStripe();

  // Get or create Stripe customer
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) {
    return res.status(404).json({ ok: false, error: "User not found", code: "NOT_FOUND" });
  }
  const userData = userSnap.data();
  let customerId = userData.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.email,
      metadata: { userId },
    });
    customerId = customer.id;
    await db.collection("users").doc(userId).update({ stripeCustomerId: customerId });
  }

  // Create Checkout session for one-time payment
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: `TitleApp Balance Top-Up — $${amount}`,
          description: "Prepaid balance for usage overages (signatures, blockchain records)",
        },
        unit_amount: amount * 100, // cents
      },
      quantity: 1,
    }],
    metadata: { userId, type: "balance_topup", amount: String(amount) },
    success_url: successUrl || "https://titleapp.ai?topup=success",
    cancel_url: cancelUrl || "https://titleapp.ai?topup=cancel",
  });

  return res.json({ ok: true, checkoutUrl: session.url, sessionId: session.id });
}

/**
 * Handle successful balance top-up from Stripe webhook.
 * Called from stripeWebhook.js on checkout.session.completed with type=balance_topup.
 */
async function creditBalanceFromCheckout(session) {
  const { userId, amount } = session.metadata || {};
  if (!userId || !amount) return;

  const db = getDb();
  const amountNum = parseFloat(amount);

  await db.collection("users").doc(userId).update({
    "billing.balance": admin.firestore.FieldValue.increment(amountNum),
    "billing.lastTopUpAt": admin.firestore.FieldValue.serverTimestamp(),
    "billing.degraded": false,
    "billing.degradedReason": null,
  });

  // Record payment
  await db.collection("payments").add({
    userId,
    type: "balance_topup",
    amount: amountNum,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Balance top-up: ${userId} +$${amountNum}`);
}

// ═══════════════════════════════════════════════════════════════
//  BILLING STATUS
// ═══════════════════════════════════════════════════════════════

/**
 * Get billing status for an operator: tier, balance, usage, allowances.
 */
async function handleGetBillingStatus(req, res, { userId }) {
  const db = getDb();
  const userSnap = await db.collection("users").doc(userId).get();

  if (!userSnap.exists) {
    return res.status(404).json({ ok: false, error: "User not found", code: "NOT_FOUND" });
  }

  const userData = userSnap.data();
  const tier = userData.tier || "free";
  const billing = userData.billing || {};
  const tierConfig = pricing.subscriptionTiers[tier] || pricing.subscriptionTiers.free;
  const dcAllowances = pricing.documentControlAllowances[tier] || pricing.documentControlAllowances.free;

  // Get current month usage counts from usageEvents
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const usageCounts = { signature_request: 0, blockchain_record: 0, document_storage_gb: 0 };

  try {
    const eventsSnap = await db.collection("usageEvents").doc(userId)
      .collection("events")
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(monthStart))
      .get();

    eventsSnap.forEach(doc => {
      const data = doc.data();
      if (usageCounts[data.eventType] !== undefined) {
        usageCounts[data.eventType] += (data.amount || 1);
      }
    });
  } catch (_) { /* no events yet */ }

  // Build alerts
  const alerts = [];
  if (dcAllowances.signatures !== null && usageCounts.signature_request >= dcAllowances.signatures * 0.8 && usageCounts.signature_request < dcAllowances.signatures) {
    alerts.push({ type: "warning", message: `You've used ${usageCounts.signature_request} of ${dcAllowances.signatures} included signatures this month.` });
  }
  if (dcAllowances.signatures !== null && usageCounts.signature_request >= dcAllowances.signatures) {
    alerts.push({ type: "overage", message: `You've exceeded your signature allowance. Additional signatures are $${pricing.overageRates.signature_request} each.` });
  }
  if (dcAllowances.blockchainRecords !== null && usageCounts.blockchain_record >= dcAllowances.blockchainRecords) {
    alerts.push({ type: "overage", message: `You've exceeded your blockchain record allowance. Additional records are $${pricing.overageRates.blockchain_record} each.` });
  }
  if (billing.balance !== undefined && billing.balance <= (billing.autoRechargeThreshold || pricing.autoRechargeThresholdDefault)) {
    alerts.push({ type: "low_balance", message: `Your balance is $${(billing.balance || 0).toFixed(2)}. Auto-recharge triggers at $${billing.autoRechargeThreshold || pricing.autoRechargeThresholdDefault}.` });
  }
  if (billing.degraded) {
    alerts.push({ type: "degraded", message: "Billing is degraded. New usage events are paused until your balance is restored." });
  }

  return res.json({
    ok: true,
    tier,
    balance: billing.balance || 0,
    autoRecharge: {
      enabled: billing.autoRechargeEnabled || false,
      amount: billing.autoRechargeAmount || pricing.autoRechargeAmountDefault,
      threshold: billing.autoRechargeThreshold || pricing.autoRechargeThresholdDefault,
    },
    usage: {
      signatures: {
        used: usageCounts.signature_request,
        allowance: dcAllowances.signatures,
        overage: dcAllowances.signatures !== null ? Math.max(0, usageCounts.signature_request - dcAllowances.signatures) : 0,
      },
      blockchainRecords: {
        used: usageCounts.blockchain_record,
        allowance: dcAllowances.blockchainRecords,
        overage: dcAllowances.blockchainRecords !== null ? Math.max(0, usageCounts.blockchain_record - dcAllowances.blockchainRecords) : 0,
      },
      inferenceCredits: {
        used: userData.usageThisMonth || 0,
        allowance: tierConfig.creditsIncluded,
      },
    },
    degraded: billing.degraded || false,
    alerts,
  });
}

// ═══════════════════════════════════════════════════════════════
//  AUTO-RECHARGE SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Update auto-recharge settings.
 */
async function handleUpdateAutoRecharge(req, res, { userId }) {
  const { enabled, amount, threshold } = req.body || {};
  const db = getDb();

  const update = {};
  if (enabled !== undefined) update["billing.autoRechargeEnabled"] = !!enabled;
  if (amount !== undefined) {
    if (!pricing.depositAmounts.includes(amount)) {
      return res.status(400).json({ ok: false, error: `Amount must be one of: $${pricing.depositAmounts.join(", $")}`, code: "INVALID_AMOUNT" });
    }
    update["billing.autoRechargeAmount"] = amount;
  }
  if (threshold !== undefined) {
    if (typeof threshold !== "number" || threshold < 0) {
      return res.status(400).json({ ok: false, error: "Threshold must be a non-negative number", code: "INVALID_THRESHOLD" });
    }
    update["billing.autoRechargeThreshold"] = threshold;
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ ok: false, error: "No settings to update", code: "MISSING_FIELD" });
  }

  await db.collection("users").doc(userId).update(update);

  return res.json({ ok: true, updated: Object.keys(update).length });
}

// ═══════════════════════════════════════════════════════════════
//  USAGE HISTORY — last 3 months
// ═══════════════════════════════════════════════════════════════

/**
 * Get usage history for the last 3 months.
 */
async function handleGetUsageHistory(req, res, { userId }) {
  const db = getDb();
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  const eventsSnap = await db.collection("usageEvents").doc(userId)
    .collection("events")
    .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(threeMonthsAgo))
    .orderBy("timestamp", "desc")
    .limit(500)
    .get();

  // Group by month and eventType
  const months = {};
  eventsSnap.forEach(doc => {
    const data = doc.data();
    const ts = data.timestamp?.toDate?.() || new Date();
    const monthKey = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}`;

    if (!months[monthKey]) months[monthKey] = { signature_request: 0, blockchain_record: 0, document_storage_gb: 0, total: 0 };
    months[monthKey][data.eventType] = (months[monthKey][data.eventType] || 0) + (data.amount || 1);
    months[monthKey].total++;
  });

  // Also include inference credit history from usageHistory
  const historySnap = await db.collection("usageHistory")
    .where("userId", "==", userId)
    .orderBy("month", "desc")
    .limit(3)
    .get();

  const creditHistory = {};
  historySnap.forEach(doc => {
    const data = doc.data();
    creditHistory[data.month] = {
      totalCalls: data.totalCalls || 0,
      tier: data.tier,
      monthlyAllowance: data.monthlyAllowance,
    };
  });

  return res.json({
    ok: true,
    documentControlUsage: months,
    inferenceHistory: creditHistory,
  });
}

// ═══════════════════════════════════════════════════════════════
//  BALANCE RECHARGE CHECK — scheduled every 15 minutes
// ═══════════════════════════════════════════════════════════════

/**
 * Check all operators with auto-recharge enabled and low balance.
 * Triggers Stripe payment if balance is below threshold.
 */
async function checkBalanceRecharge() {
  const db = getDb();
  let recharged = 0;
  let failed = 0;

  // Query users with auto-recharge enabled
  const usersSnap = await db.collection("users")
    .where("billing.autoRechargeEnabled", "==", true)
    .get();

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    const billing = userData.billing || {};
    const balance = billing.balance || 0;
    const threshold = billing.autoRechargeThreshold || pricing.autoRechargeThresholdDefault;
    const rechargeAmount = billing.autoRechargeAmount || pricing.autoRechargeAmountDefault;

    if (balance >= threshold) continue;
    if (!userData.stripeCustomerId) continue;

    // Avoid double-charging: check if recharge happened in last 15 minutes
    if (billing.lastRechargeAt) {
      const lastRecharge = billing.lastRechargeAt.toDate ? billing.lastRechargeAt.toDate() : new Date(billing.lastRechargeAt);
      if (Date.now() - lastRecharge.getTime() < 15 * 60 * 1000) continue;
    }

    try {
      const stripe = getStripe();

      // Get default payment method
      const customer = await stripe.customers.retrieve(userData.stripeCustomerId);
      const paymentMethodId = customer.invoice_settings?.default_payment_method;

      if (!paymentMethodId) {
        console.error(`balanceRecharge: no payment method for ${userDoc.id}`);
        await _flagDegraded(userDoc.id, "no_payment_method");
        failed++;
        continue;
      }

      // Create and confirm payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: rechargeAmount * 100, // cents
        currency: "usd",
        customer: userData.stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        description: `TitleApp auto-recharge — $${rechargeAmount}`,
        metadata: { userId: userDoc.id, type: "auto_recharge", amount: String(rechargeAmount) },
      });

      if (paymentIntent.status === "succeeded") {
        // Credit balance
        await db.collection("users").doc(userDoc.id).update({
          "billing.balance": admin.firestore.FieldValue.increment(rechargeAmount),
          "billing.lastRechargeAt": admin.firestore.FieldValue.serverTimestamp(),
          "billing.degraded": false,
          "billing.degradedReason": null,
        });

        await db.collection("payments").add({
          userId: userDoc.id,
          type: "auto_recharge",
          amount: rechargeAmount,
          stripePaymentIntentId: paymentIntent.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        recharged++;
        console.log(`balanceRecharge: ${userDoc.id} +$${rechargeAmount}`);
      } else {
        await _flagDegraded(userDoc.id, "payment_incomplete");
        failed++;
      }

    } catch (err) {
      console.error(`balanceRecharge failed for ${userDoc.id}:`, err.message);
      await _flagDegraded(userDoc.id, err.message);
      failed++;
    }
  }

  console.log(`balanceRechargeCheck: ${recharged} recharged, ${failed} failed`);
  return { recharged, failed };
}

// ═══════════════════════════════════════════════════════════════
//  KENT REVIEW FLAGS — admin endpoint
// ═══════════════════════════════════════════════════════════════

/**
 * Surfaces billing flags for Kent's review.
 * ⚠ Do not go live with billing to paying customers until Kent has approved.
 */
async function handleGetKentFlags(req, res) {
  const db = getDb();

  // 1. Prepay balance revenue recognition — total liability
  let totalPrepaidBalance = 0;
  const balanceSnap = await db.collection("users")
    .where("billing.balance", ">", 0)
    .get();
  balanceSnap.forEach(doc => {
    totalPrepaidBalance += (doc.data().billing?.balance || 0);
  });

  // 2. Overage count by operator (this month)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const operatorOverages = [];

  const operatorDocs = await db.collection("documentControl").listDocuments();
  for (const opDoc of operatorDocs.slice(0, 50)) { // limit for performance
    const eventsSnap = await db.collection("usageEvents").doc(opDoc.id)
      .collection("events")
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(monthStart))
      .get();

    if (eventsSnap.size > 0) {
      const counts = {};
      eventsSnap.forEach(doc => {
        const type = doc.data().eventType;
        counts[type] = (counts[type] || 0) + (doc.data().amount || 1);
      });
      operatorOverages.push({ operatorId: opDoc.id, events: eventsSnap.size, byType: counts });
    }
  }

  // 3. Creators approaching $600 W-9/1099-K threshold
  const creatorsApproaching1099 = [];
  const payoutsSnap = await db.collection("creatorPayouts")
    .where("status", "==", "transferred")
    .get();

  const creatorTotals = {};
  payoutsSnap.forEach(doc => {
    const data = doc.data();
    if (!data.creatorId) return;
    if (!creatorTotals[data.creatorId]) creatorTotals[data.creatorId] = 0;
    creatorTotals[data.creatorId] += (data.amount || 0);
  });

  for (const [creatorId, total] of Object.entries(creatorTotals)) {
    if (total >= 400) { // flag at $400 (approaching $600)
      creatorsApproaching1099.push({ creatorId, ytdPayout: +total.toFixed(2), threshold: 600 });
    }
  }

  // 4. Connect payout holds exceeding 4 weeks
  const holdWarnings = [];
  const fourWeeksAgo = new Date(Date.now() - pricing.creatorMaxPayoutHoldWeeks * 7 * 24 * 60 * 60 * 1000);
  const deferredSnap = await db.collection("creatorPayouts")
    .where("status", "==", "deferred")
    .get();

  deferredSnap.forEach(doc => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate?.();
    if (createdAt && createdAt < fourWeeksAgo) {
      holdWarnings.push({
        payoutId: doc.id,
        creatorId: data.creatorId,
        amount: data.amount,
        deferredSince: createdAt.toISOString(),
        weeksHeld: Math.ceil((Date.now() - createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)),
      });
    }
  });

  return res.json({
    ok: true,
    kentReviewRequired: true,
    flags: {
      prepayBalanceLiability: {
        description: "Prepaid balances are liabilities until consumed. Review revenue recognition treatment.",
        totalBalance: +totalPrepaidBalance.toFixed(2),
        operatorCount: balanceSnap.size,
      },
      overageTaxTreatment: {
        description: "Are signature and blockchain overages subject to sales tax in operator's jurisdiction?",
        operatorsWithUsage: operatorOverages.length,
        details: operatorOverages,
      },
      w9Threshold: {
        description: "Creators approaching $600/year W-9/1099-K reporting threshold.",
        creatorsApproaching: creatorsApproaching1099,
      },
      connectPayoutHolds: {
        description: "Stripe Connect payout holds exceeding 4-week maximum.",
        holds: holdWarnings,
      },
    },
  });
}

// ═══════════════════════════════════════════════════════════════
//  INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════

async function _flagDegraded(userId, reason) {
  const db = getDb();
  await db.collection("users").doc(userId).update({
    "billing.degraded": true,
    "billing.degradedAt": admin.firestore.FieldValue.serverTimestamp(),
    "billing.degradedReason": reason,
  });
  await _enqueueAlexNotification(userId, "recharge_failed", { reason });
}

/**
 * Enqueue an Alex notification via messageQueue.
 */
async function _enqueueAlexNotification(userId, notificationType, context = {}) {
  const db = getDb();

  const subjects = {
    low_balance: "Your TitleApp balance is running low",
    billing_degraded: "Usage events paused — balance needed",
    recharge_failed: "Auto-recharge failed — update payment method",
    overage_80pct: "Approaching monthly allowance limit",
    overage_100pct: "Monthly allowance exceeded",
  };

  const bodies = {
    low_balance: `Your TitleApp balance is $${(context.balance || 0).toFixed(2)}. Auto-recharge will trigger at $${context.threshold || 20}. Want to adjust your auto-recharge settings?`,
    billing_degraded: `New usage events are paused until your balance is restored. Outstanding overage: $${(context.overageAmount || 0).toFixed(2)}. Top up your balance in Settings.`,
    recharge_failed: `Your auto-recharge failed (${context.reason || "payment declined"}). Update your payment method in Settings to restore service.`,
    overage_80pct: `You've used 80% of your monthly allowance. Overages are $1 each. Want to upgrade your plan or top up your balance?`,
    overage_100pct: `You've reached your monthly allowance. Additional events are $1 each — deducted from your balance.`,
  };

  const subject = subjects[notificationType] || "TitleApp Billing Notification";
  const body = bodies[notificationType] || "";

  await db.collection("messageQueue").add({
    userId,
    campaignId: `billing_${notificationType}`,
    channel: "email",
    to: "",
    subject: `Alex — TitleApp: ${subject}`,
    body: `<p>${body.replace(/\n/g, "<br>")}</p><p style="color:#999;font-size:12px;">— Alex</p>`,
    textBody: body + "\n\n— Alex",
    scheduledAt: admin.firestore.Timestamp.fromDate(new Date()),
    status: "pending",
    sentAt: null,
    error: null,
    attempts: 0,
  });
}

module.exports = {
  processUsageEvents,
  handleTopUpBalance,
  handleGetBillingStatus,
  handleUpdateAutoRecharge,
  handleGetUsageHistory,
  checkBalanceRecharge,
  handleGetKentFlags,
  creditBalanceFromCheckout,
};
