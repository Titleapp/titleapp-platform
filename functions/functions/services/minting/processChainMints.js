/**
 * processChainMints.js — CODEX 50.14 Layer D async processor.
 *
 * Scheduler-driven pass that handles DTCs in chain_pending status. Each
 * pending DTC is either submitted to Crossmint (no jobId yet) or polled
 * (jobId exists) — terminal states transition the DTC's chain_anchor_status
 * to chain_confirmed or chain_failed and write blockchainProof on success.
 *
 * Picked scheduler-driven (every 2 min) over Cloud Tasks to match the
 * platform's existing async pattern (messageQueueProcessor) and avoid
 * Cloud Tasks setup overhead. Crossmint mint→confirmation is 5-30s; the
 * 2-min cadence means worst-case latency is ~2.5 min, acceptable for a
 * background record-anchoring flow that is decoupled from the chat UX.
 *
 * Idempotent: a mint that is already chain_confirmed is skipped. A
 * pending mint with a jobId is polled, not re-submitted.
 */

const admin = require("firebase-admin");
const { mintDtc, getMintStatus } = require("./crossmintMinter");

function getDb() { return admin.firestore(); }

const TERMINAL_SUCCESS = new Set(["success"]);
const TERMINAL_FAIL = new Set(["failed", "rejected"]);

async function processOne(doc) {
  const dtc = doc.data();
  const dtcId = doc.id;
  const jobId = dtc.crossmintJobId || null;

  // Submit if no jobId yet.
  if (!jobId) {
    try {
      const submit = await mintDtc({ dtcId, dtc });
      await doc.ref.update({
        crossmintJobId: submit.jobId,
        crossmintLastStatus: submit.status,
        crossmintSubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { dtcId, action: "submitted", jobId: submit.jobId };
    } catch (e) {
      console.error(`[processChainMints] submit failed for ${dtcId}:`, e.message);
      await doc.ref.update({
        chain_anchor_status: "chain_failed",
        chainFailureReason: e.message || String(e),
      });
      return { dtcId, action: "failed_submit", error: e.message };
    }
  }

  // Otherwise poll status.
  try {
    const result = await getMintStatus(jobId);
    if (TERMINAL_SUCCESS.has(result.status)) {
      await doc.ref.update({
        chain_anchor_status: "chain_confirmed",
        chain: `${result.chain || "polygon"}-mainnet`,
        crossmintLastStatus: result.status,
        blockchainProof: {
          txHash: result.txHash,
          chain: `${result.chain || "polygon"}-mainnet`,
          provider: "crossmint",
          mintedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
      return { dtcId, action: "confirmed", txHash: result.txHash };
    }
    if (TERMINAL_FAIL.has(result.status)) {
      await doc.ref.update({
        chain_anchor_status: "chain_failed",
        crossmintLastStatus: result.status,
        chainFailureReason: result.raw?.onChain?.error || result.status,
      });
      return { dtcId, action: "failed_terminal", status: result.status };
    }
    // Still pending — record the latest status for visibility.
    await doc.ref.update({ crossmintLastStatus: result.status });
    return { dtcId, action: "polling", status: result.status };
  } catch (e) {
    console.error(`[processChainMints] poll failed for ${dtcId}:`, e.message);
    // Don't transition to chain_failed on transient poll errors — leave
    // it pending and the next run retries.
    return { dtcId, action: "poll_error", error: e.message };
  }
}

async function processChainMints() {
  const db = getDb();
  const snap = await db.collection("dtcs")
    .where("chain_anchor_status", "==", "chain_pending")
    .limit(50)
    .get();

  if (snap.empty) {
    return { processed: 0, results: [] };
  }

  const results = [];
  for (const doc of snap.docs) {
    const r = await processOne(doc);
    results.push(r);
  }

  console.log(`[processChainMints] processed=${results.length}`,
    JSON.stringify(results.map(r => ({ dtcId: r.dtcId, action: r.action })))
  );
  return { processed: results.length, results };
}

module.exports = { processChainMints, processOne };
