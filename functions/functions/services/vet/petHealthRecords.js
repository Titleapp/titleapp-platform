"use strict";

/**
 * petHealthRecords.js — real per-pet health record handlers for the
 * "pet-health-client" worker (Meadow Creek Veterinary Clinic demo, and
 * any future real vet clinic tenant).
 *
 * Firestore: petRecords/{tenantId}/pets/{petId}
 *            petRecords/{tenantId}/pets/{petId}/visits/{id}
 *            petRecords/{tenantId}/pets/{petId}/vaccinations/{id}
 *            petRecords/{tenantId}/pets/{petId}/medications/{id}
 *            petRecords/{tenantId}/pets/{petId}/appointments/{id}
 *
 * Scoped by tenantId — the clinic's medical record is the system of
 * record (same reasoning as aviation's aircraftRecords.js: the record
 * belongs to the operator/clinic, not any one person's private vault) —
 * but each pet doc carries ownerUid so a client-side query can filter to
 * just their own pet(s) without seeing the clinic's whole patient list.
 */

const admin = require("firebase-admin");
const { computePetHealthRecord } = require("./petHealthTracker");

function getDb() {
  return admin.firestore();
}

function resolveScopeId({ userId, tenantId }) {
  return tenantId || userId;
}

function petsCol(db, scopeId) {
  return db.collection("petRecords").doc(scopeId).collection("pets");
}

// ============================================================
// 1. upsertPet — create or update a pet's base profile
// ============================================================
async function handleUpsertPet(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ ok: false, error: "name required" });

  const scopeId = resolveScopeId(ctx);
  const ref = body.petId ? petsCol(db, scopeId).doc(body.petId) : petsCol(db, scopeId).doc();
  const doc = {
    name: String(body.name).slice(0, 100),
    species: String(body.species || "").slice(0, 50),
    breed: String(body.breed || "").slice(0, 100),
    ageYears: body.ageYears != null ? Number(body.ageYears) : null,
    weightLbs: body.weightLbs != null ? Number(body.weightLbs) : null,
    microchip: String(body.microchip || "").slice(0, 50),
    ownerUid: String(body.ownerUid || ctx.userId).slice(0, 200),
    ownerName: String(body.ownerName || "").slice(0, 200),
    primaryVetName: String(body.primaryVetName || "").slice(0, 200),
    clinicName: String(body.clinicName || "").slice(0, 200),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set(doc, { merge: true });
  return res.json({ ok: true, petId: ref.id });
}

// ============================================================
// 2. addVisit / addVaccination / addMedication / addAppointment
// ============================================================
async function handleAddVisit(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.petId || !body.type) return res.status(400).json({ ok: false, error: "petId and type required" });
  const scopeId = resolveScopeId(ctx);
  const ref = petsCol(db, scopeId).doc(body.petId).collection("visits").doc();
  await ref.set({
    date: body.date || new Date().toISOString().slice(0, 10),
    type: String(body.type).slice(0, 100),
    notes: String(body.notes || "").slice(0, 1000),
    vetName: String(body.vetName || "").slice(0, 200),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return res.json({ ok: true, visitId: ref.id });
}

async function handleAddVaccination(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.petId || !body.name || !body.dueDate) {
    return res.status(400).json({ ok: false, error: "petId, name, and dueDate required" });
  }
  const scopeId = resolveScopeId(ctx);
  const ref = petsCol(db, scopeId).doc(body.petId).collection("vaccinations").doc();
  await ref.set({
    name: String(body.name).slice(0, 100),
    givenDate: body.givenDate || null,
    dueDate: body.dueDate,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return res.json({ ok: true, vaccinationId: ref.id });
}

async function handleAddMedication(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.petId || !body.name) return res.status(400).json({ ok: false, error: "petId and name required" });
  const scopeId = resolveScopeId(ctx);
  const ref = petsCol(db, scopeId).doc(body.petId).collection("medications").doc();
  await ref.set({
    name: String(body.name).slice(0, 100),
    purpose: String(body.purpose || "").slice(0, 200),
    schedule: String(body.schedule || "").slice(0, 100),
    lastDate: body.lastDate || null,
    nextDueDate: body.nextDueDate || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return res.json({ ok: true, medicationId: ref.id });
}

async function handleAddAppointment(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  if (!body.petId || !body.date || !body.type) {
    return res.status(400).json({ ok: false, error: "petId, date, and type required" });
  }
  const scopeId = resolveScopeId(ctx);
  const ref = petsCol(db, scopeId).doc(body.petId).collection("appointments").doc();
  await ref.set({
    date: body.date,
    time: String(body.time || "").slice(0, 20),
    type: String(body.type).slice(0, 100),
    vetName: String(body.vetName || "").slice(0, 200),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return res.json({ ok: true, appointmentId: ref.id });
}

// ============================================================
// 3. getPetRecord — computed record for one pet, filtered to caller's
//    own pet unless the caller is the clinic operator viewing directly
//    by petId (real per-record access control, not just UI hiding).
// ============================================================
async function handleGetPetRecord(req, res, ctx) {
  const db = getDb();
  const scopeId = resolveScopeId(ctx);

  let petSnap;
  if (req.query?.petId) {
    petSnap = await petsCol(db, scopeId).doc(req.query.petId).get();
    // getCtx() has no role field — this is a real per-record check, not just
    // a UI-hiding convenience: only the pet's own owner may look it up by id.
    if (petSnap.exists && petSnap.data().ownerUid !== ctx.userId) {
      return res.status(403).json({ ok: false, error: "not your pet" });
    }
  } else {
    const ownSnap = await petsCol(db, scopeId).where("ownerUid", "==", ctx.userId).limit(1).get();
    petSnap = ownSnap.docs[0];
  }

  if (!petSnap || !petSnap.exists) {
    return res.json({ ok: true, record: computePetHealthRecord(null, [], [], [], []) });
  }

  const petId = petSnap.id;
  const petRef = petsCol(db, scopeId).doc(petId);
  const [visitsSnap, vaccSnap, medsSnap, apptSnap] = await Promise.all([
    petRef.collection("visits").get(),
    petRef.collection("vaccinations").get(),
    petRef.collection("medications").get(),
    petRef.collection("appointments").get(),
  ]);

  const record = computePetHealthRecord(
    { id: petId, ...petSnap.data() },
    visitsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    vaccSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    medsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    apptSnap.docs.map(d => ({ id: d.id, ...d.data() })),
  );

  return res.json({ ok: true, record });
}

// ============================================================
// 4. listPets — clinic-side: every pet on file for this scope
// ============================================================
async function handleListPets(req, res, ctx) {
  const db = getDb();
  const scopeId = resolveScopeId(ctx);
  const snap = await petsCol(db, scopeId).get();
  const pets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return res.json({ ok: true, pets });
}

module.exports = {
  resolveScopeId,
  handleUpsertPet,
  handleAddVisit,
  handleAddVaccination,
  handleAddMedication,
  handleAddAppointment,
  handleGetPetRecord,
  handleListPets,
};
