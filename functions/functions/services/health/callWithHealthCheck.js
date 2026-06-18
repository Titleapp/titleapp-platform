"use strict";

/**
 * callWithHealthCheck — wraps every external API call in a health-check layer.
 *
 * On failure: logs to Firestore apiHealth collection, returns graceful fallback.
 * On success: updates last-healthy timestamp.
 *
 * Alex reads apiHealth to give plain-language fallback messages instead of raw errors.
 */

const admin = require("firebase-admin");
const { USAGE_EVENTS_COLLECTION } = require("../../config/usageEvents");
const { computeRevenueAttribution } = require("../../billing/recordUsageEvent");
const pricing = require("../../config/pricing");

function getDb() { return admin.firestore(); }

// Alex plain-language fallbacks — never show service names or error codes to subscribers
const ALEX_FALLBACK_MESSAGES = {
  notamify: "NOTAM data temporarily unavailable. Check notamify.com directly and note the gap in your preflight log.",
  aviationweather: "Weather data temporarily unavailable. Check aviationweather.gov directly and brief from official sources.",
  adsb_exchange: "Live aircraft tracking temporarily unavailable. Confirm traffic visually and via ATC.",
  faa_charts: "Chart data temporarily unavailable. Use current paper charts or ForeFlight as backup.",
  faa_nasr: "Airport data temporarily unavailable. Cross-reference with current AFD.",
  tfr_feed: "TFR data temporarily unavailable. Check tfr.faa.gov directly before departure.",
  realie: "Property data temporarily unavailable. Results may be incomplete.",
  rentcast: "Rental market data temporarily unavailable. Results may be incomplete.",
  google_maps: "Map data temporarily unavailable.",
  google_solar: "Solar analysis temporarily unavailable.",
  vincario: "Vehicle valuation data temporarily unavailable.",
  quickbooks: "Accounting data temporarily unavailable. Try again in a few minutes.",
};

// Aviation safety connectors — failures log to The Ledger audit trail
const AVIATION_SAFETY_SERVICES = [
  "notamify", "aviationweather", "adsb_exchange",
  "faa_charts", "faa_nasr", "tfr_feed",
];

/**
 * Log aviation data gap to The Ledger audit trail.
 */
async function logAviationDataGap(serviceName, errorMessage) {
  try {
    const db = getDb();
    await db.collection("theLedgerAuditTrail").add({
      type: "DATA_GAP",
      serviceName,
      error: errorMessage,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      severity: "warning",
      message: `DATA GAP: ${serviceName} unavailable during preflight session`,
    });
  } catch (e) {
    console.error(`[healthCheck] Failed to log aviation data gap for ${serviceName}:`, e.message);
  }
}

/**
 * Check credit balance and deduct credits for a connector call.
 * @param {string} userId — Firebase auth UID
 * @param {string} connectorId — connector ID from config/connectors.js
 * @param {number} creditCost — credits to deduct
 * @param {Object} [context] — optional context for usage event
 * @param {string} [context.workerId] — worker that triggered the call
 * @returns {Promise<{ allowed: boolean, error?: string, creditsAvailable?: number }>}
 */
async function checkAndDeductCredits(userId, connectorId, creditCost, context = {}) {
  if (!userId || !creditCost || creditCost <= 0) return { allowed: true };

  const db = getDb();

  // 49.32 — when called from a tenant context, deduct from the tenant credit
  // pool instead of the user's personal pool. The chat handler passes
  // context.tenantId when the worker is being run inside a Business workspace.
  const tenantId = context.tenantId && context.tenantId !== "vault" && context.tenantId !== "personal" && !String(context.tenantId).startsWith("guest-")
    ? context.tenantId : null;

  try {
    if (tenantId) {
      const tenantRef = db.doc(`tenants/${tenantId}`);
      const tSnap = await tenantRef.get();
      const tData = tSnap.exists ? tSnap.data() : {};
      const currentBalance = tData.prepaidCredits ?? 0;

      if (currentBalance < creditCost) {
        return {
          allowed: false,
          error: "INSUFFICIENT_CREDITS",
          source: "tenant",
          message: "This workspace is out of Data Credits. Ask the workspace admin to top up.",
          creditsRequired: creditCost,
          creditsAvailable: currentBalance,
        };
      }
      await tenantRef.update({
        prepaidCredits: admin.firestore.FieldValue.increment(-creditCost),
        lastCreditDeductionAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // CODEX 50.5 — merge revenue-attribution fields onto the telemetry event
      // so cycle-close can compute Creator payouts from the same event stream.
      const attributionTenant = await computeRevenueAttribution({
        workerId: context.workerId || null,
        userId,
        tenantId,
        revenueBasis: "credit_pack", // tenant-pool deductions burn purchased credits
        revenueAmount: creditCost * (pricing.creditRate || 0),
        timestamp: new Date(),
        parentInteractionId: context.parentInteractionId || null,
      }).catch(e => { console.warn("[50.5] attribution failed:", e.message); return {}; });
      await db.collection(USAGE_EVENTS_COLLECTION).add({
        userId,                  // who triggered the call
        tenantId,                // who paid for it
        ownerType: "tenant",
        ownerId: tenantId,
        workerId: context.workerId || null,
        connectorId,
        creditsUsed: creditCost,
        event_type: "connector_call",
        pass_through: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ...attributionTenant,
      });
      return { allowed: true, source: "tenant", creditsRemaining: currentBalance - creditCost };
    }

    // Personal Vault path — original user-pool flow.
    const userRef = db.doc(`users/${userId}`);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};
    const currentBalance = userData.billing?.prepaidCredits ?? userData.prepaidCredits ?? 0;

    if (currentBalance < creditCost) {
      return {
        allowed: false,
        error: "INSUFFICIENT_CREDITS",
        source: "user",
        message: "This action requires Data Credits. Top up your account to continue.",
        creditsRequired: creditCost,
        creditsAvailable: currentBalance,
      };
    }

    // Deduct credits — write to both new (root prepaidCredits) and legacy
    // (billing.prepaidCredits) fields so reads are consistent across surfaces.
    await userRef.update({
      "billing.prepaidCredits": admin.firestore.FieldValue.increment(-creditCost),
      prepaidCredits: admin.firestore.FieldValue.increment(-creditCost),
    });

    // CODEX 50.5 — merge revenue-attribution fields onto the telemetry event.
    // For Personal Vault deductions, basis is "credit_pack" (purchased credits).
    const attributionUser = await computeRevenueAttribution({
      workerId: context.workerId || null,
      userId,
      tenantId: null,
      revenueBasis: "credit_pack",
      revenueAmount: creditCost * (pricing.creditRate || 0),
      timestamp: new Date(),
      parentInteractionId: context.parentInteractionId || null,
    }).catch(e => { console.warn("[50.5] attribution failed:", e.message); return {}; });

    await db.collection(USAGE_EVENTS_COLLECTION).add({
      userId,
      ownerType: "user",
      ownerId: userId,
      workerId: context.workerId || null,
      connectorId,
      creditsUsed: creditCost,
      event_type: "connector_call",
      pass_through: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ...attributionUser,
    });

    return { allowed: true, source: "user", creditsRemaining: currentBalance - creditCost };
  } catch (e) {
    console.error(`[creditCheck] Failed for ${userId}/${connectorId}:`, e.message);
    // On error, allow the call — don't block on billing failures
    return { allowed: true };
  }
}

/**
 * Refund credits previously deducted — e.g. the downstream paid API call failed
 * AFTER we charged, so the customer shouldn't pay for nothing. Best-effort;
 * mirrors the pool logic in checkAndDeductCredits (tenant pool if tenantId,
 * else the user's personal pool) and logs a credit_refund usage event.
 */
async function refundCredits(userId, connectorId, creditCost, context = {}) {
  if (!userId || !creditCost || creditCost <= 0) return { refunded: false };
  const db = getDb();
  const tenantId = context.tenantId && context.tenantId !== "vault" && context.tenantId !== "personal" && !String(context.tenantId).startsWith("guest-")
    ? context.tenantId : null;
  try {
    if (tenantId) {
      await db.doc(`tenants/${tenantId}`).update({
        prepaidCredits: admin.firestore.FieldValue.increment(creditCost),
      });
    } else {
      await db.doc(`users/${userId}`).update({
        "billing.prepaidCredits": admin.firestore.FieldValue.increment(creditCost),
        prepaidCredits: admin.firestore.FieldValue.increment(creditCost),
      });
    }
    await db.collection(USAGE_EVENTS_COLLECTION).add({
      userId,
      ownerType: tenantId ? "tenant" : "user",
      ownerId: tenantId || userId,
      workerId: context.workerId || null,
      connectorId,
      creditsUsed: -creditCost,
      event_type: "credit_refund",
      pass_through: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { refunded: true };
  } catch (e) {
    console.error(`[creditRefund] Failed for ${userId}/${connectorId}:`, e.message);
    return { refunded: false };
  }
}

/**
 * @param {string} serviceName - e.g. "aviationweather", "notamify", "realie"
 * @param {Function} fn - async function that makes the external API call
 * @param {Object} [opts]
 * @param {number} [opts.timeoutMs=15000] - timeout for the call
 * @param {string} [opts.fallbackMessage] - Alex-friendly message on failure
 * @param {boolean} [opts.isAviation=false] - if true, logs data gap to The Ledger audit trail
 * @param {string} [opts.userId] - if provided with connectorId, checks credit balance
 * @param {string} [opts.connectorId] - connector ID for credit check
 * @param {string} [opts.workerId] - worker context for usage logging
 * @returns {Promise<{ ok: boolean, data?: any, fallback?: string, cached?: boolean }>}
 */
async function callWithHealthCheck(serviceNameOrOpts, fn, opts = {}) {
  // Support both signatures:
  //   callWithHealthCheck("serviceName", fn, opts)         — Session 43 style
  //   callWithHealthCheck({serviceName, fn, fallback, timeout})  — 41.3-T2 style
  let serviceName;
  if (typeof serviceNameOrOpts === "object" && serviceNameOrOpts !== null) {
    serviceName = serviceNameOrOpts.serviceName;
    fn = serviceNameOrOpts.fn;
    opts = {
      timeoutMs: serviceNameOrOpts.timeout,
      fallbackMessage: undefined,
      userId: serviceNameOrOpts.userId,
      connectorId: serviceNameOrOpts.connectorId,
      workerId: serviceNameOrOpts.workerId,
    };
  } else {
    serviceName = serviceNameOrOpts;
  }
  const { timeoutMs = 15000, fallbackMessage, userId, connectorId, workerId } = opts;
  const isAviation = opts.isAviation || AVIATION_SAFETY_SERVICES.includes(serviceName);
  const db = getDb();
  const healthRef = db.doc(`apiHealth/${serviceName}`);

  // ── Credit check (if userId and connectorId provided) ───────
  if (userId && connectorId) {
    const { CONNECTORS } = require("../../config/connectors");
    const connector = CONNECTORS[connectorId];
    const creditCost = connector?.creditCost || 0;
    if (creditCost > 0) {
      const creditResult = await checkAndDeductCredits(userId, connectorId, creditCost, { workerId });
      if (!creditResult.allowed) {
        return {
          ok: false,
          success: false,
          error: creditResult.error,
          message: creditResult.message,
          creditsRequired: creditResult.creditsRequired,
          creditsAvailable: creditResult.creditsAvailable,
        };
      }
    }
  }

  const defaultFallback = fallbackMessage || ALEX_FALLBACK_MESSAGES[serviceName]
    || `Data temporarily unavailable. Working with cached or estimated data.`;

  try {
    const result = await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);

    // Success — update health status
    await healthRef.set({
      serviceName,
      status: "healthy",
      lastHealthyAt: admin.firestore.FieldValue.serverTimestamp(),
      lastCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
      consecutiveFailures: 0,
    }, { merge: true });

    return { ok: true, success: true, data: result };
  } catch (err) {
    const isTimeout = err.message === "timeout";
    console.error(`[healthCheck] ${serviceName} failed: ${err.message}`);

    // Log failure
    try {
      const snap = await healthRef.get();
      const prev = snap.exists ? snap.data() : {};
      const failures = (prev.consecutiveFailures || 0) + 1;
      const status = failures >= 3 ? "down" : "degraded";

      await healthRef.set({
        serviceName,
        status,
        lastError: err.message,
        lastErrorAt: admin.firestore.FieldValue.serverTimestamp(),
        lastCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
        consecutiveFailures: failures,
        lastHealthyAt: prev.lastHealthyAt || null,
      }, { merge: true });
    } catch (logErr) {
      console.error(`[healthCheck] Failed to log health for ${serviceName}:`, logErr.message);
    }

    // Aviation safety services: log data gap to The Ledger audit trail
    if (isAviation) {
      await logAviationDataGap(serviceName, err.message);
    }

    return {
      ok: false,
      success: false,
      error: err.message,
      fallback: isTimeout
        ? "Data source responding slowly. Using cached data where available."
        : defaultFallback,
    };
  }
}

/**
 * Get current health status for all tracked services.
 * @returns {Promise<Object[]>}
 */
async function getAllHealthStatuses() {
  const db = getDb();
  const snap = await db.collection("apiHealth").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get health status for a specific service.
 * @param {string} serviceName
 * @returns {Promise<Object|null>}
 */
async function getServiceHealth(serviceName) {
  const db = getDb();
  const snap = await db.doc(`apiHealth/${serviceName}`).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

module.exports = { callWithHealthCheck, checkAndDeductCredits, refundCredits, getAllHealthStatuses, getServiceHealth, logAviationDataGap };
