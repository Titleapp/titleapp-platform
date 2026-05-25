"use strict";

/**
 * creative/formatConverter.js — CREATIVE-001 Phase C
 *
 * Format conversion: novel → screenplay, novel → stage play, novel → KDP.
 *
 * One source-of-truth (the committed novel drafts) drives three output
 * formats. This is the composability story made concrete in a creative
 * domain.
 *
 * Output records:
 *   creativeProjects/{projectId}/outputs/{outputId}
 *     {
 *       outputId, kind, sourceChapterIds, status,
 *       artifact: { storageRef|null, mime, pageCount, format },
 *       params: <kind-specific>,
 *       stub: true,
 *       created_at, completed_at, actor,
 *     }
 *
 * kind ∈ ["screenplay", "stageplay", "kdp_interior", "kdp_cover"]
 *
 * v1: capture request shape + write output record with status=pending,
 * stub=true. Real document-generation integration is v1.1 — at that
 * point this is where we wire to the existing documentEngine/.
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

const projects = require("./projects");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const VALID_KINDS = ["screenplay", "stageplay", "kdp_interior", "kdp_cover"];
const VALID_TRIM_SIZES = ["5x8", "5.25x8", "5.5x8.5", "6x9", "6.14x9.21", "7x10"];

async function createOutput(projectId, outputDoc) {
  const outputId = `out_${crypto.randomBytes(8).toString("hex")}`;
  await getDb().collection("creativeProjects").doc(projectId)
    .collection("outputs").doc(outputId).set({
      outputId,
      ...outputDoc,
      status: "pending",
      stub: true,
      created_at: ts(),
      completed_at: null,
    });
  await getDb().collection("creativeProjects").doc(projectId).update({
    outputCount: admin.firestore.FieldValue.increment(1),
    updated_at: ts(),
  });
  return outputId;
}

/**
 * @param {object} input
 * @param {string} input.projectId
 * @param {string[]} input.sourceChapterIds
 * @param {string} [input.actor]
 */
async function adaptToScreenplay(input) {
  const { projectId, sourceChapterIds, actor = null } = input;
  if (!projectId) throw new Error("adaptToScreenplay: projectId required");
  if (!Array.isArray(sourceChapterIds) || sourceChapterIds.length === 0) {
    throw new Error("adaptToScreenplay: sourceChapterIds[] required");
  }

  // TODO v1.1 — wire to documentEngine:
  //   - Build scene heading + action + dialogue + parenthetical structure
  //   - Output .fdx (Final Draft XML) + PDF in Courier 12, 1-inch margins
  //   - WGA registration scaffold (optional)
  const outputId = await createOutput(projectId, {
    kind: "screenplay",
    sourceChapterIds,
    artifact: { storageRef: null, mime: "application/x-finaldraft", pageCount: null, format: "fdx" },
    params: { font: "Courier", fontSize: 12, sceneHeadings: true },
    actor,
  });

  await projects.recordEvent(projectId, "format.screenplay", {
    outputId, chapterCount: sourceChapterIds.length, stub: true,
  }, actor);

  return { ok: true, projectId, outputId, stub: true };
}

/**
 * @param {object} input
 * @param {string} input.projectId
 * @param {string[]} input.sourceChapterIds
 * @param {string} [input.style]            — "samuel_french" (default), "dramatists_play_service"
 */
async function adaptToStageplay(input) {
  const { projectId, sourceChapterIds, style = "samuel_french", actor = null } = input;
  if (!projectId) throw new Error("adaptToStageplay: projectId required");
  if (!Array.isArray(sourceChapterIds) || sourceChapterIds.length === 0) {
    throw new Error("adaptToStageplay: sourceChapterIds[] required");
  }

  // TODO v1.1 — wire to documentEngine:
  //   - Format act/scene structure, character cues, stage directions
  //   - Output .docx in declared style
  const outputId = await createOutput(projectId, {
    kind: "stageplay",
    sourceChapterIds,
    artifact: { storageRef: null, mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", pageCount: null, format: "docx" },
    params: { style },
    actor,
  });

  await projects.recordEvent(projectId, "format.stageplay", {
    outputId, chapterCount: sourceChapterIds.length, style, stub: true,
  }, actor);

  return { ok: true, projectId, outputId, stub: true };
}

/**
 * @param {object} input
 * @param {string} input.projectId
 * @param {string} input.trimSize           — one of VALID_TRIM_SIZES
 * @param {object} [input.frontMatter]      — { dedication, epigraph, toc: bool, copyrightPage: bool }
 * @param {string} [input.isbn]
 */
async function formatForKDP(input) {
  const { projectId, trimSize, frontMatter = {}, isbn = null, actor = null } = input;
  if (!projectId) throw new Error("formatForKDP: projectId required");
  if (!trimSize) throw new Error("formatForKDP: trimSize required");
  if (!VALID_TRIM_SIZES.includes(trimSize)) {
    throw new Error(`formatForKDP: invalid trimSize ${trimSize}. Valid: ${VALID_TRIM_SIZES.join(", ")}`);
  }

  // TODO v1.1 — wire to documentEngine:
  //   - Interior PDF: front matter, ToC, body, copyright page, ISBN
  //     insertion, proper trim size, gutter, headers/footers
  //   - Cover PDF: KDP cover template with author photo placeholder
  const interiorId = await createOutput(projectId, {
    kind: "kdp_interior",
    sourceChapterIds: [], // resolved at generation time from all committed chapters
    artifact: { storageRef: null, mime: "application/pdf", pageCount: null, format: "pdf" },
    params: { trimSize, frontMatter, isbn },
    actor,
  });

  const coverId = await createOutput(projectId, {
    kind: "kdp_cover",
    sourceChapterIds: [],
    artifact: { storageRef: null, mime: "application/pdf", pageCount: null, format: "pdf" },
    params: { trimSize },
    actor,
  });

  await projects.recordEvent(projectId, "format.kdp", {
    interiorId, coverId, trimSize, stub: true,
  }, actor);

  return { ok: true, projectId, interiorId, coverId, stub: true };
}

module.exports = {
  adaptToScreenplay,
  adaptToStageplay,
  formatForKDP,
  VALID_KINDS,
  VALID_TRIM_SIZES,
};
