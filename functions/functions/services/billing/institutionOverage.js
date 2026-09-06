"use strict";

/**
 * institutionOverage.js — Path 1: institution/corporate auto-covers overage,
 * threshold-gated (CODEX 88 §3/§4, built this pass).
 *
 * Sean's spec, verbatim from the task brief: mirror Anthropic Console's own
 * auto-reload UX — an amount, a threshold that triggers it, and an absolute
 * cap. Once the cap is hit, auto-charging stops and requires an explicit
 * manual trigger/approval from the tenant's billing contact before more is
 * billed. No unlimited silent auto-charging.
 *
 * One deliberate deviation from a literal Anthropic-style "reload": Anthropic
 * Console tops up a PREPAID balance to a fixed dollar amount when it drops
 * below a threshold — the reload amount is a top-up choice, disconnected from
 * actual usage. Institution overage here is POSTPAID/metered (Line 2 data-fee
 * events, priced exactly per call in dataFee.js), and the ground rule for
 * this build is "never silently charge more than quoted." Charging a fixed
 * "reload amount" that doesn't equal the tenant's actual accrued cost would
 * violate that. So the threshold instead gates WHEN accumulated unbilled
 * usage gets swept into a real charge (batching many small data-fee events
 * into one invoice instead of one Stripe call per $0.50 ATTOM lookup), and
 * the charge amount is always exactly the real owed total — never more,
 * never a flat top-up. The cap still works exactly like Anthropic's: a hard
 * per-billing-period ceiling on what auto-charges without a human.
 *
 * Tenant config lives at `tenants/{tenantId}.billing.overage`:
 *   {
 *     autoChargeEnabled: false,     // opt-in — CODEX 88 §3: institution pool
 *                                   // is "optional", individual pays by
 *                                   // default (config/pricing.js's
 *                                   // overagePaidBy: "seat" | "student")
 *     payerMode: "individual" | "institution",
 *     thresholdCents: 2000,         // $20 — accumulate-then-charge trigger
 *     capCents: 50000,              // $500 — hard per-period auto-charge cap
 *     periodKey: "2026-09",         // current period this spend counts against
 *     spentCentsThisPeriod: 0,
 *     capHit: false,                // true = auto-charging paused, needs approval
 *     degraded: false,
 *     degradedReason: null,
 *     lastChargeAt: <Timestamp>,
 *     lastChargeAttemptAt: <Timestamp>,
 *   }
 *
 * AI-interaction-volume overage (the other half of Sean's ask): computed
 * for visibility via services/billing/boxPlanUsage.js (ported into this
 * worktree this pass), but NEVER auto-charged here. CODEX 76 §6 item 3
 * already flagged that the only rate available (seat-overage rate reused as
 * a placeholder) is not a considered interaction-volume rate, and no Stripe
 * metered price exists for it (confirmed — config/stripeBoxes.js has only
 * basePriceId/seatPriceId per plan). Charging real money against a
 * placeholder rate fails the "fail closed on anything ambiguous" ground
 * rule for this pass. `getTenantOverageStatus` surfaces the estimate with
 * `interactionOverage.chargeable: false` so a future pass can flip it on
 * once Sean sets a real rate and a real metered price exists.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");
const pricing = require("../../config/pricing");
const { chargeInvoiceItemsToCustomer, recentlyAttempted } = require("./overageSettlement");
const { computeTenantUsage, monthKey } = require("./boxPlanUsage");

function getDb() { return admin.firestore(); }
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

// Fallback thresholds/cap sourced from config/pricing.js's
// institutionOverageDefaults — single source of truth, per-tenant overrides
// live at tenants/{tenantId}.billing.overage.
const DEFAULT_OVERAGE_CONFIG = {
  autoChargeEnabled: false,
  payerMode: "individual",
  thresholdCents: pricing.institutionOverageDefaults?.thresholdCents ?? 2000,
  capCents: pricing.institutionOverageDefaults?.capCents ?? 50000,
  periodKey: null,
  spentCentsThisPeriod: 0,
  capHit: false,
  degraded: false,
  degradedReason: null,
};

function currentPeriodKey(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getTenantOverageConfig(tenantData) {
  const stored = (tenantData && tenantData.billing && tenantData.billing.overage) || {};
  return { ...DEFAULT_OVERAGE_CONFIG, ...stored };
}

/**
 * Roll the spend counter over at period boundaries. Returns the config that
 * should actually be used for this run (never mutates the caller's object).
 */
async function ensurePeriodCurrent(db, tenantId, cfg) {
  const period = currentPeriodKey();
  if (cfg.periodKey === period) return cfg;
  const rolled = { ...cfg, periodKey: period, spentCentsThisPeriod: 0, capHit: false };
  await db.collection("tenants").doc(tenantId).update({
    "billing.overage.periodKey": period,
    "billing.overage.spentCentsThisPeriod": 0,
    "billing.overage.capHit": false,
  });
  return rolled;
}

/** Sum of currently-unbilled, tenant-payer dataFeeEvents for one tenant. */
async function computeTenantDataFeeOwedCents(db, tenantId) {
  const snap = await db.collection("dataFeeEvents")
    .where("billed", "==", false)
    .where("payerType", "==", "tenant")
    .where("tenantId", "==", tenantId)
    .get();
  let owedCents = 0;
  const eventDocs = [];
  snap.forEach((doc) => {
    owedCents += (doc.data().costBilledCents || 0);
    eventDocs.push(doc);
  });
  return { owedCents, eventDocs };
}

async function notifyBillingContact(db, tenantId, tenantData, notificationType, context) {
  const to = tenantData.billingEmail || tenantData.contactEmail || null;
  const subjects = {
    cap_reached: "Auto-charge cap reached — manual approval needed",
    no_payment_method: "Overage auto-charge failed — no payment method on file",
    charge_failed: "Overage auto-charge failed — update payment method",
  };
  const bodies = {
    cap_reached: `Your workspace has reached its $${((context.capCents || 0) / 100).toFixed(2)} auto-charge cap for this billing period. Additional usage is being tracked but will not be auto-charged until a billing admin approves continued charging.`,
    no_payment_method: `We tried to auto-charge $${((context.owedCents || 0) / 100).toFixed(2)} in usage overage but found no payment method on file for this workspace.`,
    charge_failed: `We tried to auto-charge $${((context.owedCents || 0) / 100).toFixed(2)} in usage overage and the charge failed (${context.reason || "declined"}).`,
  };
  try {
    await db.collection("messageQueue").add({
      tenantId,
      campaignId: `institution_overage_${notificationType}`,
      channel: "email",
      to: to || "",
      subject: `SOCIII billing: ${subjects[notificationType] || notificationType}`,
      body: `<p>${(bodies[notificationType] || "").replace(/\n/g, "<br>")}</p>`,
      textBody: bodies[notificationType] || "",
      scheduledAt: admin.firestore.Timestamp.fromDate(new Date()),
      status: "pending",
      sentAt: null,
      error: null,
      attempts: 0,
    });
  } catch (e) {
    console.warn("[institutionOverage] notify failed (non-fatal):", e.message);
  }
}

/**
 * Attempt to settle one tenant's accumulated data-fee overage. Called from
 * the scheduled sweep (see index.js) for every tenant with
 * billing.overage.autoChargeEnabled === true && payerMode === "institution".
 *
 * Fail-closed at every branch: never charges more than the real, priced
 * owed amount; never bypasses the cap without an explicit manual approval.
 *
 * @param {string} tenantId
 * @param {object} [opts]
 * @param {boolean} [opts.bypassCapAndThreshold=false] Set ONLY by
 *   approveManualOverageRelease below, after a billing admin has explicitly
 *   approved charging past the cap. Skips the capHit/remaining-cap and
 *   below-threshold gates for this one call; still never charges more than
 *   the real owedCents, and still requires a real Stripe payment method.
 */
async function chargeTenantOverage(tenantId, opts = {}) {
  const bypassCapAndThreshold = !!opts.bypassCapAndThreshold;
  const db = getDb();
  const tenantRef = db.collection("tenants").doc(tenantId);
  const tenantSnap = await tenantRef.get();
  if (!tenantSnap.exists) return { charged: false, reason: "tenant_not_found" };
  const tenantData = tenantSnap.data();

  let cfg = getTenantOverageConfig(tenantData);
  if (!cfg.autoChargeEnabled || cfg.payerMode !== "institution") {
    return { charged: false, reason: "not_enrolled" };
  }
  cfg = await ensurePeriodCurrent(db, tenantId, cfg);

  if (cfg.capHit && !bypassCapAndThreshold) {
    return { charged: false, reason: "cap_hit_awaiting_manual_approval" };
  }
  if (recentlyAttempted(cfg.lastChargeAttemptAt) && !bypassCapAndThreshold) {
    return { charged: false, reason: "recently_attempted" };
  }

  const { owedCents, eventDocs } = await computeTenantDataFeeOwedCents(db, tenantId);
  if (owedCents <= 0) return { charged: false, reason: "nothing_owed" };
  if (owedCents < cfg.thresholdCents && !bypassCapAndThreshold) {
    return { charged: false, reason: "below_threshold", owedCents };
  }

  const remainingCap = bypassCapAndThreshold ? owedCents : (cfg.capCents - cfg.spentCentsThisPeriod);
  if (remainingCap <= 0) {
    await tenantRef.update({ "billing.overage.capHit": true });
    await notifyBillingContact(db, tenantId, tenantData, "cap_reached", { capCents: cfg.capCents });
    return { charged: false, reason: "cap_reached" };
  }

  // Only charge for events whose cumulative cost fits inside the remaining
  // cap — never a partial/prorated charge on a single event. Whatever
  // doesn't fit stays unbilled for a future period or a manual approval.
  let runningTotal = 0;
  const chargeableDocs = [];
  for (const doc of eventDocs) {
    const cost = doc.data().costBilledCents || 0;
    if (runningTotal + cost > remainingCap) break;
    runningTotal += cost;
    chargeableDocs.push(doc);
  }

  const willHitCap = chargeableDocs.length < eventDocs.length;

  if (chargeableDocs.length === 0) {
    // Every remaining event is individually too large to fit — treat as
    // cap-reached (fail closed rather than silently skip forever).
    await tenantRef.update({ "billing.overage.capHit": true });
    await notifyBillingContact(db, tenantId, tenantData, "cap_reached", { capCents: cfg.capCents });
    return { charged: false, reason: "cap_reached", owedCents };
  }

  if (!tenantData.stripeCustomerId) {
    await tenantRef.update({
      "billing.overage.degraded": true,
      "billing.overage.degradedReason": "no_payment_method",
      "billing.overage.lastChargeAttemptAt": admin.firestore.FieldValue.serverTimestamp(),
    });
    await notifyBillingContact(db, tenantId, tenantData, "no_payment_method", { owedCents });
    return { charged: false, reason: "no_payment_method" };
  }

  try {
    const stripe = getStripe();
    const lineItems = chargeableDocs.map((doc) => ({
      label: doc.data().label || doc.data().source,
      costBilledCents: doc.data().costBilledCents,
      units: doc.data().units || 1,
    }));
    const { invoiceId, totalCents } = await chargeInvoiceItemsToCustomer(
      stripe, tenantData.stripeCustomerId, lineItems,
      `SOCIII institution data pass-through overage — ${tenantData.name || tenantId}`
    );

    const batch = db.batch();
    for (const doc of chargeableDocs) {
      batch.update(doc.ref, {
        billed: true,
        billedAt: admin.firestore.FieldValue.serverTimestamp(),
        settledVia: "institution_stripe_invoice",
        stripeInvoiceItemId: invoiceId,
      });
    }
    batch.update(tenantRef, {
      "billing.overage.spentCentsThisPeriod": admin.firestore.FieldValue.increment(totalCents),
      "billing.overage.capHit": willHitCap,
      "billing.overage.degraded": false,
      "billing.overage.degradedReason": null,
      "billing.overage.lastChargeAt": admin.firestore.FieldValue.serverTimestamp(),
      "billing.overage.lastChargeAttemptAt": admin.firestore.FieldValue.serverTimestamp(),
    });
    await batch.commit();

    if (willHitCap) {
      await notifyBillingContact(db, tenantId, tenantData, "cap_reached", { capCents: cfg.capCents });
    }

    console.log(`[institutionOverage] tenant ${tenantId} charged $${(totalCents / 100).toFixed(2)} (invoice ${invoiceId})${willHitCap ? " — cap now hit" : ""}`);
    return { charged: true, invoiceId, chargedCents: totalCents, capHit: willHitCap };
  } catch (err) {
    console.error(`[institutionOverage] tenant ${tenantId} charge failed:`, err.message);
    await tenantRef.update({
      "billing.overage.degraded": true,
      "billing.overage.degradedReason": err.message,
      "billing.overage.lastChargeAttemptAt": admin.firestore.FieldValue.serverTimestamp(),
    });
    await notifyBillingContact(db, tenantId, tenantData, "charge_failed", { owedCents, reason: err.message });
    return { charged: false, reason: "stripe_charge_failed", error: err.message };
  }
}

/**
 * Scheduled sweep — checks every tenant enrolled in institution auto-charge.
 * Registered hourly in index.js, same cadence as the individual-path sweep
 * in overageSettlement.js.
 */
async function runInstitutionOverageSweep() {
  const db = getDb();
  const snap = await db.collection("tenants")
    .where("billing.overage.autoChargeEnabled", "==", true)
    .get();

  const results = [];
  for (const doc of snap.docs) {
    try {
      results.push({ tenantId: doc.id, ...(await chargeTenantOverage(doc.id)) });
    } catch (e) {
      console.error(`[institutionOverage] sweep failed for ${doc.id}:`, e.message);
      results.push({ tenantId: doc.id, charged: false, reason: "sweep_error", error: e.message });
    }
  }
  const charged = results.filter((r) => r.charged);
  console.log(`[institutionOverage] sweep: ${results.length} enrolled tenants, ${charged.length} charged`);
  return { checked: results.length, charged: charged.length, results };
}

/**
 * Explicit manual trigger/approval from the tenant's billing contact,
 * required once the cap is hit before more overage is billed. This is the
 * ONLY path that charges beyond the configured cap for the current period —
 * every other code path in this file fails closed at the cap.
 *
 * Caller must already be role-gated (admin) by the route handler — this
 * function does not re-check membership, matching the existing
 * purchaseCreditPack.js pattern of gating at the route, not the service.
 */
async function approveManualOverageRelease(tenantId, approvedByUid) {
  const db = getDb();
  const tenantRef = db.collection("tenants").doc(tenantId);
  const tenantSnap = await tenantRef.get();
  if (!tenantSnap.exists) return { ok: false, error: "tenant_not_found" };
  const tenantData = tenantSnap.data();
  const cfg = getTenantOverageConfig(tenantData);

  if (!cfg.capHit) {
    return { ok: false, error: "not_capped", message: "This workspace's overage auto-charge is not currently capped — nothing to approve." };
  }

  // One-shot bypass: charge the amount currently owed even though it's past
  // the cap, without raising capCents itself — this authorizes clearing the
  // CURRENT backlog, not a permanently higher limit. If more overage
  // accumulates beyond the (unchanged) cap after this, chargeTenantOverage's
  // normal cap check re-engages and requires another explicit approval —
  // see the "willHitCap" logic in chargeTenantOverage for why this holds.
  const { owedCents } = await computeTenantDataFeeOwedCents(db, tenantId);
  const result = await chargeTenantOverage(tenantId, { bypassCapAndThreshold: true });

  await db.collection(`tenants/${tenantId}/overageApprovals`).add({
    approvedByUid,
    owedCentsAtApproval: owedCents,
    result,
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true, owedCentsAtApproval: owedCents, chargeResult: result };
}

/**
 * Read-only status for the billing-contact UI: current owed, threshold,
 * cap, spend-this-period, cap state, plus the AI-interaction-volume
 * VISIBILITY-ONLY estimate (never auto-charged — see file header).
 */
async function getTenantOverageStatus(tenantId) {
  const db = getDb();
  const tenantSnap = await db.collection("tenants").doc(tenantId).get();
  if (!tenantSnap.exists) return { ok: false, error: "tenant_not_found" };
  const tenantData = tenantSnap.data();
  const cfg = getTenantOverageConfig(tenantData);
  const { owedCents } = await computeTenantDataFeeOwedCents(db, tenantId);

  let interactionOverage = null;
  try {
    const key = monthKey();
    const usage = await computeTenantUsage(db, tenantSnap, key);
    interactionOverage = {
      ...usage,
      chargeable: false, // see file header — no real metered price/rate exists yet
      note: "Visibility only. No Stripe metered price exists for AI-interaction-volume overage yet, and the rate this estimate reuses (seat-overage rate) is a placeholder, not a considered rate — CODEX 76 §6. Not included in auto-charging.",
    };
  } catch (e) {
    console.warn("[institutionOverage] interaction-overage estimate failed (non-fatal):", e.message);
  }

  return {
    ok: true,
    tenantId,
    dataFeeOverage: {
      owedCents,
      thresholdCents: cfg.thresholdCents,
      capCents: cfg.capCents,
      spentCentsThisPeriod: cfg.spentCentsThisPeriod,
      periodKey: cfg.periodKey || currentPeriodKey(),
      capHit: cfg.capHit,
      autoChargeEnabled: cfg.autoChargeEnabled,
      payerMode: cfg.payerMode,
      degraded: cfg.degraded,
      degradedReason: cfg.degradedReason,
    },
    interactionOverage,
  };
}

/**
 * Admin-gated config setter. Route handler is responsible for the
 * enforceRoleGate(uid, tenantId, "admin") check (same pattern as
 * purchaseCreditPack.js's tenant path) before calling this.
 */
async function setTenantOverageConfig(tenantId, patch) {
  const db = getDb();
  const update = {};
  if (typeof patch.autoChargeEnabled === "boolean") update.autoChargeEnabled = patch.autoChargeEnabled;
  if (patch.payerMode === "individual" || patch.payerMode === "institution") update.payerMode = patch.payerMode;
  if (typeof patch.thresholdCents === "number" && patch.thresholdCents >= 0) update.thresholdCents = Math.round(patch.thresholdCents);
  if (typeof patch.capCents === "number" && patch.capCents >= 0) update.capCents = Math.round(patch.capCents);

  if (Object.keys(update).length === 0) {
    return { ok: false, error: "no_valid_fields" };
  }

  const dotPathUpdate = {};
  for (const [k, v] of Object.entries(update)) dotPathUpdate[`billing.overage.${k}`] = v;

  // set(..., {merge:true}) rather than update() — a tenant enrolling in
  // institution auto-charge for the first time may not have a
  // `billing.overage` map yet, and set+merge creates the nested path if
  // missing while update() would throw NOT_FOUND on the parent document...
  // actually update() only requires the DOCUMENT to exist, not the nested
  // field — the tenant doc itself is guaranteed to exist by this point in
  // the route (tenantId came from a validated x-tenant-id / membership
  // check), so either call is safe; set+merge is used here to also cover
  // the (rare) case of enabling auto-charge before any other billing.*
  // field has ever been written to this tenant doc.
  await db.collection("tenants").doc(tenantId).set(dotPathUpdate, { merge: true });
  return { ok: true, updated: update };
}

module.exports = {
  getTenantOverageConfig,
  computeTenantDataFeeOwedCents,
  chargeTenantOverage,
  runInstitutionOverageSweep,
  approveManualOverageRelease,
  getTenantOverageStatus,
  setTenantOverageConfig,
  DEFAULT_OVERAGE_CONFIG,
};
