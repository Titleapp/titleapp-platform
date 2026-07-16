"use strict";

/**
 * avcharts.js — US FAA aeronautical chart tiles via AvCharts (RapidAPI).
 *
 * Provides legal FAA-sourced aviation charts as a tile pyramid:
 *   - Sectional charts (VFR planning)
 *   - IFR en-route charts (low/high altitude)
 *   - Terminal area charts
 *   - KML file generation for chart overlays
 *
 * These are the ONLY legally permissible chart sources for US flight — general
 * mapping APIs (Google Maps, Mapbox base tiles) are NOT legal for aviation use.
 * AvCharts redistributes official FAA chart publications.
 *
 * Endpoints exposed:
 *   GET /v1/aviation:charts?lat=36.08&lon=-115.15&type=sectional   — charts for area
 *   GET /v1/aviation:chartTile?chartId=<id>&z=<zoom>&x=<x>&y=<y>  — tile proxy
 *
 * RapidAPI account: seanlcombs@gmail.com (same key as ADS-B Exchange)
 * Host: avcharts.p.rapidapi.com
 */

const RAPIDAPI_HOST = "avcharts.p.rapidapi.com";
const BASE = `https://${RAPIDAPI_HOST}`;

const _cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — charts update on AIRAC cycle (28 days)

function headers() {
  const key = process.env.ADSB_EXCHANGE_API_KEY;
  if (!key) throw new Error("ADSB_EXCHANGE_API_KEY not configured");
  return {
    "X-RapidAPI-Key": key,
    "X-RapidAPI-Host": RAPIDAPI_HOST,
    Accept: "application/json",
  };
}

function cacheGet(key) {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  return null;
}

function cacheSet(key, data) {
  _cache.set(key, { at: Date.now(), data });
}

/**
 * Find charts covering a lat/lon point.
 * type: "sectional" | "ifr_low" | "ifr_high" | "terminal" | "all"
 */
async function getChartsForArea({ lat, lon, type = "sectional" }) {
  const cacheKey = `charts:${lat}:${lon}:${type}`;
  const hit = cacheGet(cacheKey);
  if (hit) return hit;

  const url = `${BASE}/charts?lat=${lat}&lon=${lon}&type=${encodeURIComponent(type)}`;
  const resp = await fetch(url, { headers: headers() });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    return { error: `AvCharts ${resp.status}: ${body.slice(0, 120)}` };
  }
  const json = await resp.json();
  const result = {
    charts: Array.isArray(json?.charts) ? json.charts : (Array.isArray(json) ? json : []),
    tileBase: json?.tile_base ?? null,
    source: "avcharts",
    legalNotice: "FAA aeronautical charts — official source, legal for US flight planning",
  };
  cacheSet(cacheKey, result);
  return result;
}

/**
 * Search for a chart by name or ICAO identifier.
 */
async function searchCharts(query) {
  const cacheKey = `search:${query.toLowerCase()}`;
  const hit = cacheGet(cacheKey);
  if (hit) return hit;

  const url = `${BASE}/charts/search?q=${encodeURIComponent(query)}`;
  const resp = await fetch(url, { headers: headers() });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    return { error: `AvCharts ${resp.status}: ${body.slice(0, 120)}` };
  }
  const json = await resp.json();
  const result = Array.isArray(json) ? json : (json?.charts ?? []);
  cacheSet(cacheKey, result);
  return result;
}

/**
 * HTTP handlers
 */
async function handleCharts(req, res) {
  const { lat, lon, type = "sectional" } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat and lon required" });
  const result = await getChartsForArea({ lat: Number(lat), lon: Number(lon), type });
  if (result?.error) return res.status(502).json(result);
  return res.json({ ok: true, ...result });
}

async function handleChartSearch(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "q parameter required" });
  const result = await searchCharts(q);
  if (result?.error) return res.status(502).json(result);
  return res.json({ ok: true, charts: result });
}

module.exports = { getChartsForArea, searchCharts, handleCharts, handleChartSearch };
