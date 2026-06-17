"use strict";

/**
 * faaData.js — Free, keyless FAA data: TFRs + Class Airspace.
 *
 * First real implementation of the `tfr_feed` + `faa_nasr` (airspace) connectors.
 *
 *  • TFRs:     GET https://tfr.faa.gov/tfrapi/exportTfrList  (JSON list)
 *  • Airspace: FAA AIS "Class Airspace" ArcGIS FeatureServer, spatially queried
 *              near a point → GeoJSON polygons w/ NAME, CLASS, floor/ceiling.
 *              (Same ArcGIS org also hosts DesignatedPoint/NAVAID/ATSRoute/
 *              NFDC_Airports — easy follow-ons via FAA_FEATURESERVERS.)
 *
 * Routes:
 *   GET /v1/aviation:tfr[?state=AZ]
 *   GET /v1/aviation:airspace?lat=36.08&lon=-115.15&dist=40
 *
 * Both free FAA data → public routes, with a short in-proc cache so we don't
 * hammer the FAA on repeated identical pulls.
 */

const TFR_URL = "https://tfr.faa.gov/tfrapi/exportTfrList";
const FAA_ARCGIS_ORG = "https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services";
const FAA_FEATURESERVERS = {
  classAirspace: `${FAA_ARCGIS_ORG}/Class_Airspace/FeatureServer/0`,
};

// ── tiny TTL cache ─────────────────────────────────────────────
const _cache = new Map();
function cacheGet(key, ttlMs) {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data;
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
  const resp = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "SOCIII-Aviation/1.0" } });
  if (!resp.ok) throw new Error(`${resp.status} for ${url}`);
  return resp.json();
}

// ── TFRs ───────────────────────────────────────────────────────
const TFR_TTL_MS = 10 * 60 * 1000;

async function getTfrs({ state = null } = {}) {
  const cached = cacheGet("tfr:all", TFR_TTL_MS);
  let list = cached;
  if (!list) {
    const raw = await fetchJson(TFR_URL);
    list = (Array.isArray(raw) ? raw : []).map((t) => ({
      notamId: t.notam_id || null,
      type: t.type || null,
      facility: t.facility || null,
      state: t.state || null,
      description: t.description || null,
      createdAt: t.creation_date || null,
    }));
    cacheSet("tfr:all", list);
  }
  if (state) {
    const s = String(state).toUpperCase();
    list = list.filter((t) => (t.state || "").toUpperCase() === s);
  }
  return { count: list.length, tfrs: list };
}

// ── Class Airspace (spatial) ───────────────────────────────────
const AIRSPACE_TTL_MS = 60 * 60 * 1000; // airspace is ~static

async function getAirspace({ lat, lon, distNm = 40 }) {
  const la = Number(lat), lo = Number(lon);
  const d = Math.min(Math.max(Number(distNm) || 40, 1), 150);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) {
    return { error: "lat and lon are required (decimal degrees)" };
  }
  // nm → degrees (lat ~1/60°/nm; lon scaled by cos(lat))
  const dLat = d / 60;
  const dLon = d / (60 * Math.max(0.2, Math.cos((la * Math.PI) / 180)));
  const xmin = (lo - dLon).toFixed(3), xmax = (lo + dLon).toFixed(3);
  const ymin = (la - dLat).toFixed(3), ymax = (la + dLat).toFixed(3);

  const key = `airspace:${xmin},${ymin},${xmax},${ymax}`;
  const cached = cacheGet(key, AIRSPACE_TTL_MS);
  if (cached) return { ...cached, cached: true };

  const params = new URLSearchParams({
    where: "1=1",
    geometry: `${xmin},${ymin},${xmax},${ymax}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "NAME,CLASS,LOWER_VAL,UPPER_VAL,LOWER_UOM,UPPER_UOM",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    resultRecordCount: "200",
  });
  const gj = await fetchJson(`${FAA_FEATURESERVERS.classAirspace}/query?${params}`);
  const features = (gj.features || []).map((f) => ({
    name: f.properties?.NAME || null,
    airspaceClass: f.properties?.CLASS || null,
    floor: f.properties?.LOWER_VAL ?? null,
    ceiling: f.properties?.UPPER_VAL ?? null,
    floorUom: f.properties?.LOWER_UOM || null,
    ceilingUom: f.properties?.UPPER_UOM || null,
    geometry: f.geometry || null, // GeoJSON polygon for the map
  }));
  const out = { center: { lat: la, lon: lo, distNm: d }, count: features.length, airspace: features };
  cacheSet(key, out);
  return { ...out, cached: false };
}

// ── route handlers ─────────────────────────────────────────────
async function handleTfr(req, res) {
  const state = req.query?.state || req.body?.state || null;
  const result = await getTfrs({ state });
  res.status(200).json({ ok: true, source: "tfr.faa.gov", ...result });
}

async function handleAirspace(req, res) {
  const lat = req.query?.lat ?? req.body?.lat;
  const lon = req.query?.lon ?? req.body?.lon;
  const dist = req.query?.dist ?? req.body?.dist;
  const result = await getAirspace({ lat, lon, distNm: dist });
  if (result.error) {
    res.status(400).json({ ok: false, error: result.error, code: "bad_request" });
    return;
  }
  res.status(200).json({ ok: true, source: "FAA AIS Class Airspace", ...result });
}

module.exports = { getTfrs, getAirspace, handleTfr, handleAirspace, FAA_FEATURESERVERS };
