"use strict";

/**
 * services/cre/trepp.js — Trepp API connector (bring-your-own credentials)
 *
 * Trepp is the leading CMBS analytics platform. API access is available to
 * Trepp subscribers via the TreppWire API / Trepp Data Platform.
 * Contact Trepp account team to get API credentials for your subscription.
 *
 * Credentials stored per-tenant in Firestore:
 *   tenants/{tenantId}/connectedAccounts/trepp
 *   { apiKey: string, enabled: bool }
 *
 * Auth: API key in X-Api-Key header.
 * Base URL: https://api.trepp.com (verify exact URL with your Trepp rep)
 */

const TREPP_BASE = "https://api.trepp.com";

async function getCredentials(db, tenantId) {
  const doc = await db.collection("tenants").doc(tenantId)
    .collection("connectedAccounts").doc("trepp").get();
  if (!doc.exists) return null;
  const creds = doc.data();
  if (!creds.enabled || !creds.apiKey) return null;
  return creds;
}

function authHeaders(creds) {
  return { "X-Api-Key": creds.apiKey, "Content-Type": "application/json", Accept: "application/json" };
}

/**
 * Search CMBS loans by property/market criteria.
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {object} opts.db
 * @param {string} [opts.market]        MSA name
 * @param {string} [opts.propertyType]  Multifamily | Office | Retail | Industrial | Hotel | Mixed
 * @param {string} [opts.servicer]      Special servicer name
 * @param {string} [opts.status]        current | watchlist | delinquent | specially_serviced | REO
 * @param {number} [opts.minBalance]    Minimum outstanding loan balance
 * @param {number} [opts.maxBalance]
 * @param {string} [opts.maturityFrom]  YYYY-MM-DD — maturity date range start
 * @param {string} [opts.maturityTo]
 * @param {number} [opts.limit]
 */
async function searchLoans({ db, tenantId, market, propertyType, servicer, status, minBalance, maxBalance, maturityFrom, maturityTo, limit = 25 }) {
  const creds = await getCredentials(db, tenantId);
  if (!creds) throw new Error("Trepp not connected. Contact your Trepp account rep to get API credentials, then connect in Settings.");

  const params = new URLSearchParams({ limit });
  if (market) params.set("market", market);
  if (propertyType) params.set("propertyType", propertyType);
  if (servicer) params.set("servicer", servicer);
  if (status) params.set("status", status);
  if (minBalance) params.set("minOutstandingBalance", minBalance);
  if (maxBalance) params.set("maxOutstandingBalance", maxBalance);
  if (maturityFrom) params.set("maturityDateFrom", maturityFrom);
  if (maturityTo) params.set("maturityDateTo", maturityTo);

  const res = await fetch(`${TREPP_BASE}/v1/loans?${params}`, { headers: authHeaders(creds) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Trepp API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Get debt stack and CMBS detail for a specific property.
 * @param {object} opts
 * @param {string} opts.propertyId  Trepp property ID (from search results)
 */
async function getPropertyDebt({ db, tenantId, propertyId }) {
  const creds = await getCredentials(db, tenantId);
  if (!creds) throw new Error("Trepp not connected.");

  const res = await fetch(`${TREPP_BASE}/v1/properties/${propertyId}/debt`, { headers: authHeaders(creds) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Trepp property debt error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Get CMBS delinquency trends for a market/property type.
 */
async function getDelinquencyTrends({ db, tenantId, market, propertyType, period = "monthly" }) {
  const creds = await getCredentials(db, tenantId);
  if (!creds) throw new Error("Trepp not connected.");

  const params = new URLSearchParams({ period });
  if (market) params.set("market", market);
  if (propertyType) params.set("propertyType", propertyType);

  const res = await fetch(`${TREPP_BASE}/v1/delinquency?${params}`, { headers: authHeaders(creds) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Trepp delinquency error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Get loans maturing in a window — useful for finding motivated sellers
 * or refinancing opportunities.
 */
async function getMaturityWall({ db, tenantId, market, propertyType, fromDate, toDate, limit = 50 }) {
  const creds = await getCredentials(db, tenantId);
  if (!creds) throw new Error("Trepp not connected.");

  const params = new URLSearchParams({ limit });
  if (market) params.set("market", market);
  if (propertyType) params.set("propertyType", propertyType);
  if (fromDate) params.set("maturityDateFrom", fromDate);
  if (toDate) params.set("maturityDateTo", toDate);

  const res = await fetch(`${TREPP_BASE}/v1/maturity-wall?${params}`, { headers: authHeaders(creds) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Trepp maturity wall error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * List special servicers and their loan volume (for contacting workout desks).
 */
async function getServicers({ db, tenantId, market, propertyType }) {
  const creds = await getCredentials(db, tenantId);
  if (!creds) throw new Error("Trepp not connected.");

  const params = new URLSearchParams();
  if (market) params.set("market", market);
  if (propertyType) params.set("propertyType", propertyType);

  const res = await fetch(`${TREPP_BASE}/v1/servicers?${params}`, { headers: authHeaders(creds) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Trepp servicers error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function saveCredentials({ db, tenantId, apiKey }) {
  const ref = db.collection("tenants").doc(tenantId)
    .collection("connectedAccounts").doc("trepp");
  await ref.set({ apiKey, enabled: true, updatedAt: new Date() }, { merge: true });
  return { ok: true };
}

async function disconnectCredentials({ db, tenantId }) {
  const ref = db.collection("tenants").doc(tenantId)
    .collection("connectedAccounts").doc("trepp");
  await ref.set({ enabled: false, updatedAt: new Date() }, { merge: true });
  return { ok: true };
}

async function getConnectionStatus({ db, tenantId }) {
  const creds = await getCredentials(db, tenantId);
  return { connected: !!creds };
}

module.exports = { searchLoans, getPropertyDebt, getDelinquencyTrends, getMaturityWall, getServicers, saveCredentials, disconnectCredentials, getConnectionStatus };
