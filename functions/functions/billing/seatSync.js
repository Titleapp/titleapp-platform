"use strict";

/**
 * seatSync.js — quarterly Business/Academia in a Box seat reconciliation.
 *
 * Gap found 2026-08-20: seatCount is set once at Checkout time and never
 * re-synced. A tenant that grows from 5 to 10 seats keeps paying the
 * 5-seat price indefinitely — the platform under-bills as teams grow.
 * Sean's direction: sync + review once a quarter, not real-time.
 *
 * Stripe's seat price is tiered (first 5 seats free, per config/stripeBoxes.js's
 * own comment) — this only needs to push the current TOTAL active-membership
 * count as the subscription item's quantity; Stripe computes the free-tier
 * math itself, same as at Checkout time.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");
const boxes = require("../config/stripeBoxes");

function getDb() { return admin.firestore(); }
// No shared Stripe client module exists in this codebase (each billing/*.js
// file defines its own getStripe() the same way) - matching that pattern.
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

const PRICE_TO_PLAN = Object.fromEntries(
  Object.entries(boxes).map(([planKey, cfg]) => [cfg.seatPriceId, planKey])
);

async function syncOneTenant(stripe, db, tenantDoc) {
  const tenantId = tenantDoc.id;
  const t = tenantDoc.data();
  const stripeSubscriptionId = t.boxPlanStripeSubscriptionId;
  if (!stripeSubscriptionId) return { tenantId, skipped: "no stripeSubscriptionId" };

  const memSnap = await db.collection("memberships")
    .where("tenantId", "==", tenantId).where("status", "==", "active").get();
  const currentSeatCount = Math.max(1, memSnap.size);
  const lastSyncedSeats = t.boxPlanSeats || 0;

  if (currentSeatCount === lastSyncedSeats) return { tenantId, skipped: "unchanged", currentSeatCount };

  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const seatItem = sub.items.data.find((it) => PRICE_TO_PLAN[it.price?.id]);
  if (!seatItem) return { tenantId, skipped: "no matching seat line item on subscription", currentSeatCount };

  await stripe.subscriptionItems.update(seatItem.id, { quantity: currentSeatCount });
  await db.collection("tenants").doc(tenantId).set(
    { boxPlanSeats: currentSeatCount, boxPlanSeatsLastSyncedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );

  return { tenantId, updated: true, from: lastSyncedSeats, to: currentSeatCount };
}

async function syncBoxPlanSeats() {
  const db = getDb();
  const stripe = getStripe();
  const snap = await db.collection("tenants").where("boxPlanStatus", "==", "active").get();

  const results = [];
  for (const doc of snap.docs) {
    try {
      results.push(await syncOneTenant(stripe, db, doc));
    } catch (e) {
      console.error(`[seatSync] tenant ${doc.id} failed:`, e.message);
      results.push({ tenantId: doc.id, error: e.message });
    }
  }

  const updated = results.filter((r) => r.updated);
  const failed = results.filter((r) => r.error);
  console.log(`[seatSync] checked ${results.length} box-plan tenants, updated ${updated.length}, failed ${failed.length}`);
  if (updated.length) console.log("[seatSync] updates:", JSON.stringify(updated));
  if (failed.length) console.warn("[seatSync] failures:", JSON.stringify(failed));

  return { checked: results.length, updated: updated.length, failed: failed.length, results };
}

module.exports = { syncBoxPlanSeats };
