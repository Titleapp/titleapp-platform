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
  try {
    const filePath = path.join(__dirname, "rulesets", `${rulesetId}.json`);
    const ruleset = require(filePath);
    rulesetCache[rulesetId] = ruleset;
    return ruleset;
  } catch (e) {
    console.error(`[enforcement] Failed to load ruleset "${rulesetId}":`, e.message);
    return null;
  }
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
  } = opts;

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
      lastOutput = rawOutput;

      if (chatCheck.passed) {
        return { output: rawOutput, enforcement: chatCheck, blocked: false };
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
      return { output: rawOutput, enforcement: chatCheck, blocked: false };

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
};
