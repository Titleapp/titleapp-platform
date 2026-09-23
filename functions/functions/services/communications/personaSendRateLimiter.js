"use strict";

/**
 * personaSendRateLimiter.js — CODEX 97 safeguard #1: a live per-persona
 * rate limiter / circuit breaker on outbound send volume.
 *
 * Same shape as config/marketingWorker's kill-switch (a Firestore doc,
 * checked before the action, fails closed on any doubt) but per-worker and
 * counter-based rather than a flat boolean. Also carries the suspension
 * flag the correction protocol (safeguard #3, personaEmailCorrection.js)
 * flips — one doc, one transaction, no race between "am I over the cap"
 * and "was I just suspended".
 *
 * Firestore: personaEmailSafety/{workerSlug}
 *   { suspended, suspendedAt, suspendedReason, suspendedBy,
 *     dayKey, sentToday, perDayOverride,
 *     hourKey, sentThisHour, perHourOverride,
 *     lastSentAt }
 */

const admin = require("firebase-admin");

const DEFAULT_PER_DAY = 20;
const DEFAULT_PER_HOUR = 5;

function dayKey(d) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD, UTC
}
function hourKey(d) {
  return d.toISOString().slice(0, 13); // YYYY-MM-DDTHH, UTC
}

function safetyRef(workerSlug) {
  return admin.firestore().collection("personaEmailSafety").doc(workerSlug);
}

/**
 * Call before every persona send. Throws (fails closed) if the persona is
 * suspended or would exceed its day/hour cap; otherwise atomically records
 * the send and lets the caller proceed. Never call this after the send —
 * a limiter that counts sends it didn't prevent isn't a limiter.
 */
async function assertWithinLimit(workerSlug) {
  if (!workerSlug) throw new Error("personaSendRateLimiter: workerSlug is required");
  const ref = safetyRef(workerSlug);
  const now = new Date();
  const dk = dayKey(now);
  const hk = hourKey(now);

  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};

    if (data.suspended) {
      throw new Error(
        `personaSendRateLimiter: ${workerSlug} is suspended (${data.suspendedReason || "no reason logged"}) — see personaEmailCorrection.js / personaEmailCorrections collection.`
      );
    }

    const sentToday = data.dayKey === dk ? (data.sentToday || 0) : 0;
    const sentThisHour = data.hourKey === hk ? (data.sentThisHour || 0) : 0;
    const perDay = data.perDayOverride || DEFAULT_PER_DAY;
    const perHour = data.perHourOverride || DEFAULT_PER_HOUR;

    if (sentToday >= perDay) {
      throw new Error(`personaSendRateLimiter: ${workerSlug} hit its daily cap (${perDay}/day). Resets at UTC midnight.`);
    }
    if (sentThisHour >= perHour) {
      throw new Error(`personaSendRateLimiter: ${workerSlug} hit its hourly cap (${perHour}/hour).`);
    }

    tx.set(
      ref,
      {
        dayKey: dk,
        sentToday: sentToday + 1,
        hourKey: hk,
        sentThisHour: sentThisHour + 1,
        lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

/** Read-only status check, for admin/dashboard use — never gates a send itself. */
async function getStatus(workerSlug) {
  const snap = await safetyRef(workerSlug).get();
  if (!snap.exists) {
    return { workerSlug, suspended: false, sentToday: 0, sentThisHour: 0, perDay: DEFAULT_PER_DAY, perHour: DEFAULT_PER_HOUR };
  }
  const data = snap.data();
  const now = new Date();
  return {
    workerSlug,
    suspended: !!data.suspended,
    suspendedReason: data.suspendedReason || null,
    sentToday: data.dayKey === dayKey(now) ? (data.sentToday || 0) : 0,
    sentThisHour: data.hourKey === hourKey(now) ? (data.sentThisHour || 0) : 0,
    perDay: data.perDayOverride || DEFAULT_PER_DAY,
    perHour: data.perHourOverride || DEFAULT_PER_HOUR,
  };
}

module.exports = { assertWithinLimit, getStatus, safetyRef, DEFAULT_PER_DAY, DEFAULT_PER_HOUR };
