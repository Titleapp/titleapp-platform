"use strict";

/**
 * pireps.js — Live Pilot Reports (PIREPs) from aviationweather.gov (FAA AWC).
 *
 * FREE, keyless, FAA public data — same source family as weather.js's
 * METAR/TAF/SIGMET/AIRMET, but its own endpoint and its own query shape
 * (bounding box, not a station-ids list), so it gets its own service file
 * rather than folding into weather.js.
 *
 * Endpoint:
 *   GET /v1/aviation:pireps?lat=20.5&lon=-157.0&dist=200
 *
 * Real, point-located data (lat/lon on every report) — unlike AIRMETs, these
 * render as actual map markers, not just a text list. Fields include icing/
 * turbulence bases-tops-intensity, flight level, aircraft type, and the raw
 * report text; `pirepType` distinguishes routine "PIREP" from "UUA" (urgent).
 */

const EXTERNAL_APIS = require("../../config/externalApis");

const CACHE_TTL_MS = 10 * 60 * 1000; // PIREPs are pilot-submitted, not scheduled — refresh often
const _cache = new Map();

function cacheGet(key) {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  return null;
}
function cacheSet(key, data) {
  _cache.set(key, { at: Date.now(), data });
  if (_cache.size > 300) {
    const oldest = [..._cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) _cache.delete(oldest[0]);
  }
}

async function fetchJson(url) {
  const resp = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "SOCIII-Aviation/1.0 (support@titleapp.ai)" } });
  if (!resp.ok) throw new Error(`AWC ${resp.status} for ${url}`);
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`AWC returned non-JSON (${text.slice(0, 80)})`);
  }
}

// nm → degrees, same convention as faaData.js's bboxAround (lat ~1/60°/nm;
// lon scaled by cos(lat)) — kept consistent across aviation services.
function bboxAround(la, lo, d) {
  const dLat = d / 60;
  const dLon = d / (60 * Math.max(0.2, Math.cos((la * Math.PI) / 180)));
  return {
    xmin: (lo - dLon).toFixed(3), xmax: (lo + dLon).toFixed(3),
    ymin: (la - dLat).toFixed(3), ymax: (la + dLat).toFixed(3),
  };
}

function normalizePirep(p) {
  return {
    icaoId: p.icaoId || null,
    obsTime: p.obsTime || null,
    pirepType: p.pirepType || "PIREP", // "PIREP" | "UUA" (urgent)
    aircraftType: p.acType || null,
    lat: p.lat ?? null,
    lon: p.lon ?? null,
    flightLevel: p.fltLvl ?? null,
    flightLevelType: p.fltLvlType || null,
    clouds: Array.isArray(p.clouds) ? p.clouds : [],
    visibilitySm: p.visib ?? null,
    weather: p.wxString || null,
    tempC: p.temp ?? null,
    windDir: p.wdir ?? null,
    windSpeedKt: p.wspd ?? null,
    icing: (p.icgBas1 != null || p.icgType1) ? { base: p.icgBas1 ?? null, top: p.icgTop1 ?? null, intensity: p.icgInt1 || null, type: p.icgType1 || null } : null,
    turbulence: (p.tbBas1 != null || p.tbType1) ? { base: p.tbBas1 ?? null, top: p.tbTop1 ?? null, intensity: p.tbInt1 || null, frequency: p.tbFreq1 || null } : null,
    raw: p.rawOb || null,
  };
}

/**
 * Fetch normalized PIREPs within `distNm` of a lat/lon point.
 * @param {{lat:number, lon:number, distNm?:number}} opts
 */
async function getPireps({ lat, lon, distNm = 150 }) {
  const la = Number(lat), lo = Number(lon);
  const d = Math.min(Math.max(Number(distNm) || 150, 1), 300);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) {
    return { error: "lat and lon are required (decimal degrees)" };
  }

  const { xmin, ymin, xmax, ymax } = bboxAround(la, lo, d);
  const key = `pireps:${xmin},${ymin},${xmax},${ymax}`;
  const cached = cacheGet(key);
  if (cached) return { ...cached, cached: true };

  const url = `${EXTERNAL_APIS.AVIATION_WEATHER_PIREP}?format=json&bbox=${ymin},${xmin},${ymax},${xmax}`;
  const raw = await fetchJson(url);
  const pireps = (Array.isArray(raw) ? raw : []).map(normalizePirep).filter(p => p.lat != null && p.lon != null);

  const out = { center: { lat: la, lon: lo, distNm: d }, count: pireps.length, pireps };
  cacheSet(key, out);
  return { ...out, cached: false };
}

async function handlePireps(req, res) {
  const lat = req.query?.lat ?? req.body?.lat;
  const lon = req.query?.lon ?? req.body?.lon;
  const dist = req.query?.dist ?? req.body?.dist;
  const result = await getPireps({ lat, lon, distNm: dist });
  if (result.error) {
    res.status(400).json({ ok: false, error: result.error, code: "bad_request" });
    return;
  }
  res.status(200).json({ ok: true, source: "aviationweather.gov", ...result });
}

module.exports = { getPireps, handlePireps };
