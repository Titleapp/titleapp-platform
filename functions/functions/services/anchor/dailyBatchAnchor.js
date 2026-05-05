/**
 * dailyBatchAnchor.js — daily Merkle batch + OpenTimestamps anchoring.
 *
 * CODEX 50.14 Layer B. Once per day, all DTCs with a contentHash and no
 * batchId are gathered into a Merkle tree. The Merkle root is anchored to
 * Bitcoin via OpenTimestamps (free, public, decentralized). The batch
 * document carries the root, the ordered leaves, the OTS receipt, and the
 * confirmation timestamp.
 *
 * Verification (see verify.js) re-derives the Merkle proof from the
 * batch's ordered leaves at request time — proofs are not stored per DTC
 * to keep DTC docs small.
 *
 * Failure modes:
 *   - OpenTimestamps server unreachable: write the batch doc with
 *     opentimestampsReceipt: null and a retry flag. confirmReceipts.js
 *     will pick it up later.
 *   - DTC count exceeds Firestore array limits (~20K elements): split
 *     into multiple batches per day (batchId YYYY-MM-DD-1, -2, ...). v1
 *     handles up to one batch per day; multi-batch is a Phase 2 concern.
 */

const admin = require("firebase-admin");
const { sha256 } = require("../signatureService/blockchain");

function getDb() { return admin.firestore(); }

// ── Merkle tree primitives ──────────────────────────────────────────

/**
 * Build a binary Merkle tree from an array of leaf hashes (hex strings).
 * Internal nodes: sha256(left + right) where + is hex concatenation.
 * Odd nodes at any level: hash with self (RFC 6962-style).
 * Returns { root, levels } — levels[0] is leaves, levels[N-1] is [root].
 */
function buildMerkle(leaves) {
  if (leaves.length === 0) return { root: null, levels: [] };
  if (leaves.length === 1) return { root: leaves[0], levels: [leaves] };
  const levels = [leaves.slice()];
  let current = leaves;
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = i + 1 < current.length ? current[i + 1] : current[i];
      next.push(sha256(left + right));
    }
    levels.push(next);
    current = next;
  }
  return { root: current[0], levels };
}

/**
 * Derive a Merkle proof for the leaf at `index` using the tree levels.
 * Proof is an array of { sibling, position } where position is "left"
 * or "right" indicating which side the sibling is on.
 */
function proofFor(levels, index) {
  const proof = [];
  let idx = index;
  for (let level = 0; level < levels.length - 1; level++) {
    const nodes = levels[level];
    const isRightChild = idx % 2 === 1;
    const siblingIdx = isRightChild ? idx - 1 : idx + 1;
    // Odd-count level: sibling falls back to self.
    const sibling = siblingIdx < nodes.length ? nodes[siblingIdx] : nodes[idx];
    proof.push({
      sibling,
      position: isRightChild ? "left" : "right",
    });
    idx = Math.floor(idx / 2);
  }
  return proof;
}

/**
 * Verify a proof against a known root. Returns true if leaf hashes up
 * to root via the proof.
 */
function verifyProof(leaf, proof, root) {
  let acc = leaf;
  for (const step of proof) {
    if (step.position === "left") {
      acc = sha256(step.sibling + acc);
    } else {
      acc = sha256(acc + step.sibling);
    }
  }
  return acc === root;
}

// ── OpenTimestamps integration ──────────────────────────────────────

let _ots = null;
function getOts() {
  if (_ots) return _ots;
  _ots = require("javascript-opentimestamps");
  return _ots;
}

/**
 * Submit a hex hash to OpenTimestamps. Returns base64 receipt bytes.
 * Throws if the OTS server is unreachable.
 */
async function submitToOpenTimestamps(hexHash) {
  const ots = getOts();
  const buf = Buffer.from(hexHash, "hex");
  const detached = ots.DetachedTimestampFile.fromHash(new ots.Ops.OpSHA256(), buf);
  await ots.stamp(detached);
  const bytes = detached.serializeToBytes();
  return Buffer.from(bytes).toString("base64");
}

/**
 * Upgrade a pending receipt. Returns { upgraded: bool, receiptB64: string }.
 * If upgraded === true, the receipt now contains a Bitcoin block attestation.
 */
async function upgradeOpenTimestamps(receiptB64) {
  const ots = getOts();
  const buf = Buffer.from(receiptB64, "base64");
  const detached = ots.DetachedTimestampFile.deserialize(buf);
  const changed = await ots.upgrade(detached);
  return {
    upgraded: !!changed,
    receiptB64: Buffer.from(detached.serializeToBytes()).toString("base64"),
  };
}

// ── Daily batch close ───────────────────────────────────────────────

/**
 * Run the daily batch close. Idempotent — running twice on the same day
 * is a no-op the second time (DTCs already in a batch are skipped).
 *
 * Returns { batchId, dtcCount, merkleRoot } or null if no DTCs to anchor.
 */
async function runDailyBatch(dateOverride) {
  const db = getDb();
  const date = dateOverride || new Date();
  const batchId = date.toISOString().slice(0, 10); // YYYY-MM-DD

  // Skip if today's batch already exists.
  const existingBatch = await db.collection("dtcAnchorBatches").doc(batchId).get();
  if (existingBatch.exists) {
    console.log(`[dailyBatchAnchor] batch ${batchId} already exists — skipping`);
    return null;
  }

  // Pull all DTCs that have a contentHash and no batchId yet.
  const snap = await db.collection("dtcs")
    .where("batchId", "==", null)
    .get();
  const ready = snap.docs.filter(d => {
    const hash = d.data().contentHash;
    return typeof hash === "string" && hash.length === 64;
  });

  if (ready.length === 0) {
    console.log(`[dailyBatchAnchor] no DTCs ready for batch ${batchId}`);
    return null;
  }

  // Sort by createdAt then by id for deterministic ordering.
  ready.sort((a, b) => {
    const aT = a.data().createdAt?.toMillis?.() || 0;
    const bT = b.data().createdAt?.toMillis?.() || 0;
    if (aT !== bT) return aT - bT;
    return a.id.localeCompare(b.id);
  });

  const leaves = ready.map(d => d.data().contentHash);
  const dtcIds = ready.map(d => d.id);
  const { root } = buildMerkle(leaves);

  // Submit to OpenTimestamps. If it fails, write batch with null receipt
  // and let confirmReceipts.js retry the submit on its next run.
  let receiptB64 = null;
  let receiptError = null;
  try {
    receiptB64 = await submitToOpenTimestamps(root);
  } catch (e) {
    receiptError = e.message || String(e);
    console.error(`[dailyBatchAnchor] OTS submit failed for batch ${batchId}: ${receiptError}`);
  }

  // Write the batch doc.
  await db.collection("dtcAnchorBatches").doc(batchId).set({
    batchId,
    merkleRoot: root,
    leaves,
    dtcIds,
    dtcCount: ready.length,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    opentimestampsReceipt: receiptB64,
    opentimestampsSubmittedAt: receiptB64
      ? admin.firestore.FieldValue.serverTimestamp()
      : null,
    opentimestampsConfirmedAt: null,
    opentimestampsError: receiptError,
  });

  // Update each DTC with its batchId.
  const batch = db.batch();
  for (const doc of ready) {
    batch.update(doc.ref, { batchId });
  }
  await batch.commit();

  console.log(`[dailyBatchAnchor] batch ${batchId}: ${ready.length} DTCs, root=${root.slice(0, 16)}...`);
  return { batchId, dtcCount: ready.length, merkleRoot: root };
}

module.exports = {
  buildMerkle,
  proofFor,
  verifyProof,
  submitToOpenTimestamps,
  upgradeOpenTimestamps,
  runDailyBatch,
};
