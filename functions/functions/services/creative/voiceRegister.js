"use strict";

/**
 * creative/voiceRegister.js — CREATIVE-001 Phase B
 *
 * Voice register declaration + drift check.
 *
 * A voice register is the declared blend of authorial reference tones
 * that govern a section of the work. Each part (or chapter) declares
 * a primary anchor + zero-or-more secondary anchors. The check function
 * compares a candidate draft against the declared anchors and surfaces
 * lines that drift away from the blend.
 *
 * Hamilton v Che example:
 *   Part I  → primary: Caro,    secondary: [McCarthy, Tolstoy]
 *   Part II → primary: Tolstoy, secondary: [Caro, Curtis]
 *   Part III → primary: BlackMirror, secondary: [Curtis]  (the inhuman drift)
 *
 * Firestore:
 *   creativeProjects/{projectId}/voiceRegisters/{partId}
 *
 * v1: declare-and-store. checkDraftAgainstRegister returns a stub
 * report; real model integration is v1.1 — at that point this is the
 * file we wire the inference call into. The shape of the returned
 * report is finalized here so callers can be built against it now.
 */

const admin = require("firebase-admin");

const projects = require("./projects");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

// Canonical anchor library. Add to this list as new reference authors
// emerge. The check pass (v1.1) will compare prose against a vector
// representation per anchor — for v1 the list is just authoritative
// labels.
const KNOWN_ANCHORS = [
  "Caro", "McCarthy", "Curtis", "BlackMirror", "Tolstoy",
  "Didion", "Ferrante", "DeLillo", "Sebald", "Calvino",
  "Marquez", "LeCarre", "Bolano", "Pynchon",
];

/**
 * Declare a voice register for a part (or, optionally, a single chapter).
 *
 * @param {object} input
 * @param {string} input.projectId
 * @param {string} input.partId               — the part-level binding key (e.g. "part_i").
 *                                              For chapter-scoped overrides, pass `chapter:<chapterId>`.
 * @param {string} input.primaryAnchor        — must be in KNOWN_ANCHORS (advisory; soft-warned not blocked)
 * @param {string[]} [input.secondaryAnchors]
 * @param {string} [input.registerNotes]       — freeform writer-facing notes
 * @param {string} [input.actor]
 */
async function declareVoiceRegister(input) {
  const {
    projectId,
    partId,
    primaryAnchor,
    secondaryAnchors = [],
    registerNotes = null,
    actor = null,
  } = input;

  if (!projectId) throw new Error("declareVoiceRegister: projectId required");
  if (!partId) throw new Error("declareVoiceRegister: partId required");
  if (!primaryAnchor) throw new Error("declareVoiceRegister: primaryAnchor required");

  const warnings = [];
  if (!KNOWN_ANCHORS.includes(primaryAnchor)) {
    warnings.push(`unknown primary anchor: ${primaryAnchor} (will be accepted but not yet supported by check pass)`);
  }
  for (const a of secondaryAnchors) {
    if (!KNOWN_ANCHORS.includes(a)) {
      warnings.push(`unknown secondary anchor: ${a}`);
    }
  }

  const ref = getDb().collection("creativeProjects").doc(projectId)
    .collection("voiceRegisters").doc(partId);
  await ref.set({
    partId,
    primaryAnchor,
    secondaryAnchors,
    registerNotes,
    updated_at: ts(),
    declared_at: ts(),
  }, { merge: true });

  await projects.recordEvent(projectId, "voiceRegister.declare", {
    partId, primaryAnchor, secondaryAnchors,
  }, actor);

  return { ok: true, projectId, partId, warnings };
}

async function getVoiceRegister(projectId, partId) {
  const snap = await getDb().collection("creativeProjects").doc(projectId)
    .collection("voiceRegisters").doc(partId).get();
  return snap.exists ? snap.data() : null;
}

async function listVoiceRegisters(projectId) {
  const snap = await getDb().collection("creativeProjects").doc(projectId)
    .collection("voiceRegisters").get();
  return snap.docs.map(d => d.data());
}

/**
 * Check a draft against the declared voice register for a chapter.
 *
 * Resolution order for which register applies:
 *   1. chapter:{chapterId}        — chapter-level override if set
 *   2. partId from chapter record — falls back to part-level register
 *
 * Returns:
 *   {
 *     ok: boolean,
 *     register: { primaryAnchor, secondaryAnchors, partId }|null,
 *     drift: [{ lineIndex, line, reason, suggestion }],
 *     note: string,
 *   }
 *
 * v1: returns ok=true + drift=[] + a note flagging this is a stub.
 * v1.1: wires actual model inference, computes drift report.
 */
async function checkDraftAgainstRegister(input) {
  const { projectId, chapterId, draftText } = input;
  if (!projectId) throw new Error("checkDraftAgainstRegister: projectId required");
  if (!chapterId) throw new Error("checkDraftAgainstRegister: chapterId required");

  // Try chapter-scoped first
  const chapterScopedId = `chapter:${chapterId}`;
  let register = await getVoiceRegister(projectId, chapterScopedId);

  // Fall back to part-level via the chapter's partId
  if (!register) {
    const chSnap = await getDb().collection("creativeProjects").doc(projectId)
      .collection("chapters").doc(chapterId).get();
    if (chSnap.exists && chSnap.data().partId) {
      register = await getVoiceRegister(projectId, chSnap.data().partId);
    }
  }

  // TODO v1.1 — wire to model inference:
  //   1. Embed draftText line-by-line
  //   2. Embed reference passages per declared anchor (cached)
  //   3. For each line, compute cosine similarity to each declared anchor
  //   4. Flag lines whose nearest anchor is NOT in the declared blend
  //   5. Optionally suggest rewrite via instruction-tuned model
  // For v1 this returns ok with empty drift list.

  // Still capture an event so future callers can dogfood the API now.
  await projects.recordEvent(projectId, "voiceRegister.check", {
    chapterId,
    registerPartId: register ? register.partId : null,
    draftLength: typeof draftText === "string" ? draftText.length : 0,
    stub: true,
  });

  return {
    ok: true,
    register: register ? {
      partId: register.partId,
      primaryAnchor: register.primaryAnchor,
      secondaryAnchors: register.secondaryAnchors,
    } : null,
    drift: [],
    note: "voice-check stub — to be wired to model in v1.1",
  };
}

module.exports = {
  declareVoiceRegister,
  getVoiceRegister,
  listVoiceRegisters,
  checkDraftAgainstRegister,
  KNOWN_ANCHORS,
};
