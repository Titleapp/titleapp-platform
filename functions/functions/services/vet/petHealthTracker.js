"use strict";

/**
 * petHealthTracker.js — real per-pet vaccination/medication/appointment
 * status computation.
 *
 * Replaces PetHealthCanvas.jsx's hardcoded VACCINATIONS/MEDS/APPOINTMENTS
 * constants (and the equally hardcoded "pet-health-client" systemPrompt in
 * index.js) with a real computation over actual Firestore records — the
 * vet demo was built static because the product wasn't far enough along
 * yet (Sean, 2026-08-18); this is the real version, same "compute from
 * real records" pattern as aviation's currencyTracker.js/airworthinessTracker.js.
 */

const MS_PER_DAY = 86400000;
const DUE_SOON_WINDOW_DAYS = 30;

function daysBetween(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function computeVaccinationStatus(vacc, now) {
  const dueDate = vacc.dueDate ? new Date(vacc.dueDate) : null;
  if (!dueDate || isNaN(dueDate.getTime())) {
    return { ...vacc, status: "unverified" };
  }
  const daysUntilDue = daysBetween(now, dueDate);
  let status = "current";
  if (daysUntilDue < 0) status = "overdue";
  else if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) status = "due-soon";
  return { ...vacc, status, daysUntilDue };
}

function computeMedicationStatus(med, now) {
  const nextDueDate = med.nextDueDate ? new Date(med.nextDueDate) : null;
  if (!nextDueDate || isNaN(nextDueDate.getTime())) {
    return { ...med, status: "unverified" };
  }
  const daysUntilDue = daysBetween(now, nextDueDate);
  const status = daysUntilDue < 0 ? "due" : "active";
  return { ...med, status, daysUntilDue };
}

function computeAppointment(appt, now) {
  // Day-level granularity only — appt.time is a free-form display string
  // ("2:00 PM", "10:30 AM") that new Date(`${date}T${time}`) cannot parse
  // (it needs 24h "HH:MM"), which silently produced daysUntil:null for
  // every appointment regardless of date (Sean, 2026-08-18, found live).
  const apptDate = appt.date ? new Date(`${appt.date}T00:00:00`) : null;
  if (!apptDate || isNaN(apptDate.getTime())) {
    return { ...appt, daysUntil: null };
  }
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { ...appt, daysUntil: daysBetween(nowDateOnly, apptDate) };
}

function computePetHealthRecord(pet, visits, vaccinations, medications, appointments, now = new Date()) {
  if (!pet) {
    return { pet: null, visits: [], vaccinations: [], medications: [], appointments: [], unverified: true };
  }
  const sortedVisits = [...visits].sort((a, b) => new Date(b.date) - new Date(a.date));
  const computedVaccinations = vaccinations.map(v => computeVaccinationStatus(v, now));
  const computedMedications = medications.map(m => computeMedicationStatus(m, now));
  const computedAppointments = appointments
    .map(a => computeAppointment(a, now))
    .filter(a => a.daysUntil === null || a.daysUntil >= 0)
    .sort((a, b) => (a.daysUntil ?? Infinity) - (b.daysUntil ?? Infinity));

  return {
    pet,
    visits: sortedVisits,
    vaccinations: computedVaccinations,
    medications: computedMedications,
    appointments: computedAppointments,
    nextAppointment: computedAppointments[0] || null,
    dueSoonVaccinations: computedVaccinations.filter(v => v.status === "due-soon" || v.status === "overdue"),
  };
}

module.exports = {
  computeVaccinationStatus,
  computeMedicationStatus,
  computeAppointment,
  computePetHealthRecord,
};
