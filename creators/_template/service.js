/**
 * Service module for `<your-worker-slug>` worker.
 *
 * Patterns to follow:
 *  - Functions are PURE — take input, return output, no side effects
 *  - Functions return EVENT PROPOSALS, not direct mutations
 *  - Declare REQUIRED PERMISSIONS in a `requires: []` array
 *  - VALIDATE INPUT SHAPES — don't trust the caller
 *
 * Patterns to avoid:
 *  - Calling external APIs directly (use capability declarations instead)
 *  - Modifying platform state outside your worker's namespace
 *  - Long-running operations (return in milliseconds; platform handles async)
 *  - Reading `process.env` (CI will block; declare secrets as capabilities)
 *
 * The platform's rules engine validates your event proposals BEFORE they
 * commit. If validation passes, the event appends to the append-only log,
 * the audit trail records who did what when, and downstream effects fire.
 */

export const SERVICE_ID = "your-worker-slug";

/**
 * Capabilities your worker needs to do anything with real-world consequences.
 * A SOCIII maintainer will review these and wire them up with appropriate
 * KYC gates, role checks, and per-call billing if applicable.
 *
 * Examples of capabilities that typically need declaration:
 *   - identity.verify_user_v1 (requires KYC)
 *   - audit.anchor_event_v1 (writes to public chain)
 *   - notify.email_user_v1 (sends email)
 *   - notify.sms_user_v1 (sends SMS, charges $)
 *   - payment.charge_v1 (Stripe charge)
 *
 * If your worker doesn't need ANY of these, leave the array empty.
 */
export const REQUIRED_CAPABILITIES = [
  // "audit.anchor_event_v1",
];

/**
 * Example function — replace with your worker's actual functions.
 *
 * @param {Object} input
 * @returns {Object} Event proposal (type, payload, requires)
 */
export function proposeSomething({ name, description }) {
  // 1. Validate input shape
  if (!name || typeof name !== "string") {
    return { error: "name is required and must be a string" };
  }
  if (description && description.length > 2000) {
    return { error: "description must be <= 2000 characters" };
  }

  // 2. Return event proposal — platform's rules engine decides whether to commit
  return {
    type: "yourWorker.somethingProposed",
    payload: {
      name: name.trim(),
      description: description?.trim() || null,
      proposed_at_iso: new Date().toISOString(),
    },
    requires: ["operator_role", "active_subscription"],
  };
}

/**
 * Another example — a function that locks a record (immutable after this).
 */
export function lockSomething({ recordId }) {
  if (!recordId) return { error: "recordId is required" };

  return {
    type: "yourWorker.somethingLocked",
    payload: { recordId, locked_at_iso: new Date().toISOString() },
    requires: ["operator_role", "kyc_verified"],
    chainAnchor: true,  // platform anchors locked events to public chain
  };
}

/**
 * Another example — read-only query. Returns null for "not found"; throws
 * for actual errors (the platform's tracing catches throws).
 */
export function getSomething({ recordId }, dataStore) {
  if (!recordId) return null;
  return dataStore.records?.[recordId] || null;
}
