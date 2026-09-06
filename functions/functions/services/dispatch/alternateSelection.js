"use strict";

/**
 * alternateSelection.js — CODEX 89 §4 step 2b: alternate-airport selection
 * as its own pipeline step with its own failure modes, pulled out of the
 * "weather" bucket per round-1 red-team point 3. A legal-but-operationally-
 * bad alternate (too far for the aircraft's real range, no hard-surface
 * runway long enough, or itself sitting in worse weather than the
 * destination) is a real failure mode — "no alternate on file" is not the
 * only way this step can go wrong.
 *
 * Real, live data sources, all already proven elsewhere in this codebase:
 *   - getAirportByIcao / getAirports (services/aviation/faaData.js) — FAA
 *     NASR airport point layer, spatially queried around the destination.
 *   - getRunways (same file) — FAA NASR runway pavement lengths.
 *   - getWeather (services/aviation/weather.js) — live METAR/TAF, AWC.
 *
 * What is NOT real yet, and is not faked here:
 *   - Per-approach instrument minimums (DA/MDA/visibility per procedure).
 *     Parsing real approach plates is a real, separate build. This module
 *     uses the METAR/TAF flightCategory (VFR/MVFR/IFR/LIFR) as a
 *     conservative proxy: LIFR disqualifies a candidate, IFR is flagged for
 *     dispatcher attention, MVFR/VFR pass cleanly. Documented explicitly in
 *     every response via `minimumsModel: "flight_category_proxy"` so a
 *     caller never mistakes this for real per-approach minimums.
 *   - Aircraft fuel range. No `rangeNm` field exists on the aircraft
 *     capability profile today (services/mx/aircraftRecords.js) — only
 *     category/seats/ifrCertified/cargoCapacityLbs/missionCapabilities. If
 *     the caller doesn't supply aircraftRangeNm, range is not silently
 *     assumed fine — every candidate is flagged "range not confirmed —
 *     verify manually against the assigned aircraft's real fuel range."
 */

const { getAirportByIcao, getAirports, getRunways } = require("../aviation/faaData");
const { getWeather } = require("../aviation/weather");

const EARTH_RADIUS_NM = 3440.065;

function haversineNm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_NM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// How many nearest candidates to actually fetch runway+weather detail for.
// Radius search can return dozens of airports; we don't want to fan out
// live FAA/AWC calls for all of them on every verification pass.
const MAX_DETAIL_CANDIDATES = 8;

/**
 * @param {Object} opts
 * @param {string} opts.destinationIcao
 * @param {number} [opts.searchRadiusNm=100]
 * @param {boolean} [opts.requiresIfr=false] — disqualify candidates with no instrument approach on file
 * @param {number} [opts.minRunwayFt] — assigned aircraft's real minimum landing-distance requirement, if known
 * @param {number} [opts.aircraftRangeNm] — assigned aircraft's real usable range, if known
 */
async function selectAlternates(opts) {
  const destinationIcao = String(opts.destinationIcao || "").trim().toUpperCase();
  if (!destinationIcao) return { ok: false, error: "destinationIcao required" };
  const searchRadiusNm = Math.min(Math.max(Number(opts.searchRadiusNm) || 100, 10), 200);
  const requiresIfr = opts.requiresIfr === true;
  const minRunwayFt = opts.minRunwayFt != null ? Number(opts.minRunwayFt) : null;
  const aircraftRangeNm = opts.aircraftRangeNm != null ? Number(opts.aircraftRangeNm) : null;

  const dest = await getAirportByIcao(destinationIcao);
  if (dest.error || dest.lat == null || dest.lon == null) {
    return { ok: false, error: dest.error || `Could not resolve coordinates for ${destinationIcao}` };
  }

  const nearby = await getAirports({ lat: dest.lat, lon: dest.lon, distNm: searchRadiusNm });
  if (nearby.error) return { ok: false, error: nearby.error };

  const withDistance = (nearby.airports || [])
    .filter((a) => a.icao && a.icao !== destinationIcao)
    .filter((a) => a.lat != null && a.lon != null)
    .map((a) => ({ ...a, distanceNm: Math.round(haversineNm(dest.lat, dest.lon, a.lat, a.lon) * 10) / 10 }))
    .sort((a, b) => a.distanceNm - b.distanceNm)
    .slice(0, MAX_DETAIL_CANDIDATES);

  const candidates = await Promise.all(withDistance.map(async (a) => {
    const reasonsFor = [];
    const reasonsAgainst = [];
    let disqualified = false;

    if (a.operStatus && String(a.operStatus).toUpperCase() !== "OPERATIONAL" && String(a.operStatus).toUpperCase() !== "O") {
      // NASR OPERSTATUS coding varies by extract; treat anything explicitly
      // non-operational as disqualifying, but don't disqualify on an absent
      // or unrecognized code — that's "unknown," not "closed."
      if (/CLOSED|ABANDON/i.test(String(a.operStatus))) {
        disqualified = true;
        reasonsAgainst.push(`Airport status on file: ${a.operStatus}`);
      }
    }

    if (a.privateUse) {
      disqualified = true;
      reasonsAgainst.push("Private-use airport — not available for this operation without prior arrangement");
    }

    if (requiresIfr && !a.hasApproaches) {
      disqualified = true;
      reasonsAgainst.push("No published instrument approach on file — required for an IFR alternate");
    } else if (a.hasApproaches) {
      reasonsFor.push("Instrument approach(es) on file");
    }

    if (disqualified) {
      return { icao: a.icao, name: a.name, distanceNm: a.distanceNm, disqualified: true, reasonsFor, reasonsAgainst };
    }

    const [runwayData, wx] = await Promise.all([
      getRunways({ icao: a.icao }).catch((e) => ({ error: e.message })),
      getWeather({ ids: a.icao, taf: true }).catch((e) => ({ error: e.message })),
    ]);

    let longestRunwayFt = null;
    if (!runwayData.error && Array.isArray(runwayData.runways) && runwayData.runways.length) {
      longestRunwayFt = runwayData.runways.reduce((max, r) => (r.lengthFt != null && r.lengthFt > max ? r.lengthFt : max), 0) || null;
    }
    if (longestRunwayFt != null) {
      if (minRunwayFt != null) {
        if (longestRunwayFt >= minRunwayFt) {
          reasonsFor.push(`Longest runway ${longestRunwayFt} ft (need ${minRunwayFt} ft)`);
        } else {
          disqualified = true;
          reasonsAgainst.push(`Longest runway only ${longestRunwayFt} ft — assigned aircraft needs ${minRunwayFt} ft`);
        }
      } else {
        reasonsAgainst.push(`Longest runway on file: ${longestRunwayFt} ft — aircraft's minimum landing distance not supplied, cannot confirm suitability`);
      }
    } else {
      reasonsAgainst.push("Runway length not on file — cannot confirm suitability");
    }

    let flightCategory = null;
    if (!wx.error && Array.isArray(wx.metars) && wx.metars.length) {
      flightCategory = wx.metars[0].flightCategory || null;
    }
    if (flightCategory === "LIFR") {
      disqualified = true;
      reasonsAgainst.push("Current METAR flight category LIFR at this alternate — below usable minimums (proxy check, not real per-approach minimums)");
    } else if (flightCategory === "IFR") {
      reasonsAgainst.push("Current METAR flight category IFR at this alternate — usable but marginal; verify against real approach minimums");
    } else if (flightCategory) {
      reasonsFor.push(`Current METAR flight category ${flightCategory}`);
    } else {
      reasonsAgainst.push("No current METAR for this alternate — weather not confirmed");
    }

    if (aircraftRangeNm != null) {
      // Conservative: only count 80% of stated range as usable to this
      // alternate, leaving margin for the original routing + reserves. This
      // is a deliberately simple placeholder, not a real fuel-planning
      // computation (no wind, no terrain routing, no reserve-fuel rule
      // cited) — flagged in the response, not asserted as authoritative.
      const usableRangeNm = aircraftRangeNm * 0.8;
      if (a.distanceNm <= usableRangeNm) {
        reasonsFor.push(`${a.distanceNm} nm from destination — within assigned aircraft's usable range`);
      } else {
        disqualified = true;
        reasonsAgainst.push(`${a.distanceNm} nm from destination — beyond assigned aircraft's usable range (${Math.round(usableRangeNm)} nm at 80% of stated range)`);
      }
    } else {
      reasonsAgainst.push(`${a.distanceNm} nm from destination — aircraft fuel range not supplied, cannot confirm reachability`);
    }

    return {
      icao: a.icao,
      name: a.name,
      distanceNm: a.distanceNm,
      elevationFt: a.elevationFt,
      hasApproaches: a.hasApproaches,
      longestRunwayFt,
      flightCategory,
      disqualified,
      reasonsFor,
      reasonsAgainst,
    };
  }));

  const viable = candidates.filter((c) => !c.disqualified).sort((a, b) => a.distanceNm - b.distanceNm);
  const disqualified = candidates.filter((c) => c.disqualified);

  return {
    ok: true,
    destinationIcao,
    searchRadiusNm,
    minimumsModel: "flight_category_proxy",
    candidatesConsidered: candidates.length,
    recommended: viable[0] || null,
    viable,
    disqualified,
    message: viable.length
      ? null
      : `No suitable alternate found within ${searchRadiusNm} nm of ${destinationIcao} — ${candidates.length} candidate(s) considered, all disqualified or unconfirmed. Widen the search radius or verify manually.`,
  };
}

async function handleSelectAlternate(req, res) {
  const b = req.body || {};
  const result = await selectAlternates({
    destinationIcao: b.destinationIcao,
    searchRadiusNm: b.searchRadiusNm,
    requiresIfr: b.requiresIfr === true,
    minRunwayFt: b.minRunwayFt,
    aircraftRangeNm: b.aircraftRangeNm,
  });
  if (!result.ok) return res.status(400).json({ ok: false, error: result.error });
  return res.json(result);
}

module.exports = { selectAlternates, handleSelectAlternate, haversineNm };
