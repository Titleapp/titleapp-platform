// services/signatureService/blockchain.js
// SHA-256 hash chain for signature integrity verification.
// Uses Node built-in crypto — no additional dependencies.

const crypto = require("crypto");

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Compute the pre-sign hash: captures the document state before any signatures.
 * Inputs: documentRef, sorted signer emails, creation timestamp, metadata.
 */
function computePreSignHash({ documentRef, signers, createdAt, metadata }) {
  const payload = JSON.stringify({
    documentRef: documentRef || null,
    signerEmails: (signers || []).map(s => s.email).sort(),
    createdAt: createdAt || new Date().toISOString(),
    metadata: metadata || {},
  });
  return sha256(payload);
}

/**
 * Compute a per-signer hash: chains preSignHash + all previous sign hashes
 * + signer email + sign timestamp.
 */
function computeSignHash({ preSignHash, previousSignHashes, signerEmail, signedAt }) {
  const input = [preSignHash, ...(previousSignHashes || []), signerEmail, signedAt].join("|");
  return sha256(input);
}

/**
 * Compute the final hash: chains preSignHash + all individual sign hashes.
 * Created when every signer has completed.
 */
function computeFinalHash({ preSignHash, signHashes }) {
  const input = [preSignHash, ...(signHashes || []).map(s => s.hash)].join("|");
  return sha256(input);
}

/**
 * Verify an entire hash chain by recomputing each step.
 * Returns { valid: true, hashCount } or { valid: false, brokenAt, expected, actual }.
 */
function verifyChain({ preSignHash, signHashes, finalHash }) {
  // Recompute each sign hash
  const recomputed = [];
  for (let i = 0; i < signHashes.length; i++) {
    const expected = computeSignHash({
      preSignHash,
      previousSignHashes: recomputed.map(r => r.hash),
      signerEmail: signHashes[i].signerEmail,
      signedAt: signHashes[i].signedAt,
    });
    recomputed.push({ ...signHashes[i], recomputedHash: expected });
    if (expected !== signHashes[i].hash) {
      return { valid: false, brokenAt: i, expected, actual: signHashes[i].hash };
    }
  }

  // Verify final hash
  const recomputedFinal = computeFinalHash({ preSignHash, signHashes });
  if (recomputedFinal !== finalHash) {
    return { valid: false, brokenAt: "final", expected: recomputedFinal, actual: finalHash };
  }

  return { valid: true, hashCount: signHashes.length + 2 }; // pre + signs + final
}

module.exports = {
  sha256,
  computePreSignHash,
  computeSignHash,
  computeFinalHash,
  verifyChain,
};
