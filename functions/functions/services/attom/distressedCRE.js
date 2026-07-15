"use strict";
/**
 * distressedCRE.js — S52.44 shared ATTOM distressed-CRE screen.
 *
 * One tested code path used by BOTH scripts/pullDistressedCRE.js (seed) and the
 * CRE Analyst chat tool (live). Pulls real commercial parcels from ATTOM near a
 * set of metro centers, enriches with sale + AVM + mortgage, and scores a
 * DISTRESS PROXY (this ATTOM key has no NOD/foreclosure flag, so we approximate
 * from acquisition timing + asset class + leverage).
 *
 * Real NOD/foreclosure filings require ATTOM's separate Foreclosure product.
 */

const ATTOM_BASE = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";

// Metro presets so the tool works without a geocoder for the common asks.
const METROS = {
  "san francisco": [
    { name: "SoMa", lat: 37.7785, lng: -122.3970 },
    { name: "Financial District", lat: 37.7946, lng: -122.4006 },
  ],
  "oakland": [{ name: "Oakland CBD", lat: 37.8044, lng: -122.2712 }],
  "bay area": [
    { name: "SF Financial District", lat: 37.7946, lng: -122.4006 },
    { name: "Oakland CBD", lat: 37.8044, lng: -122.2712 },
  ],
  "austin": [
    { name: "Downtown Austin", lat: 30.2672, lng: -97.7431 },
    { name: "The Domain", lat: 30.4010, lng: -97.7250 },
  ],
  "dallas": [{ name: "Downtown Dallas", lat: 32.7797, lng: -96.7970 }],
  "houston": [{ name: "Downtown Houston", lat: 29.7589, lng: -95.3677 }],
  "texas": [
    { name: "Downtown Austin", lat: 30.2672, lng: -97.7431 },
    { name: "Downtown Dallas", lat: 32.7797, lng: -96.7970 },
  ],
  "los angeles": [{ name: "DTLA", lat: 34.0407, lng: -118.2468 }],
  // East-coast commercial cores (Scott demo)
  "new york": [
    { name: "Midtown Manhattan", lat: 40.7549, lng: -73.9840 },
    { name: "Financial District", lat: 40.7075, lng: -74.0113 },
  ],
  "manhattan": [
    { name: "Midtown Manhattan", lat: 40.7549, lng: -73.9840 },
    { name: "Financial District", lat: 40.7075, lng: -74.0113 },
  ],
  "boston": [{ name: "Financial District", lat: 42.3559, lng: -71.0550 }],
  "washington": [{ name: "Downtown DC / K St", lat: 38.9020, lng: -77.0400 }],
  "miami": [{ name: "Brickell", lat: 25.7650, lng: -80.1936 }],
  "chicago": [{ name: "The Loop", lat: 41.8827, lng: -87.6233 }],
  "seattle": [{ name: "Downtown Seattle", lat: 47.6062, lng: -122.3321 }],
  "denver": [{ name: "Downtown Denver", lat: 39.7392, lng: -104.9903 }],
  "phoenix": [{ name: "Downtown Phoenix", lat: 33.4484, lng: -112.0740 }],
  "las vegas": [
    { name: "Las Vegas Strip Corridor", lat: 36.1147, lng: -115.1728 },
    { name: "Downtown Las Vegas", lat: 36.1699, lng: -115.1398 },
  ],
  "nevada": [
    { name: "Las Vegas Strip Corridor", lat: 36.1147, lng: -115.1728 },
    { name: "Downtown Las Vegas", lat: 36.1699, lng: -115.1398 },
  ],
  "atlanta": [{ name: "Midtown Atlanta", lat: 33.7848, lng: -84.3832 }],
  "boise": [
    { name: "Downtown Boise", lat: 43.6150, lng: -116.2023 },
    { name: "BSU / University District", lat: 43.6042, lng: -116.1985 },
  ],
  "portland": [{ name: "Downtown Portland", lat: 45.5231, lng: -122.6765 }],
  "nashville": [{ name: "Downtown Nashville", lat: 36.1627, lng: -86.7816 }],
  "charlotte": [{ name: "Uptown Charlotte", lat: 35.2271, lng: -80.8431 }],
  "san diego": [{ name: "Downtown San Diego", lat: 32.7157, lng: -117.1611 }],
};

function resolveCenters(metro) {
  const key = String(metro || "").toLowerCase().trim();
  for (const m of Object.keys(METROS)) if (key.includes(m)) return { centers: METROS[m], label: metro };
  return { centers: METROS["bay area"], label: "Bay Area (default)" };
}

const num = (v) => (v == null || v === "" ? null : Number(v));
const yearOf = (d) => (d && /^\d{4}/.test(d) ? Number(d.slice(0, 4)) : null);

function scoreDistress(p) {
  let score = 0; const reasons = [];
  const saleY = yearOf(p.lastSaleDate);
  const isOffice = /OFFICE/i.test(p.propType || "");
  const peakEra = saleY && saleY >= 2019 && saleY <= 2021;
  const bigTicket = p.lastSale != null && p.lastSale >= 50000000;
  if (isOffice && peakEra) { score += 55; reasons.push("Office bought at 2019–21 peak — distressed class"); }
  else if (peakEra) { score += 35; reasons.push("Peak-era acquisition (2019–21)"); }
  if (isOffice && bigTicket) { score += 20; reasons.push("Institutional-scale office ($50M+)"); }
  if (p.avm != null && p.lastSale != null && p.avm < p.lastSale) {
    const downPct = Math.round((1 - p.avm / p.lastSale) * 100);
    if (downPct >= 5) { score += Math.min(40, downPct); reasons.push(`AVM ${downPct}% below purchase (underwater)`); }
  }
  if (p.mortgaged) { score += 15; reasons.push("Leveraged (mortgage on record)"); }
  if (!peakEra && saleY && saleY <= 2017) { score += 10; reasons.push("Stale ownership (pre-2018)"); }
  const band = score >= 60 ? "RED" : score >= 30 ? "YELLOW" : "GREEN";
  return { distressScore: Math.min(100, score), distressBand: band, distressReasons: reasons };
}

async function attomGet(p, apiKey) {
  try {
    const r = await fetch(`${ATTOM_BASE}${p}`, { headers: { apikey: apiKey, accept: "application/json" } });
    const json = r.ok ? await r.json() : null;
    return { ok: r.ok, status: r.status, json };
  } catch { return { ok: false, status: null, json: null }; }
}

/**
 * @param {object} opts { metro?: string, radius?: number, limit?: number, perCenter?: number }
 * @param {string} apiKey ATTOM key (process.env.ATTOM_API_KEY)
 * @returns {Promise<{label, count, candidates: Array}>}
 */
async function searchDistressedCRE({ metro, radius = 0.6, limit = 12, perCenter = 6 } = {}, apiKey) {
  if (!apiKey) return { error: "ATTOM_API_KEY not configured", candidates: [] };
  const { centers, label } = resolveCenters(metro);
  const out = [];
  for (const c of centers) {
    const snap = await attomGet(`/property/snapshot?latitude=${c.lat}&longitude=${c.lng}&radius=${radius}&propertytype=COMMERCIAL`, apiKey);
    if (snap.status === 401 || snap.status === 403) {
      return { error: "Live property data is temporarily unavailable — please check back shortly.", code: "ATTOM_UNAVAILABLE", candidates: [] };
    }
    for (const pr of (snap?.json?.property || []).slice(0, perCenter)) {
      const id = pr?.identifier?.attomId;
      if (!id) continue;
      const ep = await attomGet(`/property/expandedprofile?attomid=${id}`, apiKey);
      const e = ep?.json?.property?.[0] || {};
      const loc = e?.location || pr?.location || {};
      const sale = e?.sale || {};
      const rec = {
        attomId: id,
        address: e?.address?.oneLine || pr?.address?.oneLine || "",
        submarket: c.name,
        lat: num(loc.latitude), lng: num(loc.longitude),
        propType: e?.summary?.propclass || e?.summary?.proptype || pr?.summary?.proptype || "Commercial",
        lastSale: num(sale?.amount?.saleAmt),
        lastSaleDate: sale?.amount?.saleRecDate || sale?.saleTransDate || null,
        avm: num(e?.avm?.amount?.value),
        mortgaged: !!(e?.mortgage && Object.keys(e.mortgage).length),
        lender: e?.mortgage?.FirstConcurrent?.lenderLastName || null,
      };
      out.push({ ...rec, ...scoreDistress(rec) });
    }
  }
  out.sort((a, b) => b.distressScore - a.distressScore);
  const candidates = out.filter((p) => p.lat && p.lng).slice(0, limit);
  return { label, count: candidates.length, candidates };
}

module.exports = { searchDistressedCRE, scoreDistress, METROS };
