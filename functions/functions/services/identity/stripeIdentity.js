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
  const { uid, fundraiseId, investorId, advisorId, creatorId, returnUrl = null, email = null, name = null } = input || {};
  if (!uid) throw new Error("createIdentitySession: uid required");
  const isAdvisor = !!advisorId;
  const isInvestor = !!(fundraiseId && investorId);
  const isCreator = !!creatorId;
  if (!isAdvisor && !isInvestor && !isCreator) {
    throw new Error("createIdentitySession: advisorId, creatorId, OR (fundraiseId + investorId) required");
  }

  const purpose = isAdvisor ? "ir_advisor_identity"
                : isCreator ? "creator_identity"
                : "ir_investor_identity";

  const stripe = getStripe();
  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: {
      uid,
      fundraiseId: fundraiseId || "",
      investorId: investorId || "",
      advisorId: advisorId || "",
      creatorId: creatorId || "",
      purpose,
      email: email || "",
      name: name || "",
    },
    return_url: returnUrl || undefined,
  });

  // Persist a lightweight record on the entity doc (no PII).
  const entityRef = isAdvisor
    ? getDb().collection("advisors").doc(advisorId)
    : isCreator
      ? getDb().collection("creators").doc(creatorId)
      : getDb().collection("fundraises").doc(fundraiseId).collection("investors").doc(investorId);
  await entityRef.set({
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

// Convenience alias used by creatorFlow + future callers.
async function getIdentitySession(sessionId) {
  return getIdentitySessionStatus(sessionId);
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
  const { fundraiseId, investorId, advisorId, creatorId, purpose } = metadata;

  console.log(`[stripeIdentity] webhook event=${type} session=${session.id} purpose=${purpose || "(none)"} advisorId=${advisorId || "(none)"} creatorId=${creatorId || "(none)"} fundraiseId=${fundraiseId || "(none)"} investorId=${investorId || "(none)"} status=${session.status || "(none)"}`);

  return await _applyIdentitySessionToEntity({ session, eventType: type, metadata });
}

// Shared writer used by both the webhook handler and the manual sync recovery
// path. Routes the session to the right Firestore doc based on metadata.purpose.
async function _applyIdentitySessionToEntity({ session, eventType, metadata }) {
  const { fundraiseId, investorId, advisorId, creatorId, purpose } = metadata || {};

  let entityRef = null;
  let entityKind = null;
  if (purpose === "ir_investor_identity" && fundraiseId && investorId) {
    entityRef = getDb().collection("fundraises").doc(fundraiseId).collection("investors").doc(investorId);
    entityKind = "investor";
  } else if (purpose === "ir_advisor_identity" && advisorId) {
    entityRef = getDb().collection("advisors").doc(advisorId);
    entityKind = "advisor";
  } else if (purpose === "creator_identity" && creatorId) {
    entityRef = getDb().collection("creators").doc(creatorId);
    entityKind = "creator";
  } else {
    console.log(`[stripeIdentity] skipped — purpose=${purpose} doesn't match any known entity`);
    return { ok: true, skipped: true, reason: "unknown_purpose", purpose: purpose || null };
  }

  const eventEntry = {
    type: eventType || `sync.${session.status || "unknown"}`,
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

  if (session.status === "verified") {
    // Pull the verification report to extract verified address/name.
    let verifiedAddress = null;
    let verifiedName = null;
    let verifiedDob = null;
    try {
      const reportId = session.last_verification_report;
      if (reportId) {
        const stripe = getStripe();
        const report = await stripe.identity.verificationReports.retrieve(reportId);
        const doc = report?.document || {};
        const addr = doc.address || {};
        verifiedAddress = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country]
          .filter(Boolean).join(", ") || null;
        if (doc.first_name || doc.last_name) {
          verifiedName = [doc.first_name, doc.last_name].filter(Boolean).join(" ");
        }
        if (doc.dob) {
          verifiedDob = `${doc.dob.year}-${String(doc.dob.month).padStart(2, "0")}-${String(doc.dob.day).padStart(2, "0")}`;
        }
        console.log(`[stripeIdentity] verified report pulled — name=${verifiedName} addressLines=${verifiedAddress ? "yes" : "no"}`);
      } else {
        console.warn("[stripeIdentity] verified session missing last_verification_report");
      }
    } catch (e) {
      console.error("[stripeIdentity] verification report fetch failed:", e.message);
    }

    await entityRef.set({
      ...baseUpdate,
      kycStatus: "approved",
      kycVerifiedAt: ts(),
      kycMethod: "stripe_identity",
      kycRejectionReason: null,
      flowStep: "identity_complete",
      ...(verifiedAddress ? { verifiedAddress } : {}),
      ...(verifiedName ? { verifiedName } : {}),
      ...(verifiedDob ? { verifiedDob } : {}),
    }, { merge: true });
    console.log(`[stripeIdentity] approved — entityKind=${entityKind} advisorId=${advisorId || ""} fundraiseId=${fundraiseId || ""} investorId=${investorId || ""}`);
    return {
      ok: true,
      action: "approved",
      entityKind,
      status: session.status,
      fundraiseId: fundraiseId || null,
      investorId: investorId || null,
      advisorId: advisorId || null,
    };
  }

  await entityRef.set(baseUpdate, { merge: true });
  return { ok: true, action: "event_appended", entityKind, status: session.status, type: eventType };
}

/**
 * Manual sync path — pulls the current state of a Stripe Identity session
 * and writes it back to the entity doc. Used when the webhook silently
 * misses (e.g., subscription wasn't enrolled at verification time).
 *
 * @param {object} input
 * @param {string} input.sessionId
 * @param {string} [input.advisorId]
 * @param {string} [input.fundraiseId]
 * @param {string} [input.investorId]
 */
async function syncIdentitySessionToEntity({ sessionId, advisorId = null, fundraiseId = null, investorId = null }) {
  if (!sessionId) throw new Error("syncIdentitySessionToEntity: sessionId required");
  const stripe = getStripe();
  const session = await stripe.identity.verificationSessions.retrieve(sessionId);
  // Trust the session metadata over caller-supplied IDs (defense in depth),
  // but fall back to caller IDs if metadata is empty.
  const metadata = {
    ...(session.metadata || {}),
  };
  if (advisorId && !metadata.advisorId) {
    metadata.advisorId = advisorId;
    metadata.purpose = metadata.purpose || "ir_advisor_identity";
  }
  if (fundraiseId && investorId && !metadata.investorId) {
    metadata.fundraiseId = fundraiseId;
    metadata.investorId = investorId;
    metadata.purpose = metadata.purpose || "ir_investor_identity";
  }
  return await _applyIdentitySessionToEntity({
    session,
    eventType: `sync.${session.status || "unknown"}`,
    metadata,
  });
}

module.exports = {
  createIdentitySession,
  getIdentitySessionStatus,
  handleIdentityWebhookEvent,
  syncIdentitySessionToEntity,
};
