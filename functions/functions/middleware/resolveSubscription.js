"use strict";

/**
 * resolveSubscription.js (CODEX 49.32)
 *
 * Single source of truth for "does this caller have access to this worker
 * right now?" across both Personal Vault (user-pays) and Business workspace
 * (tenant-pays) contexts.
 *
 * Resolution order:
 *   1. Tenant-scoped subscription (ownerType:"tenant") — preferred when caller
 *      is in a Business workspace and is an active member.
 *   2. User-scoped subscription (ownerType:"user") — Personal Vault flow.
 *   3. Legacy fallback — pre-49.32 docs that have neither ownerType set,
 *      treated as user-scope keyed by `userId`.
 *
 * The output also reports which collection the answer came from so callers
 * can log + display source-of-truth info to the user.
 */

const admin = require("firebase-admin");
const { isActive, normalizeLegacyStatus } = require("../config/subscriptionStatus");

function getDb() {
  return admin.firestore();
}

const ACTIVE_STATUSES = ["active", "trialing"]; // canonical
const FREE_WORKERS = new Set([
  "GOV-000", "GOV-015", "GOV-030", "GOV-040", "GOV-057",
  "ESC-012",
  // Alex/Chief of Staff is platform entitlement — never gated.
  "chief-of-staff",
]);

function subStatusActive(sub) {
  if (!sub) return false;
  const ts = sub.trialStatus || normalizeLegacyStatus(sub.status);
  return ACTIVE_STATUSES.includes(ts) || isActive(ts);
}

/**
 * Verify caller has an active membership in the tenant. Used as a gate
 * before granting tenant-scoped subscription access.
 */
async function hasActiveMembership(db, uid, tenantId) {
  if (!uid || !tenantId) return null;
  const snap = await db.collection("memberships")
    .where("userId", "==", uid)
    .where("tenantId", "==", tenantId)
    .where("status", "==", "active")
    .limit(1)
    .get();
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * Look for a tenant-scoped subscription on the worker.
 */
async function findTenantSub(db, tenantId, workerSlug) {
  const slugQuery = db.collection("subscriptions")
    .where("ownerType", "==", "tenant")
    .where("ownerId", "==", tenantId)
    .where("slug", "==", workerSlug)
    .limit(3); // limit > 1 in case of historical duplicates; pick freshest active
  const snap = await slugQuery.get();
  if (snap.empty) {
    // Try workerId as fallback (some older docs use workerId, not slug).
    const idQuery = db.collection("subscriptions")
      .where("ownerType", "==", "tenant")
      .where("ownerId", "==", tenantId)
      .where("workerId", "==", workerSlug)
      .limit(3);
    const idSnap = await idQuery.get();
    if (idSnap.empty) return null;
    const docs = idSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(subStatusActive);
    return docs[0] || null;
  }
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(subStatusActive);
  return docs[0] || null;
}

/**
 * Look for a user-scoped subscription. Tries the new ownerType discriminator
 * first, then falls back to legacy `userId` lookups for pre-49.32 docs.
 */
async function findUserSub(db, uid, workerSlug) {
  // 1. New shape — ownerType:"user".
  const newQuery = db.collection("subscriptions")
    .where("ownerType", "==", "user")
    .where("ownerId", "==", uid)
    .where("slug", "==", workerSlug)
    .limit(3);
  const newSnap = await newQuery.get();
  if (!newSnap.empty) {
    const docs = newSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(subStatusActive);
    if (docs[0]) return { sub: docs[0], legacy: false };
  }

  // 2. Legacy — pre-49.32 docs keyed only on `userId`.
  const legacyQuery = db.collection("subscriptions")
    .where("userId", "==", uid)
    .where("slug", "==", workerSlug)
    .limit(3);
  const legacySnap = await legacyQuery.get();
  if (!legacySnap.empty) {
    const docs = legacySnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(subStatusActive);
    if (docs[0]) return { sub: docs[0], legacy: true };
  }

  // 3. Even more legacy — workerId not slug.
  const legacyIdQuery = db.collection("subscriptions")
    .where("userId", "==", uid)
    .where("workerId", "==", workerSlug)
    .limit(3);
  const legacyIdSnap = await legacyIdQuery.get();
  if (!legacyIdSnap.empty) {
    const docs = legacyIdSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(subStatusActive);
    if (docs[0]) return { sub: docs[0], legacy: true };
  }

  return null;
}

/**
 * Main resolver.
 *
 * @param {string} uid - authenticated user id
 * @param {string|null} tenantId - active workspace; null/'vault'/'personal' for Personal Vault
 * @param {string} workerSlug - worker identifier (slug or workerId; both work)
 * @returns {Promise<{
 *   active: boolean,
 *   source: "tenant" | "user" | "legacy" | "free" | "none",
 *   subDoc: object|null,
 *   reason: string|null,
 *   tenantId: string|null,
 *   membershipRole: string|null
 * }>}
 */
async function resolveSubscription(uid, tenantId, workerSlug) {
  if (!workerSlug) {
    return { active: false, source: "none", subDoc: null, reason: "missing_worker", tenantId: null, membershipRole: null };
  }

  // Free workers — always allowed.
  if (FREE_WORKERS.has(workerSlug)) {
    return { active: true, source: "free", subDoc: null, reason: null, tenantId: tenantId || null, membershipRole: null };
  }

  const db = getDb();
  const isTenantContext = tenantId && tenantId !== "vault" && tenantId !== "personal" && !tenantId.startsWith("guest-");

  // 1. Tenant context — prefer tenant-scoped sub.
  if (isTenantContext) {
    const tenantSub = await findTenantSub(db, tenantId, workerSlug);
    if (tenantSub) {
      const membership = await hasActiveMembership(db, uid, tenantId);
      if (!membership) {
        return { active: false, source: "tenant", subDoc: tenantSub, reason: "not_a_member", tenantId, membershipRole: null };
      }
      return { active: true, source: "tenant", subDoc: tenantSub, reason: null, tenantId, membershipRole: membership.role || "member" };
    }
    // Fall through — caller might still have a personal sub usable in any context.
  }

  // 2. User-scoped sub (Personal Vault flow OR personal sub used inside tenant context).
  if (uid) {
    const userResult = await findUserSub(db, uid, workerSlug);
    if (userResult) {
      return {
        active: true,
        source: userResult.legacy ? "legacy" : "user",
        subDoc: userResult.sub,
        reason: null,
        tenantId: null,
        membershipRole: null,
      };
    }
  }

  return { active: false, source: "none", subDoc: null, reason: "no_subscription", tenantId: tenantId || null, membershipRole: null };
}

module.exports = { resolveSubscription, FREE_WORKERS };
