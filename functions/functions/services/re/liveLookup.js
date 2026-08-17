// ----------------------------------------------------------------------------
// services/re/liveLookup.js — #41: live per-address ATTOM lookup for RE workers
// ----------------------------------------------------------------------------
// Takes any address, pulls REAL ATTOM data (property detail + sale history), and
// returns a ready-to-render canvasSpec (the #31 data-driven schema) so an RE
// worker can show a live property on command. Auth-required (the ATTOM key is
// paid). Honest by construction: only ATTOM-returned facts are shown; the deeper
// analysis stays labeled illustrative.
// ----------------------------------------------------------------------------

const ATTOM_BASE = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";

// Canonical street-suffix abbreviations so "Dr"/"Drive", "St"/"Street", etc.
// hash to the same propertyCache key. Zip is stripped separately below —
// keying on street+city+state is enough to disambiguate every address this
// platform serves today, and a typed zip (or lack of one) shouldn't be able
// to silently miss a cached demo record and fall through to a live ATTOM call.
const STREET_SUFFIX_MAP = {
  drive: "dr", street: "st", road: "rd", avenue: "ave", lane: "ln",
  boulevard: "blvd", court: "ct", place: "pl", highway: "hwy",
  parkway: "pkwy", circle: "cir", terrace: "ter", trail: "trl", way: "way",
};

// Single source of truth for propertyCache doc IDs — every read and write
// path (route handlers, chat-tool executors, the bulk pre-pull script) must
// go through this so the same real-world address always resolves to the
// same cache doc regardless of exactly how it was typed.
function normalizeAddressKey(address) {
  let s = String(address || "").toLowerCase().trim();
  s = s.replace(/\s+\d{5}(-\d{4})?\s*$/, ""); // strip trailing zip / zip+4
  const tokens = s.split(/[^a-z0-9]+/).filter(Boolean).map((t) => STREET_SUFFIX_MAP[t] || t);
  return tokens.join("-");
}

async function attomGet(path, params, apiKey) {
  const url = new URL(ATTOM_BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const resp = await fetch(url.toString(), { headers: { apikey: apiKey, accept: "application/json" } });
  const json = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, json };
}

// Split a one-line address into ATTOM's address1 (street) + address2 (city, ST).
function splitAddress(address) {
  const s = String(address || "").trim();
  const i = s.indexOf(",");
  if (i === -1) return null;
  const address1 = s.slice(0, i).trim();
  const address2 = s.slice(i + 1).trim();
  if (!address1 || !address2) return null;
  return { address1, address2 };
}

const money = (n) => (n == null ? null : "$" + Number(n).toLocaleString());

async function lookupAddress(address, apiKey) {
  if (!apiKey) return { ok: false, error: "ATTOM key not configured" };
  const parsed = splitAddress(address);
  if (!parsed) return { ok: false, error: 'Use "street, city, ST" — e.g. "325 Battery St, San Francisco, CA".' };

  const [detail, sales] = await Promise.all([
    attomGet("/property/detail", parsed, apiKey),
    attomGet("/saleshistory/detail", parsed, apiKey),
  ]);
  if (detail.status === 401 || detail.status === 403) {
    return { ok: false, error: "Live property data is temporarily unavailable — please check back shortly.", code: "ATTOM_UNAVAILABLE" };
  }
  const p = detail.json && detail.json.property && detail.json.property[0];
  if (!p || !(p.identifier && p.identifier.apn)) {
    return { ok: false, error: `No property found at "${address}". Check the address and try again.`, code: "NOT_FOUND" };
  }
  const salesArr = (sales.json && sales.json.property && sales.json.property[0] && (sales.json.property[0].salehistory || sales.json.property[0].saleHistory)) || [];
  const ownerRaw =
    (p.assessment && p.assessment.owner && (p.assessment.owner.owner1?.fullname || p.assessment.owner.owner1?.lastName)) ||
    (p.identification && p.identification.owner && p.identification.owner.fullname) ||
    null;
  const county = (p.address && (p.address.county || p.address.countyname)) || null;
  const state = (p.address && p.address.countrySubd) || null;
  const zoning = (p.summary && p.summary.legal1) || null;
  const assessedValue = (p.assessment && p.assessment.assessed && p.assessment.assessed.assdttlvalue) || null;
  const attom = {
    address: (p.address && p.address.oneLine) || address,
    apn: p.identifier.apn || null,
    propType: (p.summary && (p.summary.proptype || p.summary.propclass)) || null,
    yearBuilt: (p.summary && p.summary.yearbuilt) || null,
    lotSizeAcres: (p.lot && p.lot.lotsize1) || null,
    bldgSqft: (p.building && p.building.size && (p.building.size.universalsize || p.building.size.bldgsize)) || null,
    lat: (p.location && p.location.latitude) || null,
    lng: (p.location && p.location.longitude) || null,
    owner: ownerRaw,
    county,
    state,
    zoning,
    assessedValue,
    sales: (Array.isArray(salesArr) ? salesArr : []).slice(0, 6).map((sh) => ({
      date: sh.saleTransDate || (sh.amount && sh.amount.salerecdate) || null,
      amount: (sh.amount && sh.amount.saleamt) || sh.saleamt || null,
      grantor: sh.amount?.seller || sh.seller || null,
      grantee: sh.amount?.buyer || sh.buyer || ownerRaw || null,
    })),
  };
  return { ok: true, attom, canvasSpec: buildLiveCanvasSpec(attom) };
}

function buildUnderwritingTab(a) {
  const s0 = a.sales && a.sales[0];
  const lastSale = s0 && s0.amount ? Number(s0.amount) : null;
  const assessed = a.assessedValue ? Number(a.assessedValue) : null;

  const heroes = [];
  if (assessed) heroes.push({ band: "WHITE", title: "Assessed Value", detail: money(assessed) });
  if (lastSale) heroes.push({ band: "WHITE", title: "Last Sale Price", detail: money(lastSale) + (s0.date ? " · " + s0.date : "") });
  if (a.yearBuilt) heroes.push({ band: "WHITE", title: "Year Built", detail: String(a.yearBuilt) });
  if (a.bldgSqft) heroes.push({ band: "WHITE", title: "Building Size", detail: Number(a.bldgSqft).toLocaleString() + " sqft" });

  const flags = [];
  if (assessed && lastSale && assessed < lastSale * 0.7) {
    flags.push({ band: "RED", title: "Assessed well below last sale", detail: "Assessed " + money(assessed) + " vs. " + money(lastSale) + " last sale — value compression signal." });
  }
  if (!a.bldgSqft) {
    flags.push({ band: "YELLOW", title: "Building size not on record", detail: "Cannot compute per-sqft basis without building size — pull county records." });
  }
  if (a.yearBuilt && (2025 - a.yearBuilt) > 40) {
    flags.push({ band: "YELLOW", title: "40+ year old asset", detail: "Capital expenditure reserve warranted — assess deferred maintenance and systems lifecycle." });
  }
  flags.push({
    band: "BLUE",
    title: "ATTOM-derived signals only",
    detail: "Full underwriting requires rent roll, NOI actuals, and independent appraisal. These are ATTOM-derived signals only.",
  });

  return {
    id: "underwriting",
    label: "Underwriting",
    blocks: [
      ...(heroes.length ? [{ type: "heroes", items: heroes }] : []),
      ...(flags.length ? [{ type: "flags", items: flags }] : []),
    ],
  };
}

function buildSensitivityTab(a) {
  const s0 = a.sales && a.sales[0];
  const lastSale = s0 && s0.amount ? Number(s0.amount) : null;

  if (!lastSale) {
    return {
      id: "sensitivity",
      label: "Sensitivity",
      blocks: [
        { type: "prose", items: [{ band: "WHITE", title: "No basis available", body: "No recorded sale price — sensitivity analysis requires a known basis." }] },
      ],
    };
  }

  const label = "ATTOM last sale: " + money(lastSale) + (s0.date ? " · " + s0.date : "") + ". Sensitivity ranges are illustrative.";
  const discounts = [20, 30, 40, 50];
  const items = discounts.map((pct) => {
    const val = Math.round(lastSale * (1 - pct / 100));
    return { band: pct >= 40 ? "RED" : "YELLOW", label: "Entry at " + pct + "% below last sale: " + money(val), value: money(val), pct: 100 - pct };
  });

  return {
    id: "sensitivity",
    label: "Sensitivity",
    blocks: [
      { type: "bars", title: label, items },
    ],
  };
}

function buildCapitalStackTab(a) {
  const s0 = a.sales && a.sales[0];
  const lastSale = s0 && s0.amount ? Number(s0.amount) : null;
  const assessed = a.assessedValue ? Number(a.assessedValue) : null;

  const assetValue = assessed || lastSale;
  const assetLabel = assessed ? "County Assessed Value" : "Last Sale (used as proxy)";
  const seniorLoan = assetValue ? Math.round(assetValue * 0.6) : null;
  const equity = assetValue ? Math.round(assetValue * 0.4) : null;
  const basisReset = lastSale ? Math.round(lastSale * 0.6) : null;

  const heroes = [];
  if (assetValue) heroes.push({ band: "WHITE", title: "Asset Value Est.", detail: money(assetValue) + " · " + assetLabel });
  if (seniorLoan) heroes.push({ band: "BLUE", title: "Senior Loan Est. (60% LTV)", detail: money(seniorLoan) });
  if (equity) heroes.push({ band: "WHITE", title: "Equity Required", detail: money(equity) });
  if (basisReset && lastSale) heroes.push({ band: "RED", title: "Basis Reset Target (−40% last sale)", detail: money(basisReset) });

  return {
    id: "capital-stack",
    label: "Capital stack",
    blocks: [
      ...(heroes.length ? [{ type: "heroes", items: heroes }] : []),
      {
        type: "prose",
        items: [{
          band: "WHITE",
          title: "Illustrative cap stack",
          body: "Cap stack is illustrative based on ATTOM " + assetLabel.toLowerCase() + ". Actual loan terms, LTV, and equity split require lender engagement and current appraisal.",
        }],
      },
    ],
  };
}

function buildDealScreenTab(a) {
  const s0 = a.sales && a.sales[0];
  const lastSale = s0 && s0.amount ? Number(s0.amount) : null;
  const assessed = a.assessedValue ? Number(a.assessedValue) : null;

  const heroes = [];
  const flags = [];
  let yellows = 0;

  if (lastSale) heroes.push({ band: "GREEN", title: "Last Sale Price", detail: money(lastSale) + (s0.date ? " · " + s0.date : "") });
  if (assessed) heroes.push({ band: "WHITE", title: "Assessed Value", detail: money(assessed) });
  if (a.propType) heroes.push({ band: "WHITE", title: "Property Type", detail: a.propType });

  if (!lastSale && !assessed) {
    flags.push({ band: "YELLOW", title: "No recorded sale or assessed value", detail: "Basis unknown — pull county tax records before proceeding." });
    yellows++;
  }
  if (assessed && lastSale && assessed < lastSale * 0.55) {
    flags.push({ band: "RED", title: "Assessed significantly below last sale", detail: `Assessed ${money(assessed)} vs. ${money(lastSale)} last sale — possible value decline or unreported transfer.` });
  }
  if (!a.owner) {
    flags.push({ band: "YELLOW", title: "Owner not on record", detail: "Run a title search to confirm current vesting and any undisclosed liens." });
    yellows++;
  }

  return {
    id: "deal_screen",
    label: "Deal screen",
    blocks: [
      ...(heroes.length ? [{ type: "heroes", items: heroes }] : []),
      ...(flags.length ? [{ type: "flags", items: flags }] : []),
      { type: "prose", items: [{ band: "WHITE", title: "Data source", body: `All figures are ATTOM-recorded data for APN ${a.apn || "—"}. Acquisition price, cap stack, and underwriting projections require full diligence and independent appraisal.` }] },
    ],
  };
}

function buildLiveCanvasSpec(a) {
  const facts = [
    { label: "APN", value: a.apn || "—", band: "WHITE" },
    { label: "Property type", value: a.propType || "—", band: "WHITE" },
  ];
  if (a.yearBuilt) facts.push({ label: "Year built", value: String(a.yearBuilt), band: "WHITE" });
  if (a.lotSizeAcres) facts.push({ label: "Lot size", value: a.lotSizeAcres + " ac", band: "WHITE" });
  if (a.bldgSqft) facts.push({ label: "Building", value: Number(a.bldgSqft).toLocaleString() + " sqft", band: "WHITE" });
  const s0 = a.sales && a.sales[0];
  if (s0 && s0.amount) facts.push({ label: "Last recorded sale", value: money(s0.amount) + " · " + (s0.date || ""), band: "GREEN" });
  else if (s0 && s0.date) facts.push({ label: "Last recorded sale", value: s0.date, band: "WHITE" });

  const chainItems = (a.sales || []).filter((s) => s.date).map((s) => ({
    band: "GREEN",
    parties: "Recorded transfer",
    meta: [s.amount ? money(s.amount) : null, s.date].filter(Boolean).join(" · ") + " · per ATTOM",
  }));

  return {
    title: a.address,
    subtitle: "APN " + (a.apn || "—") + " · Live ATTOM pull",
    disclaimer: "Live parcel data from ATTOM. Title/lien analysis is illustrative until a full search runs.",
    attomLive: true,
    cas: { RED: 0, YELLOW: 0, BLUE: 0, WHITE: facts.length, GREEN: s0 && s0.amount ? 1 : 0 },
    tabs: [
      { id: "subject", label: "Subject property", blocks: [
        { type: "map", address: a.address, mapType: "satellite" },
        { type: "streetview", address: a.address, label: a.address },
        { type: "kpis", items: facts },
        ...(chainItems.length ? [{ type: "chain", title: "Recorded sales (ATTOM)", items: chainItems }] : []),
      ] },
      buildDealScreenTab(a),
      buildUnderwritingTab(a),
      buildSensitivityTab(a),
      buildCapitalStackTab(a),
    ],
  };
}

module.exports = { lookupAddress, buildLiveCanvasSpec, normalizeAddressKey };
