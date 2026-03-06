/**
 * workerSchema.js — Unified Digital Worker record schema
 *
 * P0.18: No worker may be deployed without passing through Worker #1.
 *
 * Two validation layers:
 *   1. validateWorkerRecord(record) — 16-field base schema (pipeline stages)
 *   2. validateRegistryRecord(record) — full registry fields (prePublish gate)
 *
 * Exports:
 *   - TIER_0_DEFAULTS: 8 immutable platform safety rules
 *   - VALID_SUITES, VALID_WORKER_TYPES, VALID_PRICING_TIERS, VALID_STATUSES
 *   - VALID_VERTICALS, VALID_PRICE_TIERS_DISPLAY, VALID_REVENUE_MODELS, VALID_REGISTRY_STATUSES
 *   - REGISTRY_FIELDS: full registry field definitions
 *   - validateWorkerRecord(record): base schema validation
 *   - validateRegistryRecord(record): full registry validation (prePublish gate)
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
//  GOVERNMENT TIER 0 EXTENSION — Applied to all GOV workers
// ═══════════════════════════════════════════════════════════════

const GOV_TIER_0_EXTENSION = {
  audit_trail:        "append_only",
  human_in_the_loop:  true,
  data_retention:     "7_years",
  pii_handling:       "masked_in_logs",
  rate_limit_per_min: 60,
  error_behavior:     "hold_and_alert",
  jurisdiction_lock:  true,
  stripe_required:    true,
  worker_1_required:  true,
};

// ═══════════════════════════════════════════════════════════════
//  VALID ENUM VALUES — Base Schema
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
  // Government In A Box sub-suites
  "Government",
  "DMV",
  "Permitting",
  "Inspector",
  "Recorder",
];

const VALID_WORKER_TYPES = ["standalone", "pipeline", "composite", "copilot", "orchestrator"];

const VALID_PRICING_TIERS = [0, 19, 29, 39, 49, 59, 69, 79, 99];

const VALID_STATUSES = ["draft", "waitlist", "live", "development"];

// ═══════════════════════════════════════════════════════════════
//  VALID ENUM VALUES — Registry Extension
// ═══════════════════════════════════════════════════════════════

const VALID_VERTICALS = [
  "auto_dealer",
  "re_development",
  "re_sales",
  "property_management",
  "aviation_135",
  "pilot_suite",
  "government",
  "financial",
  "nursing",
];

const VALID_PRICE_TIERS_DISPLAY = ["FREE", "$29", "$49", "$79"];

const VALID_REVENUE_MODELS = [
  "subscription",
  "tech_fee_and_subscription",
  "subscription_only",
  "freemium",
  "free",
];

const VALID_REGISTRY_STATUSES = ["live", "waitlist", "claimed", "planned", "deprecated"];

// ═══════════════════════════════════════════════════════════════
//  REGISTRY FIELDS — Full schema for raasCatalog records
// ═══════════════════════════════════════════════════════════════

const REGISTRY_FIELDS = {
  // Identity
  worker_id:               { type: "string",  required: true  },
  name:                    { type: "string",  required: true  },
  vertical:                { type: "string",  required: true  },

  // Pricing
  price_tier:              { type: "string",  required: true  },
  stripe_price_id_monthly: { type: "string",  required: false },
  stripe_price_id_annual:  { type: "string",  required: false },
  stripe_product_id:       { type: "string",  required: false },

  // Monetization
  revenue_model:           { type: "string",  required: true  },

  // Status — set by pipeline, not by builder
  status:                  { type: "string",  required: true  },

  // Display content
  short_description:       { type: "string",  required: true, maxLength: 120 },
  long_description:        { type: "string",  required: false },
  phase:                   { type: "string",  required: false },
  phase_number:            { type: "number",  required: false },
  tags:                    { type: "array",   required: false },
  is_golden_rules_worker:  { type: "boolean", required: false },
  worker_url:              { type: "string",  required: false },
  waitlist_url:            { type: "string",  required: false },

  // Territory (for state/country clone workers)
  is_territory_clone:      { type: "boolean", required: false },
  parent_worker_id:        { type: "string",  required: false },
  territory_state:         { type: "string",  required: false },
  territory_country:       { type: "string",  required: false },

  // Pipeline audit — set automatically, never by builder
  pipeline_completed_at:   { type: "timestamp", required: true  },
  approved_by:             { type: "string",    required: true  },
  approved_at:             { type: "timestamp", required: true  },
  pipeline_version:        { type: "string",    required: true  },
};

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
//  BASE VALIDATION (16-field schema — pipeline stages)
// ═══════════════════════════════════════════════════════════════

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/**
 * Validate a worker record against the 16-field base schema.
 * Used during pipeline stages (intake, research, rules:save).
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

// ═══════════════════════════════════════════════════════════════
//  REGISTRY VALIDATION (prePublish gate + admin approval write)
// ═══════════════════════════════════════════════════════════════

// Worker ID format: XX-NNN (e.g. AD-017, RE-001, AV-P01)
const REGISTRY_ID_RE = /^[A-Z]{2,3}-[A-Z0-9]{1,4}$/;

/**
 * Validate a registry record against REGISTRY_FIELDS.
 * Called at prePublish stage and before writing to raasCatalog.
 *
 * P0.18: status='live' can ONLY be set by admin approval flow,
 * never by the builder directly.
 *
 * @param {object} record — full registry record
 * @param {object} [opts]
 * @param {boolean} [opts.isAdminApproval=false] — true when called from workerSync on approval
 * @param {boolean} [opts.isSeed=false] — true during bulk seed (relaxes pipeline_completed_at check)
 * @returns {{ record: object, warnings: string[] }}
 * @throws {Error} with field-level details if validation fails
 */
function validateRegistryRecord(record, opts = {}) {
  const { isAdminApproval = false, isSeed = false } = opts;
  const errors = [];
  const warnings = [];

  if (!record || typeof record !== "object") {
    throw new Error("Registry record must be an object");
  }

  // ── Identity ──
  if (!record.worker_id || typeof record.worker_id !== "string") {
    errors.push("worker_id: required (format: XX-NNN, e.g. 'AD-017')");
  } else if (!REGISTRY_ID_RE.test(record.worker_id)) {
    errors.push(`worker_id: must match format XX-NNN. Got: "${record.worker_id}"`);
  }

  if (!record.name || typeof record.name !== "string" || !record.name.trim()) {
    errors.push("name: required (non-empty string)");
  }

  if (!record.vertical || typeof record.vertical !== "string") {
    errors.push("vertical: required (one of: " + VALID_VERTICALS.join(", ") + ")");
  } else if (!VALID_VERTICALS.includes(record.vertical)) {
    errors.push(`vertical: "${record.vertical}" is not valid. Must be one of: ${VALID_VERTICALS.join(", ")}`);
  }

  // ── Pricing ──
  if (!record.price_tier || typeof record.price_tier !== "string") {
    errors.push("price_tier: required (one of: " + VALID_PRICE_TIERS_DISPLAY.join(", ") + ")");
  } else if (!VALID_PRICE_TIERS_DISPLAY.includes(record.price_tier)) {
    errors.push(`price_tier: "${record.price_tier}" is not valid. Must be one of: ${VALID_PRICE_TIERS_DISPLAY.join(", ")}`);
  }

  // Stripe IDs: optional strings (set after Stripe setup)
  if (record.stripe_price_id_monthly && typeof record.stripe_price_id_monthly !== "string") {
    errors.push("stripe_price_id_monthly: must be a string if provided");
  }
  if (record.stripe_price_id_annual && typeof record.stripe_price_id_annual !== "string") {
    errors.push("stripe_price_id_annual: must be a string if provided");
  }
  if (record.stripe_product_id && typeof record.stripe_product_id !== "string") {
    errors.push("stripe_product_id: must be a string if provided");
  }

  // ── Monetization ──
  if (!record.revenue_model || typeof record.revenue_model !== "string") {
    errors.push("revenue_model: required (one of: " + VALID_REVENUE_MODELS.join(", ") + ")");
  } else if (!VALID_REVENUE_MODELS.includes(record.revenue_model)) {
    errors.push(`revenue_model: "${record.revenue_model}" is not valid. Must be one of: ${VALID_REVENUE_MODELS.join(", ")}`);
  }

  // ── Status ──
  if (!record.status || typeof record.status !== "string") {
    errors.push("status: required (one of: " + VALID_REGISTRY_STATUSES.join(", ") + ")");
  } else if (!VALID_REGISTRY_STATUSES.includes(record.status)) {
    errors.push(`status: "${record.status}" is not valid. Must be one of: ${VALID_REGISTRY_STATUSES.join(", ")}`);
  }

  // P0.18 ENFORCEMENT: 'live' status only via admin approval or seed
  if (record.status === "live" && !isAdminApproval && !isSeed) {
    errors.push("status: 'live' can only be set by admin approval in ReviewQueue.jsx (P0.18)");
  }

  // ── Display content ──
  if (!record.short_description || typeof record.short_description !== "string" || !record.short_description.trim()) {
    errors.push("short_description: required (max 120 chars)");
  } else if (record.short_description.length > 120) {
    errors.push(`short_description: exceeds 120 chars (got ${record.short_description.length})`);
  }

  if (record.long_description && typeof record.long_description !== "string") {
    errors.push("long_description: must be a string if provided");
  }

  if (record.tags && !Array.isArray(record.tags)) {
    errors.push("tags: must be an array if provided");
  }

  // ── Pipeline audit ──
  // These are set automatically — required for raasCatalog write but NOT for prePublish validation
  if (isAdminApproval || isSeed) {
    if (!record.approved_by || typeof record.approved_by !== "string") {
      errors.push("approved_by: required for registry write (admin uid)");
    }
    if (!record.pipeline_version || typeof record.pipeline_version !== "string") {
      errors.push("pipeline_version: required for registry write (e.g. 'v1.0')");
    }
    // pipeline_completed_at and approved_at are timestamps — set by server
  }

  // ── Throw on errors ──
  if (errors.length > 0) {
    const err = new Error(`Registry validation failed (${errors.length} error${errors.length > 1 ? "s" : ""}):\n  - ${errors.join("\n  - ")}`);
    err.validationErrors = errors;
    err.warnings = warnings;
    throw err;
  }

  // ── Return sanitized record + warnings ──
  const sanitized = {
    worker_id: record.worker_id,
    name: String(record.name).trim(),
    vertical: record.vertical,
    price_tier: record.price_tier,
    revenue_model: record.revenue_model,
    status: record.status,
    short_description: String(record.short_description).trim(),
  };

  // Optional fields — include if present
  if (record.long_description) sanitized.long_description = String(record.long_description).trim();
  if (record.phase) sanitized.phase = record.phase;
  if (record.phase_number !== undefined) sanitized.phase_number = Number(record.phase_number);
  if (record.tags) sanitized.tags = record.tags;
  if (record.is_golden_rules_worker !== undefined) sanitized.is_golden_rules_worker = !!record.is_golden_rules_worker;
  if (record.worker_url) sanitized.worker_url = record.worker_url;
  if (record.waitlist_url) sanitized.waitlist_url = record.waitlist_url;
  if (record.stripe_price_id_monthly) sanitized.stripe_price_id_monthly = record.stripe_price_id_monthly;
  if (record.stripe_price_id_annual) sanitized.stripe_price_id_annual = record.stripe_price_id_annual;
  if (record.stripe_product_id) sanitized.stripe_product_id = record.stripe_product_id;

  // Territory fields
  if (record.is_territory_clone) sanitized.is_territory_clone = true;
  if (record.parent_worker_id) sanitized.parent_worker_id = record.parent_worker_id;
  if (record.territory_state) sanitized.territory_state = record.territory_state;
  if (record.territory_country) sanitized.territory_country = record.territory_country;

  // Pipeline audit fields (set by system)
  if (record.approved_by) sanitized.approved_by = record.approved_by;
  if (record.pipeline_version) sanitized.pipeline_version = record.pipeline_version;

  return { record: sanitized, warnings };
}

/**
 * Parse a display price tier to numeric USD value.
 * "FREE" → 0, "$29" → 29, "$49" → 49, "$79" → 79
 */
function parsePriceTier(tier) {
  if (!tier || tier === "FREE") return 0;
  return parseInt(String(tier).replace(/[^0-9]/g, ""), 10) || 0;
}

module.exports = {
  TIER_0_DEFAULTS,
  GOV_TIER_0_EXTENSION,
  VALID_SUITES,
  VALID_WORKER_TYPES,
  VALID_PRICING_TIERS,
  VALID_STATUSES,
  VALID_VERTICALS,
  VALID_PRICE_TIERS_DISPLAY,
  VALID_REVENUE_MODELS,
  VALID_REGISTRY_STATUSES,
  REGISTRY_FIELDS,
  validateWorkerRecord,
  validateRegistryRecord,
  parsePriceTier,
  slugify,
};
