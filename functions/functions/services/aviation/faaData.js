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
  airports:      `${FAA_ARCGIS_ORG}/US_Airport/FeatureServer/0`,
  waypoints:     `${FAA_ARCGIS_ORG}/DesignatedPoint/FeatureServer/0`,
  navaids:       `${FAA_ARCGIS_ORG}/NavaidComponent/FeatureServer/0`,
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

// ── Point layers: airports / waypoints / navaids (spatial) ─────
const POINT_TTL_MS = 60 * 60 * 1000; // NASR point data is ~static (28-day cycle)

function bboxAround(la, lo, d) {
  const dLat = d / 60;
  const dLon = d / (60 * Math.max(0.2, Math.cos((la * Math.PI) / 180)));
  return {
    xmin: (lo - dLon).toFixed(3), xmax: (lo + dLon).toFixed(3),
    ymin: (la - dLat).toFixed(3), ymax: (la + dLat).toFixed(3),
  };
}

// Generic spatial query of an FAA point FeatureServer → normalized features
// with decimal lon/lat pulled from the GeoJSON geometry (FAA stores lat/lon as
// DMS strings; the geometry gives clean decimal coords).
async function queryPointLayer({ layerKey, lat, lon, distNm, outFields, normalize, defaultDist = 40, maxDist = 150 }) {
  const la = Number(lat), lo = Number(lon);
  const d = Math.min(Math.max(Number(distNm) || defaultDist, 1), maxDist);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) {
    return { error: "lat and lon are required (decimal degrees)" };
  }
  const { xmin, ymin, xmax, ymax } = bboxAround(la, lo, d);
  const key = `${layerKey}:${xmin},${ymin},${xmax},${ymax}`;
  const cached = cacheGet(key, POINT_TTL_MS);
  if (cached) return { ...cached, cached: true };

  const params = new URLSearchParams({
    where: "1=1",
    geometry: `${xmin},${ymin},${xmax},${ymax}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields,
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    resultRecordCount: "300",
  });
  const gj = await fetchJson(`${FAA_FEATURESERVERS[layerKey]}/query?${params}`);
  const features = (gj.features || []).map((f) => {
    const c = f.geometry && Array.isArray(f.geometry.coordinates) ? f.geometry.coordinates : [null, null];
    return normalize(f.properties || {}, { lon: c[0], lat: c[1] });
  });
  const out = { center: { lat: la, lon: lo, distNm: d }, count: features.length };
  out[layerKey] = features;
  cacheSet(key, out);
  return { ...out, cached: false };
}

async function getAirports({ lat, lon, distNm = 40 }) {
  return queryPointLayer({
    layerKey: "airports", lat, lon, distNm, defaultDist: 40, maxDist: 200,
    outFields: "IDENT,ICAO_ID,NAME,ELEVATION,TYPE_CODE,SERVCITY,STATE,OPERSTATUS,IAPEXISTS,PRIVATEUSE",
    normalize: (p, g) => ({
      ident: p.IDENT || null,
      icao: p.ICAO_ID || null,
      name: p.NAME || null,
      type: p.TYPE_CODE || null, // AD airport, HP heliport, etc.
      elevationFt: p.ELEVATION ?? null,
      city: p.SERVCITY || null,
      state: p.STATE || null,
      operStatus: p.OPERSTATUS || null,
      hasApproaches: p.IAPEXISTS === 1,
      privateUse: p.PRIVATEUSE === 1,
      lat: g.lat, lon: g.lon,
    }),
  });
}

async function getWaypoints({ lat, lon, distNm = 30 }) {
  return queryPointLayer({
    layerKey: "waypoints", lat, lon, distNm, defaultDist: 30, maxDist: 120,
    outFields: "IDENT_TXT,NAME_TXT,TYPE_CODE,CHARTSTRUCTURES_TXT",
    normalize: (p, g) => ({
      ident: p.IDENT_TXT || null,
      name: (p.NAME_TXT || "").trim() || null,
      type: p.TYPE_CODE || null, // RNAV, OTHER, etc.
      chart: (p.CHARTSTRUCTURES_TXT || "").trim() || null,
      lat: g.lat, lon: g.lon,
    }),
  });
}

async function getNavaids({ lat, lon, distNm = 60 }) {
  return queryPointLayer({
    layerKey: "navaids", lat, lon, distNm, defaultDist: 60, maxDist: 200,
    outFields: "IDENT_TXT,NAME_TXT,FREQUENCY_VAL,FREQUENCY_UOM,ELEV_VAL",
    normalize: (p, g) => ({
      ident: p.IDENT_TXT || null,
      name: (p.NAME_TXT || "").trim() || null,
      frequency: p.FREQUENCY_VAL ?? null,
      frequencyUom: p.FREQUENCY_UOM || null,
      elevationFt: p.ELEV_VAL ?? null,
      lat: g.lat, lon: g.lon,
    }),
  });
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

// Shared handler for the point layers (airports / waypoints / navaids).
function makePointHandler(getter, sourceLabel) {
  return async function (req, res) {
    const lat = req.query?.lat ?? req.body?.lat;
    const lon = req.query?.lon ?? req.body?.lon;
    const dist = req.query?.dist ?? req.body?.dist;
    const result = await getter({ lat, lon, distNm: dist });
    if (result.error) {
      res.status(400).json({ ok: false, error: result.error, code: "bad_request" });
      return;
    }
    res.status(200).json({ ok: true, source: sourceLabel, ...result });
  };
}

const handleAirports = makePointHandler(getAirports, "FAA NASR US_Airport");
const handleWaypoints = makePointHandler(getWaypoints, "FAA NASR DesignatedPoint");
const handleNavaids = makePointHandler(getNavaids, "FAA NASR NavaidComponent");

module.exports = {
  getTfrs, getAirspace, getAirports, getWaypoints, getNavaids,
  handleTfr, handleAirspace, handleAirports, handleWaypoints, handleNavaids,
  FAA_FEATURESERVERS,
};
