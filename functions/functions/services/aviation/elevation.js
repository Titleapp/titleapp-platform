"use strict";

/**
 * elevation.js — Ground elevation sampling for the SKYE aviation Profile
 * view (the vertical-profile / terrain-avoidance chart, functionally
 * equivalent to ForeFlight's "Profile" tab under FPL). Backs
 * POST /v1/aviation:elevation.
 *
 * Source: Open-Meteo's Elevation API — free, keyless, CORS-enabled, backed
 * by a Copernicus GLO-90 (~90m) global DEM. Documented request format is
 * `GET /v1/elevation?latitude=<comma-list>&longitude=<comma-list>`, with a
 * stated cap of "up to 100 coordinates ... at once"
 * (https://open-meteo.com/en/docs/elevation-api, checked 2026-09-07). This
 * endpoint enforces that same 100-point cap server-side rather than trusting
 * the client, and the aviation Profile UI on the frontend caps its total
 * sampled points at 100 for the same reason (one call, no batching needed).
 *
 * Why this doesn't reuse services/webFetch/secureFetch.js: that module's
 * SSRF allowlist/URL-validation apparatus exists because it forwards a
 * user-supplied URL. This proxy never takes a URL from the caller at all —
 * the only thing accepted is an array of [lat, lon] number pairs, which are
 * range-validated below and then interpolated into one fixed, hardcoded
 * Open-Meteo URL. There is no code path where caller input can change which
 * host gets fetched.
 */

const MAX_POINTS = 100; // Open-Meteo's documented per-request cap
const ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";
const METERS_TO_FEET = 3.28084;

function validatePoints(points) {
  if (!Array.isArray(points) || !points.length) {
    return { error: "points is required — a non-empty array of [lat, lon] pairs" };
  }
  if (points.length > MAX_POINTS) {
    return { error: `Too many points (${points.length}) — max ${MAX_POINTS} per request` };
  }
  const lats = [];
  const lons = [];
  for (const p of points) {
    const lat = Array.isArray(p) ? Number(p[0]) : Number(p?.lat);
    const lon = Array.isArray(p) ? Number(p[1]) : Number(p?.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return { error: `Invalid latitude: ${JSON.stringify(Array.isArray(p) ? p[0] : p?.lat)}` };
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      return { error: `Invalid longitude: ${JSON.stringify(Array.isArray(p) ? p[1] : p?.lon)}` };
    }
    lats.push(lat);
    lons.push(lon);
  }
  return { lats, lons };
}

/**
 * Fetch ground elevation (meters + feet) for up to MAX_POINTS lat/lon pairs,
 * in the same order they were given.
 * @param {{points: Array<[number,number]|{lat:number,lon:number}>}} opts
 */
async function getElevation({ points }) {
  const v = validatePoints(points);
  if (v.error) return { error: v.error };

  const url = `${ELEVATION_URL}?latitude=${v.lats.join(",")}&longitude=${v.lons.join(",")}`;
  const resp = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "SOCIII-Aviation/1.0 (support@titleapp.ai)" },
  });
  if (!resp.ok) throw new Error(`Open-Meteo elevation ${resp.status}`);
  const json = await resp.json();
  const elevationsM = Array.isArray(json.elevation) ? json.elevation : [];
  if (elevationsM.length !== v.lats.length) {
    throw new Error(`Open-Meteo returned ${elevationsM.length} elevations for ${v.lats.length} points`);
  }
  const elevationsFt = elevationsM.map((m) => m * METERS_TO_FEET);
  return { elevationsM, elevationsFt, count: elevationsM.length };
}

async function handleElevation(req, res) {
  let points = req.method === "GET" ? req.query?.points : req.body?.points;
  if (typeof points === "string") {
    try {
      points = JSON.parse(points);
    } catch {
      res.status(400).json({ ok: false, error: "points must be valid JSON — an array of [lat, lon] pairs", code: "bad_request" });
      return;
    }
  }
  try {
    const result = await getElevation({ points });
    if (result.error) {
      res.status(400).json({ ok: false, error: result.error, code: "bad_request" });
      return;
    }
    res.status(200).json({
      ok: true,
      source: "Open-Meteo (Copernicus GLO-90 DEM)",
      ...result,
    });
  } catch (e) {
    console.error("aviation:elevation failed:", e);
    res.status(502).json({ ok: false, error: e.message || "Elevation lookup failed", code: "upstream_error" });
  }
}

module.exports = { getElevation, handleElevation, MAX_POINTS };
