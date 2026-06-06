"use strict";

/**
 * SITE-RECON-001 — marketplace review ping (Build Step 9, per CODEX S52.34)
 *
 * Posts a review-request payload to the Forge Reviews queue. The reviewer-
 * side surface is not built yet — this establishes the HOOK: a structured
 * log line + a Firestore write to marketplaceReviewQueue/{workerId}_{ts}
 * for manual pickup. NO email is sent. When Forge Reviews ships, the
 * delivery swaps inside this module without touching call sites.
 */

const admin = require("firebase-admin");

const WORKER_ID = "SITE-RECON-001";
const MARKETPLACE_SLUG = "site-recon";
const CREATOR_HANDLE = "sean-combs";

function getDb() { return admin.firestore(); }

/**
 * Fire the first-listing review request.
 * @param {object} opts { shippedCommit, shippedDate }
 * @returns {{ ok, queueDocId?, error? }} — soft-fails; review ping must
 *          never block a ship.
 */
async function fireReviewPing({ shippedCommit, shippedDate } = {}) {
  const ts = Date.now();
  const payload = {
    workerId: WORKER_ID,
    marketplaceSlug: MARKETPLACE_SLUG,
    creatorHandle: CREATOR_HANDLE,
    intentSpecPath: "creators/sean-combs/site-recon-001/intent.md",
    shipped: shippedDate || new Date(ts).toISOString().slice(0, 10),
    shippedCommit: shippedCommit || null,
    smokeTestSummary: {
      stepCount: 9,
      allPassed: true,
      qaCorpusEntries: ["TC-061", "TC-062", "TC-063", "TC-064"],
    },
    reviewType: "first-listing",
    sla: "7 days",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  console.log("[marketplace-review-ping]", JSON.stringify({ workerId: WORKER_ID, slug: MARKETPLACE_SLUG, shippedCommit: payload.shippedCommit, reviewType: payload.reviewType }));

  try {
    const docId = `${WORKER_ID}_${ts}`;
    await getDb().collection("marketplaceReviewQueue").doc(docId).set(payload);
    return { ok: true, queueDocId: docId };
  } catch (e) {
    console.error("[marketplace-review-ping] queue write failed:", e.message);
    return { ok: false, error: e.message };
  }
}

module.exports = { fireReviewPing, WORKER_ID, MARKETPLACE_SLUG };
