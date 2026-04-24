"use strict";
/**
 * Storage Quota — CODEX 49.5 Phase A
 * Metering events, daily aggregation, quota enforcement.
 * Billing thresholds live in /config/storage-billing (defaults to Infinity).
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

let _configCache = null;
let _configLoadedAt = 0;
const CONFIG_TTL = 5 * 60 * 1000; // 5 min cache

/**
 * Load storage billing config from Firestore (cached 5 min).
 */
async function getStorageConfig() {
  if (_configCache && Date.now() - _configLoadedAt < CONFIG_TTL) return _configCache;
  const db = getDb();
  const doc = await db.doc("config/storage-billing").get();
  if (doc.exists) {
    _configCache = doc.data();
  } else {
    // Default — no limits
    _configCache = {
      freeBytesPerUser: Infinity,
      freeBytesPerOrg: Infinity,
      tierPricePerGbMonth: 0,
      gracePeriodDays: 7,
      maxFileSizeBytes: 52428800,
      maxBatchUploadBytes: 1073741824,
    };
  }
  _configLoadedAt = Date.now();
  return _configCache;
}

/**
 * Check if a user has quota for an upload.
 * @param {string} uid
 * @param {string|null} orgId
 * @param {number} sizeBytes — bytes to upload
 * @returns {{ ok: boolean, error?: string }}
 */
async function checkQuota(uid, orgId, sizeBytes) {
  const config = await getStorageConfig();
  const maxFile = config.maxFileSizeBytes || 52428800;

  if (sizeBytes > maxFile) {
    return { ok: false, error: "file_too_large", message: `File exceeds ${Math.round(maxFile / 1024 / 1024)} MB limit` };
  }

  // Check user-level usage
  const db = getDb();
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const usageDoc = await db.doc(`usage/${uid}/${month}/storage`).get();
  const currentBytes = usageDoc.exists ? (usageDoc.data().totalBytes || 0) : 0;

  const freeBytes = config.freeBytesPerUser;
  if (freeBytes !== Infinity && currentBytes + sizeBytes > freeBytes) {
    return { ok: false, error: "quota_exceeded", message: "Storage quota exceeded" };
  }

  return { ok: true, currentBytes, afterBytes: currentBytes + sizeBytes };
}

/**
 * Record a storage metering event.
 * @param {string} uid
 * @param {string|null} orgId
 * @param {number} deltaBytes — positive for upload, negative for delete
 * @param {string} objectId
 * @param {string} action — upload | delete
 */
async function recordEvent(uid, orgId, deltaBytes, objectId, action) {
  const db = getDb();
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Write event
  await db.collection("storageEvents").add({
    uid,
    orgId: orgId || null,
    deltaBytes,
    objectId,
    action,
    timestamp: now,
  });

  // Update monthly usage
  const month = new Date().toISOString().slice(0, 7);
  const usageRef = db.doc(`usage/${uid}/${month}/storage`);
  await usageRef.set({
    totalBytes: admin.firestore.FieldValue.increment(deltaBytes),
    lastUpdated: now,
  }, { merge: true });

  // Track peak
  const usageDoc = await usageRef.get();
  const current = usageDoc.data()?.totalBytes || 0;
  const peak = usageDoc.data()?.peakBytes || 0;
  if (current > peak) {
    await usageRef.update({ peakBytes: current });
  }
}

/**
 * Aggregate daily storage usage (called by scheduled function).
 */
async function aggregateDaily(uid) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  // Count total stored bytes from non-deleted objects
  const snap = await db.collection("storageObjects")
    .where("ownerUid", "==", uid)
    .where("status", "!=", "deleted")
    .select("sizeBytes")
    .get();

  let totalBytes = 0;
  snap.docs.forEach(d => { totalBytes += d.data().sizeBytes || 0; });

  await db.doc(`usage/${uid}/${month}/storage`).set({
    totalBytes,
    peakBytes: admin.firestore.FieldValue.increment(0), // keep existing peak
    lastAggregated: today,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { ok: true, uid, totalBytes, date: today };
}

module.exports = { checkQuota, recordEvent, aggregateDaily, getStorageConfig };
