"use strict";

/**
 * instructorTenant.js — CODEX 70 Surface 2 rework, gap #2 (real billing).
 *
 * Before this file, Course Uploader course creation minted an anonymous,
 * unbilled `courseUid` off nothing but an institutional-email OTP check —
 * disconnected from the real workspace/tenant + Stripe billing mechanism
 * every other vertical uses (AddWorkspaceWizard.jsx -> POST /v1/workspaces
 * -> helpers/workspaces.js's createWorkspace(), verified live end-to-end
 * for the 'education' vertical in
 * scripts/test/educationSelfServeOnboarding.js).
 *
 * This module wires the two together: after institutional-email OTP
 * verification (instructorAuth.js), the instructor is resolved to — or
 * given — exactly ONE real 'education'-vertical tenant they own. Every
 * course they build attaches its course-tutor workerId to that ONE
 * tenant's activeWorkers array (courseSession.js), instead of the worker
 * existing only inside the anonymous, unbilled courseUid session.
 *
 * Deliberately reuses the exact same helpers/workspaces.js functions the
 * wizard's own HTTP route (POST /v1/workspaces) calls — no second, parallel
 * billing/tenant concept is introduced here.
 */

const { getUserWorkspaces, createWorkspace, addWorkerToWorkspace } = require("../../helpers/workspaces");

const EDUCATION_VERTICAL = "education";

/**
 * Find this instructor's existing education-vertical tenant, or create one.
 * One instructor -> one education tenant, regardless of how many courses
 * they build (course-tutor-001 / nursing-courses-001 are shared worker
 * slugs, not per-course — see courseSession.js).
 *
 * @param {{uid: string}} instructorUser — decoded instructor auth user (has .uid)
 * @param {{institution?: string}} [opts]
 * @returns {Promise<{tenantId: string, created: boolean}>}
 */
async function getOrCreateInstructorTenant(instructorUser, { institution } = {}) {
  const uid = instructorUser.uid;
  const existing = await getUserWorkspaces(uid);
  const existingEduWs = existing.find(
    (w) => w.vertical === EDUCATION_VERTICAL && w.type !== "shared" && w.status !== "canceled"
  );
  if (existingEduWs) {
    return { tenantId: existingEduWs.id, created: false };
  }

  const workspace = await createWorkspace(uid, {
    vertical: EDUCATION_VERTICAL,
    name: institution ? `${institution} — Courses` : "My Courses",
    tagline: "Instructor workspace — created automatically by the Course Uploader",
    jurisdiction: null,
    onboardingComplete: true,
    type: "org",
    workerIds: [],
  });
  return { tenantId: workspace.id, created: true };
}

/**
 * Attach a course's tutor worker to the instructor's real tenant so it
 * shows up in activeWorkers — the same array every other worker's billing
 * and workspace UI reads from — instead of existing only inside the
 * anonymous courseUid session. Idempotent (addWorkerToWorkspace no-ops if
 * already present); non-throwing (billing attribution is important but
 * must never block course creation itself).
 *
 * @param {{uid: string}} instructorUser
 * @param {string} tenantId
 * @param {string} workerId
 */
async function activateCourseWorkerOnTenant(instructorUser, tenantId, workerId) {
  if (!tenantId || !workerId) return null;
  try {
    return await addWorkerToWorkspace(instructorUser.uid, tenantId, workerId);
  } catch (e) {
    console.error("[instructorTenant] activateCourseWorkerOnTenant failed (non-blocking):", e.message);
    return null;
  }
}

module.exports = { getOrCreateInstructorTenant, activateCourseWorkerOnTenant, EDUCATION_VERTICAL };
