/**
 * workerSchema.js — Unified Digital Worker record schema
 *
 * Every creation path (sandbox chat, Worker #1 pipeline, catalog sync, API)
 * must call validateWorkerRecord() before writing to Firestore.
 *
 * Exports:
 *   - TIER_0_DEFAULTS: 8 immutable platform safety rules
 *   - VALID_SUITES: accepted suite slugs
 *   - VALID_WORKER_TYPES: accepted worker type values
 *   - VALID_PRICING_TIERS: accepted monthly price values
 *   - VALID_STATUSES: accepted status values
 *   - validateWorkerRecord(record): throws on invalid, returns sanitized record
 *   - slugify(name): converts display name to slug format
 */

// ═══════════════════════════════════════════════════════════════
//  TIER 0 — Platform Safety Rules (immutable, auto-injected)
// ═══════════════════════════════════════════════════════════════

const TIER_0_DEFAULTS = [
  "All AI outputs must pass through the rules engine before reaching the user.",
  "Every action must produce an immutable audit trail entry.",
  "PII must never appear in logs, error messages, or external API responses.",
  "The Digital Worker must not impersonate a licensed professional (attorney, doctor, CPA) unless explicitly credentialed.",
  "All financial calculations must include a disclaimer that they are estimates, not advice.",
  "The Digital Worker must not store payment card data directly — delegate to Stripe or equivalent PCI-compliant processor.",
  "Rate limiting must be enforced: no single user session may exceed 100 AI calls per hour.",
  "The Digital Worker must fail closed on rule violations — block the action, do not proceed with a warning.",
];

// ═══════════════════════════════════════════════════════════════
//  VALID ENUM VALUES
// ═══════════════════════════════════════════════════════════════

const VALID_SUITES = [
  "Investment",
  "Entitlement",
  "Design",
  "Compliance",
  "Permitting",
  "Finance",
  "Construction",
  "Property Management",
  "Operations",
  "Legal",
  "Platform",
  "Insurance",
  // Marketplace-facing aliases (mapped from catalog suites)
  "Real Estate",
  "Finance & Investment",
  "General Business",
  "Automotive",
  "Aviation",
  "Education",
];

const VALID_WORKER_TYPES = ["standalone", "pipeline", "composite", "copilot", "orchestrator"];

const VALID_PRICING_TIERS = [0, 19, 29, 39, 49, 59, 69, 79, 99];

const VALID_STATUSES = ["draft", "waitlist", "live", "development"];

// ═══════════════════════════════════════════════════════════════
//  SLUG HELPER
// ═══════════════════════════════════════════════════════════════

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

// ═══════════════════════════════════════════════════════════════
//  VALIDATION
// ═══════════════════════════════════════════════════════════════

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/**
 * Validate a worker record against the 16-field schema.
 *
 * @param {object} record — worker record to validate
 * @param {object} [opts] — options
 * @param {boolean} [opts.allowWarnings=false] — if true, warnings don't throw
 * @returns {{ record: object, warnings: string[] }} — sanitized record + warnings
 * @throws {Error} with field-level details if hard validation fails
 */
function validateWorkerRecord(record, opts = {}) {
  const errors = [];
  const warnings = [];

  if (!record || typeof record !== "object") {
    throw new Error("Worker record must be an object");
  }

  // 1. worker_id — slug format
  if (!record.worker_id || typeof record.worker_id !== "string") {
    errors.push("worker_id: required (slug format, e.g. 'market-research')");
  } else if (!SLUG_RE.test(record.worker_id) && record.worker_id.length > 1) {
    errors.push(`worker_id: must be slug format (lowercase, hyphens, no spaces). Got: "${record.worker_id}"`);
  }

  // 2. display_name — required string
  if (!record.display_name || typeof record.display_name !== "string" || !record.display_name.trim()) {
    errors.push("display_name: required (non-empty string)");
  }

  // 3. headline — required string (iPod test: outcome, not feature)
  if (!record.headline || typeof record.headline !== "string" || !record.headline.trim()) {
    errors.push("headline: required (outcome-first description, e.g. 'Know the market before you commit capital')");
  }

  // 4. suite — must match valid values
  if (!record.suite || typeof record.suite !== "string") {
    errors.push("suite: required (one of: " + VALID_SUITES.join(", ") + ")");
  } else if (!VALID_SUITES.includes(record.suite)) {
    errors.push(`suite: "${record.suite}" is not valid. Must be one of: ${VALID_SUITES.join(", ")}`);
  }

  // 5. worker_type — enum
  if (!record.worker_type || typeof record.worker_type !== "string") {
    errors.push("worker_type: required (standalone | pipeline | composite | copilot | orchestrator)");
  } else if (!VALID_WORKER_TYPES.includes(record.worker_type)) {
    errors.push(`worker_type: "${record.worker_type}" is not valid. Must be one of: ${VALID_WORKER_TYPES.join(", ")}`);
  }

  // 6. pricing_tier — must be a valid monthly price
  if (record.pricing_tier === undefined || record.pricing_tier === null) {
    errors.push("pricing_tier: required (one of: " + VALID_PRICING_TIERS.join(", ") + ")");
  } else if (!VALID_PRICING_TIERS.includes(Number(record.pricing_tier))) {
    errors.push(`pricing_tier: ${record.pricing_tier} is not valid. Must be one of: ${VALID_PRICING_TIERS.join(", ")}`);
  }

  // 7. raas_tier_0 — array, minimum 8 rules
  if (!Array.isArray(record.raas_tier_0)) {
    errors.push("raas_tier_0: required (array of platform safety rules, minimum 8)");
  } else if (record.raas_tier_0.length < 8) {
    errors.push(`raas_tier_0: must have at least 8 rules (got ${record.raas_tier_0.length}). Use TIER_0_DEFAULTS.`);
  }

  // 8. raas_tier_1 — array, minimum 3 rules (hard block)
  if (!Array.isArray(record.raas_tier_1)) {
    errors.push("raas_tier_1: required (array of industry/regulatory rules, minimum 3)");
  } else if (record.raas_tier_1.length < 3) {
    errors.push(`raas_tier_1: must have at least 3 industry rules (got ${record.raas_tier_1.length})`);
  }

  // 9. raas_tier_2 — array, warning if empty (not a hard block)
  if (!Array.isArray(record.raas_tier_2)) {
    errors.push("raas_tier_2: required (array, can be empty but field must exist)");
  } else if (record.raas_tier_2.length === 0) {
    warnings.push("raas_tier_2: empty — consider adding company/operator policy rules");
  }

  // 10. raas_tier_3 — array, can be empty
  if (!Array.isArray(record.raas_tier_3)) {
    errors.push("raas_tier_3: required (array, can be empty but field must exist)");
  }

  // 11. vault_reads — array, can be empty
  if (!Array.isArray(record.vault_reads)) {
    errors.push("vault_reads: required (array, can be empty but field must exist)");
  }

  // 12. vault_writes — array, can be empty
  if (!Array.isArray(record.vault_writes)) {
    errors.push("vault_writes: required (array, can be empty but field must exist)");
  }

  // 13. referral_triggers — array, can be empty
  if (!Array.isArray(record.referral_triggers)) {
    errors.push("referral_triggers: required (array, can be empty but field must exist)");
  }

  // 14. document_templates — array, can be empty
  if (!Array.isArray(record.document_templates)) {
    errors.push("document_templates: required (array, can be empty but field must exist)");
  }

  // 15. landing_page_slug — string, format workers/{slug}
  if (!record.landing_page_slug || typeof record.landing_page_slug !== "string") {
    errors.push("landing_page_slug: required (format: workers/{slug})");
  } else if (!record.landing_page_slug.startsWith("workers/")) {
    errors.push(`landing_page_slug: must start with "workers/". Got: "${record.landing_page_slug}"`);
  }

  // 16. status — enum
  if (!record.status || typeof record.status !== "string") {
    errors.push("status: required (draft | waitlist | live | development)");
  } else if (!VALID_STATUSES.includes(record.status)) {
    errors.push(`status: "${record.status}" is not valid. Must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  // ── Throw on errors ──
  if (errors.length > 0) {
    const err = new Error(`Worker validation failed (${errors.length} error${errors.length > 1 ? "s" : ""}):\n  - ${errors.join("\n  - ")}`);
    err.validationErrors = errors;
    err.warnings = warnings;
    throw err;
  }

  // ── Return sanitized record + warnings ──
  return {
    record: {
      worker_id: record.worker_id,
      display_name: String(record.display_name).trim(),
      headline: String(record.headline).trim(),
      suite: record.suite,
      worker_type: record.worker_type,
      pricing_tier: Number(record.pricing_tier),
      raas_tier_0: record.raas_tier_0,
      raas_tier_1: record.raas_tier_1,
      raas_tier_2: record.raas_tier_2,
      raas_tier_3: record.raas_tier_3,
      vault_reads: record.vault_reads,
      vault_writes: record.vault_writes,
      referral_triggers: record.referral_triggers,
      document_templates: record.document_templates,
      landing_page_slug: record.landing_page_slug,
      status: record.status,
    },
    warnings,
  };
}

module.exports = {
  TIER_0_DEFAULTS,
  VALID_SUITES,
  VALID_WORKER_TYPES,
  VALID_PRICING_TIERS,
  VALID_STATUSES,
  validateWorkerRecord,
  slugify,
};
