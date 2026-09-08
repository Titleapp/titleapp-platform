/**
 * RAAS Enforcement Engine v1
 *
 * Deterministic rule evaluation between AI output and delivery.
 * No LLM in the enforcement step — pure code evaluation.
 */

const path = require("path");

// In-memory ruleset cache (rulesetId → parsed JSON)
const rulesetCache = {};

// ─── Core helpers ───────────────────────────────────────────

/**
 * Load a ruleset by ID. Caches in memory after first read.
 */
function loadRuleset(rulesetId) {
  if (rulesetCache[rulesetId]) return rulesetCache[rulesetId];
  // #42 — WORKER_RULESET_MAP points platform-accounting/hr/marketing/contacts at
  // ids that exist ONLY as `<id>.deprecated.json`, so the primary require threw
  // and those workers silently ran on generic DEFAULT_CHAT_RULES (their real
  // compliance rules + disclaimers never loaded). Try the live `.json` first
  // (unchanged for every working ruleset), then fall back to `.deprecated.json`.
  // The deprecated files contain full, valid rules — this restores enforcement.
  const candidates = [
    path.join(__dirname, "rulesets", `${rulesetId}.json`),
    path.join(__dirname, "rulesets", `${rulesetId}.deprecated.json`),
  ];
  for (const filePath of candidates) {
    try {
      const ruleset = require(filePath);
      rulesetCache[rulesetId] = ruleset;
      return ruleset;
    } catch (e) { /* try next candidate */ }
  }
  console.error(`[enforcement] Failed to load ruleset "${rulesetId}" (.json and .deprecated.json)`);
  return null;
}

/**
 * Resolve a dot-path like "metrics.ltv" into a value from an object.
 */
function getNestedValue(obj, dotPath) {
  if (!obj || !dotPath) return undefined;
  const parts = dotPath.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Resolve a threshold spec. If it's a string starting with "tenant.",
 * look it up in tenantConfig. Otherwise return the literal value.
 */
function resolveThreshold(spec, tenantConfig) {
  if (typeof spec === "string" && spec.startsWith("tenant.")) {
    const key = spec.slice("tenant.".length);
    const val = tenantConfig ? tenantConfig[key] : undefined;
    return val;
  }
  return spec;
}

/**
 * Parse numeric values from formatted strings.
 * Handles: "75%", "$5M", "$5m", "1.35x", "200bps", plain numbers.
 */
function parseNumeric(value) {
  if (typeof value === "number") return value;
  if (value == null) return null;
  const str = String(value).trim();
  if (str === "") return null;

  // Percentage: "75%" → 0.75
  if (str.endsWith("%")) {
    const num = parseFloat(str.slice(0, -1));
    return isNaN(num) ? null : num / 100;
  }

  // Multiplier: "1.35x" → 1.35
  if (str.toLowerCase().endsWith("x")) {
    const num = parseFloat(str.slice(0, -1));
    return isNaN(num) ? null : num;
  }

  // Basis points: "200bps" → 200
  if (str.toLowerCase().endsWith("bps")) {
    const num = parseFloat(str.slice(0, -3));
    return isNaN(num) ? null : num;
  }

  // Dollar amounts: "$5M" → 5000000, "$500K" → 500000
  if (str.startsWith("$")) {
    let numStr = str.slice(1).replace(/,/g, "");
    let multiplier = 1;
    if (numStr.toLowerCase().endsWith("b")) { multiplier = 1e9; numStr = numStr.slice(0, -1); }
    else if (numStr.toLowerCase().endsWith("m")) { multiplier = 1e6; numStr = numStr.slice(0, -1); }
    else if (numStr.toLowerCase().endsWith("k")) { multiplier = 1e3; numStr = numStr.slice(0, -1); }
    const num = parseFloat(numStr);
    return isNaN(num) ? null : num * multiplier;
  }

  // Plain number
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Compare two values with the given operator.
 * Returns true if the condition IS violated (i.e., the rule fires).
 */
function compare(fieldValue, operator, thresholdValue) {
  // For numeric comparisons, try to parse both sides
  const numField = parseNumeric(fieldValue);
  const numThreshold = parseNumeric(thresholdValue);

  switch (operator) {
    case ">":
      if (numField != null && numThreshold != null) return numField > numThreshold;
      return false;
    case "<":
      if (numField != null && numThreshold != null) return numField < numThreshold;
      return false;
    case ">=":
      if (numField != null && numThreshold != null) return numField >= numThreshold;
      return false;
    case "<=":
      if (numField != null && numThreshold != null) return numField <= numThreshold;
      return false;
    case "==":
      if (numField != null && numThreshold != null) return numField === numThreshold;
      return fieldValue === thresholdValue;
    case "!=":
      if (numField != null && numThreshold != null) return numField !== numThreshold;
      return fieldValue !== thresholdValue;
    case "contains":
      return typeof fieldValue === "string" && fieldValue.includes(String(thresholdValue));
    case "not_contains":
      return typeof fieldValue === "string" && !fieldValue.includes(String(thresholdValue));
    case "exists":
      return fieldValue != null;
    case "not_exists":
      return fieldValue == null;
    default:
      console.warn(`[enforcement] Unknown operator: ${operator}`);
      return false;
  }
}

// ─── Rule evaluation ────────────────────────────────────────

/**
 * Evaluate a single rule against AI output.
 * Returns { ruleId, passed, skipped, violation }
 */
function evaluateRule(rule, aiOutput, tenantConfig, requiredInputs) {
  const evalSpec = rule.eval;
  if (!evalSpec) {
    // No eval spec — cannot enforce, skip
    return { ruleId: rule.id, passed: true, skipped: true, violation: null };
  }

  // Special type: required_inputs_check
  if (evalSpec.type === "required_inputs_check") {
    const missingInfo = aiOutput.missingInfo || [];
    if (requiredInputs && requiredInputs.length > 0 && missingInfo.length > 0) {
      // Check if any required inputs appear in missingInfo
      const missingLower = missingInfo.map((m) => String(m).toLowerCase());
      const missing = requiredInputs.filter((ri) =>
        missingLower.some((m) => m.includes(ri.toLowerCase().replace(/_/g, " ")))
      );
      if (missing.length > 0) {
        return {
          ruleId: rule.id,
          passed: false,
          skipped: false,
          violation: `Missing required inputs: ${missing.join(", ")}`,
        };
      }
    }
    return { ruleId: rule.id, passed: true, skipped: false, violation: null };
  }

  // Standard field comparison
  const { field, operator, threshold, conditional } = evalSpec;

  // Resolve threshold (may reference tenant config)
  const resolvedThreshold = resolveThreshold(threshold, tenantConfig);

  // Conditional: skip if tenant hasn't set the threshold
  if (conditional && resolvedThreshold == null) {
    return { ruleId: rule.id, passed: true, skipped: true, violation: null };
  }

  // Get the field value from AI output
  const fieldValue = getNestedValue(aiOutput, field);

  // If field is null/undefined and operator isn't exists/not_exists, skip
  if (fieldValue == null && operator !== "exists" && operator !== "not_exists") {
    return { ruleId: rule.id, passed: true, skipped: true, violation: null };
  }

  // Compare
  const violated = compare(fieldValue, operator, resolvedThreshold);

  if (violated) {
    return {
      ruleId: rule.id,
      passed: false,
      skipped: false,
      violation: `${field} (${fieldValue}) ${operator} ${resolvedThreshold}`,
    };
  }

  return { ruleId: rule.id, passed: true, skipped: false, violation: null };
}

// ─── Main validation ────────────────────────────────────────

/**
 * Validate AI output against a full ruleset.
 * Returns enforcement result with pass/fail, violations, and warnings.
 *
 * Fails closed if ruleset not found.
 */
function validateOutput(rulesetId, aiOutput, tenantConfig) {
  const start = Date.now();

  // Fail closed if ruleset not found
  const ruleset = loadRuleset(rulesetId);
  if (!ruleset) {
    return {
      passed: false,
      hardViolations: [{ ruleId: "_system", violation: `Ruleset "${rulesetId}" not found — fail closed` }],
      softWarnings: [],
      rulesetId,
      rulesetVersion: "unknown",
      evaluatedAt: new Date().toISOString(),
      latencyMs: Date.now() - start,
    };
  }

  const hardViolations = [];
  const softWarnings = [];

  // Evaluate hard stops
  for (const rule of ruleset.hard_stops || []) {
    const result = evaluateRule(rule, aiOutput, tenantConfig, ruleset.required_inputs);
    if (!result.passed && !result.skipped) {
      hardViolations.push({ ruleId: result.ruleId, violation: result.violation });
    }
  }

  // Evaluate soft flags
  for (const rule of ruleset.soft_flags || []) {
    const result = evaluateRule(rule, aiOutput, tenantConfig, ruleset.required_inputs);
    if (!result.passed && !result.skipped) {
      softWarnings.push({ ruleId: result.ruleId, violation: result.violation });
    }
  }

  return {
    passed: hardViolations.length === 0,
    hardViolations,
    softWarnings,
    rulesetId,
    rulesetVersion: ruleset.version || "v0",
    evaluatedAt: new Date().toISOString(),
    latencyMs: Date.now() - start,
  };
}

// ─── Chat validation ────────────────────────────────────────

/**
 * Default chat enforcement rules.
 * Lightweight regex-based checks for chat text responses.
 */
const DEFAULT_CHAT_RULES = [
  {
    id: "no_guaranteed_returns",
    pattern: /\b(guaranteed?\s+(return|profit|gain|yield|income)s?|risk[- ]?free\s+(return|investment|income)|100%\s+safe|cannot?\s+lose|no\s+risk)\b/i,
    message: "Response implies guaranteed investment returns",
  },
  {
    id: "no_specific_legal_advice",
    pattern: /\b(you\s+should\s+(sue|file\s+a\s+lawsuit|take\s+legal\s+action)|as\s+your\s+(lawyer|attorney)|legal\s+advice\s*:|I\s+advise\s+you\s+to\s+(sue|litigate|file))\b/i,
    message: "Response contains specific legal advice",
  },
  {
    id: "no_tax_guarantees",
    pattern: /\b(you\s+will\s+(definitely|certainly)\s+(save|reduce|eliminate)\s+tax|tax[- ]?free\s+guaranteed|I\s+guarantee.*tax)\b/i,
    message: "Response guarantees specific tax outcomes",
  },
];

/**
 * Validate chat text output against regex-based rules.
 * Returns { passed, violations }
 */
function validateChatOutput(responseText, chatRules) {
  const rules = chatRules || DEFAULT_CHAT_RULES;
  const violations = [];

  for (const rule of rules) {
    if (rule.pattern && rule.pattern.test(responseText)) {
      violations.push({ ruleId: rule.id, message: rule.message });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    checked: true,
  };
}

// ─── Unified wrapper ────────────────────────────────────────

/**
 * Call AI with enforcement. Wraps any AI call with validation + retry.
 *
 * @param {Object} opts
 * @param {Function} opts.callAI - async function that returns AI output (string or parsed object)
 * @param {string} opts.rulesetId - ruleset to validate against (for structured output)
 * @param {Object} opts.tenantConfig - tenant risk profile
 * @param {Array} opts.chatRules - custom chat rules (optional, uses defaults)
 * @param {Function} opts.parseJSON - function to parse AI text into object (optional)
 * @param {number} opts.maxRetries - max retries on violation (default 1)
 * @param {string} opts.mode - "analyst" (fail closed) or "chat" (fail open)
 * @param {Function} opts.callAIWithContext - async function(violationContext) for retry with violation info
 * @param {Object} opts.workerRecord - worker record (for document mode check)
 * @param {string} opts.userId - Firebase auth UID (for document mode check)
 * @param {string} opts.workerId - worker ID (for document mode check)
 */
async function callAIWithEnforcement(opts) {
  const {
    callAI,
    rulesetId,
    tenantConfig,
    chatRules,
    parseJSON,
    maxRetries = 1,
    mode = "analyst",
    callAIWithContext,
    workerRecord,
    userId,
    workerId,
  } = opts;

  // ── Document mode check ──
  if (workerRecord && userId) {
    try {
      const { getWorkerDocumentMode } = require("./documentMode");
      const docMode = await getWorkerDocumentMode(userId, workerId || workerRecord.worker_id, workerRecord);

      if (docMode.mode === "BLOCKED") {
        return {
          output: null,
          enforcement: {
            passed: false,
            hardViolations: [{ ruleId: "DOCUMENT_GATE", violation: docMode.disclaimer }],
            softWarnings: [],
            documentMode: docMode,
          },
          blocked: true,
          documentMode: docMode,
        };
      }

      // Attach document mode to opts for downstream consumers
      opts._documentMode = docMode;
    } catch (docErr) {
      console.error("[enforcement] Document mode check failed (non-blocking):", docErr.message);
    }
  }

  let attempts = 0;
  let lastEnforcement = null;
  let lastOutput = null;

  while (attempts <= maxRetries) {
    try {
      // Call the AI
      let rawOutput;
      if (attempts > 0 && callAIWithContext && lastEnforcement) {
        // Retry with violation context
        const violationContext = lastEnforcement.hardViolations
          .map((v) => `VIOLATION: ${v.ruleId} — ${v.violation}`)
          .join("\n");
        rawOutput = await callAIWithContext(violationContext);
      } else {
        rawOutput = await callAI();
      }

      // For structured output (analyst mode)
      if (rulesetId) {
        let parsed = rawOutput;
        if (typeof rawOutput === "string" && parseJSON) {
          parsed = parseJSON(rawOutput);
          if (!parsed) {
            // Parse failed — fail closed in analyst mode
            if (mode === "analyst") {
              return {
                output: null,
                enforcement: {
                  passed: false,
                  hardViolations: [{ ruleId: "_system", violation: "AI output could not be parsed as JSON" }],
                  softWarnings: [],
                  rulesetId,
                  regenerationAttempts: attempts,
                },
                blocked: true,
              };
            }
            // Chat mode: return raw
            return { output: rawOutput, enforcement: { checked: false }, blocked: false };
          }
        }

        const enforcement = validateOutput(rulesetId, parsed, tenantConfig);
        enforcement.regenerationAttempts = attempts;
        lastEnforcement = enforcement;
        lastOutput = parsed;

        if (enforcement.passed) {
          return { output: parsed, enforcement, blocked: false };
        }

        // Hard violations found
        if (attempts < maxRetries) {
          attempts++;
          continue;
        }

        // Max retries exhausted
        if (mode === "analyst") {
          // Return flagged but don't block — attach violations
          parsed._enforcementStatus = "FLAGGED";
          parsed._enforcementViolations = enforcement.hardViolations;
          return { output: parsed, enforcement, blocked: false };
        }

        return { output: parsed, enforcement, blocked: false };
      }

      // For chat output (text)
      const chatCheck = validateChatOutput(rawOutput, chatRules);
      // Prepend document mode disclaimer if present
      const docDisclaimer = opts._documentMode?.disclaimer;
      const finalOutput = docDisclaimer ? `${docDisclaimer}\n\n${rawOutput}` : rawOutput;
      lastOutput = finalOutput;

      if (chatCheck.passed) {
        return { output: finalOutput, enforcement: chatCheck, blocked: false, documentMode: opts._documentMode || null };
      }

      // Chat violations — retry once
      if (attempts < maxRetries && callAIWithContext) {
        const violationContext = chatCheck.violations
          .map((v) => `VIOLATION: ${v.ruleId} — ${v.message}`)
          .join("\n");
        lastEnforcement = chatCheck;
        attempts++;
        continue;
      }

      // Chat mode: deliver anyway with warning logged
      return { output: finalOutput, enforcement: chatCheck, blocked: false, documentMode: opts._documentMode || null };

    } catch (e) {
      console.error(`[enforcement] Error during AI call (attempt ${attempts + 1}):`, e.message);
      if (mode === "analyst") {
        // Fail closed
        return {
          output: null,
          enforcement: {
            passed: false,
            hardViolations: [{ ruleId: "_system", violation: `Enforcement error: ${e.message}` }],
            softWarnings: [],
            rulesetId,
            regenerationAttempts: attempts,
          },
          blocked: true,
        };
      }
      // Chat mode: fail open — return error message
      return {
        output: null,
        enforcement: { checked: false, error: e.message },
        blocked: false,
      };
    }
  }

  // Should not reach here, but fail closed for safety
  return {
    output: lastOutput,
    enforcement: lastEnforcement || { passed: false, hardViolations: [{ ruleId: "_system", violation: "Max retries exhausted" }] },
    blocked: mode === "analyst",
  };
}

// ─── Worker-specific chat rules loader ──────────────────────

/**
 * Map worker slugs to their RAAS ruleset IDs.
 * Only workers with dedicated enforcement rulesets are listed here.
 */
const WORKER_RULESET_MAP = {
  "platform-accounting": "platform_accounting_v1",
  "platform-hr": "platform_hr_compliance_v1",
  "platform-marketing": "platform_marketing_v1",
  "platform-legal": "platform_legal_v1",
  "platform-contacts": "platform_contacts_v1",
  "re-salesperson": "re_sales_v1",
  // CRE Analyst — canonical slug + Firestore slug variant
  "cre-analyst": "cre_deal_screen_v0",
  "cre-analyst-001": "cre_deal_screen_v0",
  // Investor Relations — canonical slug + Firestore slug variant
  "investor-relations": "ir_compliance_v0",
  "ir-worker-001": "ir_compliance_v0",
  // Makai School of Nursing demo suite — all 5 workers share nursing_clinical_v1
  "nursing-records-001": "nursing_clinical_v1",
  "nursing-courses-001": "nursing_clinical_v1",
  "nursing-tutor-001": "nursing_clinical_v1",
  "nursing-comms-001": "nursing_clinical_v1",
  "nursing-accreditation-001": "nursing_clinical_v1",
  // CODEX S52.66 (2026-09-07) — nursing-education-001 (the flagship worker
  // real students/instructors actually use, incl. the real UH Maui College
  // partnership) and its 3 siblings had ZERO ruleset coverage here despite
  // CODEX S52.60 (2026-08-21) explicitly flagging nursing-education-001 as
  // having "the identical gap" MSR was fixed for at the same time — flagged
  // 17 days ago, never actually fixed. Same clinical-safety rules apply
  // (no fabricated ATI scores/clinical hours, no AI NCLEX-readiness
  // declarations, no fake competency signoffs) — this is the same
  // nursing_clinical_v1 ruleset the 5 demo-suite workers above use.
  "nursing-education-001": "nursing_clinical_v1",
  "nursing-micro-001": "nursing_clinical_v1",
  "nursing-ob-001": "nursing_clinical_v1",
  "clinical-evaluation-001": "nursing_clinical_v1",
  // Aviation workers — Phase 2: RAAS as code (CODEX 42)
  // Aviation workers: core 3 use their own v1 rules (CoPilot/MX/Dispatch);
  // other aviation workers use aviation_hard_stops_v1 as the chat-level baseline.
  // PC-12 specific ruleset (av_c02) deprecated — all CoPilot variants use av_c01.
  "av-copilot-001": "av_c01_copilot_v0",
  "av-pc12-ng": "av_c01_copilot_v0",
  "pc12-ng-copilot": "av_c01_copilot_v0",
  "av-digital-logbook": "av_p01_digital_logbook_v0",
  "av-crew-scheduling": "av_032_crew_scheduling_v0",
  "av-dispatch-001": "av_d01_dispatch_v0",
  "av-mx-001": "av_m01_mx_v0",
  "av-daily-ops-report": "aviation_hard_stops_v1",
  "av-dispatch-board": "av_d01_dispatch_v0",
  "av-flight-duty-enforcer": "aviation_hard_stops_v1",
  "av-safety-reporting": "aviation_hard_stops_v1",
  "av-weather-intel": "aviation_hard_stops_v1",
  "av-notam-intel": "aviation_hard_stops_v1",
  "av-currency-tracker": "aviation_hard_stops_v1",
  "av-alex": "aviation_hard_stops_v1",
  "av-alex-personal": "aviation_hard_stops_v1",
  // MSR Servicing & Compliance Worker (CODEX S52.60) — federal-only Phase 1.
  "msr-servicing-001": "msr_servicing_v1",
  // Title Search & Escrow Manager (CODEX S52.63/S52.58) — federal-only Phase 1
  // plus one verified TX-only state citation; had zero coverage before this.
  "re-title-search-001": "title_escrow_v1",
  "re-escrow-001": "title_escrow_v1",
  // Remaining 7 of 11 non-back-office Title/RE workers (Sean's audit,
  // 2026-09-07): had ZERO dedicated ruleset — loadChatRules() returned null
  // for all seven. Phase 0 general-principles rulesets, not exhaustively
  // legally sourced the way title_escrow_v1 is (see each file's own
  // description for what is/isn't independently verified).
  "re-defect-tracker-001": "re_defect_tracker_v0",
  "re-commitment-001": "re_commitment_v0",
  "re-underwriting-001": "re_underwriting_v0",
  "site-recon-001": "site_recon_v0",
  "feasibility-001": "feasibility_v0",
  "re-marketing-001": "re_marketing_v0",
  "law-landuse-001": "law_landuse_v0",
  // CODEX S52.67 (2026-09-07) — all 3 DPP suite workers had zero coverage
  // here despite having real, working RAAS-boundary content hardcoded
  // directly into their fallback systemPrompt strings in index.js (a
  // separate, non-tenant-configurable path that violates "business logic
  // lives in rule definitions, not prompts" — CLAUDE.md invariant #5).
  // Extracted the genuinely reusable regulatory principles (not the
  // Voltara-BV-specific SKU data, which correctly stays as tenant data)
  // into a real, portable ruleset.
  "eu-battery-dpp-001": "eu_battery_dpp_v0",
  "eu-passport-registry-001": "eu_battery_dpp_v0",
  "eu-supply-chain-tracer-001": "eu_battery_dpp_v0",
};

/** Cache compiled chat rules per ruleset */
const _chatRulesCache = {};

/**
 * Load chat-specific enforcement rules for a worker.
 * Reads the JSON ruleset, compiles regex pattern strings to RegExp objects,
 * and merges with DEFAULT_CHAT_RULES (universal rules always apply).
 *
 * @param {string} workerSlug - Worker slug (e.g., "platform-accounting")
 * @returns {Array|null} Compiled chat rules array, or null if no dedicated ruleset
 */
// CODEX S52.66 Phase 1.5 (2026-09-07) — web_search/fetch_url tools are pushed
// into EVERY worker's tool list unconditionally in index.js, not gated per
// worker like WORKER_RULESET_MAP. This ruleset's chat_rules therefore merge
// in universally below, the same way DEFAULT_CHAT_RULES already does,
// regardless of whether workerSlug has its own WORKER_RULESET_MAP entry.
const WEB_SEARCH_GOVERNANCE_RULESET_ID = "web_search_governance_v1";

function compileChatRules(ruleset) {
  if (!ruleset || !Array.isArray(ruleset.chat_rules)) return [];
  const compiled = [];
  for (const rule of ruleset.chat_rules) {
    try {
      compiled.push({ id: rule.id, pattern: new RegExp(rule.pattern, rule.flags || "i"), message: rule.message });
    } catch (e) {
      console.warn(`[enforcement] Skipping invalid chat_rule pattern "${rule.id}":`, e.message);
    }
  }
  return compiled;
}

function loadChatRules(workerSlug) {
  const rulesetId = WORKER_RULESET_MAP[workerSlug];
  const cacheKey = rulesetId || "__none__";
  if (_chatRulesCache[cacheKey]) return _chatRulesCache[cacheKey];

  let compiled = [];
  if (rulesetId) {
    const ruleset = loadRuleset(rulesetId);
    // Preserve the exact prior failure signal workerCanary.js's #42 guard
    // depends on — a mapped ruleset that fails to load (or loads with zero
    // chat_rules) must still surface as null here, not get masked by the
    // universal web-search governance merge below.
    if (!ruleset || !ruleset.chat_rules || ruleset.chat_rules.length === 0) return null;
    compiled = compileChatRules(ruleset);
  }

  // Merge: worker-specific rules (if any) + universal web-search governance
  // (CODEX S52.66 Phase 1.5 — applies even to workers with no WORKER_RULESET_MAP
  // entry, since web_search/fetch_url are unconditional tools) + DEFAULT_CHAT_RULES.
  const merged = [...compiled, ...compileChatRules(loadRuleset(WEB_SEARCH_GOVERNANCE_RULESET_ID)), ...DEFAULT_CHAT_RULES];
  _chatRulesCache[cacheKey] = merged;
  return merged;
}

/**
 * Get the disclaimer text for a worker's ruleset, if any.
 * @param {string} workerSlug
 * @returns {string|null}
 */
function getWorkerDisclaimer(workerSlug) {
  const rulesetId = WORKER_RULESET_MAP[workerSlug];
  if (!rulesetId) return null;
  const ruleset = loadRuleset(rulesetId);
  return ruleset?.disclaimer || null;
}

// ─── Per-course ruleset mechanism (CODEX 70 Surface 2 rework) ───────────
//
// Course Uploader courses have no dedicated file-backed ruleset in
// WORKER_RULESET_MAP above — "course-tutor-001" is a single GENERIC worker
// slug shared by every non-nursing course on the platform, so one static
// file cannot express one course's own rules (e.g. "this course's tutor may
// never give direct answers on graded work"). Each course instead stores
// its own ruleset object — same shape as a ruleset JSON file: hard_stops,
// chat_rules, soft_flags, disclaimer, system_context — directly on its own
// Firestore doc, courses/{slug}.raasRuleset (built by
// services/education/courseRuleset.js from the wizard's "Make sure your
// rules are in place" step).
//
// getCourseEnforcementContext() below merges that per-course ruleset with
// whatever static ruleset WORKER_RULESET_MAP already assigns to this
// workerId (e.g. nursing-courses-001 -> nursing_clinical_v1) — ADDITIVE,
// never a replacement:
//   - course-tutor-001 (no static entry) gets ONLY its own course ruleset.
//   - nursing-courses-001 (static entry = nursing_clinical_v1) gets BOTH
//     nursing_clinical_v1 AND its own course-specific rules layered on top.
//     (This also fixes a real, separate pre-existing gap: the course_chat
//     branch in index.js bypassed WORKER_RULESET_MAP entirely, so even
//     nursing-courses-001 chat got zero nursing_clinical_v1 enforcement
//     before this — see index.js's course_chat handler.)
//
// This function does NOT modify loadChatRules(), getWorkerDisclaimer(), or
// WORKER_RULESET_MAP itself — every other worker's enforcement path through
// those functions is completely unchanged. Only a caller that explicitly
// passes a courseRuleset object gets course-level behavior; today that is
// only the course_chat branch in index.js.
function getCourseEnforcementContext(workerSlug, courseRuleset) {
  const staticRulesetId = WORKER_RULESET_MAP[workerSlug] || null;
  const staticRuleset = staticRulesetId ? loadRuleset(staticRulesetId) : null;

  // Compile chat_rules from both layers (course rules first — they're the
  // most specific to this exact tutor) plus the universal defaults.
  const compiled = [];
  const compileFrom = (ruleset) => {
    if (!ruleset || !Array.isArray(ruleset.chat_rules)) return;
    for (const rule of ruleset.chat_rules) {
      try {
        compiled.push({ id: rule.id, pattern: new RegExp(rule.pattern, rule.flags || "i"), message: rule.message });
      } catch (e) {
        console.warn(`[enforcement] Skipping invalid course chat_rule pattern "${rule.id}":`, e.message);
      }
    }
  };
  compileFrom(courseRuleset);
  compileFrom(staticRuleset);
  compiled.push(...DEFAULT_CHAT_RULES);

  // Disclaimer — join course-specific + static rather than picking one.
  const disclaimerParts = [courseRuleset?.disclaimer, staticRuleset?.disclaimer].filter(Boolean);
  const disclaimer = disclaimerParts.length ? [...new Set(disclaimerParts)].join(" ") : null;

  // hard_stops from both layers. This engine's evaluateRule() only
  // code-evaluates rules that carry a structured `eval` spec
  // (field/operator/threshold) — every hard_stops rule in this ruleset
  // family instead carries prose (label/logic/trigger/on_fail) meant for
  // the LLM to follow directly (see rulesets/nursing_clinical_v1.json,
  // which has no `eval` fields on its hard_stops either). Folding them into
  // a system-prompt addendum follows that same existing convention rather
  // than inventing a new one.
  const hardStops = [
    ...((courseRuleset && Array.isArray(courseRuleset.hard_stops)) ? courseRuleset.hard_stops : []),
    ...((staticRuleset && Array.isArray(staticRuleset.hard_stops)) ? staticRuleset.hard_stops : []),
  ];

  const systemContextParts = [courseRuleset?.system_context, staticRuleset?.system_context].filter(Boolean);
  if (hardStops.length) {
    systemContextParts.push(
      "Hard constraints — never violate:\n" +
      hardStops.map((r) => `- ${r.label || r.id}: ${r.logic || r.trigger || ""}`).join("\n")
    );
  }

  return {
    chatRules: compiled.length ? compiled : null,
    disclaimer,
    systemPromptAddendum: systemContextParts.join("\n\n") || null,
    hasCourseRuleset: !!courseRuleset,
    hasStaticRuleset: !!staticRuleset,
  };
}

module.exports = {
  loadRuleset,
  getNestedValue,
  resolveThreshold,
  parseNumeric,
  compare,
  evaluateRule,
  validateOutput,
  validateChatOutput,
  callAIWithEnforcement,
  DEFAULT_CHAT_RULES,
  loadChatRules,
  getWorkerDisclaimer,
  getCourseEnforcementContext,
  WORKER_RULESET_MAP,
};
