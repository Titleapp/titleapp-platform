/**
 * membershipEvents.js — append-only log for membership status/role changes.
 *
 * CODEX 98. `memberships.status`/`role` are mutated in place today with no
 * history of what changed, when, or who triggered it — the exact gap the
 * DTC contentHash/Merkle-anchor pipeline (hashAnchor.js, dailyBatchAnchor.js)
 * already closes for record *content*, just not yet for access control.
 * This is additive: it does not change the existing `memberships` doc
 * update, it runs alongside it. contentHash is computed the same way
 * hashAnchor.js does for DTCs, so these events can feed a sibling daily
 * batch-anchor job later without touching the live DTC anchoring pipeline.
 */

const admin = require("firebase-admin");
const { sha256 } = require("../signatureService/blockchain");

const CANONICAL_FIELDS = ["changedAt", "changedBy", "changeType", "fromValue", "membershipId", "tenantId", "toValue", "uid"];

function canonicalize(event) {
  const obj = {};
  for (const k of CANONICAL_FIELDS) {
    if (event[k] !== undefined) obj[k] = event[k];
  }
  return JSON.stringify(obj);
}

/**
 * @param {object} db firestore instance
 * @param {object} a
 * @param {string} a.membershipId
 * @param {string} a.uid
 * @param {string} a.tenantId
 * @param {"status_changed"|"role_changed"|"created"} a.changeType
 * @param {*} a.fromValue
 * @param {*} a.toValue
 * @param {string} a.changedBy uid of whoever/whatever triggered this (a user, or a system/worker slug)
 */
async function recordMembershipEvent(db, { membershipId, uid, tenantId, changeType, fromValue, toValue, changedBy }) {
  const changedAtIso = new Date().toISOString();
  const event = {
    membershipId,
    uid,
    tenantId,
    changeType,
    fromValue: fromValue ?? null,
    toValue: toValue ?? null,
    changedBy: changedBy || "system",
    changedAt: changedAtIso,
  };
  event.contentHash = sha256(canonicalize(event));
  const ref = await db.collection("membershipEvents").add({
    ...event,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    batchId: null, // picked up by a future sibling daily-batch-anchor job (CODEX 98) — not yet built
  });
  return ref.id;
}

module.exports = { recordMembershipEvent };
