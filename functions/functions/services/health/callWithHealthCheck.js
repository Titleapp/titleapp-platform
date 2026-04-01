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
  const userRef = db.doc(`users/${userId}`);

  try {
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};
    const currentBalance = userData.billing?.prepaidCredits ?? userData.prepaidCredits ?? 0;

    if (currentBalance < creditCost) {
      return {
        allowed: false,
        error: "INSUFFICIENT_CREDITS",
        message: "This action requires Data Credits. Top up your account to continue.",
        creditsRequired: creditCost,
        creditsAvailable: currentBalance,
      };
    }

    // Deduct credits
    await userRef.update({
      "billing.prepaidCredits": admin.firestore.FieldValue.increment(-creditCost),
    });

    // Log usage event
    await db.collection("usageEvents").add({
      userId,
      workerId: context.workerId || null,
      connectorId,
      creditsUsed: creditCost,
      event_type: "connector_call",
      pass_through: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { allowed: true, creditsRemaining: currentBalance - creditCost };
  } catch (e) {
    console.error(`[creditCheck] Failed for ${userId}/${connectorId}:`, e.message);
    // On error, allow the call — don't block on billing failures
    return { allowed: true };
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

module.exports = { callWithHealthCheck, checkAndDeductCredits, getAllHealthStatuses, getServiceHealth, logAviationDataGap };
