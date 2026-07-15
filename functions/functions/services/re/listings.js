// services/re/listings.js — Realtor.com listing search via RapidAPI.
// Degrades gracefully to ATTOM-only if RAPIDAPI_KEY is missing.

const REALTOR_HOST = "realtor.p.rapidapi.com";
const REALTOR_BASE = "https://realtor.p.rapidapi.com";

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
    const resp = await fetch(`${REALTOR_BASE}/properties/v3/list?${params.toString()}`, {
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
    const resp = await fetch(`${REALTOR_BASE}/properties/v3/detail?property_id=${encodeURIComponent(listingId)}`, {
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

module.exports = { searchListings, getListingDetail };
