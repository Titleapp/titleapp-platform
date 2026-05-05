/**
 * feedbackHandler.js — CODEX 50.11 Layer B per-message feedback.
 *
 * Writes thumbs up/down events on AI chat messages to the
 * workerFeedback/ collection. Parallel to the legacy ratings/ pipeline
 * (which stays as star-rating signal); workerFeedback is the richer
 * per-message stream that the Editor worker (v2) will eventually
 * aggregate.
 *
 * Inherits worker_version from the parent chatSessions doc — the
 * audit-version pinning trigger (Step 4) snapshots it on session
 * create, so by the time a feedback event fires the version is on the
 * session.
 *
 * Rate limit: 6 events per user per 60 seconds (in-memory ring buffer).
 * Excessive feedback typically signals a UI bug or bot, not legitimate
 * signal.
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const VALID_TYPES = new Set(["thumbs_up", "thumbs_down"]);
const VALID_SCOPES = new Set(["chat_message", "canvas_card", "worker_overall"]);

// In-memory rate limit. Cloud Functions instances are short-lived so this
// is best-effort per-instance — sufficient deterrent for misbehaving UI
// without persistent state. Sustained abuse would require a Firestore-
// backed rate limiter; out of scope for v1.
const _userHits = new Map(); // uid → [timestamps]
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 6;

function rateLimit(uid) {
  const now = Date.now();
  const hits = (_userHits.get(uid) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) return false;
  hits.push(now);
  _userHits.set(uid, hits);
  return true;
}

async function chatFeedback(req, res) {
  const db = getDb();
  const user = req._user;
  const uid = user.uid;
  const body = req.body || {};
  const { messageId, sessionId, type, scope, cardSignal, comment } = body;

  // Workspace tenant context for the feedback event (carries with the user
  // for cross-tenant attribution sanity).
  const tenantId = req.headers["x-tenant-id"] || body.tenantId || null;

  if (!type || !VALID_TYPES.has(type)) {
    return res.status(400).json({ ok: false, error: "type must be thumbs_up or thumbs_down" });
  }
  const eventScope = scope && VALID_SCOPES.has(scope) ? scope : "chat_message";

  if (eventScope === "chat_message" && !messageId) {
    return res.status(400).json({ ok: false, error: "messageId required for chat_message scope" });
  }
  if (eventScope === "canvas_card" && !cardSignal) {
    return res.status(400).json({ ok: false, error: "cardSignal required for canvas_card scope" });
  }

  if (!rateLimit(uid)) {
    return res.status(429).json({ ok: false, error: "rate limit: 6 events per minute" });
  }

  // Resolve workerSlug + worker_version from the session if available.
  let workerSlug = body.workerSlug || null;
  let workerVersion = body.worker_version || null;
  if (sessionId) {
    try {
      const sess = await db.doc(`chatSessions/${sessionId}`).get();
      if (sess.exists) {
        const sd = sess.data();
        workerSlug = workerSlug || sd.workerSlug || sd.selectedWorker || sd.workerId || null;
        workerVersion = workerVersion || sd.worker_version || null;
      }
    } catch (e) { /* fall through, write nulls */ }
  }

  const ref = await db.collection("workerFeedback").add({
    userId: uid,
    tenantId,
    workerSlug,
    worker_version: workerVersion || "v1",
    scope: eventScope,
    type,
    messageId: messageId || null,
    sessionId: sessionId || null,
    cardSignal: cardSignal || null,
    comment: comment ? String(comment).slice(0, 1000) : null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return res.json({ ok: true, feedbackId: ref.id });
}

module.exports = { chatFeedback };
