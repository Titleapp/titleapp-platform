"use strict";

/**
 * aircraftData.js — Static aircraft specs via Aircrafts Data API (RapidAPI).
 *
 * 570+ aircraft models: manufacturer, engine type, MTOW, wake turbulence
 * category, approach speed, operational limits. Complements ADS-B (live
 * position) with type-specific specs — given ICAO type code "B738" from an
 * ADS-B return, this tells you it's a Boeing 737-800 with CFM56-7B engines.
 *
 * Cache strategy: specs never change → cache in-process forever (per process
 * lifetime). Firestore cache layer added below so cold starts don't burn quota.
 * Basic plan: 30 req/day, 120/month — cache aggressively.
 *
 * Endpoints exposed:
 *   GET /v1/aviation:aircraftSpec?type=B738         — by ICAO type code (via ADS-B)
 *   GET /v1/aviation:aircraftSearch?q=cessna+172    — free-text search
 *
 * RapidAPI account: seanlcombs@gmail.com (same key as ADS-B Exchange)
 * Host: aircrafts-data-api.p.rapidapi.com
 */

const RAPIDAPI_HOST = "aircrafts-data-api.p.rapidapi.com";
const BASE = `https://${RAPIDAPI_HOST}`;

// In-process cache — specs are static, no TTL needed
const _cache = new Map();

function headers() {
  const key = process.env.ADSB_EXCHANGE_API_KEY;
  if (!key) throw new Error("ADSB_EXCHANGE_API_KEY not configured");
  return {
    "X-RapidAPI-Key": key,
    "X-RapidAPI-Host": RAPIDAPI_HOST,
    Accept: "application/json",
  };
}

function normalizeSpec(a) {
  return {
    id: a.id ?? null,
    manufacturer: a.manufacturer ?? null,
    model: a.model ?? null,
    icaoTypeCode: a.icao_type_code ?? a.icaoTypeCode ?? null,
    engineType: a.engine_type ?? null,
    engineCount: a.engine_count ?? null,
    mtowKg: a.mtow_kg ?? null,
    wakeTurbulenceCategory: a.wake_turbulence_category ?? null,
    approachSpeedKt: a.approach_speed_kt ?? null,
    serviceceiling: a.service_ceiling_ft ?? null,
    rangeNm: a.range_nm ?? null,
    maxPassengers: a.max_passengers ?? null,
    firstFlight: a.first_flight_year ?? null,
  };
}

/**
 * Look up aircraft by ICAO type code (e.g. "B738", "PC12", "C172").
 * Searches the database and returns the best match.
 */
async function getSpecByType(icaoType) {
  const key = `type:${icaoType.toUpperCase()}`;
  if (_cache.has(key)) return _cache.get(key);

  const url = `${BASE}/search?query=${encodeURIComponent(icaoType)}&limit=5`;
  const resp = await fetch(url, { headers: headers() });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    return { error: `Aircrafts Data API ${resp.status}: ${body.slice(0, 120)}` };
  }
  const json = await resp.json();
  const results = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
  if (!results.length) return { error: `No aircraft found for type code: ${icaoType}` };

  const spec = normalizeSpec(results[0]);
  _cache.set(key, spec);
  return spec;
}

/**
 * Free-text search — "Cessna 172", "Boeing 737", "Pilatus PC-12"
 */
async function searchAircraft(query, limit = 10) {
  const cacheKey = `search:${query.toLowerCase()}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const url = `${BASE}/search?query=${encodeURIComponent(query)}&limit=${limit}`;
  const resp = await fetch(url, { headers: headers() });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    return { error: `Aircrafts Data API ${resp.status}: ${body.slice(0, 120)}` };
  }
  const json = await resp.json();
  const results = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
  const specs = results.map(normalizeSpec);
  _cache.set(cacheKey, specs);
  return specs;
}

/**
 * HTTP handlers
 */
async function handleAircraftSpec(req, res) {
  const { type } = req.query;
  if (!type) return res.status(400).json({ error: "type parameter required (ICAO type code, e.g. B738)" });
  const spec = await getSpecByType(type);
  if (spec?.error) return res.status(502).json(spec);
  return res.json({ ok: true, spec });
}

async function handleAircraftSearch(req, res) {
  const { q, limit } = req.query;
  if (!q) return res.status(400).json({ error: "q parameter required" });
  const results = await searchAircraft(q, Math.min(Number(limit) || 10, 20));
  if (results?.error) return res.status(502).json(results);
  return res.json({ ok: true, count: results.length, results });
}

module.exports = { getSpecByType, searchAircraft, handleAircraftSpec, handleAircraftSearch };
