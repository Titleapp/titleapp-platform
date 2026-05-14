"use strict";

/**
 * dataFee.js — universal data-source pass-through billing.
 *
 * Every external data-source API call (Apollo, ATTOM, First American Title,
 * MLS, Treasury feeds, etc.) must record a data-fee event against the calling
 * user. Margin-survival rule: some calls cost $5–$10 (ATTOM, First American);
 * if these aren't billed through, TitleApp AI eats real money on every call.
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
//   actualCentsPerUnit: what TitleApp pays the data provider per unit
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

  // Property data — placeholder rates. Update when ATTOM/First American
  // contracts land. ATTOM list rate is ~$0.50–$2 per property pull;
  // First American Title detail pulls run $5–$10. Worst case wins until we
  // have real invoices.
  "attom:property":      { actualCentsPerUnit: 200, markup: 2.0, label: "ATTOM property data" },
  "firstam:title":       { actualCentsPerUnit: 1000, markup: 1.5, label: "First American title detail" },
  "mls:listing":         { actualCentsPerUnit: 50, markup: 2.0, label: "MLS listing pull" },
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
 * Record a data-fee event for an external API call.
 *
 * Writes to `dataFeeEvents/{eventId}`. At billing-cycle close, the cycle-close
 * processor aggregates these into Stripe Invoice Items per user.
 *
 * Failures are non-fatal — we log but don't throw, because billing should
 * never block the user-facing request. Missed events are reconciled by the
 * monthly audit job (TODO once enough events flow through).
 *
 * @param {object} params
 * @param {string} params.source            Source key (e.g., "apollo:search").
 * @param {string} params.userId            Firebase user UID making the call.
 * @param {string} [params.tenantId]        Tenant ID; null for personal-vault calls.
 * @param {number} [params.units=1]         Billable units (e.g., people returned).
 * @param {string} [params.requestedBy]     Code path or worker that triggered this.
 * @param {object} [params.metadata]        Extra context for audit (sanitized).
 * @returns {Promise<{eventId, costActualCents, costBilledCents, units}>}
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

  try {
    const ref = await getDb().collection("dataFeeEvents").add({
      source,
      label: cfg.label,
      userId,
      tenantId: tenantId || null,
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
    return {
      ok: true,
      eventId: ref.id,
      costActualCents,
      costBilledCents,
      units: safeUnits,
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
// v2 SCOPE (post-launch — see project memory `feedback_data_credit_billing_universal.md`):
//   - Worker session budgets (default $10/session, autonomous-flow safety net)
//   - Bulk-action quoting (estimate full Apollo run before kickoff)
//   - Per-source UX overrides (some sources always-confirm regardless of tier)
//   - Settings UI for user threshold configuration
//   - Real-time balance check against cycle-to-date data spend
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

module.exports = {
  recordDataFee,
  quoteDataFee,
  loadUserThresholds,
  getSourceConfig,
  SOURCE_REGISTRY,
  DEFAULT_THRESHOLDS,
};
