"use strict";

/**
 * services/cre/costar.js — CoStar API connector (bring-your-own credentials)
 *
 * CoStar is an enterprise CRE data platform. API access requires a CoStar
 * subscription + API enablement (separate from web access — contact CoStar
 * account rep to enable API access for an existing subscription).
 *
 * Credentials stored per-tenant in Firestore:
 *   tenants/{tenantId}/connectedAccounts/costar
 *   { apiKey: string, username: string, password: string, enabled: bool }
 *
 * Auth: CoStar uses Basic auth (username:password) or API key depending on tier.
 * Base URL: https://api.costar.com (enterprise) or https://gateway.costar.com
 */

const COSTAR_BASE = "https://api.costar.com";

async function getCredentials(db, tenantId) {
  const doc = await db.collection("tenants").doc(tenantId)
    .collection("connectedAccounts").doc("costar").get();
  if (!doc.exists) return null;
  const creds = doc.data();
  if (!creds.enabled || (!creds.apiKey && !creds.username)) return null;
  return creds;
}

function authHeaders(creds) {
  if (creds.apiKey) return { "X-Api-Key": creds.apiKey };
  if (creds.username && creds.password) {
    const encoded = Buffer.from(`${creds.username}:${creds.password}`).toString("base64");
    return { Authorization: `Basic ${encoded}` };
  }
  return {};
}

/**
 * Search commercial properties by criteria.
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {object} opts.db  Firestore admin db
 * @param {string} [opts.market]        MSA/market name (e.g. "San Francisco, CA")
 * @param {string} [opts.propertyType]  Office | Retail | Industrial | Multifamily | Hotel | Land
 * @param {number} [opts.minSqFt]
 * @param {number} [opts.maxSqFt]
 * @param {number} [opts.minCapRate]    decimal (e.g. 0.05 = 5%)
 * @param {number} [opts.maxCapRate]
 * @param {number} [opts.limit]
 */
async function searchProperties({ db, tenantId, market, propertyType, minSqFt, maxSqFt, minCapRate, maxCapRate, limit = 25 }) {
  const creds = await getCredentials(db, tenantId);
  if (!creds) throw new Error("CoStar not connected. Ask your account rep to enable API access, then connect in Settings.");

  const params = new URLSearchParams({ limit });
  if (market) params.set("market", market);
  if (propertyType) params.set("propertyType", propertyType);
  if (minSqFt) params.set("minBuildingSize", minSqFt);
  if (maxSqFt) params.set("maxBuildingSize", maxSqFt);
  if (minCapRate) params.set("minCapRate", minCapRate);
  if (maxCapRate) params.set("maxCapRate", maxCapRate);

  const res = await fetch(`${COSTAR_BASE}/v1/property/search?${params}`, {
    headers: { ...authHeaders(creds), "Content-Type": "application/json", Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CoStar API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Fetch comparable sales (sold comps) for a market/submarket.
 */
async function getSaleComps({ db, tenantId, market, propertyType, minPrice, maxPrice, fromDate, limit = 25 }) {
  const creds = await getCredentials(db, tenantId);
  if (!creds) throw new Error("CoStar not connected.");

  const params = new URLSearchParams({ limit });
  if (market) params.set("market", market);
  if (propertyType) params.set("propertyType", propertyType);
  if (minPrice) params.set("minSalePrice", minPrice);
  if (maxPrice) params.set("maxSalePrice", maxPrice);
  if (fromDate) params.set("fromDate", fromDate);

  const res = await fetch(`${COSTAR_BASE}/v1/sale/search?${params}`, {
    headers: { ...authHeaders(creds), Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CoStar sale comps error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Fetch lease comps for a market.
 */
async function getLeaseComps({ db, tenantId, market, propertyType, minRent, maxRent, limit = 25 }) {
  const creds = await getCredentials(db, tenantId);
  if (!creds) throw new Error("CoStar not connected.");

  const params = new URLSearchParams({ limit });
  if (market) params.set("market", market);
  if (propertyType) params.set("propertyType", propertyType);
  if (minRent) params.set("minRent", minRent);
  if (maxRent) params.set("maxRent", maxRent);

  const res = await fetch(`${COSTAR_BASE}/v1/lease/search?${params}`, {
    headers: { ...authHeaders(creds), Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CoStar lease comps error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Get market analytics for a given MSA (vacancy, rent growth, absorption).
 */
async function getMarketAnalytics({ db, tenantId, market, propertyType, period = "quarterly" }) {
  const creds = await getCredentials(db, tenantId);
  if (!creds) throw new Error("CoStar not connected.");

  const params = new URLSearchParams({ period });
  if (market) params.set("market", market);
  if (propertyType) params.set("propertyType", propertyType);

  const res = await fetch(`${COSTAR_BASE}/v1/market/analytics?${params}`, {
    headers: { ...authHeaders(creds), Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CoStar analytics error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Save/update CoStar credentials for a tenant.
 */
async function saveCredentials({ db, tenantId, apiKey, username, password }) {
  const ref = db.collection("tenants").doc(tenantId)
    .collection("connectedAccounts").doc("costar");
  await ref.set({ apiKey: apiKey || null, username: username || null, password: password || null, enabled: true, updatedAt: new Date() }, { merge: true });
  return { ok: true };
}

async function disconnectCredentials({ db, tenantId }) {
  const ref = db.collection("tenants").doc(tenantId)
    .collection("connectedAccounts").doc("costar");
  await ref.set({ enabled: false, updatedAt: new Date() }, { merge: true });
  return { ok: true };
}

async function getConnectionStatus({ db, tenantId }) {
  const creds = await getCredentials(db, tenantId);
  return { connected: !!creds, hasApiKey: !!(creds?.apiKey), hasBasicAuth: !!(creds?.username) };
}

module.exports = { searchProperties, getSaleComps, getLeaseComps, getMarketAnalytics, saveCredentials, disconnectCredentials, getConnectionStatus };
