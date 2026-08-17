"use strict";

/**
 * workerReviewGate.js — CODEX S52.55, the real admin-review gate.
 *
 * Corrects a real, verified gap: the sandbox's existing "Admin review
 * approved" Preflight checkbox is a client-submitted field with no backend
 * enforcement at all (PreflightCanvas submits a flat gate count; nothing in
 * workerBuildFlow.js checks who submitted it or whether an admin looked at
 * anything). Fast-path-built workers (upload-first, less human attention
 * during build by design) need a review step that's actually backend-
 * enforced — a real admin-role check, not a checkbox anyone can tick.
 *
 * pendingWorkerReviews/{id}: { tenantId, workerSlug, sessionId, submittedBy,
 *   status: "pending"|"approved"|"rejected", reviewedBy, reviewedAt, notes,
 *   buildSource, createdAt }
 */

const admin = require("firebase-admin");
const { enforceRoleGate } = require("../../middleware/membershipCheck");

function getDb() { return admin.firestore(); }

/**
 * POST /v1/worker:review:submit
 * Body: { tenantId, workerSlug, sessionId?, buildSource? }
 * Any authenticated tenant member can submit — this is the creator finishing
 * their build, not an admin action.
 */

// Plain function, no req/res — callable directly from route handlers AND from
// internal pipelines (teacherFastPath.js) without faking an Express response.
async function submitReview({ tenantId, workerSlug, sessionId, buildSource, submittedBy }) {
  if (!workerSlug) throw new Error("workerSlug is required");
  const db = getDb();
  const ref = await db.collection("pendingWorkerReviews").add({
    tenantId: tenantId || null,
    workerSlug,
    sessionId: sessionId || null,
    buildSource: buildSource || "fast-path",
    submittedBy,
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
    notes: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { reviewId: ref.id, status: "pending" };
}

async function handleSubmit(req, res, user) {
  try {
    const { tenantId, workerSlug, sessionId, buildSource } = req.body || {};
    const result = await submitReview({ tenantId, workerSlug, sessionId, buildSource, submittedBy: user.uid });
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error("[workerReviewGate] submit failed:", e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * GET /v1/worker:review:list?tenantId=...&status=pending
 * Admin-role-gated — the real backend check the old checkbox never had.
 */
async function handleList(req, res, user) {
  try {
    const tenantId = req.query.tenantId;
    const status = req.query.status || "pending";
    if (!tenantId) return res.status(400).json({ ok: false, error: "tenantId is required" });
    const gate = await enforceRoleGate(user.uid, tenantId, "admin");
    if (!gate.ok) return res.status(gate.error === "not_authenticated" ? 401 : 403).json({ ok: false, error: gate.error });
    const db = getDb();
    const snap = await db.collection("pendingWorkerReviews")
      .where("tenantId", "==", tenantId).where("status", "==", status).get();
    const reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0));
    return res.json({ ok: true, reviews });
  } catch (e) {
    console.error("[workerReviewGate] list failed:", e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /v1/worker:review:decide
 * Body: { reviewId, tenantId, decision: "approved"|"rejected", notes? }
 * Admin-role-gated. This is what actually flips the underlying worker's
 * status — the real enforcement point lives in index.js's chat handler,
 * which refuses to serve a fast-path worker unless digitalWorkers/{slug}
 * .status === "live". Rejecting leaves the worker's status untouched
 * (never "live"), so it stays unservable rather than being deleted.
 */
async function handleDecide(req, res, user) {
  try {
    const { reviewId, tenantId, decision, notes } = req.body || {};
    if (!reviewId || !tenantId) return res.status(400).json({ ok: false, error: "reviewId and tenantId are required" });
    if (decision !== "approved" && decision !== "rejected") {
      return res.status(400).json({ ok: false, error: 'decision must be "approved" or "rejected"' });
    }
    const gate = await enforceRoleGate(user.uid, tenantId, "admin");
    if (!gate.ok) return res.status(gate.error === "not_authenticated" ? 401 : 403).json({ ok: false, error: gate.error });

    const db = getDb();
    const ref = db.collection("pendingWorkerReviews").doc(reviewId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ ok: false, error: "review not found" });
    if (doc.data().tenantId !== tenantId) return res.status(403).json({ ok: false, error: "tenant mismatch" });

    if (decision === "approved") {
      const workerSlug = doc.data().workerSlug;
      if (workerSlug) {
        await db.collection("digitalWorkers").doc(workerSlug).update({
          status: "live",
          approvedBy: user.uid,
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    await ref.update({
      status: decision,
      reviewedBy: user.uid,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      notes: notes || null,
    });
    return res.json({ ok: true, reviewId, status: decision });
  } catch (e) {
    console.error("[workerReviewGate] decide failed:", e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

module.exports = { submitReview, handleSubmit, handleList, handleDecide };
