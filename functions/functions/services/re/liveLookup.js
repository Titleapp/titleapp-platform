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
  const p = detail.json && detail.json.property && detail.json.property[0];
  if (!p || !(p.identifier && p.identifier.apn)) {
    return { ok: false, error: `No property found at "${address}". Check the address and try again.`, code: "NOT_FOUND" };
  }
  const salesArr = (sales.json && sales.json.property && sales.json.property[0] && (sales.json.property[0].salehistory || sales.json.property[0].saleHistory)) || [];
  const attom = {
    address: (p.address && p.address.oneLine) || address,
    apn: p.identifier.apn || null,
    propType: (p.summary && (p.summary.proptype || p.summary.propclass)) || null,
    yearBuilt: (p.summary && p.summary.yearbuilt) || null,
    lotSizeAcres: (p.lot && p.lot.lotsize1) || null,
    bldgSqft: (p.building && p.building.size && (p.building.size.universalsize || p.building.size.bldgsize)) || null,
    lat: (p.location && p.location.latitude) || null,
    lng: (p.location && p.location.longitude) || null,
    sales: (Array.isArray(salesArr) ? salesArr : []).slice(0, 6).map((sh) => ({
      date: sh.saleTransDate || (sh.amount && sh.amount.salerecdate) || null,
      amount: (sh.amount && sh.amount.saleamt) || sh.saleamt || null,
    })),
  };
  return { ok: true, attom, canvasSpec: buildLiveCanvasSpec(attom) };
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
    ],
  };
}

module.exports = { lookupAddress, buildLiveCanvasSpec };
