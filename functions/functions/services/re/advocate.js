// services/re/advocate.js — Real Estate Advocate: CMA, deep property dive, disclosure package.
// All ATTOM calls use the shared attomGet pattern from liveLookup.js.
// Fallback chain: LOCAL propertyCache (same DB the title vertical reads/writes)
// → ATTOM (recorded data) → Realtor.com MLS (listings) → county assessor guidance.
// ATTOM is a live supplement, not a hard dependency — cached/seeded properties
// (see scripts/bulkPullPropertyCache.js) serve CMA and deep-dive requests with
// zero live API calls.

const admin = require("firebase-admin");
const { normalizeAddressKey } = require("./liveLookup");

function getDb() { return admin.firestore(); }

const ATTOM_BASE = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";

async function attomGet(path, params, apiKey) {
  const url = new URL(ATTOM_BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const resp = await fetch(url.toString(), { headers: { apikey: apiKey, accept: "application/json" } });
  const json = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, json };
}

function splitAddress(address) {
  const s = String(address || "").trim();
  const i = s.indexOf(",");
  if (i === -1) return null;
  return { address1: s.slice(0, i).trim(), address2: s.slice(i + 1).trim() };
}

const money = (n) => (n == null ? null : "$" + Number(n).toLocaleString());

function median(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── local propertyCache fallback (title's DB, reused here) ─────────────────

async function _getCachedProperty(address) {
  const key = normalizeAddressKey(address);
  const snap = await getDb().collection("propertyCache").doc(key).get();
  return snap.exists ? { key, ...snap.data() } : null;
}

// Comparable sales sourced from other cached/seeded properties in the same
// state — not a live radius search, but real structured data (not fabricated
// on the spot). Prefers same demoCategory (sfr/multifamily/office/etc.) when
// enough matches exist, falls back to any same-state property otherwise.
async function _findCachedComps(state, excludeKey, demoCategory, limit = 10) {
  if (!state) return [];
  const snap = await getDb().collection("propertyCache").where("attom.state", "==", state).limit(40).get();
  const all = snap.docs.filter((d) => d.id !== excludeKey).map((d) => d.data());
  const sameCategory = demoCategory ? all.filter((d) => d.demoCategory === demoCategory) : [];
  return (sameCategory.length >= 3 ? sameCategory : all).slice(0, limit);
}

function _cmaFromCache(cached, address) {
  const a = cached.attom || {};
  const subject = {
    address: a.address || address,
    beds: null,
    baths: null,
    sqft: a.bldgSqft || null,
    yearBuilt: a.yearBuilt || null,
    lastSalePrice: a.lastSaleAmt || null,
    lastSaleDate: a.lastSaleDate || null,
  };
  return { subject, state: a.state || null, demoCategory: cached.demoCategory || null };
}

async function _runCmaFromCache(cached, address) {
  const { subject, state, demoCategory } = _cmaFromCache(cached, address);
  const compDocs = await _findCachedComps(state, cached.key, demoCategory).catch(() => []);
  const comps = compDocs
    .map((d) => {
      const c = d.attom || {};
      const saleAmt = c.lastSaleAmt || null;
      const sqft = c.bldgSqft || null;
      return {
        address: c.address || null,
        beds: null,
        baths: null,
        sqft: sqft ? Number(sqft) : null,
        salePrice: saleAmt ? Number(saleAmt) : null,
        saleDate: c.lastSaleDate || null,
        pricePerSqft: saleAmt && sqft ? Math.round(Number(saleAmt) / Number(sqft)) : null,
        daysOnMarket: null,
        listSaleRatio: null,
      };
    })
    .filter((c) => c.salePrice);

  const salePrices = comps.map((c) => c.salePrice);
  const pricePerSqfts = comps.filter((c) => c.pricePerSqft).map((c) => c.pricePerSqft);
  const medianPrice = median(salePrices);
  const medianPpsf = median(pricePerSqfts);

  const estimate = medianPrice ? {
    low: money(Math.round(medianPrice * 0.93)),
    mid: money(Math.round(medianPrice)),
    high: money(Math.round(medianPrice * 1.07)),
    confidence: comps.length >= 5 ? "high" : comps.length >= 3 ? "medium" : "low",
    methodology: "Local property database comparable sales — no live ATTOM connection",
  } : null;

  const warning = comps.length < 3
    ? `Only ${comps.length} comp${comps.length === 1 ? "" : "s"} found in the local property database for this state. This is offline/cached data, not a live radius search — treat the estimate as directional.`
    : `Comparable sales are drawn from the local property database (offline), not a live 0.5mi radius search — treat as directional.`;

  return {
    ok: true,
    subject,
    comps,
    marketMetrics: {
      medianSalePrice: medianPrice ? money(medianPrice) : null,
      medianPricePerSqft: medianPpsf ? money(medianPpsf) + "/sqft" : null,
      avgDaysOnMarket: null,
      avgListSaleRatio: null,
      compsUsed: comps.length,
    },
    estimate,
    warning,
    fromCache: true,
  };
}

// ─── runCMA ──────────────────────────────────────────────────────────────────

async function runCMA(address, apiKey, rapidApiKey) {
  const parsed = splitAddress(address);
  if (!parsed) return { ok: false, error: 'Use "street, city, ST" — e.g. "1234 Oak St, Oakland, CA".' };

  const cached = await _getCachedProperty(address).catch(() => null);
  if (cached && cached.attom) return _runCmaFromCache(cached, address);

  if (!apiKey) return { ok: false, error: "ATTOM key not configured" };

  const [detailRes, compsRes] = await Promise.all([
    attomGet("/property/detail", parsed, apiKey),
    attomGet("/saleshistory/snapshot", {
      address1: parsed.address1,
      address2: parsed.address2,
      searchType: "Radius",
      radius: "0.5",
      maxresults: "10",
    }, apiKey),
  ]);

  if (detailRes.status === 401 || detailRes.status === 403) {
    return { ok: false, error: "Live property data is temporarily unavailable — please check back shortly." };
  }

  const p = detailRes.json && detailRes.json.property && detailRes.json.property[0];
  if (!p) {
    // ATTOM has no record — try MLS as fallback before giving up
    const { searchByAddress } = require("../re/listings");
    const mlsFallback = await searchByAddress(address, rapidApiKey).catch(() => ({ ok: false }));

    const _addr = String(address).toLowerCase();
    const _isRural = /\b(ranch|hwy|highway|route|rr\s*\d|county road|cr\s*\d|fm\s*\d)\b/.test(_addr) ||
      /,\s*(nv|nm|mt|nd|sd|wy|id|ak)\s*\d{5}/.test(_addr);
    const _county = address.match(/,\s*([A-Za-z\s]+),\s*[A-Z]{2}/)?.[1]?.trim() || null;
    const _assessorNote = _county
      ? ` For ${_county} County, check the county assessor's parcel search or recorder's office directly.`
      : " Check the county assessor's parcel search or recorder's office directly.";

    if (mlsFallback.ok && mlsFallback.listing) {
      return {
        ok: false,
        mlsFallback: true,
        mlsListing: mlsFallback.listing,
        error: `No county-recorded title data found for "${address}" in ATTOM.${_isRural ? " This is common for rural parcels, ranch roads, and unincorporated addresses." : " This property may not yet be recorded or may be a new subdivision."} However, there is an active MLS listing for this address — see below. Note: MLS data reflects the listing, not the recorded chain of title.${_assessorNote} Share the APN if you have it.`,
      };
    }

    if (mlsFallback.nearbyLand && mlsFallback.nearbyLand.length > 0) {
      return {
        ok: false,
        mlsFallback: true,
        nearbyLand: mlsFallback.nearbyLand,
        error: `No county-recorded title data found for "${address}" in ATTOM, and no exact MLS match.${_isRural ? " Rural and ranch addresses in this area often fall outside both ATTOM's and MLS coverage." : ""} Found ${mlsFallback.nearbyLand.length} nearby land listing(s) in the area that may be relevant.${_assessorNote}`,
      };
    }

    if (_isRural) {
      return {
        ok: false,
        error: `No recorded property data found for "${address}". Rural, ranch, and highway addresses — especially in Nevada, Montana, Wyoming, and similar states — often fall outside both ATTOM's recorded-data coverage and MLS listings.${_assessorNote} If you have the APN (Assessor's Parcel Number), share it and I can explain what records to request.`,
      };
    }
    return { ok: false, error: `No property found at "${address}". Verify the full street address including city and state — e.g. "123 Main St, Las Vegas, NV". If this is a new subdivision or proposed sale, there may be no recorded title yet — try the county assessor's parcel search.` };
  }

  const subject = {
    address: (p.address && p.address.oneLine) || address,
    beds: (p.building && p.building.rooms && p.building.rooms.beds) || null,
    baths: (p.building && p.building.rooms && (p.building.rooms.bathsfull || p.building.rooms.bathstotal)) || null,
    sqft: (p.building && p.building.size && (p.building.size.universalsize || p.building.size.bldgsize)) || null,
    yearBuilt: (p.summary && p.summary.yearbuilt) || null,
    lastSalePrice: (p.sale && p.sale.amount && p.sale.amount.saleamt) || null,
    lastSaleDate: (p.sale && p.sale.amount && p.sale.amount.salerecdate) || null,
  };

  const compProps = (compsRes.json && compsRes.json.property) || [];
  const comps = compProps
    .filter((c) => c && c.identifier && c.identifier.apn !== p.identifier.apn)
    .map((c) => {
      const saleAmt = (c.sale && c.sale.amount && c.sale.amount.saleamt) || null;
      const sqft = (c.building && c.building.size && (c.building.size.universalsize || c.building.size.bldgsize)) || null;
      return {
        address: (c.address && c.address.oneLine) || null,
        beds: (c.building && c.building.rooms && c.building.rooms.beds) || null,
        baths: (c.building && c.building.rooms && (c.building.rooms.bathsfull || c.building.rooms.bathstotal)) || null,
        sqft: sqft ? Number(sqft) : null,
        salePrice: saleAmt ? Number(saleAmt) : null,
        saleDate: (c.sale && c.sale.amount && c.sale.amount.salerecdate) || null,
        pricePerSqft: saleAmt && sqft ? Math.round(Number(saleAmt) / Number(sqft)) : null,
        daysOnMarket: (c.sale && c.sale.calculation && c.sale.calculation.daysonmarket) || null,
        listSaleRatio: (c.sale && c.sale.calculation && c.sale.calculation.priceopenclosepct) || null,
      };
    })
    .filter((c) => c.salePrice);

  const salePrices = comps.map((c) => c.salePrice);
  const pricePerSqfts = comps.filter((c) => c.pricePerSqft).map((c) => c.pricePerSqft);
  const doms = comps.filter((c) => c.daysOnMarket != null).map((c) => Number(c.daysOnMarket));

  const medianPrice = median(salePrices);
  const medianPpsf = median(pricePerSqfts);
  const avgDom = doms.length ? Math.round(doms.reduce((a, b) => a + b, 0) / doms.length) : null;
  const ratios = comps.filter((c) => c.listSaleRatio).map((c) => Number(c.listSaleRatio));
  const avgRatio = ratios.length ? (ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(3) : null;

  // Condition adjustment: +5% per renovation year within 5 years, -3% per decade past 30 years, ±20% cap.
  // The subject data rarely carries renovation year from ATTOM; adjustment is applied if callers supply it.
  // Default: no adjustment (honest — we don't fabricate renovation data).
  let adjustmentPct = 0;
  const age = subject.yearBuilt ? new Date().getFullYear() - Number(subject.yearBuilt) : null;
  if (age != null && age > 30) {
    adjustmentPct -= 3 * Math.floor((age - 30) / 10);
  }
  adjustmentPct = Math.max(-20, Math.min(20, adjustmentPct));

  let estimate = null;
  if (medianPrice) {
    const adjustFactor = 1 + adjustmentPct / 100;
    const mid = Math.round(medianPrice * adjustFactor);
    estimate = {
      low: money(Math.round(mid * 0.93)),
      mid: money(mid),
      high: money(Math.round(mid * 1.07)),
      confidence: comps.length >= 5 ? "high" : comps.length >= 3 ? "medium" : "low",
      methodology: "ATTOM comparable sales within 0.5mi",
    };
  }

  let warning = null;
  if (comps.length < 3) {
    warning = `Only ${comps.length} comp${comps.length === 1 ? "" : "s"} found within 0.5 miles. Estimate confidence is low — consider expanding the search radius or pulling county records.`;
  }

  return {
    ok: true,
    subject,
    comps,
    marketMetrics: {
      medianSalePrice: medianPrice ? money(medianPrice) : null,
      medianPricePerSqft: medianPpsf ? money(medianPpsf) + "/sqft" : null,
      avgDaysOnMarket: avgDom,
      avgListSaleRatio: avgRatio,
      compsUsed: comps.length,
    },
    estimate,
    warning,
  };
}

// ─── getPropertyDeep ─────────────────────────────────────────────────────────

function _propertyDeepFromCache(cached, address) {
  const a = cached.attom || {};
  return {
    ok: true,
    address: a.address || address,
    apn: a.apn || null,
    beds: null,
    baths: null,
    sqft: a.bldgSqft || null,
    yearBuilt: a.yearBuilt || null,
    propType: a.propType || null,
    lotSizeAcres: a.lotSizeAcres || null,
    zoning: a.zoning || null,
    schoolDistrict: null,
    floodZone: null,
    ownerHistory: (a.salesHistory || []).map((s) => ({
      date: s.date || null,
      price: s.amount != null ? money(s.amount) : null,
      seller: s.grantor || null,
      buyer: s.grantee || null,
    })),
    assessHistory: a.assessedTotal ? [{
      year: a.taxYear || null,
      totalAssessed: money(a.assessedTotal),
      landAssessed: null,
      improvAssessed: null,
    }] : [],
    avmEstimate: a.marketTotal ? {
      value: money(a.marketTotal), low: null, high: null, confidence: null, calculatedDate: null,
    } : null,
    liensCount: 0,
    county: a.county || null,
    state: a.state || null,
    fromCache: true,
  };
}

async function getPropertyDeep(address, apiKey, rapidApiKey) {
  const parsed = splitAddress(address);
  if (!parsed) return { ok: false, error: 'Use "street, city, ST" — e.g. "1234 Oak St, Oakland, CA".' };

  const cached = await _getCachedProperty(address).catch(() => null);
  if (cached && cached.attom) return _propertyDeepFromCache(cached, address);

  if (!apiKey) return { ok: false, error: "ATTOM key not configured" };

  const [detailRes, salesRes, assessRes, avmRes] = await Promise.all([
    attomGet("/property/detail", parsed, apiKey),
    attomGet("/saleshistory/detail", parsed, apiKey),
    attomGet("/assessment/detail", parsed, apiKey),
    attomGet("/avm/detail", parsed, apiKey),
  ]);

  if (detailRes.status === 401 || detailRes.status === 403) {
    return { ok: false, error: "Live property data is temporarily unavailable — please check back shortly." };
  }

  const p = detailRes.json && detailRes.json.property && detailRes.json.property[0];
  if (!p) {
    const { searchByAddress } = require("../re/listings");
    const mlsFallback2 = await searchByAddress(address, rapidApiKey).catch(() => ({ ok: false }));
    const _addr2 = String(address).toLowerCase();
    const _isRural2 = /\b(ranch|hwy|highway|route|rr\s*\d|county road|cr\s*\d|fm\s*\d)\b/.test(_addr2) ||
      /,\s*(nv|nm|mt|nd|sd|wy|id|ak)\s*\d{5}/.test(_addr2);
    const _county2 = address.match(/,\s*([A-Za-z\s]+),\s*[A-Z]{2}/)?.[1]?.trim() || null;
    const _note2 = _county2 ? ` Try the ${_county2} County assessor's parcel search.` : " Check the county assessor directly.";

    if (mlsFallback2.ok && mlsFallback2.listing) {
      return {
        ok: false,
        mlsFallback: true,
        mlsListing: mlsFallback2.listing,
        error: `No recorded title data found for "${address}" in ATTOM.${_isRural2 ? " Common for rural/ranch addresses." : " May be an unrecorded parcel or new subdivision."} Found an active MLS listing — title chain must be verified through the county recorder.${_note2}`,
      };
    }
    if (_isRural2) {
      return {
        ok: false,
        error: `No recorded property data found for "${address}". Rural addresses in Nevada and similar states often fall outside both ATTOM and MLS coverage.${_note2} Share the APN if you have it.`,
      };
    }
    return { ok: false, error: `No property found at "${address}". Verify the full street address. If this is a new subdivision or proposed sale, no recorded title exists yet — try the county assessor's parcel search.` };
  }

  const salesArr = (salesRes.json && salesRes.json.property && salesRes.json.property[0] &&
    (salesRes.json.property[0].salehistory || salesRes.json.property[0].saleHistory)) || [];

  const assessData = assessRes.json && assessRes.json.property && assessRes.json.property[0];
  const avmData = avmRes.json && avmRes.json.property && avmRes.json.property[0];

  const ownerHistory = (Array.isArray(salesArr) ? salesArr : []).slice(0, 5).map((s) => ({
    date: s.saleTransDate || (s.amount && s.amount.salerecdate) || null,
    price: money((s.amount && s.amount.saleamt) || s.saleamt || null),
    seller: s.amount?.seller || s.seller || null,
    buyer: s.amount?.buyer || s.buyer || null,
  }));

  const assessHistory = [];
  if (assessData && assessData.assessment) {
    const a = assessData.assessment;
    if (a.assessed) {
      assessHistory.push({
        year: a.assessed.assdttlvalue ? new Date().getFullYear() : null,
        totalAssessed: money(a.assessed.assdttlvalue),
        landAssessed: money(a.assessed.assdlndvalue),
        improvAssessed: money(a.assessed.assdimprvalue),
      });
    }
  }

  const avmEstimate = avmData && avmData.avm ? {
    value: money(avmData.avm.amount && avmData.avm.amount.value),
    low: money(avmData.avm.amount && avmData.avm.amount.low),
    high: money(avmData.avm.amount && avmData.avm.amount.high),
    confidence: (avmData.avm.eventhistory && avmData.avm.eventhistory[0] && avmData.avm.eventhistory[0].confidence) || null,
    calculatedDate: (avmData.avm.eventhistory && avmData.avm.eventhistory[0] && avmData.avm.eventhistory[0].calculatedDate) || null,
  } : null;

  const bldg = p.building || {};
  const rooms = bldg.rooms || {};
  const bldgSize = bldg.size || {};
  const lot = p.lot || {};
  const summary = p.summary || {};
  const addr = p.address || {};

  const liensCount = (assessData && assessData.assessment && assessData.assessment.lien &&
    Array.isArray(assessData.assessment.lien) ? assessData.assessment.lien.length : 0) || 0;

  return {
    ok: true,
    address: addr.oneLine || address,
    apn: (p.identifier && p.identifier.apn) || null,
    beds: rooms.beds || null,
    baths: rooms.bathsfull || rooms.bathstotal || null,
    sqft: Number(bldgSize.universalsize || bldgSize.bldgsize || 0) || null,
    yearBuilt: summary.yearbuilt || null,
    propType: summary.proptype || summary.propclass || null,
    lotSizeAcres: lot.lotsize1 || null,
    zoning: summary.legal1 || null,
    schoolDistrict: (p.school && p.school.districtname) || null,
    floodZone: (p.area && p.area.floodzone) || null,
    ownerHistory,
    assessHistory,
    avmEstimate,
    liensCount,
    county: addr.county || addr.countyname || null,
    state: addr.countrySubd || null,
  };
}

// ─── calculateNetSheet ────────────────────────────────────────────────────────
// Seller proceeds estimate. All costs are estimates — clearly labeled as such.
// Transfer tax rates per $1,000 of sale price (seller typically pays in CA).

const _TRANSFER_TAX = {
  CA: {
    default: 1.10,
    cities: {
      "san francisco": 6.80, "sf": 6.80,
      "oakland": 15.00,
      "berkeley": 15.00,
      "los angeles": 5.60, "la": 5.60,
      "santa monica": 6.00,
      "culver city": 4.50,
      "pasadena": 4.50,
    },
  },
  NV: { default: 3.90 },   // Clark County ($1.95 per $500)
};

function _transferTaxRate(state, city) {
  const st = (state || "CA").toUpperCase();
  const c = (city || "").toLowerCase().trim();
  const stData = _TRANSFER_TAX[st] || _TRANSFER_TAX.CA;
  if (stData.cities && stData.cities[c]) return stData.cities[c];
  return typeof stData.default === "number" ? stData.default : 1.10;
}

function calculateNetSheet({ salePrice, loanBalance, city, state, sellerCommPct, buyerCommPct }) {
  const sp = Number(salePrice) || 0;
  const lb = Number(loanBalance) || 0;
  const sellerComm = (Number(sellerCommPct) || 2.5) / 100;
  const buyerComm = (Number(buyerCommPct) || 2.5) / 100;

  const taxRatePer1000 = _transferTaxRate(state, city);
  const transferTax = Math.round((sp / 1000) * taxRatePer1000);
  const sellerCommAmt = Math.round(sp * sellerComm);
  const buyerCommAmt = Math.round(sp * buyerComm);
  // Owner's title insurance: ~0.4% (seller pays in CA; varies by state)
  const titleIns = Math.round(sp * 0.004);
  // Escrow fee: $1.50 per $1,000, min $1,500
  const escrowFee = Math.round(Math.max(1500, (sp / 1000) * 1.50));
  // Recording / misc: flat estimate
  const recordingFees = 250;
  // Property tax proration: rough 60-day estimate at 1.25% annual rate
  const taxProration = Math.round(sp * 0.0125 / 6);

  const totalCosts = sellerCommAmt + buyerCommAmt + transferTax + titleIns + escrowFee + recordingFees + taxProration + lb;
  const netProceeds = sp - totalCosts;

  const fmt = (n) => "$" + Math.abs(n).toLocaleString();

  return {
    ok: true,
    salePrice: sp,
    lineItems: [
      { label: "Sale price", amount: fmt(sp), band: "WHITE" },
      { label: `Seller's agent commission (${(sellerComm * 100).toFixed(1)}%)`, amount: `-${fmt(sellerCommAmt)}`, band: "WHITE" },
      { label: `Buyer's agent commission (${(buyerComm * 100).toFixed(1)}%) *`, amount: `-${fmt(buyerCommAmt)}`, band: "YELLOW", note: "Separately negotiated under NAR settlement" },
      { label: `Transfer tax (${taxRatePer1000.toFixed(2)}/$1,000)`, amount: `-${fmt(transferTax)}`, band: "WHITE" },
      { label: "Owner's title insurance (est.)", amount: `-${fmt(titleIns)}`, band: "WHITE" },
      { label: "Escrow fee (est.)", amount: `-${fmt(escrowFee)}`, band: "WHITE" },
      { label: "Recording / misc. fees (est.)", amount: `-${fmt(recordingFees)}`, band: "WHITE" },
      { label: "Property tax proration (est. 60 days)", amount: `-${fmt(taxProration)}`, band: "WHITE" },
      ...(lb > 0 ? [{ label: "Mortgage payoff", amount: `-${fmt(lb)}`, band: "RED" }] : []),
    ],
    netProceeds,
    netProceedsFmt: (netProceeds >= 0 ? "" : "-") + fmt(netProceeds),
    netBand: netProceeds >= 0 ? "GREEN" : "RED",
    disclaimer: "All figures are estimates. Transfer tax rate may include city/county surcharges for your location. Actual numbers from escrow may differ. Buyer agent commission is now separately negotiated.",
  };
}

// ─── getListingStrategy ───────────────────────────────────────────────────────
// Sell-side wrapper around runCMA — returns CMA plus seller-framed analysis.

async function getListingStrategy(address, targetPrice, apiKey, rapidApiKey) {
  const cma = await runCMA(address, apiKey, rapidApiKey);
  if (!cma.ok) return cma;

  const est = cma.estimate;
  const midVal = est ? parseInt(String(est.mid).replace(/[^0-9]/g, "")) : null;
  const target = Number(targetPrice) || null;

  let pricingRead = null;
  if (midVal && target) {
    const diffPct = ((target - midVal) / midVal) * 100;
    if (diffPct > 10) pricingRead = { band: "RED", note: `Target price is ${diffPct.toFixed(0)}% above the CMA estimate. Overpriced listings sit and typically close below asking anyway — consider pricing at or slightly below CMA to generate competitive offers.` };
    else if (diffPct > 3) pricingRead = { band: "YELLOW", note: `Target price is ${diffPct.toFixed(0)}% above the CMA estimate. This is achievable if the property has unreported renovations, but expect longer days on market.` };
    else if (diffPct < -5) pricingRead = { band: "GREEN", note: `Target price is below the CMA estimate — expect a competitive offer situation within the first weekend.` };
    else pricingRead = { band: "GREEN", note: `Target price is in line with the CMA estimate.` };
  }

  const prepItems = [
    { roi: "high", item: "Deep clean + declutter", cost: "$0–500", note: "Highest ROI item. Buyers walk away from dirty homes." },
    { roi: "high", item: "Exterior landscaping refresh", cost: "$500–2K", note: "First impression = list photo. Drives click-through rate." },
    { roi: "high", item: "Interior paint (neutral)", cost: "$2K–6K", note: "Fresh paint photographs well and removes personalization." },
    { roi: "medium", item: "Professional photography + 3D tour", cost: "$500–1.5K", note: "Listings with professional photos get 2x the online views." },
    { roi: "medium", item: "Staging (at minimum, key rooms)", cost: "$1K–4K", note: "Staged homes sell faster and typically closer to asking price." },
    { roi: "low", item: "Appliance upgrades", cost: "$2K–8K", note: "Rarely recover full cost. Do only if existing appliances are failing." },
  ];

  return {
    ...cma,
    sellerFraming: {
      pricingRead,
      prepItems,
      marketTiming: cma.marketMetrics.avgDaysOnMarket != null
        ? (cma.marketMetrics.avgDaysOnMarket <= 14 ? { band: "GREEN", note: "Strong seller's market — homes moving fast. Price at CMA and let competition drive the price up." }
          : cma.marketMetrics.avgDaysOnMarket <= 30 ? { band: "YELLOW", note: "Balanced market. Price at CMA; condition and prep will separate your listing." }
          : { band: "RED", note: "Buyer's market — long average DOM. Price aggressively or expect to sit and reduce." })
        : null,
    },
  };
}

// ─── generateDisclosure ───────────────────────────────────────────────────────

function disclosureField(question, answer, flagCondition) {
  return { question, answer, flag: flagCondition ? "DISCLOSE" : answer === null || answer === undefined ? "REVIEW" : null };
}

async function generateDisclosure(propertyData, sellerInputs, state) {
  const s = sellerInputs || {};
  const st = (state || "CA").toUpperCase();

  if (st !== "CA") {
    return {
      ok: false,
      error: `Disclosure package for ${st} is not yet available. CA is currently supported.`,
    };
  }

  const hasUnpermittedWork = Array.isArray(s.permits) && s.permits.some((p) =>
    String(p).toLowerCase().includes("unpermitted") || String(p).toLowerCase().includes("without permit")
  );
  const roofAge = s.ageOfRoof ? Number(s.ageOfRoof) : null;
  const hvacAge = s.ageOfHVAC ? Number(s.ageOfHVAC) : null;

  const sections = [
    {
      id: "seller_awareness",
      label: "Seller's Awareness",
      fields: [
        disclosureField("Are there any known material defects affecting the property?", s.knownDefects || null, !!s.knownDefects),
        disclosureField("Have there been any recent repairs or improvements?", s.recentRepairs || null, false),
        disclosureField("Any pending legal action, liens, or easements not of record?", null, false),
      ],
    },
    {
      id: "structural",
      label: "Structural",
      fields: [
        disclosureField("Any known foundation, wall, or roof issues?", s.knownDefects ? "See known defects" : "None disclosed", !!s.knownDefects),
        disclosureField("Age of roof (years)?", roofAge != null ? String(roofAge) : null, roofAge != null && roofAge > 20),
        disclosureField("Any unpermitted additions or work?", hasUnpermittedWork ? "Yes" : "None disclosed", hasUnpermittedWork),
      ],
    },
    {
      id: "mechanical",
      label: "Mechanical",
      fields: [
        disclosureField("Age of HVAC system (years)?", hvacAge != null ? String(hvacAge) : null, hvacAge != null && hvacAge > 15),
        disclosureField("Any known plumbing or electrical issues?", s.knownDefects ? "See known defects" : "None disclosed", false),
        disclosureField("Permits for recent work?", Array.isArray(s.permits) && s.permits.length ? s.permits.join("; ") : "None provided", false),
      ],
    },
    {
      id: "environmental",
      label: "Environmental",
      fields: [
        disclosureField("Is the property in a designated fire hazard severity zone?", s.fireZone ? "Yes" : "Not to seller's knowledge", !!s.fireZone),
        disclosureField("Is the property in a FEMA flood zone?", s.floodZone ? "Yes" : "Not to seller's knowledge", !!s.floodZone),
        disclosureField("Any known hazardous materials (asbestos, lead paint, etc.)?", s.knownDefects ? "See known defects" : "None disclosed", false),
      ],
    },
    {
      id: "hoa",
      label: "HOA",
      fields: [
        disclosureField("Is the property subject to an HOA?", s.HOA ? "Yes" : "No", false),
        disclosureField("Monthly HOA dues?", s.HOA && s.HOAMonthly ? money(s.HOAMonthly) : (s.HOA ? "Amount not provided" : "N/A"), s.HOA && !s.HOAMonthly),
        disclosureField("Any pending HOA special assessments?", s.HOA ? null : "N/A", false),
      ],
    },
  ];

  const allFields = sections.flatMap((sec) => sec.fields);
  const disclosed = allFields.filter((f) => f.flag === "DISCLOSE").length;
  const review = allFields.filter((f) => f.flag === "REVIEW").length;
  const total = allFields.length;
  const completePct = Math.round(((total - review) / total) * 100);
  const missingFields = allFields
    .filter((f) => f.answer === null || f.answer === undefined || f.flag === "REVIEW")
    .map((f) => f.question);

  return {
    ok: true,
    state: st,
    disclosureType: "TDS",
    sections,
    disclosedCount: disclosed,
    completePct,
    missingFields,
  };
}

module.exports = { runCMA, getPropertyDeep, generateDisclosure, calculateNetSheet, getListingStrategy };
