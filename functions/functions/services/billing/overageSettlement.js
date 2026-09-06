"use strict";

/**
 * overageSettlement.js — the shared "actually collect the money" layer for
 * both overage payment paths (CODEX 88 §3/§4, built this pass).
 *
 * The gap this closes, confirmed by reading the code (not assumed): every
 * external-data-source call already runs through `dataFee.js`'s
 * `recordDataFee()`, which writes a fully-priced event to
 * `dataFeeEvents/{eventId}` with `billed: false, stripeInvoiceItemId: null`.
 * Nothing anywhere in the codebase ever reads that collection back to create
 * a Stripe charge — `usageProcessor.js`'s `billed == true` query drains a
 * DIFFERENT collection (`usageEvents`, Document Control: e-signatures /
 * blockchain records), confirmed by grep, not a citation. Data-fee revenue is
 * correctly priced and tracked, never collected. This file is the missing
 * "read it back and charge Stripe" step, and both overage payment paths
 * (institution auto-charge, individual à la carte) route through it instead
 * of duplicating charge logic.
 *
 * Design, mirroring the ALREADY-REAL per-user mechanism in
 * billing/usageProcessor.js (prepaid `users/{uid}.billing.balance`,
 * `stripeCustomerId`, invoice-item overage charging, fail-closed
 * `billing.degraded`) rather than inventing a new shape:
 *
 *   - Per-event PAYER resolution happens once, at `recordDataFee()` write
 *     time (see dataFee.js's `resolvePayer`) and is stamped onto the event
 *     (`payerType: "tenant" | "user"`). This file does not re-derive payer
 *     routing per event; it trusts the stamp so a mid-flight tenant config
 *     change never silently reclassifies an already-recorded event.
 *   - USER-scoped events (the default for both businessInABox "seat" and
 *     education "student" — Path 2, à la carte): `dataFee.js` already
 *     attempts real-time settlement against the user's real
 *     `billing.balance` at record time. This sweep is the fallback for
 *     whatever real-time settlement couldn't cover (insufficient balance) —
 *     it tries the user's saved Stripe payment method next, and only then
 *     flags `billing.degraded` (fail closed: never silently write off an
 *     unpaid charge).
 *   - TENANT-scoped events with `billing.overage.payerMode === "institution"`
 *     (Path 1, opt-in — mirrors CODEX 88 §3's "institution pool optional"):
 *     handed to `institutionOverage.js`, which owns the
 *     threshold/cap/manual-approval gate. This file only decides ROUTING —
 *     institutionOverage.js owns the money decision for that path.
 *
 * Both branches share `chargeInvoiceItemsToCustomer` below (the actual
 * Stripe call), generalized from usageProcessor.js's proven
 * `chargeOverageToStripe` so there is exactly one place that creates a real
 * charge from a data-fee event, not two copies that could drift.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");

function getDb() { return admin.firestore(); }
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

// Avoid double-charge storms: don't retry a user/tenant's Stripe charge more
// than once per this window. Mirrors usageProcessor.js's checkBalanceRecharge
// 15-minute de-dupe guard exactly.
const RETRY_GUARD_MS = 15 * 60 * 1000;

function recentlyAttempted(lastAttemptTs) {
  if (!lastAttemptTs) return false;
  const last = lastAttemptTs.toDate ? lastAttemptTs.toDate() : new Date(lastAttemptTs);
  return Date.now() - last.getTime() < RETRY_GUARD_MS;
}

/**
 * Create Stripe invoice items for a set of already-priced events and pay the
 * resulting invoice immediately. Generalized from
 * billing/usageProcessor.js's chargeOverageToStripe (Document Control
 * overage) so data-fee overage reuses the exact same proven charge path
 * instead of a second copy.
 *
 * @param {Stripe} stripe
 * @param {string} customerId
 * @param {Array<{label:string, costBilledCents:number, units:number}>} lineItems
 * @param {string} description  Shown on the invoice.
 * @returns {Promise<{invoiceId:string, totalCents:number}>}
 */
async function chargeInvoiceItemsToCustomer(stripe, customerId, lineItems, description) {
  for (const item of lineItems) {
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: Math.round(item.costBilledCents),
      currency: "usd",
      description: `${item.label} — ${item.units} unit${item.units === 1 ? "" : "s"}`,
    });
  }

  const invoice = await stripe.invoices.create({
    customer: customerId,
    auto_advance: true,
    description: description || "SOCIII data pass-through overage",
  });
  await stripe.invoices.finalizeInvoice(invoice.id);
  const paid = await stripe.invoices.pay(invoice.id);

  const totalCents = lineItems.reduce((sum, it) => sum + Math.round(it.costBilledCents), 0);
  return { invoiceId: paid.id, totalCents };
}

/**
 * Sweep unbilled, USER-payer dataFeeEvents (Path 2 fallback — real-time
 * settlement in dataFee.js already handles the common case of "balance
 * covers it"; this handles what real-time couldn't: insufficient balance at
 * call time, or events recorded before a Stripe customer/balance existed).
 *
 * Runs on the same hourly cadence as usageProcessor's processUsageEvents —
 * registered as a separate scheduled function (see index.js) so a bug in one
 * sweep can't stall the other.
 */
async function settleUserDataFeeEvents() {
  const db = getDb();
  let usersProcessed = 0;
  let totalChargedCents = 0;
  let degraded = 0;

  const unbilledSnap = await db.collection("dataFeeEvents")
    .where("billed", "==", false)
    .where("payerType", "==", "user")
    .limit(500)
    .get();

  if (unbilledSnap.empty) return { usersProcessed, totalChargedCents, degraded };

  // Group by userId — one settlement pass per user, not per event.
  const byUser = new Map();
  unbilledSnap.forEach((doc) => {
    const data = doc.data();
    if (!data.userId) return;
    if (!byUser.has(data.userId)) byUser.set(data.userId, []);
    byUser.get(data.userId).push({ ref: doc.ref, data });
  });

  const stripe = getStripe();

  for (const [userId, events] of byUser.entries()) {
    try {
      const owedCents = events.reduce((sum, e) => sum + (e.data.costBilledCents || 0), 0);
      if (owedCents <= 0) continue;

      const userRef = db.collection("users").doc(userId);
      const userSnap = await userRef.get();
      const userData = userSnap.exists ? userSnap.data() : {};
      const billing = userData.billing || {};

      // Retry-storm guard.
      if (recentlyAttempted(billing.lastDataFeeChargeAttemptAt)) continue;

      // Second chance at the real balance (may have been topped up since
      // recordDataFee's real-time attempt failed).
      const balanceCents = Math.round((billing.balance || 0) * 100);
      if (balanceCents >= owedCents) {
        const newBalance = +((billing.balance || 0) - owedCents / 100).toFixed(2);
        const batch = db.batch();
        batch.update(userRef, {
          "billing.balance": newBalance,
          "billing.lastDeductedAt": admin.firestore.FieldValue.serverTimestamp(),
        });
        for (const e of events) {
          batch.update(e.ref, { billed: true, billedAt: admin.firestore.FieldValue.serverTimestamp(), settledVia: "balance" });
        }
        await batch.commit();
        usersProcessed++;
        totalChargedCents += owedCents;
        continue;
      }

      if (!userData.stripeCustomerId) {
        await userRef.set({
          "billing.degraded": true,
          "billing.degradedAt": admin.firestore.FieldValue.serverTimestamp(),
          "billing.degradedReason": "data_fee_no_payment_method",
          "billing.lastDataFeeChargeAttemptAt": admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        degraded++;
        continue;
      }

      const lineItems = events.map((e) => ({
        label: e.data.label || e.data.source,
        costBilledCents: e.data.costBilledCents,
        units: e.data.units || 1,
      }));

      const { invoiceId, totalCents } = await chargeInvoiceItemsToCustomer(
        stripe, userData.stripeCustomerId, lineItems, "SOCIII data pass-through fees"
      );

      const batch = db.batch();
      for (const e of events) {
        batch.update(e.ref, {
          billed: true,
          billedAt: admin.firestore.FieldValue.serverTimestamp(),
          settledVia: "stripe_invoice",
          stripeInvoiceItemId: invoiceId,
        });
      }
      batch.update(userRef, {
        "billing.degraded": false,
        "billing.degradedReason": null,
        "billing.lastDataFeeChargeAttemptAt": admin.firestore.FieldValue.serverTimestamp(),
      });
      await batch.commit();

      usersProcessed++;
      totalChargedCents += totalCents;
      console.log(`[overageSettlement] user ${userId} charged $${(totalCents / 100).toFixed(2)} (invoice ${invoiceId})`);
    } catch (err) {
      console.error(`[overageSettlement] user ${userId} charge failed:`, err.message);
      try {
        await db.collection("users").doc(userId).set({
          "billing.degraded": true,
          "billing.degradedAt": admin.firestore.FieldValue.serverTimestamp(),
          "billing.degradedReason": "data_fee_stripe_charge_failed",
          "billing.lastDataFeeChargeAttemptAt": admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (_) { /* best-effort flag */ }
      degraded++;
    }
  }

  console.log(`[overageSettlement] settleUserDataFeeEvents: ${usersProcessed} users charged, $${(totalChargedCents / 100).toFixed(2)} total, ${degraded} degraded`);
  return { usersProcessed, totalChargedCents, degraded };
}

module.exports = {
  chargeInvoiceItemsToCustomer,
  settleUserDataFeeEvents,
  recentlyAttempted,
  RETRY_GUARD_MS,
};
