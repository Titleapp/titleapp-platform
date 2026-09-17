"use strict";

/**
 * workerGate.js — CODEX 93 Tier A/B: the mechanical gate a creator-authored
 * worker must pass before it can go live, and again on every edit.
 *
 * Real, request-time enforcement, not just a registry declaration — the
 * platform-wide capability registry (contracts/capabilities.json) is
 * documentation only today (`_enforcement.runtimeEnforced: false`; routes in
 * index.js don't check it). That's a separate, already-planned, larger
 * initiative (target v2.0.0). This module doesn't wait for that: since
 * creator publishing is a brand-new code path with no existing callers to
 * retrofit, Tier A is enforced directly here, at the one place a creator
 * worker definition is actually written.
 *
 * Tier C (anything outside the allowlist, or a genuinely new capability) is
 * NOT handled here — it's a hard rejection back to the caller, routed to a
 * real human decision per CODEX 93 §4. This module never approves Tier C.
 */

// The only capabilities a creator worker may ever declare. Deliberately
// narrow: no write access to another tenant's data, no financial-transaction
// capability, no PHI-adjacent capability. Extend only after a real, reviewed
// decision — this list IS the regulatory-exposure boundary for layer 2.
const CREATOR_CAPABILITY_ALLOWLIST = new Set([
  "creator.chat_v1",
  "creator.generate_content_v1",
  "creator.read_own_content_v1",
  "creator.schedule_v1",
]);

// Tier B content flag — detects regulated-domain-shaped language at
// submission and on every edit. Deliberately does NOT adjudicate whether
// the content is correct (CODEX 93 #4: that stays the creator's domain).
// It only decides whether the subscriber-facing disclosure + creator-
// identity-visibility requirement (also CODEX 93 #4, resolved 2026-09-17
// post-legal-call) applies to this worker.
const REGULATED_CONTENT_PATTERNS = {
  medical: /\b(diagnos|prescri|dosage|dosing|treatment plan|medical advice|symptom)\w*/i,
  legal: /\b(legal advice|represent(s|ation)? you|your rights|sue|lawsuit|contract review|attorney[- ]client)\b/i,
  financial: /\b(investment advice|guaranteed returns?|financial advice|tax advice|which stocks|portfolio allocation)\b/i,
};

/**
 * Tier A — capability-scope check. Hard rejection, not a warning: any
 * capability outside the allowlist, or any attempt to define a new
 * capability ID, fails the whole submission.
 */
function checkTierA(capabilities) {
  const list = Array.isArray(capabilities) ? capabilities : [];
  const violations = list.filter((c) => !CREATOR_CAPABILITY_ALLOWLIST.has(c));
  return { passed: violations.length === 0 && list.length > 0, violations };
}

/**
 * Tier B — regulated-content scan against the worker's system prompt /
 * description. Never blocks; only flags, per #4's resolution.
 */
function checkTierB(systemPrompt) {
  const text = String(systemPrompt || "");
  const matchedCategories = Object.entries(REGULATED_CONTENT_PATTERNS)
    .filter(([, pattern]) => pattern.test(text))
    .map(([category]) => category);
  return { contentFlagged: matchedCategories.length > 0, matchedCategories };
}

/**
 * Full gate. Runs on initial submission AND on every edit (CODEX 93 round 2:
 * a creator's prompt can drift post-approval without touching its
 * capability list at all — re-running this on every update is the fix).
 */
function validateCreatorWorker({ capabilities, systemPrompt }) {
  const tierA = checkTierA(capabilities);
  const tierB = checkTierB(systemPrompt);
  return {
    approved: tierA.passed,
    tierA,
    tierB,
    // Both required together when flagged, per #4's resolution — the
    // subscriber-facing AI disclosure and the creator's own identity/
    // credentials must be immediately viewable, not just an internal
    // creator-facing acknowledgment.
    requiresDisclosure: tierB.contentFlagged,
    requiresCreatorIdentityDisplay: tierB.contentFlagged,
  };
}

module.exports = {
  CREATOR_CAPABILITY_ALLOWLIST,
  REGULATED_CONTENT_PATTERNS,
  checkTierA,
  checkTierB,
  validateCreatorWorker,
};
