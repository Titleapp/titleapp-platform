/**
 * aviationPerformance.js — Takeoff/landing distance planning estimate.
 *
 * CODEX S52.67 gap #1: RAAS rules (av_015_weight_balance_v0.json,
 * av_p03_my_aircraft_v0.json, av_p05_flight_planning_v0.json) already
 * instruct a worker to warn about high density altitude / short runways,
 * but nothing calculated an actual number. This module does — with an
 * explicit, documented boundary between what's real physics/citable
 * industry rule-of-thumb (safe to compute for any aircraft) and what
 * would require real per-aircraft POH chart data (not fabricated here).
 *
 * Two independent pieces:
 *
 * 1. Density altitude from pressure altitude + OAT — the ICAO/FAA standard
 *    atmosphere formula. This is universal physics, not aircraft-specific,
 *    and is exact (no aircraft data needed at all).
 *
 * 2. Distance estimate — takes an aircraft's real, sourced sea-level-ISA
 *    baseline distance (see aircraftTypeProfiles.js `performance` block)
 *    and adjusts it using GENERIC, FAA-sourced planning rules of thumb:
 *      - Density altitude: FAA-P-8740-02 ("Density Altitude") — add 10% to
 *        takeoff distance per 1,000ft density altitude for constant-speed
 *        props (PC-12/47E's Hartzell prop is constant-speed), up to 8,000ft
 *        DA, then 15%/1,000ft above that.
 *      - Wind: commonly-cited generalist planning rule — each knot of
 *        headwind component reduces distance ~1%; each knot of tailwind
 *        component increases it ~5% (tailwind penalty is 3-5x steeper than
 *        headwind benefit — well-documented asymmetry, e.g.
 *        experimentalaircraft.info/flight-planning/aircraft-performance).
 *    These rules are NOT specific to any one aircraft type's real POH
 *    performance curve — they're the same generic guidance a student pilot
 *    ground-school studies. Applied to a turboprop with a flat-rated
 *    engine (PT6A, as in the PC-12/47E), this is expected to OVER-estimate
 *    the density-altitude penalty (flat-rated engines hold rated power
 *    across a wider altitude/temperature band than the naturally-aspirated
 *    piston engines this rule was written for) — i.e. the estimate should
 *    run conservative, not optimistic. This is a deliberate, stated
 *    property, not an oversight — see PERFORMANCE_DISCLAIMER.
 *
 * If an aircraft profile has no sourced baseline distance for a given
 * phase (takeoff/landing), this module returns `null` for that phase
 * rather than inventing one. Never silently substitutes a default.
 */

const FT_PER_M = 3.28084;
const HG_PER_HPA = 0.02953;

/**
 * Pressure altitude from field elevation + altimeter setting (inHg).
 * PA = field elevation + (29.92 - altimeter setting) * 1000
 */
export function pressureAltitudeFt(fieldElevationFt, altimeterSettingInHg) {
  if (!Number.isFinite(fieldElevationFt) || !Number.isFinite(altimeterSettingInHg)) return null;
  return fieldElevationFt + (29.92 - altimeterSettingInHg) * 1000;
}

/**
 * Density altitude from pressure altitude + outside air temp (°C).
 * Standard formula (FAA-P-8740-2, AC 00-6B): DA = PA + 120 * (OAT - ISA temp at PA)
 * ISA temp at a given pressure altitude = 15 - (2 * PA_thousands_ft), °C.
 */
export function densityAltitudeFt(pressureAltFt, oatC) {
  if (!Number.isFinite(pressureAltFt) || !Number.isFinite(oatC)) return null;
  const isaTempC = 15 - 2 * (pressureAltFt / 1000);
  return pressureAltFt + 120 * (oatC - isaTempC);
}

// FAA-P-8740-02 rule of thumb for constant-speed props: 10%/1000ft DA up to
// 8,000ft, then 15%/1000ft above that. (Fixed-pitch prop figure — 15%/1000ft
// throughout — not used here; PC-12/47E has a constant-speed prop.)
function densityAltitudeDistanceFactor(densityAltFt) {
  const da = Math.max(0, densityAltFt || 0);
  const first8k = Math.min(da, 8000);
  const above8k = Math.max(0, da - 8000);
  const pctIncrease = (first8k / 1000) * 10 + (above8k / 1000) * 15;
  return 1 + pctIncrease / 100;
}

// Generic wind rule of thumb: ~1%/kt headwind benefit, ~5%/kt tailwind
// penalty (asymmetric — see module doc). windComponentKt: positive = headwind,
// negative = tailwind.
function windDistanceFactor(windComponentKt) {
  const w = Number.isFinite(windComponentKt) ? windComponentKt : 0;
  if (w >= 0) {
    return Math.max(0.3, 1 - w * 0.01); // floor so a huge headwind can't zero out distance
  }
  return 1 + Math.abs(w) * 0.05;
}

/**
 * Estimate a distance (takeoff or landing) for a given aircraft profile.
 * @param {object} profile - an AIRCRAFT_TYPE_PROFILES entry (from getAircraftTypeProfile)
 * @param {"takeoff"|"landing"} phase
 * @param {number} densityAltFt
 * @param {number} windComponentKt - positive = headwind, negative = tailwind
 * @returns {{ ok: true, baselineFt: number, estimatedFt: number, daFactor: number, windFactor: number, sourceNote: string } | { ok: false, reason: string }}
 */
export function estimateDistance({ profile, phase, densityAltFt, windComponentKt }) {
  if (!profile || !profile.performance) {
    return { ok: false, reason: "No performance data sourced for this aircraft type yet." };
  }
  const baselineFt = phase === "landing"
    ? profile.performance.landingDistanceSeaLevelIsaFt
    : profile.performance.takeoffDistanceSeaLevelIsaFt;
  if (!Number.isFinite(baselineFt)) {
    return { ok: false, reason: `No sourced sea-level-ISA ${phase} distance for ${profile.label || "this aircraft"} yet.` };
  }
  if (!Number.isFinite(densityAltFt)) {
    return { ok: false, reason: "Enter field elevation, altimeter setting, and OAT to compute density altitude." };
  }
  const daFactor = densityAltitudeDistanceFactor(densityAltFt);
  const windFactor = windDistanceFactor(windComponentKt);
  const estimatedFt = Math.round(baselineFt * daFactor * windFactor);
  return {
    ok: true,
    baselineFt,
    estimatedFt,
    daFactor,
    windFactor,
    sourceNote: profile.performance._perfSourceNote || null,
  };
}

/**
 * Headwind/tailwind component along the runway heading.
 * @param {number} windDirDeg - wind FROM direction, degrees true/magnetic (match runwayHeadingDeg's reference)
 * @param {number} windSpeedKt
 * @param {number} runwayHeadingDeg
 * @returns {number} positive = headwind, negative = tailwind
 */
export function windComponentAlongRunway(windDirDeg, windSpeedKt, runwayHeadingDeg) {
  if (![windDirDeg, windSpeedKt, runwayHeadingDeg].every(Number.isFinite)) return 0;
  const angleRad = ((windDirDeg - runwayHeadingDeg) * Math.PI) / 180;
  return windSpeedKt * Math.cos(angleRad);
}
