"use strict";

/**
 * aircraftMatching.js — mission request intake + aircraft-type/capability
 * matching against the REAL fleet on file (aircraftRecords/{scopeId}/aircraft),
 * not a static form.
 *
 * Sean's spec (2026-09-05, MX/Dispatch deep-dive): "a way to ingest a mission
 * request and match it to the right aircraft in the fleet by type/capability
 * — e.g. 'need a C172 for an instrument-rating training flight,' 'need a
 * King Air 350 for a medevac flight,' 'need a 777 for a freight run.'"
 *
 * This is genuinely computed against whatever aircraft the caller has
 * actually added via /v1/mx:upsertAircraft (services/mx/aircraftRecords.js) —
 * including each tail's real computed airworthiness (computeAirworthiness)
 * and its optional capabilities profile (category/seats/ifrCertified/
 * cargoCapacityLbs/missionCapabilities). If the fleet on file doesn't
 * contain a matching aircraft (e.g. this demo tenant only has PC-12s and
 * someone asks for a 777), the honest answer is "no match" — this never
 * fabricates a fleet aircraft that doesn't exist on record.
 */

const admin = require("firebase-admin");
const { computeAirworthiness } = require("../mx/airworthinessTracker");
const { resolveScopeId } = require("../mx/aircraftRecords");

function getDb() {
  return admin.firestore();
}

// Loose, case-insensitive alias table so "C172", "Cessna 172", "172" all hit
// the same aircraft, and "King Air 350"/"B350"/"BE-350" all hit a King Air
// 350 tail. This is intentionally small and additive — an unrecognized
// requested type just falls through to a plain substring match against
// whatever the aircraft's own `type` field says, which is honest (no match
// found) rather than guessing.
const TYPE_ALIASES = [
  { canonical: "c172", pattern: /\b(c-?172|cessna\s*172|172)\b/i },
  { canonical: "c152", pattern: /\b(c-?152|cessna\s*152|152)\b/i },
  { canonical: "pc12", pattern: /\b(pc-?12|pilatus\s*pc-?12)\b/i },
  { canonical: "kingair350", pattern: /\b(king\s*air\s*350|b-?350|be-?350)\b/i },
  { canonical: "kingair200", pattern: /\b(king\s*air\s*200|b-?200|be-?200)\b/i },
  { canonical: "kingairc90", pattern: /\b(king\s*air\s*c-?90|c-?90gtx?)\b/i },
  { canonical: "caravan208", pattern: /\b(caravan|208b?)\b/i },
  { canonical: "r44", pattern: /\b(r-?44|robinson\s*r-?44)\b/i },
  { canonical: "as350", pattern: /\b(as-?350|h-?125|astar)\b/i },
  { canonical: "b737", pattern: /\b(737|boeing\s*737)\b/i },
  { canonical: "b777", pattern: /\b(777|boeing\s*777)\b/i },
  { canonical: "a320", pattern: /\b(a-?320|airbus\s*a-?320)\b/i },
  { canonical: "be58", pattern: /\b(be-?58|baron)\b/i },
];

function canonicalizeType(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const hit = TYPE_ALIASES.find(a => a.pattern.test(s));
  return hit ? hit.canonical : s.toLowerCase();
}

// Mission type → implied capability requirement, so "medevac flight" maps to
// aircraft.capabilities.missionCapabilities containing "medevac" without the
// caller having to know our internal capability vocabulary. Falls through
// harmlessly (no implied requirement) for anything not in this table —
// missionType is still recorded on the request either way.
const MISSION_TYPE_HINTS = {
  medevac: ["medevac", "air-ambulance"],
  training: ["training", "instruction"],
  charter: ["charter"],
  cargo: ["cargo", "freight"],
  freight: ["cargo", "freight"],
  tour: ["tour"],
};

/**
 * Score one computed-airworthiness aircraft record against a mission
 * request. Returns null if the aircraft is categorically disqualified
 * (wrong type/category with no match at all); otherwise a candidate object
 * with a numeric score and human-readable reasons for both matches and
 * gaps, so a dispatcher sees WHY something ranked where it did — never a
 * bare score with no explanation.
 */
function scoreCandidate(aircraft, criteria) {
  const reasonsFor = [];
  const reasonsAgainst = [];
  let score = 0;
  let disqualified = false;

  const cap = aircraft.capabilities || {};
  const requestedType = criteria.requiredType ? canonicalizeType(criteria.requiredType) : null;
  const aircraftType = aircraft.type ? canonicalizeType(aircraft.type) : null;

  if (requestedType) {
    if (aircraftType && aircraftType === requestedType) {
      score += 50;
      reasonsFor.push(`Type match: ${aircraft.type}`);
    } else if (aircraft.type && String(aircraft.type).toLowerCase().includes(String(criteria.requiredType).toLowerCase())) {
      score += 35;
      reasonsFor.push(`Type contains "${criteria.requiredType}": ${aircraft.type}`);
    } else if (cap.category && requestedType && cap.category.toLowerCase() === requestedType) {
      score += 20;
      reasonsFor.push(`Category match: ${cap.category}`);
    } else {
      disqualified = true;
      reasonsAgainst.push(`Requested "${criteria.requiredType}" — this tail is ${aircraft.type || "an unspecified type"}`);
    }
  }

  if (!disqualified && criteria.category) {
    if (cap.category && cap.category.toLowerCase() === String(criteria.category).toLowerCase()) {
      score += 15;
      reasonsFor.push(`Category: ${cap.category}`);
    } else if (cap.category) {
      reasonsAgainst.push(`Requested category "${criteria.category}", this tail is "${cap.category}"`);
    } else {
      reasonsAgainst.push(`Requested category "${criteria.category}" — no category on file for this tail`);
    }
  }

  const missionHints = MISSION_TYPE_HINTS[String(criteria.missionType || "").toLowerCase()] || [];
  if (missionHints.length) {
    const has = (cap.missionCapabilities || []).some(m => missionHints.includes(m));
    if (has) { score += 20; reasonsFor.push(`Configured for ${criteria.missionType}`); }
    else reasonsAgainst.push(`Not documented as configured for ${criteria.missionType} — verify with MX before assigning`);
  }

  if (criteria.minSeats != null) {
    if (cap.seats != null) {
      if (cap.seats >= Number(criteria.minSeats)) { score += 10; reasonsFor.push(`${cap.seats} seats (need ${criteria.minSeats})`); }
      else { disqualified = true; reasonsAgainst.push(`Only ${cap.seats} seats — need ${criteria.minSeats}`); }
    } else {
      reasonsAgainst.push(`Seat count not on file — cannot confirm ${criteria.minSeats}-seat requirement`);
    }
  }

  if (criteria.requiresIfr) {
    if (cap.ifrCertified === true) { score += 10; reasonsFor.push("IFR certified"); }
    else if (cap.ifrCertified === false) { disqualified = true; reasonsAgainst.push("Not IFR certified"); }
    else reasonsAgainst.push("IFR certification not on file — cannot confirm");
  }

  if (criteria.cargoCapacityLbs != null) {
    if (cap.cargoCapacityLbs != null) {
      if (cap.cargoCapacityLbs >= Number(criteria.cargoCapacityLbs)) { score += 10; reasonsFor.push(`${cap.cargoCapacityLbs} lbs cargo capacity (need ${criteria.cargoCapacityLbs})`); }
      else { disqualified = true; reasonsAgainst.push(`Only ${cap.cargoCapacityLbs} lbs cargo capacity — need ${criteria.cargoCapacityLbs}`); }
    } else {
      reasonsAgainst.push(`Cargo capacity not on file — cannot confirm ${criteria.cargoCapacityLbs} lb requirement`);
    }
  }

  // Airworthiness is never a hard disqualifier here — a RED tail still
  // shows up (ranked last) so the dispatcher can see it exists and why it's
  // currently unavailable, rather than it silently vanishing from the list.
  if (aircraft.status === "GREEN") { score += 5; reasonsFor.push("Airworthy — no open blocking items"); }
  else if (aircraft.status === "YELLOW") { score += 2; reasonsFor.push("Airworthy — item(s) approaching a limit"); }
  else if (aircraft.status === "RED") { score -= 100; reasonsAgainst.push(`NOT AIRWORTHY per tracked records: ${(aircraft.blockingItems || []).join("; ") || "see MX record"}`); }
  else if (aircraft.status === "UNVERIFIED") { score -= 10; reasonsAgainst.push("Airworthiness UNVERIFIED — required records missing"); }

  if (disqualified) return null;

  return {
    tailNumber: aircraft.tailNumber,
    type: aircraft.type || null,
    category: cap.category || null,
    airworthinessStatus: aircraft.status,
    score,
    reasonsFor,
    reasonsAgainst,
  };
}

/**
 * Pure matching function — exported separately so it's independently
 * testable without Firestore.
 */
function matchAircraftToMission(criteria, fleet) {
  const scored = (fleet || [])
    .map(a => scoreCandidate(a, criteria))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * POST /v1/dispatch:matchAircraft
 * Body: { requiredType?, category?, missionType?, minSeats?, requiresIfr?,
 *         cargoCapacityLbs? }
 */
async function handleMatchAircraft(req, res, ctx) {
  const db = getDb();
  const body = req.body || {};
  const criteria = {
    requiredType: body.requiredType ? String(body.requiredType).slice(0, 100) : null,
    category: body.category ? String(body.category).slice(0, 60) : null,
    missionType: body.missionType ? String(body.missionType).slice(0, 60) : null,
    minSeats: body.minSeats != null ? Number(body.minSeats) : null,
    requiresIfr: body.requiresIfr === true,
    cargoCapacityLbs: body.cargoCapacityLbs != null ? Number(body.cargoCapacityLbs) : null,
  };

  const scopeId = resolveScopeId(ctx);
  const fleetSnap = await db.collection("aircraftRecords").doc(scopeId).collection("aircraft").get();

  if (fleetSnap.empty) {
    return res.json({
      ok: true,
      criteria,
      candidates: [],
      fleetSize: 0,
      message: "No aircraft on file for this workspace — add tails via MX before Dispatch can match a mission to one.",
    });
  }

  const fleet = await Promise.all(fleetSnap.docs.map(async (d) => {
    const aircraft = d.data();
    const squawksSnap = await d.ref.collection("squawks").get();
    const squawks = squawksSnap.docs.map(s => ({ id: s.id, ...s.data() }));
    return computeAirworthiness(aircraft, squawks);
  }));

  const candidates = matchAircraftToMission(criteria, fleet);

  return res.json({
    ok: true,
    criteria,
    candidates,
    fleetSize: fleet.length,
    message: candidates.length
      ? null
      : `No aircraft on file (${fleet.length} tail(s) in fleet) match this request — see fleet types/capabilities in MX before assuming coverage.`,
  });
}

module.exports = { matchAircraftToMission, scoreCandidate, canonicalizeType, handleMatchAircraft };
