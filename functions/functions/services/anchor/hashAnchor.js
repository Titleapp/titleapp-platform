/**
 * hashAnchor.js — per-DTC content hashing.
 *
 * CODEX 50.14 Layer A. Every DTC gets a SHA-256 contentHash over a stable
 * canonical serialization at creation time. The contentHash is the leaf
 * input to the daily Merkle batch (see dailyBatchAnchor.js) which anchors
 * to Bitcoin via OpenTimestamps.
 *
 * Reuses the SHA-256 helper from signatureService/blockchain.js — the
 * platform's existing tamper-evidence primitive.
 *
 * Canonical fields (stable key order, exclude server-only and
 * post-creation fields):
 *   userId, tenantId, type, metadata, fileIds, version, createdAt
 *
 * Excluded fields and rationale:
 *   contentHash         — the field we are computing; including it is circular.
 *   blockchainProof     — populated post-creation by the chain mint flow.
 *   chain_anchor_status — state machine; mutates over time.
 *   chain               — populated post-creation by the chain mint flow.
 *   parent_dtc_id       — null in v1; v1.1 chained-DTC refactor will revisit.
 *   modification_authority — governance metadata, not record content.
 *   credentialing_projection_schema — projection wiring, not record content.
 *   batchId             — populated by the daily batch job.
 *   logbookCount        — derived counter, not part of canonical record.
 *
 * The hash is computed over the *content* the user authored. Governance
 * and post-creation state lives outside the hash so the record can have
 * its chain status and modification authority updated without breaking
 * tamper-evidence.
 */

const { sha256 } = require("../signatureService/blockchain");

const CANONICAL_FIELDS = ["createdAt", "fileIds", "metadata", "tenantId", "type", "userId", "version"];

function canonicalize(dtc) {
  // Stable key order (alphabetical). Drop undefined/null distinction:
  // null values participate; undefined values are omitted.
  const obj = {};
  for (const k of CANONICAL_FIELDS) {
    if (dtc[k] !== undefined) obj[k] = dtc[k];
  }
  return JSON.stringify(obj);
}

function contentHash(dtc) {
  return sha256(canonicalize(dtc));
}

module.exports = { canonicalize, contentHash, CANONICAL_FIELDS };
