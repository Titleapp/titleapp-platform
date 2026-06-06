"use strict";

/**
 * SITE-RECON-001 — gisOverlayService (Build Step 5)
 *
 * Fetches the four overlay layers from spec §6 and returns a normalized
 * overlay object per parcel. Closes the `overlays_not_evaluated` gap from
 * Step 2 — the scoring engine's options.overlays injection hook was built
 * waiting for exactly this.
 *
 * Sources (all public government ArcGIS REST services, point-in-polygon):
 *   - FEMA National Flood Hazard Layer → floodZone ('A'|'AE'|'VE'|'X'|...)
 *   - CA Coastal Commission jurisdiction → coastalCommission (CA parcels only)
 *   - National Register of Historic Places districts → historicDistrict
 *   - IRS/HUD Opportunity Zones (2018 tracts) → opportunityZone
 *
 * Failure model: each source gets a 3s timeout. A failed source returns
 * null for its field and lands in errors[] — surfaced, never silent. Only
 * if ALL four fail does evaluated go false. Overlay failures NEVER block
 * the search.
 *
 * Caching: Firestore `gis-overlays/{key}` with 30-day TTL. Overlay
 * boundaries change on regulatory timescales; 30 days is conservative.
 * Cache reads/writes are non-fatal (same posture as dataFee.js).
 *
 * Billing: fresh evaluations record a gis:overlays data fee (free public
 * feeds, but ingest/compute cost-recovery — same precedent as ofac:screen).
 * Cache hits are free.
 *
 * NOTE: endpoint URLs are best-known as of 2026-06-06. The FEMA NFHL layer
 * is long-stable; CCC / NRHP / OZ layer URLs get pinned during the Sublette
 * WY + Oakland E2E pass (Step 9). A wrong URL degrades soft into errors[].
 */

const admin = require("firebase-admin");
const billing = require("../../services/billing/dataFee");

const CACHE_COLLECTION = "gis-overlays";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SOURCE_TIMEOUT_MS = 3000;
const SFHA_ZONES = ["A", "AE", "AH", "AO", "AR", "A99", "V", "VE"]; // Special Flood Hazard Areas

const ENDPOINTS = {
  femaFlood: "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query",
  // VERIFY at E2E (Step 9) — layer URLs for these three:
  coastalCommission: "https://services2.arcgis.com/yh4PJtbnaZ3vAF5M/ArcGIS/rest/services/Coastal_Zone_Boundary/FeatureServer/0/query",
  historicDistricts: "https://mapservices.nps.gov/arcgis/rest/services/cultural_resources/nrhp_locations/MapServer/1/query",
  opportunityZones: "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Opportunity_Zones/FeatureServer/0/query",
};

function getDb() { return admin.firestore(); }

// ── ArcGIS point-in-polygon query with hard timeout ──────────────
async function arcgisPointQuery(serviceUrl, lat, lng, outFields = "*") {
  const url = new URL(serviceUrl);
  url.searchParams.set("geometry", JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } }));
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", outFields);
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("f", "json");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    const resp = await fetch(url.toString(), { signal: controller.signal });
    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json || json.error) {
      throw new Error(`arcgis_error_${resp.status}${json?.error ? `_${json.error.code}` : ""}`);
    }
    return json.features || [];
  } finally {
    clearTimeout(timer);
  }
}

// ── Source adapters — each returns its field value or throws ─────
async function fetchFloodZone(lat, lng) {
  const features = await arcgisPointQuery(ENDPOINTS.femaFlood, lat, lng, "FLD_ZONE");
  if (!features.length) return "X"; // outside mapped hazard polygons = minimal-risk zone
  return features[0]?.attributes?.FLD_ZONE ?? null;
}

async function fetchCoastalCommission(lat, lng, state) {
  if (state !== "CA") return false; // CCC jurisdiction is California-only
  const features = await arcgisPointQuery(ENDPOINTS.coastalCommission, lat, lng);
  return features.length > 0;
}

async function fetchHistoricDistrict(lat, lng) {
  const features = await arcgisPointQuery(ENDPOINTS.historicDistricts, lat, lng);
  return features.length > 0;
}

async function fetchOpportunityZone(lat, lng) {
  const features = await arcgisPointQuery(ENDPOINTS.opportunityZones, lat, lng);
  return features.length > 0;
}

// ── Cache (non-fatal in both directions) ─────────────────────────
function cacheKey({ apn, lat, lng }) {
  const raw = apn ? String(apn) : `geo_${Number(lat).toFixed(5)}_${Number(lng).toFixed(5)}`;
  return raw.replace(/[^A-Za-z0-9_.-]+/g, "-").slice(0, 200);
}

async function readCache(key) {
  try {
    const snap = await getDb().collection(CACHE_COLLECTION).doc(key).get();
    if (!snap.exists) return null;
    const d = snap.data();
    const fetchedAt = d?.fetchedAt?.toMillis ? d.fetchedAt.toMillis() : d?.fetchedAtMs;
    if (!fetchedAt || Date.now() - fetchedAt > CACHE_TTL_MS) return null; // stale
    return d.overlays || null;
  } catch (_) {
    return null;
  }
}

async function writeCache(key, overlays) {
  try {
    await getDb().collection(CACHE_COLLECTION).doc(key).set({
      overlays,
      fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
      fetchedAtMs: Date.now(),
    });
  } catch (e) {
    console.warn("[gisOverlayService] cache write failed (non-fatal):", e.message);
  }
}

/**
 * Fetch normalized overlays for one parcel.
 *
 * @param {object} params { lat, lng, state, apn }
 * @param {object} [ctx]  { userId, tenantId } — when present, fresh
 *                        evaluations record a gis:overlays data fee.
 * @returns {{ floodZone, coastalCommission, historicDistrict, opportunityZone, evaluated, errors, fromCache }}
 */
async function getOverlays({ lat, lng, state, apn }, ctx = null) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { floodZone: null, coastalCommission: null, historicDistrict: null, opportunityZone: null, evaluated: false, errors: ["invalid_coordinates"], fromCache: false };
  }

  const key = cacheKey({ apn, lat, lng });
  const cached = await readCache(key);
  if (cached) return { ...cached, fromCache: true };

  const sources = [
    ["femaFlood", () => fetchFloodZone(lat, lng)],
    ["coastalCommission", () => fetchCoastalCommission(lat, lng, state)],
    ["historicDistricts", () => fetchHistoricDistrict(lat, lng)],
    ["opportunityZones", () => fetchOpportunityZone(lat, lng)],
  ];
  const settled = await Promise.all(
    sources.map(async ([name, fn]) => {
      try {
        return { name, ok: true, value: await fn() };
      } catch (e) {
        console.warn(`[gisOverlayService] ${name} failed:`, e.message);
        return { name, ok: false, error: e.message };
      }
    })
  );

  const byName = Object.fromEntries(settled.map((s) => [s.name, s]));
  const errors = settled.filter((s) => !s.ok).map((s) => s.name);
  const overlays = {
    floodZone: byName.femaFlood.ok ? byName.femaFlood.value : null,
    coastalCommission: byName.coastalCommission.ok ? byName.coastalCommission.value : null,
    historicDistrict: byName.historicDistricts.ok ? byName.historicDistricts.value : null,
    opportunityZone: byName.opportunityZones.ok ? byName.opportunityZones.value : null,
    evaluated: errors.length < sources.length, // false only when ALL failed
    errors,
  };

  // Cache even partial results — a working source's answer is stable.
  if (overlays.evaluated) await writeCache(key, overlays);

  // Cost-recovery fee on fresh evaluation only (ofac:screen precedent).
  if (ctx && ctx.userId) {
    await billing.recordDataFee({
      source: "gis:overlays",
      userId: ctx.userId,
      tenantId: ctx.tenantId || null,
      units: 1,
      requestedBy: "site-recon-001:gis-overlays",
      metadata: { apn: apn || null, sourcesFailed: errors },
    });
  }

  return { ...overlays, fromCache: false };
}

module.exports = { getOverlays, ENDPOINTS, SFHA_ZONES, arcgisPointQuery };
