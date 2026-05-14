"use strict";

/**
 * constraintModules.js — CODEX 50.17 P0-3
 *
 * Storage tier + state machine + composition helpers for cross-domain
 * constraint RAAS modules. Modules curate regulatoryDocuments (P0-1) into
 * coherent, prompt-loadable rule sets (e.g., securities_compliance_v1).
 *
 * Collection layout:
 *   constraintRaasModules/{moduleId}                  — module metadata
 *   constraintRaasModules/{moduleId}/sections/{sId}   — composable sections
 *
 * State machine: draft → review → live → deprecated (transitions are
 * one-way except draft↔review during authoring).
 *
 * Composition: composePromptText(moduleId, opts) returns the prompt-ready
 * text block that the multi-source RAAS loader (P0-5) will inject into
 * worker prompts at chat completion time.
 *
 * Counsel review: a module cannot transition to "live" without
 * counsel.reviewedAt set. Per CODEX 50.17 D-7 / D-11.
 *
 * SECURITY MODEL: All mutations are server-only. firestore.rules denies
 * client read/write on constraintRaasModules/*. Workers READ via the
 * runtime composer; admins WRITE via the admin endpoints.
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

// ═══════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MODULE_STATUS = Object.freeze({
  DRAFT: "draft",
  REVIEW: "review",
  LIVE: "live",
  DEPRECATED: "deprecated",
});

const SECTION_PRIORITIES = Object.freeze(["critical", "high", "standard", "reference"]);
const SECTION_TYPES = Object.freeze([
  "hard_stop_rule",
  "soft_flag",
  "guidance",
  "definition",
  "sop",
  "filing_requirement",
  "exemption_note",
]);

const DISPOSITIONS = Object.freeze([
  "block_with_explanation",
  "flag_for_review",
  "allow_with_disclosure",
]);

const ALLOWED_TRANSITIONS = Object.freeze({
  draft: new Set(["review", "deprecated"]),
  review: new Set(["draft", "live", "deprecated"]),
  live: new Set(["deprecated"]),
  deprecated: new Set(["draft"]), // un-deprecate path for fixes
});

// ═══════════════════════════════════════════════════════════════
//  MODULE CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * @param {object} input
 * @param {string} input.moduleId       — e.g., "securities_compliance_v1"
 * @param {string} input.name
 * @param {string} input.description
 * @param {string} input.domain         — "securities" | "lending" | "banking" | "healthcare" | "aviation" | "tax" | "general"
 * @param {string[]} input.jurisdiction_scope — e.g., ["US-federal", "US-state-CA", ...]
 * @param {string} input.disposition_default  — DISPOSITIONS member
 * @param {string} [input.createdBy]    — admin user uid
 */
async function createModule(input) {
  const {
    moduleId, name, description, domain,
    jurisdiction_scope = [], disposition_default = "flag_for_review",
    createdBy = null,
  } = input;

  if (!moduleId || !name || !domain) {
    throw new Error("createModule: moduleId, name, domain are required");
  }
  if (!DISPOSITIONS.includes(disposition_default)) {
    throw new Error(`createModule: invalid disposition_default ${disposition_default}`);
  }

  const db = getDb();
  const ref = db.collection("constraintRaasModules").doc(moduleId);
  const existing = await ref.get();
  if (existing.exists) {
    throw new Error(`createModule: ${moduleId} already exists (use updateModule or transition)`);
  }

  const doc = {
    moduleId,
    name,
    description: description || "",
    domain,
    jurisdiction_scope,
    version: "1.0.0",
    status: MODULE_STATUS.DRAFT,

    counsel_review: {
      required: true,
      reviewer: null,
      reviewedAt: null,
      approval_notes: null,
    },

    source_documents: [],

    section_count: 0,
    total_token_estimate: 0,
    disposition_default,

    last_propagated_at: null,
    auto_update_enabled: false,
    notice_window_days: 7,

    createdAt: ts(),
    updatedAt: ts(),
    createdBy,
    updatedBy: createdBy,
  };

  await ref.set(doc);
  return { ok: true, moduleId };
}

/**
 * Patch module metadata. Cannot change status here — use transition().
 */
async function updateModule(moduleId, patch, updatedBy = null) {
  const db = getDb();
  const ref = db.collection("constraintRaasModules").doc(moduleId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`updateModule: ${moduleId} not found`);

  const allowed = [
    "name", "description", "jurisdiction_scope",
    "disposition_default", "auto_update_enabled", "notice_window_days",
    "source_documents", "version",
  ];
  const update = {};
  for (const k of allowed) {
    if (patch[k] !== undefined) update[k] = patch[k];
  }
  if (Object.keys(update).length === 0) {
    return { ok: true, moduleId, noop: true };
  }
  update.updatedAt = ts();
  update.updatedBy = updatedBy;

  if (update.disposition_default && !DISPOSITIONS.includes(update.disposition_default)) {
    throw new Error(`updateModule: invalid disposition_default`);
  }

  await ref.update(update);
  return { ok: true, moduleId };
}

/**
 * State machine transition. Validates allowed transitions + counsel-review
 * requirement for live.
 */
async function transition(moduleId, newStatus, opts = {}) {
  if (!Object.values(MODULE_STATUS).includes(newStatus)) {
    throw new Error(`transition: invalid status ${newStatus}`);
  }
  const db = getDb();
  const ref = db.collection("constraintRaasModules").doc(moduleId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`transition: ${moduleId} not found`);

  const current = snap.data();
  const fromStatus = current.status;
  const allowedSet = ALLOWED_TRANSITIONS[fromStatus] || new Set();
  if (!allowedSet.has(newStatus)) {
    throw new Error(`transition: ${fromStatus} → ${newStatus} not allowed`);
  }

  // Counsel review required to flip to live
  if (newStatus === MODULE_STATUS.LIVE) {
    const cr = current.counsel_review || {};
    if (cr.required !== false && !cr.reviewedAt) {
      throw new Error(`transition: counsel_review.reviewedAt required before live`);
    }
    if (current.section_count === 0) {
      throw new Error(`transition: cannot promote empty module to live`);
    }
  }

  await ref.update({
    status: newStatus,
    updatedAt: ts(),
    updatedBy: opts.updatedBy || null,
    ...(newStatus === MODULE_STATUS.LIVE ? { last_propagated_at: ts() } : {}),
  });
  return { ok: true, moduleId, from: fromStatus, to: newStatus };
}

/**
 * Record counsel review. Required before transition to live.
 */
async function markCounselReviewed(moduleId, { reviewer, approval_notes = null, reviewedBy = null }) {
  if (!reviewer) throw new Error("markCounselReviewed: reviewer is required");
  const db = getDb();
  const ref = db.collection("constraintRaasModules").doc(moduleId);
  await ref.update({
    "counsel_review.reviewer": reviewer,
    "counsel_review.reviewedAt": ts(),
    "counsel_review.approval_notes": approval_notes,
    updatedAt: ts(),
    updatedBy: reviewedBy,
  });
  return { ok: true, moduleId };
}

// ═══════════════════════════════════════════════════════════════
//  SECTION CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * @param {object} input
 * @param {string} input.moduleId
 * @param {string} input.sectionId       — author-supplied stable id, e.g., "regd_506b_max_35_nonaccredited"
 * @param {string} input.priority        — SECTION_PRIORITIES member
 * @param {string} input.section_type    — SECTION_TYPES member
 * @param {string} input.title
 * @param {string} input.body_markdown   — the actual rule text injected into worker prompts
 * @param {object} [input.applies_to]    — { document_types?, audience_tiers?, jurisdictions? }
 * @param {object[]} [input.source_refs] — [{ docId, section }]
 * @param {string} [input.disposition_override]
 * @param {number} [input.order]         — 0-based ordering
 */
async function addSection(input) {
  const {
    moduleId, sectionId,
    priority = "standard",
    section_type = "guidance",
    title, body_markdown,
    applies_to = {},
    source_refs = [],
    disposition_override = null,
    order = null,
  } = input;

  if (!moduleId || !sectionId || !title || !body_markdown) {
    throw new Error("addSection: moduleId, sectionId, title, body_markdown required");
  }
  if (!SECTION_PRIORITIES.includes(priority)) throw new Error(`addSection: invalid priority`);
  if (!SECTION_TYPES.includes(section_type)) throw new Error(`addSection: invalid section_type`);
  if (disposition_override && !DISPOSITIONS.includes(disposition_override)) {
    throw new Error(`addSection: invalid disposition_override`);
  }

  const db = getDb();
  const moduleRef = db.collection("constraintRaasModules").doc(moduleId);
  const moduleSnap = await moduleRef.get();
  if (!moduleSnap.exists) throw new Error(`addSection: module ${moduleId} not found`);
  if (moduleSnap.data().status === MODULE_STATUS.LIVE) {
    throw new Error(`addSection: cannot add to live module — transition to draft first`);
  }

  const sectionRef = moduleRef.collection("sections").doc(sectionId);
  const existing = await sectionRef.get();
  if (existing.exists) throw new Error(`addSection: ${sectionId} already exists in ${moduleId}`);

  // Crude token estimate — 1 token ≈ 4 chars for English markdown
  const token_estimate = Math.ceil(body_markdown.length / 4);

  // Auto-order: append to end if not specified
  let resolvedOrder = order;
  if (resolvedOrder === null) {
    resolvedOrder = moduleSnap.data().section_count || 0;
  }

  await db.runTransaction(async (tx) => {
    tx.set(sectionRef, {
      sectionId,
      priority,
      section_type,
      title,
      body_markdown,
      token_estimate,
      applies_to,
      source_refs,
      disposition_override,
      order: resolvedOrder,
      createdAt: ts(),
      updatedAt: ts(),
    });
    tx.update(moduleRef, {
      section_count: admin.firestore.FieldValue.increment(1),
      total_token_estimate: admin.firestore.FieldValue.increment(token_estimate),
      updatedAt: ts(),
    });
  });

  return { ok: true, moduleId, sectionId, order: resolvedOrder, token_estimate };
}

async function updateSection(moduleId, sectionId, patch) {
  const db = getDb();
  const moduleRef = db.collection("constraintRaasModules").doc(moduleId);
  const moduleSnap = await moduleRef.get();
  if (!moduleSnap.exists) throw new Error(`updateSection: module ${moduleId} not found`);
  if (moduleSnap.data().status === MODULE_STATUS.LIVE) {
    throw new Error(`updateSection: cannot update sections in live module — transition to draft first`);
  }

  const sectionRef = moduleRef.collection("sections").doc(sectionId);
  const sectionSnap = await sectionRef.get();
  if (!sectionSnap.exists) throw new Error(`updateSection: ${sectionId} not found`);

  const allowed = [
    "priority", "section_type", "title", "body_markdown",
    "applies_to", "source_refs", "disposition_override", "order",
  ];
  const update = {};
  for (const k of allowed) {
    if (patch[k] !== undefined) update[k] = patch[k];
  }
  if (update.priority && !SECTION_PRIORITIES.includes(update.priority)) {
    throw new Error("updateSection: invalid priority");
  }
  if (update.section_type && !SECTION_TYPES.includes(update.section_type)) {
    throw new Error("updateSection: invalid section_type");
  }
  if (update.disposition_override && !DISPOSITIONS.includes(update.disposition_override)) {
    throw new Error("updateSection: invalid disposition_override");
  }

  // Recompute token_estimate if body changed
  let tokenDelta = 0;
  if (update.body_markdown !== undefined) {
    const oldEst = sectionSnap.data().token_estimate || 0;
    const newEst = Math.ceil(update.body_markdown.length / 4);
    update.token_estimate = newEst;
    tokenDelta = newEst - oldEst;
  }
  update.updatedAt = ts();

  await db.runTransaction(async (tx) => {
    tx.update(sectionRef, update);
    if (tokenDelta !== 0) {
      tx.update(moduleRef, {
        total_token_estimate: admin.firestore.FieldValue.increment(tokenDelta),
        updatedAt: ts(),
      });
    }
  });

  return { ok: true, moduleId, sectionId };
}

async function removeSection(moduleId, sectionId) {
  const db = getDb();
  const moduleRef = db.collection("constraintRaasModules").doc(moduleId);
  const moduleSnap = await moduleRef.get();
  if (!moduleSnap.exists) throw new Error(`removeSection: module ${moduleId} not found`);
  if (moduleSnap.data().status === MODULE_STATUS.LIVE) {
    throw new Error(`removeSection: cannot remove from live module — transition to draft first`);
  }

  const sectionRef = moduleRef.collection("sections").doc(sectionId);
  const sectionSnap = await sectionRef.get();
  if (!sectionSnap.exists) return { ok: true, moduleId, sectionId, noop: true };

  const tokenEst = sectionSnap.data().token_estimate || 0;

  await db.runTransaction(async (tx) => {
    tx.delete(sectionRef);
    tx.update(moduleRef, {
      section_count: admin.firestore.FieldValue.increment(-1),
      total_token_estimate: admin.firestore.FieldValue.increment(-tokenEst),
      updatedAt: ts(),
    });
  });

  return { ok: true, moduleId, sectionId };
}

// ═══════════════════════════════════════════════════════════════
//  COMPOSITION (used by P0-5 multi-source RAAS loader)
// ═══════════════════════════════════════════════════════════════

/**
 * Assemble a module's sections into a prompt-ready text block.
 * Filters by optional applies_to context (audience tier, jurisdiction,
 * document type) so workers only see relevant sections at chat time.
 *
 * Token budgeting: caller passes maxTokens. Sections are sorted by
 * priority (critical → high → standard → reference) and the lower-
 * priority sections truncate first if budget exceeded.
 *
 * @param {string} moduleId
 * @param {object} [ctx]
 * @param {string} [ctx.audience_tier]
 * @param {string} [ctx.jurisdiction]
 * @param {string} [ctx.document_type]
 * @param {number} [ctx.maxTokens]      — soft cap; default 4000
 * @returns {Promise<{ text, tokenEstimate, sectionCount, dropped, version, status }>}
 */
async function composePromptText(moduleId, ctx = {}) {
  const db = getDb();
  const moduleRef = db.collection("constraintRaasModules").doc(moduleId);
  const moduleSnap = await moduleRef.get();
  if (!moduleSnap.exists) throw new Error(`composePromptText: ${moduleId} not found`);

  const moduleData = moduleSnap.data();
  if (moduleData.status !== MODULE_STATUS.LIVE) {
    // Composition allowed in draft/review for testing, but caller should know
    console.warn(`[constraintModules] composing non-live module ${moduleId} (status=${moduleData.status})`);
  }

  const sectionsSnap = await moduleRef.collection("sections")
    .orderBy("order", "asc")
    .get();

  // Filter by applies_to context
  const applicable = [];
  for (const s of sectionsSnap.docs) {
    const data = s.data();
    if (matchesContext(data.applies_to || {}, ctx)) {
      applicable.push(data);
    }
  }

  // Sort by priority (critical first), then by order within priority
  const PRIO_RANK = { critical: 0, high: 1, standard: 2, reference: 3 };
  applicable.sort((a, b) => {
    const pa = PRIO_RANK[a.priority] ?? 9;
    const pb = PRIO_RANK[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return (a.order || 0) - (b.order || 0);
  });

  const maxTokens = ctx.maxTokens || 4000;
  const parts = [];
  let budget = maxTokens;
  let dropped = 0;

  parts.push(`# ${moduleData.name} (${moduleId})`);
  parts.push(`Domain: ${moduleData.domain}. Jurisdictions: ${(moduleData.jurisdiction_scope || []).join(", ") || "global"}.`);
  parts.push(`Default disposition on violation: ${moduleData.disposition_default}.`);
  parts.push("");
  budget -= 100; // header overhead

  for (const s of applicable) {
    const block = `## [${s.priority.toUpperCase()} · ${s.section_type}] ${s.title}\n${s.body_markdown}\n`;
    const cost = s.token_estimate || Math.ceil(block.length / 4);
    if (cost > budget) {
      dropped++;
      continue;
    }
    parts.push(block);
    budget -= cost;
  }

  const text = parts.join("\n");
  return {
    text,
    tokenEstimate: maxTokens - budget,
    sectionCount: applicable.length - dropped,
    dropped,
    version: moduleData.version,
    status: moduleData.status,
  };
}

function matchesContext(applies_to, ctx) {
  // Empty applies_to means "applies always"
  if (!applies_to || Object.keys(applies_to).length === 0) return true;

  if (applies_to.audience_tiers && applies_to.audience_tiers.length > 0) {
    if (!ctx.audience_tier || !applies_to.audience_tiers.includes(ctx.audience_tier)) return false;
  }
  if (applies_to.jurisdictions && applies_to.jurisdictions.length > 0) {
    if (!ctx.jurisdiction || !applies_to.jurisdictions.includes(ctx.jurisdiction)) return false;
  }
  if (applies_to.document_types && applies_to.document_types.length > 0) {
    if (!ctx.document_type || !applies_to.document_types.includes(ctx.document_type)) return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  QUERIES
// ═══════════════════════════════════════════════════════════════

async function getModule(moduleId, { includeSections = false } = {}) {
  const db = getDb();
  const ref = db.collection("constraintRaasModules").doc(moduleId);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const result = { moduleId, ...snap.data() };
  if (includeSections) {
    const sectionsSnap = await ref.collection("sections").orderBy("order", "asc").get();
    result.sections = sectionsSnap.docs.map(d => d.data());
  }
  return result;
}

async function listModules({ status = null, domain = null } = {}) {
  const db = getDb();
  let q = db.collection("constraintRaasModules");
  if (status) q = q.where("status", "==", status);
  if (domain) q = q.where("domain", "==", domain);
  const snap = await q.get();
  return snap.docs.map(d => ({ moduleId: d.id, ...d.data() }));
}

async function getModulesByDomain(domain) {
  return listModules({ status: MODULE_STATUS.LIVE, domain });
}

module.exports = {
  // CRUD
  createModule,
  updateModule,
  transition,
  markCounselReviewed,
  // sections
  addSection,
  updateSection,
  removeSection,
  // composition (for P0-5 loader)
  composePromptText,
  // queries
  getModule,
  listModules,
  getModulesByDomain,
  // constants
  MODULE_STATUS,
  SECTION_PRIORITIES,
  SECTION_TYPES,
  DISPOSITIONS,
};
