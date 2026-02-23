const crypto = require("crypto");
const admin = require("firebase-admin");

function getDb() {
  return admin.firestore();
}

/**
 * Compute a SHA-256 hash of arbitrary data, prefixed with "sha256:".
 */
function computeHash(data) {
  return (
    "sha256:" +
    crypto
      .createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex")
  );
}

/**
 * Mint a title record for a Worker. Phase 1: stub (mock tx hashes).
 * Phase 2 will replace the mock with actual Venly API calls.
 *
 * @param {string} tenantId
 * @param {string} workerId
 * @param {object} workerData - { name, description, capabilities, rules, authorName, createdAt }
 * @param {string} memo - optional memo for this version
 * @returns {object} title record with tx_hash, metadata_hash, etc.
 */
async function mintTitleRecord(tenantId, workerId, workerData, memo = "") {
  const db = getDb();

  // Get existing title records to determine version
  const existingRecords = await db
    .collection(`tenants/${tenantId}/workers/${workerId}/titleRecords`)
    .orderBy("version", "desc")
    .limit(1)
    .get();

  const previousVersion = existingRecords.empty
    ? null
    : existingRecords.docs[0].data();
  const version = previousVersion ? previousVersion.version + 1 : 1;

  // Compute hashes
  const rulesHash = computeHash(workerData.rules || []);
  const metadataHash = computeHash({
    worker_id: workerId,
    name: workerData.name,
    description: workerData.description,
    capabilities: workerData.capabilities || [],
    rules_hash: rulesHash,
    created_at: workerData.createdAt || new Date().toISOString(),
    version,
  });

  // Phase 1: Mock transaction (replace with Venly API call in Phase 2)
  const mockTxHash = "0x" + crypto.randomBytes(32).toString("hex");
  const mockTokenId = Math.floor(Math.random() * 1000000).toString();

  const titleRecord = {
    version,
    txHash: mockTxHash,
    chain: "polygon",
    tokenId: mockTokenId,
    mintedAt: admin.firestore.FieldValue.serverTimestamp(),
    metadataHash,
    rulesHash,
    memo,
    previousVersionTx: previousVersion ? previousVersion.txHash : null,
    status: "minted",
    _mintMethod: "stub", // Remove when Venly is wired up
  };

  // Store in per-worker subcollection
  const recordRef = await db
    .collection(`tenants/${tenantId}/workers/${workerId}/titleRecords`)
    .add(titleRecord);

  // Also store in top-level collection for public lookups
  await db
    .collection("titleRecords")
    .doc(recordRef.id)
    .set({
      ...titleRecord,
      mintedAt: new Date().toISOString(), // plain string for top-level (no serverTimestamp outside transaction)
      tenantId,
      workerId,
      workerName: workerData.name || "",
      workerDescription: workerData.description || "",
      authorName: workerData.authorName || "",
    });

  // Update the Worker document with latest title info
  await db.doc(`tenants/${tenantId}/workers/${workerId}`).update({
    latestTitleRecord: {
      recordId: recordRef.id,
      version,
      txHash: mockTxHash,
      metadataHash,
      mintedAt: new Date().toISOString(),
    },
    titled: true,
  });

  return {
    record_id: recordRef.id,
    status: "minted",
    tx_hash: mockTxHash,
    chain: "polygon",
    token_id: mockTokenId,
    record_url: `https://titleapp.ai/title/${recordRef.id}`,
    minted_at: new Date().toISOString(),
    version,
    metadata_hash: metadataHash,
    rules_hash: rulesHash,
    previous_version_tx: previousVersion ? previousVersion.txHash : null,
    polygonscan_url: `https://polygonscan.com/tx/${mockTxHash}`,
  };
}

module.exports = { mintTitleRecord, computeHash };
