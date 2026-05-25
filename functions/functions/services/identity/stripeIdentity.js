"use strict";

/**
 * services/identity/stripeIdentity.js — IR Phase 1
 *
 * Stripe Identity wrapper for ID-only verification (no payment, no product).
 * Stripe charges SOCIII ~$1.50 per session at the platform Stripe account.
 *
 * Used by the IR investor flow to verify investor identity before SAFE
 * signing. Sits alongside the generic /v1/identity:session:create endpoint
 * already in index.js, but is investor/fundraise-aware and writes results
 * into fundraises/{fundraiseId}/investors/{investorId} rather than
 * identityVerifications/{docId}.
 *
 * Webhook router:
 *   - identity.verification_session.verified   → flip kycStatus=approved
 *   - identity.verification_session.requires_input → append event
 *   - identity.verification_session.processing → append event
 *   - identity.verification_session.canceled   → append event
 *
 * The verification session's metadata carries fundraiseId + investorId so
 * the webhook handler can route updates without an extra Firestore lookup.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

/**
 * Create a Stripe Identity verification session for an investor.
 *
 * @param {object} input
 * @param {string} input.uid              — Firebase Auth uid (post-magic-link)
 * @param {string} input.fundraiseId
 * @param {string} input.investorId
 * @param {string} [input.returnUrl]      — where Stripe redirects after completion
 * @param {string} [input.email]
 * @param {string} [input.name]
 *
 * @returns {Promise<{ok, sessionId, client_secret, url}>}
 */
async function createIdentitySession(input) {
  const { uid, fundraiseId, investorId, returnUrl = null, email = null, name = null } = input || {};
  if (!uid) throw new Error("createIdentitySession: uid required");
  if (!fundraiseId || !investorId) {
    throw new Error("createIdentitySession: fundraiseId and investorId required");
  }

  const stripe = getStripe();
  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: {
      uid,
      fundraiseId,
      investorId,
      purpose: "ir_investor_identity",
      email: email || "",
      name: name || "",
    },
    return_url: returnUrl || undefined,
  });

  // Persist a lightweight record on the investor doc (no PII).
  const invRef = getDb().collection("fundraises").doc(fundraiseId)
    .collection("investors").doc(investorId);
  await invRef.set({
    stripeIdentitySessionId: session.id,
    stripeIdentityStatus: session.status || "created",
    stripeIdentityCreatedAt: ts(),
    updated_at: ts(),
  }, { merge: true });

  return {
    ok: true,
    sessionId: session.id,
    client_secret: session.client_secret,
    url: session.url || null,
    status: session.status || "created",
  };
}

/**
 * Look up a verification session's current state from Stripe.
 *
 * @param {string} sessionId
 */
async function getIdentitySessionStatus(sessionId) {
  if (!sessionId) throw new Error("getIdentitySessionStatus: sessionId required");
  const stripe = getStripe();
  const session = await stripe.identity.verificationSessions.retrieve(sessionId);
  return {
    ok: true,
    sessionId: session.id,
    status: session.status,
    lastError: session.last_error || null,
    verified: session.status === "verified",
  };
}

/**
 * Handle a Stripe Identity webhook event.
 * Called from the master stripeWebhook.js router.
 *
 * @param {object} event — verified Stripe event object
 */
async function handleIdentityWebhookEvent(event) {
  const type = event.type;
  const session = event.data?.object;
  if (!session) {
    console.log("[stripeIdentity] webhook missing data.object");
    return { ok: false, reason: "no_data_object" };
  }

  const metadata = session.metadata || {};
  const { fundraiseId, investorId, purpose } = metadata;

  // Only handle investor identity sessions. Generic /v1/identity:session:create
  // sessions still flow through the existing identityVerifications collection
  // and are handled by the main webhook handler.
  if (purpose !== "ir_investor_identity") {
    return { ok: true, skipped: true, reason: "not_investor_identity" };
  }

  if (!fundraiseId || !investorId) {
    console.warn("[stripeIdentity] investor identity event missing fundraiseId/investorId metadata", { sessionId: session.id });
    return { ok: false, reason: "missing_metadata" };
  }

  const invRef = getDb().collection("fundraises").doc(fundraiseId)
    .collection("investors").doc(investorId);

  const eventEntry = {
    type,
    at: new Date().toISOString(),
    sessionId: session.id,
    status: session.status || null,
    lastError: session.last_error || null,
  };

  const baseUpdate = {
    stripeIdentityStatus: session.status || null,
    stripeIdentityEvents: admin.firestore.FieldValue.arrayUnion(eventEntry),
    updated_at: ts(),
  };

  switch (type) {
    case "identity.verification_session.verified": {
      await invRef.set({
        ...baseUpdate,
        kycStatus: "approved",
        kycVerifiedAt: ts(),
        kycMethod: "stripe_identity",
        kycRejectionReason: null,
      }, { merge: true });
      return { ok: true, action: "approved", fundraiseId, investorId };
    }
    case "identity.verification_session.requires_input":
    case "identity.verification_session.processing":
    case "identity.verification_session.canceled":
    case "identity.verification_session.created":
    default: {
      await invRef.set(baseUpdate, { merge: true });
      return { ok: true, action: "event_appended", fundraiseId, investorId, type };
    }
  }
}

module.exports = {
  createIdentitySession,
  getIdentitySessionStatus,
  handleIdentityWebhookEvent,
};
