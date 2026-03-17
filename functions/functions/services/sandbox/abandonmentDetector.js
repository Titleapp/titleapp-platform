"use strict";

const admin = require("firebase-admin");
const { emitCreatorEvent } = require("./creatorEvents");

function getDb() { return admin.firestore(); }

const ABANDONMENT_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Scan for sandbox sessions that stalled at vibe_in_progress for 48+ hours.
 * Called daily by sandboxDailyProcessor.
 */
async function detectAbandonment() {
  const db = getDb();
  const cutoff = new Date(Date.now() - ABANDONMENT_THRESHOLD_MS);
  const cutoffTs = admin.firestore.Timestamp.fromDate(cutoff);

  const stalledSnap = await db.collection("sandboxSessions")
    .where("status", "==", "vibe_in_progress")
    .where("createdAt", "<=", cutoffTs)
    .limit(500)
    .get();

  if (stalledSnap.empty) {
    console.log("[abandonmentDetector] No stalled sessions found");
    return { ok: true, flagged: 0 };
  }

  const batch = db.batch();
  let flagged = 0;

  for (const doc of stalledSnap.docs) {
    const data = doc.data();

    // Skip if already flagged
    if (data.abandonmentFlaggedAt) continue;

    batch.update(doc.ref, {
      abandonmentFlaggedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    emitCreatorEvent(data.userId, "vibe_abandoned", {
      sessionId: doc.id,
    });

    flagged++;
  }

  if (flagged > 0) {
    await batch.commit();
  }

  console.log(`[abandonmentDetector] Flagged ${flagged} stalled sessions`);
  return { ok: true, flagged };
}

module.exports = { detectAbandonment };
