// services/re/financing.js — Financing constraint analysis for the RE Advocate.
// All data is sourced from free public government APIs. No referral arrangements.
// Property-level facts only — see CODEX 41 RT4 (Fair Housing / redlining constraint).

// ─── FHFA 2025 Conforming Loan Limits ────────────────────────────────────────
// Embedded static table — updated annually (FHFA announces in November for following year).
// 1-unit property limits only. Source: FHFA.gov 2025 CLL announcement.
// Standard baseline: $806,500. Ceiling: $1,209,750 (150% of baseline, Alaska/HI/GU/VI).
// High-cost counties listed below; everything else → baseline.

const BASELINE_LIMIT = 806500;
const CEILING_LIMIT = 1209750;

// Key high-cost counties by state → { county (lowercase), limit }
const HIGH_COST_COUNTIES = {
  CA: [
    { county: "san francisco", limit: 1209750 },
    { county: "san mateo", limit: 1209750 },
    { county: "santa clara", limit: 1209750 },
    { county: "marin", limit: 1209750 },
    { county: "alameda", limit: 1209750 },
    { county: "contra costa", limit: 1209750 },
    { county: "santa cruz", limit: 1209750 },
    { county: "san benito", limit: 1209750 },
    { county: "los angeles", limit: 1149825 },
    { county: "orange", limit: 1149825 },
    { county: "san diego", limit: 1006250 },
    { county: "ventura", limit: 954500 },
    { county: "monterey", limit: 920700 },
    { county: "napa", limit: 897000 },
    { county: "santa barbara", limit: 871450 },
    { county: "sonoma", limit: 861350 },
    { county: "san luis obispo", limit: 911950 },
  ],
  HI: [
    { county: "honolulu", limit: CEILING_LIMIT },
    { county: "maui", limit: CEILING_LIMIT },
    { county: "hawaii", limit: CEILING_LIMIT },
    { county: "kauai", limit: CEILING_LIMIT },
  ],
  NV: [
    { county: "douglas", limit: 834050 },
    { county: "washoe", limit: 862500 },
  ],
  CO: [
    { county: "pitkin", limit: CEILING_LIMIT },
    { county: "san miguel", limit: CEILING_LIMIT },
    { county: "summit", limit: 1012450 },
    { county: "eagle", limit: 1209750 },
    { county: "garfield", limit: 1209750 },
  ],
  WA: [
    { county: "king", limit: 977500 },
    { county: "snohomish", limit: 977500 },
    { county: "pierce", limit: 977500 },
    { county: "san juan", limit: 977500 },
  ],
  NY: [
    { county: "new york", limit: CEILING_LIMIT },
    { county: "kings", limit: CEILING_LIMIT },
    { county: "queens", limit: CEILING_LIMIT },
    { county: "bronx", limit: CEILING_LIMIT },
    { county: "richmond", limit: CEILING_LIMIT },
    { county: "nassau", limit: CEILING_LIMIT },
    { county: "suffolk", limit: CEILING_LIMIT },
    { county: "westchester", limit: CEILING_LIMIT },
    { county: "putnam", limit: CEILING_LIMIT },
    { county: "rockland", limit: CEILING_LIMIT },
  ],
  MA: [
    { county: "barnstable", limit: 862500 },
    { county: "dukes", limit: 862500 },
    { county: "nantucket", limit: CEILING_LIMIT },
    { county: "middlesex", limit: CEILING_LIMIT },
    { county: "norfolk", limit: CEILING_LIMIT },
    { county: "suffolk", limit: CEILING_LIMIT },
    { county: "essex", limit: CEILING_LIMIT },
    { county: "worcester", limit: CEILING_LIMIT },
    { county: "bristol", limit: CEILING_LIMIT },
  ],
};

function getConformingLimit(state, county) {
  if (!state) return { limit: BASELINE_LIMIT, type: "standard" };
  const st = state.toUpperCase().slice(0, 2);
  const cn = (county || "").toLowerCase().trim();
  if (["AK", "HI", "GU", "VI"].includes(st)) return { limit: CEILING_LIMIT, type: "ceiling" };
  const list = HIGH_COST_COUNTIES[st] || [];
  const match = list.find((e) => cn.includes(e.county) || e.county.includes(cn));
  if (match) return { limit: match.limit, type: "high-cost" };
  return { limit: BASELINE_LIMIT, type: "standard" };
}

// ─── Census Bureau Geocoder ───────────────────────────────────────────────────
// Free, no API key. Returns { lat, lng } or null.

async function geocode(address) {
  try {
    const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
    url.searchParams.set("address", address);
    url.searchParams.set("benchmark", "2020");
    url.searchParams.set("format", "json");
    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    const json = await resp.json().catch(() => null);
    const matches = json?.result?.addressMatches;
    if (!Array.isArray(matches) || !matches.length) return null;
    const coords = matches[0]?.coordinates;
    if (!coords?.x || !coords?.y) return null;
    return { lat: coords.y, lng: coords.x };
  } catch {
    return null;
  }
}

// ─── FEMA NFHL — Flood Zone ───────────────────────────────────────────────────
// ArcGIS REST service: National Flood Hazard Layer, layer 28 (S_FLD_HAZ_AR).
// Returns flood zone code and whether it's a Special Flood Hazard Area (SFHA).

const FEMA_NFHL_URL = "https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query";

const FLOOD_ZONE_LABELS = {
  "A": "Zone A — high risk, 100-year floodplain (BFE not determined)",
  "AE": "Zone AE — high risk, 100-year floodplain (BFE established)",
  "AH": "Zone AH — high risk, shallow flooding",
  "AO": "Zone AO — high risk, sheet flow flooding",
  "AR": "Zone AR — area with mitigation in progress",
  "A99": "Zone A99 — high risk, federal flood protection system being built",
  "V": "Zone V — high risk, coastal with velocity (wave action)",
  "VE": "Zone VE — high risk, coastal with velocity (BFE established)",
  "X": "Zone X — standard risk or minimal risk (outside 500-year floodplain)",
  "D": "Zone D — undetermined risk (not studied)",
};

function floodZoneRisk(zone) {
  const z = (zone || "").toUpperCase().trim();
  if (z.startsWith("V") || z === "A" || z === "AE" || z === "AH" || z === "AO" || z === "A99" || z === "AR") return "high";
  if (z === "X500" || z === "0.2 PCT ANNUAL CHANCE FLOOD HAZARD") return "moderate";
  if (z === "X" || z === "X (UNSHADED)") return "minimal";
  if (z === "D") return "undetermined";
  return "unknown";
}

async function getFloodZone(lat, lng) {
  try {
    const url = new URL(FEMA_NFHL_URL);
    url.searchParams.set("geometry", `${lng},${lat}`);
    url.searchParams.set("geometryType", "esriGeometryPoint");
    url.searchParams.set("inSR", "4326");
    url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
    url.searchParams.set("outFields", "FLD_ZONE,SFHA_TF,ZONE_SUBTY,STATIC_BFE");
    url.searchParams.set("returnGeometry", "false");
    url.searchParams.set("f", "json");
    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const json = await resp.json().catch(() => null);
    const features = json?.features;
    if (!Array.isArray(features) || !features.length) {
      return { available: true, zone: "X", isSFHA: false, risk: "minimal", label: FLOOD_ZONE_LABELS["X"] || "Zone X — minimal risk", source: "FEMA NFHL" };
    }
    const attrs = features[0].attributes || {};
    const zone = (attrs.FLD_ZONE || "X").toUpperCase().trim();
    const isSFHA = attrs.SFHA_TF === "T" || ["A","AE","AH","AO","AR","A99","V","VE"].includes(zone);
    return {
      available: true,
      zone,
      isSFHA,
      risk: floodZoneRisk(zone),
      label: FLOOD_ZONE_LABELS[zone] || `Zone ${zone}`,
      bfe: attrs.STATIC_BFE || null,
      source: "FEMA NFHL",
    };
  } catch {
    return { available: false };
  }
}

// ─── CALFIRE Fire Hazard Severity Zone (California only) ──────────────────────
// CAL FIRE FHSZ feature service via California's ArcGIS Online.
// Only called when state = CA.

const CALFIRE_URL = "https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/CALFIRE_FHSZ/FeatureServer/0/query";

const FHSZ_LABELS = {
  "1": "Moderate — state-regulated zone; stricter building codes apply",
  "2": "High — limited insurer participation; ember-resistant construction required",
  "3": "Very High — most restrictive; some insurers have fully exited this market",
  "MODERATE": "Moderate — state-regulated zone; stricter building codes apply",
  "HIGH": "High — limited insurer participation; ember-resistant construction required",
  "VERY HIGH": "Very High — most restrictive; some insurers have fully exited this market",
};

async function getFireHazardZone(lat, lng) {
  try {
    const url = new URL(CALFIRE_URL);
    url.searchParams.set("geometry", `${lng},${lat}`);
    url.searchParams.set("geometryType", "esriGeometryPoint");
    url.searchParams.set("inSR", "4326");
    url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
    url.searchParams.set("outFields", "HAZ_CLASS,SRA");
    url.searchParams.set("returnGeometry", "false");
    url.searchParams.set("f", "json");
    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const json = await resp.json().catch(() => null);
    const features = json?.features;
    if (!Array.isArray(features) || !features.length) {
      return { available: true, zone: null, label: "Not in a designated Fire Hazard Severity Zone", source: "CAL FIRE FHSZ" };
    }
    const attrs = features[0].attributes || {};
    const zone = String(attrs.HAZ_CLASS || "").toUpperCase().trim();
    return {
      available: true,
      zone: zone || null,
      label: FHSZ_LABELS[zone] || `Fire Hazard Zone: ${zone}`,
      sra: attrs.SRA || null,
      source: "CAL FIRE FHSZ",
    };
  } catch {
    return { available: false };
  }
}

// ─── HUD FHA Condo Project Approval ──────────────────────────────────────────
// Only called when propertyType indicates a condominium.
// Uses HUD's ENTP condominiums search endpoint.

async function getFHACondoApproval(address) {
  try {
    const url = new URL("https://entp.hud.gov/idapp/html/condlook.cfm");
    url.searchParams.set("RequestType", "SEARCH");
    // Parse city and zip from address for the lookup
    const parts = String(address || "").split(",");
    const cityState = parts.slice(1).join(",").trim();
    const zipMatch = cityState.match(/\b(\d{5})\b/);
    if (zipMatch) url.searchParams.set("zip", zipMatch[1]);
    const cityMatch = cityState.match(/([A-Za-z\s]+),\s*[A-Z]{2}/);
    if (cityMatch) url.searchParams.set("city", cityMatch[1].trim());
    url.searchParams.set("status", "A");
    url.searchParams.set("Submit", "Search");
    const resp = await fetch(url.toString(), {
      headers: { "Accept": "text/html" },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return { available: false };
    const html = await resp.text();
    // Check for approval indicators in the HTML response
    const approved = html.includes("APPROVED") || html.includes("HUD Approved");
    const expired = html.includes("EXPIRED") || html.includes("PENDING");
    return {
      available: true,
      approved: approved && !expired,
      status: approved ? (expired ? "Expired/Pending" : "Approved") : "Not found / not approved",
      note: "FHA approval required for FHA financing on condos. Verify directly with HUD before relying on this for an offer.",
      source: "HUD ENTP FHA Condo Lookup",
    };
  } catch {
    return { available: false };
  }
}

// ─── USDA Rural Development Eligibility ──────────────────────────────────────
// GeoServer WFS query. Returns whether address is in a USDA-eligible rural area.

async function getUSDAEligibility(lat, lng) {
  try {
    const url = new URL("https://geonode.sc.egov.usda.gov/geoserver/ows");
    url.searchParams.set("service", "WFS");
    url.searchParams.set("version", "1.0.0");
    url.searchParams.set("request", "GetFeature");
    url.searchParams.set("typeName", "usda:SFHGLP_Eligible_Areas");
    url.searchParams.set("outputFormat", "application/json");
    // Bounding box: tiny box around the point
    const delta = 0.001;
    url.searchParams.set("bbox", `${lng - delta},${lat - delta},${lng + delta},${lat + delta},EPSG:4326`);
    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    const json = await resp.json().catch(() => null);
    const features = json?.features;
    const eligible = Array.isArray(features) && features.length > 0;
    return {
      available: true,
      eligible,
      label: eligible
        ? "USDA Rural Development eligible — USDA loan programs available (0% down, income limits apply)"
        : "Not in a USDA eligible rural area — conventional/FHA/VA programs apply",
      source: "USDA SFHGLP Eligibility Map",
    };
  } catch {
    return { available: false };
  }
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

async function getFinancingConstraints({ address, lat, lng, state, county, propertyType }) {
  // Geocode if no coordinates provided
  let coords = (lat && lng) ? { lat, lng } : null;
  if (!coords) coords = await geocode(address);

  const isCondo = /condo|condominium|townhouse|townhome/i.test(propertyType || "");
  const isCA = /^CA$/i.test(state || "");

  // Fire off all relevant API calls in parallel
  const [flood, fire, fhaRaw, usda] = await Promise.all([
    coords ? getFloodZone(coords.lat, coords.lng) : Promise.resolve({ available: false }),
    (coords && isCA) ? getFireHazardZone(coords.lat, coords.lng) : Promise.resolve({ available: false, skipped: "CA only" }),
    isCondo ? getFHACondoApproval(address) : Promise.resolve({ available: false, skipped: "Single family — FHA project approval not applicable" }),
    coords ? getUSDAEligibility(coords.lat, coords.lng) : Promise.resolve({ available: false }),
  ]);

  const loanLimit = getConformingLimit(state, county);

  const fha = isCondo ? fhaRaw : { available: false, skipped: "Not a condo" };

  return {
    ok: true,
    address,
    geocoded: !!coords,
    flood,
    fire,
    fha,
    loanLimit: {
      available: true,
      amount: loanLimit.limit,
      type: loanLimit.type,
      label: loanLimit.type === "high-cost"
        ? `High-cost area — conforming limit $${loanLimit.limit.toLocaleString()} (as of 2025)`
        : loanLimit.type === "ceiling"
        ? `Alaska/HI/territory — ceiling limit $${loanLimit.limit.toLocaleString()}`
        : `Standard conforming limit $${loanLimit.limit.toLocaleString()} (as of 2025)`,
      note: "Loans above this limit require jumbo financing — larger down payment, stricter underwriting, fewer lenders.",
      source: "FHFA 2025 Conforming Loan Limits",
    },
    usda,
  };
}

module.exports = { getFinancingConstraints };
