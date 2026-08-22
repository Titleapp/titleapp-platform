"use strict";

/**
 * services/identity/identitySession.js — CODEX S52.61 Phase 1
 *
 * Extracted, behavior-preserving, from index.js's `POST /v1/identity:session:create`
 * handler so the same Stripe-Identity-session-creation + `identityVerifications`
 * bookkeeping can be reused by the new "add client" capability
 * (`services/clients/clientOnboarding.js`) to kick off KYC *server-side*, on
 * behalf of a client who has no authenticated session of their own yet
 * (staff triggers "add client"; the client completes verification later via
 * Stripe's own hosted `session.url`, same as any other Stripe Identity link).
 *
 * The HTTP route in index.js now delegates to `createIdentitySessionForUid`
 * with `uid: auth.user.uid` — same behavior as before, just extracted.
 *
 * `identityDocId` here is a deliberate, documented duplicate of the function
 * of the same name in index.js — NOT a require of index.js (nothing else in
 * this codebase requires index.js; it is not designed to be importable).
 * The two implementations MUST stay byte-identical, because CODEX S52.62's
 * Stripe Identity webhook (in index.js) uses its own copy to compute the
 * `identityVerifications/{docId}` id that this module also writes to — if
 * they ever diverge, the webhook stops finding the record this module
 * creates. Do not change the format here without changing it in index.js
 * (and vice versa) in the same change.
 */

const admin = require("firebase-admin");
const Stripe = require("stripe");

function getDb() {
  return admin.firestore();
}

function nowServerTs() {
  try {
    return admin.firestore.FieldValue.serverTimestamp();
  } catch (e) {
    return new Date();
  }
}

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

// Must exactly match identityDocId() in index.js — see file header.
function identityDocId({ uid, tenantId, purpose }) {
  const p = String(purpose || "general").toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  return `idv_${uid}_${tenantId}_${p}`.slice(0, 200);
}

/**
 * Create a Stripe Identity verification session for an arbitrary
 * (uid, tenantId, purpose) — the same shape index.js's route already writes,
 * just callable from server-side code that isn't itself an HTTP request
 * from the verifying person.
 *
 * @param {object} params
 * @param {FirebaseFirestore.Firestore} [params.db]
 * @param {string} params.uid
 * @param {string} params.tenantId
 * @param {string} [params.purpose="general"]
 * @param {string} [params.returnUrl]
 * @param {{accepted:boolean, acceptedAt?:string, text?:string}} params.identityConsent
 *   — CODEX S52.62 §1.5/§4 item 9 platform-level cross-tenant-resolution
 *   consent. Required, same rule as the HTTP route. For "add client" flows,
 *   the caller (clientOnboarding.js) passes real evidence of consent (the
 *   completed e-signature disclosure, which CODEX S52.61 §5 says may bundle
 *   this consent) rather than a fabricated acceptance.
 * @returns {Promise<{ok:boolean, purpose:string, tenantId:string, sessionId:string, client_secret:string, url:string|null, status:string}>}
 */
async function createIdentitySessionForUid({ db, uid, tenantId, purpose = "general", returnUrl = null, identityConsent }) {
  if (!uid) throw new Error("createIdentitySessionForUid: uid required");
  if (!tenantId) throw new Error("createIdentitySessionForUid: tenantId required");
  if (!identityConsent || identityConsent.accepted !== true) {
    throw new Error("createIdentitySessionForUid: platform identity consent required before starting identity verification");
  }

  const database = db || getDb();
  const stripe = getStripeClient();
  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: {
      userId: uid,
      tenantId,
      purpose: String(purpose),
    },
    return_url: returnUrl || undefined,
  });

  const docId = identityDocId({ uid, tenantId, purpose });
  await database.collection("identityVerifications").doc(docId).set({
    uid,
    tenantId,
    purpose: String(purpose),
    stripeSessionId: session.id,
    stripeStatus: session.status || "created",
    createdAt: nowServerTs(),
    updatedAt: nowServerTs(),
    platformIdentityConsent: {
      accepted: true,
      acceptedAt: identityConsent.acceptedAt || new Date().toISOString(),
      text: identityConsent.text || null,
    },
  });

  try {
    const { recordDataFee } = require("../billing/dataFee");
    await recordDataFee({
      source: "stripe:identity_verification",
      userId: uid,
      tenantId,
      units: 1,
      metadata: { sessionId: session.id, purpose: String(purpose) },
    });
  } catch (feeErr) {
    console.warn("[identitySession] dataFee record failed (non-fatal, session already created):", feeErr.message);
  }

  return {
    ok: true,
    purpose: String(purpose),
    tenantId,
    sessionId: session.id,
    client_secret: session.client_secret,
    url: session.url || null,
    status: session.status || "created",
  };
}

module.exports = { createIdentitySessionForUid, identityDocId };
