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
const crypto = require("crypto");
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

function logbookRef(db, scopeId, tailNumber) {
  return aircraftRef(db, scopeId, tailNumber).collection("logbook");
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

  // Capability profile — feeds Dispatch's mission-to-aircraft matching
  // (services/dispatch/aircraftMatching.js). Optional; only added to `doc`
  // when the caller supplies it, so an upsert that omits capabilities
  // relies on Firestore's merge:true (below) to leave any previously-set
  // profile untouched rather than wiping it.
  if (body.capabilities && typeof body.capabilities === "object") {
    const cap = body.capabilities;
    doc.capabilities = {
      category: String(cap.category || "").slice(0, 60) || null,
      seats: cap.seats != null ? Number(cap.seats) : null,
      ifrCertified: cap.ifrCertified === true,
      cargoCapacityLbs: cap.cargoCapacityLbs != null ? Number(cap.cargoCapacityLbs) : null,
      missionCapabilities: Array.isArray(cap.missionCapabilities)
        ? cap.missionCapabilities.slice(0, 20).map(m => String(m).toLowerCase().slice(0, 40))
        : [],
    };
  }

  await ref.set(doc, { merge: true });
  return res.json({ ok: true, tailNumber: doc.tailNumber });
}

// ============================================================
// 2. addSquawk — log a discrepancy (append-only per AV-M-HS rules)
//
// addSquawkCore is the single real write path for a squawk, regardless of
// entry method (manual form, chat, or photo) — extracted so the chat tool
// in index.js can call the SAME validated path instead of writing its own
// raw doc to a different, disconnected collection (2026-09-05 consolidation
// — see index.js's file_squawk tool for the history of why this mattered:
// a squawk filed by voice/chat was invisible to computeAirworthiness()).
// ============================================================
async function addSquawkCore({ tailNumber, description, category, workOrderNumber, reportedBy, source, ctx }) {
  if (!tailNumber) { const e = new Error("tailNumber required"); e.status = 400; throw e; }
  if (!description) { const e = new Error("description required"); e.status = 400; throw e; }

  const db = getDb();
  const scopeId = resolveScopeId(ctx);
  const woNum = String(workOrderNumber || "").trim() || `WO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
  const doc = {
    description: String(description).slice(0, 1000),
    category: category ? String(category).toUpperCase().slice(0, 1) : null,
    status: "open",
    openedAt: new Date().toISOString(),
    workOrderNumber: woNum.slice(0, 50),
    reportedBy: String(reportedBy || "").slice(0, 200),
    userId: ctx.userId,
    source: source || "manual",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = aircraftRef(db, scopeId, tailNumber).collection("squawks").doc();
  await ref.set(doc);

  return { squawkId: ref.id, tailNumber: String(tailNumber).toUpperCase(), workOrderNumber: doc.workOrderNumber, description: doc.description };
}

async function handleAddSquawk(req, res, ctx) {
  const body = req.body || {};
  try {
    const result = await addSquawkCore({
      tailNumber: body.tailNumber, description: body.description, category: body.category,
      workOrderNumber: body.workOrderNumber, reportedBy: body.reportedBy, source: body.source, ctx,
    });
    return res.json({ ok: true, ...result });
  } catch (e) {
    return res.status(e.status || 500).json({ ok: false, error: e.message });
  }
}

// ============================================================
// 2b. listSquawks — full fleet squawk log (open + closed), across every
// tail on file for this scope. Single source of truth for the read-only
// "Squawks" tab — replaces the old, now-removed /v1/aviation:squawks
// route, which read a completely different, disconnected flat collection
// (tenants/{tenantId}/squawks) that computeAirworthiness() never saw.
// ============================================================
async function handleListSquawks(req, res, ctx) {
  const db = getDb();
  const scopeId = resolveScopeId(ctx);
  const statusFilter = req.query?.status ? String(req.query.status) : null;
  const fleetSnap = await db.collection("aircraftRecords").doc(scopeId).collection("aircraft").get();
  const { evaluateSquawk } = require("./airworthinessTracker");
  const now = new Date();

  const all = [];
  await Promise.all(fleetSnap.docs.map(async (d) => {
    const squawksSnap = await d.ref.collection("squawks").get();
    squawksSnap.docs.forEach(s => {
      const data = s.data();
      if (statusFilter && data.status !== statusFilter) return;
      // Deferred items get the same real MEL rectification-deadline
      // computation the "aircraft" tab's airworthiness view already uses
      // (airworthinessTracker.evaluateSquawk) — so the MEL tab (built from
      // this endpoint) shows the same computed days-remaining/expiry as
      // the source of truth, not a second, disconnected calculation.
      const evaluated = data.status === "deferred" ? evaluateSquawk(data, now) : null;
      all.push({
        id: s.id,
        tailNumber: d.id,
        description: data.description || "",
        pilotName: data.reportedBy || "",
        workOrderNumber: data.workOrderNumber || "",
        status: data.status || "open",
        category: data.category || null,
        melReference: data.melReference || null,
        restrictions: data.restrictions || null,
        reportedAt: data.openedAt || null,
        computedStatus: evaluated?.computedStatus || null,
        daysRemaining: evaluated?.daysRemaining ?? null,
        deadline: evaluated?.deadline || null,
      });
    });
  }));
  all.sort((a, b) => new Date(b.reportedAt || 0) - new Date(a.reportedAt || 0));

  return res.json({ ok: true, squawks: all.slice(0, 50) });
}

// ============================================================
// 2c. appendLogbookEntryCore / handleAddLogbookEntry / handleListLogbook —
// the real Aircraft Logbook ("CAN" — Sean's term for the aircraft's own
// canonical, legal logbook: airframe/engine/prop times, every maintenance
// action, every inspection, every AD compliance, signed by the A&P/IA who
// did the work). Genuinely new — the "aircraft-logbook" tab was 100%
// hardcoded fixture rows before this (aviationCanvasData.js AV_CANVAS
// "av-mx-001".tabs["aircraft-logbook"]) with a chat prompt ("tell Alex to
// log a maintenance entry") that wrote nowhere real.
//
// Design decision (verified against the real write paths above before
// picking this, per Sean's "don't guess" instruction): squawks are mutated
// in place (handleUpdateSquawkStatus does ref.update(), not append) and
// adCompliance/maintenanceItems are current-state fields, not event logs —
// so composing the logbook purely at read-time from those collections
// would either require re-deriving history from mutable docs (fragile) or
// would silently lose the actual point-in-time record a legal logbook
// needs. Instead: aircraftRecords/{scopeId}/aircraft/{tail}/logbook/{id} is
// a genuinely new, separate, append-only subcollection (same
// scopeId/tailNumber scoping discipline as squawks above) that the real
// event handlers below (updateSquawkStatus, addWarranty,
// completeMaintenanceItem, recordAdCompliance) append to AT THE MOMENT the
// real event happens — one extra write per real action, never a second
// mutable copy that could drift, and every entry is immutable from the
// moment it's written (no update/delete path exists for this
// subcollection, by design).
// ============================================================
async function appendLogbookEntryCore({ tailNumber, ctx, recordType, description, category, signedBy, signedByCert, ttsn, source, refId }) {
  if (!tailNumber) { const e = new Error("tailNumber required"); e.status = 400; throw e; }
  if (!description) { const e = new Error("description required"); e.status = 400; throw e; }

  const db = getDb();
  const scopeId = resolveScopeId(ctx);

  // Best-effort TTSN snapshot from the aircraft's current record when the
  // caller didn't supply one explicitly — a legal logbook entry should carry
  // the airframe time at the moment of the entry whenever it's known.
  let resolvedTtsn = ttsn != null && ttsn !== "" ? Number(ttsn) : null;
  if (resolvedTtsn == null) {
    const aircraftSnap = await aircraftRef(db, scopeId, tailNumber).get();
    resolvedTtsn = aircraftSnap.exists ? (aircraftSnap.data().totalTimeHours ?? null) : null;
  }

  const doc = {
    tailNumber: String(tailNumber).toUpperCase(),
    recordType: String(recordType || "manual").slice(0, 50),
    description: String(description).slice(0, 1000),
    category: category ? String(category).slice(0, 50) : null,
    ttsn: resolvedTtsn,
    signedBy: String(signedBy || "").slice(0, 200),
    signedByCert: signedByCert ? String(signedByCert).slice(0, 50) : null,
    source: source || "manual",
    refId: refId != null ? String(refId).slice(0, 100) : null,
    userId: ctx.userId || null,
    scopeId,
    tenantId: ctx.tenantId || null,
    enteredAt: new Date().toISOString(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = logbookRef(db, scopeId, tailNumber).doc();
  await ref.set(doc); // append-only — this subcollection has no update/delete path
  return { entryId: ref.id, ...doc };
}

async function handleAddLogbookEntry(req, res, ctx) {
  const body = req.body || {};
  if (!body.tailNumber) return res.status(400).json({ ok: false, error: "tailNumber required" });
  if (!body.description) return res.status(400).json({ ok: false, error: "description required" });
  if (!body.signedBy) return res.status(400).json({ ok: false, error: "signedBy (A&P/IA name) required — this is a legal record" });

  try {
    const result = await appendLogbookEntryCore({
      tailNumber: body.tailNumber, ctx, recordType: "manual",
      description: body.description, category: body.category || "Other",
      signedBy: body.signedBy, signedByCert: body.signedByCert, ttsn: body.ttsn,
      source: body.source || "manual",
    });
    return res.json({ ok: true, ...result });
  } catch (e) {
    return res.status(e.status || 500).json({ ok: false, error: e.message });
  }
}

// Real, live read for the "Aircraft Logbook" tab — reachable from both MX
// (write access, via handleAddLogbookEntry + the auto-append event handlers)
// and Pilots (read-only — this is "the legal record of this aircraft's
// life," and pilots need to be able to see it even though they can't write
// to it). Fleet-wide across every tail on file for this scope unless a
// specific tailNumber is requested, same shape as handleListSquawks above.
async function handleListLogbook(req, res, ctx) {
  const db = getDb();
  const scopeId = resolveScopeId(ctx);
  const tailFilter = req.query?.tailNumber ? String(req.query.tailNumber).toUpperCase() : null;

  let tails;
  if (tailFilter) {
    tails = [tailFilter];
  } else {
    const fleetSnap = await db.collection("aircraftRecords").doc(scopeId).collection("aircraft").get();
    tails = fleetSnap.docs.map(d => d.id);
  }

  const all = [];
  await Promise.all(tails.map(async (tail) => {
    const snap = await logbookRef(db, scopeId, tail).get();
    snap.docs.forEach(d => all.push({ id: d.id, ...d.data() }));
  }));
  all.sort((a, b) => new Date(b.enteredAt || 0) - new Date(a.enteredAt || 0));

  return res.json({ ok: true, entries: all.slice(0, 100) });
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
    // MEL — Minimum Equipment List: what's inoperative but flyable, and
    // under what conditions. The A/B/C/D category + computed rectification
    // deadline (airworthinessTracker.evaluateSquawk) was already real; this
    // adds the other MEL half — the specific MMEL/operator-MEL item number
    // and the operating conditions/restrictions placed on the aircraft
    // while deferred (e.g. "placarded inop, day VFR only") — so a deferred
    // squawk records not just THAT it's deferred but WHAT flying under the
    // deferral actually requires.
    update.melReference = String(body.melReference || "").slice(0, 100);
    update.restrictions = String(body.restrictions || "").slice(0, 1000);
  }
  if (body.status === "closed") {
    update.closedBy = String(body.closedBy || "").slice(0, 200);
    update.closedNote = String(body.closedNote || "").slice(0, 1000);
  }

  await ref.update(update);

  // Auto-append to the real Aircraft Logbook — a defer or close is a genuine
  // maintenance action requiring A&P/IA sign-off, so it belongs in the
  // permanent legal record (CAN), not just the mutable squawk doc above.
  // Best-effort: a logging failure here does not fail the squawk-status
  // update itself (the primary write already succeeded), but it is logged
  // server-side for follow-up.
  try {
    const squawkData = snap.data();
    if (body.status === "deferred") {
      await appendLogbookEntryCore({
        tailNumber: body.tailNumber, ctx, recordType: "squawk_deferred",
        description: `${squawkData.description || "Discrepancy"} — MEL deferred Cat ${update.category}${update.melReference ? ` (MEL ${update.melReference})` : ""}${update.restrictions ? `. Restrictions: ${update.restrictions}` : ""}`,
        category: "Unscheduled", signedBy: update.deferredBy, source: "mx_defer", refId: body.squawkId,
      });
    } else if (body.status === "closed") {
      await appendLogbookEntryCore({
        tailNumber: body.tailNumber, ctx, recordType: "squawk_closed",
        description: `${squawkData.description || "Discrepancy"} — closed${update.closedNote ? `: ${update.closedNote}` : ""}`,
        category: "Unscheduled", signedBy: update.closedBy, source: "mx_close", refId: body.squawkId,
      });
    }
  } catch (logErr) {
    console.error("[updateSquawkStatus] logbook auto-append failed:", logErr.message);
  }

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

// ============================================================
// 7b. addMaintenanceItem — "MX To-Do": one scheduled-maintenance entry
// (inspection interval, recurring item) added to the tail's real record.
// Generalizes the single `nextInspection` field above into a real list —
// evaluated by airworthinessTracker.evaluateMaintenanceItems on every
// listAircraft/getAirworthiness read. Uses arrayUnion so concurrent adds
// from different sessions don't clobber each other (unlike a raw array
// overwrite via upsertAircraft).
// ============================================================
async function handleAddMaintenanceItem(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.tailNumber) return res.status(400).json({ ok: false, error: "tailNumber required" });
  if (!body.description) return res.status(400).json({ ok: false, error: "description required" });
  const basis = String(body.basis || "").toLowerCase();
  if (!["hours", "calendar"].includes(basis)) return res.status(400).json({ ok: false, error: "basis must be 'hours' or 'calendar'" });
  if (basis === "calendar" && !body.dueDate) return res.status(400).json({ ok: false, error: "dueDate required when basis is 'calendar'" });
  if (basis === "hours" && body.dueAtHours == null) return res.status(400).json({ ok: false, error: "dueAtHours required when basis is 'hours'" });

  const scopeId = resolveScopeId(ctx);
  const item = {
    id: crypto.randomUUID(),
    description: String(body.description).slice(0, 300),
    basis,
    dueDate: basis === "calendar" ? String(body.dueDate).slice(0, 30) : null,
    dueAtHours: basis === "hours" ? Number(body.dueAtHours) : null,
    intervalMonths: body.intervalMonths != null ? Number(body.intervalMonths) : null,
    intervalHours: body.intervalHours != null ? Number(body.intervalHours) : null,
    farReference: String(body.farReference || "").slice(0, 30),
    mandatory: body.mandatory !== false,
    lastDoneAt: body.lastDoneAt || null,
    lastDoneHours: body.lastDoneHours != null ? Number(body.lastDoneHours) : null,
    addedBy: String(ctx.userId || "").slice(0, 200),
    addedAt: new Date().toISOString(),
  };

  await aircraftRef(db, scopeId, body.tailNumber).set({
    maintenanceItems: admin.firestore.FieldValue.arrayUnion(item),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return res.json({ ok: true, tailNumber: String(body.tailNumber).toUpperCase(), item });
}

// ============================================================
// 7b2. completeMaintenanceItem — mark one scheduled-maintenance item ("MX
// To-Do") complete. Genuinely new: addMaintenanceItem above only ever
// created items, there was no real path to record that one was actually
// done — which meant "scheduled maintenance completes" had nothing to
// trigger a real Aircraft Logbook entry from. Rolls the interval forward
// for recurring items (mirrors real 100-hr/Annual practice: the next due
// point is computed from the completion, not left showing overdue the
// instant it's done) and auto-appends the real logbook entry.
// ============================================================
async function handleCompleteMaintenanceItem(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.tailNumber) return res.status(400).json({ ok: false, error: "tailNumber required" });
  if (!body.itemId) return res.status(400).json({ ok: false, error: "itemId required" });
  if (!body.signedBy) return res.status(400).json({ ok: false, error: "signedBy (A&P/IA name) required to complete scheduled maintenance" });

  const scopeId = resolveScopeId(ctx);
  const ref = aircraftRef(db, scopeId, body.tailNumber);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ ok: false, error: "aircraft not found" });

  const data = snap.data();
  const items = Array.isArray(data.maintenanceItems) ? data.maintenanceItems : [];
  const idx = items.findIndex(i => i.id === body.itemId);
  if (idx === -1) return res.status(404).json({ ok: false, error: "maintenance item not found" });

  const completedAtHours = body.completedAtHours != null ? Number(body.completedAtHours) : (data.totalTimeHours ?? null);
  const completedItem = {
    ...items[idx],
    lastDoneAt: new Date().toISOString(),
    lastDoneHours: completedAtHours,
    completedBy: String(body.signedBy).slice(0, 200),
    completedNote: String(body.completedNote || "").slice(0, 500),
  };
  if (completedItem.basis === "hours" && completedItem.intervalHours && completedAtHours != null) {
    completedItem.dueAtHours = completedAtHours + Number(completedItem.intervalHours);
  }
  if (completedItem.basis === "calendar" && completedItem.intervalMonths) {
    const nextDue = new Date();
    nextDue.setMonth(nextDue.getMonth() + Number(completedItem.intervalMonths));
    completedItem.dueDate = nextDue.toISOString().slice(0, 10);
  }

  const newItems = [...items];
  newItems[idx] = completedItem;
  await ref.update({ maintenanceItems: newItems, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

  try {
    await appendLogbookEntryCore({
      tailNumber: body.tailNumber, ctx, recordType: "scheduled_maintenance_completed",
      description: `${completedItem.description || "Scheduled maintenance"} completed${completedItem.completedNote ? ` — ${completedItem.completedNote}` : ""}`,
      category: "Scheduled", signedBy: completedItem.completedBy, ttsn: completedAtHours, source: "mx_complete", refId: body.itemId,
    });
  } catch (logErr) {
    console.error("[completeMaintenanceItem] logbook auto-append failed:", logErr.message);
  }

  return res.json({ ok: true, tailNumber: String(body.tailNumber).toUpperCase(), item: completedItem });
}

// ============================================================
// 7c. addWarranty — component/engine/avionics warranty or coverage-plan
// record (e.g. PT6A Eagle Service Plan, avionics factory warranty).
// Informational tracking only — see evaluateWarranties: never blocks
// airworthiness, unlike maintenance items and AD compliance above.
// ============================================================
async function handleAddWarranty(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.tailNumber) return res.status(400).json({ ok: false, error: "tailNumber required" });
  if (!body.component) return res.status(400).json({ ok: false, error: "component required" });

  const scopeId = resolveScopeId(ctx);
  const item = {
    id: crypto.randomUUID(),
    component: String(body.component).slice(0, 200),
    provider: String(body.provider || "").slice(0, 200),
    coverageType: String(body.coverageType || "").slice(0, 200),
    startDate: body.startDate || null,
    expirationDate: body.expirationDate || null,
    expirationHours: body.expirationHours != null ? Number(body.expirationHours) : null,
    notes: String(body.notes || "").slice(0, 500),
    addedBy: String(ctx.userId || "").slice(0, 200),
    addedAt: new Date().toISOString(),
  };

  await aircraftRef(db, scopeId, body.tailNumber).set({
    warranties: admin.firestore.FieldValue.arrayUnion(item),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  // Auto-append to the real Aircraft Logbook — informational (warranty
  // never contributes to airworthiness), but still a real record of what
  // was put on file and by whom.
  try {
    await appendLogbookEntryCore({
      tailNumber: body.tailNumber, ctx, recordType: "warranty_added",
      description: `Warranty/coverage on file — ${item.component}${item.provider ? ` (${item.provider})` : ""}${item.coverageType ? `, ${item.coverageType}` : ""}`,
      category: "Warranty", signedBy: item.addedBy, source: "mx_warranty", refId: item.id,
    });
  } catch (logErr) {
    console.error("[addWarranty] logbook auto-append failed:", logErr.message);
  }

  return res.json({ ok: true, tailNumber: String(body.tailNumber).toUpperCase(), item });
}

// ============================================================
// 7d. addNefItem — NEF (Negative Equipment List, per CODEX 40 §4 Compliance Documents table): equipment
// NOT installed that would otherwise be required — a documented absence,
// distinct from MEL (temporarily inoperative equipment on an aircraft that
// HAS it installed). Purely a documentation record; no status computation,
// never contributes to airworthiness (see airworthinessTracker.passthroughNef).
// ============================================================
async function handleAddNefItem(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.tailNumber) return res.status(400).json({ ok: false, error: "tailNumber required" });
  if (!body.equipment) return res.status(400).json({ ok: false, error: "equipment required" });

  const scopeId = resolveScopeId(ctx);
  const item = {
    id: crypto.randomUUID(),
    equipment: String(body.equipment).slice(0, 200),
    reason: String(body.reason || "").slice(0, 500),
    authorizationRef: String(body.authorizationRef || "").slice(0, 200),
    documentedBy: String(body.documentedBy || ctx.userId || "").slice(0, 200),
    documentedAt: new Date().toISOString(),
  };

  await aircraftRef(db, scopeId, body.tailNumber).set({
    nefItems: admin.firestore.FieldValue.arrayUnion(item),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return res.json({ ok: true, tailNumber: String(body.tailNumber).toUpperCase(), item });
}

// ============================================================
// 7e. recordAdCompliance — record that a specific AD was complied with.
// Genuinely new: upsertAircraft's adCompliance field only ever supported a
// wholesale array replace (the whole list, no per-AD action) — there was no
// real path to say "we just complied with AD 2026-08-12," which meant "an
// AD gets complied with" had nothing to trigger a real Aircraft Logbook
// entry from. Finds-or-appends the one AD by number and auto-appends the
// real logbook entry.
// ============================================================
async function handleRecordAdCompliance(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.tailNumber) return res.status(400).json({ ok: false, error: "tailNumber required" });
  if (!body.ad) return res.status(400).json({ ok: false, error: "ad (AD number) required" });
  if (!body.compliantAsOf) return res.status(400).json({ ok: false, error: "compliantAsOf required" });
  if (!body.signedBy) return res.status(400).json({ ok: false, error: "signedBy (A&P/IA name) required to record AD compliance" });

  const scopeId = resolveScopeId(ctx);
  const ref = aircraftRef(db, scopeId, body.tailNumber);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ ok: false, error: "aircraft not found" });

  const list = Array.isArray(snap.data().adCompliance) ? [...snap.data().adCompliance] : [];
  const idx = list.findIndex(a => String(a?.ad || "").toUpperCase() === String(body.ad).toUpperCase());
  const entry = {
    ad: String(body.ad).slice(0, 50),
    subject: String(body.subject || (idx >= 0 ? list[idx].subject : "") || "").slice(0, 200),
    compliantAsOf: String(body.compliantAsOf).slice(0, 30),
    nextDue: body.nextDue ? String(body.nextDue).slice(0, 30) : null,
  };
  if (idx >= 0) list[idx] = entry; else list.push(entry);
  await ref.update({ adCompliance: list, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

  try {
    await appendLogbookEntryCore({
      tailNumber: body.tailNumber, ctx, recordType: "ad_compliance",
      description: `AD ${entry.ad}${entry.subject ? ` — ${entry.subject}` : ""} complied with${entry.nextDue ? ` · next due ${entry.nextDue}` : ""}`,
      category: "AD", signedBy: body.signedBy, signedByCert: body.signedByCert, ttsn: body.ttsn, source: "mx_ad", refId: entry.ad,
    });
  } catch (logErr) {
    console.error("[recordAdCompliance] logbook auto-append failed:", logErr.message);
  }

  return res.json({ ok: true, tailNumber: String(body.tailNumber).toUpperCase(), ad: entry });
}

// ============================================================
// 8. readMeterPhoto — photo of a panel hour meter → reading + delta
//
// "No penmanship, no pilot math" (Sean, CODEX centerpiece directive).
// Real Anthropic vision call, not a stub. Verified directly against a real
// Life Flight Network PC-12 panel photo this session: the model correctly
// identified the instrument as a "Honeywell Quartz Hours" elapsed-time
// meter and flagged (a) that the meter is photographed upside-down and
// (b) LOW confidence on the exact digits after correcting for that — it
// did NOT confidently resolve a clean reading on this real, hard case
// (upside-down mechanical drum meter, glare, screws obstructing digits).
// This is why confidence is a first-class field here, not an afterthought:
// a pilot/mechanic must be able to see "low confidence, please confirm or
// retake" rather than a silently-wrong number going into a legal record.
//
// This function does NOT write anything — it's the "propose" half of the
// RAAS pattern. A separate, explicit confirm step (handled client-side by
// showing the reading for the user to accept/correct before calling
// handleUpsertAircraft or a real flight-log-entry endpoint) is required
// before anything is committed. Never auto-commits an OCR'd number.
// ============================================================
async function handleReadMeterPhoto(req, res, ctx) {
  const Anthropic = require("@anthropic-ai/sdk");
  const body = req.body || {};
  if (!body.tailNumber) return res.status(400).json({ ok: false, error: "tailNumber required" });
  if (!body.imageBase64) return res.status(400).json({ ok: false, error: "imageBase64 required" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ ok: false, error: "ANTHROPIC_API_KEY not configured" });

  const db = getDb();
  const scopeId = resolveScopeId(ctx);
  const ref = aircraftRef(db, scopeId, body.tailNumber);
  const snap = await ref.get();
  const aircraft = snap.exists ? snap.data() : null;
  const meters = aircraft?.meters || {};
  const knownMeterTypes = Object.keys(meters);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const mediaType = String(body.mediaType || "image/jpeg");
  const contextLine = knownMeterTypes.length
    ? `This aircraft (${body.tailNumber}) has these meters already on file: ${knownMeterTypes.join(", ")}. If the photographed meter matches one of these, use that exact label; if it's a new/different meter, say so.`
    : `No meters are on file yet for ${body.tailNumber} — this may be the first reading logged for this aircraft.`;

  let completion;
  try {
    completion = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: body.imageBase64 } },
          { type: "text", text: `This is a photo of an aircraft panel hour meter, for entry into the aircraft's Flight/Maintenance Log — a legal record, so accuracy matters more than a confident-sounding guess. ${contextLine}

Identify: (1) what type of meter this is (read any label/brand/unit text — e.g. "airframe Hobbs", "engine hours", a specific engine position if labeled), (2) the exact numeric reading, digit by digit including any decimal — check carefully whether the meter is rotated/upside-down in the photo and correct for that. If any part of this is ambiguous or you are not highly confident, say so explicitly rather than guessing a plausible-looking number.

Respond in exactly this format, nothing else:
METER_TYPE: <type, or AMBIGUOUS with a one-line reason>
READING: <number, or UNREADABLE with a one-line reason>
CONFIDENCE: <high|medium|low>
NOTES: <one to two sentences>` }
        ]
      }]
    });
  } catch (e) {
    console.error("[readMeterPhoto] Anthropic call failed:", e.message);
    return res.status(502).json({ ok: false, error: "Vision read failed: " + e.message });
  }

  const raw = completion.content?.[0]?.text || "";
  const pick = (label) => {
    const m = raw.match(new RegExp(`${label}:\\s*(.+)`, "i"));
    return m ? m[1].trim() : null;
  };
  const meterType = pick("METER_TYPE");
  const readingRaw = pick("READING");
  const confidence = (pick("CONFIDENCE") || "low").toLowerCase();
  const notes = pick("NOTES");
  const readingNum = readingRaw && /^-?\d+(\.\d+)?$/.test(readingRaw) ? Number(readingRaw) : null;

  const priorEntry = meterType && meters[meterType] ? meters[meterType] : null;
  const delta = (readingNum != null && priorEntry?.lastReading != null)
    ? Math.round((readingNum - priorEntry.lastReading) * 10) / 10
    : null;

  return res.json({
    ok: true,
    raw,
    meterType,
    reading: readingNum,
    readingUnparsed: readingNum == null ? readingRaw : null,
    confidence,
    notes,
    priorReading: priorEntry?.lastReading ?? null,
    priorReadingDate: priorEntry?.lastReadingDate ?? null,
    delta,
    requiresManualConfirmation: confidence !== "high" || readingNum == null || !meterType || meterType === "AMBIGUOUS",
  });
}

// ============================================================
// 9. commitMeterReading — after human confirms (or corrects) the reading
// from readMeterPhoto, this is the actual write — a real, append-aware
// update to the aircraft's per-meter running total. Separate endpoint,
// deliberately, so a vision misread never reaches Firestore without a
// human in the loop confirming the number that's about to become part of
// a legal record.
// ============================================================
async function handleCommitMeterReading(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.tailNumber) return res.status(400).json({ ok: false, error: "tailNumber required" });
  if (!body.meterType) return res.status(400).json({ ok: false, error: "meterType required" });
  if (body.reading == null || isNaN(Number(body.reading))) return res.status(400).json({ ok: false, error: "reading (number) required" });

  const scopeId = resolveScopeId(ctx);
  const ref = aircraftRef(db, scopeId, body.tailNumber);
  const meterType = String(body.meterType).slice(0, 100);
  const reading = Number(body.reading);

  await ref.set({
    meters: {
      [meterType]: {
        lastReading: reading,
        lastReadingDate: body.readingDate || new Date().toISOString(),
        confirmedBy: String(ctx.userId || "").slice(0, 200),
        source: body.source === "photo" ? "photo" : "manual",
      },
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return res.json({ ok: true, tailNumber: String(body.tailNumber).toUpperCase(), meterType, reading });
}

// ============================================================
// 10. readSquawkPhoto — photo of a discrepancy (damage, warning light,
// placard, worn part, fluid leak) -> a DRAFT description for the pilot to
// review before filing. Same "propose, don't commit" split as
// readMeterPhoto (Sean, 2026-09-05: "voice or chat is best, but a photo is
// better, worst case a form" — this is the photo path, third entry method
// alongside chat and the manual form, all converging on addSquawkCore). If
// the photo doesn't clearly show what's wrong, this says so honestly
// rather than inventing a plausible-sounding discrepancy.
// ============================================================
async function handleReadSquawkPhoto(req, res, ctx) {
  const Anthropic = require("@anthropic-ai/sdk");
  const body = req.body || {};
  if (!body.imageBase64) return res.status(400).json({ ok: false, error: "imageBase64 required" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ ok: false, error: "ANTHROPIC_API_KEY not configured" });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const mediaType = String(body.mediaType || "image/jpeg");
  const tailLine = body.tailNumber ? `This photo is of aircraft ${String(body.tailNumber).toUpperCase()}.` : "";

  let completion;
  try {
    completion = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: body.imageBase64 } },
          { type: "text", text: `This is a photo a pilot or mechanic took of something they think is wrong with an aircraft — for entry into the aircraft's discrepancy (squawk) log, a legal maintenance record. ${tailLine}

Describe exactly what you can see that looks like a discrepancy (damage, a warning/caution light or annunciator, a cracked or worn part, a fluid leak, a placard, corrosion, etc.). Be specific about what's visible — location, appearance — but do NOT diagnose the underlying cause or guess a part number/root cause you can't actually see. If the photo doesn't clearly show a discrepancy, or you genuinely can't tell what's wrong, say so plainly rather than inventing something plausible-sounding.

Respond in exactly this format, nothing else:
VISIBLE: <what you can see, one or two sentences, or "UNCLEAR" with a one-line reason>
SUGGESTED_DESCRIPTION: <a draft squawk description in the pilot's own likely words, or NONE if VISIBLE is UNCLEAR>
CONFIDENCE: <high|medium|low>
NOTES: <one to two sentences — anything the pilot should double check or add themselves>` }
        ]
      }]
    });
  } catch (e) {
    console.error("[readSquawkPhoto] Anthropic call failed:", e.message);
    return res.status(502).json({ ok: false, error: "Vision read failed: " + e.message });
  }

  const raw = completion.content?.[0]?.text || "";
  const pick = (label) => {
    const m = raw.match(new RegExp(`${label}:\\s*(.+)`, "i"));
    return m ? m[1].trim() : null;
  };
  const visible = pick("VISIBLE");
  const suggestedDescription = pick("SUGGESTED_DESCRIPTION");
  const confidence = (pick("CONFIDENCE") || "low").toLowerCase();
  const notes = pick("NOTES");
  const isUnclear = !visible || /^unclear/i.test(visible) || !suggestedDescription || /^none$/i.test(suggestedDescription);

  return res.json({
    ok: true,
    raw,
    visible,
    suggestedDescription: isUnclear ? null : suggestedDescription,
    confidence,
    notes,
    requiresManualConfirmation: true, // ALWAYS — a squawk is a legal record; photo is a draft aid, never an auto-file
    isUnclear,
  });
}

// ============================================================
// 11. commitSquawkPhoto — after the pilot reviews/edits the draft
// description from readSquawkPhoto, files it through the SAME real write
// path (addSquawkCore) as the manual form and chat, tagged source:"photo".
// ============================================================
async function handleCommitSquawkPhoto(req, res, ctx) {
  const body = req.body || {};
  try {
    const result = await addSquawkCore({
      tailNumber: body.tailNumber, description: body.description, category: body.category,
      workOrderNumber: body.workOrderNumber, reportedBy: body.reportedBy, source: "photo", ctx,
    });
    return res.json({ ok: true, ...result });
  } catch (e) {
    return res.status(e.status || 500).json({ ok: false, error: e.message });
  }
}

module.exports = {
  resolveScopeId,
  addSquawkCore,
  appendLogbookEntryCore,
  handleUpsertAircraft,
  handleAddSquawk,
  handleListSquawks,
  handleUpdateSquawkStatus,
  handleGetAirworthiness,
  handleListAircraft,
  handleUploadSquawksCsv,
  handleUploadAircraftRosterCsv,
  handleAddMaintenanceItem,
  handleCompleteMaintenanceItem,
  handleAddWarranty,
  handleAddNefItem,
  handleRecordAdCompliance,
  handleAddLogbookEntry,
  handleListLogbook,
  handleReadMeterPhoto,
  handleCommitMeterReading,
  handleReadSquawkPhoto,
  handleCommitSquawkPhoto,
};
