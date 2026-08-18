"use strict";

/**
 * tripRequests.js — real trip-request object model for aviation Dispatch.
 *
 * Dispatch's job is generating the actual flight, not just running a
 * go/no-go check on one that's assumed to already exist (Sean, 2026-08).
 * This is that missing object: who wants this flight, where it's going,
 * who's on it, how they get to/from the airport, and who's flying it —
 * backed by a real per-pilot Firestore collection instead of chat text
 * that evaporates at the end of the conversation.
 *
 * Firestore: dispatchTripRequests/{scopeId}/requests/{id}
 *
 * scopeId is tenantId when the caller is in a tenant workspace (a charter
 * operator's dispatch desk is shared across its dispatchers/pilots — it is
 * not any one person's private queue), falling back to userId for the
 * owner-operator / personal-vault case. Same resolution as
 * services/mx/aircraftRecords.js.
 */

const admin = require("firebase-admin");

function getDb() {
  return admin.firestore();
}

function resolveScopeId({ userId, tenantId }) {
  return tenantId || userId;
}

const VALID_STATUSES = ["draft", "released", "cancelled"];

function sanitizePax(paxManifest) {
  if (!Array.isArray(paxManifest)) return [];
  return paxManifest.slice(0, 50).map(p => ({
    name: String(p?.name || "").slice(0, 200),
    weightLbs: Number(p?.weightLbs) || 0,
    notes: String(p?.notes || "").slice(0, 500),
  }));
}

function sanitizeCrew(assignedCrew) {
  if (!Array.isArray(assignedCrew)) return [];
  return assignedCrew.slice(0, 10).map(c => ({
    name: String(c?.name || "").slice(0, 200),
    role: String(c?.role || "PIC").slice(0, 50),
    uid: c?.uid ? String(c.uid).slice(0, 200) : null,
  }));
}

// ============================================================
// 1. createTripRequest — the actual flight-generation step
// ============================================================
async function handleCreateTripRequest(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};

  if (!body.destination) {
    return res.status(400).json({ ok: false, error: "destination required" });
  }

  const scopeId = resolveScopeId(ctx);
  const doc = {
    client: String(body.client || "").slice(0, 200) || "Self (owner-operator)",
    tenantId: ctx.tenantId || null,
    departure: String(body.departure || "").toUpperCase().slice(0, 10),
    destination: String(body.destination).toUpperCase().slice(0, 10),
    alternate: String(body.alternate || "").toUpperCase().slice(0, 10),
    requestedDepartureZulu: body.requestedDepartureZulu || null,
    paxManifest: sanitizePax(body.paxManifest),
    groundTransport: {
      pickup: String(body.groundTransport?.pickup || "").slice(0, 500),
      dropoff: String(body.groundTransport?.dropoff || "").slice(0, 500),
      provider: String(body.groundTransport?.provider || "").slice(0, 200),
      notes: String(body.groundTransport?.notes || "").slice(0, 500),
    },
    assignedCrew: sanitizeCrew(body.assignedCrew),
    tailNumber: String(body.tailNumber || "").toUpperCase().slice(0, 10),
    status: "draft",
    createdByUid: ctx.userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = db.collection("dispatchTripRequests").doc(scopeId).collection("requests").doc();
  await ref.set(doc);

  return res.json({ ok: true, requestId: ref.id });
}

// ============================================================
// 2. listTripRequests — most recent first
// ============================================================
async function handleListTripRequests(req, res, ctx) {
  const db = getDb();
  const limit = Math.min(Number(req.query?.limit) || 25, 100);
  const scopeId = resolveScopeId(ctx);

  const snap = await db.collection("dispatchTripRequests").doc(scopeId)
    .collection("requests").orderBy("createdAt", "desc").limit(limit).get();

  const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return res.json({ ok: true, requests });
}

// ============================================================
// 3. getTripRequest
// ============================================================
async function handleGetTripRequest(req, res, ctx) {
  const db = getDb();
  const requestId = req.query?.id;
  if (!requestId) return res.status(400).json({ ok: false, error: "id required" });
  const scopeId = resolveScopeId(ctx);

  const snap = await db.collection("dispatchTripRequests").doc(scopeId)
    .collection("requests").doc(requestId).get();
  if (!snap.exists) return res.status(404).json({ ok: false, error: "not found" });

  return res.json({ ok: true, request: { id: snap.id, ...snap.data() } });
}

// ============================================================
// 4. updateTripRequestStatus — release or cancel
// ============================================================
async function handleUpdateTripRequestStatus(req, res, ctx) {
  const db = getDb();
  const { id, status } = req.body || {};
  if (!id || !status) return res.status(400).json({ ok: false, error: "id and status required" });
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ ok: false, error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  const scopeId = resolveScopeId(ctx);
  const ref = db.collection("dispatchTripRequests").doc(scopeId).collection("requests").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ ok: false, error: "not found" });

  await ref.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return res.json({ ok: true });
}

// ============================================================
// 5. uploadTripHistoryCsv — bulk-import trip history from the operator's
// existing dispatch/scheduling SaaS export
// ============================================================
async function handleUploadTripHistoryCsv(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.fileData) return res.status(400).json({ ok: false, error: "fileData required (base64 CSV)" });

  const { parseTripHistoryCsv } = require("./dispatchImportParser");
  const csvBuffer = Buffer.from(body.fileData, "base64");
  const trips = parseTripHistoryCsv(csvBuffer);
  if (!trips.length) return res.json({ ok: true, imported: 0, message: "No valid trip rows found in CSV" });

  const scopeId = resolveScopeId(ctx);
  const batch = db.batch();
  for (const trip of trips) {
    const { _importSource, ...doc } = trip;
    const ref = db.collection("dispatchTripRequests").doc(scopeId).collection("requests").doc();
    batch.set(ref, {
      ...doc, tenantId: ctx.tenantId || null, createdByUid: ctx.userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  return res.json({ ok: true, imported: trips.length });
}

module.exports = {
  resolveScopeId,
  handleCreateTripRequest,
  handleListTripRequests,
  handleGetTripRequest,
  handleUpdateTripRequestStatus,
  handleUploadTripHistoryCsv,
};
