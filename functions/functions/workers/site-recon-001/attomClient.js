"use strict";

/**
 * SITE-RECON-001 — shared ATTOM client (Step 4 refactor)
 *
 * Extracted from searchByAddress.js so both the single-address and
 * area-search endpoints pull through one client. Defensive: every call
 * returns an envelope ({ endpoint, httpStatus, ok, data|error }) and never
 * throws — callers decide how to degrade.
 */

const ATTOM_BASE = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";

async function attomGet(path, params, apiKey) {
  const url = new URL(`${ATTOM_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const resp = await fetch(url.toString(), {
      headers: { apikey: apiKey, accept: "application/json" },
    });
    const json = await resp.json().catch(() => null);
    return { endpoint: path, httpStatus: resp.status, ok: resp.ok, data: json };
  } catch (e) {
    return { endpoint: path, httpStatus: null, ok: false, error: e.message };
  }
}

/**
 * Pull the full per-parcel bundle (detail + sales history + AVM).
 * @param {object} params — ATTOM query params: { attomid } or { address1, address2 }
 */
async function pullParcelBundle(params, apiKey) {
  const [propertyDetail, salesHistory, avm] = await Promise.all([
    attomGet("/property/detail", params, apiKey),
    attomGet("/saleshistory/detail", params, apiKey),
    attomGet("/attomavm/detail", params, apiKey),
  ]);
  return { propertyDetail, salesHistory, avm };
}

module.exports = { ATTOM_BASE, attomGet, pullParcelBundle };
