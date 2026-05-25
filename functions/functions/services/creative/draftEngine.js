"use strict";

/**
 * creative/draftEngine.js — CREATIVE-001 Phase B
 *
 * Chapter drafting + directed revision passes.
 *
 * A draft event captures a single attempt at producing/refining text
 * for a chapter. Every draft is append-only: revisions never overwrite
 * prior drafts, they append a new draft record. This is what lets the
 * append-only platform record back authorship-date claims later.
 *
 * Firestore:
 *   creativeProjects/{projectId}/drafts/{draftId}
 *
 * Each draft record:
 *   {
 *     draftId, chapterId, parentDraftId,
 *     kind: "initial" | "revision",
 *     direction: <revision instruction string>|null,
 *     context: { outlineBeats, characters, voiceRegister, priorChapter },
 *     requestedLength: number|null,
 *     status: "pending" | "ready" | "rejected",
 *     content: string|null,      — populated when inference completes
 *     stub: boolean,             — true in v1
 *     created_at, completed_at, actor
 *   }
 *
 * v1: capture request shape + write placeholder draft event. Real
 * model integration is v1.1.
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

const projects = require("./projects");
const outline = require("./outline");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

/**
 * Draft a chapter from outline + context.
 *
 * @param {object} input
 * @param {string} input.projectId
 * @param {string} input.chapterId
 * @param {object} [input.context]
 * @param {object} [input.context.outlineBeats]
 * @param {object} [input.context.characters]
 * @param {object} [input.context.voiceRegister]
 * @param {string} [input.context.priorChapterText]
 * @param {number} [input.length]              — target page count for this draft
 * @param {string} [input.actor]
 */
async function draftChapter(input) {
  const { projectId, chapterId, context = {}, length = null, actor = null } = input;
  if (!projectId) throw new Error("draftChapter: projectId required");
  if (!chapterId) throw new Error("draftChapter: chapterId required");

  // Validate chapter exists
  const chapter = await outline.getChapter(projectId, chapterId);
  if (!chapter) throw new Error(`draftChapter: chapter ${chapterId} not found in project ${projectId}`);

  const draftId = `drft_${crypto.randomBytes(8).toString("hex")}`;

  const draftDoc = {
    draftId,
    chapterId,
    parentDraftId: null,
    kind: "initial",
    direction: null,
    context: {
      outlineBeats: context.outlineBeats || chapter.beats || [],
      characters: context.characters || [],
      voiceRegister: context.voiceRegister || {
        primary: chapter.voicePrimary,
        secondary: chapter.voiceSecondary || [],
      },
      priorChapterSummary: context.priorChapterSummary || null,
    },
    requestedLength: length,
    status: "pending",
    content: null,
    stub: true,
    created_at: ts(),
    completed_at: null,
    actor,
  };

  // TODO v1.1 — actual generation:
  //   1. Resolve voice register (call voiceRegister.getVoiceRegister)
  //   2. Resolve character bible entries for `context.characters`
  //   3. Pull invariants for the part
  //   4. Build composed prompt + call model
  //   5. Run voiceRegister.checkDraftAgainstRegister on output
  //   6. Run themeInvariants.checkInvariant for each applicable invariant
  //   7. If any check fails: mark draft status=rejected with reason
  //   8. Else write content + flip status=ready
  // For v1 the draft sits in "pending" and Sean wires the inference in
  // when ready.

  await getDb().collection("creativeProjects").doc(projectId)
    .collection("drafts").doc(draftId).set(draftDoc);

  await getDb().collection("creativeProjects").doc(projectId).update({
    draftCount: admin.firestore.FieldValue.increment(1),
    updated_at: ts(),
  });

  await outline.updateChapterStatus(projectId, chapterId, "drafting", actor);
  await projects.recordEvent(projectId, "draft.requested", {
    draftId, chapterId, requestedLength: length, stub: true,
  }, actor);

  return { ok: true, projectId, chapterId, draftId, status: "pending", stub: true };
}

/**
 * Directed revision pass on an existing draft.
 *
 * @param {object} input
 * @param {string} input.projectId
 * @param {string} input.chapterId
 * @param {string} input.draftId               — parent draft to revise
 * @param {string} input.direction             — instruction (e.g. "tighten Hamilton's interior monologue to 70%")
 * @param {string} [input.actor]
 */
async function revisionPass(input) {
  const { projectId, chapterId, draftId, direction, actor = null } = input;
  if (!projectId) throw new Error("revisionPass: projectId required");
  if (!chapterId) throw new Error("revisionPass: chapterId required");
  if (!draftId) throw new Error("revisionPass: parent draftId required");
  if (!direction) throw new Error("revisionPass: direction required");

  // Validate parent draft exists
  const parentSnap = await getDb().collection("creativeProjects").doc(projectId)
    .collection("drafts").doc(draftId).get();
  if (!parentSnap.exists) throw new Error(`revisionPass: parent draft ${draftId} not found`);

  const newDraftId = `drft_${crypto.randomBytes(8).toString("hex")}`;

  const revisionDoc = {
    draftId: newDraftId,
    chapterId,
    parentDraftId: draftId,
    kind: "revision",
    direction,
    context: parentSnap.data().context || {},
    requestedLength: parentSnap.data().requestedLength || null,
    status: "pending",
    content: null,
    stub: true,
    created_at: ts(),
    completed_at: null,
    actor,
  };

  // TODO v1.1 — actual revision pass:
  //   1. Load parent draft content
  //   2. Build directed-edit prompt with `direction` as the instruction
  //   3. Call model
  //   4. Run voice + invariant checks on output (same gate as draftChapter)
  // For v1 the revision sits in "pending".

  await getDb().collection("creativeProjects").doc(projectId)
    .collection("drafts").doc(newDraftId).set(revisionDoc);

  await getDb().collection("creativeProjects").doc(projectId).update({
    draftCount: admin.firestore.FieldValue.increment(1),
    updated_at: ts(),
  });

  await outline.updateChapterStatus(projectId, chapterId, "revising", actor);
  await projects.recordEvent(projectId, "draft.revisionRequested", {
    draftId: newDraftId, parentDraftId: draftId, direction, stub: true,
  }, actor);

  return { ok: true, projectId, chapterId, draftId: newDraftId, parentDraftId: draftId, status: "pending", stub: true };
}

async function getDraft(projectId, draftId) {
  const snap = await getDb().collection("creativeProjects").doc(projectId)
    .collection("drafts").doc(draftId).get();
  return snap.exists ? snap.data() : null;
}

async function listDraftsForChapter(projectId, chapterId) {
  const snap = await getDb().collection("creativeProjects").doc(projectId)
    .collection("drafts")
    .where("chapterId", "==", chapterId)
    .orderBy("created_at", "asc")
    .get();
  return snap.docs.map(d => d.data());
}

module.exports = {
  draftChapter,
  revisionPass,
  getDraft,
  listDraftsForChapter,
};
