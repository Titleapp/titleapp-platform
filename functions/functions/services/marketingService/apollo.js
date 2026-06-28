"use strict";

/**
 * apollo.js — CODEX 50.15 P0-8
 *
 * Apollo.io lead-gen client. Used by:
 *   - Marketing worker (PLAT-003) for prospecting campaigns
 *   - Fundraise worker (BANK-FUND-001) for investor prospecting
 *
 * Authentication: header-based via `X-Api-Key` (Apollo deprecating URL-
 * parameter keys per Sean's notes). API key from Firebase secrets:
 * APOLLO_API_KEY.
 *
 * Endpoints used at v1:
 *   - POST /v1/mixed_people/search       — people search by ICP
 *   - POST /v1/people/match              — enrich a known person
 *   - POST /v1/organizations/search      — company search
 *   - POST /v1/organizations/enrich      — company enrichment
 *
 * Usage tracking: every call appends to `apolloUsage/{eventId}` with
 * tenantId, userId, endpoint, credits_consumed, requestedBy. The 75%-of-
 * monthly-budget alert is a separate scheduled job that reads this
 * collection (P1 work — not in this file).
 *
 * Output: enriched contacts get written to the `contacts` collection
 * with spine_v2 schema (CODEX 50.15 P0-1 done), tagged with
 * source.primary='apollo' and source.sub='<workerSlug>:<sessionId>'.
 */

const admin = require("firebase-admin");

const APOLLO_BASE = "https://api.apollo.io/v1";
const MONTHLY_BUDGET = 4020; // Sean's Pro tier cap

function getDb() { return admin.firestore(); }

function getApiKey() {
  const key = process.env.APOLLO_API_KEY;
  if (!key) {
    throw new Error("APOLLO_API_KEY missing from environment. Configure in Firebase secrets.");
  }
  return key;
}

async function call(endpoint, body, ctx = {}) {
  const apiKey = getApiKey();
  const url = `${APOLLO_BASE}${endpoint}`;
  const startedAt = Date.now();

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": apiKey,
      "Accept": "application/json",
    },
    body: JSON.stringify(body || {}),
  });

  const elapsedMs = Date.now() - startedAt;
  const rawText = await r.text();
  let json = null;
  try { json = JSON.parse(rawText); } catch (_) {}

  // Best-effort credit accounting — Apollo's response shape varies, but
  // the `credits_used` or `credits_consumed` field shows up on most
  // billable endpoints. If we can't read it, conservatively log 1 credit
  // per call (under-estimates batch operations; over-estimates free reads).
  let creditsConsumed = 1;
  if (json && typeof json.credits_consumed === "number") creditsConsumed = json.credits_consumed;
  else if (json && typeof json.credits_used === "number") creditsConsumed = json.credits_used;
  else if (Array.isArray(json?.people)) creditsConsumed = Math.max(1, json.people.length);
  else if (Array.isArray(json?.organizations)) creditsConsumed = Math.max(1, json.organizations.length);

  await logUsage({
    endpoint,
    creditsConsumed,
    httpStatus: r.status,
    elapsedMs,
    ok: r.ok,
    errorMsg: !r.ok ? (json?.error || rawText.slice(0, 200)) : null,
    ...ctx,
  });

  if (!r.ok) {
    const msg = json?.error || rawText.slice(0, 300) || `HTTP ${r.status}`;
    throw new Error(`Apollo ${endpoint} failed: ${msg}`);
  }
  return json;
}

async function logUsage(event) {
  try {
    await getDb().collection("apolloUsage").add({
      ...event,
      tenantId: event.tenantId || null,
      userId: event.userId || null,
      requestedBy: event.requestedBy || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.warn("[apollo] usage log failed (non-fatal):", e.message);
  }
}

/**
 * People search by ICP criteria. Returns up to `per_page` matches.
 *
 * Common ICP filters:
 *   - person_titles: ["CEO", "Founder", "VP of ..."]
 *   - person_seniorities: ["c_suite", "vp", "director", "manager", "senior", "entry"]
 *   - q_organization_industries: ["software", "real estate", ...]
 *   - person_locations: ["Hawaii, US", "California, US", ...]
 *   - organization_num_employees_ranges: ["1,10", "11,50", "51,200", ...]
 *
 * @param {object} criteria      — Apollo people-search payload (see docs)
 * @param {object} ctx           — { tenantId, userId, requestedBy } for usage tracking
 * @returns {Promise<{ people: [], pagination: {} }>}
 */
async function searchPeople(criteria, ctx = {}) {
  const raw = { per_page: 25, ...criteria };
  // Apollo caps per_page at 100 on all tiers — clamp to avoid API error
  if (raw.per_page > 100) raw.per_page = 100;
  const body = raw;
  const json = await call("/mixed_people/api_search", body, { ...ctx, op: "searchPeople" });
  return {
    people: json.people || [],
    pagination: json.pagination || null,
  };
}

/**
 * Enrich a single person by email or name+org. Returns matched person
 * with phone, social profiles, employment history, etc.
 *
 * @param {object} input   — { email?, first_name?, last_name?, organization_name?, domain? }
 * @param {object} ctx
 */
async function enrichPerson(input, ctx = {}) {
  if (!input.email && !(input.first_name && input.last_name)) {
    throw new Error("enrichPerson: requires email OR first_name+last_name");
  }
  const json = await call("/people/match", input, { ...ctx, op: "enrichPerson" });
  return json.person || null;
}

/**
 * Organization search. Useful for ICP discovery + Fundraise (find VC
 * firms by stage / sector).
 */
async function searchOrganizations(criteria, ctx = {}) {
  const body = { per_page: 25, ...criteria };
  const json = await call("/organizations/search", body, { ...ctx, op: "searchOrganizations" });
  return {
    organizations: json.organizations || [],
    pagination: json.pagination || null,
  };
}

/**
 * Convert an Apollo person record to a SOCIII contacts/{id} document
 * payload. As of CODEX 50.18, output is spine_v2.1 with personas[] populated
 * with a single "prospect" persona. Top-level singular fields mirror the
 * primary persona for read back-compat.
 *
 * @param {object} apolloPerson  — record from searchPeople/enrichPerson
 * @param {object} provenance    — { tenantId, source_sub, contact_tier?, lifecycle_stage?, owner? }
 */
function apolloPersonToContact(apolloPerson, provenance) {
  const p = apolloPerson || {};
  const tier = provenance.contact_tier || "prospect";
  const lifecycle = provenance.lifecycle_stage || "cold";
  const owner = provenance.owner || null;

  const persona = {
    id: "p_001",
    role_label: "prospect",
    type: "customer",
    tier,
    lifecycle_stage: lifecycle,
    lead_score: 0,
    tags: [],
    notes: null,
    owner,
    project_bindings: provenance.source_sub ? [provenance.source_sub] : [],
    created_at: new Date().toISOString(),
    last_interaction_at: null,
  };

  return {
    tenantId: provenance.tenantId,
    schema_version: "spine_v2.1",
    name: [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.name || "(unknown)",
    // Multi-persona (CODEX 50.18)
    personas: [persona],
    primary_persona_id: persona.id,
    tiers_index: [persona.tier],
    types_index: [persona.type],
    // Back-compat top-level mirrors
    type: persona.type,
    contact_tier: persona.tier,
    lifecycle_stage: persona.lifecycle_stage,
    lead_score: persona.lead_score,
    // Shared
    email: p.email || null,
    phone: p.phone_numbers?.[0]?.sanitized_number || p.phone_numbers?.[0]?.raw_number || null,
    workspaces: [provenance.tenantId],
    source: {
      primary: "apollo",
      sub: provenance.source_sub || null,
      apollo_person_id: p.id || null,
      captured_at: new Date().toISOString(),
    },
    enrichment: {
      company: p.organization?.name || p.account?.name || null,
      company_size: p.organization?.estimated_num_employees ? bucketEmployees(p.organization.estimated_num_employees) : null,
      industry: p.organization?.industry || null,
      role: p.title || null,
      seniority: p.seniority || null,
      social: {
        linkedin: p.linkedin_url || null,
        twitter: p.twitter_url || null,
      },
      source: "apollo",
      enriched_at: new Date().toISOString(),
    },
    segments: [],
    notes: null,
    identity_id: null,
  };
}

function bucketEmployees(n) {
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  if (n <= 200) return "51-200";
  if (n <= 1000) return "201-1000";
  if (n <= 5000) return "1001-5000";
  return "5000+";
}

/**
 * Pull current month's burn rate. Returns:
 *   { used, budget, percent, exceededAlert }
 */
async function getMonthlyBurnRate() {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const snap = await getDb().collection("apolloUsage")
    .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startOfMonth))
    .get();

  let used = 0;
  for (const d of snap.docs) {
    used += (d.data().creditsConsumed || 0);
  }
  const percent = (used / MONTHLY_BUDGET) * 100;
  return {
    used,
    budget: MONTHLY_BUDGET,
    percent: Math.round(percent * 10) / 10,
    exceededSoftAlert: percent >= 75,
    exceededHardAlert: percent >= 95,
  };
}

module.exports = {
  searchPeople,
  enrichPerson,
  searchOrganizations,
  apolloPersonToContact,
  getMonthlyBurnRate,
  MONTHLY_BUDGET,
};
