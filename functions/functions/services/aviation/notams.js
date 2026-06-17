"use strict";

/**
 * notams.js — Live NOTAMs via Notamify API.
 *
 * First real implementation of the `notamify` connector (config/connectors.js).
 * Wires the actual Notamify fetch into the EXISTING 30-min-per-ICAO cache wrapper
 * (services/health/notamCache.js) and records a data-fee per real pull
 * (services/billing/dataFee.js, source "notamify:notams") so the paid pulls are
 * resold at the configured markup — the ROI path.
 *
 * Notamify API:  GET https://api.notamify.com/api/v2/notams?locations=KJFK
 *   auth: Authorization: Bearer <key>  (we also send X-API-Key for compatibility)
 *   max 5 ICAOs per call; we cache per-ICAO so a 3-airport brief is 3 cached keys.
 *
 * Endpoint:  GET /v1/aviation:notams?locations=KJFK,KLAX,KBOS   (auth required)
 */

const { getCachedNotams } = require("../health/notamCache");
const { recordDataFee } = require("../billing/dataFee");

const NOTAMIFY_BASE = process.env.NOTAMIFY_BASE || "https://api.notamify.com/api/v2/notams";

function normIcaos(s) {
  return String(s || "")
    .split(/[,\s]+/)
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
}

function normalizeNotam(n) {
  const interp = n.interpretation || {};
  return {
    number: n.notam_number || n.id || null,
    icao: n.icao_code || null,
    summary: interp.excerpt || interp.description || null,
    category: interp.category || null,
    raw: n.icao_message || n.message || null,
    startsAt: n.starts_at || null,
    endsAt: n.ends_at || null,
    issuedAt: n.issued_at || null,
  };
}

// Raw Notamify call for ONE ICAO. Throws on non-2xx so the caller can surface
// a clear error (and we never cache a failure).
async function fetchNotamsForIcao(icao) {
  const key = process.env.NOTAMIFY_API_KEY;
  if (!key) throw new Error("NOTAMIFY_API_KEY not configured");
  const url = `${NOTAMIFY_BASE}?locations=${encodeURIComponent(icao)}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      "X-API-Key": key,
      Accept: "application/json",
    },
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Notamify ${resp.status} for ${icao}: ${body.slice(0, 120)}`);
  }
  const json = await resp.json();
  const list = Array.isArray(json?.notams) ? json.notams : [];
  return list.map(normalizeNotam);
}

/**
 * Get NOTAMs for up to 5 airports, cached per-ICAO (30 min). Records a data-fee
 * only on a real API pull (cache miss), so we never double-charge a cache hit.
 */
async function getNotams({ locations, userId = null, tenantId = null }) {
  const icaos = normIcaos(locations).slice(0, 5);
  if (!icaos.length) return { error: "locations required (comma-separated ICAOs, max 5)" };

  const byAirport = [];
  let pulls = 0;
  for (const icao of icaos) {
    try {
      const { data, cached } = await getCachedNotams(icao, fetchNotamsForIcao);
      byAirport.push({ icao, cached, count: data.length, notams: data });
      if (!cached) {
        pulls += 1;
        // Bill the real pull (resale markup lives in dataFee.js). Non-fatal.
        if (userId) {
          recordDataFee({ source: "notamify:notams", userId, tenantId, units: 1, metadata: { icao } })
            .catch((e) => console.warn("[notams] dataFee failed:", e.message));
        }
      }
    } catch (e) {
      byAirport.push({ icao, error: e.message, notams: [] });
    }
  }
  return { airports: byAirport, pulls };
}

async function handleNotams(req, res, ctx = {}) {
  const locations = req.query?.locations || req.body?.locations;
  const result = await getNotams({ locations, userId: ctx.userId, tenantId: ctx.tenantId });
  if (result.error) {
    res.status(400).json({ ok: false, error: result.error, code: "bad_request" });
    return;
  }
  res.status(200).json({ ok: true, source: "notamify", ...result });
}

module.exports = { getNotams, handleNotams, fetchNotamsForIcao };
