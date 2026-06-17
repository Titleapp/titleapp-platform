"use strict";

/**
 * navPackager.js — ForeFlight-model nav-database packager (#56, backend half).
 *
 * For each operating region (services/aviation/regions.js), snapshots the FAA
 * NASR layers (airports / waypoints / navaids / airspace) for the current AIRAC
 * cycle and writes ONE downloadable package per region to Cloud Storage:
 *
 *   gs://<bucket>/nav-databases/<cycle>/<region>.json
 *   gs://<bucket>/nav-databases/manifest.json   (index + currency)
 *
 * The device downloads its regions and keeps them locally (offline cockpit);
 * the manifest + airac.js drive the currency / 7-day-out warning. FAA is the
 * compliant source of record.
 *
 * Idempotent: runNavPackager() builds only the regions missing for the current
 * cycle (unless force), so a daily schedule self-heals onto each new cycle.
 */

const admin = require("firebase-admin");
const zlib = require("zlib");
const { currentCycle } = require("./airac");
const { REGIONS, getRegion } = require("./regions");
const { FAA_FEATURESERVERS } = require("./faaData");

const STORAGE_BUCKET = process.env.STORAGE_BUCKET || "title-app-alpha.firebasestorage.app";
const NAVDB_PREFIX = "nav-databases";
const PAGE_SIZE = 1000;

function bucket() { return admin.storage().bucket(STORAGE_BUCKET); }

// Coordinate precision: 6 decimals ≈ 11 cm — lossless for nav display, and it
// roughly halves the JSON before gzip. This is ROUNDING ONLY — no vertex
// removal / geometry simplification (that would alter airspace boundaries, a
// compliance line we don't cross).
const round6 = (n) => (typeof n === "number" ? Math.round(n * 1e6) / 1e6 : n);
function roundCoordArray(a) {
  return a.map((x) => (Array.isArray(x) ? roundCoordArray(x) : round6(x)));
}
function roundGeometry(g) {
  if (g && Array.isArray(g.coordinates)) {
    return { ...g, coordinates: roundCoordArray(g.coordinates) };
  }
  return g;
}

// Layer specs: which FAA FeatureServer + fields + how to normalize a feature.
const LAYERS = [
  {
    key: "airports", url: FAA_FEATURESERVERS.airports, geometry: "point",
    outFields: "IDENT,ICAO_ID,NAME,ELEVATION,TYPE_CODE,SERVCITY,STATE,OPERSTATUS,IAPEXISTS,PRIVATEUSE",
    map: (p, g) => ({
      ident: p.IDENT || null, icao: p.ICAO_ID || null, name: p.NAME || null,
      type: p.TYPE_CODE || null, elevationFt: p.ELEVATION ?? null,
      city: p.SERVCITY || null, state: p.STATE || null, operStatus: p.OPERSTATUS || null,
      hasApproaches: p.IAPEXISTS === 1, privateUse: p.PRIVATEUSE === 1, lat: round6(g.lat), lon: round6(g.lon),
    }),
  },
  {
    key: "waypoints", url: FAA_FEATURESERVERS.waypoints, geometry: "point",
    outFields: "IDENT_TXT,NAME_TXT,TYPE_CODE,CHARTSTRUCTURES_TXT",
    map: (p, g) => ({
      ident: p.IDENT_TXT || null, name: (p.NAME_TXT || "").trim() || null,
      type: p.TYPE_CODE || null, chart: (p.CHARTSTRUCTURES_TXT || "").trim() || null, lat: round6(g.lat), lon: round6(g.lon),
    }),
  },
  {
    key: "navaids", url: FAA_FEATURESERVERS.navaids, geometry: "point",
    outFields: "IDENT_TXT,NAME_TXT,FREQUENCY_VAL,FREQUENCY_UOM,ELEV_VAL",
    map: (p, g) => ({
      ident: p.IDENT_TXT || null, name: (p.NAME_TXT || "").trim() || null,
      frequency: p.FREQUENCY_VAL ?? null, frequencyUom: p.FREQUENCY_UOM || null,
      elevationFt: p.ELEV_VAL ?? null, lat: round6(g.lat), lon: round6(g.lon),
    }),
  },
  {
    key: "airspace", url: FAA_FEATURESERVERS.classAirspace, geometry: "polygon",
    outFields: "NAME,CLASS,LOWER_VAL,UPPER_VAL,LOWER_UOM,UPPER_UOM",
    map: (p, g) => ({
      name: p.NAME || null, airspaceClass: p.CLASS || null,
      floor: p.LOWER_VAL ?? null, ceiling: p.UPPER_VAL ?? null,
      floorUom: p.LOWER_UOM || null, ceilingUom: p.UPPER_UOM || null,
      geometry: roundGeometry(g.geometry) || null,
    }),
  },
];

async function fetchJson(url) {
  const resp = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "SOCIII-Aviation/1.0" } });
  if (!resp.ok) throw new Error(`${resp.status} for ${url.slice(0, 90)}`);
  return resp.json();
}

// Page through a FeatureServer for every feature in bbox; returns mapped records.
async function fetchLayerForBbox(layer, bbox) {
  const [xmin, ymin, xmax, ymax] = bbox;
  const out = [];
  let offset = 0;
  for (let guard = 0; guard < 200; guard++) {
    const params = new URLSearchParams({
      where: "1=1",
      geometry: `${xmin},${ymin},${xmax},${ymax}`,
      geometryType: "esriGeometryEnvelope",
      inSR: "4326", spatialRel: "esriSpatialRelIntersects",
      outFields: layer.outFields, returnGeometry: "true", outSR: "4326",
      f: "geojson", resultRecordCount: String(PAGE_SIZE), resultOffset: String(offset),
    });
    const gj = await fetchJson(`${layer.url}/query?${params}`);
    const feats = gj.features || [];
    for (const f of feats) {
      if (layer.geometry === "point") {
        const c = f.geometry && Array.isArray(f.geometry.coordinates) ? f.geometry.coordinates : [null, null];
        out.push(layer.map(f.properties || {}, { lon: c[0], lat: c[1] }));
      } else {
        out.push(layer.map(f.properties || {}, { geometry: f.geometry || null }));
      }
    }
    if (feats.length < PAGE_SIZE) break; // last page
    offset += PAGE_SIZE;
    if (!gj.exceededTransferLimit && feats.length < PAGE_SIZE) break;
  }
  return out;
}

// Build the full package object for one region at the current cycle.
async function buildRegionPackage(regionKey, cyc) {
  const region = getRegion(regionKey);
  if (!region) throw new Error(`unknown region: ${regionKey}`);
  const pkg = {
    region: regionKey,
    regionLabel: region.label,
    bbox: region.bbox,
    cycle: cyc.cycle,
    effective: cyc.effective,
    expires: cyc.expires,
    source: "FAA NASR (ArcGIS AIS)",
    counts: {},
  };
  for (const layer of LAYERS) {
    const records = await fetchLayerForBbox(layer, region.bbox);
    pkg[layer.key] = records;
    pkg.counts[layer.key] = records.length;
  }
  return pkg;
}

// Build + upload one region package (gzipped); returns its manifest entry.
// Stored with Content-Encoding: gzip so the download is ~5-8× smaller on the
// wire (any HTTP client auto-decompresses).
async function packageRegion(regionKey, cyc) {
  const pkg = await buildRegionPackage(regionKey, cyc);
  const path = `${NAVDB_PREFIX}/${cyc.cycle}/${regionKey}.json`;
  const raw = Buffer.from(JSON.stringify(pkg));
  const gz = zlib.gzipSync(raw, { level: 9 });
  // Store the gzip BLOB (we gunzip it ourselves on download — no reliance on
  // GCS decompressive transcoding, which is finicky through the edge).
  await bucket().file(path).save(gz, {
    contentType: "application/json",
    metadata: { cacheControl: "public,max-age=86400", metadata: { gzipped: "true" } },
  });
  return {
    region: regionKey, label: pkg.regionLabel, file: path,
    sizeBytes: gz.length,        // download size (gzipped)
    rawBytes: raw.length,        // uncompressed size
    counts: pkg.counts,
  };
}

async function readManifest() {
  const f = bucket().file(`${NAVDB_PREFIX}/manifest.json`);
  const [exists] = await f.exists();
  if (!exists) return { generatedAt: null, currentCycle: null, cycles: {} };
  const [buf] = await f.download();
  try { return JSON.parse(buf.toString()); } catch { return { cycles: {} }; }
}

async function writeManifest(manifest) {
  await bucket().file(`${NAVDB_PREFIX}/manifest.json`).save(Buffer.from(JSON.stringify(manifest)), {
    contentType: "application/json",
    metadata: { cacheControl: "no-cache" },
  });
}

/**
 * Build any missing region packages for the current AIRAC cycle, update the
 * manifest. Idempotent: skips regions already packaged for this cycle.
 * @param {{force?: boolean, regions?: string[], nowMs?: number}} opts
 */
async function runNavPackager(opts = {}) {
  const cyc = currentCycle(opts.nowMs);
  const regionKeys = (opts.regions && opts.regions.length ? opts.regions : Object.keys(REGIONS));
  const manifest = await readManifest();
  manifest.cycles = manifest.cycles || {};
  const cycleEntry = manifest.cycles[cyc.cycle] || { effective: cyc.effective, expires: cyc.expires, regions: {} };
  cycleEntry.regions = cycleEntry.regions || {};

  const built = [];
  for (const key of regionKeys) {
    if (!opts.force && cycleEntry.regions[key]) continue; // already packaged this cycle
    try {
      const entry = await packageRegion(key, cyc);
      cycleEntry.regions[key] = entry;
      built.push(entry);
      console.log(`[navPackager] ${cyc.cycle}/${key}: ${JSON.stringify(entry.counts)} (${entry.sizeBytes} bytes)`);
    } catch (e) {
      console.error(`[navPackager] FAILED ${cyc.cycle}/${key}:`, e.message);
    }
  }

  manifest.cycles[cyc.cycle] = cycleEntry;
  manifest.currentCycle = cyc.cycle;
  manifest.generatedAt = new Date(opts.nowMs || Date.now()).toISOString();
  await writeManifest(manifest);

  return { cycle: cyc.cycle, builtRegions: built.map(b => b.region), totalRegions: regionKeys.length };
}

// ── route handlers ─────────────────────────────────────────────
const { currencyStatus } = require("./airac");
const { listRegions } = require("./regions");

// GET /v1/aviation:navdb — manifest of available regional databases + currency.
async function handleManifest(req, res) {
  const manifest = await readManifest();
  const cur = currentCycle();
  res.status(200).json({
    ok: true,
    currentCycle: cur.cycle,
    effective: cur.effective,
    expires: cur.expires,
    availableRegions: listRegions().map(r => ({ key: r.key, label: r.label, description: r.description })),
    cycles: manifest.cycles || {},
    generatedAt: manifest.generatedAt || null,
  });
}

// GET /v1/aviation:navdb:download?region=hawaii[&cycle=2606] — stream a package.
async function handleDownload(req, res) {
  const region = String(req.query?.region || req.body?.region || "").toLowerCase();
  if (!region) { res.status(400).json({ ok: false, error: "region required" }); return; }
  const cyc = req.query?.cycle || req.body?.cycle || currentCycle().cycle;
  const path = `${NAVDB_PREFIX}/${cyc}/${region}.json`;
  const file = bucket().file(path);
  const [exists] = await file.exists();
  if (!exists) {
    res.status(404).json({ ok: false, error: `no package for ${region} cycle ${cyc} (build pending)` });
    return;
  }
  // Packages are stored as a gzip blob. Download the raw bytes, gunzip
  // ourselves (detect the gzip magic so any legacy uncompressed object still
  // works), and send a Buffer — binary-safe, no stream/charset mangling. We
  // serve plain JSON; the edge (Cloudflare) compresses to the client per its
  // Accept-Encoding. Cache-Control lets the edge cache it (origin gunzips once).
  let [buf] = await file.download();
  if (buf && buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    buf = zlib.gunzipSync(buf); // stored gzip → JSON bytes
  }
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public,max-age=86400");
  res.setHeader("X-Nav-Cycle", String(cyc));
  res.end(buf);
}

module.exports = {
  runNavPackager, buildRegionPackage, packageRegion,
  readManifest, handleManifest, handleDownload, NAVDB_PREFIX, LAYERS,
};
