"use strict";

/**
 * SITE-RECON-001 — visual layer, server-side payloads (Build Step 6)
 *
 * Three endpoints; canvas UI renders later. This step is payload-only.
 *   - generateMapLayer: cached search → GeoJSON FeatureCollection + bounds
 *   - getStreetView: Google Street View metadata + static image URL
 *   - recordVisualAcknowledgment: RULE-17 evidence — user saw the imagery
 *     BEFORE the verdict rendered. Written as a NEW linked audit record
 *     (append-only invariant: receipts are never mutated; the acknowledgment
 *     is its own anchored record referencing the batch receipt).
 *
 * Identity comes from the authenticated ctx (bearer token + x-tenant-id),
 * never from query/body params.
 *
 * Google Maps note: per spec §9, Google API calls carry no pass-through fee.
 * The static image URL embeds GOOGLE_MAPS_API_KEY — that key MUST be a
 * referrer-restricted browser key (standard Google Maps pattern). Server-side
 * we only call the (free) metadata API. requestParams are included in the
 * payload so the exact view is reproducible from the audit trail without
 * persisting Google imagery (ToS — anchor parameters, not snapshots).
 */

const admin = require("firebase-admin");
const auditTrail = require("../../services/auditTrailService");

const SEARCH_CACHE_COLLECTION = "search-results";
const ACK_COLLECTION = "visual-acknowledgments";
const SEARCH_TTL_MS = 24 * 60 * 60 * 1000; // 24h (spec §9 session persistence)
const WORKER_ID = "site-recon-001";
const STREETVIEW_SIZE = "640x480";

function getDb() { return admin.firestore(); }

const VERDICT_COLOR = { GREEN: "green", YELLOW: "yellow", RED: "red" };

// ── Search-result cache access (shared by map layer + acknowledgment) ──
async function loadSearch(searchId, ctx) {
  if (!searchId || typeof searchId !== "string") {
    return { error: { status: 400, code: "INVALID_SEARCH_ID", message: "searchId is required." } };
  }
  const snap = await getDb().collection(SEARCH_CACHE_COLLECTION).doc(searchId).get();
  if (!snap.exists) {
    return { error: { status: 404, code: "SEARCH_NOT_FOUND", message: "Search not found. Run the area search again." } };
  }
  const doc = snap.data();
  if (Date.now() - (doc.createdAtMs || 0) > SEARCH_TTL_MS) {
    return { error: { status: 404, code: "SEARCH_NOT_FOUND", message: "Search expired (results persist 24h). Run the area search again." } };
  }
  const sameUser = doc.userId === ctx.userId;
  const sameTenant = doc.tenantId && doc.tenantId === ctx.tenantId && ctx.tenantId !== "vault" && ctx.tenantId !== "personal";
  if (!sameUser && !sameTenant) {
    return { error: { status: 403, code: "FORBIDDEN", message: "This search belongs to another user." } };
  }
  return { doc };
}

// ── 1) GET /workers/site-recon-001/generate-map-layer ────────────
async function generateMapLayer(req, res, { ctx, jsonError }) {
  const searchId = (req.query?.searchId || "").toString();
  const loaded = await loadSearch(searchId, ctx);
  if (loaded.error) {
    const { status, code, message } = loaded.error;
    return jsonError(res, status, message, { code });
  }
  const { doc } = loaded;
  const parcels = doc.rankedParcels || [];

  const features = parcels
    .filter((p) => Number.isFinite(p.parcel?.lat) && Number.isFinite(p.parcel?.lng))
    .map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.parcel.lng, p.parcel.lat] },
      properties: {
        rank: p.rank,
        verdict: p.feasibility?.verdict || null,
        confidenceScore: p.feasibility?.confidenceScore ?? null,
        namedBlocker: p.feasibility?.namedBlocker || null,
        address: [p.parcel.address1, p.parcel.address2].filter(Boolean).join(", "),
        apn: p.parcel.apn || null,
        markerColor: VERDICT_COLOR[p.feasibility?.verdict] || "gray",
      },
    }));

  if (features.length === 0) {
    return res.json({ ok: true, searchId, mapLayer: { type: "FeatureCollection", features: [] }, bounds: null, searchArea: doc.searchArea || null });
  }

  const lats = features.map((f) => f.geometry.coordinates[1]);
  const lngs = features.map((f) => f.geometry.coordinates[0]);
  return res.json({
    ok: true,
    searchId,
    mapLayer: { type: "FeatureCollection", features },
    bounds: {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    },
    // Spec §5: the search radius/polygon renders on the map alongside markers.
    searchArea: doc.searchArea || null,
  });
}

// ── 2) GET /workers/site-recon-001/get-street-view ───────────────
async function getStreetView(req, res, { ctx, jsonError }) {
  const lat = Number(req.query?.lat);
  const lng = Number(req.query?.lng);
  const apn = (req.query?.apn || "").toString() || null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return jsonError(res, 400, "lat and lng are required numbers.", { code: "INVALID_COORDINATES" });
  }
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || "";
  if (!apiKey) {
    return jsonError(res, 500, "Google Maps API key not configured", { code: "GOOGLE_MAPS_KEY_MISSING" });
  }

  // Metadata API is free — server-side check for imagery availability.
  let meta = null;
  try {
    const metaUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${apiKey}`;
    const resp = await fetch(metaUrl);
    meta = await resp.json().catch(() => null);
  } catch (e) {
    console.warn(`[${WORKER_ID}] street view metadata failed:`, e.message);
  }

  const available = meta?.status === "OK";
  const requestParams = { location: `${lat},${lng}`, size: STREETVIEW_SIZE };
  return res.json({
    ok: true,
    streetView: {
      available,
      // Spec §5 Tab 1: fall back to satellite-only badge when unavailable —
      // the canvas reads `available` and renders the named badge.
      imageUrl: available
        ? `https://maps.googleapis.com/maps/api/streetview?location=${lat},${lng}&size=${STREETVIEW_SIZE}&key=${apiKey}`
        : null,
      panoramaId: available ? meta?.pano_id ?? null : null,
      location: { lat, lng },
      captureDate: available ? meta?.date ?? null : null,
      apn,
      // Reproducibility for the audit trail: parameters, not persisted imagery.
      requestParams,
    },
  });
}

// ── 3) POST /workers/site-recon-001/record-visual-acknowledgment ──
async function recordVisualAcknowledgment(req, res, { body, ctx, jsonError }) {
  const searchId = (body.searchId || "").toString();
  const apn = (body.apn || "").toString();
  const visualsViewed = body.visualsViewed || {};
  if (!apn) return jsonError(res, 400, "apn is required.", { code: "INVALID_APN" });
  if (visualsViewed.mapLayer !== true && visualsViewed.streetView !== true) {
    return jsonError(res, 400, "At least one visual (mapLayer or streetView) must have been viewed.", { code: "NO_VISUALS_VIEWED" });
  }

  const loaded = await loadSearch(searchId, ctx);
  if (loaded.error) {
    const { status, code, message } = loaded.error;
    return jsonError(res, status, message, { code });
  }

  const timestamp = new Date().toISOString();
  const ackDoc = {
    searchId,
    apn,
    userId: ctx.userId,
    tenantId: ctx.tenantId || null,
    visualsViewed: {
      mapLayer: visualsViewed.mapLayer === true,
      streetView: visualsViewed.streetView === true,
    },
    panoramaId: body.panoramaId || null,
    timestamp,
  };
  const ackKey = apn.replace(/[^A-Za-z0-9_.-]+/g, "-").slice(0, 200);
  await getDb()
    .collection(ACK_COLLECTION).doc(searchId)
    .collection("parcels").doc(ackKey)
    .set(ackDoc);

  // RULE-17 evidence anchors as its OWN audit record — append-only chain
  // linking back to the batch receipt. Receipts are never mutated.
  let anchor;
  try {
    anchor = await auditTrail.writeAuditRecord({
      event_id: `PLAT-008-${timestamp.slice(0, 10).replace(/-/g, "")}-ack-${searchId}-${ackKey}`,
      worker_id: WORKER_ID,
      user_id: ctx.userId,
      org_id: ctx.tenantId,
      execution_type: "site-recon:visual-acknowledgment",
      timestamp,
      metadata: {
        searchId,
        apn,
        visualsViewed: ackDoc.visualsViewed,
        panoramaId: ackDoc.panoramaId,
        linkedBatchReceiptId: loaded.doc.receiptId || null,
        linkedBatchId: loaded.doc.batchId || null,
      },
    });
  } catch (anchorErr) {
    // The acknowledgment IS the RULE-17 compliance evidence — unanchored,
    // it proves nothing. Same posture as RULE-03: no receipt = no pass.
    console.error("[orphan_ack]", { searchId, apn, error: anchorErr.message });
    return res.status(503).json({
      ok: false,
      code: "AUDIT_ANCHOR_FAILED",
      phase: "anchor",
      message: "Acknowledgment recorded but audit anchor failed. Retry to complete the visual-acknowledgment gate.",
    });
  }

  return res.json({
    ok: true,
    acknowledgmentId: `${searchId}/${ackKey}`,
    receiptId: anchor.receiptId || null,
    timestamp,
  });
}

module.exports = { generateMapLayer, getStreetView, recordVisualAcknowledgment, loadSearch };
