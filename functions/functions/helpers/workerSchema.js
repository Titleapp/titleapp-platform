/**
 * workerSchema.js — Unified Digital Worker record schema
 *
 * P0.18: No worker may be deployed without passing through Worker #1.
 *
 * Two validation layers:
 *   1. validateWorkerRecord(record) — 18-field base schema (pipeline stages)
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
//  ESCROW TIER 0 EXTENSION — Applied to all ESC workers
// ═══════════════════════════════════════════════════════════════

const ESC_TIER_0_EXTENSION = {
  identity_verified_all_parties:              true,
  offer_chain_required:                       true,
  bank_account_verified_before_disbursement:  true,
  wire_callback_required:                     true,
  wire_change_hold:                           true,
  no_disbursement_before_conditions:          true,
  notarization_before_recording:              true,
  no_dtc_transfer_before_recording:           true,
  no_commingling:                             true,
  human_in_loop_at_disbursement:              true,
  seven_year_retention:                       true,
  pii_masked_in_logs:                         true,
  audit_trail:                                "append_only",
  stripe_required:                            true,
  worker_1_required:                          true,
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
  // Health & EMS Education
  "Health & EMS Education",
  // Government In A Box sub-suites
  "Government",
  "DMV",
  "Permitting",
  "Inspector",
  "Recorder",
  // Title & Escrow suite
  "Title & Escrow",
  // Solar Energy
  "Solar Energy",
];

const VALID_WORKER_TYPES = ["standalone", "pipeline", "composite", "copilot", "orchestrator"];

// CoPilot Mode Framework — mode-aware workers (aviation, healthcare, legal)
const VALID_MODES = ["direct", "operational", "advisory", "training"];
const VALID_MODE_TIERS = ["full", "partial", "advisory"];

// Value buckets — how workers create value for subscribers
const VALID_VALUE_BUCKETS = ["make_money", "save_money", "stay_compliant"];

const VALID_PRICING_TIERS = [0, 29, 49, 79];

/**
 * Shared pricing floor validator — call at the top of any payment function.
 * Throws if price is not in the approved set.
 */
function validateWorkerPrice(price) {
  if (!VALID_PRICING_TIERS.includes(price)) {
    throw new Error(`Invalid price $${price}. Must be one of: ${VALID_PRICING_TIERS.join(", ")}`);
  }
}

const VALID_STATUSES = ["draft", "waitlist", "live", "development"];

const VALID_DIGEST_OPTIONS = ["daily", "weekly", "none"];

const DEFAULT_NOTIFICATION_CONFIG = {
  onSubscribe: { email: true, sms: false },
  onCancel:    { email: true, sms: false },
  onTrial:     { email: true, sms: false },
  digest:      "weekly",
};

/**
 * Validate a notification config object.
 * Returns sanitized config or throws on invalid input.
 */
function validateNotificationConfig(config) {
  if (!config || typeof config !== "object") return { ...DEFAULT_NOTIFICATION_CONFIG };
  const result = {};
  for (const key of ["onSubscribe", "onCancel", "onTrial"]) {
    const v = config[key];
    if (v && typeof v === "object") {
      result[key] = { email: !!v.email, sms: !!v.sms };
    } else {
      result[key] = { ...DEFAULT_NOTIFICATION_CONFIG[key] };
    }
  }
  result.digest = VALID_DIGEST_OPTIONS.includes(config.digest) ? config.digest : "weekly";
  return result;
}

// ═══════════════════════════════════════════════════════════════
//  CREDIT COST MAP — Standard credit costs per operation type
// ═══════════════════════════════════════════════════════════════

const CREDIT_COST_MAP = {
  simple: 1,
  standard: 5,
  complex: 15,
  external_api: 25,
  esign: 30,
  ocr: 50,
};

const VALID_CREDIT_COST_TYPES = Object.keys(CREDIT_COST_MAP);

// ═══════════════════════════════════════════════════════════════
//  HE SUITE — Subject Domains + Deployment Tiers
// ═══════════════════════════════════════════════════════════════

const VALID_SUBJECT_DOMAINS = [
  "critical_care_icu",
  "emergency_er",
  "flight_nursing",
  "ems_paramedic",
  "perioperative_or",
  "pediatrics_nicu",
  "ob_labor_delivery",
  "home_health",
  "nursing_education_faculty",
  "ems_instructor_academy",
];

const VALID_DEPLOYMENT_TIERS = [1, 2, 3];

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
  "title_escrow",
  "financial",
  "nursing",
  "health_education",
  "solar_energy",
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

  // Credit cost — operation tier for metering
  credit_cost:             { type: "string",  required: true  },

  // Visibility — internal-only workers hidden from public marketplace
  internal_only:           { type: "boolean", required: false },

  // Fork — whether this worker can be forked by other creators
  forkable:                { type: "boolean", required: false },
  forked_from:             { type: "string",  required: false },

  // HE Suite — subject domain, jurisdiction, deployment tier, disclaimers
  subject_domain:          { type: "string",  required: false },
  jurisdiction:            { type: "string",  required: false },
  deployment_tier:         { type: "number",  required: false },
  medical_director_approval: { type: "boolean", required: false },
  md_approval_doc_url:     { type: "string",  required: false },
  disclaimer_active:       { type: "boolean", required: false },
  disclaimer_text:         { type: "string",  required: false },
  institutional_sop_uploaded: { type: "boolean", required: false },

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
//  DOCUMENT CONTROL VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Validate a documentControl sub-object on a worker record.
 * @param {object} dc — documentControl config
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateDocumentControl(dc) {
  const errors = [];
  const warnings = [];

  if (!dc || typeof dc !== "object") {
    return { valid: true, errors, warnings };
  }

  if (dc.requiresOperatorDocs !== undefined && typeof dc.requiresOperatorDocs !== "boolean") {
    errors.push("documentControl.requiresOperatorDocs: must be a boolean");
  }

  if (dc.requiredDocTypes !== undefined && !Array.isArray(dc.requiredDocTypes)) {
    errors.push("documentControl.requiredDocTypes: must be an array");
  }

  if (dc.advisoryWithoutDocs !== undefined && typeof dc.advisoryWithoutDocs !== "boolean") {
    errors.push("documentControl.advisoryWithoutDocs: must be a boolean");
  }

  if (dc.blockWithoutDocs !== undefined && typeof dc.blockWithoutDocs !== "boolean") {
    errors.push("documentControl.blockWithoutDocs: must be a boolean");
  }

  // If requiresOperatorDocs is true, enforce constraints
  if (dc.requiresOperatorDocs === true) {
    if (!Array.isArray(dc.requiredDocTypes) || dc.requiredDocTypes.length === 0) {
      errors.push("documentControl.requiredDocTypes: must be non-empty when requiresOperatorDocs is true");
    }
    if (!dc.advisoryWithoutDocs && !dc.blockWithoutDocs) {
      errors.push("documentControl: one of advisoryWithoutDocs or blockWithoutDocs must be set when requiresOperatorDocs is true");
    }
  }

  // High liability gate warning
  if (dc.blockWithoutDocs === true) {
    warnings.push("HIGH_LIABILITY_DOC_GATE: blockWithoutDocs is enabled — worker will refuse to run without operator documents. Requires admin review.");
  }

  return { valid: errors.length === 0, errors, warnings };
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

  // 17. internal_only — optional boolean
  if (record.internal_only !== undefined && typeof record.internal_only !== "boolean") {
    errors.push("internal_only: must be a boolean if provided");
  }

  // 19. subject_domain — required for HE workers, optional otherwise
  if (record.subject_domain !== undefined) {
    if (typeof record.subject_domain !== "string" || !VALID_SUBJECT_DOMAINS.includes(record.subject_domain)) {
      errors.push(`subject_domain: "${record.subject_domain}" is not valid. Must be one of: ${VALID_SUBJECT_DOMAINS.join(", ")}`);
    }
  }

  // 20. jurisdiction — string, format STATE:Slug
  if (record.jurisdiction !== undefined && typeof record.jurisdiction !== "string") {
    errors.push("jurisdiction: must be a string if provided (format: STATE:EmployerSlug)");
  }

  // 21. deployment_tier — enum 1/2/3
  if (record.deployment_tier !== undefined) {
    if (!VALID_DEPLOYMENT_TIERS.includes(Number(record.deployment_tier))) {
      errors.push(`deployment_tier: must be 1, 2, or 3. Got: ${record.deployment_tier}`);
    }
  }

  // 22. medical_director_approval — boolean
  if (record.medical_director_approval !== undefined && typeof record.medical_director_approval !== "boolean") {
    errors.push("medical_director_approval: must be a boolean if provided");
  }

  // 23. md_approval_doc_url — string
  if (record.md_approval_doc_url !== undefined && typeof record.md_approval_doc_url !== "string") {
    errors.push("md_approval_doc_url: must be a string if provided");
  }

  // 24. disclaimer_active — boolean
  if (record.disclaimer_active !== undefined && typeof record.disclaimer_active !== "boolean") {
    errors.push("disclaimer_active: must be a boolean if provided");
  }

  // 25. disclaimer_text — string
  if (record.disclaimer_text !== undefined && typeof record.disclaimer_text !== "string") {
    errors.push("disclaimer_text: must be a string if provided");
  }

  // 26. institutional_sop_uploaded — boolean
  if (record.institutional_sop_uploaded !== undefined && typeof record.institutional_sop_uploaded !== "boolean") {
    errors.push("institutional_sop_uploaded: must be a boolean if provided");
  }

  // 27. modeAware — boolean (CoPilot Mode Framework)
  if (record.modeAware !== undefined && typeof record.modeAware !== "boolean") {
    errors.push("modeAware: must be a boolean if provided");
  }

  // 28. modes — array of valid mode strings
  if (record.modes !== undefined) {
    if (!Array.isArray(record.modes)) {
      errors.push("modes: must be an array if provided");
    } else {
      record.modes.forEach((m) => {
        if (!VALID_MODES.includes(m)) errors.push(`modes: "${m}" is not valid. Must be one of: ${VALID_MODES.join(", ")}`);
      });
    }
  }

  // 29. modeTiers — enum string
  if (record.modeTiers !== undefined && record.modeTiers !== null) {
    if (!VALID_MODE_TIERS.includes(record.modeTiers)) {
      errors.push(`modeTiers: "${record.modeTiers}" is not valid. Must be one of: ${VALID_MODE_TIERS.join(", ")}`);
    }
  }

  // 30. highRisk — boolean
  if (record.highRisk !== undefined && typeof record.highRisk !== "boolean") {
    errors.push("highRisk: must be a boolean if provided");
  }

  // 31. groundUseOnly — boolean
  if (record.groundUseOnly !== undefined && typeof record.groundUseOnly !== "boolean") {
    errors.push("groundUseOnly: must be a boolean if provided");
  }

  // 32. documentHierarchy — array
  if (record.documentHierarchy !== undefined && !Array.isArray(record.documentHierarchy)) {
    errors.push("documentHierarchy: must be an array if provided");
  }

  // 33. documentChecklist — array of checklist items
  if (record.documentChecklist !== undefined) {
    if (!Array.isArray(record.documentChecklist)) {
      errors.push("documentChecklist: must be an array if provided");
    } else {
      record.documentChecklist.forEach((item, idx) => {
        if (!item.docType) errors.push(`documentChecklist[${idx}]: docType required`);
        if (!item.label) errors.push(`documentChecklist[${idx}]: label required`);
        if (item.required !== undefined && typeof item.required !== "boolean")
          errors.push(`documentChecklist[${idx}]: required must be boolean`);
        if (item.unlocksMode && !VALID_MODES.includes(item.unlocksMode))
          errors.push(`documentChecklist[${idx}]: unlocksMode must be one of: ${VALID_MODES.join(", ")}`);
      });
    }
  }

  // 34. documentControl — governance pipeline document requirements
  if (record.documentControl !== undefined) {
    const dcResult = validateDocumentControl(record.documentControl);
    if (dcResult.errors.length > 0) errors.push(...dcResult.errors);
    if (dcResult.warnings.length > 0) warnings.push(...dcResult.warnings);
  }

  // 35. valueBucket — array of value bucket tags
  if (record.valueBucket !== undefined) {
    if (!Array.isArray(record.valueBucket)) {
      errors.push("valueBucket: must be an array if provided");
    } else {
      record.valueBucket.forEach((v, idx) => {
        if (!VALID_VALUE_BUCKETS.includes(v))
          errors.push(`valueBucket[${idx}]: "${v}" is not valid. Must be one of: ${VALID_VALUE_BUCKETS.join(", ")}`);
      });
    }
  }

  // 18. credit_cost — must map to a valid cost type
  if (!record.credit_cost || typeof record.credit_cost !== "string") {
    errors.push("credit_cost: required (one of: " + VALID_CREDIT_COST_TYPES.join(", ") + ")");
  } else if (!VALID_CREDIT_COST_TYPES.includes(record.credit_cost)) {
    errors.push(`credit_cost: "${record.credit_cost}" is not valid. Must be one of: ${VALID_CREDIT_COST_TYPES.join(", ")}`);
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
      credit_cost: record.credit_cost,
      internal_only: !!record.internal_only,
      ...(record.subject_domain && { subject_domain: record.subject_domain }),
      ...(record.jurisdiction && { jurisdiction: record.jurisdiction }),
      ...(record.deployment_tier !== undefined && { deployment_tier: Number(record.deployment_tier) }),
      ...(record.medical_director_approval !== undefined && { medical_director_approval: !!record.medical_director_approval }),
      ...(record.md_approval_doc_url && { md_approval_doc_url: record.md_approval_doc_url }),
      ...(record.disclaimer_active !== undefined && { disclaimer_active: !!record.disclaimer_active }),
      ...(record.disclaimer_text && { disclaimer_text: record.disclaimer_text }),
      ...(record.institutional_sop_uploaded !== undefined && { institutional_sop_uploaded: !!record.institutional_sop_uploaded }),
      // CoPilot Mode Framework fields
      modeAware: !!record.modeAware,
      modes: Array.isArray(record.modes) ? record.modes : [],
      modeTiers: record.modeTiers || null,
      highRisk: !!record.highRisk,
      groundUseOnly: !!record.groundUseOnly,
      documentHierarchy: Array.isArray(record.documentHierarchy) ? record.documentHierarchy : ["titleapp_baseline", "public_regulatory"],
      documentChecklist: Array.isArray(record.documentChecklist) ? record.documentChecklist.map(item => ({
        docType: item.docType, label: item.label, required: !!item.required,
        unlocksMode: item.unlocksMode || null, description: item.description || "",
      })) : [],
      // Document Control governance fields
      ...(record.documentControl && {
        documentControl: {
          requiresOperatorDocs: !!record.documentControl.requiresOperatorDocs,
          requiredDocTypes: Array.isArray(record.documentControl.requiredDocTypes) ? record.documentControl.requiredDocTypes : [],
          advisoryWithoutDocs: record.documentControl.advisoryWithoutDocs !== undefined ? !!record.documentControl.advisoryWithoutDocs : true,
          blockWithoutDocs: !!record.documentControl.blockWithoutDocs,
        },
      }),
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

  // Credit cost
  if (record.credit_cost) sanitized.credit_cost = record.credit_cost;

  // Internal-only flag
  if (record.internal_only !== undefined) sanitized.internal_only = !!record.internal_only;

  // HE Suite fields
  if (record.subject_domain) sanitized.subject_domain = record.subject_domain;
  if (record.jurisdiction) sanitized.jurisdiction = record.jurisdiction;
  if (record.deployment_tier !== undefined) sanitized.deployment_tier = Number(record.deployment_tier);
  if (record.medical_director_approval !== undefined) sanitized.medical_director_approval = !!record.medical_director_approval;
  if (record.md_approval_doc_url) sanitized.md_approval_doc_url = record.md_approval_doc_url;
  if (record.disclaimer_active !== undefined) sanitized.disclaimer_active = !!record.disclaimer_active;
  if (record.disclaimer_text) sanitized.disclaimer_text = record.disclaimer_text;
  if (record.institutional_sop_uploaded !== undefined) sanitized.institutional_sop_uploaded = !!record.institutional_sop_uploaded;

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

// ═══════════════════════════════════════════════════════════════
//  AUTO-FIX — Silently resolve schema gaps before validation
// ═══════════════════════════════════════════════════════════════

// Maps common category/vertical names Alex might produce → valid suite enum
const SUITE_ALIAS_MAP = {
  // Lowercase aliases → valid suite values
  "finance": "Finance",
  "financial": "Finance",
  "accounting": "Finance & Investment",
  "accountant": "Finance & Investment",
  "bookkeeping": "Finance & Investment",
  "tax": "Finance & Investment",
  "investment": "Finance & Investment",
  "wealth": "Finance & Investment",
  "banking": "Finance & Investment",
  "mortgage": "Real Estate",
  "real estate": "Real Estate",
  "realestate": "Real Estate",
  "property": "Property Management",
  "property management": "Property Management",
  "landlord": "Property Management",
  "auto": "Automotive",
  "automotive": "Automotive",
  "car": "Automotive",
  "dealer": "Automotive",
  "dealership": "Automotive",
  "vehicle": "Automotive",
  "aviation": "Aviation",
  "flight": "Aviation",
  "pilot": "Aviation",
  "aircraft": "Aviation",
  "airline": "Aviation",
  "health": "Health & EMS Education",
  "healthcare": "Health & EMS Education",
  "medical": "Health & EMS Education",
  "nursing": "Health & EMS Education",
  "nurse": "Health & EMS Education",
  "ems": "Health & EMS Education",
  "paramedic": "Health & EMS Education",
  "clinical": "Health & EMS Education",
  "education": "Education",
  "school": "Education",
  "training": "Education",
  "construction": "Construction",
  "building": "Construction",
  "contractor": "Construction",
  "insurance": "Insurance",
  "underwriting": "Insurance",
  "claims": "Insurance",
  "legal": "Legal",
  "law": "Legal",
  "attorney": "Legal",
  "compliance": "Compliance",
  "regulatory": "Compliance",
  "government": "Government",
  "dmv": "DMV",
  "permitting": "Permitting",
  "permits": "Permitting",
  "inspection": "Inspector",
  "inspector": "Inspector",
  "title": "Title & Escrow",
  "escrow": "Title & Escrow",
  "closing": "Title & Escrow",
  "recorder": "Recorder",
  "operations": "Operations",
  "general": "General Business",
  "business": "General Business",
  "custom": "General Business",
  "other": "General Business",
  "design": "Design",
  "entitlement": "Entitlement",
  "platform": "Platform",
};

/**
 * Infer credit_cost from worker description and rules.
 * Simple Q&A → "simple", external data → "external_api",
 * document generation → "complex", default → "standard".
 */
function inferCreditCost(description, rules) {
  const text = ((description || "") + " " + (rules || []).join(" ")).toLowerCase();
  if (/e-?sign|signature|notari/i.test(text)) return "esign";
  if (/ocr|scan|image.*recogn|document.*extract/i.test(text)) return "ocr";
  if (/api|database|external|pull.*data|fetch|integration|scheduling.*system/i.test(text)) return "external_api";
  if (/report|document|generat|template|pdf|letter|memo|deck|analysis|one-pager/i.test(text)) return "complex";
  if (/checklist|quiz|q\s*&\s*a|flashcard|simple|basic|lookup/i.test(text)) return "simple";
  return "standard";
}

/**
 * Resolve suite value from a possibly invalid string.
 * Tries exact match first, then alias lookup, then fuzzy substring match.
 */
function resolveSuite(raw) {
  if (!raw) return "General Business";
  // Exact match
  if (VALID_SUITES.includes(raw)) return raw;
  // Alias lookup (case-insensitive)
  const lower = raw.toLowerCase().trim();
  if (SUITE_ALIAS_MAP[lower]) return SUITE_ALIAS_MAP[lower];
  // Substring match — find the best alias that's contained in the raw string
  for (const [alias, suite] of Object.entries(SUITE_ALIAS_MAP)) {
    if (lower.includes(alias)) return suite;
  }
  return "General Business";
}

/**
 * Auto-fix a worker record before validation.
 * Resolves suite, pads raas_tier_1, infers credit_cost.
 * Mutates the record in place and returns it.
 *
 * @param {object} record — worker record to fix
 * @param {string} [description] — full worker description (for inference)
 * @returns {object} — the fixed record
 */
function autoFixWorkerRecord(record, description) {
  if (!record || typeof record !== "object") return record;

  // Fix suite
  if (!record.suite || !VALID_SUITES.includes(record.suite)) {
    record.suite = resolveSuite(record.suite);
  }

  // Fix worker_type
  if (!record.worker_type || !VALID_WORKER_TYPES.includes(record.worker_type)) {
    record.worker_type = "standalone";
  }

  // Fix pricing_tier
  if (record.pricing_tier === undefined || record.pricing_tier === null || !VALID_PRICING_TIERS.includes(Number(record.pricing_tier))) {
    record.pricing_tier = 0; // free/draft — set real price at publish
  }

  // Fix headline
  if (!record.headline || typeof record.headline !== "string" || !record.headline.trim()) {
    record.headline = (description || record.display_name || "Digital Worker").substring(0, 120);
  }

  // Fix raas_tier_1 — pad to minimum 3 rules
  if (!Array.isArray(record.raas_tier_1)) record.raas_tier_1 = [];
  while (record.raas_tier_1.length < 3) {
    const padRules = [
      "All outputs must be reviewed by the user before acting on them.",
      "The worker must not provide advice that requires a licensed professional without appropriate disclaimers.",
      "Personally identifiable information must be handled in compliance with applicable privacy regulations.",
      "All calculations and estimates must include appropriate disclaimers about accuracy.",
      "The worker must clearly identify when it is uncertain or when a question falls outside its scope.",
    ];
    const nextRule = padRules[record.raas_tier_1.length];
    if (nextRule && !record.raas_tier_1.includes(nextRule)) {
      record.raas_tier_1.push(nextRule);
    } else {
      break;
    }
  }

  // Fix raas_tier_2 / raas_tier_3 — ensure arrays exist
  if (!Array.isArray(record.raas_tier_2)) record.raas_tier_2 = [];
  if (!Array.isArray(record.raas_tier_3)) record.raas_tier_3 = [];

  // Fix vault_reads / vault_writes / referral_triggers / document_templates
  if (!Array.isArray(record.vault_reads)) record.vault_reads = [];
  if (!Array.isArray(record.vault_writes)) record.vault_writes = [];
  if (!Array.isArray(record.referral_triggers)) record.referral_triggers = [];
  if (!Array.isArray(record.document_templates)) record.document_templates = [];

  // Fix credit_cost
  if (!record.credit_cost || !VALID_CREDIT_COST_TYPES.includes(record.credit_cost)) {
    record.credit_cost = inferCreditCost(description, record.raas_tier_1);
  }

  // Fix status
  if (!record.status || !VALID_STATUSES.includes(record.status)) {
    record.status = "draft";
  }

  // Fix landing_page_slug
  if (!record.landing_page_slug || !record.landing_page_slug.startsWith("workers/")) {
    record.landing_page_slug = `workers/${record.worker_id || "worker"}`;
  }

  // Fix CoPilot Mode Framework fields — defaults if not present
  if (record.modeAware === undefined) record.modeAware = false;
  if (record.modes === undefined) record.modes = [];
  if (record.modeTiers === undefined) record.modeTiers = null;
  if (record.highRisk === undefined) record.highRisk = false;
  if (record.groundUseOnly === undefined) record.groundUseOnly = false;
  if (record.documentHierarchy === undefined) record.documentHierarchy = ["titleapp_baseline", "public_regulatory"];
  if (record.documentChecklist === undefined) record.documentChecklist = [];
  if (record.valueBucket === undefined) record.valueBucket = [];

  // Fix documentControl — add defaults if missing
  if (record.documentControl === undefined) {
    record.documentControl = {
      requiresOperatorDocs: false,
      requiredDocTypes: [],
      advisoryWithoutDocs: true,
      blockWithoutDocs: false,
    };
  }

  // Fix notifications — add default config if missing
  if (!record.notifications || typeof record.notifications !== "object") {
    record.notifications = { ...DEFAULT_NOTIFICATION_CONFIG };
  } else {
    record.notifications = validateNotificationConfig(record.notifications);
  }

  return record;
}

module.exports = {
  TIER_0_DEFAULTS,
  GOV_TIER_0_EXTENSION,
  ESC_TIER_0_EXTENSION,
  CREDIT_COST_MAP,
  VALID_SUBJECT_DOMAINS,
  VALID_DEPLOYMENT_TIERS,
  VALID_SUITES,
  VALID_WORKER_TYPES,
  VALID_MODES,
  VALID_MODE_TIERS,
  VALID_VALUE_BUCKETS,
  VALID_PRICING_TIERS,
  VALID_STATUSES,
  VALID_VERTICALS,
  VALID_PRICE_TIERS_DISPLAY,
  VALID_REVENUE_MODELS,
  VALID_REGISTRY_STATUSES,
  REGISTRY_FIELDS,
  validateWorkerRecord,
  validateRegistryRecord,
  autoFixWorkerRecord,
  validateWorkerPrice,
  validateNotificationConfig,
  VALID_DIGEST_OPTIONS,
  DEFAULT_NOTIFICATION_CONFIG,
  validateDocumentControl,
  parsePriceTier,
  slugify,
};
