"use strict";
/**
 * Storage Access Control — CODEX 49.5 Phase A
 * Permission checks for storage objects.
 *
 * 50.27 — workspace-aware: when an object carries an orgId (== tenantId),
 * any active member of that workspace can read it. Without this, invited
 * members hit FORBIDDEN on Accounting reports / canvasArchive output even
 * though the Drive list shows the files.
 */

const admin = require("firebase-admin");

async function isWorkspaceMember(uid, tenantId) {
  if (!uid || !tenantId) return false;
  try {
    const snap = await admin.firestore().collection("memberships")
      .where("userId", "==", uid)
      .where("tenantId", "==", tenantId)
      .where("status", "==", "active")
      .limit(1)
      .get();
    return !snap.empty;
  } catch (e) {
    console.warn("[storage/access] membership lookup failed:", e.message);
    return false;
  }
}

/**
 * Check if a user can read an object.
 * Async now — performs a memberships lookup when the object is workspace-scoped.
 * @param {string} requestUid — who is requesting
 * @param {string} ownerUid — who owns the object
 * @param {string} scope — personal | business | org | shared
 * @param {string|null} orgId — tenant/workspace ID
 * @param {Array} accessList — [{uid, permission}]
 * @returns {Promise<{ ok: boolean, error?: string, message?: string }>}
 */
async function canRead(requestUid, ownerUid, scope, orgId, accessList = []) {
  // Owner can always read
  if (requestUid === ownerUid) return { ok: true };

  // Explicit access list (any scope) — covers shared docs + targeted grants
  const grant = (accessList || []).find(a => a.uid === requestUid);
  if (grant && ["read", "write", "admin"].includes(grant.permission)) {
    return { ok: true };
  }

  // Workspace-scoped object — any scope that carries an orgId is treated as
  // a workspace doc (business / org / shared-in-workspace). Active members
  // of that workspace can read.
  if (orgId && requestUid !== orgId) {
    const isMember = await isWorkspaceMember(requestUid, orgId);
    if (isMember) return { ok: true };
  }

  return { ok: false, error: "forbidden", message: "You do not have access to this object" };
}

/**
 * Check if a user can write/upload to a scope.
 * Async — checks workspace membership for org/business writes.
 */
async function canWrite(requestUid, ownerUid, scope, orgId) {
  // Owner can always write to their own scope
  if (requestUid === ownerUid) return { ok: true };

  // Workspace member can write to the workspace's shared scope
  if (orgId) {
    const isMember = await isWorkspaceMember(requestUid, orgId);
    if (isMember) return { ok: true };
  }

  return { ok: false, error: "forbidden", message: "Cannot write to this scope" };
}

/**
 * Enforce access list — add or remove a user.
 */
function enforceAccessList(accessList, targetUid, permission) {
  const existing = accessList.findIndex(a => a.uid === targetUid);
  if (permission === null || permission === "revoke") {
    if (existing >= 0) accessList.splice(existing, 1);
  } else if (existing >= 0) {
    accessList[existing].permission = permission;
  } else {
    accessList.push({ uid: targetUid, permission });
  }
  return accessList;
}

module.exports = { canRead, canWrite, enforceAccessList, isWorkspaceMember };
