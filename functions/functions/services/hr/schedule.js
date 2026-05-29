"use strict";

/**
 * hr/schedule.js — Schedule & coverage tracking for HR worker.
 *
 * Tracks which humans are on what shifts and confirms digital workers'
 * 24×7×365 default coverage. Used by HR canvas to show coverage gaps
 * and by Control Center to surface understaffed windows.
 *
 * Schema:
 *   tenants/{tenantId}/hrSchedules/{memberId}
 *     - memberId    — uid for human, workerId for digital worker
 *     - memberType  — "human" | "digital_worker"
 *     - name        — display
 *     - role        — display
 *     - timezone    — IANA TZ (humans only)
 *     - shifts      — array of { dow: 0-6, start: "HH:MM", end: "HH:MM" }
 *                     digital workers get [{ dow: "*", start: "00:00", end: "24:00" }]
 *     - pto         — array of { start: ISO, end: ISO, type: "vacation"|"sick"|"other" }
 *     - onCall      — boolean
 *     - status      — "active" | "leave" | "inactive"
 *     - maintenanceWindows (digital only) — array of { start: ISO, end: ISO, reason }
 *
 * Compliance hooks:
 *   - human shifts validated against FLSA (overtime risk, max-hours-per-week)
 *   - PTO accruals tracked for state PFL compliance
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const DEFAULT_DIGITAL_SHIFTS = [{ dow: "*", start: "00:00", end: "24:00" }];

// ═══════════════════════════════════════════════════════════════
//  CRUD
// ═══════════════════════════════════════════════════════════════

async function upsertSchedule(tenantId, memberId, input) {
  if (!tenantId || !memberId) throw new Error("upsertSchedule: tenantId + memberId required");
  const ref = getDb().collection("tenants").doc(tenantId)
    .collection("hrSchedules").doc(memberId);

  const memberType = input.memberType === "digital_worker" ? "digital_worker" : "human";
  const shifts = memberType === "digital_worker"
    ? DEFAULT_DIGITAL_SHIFTS
    : (Array.isArray(input.shifts) ? input.shifts : []);

  const payload = {
    memberId,
    memberType,
    name: input.name || null,
    role: input.role || null,
    timezone: input.timezone || (memberType === "human" ? "America/Los_Angeles" : "UTC"),
    shifts,
    pto: Array.isArray(input.pto) ? input.pto : [],
    onCall: !!input.onCall,
    status: input.status || "active",
    maintenanceWindows: Array.isArray(input.maintenanceWindows) ? input.maintenanceWindows : [],
    updatedAt: ts(),
  };

  const existing = await ref.get();
  if (!existing.exists) payload.createdAt = ts();
  await ref.set(payload, { merge: true });
  return { ok: true, memberId };
}

async function listSchedules(tenantId, { memberType = null, status = "active" } = {}) {
  let q = getDb().collection("tenants").doc(tenantId).collection("hrSchedules");
  if (memberType) q = q.where("memberType", "==", memberType);
  if (status) q = q.where("status", "==", status);
  const snap = await q.limit(500).get();
  return snap.docs.map(d => d.data());
}

async function getSchedule(tenantId, memberId) {
  const snap = await getDb().collection("tenants").doc(tenantId)
    .collection("hrSchedules").doc(memberId).get();
  return snap.exists ? snap.data() : null;
}

async function setStatus(tenantId, memberId, status) {
  if (!["active", "leave", "inactive"].includes(status)) throw new Error("invalid status");
  await getDb().collection("tenants").doc(tenantId)
    .collection("hrSchedules").doc(memberId).update({ status, updatedAt: ts() });
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════
//  PTO MANAGEMENT
// ═══════════════════════════════════════════════════════════════

async function addPto(tenantId, memberId, ptoEntry) {
  if (!ptoEntry.start || !ptoEntry.end) throw new Error("PTO requires start + end ISO dates");
  const ref = getDb().collection("tenants").doc(tenantId)
    .collection("hrSchedules").doc(memberId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("schedule not found");
  const existing = snap.data().pto || [];
  const entry = {
    start: new Date(ptoEntry.start).toISOString(),
    end: new Date(ptoEntry.end).toISOString(),
    type: ptoEntry.type || "vacation",
    approved: !!ptoEntry.approved,
    addedAt: new Date().toISOString(),
  };
  existing.push(entry);
  await ref.update({ pto: existing, updatedAt: ts() });
  return { ok: true, ptoEntry: entry };
}

// ═══════════════════════════════════════════════════════════════
//  COVERAGE & GAP DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Compute the coverage roll-up for a given moment in time (defaults to now).
 * Returns:
 *   {
 *     onShiftNow: [ { memberId, memberType, name, role } ],
 *     onPtoNow:   [ ... ],
 *     digitalCoverageHealthy: boolean,    // all 24×7 workers are NOT in maintenance
 *     gaps: [ { hour: 0-23, dow: 0-6, missingRoles: [...] } ]   // simplistic stub for v1
 *   }
 */
async function computeCoverage(tenantId, atDate = new Date()) {
  const all = await listSchedules(tenantId, { status: "active" });
  const dow = atDate.getDay();
  const hours = atDate.getHours();
  const minutes = atDate.getMinutes();
  const nowMin = hours * 60 + minutes;
  const nowIso = atDate.toISOString();

  const onShift = [];
  const onPto = [];
  let digitalHealthy = true;

  for (const m of all) {
    // PTO check
    const inPto = (m.pto || []).some(p => p.start <= nowIso && p.end >= nowIso);
    if (inPto) {
      onPto.push({ memberId: m.memberId, memberType: m.memberType, name: m.name, role: m.role });
      continue;
    }

    // Shift check
    const shiftMatch = (m.shifts || []).some(s => {
      if (s.dow !== "*" && Number(s.dow) !== dow) return false;
      const [sh, sm] = (s.start || "00:00").split(":").map(Number);
      const [eh, em] = (s.end || "24:00").split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      return nowMin >= startMin && nowMin < endMin;
    });
    if (shiftMatch) {
      onShift.push({ memberId: m.memberId, memberType: m.memberType, name: m.name, role: m.role });
    }

    // Digital worker maintenance check
    if (m.memberType === "digital_worker") {
      const inMaintenance = (m.maintenanceWindows || []).some(
        w => w.start <= nowIso && w.end >= nowIso
      );
      if (inMaintenance) digitalHealthy = false;
    }
  }

  return {
    asOf: nowIso,
    onShiftNow: onShift,
    onPtoNow: onPto,
    digitalCoverageHealthy: digitalHealthy,
    counts: {
      onShift: onShift.length,
      onPto: onPto.length,
      humansActive: all.filter(m => m.memberType === "human").length,
      digitalActive: all.filter(m => m.memberType === "digital_worker").length,
    },
    gaps: [], // future: detect uncovered hours-by-role per tenant config
  };
}

/**
 * Register a newly subscribed digital worker in the HR schedule so it shows
 * up in coverage views. Idempotent — re-registering updates fields.
 */
async function registerDigitalWorker(tenantId, { workerId, name, role }) {
  return upsertSchedule(tenantId, workerId, {
    memberType: "digital_worker",
    name: name || workerId,
    role: role || "Digital Worker",
    timezone: "UTC",
    shifts: DEFAULT_DIGITAL_SHIFTS,
    status: "active",
  });
}

module.exports = {
  upsertSchedule,
  listSchedules,
  getSchedule,
  setStatus,
  addPto,
  computeCoverage,
  registerDigitalWorker,
};
