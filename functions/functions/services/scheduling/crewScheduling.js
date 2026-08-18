"use strict";

/**
 * crewScheduling.js — real crew scheduling for aviation: roster assignments,
 * shift swap/release/pickup within OT rules, and bid-window submission.
 *
 * Sean, 2026-08-17: "Aviation is unique in this way ... there is a lot of
 * shift and trip swapping — especially for pilots and MX — much less so
 * for Dispatch." This worker (av-crew-scheduling) existed only as a bare
 * 3-tab stub with no system prompt — the real crew-legality ruleset
 * (av_032_crew_scheduling_v0.json) existed on disk but nothing implemented
 * the actual scheduling object model it assumes.
 *
 * Tenant-scoped (a charter operator's roster is shared across dispatchers
 * who schedule and crew who bid/swap into it), same scopeId resolution as
 * services/mx/aircraftRecords.js and services/dispatch/tripRequests.js.
 *
 * Firestore:
 *   crewSchedule/{scopeId}/assignments/{id}
 *   crewSchedule/{scopeId}/swapRequests/{id}
 *   crewSchedule/{scopeId}/otPolicy  (single doc, optional per-tenant override)
 *   crewSchedule/{scopeId}/bidWindows/{id}
 *   crewSchedule/{scopeId}/bidWindows/{id}/bids/{crewId}
 */

const admin = require("firebase-admin");
const { checkOtImpact } = require("./otRules");

function getDb() {
  return admin.firestore();
}

function resolveScopeId({ userId, tenantId }) {
  return tenantId || userId;
}

const VALID_ROLES = ["pilot", "mx", "dispatcher"];
const VALID_SWAP_TYPES = ["release", "pickup", "swap"];

// ============================================================
// 1. createAssignment — publish a roster assignment
// ============================================================
async function handleCreateAssignment(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.crewId || !body.role || !body.dutyStartZulu || !body.dutyEndZulu) {
    return res.status(400).json({ ok: false, error: "crewId, role, dutyStartZulu, dutyEndZulu required" });
  }
  if (!VALID_ROLES.includes(body.role)) {
    return res.status(400).json({ ok: false, error: `role must be one of: ${VALID_ROLES.join(", ")}` });
  }

  const scopeId = resolveScopeId(ctx);
  const doc = {
    crewId: String(body.crewId).slice(0, 200),
    crewName: String(body.crewName || "").slice(0, 200),
    role: body.role,
    tailNumber: String(body.tailNumber || "").toUpperCase().slice(0, 10),
    tripId: body.tripId ? String(body.tripId).slice(0, 200) : null,
    dutyStartZulu: body.dutyStartZulu,
    dutyEndZulu: body.dutyEndZulu,
    status: "scheduled",
    source: "roster",
    scopeId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = db.collection("crewSchedule").doc(scopeId).collection("assignments").doc();
  await ref.set(doc);
  return res.json({ ok: true, assignmentId: ref.id });
}

// ============================================================
// 2. listSchedule — assignments for a scope, optionally filtered
// ============================================================
async function handleListSchedule(req, res, ctx) {
  const db = getDb();
  const scopeId = resolveScopeId(ctx);
  let q = db.collection("crewSchedule").doc(scopeId).collection("assignments");
  if (req.query?.role) q = q.where("role", "==", req.query.role);
  if (req.query?.crewId) q = q.where("crewId", "==", req.query.crewId);
  const snap = await q.orderBy("dutyStartZulu", "desc").limit(200).get();
  const assignments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return res.json({ ok: true, assignments });
}

// ============================================================
// 3. requestSwap — release / pickup / swap, OT-checked before it's live
// ============================================================
async function handleRequestSwap(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.assignmentId || !body.type) {
    return res.status(400).json({ ok: false, error: "assignmentId and type required" });
  }
  if (!VALID_SWAP_TYPES.includes(body.type)) {
    return res.status(400).json({ ok: false, error: `type must be one of: ${VALID_SWAP_TYPES.join(", ")}` });
  }
  if (body.type === "swap" && !body.targetCrewId) {
    return res.status(400).json({ ok: false, error: "targetCrewId required for a swap" });
  }

  const scopeId = resolveScopeId(ctx);
  const assignmentRef = db.collection("crewSchedule").doc(scopeId).collection("assignments").doc(body.assignmentId);
  const assignmentSnap = await assignmentRef.get();
  if (!assignmentSnap.exists) return res.status(404).json({ ok: false, error: "assignment not found" });
  const assignment = assignmentSnap.data();

  // Whoever is picking up or swapping INTO the shift is who gets OT-checked —
  // a release has no incoming crew member to check yet (that happens when
  // someone picks it up).
  const otSubjectCrewId = body.type === "pickup" || body.type === "swap" ? (body.pickingUpCrewId || body.targetCrewId) : null;
  let otCheck = null;
  if (otSubjectCrewId) {
    const otPolicySnap = await db.collection("crewSchedule").doc(scopeId).collection("otPolicy").doc("default").get();
    const tenantOtRules = otPolicySnap.exists ? otPolicySnap.data() : null;
    const otherAssignmentsSnap = await db.collection("crewSchedule").doc(scopeId).collection("assignments")
      .where("crewId", "==", otSubjectCrewId).get();
    const otherAssignments = otherAssignmentsSnap.docs.map(d => d.data());
    otCheck = checkOtImpact(assignment.role, otSubjectCrewId, assignment, otherAssignments, tenantOtRules);
  }

  const doc = {
    assignmentId: body.assignmentId,
    role: assignment.role,
    requestingCrewId: String(body.requestingCrewId || ctx.userId).slice(0, 200),
    type: body.type,
    targetCrewId: body.targetCrewId ? String(body.targetCrewId).slice(0, 200) : null,
    pickingUpCrewId: otSubjectCrewId,
    otCheck,
    status: "open",
    scopeId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    resolvedAt: null,
  };

  const ref = db.collection("crewSchedule").doc(scopeId).collection("swapRequests").doc();
  await ref.set(doc);
  return res.json({ ok: true, swapRequestId: ref.id, otCheck });
}

// ============================================================
// 4. respondToSwap — approve / deny; approval actually moves the assignment
// ============================================================
async function handleRespondToSwap(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.swapRequestId || !body.action) {
    return res.status(400).json({ ok: false, error: "swapRequestId and action required" });
  }
  if (!["approve", "deny"].includes(body.action)) {
    return res.status(400).json({ ok: false, error: "action must be 'approve' or 'deny'" });
  }

  const scopeId = resolveScopeId(ctx);
  const swapRef = db.collection("crewSchedule").doc(scopeId).collection("swapRequests").doc(body.swapRequestId);
  const swapSnap = await swapRef.get();
  if (!swapSnap.exists) return res.status(404).json({ ok: false, error: "swap request not found" });
  const swap = swapSnap.data();
  if (swap.status !== "open") return res.status(400).json({ ok: false, error: `swap request already ${swap.status}` });

  if (body.action === "deny") {
    await swapRef.update({ status: "denied", resolvedAt: admin.firestore.FieldValue.serverTimestamp(), resolvedBy: ctx.userId });
    return res.json({ ok: true, status: "denied" });
  }

  // Approved — if OT check flagged approval required and the approver didn't
  // explicitly override, block rather than silently wave it through.
  if (swap.otCheck && swap.otCheck.approvalRequired && !body.overrideOtApproval) {
    return res.status(409).json({
      ok: false,
      error: "This swap projects overtime above the approval threshold. Pass overrideOtApproval:true to approve anyway.",
      otCheck: swap.otCheck,
    });
  }

  const assignmentRef = db.collection("crewSchedule").doc(scopeId).collection("assignments").doc(swap.assignmentId);
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (swap.type === "release") {
    batch.update(assignmentRef, { status: "released", updatedAt: now });
  } else if (swap.type === "pickup") {
    batch.update(assignmentRef, { crewId: swap.pickingUpCrewId, status: "scheduled", source: "pickup", updatedAt: now });
  } else if (swap.type === "swap") {
    batch.update(assignmentRef, { crewId: swap.targetCrewId, status: "scheduled", source: "swap", updatedAt: now });
  }
  batch.update(swapRef, { status: "approved", resolvedAt: now, resolvedBy: ctx.userId });
  await batch.commit();

  return res.json({ ok: true, status: "approved" });
}

// ============================================================
// 5. getOtSummary — this week's hours + cap for one crew member
// ============================================================
async function handleGetOtSummary(req, res, ctx) {
  const db = getDb();
  const crewId = req.query?.crewId;
  const role = req.query?.role;
  if (!crewId || !role) return res.status(400).json({ ok: false, error: "crewId and role required" });

  const scopeId = resolveScopeId(ctx);
  const [otPolicySnap, assignmentsSnap] = await Promise.all([
    db.collection("crewSchedule").doc(scopeId).collection("otPolicy").doc("default").get(),
    db.collection("crewSchedule").doc(scopeId).collection("assignments").where("crewId", "==", crewId).get(),
  ]);
  const tenantOtRules = otPolicySnap.exists ? otPolicySnap.data() : null;
  const assignments = assignmentsSnap.docs.map(d => d.data());
  const now = new Date().toISOString();
  const summary = checkOtImpact(role, crewId, { dutyStartZulu: now, dutyEndZulu: now }, assignments, tenantOtRules);
  return res.json({ ok: true, summary });
}

// ============================================================
// 6. bid windows — minimal v1: open a window, submit preferences
// ============================================================
async function handleCreateBidWindow(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.periodLabel || !body.opensAt || !body.closesAt) {
    return res.status(400).json({ ok: false, error: "periodLabel, opensAt, closesAt required" });
  }
  const scopeId = resolveScopeId(ctx);
  const ref = db.collection("crewSchedule").doc(scopeId).collection("bidWindows").doc();
  await ref.set({
    periodLabel: String(body.periodLabel).slice(0, 100),
    opensAt: body.opensAt,
    closesAt: body.closesAt,
    status: "open",
    scopeId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return res.json({ ok: true, bidWindowId: ref.id });
}

async function handleSubmitBid(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.bidWindowId || !body.crewId || !Array.isArray(body.preferences)) {
    return res.status(400).json({ ok: false, error: "bidWindowId, crewId, and preferences[] required" });
  }
  const scopeId = resolveScopeId(ctx);
  const windowSnap = await db.collection("crewSchedule").doc(scopeId).collection("bidWindows").doc(body.bidWindowId).get();
  if (!windowSnap.exists) return res.status(404).json({ ok: false, error: "bid window not found" });
  if (windowSnap.data().status !== "open") return res.status(400).json({ ok: false, error: "bid window is not open" });

  const ref = db.collection("crewSchedule").doc(scopeId).collection("bidWindows").doc(body.bidWindowId)
    .collection("bids").doc(String(body.crewId));
  await ref.set({
    crewId: String(body.crewId).slice(0, 200),
    preferences: body.preferences.slice(0, 20).map(p => String(p).slice(0, 300)),
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return res.json({ ok: true });
}

async function handleListBids(req, res, ctx) {
  const db = getDb();
  const bidWindowId = req.query?.bidWindowId;
  if (!bidWindowId) return res.status(400).json({ ok: false, error: "bidWindowId required" });
  const scopeId = resolveScopeId(ctx);
  const snap = await db.collection("crewSchedule").doc(scopeId).collection("bidWindows").doc(bidWindowId).collection("bids").get();
  const bids = snap.docs.map(d => ({ crewId: d.id, ...d.data() }));
  return res.json({ ok: true, bids });
}

module.exports = {
  resolveScopeId,
  handleCreateAssignment,
  handleListSchedule,
  handleRequestSwap,
  handleRespondToSwap,
  handleGetOtSummary,
  handleCreateBidWindow,
  handleSubmitBid,
  handleListBids,
};
