"use strict";

/**
 * creative/publishing/kdp.js — CREATIVE-001 Phase D
 *
 * Amazon KDP publishing pipeline (stub).
 *
 * Amazon does NOT provide a public, stable KDP publishing API for
 * independent authors at v1 of this worker. The supported paths are:
 *
 *   1. KDP web dashboard (manual upload). Sean uploads interior PDF +
 *      cover PDF, sets metadata, categories, keywords, pricing, royalty
 *      tier, distribution rights. This is the V1 ground-truth path.
 *
 *   2. KDP Reports API (read-only sales / royalty data).
 *      docs: https://kdpreports.amazon.com (requires KDP account creds)
 *      Useful for the royalty side after launch — not for publishing
 *      itself.
 *
 *   3. Supervised browser automation (Playwright/Puppeteer running in a
 *      worker sandbox session with Sean approving each step). This is
 *      what gets us past the manual upload — but it requires the Worker
 *      Sandbox + policy gate (see CODEX 47.4 Phase C in MEMORY.md).
 *      Tracked separately.
 *
 *   4. IngramSpark API for hardback distribution — exists as a partner
 *      API, separate enrollment. Tracked separately.
 *
 * V1 of this function: capture the intended publish action as an
 * append-only event, write a "publishing/{publishId}" record with
 * status="awaiting_manual_upload", and surface the manifest Sean needs
 * to paste into the KDP dashboard.
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

const projects = require("../projects");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const VALID_PUBLISH_STATUS = [
  "awaiting_manual_upload",
  "uploaded",
  "in_review",
  "live",
  "rejected",
  "unpublished",
];

/**
 * @param {object} input
 * @param {string} input.projectId
 * @param {object} input.metadata
 * @param {string} input.metadata.title
 * @param {string} input.metadata.authorByline
 * @param {string} input.metadata.description
 * @param {string[]} input.metadata.keywords        — max 7
 * @param {string[]} input.metadata.categories      — KDP BISAC categories
 * @param {number} input.metadata.priceUSD
 * @param {string} input.metadata.trimSize
 * @param {string} [input.metadata.isbn]
 * @param {string} [input.interiorPdfRef]           — storageRef from formatConverter output
 * @param {string} [input.coverPdfRef]
 * @param {string} [input.actor]
 */
async function pushToKDP(input) {
  const { projectId, metadata, interiorPdfRef = null, coverPdfRef = null, actor = null } = input;
  if (!projectId) throw new Error("pushToKDP: projectId required");
  if (!metadata) throw new Error("pushToKDP: metadata required");

  // TODO: requires live credentials — Sean wires in env vars
  // KDP publishing API does not exist for individual authors at v1.
  // When the supervised browser automation worker lands, this function
  // delegates to it. Until then, this captures the manifest and Sean
  // pastes it into https://kdp.amazon.com manually.

  const publishId = `kdppub_${crypto.randomBytes(8).toString("hex")}`;

  const publishDoc = {
    publishId,
    projectId,
    channel: "kdp",
    metadata,
    interiorPdfRef,
    coverPdfRef,
    status: "awaiting_manual_upload",
    manualUploadUrl: "https://kdp.amazon.com/en_US/bookshelf",
    statusHistory: [{ status: "awaiting_manual_upload", at: new Date().toISOString(), actor }],
    stub: true,
    created_at: ts(),
    updated_at: ts(),
  };

  await getDb().collection("creativeProjects").doc(projectId)
    .collection("publishing").doc(publishId).set(publishDoc);

  await projects.recordEvent(projectId, "publishing.kdp.request", {
    publishId, channel: "kdp", stub: true,
  }, actor);

  return {
    ok: true,
    projectId,
    publishId,
    status: "awaiting_manual_upload",
    manualUploadUrl: publishDoc.manualUploadUrl,
    note: "KDP has no individual-author publishing API. Manual upload via KDP dashboard until supervised-browser worker lands.",
  };
}

/**
 * Sean (or supervised browser worker) calls this after a real upload
 * + KDP confirmation to flip the status. v1 manual — auto in v1.1.
 */
async function recordKdpStatus({ projectId, publishId, status, asin = null, actor = null }) {
  if (!projectId || !publishId || !status) {
    throw new Error("recordKdpStatus: projectId, publishId, status required");
  }
  if (!VALID_PUBLISH_STATUS.includes(status)) {
    throw new Error(`recordKdpStatus: invalid status ${status}`);
  }

  const ref = getDb().collection("creativeProjects").doc(projectId)
    .collection("publishing").doc(publishId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`recordKdpStatus: publish record ${publishId} not found`);

  await ref.update({
    status,
    asin,
    statusHistory: admin.firestore.FieldValue.arrayUnion({
      status, at: new Date().toISOString(), actor,
    }),
    updated_at: ts(),
  });

  await projects.recordEvent(projectId, "publishing.kdp.status", {
    publishId, status, asin,
  }, actor);

  return { ok: true };
}

module.exports = {
  pushToKDP,
  recordKdpStatus,
  VALID_PUBLISH_STATUS,
};
