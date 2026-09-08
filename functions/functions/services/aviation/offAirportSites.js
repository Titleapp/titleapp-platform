"use strict";

/**
 * offAirportSites.js — Off-airport landing site candidates for SKYE's
 * Emergency Glide feature (CODEX S52.67 gap #2, second half).
 *
 * There is no free, curated aviation off-airport-landing-site database
 * available here (ForeFlight's Off-Airport Landings layer is licensed,
 * curated data — not something this pass can honestly replicate). Instead
 * this queries OpenStreetMap's free, keyless Overpass API for real
 * geographic features that are PLAUSIBLE off-airport landing candidates —
 * large open fields (farmland/meadow/grass/orchard land use) and golf
 * courses — within a radius of a position. This is a best-effort geographic
 * approximation, not aviation-grade site data: no surface condition, slope,
 * obstruction, or power-line survey. Every result is labeled uncharted/
 * approximate at the call site (PerformanceCalculator-style honesty, not
 * hidden in a footnote).
 *
 * Why this doesn't need webFetch/secureFetch's SSRF allowlist apparatus:
 * same reasoning as elevation.js — the only caller input is a lat/lon/radius
 * triple, range-validated below, interpolated into one fixed Overpass QL
 * query template. There is no code path where caller input picks the host
 * or constructs an arbitrary query.
 *
 * Verified live 2026-09-08 against the public Overpass API (a real query
 * near Bakersfield, CA returned real farmland parcels with real tags/
 * attribution from Kern County GIS) — the public instance can be slow or
 * momentarily overloaded (a first attempt during testing timed out; a retry
 * succeeded), so this proxy applies a generous timeout and returns a clear
 * upstream-busy error rather than hanging, but does not itself retry
 * (retrying belongs in the client / worth revisiting if this proves flaky
 * in real use).
 */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const MAX_RADIUS_NM = 60; // generous glide range cap (well beyond any realistic single-engine/turboprop glide)
const NM_TO_M = 1852;
const MAX_RESULTS = 20;
const FETCH_TIMEOUT_MS = 20000;

function validateInput({ lat, lon, radiusNm }) {
  const la = Number(lat);
  const lo = Number(lon);
  const r = Number(radiusNm);
  if (!Number.isFinite(la) || la < -90 || la > 90) return { error: `Invalid latitude: ${JSON.stringify(lat)}` };
  if (!Number.isFinite(lo) || lo < -180 || lo > 180) return { error: `Invalid longitude: ${JSON.stringify(lon)}` };
  if (!Number.isFinite(r) || r <= 0 || r > MAX_RADIUS_NM) return { error: `radiusNm must be > 0 and <= ${MAX_RADIUS_NM}` };
  return { lat: la, lon: lo, radiusNm: r };
}

function classify(tags) {
  if (tags.leisure === "golf_course") return { kind: "golf_course", label: "Golf course" };
  if (tags.landuse === "farmland") return { kind: "farmland", label: "Farmland" };
  if (tags.landuse === "orchard") return { kind: "orchard", label: "Orchard (obstruction risk — trees)" };
  if (tags.landuse === "meadow") return { kind: "meadow", label: "Meadow/pasture" };
  if (tags.landuse === "grass") return { kind: "grass", label: "Open grass area" };
  return { kind: "other", label: "Open area" };
}

// Haversine, nm.
function distanceNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getOffAirportSites({ lat, lon, radiusNm }) {
  const v = validateInput({ lat, lon, radiusNm });
  if (v.error) return { error: v.error };

  const radiusM = Math.round(v.radiusNm * NM_TO_M);
  const query =
    `[out:json][timeout:15];` +
    `(way["landuse"~"^(farmland|meadow|grass|orchard)$"](around:${radiusM},${v.lat},${v.lon});` +
    `way["leisure"="golf_course"](around:${radiusM},${v.lat},${v.lon}););` +
    `out center ${MAX_RESULTS};`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(OVERPASS_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "SOCIII-Aviation/1.0 (support@titleapp.ai)" },
      body: `data=${encodeURIComponent(query)}`,
    });
  } catch (e) {
    throw new Error(`Overpass request failed or timed out: ${e.message}`);
  } finally {
    clearTimeout(t);
  }
  if (!resp.ok) {
    const bodyText = await resp.text().catch(() => "");
    if (/too busy|timeout/i.test(bodyText)) {
      throw new Error("Overpass public API is busy right now — try again shortly.");
    }
    throw new Error(`Overpass ${resp.status}`);
  }
  const json = await resp.json();
  const elements = Array.isArray(json.elements) ? json.elements : [];

  const sites = elements
    .filter((el) => el.center && Number.isFinite(el.center.lat) && Number.isFinite(el.center.lon))
    .map((el) => {
      const { kind, label } = classify(el.tags || {});
      return {
        id: el.id,
        kind,
        label,
        lat: el.center.lat,
        lon: el.center.lon,
        distNm: Math.round(distanceNm(v.lat, v.lon, el.center.lat, el.center.lon) * 10) / 10,
        osmTags: el.tags || {},
      };
    })
    .sort((a, b) => a.distNm - b.distNm)
    .slice(0, MAX_RESULTS);

  return { sites, count: sites.length };
}

async function handleOffAirportSites(req, res) {
  const src = req.method === "GET" ? req.query : req.body;
  try {
    const result = await getOffAirportSites({ lat: src?.lat, lon: src?.lon, radiusNm: src?.radiusNm });
    if (result.error) {
      res.status(400).json({ ok: false, error: result.error, code: "bad_request" });
      return;
    }
    res.status(200).json({
      ok: true,
      source: "OpenStreetMap Overpass API — approximate geographic candidates, NOT a curated aviation off-airport-landing database. No surface, slope, obstruction, or power-line survey.",
      ...result,
    });
  } catch (e) {
    console.error("aviation:offAirportSites failed:", e);
    res.status(502).json({ ok: false, error: e.message || "Off-airport site lookup failed", code: "upstream_error" });
  }
}

module.exports = { getOffAirportSites, handleOffAirportSites, MAX_RADIUS_NM };
