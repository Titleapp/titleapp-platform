"use strict";

/**
 * fundraise/dataRoom.js — CODEX 50.15 P0-14
 *
 * Fundraise data room infrastructure:
 *   - fundraises/{fundraiseId}                  — fundraise instance
 *   - fundraises/{fundraiseId}/investors/{id}   — invited investor records
 *   - fundraiseShares/{shareId}                 — scoped share-link tokens
 *
 * Drive partition: existing storageObjects collection (CODEX 50.13) gets
 * a `fundraiseId` field where applicable. Files uploaded inside the Data
 * Room tab carry fundraiseId; files outside don't. The investor-side
 * data room view filters storageObjects by tenantId + fundraiseId and
 * by share.allowedFiles when a subset is selected at share creation.
 *
 * Share token: 32-byte URL-safe random ID, 7-day default expiry, email
 * verification via the existing magicLink primitive. Each access logs
 * to share.accessLog for the audit trail.
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }
const ts = () => admin.firestore.FieldValue.serverTimestamp();

const VALID_STAGES = ["active", "closed", "cancelled"];

// ═══════════════════════════════════════════════════════════════
//  FUNDRAISE CRUD
// ═══════════════════════════════════════════════════════════════

async function createFundraise(input) {
  const { tenantId, name, target_raise = null, lead_investor = null, createdBy = null } = input;
  if (!tenantId || !name) throw new Error("createFundraise: tenantId and name required");

  const fundraiseId = `fr_${crypto.randomBytes(8).toString("hex")}`;
  await getDb().collection("fundraises").doc(fundraiseId).set({
    fundraiseId, tenantId, name,
    stage: "active",
    target_raise, current_raised: 0, lead_investor,
    created_at: ts(), updated_at: ts(), created_by: createdBy,
  });
  return { ok: true, fundraiseId };
}

async function updateFundraise(fundraiseId, patch, updatedBy = null) {
  const ref = getDb().collection("fundraises").doc(fundraiseId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`updateFundraise: ${fundraiseId} not found`);

  const allowed = ["name", "stage", "target_raise", "current_raised", "lead_investor"];
  const updates = {};
  for (const k of allowed) if (patch[k] !== undefined) updates[k] = patch[k];
  if (updates.stage && !VALID_STAGES.includes(updates.stage)) {
    throw new Error(`updateFundraise: invalid stage`);
  }
  updates.updated_at = ts();
  updates.updated_by = updatedBy;
  await ref.update(updates);
  return { ok: true, fundraiseId };
}

async function getFundraise(fundraiseId, tenantId) {
  const snap = await getDb().collection("fundraises").doc(fundraiseId).get();
  if (!snap.exists) return null;
  const d = snap.data();
  if (d.tenantId !== tenantId) return null; // tenant scoping
  return d;
}

async function listFundraises(tenantId, { stage = null } = {}) {
  let q = getDb().collection("fundraises").where("tenantId", "==", tenantId);
  if (stage) q = q.where("stage", "==", stage);
  const snap = await q.orderBy("created_at", "desc").limit(50).get();
  return snap.docs.map(d => d.data());
}

// ═══════════════════════════════════════════════════════════════
//  INVESTOR RECORDS
// ═══════════════════════════════════════════════════════════════

async function addInvestor(fundraiseId, input, addedBy = null) {
  const { contactId = null, email, name, commitment_amount = null } = input;
  if (!email || !name) throw new Error("addInvestor: email and name required");

  const investorId = `inv_${crypto.randomBytes(8).toString("hex")}`;
  await getDb().collection("fundraises").doc(fundraiseId)
    .collection("investors").doc(investorId).set({
      investorId, contactId, email, name,
      commitment_amount, committed_at: null,
      kycStatus: "not_submitted",
      kycSubmittedAt: null, kycVerifiedAt: null, kycRejectionReason: null,
      accreditationStatus: "unverified",
      created_at: ts(), updated_at: ts(), added_by: addedBy,
    });
  return { ok: true, investorId };
}

async function listInvestors(fundraiseId) {
  const snap = await getDb().collection("fundraises").doc(fundraiseId)
    .collection("investors").orderBy("created_at", "desc").limit(500).get();
  return snap.docs.map(d => d.data());
}

// ═══════════════════════════════════════════════════════════════
//  SCOPED SHARE LINKS
// ═══════════════════════════════════════════════════════════════

const DEFAULT_SHARE_EXPIRY_DAYS = 7;

async function createShare(input) {
  const {
    fundraiseId, tenantId, email,
    allowedFiles = [], expiryDays = DEFAULT_SHARE_EXPIRY_DAYS, createdBy = null,
  } = input;
  if (!fundraiseId || !tenantId || !email) {
    throw new Error("createShare: fundraiseId, tenantId, email required");
  }

  const shareId = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  await getDb().collection("fundraiseShares").doc(shareId).set({
    shareId, fundraiseId, tenantId, email,
    allowedFiles, // empty array means all fundraise files
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    verifiedAt: null,
    accessLog: [],
    created_at: ts(),
    created_by: createdBy,
  });

  return {
    ok: true,
    shareId,
    expiresAt: expiresAt.toISOString(),
    accessUrl: `https://app.titleapp.ai/fundraise/${shareId}`,
  };
}

/**
 * Verify a share-token + email match. Used by the investor-facing
 * data room view to authenticate the visitor before listing files.
 *
 * Returns share metadata if valid, throws otherwise.
 */
async function verifyShareAccess(shareId, providedEmail, ip = null) {
  const ref = getDb().collection("fundraiseShares").doc(shareId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("share not found");

  const share = snap.data();
  if (share.expiresAt && share.expiresAt.toDate() < new Date()) {
    throw new Error("share expired");
  }
  if (share.email.toLowerCase() !== providedEmail.toLowerCase()) {
    throw new Error("email does not match share token");
  }

  // Log access
  await ref.update({
    accessLog: admin.firestore.FieldValue.arrayUnion({
      at: new Date().toISOString(),
      ip: ip || null,
    }),
    verifiedAt: share.verifiedAt || ts(),
  });

  return share;
}

/**
 * List the storageObjects (CODEX 50.13 Drive partition) accessible to
 * a verified share holder.
 */
async function listShareFiles(shareId, providedEmail) {
  const share = await verifyShareAccess(shareId, providedEmail);

  let q = getDb().collection("storageObjects")
    .where("tenantId", "==", share.tenantId)
    .where("fundraiseId", "==", share.fundraiseId);

  const snap = await q.limit(200).get();
  let files = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Subset filter if allowedFiles specified
  if (Array.isArray(share.allowedFiles) && share.allowedFiles.length > 0) {
    const allowedSet = new Set(share.allowedFiles);
    files = files.filter(f => allowedSet.has(f.objectId || f.id));
  }

  return { share, files };
}

module.exports = {
  createFundraise,
  updateFundraise,
  getFundraise,
  listFundraises,
  addInvestor,
  listInvestors,
  createShare,
  verifyShareAccess,
  listShareFiles,
  VALID_STAGES,
};
