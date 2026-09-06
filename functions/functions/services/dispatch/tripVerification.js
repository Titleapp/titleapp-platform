"use strict";

/**
 * tripVerification.js — CODEX 89 §4 steps 2-3: parallel verification, then
 * an explicit re-validation pass immediately before accept.
 *
 * Two entry points, deliberately NOT the same function called twice with a
 * different label — the round-1 red-team finding (point 2) was that
 * parallel checks 2b-2d can go stale relative to EACH OTHER by accept-time
 * (a matched aircraft or selected alternate changes the mission profile,
 * which changes duty-time math, which can invalidate the crew check just
 * run). So:
 *
 *   runVerification(kind: "initial")     — steps 2a-2d, run together, first pass
 *   runVerification(kind: "revalidation") — the SAME checks, re-run against
 *     the FINAL locked-in selection (tail + alternate + crew), immediately
 *     before the accept screen is shown, diffed against the prior snapshot
 *     so drift is visible rather than silently overwritten.
 *
 * Every run is persisted (dispatchTripRequests/{scopeId}/requests/{id}/
 * verifications/{verificationId}) — an append-only trail of what Dispatch
 * actually checked and when, not just the latest answer.
 *
 * Crew checks here assume the caller (index.js route) has already
 * authorized cross-crew access (CODEX 89 §3's "scoped, logged" read) —
 * this module does the logging (crewDataAccessLog) but the authorization
 * gate itself lives in the route handler, same pattern as the codebase's
 * other sensitive cross-person actions (nursing:competency:attest).
 */

const admin = require("firebase-admin");
const { computeAirworthiness } = require("../mx/airworthinessTracker");
const { selectAlternates } = require("./alternateSelection");
const { getWeather } = require("../aviation/weather");
const { computePilotCurrency } = require("../aviation/pilotCurrency");
const { computeDutyStatus } = require("../copilot/logic/dutyTimeTracker");
const { loadEffectiveLimits, evaluateCrewMember } = require("./crewQualsEngine");

function getDb() {
  return admin.firestore();
}

function aircraftDocRef(db, scopeId, tailNumber) {
  return db.collection("aircraftRecords").doc(scopeId).collection("aircraft").doc(String(tailNumber || "").toUpperCase());
}

async function checkAircraft(db, scopeId, tailNumber) {
  if (!tailNumber) return { checked: false, reason: "No tail number assigned to this trip request yet" };
  const ref = aircraftDocRef(db, scopeId, tailNumber);
  const [snap, squawksSnap] = await Promise.all([ref.get(), ref.collection("squawks").get()]);
  if (!snap.exists) return { checked: true, tailNumber, found: false, reasonsAgainst: [`${tailNumber} is not on file in this workspace's fleet records`] };
  const squawks = squawksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const airworthiness = computeAirworthiness(snap.data(), squawks);
  return { checked: true, tailNumber, found: true, airworthiness };
}

async function checkWeather(destinationIcao, alternateIcao) {
  const ids = [destinationIcao, alternateIcao].filter(Boolean).join(",");
  if (!ids) return { checked: false, reason: "No destination/alternate to check weather for" };
  const wx = await getWeather({ ids, taf: true });
  return { checked: true, ...wx };
}

async function checkOneCrewMember(db, { pilotUserId, role, tenantId }) {
  const [currency, dutyPeriodsSnap, activeDutySnap, effectiveLimits] = await Promise.all([
    computePilotCurrency(db, pilotUserId),
    db.collection("dutyPeriods").doc(pilotUserId).collection("periods").orderBy("dutyStartZulu", "desc").limit(50).get(),
    db.collection("dutyPeriods").doc(pilotUserId).collection("periods").where("dutyEndZulu", "==", null).limit(1).get(),
    loadEffectiveLimits(db, tenantId),
  ]);
  const dutyPeriods = dutyPeriodsSnap.docs.map((d) => d.data());
  const activeDuty = activeDutySnap.empty ? null : activeDutySnap.docs[0].data();
  // dutyTimeTracker.computeDutyStatus's flight-hours rolling windows read
  // from `logbooks/{uid}/entries` (totalTime/date fields) — the SAME
  // collection CoPilot's own dashboard reads (services/copilot/handlers.js
  // handleDashboard), not the separate `logbookEntries` top-level
  // collection pilot:currency reads. Two real, disconnected pilot-record
  // stores exist in this codebase today; this engine uses each for the
  // concern it actually backs (see crewQualsEngine.js header).
  const logEntriesSnap = await db.collection("logbooks").doc(pilotUserId).collection("entries").get();
  const logEntries = logEntriesSnap.docs.map((d) => d.data());
  const dutyStatus = computeDutyStatus(dutyPeriods, logEntries, activeDuty);

  return evaluateCrewMember({ pilotUserId, role, currency, dutyStatus, effectiveLimits });
}

async function logCrewAccess(db, { requestingUid, tenantId, requestId, crewUids }) {
  if (!crewUids.length) return;
  await db.collection("crewDataAccessLog").add({
    requestingUid,
    tenantId: tenantId || null,
    requestId: requestId || null,
    crewUidsAccessed: crewUids,
    purpose: "dispatch_verify_trip",
    accessedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * @param {Object} opts
 * @param {string} opts.kind — "initial" | "revalidation"
 * @param {string} opts.scopeId
 * @param {string} opts.tenantId
 * @param {string} opts.requestId
 * @param {string} opts.requestingUid
 * @param {string} opts.tailNumber
 * @param {string} opts.destinationIcao
 * @param {string} [opts.alternateIcao] — if omitted, top alternate recommendation is used
 * @param {boolean} [opts.requiresIfr]
 * @param {number} [opts.minRunwayFt]
 * @param {number} [opts.aircraftRangeNm]
 * @param {Array<{uid:string, role:string}>} opts.crew
 */
async function runVerification(opts) {
  const db = getDb();
  const { kind, scopeId, tenantId, requestId, requestingUid, tailNumber, destinationIcao, requiresIfr, minRunwayFt, aircraftRangeNm } = opts;
  const crew = Array.isArray(opts.crew) ? opts.crew.filter((c) => c && c.uid) : [];

  const [aircraft, alternates] = await Promise.all([
    checkAircraft(db, scopeId, tailNumber),
    selectAlternates({ destinationIcao, requiresIfr, minRunwayFt, aircraftRangeNm }),
  ]);
  const alternateIcao = opts.alternateIcao || (alternates.recommended && alternates.recommended.icao) || null;

  const [weather, crewResults] = await Promise.all([
    checkWeather(destinationIcao, alternateIcao),
    Promise.all(crew.map((c) => checkOneCrewMember(db, { pilotUserId: c.uid, role: c.role, tenantId }))),
  ]);

  await logCrewAccess(db, { requestingUid, tenantId, requestId, crewUids: crew.map((c) => c.uid) });

  const blockingItems = [];
  if (aircraft.checked && aircraft.found === false) blockingItems.push(`Aircraft: ${tailNumber} not on file`);
  if (aircraft.airworthiness && aircraft.airworthiness.status === "RED") blockingItems.push(`Aircraft: ${tailNumber} NOT AIRWORTHY`);
  if (!alternates.ok || !alternates.recommended) blockingItems.push(`Alternate: ${alternates.message || alternates.error || "no suitable alternate found"}`);
  for (const cr of crewResults) {
    if (!cr.cleared) blockingItems.push(`Crew (${cr.pilotUserId}): ${cr.blockingItems.join("; ")}`);
  }
  if (weather.checked && Array.isArray(weather.metars)) {
    const lifr = weather.metars.find((m) => m.flightCategory === "LIFR");
    if (lifr) blockingItems.push(`Weather: ${lifr.icao} reporting LIFR`);
  }

  const snapshot = {
    kind, // "initial" | "revalidation"
    requestId,
    scopeId,
    tenantId: tenantId || null,
    tailNumber: tailNumber || null,
    destinationIcao: destinationIcao || null,
    alternateIcao,
    requiresIfr: !!requiresIfr,
    aircraft,
    alternates,
    weather,
    crew: crewResults,
    blockingItems,
    releaseRecommendation: blockingItems.length === 0 ? "CLEARED" : "BLOCKED",
    computedAt: admin.firestore.FieldValue.serverTimestamp(),
    computedByUid: requestingUid,
  };

  let verificationId = null;
  if (requestId && scopeId) {
    const ref = db.collection("dispatchTripRequests").doc(scopeId).collection("requests").doc(requestId)
      .collection("verifications").doc();
    await ref.set(snapshot);
    verificationId = ref.id;
  }

  return { ok: true, verificationId, ...snapshot, computedAt: new Date().toISOString() };
}

/**
 * Re-validation pass — CODEX 89 §4 step 3. Re-runs the SAME checks against
 * the final, locked combined selection, then diffs against the prior
 * ("initial") snapshot so drift between the parallel checks is visible
 * rather than silently assumed away. Does not itself decide accept/reject —
 * it hands the dispatcher (via the accept screen) an honest, current
 * answer plus what changed since the first pass.
 */
async function runRevalidation(opts, priorSnapshot) {
  const fresh = await runVerification({ ...opts, kind: "revalidation" });

  const drift = [];
  if (priorSnapshot) {
    if (priorSnapshot.tailNumber !== fresh.tailNumber) drift.push(`Tail number changed: ${priorSnapshot.tailNumber} → ${fresh.tailNumber}`);
    if (priorSnapshot.alternateIcao !== fresh.alternateIcao) drift.push(`Alternate changed: ${priorSnapshot.alternateIcao} → ${fresh.alternateIcao}`);
    const priorBlocking = new Set(priorSnapshot.blockingItems || []);
    const freshBlocking = new Set(fresh.blockingItems || []);
    for (const item of freshBlocking) if (!priorBlocking.has(item)) drift.push(`New since initial check: ${item}`);
    for (const item of priorBlocking) if (!freshBlocking.has(item)) drift.push(`Resolved since initial check: ${item}`);
  } else {
    drift.push("No prior verification on file to compare against — this is being treated as a first pass, not a re-validation.");
  }

  return { ...fresh, drift };
}

module.exports = { runVerification, runRevalidation };
