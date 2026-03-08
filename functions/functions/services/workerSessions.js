/**
 * workerSessions.js — Worker Open Tracking
 *
 * Tracks when a subscriber opens a worker. T1 reads these fields:
 *   - firstOpenedAt: null = first open → fire greeting
 *   - lastOpenedAt: > 30 days → show re-open banner
 *   - chatCleared: true → treat as first open → fire greeting, reset to false
 *   - openCount: available for analytics
 *
 * Collection: workerSessions/{userId}_{workerId}
 *
 * Callable Cloud Function — not a direct client Firestore write (rate limit protection).
 * Fire-and-forget — do not block T1 render on this.
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

/**
 * Record a worker open event.
 * POST /v1/worker-session:open
 * Body: { workerId }
 */
async function recordWorkerOpen(req, res) {
  const db = getDb();
  const user = req._user;
  const uid = user.uid;
  const { workerId } = req.body || {};

  if (!workerId) return res.status(400).json({ ok: false, error: "workerId required" });

  const sessionId = `${uid}_${workerId}`;
  const sessionRef = db.collection("workerSessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (!sessionSnap.exists) {
    // First open — create doc
    await sessionRef.set({
      userId: uid,
      workerId,
      firstOpenedAt: now,
      lastOpenedAt: now,
      openCount: 1,
      chatCleared: false,
    });

    return res.json({
      ok: true,
      isFirstOpen: true,
      openCount: 1,
    });
  }

  // Subsequent open — update timestamp and increment count
  await sessionRef.update({
    lastOpenedAt: now,
    openCount: admin.firestore.FieldValue.increment(1),
  });

  const data = sessionSnap.data();
  return res.json({
    ok: true,
    isFirstOpen: false,
    chatCleared: data.chatCleared || false,
    openCount: (data.openCount || 0) + 1,
  });
}

/**
 * Get worker session data for T1 to read before rendering chat.
 * GET /v1/worker-session:get
 * Query: ?workerId=xxx
 */
async function getWorkerSession(req, res) {
  const db = getDb();
  const user = req._user;
  const uid = user.uid;
  const { workerId } = req.query || {};

  if (!workerId) return res.status(400).json({ ok: false, error: "workerId required" });

  const sessionId = `${uid}_${workerId}`;
  const sessionSnap = await db.collection("workerSessions").doc(sessionId).get();

  if (!sessionSnap.exists) {
    return res.json({
      ok: true,
      session: null,
      isFirstOpen: true,
    });
  }

  const data = sessionSnap.data();
  return res.json({
    ok: true,
    session: {
      firstOpenedAt: data.firstOpenedAt || null,
      lastOpenedAt: data.lastOpenedAt || null,
      openCount: data.openCount || 0,
      chatCleared: data.chatCleared || false,
    },
    isFirstOpen: false,
  });
}

/**
 * Mark chat as cleared — T1 calls this when user manually clears chat.
 * POST /v1/worker-session:clear-chat
 * Body: { workerId }
 */
async function clearWorkerChat(req, res) {
  const db = getDb();
  const user = req._user;
  const uid = user.uid;
  const { workerId } = req.body || {};

  if (!workerId) return res.status(400).json({ ok: false, error: "workerId required" });

  const sessionId = `${uid}_${workerId}`;
  const sessionRef = db.collection("workerSessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();

  if (!sessionSnap.exists) {
    return res.status(404).json({ ok: false, error: "No session found" });
  }

  await sessionRef.update({ chatCleared: true });

  return res.json({ ok: true });
}

module.exports = {
  recordWorkerOpen,
  getWorkerSession,
  clearWorkerChat,
};
