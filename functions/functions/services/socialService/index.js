"use strict";
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

// Unified.to Marketing API — social posting
const UNIFIED_API_KEY = process.env.UNIFIED_API_KEY || "";
const UNIFIED_WORKSPACE_ID = process.env.UNIFIED_WORKSPACE_ID || "";

/**
 * Post content to social platforms via Unified.to Marketing API.
 * @param {string} userId
 * @param {object} opts - { content, platforms, title, scheduledAt }
 * @returns {{ ok, postId, platformResults }}
 */
async function postViaUnified(userId, { content, platforms, title, scheduledAt }) {
  if (!UNIFIED_API_KEY) {
    return { ok: false, error: "Unified.to API key not configured" };
  }
  if (!content) {
    return { ok: false, error: "Missing content" };
  }
  if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
    return { ok: false, error: "At least one platform is required" };
  }

  const db = getDb();
  const postId = "sp_" + require("crypto").randomUUID().replace(/-/g, "");
  const platformResults = {};

  for (const platform of platforms) {
    try {
      // Unified.to Marketing API — create social post
      const resp = await fetch("https://api.unified.to/marketing/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${UNIFIED_API_KEY}`,
          ...(UNIFIED_WORKSPACE_ID ? { "x-workspace-id": UNIFIED_WORKSPACE_ID } : {}),
        },
        body: JSON.stringify({
          title: title || "",
          content,
          platform,
          ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
        }),
      });

      const data = await resp.json().catch(() => ({}));
      platformResults[platform] = {
        ok: resp.ok,
        status: resp.status,
        id: data.id || null,
        error: resp.ok ? null : (data.message || data.error || `HTTP ${resp.status}`),
      };
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
    scheduledAt: scheduledAt || null,
    results: platformResults,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true, postId, platformResults };
}

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
    const postResult = await postViaUnified(userId, {
      content: draft.content,
      platforms: draft.platforms,
      title: draft.title,
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

module.exports = { postViaUnified, saveDraft, listDrafts, approveDraft, rejectDraft };
