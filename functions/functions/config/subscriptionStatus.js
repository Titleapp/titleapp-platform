/**
 * Subscription Status Constants — Single Source of Truth
 *
 * Canonical status values for the `trialStatus` field on subscription documents.
 * All backend code must import from this file. Never hardcode status strings.
 *
 * Reference: docs/architecture/PLATFORM_ARCHITECTURE_v1.0.md Section 4.1
 */

/** Active trial — user is in their 14-day free trial */
const TRIAL_ACTIVE = 'trial_active';

/** Subscribed — paid, post-trial */
const SUBSCRIBED = 'subscribed';

/** Trial expired — trial ended without conversion */
const TRIAL_EXPIRED = 'trial_expired';

/** Cancelled — user cancelled their subscription */
const CANCELLED = 'cancelled';

/** All valid status values */
const VALID_STATUSES = [TRIAL_ACTIVE, SUBSCRIBED, TRIAL_EXPIRED, CANCELLED];

/** Statuses that represent an active subscription (worker should be accessible) */
const ACTIVE_STATUSES = [TRIAL_ACTIVE, SUBSCRIBED];

/** Statuses that represent an inactive subscription (worker should not be accessible) */
const INACTIVE_STATUSES = [TRIAL_EXPIRED, CANCELLED];

/**
 * Check if a subscription status represents an active subscription.
 * @param {string} status
 * @returns {boolean}
 */
function isActive(status) {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * Check if a status value is valid.
 * @param {string} status
 * @returns {boolean}
 */
function isValidStatus(status) {
  return VALID_STATUSES.includes(status);
}

/**
 * Normalize a legacy `status` field value to the canonical `trialStatus` format.
 * Used during migration from old subscription documents.
 *
 * @param {string} legacyStatus — old status value (e.g. 'active', 'trialing', 'past_due')
 * @returns {string} — canonical trialStatus value
 */
function normalizeLegacyStatus(legacyStatus) {
  if (!legacyStatus) return TRIAL_ACTIVE;
  const lower = String(legacyStatus).toLowerCase().trim();

  // Already canonical
  if (VALID_STATUSES.includes(lower)) return lower;

  // Legacy mappings
  const map = {
    'active': SUBSCRIBED,
    'trialing': TRIAL_ACTIVE,
    'trial': TRIAL_ACTIVE,
    'past_due': SUBSCRIBED,      // still active, payment issue
    'unpaid': TRIAL_EXPIRED,
    'incomplete': TRIAL_ACTIVE,
    'incomplete_expired': TRIAL_EXPIRED,
    'canceled': CANCELLED,
    'cancelled': CANCELLED,
    'expired': TRIAL_EXPIRED,
  };

  return map[lower] || TRIAL_ACTIVE;
}

module.exports = {
  TRIAL_ACTIVE,
  SUBSCRIBED,
  TRIAL_EXPIRED,
  CANCELLED,
  VALID_STATUSES,
  ACTIVE_STATUSES,
  INACTIVE_STATUSES,
  isActive,
  isValidStatus,
  normalizeLegacyStatus,
};
