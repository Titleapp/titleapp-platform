/**
 * verify.js — public DTC verification endpoint.
 *
 * GET /v1/dtc/:dtcId/verify
 *
 * Returns the contentHash, the Merkle proof reconstructed from the batch
 * leaves, the OpenTimestamps receipt, and the chain anchor status. Public
 * — no auth required. The point is verifiability without TitleApp's
 * cooperation; the proof is self-contained.
 *
 * The caller can verify offline:
 *   1. Hash the DTC document via the canonical serialization → contentHash
 *      (or trust the contentHash stored on the doc).
 *   2. Walk the Merkle proof: each step combines the running hash with
 *      the sibling at the indicated position, recomputing parent =
 *      sha256(left + right). Final value must equal merkleRoot.
 *   3. Verify the OpenTimestamps receipt against Bitcoin via the
 *      OpenTimestamps client or web verifier. Once confirmed, the
 *      merkleRoot is provably anchored to a specific Bitcoin block.
 */

const admin = require("firebase-admin");
const { buildMerkle, proofFor } = require("./dailyBatchAnchor");

function getDb() { return admin.firestore(); }

async function verifyDtc(req, res) {
  const dtcId = req.params?.dtcId || req.query?.dtcId;
  if (!dtcId) {
    return res.status(400).json({ ok: false, error: "missing dtcId" });
  }

  const db = getDb();
  const dtcDoc = await db.collection("dtcs").doc(dtcId).get();
  if (!dtcDoc.exists) {
    return res.status(404).json({ ok: false, error: "DTC not found" });
  }
  const dtc = dtcDoc.data();

  // Always return the chain anchor status (independent of hash anchor).
  const chainBlock = {
    chain: dtc.chain || null,
    chainStatus: dtc.chain_anchor_status || "hash_only",
    chainTxHash: dtc.blockchainProof?.txHash || null,
  };

  // No content hash yet — DTC was created before the hash anchor service
  // ran or the backfill hasn't reached it.
  if (!dtc.contentHash) {
    return res.json({
      ok: true,
      dtcId,
      contentHash: null,
      hashAnchorStatus: "pending_compute",
      ...chainBlock,
    });
  }

  // Not in a batch yet — content hashed but next batch hasn't run.
  if (!dtc.batchId) {
    return res.json({
      ok: true,
      dtcId,
      contentHash: dtc.contentHash,
      hashAnchorStatus: "pending_batch",
      ...chainBlock,
    });
  }

  // Pull the batch and reconstruct the Merkle proof.
  const batchDoc = await db.collection("dtcAnchorBatches").doc(dtc.batchId).get();
  if (!batchDoc.exists) {
    return res.status(500).json({
      ok: false,
      error: `batch ${dtc.batchId} referenced by DTC but not found`,
    });
  }
  const batch = batchDoc.data();
  const idx = batch.leaves.indexOf(dtc.contentHash);
  if (idx < 0) {
    return res.status(500).json({
      ok: false,
      error: "DTC contentHash not present in batch leaves (data integrity issue)",
    });
  }

  // Reconstruct the tree to derive the proof. (Cheap: same SHA-256 work
  // as the original batch close, runs in milliseconds for typical batch
  // sizes.)
  const { levels } = buildMerkle(batch.leaves);
  const proof = proofFor(levels, idx);

  return res.json({
    ok: true,
    dtcId,
    contentHash: dtc.contentHash,
    merkleRoot: batch.merkleRoot,
    merkleProof: proof,
    leafIndex: idx,
    batchId: batch.batchId,
    opentimestampsReceipt: batch.opentimestampsReceipt,
    opentimestampsStatus: batch.opentimestampsConfirmedAt ? "confirmed" : "pending",
    opentimestampsConfirmedAt: batch.opentimestampsConfirmedAt
      ? batch.opentimestampsConfirmedAt.toDate?.().toISOString() || null
      : null,
    hashAnchorStatus: batch.opentimestampsConfirmedAt ? "anchored" : "pending_bitcoin",
    ...chainBlock,
  });
}

module.exports = { verifyDtc };
