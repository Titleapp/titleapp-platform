/**
 * jurisdictionRbac.js — Jurisdiction-scoped role-based access control
 *
 * Firestore structure: jurisdictions/{fips_code}/users/{uid}
 *
 * 4 roles (descending authority):
 *   jurisdiction_admin  — Full access, manage users, activate/deactivate workers
 *   department_super    — Approve outputs, configure workers for their department
 *   field_operator      — Trigger workers, submit inputs (inspectors, clerks)
 *   public_viewer       — Read-only public-facing outputs, no PII
 */

const admin = require("firebase-admin");

function getDb() {
  return admin.firestore();
}

// ═══════════════════════════════════════════════════════════════
//  ROLE HIERARCHY
// ═══════════════════════════════════════════════════════════════

const ROLES = ["public_viewer", "field_operator", "department_super", "jurisdiction_admin"];
const VALID_SUITES = ["dmv", "permitting", "inspector", "recorder"];

function roleLevel(role) {
  const idx = ROLES.indexOf(role);
  return idx >= 0 ? idx : -1;
}

// ═══════════════════════════════════════════════════════════════
//  FIPS VALIDATION
// ═══════════════════════════════════════════════════════════════

const FIPS_RE = /^\d{5}$/;

function isValidFips(fips) {
  return typeof fips === "string" && FIPS_RE.test(fips);
}

// ═══════════════════════════════════════════════════════════════
//  CHECK ROLE
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a user has at least the minimum required role in a jurisdiction.
 *
 * @param {string} fips — 5-digit FIPS code
 * @param {string} uid — Firebase Auth UID
 * @param {string} minRole — minimum required role
 * @param {object} [opts]
 * @param {string} [opts.requiredSuite] — if set, user must have access to this suite
 * @returns {Promise<{authorized: boolean, role: string|null, reason: string|null}>}
 */
async function requireJurisdictionRole(fips, uid, minRole, opts = {}) {
  if (!isValidFips(fips)) {
    return { authorized: false, role: null, reason: "invalid_fips" };
  }

  const minLevel = roleLevel(minRole);
  if (minLevel < 0) {
    return { authorized: false, role: null, reason: "invalid_role" };
  }

  const db = getDb();
  const userDoc = await db.doc(`jurisdictions/${fips}/users/${uid}`).get();

  if (!userDoc.exists) {
    return { authorized: false, role: null, reason: "user_not_in_jurisdiction" };
  }

  const data = userDoc.data();
  const userLevel = roleLevel(data.role);

  if (userLevel < minLevel) {
    return {
      authorized: false,
      role: data.role,
      reason: "insufficient_role",
    };
  }

  // Check suite access if required
  if (opts.requiredSuite) {
    const userSuites = Array.isArray(data.suites) ? data.suites : [];
    if (!userSuites.includes(opts.requiredSuite) && data.role !== "jurisdiction_admin") {
      return {
        authorized: false,
        role: data.role,
        reason: "no_suite_access",
      };
    }
  }

  return { authorized: true, role: data.role, reason: null };
}

// ═══════════════════════════════════════════════════════════════
//  CREATE / UPDATE USER ROLE
// ═══════════════════════════════════════════════════════════════

/**
 * Create or update a jurisdiction user role.
 *
 * @param {string} fips — 5-digit FIPS code
 * @param {string} uid — user to assign
 * @param {object} assignment
 * @param {string} assignment.role — one of ROLES
 * @param {string[]} assignment.suites — suite access list
 * @param {string} [assignment.department] — department name
 * @param {string} approvedBy — UID of the admin approving this assignment
 * @returns {Promise<{ok: boolean}>}
 */
async function createJurisdictionUser(fips, uid, assignment, approvedBy) {
  if (!isValidFips(fips)) throw new Error("Invalid FIPS code");
  if (!ROLES.includes(assignment.role)) throw new Error("Invalid role: " + assignment.role);

  const suites = Array.isArray(assignment.suites) ? assignment.suites : [];
  for (const s of suites) {
    if (!VALID_SUITES.includes(s)) throw new Error("Invalid suite: " + s);
  }

  const db = getDb();
  await db.doc(`jurisdictions/${fips}/users/${uid}`).set({
    role: assignment.role,
    suites,
    department: assignment.department || null,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    approved_by: approvedBy,
  });

  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════
//  LIST JURISDICTION USERS
// ═══════════════════════════════════════════════════════════════

/**
 * List all users in a jurisdiction.
 *
 * @param {string} fips
 * @returns {Promise<object[]>}
 */
async function listJurisdictionUsers(fips) {
  if (!isValidFips(fips)) throw new Error("Invalid FIPS code");

  const db = getDb();
  const snap = await db.collection(`jurisdictions/${fips}/users`).get();
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// ═══════════════════════════════════════════════════════════════
//  CREATE JURISDICTION RECORD
// ═══════════════════════════════════════════════════════════════

/**
 * Create the jurisdiction root document during GOV-000 onboarding.
 *
 * @param {object} jurisdictionData
 * @returns {Promise<{ok: boolean, fips: string}>}
 */
async function createJurisdiction(jurisdictionData) {
  const { fips_code } = jurisdictionData;
  if (!isValidFips(fips_code)) throw new Error("Invalid FIPS code");

  const db = getDb();
  const existing = await db.doc(`jurisdictions/${fips_code}`).get();
  if (existing.exists) throw new Error("Jurisdiction already exists: " + fips_code);

  await db.doc(`jurisdictions/${fips_code}`).set({
    ...jurisdictionData,
    status: "onboarding",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true, fips: fips_code };
}

module.exports = {
  ROLES,
  VALID_SUITES: VALID_SUITES,
  isValidFips,
  roleLevel,
  requireJurisdictionRole,
  createJurisdictionUser,
  listJurisdictionUsers,
  createJurisdiction,
};
