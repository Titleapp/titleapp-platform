"use strict";

/**
 * userProvisioning.js — Idempotent first-touch provisioning for any authenticated user.
 *
 * The signup endpoints (/auth:signup, signupInternal) seed the default platform
 * Spine workers, but Google / Apple / SAML sign-ins go through Firebase Auth directly
 * and never hit those endpoints. This helper guarantees that any authenticated user
 * has the user doc + default Spine worker subscriptions, regardless of how they signed in.
 *
 * Idempotent: safe to call on every request; only does work the first time.
 */

const admin = require("firebase-admin");

const DEFAULT_PLATFORM_WORKERS = [
  { slug: "chief-of-staff", name: "Alex — Chief of Staff" },
  { slug: "platform-accounting", name: "Alex Business Accounting" },
  { slug: "platform-hr", name: "Alex HR & People" },
  { slug: "platform-marketing", name: "Alex Marketing & Content" },
  { slug: "platform-control-center-pro", name: "Control Center Pro" },
  { slug: "platform-contacts", name: "Contacts" },
];

function getDb() { return admin.firestore(); }
function nowServerTs() { return admin.firestore.FieldValue.serverTimestamp(); }

/**
 * Ensure a user has been provisioned with the default Spine workers.
 * Safe to call on every authenticated request.
 *
 * @param {string} uid — Firebase Auth UID
 * @param {object} [authUser] — decoded ID token (from admin.auth().verifyIdToken)
 * @returns {Promise<{provisioned: boolean, reason?: string, workersGranted?: number}>}
 */
async function ensureUserProvisioned(uid, authUser = {}) {
  if (!uid) return { provisioned: false, reason: "missing_uid" };

  const db = getDb();
  const userRef = db.collection("users").doc(uid);

  // Fast path: any subscription with source=signup_default already exists -> already provisioned
  const existingDefault = await db.collection("subscriptions")
    .where("userId", "==", uid)
    .where("source", "==", "signup_default")
    .limit(1)
    .get();
  if (!existingDefault.empty) return { provisioned: false, reason: "already_provisioned" };

  // Resolve identity fields from the decoded token (or auth user record as fallback).
  let email = authUser.email || null;
  let name = authUser.name || authUser.displayName || null;
  if (!email || !name) {
    try {
      const userRecord = await admin.auth().getUser(uid);
      email = email || userRecord.email || null;
      name = name || userRecord.displayName || null;
    } catch (lookupErr) {
      console.warn(`[userProvisioning] auth lookup failed for ${uid}: ${lookupErr.message}`);
    }
  }

  const nameParts = (name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || null;
  const avatarInitials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : (firstName ? firstName[0].toUpperCase() : null);

  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    await userRef.set({
      email,
      name,
      ...(firstName && { firstName }),
      ...(avatarInitials && { avatarInitials }),
      activeProfileId: "default",
      accountType: "consumer",
      companyName: null,
      companyDescription: null,
      termsAcceptedAt: null,
      createdAt: nowServerTs(),
      createdVia: "auto_provision",
    });
  }

  // Alex entitlement (mirrors /auth:signup behavior)
  try {
    await userRef.collection("entitlements").doc("alex").set({
      grantedAt: nowServerTs(),
      source: "signup_bonus",
      version: "1.0",
    }, { merge: true });
  } catch (entErr) {
    console.warn(`[userProvisioning] entitlement write failed for ${uid}: ${entErr.message}`);
  }

  // Seed default Spine worker subscriptions
  const batch = db.batch();
  for (const w of DEFAULT_PLATFORM_WORKERS) {
    batch.set(db.collection("subscriptions").doc(), {
      userId: uid,
      workerId: w.slug,
      slug: w.slug,
      workerName: w.name,
      trialStatus: "subscribed",
      createdAt: nowServerTs(),
      source: "signup_default",
    });
  }
  await batch.commit();

  console.log(`[userProvisioning] Provisioned ${DEFAULT_PLATFORM_WORKERS.length} default workers for uid=${uid} email=${email || "?"}`);
  return { provisioned: true, workersGranted: DEFAULT_PLATFORM_WORKERS.length };
}

module.exports = { ensureUserProvisioned, DEFAULT_PLATFORM_WORKERS };
