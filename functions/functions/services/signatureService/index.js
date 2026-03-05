// services/signatureService/index.js
// Universal Signature & Countersign Framework — Tier 0 platform service.
// Any Digital Worker can call this for signing, verification, and delegation.
// Follows documentEngine/index.js pattern: lazy-loads submodules, exports public functions.

const crypto = require("crypto");

// Lazy-load submodules to minimize cold-start impact
let _hellosign, _blockchain, _storage;

function getHelloSign() {
  if (!_hellosign) _hellosign = require("./hellosign");
  return _hellosign;
}
function getBlockchain() {
  if (!_blockchain) _blockchain = require("./blockchain");
  return _blockchain;
}
function getStorage() {
  if (!_storage) _storage = require("./storage");
  return _storage;
}

/**
 * Create a new signature request.
 * Tries HelloSign embedded signing first; falls back to typed consent.
 * Computes a blockchain pre-sign hash and writes to Firestore.
 */
async function createRequest({
  tenantId,
  userId,
  title,
  subject,
  message,
  signers,
  documentType,
  vertical,
  metadata,
  documentRef,
  expiresInHours,
}) {
  try {
    const requestId = "sig_" + crypto.randomUUID().replace(/-/g, "");
    const createdAt = new Date().toISOString();
    const expiresAt = expiresInHours
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
      : null;

    // Attempt HelloSign embedded request
    const hellosign = getHelloSign();
    const blockchain = getBlockchain();
    const storage = getStorage();

    let method = "typed_consent";
    let hellosignRequestId = null;
    let signUrls = {};

    const hsResult = await hellosign.createEmbeddedRequest({
      title: title || "Signature Request",
      subject: subject || title || "Please sign this document",
      message: message || "Please review and sign.",
      signers: (signers || []).map((s, i) => ({
        email: s.email,
        name: s.name,
        order: s.order != null ? s.order : i,
      })),
      metadata: {
        ...(metadata || {}),
        signatureServiceRequestId: requestId,
      },
      testMode: process.env.HELLOSIGN_TEST_MODE !== "0",
    }).catch(err => {
      console.error("HelloSign createEmbeddedRequest failed, falling back to typed consent:", err.message);
      return null;
    });

    if (hsResult) {
      method = "hellosign";
      hellosignRequestId = hsResult.signatureRequestId;
      signUrls = hsResult.signUrls || {};

      // Augment signers with HelloSign signature IDs
      for (const hsSig of (hsResult.signatures || [])) {
        const match = (signers || []).find(s => s.email === hsSig.signer_email_address);
        if (match) {
          match.hellosignSignatureId = hsSig.signature_id;
        }
      }
    }

    // Compute pre-sign hash
    const preSignHash = blockchain.computePreSignHash({
      documentRef,
      signers: signers || [],
      createdAt,
      metadata: metadata || {},
    });

    // Normalize signers with status
    const normalizedSigners = (signers || []).map((s, i) => ({
      email: s.email,
      name: s.name,
      userId: s.userId || null,
      role: s.role || "signer",
      order: s.order != null ? s.order : i,
      status: "pending",
      hellosignSignatureId: s.hellosignSignatureId || null,
      signedAt: null,
      signHash: null,
    }));

    // Write to Firestore
    await storage.createSignatureRequest({
      requestId,
      tenantId,
      userId,
      title,
      subject,
      message,
      signers: normalizedSigners,
      documentType: documentType || null,
      vertical: vertical || null,
      metadata: metadata || {},
      documentRef: documentRef || null,
      method,
      hellosignRequestId,
      preSignHash,
      status: "pending",
      expiresAt,
    });

    // Audit: request created
    await storage.logAudit({
      requestId,
      tenantId,
      userId,
      action: "created",
      details: {
        method,
        signerCount: normalizedSigners.length,
        documentType: documentType || null,
        vertical: vertical || null,
      },
    });

    return {
      ok: true,
      requestId,
      method,
      signUrls,
      preSignHash,
      expiresAt,
    };
  } catch (e) {
    console.error("signatureService.createRequest failed:", e);
    return { ok: false, error: e.message || "Failed to create signature request" };
  }
}

/**
 * Get the full status of a signature request.
 */
async function getStatus({ tenantId, requestId }) {
  try {
    const storage = getStorage();
    const request = await storage.getSignatureRequest(tenantId, requestId);
    if (!request) {
      return { ok: false, error: "not_found" };
    }
    return { ok: true, request };
  } catch (e) {
    console.error("signatureService.getStatus failed:", e);
    return { ok: false, error: e.message || "Failed to get signature status" };
  }
}

/**
 * Add a countersignature — get sign URL for the next pending signer.
 * Supports delegation: if the user is not a direct signer, checks for
 * an active delegation from the actual signer.
 */
async function addCountersign({ tenantId, userId, requestId }) {
  try {
    const storage = getStorage();
    const hellosign = getHelloSign();

    const request = await storage.getSignatureRequest(tenantId, requestId);
    if (!request) {
      return { ok: false, error: "not_found" };
    }

    // Find the next pending signer matching this userId (or with a delegation)
    let targetSigner = null;
    for (const signer of (request.signers || [])) {
      if (signer.status !== "pending") continue;
      if (signer.userId === userId) {
        targetSigner = signer;
        break;
      }
    }

    // Check delegations if no direct match
    if (!targetSigner) {
      const delegations = await storage.getDelegation(tenantId, userId, null);
      if (delegations.length > 0) {
        for (const signer of (request.signers || [])) {
          if (signer.status !== "pending") continue;
          const hasDelegation = delegations.some(d =>
            d.grantedBy === signer.userId &&
            d.active &&
            (!d.expiresAt || new Date(d.expiresAt) > new Date())
          );
          if (hasDelegation) {
            targetSigner = signer;
            break;
          }
        }
      }
    }

    if (!targetSigner) {
      return { ok: false, error: "no_pending_signature_for_user" };
    }

    let signUrl = null;
    let method = request.method;

    // Get sign URL from HelloSign if applicable
    if (method === "hellosign" && targetSigner.hellosignSignatureId) {
      signUrl = await hellosign.getEmbedSignUrl(targetSigner.hellosignSignatureId);
    }

    return {
      ok: true,
      signUrl,
      method,
      signerEmail: targetSigner.email,
      signerName: targetSigner.name,
    };
  } catch (e) {
    console.error("signatureService.addCountersign failed:", e);
    return { ok: false, error: e.message || "Failed to add countersignature" };
  }
}

/**
 * Verify the blockchain hash chain for a signature request.
 */
async function verify({ tenantId, requestId }) {
  try {
    const storage = getStorage();
    const blockchain = getBlockchain();

    const request = await storage.getSignatureRequest(tenantId, requestId);
    if (!request) {
      return { ok: false, error: "not_found" };
    }

    const bc = request.blockchain || {};
    if (!bc.preSignHash) {
      return { ok: false, error: "no_blockchain_data" };
    }

    // Only verify if there are sign hashes to check
    if (!bc.signHashes || bc.signHashes.length === 0) {
      return {
        ok: true,
        valid: true,
        status: request.status,
        message: "No signatures to verify yet",
        preSignHash: bc.preSignHash,
      };
    }

    const result = blockchain.verifyChain({
      preSignHash: bc.preSignHash,
      signHashes: bc.signHashes,
      finalHash: bc.finalHash,
    });

    return {
      ok: true,
      valid: result.valid,
      status: request.status,
      hashCount: result.hashCount || null,
      brokenAt: result.brokenAt || null,
      preSignHash: bc.preSignHash,
      finalHash: bc.finalHash || null,
    };
  } catch (e) {
    console.error("signatureService.verify failed:", e);
    return { ok: false, error: e.message || "Verification failed" };
  }
}

/**
 * Get all pending signatures for a user, with computed urgency.
 * urgency: "critical" (< 4hrs), "urgent" (< 48hrs), "normal"
 */
async function getPending({ tenantId, userId }) {
  try {
    const storage = getStorage();
    const pending = await storage.getPendingForUser(tenantId, userId);

    const now = Date.now();
    const enriched = pending.map(p => {
      let urgency = "normal";
      if (p.expiresAt) {
        const expiresMs = typeof p.expiresAt === "string"
          ? new Date(p.expiresAt).getTime()
          : (p.expiresAt.toDate ? p.expiresAt.toDate().getTime() : now + 999999999);
        const hoursLeft = (expiresMs - now) / (1000 * 60 * 60);
        if (hoursLeft < 4) urgency = "critical";
        else if (hoursLeft < 48) urgency = "urgent";
      }
      return { ...p, urgency };
    });

    return { ok: true, pending: enriched };
  } catch (e) {
    console.error("signatureService.getPending failed:", e);
    return { ok: false, error: e.message || "Failed to get pending signatures" };
  }
}

/**
 * Create a signing authority delegation.
 */
async function delegate({ tenantId, grantedBy, grantedTo, scope, scopeValue, expiresInDays }) {
  try {
    const storage = getStorage();
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const result = await storage.createDelegation({
      tenantId,
      grantedBy,
      grantedTo,
      scope: scope || "all",
      scopeValue: scopeValue || null,
      expiresAt,
    });

    await storage.logAudit({
      tenantId,
      userId: grantedBy,
      action: "delegation_created",
      details: {
        delegationId: result.delegationId,
        grantedTo,
        scope: scope || "all",
        scopeValue: scopeValue || null,
        expiresInDays: expiresInDays || null,
      },
    });

    return { ok: true, delegationId: result.delegationId, expiresAt };
  } catch (e) {
    console.error("signatureService.delegate failed:", e);
    return { ok: false, error: e.message || "Failed to create delegation" };
  }
}

/**
 * Revoke a signing authority delegation.
 */
async function revoke({ tenantId, userId, delegationId }) {
  try {
    const storage = getStorage();
    const result = await storage.revokeDelegation(delegationId, userId);

    if (!result.ok) {
      return result;
    }

    await storage.logAudit({
      tenantId,
      userId,
      action: "delegation_revoked",
      details: { delegationId },
    });

    return { ok: true };
  } catch (e) {
    console.error("signatureService.revoke failed:", e);
    return { ok: false, error: e.message || "Failed to revoke delegation" };
  }
}

/**
 * Get the full audit trail for a signature request.
 */
async function getAudit({ tenantId, requestId }) {
  try {
    const storage = getStorage();

    // Verify tenant owns this request
    const request = await storage.getSignatureRequest(tenantId, requestId);
    if (!request) {
      return { ok: false, error: "not_found" };
    }

    const trail = await storage.getAuditTrail(requestId);
    return { ok: true, audit: trail };
  } catch (e) {
    console.error("signatureService.getAudit failed:", e);
    return { ok: false, error: e.message || "Failed to get audit trail" };
  }
}

/**
 * Handle a HelloSign webhook event for the universal signature service.
 * Routes events to update signer statuses, compute hashes, and manage pending entries.
 */
async function handleWebhookEvent({ event }) {
  const storage = getStorage();
  const blockchain = getBlockchain();

  const eventType = event.event_type;
  const signatureRequest = event.signature_request;

  if (!signatureRequest) {
    console.log("signatureService webhook: no signature_request in event");
    return;
  }

  const metadata = signatureRequest.metadata || {};
  const requestId = metadata.signatureServiceRequestId;

  if (!requestId) {
    console.log("signatureService webhook: no signatureServiceRequestId in metadata");
    return;
  }

  // Load the request — we need tenantId but cannot filter by tenant in a webhook
  const admin = require("firebase-admin");
  const db = admin.firestore();
  const snap = await db.collection("signatureRequests").doc(requestId).get();
  if (!snap.exists) {
    console.error("signatureService webhook: request not found:", requestId);
    return;
  }
  const request = snap.data();

  switch (eventType) {
    case "signature_request_signed": {
      // A single signer completed — find who signed
      const hsSigs = signatureRequest.signatures || [];
      for (const hsSig of hsSigs) {
        if (hsSig.status_code !== "signed") continue;

        const signerEmail = hsSig.signer_email_address;
        const matchingSigner = (request.signers || []).find(
          s => s.email === signerEmail && s.status === "pending"
        );

        if (!matchingSigner) continue;

        const signedAt = hsSig.signed_at || new Date().toISOString();

        // Compute sign hash (chained with previous)
        const previousSignHashes = (request.blockchain?.signHashes || []).map(h => h.hash);
        const signHash = blockchain.computeSignHash({
          preSignHash: request.blockchain?.preSignHash,
          previousSignHashes,
          signerEmail,
          signedAt,
        });

        // Update signer status
        await storage.updateSignerStatus(requestId, signerEmail, {
          status: "signed",
          signedAt,
          signHash,
        });

        // Append to blockchain signHashes
        const updatedSignHashes = [
          ...(request.blockchain?.signHashes || []),
          { signerEmail, signedAt, hash: signHash },
        ];
        await storage.updateRequestStatus(requestId, {
          "blockchain.signHashes": updatedSignHashes,
        });

        // Remove from pending signatures
        if (matchingSigner.userId) {
          await storage.removePendingSignature(matchingSigner.userId, requestId);
        }

        await storage.logAudit({
          requestId,
          tenantId: request.tenantId,
          action: "signer_completed",
          details: { signerEmail, signHash },
        });
      }
      break;
    }

    case "signature_request_all_signed": {
      // All signers completed — compute final hash
      // Reload to get updated signHashes
      const refreshSnap = await db.collection("signatureRequests").doc(requestId).get();
      const refreshed = refreshSnap.data();
      const signHashes = refreshed.blockchain?.signHashes || [];

      const finalHash = blockchain.computeFinalHash({
        preSignHash: refreshed.blockchain?.preSignHash,
        signHashes,
      });

      await storage.updateRequestStatus(requestId, {
        status: "completed",
        "blockchain.finalHash": finalHash,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Remove all remaining pending signatures
      for (const signer of (refreshed.signers || [])) {
        if (signer.userId) {
          await storage.removePendingSignature(signer.userId, requestId).catch(() => {});
        }
      }

      await storage.logAudit({
        requestId,
        tenantId: request.tenantId,
        action: "all_signed",
        details: { finalHash, signerCount: signHashes.length },
      });
      break;
    }

    case "signature_request_declined": {
      await storage.updateRequestStatus(requestId, {
        status: "declined",
        declinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Remove all pending signatures
      for (const signer of (request.signers || [])) {
        if (signer.userId) {
          await storage.removePendingSignature(signer.userId, requestId).catch(() => {});
        }
      }

      const decliner = (signatureRequest.signatures || []).find(
        s => s.status_code === "declined"
      );
      await storage.logAudit({
        requestId,
        tenantId: request.tenantId,
        action: "declined",
        details: {
          declinedBy: decliner?.signer_email_address || "unknown",
        },
      });
      break;
    }

    case "signature_request_viewed": {
      const viewer = (signatureRequest.signatures || []).find(
        s => s.status_code === "awaiting_signature"
      );
      await storage.logAudit({
        requestId,
        tenantId: request.tenantId,
        action: "viewed",
        details: {
          viewedBy: viewer?.signer_email_address || "unknown",
        },
      });
      break;
    }

    default:
      console.log(`signatureService webhook: unhandled event type: ${eventType}`);
  }
}

module.exports = {
  createRequest,
  getStatus,
  addCountersign,
  verify,
  getPending,
  delegate,
  revoke,
  getAudit,
  handleWebhookEvent,
};
