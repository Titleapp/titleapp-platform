"use strict";

/**
 * SITE-RECON-001 — chat intent bridge for /creators/journey (canvas wiring)
 *
 * Detects "Run Site Recon on <address> [with a N-mile radius]" in the
 * authoring chat, runs the two-phase cost gate CONVERSATIONALLY (RULE-01:
 * quote first, execute only on an explicit "confirm"), and returns a chat
 * reply plus a `canvas` payload the frontend renders into the three Site
 * Recon tabs.
 *
 * Reuses the production handlers in-process — same billing, same receipts,
 * same Vault writes. Address→coords resolution via ATTOM's own snapshot
 * (it geocodes internally) — the configured Google key is referrer-
 * restricted (browser-only) and is rejected by server-side Geocoding.
 */

const { searchByAddress } = require("./searchByAddress");
const { searchByArea } = require("./searchByArea");
const { attomGet } = require("./attomClient");
const billing = require("../../services/billing/dataFee");

const RUN_RE = /\b(?:run\s+)?site[\s-]*recon\b/i;
const ADDRESS_RE = /\b(?:on|for|at)\s+(.+?)(?:\s+with\b|\s+using\b|\s*$)/i;
const RADIUS_RE = /([\d.]+)\s*[- ]?\s*mile/i;
const CONFIRM_RE = /^(yes|y|yep|confirm|confirmed|run it|go|go ahead|proceed|do it)\b/i;
const CANCEL_RE = /^(no|nope|cancel|stop|never\s?mind|abort)\b/i;

function fakeRes() {
  const r = { statusCode: 200, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}
const jsonErrorShim = (res, status, error, extra = {}) => res.status(status).json({ ok: false, error, ...extra });

async function resolveCenter(address, ctx) {
  const apiKey = process.env.ATTOM_API_KEY || "";
  if (!apiKey) return { error: "ATTOM API key not configured." };
  const idx = address.indexOf(",");
  if (idx < 1) return { error: `Include the city/state: "30 Pihaa St, Lahaina, HI 96761".` };
  const resp = await attomGet("/property/snapshot", {
    address1: address.slice(0, idx).trim(),
    address2: address.slice(idx + 1).trim(),
    radius: 0.1,
    pagesize: 1,
  }, apiKey);
  // Thin resolution query is still an external call — billed (silent tier).
  await billing.recordDataFee({
    source: "attom:snapshot",
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    units: 1,
    requestedBy: "site-recon-001:chat-resolve",
    metadata: { address },
  });
  const hit = resp?.data?.property?.[0];
  const lat = Number(hit?.location?.latitude);
  const lng = Number(hit?.location?.longitude);
  if (!resp.ok || !hit || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: `Could not locate "${address}" in property records — check the address.` };
  }
  return { lat, lng, formatted: hit?.address?.oneLine || address };
}

function slimParcels(rankedParcels) {
  return (rankedParcels || []).map((r) => ({
    rank: r.rank,
    apn: r.parcel?.apn ?? null,
    attomId: r.parcel?.attomId ?? null,
    address1: r.parcel?.address1 ?? null,
    address2: r.parcel?.address2 ?? null,
    lat: r.parcel?.lat ?? null,
    lng: r.parcel?.lng ?? null,
    verdict: r.feasibility?.verdict ?? null,
    namedBlocker: r.feasibility?.namedBlocker ?? null,
    blockerCode: r.feasibility?.blockerCode ?? null,
    confidenceScore: r.feasibility?.confidenceScore ?? null,
    flags: r.feasibility?.flags ?? [],
    overlays: r.overlays
      ? {
          floodZone: r.overlays.floodZone,
          coastalCommission: r.overlays.coastalCommission,
          historicDistrict: r.overlays.historicDistrict,
          opportunityZone: r.overlays.opportunityZone,
          evaluated: r.overlays.evaluated,
        }
      : null,
  }));
}

function verdictCounts(parcels) {
  return parcels.reduce(
    (a, p) => { const k = (p.verdict || "").toLowerCase(); if (a[k] !== undefined) a[k]++; return a; },
    { green: 0, yellow: 0, red: 0 }
  );
}

/**
 * Main entry. Returns { handled: false } when the message isn't Site Recon
 * traffic; otherwise { handled: true, text, canvas? }. Mutates
 * sessionState.pendingSiteRecon for the quote→confirm round-trip.
 */
async function handleSiteReconChat({ userInput, sessionState, ctx }) {
  const input = String(userInput || "").trim();
  const pending = sessionState.pendingSiteRecon || null;

  // ── Confirm / cancel a pending quote ─────────────────────────────
  if (pending && CANCEL_RE.test(input)) {
    delete sessionState.pendingSiteRecon;
    return { handled: true, text: "Cancelled — no pull executed, nothing charged. Ask me to run Site Recon again anytime." };
  }
  if (pending && CONFIRM_RE.test(input)) {
    return await executePending(pending, sessionState, ctx);
  }

  // ── New run request ──────────────────────────────────────────────
  if (!RUN_RE.test(input)) return { handled: false };

  const addrMatch = input.match(ADDRESS_RE);
  if (!addrMatch) {
    return { handled: true, text: 'Tell me the parcel like this: "Run Site Recon on 9708 US Highway 191, Pinedale, WY 82941" — add "with a 1-mile radius" for an area search.' };
  }
  const address = addrMatch[1].replace(/[.?!]+$/, "").trim();
  const radiusMatch = input.match(RADIUS_RE);
  const radiusMiles = radiusMatch ? Math.min(5, Number(radiusMatch[1])) : null;

  if (radiusMiles) {
    // Area search: resolve center via ATTOM → Phase 1 quote
    const geo = await resolveCenter(address, ctx);
    if (geo.error) return { handled: true, text: geo.error };
    const res = fakeRes();
    await searchByArea({}, res, {
      body: { area: { type: "radius", center: { lat: geo.lat, lng: geo.lng }, radiusMiles }, confirmCost: false },
      ctx, jsonError: jsonErrorShim,
    });
    if (res.statusCode !== 200) {
      return { handled: true, text: `Site Recon refused the search: ${res.body?.error || res.body?.message || res.body?.code}` };
    }
    if ((res.body.parcelsToReturn ?? 0) === 0) {
      return { handled: true, text: `No parcels found within ${radiusMiles} mi of ${geo.formatted}. Try a larger radius.` };
    }
    sessionState.pendingSiteRecon = {
      mode: "area",
      address: geo.formatted,
      area: { type: "radius", center: { lat: geo.lat, lng: geo.lng }, radiusMiles },
      quotedTotalFeeUsd: res.body.estimatedCost.totalFeeUsd,
    };
    return {
      handled: true,
      text: `Site Recon found ${res.body.parcelCount} parcels within ${radiusMiles} mi of ${geo.formatted}. ${res.body.breakdown}. Say "confirm" to run it, or "cancel".`,
    };
  }

  // Single-address: Phase 1 quote
  const res = fakeRes();
  await searchByAddress({}, res, { body: { address, confirmCost: false }, ctx, jsonError: jsonErrorShim });
  if (res.statusCode !== 200) {
    return { handled: true, text: `Site Recon refused the search: ${res.body?.error || res.body?.message || res.body?.code}` };
  }
  sessionState.pendingSiteRecon = { mode: "address", address };
  return {
    handled: true,
    text: `Single-parcel pull for ${address}: $${res.body.estimatedCost.totalFeeUsd.toFixed(2)} (ATTOM data + audit anchor). Say "confirm" to run it, or "cancel".`,
  };
}

async function executePending(pending, sessionState, ctx) {
  const res = fakeRes();
  if (pending.mode === "area") {
    await searchByArea({}, res, {
      body: { area: pending.area, confirmCost: true, quotedTotalFeeUsd: pending.quotedTotalFeeUsd },
      ctx, jsonError: jsonErrorShim,
    });
  } else {
    await searchByAddress({}, res, { body: { address: pending.address, confirmCost: true }, ctx, jsonError: jsonErrorShim });
  }

  // 409 COST_MISMATCH → refresh the quote, keep pending, re-ask.
  if (res.statusCode === 409 && res.body?.code === "COST_MISMATCH") {
    pending.quotedTotalFeeUsd = res.body.newProjection?.totalFeeUsd ?? pending.quotedTotalFeeUsd;
    sessionState.pendingSiteRecon = pending;
    return { handled: true, text: `${res.body.message} Say "confirm" to proceed at the new price, or "cancel".` };
  }
  delete sessionState.pendingSiteRecon;

  if (res.statusCode !== 200) {
    return { handled: true, text: `Site Recon could not complete the pull: ${res.body?.message || res.body?.error || res.body?.code}. ${res.body?.code === "AUDIT_ANCHOR_FAILED" ? "The fee will be reconciled — quote this to support." : ""}` };
  }

  const b = res.body;
  const parcels = pending.mode === "area"
    ? slimParcels(b.rankedParcels)
    : slimParcels([{ rank: 1, parcel: { apn: b.parcel?.propertyDetail?.data?.property?.[0]?.identifier?.apn, attomId: b.parcel?.propertyDetail?.data?.property?.[0]?.identifier?.attomId, address1: b.address?.address1, address2: b.address?.address2, lat: Number(b.parcel?.propertyDetail?.data?.property?.[0]?.location?.latitude ?? NaN) || null, lng: Number(b.parcel?.propertyDetail?.data?.property?.[0]?.location?.longitude ?? NaN) || null }, feasibility: b.feasibility, overlays: b.overlays }]);

  const counts = verdictCounts(parcels);
  const canvas = {
    type: "site-recon-results",
    searchId: b.searchId || null,
    handoffToken: b.handoffToken || null,
    handoffExpiresAt: b.handoffExpiresAt || null,
    searchArea: b.searchArea || { type: "address", address: pending.address },
    parcels,
    counts,
    billing: pending.mode === "area"
      ? { totalFeeUsd: b.billing?.totalFeeUsd ?? null }
      : { totalFeeUsd: b.fee?.chargedUsd ?? null },
    anchoredAt: (b.batchAuditAnchor || b.auditAnchor)?.anchoredAt || null,
    receiptId: (b.batchAuditAnchor || b.auditAnchor)?.receiptId || null,
    vaultStatus: b.vaultStatus || null,
  };

  const top = parcels.slice(0, 3).map((p) => `#${p.rank} ${p.address1 || p.apn} — ${p.verdict}${p.namedBlocker ? ` (${p.namedBlocker})` : ""}`).join("; ");
  const text = `Done — ${parcels.length} parcel${parcels.length === 1 ? "" : "s"}: ${counts.green} GREEN, ${counts.yellow} YELLOW, ${counts.red} RED. ${top}. Fee $${(canvas.billing.totalFeeUsd ?? 0).toFixed(2)}, receipt anchored. Results are on your canvas — ranked list, map, and Street View tabs.`;

  return { handled: true, text, canvas };
}

module.exports = { handleSiteReconChat };
