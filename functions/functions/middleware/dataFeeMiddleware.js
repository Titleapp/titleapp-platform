/**
 * dataFeeMiddleware.js — External API cost recovery
 *
 * Wraps any external API call. Looks up provider in data_fee_registry,
 * calculates the markup charge, and records it to the usage event.
 *
 * Rule: If a provider is NOT in data_fee_registry, the call is BLOCKED,
 * an error is logged, and sean@titleapp.ai is alerted. Never let an
 * unregistered API call through — it's an untracked cost.
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";

// ── Alert helper (matches emailNotify.js pattern) ──────────────
async function sendAlert(to, subject, body) {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set — alert skipped:", subject);
    return;
  }
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "alerts@titleapp.ai", name: "TitleApp Alerts" },
      subject,
      content: [{ type: "text/plain", value: body }],
    }),
  });
}

// ── Registry cache (refreshes every 5 minutes) ────────────────
let registryCache = null;
let registryCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getRegistry() {
  const now = Date.now();
  if (registryCache && now - registryCacheTime < CACHE_TTL_MS) {
    return registryCache;
  }
  const snap = await getDb().collection("data_fee_registry").get();
  const map = {};
  snap.docs.forEach(doc => { map[doc.id] = doc.data(); });
  registryCache = map;
  registryCacheTime = now;
  return map;
}

/**
 * Wrap an external API call with cost tracking.
 *
 * @param {string} provider — Must match a data_fee_registry doc ID
 * @param {Function} callFn — Async function that executes the actual API call
 * @param {string|null} endpoint — Optional endpoint URL for audit trail
 * @returns {{ result: any, fee: { provider, actual_cost_usd, charged_to_user } }}
 */
async function dataFeeMiddleware(provider, callFn, endpoint) {
  const db = getDb();
  const registry = await getRegistry();
  const entry = registry[provider];

  // ── Block unregistered providers ─────────────────────────────
  if (!entry) {
    await db.collection("errors").add({
      type: "UNREGISTERED_DATA_PROVIDER",
      provider,
      endpoint: endpoint || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    await sendAlert(
      "sean@titleapp.ai",
      `[TitleApp] Blocked unregistered data provider: ${provider}`,
      `An external API call to provider "${provider}" was blocked because it is not registered in data_fee_registry.\n\nEndpoint: ${endpoint || "(unknown)"}\n\nAction required: Add this provider to data_fee_registry or remove the call.`
    );

    throw new Error(`Data provider "${provider}" not registered. Call blocked.`);
  }

  // ── Execute the API call ─────────────────────────────────────
  const { current_cost_usd, markup_multiplier } = entry;
  const charged_to_user = +(current_cost_usd * markup_multiplier).toFixed(4);

  const result = await callFn();

  // ── Return fee data for the caller to attach to usage_events ─
  const fee = {
    provider,
    endpoint: endpoint || entry.endpoint_pattern,
    actual_cost_usd: current_cost_usd,
    charged_to_user,
  };

  return { result, fee };
}

/**
 * Apply accumulated data fees to a usage event document.
 * Called after all API calls for an execution are complete.
 *
 * @param {FirebaseFirestore.DocumentReference} usageEventRef
 * @param {Array} fees — Array of fee objects from dataFeeMiddleware calls
 */
async function recordDataFees(usageEventRef, fees) {
  if (!fees || fees.length === 0) return;

  const totalActual = fees.reduce((sum, f) => sum + f.actual_cost_usd, 0);
  const totalCharged = fees.reduce((sum, f) => sum + f.charged_to_user, 0);

  await usageEventRef.update({
    data_api_calls: admin.firestore.FieldValue.arrayUnion(...fees),
    data_fee_actual: admin.firestore.FieldValue.increment(totalActual),
    data_fee_charged: admin.firestore.FieldValue.increment(totalCharged),
    revenue_line_2: admin.firestore.FieldValue.increment(totalCharged - totalActual),
  });
}

module.exports = { dataFeeMiddleware, recordDataFees, sendAlert };
