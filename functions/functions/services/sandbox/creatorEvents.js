"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const CREATOR_EVENT_TYPES = {
  SESSION_STARTED: "session_started",
  VIBE_COMPLETED: "vibe_completed",
  SPEC_GENERATED: "spec_generated",
  PDF_DOWNLOADED: "pdf_downloaded",
  PREVIEW_SHARED: "preview_shared",
  FIRST_SUBSCRIBER: "first_subscriber",
  WORKER_PUBLISHED: "worker_published",
};

/**
 * Append-only funnel event emitter.
 * Never throws — events must not block the main flow.
 */
async function emitCreatorEvent(userId, eventType, metadata = {}) {
  try {
    const db = getDb();
    await db.collection("creatorEvents").add({
      userId,
      eventType,
      sessionId: metadata.sessionId || null,
      workerId: metadata.workerId || null,
      metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("[creatorEvents] emit failed (non-blocking):", e.message);
  }
}

module.exports = { emitCreatorEvent, CREATOR_EVENT_TYPES };
