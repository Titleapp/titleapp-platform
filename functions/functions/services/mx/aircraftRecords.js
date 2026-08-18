"use strict";

/**
 * aircraftRecords.js — route handlers for real per-tail aircraft/MEL records.
 *
 * MX Tracker's prior "data" was a hardcoded fleet (N701AA/N704AA/N705AA with
 * fixed hours and a fixed open MEL item) baked into index.js's
 * DEMO_WORKER_FALLBACKS systemPrompt — the same TTSN/TSMOH numbers on every
 * session, for every user, forever. This is the real replacement.
 *
 * Scoped by tenantId when the caller is inside a tenant workspace (a charter
 * operator's fleet is shared across its pilots/dispatchers/mechanics — it
 * is not any one person's private record), falling back to userId for the
 * owner-operator / personal-vault case where there is no tenant. This
 * mirrors how the rest of the platform already distinguishes tenant-scoped
 * from personal data (see getCtx in index.js).
 *
 * Firestore:
 *   aircraftRecords/{scopeId}/aircraft/{tailNumber}
 *   aircraftRecords/{scopeId}/aircraft/{tailNumber}/squawks/{id}
 */

const admin = require("firebase-admin");
const { computeAirworthiness } = require("./airworthinessTracker");

function getDb() {
  return admin.firestore();
}

function resolveScopeId({ userId, tenantId }) {
  return tenantId || userId;
}

function aircraftRef(db, scopeId, tailNumber) {
  return db.collection("aircraftRecords").doc(scopeId).collection("aircraft").doc(String(tailNumber).toUpperCase());
}

// ============================================================
// 1. upsertAircraft — create or update the base aircraft record
// ============================================================
async function handleUpsertAircraft(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.tailNumber) return res.status(400).json({ ok: false, error: "tailNumber required" });

  const scopeId = resolveScopeId(ctx);
  const ref = aircraftRef(db, scopeId, body.tailNumber);
  const doc = {
    tailNumber: String(body.tailNumber).toUpperCase(),
    type: String(body.type || "").slice(0, 100),
    serialNumber: String(body.serialNumber || "").slice(0, 50),
    totalTimeHours: body.totalTimeHours != null ? Number(body.totalTimeHours) : null,
    engines: Array.isArray(body.engines) ? body.engines.slice(0, 4).map(e => ({
      position: String(e?.position || "").slice(0, 20),
      timeSinceOverhaulHours: Number(e?.timeSinceOverhaulHours) || 0,
      tboHours: Number(e?.tboHours) || 0,
    })) : [],
    nextInspection: body.nextInspection ? {
      type: String(body.nextInspection.type || "").slice(0, 50),
      dueDate: body.nextInspection.dueDate || null,
      dueAtHours: body.nextInspection.dueAtHours != null ? Number(body.nextInspection.dueAtHours) : null,
    } : null,
    adCompliance: Array.isArray(body.adCompliance) ? body.adCompliance.slice(0, 100).map(ad => ({
      ad: String(ad?.ad || "").slice(0, 50),
      compliantAsOf: ad?.compliantAsOf || null,
      nextDue: ad?.nextDue || null,
    })) : [],
    scopeId,
    tenantId: ctx.tenantId || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await ref.set(doc, { merge: true });
  return res.json({ ok: true, tailNumber: doc.tailNumber });
}

// ============================================================
// 2. addSquawk — log a discrepancy (append-only per AV-M-HS rules)
// ============================================================
async function handleAddSquawk(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.tailNumber) return res.status(400).json({ ok: false, error: "tailNumber required" });
  if (!body.description) return res.status(400).json({ ok: false, error: "description required" });

  const scopeId = resolveScopeId(ctx);
  const doc = {
    description: String(body.description).slice(0, 1000),
    category: body.category ? String(body.category).toUpperCase().slice(0, 1) : null,
    status: "open",
    openedAt: body.openedAt || new Date().toISOString(),
    workOrderNumber: String(body.workOrderNumber || "").slice(0, 50),
    reportedBy: String(body.reportedBy || "").slice(0, 200),
    userId: ctx.userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = aircraftRef(db, scopeId, body.tailNumber).collection("squawks").doc();
  await ref.set(doc);

  return res.json({ ok: true, squawkId: ref.id });
}

// ============================================================
// 3. updateSquawkStatus — defer (with MEL category) or close
// ============================================================
async function handleUpdateSquawkStatus(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.tailNumber || !body.squawkId || !body.status) {
    return res.status(400).json({ ok: false, error: "tailNumber, squawkId, and status required" });
  }
  if (!["deferred", "closed"].includes(body.status)) {
    return res.status(400).json({ ok: false, error: "status must be 'deferred' or 'closed'" });
  }
  if (body.status === "deferred" && !body.category) {
    return res.status(400).json({ ok: false, error: "category required to defer (MEL Category A/B/C/D)" });
  }

  const scopeId = resolveScopeId(ctx);
  const ref = aircraftRef(db, scopeId, body.tailNumber).collection("squawks").doc(body.squawkId);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ ok: false, error: "squawk not found" });

  const update = { status: body.status, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  if (body.status === "deferred") {
    update.category = String(body.category).toUpperCase().slice(0, 1);
    update.deferredBy = String(body.deferredBy || "").slice(0, 200);
  }
  if (body.status === "closed") {
    update.closedBy = String(body.closedBy || "").slice(0, 200);
    update.closedNote = String(body.closedNote || "").slice(0, 1000);
  }

  await ref.update(update);
  return res.json({ ok: true });
}

// ============================================================
// 4. getAirworthiness — computed status for one tail
// ============================================================
async function handleGetAirworthiness(req, res, ctx) {
  const db = getDb();
  const tailNumber = req.query?.tailNumber;
  if (!tailNumber) return res.status(400).json({ ok: false, error: "tailNumber required" });

  const scopeId = resolveScopeId(ctx);
  const ref = aircraftRef(db, scopeId, tailNumber);
  const [aircraftSnap, squawksSnap] = await Promise.all([
    ref.get(),
    ref.collection("squawks").get(),
  ]);

  const aircraft = aircraftSnap.exists ? aircraftSnap.data() : null;
  const squawks = squawksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const airworthiness = computeAirworthiness(aircraft, squawks);

  return res.json({ ok: true, airworthiness });
}

// ============================================================
// 5. listAircraft — every tail on file for this scope, with computed status
// ============================================================
async function handleListAircraft(req, res, ctx) {
  const db = getDb();
  const scopeId = resolveScopeId(ctx);
  const fleetSnap = await db.collection("aircraftRecords").doc(scopeId).collection("aircraft").get();

  const fleet = await Promise.all(fleetSnap.docs.map(async (d) => {
    const aircraft = d.data();
    const squawksSnap = await d.ref.collection("squawks").get();
    const squawks = squawksSnap.docs.map(s => ({ id: s.id, ...s.data() }));
    return computeAirworthiness(aircraft, squawks);
  }));

  return res.json({ ok: true, fleet });
}

// ============================================================
// 6. uploadSquawksCsv — bulk-import a squawk log export (FVO/RAMCO/Protean)
// ============================================================
async function handleUploadSquawksCsv(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.fileData) return res.status(400).json({ ok: false, error: "fileData required (base64 CSV)" });

  const { parseMxSquawksCsv } = require("./mxImportParser");
  const csvBuffer = Buffer.from(body.fileData, "base64");
  const squawks = parseMxSquawksCsv(csvBuffer);
  if (!squawks.length) return res.json({ ok: true, imported: 0, message: "No valid squawk rows found in CSV" });

  const scopeId = resolveScopeId(ctx);
  const batch = db.batch();
  for (const sq of squawks) {
    const ref = aircraftRef(db, scopeId, sq.tailNumber).collection("squawks").doc();
    batch.set(ref, { ...sq, userId: ctx.userId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  await batch.commit();

  return res.json({ ok: true, imported: squawks.length });
}

// ============================================================
// 7. uploadAircraftRosterCsv — bulk-import fleet roster export
// ============================================================
async function handleUploadAircraftRosterCsv(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.fileData) return res.status(400).json({ ok: false, error: "fileData required (base64 CSV)" });

  const { parseMxAircraftRosterCsv } = require("./mxImportParser");
  const csvBuffer = Buffer.from(body.fileData, "base64");
  const aircraft = parseMxAircraftRosterCsv(csvBuffer);
  if (!aircraft.length) return res.json({ ok: true, imported: 0, message: "No valid aircraft rows found in CSV" });

  const scopeId = resolveScopeId(ctx);
  const batch = db.batch();
  for (const ac of aircraft) {
    const { _importSource, ...doc } = ac;
    const ref = aircraftRef(db, scopeId, ac.tailNumber);
    batch.set(ref, { ...doc, scopeId, tenantId: ctx.tenantId || null, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }
  await batch.commit();

  return res.json({ ok: true, imported: aircraft.length });
}

module.exports = {
  resolveScopeId,
  handleUpsertAircraft,
  handleAddSquawk,
  handleUpdateSquawkStatus,
  handleGetAirworthiness,
  handleListAircraft,
  handleUploadSquawksCsv,
  handleUploadAircraftRosterCsv,
};
