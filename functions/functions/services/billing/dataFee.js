"use strict";

/**
 * dataFee.js — universal data-source pass-through billing.
 *
 * Every external data-source API call (Apollo, ATTOM, First American Title,
 * MLS, Treasury feeds, etc.) must record a data-fee event against the calling
 * user. Margin-survival rule: some calls cost $5–$10 (ATTOM, First American);
 * if these aren't billed through, SOCIII AI eats real money on every call.
 *
 * Usage:
 *   const { recordDataFee } = require("./services/billing/dataFee");
 *   await recordDataFee({
 *     source: "apollo:search",
 *     userId, tenantId,
 *     units: result.people?.length || 1,
 *     metadata: { criteria, ... },
 *   });
 *
 * The source registry below holds actual cost (in cents) and markup multiplier
 * per source. Keep this list as the single place where data-source pricing is
 * adjusted.
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

// Source registry — actual cost per unit and markup applied to user.
// All amounts in cents (USD). Markup is a multiplier (e.g., 2.0 = 100% markup).
//
//   actualCentsPerUnit: what SOCIII pays the data provider per unit
//   markup:             multiplier applied to actual cost when billing user
//   billedCentsPerUnit: cached for clarity; computed at write time anyway
//
// Apollo Pro tier: ~$1 per credit consumed at our list rate (4,020 credits @
// roughly $79/mo on the API tier). Apollo's effective per-credit cost varies
// by plan; 100¢/credit is our internal accounting rate. 2× markup is the
// platform's standard pass-through margin until pricing review tunes it.
const SOURCE_REGISTRY = {
  // Apollo
  "apollo:search":       { actualCentsPerUnit: 100, markup: 2.0, label: "Apollo people search" },
  "apollo:enrich":       { actualCentsPerUnit: 100, markup: 2.0, label: "Apollo person enrich" },
  "apollo:org_search":   { actualCentsPerUnit: 100, markup: 2.0, label: "Apollo organization search" },

  // OFAC — Treasury feed is free; we still record a tiny fee to cover our
  // ingest + Firestore scan costs. Charged per screen call, not per match.
  "ofac:screen":         { actualCentsPerUnit: 1, markup: 5.0, label: "OFAC SDN sanctions screen" },

  // GIS overlays (FEMA flood / CA Coastal / NRHP historic / Opportunity
  // Zones) — free public ArcGIS feeds; fee covers ingest + compute, same
  // posture as ofac:screen. Charged per fresh parcel evaluation; cache free.
  "gis:overlays":        { actualCentsPerUnit: 1, markup: 5.0, label: "GIS overlay evaluation (4 layers)" },

  // Property data. ATTOM rate updated per Sean 2026-06-01 — actual cost is
  // $3/property report, 2× markup ⇒ user pays $6.
  "attom:property":      { actualCentsPerUnit: 300, markup: 2.0, label: "ATTOM property data" },
  // Area-search snapshot (thin id/address list, no full report). ESTIMATE
  // PENDING ATTOM tier confirmation — billed per universal data-credit rule:
  // every external call charges through, even quote-phase queries.
  "attom:snapshot":      { actualCentsPerUnit: 10, markup: 2.0, label: "ATTOM area snapshot query" },
  "firstam:title":       { actualCentsPerUnit: 1000, markup: 1.5, label: "First American title detail" },
  "mls:listing":         { actualCentsPerUnit: 50, markup: 2.0, label: "MLS listing pull" },

  // Aviation — NOTAMIFY pulls NOTAMs by airport / route. Per Sean 2026-06-01
  // our cost is $0.25 per pull; 2× markup ⇒ pilot pays $0.50.
  "notamify:notams":     { actualCentsPerUnit: 25, markup: 2.0, label: "NOTAMIFY NOTAM pull" },

  // ADS-B Exchange live traffic query — ~$0.002/query. Charge 1¢ (5× markup)
  // to cover the call + our compute; still negligible per pull.
  "adsb_exchange:traffic": { actualCentsPerUnit: 1, markup: 5.0, label: "ADS-B Exchange live traffic" },

  // Generative media — Kling video gen. Per Sean 2026-06-01 our cost is
  // ~$0.50/clip; 2× markup ⇒ creator pays $1.00. Wired so the Marketing
  // worker can charge for every render the platform produces server-side.
  "kling:video":         { actualCentsPerUnit: 50, markup: 2.0, label: "Kling AI video generation" },
};

function getSourceConfig(source) {
  const cfg = SOURCE_REGISTRY[source];
  if (!cfg) {
    console.warn(`[dataFee] Unknown source "${source}" — falling back to default rate.`);
    return { actualCentsPerUnit: 100, markup: 2.0, label: source };
  }
  return cfg;
}

/**
 * Decide who pays for a data-fee event: the tenant (institution pool, Path 1
 * — CODEX 88 §3, opt-in only) or the individual (Path 2 — the default,
 * matching config/pricing.js's businessInABox "seat" / education "student"
 * overagePaidBy semantics). Stamped onto the event at write time so
 * settlement never has to re-derive routing from a tenant config that may
 * have changed since — see services/billing/overageSettlement.js /
 * institutionOverage.js, which trust this stamp.
 */
async function resolvePayer(tenantId, userId) {
  if (tenantId) {
    try {
      const tenantSnap = await getDb().collection("tenants").doc(tenantId).get();
      const overageCfg = tenantSnap.exists ? (tenantSnap.data().billing?.overage || {}) : {};
      if (overageCfg.autoChargeEnabled && overageCfg.payerMode === "institution") {
        return { payerType: "tenant", tenantId };
      }
    } catch (e) {
      console.warn("[dataFee] resolvePayer tenant lookup failed, defaulting to user-payer:", e.message);
    }
  }
  return { payerType: "user", userId };
}

/**
 * Real-time settlement attempt for USER-payer events only (Path 2). Runs
 * inside a Firestore transaction so a burst of concurrent data-fee calls
 * can't double-spend the same balance. Deducts the EXACT quoted amount —
 * never more — and never less than what recordDataFee already wrote to the
 * event, honoring the "never silently charge more than quoted" ground rule
 * in both directions (never charge more, never quietly under-collect and
 * call it settled).
 *
 * Returns true if settled from balance; false leaves the event `billed:
 * false` for the batch sweep in overageSettlement.js to pick up (insufficient
 * balance now, or no balance funded yet — the sweep also tries the user's
 * saved Stripe payment method, which this fast path deliberately skips to
 * keep the hot call path to one Firestore transaction, not a Stripe round
 * trip on every metered call).
 */
async function trySettleFromUserBalance(db, userId, eventRef, costBilledCents) {
  try {
    return await db.runTransaction(async (tx) => {
      const userRef = db.collection("users").doc(userId);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) return false;
      const balanceCents = Math.round((userSnap.data().billing?.balance || 0) * 100);
      if (balanceCents < costBilledCents) return false;

      const newBalance = +((userSnap.data().billing.balance) - costBilledCents / 100).toFixed(2);
      tx.update(userRef, {
        "billing.balance": newBalance,
        "billing.lastDeductedAt": admin.firestore.FieldValue.serverTimestamp(),
      });
      tx.update(eventRef, {
        billed: true,
        billedAt: admin.firestore.FieldValue.serverTimestamp(),
        settledVia: "balance",
      });
      return true;
    });
  } catch (e) {
    console.warn("[dataFee] real-time balance settlement failed (non-fatal, falls back to batch sweep):", e.message);
    return false;
  }
}

/**
 * Record a data-fee event for an external API call.
 *
 * Writes to `dataFeeEvents/{eventId}` first (append-only, always durable —
 * the priced record exists regardless of what settlement does next), then
 * attempts real settlement: USER-payer events try an immediate balance
 * deduction (Path 2's common case); TENANT-payer events are deliberately
 * left unbilled here — institutionOverage.js's threshold/cap sweep owns
 * when those actually get charged (see that file for why).
 *
 * Failures are non-fatal — we log but don't throw, because billing should
 * never block the user-facing request. Unsettled events are drained by
 * services/billing/overageSettlement.js (user sweep) and
 * services/billing/institutionOverage.js (tenant sweep), both scheduled
 * hourly in index.js.
 *
 * @param {object} params
 * @param {string} params.source            Source key (e.g., "apollo:search").
 * @param {string} params.userId            Firebase user UID making the call.
 * @param {string} [params.tenantId]        Tenant ID; null for personal-vault calls.
 * @param {number} [params.units=1]         Billable units (e.g., people returned).
 * @param {string} [params.requestedBy]     Code path or worker that triggered this.
 * @param {object} [params.metadata]        Extra context for audit (sanitized).
 * @returns {Promise<{eventId, costActualCents, costBilledCents, units, settled, settledVia}>}
 */
async function recordDataFee({ source, userId, tenantId = null, units = 1, requestedBy = null, metadata = null }) {
  if (!source || !userId) {
    console.warn("[dataFee] recordDataFee called without source or userId — skipped.", { source, userId });
    return { ok: false, skipped: true };
  }

  const cfg = getSourceConfig(source);
  const safeUnits = Math.max(1, Math.round(Number(units) || 1));
  const costActualCents  = Math.round(cfg.actualCentsPerUnit * safeUnits);
  const costBilledCents  = Math.round(cfg.actualCentsPerUnit * cfg.markup * safeUnits);
  const db = getDb();

  let ref;
  try {
    const payer = await resolvePayer(tenantId, userId);
    ref = await db.collection("dataFeeEvents").add({
      source,
      label: cfg.label,
      userId,
      tenantId: tenantId || null,
      payerType: payer.payerType,
      units: safeUnits,
      actualCentsPerUnit: cfg.actualCentsPerUnit,
      markup: cfg.markup,
      costActualCents,
      costBilledCents,
      requestedBy,
      metadata: metadata ? sanitizeMetadata(metadata) : null,
      billed: false,
      stripeInvoiceItemId: null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    let settled = false;
    let settledVia = null;
    if (payer.payerType === "user") {
      settled = await trySettleFromUserBalance(db, userId, ref, costBilledCents);
      if (settled) settledVia = "balance";
    }
    // payerType === "tenant" is intentionally left unsettled here — see
    // institutionOverage.js's threshold/cap sweep.

    return {
      ok: true,
      eventId: ref.id,
      costActualCents,
      costBilledCents,
      units: safeUnits,
      settled,
      settledVia,
    };
  } catch (e) {
    console.warn("[dataFee] write failed (non-fatal):", e.message, { source, userId, units: safeUnits });
    return { ok: false, error: e.message };
  }
}

// Strip large/sensitive fields from metadata before persisting.
function sanitizeMetadata(meta) {
  if (!meta || typeof meta !== "object") return null;
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v == null) continue;
    if (typeof v === "string" && v.length > 500) { out[k] = v.slice(0, 500) + "..."; continue; }
    if (typeof v === "object") { try { JSON.stringify(v); out[k] = v; } catch (_) {} continue; }
    out[k] = v;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Pre-call quote + tier classification (v1)
//
// v1 SCOPE (what ships now):
//   - Pure-logic quote function: source + units + userBalanceCents → tier
//   - Three tiers (silent / warn / confirm) per Sean's spec
//   - Default thresholds; user override via `users/{uid}.dataFeeSettings`
//   - Minimum balance floor with hard block
//
// v1.5 — SHIPPED this pass (CODEX 88 overage-billing build), closing the gap
// this comment block used to flag under "real-time balance check": the
// "actually collect the money" layer.
//   - recordDataFee() now attempts REAL, immediate settlement against the
//     user's real `users/{uid}.billing.balance` (resolvePayer +
//     trySettleFromUserBalance, above) instead of only ever writing
//     `billed: false` and leaving it there forever.
//   - quoteDataFeeForUser() loads that same real balance server-side instead
//     of trusting a client-supplied userBalanceCents — quoteDataFee() itself
//     is unchanged (still pure logic, still directly testable/callable with
//     an explicit balance for e.g. enterprise/no-balance-gating callers).
//   - services/billing/overageSettlement.js + institutionOverage.js drain
//     whatever recordDataFee's real-time attempt couldn't settle (Path 2
//     Stripe-invoice fallback; Path 1 institution threshold/cap sweep).
//
// v2 SCOPE (still not built — see project memory
// `feedback_data_credit_billing_universal.md`):
//   - Worker session budgets (default $10/session, autonomous-flow safety net)
//   - Bulk-action quoting (estimate full Apollo run before kickoff)
//   - Per-source UX overrides (some sources always-confirm regardless of tier)
//   - Settings UI for user threshold configuration
//   - Real-time balance check against cycle-to-date data spend (note: the
//     PER-CALL real-time check above is done; a running cycle-to-date spend
//     view for the user is still not built)
//   - Approval-token pattern (frontend gets a signed token after confirm,
//     server validates it on the actual call to prevent skipping confirm)
// ─────────────────────────────────────────────────────────────────────────

const DEFAULT_THRESHOLDS = {
  // Below tierAFloorCents — silent (just record, no warning).
  // Between tierAFloor and tierBFloor — inline warn.
  // Above tierBFloorCents — modal confirm.
  tierAFloorCents:        100,    // $1.00
  tierBFloorCents:        1000,   // $10.00
  // Whichever is lower wins (dollars OR percent of balance).
  warnPercentOfBalance:   0.05,   // 5% of remaining balance triggers warn
  confirmPercentOfBalance: 0.15,  // 15% of remaining balance triggers confirm
  // Hard floor — call is blocked if it would drop balance below this.
  minBalanceFloorCents:   500,    // $5.00
};

async function loadUserThresholds(userId) {
  if (!userId) return DEFAULT_THRESHOLDS;
  try {
    const snap = await getDb().collection("users").doc(userId).get();
    const override = snap.exists ? (snap.data()?.dataFeeSettings || {}) : {};
    return { ...DEFAULT_THRESHOLDS, ...override };
  } catch (_) {
    return DEFAULT_THRESHOLDS;
  }
}

/**
 * Quote a data-source call BEFORE making it. Pure logic — no API hit, no
 * Firestore writes other than reading the user's threshold overrides.
 *
 * @param {object} params
 * @param {string} params.source             Source key (must exist in SOURCE_REGISTRY).
 * @param {number} [params.units=1]          Estimated billable units.
 * @param {string} [params.userId]           For loading per-user threshold overrides.
 * @param {number} [params.userBalanceCents] Current data-credit balance in cents.
 *                                           Pass null to skip percent-based tier
 *                                           promotion (e.g., enterprise accounts).
 * @returns {{
 *   ok: boolean,
 *   blocked: boolean,
 *   tier: "silent"|"warn"|"confirm",
 *   costActualCents: number,
 *   costBilledCents: number,
 *   units: number,
 *   message: string,
 *   reason: string|null,
 *   thresholdsUsed: object,
 * }}
 */
async function quoteDataFee({ source, units = 1, userId = null, userBalanceCents = null }) {
  const cfg = getSourceConfig(source);
  const safeUnits = Math.max(1, Math.round(Number(units) || 1));
  const costActualCents = Math.round(cfg.actualCentsPerUnit * safeUnits);
  const costBilledCents = Math.round(cfg.actualCentsPerUnit * cfg.markup * safeUnits);

  const thresholds = await loadUserThresholds(userId);

  // Hard floor — block if call would drop user below minimum balance.
  if (typeof userBalanceCents === "number" && userBalanceCents !== null) {
    const projectedBalance = userBalanceCents - costBilledCents;
    if (projectedBalance < thresholds.minBalanceFloorCents) {
      return {
        ok: true,
        blocked: true,
        tier: "confirm",
        costActualCents,
        costBilledCents,
        units: safeUnits,
        message: `This call would cost ~$${(costBilledCents / 100).toFixed(2)} and drop your balance below the $${(thresholds.minBalanceFloorCents / 100).toFixed(2)} minimum. Top up to proceed.`,
        reason: "below_minimum_balance",
        thresholdsUsed: thresholds,
      };
    }
  }

  // Tier classification: dollar amount + balance-percent (lower tier wins).
  let tier = "silent";
  let reason = null;

  if (costBilledCents >= thresholds.tierBFloorCents) {
    tier = "confirm";
    reason = `over_tier_b_dollar_floor`;
  } else if (costBilledCents >= thresholds.tierAFloorCents) {
    tier = "warn";
    reason = `over_tier_a_dollar_floor`;
  }

  if (typeof userBalanceCents === "number" && userBalanceCents > 0) {
    const pct = costBilledCents / userBalanceCents;
    if (pct >= thresholds.confirmPercentOfBalance && tier !== "confirm") {
      tier = "confirm";
      reason = `over_${Math.round(thresholds.confirmPercentOfBalance * 100)}pct_balance`;
    } else if (pct >= thresholds.warnPercentOfBalance && tier === "silent") {
      tier = "warn";
      reason = `over_${Math.round(thresholds.warnPercentOfBalance * 100)}pct_balance`;
    }
  }

  const dollarAmount = (costBilledCents / 100).toFixed(2);
  let message;
  switch (tier) {
    case "silent":
      message = `Estimated cost: $${dollarAmount}.`;
      break;
    case "warn":
      message = `This action will cost approximately $${dollarAmount}.`;
      break;
    case "confirm":
      message = `This action will cost approximately $${dollarAmount}. Please confirm to proceed.`;
      break;
  }

  return {
    ok: true,
    blocked: false,
    tier,
    costActualCents,
    costBilledCents,
    units: safeUnits,
    message,
    reason,
    thresholdsUsed: thresholds,
  };
}

/**
 * Real-balance-backed wrapper around quoteDataFee — this is what route
 * handlers should call for any user-facing quote, instead of quoteDataFee
 * directly with a client-supplied userBalanceCents.
 *
 * The gap this closes (from the task brief): the /dataFee:quote route
 * previously trusted whatever `userBalanceCents` the CALLER sent in the
 * request body to decide whether to block/warn/confirm. That's a
 * server-side money decision built on client-supplied input — a client that
 * omits or inflates the number bypasses the gate entirely. This loads the
 * user's real `users/{uid}.billing.balance` from Firestore server-side and
 * ignores whatever the client claims, so the tier/block decision is always
 * grounded in the REAL, Stripe-funded balance from Path 2's payment flow
 * (billing/usageProcessor.js's handleTopUpBalance + checkBalanceRecharge),
 * not a number the caller has to already know (or could lie about).
 */
async function quoteDataFeeForUser({ source, units = 1, userId }) {
  let userBalanceCents = null;
  if (userId) {
    try {
      const snap = await getDb().collection("users").doc(userId).get();
      if (snap.exists) {
        const balance = snap.data().billing?.balance;
        if (typeof balance === "number") userBalanceCents = Math.round(balance * 100);
      }
    } catch (e) {
      console.warn("[dataFee] quoteDataFeeForUser balance lookup failed, quoting without balance context:", e.message);
    }
  }
  return quoteDataFee({ source, units, userId, userBalanceCents });
}

module.exports = {
  recordDataFee,
  quoteDataFee,
  quoteDataFeeForUser,
  resolvePayer,
  loadUserThresholds,
  getSourceConfig,
  SOURCE_REGISTRY,
  DEFAULT_THRESHOLDS,
};
