"use strict";

/**
 * manager.js — Living Worker Version Logic
 *
 * Workers have versions. Version increments are creator-flagged.
 * Significant updates trigger drip notifications to followers.
 * Version numbers are creator-side only — never shown to subscribers.
 *
 * Semantic: major.minor (1.0 → 1.1 → 1.2 → 2.0 for major rebuild)
 * 7-day rate limit on follower notifications to prevent fatigue.
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const NOTIFICATION_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Increment worker version.
 *
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {string} opts.workerId
 * @param {string} [opts.changeNote] — creator's description of what changed
 * @param {boolean} [opts.notifyFollowers] — true = meaningful update, emit drip
 * @param {boolean} [opts.isMajor] — true = bump major version (1.x → 2.0)
 * @returns {Promise<{ version: string, notified: boolean, queued?: boolean, reason?: string }>}
 */
async function incrementVersion({ tenantId, workerId, changeNote = "", notifyFollowers = false, isMajor = false }) {
  const db = getDb();
  const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
  const workerSnap = await workerRef.get();

  if (!workerSnap.exists) throw new Error("Worker not found");
  const worker = workerSnap.data();

  const vi = worker.versionInfo || {
    currentVersion: "1.0",
    versionHistory: [],
    lastUpdatedAt: null,
    lastNotifiedAt: null,
    totalUpdates: 0,
  };

  // Compute next version
  const current = vi.currentVersion || "1.0";
  const [major, minor] = current.split(".").map(Number);
  const nextVersion = isMajor
    ? `${major + 1}.0`
    : `${major}.${(minor || 0) + 1}`;

  const now = new Date().toISOString();

  // Append to version history
  const historyEntry = {
    version: nextVersion,
    publishedAt: now,
    changeNote: String(changeNote).substring(0, 500),
    notifyFollowers,
  };

  await workerRef.update({
    "versionInfo.currentVersion": nextVersion,
    "versionInfo.versionHistory": admin.firestore.FieldValue.arrayUnion(historyEntry),
    "versionInfo.lastUpdatedAt": now,
    "versionInfo.totalUpdates": (vi.totalUpdates || 0) + 1,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Handle follower notification
  let notified = false;
  let queued = false;
  let reason = null;

  if (notifyFollowers) {
    const result = await emitWorkerUpdatedEvent({
      tenantId,
      workerId,
      workerName: worker.display_name || worker.name || "Digital Worker",
      creatorId: tenantId,
      changeNote,
      lastNotifiedAt: vi.lastNotifiedAt,
    });
    notified = result.notified || false;
    queued = result.queued || false;
    reason = result.reason || null;
  }

  return { version: nextVersion, notified, queued, reason };
}

/**
 * Emit worker_updated event to drip system.
 * Enforces 7-day cooldown between notifications.
 *
 * @param {object} opts
 * @returns {Promise<{ notified: boolean, queued?: boolean, reason?: string }>}
 */
async function emitWorkerUpdatedEvent({ tenantId, workerId, workerName, creatorId, changeNote, lastNotifiedAt }) {
  const db = getDb();

  // 7-day rate limit
  if (lastNotifiedAt) {
    const lastTime = typeof lastNotifiedAt === "string" ? new Date(lastNotifiedAt).getTime() : lastNotifiedAt;
    if (Date.now() - lastTime < NOTIFICATION_COOLDOWN_MS) {
      return { notified: false, queued: true, reason: "7_day_cooldown" };
    }
  }

  // Trigger campaign via campaign engine
  try {
    const { triggerCampaign } = require("../../campaigns/campaignEngine");
    await triggerCampaign("worker_updated", creatorId, {
      workerId,
      workerName,
      changeNote,
    });
  } catch (err) {
    console.error("[version:manager] Campaign trigger failed:", err.message);
    // Non-blocking — don't fail the version increment
  }

  // Update lastNotifiedAt
  const workerRef = db.doc(`tenants/${tenantId}/workers/${workerId}`);
  await workerRef.update({ "versionInfo.lastNotifiedAt": new Date().toISOString() });

  return { notified: true };
}

module.exports = { incrementVersion, emitWorkerUpdatedEvent };
