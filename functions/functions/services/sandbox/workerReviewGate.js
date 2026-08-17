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

    // CODEX S52.55 follow-up — a review that only shows a slug isn't
    // actually reviewable. Join in the real worker content (what it's
    // supposed to do, its rules, its escalation triggers, and its test
    // transcript) so "approve" means something. Independent evaluation
    // (below on decide) is a separate, additional signal, not a replacement
    // for showing the admin the real content.
    const withContent = await Promise.all(reviews.map(async (r) => {
      if (!r.workerSlug) return r;
      try {
        const wSnap = await db.collection("digitalWorkers").doc(r.workerSlug).get();
        if (!wSnap.exists) return { ...r, workerMissing: true };
        const w = wSnap.data();
        return {
          ...r,
          workerName: w.name || null,
          evaluationWorkerName: w.evaluationWorkerName || null,
          subject: w.subject || null,
          job: w.job || null,
          knowledgeSummary: w.knowledgeSummary || null,
          systemPrompt: w.systemPrompt || null,
          testSummary: w.testSummary || null,
          minutesPending: r.createdAt?._seconds ? Math.round((Date.now() / 1000 - r.createdAt._seconds) / 60) : null,
        };
      } catch (e) {
        console.warn("[workerReviewGate] failed to join worker content for", r.workerSlug, e.message);
        return r;
      }
    }));

    return res.json({ ok: true, reviews: withContent });
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

/**
 * Scheduled daily. The review-queue UI shows elapsed time, but a UI label
 * only reaches someone already looking at the page — the SLA gap named in
 * S52.55 needs a real push, not just a passive display. Emails each
 * tenant's admin once per stale review per day, reusing the same SendGrid
 * pattern as liveEscalation.js.
 */
async function checkStaleReviews() {
  const db = getDb();
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
  const snap = await db.collection("pendingWorkerReviews")
    .where("status", "==", "pending").where("createdAt", "<=", cutoff).get();
  if (snap.empty) return { checked: 0, notified: 0 };

  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
  let notified = 0;
  for (const doc of snap.docs) {
    const r = doc.data();
    if (r.staleReminderSentAt) continue; // one reminder per stale review, not daily spam
    try {
      if (SENDGRID_API_KEY && r.tenantId) {
        const membershipsSnap = await db.collection("memberships")
          .where("tenantId", "==", r.tenantId).where("role", "==", "admin").where("status", "==", "active")
          .limit(1).get();
        if (!membershipsSnap.empty) {
          const uid = membershipsSnap.docs[0].data().userId;
          const userRecord = uid ? await admin.auth().getUser(uid).catch(() => null) : null;
          if (userRecord && userRecord.email) {
            await fetch("https://api.sendgrid.com/v3/mail/send", {
              method: "POST",
              headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                personalizations: [{ to: [{ email: userRecord.email }] }],
                from: { email: "alerts@sociii.ai", name: "SOCIII Alerts" },
                subject: `[SOCIII] Worker review pending over 24 hours — ${r.workerSlug}`,
                content: [{ type: "text/plain", value: `A fast-path-built worker (${r.workerSlug}) has been waiting for your review for over 24 hours. Nothing is live until you approve or reject it.\n\nReview it in your Worker Review Queue.\n\n— SOCIII (automated)` }],
              }),
            });
            notified++;
          }
        }
      }
    } catch (e) {
      console.warn("[workerReviewGate] stale reminder failed for", doc.id, e.message);
    } finally {
      await doc.ref.update({ staleReminderSentAt: admin.firestore.FieldValue.serverTimestamp() });
    }
  }
  return { checked: snap.size, notified };
}

module.exports = { submitReview, handleSubmit, handleList, handleDecide, checkStaleReviews };
