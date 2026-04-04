"use strict";

/**
 * assetService.js — Canvas asset persistence.
 *
 * Assets are scoped to the creator account (users/{uid}/assets/{assetId}),
 * not to a session. Sessions reference asset IDs. This makes the library
 * portable across sessions and surfaces.
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

/**
 * Save a new asset to the creator's library.
 * @param {string} uid — Creator's Firebase UID
 * @param {object} data — Asset fields
 * @returns {Promise<string>} — The new asset doc ID
 */
async function saveAsset(uid, data) {
  const db = getDb();
  const ref = db.collection("users").doc(uid).collection("assets").doc();
  await ref.set({
    assetId: ref.id,
    uid,
    imageUrl: data.imageUrl,
    style: data.style || "cartoon",
    assetType: data.assetType || "character",
    prompt: data.prompt || "",
    projectId: data.projectId || null,
    projectName: data.projectName || null,
    associatedWorkerId: null,
    savedToLibrary: data.savedToLibrary || false,
    ledgerEligible: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    sessionId: data.sessionId || null,
  });
  return ref.id;
}

/**
 * Associate an asset with a worker/game build.
 * @param {string} uid — Creator's Firebase UID
 * @param {string} assetId — Asset doc ID
 * @param {string|null} workerId — Worker/game ID to associate, or null to clear
 */
async function associateAsset(uid, assetId, workerId) {
  const db = getDb();
  const ref = db.collection("users").doc(uid).collection("assets").doc(assetId);
  const update = { savedToLibrary: true };
  if (workerId) {
    update.associatedWorkerId = workerId;
  } else {
    update.associatedWorkerId = null;
  }
  await ref.update(update);
}

/**
 * Delete an asset from the creator's library.
 * Does NOT delete the Firebase Storage file (future session).
 * @param {string} uid — Creator's Firebase UID
 * @param {string} assetId — Asset doc ID
 */
async function deleteAsset(uid, assetId) {
  const db = getDb();
  await db.collection("users").doc(uid).collection("assets").doc(assetId).delete();
}

/**
 * List assets for a creator with optional filters.
 * @param {string} uid
 * @param {object} opts — { projectId, assetType, limit, cursor }
 * @returns {Promise<{ assets: object[], nextCursor: string|null }>}
 */
async function listAssets(uid, opts = {}) {
  const db = getDb();
  let query = db.collection("users").doc(uid).collection("assets")
    .orderBy("createdAt", "desc");

  if (opts.projectId) {
    query = query.where("projectId", "==", opts.projectId);
  }
  if (opts.assetType) {
    query = query.where("assetType", "==", opts.assetType);
  }

  const limit = opts.limit || 20;
  query = query.limit(limit + 1); // fetch one extra for cursor

  if (opts.cursor) {
    const cursorDoc = await db.collection("users").doc(uid).collection("assets").doc(opts.cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snap = await query.get();
  const docs = snap.docs.slice(0, limit);
  const hasMore = snap.docs.length > limit;
  const nextCursor = hasMore ? docs[docs.length - 1].id : null;

  const assets = docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Client-side prompt search (Firestore doesn't support text search)
  if (opts.search && opts.search.length >= 2) {
    const needle = opts.search.toLowerCase();
    return {
      assets: assets.filter(a => (a.prompt || "").toLowerCase().includes(needle)),
      nextCursor,
    };
  }

  return { assets, nextCursor };
}

/**
 * Get all assets associated with a specific worker (for build spec injection).
 * @param {string} uid
 * @param {string} workerId
 * @returns {Promise<object[]>}
 */
async function getAssociatedAssets(uid, workerId) {
  const db = getDb();
  const snap = await db.collection("users").doc(uid).collection("assets")
    .where("associatedWorkerId", "==", workerId)
    .get();
  return snap.docs.map(doc => ({
    assetId: doc.id,
    imageUrl: doc.data().imageUrl,
    assetType: doc.data().assetType,
    style: doc.data().style,
  }));
}

module.exports = { saveAsset, associateAsset, deleteAsset, listAssets, getAssociatedAssets };
