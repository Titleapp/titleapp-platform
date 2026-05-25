"use strict";

/**
 * creative/projects.js — CREATIVE-001 Phase A
 *
 * Project CRUD for the Book / Script / Play Worker.
 *
 * A creative project is the top-level container for a long-form work
 * (novel, screenplay, stage play, or any combination). It owns:
 *   - outline + chapters
 *   - character bible
 *   - voice register declarations
 *   - theme invariants
 *   - drafts + revisions
 *   - format-converted outputs (screenplay, stageplay, KDP)
 *   - publishing artifacts (KDP, copyright, WGA)
 *   - launch campaign + press list + social assets
 *   - a facts collection for continuity cross-checks
 *
 * Firestore:
 *   creativeProjects/{projectId}
 *     /chapters/{chapterId}
 *     /characters/{characterId}
 *     /facts/{factId}
 *     /drafts/{draftId}
 *     /outputs/{outputId}
 *     /campaigns/{campaignId}
 *     /events/{eventId}            — append-only event log per project
 *
 * v1: project owner is the tenant + creating user. Multi-author
 * collaboration deferred to v1.1 (uses the same per-investor pattern
 * as fundraises/{fundraiseId}/investors).
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const VALID_STAGES = ["concept", "outlining", "drafting", "revising", "format_conversion", "publishing", "live", "archived"];
const VALID_OUTPUT_FORMATS = ["novel", "screenplay", "stageplay", "nonfiction"];

/**
 * Create a project.
 *
 * @param {object} input
 * @param {string} input.tenantId
 * @param {string} input.title
 * @param {string} [input.genre]
 * @param {number} [input.lengthTarget]            — page count target
 * @param {string[]} [input.outputFormats]         — subset of VALID_OUTPUT_FORMATS
 * @param {string[]} [input.refTones]              — voice-anchor authors/series (Caro, McCarthy, etc.)
 * @param {string} [input.authorByline]            — public byline e.g. "Alex Sociii"
 * @param {string} [input.authorPersonaId]         — pointer to persona spec doc
 * @param {string} [input.ghostProjectLead]        — non-public creative-direction owner
 * @param {string} [input.createdBy]
 */
async function createProject(input) {
  const {
    tenantId,
    title,
    genre = null,
    lengthTarget = null,
    outputFormats = ["novel"],
    refTones = [],
    authorByline = null,
    authorPersonaId = null,
    ghostProjectLead = null,
    createdBy = null,
  } = input;

  if (!tenantId) throw new Error("createProject: tenantId required");
  if (!title) throw new Error("createProject: title required");

  for (const f of outputFormats) {
    if (!VALID_OUTPUT_FORMATS.includes(f)) {
      throw new Error(`createProject: invalid output format ${f}`);
    }
  }

  const projectId = `cp_${crypto.randomBytes(8).toString("hex")}`;

  await getDb().collection("creativeProjects").doc(projectId).set({
    projectId,
    tenantId,
    title,
    genre,
    lengthTarget,
    outputFormats,
    refTones,
    authorByline,
    authorPersonaId,
    ghostProjectLead,
    stage: "concept",
    chapterCount: 0,
    characterCount: 0,
    factCount: 0,
    draftCount: 0,
    outputCount: 0,
    created_at: ts(),
    updated_at: ts(),
    created_by: createdBy,
  });

  return { ok: true, projectId };
}

/**
 * Update project fields. Stage and content allowlist enforced.
 */
async function updateProject(projectId, patch, updatedBy = null) {
  const ref = getDb().collection("creativeProjects").doc(projectId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`updateProject: ${projectId} not found`);

  const allowed = [
    "title", "genre", "lengthTarget", "outputFormats", "refTones",
    "authorByline", "authorPersonaId", "ghostProjectLead", "stage",
  ];
  const updates = {};
  for (const k of allowed) if (patch[k] !== undefined) updates[k] = patch[k];

  if (updates.stage && !VALID_STAGES.includes(updates.stage)) {
    throw new Error(`updateProject: invalid stage ${updates.stage}`);
  }
  if (updates.outputFormats) {
    for (const f of updates.outputFormats) {
      if (!VALID_OUTPUT_FORMATS.includes(f)) {
        throw new Error(`updateProject: invalid output format ${f}`);
      }
    }
  }

  updates.updated_at = ts();
  updates.updated_by = updatedBy;
  await ref.update(updates);
  return { ok: true, projectId };
}

async function getProject(projectId, tenantId) {
  const snap = await getDb().collection("creativeProjects").doc(projectId).get();
  if (!snap.exists) return null;
  const d = snap.data();
  if (tenantId && d.tenantId !== tenantId) return null; // tenant scoping
  return d;
}

async function listProjects(tenantId, { stage = null, limit = 50 } = {}) {
  if (!tenantId) throw new Error("listProjects: tenantId required");
  let q = getDb().collection("creativeProjects").where("tenantId", "==", tenantId);
  if (stage) q = q.where("stage", "==", stage);
  const snap = await q.orderBy("created_at", "desc").limit(limit).get();
  return snap.docs.map(d => d.data());
}

/**
 * Append-only event log per project. Helpers under outline/draft/etc
 * call this to leave a verifiable trail. Mirrors the audit-trail
 * pattern used elsewhere on the platform.
 */
async function recordEvent(projectId, eventType, payload = {}, actor = null) {
  if (!projectId || !eventType) throw new Error("recordEvent: projectId and eventType required");
  const eventId = `evt_${crypto.randomBytes(8).toString("hex")}`;
  await getDb().collection("creativeProjects").doc(projectId)
    .collection("events").doc(eventId).set({
      eventId, eventType, payload, actor,
      at: ts(),
    });
  return { ok: true, eventId };
}

module.exports = {
  createProject,
  updateProject,
  getProject,
  listProjects,
  recordEvent,
  VALID_STAGES,
  VALID_OUTPUT_FORMATS,
};
