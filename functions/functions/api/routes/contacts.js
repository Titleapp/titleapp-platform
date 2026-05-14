const express = require("express");
const admin = require("firebase-admin");
const { requireWorkspaceAccess, requireScope } = require("../middleware/auth");
const {
  SCHEMA_VERSION_V2_1,
  VALID_TYPES,
  VALID_TIERS,
  VALID_LIFECYCLE,
  defaultTierFromType,
  synthesizePersonaFromSingular,
  normalizePersonasForCreate,
  mergePersonaPatch,
  derivePrimaryMirrors,
  derivePersonaIndex,
} = require("./_contactsHelpers");

const router = express.Router();
function getDb() { return admin.firestore(); }

// CODEX 50.18 — spine_v2.1. Adds personas[] as first-class while keeping
// top-level singular fields populated for back-compat. Reads accept any
// schema version (v1, v2, v2.1) and return personas-aware shape regardless.
const SCHEMA_VERSION = SCHEMA_VERSION_V2_1;

// GET /v1/workspaces/:workspace_id/contacts
//   ?type=          legacy singular filter (matches top-level mirror)
//   ?tier=          legacy singular filter
//   ?lifecycle=     legacy singular filter
//   ?segment=       array-contains on segments[]
//   ?persona_tier=  CODEX 50.18 — array-contains on tiers_index[] (cross-persona)
//   ?persona_type=  CODEX 50.18 — array-contains on types_index[]  (cross-persona)
router.get("/:workspace_id/contacts", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { type, tier, lifecycle, segment, persona_tier, persona_type, limit = 50, offset = 0 } = req.query;

    let q = getDb().collection("contacts").where("tenantId", "==", workspace_id);
    if (type) q = q.where("type", "==", type);
    if (tier) q = q.where("contact_tier", "==", tier);
    if (lifecycle) q = q.where("lifecycle_stage", "==", lifecycle);
    if (segment) q = q.where("segments", "array-contains", segment);
    if (persona_tier) q = q.where("tiers_index", "array-contains", persona_tier);
    if (persona_type) q = q.where("types_index", "array-contains", persona_type);
    q = q.orderBy("created_at", "desc").limit(parseInt(limit)).offset(parseInt(offset));

    const snap = await q.get();
    const contacts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ data: contacts, total: contacts.length });
  } catch (err) {
    console.error("GET /contacts error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/workspaces/:workspace_id/contacts
// Body — accepts EITHER:
//   v2.1 shape: { name, personas: [...], primary_persona_id?, source?, enrichment?, segments?, email?, phone?, notes?, identity_id? }
//   v2 legacy shape: { name, type?, contact_tier?, lifecycle_stage?, lead_score?, source?, ... }  ← server synthesizes personas[0]
router.post("/:workspace_id/contacts", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const {
      name, identity_id, notes,
      personas: personasInput,
      primary_persona_id: primaryIdInput,
      // legacy singular fields
      type, contact_tier, lifecycle_stage, lead_score,
      // shared
      source, enrichment, segments, email, phone,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: { code: "bad_request", message: "name is required", status: 400 } });
    }

    // Build the personas[] array. Two paths:
    // 1) Caller provided personas[] explicitly — validate + normalize.
    // 2) Caller provided singular legacy fields — synthesize a single persona.
    let personas;
    let primary_persona_id;
    if (Array.isArray(personasInput) && personasInput.length > 0) {
      const norm = normalizePersonasForCreate(personasInput, req.apiKey?.user_id || null);
      if (!norm.ok) {
        return res.status(400).json({ error: { code: "bad_request", message: norm.reason, status: 400 } });
      }
      personas = norm.personas;
      primary_persona_id = primaryIdInput && personas.find(p => p.id === primaryIdInput)
        ? primaryIdInput
        : personas[0].id;
    } else {
      // Legacy path — validate the singular fields then synthesize one persona.
      if (type && !VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: { code: "bad_request", message: `type must be one of: ${VALID_TYPES.join(", ")}`, status: 400 } });
      }
      if (contact_tier && !VALID_TIERS.includes(contact_tier)) {
        return res.status(400).json({ error: { code: "bad_request", message: `contact_tier must be one of: ${VALID_TIERS.join(", ")}`, status: 400 } });
      }
      if (lifecycle_stage && !VALID_LIFECYCLE.includes(lifecycle_stage)) {
        return res.status(400).json({ error: { code: "bad_request", message: `lifecycle_stage must be one of: ${VALID_LIFECYCLE.join(", ")}`, status: 400 } });
      }
      if (lead_score !== undefined && (typeof lead_score !== "number" || lead_score < 0 || lead_score > 100)) {
        return res.status(400).json({ error: { code: "bad_request", message: "lead_score must be a number 0-100", status: 400 } });
      }
      const synthesized = synthesizePersonaFromSingular({
        type: type || "customer",
        tier: contact_tier,
        lifecycle_stage,
        lead_score,
        owner: req.apiKey?.user_id || null,
        role_label: contact_tier || type || "contact",
        notes,
      });
      personas = [synthesized];
      primary_persona_id = synthesized.id;
    }

    const mirrors = derivePrimaryMirrors(personas, primary_persona_id);
    const tiers_index = derivePersonaIndex(personas);
    const types_index = Array.from(new Set(personas.map(p => p.type).filter(Boolean)));

    const ref = await getDb().collection("contacts").add({
      tenantId: workspace_id,
      schema_version: SCHEMA_VERSION,
      name,
      identity_id: identity_id || null,
      workspaces: [workspace_id],
      added_by: req.apiKey ? req.apiKey.user_id : null,
      notes: notes || null,
      // multi-persona fields
      personas,
      primary_persona_id,
      tiers_index,
      types_index,
      // back-compat top-level mirrors
      type: mirrors.type,
      contact_tier: mirrors.contact_tier,
      lifecycle_stage: mirrors.lifecycle_stage,
      lead_score: mirrors.lead_score,
      // shared
      source: source || { primary: "api", sub: null, captured_at: new Date().toISOString() },
      enrichment: enrichment || null,
      segments: Array.isArray(segments) ? segments : [],
      email: email || null,
      phone: phone || null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ data: { id: ref.id, schema_version: SCHEMA_VERSION, personas, primary_persona_id } });
  } catch (err) {
    console.error("POST /contacts error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// PUT /v1/workspaces/:workspace_id/contacts/:contactId
// Body — accepts:
//   { personas: [<patches>] }   patch personas (existing matched by id, unknown ids appended)
//   { primary_persona_id: "p_002" }   change primary
//   { type | contact_tier | ... }   legacy singular updates → applied to PRIMARY persona
router.put("/:workspace_id/contacts/:contactId", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id, contactId } = req.params;
    const docRef = getDb().collection("contacts").doc(contactId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().tenantId !== workspace_id) {
      return res.status(404).json({ error: { code: "not_found", message: "Contact not found", status: 404 } });
    }

    const existing = doc.data();
    const updates = {};

    // Top-level non-persona allowed fields
    const passthroughFields = ["name", "identity_id", "notes", "source", "enrichment", "segments", "email", "phone"];
    for (const f of passthroughFields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }

    // Build the new personas[] starting from existing.
    let personasOut = Array.isArray(existing.personas) ? existing.personas.slice() : [];
    if (personasOut.length === 0) {
      // Legacy doc — synthesize a starting persona from existing singulars so
      // the PUT path can patch into a v2.1 shape without a separate migration.
      personasOut = [synthesizePersonaFromSingular({
        type: existing.type,
        tier: existing.contact_tier,
        lifecycle_stage: existing.lifecycle_stage,
        lead_score: existing.lead_score,
        owner: existing.added_by || null,
        role_label: existing.contact_tier || existing.type || "contact",
      })];
    }

    // Apply persona patches if present
    if (req.body.personas !== undefined) {
      const merged = mergePersonaPatch(personasOut, req.body.personas, req.apiKey?.user_id || null);
      if (!merged.ok) {
        return res.status(400).json({ error: { code: "bad_request", message: merged.reason, status: 400 } });
      }
      personasOut = merged.personas;
    }

    // Apply legacy singular-field updates to the PRIMARY persona only
    let primary_persona_id = req.body.primary_persona_id || existing.primary_persona_id || (personasOut[0] && personasOut[0].id);
    if (!personasOut.find(p => p.id === primary_persona_id)) {
      primary_persona_id = personasOut[0]?.id || "p_001";
    }
    const legacyFieldUpdates = {};
    if (req.body.type !== undefined) {
      if (!VALID_TYPES.includes(req.body.type)) {
        return res.status(400).json({ error: { code: "bad_request", message: "invalid type", status: 400 } });
      }
      legacyFieldUpdates.type = req.body.type;
    }
    if (req.body.contact_tier !== undefined) {
      if (!VALID_TIERS.includes(req.body.contact_tier)) {
        return res.status(400).json({ error: { code: "bad_request", message: "invalid contact_tier", status: 400 } });
      }
      legacyFieldUpdates.tier = req.body.contact_tier;
    }
    if (req.body.lifecycle_stage !== undefined) {
      if (!VALID_LIFECYCLE.includes(req.body.lifecycle_stage)) {
        return res.status(400).json({ error: { code: "bad_request", message: "invalid lifecycle_stage", status: 400 } });
      }
      legacyFieldUpdates.lifecycle_stage = req.body.lifecycle_stage;
    }
    if (req.body.lead_score !== undefined) {
      if (typeof req.body.lead_score !== "number" || req.body.lead_score < 0 || req.body.lead_score > 100) {
        return res.status(400).json({ error: { code: "bad_request", message: "lead_score must be 0-100", status: 400 } });
      }
      legacyFieldUpdates.lead_score = req.body.lead_score;
    }
    if (Object.keys(legacyFieldUpdates).length > 0) {
      const idx = personasOut.findIndex(p => p.id === primary_persona_id);
      if (idx >= 0) personasOut[idx] = { ...personasOut[idx], ...legacyFieldUpdates };
    }

    // Re-derive mirrors + indexes
    const mirrors = derivePrimaryMirrors(personasOut, primary_persona_id);
    const tiers_index = derivePersonaIndex(personasOut);
    const types_index = Array.from(new Set(personasOut.map(p => p.type).filter(Boolean)));

    updates.personas = personasOut;
    updates.primary_persona_id = primary_persona_id;
    updates.tiers_index = tiers_index;
    updates.types_index = types_index;
    updates.type = mirrors.type;
    updates.contact_tier = mirrors.contact_tier;
    updates.lifecycle_stage = mirrors.lifecycle_stage;
    updates.lead_score = mirrors.lead_score;
    updates.schema_version = SCHEMA_VERSION;
    updates.updated_at = admin.firestore.FieldValue.serverTimestamp();

    await docRef.update(updates);
    res.json({ data: { id: contactId, ...updates } });
  } catch (err) {
    console.error("PUT /contacts error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// DELETE /v1/workspaces/:workspace_id/contacts/:contactId
router.delete("/:workspace_id/contacts/:contactId", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id, contactId } = req.params;
    const docRef = getDb().collection("contacts").doc(contactId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().tenantId !== workspace_id) {
      return res.status(404).json({ error: { code: "not_found", message: "Contact not found", status: 404 } });
    }
    await docRef.delete();
    res.json({ data: { id: contactId, deleted: true } });
  } catch (err) {
    console.error("DELETE /contacts error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// POST /v1/workspaces/:workspace_id/contacts/:contactId/link-identity
router.post("/:workspace_id/contacts/:contactId/link-identity", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id, contactId } = req.params;
    const { identity_id } = req.body;
    if (!identity_id) {
      return res.status(400).json({ error: { code: "bad_request", message: "identity_id is required", status: 400 } });
    }
    const docRef = getDb().collection("contacts").doc(contactId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().tenantId !== workspace_id) {
      return res.status(404).json({ error: { code: "not_found", message: "Contact not found", status: 404 } });
    }
    await docRef.update({
      identity_id,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ data: { id: contactId, identity_id, linked: true } });
  } catch (err) {
    console.error("POST /contacts/link-identity error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// CODEX 50.15 P0-1 — engagement events subcollection
// CODEX 50.18 — adds optional personaId to scope engagement to a specific persona.
// POST /v1/workspaces/:workspace_id/contacts/:contactId/engagement
// Body: { type, channel, campaignId?, payload?, personaId? }
router.post("/:workspace_id/contacts/:contactId/engagement", requireWorkspaceAccess, requireScope("write"), async (req, res) => {
  try {
    const { workspace_id, contactId } = req.params;
    const { type, channel, campaignId, payload, personaId } = req.body;
    const VALID_ENGAGEMENT_TYPES = [
      "email_sent", "email_open", "email_click", "email_reply", "email_bounce", "email_unsubscribe",
      "sms_sent", "sms_reply", "sms_opt_out",
      "call_scheduled", "call_completed", "meeting_scheduled", "meeting_completed",
      "form_submit", "page_view", "asset_download",
    ];
    if (!type || !VALID_ENGAGEMENT_TYPES.includes(type)) {
      return res.status(400).json({ error: { code: "bad_request", message: `type must be one of: ${VALID_ENGAGEMENT_TYPES.join(", ")}`, status: 400 } });
    }
    const docRef = getDb().collection("contacts").doc(contactId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().tenantId !== workspace_id) {
      return res.status(404).json({ error: { code: "not_found", message: "Contact not found", status: 404 } });
    }
    // If personaId supplied, validate it actually exists on the contact
    if (personaId) {
      const personas = doc.data().personas || [];
      if (!personas.find(p => p.id === personaId)) {
        return res.status(400).json({ error: { code: "bad_request", message: `personaId ${personaId} not found on contact`, status: 400 } });
      }
    }
    const eventRef = await docRef.collection("engagement").add({
      type,
      channel: channel || null,
      campaignId: campaignId || null,
      personaId: personaId || null,
      payload: payload || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Update last_interaction_at on the targeted persona (or primary if none specified)
    const personas = doc.data().personas || [];
    const targetId = personaId || doc.data().primary_persona_id || personas[0]?.id;
    if (targetId) {
      const idx = personas.findIndex(p => p.id === targetId);
      if (idx >= 0) {
        personas[idx] = { ...personas[idx], last_interaction_at: new Date().toISOString() };
        await docRef.update({ personas, updated_at: admin.firestore.FieldValue.serverTimestamp() });
      }
    }
    res.status(201).json({ data: { id: eventRef.id } });
  } catch (err) {
    console.error("POST /contacts/engagement error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

// GET /v1/workspaces/:workspace_id/contacts/:contactId/engagement
//   ?personaId=p_002   filter to engagement scoped to a specific persona
router.get("/:workspace_id/contacts/:contactId/engagement", requireWorkspaceAccess, async (req, res) => {
  try {
    const { workspace_id, contactId } = req.params;
    const { limit = 50, personaId } = req.query;
    const docRef = getDb().collection("contacts").doc(contactId);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().tenantId !== workspace_id) {
      return res.status(404).json({ error: { code: "not_found", message: "Contact not found", status: 404 } });
    }
    let q = docRef.collection("engagement");
    if (personaId) q = q.where("personaId", "==", personaId);
    q = q.orderBy("timestamp", "desc").limit(parseInt(limit));
    const snap = await q.get();
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ data: events, total: events.length });
  } catch (err) {
    console.error("GET /contacts/engagement error:", err);
    res.status(500).json({ error: { code: "internal_error", message: err.message, status: 500 } });
  }
});

module.exports = router;
