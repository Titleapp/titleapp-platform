"use strict";

/**
 * creative/characterBible.js — CREATIVE-001 Phase A
 *
 * Character bible storage for a creative project. Each character record
 * holds the writer-facing structured knowledge a long-form project must
 * keep consistent across hundreds of pages:
 *
 *   - psychology (motivations, fears, contradictions)
 *   - voice markers (cadence, lexicon, register, dialogue tells)
 *   - biographical facts (dates, places, family, public record)
 *   - physical facts (description, mannerisms)
 *   - arc-per-chapter (where this character is psychologically + plot-wise
 *     at each chapter they appear in)
 *
 * Firestore:
 *   creativeProjects/{projectId}/characters/{characterId}
 *
 * The arc field is keyed by chapterId so it stays aligned with the
 * outline. When the outline shifts, character arcs stay readable.
 */

const admin = require("firebase-admin");

const projects = require("./projects");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const VALID_ROLES = [
  "protagonist",
  "antagonist",
  "foil_woman",
  "father_figure",
  "rival",
  "lover",
  "ally",
  "witness",
  "modern_mirror",
  "narrator",
  "ensemble",
];

/**
 * Create or replace a character record.
 *
 * @param {object} input
 * @param {string} input.projectId
 * @param {string} input.characterId         — stable kebab-case, e.g. "hamilton"
 * @param {string} input.displayName
 * @param {string} [input.role]              — from VALID_ROLES, advisory only
 * @param {object} [input.psychology]        — { motivations, fears, contradictions }
 * @param {object} [input.voiceMarkers]      — { cadence, lexicon, register, tells }
 * @param {object} [input.biographicalFacts] — { birth, death, places, family, sources }
 * @param {object} [input.physicalFacts]
 * @param {object} [input.arc]               — { [chapterId]: arcNote }
 * @param {string[]} [input.tags]
 * @param {string} [input.actor]
 */
async function upsertCharacter(input) {
  const {
    projectId,
    characterId,
    displayName,
    role = null,
    psychology = {},
    voiceMarkers = {},
    biographicalFacts = {},
    physicalFacts = {},
    arc = {},
    tags = [],
    actor = null,
  } = input;

  if (!projectId) throw new Error("upsertCharacter: projectId required");
  if (!characterId) throw new Error("upsertCharacter: characterId required");
  if (!displayName) throw new Error("upsertCharacter: displayName required");

  if (role && !VALID_ROLES.includes(role)) {
    throw new Error(`upsertCharacter: invalid role ${role}`);
  }

  const ref = getDb().collection("creativeProjects").doc(projectId)
    .collection("characters").doc(characterId);
  const existing = await ref.get();

  const doc = {
    characterId,
    displayName,
    role,
    psychology,
    voiceMarkers,
    biographicalFacts,
    physicalFacts,
    arc,
    tags,
    updated_at: ts(),
  };
  if (!existing.exists) doc.created_at = ts();

  await ref.set(doc, { merge: true });

  // Bump character count on parent project
  const projectRef = getDb().collection("creativeProjects").doc(projectId);
  if (!existing.exists) {
    await projectRef.update({
      characterCount: admin.firestore.FieldValue.increment(1),
      updated_at: ts(),
    });
  }

  await projects.recordEvent(projectId, "character.upsert", {
    characterId, created: !existing.exists,
  }, actor);

  return { ok: true, projectId, characterId, created: !existing.exists };
}

async function getCharacter(projectId, characterId) {
  if (!projectId || !characterId) throw new Error("getCharacter: projectId and characterId required");
  const snap = await getDb().collection("creativeProjects").doc(projectId)
    .collection("characters").doc(characterId).get();
  return snap.exists ? snap.data() : null;
}

async function listCharacters(projectId) {
  if (!projectId) throw new Error("listCharacters: projectId required");
  const snap = await getDb().collection("creativeProjects").doc(projectId)
    .collection("characters").get();
  return snap.docs.map(d => d.data());
}

/**
 * Patch only the per-chapter arc note for a character. Useful after
 * a draft pass reveals what actually happens in a chapter.
 */
async function setArcEntry(projectId, characterId, chapterId, arcNote, actor = null) {
  if (!projectId || !characterId || !chapterId) {
    throw new Error("setArcEntry: projectId, characterId, chapterId required");
  }
  const ref = getDb().collection("creativeProjects").doc(projectId)
    .collection("characters").doc(characterId);
  await ref.update({
    [`arc.${chapterId}`]: arcNote,
    updated_at: ts(),
  });
  await projects.recordEvent(projectId, "character.arc", {
    characterId, chapterId,
  }, actor);
  return { ok: true };
}

module.exports = {
  upsertCharacter,
  getCharacter,
  listCharacters,
  setArcEntry,
  VALID_ROLES,
};
