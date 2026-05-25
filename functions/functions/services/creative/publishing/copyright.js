"use strict";

/**
 * creative/publishing/copyright.js — CREATIVE-001 Phase D
 *
 * US Copyright Office TX form scaffolding + DTC mint for manuscript.
 *
 * Two artifacts produced:
 *   1. A structured fill payload matching the US Copyright Office form
 *      TX (literary works) — Sean uses this to file at copyright.gov.
 *      The form fields are the standard TX fields.
 *   2. A DTC (Digital Title Certificate) for the manuscript, anchoring
 *      authorship date on the SOCIII chain via the existing anchor
 *      service. Even before the gov filing clears, the DTC is an
 *      append-only record of when the work existed.
 *
 * Firestore:
 *   creativeProjects/{projectId}/copyright/{copyrightId}
 *
 * Note: The chain-anchor side intentionally only writes the metadata
 * record at v1. The actual blockchain mint uses
 * dtc.mint_dtc_polygon_crossmint_v1 — same capability as every other
 * DTC on the platform. The hand-off pattern below mirrors the existing
 * Crossmint flow used by anchor/.
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

const projects = require("../projects");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

/**
 * @param {object} input
 * @param {string} input.projectId
 * @param {object} [input.applicant]              — { name, address, country }
 * @param {object} [input.workInfo]               — { title, year_of_completion, alternative_titles }
 * @param {object} [input.authorshipClaim]        — { authorName, byline, contribution }
 * @param {string} [input.manuscriptStorageRef]   — Vault ref to the finalized manuscript PDF/docx
 * @param {string} [input.actor]
 */
async function registerCopyright(input) {
  const {
    projectId,
    applicant = null,
    workInfo = null,
    authorshipClaim = null,
    manuscriptStorageRef = null,
    actor = null,
  } = input;
  if (!projectId) throw new Error("registerCopyright: projectId required");

  const project = await projects.getProject(projectId);
  if (!project) throw new Error(`registerCopyright: project ${projectId} not found`);

  const copyrightId = `cpy_${crypto.randomBytes(8).toString("hex")}`;

  // Build the TX-form-shaped fill payload. Field names match the
  // copyright.gov "Standard Application" for a literary work (Form TX
  // online equivalent). Sean (or a future supervised-browser worker)
  // pastes these into the eCO portal at copyright.gov.
  const txFormFill = {
    type_of_work: "Literary Work",
    title_of_work: (workInfo && workInfo.title) || project.title,
    alternative_titles: (workInfo && workInfo.alternative_titles) || [],
    year_of_completion: (workInfo && workInfo.year_of_completion) || new Date().getFullYear(),
    nation_of_first_publication: "United States",
    author_information: {
      name: (authorshipClaim && authorshipClaim.authorName) || project.authorByline || null,
      nationality_or_domicile: null,
      author_was_made_for_hire: false,
      author_anonymous: false,
      author_pseudonymous: !!project.authorByline && !!project.ghostProjectLead,
      pseudonym: project.authorByline || null,
      authorship_contribution: (authorshipClaim && authorshipClaim.contribution) || "Text of the entire work",
    },
    claimant: applicant || null,
    rights_and_permissions: {
      name: applicant ? applicant.name : null,
      email: null,
      address: applicant ? applicant.address : null,
    },
    deposit: {
      manuscriptStorageRef,
      deposit_format: "electronic_pdf",
    },
    certification: {
      name: applicant ? applicant.name : null,
      capacity: "author_or_authorized_agent",
    },
  };

  const copyrightDoc = {
    copyrightId,
    projectId,
    status: "pending_filing",
    txFormFill,
    filing: {
      filedAt: null,
      serviceRequestId: null,
      certificateNumber: null,
      effectiveDate: null,
    },
    dtc: {
      anchorRequested: false,
      dtcId: null,
      mintStatus: null,
    },
    stub: true,
    created_at: ts(),
    updated_at: ts(),
  };

  await getDb().collection("creativeProjects").doc(projectId)
    .collection("copyright").doc(copyrightId).set(copyrightDoc);

  // DTC mint hand-off. Mirrors the existing pattern used by anchor/.
  // The anchor service is the source of truth for the on-chain action;
  // here we just request it. The dtc.mint_dtc_polygon_crossmint_v1
  // capability is what executes the mint.
  let anchor;
  try {
    anchor = require("../../anchor/hashAnchor");
  } catch (_) {
    anchor = null;
  }

  if (anchor && typeof anchor.requestAnchorForCreativeWork === "function") {
    // If the anchor service grows a creative-specific entrypoint later,
    // wire it here. Until then, leave the dtc.anchorRequested=false so
    // Sean can drive it manually.
    try {
      const res = await anchor.requestAnchorForCreativeWork({
        projectId,
        copyrightId,
        manuscriptStorageRef,
        actor,
      });
      await getDb().collection("creativeProjects").doc(projectId)
        .collection("copyright").doc(copyrightId).update({
          "dtc.anchorRequested": true,
          "dtc.dtcId": res.dtcId || null,
          "dtc.mintStatus": "pending",
          updated_at: ts(),
        });
    } catch (_) {
      // Non-fatal — anchor service may not yet have the creative hook.
    }
  }
  // TODO v1.1: when anchor/hashAnchor exposes requestAnchorForCreativeWork,
  // the above try-block becomes the canonical mint path. Until then, Sean
  // can call dtc:create directly with metadata pointing at the manuscriptStorageRef.

  await projects.recordEvent(projectId, "copyright.register", {
    copyrightId, stub: true,
  }, actor);

  return {
    ok: true,
    projectId,
    copyrightId,
    txFormFill,
    note: "Form TX fill payload generated. Sean files at copyright.gov eCO portal. DTC mint requested through anchor service if available.",
  };
}

async function getCopyrightRecord(projectId, copyrightId) {
  const snap = await getDb().collection("creativeProjects").doc(projectId)
    .collection("copyright").doc(copyrightId).get();
  return snap.exists ? snap.data() : null;
}

/**
 * Sean records the gov filing after submission at copyright.gov.
 */
async function recordFiling({ projectId, copyrightId, serviceRequestId, certificateNumber = null, effectiveDate = null, actor = null }) {
  if (!projectId || !copyrightId || !serviceRequestId) {
    throw new Error("recordFiling: projectId, copyrightId, serviceRequestId required");
  }
  await getDb().collection("creativeProjects").doc(projectId)
    .collection("copyright").doc(copyrightId).update({
      status: certificateNumber ? "registered" : "filed",
      "filing.filedAt": ts(),
      "filing.serviceRequestId": serviceRequestId,
      "filing.certificateNumber": certificateNumber,
      "filing.effectiveDate": effectiveDate ? admin.firestore.Timestamp.fromDate(new Date(effectiveDate)) : null,
      updated_at: ts(),
    });
  await projects.recordEvent(projectId, "copyright.filing", {
    copyrightId, serviceRequestId, certificateNumber,
  }, actor);
  return { ok: true };
}

module.exports = {
  registerCopyright,
  getCopyrightRecord,
  recordFiling,
};
