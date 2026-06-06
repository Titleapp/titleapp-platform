"use strict";

/**
 * SITE-RECON-001 — W-002 integration stub (Build Step 7)
 *
 * The real W-002 worker (spec §7 calls it "Real Estate Analyst";
 * Step 7 prompt calls it "Title Abstract" — naming reconciles in the
 * v1.2 spec pass) doesn't exist in the repo yet. This stub holds the
 * integration contract so the handoff path is real end-to-end; swap the
 * body for the live endpoint call when W-002 ships.
 */

const W002_WORKER_ID = "title-abstract-001";

async function initiateAbstract(attomBundle, userId, tenantId) {
  // TODO: replace with real W-002 endpoint call when it's built.
  return {
    jobId: `ta_${Date.now().toString(36)}_${String(userId).slice(0, 8)}`,
    status: "queued",
    estimatedCompletionMinutes: 45,
  };
}

module.exports = { initiateAbstract, W002_WORKER_ID };
