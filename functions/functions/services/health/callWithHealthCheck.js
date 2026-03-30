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

/**
 * @param {string} serviceName - e.g. "aviationweather", "notamify", "realie"
 * @param {Function} fn - async function that makes the external API call
 * @param {Object} [opts]
 * @param {number} [opts.timeoutMs=15000] - timeout for the call
 * @param {string} [opts.fallbackMessage] - Alex-friendly message on failure
 * @returns {Promise<{ ok: boolean, data?: any, fallback?: string, cached?: boolean }>}
 */
async function callWithHealthCheck(serviceName, fn, opts = {}) {
  const { timeoutMs = 15000, fallbackMessage } = opts;
  const db = getDb();
  const healthRef = db.doc(`apiHealth/${serviceName}`);

  const defaultFallback = fallbackMessage || `${serviceName} is temporarily unavailable. Working with cached or estimated data.`;

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

    return {
      ok: false,
      fallback: isTimeout
        ? `${serviceName} is responding slowly. Using cached data where available.`
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

module.exports = { callWithHealthCheck, getAllHealthStatuses, getServiceHealth };
