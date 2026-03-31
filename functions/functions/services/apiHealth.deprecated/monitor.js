"use strict";

/**
 * monitor.js — API Health Monitor (41.3-T2 Layer 1)
 *
 * Universal wrapper for all external API calls.
 * Catches failures, logs to Firestore apiHealth collection,
 * tracks uptime per service. Never call external APIs directly
 * in service files — route through callWithHealthCheck().
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const DEGRADED_THRESHOLD = 3;

/**
 * Wrap an external API call with health tracking.
 *
 * @param {object} opts
 * @param {string} opts.serviceName — e.g. "aviationweather", "notamify", "vincario"
 * @param {Function} opts.fn — async function that makes the actual API call
 * @param {*} [opts.fallback] — fallback value returned on failure
 * @param {number} [opts.timeout=10000] — timeout in ms
 * @returns {Promise<{ success: boolean, data?: *, error?: string, fallback?: * }>}
 */
async function callWithHealthCheck({ serviceName, fn, fallback, timeout = 10000 }) {
  const start = Date.now();
  try {
    const result = await Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeout)
      ),
    ]);
    const latency = Date.now() - start;

    // Log success (non-blocking)
    logHealth({ serviceName, status: "ok", latency }).catch((e) =>
      console.warn(`[apiHealth] log failed for ${serviceName}:`, e.message)
    );

    return { success: true, data: result };
  } catch (err) {
    const latency = Date.now() - start;
    const status = err.message === "timeout" ? "timeout" : "error";

    // Log failure (non-blocking)
    logHealth({ serviceName, status, latency, error: err.message }).catch((e) =>
      console.warn(`[apiHealth] log failed for ${serviceName}:`, e.message)
    );

    return { success: false, error: err.message, fallback: fallback || null };
  }
}

/**
 * Log health status to Firestore apiHealth/{serviceName}.
 */
async function logHealth({ serviceName, status, latency, error }) {
  const db = getDb();
  const ref = db.collection("apiHealth").doc(serviceName);

  const update = {
    serviceName,
    status,
    lastCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
    latencyMs: latency,
  };

  if (status !== "ok") {
    update.lastErrorAt = admin.firestore.FieldValue.serverTimestamp();
    update.lastError = error || null;
    update.consecutiveErrors = admin.firestore.FieldValue.increment(1);
  } else {
    update.consecutiveErrors = 0;
    update.lastError = null;
  }

  await ref.set(update, { merge: true });
}

/**
 * Get current health status for all tracked services.
 * Used by GET /v1/api-health endpoint.
 *
 * @returns {Promise<{ overall: string, services: object }>}
 */
async function getHealthStatus() {
  const db = getDb();
  const snap = await db.collection("apiHealth").get();

  const SAFETY_CRITICAL = ["aviationweather", "notamify"];
  const services = {};
  let hasDegraded = false;
  let hasCriticalDown = false;

  snap.forEach((doc) => {
    const d = doc.data();
    const effectiveStatus = (d.consecutiveErrors >= DEGRADED_THRESHOLD && d.status !== "ok")
      ? "degraded"
      : d.status;

    services[d.serviceName] = {
      status: effectiveStatus,
      latencyMs: d.latencyMs || null,
      lastError: effectiveStatus !== "ok" ? d.lastError : undefined,
      consecutiveErrors: d.consecutiveErrors || 0,
    };

    if (effectiveStatus === "degraded" || effectiveStatus === "error" || effectiveStatus === "timeout") {
      hasDegraded = true;
      if (SAFETY_CRITICAL.includes(d.serviceName)) {
        hasCriticalDown = true;
      }
    }
  });

  const overall = hasCriticalDown ? "error" : hasDegraded ? "degraded" : "ok";

  return { overall, services };
}

module.exports = { callWithHealthCheck, logHealth, getHealthStatus, DEGRADED_THRESHOLD };
