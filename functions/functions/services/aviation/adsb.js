"use strict";

/**
 * adsb.js — Live aircraft positions via ADS-B Exchange.
 *
 * First real implementation of the `adsb_exchange` connector. Returns aircraft
 * within a radius of a point — the "radar returns" for the dispatch / flight-
 * following / map views. Records a tiny data-fee per query (resale markup in
 * dataFee.js) so the paid pulls earn their keep.
 *
 * ADS-B Exchange direct API:
 *   GET https://adsbexchange.com/api/aircraft/v2/lat/{lat}/lon/{lon}/dist/{nm}
 *   auth header: api-auth: <key>
 * (If the account is the RapidAPI-hosted product, set ADSB_EXCHANGE_BASE +
 *  ADSB_EXCHANGE_RAPIDAPI_HOST and we send X-RapidAPI-Key instead.)
 *
 * Endpoint:  GET /v1/aviation:traffic?lat=36.08&lon=-115.15&dist=50   (auth required)
 */

const { recordDataFee } = require("../billing/dataFee");

const ADSB_BASE = process.env.ADSB_EXCHANGE_BASE || "https://adsbexchange.com/api/aircraft/v2";
const RAPIDAPI_HOST = process.env.ADSB_EXCHANGE_RAPIDAPI_HOST || null; // set if using RapidAPI

function authHeaders() {
  const key = process.env.ADSB_EXCHANGE_API_KEY;
  if (!key) throw new Error("ADSB_EXCHANGE_API_KEY not configured");
  if (RAPIDAPI_HOST) {
    return { "X-RapidAPI-Key": key, "X-RapidAPI-Host": RAPIDAPI_HOST, Accept: "application/json" };
  }
  return { "api-auth": key, Accept: "application/json" };
}

function normalizeAircraft(a) {
  return {
    hex: a.hex || null,
    flight: (a.flight || "").trim() || null,
    registration: a.r || null,
    type: a.t || null,
    lat: a.lat ?? null,
    lon: a.lon ?? null,
    altitudeFt: typeof a.alt_baro === "number" ? a.alt_baro : (a.alt_baro === "ground" ? 0 : null),
    onGround: a.alt_baro === "ground",
    groundSpeedKt: a.gs ?? null,
    track: a.track ?? null,
    verticalRateFpm: a.baro_rate ?? null,
    squawk: a.squawk || null,
    emergency: a.emergency && a.emergency !== "none" ? a.emergency : null,
  };
}

/**
 * Aircraft within `distNm` of (lat, lon).
 */
async function getTraffic({ lat, lon, distNm = 50, userId = null, tenantId = null }) {
  const la = Number(lat), lo = Number(lon);
  const d = Math.min(Math.max(Number(distNm) || 50, 1), 250); // ADS-B caps radius at 250nm
  if (!Number.isFinite(la) || !Number.isFinite(lo)) {
    return { error: "lat and lon are required (decimal degrees)" };
  }

  const url = `${ADSB_BASE}/lat/${la}/lon/${lo}/dist/${d}`;
  const resp = await fetch(url, { headers: authHeaders() });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    return { error: `ADS-B Exchange ${resp.status}: ${body.slice(0, 120)}`, status: resp.status };
  }
  const json = await resp.json();
  const ac = Array.isArray(json?.ac) ? json.ac : [];

  // Bill the query (negligible per-call cost, resale markup in dataFee). Non-fatal.
  if (userId) {
    recordDataFee({ source: "adsb_exchange:traffic", userId, tenantId, units: 1, metadata: { lat: la, lon: lo, distNm: d } })
      .catch((e) => console.warn("[adsb] dataFee failed:", e.message));
  }

  return {
    center: { lat: la, lon: lo, distNm: d },
    count: ac.length,
    aircraft: ac.map(normalizeAircraft),
  };
}

async function handleTraffic(req, res, ctx = {}) {
  const lat = req.query?.lat ?? req.body?.lat;
  const lon = req.query?.lon ?? req.body?.lon;
  const dist = req.query?.dist ?? req.body?.dist;
  const result = await getTraffic({ lat, lon, distNm: dist, userId: ctx.userId, tenantId: ctx.tenantId });
  if (result.error) {
    res.status(result.status === 401 || result.status === 403 ? 502 : 400)
      .json({ ok: false, error: result.error, code: "adsb_error" });
    return;
  }
  res.status(200).json({ ok: true, source: "adsb_exchange", ...result });
}

module.exports = { getTraffic, handleTraffic, normalizeAircraft };
