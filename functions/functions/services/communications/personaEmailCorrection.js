"use strict";

/**
 * personaEmailCorrection.js — CODEX 97 safeguard #3: the correction
 * protocol. When a bad persona send is discovered, this is how it gets
 * stopped and recorded:
 *
 *   1. Immediate alert  — caller (an admin route, today) already knows;
 *      this module's job starts at auto-suspend.
 *   2. Auto-suspend     — reuses personaSendRateLimiter's suspend flag on
 *      personaEmailSafety/{workerSlug} (same doc the rate limiter reads,
 *      one transaction, no race between "suspend" and "still sending").
 *   3. Human-drafted correction — out of scope for this module; Sean sends
 *      that by hand once he knows what went wrong. Nothing here auto-drafts
 *      or auto-sends a correction — that would repeat the exact failure
 *      mode this protocol exists to catch.
 *   4. Permanent audit log — an append-only event in personaEmailCorrections
 *      (never overwritten, per this repo's append-only Firestore invariant).
 *   5. Manual resume only — resumeSending() requires an explicit admin call;
 *      nothing in this codebase clears `suspended` on its own.
 */

const admin = require("firebase-admin");
const { safetyRef } = require("./personaSendRateLimiter");

function correctionsColl() {
  return admin.firestore().collection("personaEmailCorrections");
}

/**
 * Report a bad persona send. Suspends that persona's sending immediately
 * and appends a permanent audit event. Idempotent in effect (re-suspending
 * an already-suspended persona is harmless) but always appends a new event
 * — the audit log is a history, not a status field.
 */
async function reportBadSend({ workerSlug, reportedBy, description }) {
  if (!workerSlug) throw new Error("reportBadSend: workerSlug is required");
  if (!reportedBy) throw new Error("reportBadSend: reportedBy is required");
  if (!description) throw new Error("reportBadSend: description is required — record what went wrong, not just that it did");

  const now = admin.firestore.FieldValue.serverTimestamp();
  await safetyRef(workerSlug).set(
    { suspended: true, suspendedAt: now, suspendedReason: description, suspendedBy: reportedBy },
    { merge: true }
  );

  const eventRef = await correctionsColl().add({
    workerSlug,
    action: "auto-suspended",
    reportedBy,
    description,
    reportedAt: now,
    resumedAt: null,
    resumedBy: null,
  });

  console.error(`[personaEmailCorrection] SUSPENDED ${workerSlug}: ${description} (reported by ${reportedBy}, event ${eventRef.id})`);
  return { eventId: eventRef.id, workerSlug, suspended: true };
}

/**
 * Manually resume a suspended persona's sending. Requires an explicit call
 * (an admin HTTP route today) — never automatic, and never bundled into
 * the same action that reported the problem, so resuming is always a
 * deliberate second decision.
 */
async function resumeSending({ workerSlug, resumedBy, note }) {
  if (!workerSlug) throw new Error("resumeSending: workerSlug is required");
  if (!resumedBy) throw new Error("resumeSending: resumedBy is required");

  const now = admin.firestore.FieldValue.serverTimestamp();
  await safetyRef(workerSlug).set(
    { suspended: false, suspendedReason: null, resumedAt: now, resumedBy },
    { merge: true }
  );

  const eventRef = await correctionsColl().add({
    workerSlug,
    action: "resumed",
    reportedBy: resumedBy,
    description: note || null,
    reportedAt: now,
    resumedAt: now,
    resumedBy,
  });

  console.log(`[personaEmailCorrection] RESUMED ${workerSlug} (by ${resumedBy}, event ${eventRef.id})`);
  return { eventId: eventRef.id, workerSlug, suspended: false };
}

/** Full correction history for a persona, most recent first — audit view. */
async function getCorrectionHistory(workerSlug, limit = 20) {
  const snap = await correctionsColl()
    .where("workerSlug", "==", workerSlug)
    .orderBy("reportedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

module.exports = { reportBadSend, resumeSending, getCorrectionHistory };
