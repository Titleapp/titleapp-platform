"use strict";

/**
 * Publish Gates — centralized enforcement for all publish-time checks.
 * Called by worker1:submit and admin:worker:review endpoints.
 *
 * Gates:
 *   IDENTITY_VERIFICATION  — creator must verify identity before publishing (hard block)
 *   LIABILITY_DISCLAIMER    — creator must accept liability disclaimer per worker (hard block)
 *   HIPAA_BAA_GATE          — HE vertical workers require BAA acknowledgment (hard block, conditional)
 *   MONEY_TRANSMISSION_FLAG — flags payment-related workers for legal review (soft flag, does not block)
 */

const GATE_IDS = {
  IDENTITY_VERIFICATION: "IDENTITY_VERIFICATION",
  LIABILITY_DISCLAIMER: "LIABILITY_DISCLAIMER",
  HIPAA_BAA_GATE: "HIPAA_BAA_GATE",
  MONEY_TRANSMISSION_FLAG: "MONEY_TRANSMISSION_FLAG",
  WEB3_TEAM_IDENTITY_GATE: "WEB3_TEAM_IDENTITY_GATE",
  WEB3_PROJECT_ATTESTATION: "WEB3_PROJECT_ATTESTATION",
  WEB3_LEGAL_COUNSEL_GATE: "WEB3_LEGAL_COUNSEL_GATE",
};

const HIPAA_PATTERN = /hipaa|phi|protected\s*health|baa|patient\s*data|medical\s*record/i;
const MONEY_PATTERN = /payment|escrow|money\s*transmis|transfer\s*funds|disburse|wire\s*transfer|settlement|remit|payout|collect\s*payment/i;
const WEB3_VERTICAL_PATTERN = /web3|nft|dao|defi|token\s*launch|blockchain\s*project/i;
const WEB3_LEGAL_PATTERN = /regulatory\s*framing|securities\s*law|howey|token\s*classification/i;

/**
 * Check all publish gates for a creator + worker combination.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} userId — creator's Firebase UID
 * @param {string} workerId
 * @param {string} tenantId
 * @param {object} workerDoc — the worker document data
 * @returns {{ passed: boolean, gates: object[], moneyTransmissionFlagged: boolean }}
 */
async function checkPublishGates(db, userId, workerId, tenantId, workerDoc) {
  const gates = [];

  // Fetch creator record once
  const creatorSnap = await db.collection("creators").doc(userId).get();
  const creator = creatorSnap.exists ? creatorSnap.data() : {};

  // ── Gate 1: Identity Verification ──────────────────────────
  const idVerified = creator.creatorIdVerified === true;
  gates.push({
    id: GATE_IDS.IDENTITY_VERIFICATION,
    passed: idVerified,
    required: true,
    label: "Identity Verification",
    detail: idVerified ? "Verified" : "Creator must verify identity before publishing",
  });

  // ── Gate 2: Liability Disclaimer ───────────────────────────
  const disclaimerDocId = `${workerId}_${userId}`;
  const disclaimerSnap = await db.doc(`publishDisclaimers/${disclaimerDocId}`).get();
  const disclaimerAccepted = disclaimerSnap.exists && disclaimerSnap.data().accepted === true;
  gates.push({
    id: GATE_IDS.LIABILITY_DISCLAIMER,
    passed: disclaimerAccepted,
    required: true,
    label: "Liability Disclaimer",
    detail: disclaimerAccepted ? "Accepted" : "Creator must accept liability disclaimer for this worker",
  });

  // ── Build allText for pattern matching (used by multiple gates) ──
  const allText = [
    workerDoc.description || workerDoc.headline || "",
    ...(workerDoc.raas_tier_1 || []),
    ...(workerDoc.raas_tier_2 || []),
    ...(workerDoc.raasLibrary?.tier1 || []),
    ...(workerDoc.raasLibrary?.tier2 || []),
  ].join(" ");

  // ── Gate 3: HIPAA / BAA (conditional) ──────────────────────
  const suite = workerDoc.suite || workerDoc.intake?.vertical || "";
  const isHealthVertical =
    suite === "Health & EMS Education" ||
    suite === "health-education" ||
    (workerDoc.raas_tier_1 || []).some(r => HIPAA_PATTERN.test(r)) ||
    (workerDoc.raasLibrary?.tier1 || []).some(r => HIPAA_PATTERN.test(r));

  if (isHealthVertical) {
    const baaAccepted = creator.baaSignedAt != null;
    gates.push({
      id: GATE_IDS.HIPAA_BAA_GATE,
      passed: baaAccepted,
      required: true,
      label: "HIPAA Business Associate Agreement",
      detail: baaAccepted ? "BAA accepted" : "Health vertical workers require BAA before publishing",
    });
  }

  // ── Gate: Web3 Team Identity Verification ───────────────────
  const W3_SUITES = ["Web3", "Tokenomics", "Launch", "Community", "Communications"];
  const isWeb3Vertical =
    W3_SUITES.includes(suite) ||
    WEB3_VERTICAL_PATTERN.test(allText);

  if (isWeb3Vertical) {
    const teamVerified = creator.web3TeamIdentityVerified === true;
    gates.push({
      id: GATE_IDS.WEB3_TEAM_IDENTITY_GATE,
      passed: teamVerified,
      required: true,
      label: "Web3 Team Identity Verification",
      detail: teamVerified
        ? "All team members verified"
        : "Web3 vertical requires identity verification for ALL team members before publishing",
    });

    // ── Gate: Web3 Project Attestation ──────────────────────────
    const attestationSigned = creator.web3ProjectAttestationAt != null;
    gates.push({
      id: GATE_IDS.WEB3_PROJECT_ATTESTATION,
      passed: attestationSigned,
      required: true,
      label: "Project Attestation",
      detail: attestationSigned
        ? "Project Attestation on file"
        : "Web3 vertical requires a signed Project Attestation confirming tokens/NFTs are not securities",
    });

    // ── Gate: Web3 Legal Counsel (W3-003 or regulatory framing workers) ──
    const isRegulatoryWorker =
      (workerDoc.catalogId === "W3-003") ||
      (workerDoc.raas_tier_1 || []).some(r => WEB3_LEGAL_PATTERN.test(r)) ||
      (workerDoc.raasLibrary?.tier1 || []).some(r => WEB3_LEGAL_PATTERN.test(r));

    if (isRegulatoryWorker) {
      const legalCounselConfirmed = creator.web3LegalCounselConfirmedAt != null;
      gates.push({
        id: GATE_IDS.WEB3_LEGAL_COUNSEL_GATE,
        passed: legalCounselConfirmed,
        required: true,
        label: "Legal Counsel Confirmation",
        detail: legalCounselConfirmed
          ? "Legal counsel engagement confirmed"
          : "This worker requires confirmation of engagement with licensed legal counsel for securities law matters",
      });
    }
  }

  // ── Gate 4: Money Transmission Flag (soft) ─────────────────
  const isPaymentWorker = MONEY_PATTERN.test(allText);
  gates.push({
    id: GATE_IDS.MONEY_TRANSMISSION_FLAG,
    passed: true, // never blocks
    flagged: isPaymentWorker,
    required: false,
    label: "Money Transmission Review",
    detail: isPaymentWorker
      ? "This worker may implicate money transmission laws — flagged for legal review"
      : "No money transmission concerns detected",
  });

  // ── Result ─────────────────────────────────────────────────
  const requiredGates = gates.filter(g => g.required);
  const allPassed = requiredGates.every(g => g.passed);

  return {
    passed: allPassed,
    gates,
    moneyTransmissionFlagged: isPaymentWorker,
  };
}

module.exports = { checkPublishGates, GATE_IDS };
