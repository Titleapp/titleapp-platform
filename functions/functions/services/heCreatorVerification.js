/**
 * heCreatorVerification.js — Health & EMS Education creator verification
 *
 * Phase 1: Self-attestation model. Creator declares credential type and number.
 * Phase 2 (future): State board API lookup for license verification.
 *
 * Flow: submit (credential + subject domain) → admin queue → MEDCREATOR coupon applied
 *
 * Coupons used:
 *   MEDCREATOR — 100% off Creator License ($49/yr) through Dec 31 2026
 *
 * Mirrors cfiVerification.js pattern.
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const VALID_CREDENTIAL_TYPES = ["RN", "NREMT", "NRP", "EMT", "Faculty", "EMS-I", "Other"];

const VALID_SUBJECT_DOMAINS = [
  "critical_care_icu", "emergency_er", "flight_nursing", "ems_paramedic",
  "perioperative_or", "pediatrics_nicu", "ob_labor_delivery", "home_health",
  "nursing_education_faculty", "ems_instructor_academy",
];

// ═══════════════════════════════════════════════════════════════
//  SUBMIT CREATOR VERIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Submit HE creator verification (self-attestation).
 * Called from POST /v1/verify:he-creator
 *
 * Body: {
 *   credentialType, credentialNumber, subjectDomain,
 *   statePractice, employerProgram (optional)
 * }
 */
async function submitHeCreatorVerification(req, res) {
  const db = getDb();
  const user = req._user;
  const uid = user.uid;
  const { credentialType, credentialNumber, subjectDomain, statePractice, employerProgram } = req.body || {};

  if (!credentialType || !VALID_CREDENTIAL_TYPES.includes(credentialType)) {
    return res.status(400).json({ ok: false, error: `credentialType required. Must be one of: ${VALID_CREDENTIAL_TYPES.join(", ")}` });
  }

  if (subjectDomain && !VALID_SUBJECT_DOMAINS.includes(subjectDomain)) {
    return res.status(400).json({ ok: false, error: `Invalid subjectDomain. Must be one of: ${VALID_SUBJECT_DOMAINS.join(", ")}` });
  }

  const now = admin.firestore.Timestamp.now();

  // Write to creators collection
  const creatorRef = db.collection("creators").doc(uid);
  await creatorRef.set({
    userId: uid,
    email: user.email || null,
    credentialType,
    credentialNumber: credentialNumber || null,
    credentialDeclared: true,
    subjectDomain: subjectDomain || null,
    statePractice: statePractice || null,
    employerProgram: employerProgram || null,
    vertical: "health_education",
    creatorLicense: false, // Set true when Stripe checkout completes
    medcreatorCouponUsed: false,
    verificationStatus: "self_attested",
    submittedAt: now,
    updatedAt: now,
  }, { merge: true });

  // Add to admin verification queue
  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.exists ? userSnap.data() : {};

  await db.collection("admin").doc("verification").collection("he_creator_queue").doc(uid).set({
    name: userData.displayName || userData.name || user.email,
    email: user.email,
    credentialType,
    credentialNumber: credentialNumber || null,
    subjectDomain: subjectDomain || null,
    statePractice: statePractice || null,
    employerProgram: employerProgram || null,
    submittedAt: now,
    status: "pending",
  });

  // Update user doc with HE creator flags
  await db.collection("users").doc(uid).set({
    creatorVertical: "health_education",
    heCreatorVerified: true,
    heCreatorSubmittedAt: now,
    credentialType,
    credentialDeclared: true,
    heOnboardingComplete: false,
  }, { merge: true });

  return res.json({
    ok: true,
    verificationStatus: "self_attested",
    message: "Credential recorded. Self-attestation accepted for Phase 1.",
  });
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN: APPROVE / REJECT
// ═══════════════════════════════════════════════════════════════

async function approveHeCreator(req, res) {
  const db = getDb();
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: "userId required" });

  await db.collection("admin").doc("verification").collection("he_creator_queue").doc(userId).update({
    status: "approved",
    approvedAt: admin.firestore.Timestamp.now(),
  });

  await db.collection("users").doc(userId).set({
    creatorApproved: true,
    creatorApprovedAt: admin.firestore.Timestamp.now(),
  }, { merge: true });

  await db.collection("creators").doc(userId).set({
    verificationStatus: "approved",
    approvedAt: admin.firestore.Timestamp.now(),
  }, { merge: true });

  return res.json({ ok: true, status: "approved" });
}

async function rejectHeCreator(req, res) {
  const db = getDb();
  const { userId, reason } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: "userId required" });

  await db.collection("admin").doc("verification").collection("he_creator_queue").doc(userId).update({
    status: "rejected",
    rejectedAt: admin.firestore.Timestamp.now(),
    rejectionReason: reason || "",
  });

  await db.collection("creators").doc(userId).set({
    verificationStatus: "rejected",
  }, { merge: true });

  return res.json({ ok: true, status: "rejected" });
}

async function getHeCreatorQueue(req, res) {
  const db = getDb();
  const { status } = req.query || {};

  let query = db.collection("admin").doc("verification").collection("he_creator_queue")
    .orderBy("submittedAt", "desc")
    .limit(100);

  if (status) {
    query = db.collection("admin").doc("verification").collection("he_creator_queue")
      .where("status", "==", status)
      .orderBy("submittedAt", "desc")
      .limit(100);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return res.json({ ok: true, items, count: items.length });
}

module.exports = {
  submitHeCreatorVerification,
  approveHeCreator,
  rejectHeCreator,
  getHeCreatorQueue,
  VALID_CREDENTIAL_TYPES,
  VALID_SUBJECT_DOMAINS,
};
