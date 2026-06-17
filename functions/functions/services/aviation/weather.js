"use strict";

/**
 * weather.js — Live aviation weather from aviationweather.gov (FAA AWC).
 *
 * FREE, keyless, FAA public data. This is the first real implementation of the
 * `aviationweather` connector declared in config/connectors.js — until now the
 * endpoint constants existed (config/externalApis.js) but nothing called them.
 *
 * Pulls METAR / TAF (and SIGMET) as JSON and normalizes the fields the workers
 * + the aviation map need: flight category (VFR/MVFR/IFR/LIFR) for color-coded
 * station markers, wind, visibility, ceiling, lat/lon, and the raw text.
 *
 * Endpoints:
 *   GET /v1/aviation:weather?ids=KJFK,KLAX[&taf=1][&sigmet=1]
 *
 * A small in-process TTL cache (5 min) keeps us from hammering the AWC and from
 * paying egress on repeated identical pulls — METARs only update ~hourly.
 */

const EXTERNAL_APIS = require("../../config/externalApis");

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — METARs update roughly hourly
const _cache = new Map(); // key -> { at: ms, data }

function cacheGet(key) {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  return null;
}
function cacheSet(key, data) {
  _cache.set(key, { at: Date.now(), data });
  // Bound the map so a long-lived instance can't grow unbounded.
  if (_cache.size > 500) {
    const oldest = [..._cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) _cache.delete(oldest[0]);
  }
}

function normIds(ids) {
  return String(ids || "")
    .split(/[,\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50); // hard cap per request
}

async function awcFetch(url) {
  const resp = await fetch(url, { headers: { "User-Agent": "SOCIII-Aviation/1.0 (support@titleapp.ai)" } });
  if (!resp.ok) throw new Error(`AWC ${resp.status} for ${url}`);
  const text = await resp.text();
  // AWC returns JSON when format=json; guard against an HTML error page.
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`AWC returned non-JSON (${text.slice(0, 80)})`);
  }
}

function normalizeMetar(m) {
  return {
    icao: m.icaoId || m.station_id || null,
    name: m.name || null,
    observed: m.reportTime || m.obsTime || null,
    flightCategory: m.fltCat || m.flight_category || null, // VFR | MVFR | IFR | LIFR
    tempC: m.temp ?? null,
    dewpointC: m.dewp ?? null,
    windDir: m.wdir ?? null,
    windSpeedKt: m.wspd ?? null,
    windGustKt: m.wgst ?? null,
    visibilitySm: m.visib ?? null,
    altimeterInHg: m.altim != null ? Math.round((m.altim / 33.8639) * 100) / 100 : null,
    lat: m.lat ?? null,
    lon: m.lon ?? null,
    raw: m.rawOb || m.raw_text || null,
  };
}

function normalizeTaf(t) {
  return {
    icao: t.icaoId || t.station_id || null,
    issued: t.issueTime || null,
    validFrom: t.validTimeFrom || null,
    validTo: t.validTimeTo || null,
    raw: t.rawTAF || t.raw_text || null,
  };
}

/**
 * Fetch normalized weather for a set of station ICAOs.
 * @param {{ids:string, taf?:boolean, sigmet?:boolean}} opts
 */
async function getWeather({ ids, taf = false, sigmet = false }) {
  const stations = normIds(ids);
  if (!stations.length) return { error: "ids required (comma-separated ICAOs, e.g. KJFK,KLAX)" };

  const key = `${stations.join(",")}|taf=${taf ? 1 : 0}|sig=${sigmet ? 1 : 0}`;
  const cached = cacheGet(key);
  if (cached) return { ...cached, cached: true };

  const idParam = encodeURIComponent(stations.join(","));
  const out = { stations };

  // METAR (always)
  const metarUrl = `${EXTERNAL_APIS.AVIATION_WEATHER_METAR}?ids=${idParam}&format=json`;
  const metarRaw = await awcFetch(metarUrl);
  out.metars = (Array.isArray(metarRaw) ? metarRaw : []).map(normalizeMetar);

  // TAF (optional)
  if (taf) {
    const tafUrl = `${EXTERNAL_APIS.AVIATION_WEATHER_TAF}?ids=${idParam}&format=json`;
    try {
      const tafRaw = await awcFetch(tafUrl);
      out.tafs = (Array.isArray(tafRaw) ? tafRaw : []).map(normalizeTaf);
    } catch (e) {
      out.tafs = [];
      out.tafError = e.message;
    }
  }

  // SIGMET (optional, not station-scoped — current convective/AIRMET set)
  if (sigmet) {
    const sigUrl = `${EXTERNAL_APIS.AVIATION_WEATHER_SIGMET}?format=json`;
    try {
      const sigRaw = await awcFetch(sigUrl);
      out.sigmets = Array.isArray(sigRaw) ? sigRaw : [];
    } catch (e) {
      out.sigmets = [];
      out.sigmetError = e.message;
    }
  }

  cacheSet(key, out);
  return { ...out, cached: false };
}

async function handleWeather(req, res) {
  const ids = req.query?.ids || req.body?.ids;
  const taf = /^(1|true|yes)$/i.test(String(req.query?.taf || req.body?.taf || ""));
  const sigmet = /^(1|true|yes)$/i.test(String(req.query?.sigmet || req.body?.sigmet || ""));

  const result = await getWeather({ ids, taf, sigmet });
  if (result.error) {
    res.status(400).json({ ok: false, error: result.error, code: "bad_request" });
    return;
  }
  res.status(200).json({ ok: true, source: "aviationweather.gov", ...result });
}

module.exports = { getWeather, handleWeather, normalizeMetar };
