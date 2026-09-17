"use strict";

/**
 * fratScoring.js — Flight Risk Assessment Tool (FRAT) scoring.
 *
 * 2026-09-15 — replaces the fabricated static "FRAT score 8/50 · Low Risk"
 * fixture that used to render unconditionally on the Preflight tab (see
 * aviationCanvasData.js) with a real, computed score. Sean's directive:
 * this must be grounded in a real, citable source — not invented — because
 * it's a go/no-go safety input for a working Part 135 pilot.
 *
 * BASE MODEL — real, cited, public domain:
 * The FAA's General Aviation Joint Steering Committee publishes an example
 * FRAT (Safety Enhancement Topic SE 42), built on FAA Advisory Circular
 * AC 120-92A/B (SMS for Aviation Service Providers), FAA InFO 07015, and the
 * Risk Management Handbook (FAA-H-8083-2, Ch 4-2). It follows the PAVE
 * framework (Pilot / Aircraft / enVironment / External pressures). Its
 * published example form's point values (reused verbatim below for the
 * self-report items):
 *   How the day's going:  great day = 0        | one thing after another = 3
 *   Day or night:         day = 1              | night = 3
 *   Planning — rushed?:   no hurry = 0         | rush to get off ground = 3
 *   Used charts/computer: yes = 0              | no = 3
 *   Verified W&B:         yes = 0              | no = 3
 *   Evaluated performance:yes = 0              | no = 3
 *   Briefed passengers:   yes = 0              | no = 2
 * (Self-report max: 20. The FAA sample's "Sleep" and "Weather" self-report
 * items are NOT reused — see below, both are replaced with real data.)
 *
 * REAL-DATA REPLACEMENTS (not FAA self-report items — computed here):
 *   - Rest/duty -> dutyTimeTracker.computeDutyStatus() (real FAR 135.267
 *     rest/duty/flight-hour tracking, already built and used elsewhere in
 *     this codebase for crew currency checks).
 *   - Weather   -> live METAR flight category from aviationweather.gov
 *     (services/aviation/weather.js), scored against the FAA sample's own
 *     real thresholds (VFR/MVFR/IMC), just sourced live instead of asked
 *     as a subjective question.
 *
 * SOCIII-DESIGNED EXTENSION (NOT an FAA-published number — flagged here so
 * nobody downstream mistakes this for cited regulation, same distinction
 * this codebase already draws for QRH content "retrieved, never generated"):
 *   - MEL burden -> real open (status: "deferred") squawks for the specific
 *     tail being flown. Scored NON-LINEARLY per Sean's own aviation
 *     judgment: multiple simultaneous deferred items can jointly eliminate
 *     a redundancy path that no single item removes alone, so risk
 *     compounds rather than adds. The curve below (MEL_CURVE) is SOCIII's
 *     own heuristic, not a government number.
 *
 * HARD-STOP OVERRIDES: a real regulatory violation (rest < 10 hrs per
 * 135.267(b), or 14/24hr duty or 8/24hr flight-time limit reached) is not a
 * "risk factor" to be averaged against a calm day and good weather — it
 * forces the whole result to RED/NO-GO regardless of the numeric total.
 *
 * Bands: the FAA sample's own gradient concept (green/yellow/orange/red) is
 * kept, but its raw cut points (0-10/10-20/20-30/30+) were calibrated for
 * its own ~30-40pt self-report-only scale. Our non-MEL max is 20 (self
 * report) + 4 (weather) + 6 (rest/duty) = 30 — almost identical in scale —
 * so the same proportional cut points are reused for the non-MEL portion:
 * 0-9 green, 10-19 yellow, 20-29 orange, 30+ red. MEL points are ADDED on
 * top and are deliberately allowed to push a score into red on their own
 * (2+ open MELs alone can do it) — that's the compounding effect working
 * as designed, not a bug in the calibration.
 */

const MS_PER_HOUR = 3600000;

// ---- Self-report PAVE items (real FAA sample values, reused verbatim) ----
const SELF_REPORT_POINTS = {
  // howDayGoing and planningRushed removed 2026-09-17 (Sean, live-testing
  // the real build) — subjective mood/rushed self-report questions, not
  // useful. Self-report max dropped from 20 to 14, non-MEL max from 30 to
  // 24 — the calibrated band cuts below (0-9/10-19/20-29) were proportioned
  // to the old 30pt scale and may want revisiting now that the ceiling
  // moved, but that's a real calibration call, not something to invent here.
  dayOrNight: { day: 1, night: 3 },
  usedChartsOrComputer: { yes: 0, no: 3 },
  verifiedWeightBalance: { yes: 0, no: 3 },
  evaluatedPerformance: { yes: 0, no: 3 },
  briefedPassengers: { yes: 0, no: 2 },
};

function scoreSelfReport(input = {}) {
  const items = [];
  let total = 0;

  const add = (key, label, value, pointsMap, yesNo) => {
    const pts = pointsMap[value] ?? pointsMap[value ? "yes" : "no"] ?? 0;
    total += pts;
    items.push({ key, label, value, points: pts, source: "self-report (FAA SE-42 sample)" });
  };

  add("dayOrNight", "Day or night", input.dayOrNight === "night" ? "night" : "day",
    SELF_REPORT_POINTS.dayOrNight);
  add("usedChartsOrComputer", "Used charts/computer for planning?", input.usedChartsOrComputer === false ? "no" : "yes",
    SELF_REPORT_POINTS.usedChartsOrComputer);
  add("verifiedWeightBalance", "Verified weight & balance?", input.verifiedWeightBalance === false ? "no" : "yes",
    SELF_REPORT_POINTS.verifiedWeightBalance);
  add("evaluatedPerformance", "Evaluated performance?", input.evaluatedPerformance === false ? "no" : "yes",
    SELF_REPORT_POINTS.evaluatedPerformance);
  add("briefedPassengers", "Briefed passengers?", input.briefedPassengers === false ? "no" : "yes",
    SELF_REPORT_POINTS.briefedPassengers);

  return { total, items };
}

// ---- Rest/duty — real FAR 135.267 data, not self-report ----
function scoreRestDuty(dutyStatus) {
  if (!dutyStatus) {
    return {
      points: 2,
      hardStop: false,
      reason: null,
      detail: "No duty-period data on file — cannot verify rest. Treated as an unknown, not assumed safe.",
      source: "dutyTimeTracker.computeDutyStatus (no data)",
    };
  }
  const byId = Object.fromEntries((dutyStatus.limits || []).map((l) => [l.id, l]));
  const rest = byId.rest;
  const duty24 = byId.duty_24h;
  const flight24 = byId.flight_24h;

  if (rest && rest.status === "VIOLATION") {
    return {
      points: 6,
      hardStop: true,
      reason: `Rest requirement not met: ${rest.used} hrs (minimum 10 required per 135.267(b))`,
      detail: "Regulatory violation — not a soft risk factor.",
      source: "dutyTimeTracker.computeDutyStatus (135.267(b))",
    };
  }
  if (duty24 && duty24.status === "LIMIT") {
    return {
      points: 6,
      hardStop: true,
      reason: `Duty time limit reached: ${duty24.used}/${duty24.limit} hrs (135.267(b))`,
      detail: "Regulatory violation — not a soft risk factor.",
      source: "dutyTimeTracker.computeDutyStatus (135.267(b))",
    };
  }
  if (flight24 && flight24.status === "LIMIT") {
    return {
      points: 6,
      hardStop: true,
      reason: `Flight time limit reached: ${flight24.used}/${flight24.limit} hrs (135.267(a))`,
      detail: "Regulatory violation — not a soft risk factor.",
      source: "dutyTimeTracker.computeDutyStatus (135.267(a))",
    };
  }

  const caution = (duty24 && duty24.status === "CAUTION") || (flight24 && flight24.status === "CAUTION");
  if (caution) {
    return {
      points: 2,
      hardStop: false,
      reason: null,
      detail: "Approaching a 135.267 duty or flight-time limit — not yet a violation.",
      source: "dutyTimeTracker.computeDutyStatus",
    };
  }
  if (rest && rest.status === "UNKNOWN") {
    return {
      points: 2,
      hardStop: false,
      reason: null,
      detail: "No prior duty period on file to compute rest from.",
      source: "dutyTimeTracker.computeDutyStatus",
    };
  }
  return {
    points: 0,
    hardStop: false,
    reason: null,
    detail: rest ? `Rest OK: ${rest.used} hrs since last duty period.` : "Duty/rest status OK.",
    source: "dutyTimeTracker.computeDutyStatus",
  };
}

// ---- Weather — real METAR flight category, FAA sample's own thresholds ----
// VFR (>5mi & 3,000ft ceiling) = 0, MVFR (3-5mi & 1,000-3,000ft) = 3,
// IFR/LIFR (below that) = 4 — the FAA SE-42 sample's own point values,
// just sourced from a live flight-category classification instead of a
// subjective checkbox.
function scoreWeatherStation(metar) {
  if (!metar || !metar.flightCategory) return { points: null, unavailable: true };
  const cat = String(metar.flightCategory).toUpperCase();
  if (cat === "VFR") return { points: 0, category: cat };
  if (cat === "MVFR") return { points: 3, category: cat };
  if (cat === "IFR" || cat === "LIFR") return { points: 4, category: cat };
  return { points: null, unavailable: true, category: cat };
}

function scoreWeather(metars) {
  const list = (metars || []).map((m) => ({ icao: m.icao, ...scoreWeatherStation(m) }));
  const known = list.filter((s) => !s.unavailable);
  if (!known.length) {
    return {
      points: 0,
      unavailable: true,
      stations: list,
      detail: "Live weather data unavailable — this category could not be scored. Score is a partial minimum, not a confirmed low-risk value.",
      source: "aviationweather.gov (unavailable)",
    };
  }
  // Score the worse of departure/destination, per standard FRAT practice
  // (a go/no-go decision has to account for the worst point on the route).
  const worst = known.reduce((a, b) => (b.points > a.points ? b : a));
  return {
    points: worst.points,
    unavailable: known.length < list.length,
    stations: list,
    detail: `Worst station: ${worst.icao || "?"} (${worst.category})`,
    source: "aviationweather.gov live METAR",
  };
}

// ---- MEL burden — SOCIII extension, non-linear, NOT an FAA number ----
// See file header. 0/1/2/3 base points below; 4+ escalates linearly from
// the 3-item value; any RED/YELLOW (near its own MEL deadline) item present
// multiplies the whole category 1.5x.
const MEL_CURVE = { 0: 0, 1: 2, 2: 7, 3: 15 };
function scoreMel(squawks, tailNumber) {
  const tail = String(tailNumber || "").toUpperCase();
  const deferred = (squawks || []).filter(
    (s) => s.status === "deferred" && String(s.tailNumber || "").toUpperCase() === tail
  );
  const count = deferred.length;
  const urgent = deferred.some((s) => s.computedStatus === "RED" || s.computedStatus === "YELLOW");
  let points = count <= 3 ? MEL_CURVE[count] : MEL_CURVE[3] + (count - 3) * 5;
  if (urgent) points = Math.round(points * 1.5);
  return {
    points,
    count,
    urgent,
    items: deferred.map((s) => ({
      category: s.category, melReference: s.melReference, description: s.description,
      computedStatus: s.computedStatus, daysRemaining: s.daysRemaining,
    })),
    detail: count === 0
      ? "No open MEL deferrals on this tail."
      : `${count} open MEL deferral(s)${urgent ? " — at least one approaching its own deadline" : ""}.`,
    source: "SOCIII heuristic (not an FAA-published value) — non-linear, see fratScoring.js header",
  };
}

// ---- Bands ----
function bandFor(nonMelPoints, melPoints) {
  const total = nonMelPoints + melPoints;
  let band;
  if (total >= 30) band = "RED";
  else if (total >= 20) band = "ORANGE";
  else if (total >= 10) band = "YELLOW";
  else band = "GREEN";
  return { total, band };
}

const BAND_LABEL = {
  GREEN: "Low Risk — Not Complex Flight",
  YELLOW: "Exercise Caution",
  ORANGE: "Area of Concern",
  RED: "No-Go / Endangerment",
};

/**
 * Compute a full FRAT score.
 * @param {Object} args
 * @param {Object} args.selfReport — self-report PAVE answers, see scoreSelfReport
 * @param {Object|null} args.dutyStatus — dutyTimeTracker.computeDutyStatus() output
 * @param {Array} args.metars — normalized METARs (weather.js normalizeMetar shape)
 * @param {Array} args.squawks — real squawks for the tenant/scope (mx:listSquawks shape)
 * @param {string} args.tailNumber
 */
function computeFrat({ selfReport, dutyStatus, metars, squawks, tailNumber }) {
  const self = scoreSelfReport(selfReport);
  const rest = scoreRestDuty(dutyStatus);
  const weather = scoreWeather(metars);
  const mel = scoreMel(squawks, tailNumber);

  const nonMelPoints = self.total + rest.points + weather.points;
  const { total, band: numericBand } = bandFor(nonMelPoints, mel.points);

  const hardStop = !!rest.hardStop;
  const band = hardStop ? "RED" : numericBand;

  return {
    band,
    bandLabel: BAND_LABEL[band],
    total,
    hardStop,
    hardStopReason: rest.reason || null,
    categories: {
      selfReport: { points: self.total, items: self.items },
      restDuty: rest,
      weather,
      mel,
    },
    computedAt: new Date().toISOString(),
    model: {
      base: "FAA GAJSC Safety Enhancement Topic SE 42 (AC 120-92A/B, InFO 07015, FAA-H-8083-2 Ch 4-2)",
      extensions: "Rest/duty and weather use live computed data in place of the FAA sample's self-report items; MEL burden is a SOCIII-designed non-linear addition not present in the FAA sample.",
    },
  };
}

// ---- Route handler — gathers real data, computes, persists, responds ----
const admin = require("firebase-admin");

function getDb() {
  return admin.firestore();
}

function resolveScopeId({ userId, tenantId }) {
  return tenantId || userId;
}

/**
 * POST /v1/aviation:frat:compute
 * Body: { tailNumber, depIcao, arrIcao, date?, flightRules?, etd?, altitude?, route?, selfReport?: {...} }
 *
 * Server computes weather/rest-duty/MEL itself from real data — client-
 * supplied weather or MEL data is never trusted for a safety-relevant score
 * (only the self-report PAVE items, which are inherently self-reported).
 */
async function handleComputeFrat(req, res, ctx) {
  const body = req.body || {};
  const tailNumber = String(body.tailNumber || "").trim().toUpperCase();
  const depIcao = String(body.depIcao || "").trim().toUpperCase();
  const arrIcao = String(body.arrIcao || "").trim().toUpperCase();
  if (!tailNumber || !depIcao || !arrIcao) {
    return res.status(400).json({ ok: false, error: "tailNumber, depIcao, and arrIcao are required" });
  }

  const db = getDb();
  const scopeId = resolveScopeId(ctx);

  const [dutyPeriodsSnap, activeDutySnap, logEntriesSnap, squawksSnap, weatherResult] = await Promise.all([
    db.collection("dutyPeriods").doc(ctx.userId).collection("periods").orderBy("dutyStartZulu", "desc").limit(50).get(),
    db.collection("dutyPeriods").doc(ctx.userId).collection("periods").where("dutyEndZulu", "==", null).limit(1).get(),
    db.collection("logbooks").doc(ctx.userId).collection("entries").get(),
    db.collection("aircraftRecords").doc(scopeId).collection("aircraft").doc(tailNumber)
      .collection("squawks").where("status", "==", "deferred").get()
      .catch(() => ({ docs: [] })), // no aircraft record on file yet — treat as zero MELs, not an error
    require("./weather").getWeather({ ids: `${depIcao},${arrIcao}` }).catch((e) => ({ error: e.message, metars: [] })),
  ]);

  const { computeDutyStatus } = require("../copilot/logic/dutyTimeTracker");
  const dutyPeriods = dutyPeriodsSnap.docs.map((d) => d.data());
  const activeDuty = activeDutySnap.empty ? null : activeDutySnap.docs[0].data();
  const logEntries = logEntriesSnap.docs.map((d) => d.data());
  const dutyStatus = computeDutyStatus(dutyPeriods, logEntries, activeDuty);

  const squawks = squawksSnap.docs.map((d) => ({ tailNumber, ...d.data() }));

  const result = computeFrat({
    selfReport: body.selfReport || {},
    dutyStatus,
    metars: weatherResult.metars || [],
    squawks,
    tailNumber,
  });
  if (weatherResult.error) {
    result.categories.weather.unavailable = true;
    result.categories.weather.detail = `Live weather fetch failed: ${weatherResult.error}`;
  }

  // Append-only — this is a new, immutable record of a specific preflight
  // risk decision, never an overwrite of a prior one (CLAUDE.md invariant).
  const docRef = await db.collection("flightRiskAssessments").doc(scopeId).collection("assessments").add({
    userId: ctx.userId,
    tenantId: ctx.tenantId || null,
    tailNumber,
    depIcao,
    arrIcao,
    date: body.date || null,
    // Real flight-plan fields, added 2026-09-17 replacing the low-value
    // "how's the day going"/"rushed" self-report questions — not scored,
    // just persisted as the actual plan for this flight.
    flightRules: body.flightRules || null, // "IFR" | "VFR"
    etd: body.etd || null,
    altitude: body.altitude || null,
    route: body.route || null,
    result,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return res.json({ ok: true, assessmentId: docRef.id, ...result });
}

/**
 * GET /v1/aviation:frat:latest?tailNumber=N701AA (tailNumber optional)
 * Returns the most recent assessment for this scope, for the Preflight tab.
 */
async function handleGetLatestFrat(req, res, ctx) {
  const db = getDb();
  const scopeId = resolveScopeId(ctx);
  const snap = await db.collection("flightRiskAssessments").doc(scopeId).collection("assessments")
    .orderBy("createdAt", "desc").limit(1).get();
  if (snap.empty) return res.json({ ok: true, assessment: null });
  const doc = snap.docs[0];
  return res.json({ ok: true, assessment: { assessmentId: doc.id, ...doc.data() } });
}

module.exports = {
  computeFrat, scoreSelfReport, scoreRestDuty, scoreWeather, scoreMel,
  handleComputeFrat, handleGetLatestFrat,
};
