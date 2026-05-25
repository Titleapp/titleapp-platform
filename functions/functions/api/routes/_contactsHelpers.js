"use strict";

/**
 * _contactsHelpers.js — canonical helpers for the spine_v2.1 multi-persona
 * schema. Used by api/routes/contacts.js, api/routes/segments.js, and
 * scripts/migrateContactsToSpineV2_1.js so all paths share one source of
 * truth for persona logic.
 *
 * See: docs/CODEX-50.18-Contacts-Spine-v2.1-Multi-Persona.md
 */

const SCHEMA_VERSION_V2 = "spine_v2";
const SCHEMA_VERSION_V2_1 = "spine_v2.1";

// Persona TYPE — what kind of relationship this contact represents. A single
// contact can carry multiple personas (e.g. a person who is both an investor
// candidate AND a B2B prospect). Compliance-bearing types (investor) require
// the persona.compliance block to be populated before any active-offering
// segment can be applied.
const VALID_TYPES = [
  // Original v2.1 types
  "customer", "vendor", "investor", "tenant", "employee", "patient", "student", "contractor", "personal",
  // S50.21 startup-ecosystem additions
  "creator",              // Digital Worker authors on the SOCIII platform
  "advisor",              // formal advisors, cap-table observers
  "partner",              // integration partners, channel partners
  "journalist",           // press contacts, editors, reporters
  "regulator",            // SEC, state regulators, OFAC liaison contacts
  "professional_services",// law firms, accounting firms, consultancies retained by SOCIII
];

const VALID_TIERS = ["personal", "professional", "confidential", "investor", "customer", "prospect", "partner", "vendor"];
const VALID_LIFECYCLE = ["cold", "warm", "engaged", "converted", "churned", "lost"];

// Investor-persona compliance gates. Required when an investor contact is
// promoted to an active offering segment. Mirrored at the top level for
// quick filter queries.
const VALID_ACCREDITATION_STATUS = ["none", "self_certified", "verified", "expired", "exempt"];
const VALID_ACCREDITATION_METHOD = ["income", "net_worth", "professional_cert", "entity_status"];
const VALID_OFAC_STATUS = ["not_screened", "clear", "match", "review"];
const VALID_KYC_STATUS = ["none", "pending", "verified", "failed"];

function defaultTierFromType(type) {
  if (type === "investor") return "investor";
  if (type === "customer") return "customer";
  if (type === "vendor" || type === "professional_services") return "vendor";
  if (type === "tenant" || type === "patient" || type === "student") return "customer";
  if (type === "personal") return "personal";
  if (type === "partner" || type === "advisor") return "partner";
  return "professional";
}

function nowIso() { return new Date().toISOString(); }

function nextPersonaId(existingPersonas = []) {
  // Stable sequential IDs: p_001, p_002, ... — gaps are fine if a persona is
  // ever removed, since we never reuse IDs (engagement events may reference
  // a removed persona by id).
  const used = new Set((existingPersonas || []).map(p => p?.id).filter(Boolean));
  for (let i = 1; i <= 9999; i++) {
    const id = `p_${String(i).padStart(3, "0")}`;
    if (!used.has(id)) return id;
  }
  // Fall back to timestamp-based ID if a contact somehow has 9999 personas.
  return `p_${Date.now()}`;
}

/**
 * Build a single persona object from singular legacy fields. Used when a
 * client posts a contact with the old v1/v2 shape (no personas array). We
 * synthesize the equivalent personas[0] so v2.1 readers always see a uniform
 * shape.
 */
function synthesizePersonaFromSingular({ type, tier, lifecycle_stage, lead_score, owner, role_label, tags, notes, project_bindings, id, last_interaction_at } = {}) {
  const resolvedType = VALID_TYPES.includes(type) ? type : "customer";
  const resolvedTier = VALID_TIERS.includes(tier) ? tier : defaultTierFromType(resolvedType);
  const resolvedLifecycle = VALID_LIFECYCLE.includes(lifecycle_stage) ? lifecycle_stage : "cold";
  return {
    id: id || "p_001",
    role_label: role_label || resolvedType,
    type: resolvedType,
    tier: resolvedTier,
    lifecycle_stage: resolvedLifecycle,
    lead_score: typeof lead_score === "number" ? lead_score : 0,
    tags: Array.isArray(tags) ? tags : [],
    notes: typeof notes === "string" ? notes : null,
    owner: owner || null,
    project_bindings: Array.isArray(project_bindings) ? project_bindings : [],
    created_at: nowIso(),
    last_interaction_at: last_interaction_at || null,
  };
}

/**
 * Validate a single persona payload. Returns { ok: bool, reason?: string }.
 * Lifts unknown fields silently (forward-compat); rejects invalid enum
 * values.
 */
function validatePersona(persona, { allowMissingId = false } = {}) {
  if (!persona || typeof persona !== "object") return { ok: false, reason: "persona must be an object" };
  if (!allowMissingId && !persona.id) return { ok: false, reason: "persona.id required" };
  if (persona.type !== undefined && !VALID_TYPES.includes(persona.type)) {
    return { ok: false, reason: `persona.type must be one of: ${VALID_TYPES.join(", ")}` };
  }
  if (persona.tier !== undefined && !VALID_TIERS.includes(persona.tier)) {
    return { ok: false, reason: `persona.tier must be one of: ${VALID_TIERS.join(", ")}` };
  }
  if (persona.lifecycle_stage !== undefined && !VALID_LIFECYCLE.includes(persona.lifecycle_stage)) {
    return { ok: false, reason: `persona.lifecycle_stage must be one of: ${VALID_LIFECYCLE.join(", ")}` };
  }
  if (persona.lead_score !== undefined && (typeof persona.lead_score !== "number" || persona.lead_score < 0 || persona.lead_score > 100)) {
    return { ok: false, reason: "persona.lead_score must be a number 0-100" };
  }
  if (persona.tags !== undefined && !Array.isArray(persona.tags)) return { ok: false, reason: "persona.tags must be an array" };
  if (persona.project_bindings !== undefined && !Array.isArray(persona.project_bindings)) return { ok: false, reason: "persona.project_bindings must be an array" };
  return { ok: true };
}

/**
 * Normalize a personas array on POST: ensure every persona has an id, fill
 * sane defaults, validate each. Returns either { ok: true, personas } or
 * { ok: false, reason }.
 */
function normalizePersonasForCreate(personasInput = [], fallbackOwner = null) {
  if (!Array.isArray(personasInput) || personasInput.length === 0) {
    return { ok: false, reason: "personas array must be non-empty" };
  }
  const normalized = [];
  const seenIds = new Set();
  for (const raw of personasInput) {
    const v = validatePersona(raw, { allowMissingId: true });
    if (!v.ok) return v;
    const id = raw.id || nextPersonaId(normalized);
    if (seenIds.has(id)) return { ok: false, reason: `duplicate persona id: ${id}` };
    seenIds.add(id);
    normalized.push({
      id,
      role_label: raw.role_label || raw.type || "contact",
      type: raw.type || "customer",
      tier: raw.tier || defaultTierFromType(raw.type || "customer"),
      lifecycle_stage: raw.lifecycle_stage || "cold",
      lead_score: typeof raw.lead_score === "number" ? raw.lead_score : 0,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      notes: typeof raw.notes === "string" ? raw.notes : null,
      owner: raw.owner || fallbackOwner,
      project_bindings: Array.isArray(raw.project_bindings) ? raw.project_bindings : [],
      created_at: nowIso(),
      last_interaction_at: raw.last_interaction_at || null,
    });
  }
  return { ok: true, personas: normalized };
}

/**
 * Apply patches in `patchArray` to `existingPersonas`. A patch is matched by
 * persona.id. Patches with an unknown id are added as new personas. Patches
 * cannot remove personas (use a separate explicit endpoint for delete).
 */
function mergePersonaPatch(existingPersonas, patchArray, fallbackOwner = null) {
  const existing = Array.isArray(existingPersonas) ? existingPersonas.slice() : [];
  if (!Array.isArray(patchArray)) return { ok: false, reason: "personas patch must be an array" };

  for (const patch of patchArray) {
    const v = validatePersona(patch, { allowMissingId: true });
    if (!v.ok) return v;
    if (patch.id && existing.find(p => p.id === patch.id)) {
      // Update in place
      const idx = existing.findIndex(p => p.id === patch.id);
      existing[idx] = { ...existing[idx], ...patch };
    } else {
      // Append as new persona
      const newId = patch.id || nextPersonaId(existing);
      existing.push({
        id: newId,
        role_label: patch.role_label || patch.type || "contact",
        type: patch.type || "customer",
        tier: patch.tier || defaultTierFromType(patch.type || "customer"),
        lifecycle_stage: patch.lifecycle_stage || "cold",
        lead_score: typeof patch.lead_score === "number" ? patch.lead_score : 0,
        tags: Array.isArray(patch.tags) ? patch.tags : [],
        notes: typeof patch.notes === "string" ? patch.notes : null,
        owner: patch.owner || fallbackOwner,
        project_bindings: Array.isArray(patch.project_bindings) ? patch.project_bindings : [],
        created_at: nowIso(),
        last_interaction_at: patch.last_interaction_at || null,
      });
    }
  }
  return { ok: true, personas: existing };
}

/**
 * Recompute top-level mirror fields from the primary persona. Use after any
 * personas[] change so old singular reads stay correct.
 */
function derivePrimaryMirrors(personas, primaryPersonaId) {
  const list = Array.isArray(personas) ? personas : [];
  const primary = list.find(p => p?.id === primaryPersonaId) || list[0] || null;
  if (!primary) {
    return { type: "customer", contact_tier: "professional", lifecycle_stage: "cold", lead_score: 0 };
  }
  return {
    type: primary.type || "customer",
    contact_tier: primary.tier || "professional",
    lifecycle_stage: primary.lifecycle_stage || "cold",
    lead_score: typeof primary.lead_score === "number" ? primary.lead_score : 0,
  };
}

/**
 * Build the flat `tiers_index` array from personas. Deduped. Used for
 * Firestore array-contains-any cross-persona queries.
 */
function derivePersonaIndex(personas) {
  const list = Array.isArray(personas) ? personas : [];
  const seen = new Set();
  for (const p of list) {
    if (p?.tier && !seen.has(p.tier)) seen.add(p.tier);
  }
  return Array.from(seen);
}

/**
 * Apollo (and other deduped enrichment) calls this when a contact already
 * exists and we want to ADD a persona instead of skipping. Returns the
 * patched personas[] and primary_persona_id (unchanged).
 */
function addPersonaToExisting(existingPersonas, newPersona) {
  const list = Array.isArray(existingPersonas) ? existingPersonas.slice() : [];
  const id = newPersona.id || nextPersonaId(list);
  // Skip if a persona of the same role_label + type + owner already exists —
  // prevents duplicate prospect personas every time Apollo runs.
  const dup = list.find(p =>
    p.role_label === newPersona.role_label &&
    p.type === newPersona.type &&
    (p.owner || null) === (newPersona.owner || null)
  );
  if (dup) {
    // Refresh last_interaction_at on the existing persona instead.
    const idx = list.findIndex(p => p.id === dup.id);
    list[idx] = { ...dup, last_interaction_at: nowIso() };
    return { personas: list, addedPersonaId: dup.id, action: "refreshed" };
  }
  list.push({ ...newPersona, id, created_at: newPersona.created_at || nowIso() });
  return { personas: list, addedPersonaId: id, action: "added" };
}

/**
 * Backfill helper for the migration script. Takes a v2 record and returns
 * the v2.1 fields to merge in. Idempotent: if record is already v2.1,
 * returns null (caller should skip).
 */
function buildV2_1FieldsFromV2(v2Doc) {
  if (!v2Doc) return null;
  if (v2Doc.schema_version === SCHEMA_VERSION_V2_1 && Array.isArray(v2Doc.personas) && v2Doc.personas.length > 0) {
    return null;
  }
  const persona = synthesizePersonaFromSingular({
    type: v2Doc.type,
    tier: v2Doc.contact_tier,
    lifecycle_stage: v2Doc.lifecycle_stage,
    lead_score: v2Doc.lead_score,
    owner: v2Doc.added_by || null,
    role_label: v2Doc.contact_tier || v2Doc.type || "contact",
    notes: v2Doc.notes || null,
  });
  return {
    schema_version: SCHEMA_VERSION_V2_1,
    personas: [persona],
    primary_persona_id: persona.id,
    tiers_index: derivePersonaIndex([persona]),
  };
}

module.exports = {
  // Constants
  SCHEMA_VERSION_V2,
  SCHEMA_VERSION_V2_1,
  VALID_TYPES,
  VALID_TIERS,
  VALID_LIFECYCLE,
  VALID_ACCREDITATION_STATUS,
  VALID_ACCREDITATION_METHOD,
  VALID_OFAC_STATUS,
  VALID_KYC_STATUS,
  // Helpers
  defaultTierFromType,
  nextPersonaId,
  synthesizePersonaFromSingular,
  validatePersona,
  normalizePersonasForCreate,
  mergePersonaPatch,
  derivePrimaryMirrors,
  derivePersonaIndex,
  addPersonaToExisting,
  buildV2_1FieldsFromV2,
};
