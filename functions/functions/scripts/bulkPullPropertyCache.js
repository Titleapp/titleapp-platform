#!/usr/bin/env node
/**
 * bulkPullPropertyCache.js — Pull ATTOM data for 50 demo properties, build
 * canvas specs with chain-of-title, write to propertyCache/{addressKey}.
 *
 * Run from functions/functions/:
 *   ATTOM_API_KEY=<key> node scripts/bulkPullPropertyCache.js
 *
 * Requires ADC or GOOGLE_APPLICATION_CREDENTIALS for Firestore writes.
 * If ATTOM returns nothing for an address, script builds fabricated data inline.
 */
"use strict";

if (process.env.FIRESTORE_EMULATOR_HOST === "undefined") delete process.env.FIRESTORE_EMULATOR_HOST;

const path = require("path");
const admin = require(path.join(__dirname, "..", "node_modules", "firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const KEY = process.env.ATTOM_API_KEY;
const ATTOM_BASE = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";

// ─── 50-property address list across all required category buckets ─────────────
// Mix designed per RE-Demo-Dataset-Prompt.md §2. All addresses are real US
// properties in states with strong ATTOM coverage. Owner names are ALWAYS
// replaced with "Current Owner" regardless of what ATTOM returns (privacy +
// CODEX requirement).
const PROPERTIES = [
  // ── RESIDENTIAL SFR (~30%) ──────────────────────────────────────────────────
  { id: "P001", cat: "sfr",       address: "1847 Oak Forest Dr, Henderson, NV 89002" },
  { id: "P002", cat: "sfr",       address: "3421 Wildflower Ln, Las Vegas, NV 89129" },
  { id: "P003", cat: "sfr",       address: "8802 SW 88th St, Miami, FL 33173" },
  { id: "P004", cat: "sfr",       address: "4205 Shoal Creek Blvd, Austin, TX 78756" },
  { id: "P005", cat: "sfr",       address: "1108 W Belmont Ave, Phoenix, AZ 85013" },
  { id: "P006", cat: "sfr",       address: "2714 Elm St, Dallas, TX 75226" },
  { id: "P007", cat: "sfr",       address: "903 Maple Dr, Winter Park, FL 32789" },
  { id: "P008", cat: "sfr",       address: "1902 Pecan Grove Rd, Houston, TX 77055" },
  { id: "P009", cat: "sfr",       address: "4716 Covington Way, Raleigh, NC 27606" },
  { id: "P010", cat: "sfr",       address: "1433 Spruce St, Denver, CO 80220" },
  { id: "P011", cat: "sfr",       address: "6102 Cedar Ridge Dr, Nashville, TN 37215" },
  { id: "P012", cat: "sfr",       address: "2891 Magnolia Way, Atlanta, GA 30305" },
  { id: "P013", cat: "sfr",       address: "5014 N 32nd St, Phoenix, AZ 85018" },
  { id: "P014", cat: "sfr",       address: "1422 Oak Ridge Ln, Athens, TX 75751",
    forceDefect: true, defectNote: "Garrett estate — gap in chain 1987–1994, missing probate instrument. P0 defect for title demo." },
  { id: "P015", cat: "sfr",       address: "313 Mayfair Dr, Athens, TX 75751" },

  // ── RESIDENTIAL MULTI-FAMILY (~15%) ─────────────────────────────────────────
  { id: "P016", cat: "multifamily", address: "2400 Colorado Ave, Santa Monica, CA 90404" },
  { id: "P017", cat: "multifamily", address: "4500 International Blvd, Oakland, CA 94601" },
  { id: "P018", cat: "multifamily", address: "8301 Biscayne Blvd, Miami, FL 33138" },
  { id: "P019", cat: "multifamily", address: "1450 N Federal Hwy, Fort Lauderdale, FL 33304" },
  { id: "P020", cat: "multifamily", address: "3200 Commerce St, Dallas, TX 75226" },
  { id: "P021", cat: "multifamily", address: "620 S Spring St, Los Angeles, CA 90014" },
  { id: "P022", cat: "multifamily", address: "2100 Post Oak Blvd, Houston, TX 77056" },

  // ── COMMERCIAL OFFICE (~10%) ─────────────────────────────────────────────────
  { id: "P023", cat: "office",    address: "1700 Pacific Ave, Dallas, TX 75201" },
  { id: "P024", cat: "office",    address: "200 S Biscayne Blvd, Miami, FL 33131" },
  { id: "P025", cat: "office",    address: "325 Battery St, San Francisco, CA 94111" },
  { id: "P026", cat: "office",    address: "123 W 6th St, Austin, TX 78701" },
  { id: "P027", cat: "office",    address: "2929 N Central Ave, Phoenix, AZ 85012" },

  // ── COMMERCIAL RETAIL (~10%) ─────────────────────────────────────────────────
  { id: "P028", cat: "retail",    address: "3528 Las Vegas Blvd S, Las Vegas, NV 89109" },
  { id: "P029", cat: "retail",    address: "8200 Vineland Ave, Orlando, FL 32821" },
  { id: "P030", cat: "retail",    address: "5100 Broadway, San Antonio, TX 78209" },
  { id: "P031", cat: "retail",    address: "1000 E Camelback Rd, Phoenix, AZ 85014" },
  { id: "P032", cat: "retail",    address: "2900 N Henderson Ave, Dallas, TX 75206" },

  // ── COMMERCIAL INDUSTRIAL / WAREHOUSE (~10%) ─────────────────────────────────
  { id: "P033", cat: "industrial", address: "4800 S Alameda St, Vernon, CA 90058" },
  { id: "P034", cat: "industrial", address: "2200 N Stemmons Fwy, Dallas, TX 75207" },
  { id: "P035", cat: "industrial", address: "8900 NW 36th St, Doral, FL 33178" },
  { id: "P036", cat: "industrial", address: "3400 E 40th Ave, Denver, CO 80205" },
  { id: "P037", cat: "industrial", address: "9900 Westpark Dr, Houston, TX 77063" },

  // ── AGRICULTURAL SMALL (~10%) ────────────────────────────────────────────────
  { id: "P038", cat: "agri-small", address: "1250 Vineyard Rd, Sonoma, CA 95476" },
  { id: "P039", cat: "agri-small", address: "4800 County Road 211, Georgetown, TX 78628" },
  { id: "P040", cat: "agri-small", address: "2100 Ranch Rd 12, Wimberley, TX 78676" },
  { id: "P041", cat: "agri-small", address: "1500 Casserly Rd, Watsonville, CA 95076" },
  { id: "P042", cat: "agri-small", address: "6200 Mast Rd, Duncanville, TX 75137" },

  // ── AGRICULTURAL LARGE (~5%) ─────────────────────────────────────────────────
  { id: "P043", cat: "agri-large", address: "12000 Davis Rd, Tulare, CA 93274" },
  { id: "P044", cat: "agri-large", address: "22500 W Goshen Ave, Fresno, CA 93706" },

  // ── MIXED-USE / LAND / DEVELOPMENT (~10%) ────────────────────────────────────
  { id: "P045", cat: "mixed-use",  address: "1600 N Lamar Blvd, Austin, TX 78703" },
  { id: "P046", cat: "mixed-use",  address: "3800 N Scottsdale Rd, Scottsdale, AZ 85251" },
  { id: "P047", cat: "mixed-use",  address: "2800 Post Oak Blvd, Houston, TX 77056" },
  { id: "P048", cat: "land",       address: "8625 Frisco Rd, Frisco, TX 75034" },
  { id: "P049", cat: "land",       address: "1200 S Las Vegas Blvd, Las Vegas, NV 89104" },
  { id: "P050", cat: "mixed-use",  address: "658 Front St, Lahaina, HI 96761" },
];

// ─── ATTOM helpers ───────────────────────────────────────────────────────────
async function attomGet(endpoint, params) {
  const url = new URL(ATTOM_BASE + endpoint);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const resp = await fetch(url.toString(), { headers: { apikey: KEY, accept: "application/json" } });
    const json = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, json };
  } catch (e) {
    return { ok: false, error: e.message, json: {} };
  }
}

function splitAddress(addr) {
  const i = addr.indexOf(",");
  if (i === -1) return null;
  const a1 = addr.slice(0, i).trim();
  const rest = addr.slice(i + 1).trim();
  // strip zip from address2 for ATTOM compatibility
  const a2 = rest.replace(/\s+\d{5}(-\d{4})?$/, "").trim();
  return { address1: a1, address2: a2 };
}

// ─── Fabricated name pools ─────────────────────────────────────────────────
const GRANTORS = [
  "Robert & Linda Patterson", "James Whitfield Trust", "Sunrise Properties LLC",
  "Michael & Carol Hendricks", "Blue Ridge Holdings Inc", "Dorothy Mae Sullivan",
  "Cedar Creek Investments", "Thomas J. Garrett Jr.", "Elena & Marcus Webb",
  "Pacific Coast Realty Trust", "John & Sarah Morales", "Meridian Properties Corp",
  "William Osborne Estate", "Green Valley Land LLC", "Catherine & Robert Finley",
];
const GRANTEES = [
  "Current Owner", "Current Owner", "Current Owner",
  "Summit Acquisitions LLC", "Current Owner", "Current Owner",
  "Coastal Ventures Group", "Current Owner", "Current Owner",
  "Redwood Capital Partners", "Current Owner", "Current Owner",
  "Current Owner", "Cornerstone Real Estate Trust", "Current Owner",
];
const LIENHOLDERS = [
  "Wells Fargo Bank NA", "Chase Home Mortgage", "Bank of America NA",
  "Quicken Loans LLC", "LoanDepot.com LLC", "Freedom Mortgage Corp",
  "United Wholesale Mortgage", "PennyMac Loan Services",
];
const TITLE_COS = [
  "Demo Title Underwriters Inc", "Cornerstone Abstract & Title LLC",
  "Sample Title Guaranty Corp", "Illustrative Escrow Services",
];

function pick(arr, seed) { return arr[seed % arr.length]; }

const money = (n) => n == null ? null : "$" + Number(n).toLocaleString();
const fmtAcres = (n) => n == null ? null : Number(n).toFixed(2) + " ac";

// ─── Canvas spec builder ──────────────────────────────────────────────────
function buildCanvasSpec(prop, attom, isReal) {
  const idx = parseInt(prop.id.replace("P", ""), 10);
  const hasDefect = prop.forceDefect || (idx % 13 === 0);
  const hasLien   = !hasDefect && (idx % 5 === 0 || idx % 7 === 0);

  const lastSale = attom.lastSaleAmt ? Number(attom.lastSaleAmt) : null;
  const assessed  = attom.assessedTotal ? Number(attom.assessedTotal) : null;
  const sourceTag = isReal ? "ATTOM · " + new Date().toISOString().slice(0, 10) : "Illustrative record";
  const disclaimer = "SAMPLE — FOR DEMONSTRATION ONLY — NOT A RECORDED DOCUMENT — NOT VALID FOR ANY TRANSACTION";

  // ── Subject property tab ──
  const facts = [];
  if (attom.apn) facts.push({ label: "APN", value: attom.apn, band: "WHITE" });
  facts.push({ label: "Property type", value: attom.propType || prop.cat, band: "WHITE" });
  if (attom.yearBuilt) facts.push({ label: "Year built", value: String(attom.yearBuilt), band: "WHITE" });
  if (attom.lotSizeAcres) facts.push({ label: "Lot size", value: fmtAcres(attom.lotSizeAcres), band: "WHITE" });
  if (attom.bldgSqft) facts.push({ label: "Building", value: Number(attom.bldgSqft).toLocaleString() + " sqft", band: "WHITE" });
  if (assessed) facts.push({ label: "Assessed value", value: money(assessed), band: "WHITE" });
  if (lastSale) facts.push({ label: "Last recorded sale", value: money(lastSale) + (attom.lastSaleDate ? " · " + attom.lastSaleDate : ""), band: "GREEN" });
  if (attom.annualTax) facts.push({ label: "Annual tax", value: money(attom.annualTax), band: "WHITE" });

  const subjectTab = {
    id: "subject", label: "Subject property",
    blocks: [
      { type: "map", address: attom.address, mapType: "satellite" },
      { type: "streetview", address: attom.address },
      { type: "kpis", items: facts },
    ],
  };

  // ── Chain of title tab ──
  const saleHistory = Array.isArray(attom.salesHistory) ? attom.salesHistory : [];
  const chainLinks = saleHistory.length > 0
    ? saleHistory.slice(0, 5).map((s, i) => ({
        band: "GREEN",
        date: s.date || null,
        amount: s.amount ? money(s.amount) : null,
        grantor: pick(GRANTORS, idx + i + 3),
        grantee: i === 0 ? "Current Owner" : pick(GRANTEES, idx + i),
        docType: i % 3 === 0 ? "Warranty Deed" : i % 3 === 1 ? "Grant Deed" : "Trustee's Deed",
        instrument: "DEMO-" + String(20000 + idx * 10 + i).padStart(6, "0"),
        note: null,
      }))
    : [
        {
          band: "GREEN", date: attom.lastSaleDate || "2019-03-15",
          amount: lastSale ? money(lastSale) : null,
          grantor: pick(GRANTORS, idx + 1), grantee: "Current Owner",
          docType: "Warranty Deed",
          instrument: "DEMO-" + String(20000 + idx * 10).padStart(6, "0"),
          note: null,
        },
        {
          band: "GREEN", date: "2007-08-22",
          amount: lastSale ? money(Math.round(lastSale * 0.65)) : null,
          grantor: pick(GRANTORS, idx + 5), grantee: pick(GRANTEES, idx + 1),
          docType: "Warranty Deed",
          instrument: "DEMO-" + String(20000 + idx * 10 + 1).padStart(6, "0"),
          note: null,
        },
        {
          band: "GREEN", date: "1998-04-10",
          amount: null,
          grantor: pick(GRANTORS, idx + 9), grantee: pick(GRANTEES, idx + 5),
          docType: "Quitclaim Deed",
          instrument: "DEMO-" + String(20000 + idx * 10 + 2).padStart(6, "0"),
          note: null,
        },
      ];

  // Inject deliberate gap for P014
  if (prop.forceDefect) {
    chainLinks.push({
      band: "RED",
      date: "1994-11-03",
      amount: null,
      grantor: "Thomas J. Garrett (Estate)", grantee: "Patricia Ann Garrett",
      docType: "Probate Deed — UNVERIFIED",
      instrument: "DEMO-DEFECT-P014",
      note: "⚠ Gap in chain 1987–1994. Probate instrument not recorded in Henderson County. Curative action required before close.",
    });
  }

  const chainFlags = [];
  if (prop.forceDefect) {
    chainFlags.push({
      band: "RED",
      label: "Title defect — gap in chain of title",
      detail: prop.defectNote || "Gap detected. Full curative title work required before insurable title can be issued.",
      lienType: "title-defect",
    });
  }
  if (hasLien) {
    chainFlags.push({
      band: "YELLOW",
      label: "Open mortgage lien — " + pick(LIENHOLDERS, idx),
      detail: "Lien of record. Payoff demand required at close. Confirm lien balance and subordination status.",
      lienType: "mortgage",
      lender: pick(LIENHOLDERS, idx),
      amount: assessed ? Math.round(assessed * 0.7) : null,
    });
  }
  // HOA lien on multi-family + some SFR
  if (idx % 9 === 0) {
    chainFlags.push({
      band: "YELLOW",
      label: "HOA assessment lien — unpaid dues",
      detail: "HOA assessment lien of $2,850 recorded. HOA estoppel letter required.",
      lienType: "hoa",
      amount: 2850,
    });
  }

  const chainTab = {
    id: "chain", label: "Chain of title",
    blocks: [
      { type: "prose", items: [{ band: "WHITE", title: "SAMPLE — NOT A RECORDED DOCUMENT", body: disclaimer }] },
      { type: "chain", title: "Recorded transfers (fabricated — demo only)", links: chainLinks },
      ...(chainFlags.length ? [{ type: "flags", items: chainFlags }] : []),
    ],
  };

  // ── Title search tab ──
  const casRed    = prop.forceDefect ? 1 : 0;
  const casYellow = (hasLien ? 1 : 0) + (idx % 9 === 0 ? 1 : 0);
  const titleSearchTab = {
    id: "title-search", label: "Title search",
    blocks: [
      { type: "prose", items: [{ band: "WHITE", title: "SAMPLE — NOT A RECORDED DOCUMENT", body: disclaimer }] },
      {
        type: "heroes", items: [
          { band: casRed > 0 ? "RED" : casYellow > 0 ? "YELLOW" : "GREEN",
            title: casRed > 0 ? "Title defect — not insurable" : casYellow > 0 ? "Open items — review required" : "Clear title — no exceptions",
            detail: casRed > 0 ? "Curative action required" : casYellow > 0 ? casYellow + " item(s) to resolve" : "No exceptions beyond standard easements" },
          { band: "WHITE", title: "Underwriter", detail: pick(TITLE_COS, idx) },
          { band: "WHITE", title: "Policy type", detail: idx % 3 === 0 ? "Owner's + Lender's" : "Owner's Policy" },
          { band: "WHITE", title: "Effective date", detail: new Date().toISOString().slice(0, 10) },
        ],
      },
      { type: "flags", items: [
        { band: "BLUE", label: "Tax status — current year", detail: "Annual tax: " + (attom.annualTax ? money(attom.annualTax) : "see county records") + ". Status: PAID per tax records." },
        { band: "WHITE", label: "Easements", detail: "Standard utility easements of record. No adverse easements identified." },
        ...(idx % 6 === 0 ? [{ band: "WHITE", label: "CC&Rs / HOA", detail: "CC&Rs recorded in Book " + (100 + idx) + ", Page " + (20 + idx) + ". Current HOA in good standing." }] : []),
        ...(prop.cat === "industrial" ? [{ band: "BLUE", label: "UCC fixture filing", detail: "UCC-1 fixture filing by " + pick(LIENHOLDERS, idx + 3) + " recorded. Confirm termination or continuation at close." }] : []),
        ...chainFlags,
      ]},
    ],
  };

  // ── Deal screen tab ──
  const dealFlags = [];
  if (assessed && lastSale && assessed < lastSale * 0.6) {
    dealFlags.push({ band: "YELLOW", label: "Assessed significantly below last sale", detail: "Assessed " + money(assessed) + " vs. " + money(lastSale) + " last sale." });
  }
  if ((prop.cat === "industrial" || prop.cat === "agri-large") && !attom.bldgSqft) {
    dealFlags.push({ band: "YELLOW", label: "Building size not confirmed", detail: "Pull county records for verified square footage before underwriting." });
  }
  const dealTab = {
    id: "deal-screen", label: "Deal screen",
    blocks: [
      { type: "heroes", items: [
        lastSale ? { band: "GREEN", title: "Last sale", detail: money(lastSale) + (attom.lastSaleDate ? " · " + attom.lastSaleDate : "") } : { band: "WHITE", title: "Last sale", detail: "Not on record" },
        assessed ? { band: "WHITE", title: "Assessed value", detail: money(assessed) } : { band: "WHITE", title: "Assessed value", detail: "—" },
        { band: "WHITE", title: "Property type", detail: attom.propType || prop.cat },
      ]},
      ...(dealFlags.length ? [{ type: "flags", items: dealFlags }] : []),
      { type: "prose", items: [{ band: "WHITE", title: "Data source", body: sourceTag + ". All parcel figures from county records via ATTOM. Title/lien analysis is illustrative until full search runs." }] },
    ],
  };

  // CAS scores
  const cas = {
    RED:    casRed,
    YELLOW: casYellow,
    BLUE:   1,
    WHITE:  facts.length,
    GREEN:  lastSale ? 1 : 0,
  };

  return {
    title: attom.address,
    subtitle: prop.id + " · " + prop.cat + " · " + sourceTag,
    disclaimer,
    demo: true,
    cas,
    tabs: [subjectTab, chainTab, titleSearchTab, dealTab],
  };
}

// ─── Fabricated attom fallback ─────────────────────────────────────────────
// Used when ATTOM returns nothing for an address. Values are internally
// consistent and realistic for the category/market.
function buildFabricatedAttom(prop) {
  const idx = parseInt(prop.id.replace("P", ""), 10);
  const baseValues = {
    sfr:        { assessed: 380000, lastSale: 485000, yearBuilt: 1998, sqft: 1850, acres: 0.18 },
    multifamily:{ assessed: 1200000, lastSale: 1750000, yearBuilt: 1985, sqft: 8400, acres: 0.45 },
    office:     { assessed: 2800000, lastSale: 3900000, yearBuilt: 2002, sqft: 22000, acres: 1.1 },
    retail:     { assessed: 1600000, lastSale: 2100000, yearBuilt: 1995, sqft: 9500, acres: 0.85 },
    industrial: { assessed: 3200000, lastSale: 4200000, yearBuilt: 1990, sqft: 45000, acres: 2.5 },
    "agri-small":{ assessed: 420000, lastSale: 580000, yearBuilt: 1975, sqft: 2400, acres: 12.5 },
    "agri-large":{ assessed: 1800000, lastSale: 2400000, yearBuilt: 1968, sqft: 4800, acres: 87.0 },
    "mixed-use": { assessed: 950000, lastSale: 1350000, yearBuilt: 2008, sqft: 6200, acres: 0.32 },
    land:       { assessed: 680000, lastSale: 820000, yearBuilt: null, sqft: null, acres: 2.8 },
  };
  const base = baseValues[prop.cat] || baseValues.sfr;
  const jitter = (v, pct) => Math.round(v * (1 + (((idx * 17) % 20) - 10) * pct / 100));
  const parts = prop.address.split(",");
  const city = parts[1] ? parts[1].trim() : "Demo City";
  const stateZip = parts[2] ? parts[2].trim() : "TX";
  const state = stateZip.split(" ")[0];

  return {
    address: prop.address,
    apn: "DEMO-APN-" + prop.id,
    propType: prop.cat,
    yearBuilt: base.yearBuilt,
    lotSizeAcres: base.acres,
    bldgSqft: base.sqft,
    lat: null, lng: null,
    owner: null,
    county: city + " County",
    state,
    zoning: prop.cat === "sfr" ? "R-1" : prop.cat === "multifamily" ? "R-3" : prop.cat === "office" ? "B-2" : prop.cat === "industrial" ? "M-1" : "C-2",
    assessedTotal: jitter(base.assessed, 15),
    marketTotal: jitter(base.assessed * 1.2, 10),
    annualTax: Math.round(jitter(base.assessed, 15) * 0.012),
    taxYear: 2024,
    taxDelinquent: false,
    lastSaleAmt: jitter(base.lastSale, 20),
    lastSaleDate: (2015 + (idx % 9)) + "-" + String(1 + (idx % 12)).padStart(2, "0") + "-" + String(10 + (idx % 18)).padStart(2, "0"),
    salesHistory: [
      {
        date: (2015 + (idx % 9)) + "-" + String(1 + (idx % 12)).padStart(2, "0") + "-10",
        amount: jitter(base.lastSale, 20),
        grantor: pick(GRANTORS, idx), grantee: "Current Owner",
      },
      {
        date: (2005 + (idx % 8)) + "-0" + (1 + (idx % 9)) + "-15",
        amount: jitter(base.lastSale * 0.6, 15),
        grantor: pick(GRANTORS, idx + 4), grantee: pick(GRANTORS, idx),
      },
    ],
    source: "fabricated",
  };
}

// ─── ATTOM pull ──────────────────────────────────────────────────────────
async function pullAttom(prop) {
  if (!KEY) return { ok: false, reason: "no-key" };
  const parsed = splitAddress(prop.address);
  if (!parsed) return { ok: false, reason: "bad-address" };
  const [detail, sales] = await Promise.all([
    attomGet("/property/detail", parsed),
    attomGet("/saleshistory/detail", parsed),
  ]);
  if (detail.status === 401 || detail.status === 403) return { ok: false, reason: "auth-fail" };
  const p = detail.json?.property?.[0];
  if (!p?.identifier?.apn) return { ok: false, reason: "not-found" };

  const parts = prop.address.split(",");
  const state = parts[parts.length - 1]?.trim().split(" ")[0] || null;
  const city  = parts[1]?.trim() || null;
  const salesArr = (sales.json?.property?.[0]?.salehistory || sales.json?.property?.[0]?.saleHistory || []);

  return {
    ok: true,
    attom: {
      address: p.address?.oneLine || prop.address,
      apn: p.identifier?.apn || null,
      propType: p.summary?.proptype || p.summary?.propclass || null,
      yearBuilt: p.summary?.yearbuilt || null,
      lotSizeAcres: p.lot?.lotsize1 || null,
      bldgSqft: p.building?.size?.universalsize || p.building?.size?.bldgsize || null,
      lat: p.location?.latitude || null,
      lng: p.location?.longitude || null,
      owner: null, // always redacted per CODEX
      county: p.address?.county || p.address?.countyname || city + " County",
      state: p.address?.countrySubd || state,
      zoning: p.summary?.legal1 || null,
      assessedTotal: p.assessment?.assessed?.assdttlvalue || null,
      marketTotal: p.assessment?.market?.mktttlvalue || null,
      annualTax: p.assessment?.tax?.taxamt || null,
      taxYear: p.assessment?.tax?.taxyear || null,
      taxDelinquent: false,
      lastSaleAmt: p.sale?.amount?.saleamt || salesArr[0]?.amount?.saleamt || null,
      lastSaleDate: p.sale?.amount?.salerecdate || salesArr[0]?.saleTransDate || null,
      salesHistory: salesArr.slice(0, 5).map((s) => ({
        date: s.saleTransDate || s.amount?.salerecdate || null,
        amount: s.amount?.saleamt || null,
        grantor: null, grantee: null, // replace below with fabricated names
      })),
      source: "attom",
    },
  };
}

// ─── Main loop ────────────────────────────────────────────────────────────
async function run() {
  const stats = { attom: 0, fabricated: 0, errors: 0 };

  for (const prop of PROPERTIES) {
    const t0 = Date.now();
    try {
      let attom, isReal;

      const pulled = await pullAttom(prop);
      if (pulled.ok) {
        attom = pulled.attom;
        isReal = true;
        stats.attom++;
        console.log(`  ✓ ATTOM  ${prop.id} ${prop.address.slice(0, 45)}`);
      } else {
        attom = buildFabricatedAttom(prop);
        isReal = false;
        stats.fabricated++;
        console.log(`  ~ FAB    ${prop.id} ${prop.address.slice(0, 45)} (${pulled.reason})`);
      }

      const canvasSpec = buildCanvasSpec(prop, attom, isReal);
      const addressKey = prop.address.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      await db.collection("propertyCache").doc(addressKey).set({
        address: prop.address,
        addressKey,
        demoId: prop.id,
        demoCategory: prop.cat,
        demo: true,
        attom,
        canvasSpec,
        cachedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: isReal ? "attom" : "fabricated",
      });

      // Rate limit: ~2 req/sec to be gentle on ATTOM
      const elapsed = Date.now() - t0;
      if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed));

    } catch (e) {
      console.error(`  ✗ ERROR  ${prop.id}:`, e.message);
      stats.errors++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`  ATTOM real:   ${stats.attom}`);
  console.log(`  Fabricated:   ${stats.fabricated}`);
  console.log(`  Errors:       ${stats.errors}`);
  console.log(`  Total:        ${stats.attom + stats.fabricated + stats.errors} / ${PROPERTIES.length}`);
  process.exit(0);
}

console.log(`\n=== Bulk propertyCache pull (${PROPERTIES.length} properties) ===`);
console.log(`  ATTOM key: ${KEY ? "present (" + KEY.slice(0, 6) + "...)" : "NOT SET — all fabricated"}`);
console.log();
run().catch(e => { console.error(e); process.exit(1); });
