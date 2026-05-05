"use strict";

/**
 * usageEvents.js — single source of truth for the usage-events collection name.
 *
 * Background: CODEX 50.4 Phase 1 diagnostic confirmed that worker telemetry
 * was being written to `usageEvents` (camelCase) by four code paths, while the
 * Creator-payout aggregation in `billing/stripeWebhook.js` and the quarterly
 * review in `billing/quarterlyPricingReview.js` both read from `usage_events`
 * (snake_case). The two read paths returned zero rows because that collection
 * had no documents.
 *
 * Phase 3a (this constant + its imports) ends the string-literal divergence by
 * making every read and write path resolve the collection name from one place.
 * The canonical name is camelCase to match the four telemetry write paths and
 * the rest of the codebase's collection-naming convention.
 *
 * Note: NO schema validation is performed on writes. CODEX 50.5 adds 11
 * nullable fields to the `recordUsageEvent` payload; a strict validator
 * landed today would have to be undone tomorrow.
 *
 * Deprecated name `usage_events` (snake_case) is preserved as
 * `usage_events_deprecated_50_4` for 90 days as cheap insurance against any
 * stray write path that wasn't surfaced during the audit.
 */

const USAGE_EVENTS_COLLECTION = "usageEvents";
const USAGE_EVENTS_DEPRECATED_COLLECTION = "usage_events_deprecated_50_4";

module.exports = {
  USAGE_EVENTS_COLLECTION,
  USAGE_EVENTS_DEPRECATED_COLLECTION,
};
