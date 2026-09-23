"use strict";

/**
 * askWorkerRateLimiter.js — dedicated rate-limit bucket for Alex's
 * ask_worker capability (CODEX 102 Part 1, point 4). A separate Firestore
 * doc/collection from personaSendRateLimiter.js on purpose — same pattern,
 * separate instance, so a burst of persona-email sends can't eat into or be
 * eaten by this budget.
 *
 * Scoped PER-TENANT (round-2 red-team correction): SOCIII spans multiple
 * tenant contexts, so a platform-wide bucket would let one tenant's Alex
 * activity throttle an unrelated tenant's. Global ACROSS all target workers
 * within that tenant (round-1 correction): per-target-worker scoping would
 * let Alex spread 10/hour x N workers, defeating the actual goal — stopping
 * "go ask someone" from substituting for Alex's own reasoning, not just
 * capping total volume.
 */

const admin = require("firebase-admin");

const DEFAULT_PER_HOUR = 10;

function hourKey(d) {
  return d.toISOString().slice(0, 13); // YYYY-MM-DDTHH, UTC
}

function budgetRef(tenantId) {
  return admin.firestore().collection("alexAskWorkerBudget").doc(tenantId);
}

/**
 * Throws (fails closed) if the tenant's hourly ask_worker budget is
 * exhausted; otherwise atomically increments it in one transaction. Must be
 * called BEFORE ask_worker's underlying call proceeds — a limiter that
 * counts calls it didn't prevent isn't a limiter (same principle as
 * personaSendRateLimiter.assertWithinLimit).
 */
async function assertWithinBudget(tenantId) {
  if (!tenantId) throw new Error("assertWithinBudget: tenantId is required");
  const ref = budgetRef(tenantId);
  const hk = hourKey(new Date());
  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const sameHour = data.hourKey === hk;
    const callsThisHour = sameHour ? (data.callsThisHour || 0) : 0;
    const perHour = data.perHourOverride || DEFAULT_PER_HOUR;
    if (callsThisHour >= perHour) {
      throw new Error(`ask_worker budget exhausted for this tenant this hour (${callsThisHour}/${perHour})`);
    }
    tx.set(ref, {
      tenantId,
      hourKey: hk,
      callsThisHour: callsThisHour + 1,
      lastCallAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

/** Read-only, non-gating status check — for Dev's rollup (point 6). */
async function getBudgetStatus(tenantId) {
  const snap = await budgetRef(tenantId).get();
  const data = snap.exists ? snap.data() : {};
  const hk = hourKey(new Date());
  const sameHour = data.hourKey === hk;
  return {
    tenantId,
    callsThisHour: sameHour ? (data.callsThisHour || 0) : 0,
    perHour: data.perHourOverride || DEFAULT_PER_HOUR,
  };
}

module.exports = { assertWithinBudget, getBudgetStatus, budgetRef, DEFAULT_PER_HOUR };
