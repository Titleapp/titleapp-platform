"use strict";
/**
 * Storage Access Control — CODEX 49.5 Phase A
 * Permission checks for storage objects.
 */

/**
 * Check if a user can read an object.
 * @param {string} requestUid — who is requesting
 * @param {string} ownerUid — who owns the object
 * @param {string} scope — personal | business | shared
 * @param {string|null} orgId
 * @param {Array} accessList — [{uid, permission}]
 * @returns {{ ok: boolean, error?: string }}
 */
function canRead(requestUid, ownerUid, scope, orgId, accessList = []) {
  // Owner can always read
  if (requestUid === ownerUid) return { ok: true };

  // Business scope — org members can read
  if (scope === "business" && orgId) {
    // In production, check org membership. For now, check accessList.
    const entry = accessList.find(a => a.uid === requestUid);
    if (entry) return { ok: true };
  }

  // Shared scope — check explicit access list
  if (scope === "shared") {
    const entry = accessList.find(a => a.uid === requestUid);
    if (entry && (entry.permission === "read" || entry.permission === "write" || entry.permission === "admin")) {
      return { ok: true };
    }
  }

  // Personal scope — owner only
  return { ok: false, error: "forbidden", message: "You do not have access to this object" };
}

/**
 * Check if a user can write/upload to a scope.
 * @param {string} requestUid
 * @param {string} ownerUid
 * @param {string} scope
 * @param {string|null} orgId
 * @returns {{ ok: boolean, error?: string }}
 */
function canWrite(requestUid, ownerUid, scope, orgId) {
  // Owner can always write to their own scope
  if (requestUid === ownerUid) return { ok: true };

  // Business scope — admin or creator can write
  if (scope === "business" && orgId) {
    // TODO: check org admin role from memberships collection
    return { ok: false, error: "forbidden", message: "Only org admins can upload to business scope" };
  }

  return { ok: false, error: "forbidden", message: "Cannot write to this scope" };
}

/**
 * Enforce access list — add or remove a user.
 */
function enforceAccessList(accessList, targetUid, permission) {
  const existing = accessList.findIndex(a => a.uid === targetUid);
  if (permission === null || permission === "revoke") {
    // Remove
    if (existing >= 0) accessList.splice(existing, 1);
  } else if (existing >= 0) {
    // Update
    accessList[existing].permission = permission;
  } else {
    // Add
    accessList.push({ uid: targetUid, permission });
  }
  return accessList;
}

module.exports = { canRead, canWrite, enforceAccessList };
