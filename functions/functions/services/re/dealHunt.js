"use strict";
// services/re/dealHunt.js — CODEX 39: Deal Hunt mode.
// Scans ATTOM property snapshot by market (lat/lng radius), scores each
// property for distress signals, filters by caller parameters, and returns a
// ranked list.
//
// KEY: ATTOM /property/snapshot does NOT support city-only queries —
// it requires either a full street address (address1+address2) OR
// latitude+longitude+radius. We use the lat/lng approach for market-level scans.
// City → lat/lng center map is shared from services/attom/distressedCRE.js.

const ATTOM_BASE = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";

// Reuse the same metro center table as the CRE Analyst tool.
const { METROS } = require("../attom/distressedCRE");

async function attomGet(path, apiKey) {
  const url = ATTOM_BASE + path;
  const resp = await fetch(url, { headers: { apikey: apiKey, accept: "application/json" } });
  const json = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, json };
}

// Resolve "San Francisco, CA" → array of { lat, lng, name } center points.
function resolveCenters(market) {
  const key = String(market || "").toLowerCase().trim();
  // Try city portion first (before comma), then full string.
  const city = key.includes(",") ? key.split(",")[0].trim() : key;
  for (const m of Object.keys(METROS)) {
    if (city.includes(m) || m.includes(city)) return METROS[m];
  }
  for (const m of Object.keys(METROS)) {
    if (key.includes(m)) return METROS[m];
  }
  return null;
}

// Map an assetClass chip to an ATTOM propertytype query value.
// NOTE: ATTOM snapshot doesn't recognise "MULTIFAMILY" as a type — it returns 0
// results. Map to "RESIDENTIAL" so apartment/condo buildings are returned, then
// filter client-side using the isMultifamily regex in scoreDistress.
function assetClassToAttomType(cls) {
  const map = {
    "Office": "OFFICE",
    "Multifamily": "RESIDENTIAL",
    "Industrial": "INDUSTRIAL",
    "Retail": "RETAIL",
    "Land": "VACANT LAND",
    "Mixed Use": "MIXED USE",
    "Commercial": "COMMERCIAL",
  };
  return map[cls] || null;
}

const num = (v) => (v == null || v === "" ? null : Number(v));
const yearOf = (d) => (d && /^\d{4}/.test(String(d)) ? Number(String(d).slice(0, 4)) : null);

// Score a property for distress on a 0-100 scale.
// Asset-class aware: commercial/office uses peak-era + underwater model;
// multifamily/residential uses value-add + stale-ownership + hold-period model.
function scoreDistress(rec) {
  let score = 0;
  const reasons = [];

  const saleY = yearOf(rec.lastSaleDate);
  const isOffice = /OFFICE/i.test(rec.propType || "");
  const isMultifamily = /MULTIFAMILY|APARTMENT|RESIDENTIAL|CONDO/i.test(rec.propType || "");
  const isCommercial = /OFFICE|COMMERCIAL|RETAIL|INDUSTRIAL|MIXED/i.test(rec.propType || "");
  const peakEra = saleY && saleY >= 2019 && saleY <= 2021;
  const bigTicket = rec.lastSale != null && rec.lastSale >= 50_000_000;

  // AVM or assessed value below purchase price (applies to all classes)
  const compareValue = rec.avm || rec.assessedValue;
  const downPct = (compareValue != null && rec.lastSale != null && compareValue < rec.lastSale)
    ? Math.round((1 - compareValue / rec.lastSale) * 100) : 0;

  if (isMultifamily) {
    // ── Multifamily / residential distress model ──────────────────────────
    // Value-add signal: AVM/assessed below last sale
    if (downPct >= 5) {
      score += Math.min(35, downPct * 1.2);
      reasons.push(`${rec.avm ? "AVM" : "Assessed"} ${downPct}% below purchase — value-add potential`);
    }
    // Long-held ownership → motivated seller or deferred capex
    if (saleY && saleY <= 2010) {
      score += 30;
      reasons.push("Held 15+ years — likely motivated seller or deferred maintenance");
    } else if (saleY && saleY <= 2015) {
      score += 20;
      reasons.push("Held 10+ years — value-add or repositioning candidate");
    } else if (saleY && saleY <= 2018) {
      score += 10;
      reasons.push("Pre-2018 acquisition — review for value-add opportunity");
    }
    // No sale data at all (unknown hold period = opportunity to investigate)
    if (!saleY) {
      score += 20;
      reasons.push("No recorded sale date — ownership history unclear");
    }
    // Leveraged (debt on record)
    if (rec.mortgaged) {
      score += 15;
      reasons.push("Leveraged — may have refinancing pressure");
    }
    // Peak-era acquisition (2019-21 multifamily was also expensive)
    if (peakEra) {
      score += 15;
      reasons.push("Acquired at 2019-21 peak pricing");
    }
  } else {
    // ── Commercial / Office distress model ───────────────────────────────
    if (isOffice && peakEra) {
      score += 55;
      reasons.push("Office bought at 2019-21 peak — distressed class");
    } else if (peakEra) {
      score += 35;
      reasons.push("Peak-era acquisition (2019-21)");
    }
    if (isOffice && bigTicket) {
      score += 20;
      reasons.push("Institutional-scale office ($50M+)");
    }
    if (downPct >= 5) {
      score += Math.min(40, downPct);
      reasons.push(`${rec.avm ? "AVM" : "Assessed"} ${downPct}% below purchase (underwater)`);
    }
    if (rec.mortgaged) {
      score += 15;
      reasons.push("Leveraged (mortgage on record)");
    }
    if (!peakEra && saleY && saleY <= 2017) {
      score += 10;
      reasons.push("Stale ownership (pre-2018)");
    }
    if (!saleY) {
      score += 5;
      reasons.push("No recorded sale date");
    }
    if (isCommercial && !isOffice && !peakEra) {
      score += 5;
    }
  }

  const band = score >= 60 ? "RED" : score >= 30 ? "YELLOW" : "GREEN";
  return { distressScore: Math.min(100, score), band, distressReasons: reasons };
}

async function huntDeals({ markets, assetClasses, minDistressScore, maxResults }, apiKey) {
  if (!apiKey) return { ok: false, error: "ATTOM key not configured" };

  // Determine ATTOM propertytype filter from assetClasses.
  // Multifamily maps to RESIDENTIAL (ATTOM doesn't accept MULTIFAMILY); we then
  // filter client-side to drop clearly non-residential results.
  const isMFOnly = (assetClasses || []).length === 1 && assetClasses[0] === "Multifamily";
  const attomTypes = (assetClasses || []).map(assetClassToAttomType).filter(Boolean);
  const serverTypeFilter = attomTypes.length === 1 ? attomTypes[0] : "COMMERCIAL";

  const allResults = [];

  for (const market of markets) {
    const centers = resolveCenters(market);
    if (!centers || !centers.length) {
      console.warn("dealHunt: no center coords for market:", market);
      continue;
    }

    for (const center of centers) {
      // lat/lng radius snapshot — the only ATTOM pattern that works for area queries.
      const typePart = serverTypeFilter ? `&propertytype=${encodeURIComponent(serverTypeFilter)}` : "";
      const snap = await attomGet(
        `/property/snapshot?latitude=${center.lat}&longitude=${center.lng}&radius=0.6${typePart}`,
        apiKey
      );

      if (snap.status === 401 || snap.status === 403) {
        console.error("dealHunt: ATTOM auth failure for market:", market);
        return { ok: false, error: "Live property data is temporarily unavailable — please check back shortly.", code: "ATTOM_UNAVAILABLE" };
      }
      if (!snap.ok || !snap.json?.property?.length) {
        console.warn("dealHunt: no properties for", market, center.name, "status:", snap.status);
        continue;
      }

      // Enrich each snapshot result with expanded profile data (sale + assessment).
      const snapProps = snap.json.property.slice(0, 10);
      for (const pr of snapProps) {
        const attomId = pr?.identifier?.attomId;
        if (!attomId) continue;

        // Client-side multi-class filter on snapshot propType.
        const snapPropType = (pr?.summary?.proptype || pr?.summary?.propclass || "").toUpperCase();
        if (attomTypes.length > 1) {
          if (!attomTypes.some(t => snapPropType.includes(t))) continue;
        }
        // For multifamily-only: skip properties ATTOM explicitly marks as office/commercial/retail/industrial.
        if (isMFOnly && /OFFICE|COMMERCIAL|RETAIL|INDUSTRIAL/i.test(snapPropType)) continue;

        // Fetch expanded profile for sale + assessment + mortgage.
        const ep = await attomGet(`/property/expandedprofile?attomid=${attomId}`, apiKey);
        const e = ep?.json?.property?.[0] || {};

        const saleAmt = num(e?.sale?.amount?.saleAmt);
        const saleDate = e?.sale?.amount?.saleRecDate || e?.sale?.saleTransDate || null;
        const assessedTtl = num(e?.assessment?.assessed?.assdTtlValue);
        const avm = num(e?.avm?.amount?.value);
        const mortgaged = !!(e?.mortgage && Object.keys(e.mortgage).length);
        const propType = e?.summary?.propclass || e?.summary?.proptype || pr?.summary?.proptype || pr?.summary?.propclass || "Commercial";

        const rec = {
          attomId,
          address: e?.address?.oneLine || pr?.address?.oneLine || "",
          market,
          submarket: center.name,
          lat: num(e?.location?.latitude || pr?.location?.latitude),
          lng: num(e?.location?.longitude || pr?.location?.longitude),
          propType,
          lastSale: saleAmt,
          lastSaleDate: saleDate,
          assessedValue: assessedTtl,
          avm,
          mortgaged,
          sqft: num(e?.building?.size?.universalsize || e?.building?.size?.bldgsize || pr?.building?.size?.universalsize),
          apn: e?.identifier?.apn || pr?.identifier?.apn || "",
        };

        const { distressScore, band, distressReasons } = scoreDistress(rec);
        if (distressScore < (minDistressScore || 0)) continue;

        allResults.push({ ...rec, distressScore, band, distressReasons });
      }
    }
  }

  // Sort by distress score descending, dedupe by attomId, take top maxResults.
  const seen = new Set();
  const unique = allResults
    .sort((a, b) => b.distressScore - a.distressScore)
    .filter(r => { if (seen.has(r.attomId)) return false; seen.add(r.attomId); return true; });

  const results = unique.slice(0, maxResults || 20);
  return { ok: true, results, scannedAt: new Date().toISOString() };
}

module.exports = { huntDeals };
