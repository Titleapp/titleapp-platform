"use strict";

/**
 * services/dpp/agentAuthorization.js — the "authorized agent" step of the
 * self-serve DPP client onboarding flow (added 2026-09-05, alongside the
 * KYC + business-registration-document steps already in
 * apps/business/src/components/DppClientOnboarding.jsx and
 * GET /v1/dpp:workspace:onboardingStatus).
 *
 * What this is NOT: a new consent-recording mechanism. It reuses, exactly,
 * the same real e-signature send/track/gate mechanism
 * services/clients/clientOnboarding.js already uses for its own
 * vertical-specific disclosure agreements (`sendDisclosureForSignature` /
 * `onDisclosureSigned`, both backed by services/esign/esignService.js's
 * native + BoldSign tracks). That module's own `dpp` DISCLOSURE_TEMPLATES
 * entry is a close cousin but serves a different relationship: a *tenant on
 * this platform* (e.g. a DPP-consulting business) onboarding *its own*
 * client via the Contacts/Memberships model. This module is for the
 * self-serve case, where the brand/manufacturer signing up IS the tenant —
 * there is no Contacts row, so state lives on the tenant document itself
 * (`tenants/{tenantId}.dppAgentAuthorization`), the same place the rest of
 * the self-serve onboarding status already resolves from.
 *
 * Why this exists at all (2026-09-05, Sean): the DPP onboarding flow up to
 * this point only established identity (KYC) and business existence (the
 * registration document) — it never recorded the client affirmatively
 * authorizing SOCIII to act as their compliance *agent/representative* for
 * EU DPP / battery-regulation record-keeping purposes. That's a real
 * agency-representation relationship, not an account-creation formality,
 * so it gets its own explicit, e-signed, timestamped, tied-to-a-specific-
 * user-and-company record — not an implicit checkbox buried in generic
 * terms of service.
 *
 * Two real prerequisites are NOT finalized yet and this flow is
 * deliberately NOT gated on them (Sean's explicit instruction,
 * 2026-09-05): an EU-domiciled entity/registered representative for SOCIII,
 * and professional-liability/E&O insurance covering this compliance-agent
 * capacity (see memory: SOCIII has deliberately deferred binding cyber/
 * tech E&O until post-funding). PREREQUISITE_STATUS below is the one place
 * that tracks that honestly — no fake registration numbers or policy
 * details anywhere. The signed agreement text itself recites these two
 * gaps (not just UI chrome around it), so the record a client actually
 * signs never overclaims what SOCIII already has in place. Flip the two
 * booleans here (and fill in the *Note strings) once each prerequisite is
 * actually resolved — every place that reads onboarding status recomputes
 * from this single source.
 */

const admin = require("firebase-admin");

function getDb() {
  return admin.firestore();
}
function ts() {
  try {
    return admin.firestore.FieldValue.serverTimestamp();
  } catch (e) {
    return new Date();
  }
}

// ---------------------------------------------------------------
// Single source of truth for the two deferred prerequisites. Sean-owned:
// flip to true (and replace the *Note text with the real fact — entity
// name/jurisdiction, or carrier/coverage type, never a fabricated number)
// once each is actually resolved. Until then this is what every DPP
// onboarding status read (staff-facing AND client-facing) surfaces.
// ---------------------------------------------------------------
const PREREQUISITE_STATUS = {
  euEntityRegistered: false,
  euEntityNote:
    "SOCIII has not yet registered an EU-domiciled entity or formally designated an EU authorized representative for Digital Product Passport / battery-regulation purposes. This authorization is being executed, and SOCIII is acting on it, ahead of that registration being finalized.",
  eoInsuranceBound: false,
  eoInsuranceNote:
    "SOCIII has not yet bound professional-liability / technology E&O insurance covering its acting in this compliance-agent capacity. Coverage is being pursued (deliberately deferred until post-funding) but is not yet in place.",
};

function operatingAheadOfPrerequisites() {
  return !PREREQUISITE_STATUS.euEntityRegistered || !PREREQUISITE_STATUS.eoInsuranceBound;
}

// ---------------------------------------------------------------
// The agreement text itself. Same [PLACEHOLDER TEMPLATE — NOT REVIEWED BY
// COUNSEL] convention services/clients/clientOnboarding.js's
// DISCLOSURE_TEMPLATES already uses — the e-signature MECHANISM here is
// real; the exact legal language is not yet counsel-reviewed. Deliberately
// does not name any fictional demo entity (see clientOnboarding.js's own
// `dpp` template, which names "Volta Advisory" — a demo-only placeholder
// company invented for one specific pilot, not a real SOCIII subsidiary —
// fixed in that file as part of this pass since it would otherwise ship
// to every real DPP client).
// ---------------------------------------------------------------
function buildAgreementBody(companyName) {
  const company = companyName || "the undersigned company";
  return (
    `[PLACEHOLDER TEMPLATE — NOT REVIEWED BY COUNSEL]\n\n` +
    `AUTHORIZED AGENT DESIGNATION — DIGITAL PRODUCT PASSPORT COMPLIANCE\n\n` +
    `By signing below, the undersigned, as an authorized signer for ${company}, designates and authorizes ` +
    `SOCIII to act as ${company}'s agent and representative for the purpose of preparing, maintaining, and ` +
    `record-keeping in connection with EU Digital Product Passport and battery-regulation compliance ` +
    `obligations applicable to ${company}'s products. This authorization permits SOCIII to process ${company}'s ` +
    `product data for that purpose and to represent ${company} in DPP compliance record-keeping matters as ` +
    `described in SOCIII's DPP service documentation.\n\n` +
    `IMPORTANT — STATUS OF TWO PREREQUISITES (disclosed here, not withheld):\n` +
    `1. EU entity / authorized representative: ${PREREQUISITE_STATUS.euEntityNote}\n` +
    `2. Professional liability / E&O insurance: ${PREREQUISITE_STATUS.eoInsuranceNote}\n\n` +
    `${company} is entering this authorization with both of the above facts disclosed. Real, counsel-reviewed ` +
    `agreement language (and resolution of the two items above) needs to happen before this is relied upon as ` +
    `${company}'s sole compliance representation — this is a functional placeholder so the authorization ` +
    `mechanism itself (real e-signature, real timestamp, real tied-to-signer-and-company record) can be tested ` +
    `and used end to end.`
  );
}

const AGREEMENT_TITLE = "SOCIII Authorized Agent Designation (DPP Compliance)";

async function writeAudit({ db, type, tenantId, actorUid, details }) {
  await (db || getDb()).collection("auditTrail").add({
    type,
    tenantId: tenantId || null,
    actorUid: actorUid || null,
    details: details || null,
    at: ts(),
  });
}

/**
 * Starts (or, if already sent/authorized, idempotently returns) the real
 * e-signed authorized-agent agreement for this tenant's workspace owner.
 * Reuses services/esign/esignService.js's `handleESignSend` directly (same
 * technique clientOnboarding.js's `sendDisclosureForSignature` uses: a
 * minimal fake req/res, since esignService.js is HTTP-shaped) — no new
 * send/track mechanism.
 */
async function startAgentAuthorization({ db, tenantId, actorUid, signerEmail, signerName, companyName }) {
  const database = db || getDb();
  if (!tenantId) throw Object.assign(new Error("tenantId required"), { statusCode: 400 });
  if (!signerEmail) throw Object.assign(new Error("signerEmail required"), { statusCode: 400 });

  const tenantRef = database.collection("tenants").doc(tenantId);
  const tenantSnap = await tenantRef.get();
  const existing = tenantSnap.exists ? (tenantSnap.data().dppAgentAuthorization || null) : null;

  // Idempotent — never re-send once a request is in flight or completed.
  if (existing && (existing.status === "sent" || existing.status === "authorized")) {
    return { ok: true, idempotent: true, ...existing };
  }

  const { handleESignSend } = require("../esign/esignService");
  const bodyText = buildAgreementBody(companyName);

  const fakeReq = {
    body: {
      title: AGREEMENT_TITLE,
      signers: [{ email: signerEmail, name: signerName || signerEmail }],
      message: bodyText,
      metadata: {
        dppAgentAuthorization: true,
        tenantId,
      },
    },
  };
  let statusCode = 200;
  let result = null;
  const fakeRes = {
    status(code) { statusCode = code; return this; },
    json(obj) { result = obj; return obj; },
  };

  await handleESignSend(fakeReq, fakeRes, { userId: actorUid, tenantId });
  if (!result || result.ok !== true) {
    throw new Error((result && result.error) || `esign send failed (status ${statusCode})`);
  }

  const signingUrl = (result.signingLinks && result.signingLinks[0] && result.signingLinks[0].signingUrl) || null;
  const record = {
    status: "sent",
    esignRequestId: result.requestId,
    track: result.track,
    signingUrl,
    signerEmail,
    signerName: signerName || null,
    companyName: companyName || null,
    sentAt: new Date().toISOString(),
    signedAt: null,
    // Snapshot of the prerequisite gaps AT THE TIME this was sent — the
    // live values (used everywhere else) may move; this is what the
    // specific signed document actually recited to this specific signer.
    prerequisitesAtSendTime: { ...PREREQUISITE_STATUS },
  };

  await tenantRef.set({ dppAgentAuthorization: record, updated_at: ts() }, { merge: true });
  await writeAudit({
    db: database, type: "dpp_agent_authorization_sent", tenantId, actorUid,
    details: { esignRequestId: result.requestId, track: result.track, signerEmail, operatingAheadOfPrerequisites: operatingAheadOfPrerequisites() },
  });

  return { ok: true, idempotent: false, ...record };
}

/**
 * Called from esignService.js's handleESignSign (native-track signature
 * completion) when the signed request's metadata carries
 * `dppAgentAuthorization: true` — mirrors clientOnboarding.js's
 * onDisclosureSigned hook exactly, guarded the same way (additive-only:
 * every other esign caller leaves this metadata field unset).
 */
async function onAgentAuthorizationSigned({ db, tenantId, signerEmail, signerName, signedAt }) {
  const database = db || getDb();
  const tenantRef = database.collection("tenants").doc(tenantId);
  const tenantSnap = await tenantRef.get();
  const existing = (tenantSnap.exists && tenantSnap.data().dppAgentAuthorization) || {};

  const record = {
    ...existing,
    status: "authorized",
    signedAt: signedAt || new Date().toISOString(),
    signerEmail: signerEmail || existing.signerEmail || null,
    signerName: signerName || existing.signerName || null,
  };
  await tenantRef.set({ dppAgentAuthorization: record }, { merge: true });
  await writeAudit({
    db: database, type: "dpp_agent_authorization_signed", tenantId, actorUid: null,
    details: { signerEmail: record.signerEmail, signerName: record.signerName, operatingAheadOfPrerequisites: operatingAheadOfPrerequisites() },
  });
  return { ok: true, tenantId, status: "authorized", signedAt: record.signedAt };
}

/**
 * Read-only combined state for GET /v1/dpp:workspace:onboardingStatus.
 * Always returns the LIVE prerequisite flags (not a stale snapshot) so
 * ops/Sean always sees current reality, plus whatever was actually
 * recorded for this specific tenant's authorization.
 */
async function getAgentAuthorizationState({ db, tenantId }) {
  const database = db || getDb();
  const tenantSnap = await database.collection("tenants").doc(tenantId).get();
  const record = (tenantSnap.exists && tenantSnap.data().dppAgentAuthorization) || null;
  return {
    status: record ? record.status : "not_sent",
    esignRequestId: record ? record.esignRequestId || null : null,
    track: record ? record.track || null : null,
    signingUrl: record ? record.signingUrl || null : null,
    signedAt: record ? record.signedAt || null : null,
    prerequisites: { ...PREREQUISITE_STATUS },
    operatingAheadOfPrerequisites: operatingAheadOfPrerequisites(),
  };
}

module.exports = {
  PREREQUISITE_STATUS,
  AGREEMENT_TITLE,
  buildAgreementBody,
  operatingAheadOfPrerequisites,
  startAgentAuthorization,
  onAgentAuthorizationSigned,
  getAgentAuthorizationState,
};
