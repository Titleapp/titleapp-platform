"use strict";

/**
 * commitmentLedger.js — piece 2 of Sean's "Alex Staff Meeting, IT Worker &
 * Autonomy Levels" concept (see docs/codex/101-commitment-ledger.md and
 * project_worker_team_staff_meeting_dev memory). Piece 3 (Dev) is built;
 * this is the thing Dev's own findings, task canaries, etc. will eventually
 * feed, and the thing the future earned-permission-levels build (piece 4)
 * will read a track record from.
 *
 * Core rule, directly from Sean's own spec — "status must be backed by
 * evidence, not self-report": a worker (or anything acting on its behalf)
 * can open a commitment, mark it in_progress, report a blocker, or REQUEST
 * verification with proposed evidence — but nothing can mark a commitment
 * "done" except an explicit, separate verification step. Self-report and
 * completion are structurally different code paths, not just a convention
 * a caller is trusted to follow.
 *
 * Event-sourced like membershipEvents.js (CODEX 98) and the rest of this
 * codebase's append-only pattern: `commitments/{id}` is the fast-lookup
 * current state, `commitmentEvents` is the permanent, unedited history —
 * the actual delivery track record lives in the events, not the summary.
 */

const admin = require("firebase-admin");

const SEAN_UID = "WResykI56hW16silsOtvlw1UjJK2"; // same admin identity used throughout tonight's build

const STATUSES = ["open", "in_progress", "blocked", "pending_verification", "done", "expired"];
// Statuses a worker/system caller may set directly via updateProgress()/reportBlocker().
// "done" is deliberately absent — see module header.
const SELF_REPORTABLE_STATUSES = new Set(["in_progress", "blocked"]);

function db() { return admin.firestore(); }
function commitmentsColl() { return db().collection("commitments"); }
function eventsColl() { return db().collection("commitmentEvents"); }

function requireTenantId(tenantId) {
  if (!tenantId) throw new Error("commitmentLedger: tenantId is required on every call — see CLAUDE.md's tenant-scoping invariant.");
}

async function appendEvent(commitmentId, eventType, fields) {
  await eventsColl().add({
    commitmentId, eventType,
    atMs: Date.now(), at: admin.firestore.FieldValue.serverTimestamp(),
    ...fields,
  });
}

/**
 * Open a new commitment. `createdBy` is a free-text actor id for now
 * (e.g. "platform-marketing", "alex", "sean") — worth tightening to a
 * real caller-identity check once this is called from more than one
 * trusted internal surface.
 */
async function createCommitment({ tenantId, workerSlug, title, description, dueAt, createdBy }) {
  requireTenantId(tenantId);
  if (!workerSlug) throw new Error("createCommitment: workerSlug is required — every commitment has an owner");
  if (!title) throw new Error("createCommitment: title is required");
  if (!dueAt) throw new Error("createCommitment: dueAt is required — an open-ended commitment can't be tracked against a track record");
  if (!createdBy) throw new Error("createCommitment: createdBy is required");

  const ref = commitmentsColl().doc();
  const dueAtMs = new Date(dueAt).getTime();
  if (!Number.isFinite(dueAtMs)) throw new Error(`createCommitment: dueAt "${dueAt}" is not a valid date`);

  await ref.set({
    tenantId, workerSlug, title, description: description || null,
    dueAtMs, dueAt: admin.firestore.Timestamp.fromMillis(dueAtMs),
    status: "open",
    currentBlocker: null,
    evidence: null,
    createdBy, createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await appendEvent(ref.id, "created", { toStatus: "open", actor: createdBy, tenantId, workerSlug, title, dueAtMs });
  return { commitmentId: ref.id };
}

/**
 * Self-report progress. Can only move to "in_progress" or "blocked" — see
 * module header for why "done" isn't reachable from here.
 */
async function updateProgress({ commitmentId, status, note, actor }) {
  if (!SELF_REPORTABLE_STATUSES.has(status)) {
    throw new Error(`updateProgress: "${status}" is not self-reportable — allowed here: ${[...SELF_REPORTABLE_STATUSES].join(", ")}. Completion goes through requestVerification()/verifyAndComplete().`);
  }
  const ref = commitmentsColl().doc(commitmentId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`updateProgress: no commitment ${commitmentId}`);
  const fromStatus = snap.data().status;
  if (fromStatus === "done" || fromStatus === "expired") {
    throw new Error(`updateProgress: commitment ${commitmentId} is already terminal (${fromStatus}) — cannot update`);
  }
  await ref.set({
    status,
    currentBlocker: status === "blocked" ? (note || "unspecified") : null,
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  await appendEvent(commitmentId, "status_changed", { fromStatus, toStatus: status, note: note || null, actor });
  return { ok: true, fromStatus, toStatus: status };
}

/**
 * Report progress is "done" from the worker's own point of view — this
 * does NOT close the commitment. It moves to pending_verification with
 * proposed evidence attached, awaiting a separate verifyAndComplete() call.
 * evidence.type is a fixed enum, not free text, so a future automated
 * verifier has something structured to check rather than parsing prose.
 */
const EVIDENCE_TYPES = ["firestore_doc", "canary_pass", "deploy_confirmation", "external_url", "manual_note"];
async function requestVerification({ commitmentId, actor, evidenceType, evidenceRef, evidenceNote }) {
  if (!EVIDENCE_TYPES.includes(evidenceType)) {
    throw new Error(`requestVerification: evidenceType must be one of ${EVIDENCE_TYPES.join(", ")}, got "${evidenceType}"`);
  }
  const ref = commitmentsColl().doc(commitmentId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`requestVerification: no commitment ${commitmentId}`);
  const fromStatus = snap.data().status;
  if (fromStatus === "done" || fromStatus === "expired") {
    throw new Error(`requestVerification: commitment ${commitmentId} is already terminal (${fromStatus})`);
  }
  const proposedEvidence = { type: evidenceType, ref: evidenceRef || null, note: evidenceNote || null };
  await ref.set({
    status: "pending_verification",
    proposedEvidence,
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  await appendEvent(commitmentId, "verification_requested", { fromStatus, toStatus: "pending_verification", actor, proposedEvidence });
  return { ok: true };
}

/**
 * The ONLY path to "done". `verifiedBy` must be either a real human uid
 * (checked by the caller — see the HTTP route, which enforces Sean-only
 * for now) or a recognized internal system-verifier id prefixed
 * "system:" (e.g. "system:devWorker", "system:taskCanary") for callers
 * INSIDE this codebase that have their own deterministic evidence check —
 * this function itself does not validate evidence content, it only
 * records who vouched for it and when. No caller outside this codebase
 * can pass a "system:" verifiedBy — the HTTP route never accepts one.
 */
async function verifyAndComplete({ commitmentId, verifiedBy, evidence }) {
  if (!verifiedBy) throw new Error("verifyAndComplete: verifiedBy is required — every completion has an accountable verifier");
  if (!evidence || !EVIDENCE_TYPES.includes(evidence.type)) {
    throw new Error(`verifyAndComplete: evidence.type must be one of ${EVIDENCE_TYPES.join(", ")}`);
  }
  const ref = commitmentsColl().doc(commitmentId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`verifyAndComplete: no commitment ${commitmentId}`);
  const data = snap.data();
  if (data.status === "done") return { ok: true, alreadyDone: true };
  if (data.status === "expired") throw new Error(`verifyAndComplete: commitment ${commitmentId} already expired — cannot retroactively complete`);

  const nowMs = Date.now();
  const onTime = nowMs <= data.dueAtMs;
  await ref.set({
    status: "done",
    evidence: { ...evidence, verifiedBy, verifiedAtMs: nowMs },
    completedOnTime: onTime,
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  await appendEvent(commitmentId, "verified", { fromStatus: data.status, toStatus: "done", actor: verifiedBy, evidence, onTime });
  return { ok: true, onTime };
}

/** Scheduled sweep: anything overdue and not done/expired → expired. Missed commitments stay visible, not silently dropped. */
async function expireOverdueCommitments() {
  const nowMs = Date.now();
  const snap = await commitmentsColl()
    .where("status", "in", ["open", "in_progress", "blocked", "pending_verification"])
    .where("dueAtMs", "<", nowMs)
    .get();
  let expired = 0;
  for (const doc of snap.docs) {
    await doc.ref.set({ status: "expired", lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    await appendEvent(doc.id, "expired", { fromStatus: doc.data().status, toStatus: "expired", actor: "system:expirySweep" });
    expired++;
  }
  return { expired };
}

/**
 * Track record for a worker — the input the future earned-permission-
 * levels build (piece 4) reads from. Deliberately simple, deterministic
 * counts, no LLM judgment: done-on-time / done-late / expired / open, and
 * a self-report-vs-verified ratio (how often a worker's own "I think I'm
 * done" claim held up vs needed correction before verification — not
 * tracked yet in v1 since verifyAndComplete doesn't reject evidence, only
 * records it; a rejection path is a natural v2 addition once this has
 * real usage to design against).
 */
async function getWorkerTrackRecord(workerSlug, tenantId, opts = {}) {
  requireTenantId(tenantId);
  const limit = opts.limit || 200;
  const snap = await commitmentsColl()
    .where("tenantId", "==", tenantId)
    .where("workerSlug", "==", workerSlug)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  const counts = { total: 0, done_on_time: 0, done_late: 0, expired: 0, open: 0, in_progress: 0, blocked: 0, pending_verification: 0 };
  snap.forEach((doc) => {
    const d = doc.data();
    counts.total++;
    if (d.status === "done") counts[d.completedOnTime ? "done_on_time" : "done_late"]++;
    else if (counts[d.status] !== undefined) counts[d.status]++;
  });
  const closedCount = counts.done_on_time + counts.done_late + counts.expired;
  const reliabilityRate = closedCount > 0 ? (counts.done_on_time + counts.done_late) / closedCount : null;
  return { workerSlug, tenantId, ...counts, reliabilityRate };
}

module.exports = {
  STATUSES, SELF_REPORTABLE_STATUSES, EVIDENCE_TYPES, SEAN_UID,
  createCommitment, updateProgress, requestVerification, verifyAndComplete,
  expireOverdueCommitments, getWorkerTrackRecord,
};
