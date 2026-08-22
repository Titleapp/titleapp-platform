"use strict";

/**
 * services/contacts/contactsService.js
 *
 * Extracted from the inline body of POST /v1/contacts:add (index.js) so the
 * same contact-creation logic can be reused by CODEX S52.61's /v1/clients:add
 * without duplicating the persona/segment-defaulting logic. /contacts:add
 * itself was refactored to call buildContactDoc() below — behavior unchanged,
 * same doc shape, same defaults.
 */

const admin = require("firebase-admin");

const INTENT_MAP = {
  sales_lead:  { type: "customer", tier: "prospect",      segments: ["sales-leads"] },
  investor:    { type: "investor", tier: "investor",      segments: ["investor-pipeline"] },
  accredited_investor: { type: "investor", tier: "investor", segments: ["investor-pipeline", "accredited-candidates"] },
  media:       { type: "journalist", tier: "professional", segments: ["media-list"] },
  creator:     { type: "creator", tier: "professional",    segments: ["creator-candidates"] },
  vendor:      { type: "vendor", tier: "vendor",           segments: ["vendors"] },
  partner:     { type: "partner", tier: "partner",         segments: ["partners"] },
  advisor:     { type: "advisor", tier: "partner",         segments: ["advisors"] },
  regulator:   { type: "regulator", tier: "professional",  segments: ["regulators"] },
  professional_services: { type: "professional_services", tier: "vendor", segments: ["professional-services"] },
  employee:    { type: "employee", tier: "professional",   segments: ["team"] },
  manual:      { type: "customer", tier: "professional",   segments: [] },
  // CODEX S52.61 — client-onboarding intent, distinct defaults so a client
  // added via /v1/clients:add lands in its own segment rather than being
  // indistinguishable from a generic sales lead.
  client_onboarding: { type: "customer", tier: "customer", segments: ["client-onboarding"] },
};

/**
 * Build a contacts/{id} document body (does NOT write it) from the same
 * intent/persona-defaulting rules /contacts:add has always used.
 *
 * @param {object} params
 * @param {string} params.tenantId
 * @param {string} params.userId — ctx.userId of whoever is creating this
 * @param {object} params.b — raw body fields (name|first_name/last_name, email,
 *   phone, company, title, persona_type, persona_tier, segments, tags, notes,
 *   source, linkedin_url, intent)
 * @returns {object} the doc to pass to db.collection("contacts").add(doc)
 */
function buildContactDoc({ tenantId, userId, b }) {
  const {
    synthesizePersonaFromSingular, derivePersonaIndex, derivePrimaryMirrors,
    VALID_TYPES, VALID_TIERS,
  } = require("../../api/routes/_contactsHelpers");

  const fullName = b.name || [b.first_name, b.last_name].filter(Boolean).join(" ").trim();
  if (!fullName) throw new Error("name or first_name+last_name required");

  const intent = (b.intent || "manual").toLowerCase();
  const dflt = INTENT_MAP[intent] || INTENT_MAP.manual;
  const personaType = VALID_TYPES.includes(b.persona_type) ? b.persona_type : dflt.type;
  const personaTier = VALID_TIERS.includes(b.persona_tier) ? b.persona_tier : dflt.tier;
  const segments = Array.isArray(b.segments) && b.segments.length
    ? Array.from(new Set([...b.segments, ...dflt.segments]))
    : dflt.segments;

  const persona = synthesizePersonaFromSingular({
    type: personaType,
    tier: personaTier,
    lifecycle_stage: "cold",
    lead_score: 0,
    role_label: b.title || personaType,
    tags: Array.isArray(b.tags) ? b.tags : [],
    notes: b.notes || null,
    owner: userId,
  });

  return {
    tenantId,
    schema_version: "spine_v2.1",
    name: fullName,
    first_name: b.first_name || null,
    last_name: b.last_name || null,
    email: b.email ? b.email.toLowerCase() : null,
    phone: b.phone || null,
    company: b.company || null,
    title: b.title || null,
    source: b.source || `manual-add-${intent}`,
    enrichment: b.linkedin_url ? { linkedin_url: b.linkedin_url } : null,
    segments,
    primary_persona_id: persona.id,
    personas: [persona],
    tiers_index: derivePersonaIndex([persona]),
    types_index: [persona.type],
    ...derivePrimaryMirrors([persona]),
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    created_by: userId,
    source_member_uid: userId,
    imported_at: admin.firestore.FieldValue.serverTimestamp(),
    enrichment_history: [],
  };
}

/**
 * Look up an existing contacts/{id} doc by tenantId+email or tenantId+phone,
 * as a transaction read (Firestore requires all txn reads before any txn
 * writes) — used by /v1/clients:add's idempotent create-or-reuse.
 *
 * @param {object} params
 * @param {FirebaseFirestore.Transaction} params.txn
 * @param {FirebaseFirestore.Firestore} params.db
 * @param {string} params.tenantId
 * @param {string} [params.email]
 * @param {string} [params.phone]
 * @returns {Promise<FirebaseFirestore.DocumentSnapshot|null>}
 */
async function findExistingContactInTxn({ txn, db, tenantId, email, phone }) {
  if (email) {
    const normalizedEmail = String(email).toLowerCase().trim();
    const q = db.collection("contacts").where("tenantId", "==", tenantId).where("email", "==", normalizedEmail).limit(1);
    const snap = await txn.get(q);
    if (!snap.empty) return snap.docs[0];
  }
  if (phone) {
    const q = db.collection("contacts").where("tenantId", "==", tenantId).where("phone", "==", phone).limit(1);
    const snap = await txn.get(q);
    if (!snap.empty) return snap.docs[0];
  }
  return null;
}

module.exports = { buildContactDoc, findExistingContactInTxn, INTENT_MAP };
