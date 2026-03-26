"use strict";

/**
 * cta.js — Session-End CTA Event Emitter
 *
 * Fires CTA events for all worker types (not just games).
 * Triggers: session_end, score_shown, share_page.
 * Writes to ctaEvents/ collection (append-only).
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const VALID_TRIGGERS = ["session_end", "score_shown", "share_page"];

/**
 * Emit a CTA trigger event.
 *
 * @param {string} trigger — "session_end" | "score_shown" | "share_page"
 * @param {object} payload
 * @param {string} payload.userId — subscriber user ID
 * @param {string} payload.workerId — worker ID
 * @param {string} [payload.workerName] — worker display name
 * @param {string} [payload.creatorHandle] — creator handle
 * @param {string} [payload.sandboxUrl] — link to sandbox ("/sandbox")
 * @param {object} [payload.metadata] — additional context
 * @returns {Promise<{ ok: boolean, eventId?: string }>}
 */
async function emitCtaTrigger(trigger, payload = {}) {
  if (!VALID_TRIGGERS.includes(trigger)) {
    console.warn(`[game:cta] Invalid trigger: ${trigger}`);
    return { ok: false, error: `Invalid trigger: ${trigger}` };
  }

  try {
    const db = getDb();
    const ref = db.collection("ctaEvents").doc();
    await ref.set({
      trigger,
      userId: payload.userId || null,
      workerId: payload.workerId || null,
      workerName: payload.workerName || null,
      creatorHandle: payload.creatorHandle || null,
      sandboxUrl: payload.sandboxUrl || "/sandbox",
      metadata: payload.metadata || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { ok: true, eventId: ref.id };
  } catch (err) {
    console.error("[game:cta] Failed to emit CTA event:", err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { emitCtaTrigger, VALID_TRIGGERS };
