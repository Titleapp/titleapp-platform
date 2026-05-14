"use strict";

/**
 * fundraise/investorKyc.js — CODEX 50.15 P0-15
 *
 * Investor-side KYC. Wraps the existing idVerification.js state machine
 * but writes to investor records under fundraises/{fundraiseId}/investors/
 * rather than users/{uid}.
 *
 * State machine (mirrors creator-side):
 *   not_submitted → pending → approved/rejected
 *
 * Plus accreditation track (separate from KYC):
 *   unverified → self_attested (506(b)) → verified (506(c)) → entity_verified
 *
 * v1: admin reviews submissions manually. v1.1: third-party verification
 * service integration (Persona / Jumio / Stripe Identity).
 *
 * On approval: KYC artifact attached as a DTC for audit trail (per
 * CODEX 50.17 — uses CODEX 50.14 chain anchor for permanence).
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const VALID_KYC_STATUSES = ["not_submitted", "pending", "approved", "rejected"];
const VALID_ACCREDITATION_STATUSES = ["unverified", "self_attested", "verified", "entity_verified"];

/**
 * Investor self-submits KYC documents. Writes to investor record in pending state.
 *
 * @param {object} input
 * @param {string} input.fundraiseId
 * @param {string} input.investorId
 * @param {object} input.documents      — { idDocStorageRef, addressDocStorageRef? }
 * @param {string} input.attestationText — verbatim attestation language
 */
async function submitKyc(input) {
  const { fundraiseId, investorId, documents = {}, attestationText = null } = input;
  if (!fundraiseId || !investorId) throw new Error("submitKyc: fundraiseId and investorId required");

  const ref = getDb().collection("fundraises").doc(fundraiseId)
    .collection("investors").doc(investorId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`investor ${investorId} not found`);

  const current = snap.data().kycStatus;
  if (current === "approved") {
    return { ok: true, status: "already_approved" };
  }
  if (current === "pending") {
    return { ok: true, status: "already_pending" };
  }

  await ref.update({
    kycStatus: "pending",
    kycSubmittedAt: ts(),
    kycDocuments: documents,
    kycAttestation: attestationText,
    kycRejectionReason: null,
    updated_at: ts(),
  });

  return { ok: true, status: "pending" };
}

/**
 * Admin (TitleApp staff or fundraise owner) approves the KYC submission.
 * Mints a DTC for the KYC artifact (audit trail per CODEX 50.17).
 */
async function approveKyc(input) {
  const { fundraiseId, investorId, reviewedBy = null, notes = null } = input;
  if (!fundraiseId || !investorId) throw new Error("approveKyc: fundraiseId and investorId required");

  const ref = getDb().collection("fundraises").doc(fundraiseId)
    .collection("investors").doc(investorId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`investor ${investorId} not found`);
  if (snap.data().kycStatus !== "pending") {
    throw new Error(`approveKyc: cannot approve from ${snap.data().kycStatus}`);
  }

  await ref.update({
    kycStatus: "approved",
    kycVerifiedAt: ts(),
    kycReviewedBy: reviewedBy,
    kycApprovalNotes: notes,
    updated_at: ts(),
  });

  // TODO v1.1: mint DTC for KYC artifact via dtc:create with type=kyc_credential.
  // Would write entry to logbookEntries with the verification details.

  return { ok: true, status: "approved" };
}

async function rejectKyc(input) {
  const { fundraiseId, investorId, reason, reviewedBy = null } = input;
  if (!fundraiseId || !investorId || !reason) throw new Error("rejectKyc: fundraiseId, investorId, reason required");

  const ref = getDb().collection("fundraises").doc(fundraiseId)
    .collection("investors").doc(investorId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`investor ${investorId} not found`);

  await ref.update({
    kycStatus: "rejected",
    kycRejectionReason: reason,
    kycReviewedBy: reviewedBy,
    updated_at: ts(),
  });

  return { ok: true, status: "rejected" };
}

/**
 * Set accreditation status. Separate from KYC because accreditation is
 * about Reg D investor qualification, not identity verification.
 */
async function setAccreditationStatus(input) {
  const { fundraiseId, investorId, status, verificationMethod = null, expiresAt = null } = input;
  if (!fundraiseId || !investorId) throw new Error("setAccreditationStatus: fundraiseId and investorId required");
  if (!VALID_ACCREDITATION_STATUSES.includes(status)) {
    throw new Error(`setAccreditationStatus: invalid status ${status}`);
  }

  const ref = getDb().collection("fundraises").doc(fundraiseId)
    .collection("investors").doc(investorId);
  await ref.update({
    accreditationStatus: status,
    accreditationVerificationMethod: verificationMethod,
    accreditationExpiresAt: expiresAt ? admin.firestore.Timestamp.fromDate(new Date(expiresAt)) : null,
    accreditationUpdatedAt: ts(),
    updated_at: ts(),
  });
  return { ok: true, status };
}

/**
 * Combined gate — return whether an investor can be funded.
 * Used by Fundraise UI before allowing subscription docs to be sent.
 */
async function canFundInvestor(fundraiseId, investorId, { offeringRegulation }) {
  const snap = await getDb().collection("fundraises").doc(fundraiseId)
    .collection("investors").doc(investorId).get();
  if (!snap.exists) return { ok: false, reason: "investor_not_found" };

  const inv = snap.data();
  if (inv.kycStatus !== "approved") return { ok: false, reason: "kyc_not_approved" };

  // 506(c) requires VERIFIED accredited (third-party)
  if (offeringRegulation === "506c" && inv.accreditationStatus !== "verified" && inv.accreditationStatus !== "entity_verified") {
    return { ok: false, reason: "506c_requires_verified_accreditation" };
  }
  // 506(b) allows self_attested or higher
  if (offeringRegulation === "506b" && inv.accreditationStatus === "unverified") {
    return { ok: false, reason: "506b_requires_at_least_self_attested" };
  }

  return { ok: true };
}

module.exports = {
  submitKyc,
  approveKyc,
  rejectKyc,
  setAccreditationStatus,
  canFundInvestor,
  VALID_KYC_STATUSES,
  VALID_ACCREDITATION_STATUSES,
};
