"use strict";

/**
 * creatorWorkers.js — CODEX 93: the layer-2 creator-storefront worker
 * lifecycle. Submit, edit (re-validates, per round 2's fix), and suspend
 * (broad discretionary right, per #8's resolution — "restaurant rule," no
 * violation rubric required).
 *
 * Not tenant-scoped like the rest of the platform — a creator worker
 * belongs to the creator (a user), not a tenant, so queries filter by
 * creatorId (== the caller's own userId), the same shape as the
 * `memberships` userId-only exception CLAUDE.md already documents, not a
 * new pattern.
 *
 * NOT resolved by this file: who at SOCIII is authorized to call
 * handleSuspendCreatorWorker. There's no platform-staff/admin role concept
 * anywhere in this codebase to check against (confirmed by grep before
 * writing this). Real access control for that route is unbuilt — flagging
 * this loudly rather than faking a check that doesn't mean anything.
 */

const admin = require("firebase-admin");
const { validateCreatorWorker } = require("./workerGate");

function getDb() { return admin.firestore(); }
function workersRef(db) { return db.collection("creatorWorkers"); }

async function handleSubmitCreatorWorker(req, res, { userId }) {
  const { capabilities, systemPrompt, displayName, creatorCredentials } = req.body || {};
  if (!systemPrompt || !String(systemPrompt).trim()) {
    return res.status(400).json({ ok: false, error: "systemPrompt is required" });
  }
  if (!displayName || !creatorCredentials) {
    // #4, resolved 2026-09-17: the creator's identity/credentials must be
    // immediately viewable to the subscriber — enforced here as a hard
    // requirement on submission, not an optional field.
    return res.status(400).json({ ok: false, error: "displayName and creatorCredentials are required — must be immediately viewable to subscribers" });
  }

  const gate = validateCreatorWorker({ capabilities, systemPrompt });
  if (!gate.approved) {
    return res.status(400).json({
      ok: false,
      error: "Worker rejected — capability outside the creator.* allowlist",
      violations: gate.tierA.violations,
    });
  }

  const db = getDb();
  const docRef = workersRef(db).doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  await docRef.set({
    creatorId: userId,
    capabilities: capabilities || [],
    systemPrompt,
    displayName,
    creatorCredentials,
    status: "active",
    contentFlagged: gate.tierB.contentFlagged,
    matchedCategories: gate.tierB.matchedCategories,
    requiresDisclosure: gate.requiresDisclosure,
    requiresCreatorIdentityDisplay: gate.requiresCreatorIdentityDisplay,
    createdAt: now,
    lastValidatedAt: now,
  });

  return res.json({ ok: true, workerId: docRef.id, ...gate });
}

async function handleUpdateCreatorWorker(req, res, { userId }) {
  const { workerId, capabilities, systemPrompt, displayName, creatorCredentials } = req.body || {};
  if (!workerId) return res.status(400).json({ ok: false, error: "workerId is required" });

  const db = getDb();
  const docRef = workersRef(db).doc(workerId);
  const snap = await docRef.get();
  if (!snap.exists) return res.status(404).json({ ok: false, error: "Worker not found" });
  const existing = snap.data();
  if (existing.creatorId !== userId) return res.status(403).json({ ok: false, error: "Not your worker" });
  if (existing.status === "suspended") return res.status(403).json({ ok: false, error: "Worker is suspended" });

  const nextCapabilities = capabilities !== undefined ? capabilities : existing.capabilities;
  const nextSystemPrompt = systemPrompt !== undefined ? systemPrompt : existing.systemPrompt;

  // Round 2's fix: re-run the FULL gate on every edit, not just at
  // submission — a prompt change with no capability change would otherwise
  // never be re-checked at all.
  const gate = validateCreatorWorker({ capabilities: nextCapabilities, systemPrompt: nextSystemPrompt });
  if (!gate.approved) {
    return res.status(400).json({
      ok: false,
      error: "Edit rejected — capability outside the creator.* allowlist",
      violations: gate.tierA.violations,
    });
  }

  await docRef.update({
    capabilities: nextCapabilities,
    systemPrompt: nextSystemPrompt,
    ...(displayName !== undefined ? { displayName } : {}),
    ...(creatorCredentials !== undefined ? { creatorCredentials } : {}),
    contentFlagged: gate.tierB.contentFlagged,
    matchedCategories: gate.tierB.matchedCategories,
    requiresDisclosure: gate.requiresDisclosure,
    requiresCreatorIdentityDisplay: gate.requiresCreatorIdentityDisplay,
    lastValidatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return res.json({ ok: true, workerId, ...gate });
}

async function handleSuspendCreatorWorker(req, res, { userId }) {
  // See file header: no real "who can call this" check exists yet. This
  // currently only allows a creator to suspend their OWN worker
  // (self-service pause), NOT SOCIII exercising its discretionary #8 right
  // against someone else's — that half is unbuilt pending a real
  // platform-staff authorization model.
  const { workerId, reason } = req.body || {};
  if (!workerId) return res.status(400).json({ ok: false, error: "workerId is required" });

  const db = getDb();
  const docRef = workersRef(db).doc(workerId);
  const snap = await docRef.get();
  if (!snap.exists) return res.status(404).json({ ok: false, error: "Worker not found" });
  if (snap.data().creatorId !== userId) {
    return res.status(403).json({ ok: false, error: "Not your worker — SOCIII-initiated suspension is not yet implemented, see file header" });
  }

  await docRef.update({
    status: "suspended",
    suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
    suspendedReason: reason || null,
  });
  return res.json({ ok: true, workerId, status: "suspended" });
}

async function handleGetCreatorWorkerStatus(req, res) {
  const workerId = req.query && req.query.workerId;
  if (!workerId) return res.status(400).json({ ok: false, error: "workerId is required" });

  const db = getDb();
  const snap = await workersRef(db).doc(workerId).get();
  if (!snap.exists) return res.status(404).json({ ok: false, error: "Worker not found" });
  const d = snap.data();
  return res.json({
    ok: true,
    workerId,
    status: d.status,
    displayName: d.displayName,
    creatorCredentials: d.creatorCredentials,
    requiresDisclosure: d.requiresDisclosure,
    requiresCreatorIdentityDisplay: d.requiresCreatorIdentityDisplay,
  });
}

module.exports = {
  handleSubmitCreatorWorker,
  handleUpdateCreatorWorker,
  handleSuspendCreatorWorker,
  handleGetCreatorWorkerStatus,
};
