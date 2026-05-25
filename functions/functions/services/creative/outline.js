"use strict";

/**
 * creative/outline.js — CREATIVE-001 Phase A
 *
 * Outline + chapter management for a creative project.
 *
 * The outline document is the structural backbone: parts, chapters,
 * page-count budgets, POV/voice notes per chapter. Each chapter in
 * the outline becomes a Firestore record under
 * creativeProjects/{projectId}/chapters/{chapterId}.
 *
 * Outline doc shape (passed to setOutline):
 *   {
 *     parts: [
 *       {
 *         partId: "part_i",
 *         title: "Part I — Hamilton",
 *         pageBudget: 120,
 *         voicePrimary: "Caro",
 *         voiceSecondary: ["McCarthy", "Tolstoy"],
 *         voiceNotes: "intimate literary narrator",
 *       },
 *       ...
 *     ],
 *     chapters: [
 *       {
 *         chapterId: "ch_prologue",
 *         partId: "part_i",
 *         number: 0,
 *         title: "Prologue — The Duel",
 *         pageBudget: 6,
 *         pov: "third_close_hamilton",
 *         voicePrimary: "Caro",
 *         voiceSecondary: ["Tolstoy"],
 *         summary: "Hamilton walking to Weehawken...",
 *         beats: ["humidity", "humiliation", ...],
 *         tags: ["foil_woman_absent", "system_survives_man_sentence"],
 *       },
 *       ...
 *     ],
 *   }
 *
 * The function rewrites all chapter records in one transaction — outline
 * edits are idempotent. If a chapter is removed from the outline, its
 * record is preserved (set draftStatus = "orphaned") but no longer
 * surfaced in listChapters() under the active outline.
 */

const admin = require("firebase-admin");

const projects = require("./projects");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const VALID_DRAFT_STATUS = ["unwritten", "drafting", "drafted", "revising", "locked", "orphaned"];

/**
 * Set or replace the outline for a project.
 *
 * @param {string} projectId
 * @param {object} outlineDoc — { parts: [...], chapters: [...] }
 * @param {object} [opts]
 * @param {string} [opts.tenantId]
 * @param {string} [opts.actor]
 */
async function setOutline(projectId, outlineDoc, opts = {}) {
  const { tenantId = null, actor = null } = opts;
  if (!projectId) throw new Error("setOutline: projectId required");
  if (!outlineDoc || !Array.isArray(outlineDoc.chapters)) {
    throw new Error("setOutline: outlineDoc.chapters[] required");
  }

  const project = await projects.getProject(projectId, tenantId);
  if (!project) throw new Error(`setOutline: project ${projectId} not found`);

  const db = getDb();
  const projectRef = db.collection("creativeProjects").doc(projectId);
  const chaptersRef = projectRef.collection("chapters");

  // Write the outline doc itself onto the project for cheap reads.
  await projectRef.update({
    outline: {
      parts: outlineDoc.parts || [],
      updatedAt: new Date().toISOString(),
    },
    chapterCount: outlineDoc.chapters.length,
    updated_at: ts(),
  });

  // Build a set of chapter ids in the new outline so we can mark
  // missing ones as orphaned.
  const newIds = new Set(outlineDoc.chapters.map(c => c.chapterId));

  // Mark missing chapters as orphaned (don't delete — append-only).
  const existingSnap = await chaptersRef.get();
  const batch = db.batch();
  for (const doc of existingSnap.docs) {
    if (!newIds.has(doc.id)) {
      batch.update(doc.ref, { draftStatus: "orphaned", updated_at: ts() });
    }
  }

  // Upsert each chapter record.
  for (const ch of outlineDoc.chapters) {
    if (!ch.chapterId) throw new Error("setOutline: every chapter must have a chapterId");
    const ref = chaptersRef.doc(ch.chapterId);
    const existing = await ref.get();
    const baseDoc = {
      chapterId: ch.chapterId,
      partId: ch.partId || null,
      number: typeof ch.number === "number" ? ch.number : null,
      title: ch.title || null,
      pageBudget: ch.pageBudget || null,
      pov: ch.pov || null,
      voicePrimary: ch.voicePrimary || null,
      voiceSecondary: ch.voiceSecondary || [],
      summary: ch.summary || null,
      beats: ch.beats || [],
      tags: ch.tags || [],
      updated_at: ts(),
    };
    if (!existing.exists) {
      batch.set(ref, { ...baseDoc, draftStatus: "unwritten", created_at: ts() });
    } else {
      // Don't overwrite draftStatus when re-running outline edit.
      batch.set(ref, baseDoc, { merge: true });
    }
  }

  await batch.commit();
  await projects.recordEvent(projectId, "outline.set", {
    chapterCount: outlineDoc.chapters.length,
    partCount: (outlineDoc.parts || []).length,
  }, actor);

  return { ok: true, projectId, chapterCount: outlineDoc.chapters.length };
}

async function getChapter(projectId, chapterId) {
  if (!projectId || !chapterId) throw new Error("getChapter: projectId and chapterId required");
  const snap = await getDb().collection("creativeProjects").doc(projectId)
    .collection("chapters").doc(chapterId).get();
  return snap.exists ? snap.data() : null;
}

async function listChapters(projectId, { includeOrphaned = false } = {}) {
  if (!projectId) throw new Error("listChapters: projectId required");
  let q = getDb().collection("creativeProjects").doc(projectId)
    .collection("chapters");
  const snap = await q.orderBy("number", "asc").get();
  let chapters = snap.docs.map(d => d.data());
  if (!includeOrphaned) chapters = chapters.filter(c => c.draftStatus !== "orphaned");
  return chapters;
}

/**
 * Patch a chapter (e.g., update draftStatus after a draft pass).
 * The outline itself is the source of structural truth; this is for
 * draft/revision metadata.
 */
async function updateChapterStatus(projectId, chapterId, draftStatus, actor = null) {
  if (!VALID_DRAFT_STATUS.includes(draftStatus)) {
    throw new Error(`updateChapterStatus: invalid status ${draftStatus}`);
  }
  await getDb().collection("creativeProjects").doc(projectId)
    .collection("chapters").doc(chapterId)
    .update({ draftStatus, updated_at: ts() });
  await projects.recordEvent(projectId, "chapter.status", { chapterId, draftStatus }, actor);
  return { ok: true };
}

module.exports = {
  setOutline,
  getChapter,
  listChapters,
  updateChapterStatus,
  VALID_DRAFT_STATUS,
};
