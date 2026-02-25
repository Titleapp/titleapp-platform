/**
 * RAAS Enforcement Engine — Test Suite
 * Run: cd functions/functions && node raas/raas.engine.test.js
 */

const assert = require("assert");
const {
  loadRuleset,
  getNestedValue,
  resolveThreshold,
  parseNumeric,
  compare,
  evaluateRule,
  validateOutput,
  validateChatOutput,
} = require("./raas.engine");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (e) {
    failed++;
    console.error(`  FAIL: ${name}`);
    console.error(`        ${e.message}`);
  }
}

console.log("\nRAAS Enforcement Engine — Tests\n");

// ─── Test 1: Compliant deal passes ─────────────────────────

test("Compliant CRE deal passes all rules", () => {
  const aiOutput = {
    riskScore: 35,
    recommendation: "INVEST",
    metrics: {
      ltv: 0.65,
      dscr: 1.5,
      tenant_count: 5,
      walt_years: 4.2,
    },
    missingInfo: [],
  };
  const tenantConfig = { max_ltv: 0.80, min_dscr: 1.25 };
  const result = validateOutput("cre_deal_screen_v0", aiOutput, tenantConfig);

  assert.strictEqual(result.passed, true, "Should pass");
  assert.strictEqual(result.hardViolations.length, 0, "No hard violations");
  assert.strictEqual(result.softWarnings.length, 0, "No soft warnings");
  assert.strictEqual(result.rulesetId, "cre_deal_screen_v0");
  assert.strictEqual(result.rulesetVersion, "v0");
  assert.ok(result.evaluatedAt, "Should have timestamp");
  assert.ok(typeof result.latencyMs === "number", "Should have latency");
});

// ─── Test 2: LTV violation caught ──────────────────────────

test("LTV exceeding max is caught as hard violation", () => {
  const aiOutput = {
    metrics: { ltv: 0.85, dscr: 1.5, tenant_count: 3, walt_years: 5 },
    missingInfo: [],
  };
  const tenantConfig = { max_ltv: 0.80, min_dscr: 1.25 };
  const result = validateOutput("cre_deal_screen_v0", aiOutput, tenantConfig);

  assert.strictEqual(result.passed, false, "Should fail");
  assert.strictEqual(result.hardViolations.length, 1, "One hard violation");
  assert.strictEqual(result.hardViolations[0].ruleId, "ltv_exceeds_max");
  assert.ok(result.hardViolations[0].violation.includes("0.85"), "Should mention actual value");
});

// ─── Test 3: DSCR violation caught ─────────────────────────

test("DSCR below minimum is caught as hard violation", () => {
  const aiOutput = {
    metrics: { ltv: 0.70, dscr: 1.0, tenant_count: 3, walt_years: 5 },
    missingInfo: [],
  };
  const tenantConfig = { max_ltv: 0.80, min_dscr: 1.25 };
  const result = validateOutput("cre_deal_screen_v0", aiOutput, tenantConfig);

  assert.strictEqual(result.passed, false, "Should fail");
  assert.strictEqual(result.hardViolations.length, 1, "One hard violation");
  assert.strictEqual(result.hardViolations[0].ruleId, "dscr_below_min");
});

// ─── Test 4: Missing required inputs caught ────────────────

test("Missing required inputs triggers hard stop", () => {
  const aiOutput = {
    metrics: { ltv: 0.65, dscr: 1.5 },
    missingInfo: ["Rent roll not provided", "T12 financials needed"],
  };
  const tenantConfig = { max_ltv: 0.80 };
  const result = validateOutput("cre_deal_screen_v0", aiOutput, tenantConfig);

  assert.strictEqual(result.passed, false, "Should fail");
  const missingRule = result.hardViolations.find((v) => v.ruleId === "missing_core_docs");
  assert.ok(missingRule, "Should have missing_core_docs violation");
  assert.ok(missingRule.violation.includes("rent_roll"), "Should mention rent_roll");
});

// ─── Test 5: Soft flags warn but don't block ───────────────

test("Soft flags generate warnings but deal still passes", () => {
  const aiOutput = {
    metrics: {
      ltv: 0.65,
      dscr: 1.5,
      tenant_count: 1,
      walt_years: 1.5,
    },
    missingInfo: [],
  };
  const tenantConfig = { max_ltv: 0.80, min_dscr: 1.25 };
  const result = validateOutput("cre_deal_screen_v0", aiOutput, tenantConfig);

  assert.strictEqual(result.passed, true, "Should still pass (soft flags only)");
  assert.strictEqual(result.hardViolations.length, 0, "No hard violations");
  assert.strictEqual(result.softWarnings.length, 2, "Two soft warnings");
  assert.ok(result.softWarnings.some((w) => w.ruleId === "single_tenant_risk"));
  assert.ok(result.softWarnings.some((w) => w.ruleId === "short_walt"));
});

// ─── Test 6: Conditional rules skip when config missing ────

test("Conditional rules skip when tenant config not set", () => {
  const aiOutput = {
    metrics: { ltv: 0.95, dscr: 0.8 },
    missingInfo: [],
  };
  // Empty tenant config — no max_ltv or min_dscr set
  const tenantConfig = {};
  const result = validateOutput("cre_deal_screen_v0", aiOutput, tenantConfig);

  // LTV and DSCR rules should be skipped (conditional)
  assert.strictEqual(result.passed, true, "Should pass — conditional rules skipped");
  assert.strictEqual(result.hardViolations.length, 0, "No violations when config missing");
});

// ─── Test 7: Fail closed on unknown ruleset ────────────────

test("Unknown ruleset fails closed with system violation", () => {
  const result = validateOutput("nonexistent_ruleset_xyz", {}, {});

  assert.strictEqual(result.passed, false, "Should fail closed");
  assert.strictEqual(result.hardViolations.length, 1, "One system violation");
  assert.strictEqual(result.hardViolations[0].ruleId, "_system");
  assert.ok(result.hardViolations[0].violation.includes("not found"));
});

// ─── Test 8: parseNumeric handles formatted strings ────────

test("parseNumeric handles various formats correctly", () => {
  assert.strictEqual(parseNumeric(42), 42, "Plain number");
  assert.strictEqual(parseNumeric("75%"), 0.75, "Percentage");
  assert.strictEqual(parseNumeric("1.35x"), 1.35, "Multiplier");
  assert.strictEqual(parseNumeric("200bps"), 200, "Basis points");
  assert.strictEqual(parseNumeric("$5M"), 5000000, "Dollar millions");
  assert.strictEqual(parseNumeric("$500K"), 500000, "Dollar thousands");
  assert.strictEqual(parseNumeric("$2.5B"), 2500000000, "Dollar billions");
  assert.strictEqual(parseNumeric("$1,234"), 1234, "Dollar with commas");
  assert.strictEqual(parseNumeric(null), null, "Null");
  assert.strictEqual(parseNumeric(""), null, "Empty string");
  assert.strictEqual(parseNumeric("abc"), null, "Non-numeric string");
});

// ─── Test 9: resolveThreshold handles tenant references ────

test("resolveThreshold resolves tenant config references", () => {
  const config = { max_ltv: 0.80, min_dscr: 1.25, min_net_irr: 15 };

  assert.strictEqual(resolveThreshold("tenant.max_ltv", config), 0.80, "Resolves tenant.max_ltv");
  assert.strictEqual(resolveThreshold("tenant.min_dscr", config), 1.25, "Resolves tenant.min_dscr");
  assert.strictEqual(resolveThreshold("tenant.min_net_irr", config), 15, "Resolves tenant.min_net_irr");
  assert.strictEqual(resolveThreshold("tenant.nonexistent", config), undefined, "Missing key → undefined");
  assert.strictEqual(resolveThreshold(0.80, config), 0.80, "Literal number passthrough");
  assert.strictEqual(resolveThreshold("UNKNOWN", config), "UNKNOWN", "Literal string passthrough");
});

// ─── Test 10: Chat validation catches prohibited language ──

test("Chat validation catches guaranteed returns language", () => {
  const safe = "This deal has strong fundamentals and historically performs well.";
  const unsafe = "This is a guaranteed return investment with no risk to your capital.";

  const safeResult = validateChatOutput(safe);
  assert.strictEqual(safeResult.passed, true, "Safe text should pass");
  assert.strictEqual(safeResult.violations.length, 0, "No violations for safe text");

  const unsafeResult = validateChatOutput(unsafe);
  assert.strictEqual(unsafeResult.passed, false, "Unsafe text should fail");
  assert.ok(unsafeResult.violations.some((v) => v.ruleId === "no_guaranteed_returns"));
});

// ─── Test 11: PE ruleset with net IRR check ────────────────

test("PE deal with low net IRR triggers violation", () => {
  const aiOutput = {
    metrics: { net_irr: 0.08, top_customer_pct: 20, years_operating: 5 },
    missingInfo: [],
  };
  const tenantConfig = { min_net_irr: 0.15 };
  const result = validateOutput("pe_deal_screen_v0", aiOutput, tenantConfig);

  assert.strictEqual(result.passed, false, "Should fail");
  assert.ok(result.hardViolations.some((v) => v.ruleId === "returns_below_target"));
});

// ─── Summary ────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
console.log("All enforcement engine tests passed.\n");
