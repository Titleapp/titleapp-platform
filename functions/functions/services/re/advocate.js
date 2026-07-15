// services/re/advocate.js — Real Estate Advocate: CMA, deep property dive, disclosure package.
// All ATTOM calls use the shared attomGet pattern from liveLookup.js.

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

// ─── runCMA ──────────────────────────────────────────────────────────────────

async function runCMA(address, apiKey) {
  if (!apiKey) return { ok: false, error: "ATTOM key not configured" };
  const parsed = splitAddress(address);
  if (!parsed) return { ok: false, error: 'Use "street, city, ST" — e.g. "1234 Oak St, Oakland, CA".' };

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
  if (!p) return { ok: false, error: `No property found at "${address}". Check the address and try again.` };

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

async function getPropertyDeep(address, apiKey) {
  if (!apiKey) return { ok: false, error: "ATTOM key not configured" };
  const parsed = splitAddress(address);
  if (!parsed) return { ok: false, error: 'Use "street, city, ST" — e.g. "1234 Oak St, Oakland, CA".' };

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
  if (!p) return { ok: false, error: `No property found at "${address}". Check the address and try again.` };

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

module.exports = { runCMA, getPropertyDeep, generateDisclosure };
