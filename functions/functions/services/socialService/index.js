"use strict";
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

// Direct per-platform posting. Unified.to was dropped (it never actually
// posted). X/Twitter posts directly to SOCIII's own account via services/
// social/x.js; other platforms light up as their direct integrations land.
const X_ALIASES = new Set(["x", "twitter", "twitter/x", "x (twitter)"]);
const YT_ALIASES = new Set(["youtube", "youtube (google)", "google/youtube"]);
const TT_ALIASES = new Set(["tiktok", "tik tok"]);

// Generate a short-lived signed public URL for a Storage object so TikTok
// can pull the video from an HTTPS URL without Firebase auth.
async function _signedVideoUrl(storagePath) {
  const admin = require("firebase-admin");
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  const [url] = await file.getSignedUrl({ action: "read", expires: Date.now() + 3 * 60 * 60 * 1000 }); // 3h
  return url;
}

/**
 * Post content directly to each requested platform.
 * @param {string} userId
 * @param {object} opts - { content, platforms, title, mediaStoragePath, mediaUrl, scheduledAt }
 * @returns {{ ok, postId, platformResults }}
 */
async function postToPlatforms(userId, { content, platforms, title, mediaStoragePath, mediaUrl, scheduledAt }) {
  if (!content) return { ok: false, error: "Missing content" };
  if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
    return { ok: false, error: "At least one platform is required" };
  }

  const db = getDb();
  const postId = "sp_" + require("crypto").randomUUID().replace(/-/g, "");
  const platformResults = {};

  for (const platform of platforms) {
    const p = String(platform || "").toLowerCase().trim();
    try {
      if (X_ALIASES.has(p)) {
        const { postToX } = require("../social/x");
        const r = await postToX({ text: content, mediaStoragePath, mediaUrl });
        platformResults[platform] = r.ok
          ? { ok: true, id: r.tweetId || null, url: r.url || null }
          : { ok: false, error: r.error };
      } else if (YT_ALIASES.has(p)) {
        if (!mediaStoragePath && !mediaUrl) {
          platformResults[platform] = { ok: false, error: "YouTube requires a video file — add a mediaStoragePath to this draft" };
        } else {
          const { uploadVideoFromStorage } = require("../social/youtube");
          const storagePath = mediaStoragePath || mediaUrl;
          const r = await uploadVideoFromStorage(userId, storagePath, {
            title: title || content.slice(0, 100),
            description: content,
            privacyStatus: "private",
          });
          platformResults[platform] = { ok: r.ok, id: r.videoId || null, url: r.url || null };
        }
      } else if (TT_ALIASES.has(p)) {
        if (!mediaStoragePath && !mediaUrl) {
          platformResults[platform] = { ok: false, error: "TikTok requires a video file — add a mediaStoragePath to this draft" };
        } else {
          const { postVideoToTikTok } = require("../social/tiktok");
          const storagePath = mediaStoragePath || mediaUrl;
          const videoUrl = storagePath.startsWith("http") ? storagePath : await _signedVideoUrl(storagePath);
          const r = await postVideoToTikTok(userId, {
            videoUrl,
            title: title || content.slice(0, 150),
            privacyLevel: "SELF_ONLY",
          });
          platformResults[platform] = { ok: r.ok, id: r.publishId || null, url: r.url || null };
        }
      } else {
        platformResults[platform] = { ok: false, error: `${platform} posting is not yet available — connect it in Settings` };
      }
    } catch (e) {
      platformResults[platform] = { ok: false, error: e.message };
    }
  }

  // Log to Firestore
  await db.collection("socialPosts").doc(postId).set({
    userId,
    platforms,
    content,
    title: title || null,
    mediaStoragePath: mediaStoragePath || null,
    scheduledAt: scheduledAt || null,
    results: platformResults,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true, postId, platformResults };
}

// Back-compat alias — old name used by existing callers.
const postViaUnified = postToPlatforms;

/**
 * Save a marketing draft.
 * @param {string} userId
 * @param {object} opts - { content, platforms, title, tenantId }
 * @returns {{ ok, draftId }}
 */
async function saveDraft(userId, { content, platforms, title, tenantId }) {
  if (!content) return { ok: false, error: "Missing content" };

  const db = getDb();
  const ref = db.collection("marketingDrafts").doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  await ref.set({
    userId,
    tenantId: tenantId || null,
    content,
    title: title || null,
    platforms: platforms || [],
    status: "draft",
    createdAt: now,
    updatedAt: now,
    postResult: null,
  });

  return { ok: true, draftId: ref.id };
}

/**
 * List drafts for a user with optional status filter.
 * @param {string} userId
 * @param {object} opts - { status, limit, offset }
 * @returns {{ ok, drafts }}
 */
async function listDrafts(userId, { status, limit: lim, offset } = {}) {
  const db = getDb();
  let q = db.collection("marketingDrafts")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc");

  if (status) q = q.where("status", "==", status);
  q = q.limit(lim || 50);
  if (offset) q = q.offset(offset);

  const snap = await q.get();
  const drafts = snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    };
  });

  return { ok: true, drafts };
}

/**
 * Approve a draft and post to social platforms.
 * @param {string} userId
 * @param {string} draftId
 * @returns {{ ok, postId, platformResults }}
 */
async function approveDraft(userId, draftId) {
  if (!draftId) return { ok: false, error: "Missing draftId" };

  const db = getDb();
  const ref = db.collection("marketingDrafts").doc(draftId);
  const snap = await ref.get();

  if (!snap.exists) return { ok: false, error: "Draft not found" };
  const draft = snap.data();
  if (draft.userId !== userId) return { ok: false, error: "Not authorized" };
  if (draft.status === "posted") return { ok: false, error: "Draft already posted" };

  // Update status to approved
  await ref.update({
    status: "approved",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // If platforms specified, auto-post
  if (draft.platforms && draft.platforms.length > 0) {
    const postResult = await postToPlatforms(userId, {
      content: draft.content,
      platforms: draft.platforms,
      title: draft.title,
      mediaStoragePath: draft.mediaStoragePath,
      mediaUrl: draft.mediaUrl,
    });

    await ref.update({
      status: "posted",
      postResult,
      draftId: postResult.postId || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { ok: true, postId: postResult.postId, platformResults: postResult.platformResults };
  }

  return { ok: true, status: "approved" };
}

/**
 * Reject a draft with optional reason.
 * @param {string} userId
 * @param {string} draftId
 * @param {string} reason
 * @returns {{ ok }}
 */
async function rejectDraft(userId, draftId, reason) {
  if (!draftId) return { ok: false, error: "Missing draftId" };

  const db = getDb();
  const ref = db.collection("marketingDrafts").doc(draftId);
  const snap = await ref.get();

  if (!snap.exists) return { ok: false, error: "Draft not found" };
  const draft = snap.data();
  if (draft.userId !== userId) return { ok: false, error: "Not authorized" };

  await ref.update({
    status: "rejected",
    rejectionReason: reason || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true };
}

module.exports = { postToPlatforms, postViaUnified, saveDraft, listDrafts, approveDraft, rejectDraft };
