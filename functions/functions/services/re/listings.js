// services/re/listings.js — Realtor.com listing search via RapidAPI.
// Degrades gracefully to ATTOM-only if RAPIDAPI_KEY is missing.

const REALTOR_HOST = "realtor16.p.rapidapi.com";
const REALTOR_BASE = "https://realtor16.p.rapidapi.com";

const PROPERTY_TYPE_MAP = {
  "single_family": "single_family",
  "condo": "condos",
  "townhouse": "townhomes",
  "multi_family": "multi_family",
  "land": "land",
  "mobile": "mobile",
  "farm": "farm",
  "other": "any",
};

function parseLocation(location) {
  const s = String(location || "").trim();
  const i = s.lastIndexOf(",");
  if (i !== -1) {
    return { city: s.slice(0, i).trim(), stateCode: s.slice(i + 1).trim().toUpperCase().replace(/\s/g, "") || "CA" };
  }
  return { city: s, stateCode: "CA" };
}

function mapListing(raw) {
  if (!raw) return null;
  const loc = raw.location || {};
  const addr = loc.address || {};
  const price = (raw.list_price || raw.price || 0);
  const sqft = (raw.description && (raw.description.sqft || raw.description.lot_sqft)) || 0;
  const photos = raw.photos || raw.primary_photo ? [raw.primary_photo].filter(Boolean) : [];
  return {
    id: raw.property_id || raw.id || null,
    address: [addr.line, addr.city, addr.state_code, addr.postal_code].filter(Boolean).join(", "),
    price: price ? "$" + Number(price).toLocaleString() : null,
    beds: (raw.description && raw.description.beds) || null,
    baths: (raw.description && raw.description.baths_consolidated) || null,
    sqft: sqft || null,
    yearBuilt: (raw.description && raw.description.year_built) || null,
    daysOnMarket: raw.days_on_mls || null,
    status: raw.status || null,
    photoUrl: (raw.primary_photo && raw.primary_photo.href) || (photos[0] && photos[0].href) || null,
    listingUrl: raw.href || null,
    pricePerSqft: price && sqft ? Math.round(price / sqft) : null,
    priceHistory: raw.price_history || [],
  };
}

async function searchListings(criteria, rapidApiKey) {
  if (!rapidApiKey) {
    return { ok: false, count: 0, listings: [], error: "Listing search unavailable — ATTOM property lookup still works for any address" };
  }

  const c = criteria || {};
  const { city, stateCode } = parseLocation(c.location || "");

  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (stateCode) params.set("state_code", stateCode);
  if (c.minPrice) params.set("price_min", String(c.minPrice));
  if (c.maxPrice) params.set("price_max", String(c.maxPrice));
  if (c.beds) params.set("beds_min", String(c.beds));
  if (c.baths) params.set("baths_min", String(c.baths));
  if (c.propertyType && PROPERTY_TYPE_MAP[c.propertyType]) params.set("type", PROPERTY_TYPE_MAP[c.propertyType]);
  params.set("limit", "20");
  params.set("offset", "0");

  try {
    const resp = await fetch(`${REALTOR_BASE}/search/forsale?${params.toString()}`, {
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": REALTOR_HOST,
        "accept": "application/json",
      },
    });

    if (!resp.ok) {
      return { ok: false, count: 0, listings: [], error: "Listing search unavailable — ATTOM property lookup still works for any address" };
    }

    const json = await resp.json().catch(() => ({}));
    const results = (json.data && json.data.results) || json.results || json.properties || [];
    const listings = results.map(mapListing).filter(Boolean);

    return { ok: true, count: listings.length, listings };
  } catch (e) {
    return { ok: false, count: 0, listings: [], error: "Listing search unavailable — ATTOM property lookup still works for any address" };
  }
}

async function getListingDetail(listingId, rapidApiKey) {
  if (!rapidApiKey) {
    return { ok: false, error: "Listing detail unavailable — ATTOM property lookup still works for any address" };
  }

  try {
    const resp = await fetch(`${REALTOR_BASE}/property/details?property_id=${encodeURIComponent(listingId)}`, {
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": REALTOR_HOST,
        "accept": "application/json",
      },
    });

    if (!resp.ok) {
      return { ok: false, error: "Listing detail unavailable" };
    }

    const json = await resp.json().catch(() => ({}));
    const raw = (json.data && json.data.results && json.data.results[0]) || json.result || json.property || {};
    const desc = raw.description || {};
    const loc = raw.location || {};
    const addr = loc.address || {};

    const schools = (raw.schools || loc.county || null) && {
      elementary: raw.schools && raw.schools.find(s => s.education_levels && s.education_levels.includes("elementary")),
      middle: raw.schools && raw.schools.find(s => s.education_levels && s.education_levels.includes("middle")),
      high: raw.schools && raw.schools.find(s => s.education_levels && s.education_levels.includes("high_school")),
    };

    return {
      ok: true,
      id: raw.property_id || listingId,
      address: [addr.line, addr.city, addr.state_code, addr.postal_code].filter(Boolean).join(", "),
      price: raw.list_price ? "$" + Number(raw.list_price).toLocaleString() : null,
      beds: desc.beds || null,
      baths: desc.baths_consolidated || null,
      sqft: desc.sqft || null,
      yearBuilt: desc.year_built || null,
      description: desc.text || null,
      photos: (raw.photos || []).map(ph => ph.href).filter(Boolean),
      hoa: raw.hoa_fee ? "$" + Number(raw.hoa_fee).toLocaleString() + "/mo" : null,
      schools: schools || null,
      status: raw.status || null,
      daysOnMarket: raw.days_on_mls || null,
      priceHistory: raw.price_history || [],
    };
  } catch (e) {
    return { ok: false, error: "Listing detail unavailable" };
  }
}

// ─── searchByAddress ─────────────────────────────────────────────────────────
// Fallback for when ATTOM has no recorded data (rural parcels, unrecorded
// subdivisions, proposed land sales). Extracts city+state from a full street
// address, searches MLS, then filters for the closest address match.
// Returns { ok, listing, source: "mls" } or { ok: false } — never throws.

async function searchByAddress(address, rapidApiKey) {
  if (!rapidApiKey) return { ok: false, source: "mls", listing: null };

  // Parse "123 Ranch Rd, Dyer, NV 89010" → city="Dyer", state="NV"
  const parts = String(address || "").split(",").map(s => s.trim());
  if (parts.length < 2) return { ok: false, source: "mls", listing: null };

  // Last part may be "NV 89010" or "NV" — extract state code
  const last = parts[parts.length - 1];
  const stateMatch = last.match(/\b([A-Z]{2})\b/);
  const stateCode = stateMatch ? stateMatch[1] : "CA";
  // City is the second-to-last comma segment
  const city = parts.length >= 3 ? parts[parts.length - 2] : parts[0];
  const streetLine = parts[0].toLowerCase().trim();

  try {
    const params = new URLSearchParams({ city, state_code: stateCode, limit: "20", offset: "0" });
    const resp = await fetch(`${REALTOR_BASE}/search/forsale?${params.toString()}`, {
      headers: {
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": REALTOR_HOST,
        "accept": "application/json",
      },
    });
    if (!resp.ok) return { ok: false, source: "mls", listing: null };

    const json = await resp.json().catch(() => ({}));
    const results = (json.data && json.data.results) || json.results || json.properties || [];

    // Fuzzy match: normalize both sides, check if street numbers + first word match
    const streetNum = streetLine.match(/^\d+/)?.[0] || "";
    const streetWord = streetLine.replace(/^\d+\s*/, "").split(/\s+/)[0] || "";

    const match = results.find(r => {
      const rAddr = ((r.location && r.location.address && r.location.address.line) || "").toLowerCase();
      return (streetNum && rAddr.startsWith(streetNum)) ||
             (streetWord.length > 2 && rAddr.includes(streetWord));
    });

    if (!match) {
      // No direct match — return any nearby land/rural listings as context
      const landListings = results.filter(r => {
        const t = ((r.description && r.description.type) || r.type || "").toLowerCase();
        return t.includes("land") || t.includes("farm") || t.includes("acreage");
      }).slice(0, 3).map(mapListing).filter(Boolean);
      return { ok: false, source: "mls", listing: null, nearbyLand: landListings };
    }

    return { ok: true, source: "mls", listing: mapListing(match) };
  } catch (e) {
    return { ok: false, source: "mls", listing: null };
  }
}

module.exports = { searchListings, getListingDetail, searchByAddress };
