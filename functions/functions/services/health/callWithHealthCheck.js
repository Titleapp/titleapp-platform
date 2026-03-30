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

// Aviation safety connectors — failures log to God Key audit trail
const AVIATION_SAFETY_SERVICES = [
  "notamify", "aviationweather", "adsb_exchange",
  "faa_charts", "faa_nasr", "tfr_feed",
];

/**
 * Log aviation data gap to God Key audit trail.
 */
async function logAviationDataGap(serviceName, errorMessage) {
  try {
    const db = getDb();
    await db.collection("godKeyAuditTrail").add({
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
 * @param {string} serviceName - e.g. "aviationweather", "notamify", "realie"
 * @param {Function} fn - async function that makes the external API call
 * @param {Object} [opts]
 * @param {number} [opts.timeoutMs=15000] - timeout for the call
 * @param {string} [opts.fallbackMessage] - Alex-friendly message on failure
 * @param {boolean} [opts.isAviation=false] - if true, logs data gap to God Key audit trail
 * @returns {Promise<{ ok: boolean, data?: any, fallback?: string, cached?: boolean }>}
 */
async function callWithHealthCheck(serviceName, fn, opts = {}) {
  const { timeoutMs = 15000, fallbackMessage } = opts;
  const isAviation = opts.isAviation || AVIATION_SAFETY_SERVICES.includes(serviceName);
  const db = getDb();
  const healthRef = db.doc(`apiHealth/${serviceName}`);

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

    return { ok: true, data: result };
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

    // Aviation safety services: log data gap to God Key audit trail
    if (isAviation) {
      await logAviationDataGap(serviceName, err.message);
    }

    return {
      ok: false,
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

module.exports = { callWithHealthCheck, getAllHealthStatuses, getServiceHealth, logAviationDataGap };
