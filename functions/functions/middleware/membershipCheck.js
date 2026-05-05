"use strict";

/**
 * membershipCheck.js (CODEX 49.32)
 *
 * Role-based access control for tenant-scoped operations.
 * Roles (descending privilege): admin > member > viewer
 *
 *   admin  — full access; only admin can create tenant Stripe charges,
 *            add/remove members, cancel subscriptions, delete tenant data.
 *   member — read + write within the tenant context (chat, canvas, drafts).
 *   viewer — read-only; cannot send chat or modify state.
 *
 * Personal Vault (tenantId is null/'vault'/'personal') is always treated as
 * the user's own context — role checks short-circuit to "owner" with full
 * privileges.
 */

const admin = require("firebase-admin");

const ROLE_RANK = { admin: 3, member: 2, viewer: 1 };

function getDb() {
  return admin.firestore();
}

function isPersonalContext(tenantId) {
  return !tenantId || tenantId === "vault" || tenantId === "personal" || String(tenantId).startsWith("guest-");
}

/**
 * Check whether a user holds at least the required role in a tenant.
 *
 * @param {string} uid
 * @param {string|null} tenantId
 * @param {"admin"|"member"|"viewer"} requiredRole
 * @returns {Promise<{ok: boolean, role: string|null, error: string|null}>}
 */
async function enforceRoleGate(uid, tenantId, requiredRole) {
  if (isPersonalContext(tenantId)) {
    // Personal Vault — caller is the owner.
    return { ok: true, role: "owner", error: null };
  }
  if (!uid) {
    return { ok: false, role: null, error: "not_authenticated" };
  }
  const need = ROLE_RANK[requiredRole] || 1;

  const db = getDb();
  const snap = await db.collection("memberships")
    .where("userId", "==", uid)
    .where("tenantId", "==", tenantId)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (snap.empty) {
    return { ok: false, role: null, error: "not_a_member" };
  }

  const role = snap.docs[0].data().role || "member";
  const have = ROLE_RANK[role] || 1;
  if (have < need) {
    return { ok: false, role, error: "insufficient_role" };
  }
  return { ok: true, role, error: null };
}

/**
 * Express-style helper that returns a 403 when role gate fails.
 * Returns true when the request was rejected (caller should `return`).
 */
async function rejectIfRoleInsufficient(res, uid, tenantId, requiredRole) {
  const result = await enforceRoleGate(uid, tenantId, requiredRole);
  if (!result.ok) {
    res.status(result.error === "not_authenticated" ? 401 : 403).json({
      ok: false,
      error: result.error,
      requiredRole,
      currentRole: result.role,
    });
    return true;
  }
  return false;
}

module.exports = { enforceRoleGate, rejectIfRoleInsufficient, ROLE_RANK, isPersonalContext };
