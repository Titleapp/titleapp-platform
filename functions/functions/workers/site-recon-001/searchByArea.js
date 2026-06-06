"use strict";

/**
 * SITE-RECON-001 — searchByArea (Build Step 4: THE SPINE, per CODEX S52.32)
 *
 * POST /v1/workers/site-recon-001/search-by-area
 *
 * Converts an area (radius or polygon) into a RANKED LIST of underwriteable
 * parcels — the Intent Spec's core promise. Two-phase cost gate (RULE-01),
 * list cap (RULE-08: default 10, max 50), retired-APN REMOVAL (RULE-07),
 * ONE batch audit receipt with full parcel manifest (RULE-03 batch path of
 * the Deposition Rule), rollback on anchor failure.
 *
 * INPUT:
 * {
 *   area: {
 *     type: "radius" | "polygon",
 *     center: { lat, lng }, radiusMiles | radiusMeters,   // radius
 *     vertices: [{ lat, lng }, ...]                       // polygon (3..50)
 *   },
 *   filters: { minLotSqft?, maxLotSqft?, landUseCodes?, excludeRetiredApn? },
 *   limit: number,            // default 10, max 50 (RULE-08)
 *   confirmCost: boolean,
 *   quotedTotalFeeUsd: number // optional Phase-1 echo for the 409 COST_MISMATCH check
 * }
 *
 * v1 notes (deviations documented in the Step 4 report-back):
 *   - Polygon search: ATTOM /property/snapshot supports lat/lng+radius only,
 *     so polygons query the bounding radius then post-filter point-in-polygon.
 *     The receipt's queryArea records the user's actual polygon.
 *   - Phase 1's snapshot query is itself an external ATTOM call → billed as
 *     attom:snapshot per the universal data-credit rule (pennies, silent tier).
 *   - Expansion: expansionAvailable/expansionCost are informational; stateful
 *     delta-dedup awaits the 24h session-resume infra (spec §9).
 */

const fs = require("fs");
const path = require("path");
const { sha256 } = require("../../services/signatureService/blockchain");
const { attomGet, pullParcelBundle } = require("./attomClient");
// Namespace requires so smoke tests can stub per-case.
const billing = require("../../services/billing/dataFee");
const scoring = require("./scoreFeasibility");
const auditTrail = require("../../services/auditTrailService");

const WORKER_ID = "site-recon-001";
const SPEC_VERSION = "SITE-RECON-001-v1.1";
const SOURCE_PROPERTY = "attom:property";
const SOURCE_SNAPSHOT = "attom:snapshot";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;            // RULE-08
const MAX_RADIUS_MILES = 5;      // spec RULE-11 radius cap (cheap to enforce now)
const MAX_POLYGON_SQ_MI = 10;    // spec RULE-11 polygon cap
const COST_MISMATCH_TOLERANCE = 0.05; // CODEX S52.32 — 409 if quote drifts >5%
const PULL_CHUNK_SIZE = 10;      // parallel bundle pulls per chunk

// ── Composition hash (same pattern as Step 3 — computed once) ───
const RULESET_PATH = path.join(__dirname, "../../raas/rulesets/site_recon_rules_v1.json");
let RULESET_HASH = null;
try {
  RULESET_HASH = sha256(fs.readFileSync(RULESET_PATH, "utf8"));
} catch (e) {
  console.error(`[${WORKER_ID}] ruleset hash unavailable:`, e.message);
}

// ── Geometry helpers (no new deps — plain math) ─────────────────
const MILES_PER_METER = 1 / 1609.344;

function haversineMiles(a, b) {
  const R = 3958.7613; // earth radius, miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function polygonCentroid(vertices) {
  const lat = vertices.reduce((s, v) => s + v.lat, 0) / vertices.length;
  const lng = vertices.reduce((s, v) => s + v.lng, 0) / vertices.length;
  return { lat, lng };
}

// Shoelace on an equirectangular projection — fine at parcel-search scale.
function polygonAreaSqMi(vertices) {
  const lat0 = (polygonCentroid(vertices).lat * Math.PI) / 180;
  const MI_PER_DEG_LAT = 69.0;
  const MI_PER_DEG_LNG = 69.172 * Math.cos(lat0);
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const p = vertices[i];
    const q = vertices[(i + 1) % vertices.length];
    area += (p.lng * MI_PER_DEG_LNG) * (q.lat * MI_PER_DEG_LAT) - (q.lng * MI_PER_DEG_LNG) * (p.lat * MI_PER_DEG_LAT);
  }
  return Math.abs(area / 2);
}

function pointInPolygon(point, vertices) {
  // Ray casting on lng/lat.
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const vi = vertices[i];
    const vj = vertices[j];
    const intersects =
      vi.lat > point.lat !== vj.lat > point.lat &&
      point.lng < ((vj.lng - vi.lng) * (point.lat - vi.lat)) / (vj.lat - vi.lat) + vi.lng;
    if (intersects) inside = !inside;
  }
  return inside;
}

function isFiniteCoord(c) {
  return c && Number.isFinite(c.lat) && Number.isFinite(c.lng) && Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180;
}

// ── Input validation ─────────────────────────────────────────────
function validateInput(body) {
  const area = body.area || {};
  const limit = body.limit === undefined ? DEFAULT_LIMIT : Number(body.limit);

  if (!Number.isFinite(limit) || limit < 1) {
    return { error: { status: 400, code: "INVALID_LIMIT", message: "limit must be a positive number." } };
  }
  if (limit > MAX_LIMIT) {
    return { error: { status: 400, code: "LIMIT_EXCEEDED", message: `limit may not exceed ${MAX_LIMIT} parcels per session (RULE-08).` } };
  }

  if (area.type === "radius") {
    if (!isFiniteCoord(area.center)) {
      return { error: { status: 400, code: "INVALID_AREA", message: "area.center must be { lat, lng } with valid coordinates." } };
    }
    const radiusMiles = area.radiusMiles !== undefined
      ? Number(area.radiusMiles)
      : Number(area.radiusMeters) * MILES_PER_METER;
    if (!Number.isFinite(radiusMiles) || radiusMiles <= 0) {
      return { error: { status: 400, code: "INVALID_AREA", message: "Provide radiusMiles or radiusMeters > 0." } };
    }
    if (radiusMiles > MAX_RADIUS_MILES) {
      return { error: { status: 400, code: "RADIUS_EXCEEDED", message: `Search radius may not exceed ${MAX_RADIUS_MILES} miles.` } };
    }
    return { area: { type: "radius", center: area.center, radiusMiles }, limit: Math.floor(limit) };
  }

  if (area.type === "polygon") {
    const vertices = Array.isArray(area.vertices) ? area.vertices : [];
    if (vertices.length < 3 || vertices.length > 50 || !vertices.every(isFiniteCoord)) {
      return { error: { status: 400, code: "INVALID_AREA", message: "area.vertices must be 3-50 valid { lat, lng } points." } };
    }
    const sqMi = polygonAreaSqMi(vertices);
    if (sqMi > MAX_POLYGON_SQ_MI) {
      return { error: { status: 400, code: "POLYGON_TOO_LARGE", message: `Polygon area ${sqMi.toFixed(1)} sq mi exceeds the ${MAX_POLYGON_SQ_MI} sq mi limit.` } };
    }
    const center = polygonCentroid(vertices);
    const boundingRadiusMiles = Math.min(
      MAX_RADIUS_MILES,
      Math.max(...vertices.map((v) => haversineMiles(center, v))) * 1.05 // 5% pad
    );
    return {
      area: { type: "polygon", vertices, center, radiusMiles: boundingRadiusMiles },
      limit: Math.floor(limit),
    };
  }

  return { error: { status: 400, code: "INVALID_AREA", message: 'area.type must be "radius" or "polygon".' } };
}

// ── ATTOM snapshot (thin parcel list) ────────────────────────────
function extractSnapshotParcels(snapResp) {
  const props = snapResp?.data?.property || [];
  return props
    .map((p) => ({
      attomId: p?.identifier?.attomId ?? null,
      apn: p?.identifier?.apn ?? null,
      address1: p?.address?.line1 ?? null,
      address2: p?.address?.line2 ?? ([p?.address?.locality, p?.address?.countrySubd, p?.address?.postal1].filter(Boolean).join(", ") || null),
      lat: Number(p?.location?.latitude ?? NaN),
      lng: Number(p?.location?.longitude ?? NaN),
      lotSqft: p?.lot?.lotsize2 ?? null,
      landUseCode: p?.summary?.propLandUse ?? p?.summary?.propclass ?? null,
    }))
    .filter((p) => p.attomId || (p.address1 && p.address2));
}

async function runSnapshot(area, limit, apiKey, ctx, phase) {
  const resp = await attomGet(
    "/property/snapshot",
    {
      latitude: area.center.lat,
      longitude: area.center.lng,
      radius: area.radiusMiles,
      pagesize: MAX_LIMIT, // pull the full cap so parcelsFound/expansion math is honest
    },
    apiKey
  );
  // The snapshot is an external call — billed per the universal data-credit
  // rule, even in the quote phase. Pennies; silent tier.
  await billing.recordDataFee({
    source: SOURCE_SNAPSHOT,
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    units: 1,
    requestedBy: `${WORKER_ID}:search-by-area:${phase}`,
    metadata: { center: area.center, radiusMiles: area.radiusMiles },
  });

  let parcels = extractSnapshotParcels(resp);
  if (area.type === "polygon") {
    parcels = parcels.filter((p) =>
      Number.isFinite(p.lat) && Number.isFinite(p.lng)
        ? pointInPolygon({ lat: p.lat, lng: p.lng }, area.vertices)
        : false
    );
  }
  const totalFound = area.type === "polygon"
    ? parcels.length
    : Number(snapResp_total(resp)) || parcels.length;
  return { ok: resp.ok, httpStatus: resp.httpStatus, parcels, totalFound };
}

function snapResp_total(resp) {
  return resp?.data?.status?.total ?? resp?.data?.property?.length ?? 0;
}

// ── Filters (post-filter on snapshot fields where present) ───────
function applyFilters(parcels, filters = {}) {
  return parcels.filter((p) => {
    if (filters.minLotSqft != null && p.lotSqft != null && p.lotSqft < filters.minLotSqft) return false;
    if (filters.maxLotSqft != null && p.lotSqft != null && p.lotSqft > filters.maxLotSqft) return false;
    if (Array.isArray(filters.landUseCodes) && filters.landUseCodes.length && p.landUseCode != null) {
      if (!filters.landUseCodes.includes(p.landUseCode)) return false;
    }
    return true;
  });
}

// ── Ranking: verdict band (GREEN → YELLOW → RED), confidence desc within ──
const VERDICT_ORDER = { GREEN: 0, YELLOW: 1, RED: 2 };
function rankParcels(scored) {
  return [...scored].sort((a, b) => {
    const band = (VERDICT_ORDER[a.feasibility.verdict] ?? 3) - (VERDICT_ORDER[b.feasibility.verdict] ?? 3);
    if (band !== 0) return band;
    return b.feasibility.confidenceScore - a.feasibility.confidenceScore;
  });
}

async function pullInChunks(parcels, apiKey) {
  const results = [];
  for (let i = 0; i < parcels.length; i += PULL_CHUNK_SIZE) {
    const chunk = parcels.slice(i, i + PULL_CHUNK_SIZE);
    const bundles = await Promise.all(
      chunk.map(async (p) => {
        const params = p.attomId ? { attomid: p.attomId } : { address1: p.address1, address2: p.address2 };
        try {
          const bundle = await pullParcelBundle(params, apiKey);
          return { parcel: p, bundle };
        } catch (e) {
          return { parcel: p, bundle: null, pullError: e.message };
        }
      })
    );
    results.push(...bundles);
  }
  return results;
}

/**
 * Route handler. index.js does auth + ctx extraction and delegates here.
 */
async function searchByArea(req, res, { body, ctx, jsonError }) {
  const validated = validateInput(body);
  if (validated.error) {
    const { status, code, message } = validated.error;
    return jsonError(res, status, message, { code });
  }
  const { area, limit } = validated;

  const apiKey = process.env.ATTOM_API_KEY || "";
  if (!apiKey) return jsonError(res, 500, "ATTOM API key not configured", { code: "ATTOM_KEY_MISSING" });

  // ── Snapshot: thin parcel list (billed; both phases) ───────────
  const phase = body.confirmCost === true ? "pull" : "quote";
  const snap = await runSnapshot(area, limit, apiKey, ctx, phase);
  if (!snap.ok) {
    return jsonError(res, 502, "ATTOM area search failed", { code: "ATTOM_SNAPSHOT_FAILED", httpStatus: snap.httpStatus });
  }

  const filtered = applyFilters(snap.parcels, body.filters);
  const capped = filtered.slice(0, limit);

  // Empty area — 200 with empty list, not an error.
  if (capped.length === 0) {
    return res.json({
      ok: true,
      phase,
      worker: WORKER_ID,
      searchArea: summarizeArea(area, 0, 0),
      rankedParcels: [],
      message: "No parcels found in the search area. Try a larger radius or different location.",
    });
  }

  const quote = await billing.quoteDataFee({ source: SOURCE_PROPERTY, units: capped.length, userId: ctx.userId });
  const totalFeeUsd = quote.costBilledCents / 100;

  // ── Phase 1: cost projection (RULE-01) ─────────────────────────
  if (body.confirmCost !== true) {
    return res.json({
      ok: true,
      phase: "quote",
      worker: WORKER_ID,
      searchArea: summarizeArea(area, filtered.length, capped.length),
      estimatedCost: {
        attomCostUsd: quote.costActualCents / 100,
        sociiiMarkupUsd: (quote.costBilledCents - quote.costActualCents) / 100,
        totalFeeUsd,
      },
      parcelCount: filtered.length,
      parcelsToReturn: capped.length,
      breakdown: `Will pull ${capped.length} parcels at $${(quote.costBilledCents / capped.length / 100).toFixed(2)}/parcel report = $${totalFeeUsd.toFixed(2)} total`,
      tier: quote.tier,
      message: quote.message,
      next: "Re-submit with confirmCost: true (echo quotedTotalFeeUsd to lock the projection) to execute.",
    });
  }

  if (quote.blocked) {
    return jsonError(res, 402, quote.message, { code: "BELOW_MINIMUM_BALANCE" });
  }

  // ── COST_MISMATCH guard (CODEX S52.32 — >5% drift from quote) ──
  if (body.quotedTotalFeeUsd != null) {
    const quoted = Number(body.quotedTotalFeeUsd);
    if (Number.isFinite(quoted) && quoted > 0 && Math.abs(totalFeeUsd - quoted) / quoted > COST_MISMATCH_TOLERANCE) {
      return res.status(409).json({
        ok: false,
        code: "COST_MISMATCH",
        message: `Projected cost changed since your quote ($${quoted.toFixed(2)} → $${totalFeeUsd.toFixed(2)}). Review and re-confirm.`,
        newProjection: {
          parcelsToReturn: capped.length,
          totalFeeUsd,
        },
      });
    }
  }

  // ── Phase 2: pull bundles, score, RULE-07 removal ──────────────
  const pulled = await pullInChunks(capped, apiKey);

  const scored = [];
  let removedRetired = 0;
  let skippedFailures = 0;
  for (const item of pulled) {
    if (!item.bundle) {
      skippedFailures++;
      console.warn(`[${WORKER_ID}] parcel pull failed — excluded:`, { attomId: item.parcel.attomId, error: item.pullError });
      continue;
    }
    const feasibility = scoring.scoreFeasibility(item.bundle);
    // RULE-07: retired APN parcels are REMOVED from the ranked list, not
    // flagged. Decrement, don't substitute.
    if (feasibility.blockerCode === "APN_RETIRED") {
      removedRetired++;
      continue;
    }
    scored.push({ parcel: item.parcel, bundle: item.bundle, feasibility });
  }

  // Bill the ACTUAL pulled count (bundles we paid ATTOM for), not the limit.
  const pulledCount = pulled.filter((p) => p.bundle).length;
  const fee = await billing.recordDataFee({
    source: SOURCE_PROPERTY,
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    units: pulledCount,
    requestedBy: `${WORKER_ID}:search-by-area`,
    metadata: { center: area.center, radiusMiles: area.radiusMiles, parcels: pulledCount },
  });

  const ranked = rankParcels(scored);

  // ── ONE batch receipt (RULE-03 batch path, spec §8 classification) ──
  const batchId = `batch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const pulledAt = new Date().toISOString();
  const verdictCounts = ranked.reduce(
    (acc, r) => { acc[r.feasibility.verdict.toLowerCase()] = (acc[r.feasibility.verdict.toLowerCase()] || 0) + 1; return acc; },
    { green: 0, yellow: 0, red: 0 }
  );
  const receiptMetadata = {
    classification: "BATCH", // Deposition Rule, spec §8
    parcelRefBatch: {
      batchId,
      queryType: area.type === "polygon" ? "area_polygon" : "area_radius",
      queryArea: area.type === "polygon"
        ? { type: "polygon", vertices: area.vertices }
        : { type: "radius", center: area.center, radiusMiles: area.radiusMiles },
      parcelManifest: ranked.map((r) => ({
        attomId: r.parcel.attomId,
        address1: r.parcel.address1,
        address2: r.parcel.address2,
        verdict: r.feasibility.verdict,
        blockerCode: r.feasibility.blockerCode,
      })),
      retiredApnsRemoved: removedRetired,
      finalCount: ranked.length,
    },
    feasibilityBatch: {
      verdictCounts,
      avgConfidenceScore: ranked.length
        ? Math.round(ranked.reduce((s, r) => s + r.feasibility.confidenceScore, 0) / ranked.length)
        : 0,
    },
    feeEventId: fee.eventId || null,
    composition: { spec: SPEC_VERSION, rulesetHash: RULESET_HASH },
  };
  const eventId = `PLAT-008-${pulledAt.slice(0, 10).replace(/-/g, "")}-${batchId}`;

  let anchor;
  try {
    anchor = await auditTrail.writeAuditRecord({
      event_id: eventId,
      worker_id: WORKER_ID,
      user_id: ctx.userId,
      org_id: ctx.tenantId,
      execution_type: "site-recon:area-search",
      timestamp: pulledAt,
      metadata: receiptMetadata,
    });
  } catch (anchorErr) {
    // RULE-03 on_fail: rollback_pull — the whole batch rolls back.
    console.error("[orphan_fee]", {
      feeEventId: fee.eventId || null,
      batchId,
      parcelCount: pulledCount,
      error: anchorErr.message,
    });
    return res.status(503).json({
      ok: false,
      code: "AUDIT_ANCHOR_FAILED",
      phase: "anchor",
      batchId,
      parcelCountPulled: pulledCount,
      feeEventId: fee.eventId || null,
      message: "Search succeeded but audit anchor failed. Results not persisted. Fee charged — contact support for reconciliation.",
    });
  }

  return res.json({
    ok: true,
    phase: "pull",
    worker: WORKER_ID,
    searchArea: summarizeArea(area, filtered.length, ranked.length),
    rankedParcels: ranked.map((r, i) => ({
      rank: i + 1,
      parcel: {
        attomId: r.parcel.attomId,
        apn: r.parcel.apn,
        address1: r.parcel.address1,
        address2: r.parcel.address2,
        lat: r.parcel.lat,
        lng: r.parcel.lng,
      },
      attom: r.bundle,
      feasibility: r.feasibility,
    })),
    parcelCountReturned: ranked.length,
    parcelCountRemovedRetired: removedRetired,
    parcelCountSkippedFlags: skippedFailures,
    batchAuditAnchor: {
      receiptId: anchor.receiptId || null,
      txHash: anchor.txHash,
      anchoredAt: pulledAt,
      batchId,
    },
    billing: {
      totalFeeUsd: (pulledCount * (billing.SOURCE_REGISTRY[SOURCE_PROPERTY].actualCentsPerUnit * billing.SOURCE_REGISTRY[SOURCE_PROPERTY].markup)) / 100,
      feeEventId: fee.eventId || null,
    },
    // Informational expansion gate — stateful delta-dedup awaits session
    // resume infra (spec §9). Client re-queries with a higher limit.
    expansionAvailable: filtered.length > ranked.length + removedRetired + skippedFailures,
    expansionCost: filtered.length > capped.length
      ? +(((filtered.length - capped.length) * billing.SOURCE_REGISTRY[SOURCE_PROPERTY].actualCentsPerUnit * billing.SOURCE_REGISTRY[SOURCE_PROPERTY].markup) / 100).toFixed(2)
      : null,
  });
}

function summarizeArea(area, parcelsFound, parcelsReturned) {
  return {
    type: area.type,
    center: area.center,
    radiusMiles: +area.radiusMiles.toFixed(3),
    ...(area.type === "polygon" ? { vertexCount: area.vertices.length } : {}),
    parcelsFound,
    parcelsReturned,
  };
}

module.exports = { searchByArea };
