"use strict";

/**
 * dataQualityFlags.js — 2026-09-23, real incident: SOCIII's own `transactions`
 * collection was found to diverge sharply from the real, CPA-reviewed
 * financial statements (Parth Shah's corrected balance sheet in Drive) —
 * confirmed causes include inconsistently-tagged refunds (classification:
 * "expense" instead of "refund", so they aren't excluded), duplicate
 * transaction imports, and at least one personal expense not actually
 * excluded despite a review note claiming it was.
 *
 * This is a real data-quality problem, not a code bug in the aggregation
 * logic itself (dashboardSummary.js already correctly excludes
 * internal_transfer/refund-classified rows) — the underlying records are
 * wrong. Per this session's own "flag, don't resolve" principle (the same
 * one CODEX 103 is built around for Sterling): this module doesn't clean
 * up or reclassify anything automatically. Fixing which specific
 * transactions are duplicates or personal requires a human (Sean, ideally
 * with Parth) actually looking at the source bank/card statements — an AI
 * silently deciding "this one's a duplicate, delete it" on real financial
 * records is exactly the kind of unilateral judgment call this system is
 * designed to avoid.
 *
 * What this DOES do: give any worker that grounds itself in accounting
 * data (today: Max via workspaceBrief.js) a way to check "is this tenant's
 * transaction data known to be unreliable right now" and append an honest
 * caveat, instead of presenting a wrong number with full confidence.
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }
function flagRef(tenantId) { return getDb().collection("accountingDataQualityFlags").doc(tenantId); }

/** Read-only. Returns null if no flag is set (the normal, healthy case). */
async function getDataQualityFlag(tenantId) {
  if (!tenantId) return null;
  const snap = await flagRef(tenantId).get();
  return snap.exists ? snap.data() : null;
}

/**
 * Sets or clears a flag. `reason` should be a short, human-written
 * explanation — this is surfaced verbatim to whoever reads the flag, so it
 * must never be model-generated free text (same discipline CODEX 100
 * requires for findings' reason strings: fixed, human-reviewed content,
 * not something an LLM composes about untrusted data).
 */
async function setDataQualityFlag(tenantId, { reason, flaggedBy }) {
  if (!tenantId) throw new Error("setDataQualityFlag: tenantId is required");
  if (!reason) throw new Error("setDataQualityFlag: reason is required");
  await flagRef(tenantId).set({
    tenantId, reason, flaggedBy: flaggedBy || "unspecified",
    flaggedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function clearDataQualityFlag(tenantId) {
  if (!tenantId) throw new Error("clearDataQualityFlag: tenantId is required");
  await flagRef(tenantId).delete();
}

module.exports = { getDataQualityFlag, setDataQualityFlag, clearDataQualityFlag };
