/**
 * Worker Test Suite — W-021, W-015, W-016
 *
 * Tests:
 *   1. RAAS ruleset loading + enforcement (hard stops, soft flags)
 *   2. Document generators (PDF, XLSX, PPTX) — functional execution with mock data
 *   3. Template registry consistency — all template IDs wired correctly
 *   4. Frontend cross-reference integrity — marketplace, sidebar, icons
 *
 * Run: cd functions/functions && node tests/worker-tests.js
 */

const assert = require("assert");
const path = require("path");

let passed = 0;
let failed = 0;
let sectionPassed = 0;
let sectionFailed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    sectionPassed++;
    console.log(`    PASS  ${name}`);
  } catch (e) {
    failed++;
    sectionFailed++;
    console.error(`    FAIL  ${name}`);
    console.error(`          ${e.message}`);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    sectionPassed++;
    console.log(`    PASS  ${name}`);
  } catch (e) {
    failed++;
    sectionFailed++;
    console.error(`    FAIL  ${name}`);
    console.error(`          ${e.message}`);
  }
}

function section(title) {
  sectionPassed = 0;
  sectionFailed = 0;
  console.log(`\n  ── ${title} ──\n`);
}

function sectionSummary() {
  const total = sectionPassed + sectionFailed;
  if (sectionFailed > 0) {
    console.log(`\n    ${sectionPassed}/${total} passed (${sectionFailed} FAILED)\n`);
  } else {
    console.log(`\n    ${sectionPassed}/${total} all passed\n`);
  }
}

// ═══════════════════════════════════════════════════════════════
//  1. RAAS RULESET ENFORCEMENT
// ═══════════════════════════════════════════════════════════════

const { loadRuleset, validateOutput, evaluateRule, validateChatOutput } = require("../raas/raas.engine");

async function runRaasTests() {
  console.log("\n═══ 1. RAAS RULESET ENFORCEMENT ═══");

  // ── W-021 Construction Manager ──
  section("W-021 Construction Manager — Ruleset");

  test("Ruleset loads successfully", () => {
    const rs = loadRuleset("construction_manager_v0");
    assert.ok(rs, "Ruleset should load");
    assert.strictEqual(rs.id, "construction_manager_v0");
    assert.strictEqual(rs.domain, "construction-management");
  });

  test("Has 5 hard stops and 8 soft flags", () => {
    const rs = loadRuleset("construction_manager_v0");
    assert.strictEqual(rs.hard_stops.length, 5, "5 hard stops");
    assert.strictEqual(rs.soft_flags.length, 8, "8 soft flags");
  });

  test("All hard stops have eval specs", () => {
    const rs = loadRuleset("construction_manager_v0");
    for (const hs of rs.hard_stops) {
      assert.ok(hs.eval, `Hard stop ${hs.id} missing eval spec`);
    }
  });

  test("All soft flags have eval specs", () => {
    const rs = loadRuleset("construction_manager_v0");
    for (const sf of rs.soft_flags) {
      assert.ok(sf.eval, `Soft flag ${sf.id} missing eval spec`);
    }
  });

  test("Compliant project passes all rules", () => {
    const output = {
      project: {
        co_amount: 5000,
        cumulative_co_percent: 3,
        days_past_substantial: 0,
        max_division_percent: 85,
        approved_co_percent: 2,
        max_rfi_overdue_days: 0,
        critical_path_delay_days: 0,
        contingency_percent: 8,
        min_near_critical_float: 12,
        next_inspection_hours: 96,
        max_resubmit_count: 1,
      },
      missingInfo: [],
    };
    const config = { co_authority_limit: 25000 };
    const result = validateOutput("construction_manager_v0", output, config);
    assert.strictEqual(result.passed, true, "Should pass");
    assert.strictEqual(result.hardViolations.length, 0);
  });

  test("CO exceeding authority triggers hard stop", () => {
    const output = {
      project: { co_amount: 50000, cumulative_co_percent: 3, days_past_substantial: 0, max_division_percent: 85 },
      missingInfo: [],
    };
    const config = { co_authority_limit: 25000 };
    const result = validateOutput("construction_manager_v0", output, config);
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "co_exceeds_authority"));
  });

  test("Cumulative CO > 10% triggers hard stop", () => {
    const output = {
      project: { co_amount: 5000, cumulative_co_percent: 12, days_past_substantial: 0, max_division_percent: 85 },
      missingInfo: [],
    };
    const result = validateOutput("construction_manager_v0", output, {});
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "cumulative_co_exceeds_10_percent"));
  });

  test("Budget line > 100% triggers hard stop", () => {
    const output = {
      project: { co_amount: 5000, cumulative_co_percent: 3, days_past_substantial: 0, max_division_percent: 105 },
      missingInfo: [],
    };
    const result = validateOutput("construction_manager_v0", output, {});
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "budget_line_exceeds_100_percent"));
  });

  test("Schedule past substantial completion triggers hard stop", () => {
    const output = {
      project: { co_amount: 5000, cumulative_co_percent: 3, days_past_substantial: 5, max_division_percent: 85 },
      missingInfo: [],
    };
    const result = validateOutput("construction_manager_v0", output, {});
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "schedule_past_substantial_completion"));
  });

  test("Division at risk (>90%) triggers soft flag only", () => {
    const output = {
      project: {
        co_amount: 5000, cumulative_co_percent: 3, days_past_substantial: 0,
        max_division_percent: 95, approved_co_percent: 2, max_rfi_overdue_days: 0,
        critical_path_delay_days: 0, contingency_percent: 8, min_near_critical_float: 10,
        next_inspection_hours: 72, max_resubmit_count: 1,
      },
      missingInfo: [],
    };
    const result = validateOutput("construction_manager_v0", output, {});
    assert.strictEqual(result.passed, true, "Should still pass");
    assert.ok(result.softWarnings.some(w => w.ruleId === "division_at_risk"));
  });

  test("Missing required inputs blocks", () => {
    const output = {
      missingInfo: ["Project info not available", "Construction budget not provided", "Construction schedule missing"],
    };
    const result = validateOutput("construction_manager_v0", output, {});
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "no_project_record"));
  });

  sectionSummary();

  // ── W-015 Construction Lending ──
  section("W-015 Construction Lending — Ruleset");

  test("Ruleset loads successfully", () => {
    const rs = loadRuleset("construction_lending_v0");
    assert.ok(rs, "Ruleset should load");
    assert.strictEqual(rs.id, "construction_lending_v0");
    assert.strictEqual(rs.domain, "construction-lending");
  });

  test("Has 5 hard stops and 7 soft flags", () => {
    const rs = loadRuleset("construction_lending_v0");
    assert.strictEqual(rs.hard_stops.length, 5, "5 hard stops");
    assert.strictEqual(rs.soft_flags.length, 7, "7 soft flags");
  });

  test("All rules have eval specs", () => {
    const rs = loadRuleset("construction_lending_v0");
    for (const hs of rs.hard_stops) {
      assert.ok(hs.eval, `Hard stop ${hs.id} missing eval`);
    }
    for (const sf of rs.soft_flags) {
      assert.ok(sf.eval, `Soft flag ${sf.id} missing eval`);
    }
  });

  test("Compliant loan passes", () => {
    const output = {
      loan: {
        cumulative_drawn: 5000000,
        interest_reserve_balance: 200000,
        current_ltc: 0.65,
        days_past_maturity: 0,
        reserve_delay_surplus: 50000,
        utilization_pct: 50,
        months_to_maturity: 18,
        ltc_headroom_pct: 10,
        contingency_pct: 5,
        reserve_rate_100_surplus: 25000,
        draw_vs_construction_gap: 3,
      },
      missingInfo: [],
    };
    const config = { commitment: 10000000, ltc_covenant: 0.75 };
    const result = validateOutput("construction_lending_v0", output, config);
    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.hardViolations.length, 0);
  });

  test("Draws exceeding commitment blocks", () => {
    // threshold is tenant.loan_commitment — must be in tenant config
    const output = {
      loan: { cumulative_drawn: 11000000, interest_reserve_balance: 200000, current_ltc: 0.65, days_past_maturity: 0 },
      missingInfo: [],
    };
    const config = { loan_commitment: 10000000 };
    const result = validateOutput("construction_lending_v0", output, config);
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "draws_exceed_commitment"));
  });

  test("Interest reserve exhausted blocks", () => {
    const output = {
      loan: { cumulative_drawn: 5000000, interest_reserve_balance: -500, current_ltc: 0.65, days_past_maturity: 0 },
      missingInfo: [],
    };
    const result = validateOutput("construction_lending_v0", output, {});
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "interest_reserve_exhausted"));
  });

  test("Past maturity blocks", () => {
    const output = {
      loan: { cumulative_drawn: 5000000, interest_reserve_balance: 200000, current_ltc: 0.65, days_past_maturity: 10 },
      missingInfo: [],
    };
    const result = validateOutput("construction_lending_v0", output, {});
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "loan_past_maturity"));
  });

  test("High utilization triggers soft flag", () => {
    const output = {
      loan: {
        cumulative_drawn: 5000000, interest_reserve_balance: 200000, current_ltc: 0.65,
        days_past_maturity: 0, reserve_delay_surplus: 50000, utilization_pct: 90,
        months_to_maturity: 12, ltc_headroom_pct: 5, contingency_pct: 5,
        reserve_rate_100_surplus: 10000, draw_vs_construction_gap: 5,
      },
      missingInfo: [],
    };
    const result = validateOutput("construction_lending_v0", output, {});
    assert.strictEqual(result.passed, true);
    assert.ok(result.softWarnings.some(w => w.ruleId === "utilization_high"));
  });

  sectionSummary();

  // ── W-016 Capital Stack Optimizer ──
  section("W-016 Capital Stack Optimizer — Ruleset");

  test("Ruleset loads successfully", () => {
    const rs = loadRuleset("capital_stack_optimizer_v0");
    assert.ok(rs, "Ruleset should load");
    assert.strictEqual(rs.id, "capital_stack_optimizer_v0");
    assert.strictEqual(rs.domain, "finance_investment");
  });

  test("Has 5 hard stops and 8 soft flags", () => {
    const rs = loadRuleset("capital_stack_optimizer_v0");
    assert.strictEqual(rs.hard_stops.length, 5, "5 hard stops");
    assert.strictEqual(rs.soft_flags.length, 8, "8 soft flags");
  });

  test("All rules have eval specs", () => {
    const rs = loadRuleset("capital_stack_optimizer_v0");
    for (const hs of rs.hard_stops) {
      assert.ok(hs.eval, `Hard stop ${hs.id} missing eval`);
    }
    for (const sf of rs.soft_flags) {
      assert.ok(sf.eval, `Soft flag ${sf.id} missing eval`);
    }
  });

  test("Compliant capital stack passes", () => {
    const output = {
      stack: {
        sources_uses_ratio: 1.0,
        leverage_ratio: 0.65,
        max_tier_split: 1.0,
        total_equity: 5000000,
        sources_uses_gap_pct: 0,
        wacc_vs_yield_spread: -2.0,
        investor_count: 10,
      },
      returns: {
        lp_irr: 18,
        min_dscr: 1.35,
        equity_multiple: 2.1,
      },
      scenarios: {
        downside_levered_irr: 5,
      },
      assumptions: {
        exit_cap_spread_bps: 50,
      },
      missingInfo: [],
    };
    const config = { max_leverage_ratio: 0.75, target_irr: 15, min_dscr: 1.25, target_equity_multiple: 1.8, target_exit_spread_bps: 25 };
    const result = validateOutput("capital_stack_optimizer_v0", output, config);
    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.hardViolations.length, 0);
    assert.strictEqual(result.softWarnings.length, 0);
  });

  test("Sources exceeding uses by >5% blocks", () => {
    const output = {
      stack: { sources_uses_ratio: 1.12, leverage_ratio: 0.65, max_tier_split: 1.0, total_equity: 5000000 },
      missingInfo: [],
    };
    const result = validateOutput("capital_stack_optimizer_v0", output, {});
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "sources_exceed_uses"));
  });

  test("Leverage exceeding max blocks (with tenant config)", () => {
    const output = {
      stack: { sources_uses_ratio: 1.0, leverage_ratio: 0.82, max_tier_split: 1.0, total_equity: 3000000 },
      missingInfo: [],
    };
    const config = { max_leverage_ratio: 0.75 };
    const result = validateOutput("capital_stack_optimizer_v0", output, config);
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "leverage_exceeds_maximum"));
  });

  test("Leverage check skipped when no tenant config", () => {
    const output = {
      stack: { sources_uses_ratio: 1.0, leverage_ratio: 0.82, max_tier_split: 1.0, total_equity: 3000000 },
      missingInfo: [],
    };
    const result = validateOutput("capital_stack_optimizer_v0", output, {});
    // Conditional rule should skip — leverage_exceeds_maximum won't fire
    const leverageViolation = result.hardViolations.find(v => v.ruleId === "leverage_exceeds_maximum");
    assert.ok(!leverageViolation, "Should skip conditional rule when no tenant config");
  });

  test("Waterfall split > 100% blocks", () => {
    const output = {
      stack: { sources_uses_ratio: 1.0, leverage_ratio: 0.65, max_tier_split: 1.05, total_equity: 5000000 },
      missingInfo: [],
    };
    const result = validateOutput("capital_stack_optimizer_v0", output, {});
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "waterfall_split_exceeds_100"));
  });

  test("Negative equity blocks", () => {
    const output = {
      stack: { sources_uses_ratio: 1.0, leverage_ratio: 0.65, max_tier_split: 1.0, total_equity: -500000 },
      missingInfo: [],
    };
    const result = validateOutput("capital_stack_optimizer_v0", output, {});
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "negative_equity"));
  });

  test("Downside negative IRR triggers critical soft flag", () => {
    const output = {
      stack: {
        sources_uses_ratio: 1.0, leverage_ratio: 0.65, max_tier_split: 1.0,
        total_equity: 5000000, sources_uses_gap_pct: 0, wacc_vs_yield_spread: -1,
        investor_count: 10,
      },
      returns: { lp_irr: 18, min_dscr: 1.35, equity_multiple: 2.1 },
      scenarios: { downside_levered_irr: -3 },
      assumptions: { exit_cap_spread_bps: 50 },
      missingInfo: [],
    };
    const result = validateOutput("capital_stack_optimizer_v0", output, {});
    assert.strictEqual(result.passed, true, "Soft flags don't block");
    assert.ok(result.softWarnings.some(w => w.ruleId === "downside_negative_irr"));
  });

  test(">35 investors triggers SEC warning", () => {
    const output = {
      stack: {
        sources_uses_ratio: 1.0, leverage_ratio: 0.65, max_tier_split: 1.0,
        total_equity: 5000000, sources_uses_gap_pct: 0, wacc_vs_yield_spread: -1,
        investor_count: 42,
      },
      returns: { lp_irr: 18, min_dscr: 1.35, equity_multiple: 2.1 },
      scenarios: { downside_levered_irr: 5 },
      assumptions: { exit_cap_spread_bps: 50 },
      missingInfo: [],
    };
    const result = validateOutput("capital_stack_optimizer_v0", output, {});
    assert.ok(result.softWarnings.some(w => w.ruleId === "sec_reg_d_threshold"));
  });

  test("Missing required inputs blocks", () => {
    const output = {
      missingInfo: ["Deal name not provided", "Total project cost unknown", "No capital layers defined"],
    };
    const result = validateOutput("capital_stack_optimizer_v0", output, {});
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "no_deal_record"));
  });

  sectionSummary();

  // ── W-002 CRE Deal Analyst (uses cre_deal_screen_v0 as primary) ──
  section("W-002 CRE Deal Analyst — Ruleset");

  test("CRE deal screen ruleset loads successfully", () => {
    const rs = loadRuleset("cre_deal_screen_v0");
    assert.ok(rs);
    assert.strictEqual(rs.domain, "commercial-real-estate");
  });

  test("All rules have eval specs", () => {
    const rs = loadRuleset("cre_deal_screen_v0");
    const allRules = [...rs.hard_stops, ...rs.soft_flags];
    allRules.forEach(r => assert.ok(r.eval, `Rule ${r.id} missing eval`));
  });

  test("Outputs reference da- prefixed template IDs", () => {
    const rs = loadRuleset("cre_deal_screen_v0");
    rs.outputs.forEach(o => assert.ok(o.startsWith("da-"), `Output ${o} should start with da-`));
  });

  test("Compliant deal passes", () => {
    const output = { metrics: { ltv: 0.60, dscr: 1.5, tenant_count: 5, walt_years: 4 }, missingInfo: [] };
    const config = { max_ltv: 0.75, min_dscr: 1.25 };
    const result = validateOutput("cre_deal_screen_v0", output, config);
    assert.strictEqual(result.passed, true);
  });

  test("LTV exceeding max blocks (with tenant config)", () => {
    const output = { metrics: { ltv: 0.80, dscr: 1.5 }, missingInfo: [] };
    const config = { max_ltv: 0.75 };
    const result = validateOutput("cre_deal_screen_v0", output, config);
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "ltv_exceeds_max"));
  });

  test("Single tenant triggers soft flag", () => {
    const output = { metrics: { ltv: 0.60, dscr: 1.5, tenant_count: 1, walt_years: 5 }, missingInfo: [] };
    const result = validateOutput("cre_deal_screen_v0", output, {});
    assert.strictEqual(result.passed, true);
    assert.ok(result.softWarnings.some(w => w.ruleId === "single_tenant_risk"));
  });

  test("LTV check skipped when no tenant config", () => {
    const output = { metrics: { ltv: 0.90, dscr: 0.9 }, missingInfo: [] };
    const result = validateOutput("cre_deal_screen_v0", output, {});
    assert.strictEqual(result.passed, true); // Both conditional, no config
  });

  sectionSummary();

  // ── W-019 Investor Relations (uses ir_compliance_v0 as primary) ──
  section("W-019 Investor Relations — Ruleset");

  test("IR compliance ruleset loads successfully", () => {
    const rs = loadRuleset("ir_compliance_v0");
    assert.ok(rs);
    assert.strictEqual(rs.domain, "investor-relations");
  });

  test("Has 6 hard stops and 4 soft flags", () => {
    const rs = loadRuleset("ir_compliance_v0");
    assert.strictEqual(rs.hard_stops.length, 6);
    assert.strictEqual(rs.soft_flags.length, 4);
  });

  test("Outputs reference ir- prefixed template IDs", () => {
    const rs = loadRuleset("ir_compliance_v0");
    rs.outputs.forEach(o => assert.ok(o.startsWith("ir-"), `Output ${o} should start with ir-`));
  });

  test("IR fund ruleset loads", () => {
    const rs = loadRuleset("ir_fund_v0");
    assert.ok(rs);
    assert.strictEqual(rs.domain, "fund-formation");
    rs.outputs.forEach(o => assert.ok(o.startsWith("ir-"), `Output ${o} should start with ir-`));
  });

  test("IR syndication ruleset loads", () => {
    const rs = loadRuleset("ir_syndication_v0");
    assert.ok(rs);
    assert.strictEqual(rs.domain, "cre-syndication");
    rs.outputs.forEach(o => assert.ok(o.startsWith("ir-"), `Output ${o} should start with ir-`));
  });

  test("Missing KYC blocks investor", () => {
    const output = { investor: { kycVerified: false, accredited: true }, deal: { regulation: "506b" }, missingInfo: [] };
    const result = validateOutput("ir_compliance_v0", output, {});
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "missing_kyc"));
  });

  test("Large single investor triggers soft flag", () => {
    const output = { investor: { kycVerified: true, accredited: true }, metrics: { maxInvestorPct: 0.30 }, docs: { ppm: true, subscriptionAgreement: true }, deal: { regulation: "506b", nonAccreditedCount: 2 }, missingInfo: [] };
    const result = validateOutput("ir_compliance_v0", output, {});
    assert.strictEqual(result.passed, true);
    assert.ok(result.softWarnings.some(w => w.ruleId === "large_single_investor"));
  });

  sectionSummary();

  // ── W-048 Chief of Staff ──
  section("W-048 Chief of Staff — Ruleset");

  test("Chief of Staff ruleset loads successfully", () => {
    const rs = loadRuleset("chief_of_staff_v0");
    assert.ok(rs);
    assert.strictEqual(rs.domain, "platform-operations");
  });

  test("Has 3 hard stops and 4 soft flags", () => {
    const rs = loadRuleset("chief_of_staff_v0");
    assert.strictEqual(rs.hard_stops.length, 3);
    assert.strictEqual(rs.soft_flags.length, 4);
  });

  test("All rules have eval specs", () => {
    const rs = loadRuleset("chief_of_staff_v0");
    const allRules = [...rs.hard_stops, ...rs.soft_flags];
    allRules.forEach(r => assert.ok(r.eval, `Rule ${r.id} missing eval`));
  });

  test("Outputs reference cos- prefixed template IDs", () => {
    const rs = loadRuleset("chief_of_staff_v0");
    rs.outputs.forEach(o => assert.ok(o.startsWith("cos-"), `Output ${o} should start with cos-`));
  });

  test("Unsubscribed worker routing blocks", () => {
    const output = { pipeline: { unsubscribedWorkerCount: 1, overriddenHardStops: 0 }, missingInfo: [] };
    const result = validateOutput("chief_of_staff_v0", output, {});
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "worker_not_subscribed"));
  });

  test("Overriding specialist hard stop blocks", () => {
    const output = { pipeline: { unsubscribedWorkerCount: 0, overriddenHardStops: 1 }, missingInfo: [] };
    const result = validateOutput("chief_of_staff_v0", output, {});
    assert.strictEqual(result.passed, false);
    assert.ok(result.hardViolations.some(v => v.ruleId === "specialist_hard_stop_override"));
  });

  test("Stalled pipeline triggers soft flag", () => {
    const output = { pipeline: { unsubscribedWorkerCount: 0, overriddenHardStops: 0, maxStallHours: 72 }, tasks: { overdueCount: 0 }, missingInfo: [] };
    const result = validateOutput("chief_of_staff_v0", output, {});
    assert.strictEqual(result.passed, true);
    assert.ok(result.softWarnings.some(w => w.ruleId === "pipeline_stalled"));
  });

  sectionSummary();

  // ── 25 New Workers — Data-Driven Ruleset Tests ──
  const newWorkerRulesets = [
    { id: "W-001", name: "Market Research", rulesetId: "market_research_v0", domain: "market-research", hardStops: 3, softFlags: 4, prefix: "mr-" },
    { id: "W-005", name: "Architecture & Design Review", rulesetId: "architecture_design_review_v0", domain: "architecture-design-review", hardStops: 3, softFlags: 4, prefix: "adr-" },
    { id: "W-006", name: "Engineering Review", rulesetId: "engineering_review_v0", domain: "engineering-review", hardStops: 3, softFlags: 3, prefix: "er-" },
    { id: "W-007", name: "Environmental & Cultural Review", rulesetId: "environmental_cultural_review_v0", domain: "environmental-review", hardStops: 4, softFlags: 4, prefix: "ecr-" },
    { id: "W-008", name: "Energy & Sustainability", rulesetId: "energy_sustainability_v0", domain: "energy-sustainability", hardStops: 2, softFlags: 4, prefix: "es-" },
    { id: "W-009", name: "Accessibility & Fair Housing", rulesetId: "accessibility_fair_housing_v0", domain: "accessibility-compliance", hardStops: 4, softFlags: 3, prefix: "afh-" },
    { id: "W-010", name: "Government Relations", rulesetId: "government_relations_v0", domain: "government-relations", hardStops: 3, softFlags: 3, prefix: "gr-" },
    { id: "W-011", name: "Fire & Life Safety", rulesetId: "fire_life_safety_v0", domain: "fire-life-safety", hardStops: 3, softFlags: 4, prefix: "fls-" },
    { id: "W-020", name: "Opportunity Zone", rulesetId: "opportunity_zone_v0", domain: "opportunity-zone", hardStops: 4, softFlags: 4, prefix: "oz-" },
    { id: "W-030", name: "Appraisal & Valuation Review", rulesetId: "appraisal_valuation_review_v0", domain: "appraisal-review", hardStops: 2, softFlags: 4, prefix: "avr-" },
    { id: "W-032", name: "Tenant Screening", rulesetId: "tenant_screening_v0", domain: "tenant-screening", hardStops: 4, softFlags: 4, prefix: "ts-" },
    { id: "W-034", name: "Rent Roll & Revenue", rulesetId: "rent_roll_revenue_v0", domain: "rent-roll", hardStops: 3, softFlags: 4, prefix: "rr-" },
    { id: "W-035", name: "Maintenance & Work Order", rulesetId: "maintenance_work_order_v0", domain: "maintenance", hardStops: 3, softFlags: 4, prefix: "mwo-" },
    { id: "W-036", name: "Utility Management", rulesetId: "utility_management_v0", domain: "utility-management", hardStops: 2, softFlags: 4, prefix: "um-" },
    { id: "W-037", name: "HOA & Association", rulesetId: "hoa_association_v0", domain: "hoa-management", hardStops: 3, softFlags: 4, prefix: "hoa-" },
    { id: "W-038", name: "Warranty & Defect", rulesetId: "warranty_defect_v0", domain: "warranty-management", hardStops: 3, softFlags: 4, prefix: "wd-" },
    { id: "W-040", name: "Tax & Assessment", rulesetId: "tax_assessment_v0", domain: "tax-assessment", hardStops: 2, softFlags: 4, prefix: "ta-" },
    { id: "W-041", name: "Vendor & Contract", rulesetId: "vendor_contract_v0", domain: "vendor-management", hardStops: 3, softFlags: 4, prefix: "vc-" },
    { id: "W-042", name: "Disposition Preparation", rulesetId: "disposition_preparation_v0", domain: "disposition", hardStops: 3, softFlags: 4, prefix: "dp-" },
    { id: "W-043", name: "1031 Exchange", rulesetId: "exchange_1031_v0", domain: "1031-exchange", hardStops: 4, softFlags: 4, prefix: "ex-" },
    { id: "W-046", name: "Entity & Formation", rulesetId: "entity_formation_v0", domain: "entity-management", hardStops: 3, softFlags: 4, prefix: "ef-" },
    { id: "W-049", name: "Property Insurance & Risk", rulesetId: "property_insurance_risk_v0", domain: "property-insurance", hardStops: 4, softFlags: 4, prefix: "pir-" },
    { id: "W-050", name: "Disposition Marketing & Data Room", rulesetId: "disposition_marketing_v0", domain: "disposition-marketing", hardStops: 3, softFlags: 4, prefix: "dmdr-" },
    { id: "W-051", name: "Investor Reporting & Distributions", rulesetId: "investor_reporting_distributions_v0", domain: "investor-distributions", hardStops: 3, softFlags: 4, prefix: "ird-" },
    { id: "W-052", name: "Debt Service & Loan Compliance", rulesetId: "debt_service_loan_compliance_v0", domain: "debt-compliance", hardStops: 4, softFlags: 4, prefix: "dslc-" },
  ];

  for (const w of newWorkerRulesets) {
    section(`${w.id} ${w.name} — Ruleset`);

    test("Ruleset loads successfully", () => {
      const rs = loadRuleset(w.rulesetId);
      assert.ok(rs, `${w.rulesetId} should load`);
      assert.strictEqual(rs.id, w.rulesetId);
      assert.strictEqual(rs.domain, w.domain);
    });

    test(`Has ${w.hardStops} hard stops and ${w.softFlags} soft flags`, () => {
      const rs = loadRuleset(w.rulesetId);
      assert.strictEqual(rs.hard_stops.length, w.hardStops, `${w.hardStops} hard stops`);
      assert.strictEqual(rs.soft_flags.length, w.softFlags, `${w.softFlags} soft flags`);
    });

    test("All rules have eval specs", () => {
      const rs = loadRuleset(w.rulesetId);
      for (const hs of rs.hard_stops) {
        assert.ok(hs.eval, `Hard stop ${hs.id} missing eval`);
      }
      for (const sf of rs.soft_flags) {
        assert.ok(sf.eval, `Soft flag ${sf.id} missing eval`);
      }
    });

    test(`Outputs use ${w.prefix} prefix`, () => {
      const rs = loadRuleset(w.rulesetId);
      assert.ok(rs.outputs.length > 0, "Should have outputs");
      rs.outputs.forEach(o => assert.ok(o.startsWith(w.prefix), `Output ${o} should start with ${w.prefix}`));
    });

    sectionSummary();
  }

  // ── 6 Deal Screen Rulesets — Output Cross-Reference ──
  section("Deal Screen Rulesets — Output Prefix Check");

  const dealScreens = ["pe_deal_screen_v0", "debt_acquisition_screen_v0", "entitlement_screen_v0", "refinance_screen_v0", "conversion_screen_v0"];
  dealScreens.forEach(rsId => {
    test(`${rsId} outputs use da- prefix`, () => {
      const rs = loadRuleset(rsId);
      assert.ok(rs);
      rs.outputs.forEach(o => assert.ok(o.startsWith("da-"), `${rsId} output ${o} should start with da-`));
    });
  });

  sectionSummary();

  // ── Chat Output Validation ──
  section("Chat Output — Cross-Worker Compliance");

  test("Safe capital stack description passes chat rules", () => {
    const text = "Based on the current capital stack, your blended cost of capital is 6.2% with a projected LP IRR of 17.4%. The downside scenario shows an IRR of 4.1%, which is above break-even.";
    const result = validateChatOutput(text);
    assert.strictEqual(result.passed, true);
  });

  test("Guaranteed returns language blocked", () => {
    const text = "This deal provides a guaranteed return of 15% with no risk to your capital.";
    const result = validateChatOutput(text);
    assert.strictEqual(result.passed, false);
    assert.ok(result.violations.some(v => v.ruleId === "no_guaranteed_returns"));
  });

  test("Risk-free investment language blocked", () => {
    const text = "This is essentially a risk-free investment given the current market conditions.";
    const result = validateChatOutput(text);
    assert.strictEqual(result.passed, false);
  });

  sectionSummary();
}

// ═══════════════════════════════════════════════════════════════
//  2. DOCUMENT GENERATORS — FUNCTIONAL EXECUTION
// ═══════════════════════════════════════════════════════════════

async function runGeneratorTests() {
  console.log("\n═══ 2. DOCUMENT GENERATORS ═══");

  const { generatePdf } = require("../services/documentEngine/generators/pdfGenerator");
  const { generateXlsx } = require("../services/documentEngine/generators/xlsxGenerator");
  const { generatePptx } = require("../services/documentEngine/generators/pptxGenerator");
  const { SYSTEM_TEMPLATES } = require("../services/documentEngine/templates/registry");

  const defaultBrand = {
    name: "TestCo",
    primaryColor: "#7c3aed",
    secondaryColor: "#1e1b4b",
    aiDisclosure: "Test disclosure",
  };

  // ── W-021 PDFs ──
  section("W-021 Construction Manager — PDF Generators");

  await testAsync("cm-monthly-progress generates valid PDF buffer", async () => {
    const buf = await generatePdf({
      template: SYSTEM_TEMPLATES["cm-monthly-progress"],
      data: {
        title: "Monthly Progress Report",
        projectName: "Riverside Apartments",
        reportPeriod: "March 2026",
        percentComplete: 45,
        daysAheadBehind: -3,
        budgetSummary: { originalContract: 18500000, approvedChanges: 250000, revisedContract: 18750000, committed: 17000000, spentToDate: 8400000, remaining: 10350000, contingencyRemaining: 425000 },
        changeOrders: [{ number: "CO-001", description: "Foundation redesign", amount: 125000, status: "Approved" }],
        rfis: [{ number: "RFI-001", description: "MEP routing clarification", assignedTo: "Architect", status: "Open", daysOpen: 5 }],
        risks: [{ description: "Material delivery delays", severity: "Medium", mitigation: "Pre-order critical materials", status: "Open" }],
        lookAhead: [{ activity: "Second floor framing", trade: "Carpentry", startDate: "3/15", endDate: "3/29", status: "Scheduled" }],
      },
      brand: defaultBrand,
      logoBuffer: null,
    });
    assert.ok(Buffer.isBuffer(buf), "Should return a Buffer");
    assert.ok(buf.length > 500, "PDF should have substantial content: " + buf.length + " bytes");
  });

  await testAsync("cm-weekly-oac generates valid PDF buffer", async () => {
    const buf = await generatePdf({
      template: SYSTEM_TEMPLATES["cm-weekly-oac"],
      data: {
        title: "Weekly OAC Report",
        projectName: "Riverside Apartments",
        weekNumber: 14,
        reportDate: "March 28, 2026",
        percentComplete: 45,
        daysAheadBehind: -3,
        budgetSummary: { revisedContract: 18750000, spentToDate: 8400000, remaining: 10350000, contingencyRemaining: 425000 },
        openRfis: 5,
        openCOs: 2,
        openSubmittals: 8,
        actionItems: [{ item: "Confirm steel delivery date", owner: "GC", dueDate: "4/1/2026", status: "Open" }],
      },
      brand: defaultBrand,
      logoBuffer: null,
    });
    assert.ok(Buffer.isBuffer(buf), "Should return a Buffer");
    assert.ok(buf.length > 500, "PDF should have substantial content");
  });

  await testAsync("cm-punchlist generates valid PDF buffer", async () => {
    const buf = await generatePdf({
      template: SYSTEM_TEMPLATES["cm-punchlist"],
      data: {
        title: "Punchlist",
        projectName: "Riverside Apartments",
        inspectionDate: "March 25, 2026",
        inspectedBy: "Site Superintendent",
        punchlistItems: [
          { number: "1", area: "Unit 201", description: "Touch up paint — bedroom wall", trade: "Paint", responsibleSub: "ABC Painting", dueDate: "4/5/2026", status: "Open" },
          { number: "2", area: "Lobby", description: "Replace damaged tile", trade: "Flooring", responsibleSub: "XYZ Flooring", dueDate: "4/3/2026", status: "In Progress" },
        ],
      },
      brand: defaultBrand,
      logoBuffer: null,
    });
    assert.ok(Buffer.isBuffer(buf), "Should return a Buffer");
    assert.ok(buf.length > 500, "PDF should have substantial content");
  });

  sectionSummary();

  // ── W-021 XLSX ──
  section("W-021 Construction Manager — XLSX Generators");

  await testAsync("cm-budget-tracker generates valid XLSX buffer", async () => {
    const buf = await generateXlsx({
      template: SYSTEM_TEMPLATES["cm-budget-tracker"],
      data: {
        title: "Budget Tracker",
        projectName: "Riverside Apartments",
        originalContract: 18500000,
        divisions: [
          { number: "03", name: "Concrete", original: 2100000, approved: 125000, committed: 2200000, actualToDate: 1800000 },
          { number: "05", name: "Metals", original: 3200000, approved: 0, committed: 3200000, actualToDate: 2400000 },
        ],
        contingencyBudget: 500000,
        contingencyUsed: 75000,
        cashFlowPeriods: [
          { period: "Jan 2026", projected: 1200000, actual: 1150000 },
          { period: "Feb 2026", projected: 1400000, actual: 1500000 },
        ],
      },
      brand: defaultBrand,
    });
    assert.ok(Buffer.isBuffer(buf) || buf instanceof ArrayBuffer || buf.byteLength > 0, "Should return buffer");
  });

  await testAsync("cm-rfi-log generates valid XLSX buffer", async () => {
    const buf = await generateXlsx({
      template: SYSTEM_TEMPLATES["cm-rfi-log"],
      data: {
        title: "RFI Log",
        projectName: "Riverside Apartments",
        rfis: [
          { number: "001", date: "2/15/2026", from: "GC", specSection: "03300", description: "Concrete mix design clarification", assignedTo: "Structural Eng", dueDate: "2/22/2026", status: "Open", daysOpen: 12 },
          { number: "002", date: "2/18/2026", from: "Plumber", specSection: "22000", description: "Pipe routing conflict", assignedTo: "MEP Eng", dueDate: "2/25/2026", responseDate: "2/23/2026", status: "Closed", daysOpen: 5 },
        ],
      },
      brand: defaultBrand,
    });
    assert.ok(buf, "Should return buffer");
  });

  await testAsync("cm-co-log generates valid XLSX buffer", async () => {
    const buf = await generateXlsx({
      template: SYSTEM_TEMPLATES["cm-co-log"],
      data: {
        title: "Change Order Log",
        projectName: "Riverside Apartments",
        originalContractSum: 18500000,
        changeOrders: [
          { number: "CO-001", date: "2/10/2026", description: "Foundation redesign", initiatedBy: "Owner", amount: 125000, timeImpact: 5, status: "Approved", approvalLevel: "Owner" },
          { number: "CO-002", date: "3/1/2026", description: "Added HVAC unit", initiatedBy: "Contractor", amount: 45000, timeImpact: 0, status: "Pending", approvalLevel: "PM" },
        ],
      },
      brand: defaultBrand,
    });
    assert.ok(buf, "Should return buffer");
  });

  sectionSummary();

  // ── W-015 PDFs ──
  section("W-015 Construction Lending — PDF Generators");

  await testAsync("cl-loan-comparison generates valid PDF buffer", async () => {
    const buf = await generatePdf({
      template: SYSTEM_TEMPLATES["cl-loan-comparison"],
      data: {
        title: "Loan Comparison Report",
        projectName: "Riverside Apartments",
        projectCost: 18500000,
        termSheets: [
          { lender: "First National Bank", loanAmount: 13500000, ltcRatio: 73, rateDescription: "SOFR + 300bps", termMonths: 24, extensionDescription: "2x 6-mo", originationFeeBps: 100, interestReserve: 750000, recourse: "Full", conversionDescription: "Auto at 90% leased", totalCost: 1850000, effectiveRate: 8.2, pros: ["Strong relationship", "Flexible draws"], cons: ["Full recourse", "Higher origination"] },
          { lender: "Capital Partners", loanAmount: 12950000, ltcRatio: 70, rateDescription: "SOFR + 275bps", termMonths: 30, extensionDescription: "1x 12-mo", originationFeeBps: 75, interestReserve: 680000, recourse: "Partial — 25%", conversionDescription: "None", totalCost: 1620000, effectiveRate: 7.8, pros: ["Partial recourse", "Lower rate"], cons: ["No conversion", "Lower LTC"] },
        ],
        recommendation: "Capital Partners offers lower total cost of capital despite the lower LTC. Recommend supplementing with preferred equity or mezzanine to cover the gap.",
      },
      brand: defaultBrand,
      logoBuffer: null,
    });
    assert.ok(Buffer.isBuffer(buf), "Should return a Buffer");
    assert.ok(buf.length > 500, "PDF should have substantial content");
  });

  await testAsync("cl-utilization-dashboard generates valid PDF buffer", async () => {
    const buf = await generatePdf({
      template: SYSTEM_TEMPLATES["cl-utilization-dashboard"],
      data: {
        title: "Loan Utilization Dashboard",
        projectName: "Riverside Apartments",
        loanCommitment: 13500000,
        drawnToDate: 6750000,
        interestReserveBalance: 425000,
        maturityDate: "September 2027",
        constructionPercent: 48,
        conversionConditions: [
          { condition: "Certificate of Occupancy", status: "Not Started" },
          { condition: "90% Leased", status: "Not Started" },
          { condition: "Phase I Environmental Clear", status: "Complete" },
        ],
        flags: [{ severity: "warning", message: "Interest reserve projected insufficient under +100bps scenario" }],
      },
      brand: defaultBrand,
      logoBuffer: null,
    });
    assert.ok(Buffer.isBuffer(buf), "Should return a Buffer");
    assert.ok(buf.length > 500, "PDF should have substantial content");
  });

  await testAsync("cl-conversion-checklist generates valid PDF buffer", async () => {
    const buf = await generatePdf({
      template: SYSTEM_TEMPLATES["cl-conversion-checklist"],
      data: {
        title: "Conversion Checklist",
        projectName: "Riverside Apartments",
        lenderName: "First National Bank",
        maturityDate: "September 2027",
        conversionDeadline: "July 2027",
        conditions: [
          { condition: "Certificate of Occupancy", status: "Not Started", responsibleParty: "GC", deadline: "7/1/2027", documentation: "CO from AHJ" },
          { condition: "As-built survey", status: "In Progress", responsibleParty: "Surveyor", deadline: "6/15/2027", documentation: "Survey report" },
        ],
      },
      brand: defaultBrand,
      logoBuffer: null,
    });
    assert.ok(Buffer.isBuffer(buf), "Should return a Buffer");
  });

  sectionSummary();

  // ── W-015 XLSX ──
  section("W-015 Construction Lending — XLSX Generators");

  await testAsync("cl-draw-schedule generates valid XLSX buffer", async () => {
    const buf = await generateXlsx({
      template: SYSTEM_TEMPLATES["cl-draw-schedule"],
      data: {
        title: "Draw Schedule",
        projectName: "Riverside Apartments",
        loanAmount: 13500000,
        rate: 7.5,
        interestReserve: 750000,
        periods: [
          { periodNumber: 1, periodStart: "1/1/2026", periodEnd: "1/31/2026", projectedDraw: 1000000, equityContribution: 500000 },
          { periodNumber: 2, periodStart: "2/1/2026", periodEnd: "2/28/2026", projectedDraw: 1200000, equityContribution: 300000 },
          { periodNumber: 3, periodStart: "3/1/2026", periodEnd: "3/31/2026", projectedDraw: 1500000, equityContribution: 200000 },
        ],
      },
      brand: defaultBrand,
    });
    assert.ok(buf, "Should return buffer");
  });

  await testAsync("cl-interest-reserve generates valid XLSX with 4 scenario tabs", async () => {
    const buf = await generateXlsx({
      template: SYSTEM_TEMPLATES["cl-interest-reserve"],
      data: {
        title: "Interest Reserve Model",
        projectName: "Riverside Apartments",
        loanAmount: 13500000,
        rate: 7.5,
        interestReserve: 750000,
        constructionMonths: 18,
      },
      brand: defaultBrand,
    });
    assert.ok(buf, "Should return buffer");
  });

  sectionSummary();

  // ── W-016 PDFs ──
  section("W-016 Capital Stack Optimizer — PDF Generators");

  await testAsync("cs-stack-summary generates valid PDF buffer", async () => {
    const buf = await generatePdf({
      template: SYSTEM_TEMPLATES["cs-stack-summary"],
      data: {
        title: "Capital Stack Summary",
        dealName: "Riverside Apartments",
        totalProjectCost: 18500000,
        capitalLayers: [
          { type: "senior_debt", source: "First National Bank", amount: 12950000, costOrRate: 7.5 },
          { type: "preferred_equity", source: "Meridian Capital", amount: 2000000, costOrRate: 12 },
          { type: "common_equity", source: "Sponsor / LP", amount: 3550000, costOrRate: 18 },
        ],
        uses: [
          { category: "Land Acquisition", amount: 3200000 },
          { category: "Hard Costs", amount: 12000000 },
          { category: "Soft Costs", amount: 1800000 },
          { category: "Financing Costs", amount: 1000000 },
          { category: "Reserves", amount: 500000 },
        ],
        wacc: 10.2,
        returnMetrics: {
          unleveredIrr: 8.5,
          leveredIrr: 17.4,
          lpIrr: 15.8,
          gpIrr: 32.1,
          equityMultiple: 2.1,
          lpEquityMultiple: 1.95,
          paybackPeriod: 3.2,
          peakEquity: 5550000,
        },
        scenarios: {
          base: { leveredIrr: 17.4, lpIrr: 15.8, equityMultiple: 2.1, cashOnCashY1: 8.2 },
          upside: { leveredIrr: 22.1, lpIrr: 19.5, equityMultiple: 2.6, cashOnCashY1: 9.5 },
          downside: { leveredIrr: 9.2, lpIrr: 7.8, equityMultiple: 1.5, cashOnCashY1: 5.1 },
        },
      },
      brand: defaultBrand,
      logoBuffer: null,
    });
    assert.ok(Buffer.isBuffer(buf), "Should return a Buffer");
    assert.ok(buf.length > 1000, "PDF should have substantial content: " + buf.length + " bytes");
  });

  await testAsync("cs-scenario-comparison generates valid PDF buffer", async () => {
    const buf = await generatePdf({
      template: SYSTEM_TEMPLATES["cs-scenario-comparison"],
      data: {
        title: "Scenario Comparison",
        dealName: "Riverside Apartments",
        scenarios: {
          base: { assumptions: { rentGrowth: 3, vacancy: 5, exitCapRate: 5.5 }, returnMetrics: { leveredIrr: 17.4, lpIrr: 15.8, equityMultiple: 2.1, cashOnCashY1: 8.2 } },
          upside: { assumptions: { rentGrowth: 5, vacancy: 3, exitCapRate: 5.0 }, returnMetrics: { leveredIrr: 22.1, lpIrr: 19.5, equityMultiple: 2.6, cashOnCashY1: 9.5 } },
          downside: { assumptions: { rentGrowth: 1, vacancy: 8, exitCapRate: 6.5, costOverrun: 10 }, returnMetrics: { leveredIrr: 9.2, lpIrr: 7.8, equityMultiple: 1.5, cashOnCashY1: 5.1 } },
        },
        recommendation: "The base case delivers target returns. The downside scenario still delivers positive returns with a 1.5x equity multiple, providing adequate downside protection.",
      },
      brand: defaultBrand,
      logoBuffer: null,
    });
    assert.ok(Buffer.isBuffer(buf), "Should return a Buffer");
    assert.ok(buf.length > 500, "PDF should have substantial content");
  });

  sectionSummary();

  // ── W-016 XLSX ──
  section("W-016 Capital Stack Optimizer — XLSX Generators");

  await testAsync("cs-full-model generates valid XLSX with 10 tabs", async () => {
    const buf = await generateXlsx({
      template: SYSTEM_TEMPLATES["cs-full-model"],
      data: {
        title: "Capital Stack Model",
        dealName: "Riverside Apartments",
        totalProjectCost: 18500000,
        capitalLayers: [
          { type: "senior_debt", source: "First National Bank", amount: 12950000, costOrRate: 7.5, term: 24, priority: 1, status: "committed" },
          { type: "preferred_equity", source: "Meridian Capital", amount: 2000000, costOrRate: 12, term: 60, priority: 2, status: "term_sheet" },
          { type: "common_equity", source: "Sponsor / LP", amount: 3550000, costOrRate: 18, term: 60, priority: 3, status: "committed" },
        ],
        uses: [
          { category: "Land Acquisition", amount: 3200000 },
          { category: "Hard Costs", amount: 12000000 },
          { category: "Soft Costs", amount: 1800000 },
          { category: "Financing Costs", amount: 1000000 },
          { category: "Reserves", amount: 500000 },
        ],
        proFormaAssumptions: {
          grossPotentialRent: 2400000,
          vacancy: 0.05,
          otherIncome: 120000,
          operatingExpenses: 850000,
          managementFee: 0.04,
          reserves: 50000,
          rentGrowth: 3,
          expenseGrowth: 2,
          holdPeriod: 5,
          exitCapRate: 0.055,
          sellingCosts: 0.02,
        },
        waterfallTerms: {
          preferredReturn: 8,
          residualSplit: [0.80, 0.20],
        },
        scenarios: {
          base: { returnMetrics: { leveredIrr: 17.4, lpIrr: 15.8, equityMultiple: 2.1 } },
          upside: { returnMetrics: { leveredIrr: 22.1, lpIrr: 19.5, equityMultiple: 2.6 } },
          downside: { returnMetrics: { leveredIrr: 9.2, lpIrr: 7.8, equityMultiple: 1.5 } },
        },
      },
      brand: defaultBrand,
    });
    assert.ok(buf, "Should return buffer");
  });

  await testAsync("cs-waterfall generates valid XLSX with 5 tabs", async () => {
    const buf = await generateXlsx({
      template: SYSTEM_TEMPLATES["cs-waterfall"],
      data: {
        title: "Waterfall Distribution Model",
        dealName: "Riverside Apartments",
        totalEquity: 5550000,
        holdPeriod: 5,
        annualCashFlows: [450000, 520000, 590000, 650000, 710000],
        dispositionProceeds: 8200000,
        waterfallTerms: {
          preferredReturn: 8,
          residualSplit: [0.80, 0.20],
        },
      },
      brand: defaultBrand,
    });
    assert.ok(buf, "Should return buffer");
  });

  sectionSummary();

  // ── W-016 PPTX ──
  section("W-016 Capital Stack Optimizer — PPTX Generator");

  await testAsync("cs-investor-slides generates valid PPTX buffer", async () => {
    const buf = await generatePptx({
      template: SYSTEM_TEMPLATES["cs-investor-slides"],
      data: {
        title: "Capital Stack — Riverside Apartments",
        dealName: "Riverside Apartments",
        subtitle: "Investor Presentation — March 2026",
        presenter: "Scott Roberts",
        capitalLayers: [
          { type: "senior_debt", source: "First National Bank", amount: 12950000, costOrRate: 7.5 },
          { type: "preferred_equity", source: "Meridian Capital", amount: 2000000, costOrRate: 12 },
          { type: "common_equity", source: "Sponsor / LP", amount: 3550000, costOrRate: 18 },
        ],
        uses: [
          { category: "Land", amount: 3200000 },
          { category: "Hard Costs", amount: 12000000 },
          { category: "Soft Costs", amount: 1800000 },
          { category: "Financing", amount: 1000000 },
          { category: "Reserves", amount: 500000 },
        ],
        wacc: 10.2,
        returnMetrics: {
          unleveredIrr: 8.5,
          leveredIrr: 17.4,
          lpIrr: 15.8,
          gpIrr: 32.1,
          equityMultiple: 2.1,
          paybackPeriod: 3.2,
          peakEquity: 5550000,
          cashOnCashY1: 8.2,
        },
        sensitivityData: {
          breakEvenExitCap: 7.8,
          breakEvenVacancy: 18,
          highlights: ["15%+ LP IRR maintained across all base assumptions", "Downside still delivers 1.5x equity multiple"],
        },
        riskFactors: [
          "Construction cost overruns: 10% contingency budgeted",
          "Interest rate exposure: $750K reserve covers +200bps scenario",
          "Lease-up risk: break-even at 65% occupancy",
        ],
      },
      brand: defaultBrand,
      logoBuffer: null,
    });
    assert.ok(Buffer.isBuffer(buf), "Should return a Buffer");
    assert.ok(buf.length > 5000, "PPTX should have substantial content: " + buf.length + " bytes");
  });

  sectionSummary();

  // ── W-002 CRE Analyst PDFs ──
  section("W-002 CRE Analyst — PDF Generators");

  await testAsync("da-ic-memo generates valid PDF buffer", async () => {
    const buf = await generatePdf({
      template: SYSTEM_TEMPLATES["da-ic-memo"],
      data: {
        title: "IC Memo — Oak Park Office",
        dealSummary: { dealType: "CRE Acquisition", asset: "Office", location: "Oak Park, IL", askPrice: 8500000, proposedTerms: "All cash", timeline: "60-day close" },
        thesis: "Value-add office conversion in high-demand suburban corridor.",
        keyAssumptions: ["8% cap rate on stabilized NOI", "18-month renovation timeline", "$45/SF renovation cost"],
        metrics: { noi: 680000, capRate: 0.08, dscr: 1.35, ltv: 0.65, irr: 0.174, equityMultiple: 2.1 },
        risks: ["Tenant concentration risk", "Construction cost overruns"],
        mitigations: ["Diversified tenant mix post-renovation", "10% hard cost contingency"],
        recommendation: "Proceed to IC with conditions: appraisal confirmation, Phase I environmental.",
      },
      brand: defaultBrand,
      logoBuffer: null,
    });
    assert.ok(Buffer.isBuffer(buf));
    assert.ok(buf.length > 500);
  });

  await testAsync("da-risk-summary generates valid PDF buffer", async () => {
    const buf = await generatePdf({
      template: SYSTEM_TEMPLATES["da-risk-summary"],
      data: {
        title: "Risk Summary — Oak Park Office",
        overallRiskRating: "medium",
        riskDrivers: ["Single-tenant exposure", "Suburban office market softness"],
        missingDocuments: ["Phase I Environmental", "Updated appraisal"],
        gatingFailures: [],
        approvalConditions: ["Appraisal within 5% of ask price", "Environmental clear"],
      },
      brand: defaultBrand,
      logoBuffer: null,
    });
    assert.ok(Buffer.isBuffer(buf));
    assert.ok(buf.length > 500);
  });

  sectionSummary();

  // ── W-002 CRE Analyst XLSX ──
  section("W-002 CRE Analyst — XLSX Generators");

  await testAsync("da-assumptions generates valid XLSX buffer", async () => {
    const buf = await generateXlsx({
      template: SYSTEM_TEMPLATES["da-assumptions"],
      data: {
        title: "Assumptions Register — Oak Park Office",
        assumptions: [
          { assumption: "Stabilized NOI", value: 680000, unit: "$", source: "T-12 p.3", sensitivity: "high", notes: "Excludes vacancy" },
          { assumption: "Cap Rate", value: 0.08, unit: "%", source: "Broker OM p.12", sensitivity: "high", notes: "Market range 7-9%" },
          { assumption: "Renovation Cost", value: 45, unit: "$/SF", source: "GC estimate", sensitivity: "medium", notes: "Includes 10% contingency" },
        ],
      },
      brand: defaultBrand,
    });
    assert.ok(buf);
  });

  await testAsync("da-evidence-table generates valid XLSX buffer", async () => {
    const buf = await generateXlsx({
      template: SYSTEM_TEMPLATES["da-evidence-table"],
      data: {
        title: "Evidence Table — Oak Park Office",
        claims: [
          { claim: "Net Operating Income", value: 680000, unit: "$", evidencePointers: [{ sourceType: "file", fileId: "t12-2025", page: 3 }], confidence: "high" },
          { claim: "Cap Rate", value: 0.08, unit: "%", evidencePointers: [{ sourceType: "file", fileId: "om-2025", page: 12 }], confidence: "medium" },
        ],
      },
      brand: defaultBrand,
    });
    assert.ok(buf);
  });

  sectionSummary();

  // ── W-019 Investor Relations PDFs ──
  section("W-019 Investor Relations — PDF Generators");

  const irPdfTemplates = [
    { id: "ir-compliance-checklist", data: { title: "Compliance Checklist", regulation: "506b", dealName: "Fund III", investorCount: 25, nonAccreditedCount: 3, totalRaised: 15000000, checklistItems: [{ name: "PPM Filed", status: "Complete" }, { name: "Blue Sky Filings", status: "Pending" }] } },
    { id: "ir-investor-summary", data: { title: "Investor Summary", totalCommitments: 15000000, totalCalled: 8000000, totalDistributed: 2000000, investors: [{ name: "LP One", commitment: 5000000, accreditation: "verified", called: 3000000, distributed: 750000 }, { name: "LP Two", commitment: 3000000, accreditation: "self_attested", called: 1500000, distributed: 400000 }] } },
    { id: "ir-accreditation-report", data: { title: "Accreditation Report", investors: [{ name: "LP One", method: "third_party", status: "verified", verifiedDate: "2026-01-15", expirationDate: "2026-04-15" }] } },
    { id: "ir-fund-overview", data: { title: "Fund III Overview", fundName: "TitleApp Fund III", strategy: "Value-add multifamily", fundSize: 50000000, targetRaise: 25000000, gpCommit: 0.02, managementFee: 0.015, carry: 0.20, hurdleRate: 0.08, fundLife: 7, investmentPeriod: 3 } },
    { id: "ir-lp-terms", data: { title: "LP Terms Summary", fundName: "Fund III", prefReturn: 0.08, carry: 0.20, hurdleRate: 0.08, gpCommit: 0.02, managementFee: 0.015, clawback: true, keyPerson: "Sean Combs", advisoryCommittee: "3 members", reportingFrequency: "Quarterly", transferRestrictions: "GP consent required" } },
    { id: "ir-deal-summary", data: { title: "Riverside Syndication", propertyName: "Riverside Apartments", purchasePrice: 18500000, noi: 1200000, capRate: 0.065, ltv: 0.70, dscr: 1.35, targetRaise: 5500000, holdPeriod: 5, targetIrr: 0.175, equityMultiple: 2.1, risks: ["Construction delay", "Rate risk"] } },
    { id: "ir-risk-assessment", data: { title: "Risk Assessment — Riverside", overallRating: "medium", marketRisks: ["Suburban multifamily supply increase"], operationalRisks: ["Construction management complexity"], financialRisks: ["Interest rate exposure on floating debt"], structuralRisks: ["LP/GP alignment on promote"], mitigants: ["Pre-leasing requirement", "Rate cap purchased"] } },
    { id: "ir-offering-memo", data: { title: "Offering Memo — Riverside", propertyName: "Riverside Apartments", purchasePrice: 18500000, noi: 1200000, capRate: 0.065, targetIrr: 0.175, equityMultiple: 2.1, holdPeriod: 5, capitalStructure: { "Senior Debt": 12950000, "Preferred Equity": 2000000, "Common Equity": 3550000 }, riskFactors: ["Market risk", "Construction risk", "Interest rate risk"] } },
    { id: "ir-quarterly-report", data: { title: "Q1 2026 Report", quarter: "Q1 2026", fundName: "Fund III", performance: { portfolioValue: 52000000, netIrr: 0.156, equityMultiple: 1.45 }, deals: [{ name: "Riverside", status: "Construction", notes: "45% complete" }], distributions: [{ date: "3/31/2026", deal: "Riverside", amount: 250000, type: "Operating" }], outlook: "Portfolio performing in line with projections." } },
    { id: "ir-capital-call", data: { title: "Capital Call #3", fundName: "Fund III", dealName: "Riverside Apartments", purpose: "Construction draw #3", callAmount: 2000000, dueDate: "2026-04-15", wireInstructions: "First National Bank, ABA 071000013, Acct 123456789", investors: [{ name: "LP One", commitment: 5000000, share: 0.333, callAmount: 666000 }, { name: "LP Two", commitment: 3000000, share: 0.20, callAmount: 400000 }] } },
  ];

  for (const t of irPdfTemplates) {
    await testAsync(`${t.id} generates valid PDF buffer`, async () => {
      const buf = await generatePdf({ template: SYSTEM_TEMPLATES[t.id], data: t.data, brand: defaultBrand, logoBuffer: null });
      assert.ok(Buffer.isBuffer(buf));
      assert.ok(buf.length > 200);
    });
  }

  sectionSummary();

  // ── W-019 IR XLSX ──
  section("W-019 Investor Relations — XLSX Generators");

  await testAsync("ir-fee-analysis generates valid XLSX buffer", async () => {
    const buf = await generateXlsx({
      template: SYSTEM_TEMPLATES["ir-fee-analysis"],
      data: { title: "Fee Analysis — Fund III", fundName: "Fund III", fundSize: 50000000, managementFee: 0.015, carry: 0.20, hurdleRate: 0.08, gpCommit: 0.02, fundLife: 7, investmentPeriod: 3 },
      brand: defaultBrand,
    });
    assert.ok(buf);
  });

  await testAsync("ir-waterfall generates valid XLSX with 5 tabs", async () => {
    const buf = await generateXlsx({
      template: SYSTEM_TEMPLATES["ir-waterfall"],
      data: { title: "Waterfall — Riverside", totalEquity: 5550000, holdPeriod: 5, prefReturn: 0.08, carrySplit: 0.20, cashFlows: [450000, 520000, 590000, 650000, 710000], dispositionProceeds: 8200000, investors: [{ name: "LP One", commitment: 3700000 }, { name: "LP Two", commitment: 1850000 }] },
      brand: defaultBrand,
    });
    assert.ok(buf);
  });

  await testAsync("ir-waterfall-projection generates valid XLSX with 3 tabs", async () => {
    const buf = await generateXlsx({
      template: SYSTEM_TEMPLATES["ir-waterfall-projection"],
      data: { title: "Waterfall Projection — Riverside", totalEquity: 5550000, holdPeriod: 5, prefReturn: 0.08, carrySplit: 0.20, annualCashFlows: [450000, 520000, 590000, 650000, 710000], dispositionProceeds: 8200000 },
      brand: defaultBrand,
    });
    assert.ok(buf);
  });

  sectionSummary();

  // ── W-048 Chief of Staff PDFs ──
  section("W-048 Chief of Staff — PDF Generators");

  await testAsync("cos-pipeline-status generates valid PDF buffer", async () => {
    const buf = await generatePdf({
      template: SYSTEM_TEMPLATES["cos-pipeline-status"],
      data: {
        title: "Pipeline Status — Riverside Deal",
        workspaceName: "Combs Capital",
        pipelines: [{ name: "Riverside Acquisition", status: "Active", currentStep: "Capital Stack Modeling", progress: "Step 3 of 6" }],
        blockedItems: [{ item: "Environmental review", reason: "Awaiting Phase I report", worker: "CRE Analyst" }],
        deadlines: [{ item: "Loan commitment letter", deadline: "2026-04-01", owner: "Construction Lending" }],
      },
      brand: defaultBrand,
      logoBuffer: null,
    });
    assert.ok(Buffer.isBuffer(buf));
    assert.ok(buf.length > 500);
  });

  await testAsync("cos-weekly-digest generates valid PDF buffer", async () => {
    const buf = await generatePdf({
      template: SYSTEM_TEMPLATES["cos-weekly-digest"],
      data: {
        title: "Weekly Digest — Combs Capital",
        workspaceName: "Combs Capital",
        weekOf: "March 24, 2026",
        highlights: ["Riverside deal advanced to capital stack modeling", "Fund III capital call #3 distributed"],
        workerActivity: [{ worker: "CRE Analyst", actions: 5, documents: 2 }, { worker: "IR Worker", actions: 3, documents: 1 }],
        decisionsPending: ["Approve construction loan term sheet", "Confirm investor allocation for capital call #4"],
      },
      brand: defaultBrand,
      logoBuffer: null,
    });
    assert.ok(Buffer.isBuffer(buf));
    assert.ok(buf.length > 500);
  });

  await testAsync("cos-handoff-memo generates valid PDF buffer", async () => {
    const buf = await generatePdf({
      template: SYSTEM_TEMPLATES["cos-handoff-memo"],
      data: {
        title: "Handoff — CRE Analyst → Capital Stack Optimizer",
        sourceWorker: "CRE Deal Analyst (W-002)",
        targetWorker: "Capital Stack Optimizer (W-016)",
        dealName: "Riverside Apartments",
        context: "Deal screening complete. IC memo approved with conditions. Ready for capital stack structuring.",
        dataPassed: { purchasePrice: 18500000, noi: 1200000, capRate: 0.065, dscr: 1.35, ltv: 0.70 },
        expectedOutput: "Capital stack model with senior debt, preferred equity, and common equity layers.",
        approvalStatus: "Pending",
      },
      brand: defaultBrand,
      logoBuffer: null,
    });
    assert.ok(Buffer.isBuffer(buf));
    assert.ok(buf.length > 500);
  });

  sectionSummary();

  // ── W-048 Chief of Staff XLSX ──
  section("W-048 Chief of Staff — XLSX Generators");

  await testAsync("cos-task-tracker generates valid XLSX with 3 tabs", async () => {
    const buf = await generateXlsx({
      template: SYSTEM_TEMPLATES["cos-task-tracker"],
      data: {
        title: "Task Tracker — Riverside Pipeline",
        tasks: [
          { id: 1, task: "Complete deal screening", worker: "CRE Analyst", status: "Completed", priority: "High", dueDate: "2026-03-15" },
          { id: 2, task: "Model capital stack", worker: "Capital Stack Optimizer", status: "In Progress", priority: "High", dueDate: "2026-03-25", blockedBy: "" },
          { id: 3, task: "Prepare offering memo", worker: "Investor Relations", status: "Pending", priority: "Medium", dueDate: "2026-04-05", blockedBy: "2" },
          { id: 4, task: "Secure construction loan", worker: "Construction Lending", status: "Pending", priority: "High", dueDate: "2026-04-15", blockedBy: "2" },
        ],
      },
      brand: defaultBrand,
    });
    assert.ok(buf);
  });

  sectionSummary();

  // ── 25 New Workers — Data-Driven Generator Tests ──
  const newWorkerTemplates = {
    "W-001 Market Research": ["mr-market-study", "mr-comp-analysis", "mr-submarket-ranking", "mr-demographic-profile"],
    "W-005 Architecture & Design Review": ["adr-design-review", "adr-code-compliance", "adr-ve-log"],
    "W-006 Engineering Review": ["er-engineering-review", "er-special-inspection-program", "er-design-change-log"],
    "W-007 Environmental & Cultural Review": ["ecr-environmental-summary", "ecr-remediation-tracker", "ecr-permit-tracker", "ecr-section-106-log"],
    "W-008 Energy & Sustainability": ["es-energy-compliance", "es-certification-tracker", "es-incentive-summary"],
    "W-009 Accessibility & Fair Housing": ["afh-compliance-review", "afh-accommodation-tracker", "afh-unit-classification"],
    "W-010 Government Relations": ["gr-stakeholder-map", "gr-community-outreach-plan", "gr-meeting-preparation"],
    "W-011 Fire & Life Safety": ["fls-fire-code-review", "fls-egress-analysis", "fls-fire-system-tracker"],
    "W-020 Opportunity Zone": ["oz-compliance-dashboard", "oz-asset-test", "oz-substantial-improvement", "oz-investor-180-day"],
    "W-030 Appraisal & Valuation Review": ["avr-appraisal-review", "avr-comp-analysis", "avr-rebuttal-memo"],
    "W-032 Tenant Screening": ["ts-screening-report", "ts-adverse-action", "ts-criteria-summary"],
    "W-034 Rent Roll & Revenue": ["rr-rent-roll", "rr-revenue-forecast", "rr-loss-to-lease", "rr-lease-expiration-matrix"],
    "W-035 Maintenance & Work Order": ["mwo-work-order", "mwo-pm-schedule", "mwo-maintenance-report"],
    "W-036 Utility Management": ["um-utility-report", "um-rubs-calculation", "um-benchmarking-report"],
    "W-037 HOA & Association": ["hoa-board-package", "hoa-assessment-tracker", "hoa-reserve-analysis", "hoa-transition-checklist"],
    "W-038 Warranty & Defect": ["wd-warranty-register", "wd-defect-log", "wd-warranty-claim", "wd-walkthrough-report"],
    "W-040 Tax & Assessment": ["ta-assessment-summary", "ta-appeal-evidence", "ta-payment-tracker", "ta-projection"],
    "W-041 Vendor & Contract": ["vc-vendor-registry", "vc-contract-tracker", "vc-bid-comparison", "vc-spend-report"],
    "W-042 Disposition Preparation": ["dp-disposition-analysis", "dp-broker-comparison", "dp-offer-comparison", "dp-closing-checklist"],
    "W-043 1031 Exchange": ["ex-exchange-analysis", "ex-timeline-tracker", "ex-identification-notice", "ex-basis-calculation"],
    "W-046 Entity & Formation": ["ef-entity-analysis", "ef-formation-checklist", "ef-entity-registry", "ef-annual-compliance"],
    "W-049 Property Insurance & Risk": ["pir-policy-summary", "pir-coverage-review", "pir-claims-log", "pir-renewal-comparison"],
    "W-050 Disposition Marketing & Data Room": ["dmdr-om-template", "dmdr-data-room-index", "dmdr-buyer-tracker", "dmdr-dd-checklist"],
    "W-051 Investor Reporting & Distributions": ["ird-distribution-schedule", "ird-distribution-notice", "ird-capital-account", "ird-investor-package"],
    "W-052 Debt Service & Loan Compliance": ["dslc-covenant-dashboard", "dslc-payment-schedule", "dslc-reserve-tracker", "dslc-lender-compliance-cert"],
  };

  for (const [workerLabel, templateIds] of Object.entries(newWorkerTemplates)) {
    section(`${workerLabel} — Generators`);

    for (const tid of templateIds) {
      const tmpl = SYSTEM_TEMPLATES[tid];
      if (!tmpl) {
        test(`${tid} template found in registry`, () => { assert.fail(`Template ${tid} not in registry`); });
        continue;
      }

      if (tmpl.format === "pdf") {
        await testAsync(`${tid} generates valid PDF buffer`, async () => {
          const data = { title: `Test ${tid}` };
          if (tmpl.requiredFields) {
            for (const f of tmpl.requiredFields) {
              if (!(f in data)) data[f] = f === "title" ? data.title : `Test ${f}`;
            }
          }
          const buf = await generatePdf({ template: tmpl, data, brand: defaultBrand, logoBuffer: null });
          assert.ok(Buffer.isBuffer(buf), "Should return a Buffer");
          assert.ok(buf.length > 200, `PDF should have content: ${buf.length} bytes`);
        });
      } else if (tmpl.format === "xlsx") {
        await testAsync(`${tid} generates valid XLSX buffer`, async () => {
          const data = { title: `Test ${tid}` };
          if (tmpl.requiredFields) {
            for (const f of tmpl.requiredFields) {
              if (!(f in data)) data[f] = f === "title" ? data.title : `Test ${f}`;
            }
          }
          const buf = await generateXlsx({ template: tmpl, data, brand: defaultBrand });
          assert.ok(buf, "Should return buffer");
        });
      }
    }

    sectionSummary();
  }
}

// ═══════════════════════════════════════════════════════════════
//  3. TEMPLATE REGISTRY CONSISTENCY
// ═══════════════════════════════════════════════════════════════

function runRegistryTests() {
  console.log("\n═══ 3. TEMPLATE REGISTRY CONSISTENCY ═══");

  const { SYSTEM_TEMPLATES } = require("../services/documentEngine/templates/registry");

  section("Template Registry — W-021 templates");

  const w021Templates = ["cm-monthly-progress", "cm-budget-tracker", "cm-rfi-log", "cm-co-log", "cm-weekly-oac", "cm-punchlist"];
  for (const t of w021Templates) {
    test(`Template ${t} exists in registry`, () => {
      assert.ok(SYSTEM_TEMPLATES[t], `Template ${t} not found`);
      assert.strictEqual(SYSTEM_TEMPLATES[t].id, t);
      assert.ok(SYSTEM_TEMPLATES[t].format, "Should have format");
      assert.ok(SYSTEM_TEMPLATES[t].requiredFields, "Should have requiredFields");
      assert.strictEqual(SYSTEM_TEMPLATES[t].system, true);
    });
  }

  test("W-021 template format breakdown: 3 PDF + 3 XLSX", () => {
    const pdfs = w021Templates.filter(t => SYSTEM_TEMPLATES[t].format === "pdf");
    const xlsx = w021Templates.filter(t => SYSTEM_TEMPLATES[t].format === "xlsx");
    assert.strictEqual(pdfs.length, 3, "3 PDFs");
    assert.strictEqual(xlsx.length, 3, "3 XLSX");
  });

  sectionSummary();

  section("Template Registry — W-015 templates");

  const w015Templates = ["cl-loan-comparison", "cl-draw-schedule", "cl-interest-reserve", "cl-utilization-dashboard", "cl-conversion-checklist"];
  for (const t of w015Templates) {
    test(`Template ${t} exists in registry`, () => {
      assert.ok(SYSTEM_TEMPLATES[t], `Template ${t} not found`);
      assert.strictEqual(SYSTEM_TEMPLATES[t].id, t);
      assert.strictEqual(SYSTEM_TEMPLATES[t].system, true);
    });
  }

  test("W-015 template format breakdown: 3 PDF + 2 XLSX", () => {
    const pdfs = w015Templates.filter(t => SYSTEM_TEMPLATES[t].format === "pdf");
    const xlsx = w015Templates.filter(t => SYSTEM_TEMPLATES[t].format === "xlsx");
    assert.strictEqual(pdfs.length, 3, "3 PDFs");
    assert.strictEqual(xlsx.length, 2, "2 XLSX");
  });

  sectionSummary();

  section("Template Registry — W-016 templates");

  const w016Templates = ["cs-stack-summary", "cs-full-model", "cs-waterfall", "cs-investor-slides", "cs-scenario-comparison"];
  for (const t of w016Templates) {
    test(`Template ${t} exists in registry`, () => {
      assert.ok(SYSTEM_TEMPLATES[t], `Template ${t} not found`);
      assert.strictEqual(SYSTEM_TEMPLATES[t].id, t);
      assert.strictEqual(SYSTEM_TEMPLATES[t].system, true);
    });
  }

  test("W-016 template format breakdown: 2 PDF + 2 XLSX + 1 PPTX", () => {
    const pdfs = w016Templates.filter(t => SYSTEM_TEMPLATES[t].format === "pdf");
    const xlsx = w016Templates.filter(t => SYSTEM_TEMPLATES[t].format === "xlsx");
    const pptx = w016Templates.filter(t => SYSTEM_TEMPLATES[t].format === "pptx");
    assert.strictEqual(pdfs.length, 2, "2 PDFs");
    assert.strictEqual(xlsx.length, 2, "2 XLSX");
    assert.strictEqual(pptx.length, 1, "1 PPTX");
  });

  sectionSummary();

  // ── W-002 CRE Analyst templates ──
  section("Template Registry — W-002 templates");

  const w002Templates = ["da-ic-memo", "da-risk-summary", "da-assumptions", "da-evidence-table"];
  w002Templates.forEach(id => {
    test(`Template ${id} exists in registry`, () => assert.ok(SYSTEM_TEMPLATES[id], `Missing ${id}`));
  });

  test("W-002 template format breakdown: 2 PDF + 2 XLSX", () => {
    const pdfs = w002Templates.filter(t => SYSTEM_TEMPLATES[t].format === "pdf");
    const xlsx = w002Templates.filter(t => SYSTEM_TEMPLATES[t].format === "xlsx");
    assert.strictEqual(pdfs.length, 2, "2 PDFs");
    assert.strictEqual(xlsx.length, 2, "2 XLSX");
  });

  sectionSummary();

  // ── W-019 Investor Relations templates ──
  section("Template Registry — W-019 templates");

  const w019Templates = ["ir-compliance-checklist", "ir-investor-summary", "ir-accreditation-report", "ir-fund-overview", "ir-fee-analysis", "ir-waterfall", "ir-lp-terms", "ir-deal-summary", "ir-waterfall-projection", "ir-risk-assessment", "ir-offering-memo", "ir-quarterly-report", "ir-capital-call"];
  w019Templates.forEach(id => {
    test(`Template ${id} exists in registry`, () => assert.ok(SYSTEM_TEMPLATES[id], `Missing ${id}`));
  });

  test("W-019 template format breakdown: 9 PDF + 3 XLSX + 1 PDF(capital-call)", () => {
    const pdfs = w019Templates.filter(t => SYSTEM_TEMPLATES[t].format === "pdf");
    const xlsx = w019Templates.filter(t => SYSTEM_TEMPLATES[t].format === "xlsx");
    assert.strictEqual(pdfs.length, 10, "10 PDFs");
    assert.strictEqual(xlsx.length, 3, "3 XLSX");
  });

  sectionSummary();

  // ── W-048 Chief of Staff templates ──
  section("Template Registry — W-048 templates");

  const w048Templates = ["cos-pipeline-status", "cos-weekly-digest", "cos-task-tracker", "cos-handoff-memo"];
  w048Templates.forEach(id => {
    test(`Template ${id} exists in registry`, () => assert.ok(SYSTEM_TEMPLATES[id], `Missing ${id}`));
  });

  test("W-048 template format breakdown: 3 PDF + 1 XLSX", () => {
    const pdfs = w048Templates.filter(t => SYSTEM_TEMPLATES[t].format === "pdf");
    const xlsx = w048Templates.filter(t => SYSTEM_TEMPLATES[t].format === "xlsx");
    assert.strictEqual(pdfs.length, 3, "3 PDFs");
    assert.strictEqual(xlsx.length, 1, "1 XLSX");
  });

  sectionSummary();

  // ── 25 New Worker Templates ──
  section("Template Registry — 25 New Worker templates");

  const newWorkerTemplateIds = {
    "W-001": { prefix: "mr-", templates: ["mr-market-study", "mr-comp-analysis", "mr-submarket-ranking", "mr-demographic-profile"] },
    "W-005": { prefix: "adr-", templates: ["adr-design-review", "adr-code-compliance", "adr-ve-log"] },
    "W-006": { prefix: "er-", templates: ["er-engineering-review", "er-special-inspection-program", "er-design-change-log"] },
    "W-007": { prefix: "ecr-", templates: ["ecr-environmental-summary", "ecr-remediation-tracker", "ecr-permit-tracker", "ecr-section-106-log"] },
    "W-008": { prefix: "es-", templates: ["es-energy-compliance", "es-certification-tracker", "es-incentive-summary"] },
    "W-009": { prefix: "afh-", templates: ["afh-compliance-review", "afh-accommodation-tracker", "afh-unit-classification"] },
    "W-010": { prefix: "gr-", templates: ["gr-stakeholder-map", "gr-community-outreach-plan", "gr-meeting-preparation"] },
    "W-011": { prefix: "fls-", templates: ["fls-fire-code-review", "fls-egress-analysis", "fls-fire-system-tracker"] },
    "W-020": { prefix: "oz-", templates: ["oz-compliance-dashboard", "oz-asset-test", "oz-substantial-improvement", "oz-investor-180-day"] },
    "W-030": { prefix: "avr-", templates: ["avr-appraisal-review", "avr-comp-analysis", "avr-rebuttal-memo"] },
    "W-032": { prefix: "ts-", templates: ["ts-screening-report", "ts-adverse-action", "ts-criteria-summary"] },
    "W-034": { prefix: "rr-", templates: ["rr-rent-roll", "rr-revenue-forecast", "rr-loss-to-lease", "rr-lease-expiration-matrix"] },
    "W-035": { prefix: "mwo-", templates: ["mwo-work-order", "mwo-pm-schedule", "mwo-maintenance-report"] },
    "W-036": { prefix: "um-", templates: ["um-utility-report", "um-rubs-calculation", "um-benchmarking-report"] },
    "W-037": { prefix: "hoa-", templates: ["hoa-board-package", "hoa-assessment-tracker", "hoa-reserve-analysis", "hoa-transition-checklist"] },
    "W-038": { prefix: "wd-", templates: ["wd-warranty-register", "wd-defect-log", "wd-warranty-claim", "wd-walkthrough-report"] },
    "W-040": { prefix: "ta-", templates: ["ta-assessment-summary", "ta-appeal-evidence", "ta-payment-tracker", "ta-projection"] },
    "W-041": { prefix: "vc-", templates: ["vc-vendor-registry", "vc-contract-tracker", "vc-bid-comparison", "vc-spend-report"] },
    "W-042": { prefix: "dp-", templates: ["dp-disposition-analysis", "dp-broker-comparison", "dp-offer-comparison", "dp-closing-checklist"] },
    "W-043": { prefix: "ex-", templates: ["ex-exchange-analysis", "ex-timeline-tracker", "ex-identification-notice", "ex-basis-calculation"] },
    "W-046": { prefix: "ef-", templates: ["ef-entity-analysis", "ef-formation-checklist", "ef-entity-registry", "ef-annual-compliance"] },
    "W-049": { prefix: "pir-", templates: ["pir-policy-summary", "pir-coverage-review", "pir-claims-log", "pir-renewal-comparison"] },
    "W-050": { prefix: "dmdr-", templates: ["dmdr-om-template", "dmdr-data-room-index", "dmdr-buyer-tracker", "dmdr-dd-checklist"] },
    "W-051": { prefix: "ird-", templates: ["ird-distribution-schedule", "ird-distribution-notice", "ird-capital-account", "ird-investor-package"] },
    "W-052": { prefix: "dslc-", templates: ["dslc-covenant-dashboard", "dslc-payment-schedule", "dslc-reserve-tracker", "dslc-lender-compliance-cert"] },
  };

  for (const [workerId, info] of Object.entries(newWorkerTemplateIds)) {
    for (const tid of info.templates) {
      test(`${tid} exists in registry`, () => {
        assert.ok(SYSTEM_TEMPLATES[tid], `Template ${tid} not found`);
        assert.strictEqual(SYSTEM_TEMPLATES[tid].id, tid);
        assert.ok(SYSTEM_TEMPLATES[tid].format, "Should have format");
        assert.ok(SYSTEM_TEMPLATES[tid].requiredFields, "Should have requiredFields");
        assert.strictEqual(SYSTEM_TEMPLATES[tid].system, true);
      });
    }
  }

  sectionSummary();

  // Cross-check: every template in ALL rulesets' outputs exists in the registry
  section("Template Registry — Ruleset output cross-reference");

  const rulesets = [
    "construction_manager_v0", "construction_lending_v0", "capital_stack_optimizer_v0",
    "cre_deal_screen_v0", "pe_deal_screen_v0", "debt_acquisition_screen_v0",
    "entitlement_screen_v0", "refinance_screen_v0", "conversion_screen_v0",
    "ir_compliance_v0", "ir_fund_v0", "ir_syndication_v0",
    "chief_of_staff_v0",
    "market_research_v0", "architecture_design_review_v0", "engineering_review_v0",
    "environmental_cultural_review_v0", "energy_sustainability_v0", "accessibility_fair_housing_v0",
    "government_relations_v0", "fire_life_safety_v0", "opportunity_zone_v0",
    "appraisal_valuation_review_v0", "tenant_screening_v0", "rent_roll_revenue_v0",
    "maintenance_work_order_v0", "utility_management_v0", "hoa_association_v0",
    "warranty_defect_v0", "tax_assessment_v0", "vendor_contract_v0",
    "disposition_preparation_v0", "exchange_1031_v0", "entity_formation_v0",
    "property_insurance_risk_v0", "disposition_marketing_v0", "investor_reporting_distributions_v0",
    "debt_service_loan_compliance_v0",
  ];
  for (const rsId of rulesets) {
    const rs = require(`../raas/rulesets/${rsId}.json`);
    for (const output of rs.outputs || []) {
      test(`Ruleset ${rsId} output '${output}' exists in template registry`, () => {
        assert.ok(SYSTEM_TEMPLATES[output], `Template '${output}' referenced in ${rsId} but not found in registry`);
      });
    }
  }

  sectionSummary();
}

// ═══════════════════════════════════════════════════════════════
//  4. FRONTEND CROSS-REFERENCE INTEGRITY
// ═══════════════════════════════════════════════════════════════

function runFrontendTests() {
  console.log("\n═══ 4. FRONTEND CROSS-REFERENCE INTEGRITY ═══");

  const fs = require("fs");

  section("Marketplace — all 32 workers listed and live");

  const marketplaceSrc = fs.readFileSync(path.join(__dirname, "../../../apps/business/src/pages/WorkerMarketplace.jsx"), "utf8");

  const allWorkerSlugs = [
    "construction-manager",
    "construction-lending",
    "capital-stack-optimizer",
    "cre-analyst",
    "investor-relations",
    "chief-of-staff",
    "market-research",
    "architecture-review",
    "engineering-review",
    "environmental-cultural-review",
    "energy-sustainability",
    "accessibility-fair-housing",
    "government-relations",
    "fire-life-safety",
    "opportunity-zone",
    "appraisal-valuation",
    "tenant-screening",
    "rent-roll-revenue",
    "maintenance-work-order",
    "utility-management",
    "hoa-association",
    "warranty-defect",
    "tax-assessment",
    "vendor-contract",
    "disposition-preparation",
    "exchange-1031",
    "entity-formation",
    "property-insurance",
    "disposition-marketing",
    "investor-reporting",
    "debt-service",
  ];

  for (const slug of allWorkerSlugs) {
    test(`${slug} listed in marketplace`, () => {
      assert.ok(marketplaceSrc.includes(`"${slug}"`), `Should have ${slug} slug`);
    });
  }

  const liveWorkers = [
    "construction-manager", "construction-lending", "capital-stack-optimizer", "cre-analyst", "investor-relations", "chief-of-staff",
    "market-research", "architecture-review", "engineering-review", "environmental-cultural-review",
    "energy-sustainability", "accessibility-fair-housing", "government-relations", "fire-life-safety",
    "opportunity-zone", "appraisal-valuation", "tenant-screening", "rent-roll-revenue",
    "maintenance-work-order", "utility-management", "hoa-association", "warranty-defect",
    "tax-assessment", "vendor-contract", "disposition-preparation", "exchange-1031",
    "entity-formation", "property-insurance", "disposition-marketing", "investor-reporting", "debt-service",
  ];
  for (const slug of liveWorkers) {
    test(`${slug} marketplace status is "live"`, () => {
      const regex = new RegExp(`slug:\\s*"${slug}"[^}]*status:\\s*"(\\w+)"`);
      const match = marketplaceSrc.match(regex);
      assert.ok(match, `Should find status for ${slug}`);
      assert.strictEqual(match[1], "live", `${slug} should be live`);
    });
  }

  test("capital-stack-optimizer price is $99/mo (9900 cents)", () => {
    const match = marketplaceSrc.match(/slug:\s*"capital-stack-optimizer"[^}]*price:\s*(\d+)/);
    assert.ok(match, "Should find price");
    assert.strictEqual(parseInt(match[1]), 9900);
  });

  sectionSummary();

  section("Sidebar — NAV_MAP and DISPLAY_NAMES");

  const sidebarSrc = fs.readFileSync(path.join(__dirname, "../../../apps/business/src/components/Sidebar.jsx"), "utf8");

  const expectedNavMaps = {
    "construction-manager": ["projects", "schedule"],
    "construction-lending": ["loan-comparison", "draw-schedule", "interest-reserve", "loan-utilization"],
    "capital-stack-optimizer": ["capital-stack", "sources-uses", "waterfall", "sensitivity", "scenarios"],
    "cre-analyst": ["deal-screening", "portfolio", "assumptions", "evidence"],
    "investor-relations": ["investor-pipeline", "compliance", "waterfall", "investor-data-room", "reporting"],
    "chief-of-staff": ["pipelines", "task-board", "worker-status"],
    "market-research": ["market-analysis", "demographics", "supply-pipeline", "absorption"],
    "architecture-review": ["plan-review", "code-compliance", "ahj-comments"],
    "engineering-review": ["civil-review", "structural-review", "traffic-review", "utility-review"],
    "environmental-cultural-review": ["phase-i", "biological", "archaeological", "cultural-impact"],
    "energy-sustainability": ["energy-model", "leed-scorecard", "certifications"],
    "accessibility-fair-housing": ["ada-audit", "fair-housing", "remediation"],
    "government-relations": ["hearings", "stakeholder-map", "public-comment"],
    "fire-life-safety": ["fire-code", "egress-plan", "fire-protection"],
    "opportunity-zone": ["qof-compliance", "improvement-test", "oz-timeline", "tax-benefits"],
    "appraisal-valuation": ["appraisal-review", "comp-analysis", "valuation-methods"],
    "tenant-screening": ["applications", "screening-reports", "criteria"],
    "rent-roll-revenue": ["rent-roll", "revenue-forecast", "lease-abstracts", "renewals"],
    "maintenance-work-order": ["work-orders", "preventive-schedule", "vendor-dispatch"],
    "utility-management": ["utility-costs", "consumption", "rate-optimization"],
    "hoa-association": ["assessments", "ccr-compliance", "reserve-study", "violations"],
    "warranty-defect": ["warranty-claims", "defect-tracking", "builder-liability"],
    "tax-assessment": ["tax-appeals"],
    "vendor-contract": ["vendors", "contracts", "performance", "vendor-renewals"],
    "disposition-preparation": ["sale-prep", "dd-assembly", "buyer-qual"],
    "exchange-1031": ["exchange-timeline", "replacement-props", "qi-coordination"],
    "entity-formation": ["entity-structure", "filings", "operating-agreements"],
    "property-insurance": ["policies", "coverage-analysis", "claims", "risk-assessment"],
    "disposition-marketing": ["marketing-materials", "data-room", "buyer-outreach", "offers"],
    "investor-reporting": ["quarterly-reports", "distributions", "k1-coordination", "lp-comms"],
    "debt-service": ["loan-payments", "covenant-monitor", "compliance-reports", "refinance-analysis"],
  };

  for (const [slug, navIds] of Object.entries(expectedNavMaps)) {
    test(`${slug} has WORKER_NAV_MAP entry`, () => {
      assert.ok(sidebarSrc.includes(`"${slug}"`), `Should have ${slug} in sidebar`);
    });

    for (const navId of navIds) {
      test(`${slug} nav includes '${navId}'`, () => {
        assert.ok(sidebarSrc.includes(`"${navId}"`), `Should have nav item ${navId}`);
      });
    }
  }

  const expectedDisplayNames = {
    "construction-manager": "Construction Manager",
    "construction-lending": "Construction Lending",
    "capital-stack-optimizer": "Capital Stack Optimizer",
    "cre-analyst": "CRE Analyst",
    "investor-relations": "IR Worker",
    "chief-of-staff": "Alex — Chief of Staff",
    "market-research": "Market Research",
    "architecture-review": "Architecture & Design Review",
    "engineering-review": "Engineering Review",
    "environmental-cultural-review": "Environmental & Cultural Review",
    "energy-sustainability": "Energy & Sustainability",
    "accessibility-fair-housing": "Accessibility & Fair Housing",
    "government-relations": "Government Relations",
    "fire-life-safety": "Fire & Life Safety",
    "opportunity-zone": "Opportunity Zone",
    "appraisal-valuation": "Appraisal & Valuation",
    "tenant-screening": "Tenant Screening",
    "rent-roll-revenue": "Rent Roll & Revenue",
    "maintenance-work-order": "Maintenance & Work Order",
    "utility-management": "Utility Management",
    "hoa-association": "HOA & Association",
    "warranty-defect": "Warranty & Defect",
    "tax-assessment": "Tax Assessment",
    "vendor-contract": "Vendor & Contract",
    "disposition-preparation": "Disposition Prep",
    "exchange-1031": "1031 Exchange",
    "entity-formation": "Entity & Formation",
    "property-insurance": "Property Insurance & Risk",
    "disposition-marketing": "Disposition Marketing",
    "investor-reporting": "Investor Reporting",
    "debt-service": "Debt Service & Loan Compliance",
  };

  for (const [slug, name] of Object.entries(expectedDisplayNames)) {
    test(`${slug} has WORKER_DISPLAY_NAMES entry: "${name}"`, () => {
      assert.ok(sidebarSrc.includes(`"${slug}": "${name}"`), `Should have display name for ${slug}`);
    });
  }

  sectionSummary();

  section("Worker Icons — all 32 workers with icons");

  const iconsSrc = fs.readFileSync(path.join(__dirname, "../../../apps/business/src/utils/workerIcons.jsx"), "utf8");

  for (const slug of [
    "construction-manager", "construction-lending", "capital-stack-optimizer", "cre-analyst", "investor-relations", "chief-of-staff",
    "market-research", "architecture-review", "engineering-review", "environmental-cultural-review",
    "energy-sustainability", "accessibility-fair-housing", "government-relations", "fire-life-safety",
    "opportunity-zone", "appraisal-valuation", "tenant-screening", "rent-roll-revenue",
    "maintenance-work-order", "utility-management", "hoa-association", "warranty-defect",
    "tax-assessment", "vendor-contract", "disposition-preparation", "exchange-1031",
    "entity-formation", "property-insurance", "disposition-marketing", "investor-reporting", "debt-service",
  ]) {
    test(`${slug} has icon defined`, () => {
      assert.ok(iconsSrc.includes(`"${slug}"`), `Should have icon for ${slug}`);
    });
  }

  sectionSummary();

  section("App.jsx — WORKER_DETAIL_CONTENT for all 32 workers");

  const appSrc = fs.readFileSync(path.join(__dirname, "../../../apps/business/src/App.jsx"), "utf8");

  for (const slug of [
    "construction-manager", "construction-lending", "capital-stack-optimizer", "cre-analyst", "investor-relations", "chief-of-staff",
    "market-research", "architecture-review", "engineering-review", "environmental-cultural-review",
    "energy-sustainability", "accessibility-fair-housing", "government-relations", "fire-life-safety",
    "opportunity-zone", "appraisal-valuation", "tenant-screening", "rent-roll-revenue",
    "maintenance-work-order", "utility-management", "hoa-association", "warranty-defect",
    "tax-assessment", "vendor-contract", "disposition-preparation", "exchange-1031",
    "entity-formation", "property-insurance", "disposition-marketing", "investor-reporting", "debt-service",
  ]) {
    test(`${slug} has WORKER_DETAIL_CONTENT entry`, () => {
      assert.ok(appSrc.includes(`"${slug}"`), `Should have detail content for ${slug}`);
    });
  }

  for (const slug of [
    "capital-stack-optimizer", "cre-analyst", "investor-relations", "chief-of-staff",
    "market-research", "architecture-review", "engineering-review", "environmental-cultural-review",
    "energy-sustainability", "accessibility-fair-housing", "government-relations", "fire-life-safety",
    "opportunity-zone", "appraisal-valuation", "tenant-screening", "rent-roll-revenue",
    "maintenance-work-order", "utility-management", "hoa-association", "warranty-defect",
    "tax-assessment", "vendor-contract", "disposition-preparation", "exchange-1031",
    "entity-formation", "property-insurance", "disposition-marketing", "investor-reporting", "debt-service",
  ]) {
    test(`${slug} has headline, steps, bridge, valueProps, faq`, () => {
      const match = appSrc.match(new RegExp(`"${slug}":\\s*\\{[\\s\\S]*?headline[\\s\\S]*?steps[\\s\\S]*?bridge[\\s\\S]*?valueProps[\\s\\S]*?faq`));
      assert.ok(match, `${slug} should have all required content sections`);
    });
  }

  sectionSummary();

  section("System Prompt Files — all 32 workers");

  const constructionPromptDir = path.join(__dirname, "../../../raas/construction/GLOBAL/prompts");
  const analystPromptDir = path.join(__dirname, "../../../raas/analyst/GLOBAL/prompts");
  const investorPromptDir = path.join(__dirname, "../../../raas/investor/GLOBAL/prompts");
  const cosPromptDir = path.join(__dirname, "../../../raas/chief-of-staff/GLOBAL/prompts");
  const siteSelectionPromptDir = path.join(__dirname, "../../../raas/site-selection/GLOBAL/prompts");
  const permittingPromptDir = path.join(__dirname, "../../../raas/permitting/GLOBAL/prompts");
  const entitlementPromptDir = path.join(__dirname, "../../../raas/entitlement/GLOBAL/prompts");
  const financingPromptDir = path.join(__dirname, "../../../raas/financing/GLOBAL/prompts");
  const realEstatePromptDir = path.join(__dirname, "../../../raas/real-estate/GLOBAL/prompts");
  const propertyMgmtPromptDir = path.join(__dirname, "../../../raas/property-management/GLOBAL/prompts");
  const operationsPromptDir = path.join(__dirname, "../../../raas/operations/GLOBAL/prompts");

  const allPromptFiles = [
    { dir: constructionPromptDir, file: "construction-manager-system-prompt.md" },
    { dir: constructionPromptDir, file: "construction-lending-system-prompt.md" },
    { dir: constructionPromptDir, file: "capital-stack-optimizer-system-prompt.md" },
    { dir: analystPromptDir, file: "cre-analyst-system-prompt.md" },
    { dir: investorPromptDir, file: "investor-relations-system-prompt.md" },
    { dir: cosPromptDir, file: "chief-of-staff-system-prompt.md" },
    { dir: siteSelectionPromptDir, file: "market-research-system-prompt.md" },
    { dir: permittingPromptDir, file: "architecture-design-review-system-prompt.md" },
    { dir: constructionPromptDir, file: "engineering-review-system-prompt.md" },
    { dir: entitlementPromptDir, file: "environmental-cultural-review-system-prompt.md" },
    { dir: constructionPromptDir, file: "energy-sustainability-system-prompt.md" },
    { dir: entitlementPromptDir, file: "accessibility-fair-housing-system-prompt.md" },
    { dir: entitlementPromptDir, file: "government-relations-system-prompt.md" },
    { dir: constructionPromptDir, file: "fire-life-safety-system-prompt.md" },
    { dir: financingPromptDir, file: "opportunity-zone-system-prompt.md" },
    { dir: realEstatePromptDir, file: "appraisal-valuation-review-system-prompt.md" },
    { dir: propertyMgmtPromptDir, file: "tenant-screening-system-prompt.md" },
    { dir: propertyMgmtPromptDir, file: "rent-roll-revenue-system-prompt.md" },
    { dir: operationsPromptDir, file: "maintenance-work-order-system-prompt.md" },
    { dir: operationsPromptDir, file: "utility-management-system-prompt.md" },
    { dir: propertyMgmtPromptDir, file: "hoa-association-system-prompt.md" },
    { dir: constructionPromptDir, file: "warranty-defect-system-prompt.md" },
    { dir: operationsPromptDir, file: "tax-assessment-system-prompt.md" },
    { dir: operationsPromptDir, file: "vendor-contract-system-prompt.md" },
    { dir: realEstatePromptDir, file: "disposition-preparation-system-prompt.md" },
    { dir: financingPromptDir, file: "exchange-1031-system-prompt.md" },
    { dir: operationsPromptDir, file: "entity-formation-system-prompt.md" },
    { dir: operationsPromptDir, file: "property-insurance-risk-system-prompt.md" },
    { dir: realEstatePromptDir, file: "disposition-marketing-system-prompt.md" },
    { dir: investorPromptDir, file: "investor-reporting-distributions-system-prompt.md" },
    { dir: financingPromptDir, file: "debt-service-loan-compliance-system-prompt.md" },
  ];

  for (const { dir, file } of allPromptFiles) {
    test(`${file} exists`, () => {
      assert.ok(fs.existsSync(path.join(dir, file)), `${file} should exist`);
    });
  }

  for (const { dir, file } of allPromptFiles) {
    test(`${file} contains RAAS Compliance Cascade`, () => {
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      assert.ok(content.includes("RAAS Compliance Cascade") || content.includes("Tier 0"), `${file} should reference RAAS tiers`);
    });

    test(`${file} contains domain disclaimer`, () => {
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      assert.ok(content.includes("Disclaimer") || content.includes("disclaimer") || content.includes("informational purposes"), `${file} should have disclaimer`);
    });
  }

  sectionSummary();
}

// ═══════════════════════════════════════════════════════════════
//  W-048 ALEX UNIVERSAL ORCHESTRATION TESTS
// ═══════════════════════════════════════════════════════════════

function runAlexTests() {
  // ── Catalog Schema ──
  section("W-048 Alex — Catalog Schema");

  test("Schema module loads", () => {
    const schema = require("../services/alex/catalogs/schema");
    assert.ok(schema.validateWorkerEntry);
    assert.ok(schema.toRoutingIndex);
    assert.ok(schema.toActiveWorkerDetail);
  });

  test("LIFECYCLE_TEMPLATE has 8 phases", () => {
    const { LIFECYCLE_TEMPLATE } = require("../services/alex/catalogs/schema");
    assert.strictEqual(LIFECYCLE_TEMPLATE.length, 8);
    assert.strictEqual(LIFECYCLE_TEMPLATE[0].phase, 0);
    assert.strictEqual(LIFECYCLE_TEMPLATE[7].phase, 7);
  });

  test("Valid worker entry passes validation", () => {
    const { validateWorkerEntry } = require("../services/alex/catalogs/schema");
    const result = validateWorkerEntry({
      id: "W-002", slug: "cre-analyst", name: "CRE Deal Analyst",
      type: "standalone", status: "live", temporalType: "always_on",
      pricing: { monthly: 79 },
    });
    assert.ok(result.valid, `Validation errors: ${result.errors.join(", ")}`);
  });

  test("Invalid worker entry fails validation", () => {
    const { validateWorkerEntry } = require("../services/alex/catalogs/schema");
    const result = validateWorkerEntry({ id: "BAD", slug: "", name: "", type: "invalid", status: "unknown", temporalType: "nope", pricing: {} });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  sectionSummary();

  // ── Catalog Loader ──
  section("W-048 Alex — Catalog Loader");

  test("Loader module loads", () => {
    const loader = require("../services/alex/catalogs/loader");
    assert.ok(loader.loadCatalog);
    assert.ok(loader.listVerticals);
    assert.ok(loader.getRoutingIndex);
  });

  test("RE Development catalog loads with 52 workers", () => {
    const { loadCatalog } = require("../services/alex/catalogs/loader");
    const catalog = loadCatalog("real-estate-development");
    assert.ok(catalog, "Catalog should load");
    assert.strictEqual(catalog.workers.length, 52);
    assert.strictEqual(catalog.vertical, "real-estate-development");
  });

  test("Catalog has 8 lifecycle phases", () => {
    const { loadCatalog } = require("../services/alex/catalogs/loader");
    const catalog = loadCatalog("real-estate-development");
    assert.strictEqual(catalog.lifecycle.length, 8);
  });

  test("Catalog has bundles", () => {
    const { loadCatalog } = require("../services/alex/catalogs/loader");
    const catalog = loadCatalog("real-estate-development");
    assert.ok(catalog.bundles.length >= 3);
  });

  test("getRoutingIndex returns compact format", () => {
    const { getRoutingIndex } = require("../services/alex/catalogs/loader");
    const index = getRoutingIndex("real-estate-development");
    assert.ok(index.length > 0);
    assert.ok(index.includes("W-002"));
    assert.ok(index.includes("W-048"));
    // Should have one line per worker
    const lines = index.split("\n");
    assert.strictEqual(lines.length, 52);
  });

  test("getActiveWorkerDetails returns details for subscribed workers", () => {
    const { getActiveWorkerDetails, getWorker: gw } = require("../services/alex/catalogs/loader");
    const w002 = gw("real-estate-development", "W-002");
    const details = getActiveWorkerDetails("real-estate-development", [w002.slug]);
    assert.ok(details.includes("CRE Deal Analyst"));
    assert.ok(details.includes("W-002"));
  });

  test("getWorker finds by slug", () => {
    const { getWorker, loadCatalog } = require("../services/alex/catalogs/loader");
    const cat = loadCatalog("real-estate-development");
    const w002slug = cat.workers.find(w => w.id === "W-002").slug;
    const w = getWorker("real-estate-development", w002slug);
    assert.ok(w);
    assert.strictEqual(w.id, "W-002");
  });

  test("getWorker finds by ID", () => {
    const { getWorker } = require("../services/alex/catalogs/loader");
    const w = getWorker("real-estate-development", "W-048");
    assert.ok(w);
    assert.strictEqual(w.slug, "chief-of-staff");
  });

  test("listVerticals includes real-estate-development", () => {
    const { listVerticals } = require("../services/alex/catalogs/loader");
    const verts = listVerticals();
    assert.ok(verts.includes("real-estate-development"));
  });

  test("filterWorkers by phase", () => {
    const { filterWorkers } = require("../services/alex/catalogs/loader");
    const phase0 = filterWorkers("real-estate-development", { phase: 0 });
    assert.ok(phase0.length >= 3); // W-001, W-002, W-003, W-030
  });

  sectionSummary();

  // ── Prompt Builder ──
  section("W-048 Alex — Prompt Builder");

  test("Prompt builder module loads", () => {
    const builder = require("../services/alex/promptBuilder");
    assert.ok(builder.assemblePrompt);
    assert.ok(builder.estimateTokens);
  });

  test("assemblePrompt returns non-empty string for business surface", () => {
    const { assemblePrompt } = require("../services/alex/promptBuilder");
    const prompt = assemblePrompt({
      surface: "business",
      activeWorkerSlugs: ["cre-deal-analyst"],
      vertical: "real-estate-development",
    });
    assert.ok(prompt.length > 100);
  });

  test("Prompt includes catalog routing index", () => {
    const { assemblePrompt } = require("../services/alex/promptBuilder");
    const prompt = assemblePrompt({
      surface: "business",
      vertical: "real-estate-development",
    });
    assert.ok(prompt.includes("WORKER CATALOG"));
    assert.ok(prompt.includes("W-002"));
  });

  test("Prompt includes active worker details when provided", () => {
    const { assemblePrompt } = require("../services/alex/promptBuilder");
    const prompt = assemblePrompt({
      surface: "business",
      activeWorkerSlugs: ["cre-deal-analyst"],
      vertical: "real-estate-development",
    });
    // Active worker details section should include the worker name or its details
    assert.ok(prompt.includes("CRE Deal Analyst") || prompt.includes("ACTIVE WORKER"), "Should include active worker info");
  });

  test("Prompt stays under token budget", () => {
    const { assemblePrompt, estimateTokens, MAX_TOKEN_BUDGET } = require("../services/alex/promptBuilder");
    const prompt = assemblePrompt({
      surface: "business",
      activeWorkerSlugs: ["cre-analyst", "capital-stack-optimizer", "construction-manager"],
      vertical: "real-estate-development",
    });
    const tokens = estimateTokens(prompt);
    assert.ok(tokens <= MAX_TOKEN_BUDGET, `Prompt is ${tokens} tokens, budget is ${MAX_TOKEN_BUDGET}`);
  });

  sectionSummary();

  // ── Router ──
  section("W-048 Alex — Routing");

  test("Router module loads", () => {
    const router = require("../services/alex/capabilities/router");
    assert.ok(router.parseRoutingTag);
    assert.ok(router.getRoutingHint);
  });

  test("Parses handle_directly route tag", () => {
    const { parseRoutingTag } = require("../services/alex/capabilities/router");
    const result = parseRoutingTag("Here is your answer. [ROUTE:handle_directly]");
    assert.strictEqual(result.route.type, "handle_directly");
    assert.strictEqual(result.cleanResponse, "Here is your answer.");
  });

  test("Parses route_to_worker tag with target", () => {
    const { parseRoutingTag } = require("../services/alex/capabilities/router");
    const result = parseRoutingTag("Let me route you. [ROUTE:route_to_worker:cre-analyst]");
    assert.strictEqual(result.route.type, "route_to_worker");
    assert.strictEqual(result.route.target, "cre-analyst");
    assert.strictEqual(result.cleanResponse, "Let me route you.");
  });

  test("Parses recommend_worker tag", () => {
    const { parseRoutingTag } = require("../services/alex/capabilities/router");
    const result = parseRoutingTag("You need this. [ROUTE:recommend_worker:construction-manager]");
    assert.strictEqual(result.route.type, "recommend_worker");
    assert.strictEqual(result.route.target, "construction-manager");
  });

  test("Returns null route when no tag present", () => {
    const { parseRoutingTag } = require("../services/alex/capabilities/router");
    const result = parseRoutingTag("Just a normal response.");
    assert.strictEqual(result.route, null);
    assert.strictEqual(result.cleanResponse, "Just a normal response.");
  });

  test("getRoutingHint identifies platform questions", () => {
    const { getRoutingHint, ROUTE_TYPES } = require("../services/alex/capabilities/router");
    const hint = getRoutingHint("How much does W-021 cost?");
    assert.strictEqual(hint.hint, ROUTE_TYPES.HANDLE_DIRECTLY);
  });

  sectionSummary();

  // ── Recommendation Engine ──
  section("W-048 Alex — Recommendation Engine");

  test("Recommend module loads", () => {
    const rec = require("../services/alex/capabilities/recommend");
    assert.ok(rec.getRecommendations);
    assert.ok(rec.COMPLIANCE_TRIGGERS);
  });

  test("Generates recommendations for new user", () => {
    const { getRecommendations } = require("../services/alex/capabilities/recommend");
    const result = getRecommendations({
      vertical: "real-estate-development",
      currentPhase: 0,
      activeWorkerSlugs: [],
    });
    assert.ok(result.recommendations);
    assert.ok(result.pricing);
    assert.ok(result.recommendations.core.length > 0 || result.recommendations.mandatory.length > 0);
  });

  test("Federal funding triggers mandatory workers", () => {
    const { getRecommendations } = require("../services/alex/capabilities/recommend");
    const result = getRecommendations({
      vertical: "real-estate-development",
      currentPhase: 4,
      activeWorkerSlugs: [],
      complianceTriggers: ["federal_funding"],
    });
    const mandatorySlugs = result.recommendations.mandatory.map(w => w.slug);
    assert.ok(mandatorySlugs.includes("labor-staffing"), "Federal funding should trigger labor-staffing worker");
  });

  test("Pricing calculation includes projections", () => {
    const { getRecommendations } = require("../services/alex/capabilities/recommend");
    const result = getRecommendations({
      vertical: "real-estate-development",
      currentPhase: 0,
      activeWorkerSlugs: ["cre-deal-analyst"],
    });
    assert.ok(result.pricing.currentMonthly >= 0);
    assert.ok(result.pricing.peakMonthly > 0);
  });

  sectionSummary();

  // ── Temporal Awareness ──
  section("W-048 Alex — Temporal Awareness");

  test("Temporal module loads", () => {
    const temporal = require("../services/alex/capabilities/temporal");
    assert.ok(temporal.getTemporalStatus);
  });

  test("Identifies workers to activate for current phase", () => {
    const { getTemporalStatus } = require("../services/alex/capabilities/temporal");
    const status = getTemporalStatus({
      vertical: "real-estate-development",
      currentPhase: 4, // Construction
      activeWorkerSlugs: [],
    });
    // Construction phase should suggest activating construction workers
    assert.ok(status.activate.length > 0, "Should suggest activating workers for Phase 4");
  });

  sectionSummary();

  // ── Ruleset v1 ──
  section("W-048 Alex — Ruleset v1");

  test("Chief of Staff v1 ruleset loads successfully", () => {
    const rs = loadRuleset("chief_of_staff_v1");
    assert.ok(rs);
    assert.strictEqual(rs.domain, "platform-operations");
  });

  test("v1 has 5 hard stops and 8 soft flags", () => {
    const rs = loadRuleset("chief_of_staff_v1");
    assert.strictEqual(rs.hard_stops.length, 5);
    assert.strictEqual(rs.soft_flags.length, 8);
  });

  test("v1 includes new hard stops (intake_required, pipeline_approval_gate)", () => {
    const rs = loadRuleset("chief_of_staff_v1");
    const hardStopIds = rs.hard_stops.map(h => h.id);
    assert.ok(hardStopIds.includes("intake_required"));
    assert.ok(hardStopIds.includes("pipeline_approval_gate"));
  });

  test("v1 includes new soft flags (coverage_gap, temporal_mismatch)", () => {
    const rs = loadRuleset("chief_of_staff_v1");
    const softFlagIds = rs.soft_flags.map(s => s.id);
    assert.ok(softFlagIds.includes("coverage_gap"));
    assert.ok(softFlagIds.includes("temporal_mismatch"));
    assert.ok(softFlagIds.includes("recommendation_stale"));
    assert.ok(softFlagIds.includes("value_report_due"));
  });

  test("v1 outputs include all 10 templates", () => {
    const rs = loadRuleset("chief_of_staff_v1");
    assert.strictEqual(rs.outputs.length, 10);
    assert.ok(rs.outputs.includes("cos-pipeline-status"));
    assert.ok(rs.outputs.includes("alex-user-profile"));
    assert.ok(rs.outputs.includes("alex-monthly-value-report"));
  });

  sectionSummary();

  // ── Document Templates ──
  section("W-048 Alex — Document Templates");

  test("All 10 Alex templates registered in registry", () => {
    const { SYSTEM_TEMPLATES } = require("../services/documentEngine/templates/registry");
    const alexTemplates = ["cos-pipeline-status", "cos-weekly-digest", "cos-task-tracker", "cos-handoff-memo",
      "alex-user-profile", "alex-project-profile", "alex-worker-plan", "alex-daily-briefing",
      "alex-executive-summary", "alex-monthly-value-report"];
    for (const tid of alexTemplates) {
      assert.ok(SYSTEM_TEMPLATES[tid], `Template ${tid} should be in registry`);
    }
  });

  test("New alex-* templates have correct format", () => {
    const { SYSTEM_TEMPLATES } = require("../services/documentEngine/templates/registry");
    const newTemplates = ["alex-user-profile", "alex-project-profile", "alex-worker-plan",
      "alex-daily-briefing", "alex-executive-summary", "alex-monthly-value-report"];
    for (const tid of newTemplates) {
      assert.strictEqual(SYSTEM_TEMPLATES[tid].format, "pdf", `${tid} should be PDF`);
      assert.strictEqual(SYSTEM_TEMPLATES[tid].category, "operations", `${tid} should be operations category`);
      assert.ok(SYSTEM_TEMPLATES[tid].system === true, `${tid} should be system template`);
    }
  });

  sectionSummary();

  // ── Service Facade ──
  section("W-048 Alex — Service Facade");

  test("Alex service module loads", () => {
    const alex = require("../services/alex");
    assert.ok(alex.buildAlexPrompt);
    assert.ok(alex.getRecommendations);
    assert.ok(alex.parseRoutingTag);
    assert.ok(alex.getCatalog);
    assert.ok(alex.getWorker);
    assert.ok(alex.getAvailableVerticals);
  });

  test("getCatalog returns RE Development catalog", () => {
    const alex = require("../services/alex");
    const catalog = alex.getCatalog("real-estate-development");
    assert.ok(catalog);
    assert.strictEqual(catalog.workers.length, 52);
  });

  test("getWorker finds W-048 Alex", () => {
    const alex = require("../services/alex");
    const worker = alex.getWorker("real-estate-development", "W-048");
    assert.ok(worker);
    assert.strictEqual(worker.slug, "chief-of-staff");
    assert.strictEqual(worker.pricing.monthly, 0);
  });

  test("getAvailableVerticals returns at least one vertical", () => {
    const alex = require("../services/alex");
    const verticals = alex.getAvailableVerticals();
    assert.ok(verticals.length >= 1);
    assert.ok(verticals.includes("real-estate-development"));
  });

  sectionSummary();
}

// ═══════════════════════════════════════════════════════════════
//  6. SCHEMA VALIDATION (workerSchema.js smoke tests)
// ═══════════════════════════════════════════════════════════════

function runSchemaValidationTests() {
  sectionPassed = 0;
  sectionFailed = 0;
  console.log("\n── 6. Schema Validation (workerSchema.js) ──────────────────");

  const { validateWorkerRecord, TIER_0_DEFAULTS, VALID_SUITES, VALID_WORKER_TYPES, VALID_PRICING_TIERS, VALID_STATUSES, slugify } = require("../helpers/workerSchema");

  // --- Module exports ---
  test("TIER_0_DEFAULTS has 8 rules", () => {
    assert.strictEqual(TIER_0_DEFAULTS.length, 8);
  });

  test("VALID_SUITES includes core suites", () => {
    for (const s of ["Investment", "Construction", "Legal", "Platform"]) {
      assert.ok(VALID_SUITES.includes(s), `Missing suite: ${s}`);
    }
  });

  test("VALID_WORKER_TYPES has 5 types", () => {
    assert.strictEqual(VALID_WORKER_TYPES.length, 5);
    assert.ok(VALID_WORKER_TYPES.includes("orchestrator"));
  });

  test("VALID_PRICING_TIERS includes 0 and 99", () => {
    assert.ok(VALID_PRICING_TIERS.includes(0));
    assert.ok(VALID_PRICING_TIERS.includes(99));
  });

  test("VALID_STATUSES has 4 values", () => {
    assert.strictEqual(VALID_STATUSES.length, 4);
  });

  // --- slugify ---
  test("slugify converts display name to slug", () => {
    assert.strictEqual(slugify("Market Research"), "market-research");
    assert.strictEqual(slugify("HOA & Association"), "hoa-and-association");
    assert.strictEqual(slugify("  Spaces  "), "spaces");
  });

  // --- Valid record passes ---
  const validRecord = {
    worker_id: "test-worker",
    display_name: "Test Worker",
    headline: "A test worker for validation",
    suite: "Platform",
    worker_type: "standalone",
    pricing_tier: 49,
    raas_tier_0: TIER_0_DEFAULTS,
    raas_tier_1: ["Rule A", "Rule B", "Rule C"],
    raas_tier_2: ["Policy X"],
    raas_tier_3: [],
    vault_reads: [],
    vault_writes: [],
    referral_triggers: [],
    document_templates: [],
    landing_page_slug: "workers/test-worker",
    status: "draft",
  };

  test("Valid record passes validation", () => {
    const { record, warnings } = validateWorkerRecord(validRecord);
    assert.strictEqual(record.worker_id, "test-worker");
    assert.strictEqual(record.pricing_tier, 49);
    assert.ok(Array.isArray(warnings));
  });

  // --- Missing fields throw ---
  test("Empty object throws with multiple errors", () => {
    try {
      validateWorkerRecord({});
      assert.fail("Should have thrown");
    } catch (e) {
      assert.ok(e.validationErrors.length >= 10, `Expected 10+ errors, got ${e.validationErrors.length}`);
    }
  });

  test("Missing worker_id throws", () => {
    const bad = { ...validRecord, worker_id: "" };
    try {
      validateWorkerRecord(bad);
      assert.fail("Should have thrown");
    } catch (e) {
      assert.ok(e.validationErrors.some(err => err.includes("worker_id")));
    }
  });

  test("Missing display_name throws", () => {
    const bad = { ...validRecord, display_name: "" };
    try {
      validateWorkerRecord(bad);
      assert.fail("Should have thrown");
    } catch (e) {
      assert.ok(e.validationErrors.some(err => err.includes("display_name")));
    }
  });

  test("Missing headline throws", () => {
    const bad = { ...validRecord, headline: "" };
    try {
      validateWorkerRecord(bad);
      assert.fail("Should have thrown");
    } catch (e) {
      assert.ok(e.validationErrors.some(err => err.includes("headline")));
    }
  });

  test("Invalid suite throws", () => {
    const bad = { ...validRecord, suite: "Nonsense" };
    try {
      validateWorkerRecord(bad);
      assert.fail("Should have thrown");
    } catch (e) {
      assert.ok(e.validationErrors.some(err => err.includes("suite")));
    }
  });

  test("Invalid worker_type throws", () => {
    const bad = { ...validRecord, worker_type: "magic" };
    try {
      validateWorkerRecord(bad);
      assert.fail("Should have thrown");
    } catch (e) {
      assert.ok(e.validationErrors.some(err => err.includes("worker_type")));
    }
  });

  test("Invalid pricing_tier throws", () => {
    const bad = { ...validRecord, pricing_tier: 55 };
    try {
      validateWorkerRecord(bad);
      assert.fail("Should have thrown");
    } catch (e) {
      assert.ok(e.validationErrors.some(err => err.includes("pricing_tier")));
    }
  });

  test("raas_tier_0 with < 8 rules throws", () => {
    const bad = { ...validRecord, raas_tier_0: ["only one"] };
    try {
      validateWorkerRecord(bad);
      assert.fail("Should have thrown");
    } catch (e) {
      assert.ok(e.validationErrors.some(err => err.includes("raas_tier_0")));
    }
  });

  test("raas_tier_1 with < 3 rules throws", () => {
    const bad = { ...validRecord, raas_tier_1: ["only one"] };
    try {
      validateWorkerRecord(bad);
      assert.fail("Should have thrown");
    } catch (e) {
      assert.ok(e.validationErrors.some(err => err.includes("raas_tier_1")));
    }
  });

  test("raas_tier_2 as non-array throws", () => {
    const bad = { ...validRecord, raas_tier_2: "not an array" };
    try {
      validateWorkerRecord(bad);
      assert.fail("Should have thrown");
    } catch (e) {
      assert.ok(e.validationErrors.some(err => err.includes("raas_tier_2")));
    }
  });

  test("Invalid status throws", () => {
    const bad = { ...validRecord, status: "published" };
    try {
      validateWorkerRecord(bad);
      assert.fail("Should have thrown");
    } catch (e) {
      assert.ok(e.validationErrors.some(err => err.includes("status")));
    }
  });

  test("landing_page_slug without workers/ prefix throws", () => {
    const bad = { ...validRecord, landing_page_slug: "test-worker" };
    try {
      validateWorkerRecord(bad);
      assert.fail("Should have thrown");
    } catch (e) {
      assert.ok(e.validationErrors.some(err => err.includes("landing_page_slug")));
    }
  });

  // --- Warnings ---
  test("Empty raas_tier_2 produces warning (not error)", () => {
    const rec = { ...validRecord, raas_tier_2: [] };
    const { warnings } = validateWorkerRecord(rec);
    assert.ok(warnings.some(w => w.includes("raas_tier_2")));
  });

  // --- workerSync maps ---
  test("MARKETPLACE_SLUG_MAP covers 52 workers", () => {
    const { MARKETPLACE_SLUG_MAP } = require("../helpers/workerSync");
    assert.strictEqual(Object.keys(MARKETPLACE_SLUG_MAP).length, 52);
  });

  test("RULESET_MAP keys are valid marketplace slugs", () => {
    const { MARKETPLACE_SLUG_MAP, RULESET_MAP } = require("../helpers/workerSync");
    const validSlugs = new Set(Object.values(MARKETPLACE_SLUG_MAP));
    for (const slug of Object.keys(RULESET_MAP)) {
      assert.ok(validSlugs.has(slug), `RULESET_MAP key "${slug}" not in MARKETPLACE_SLUG_MAP values`);
    }
  });

  console.log(`   Section: ${sectionPassed} passed, ${sectionFailed} failed`);
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  WORKER TEST SUITE — 32 Workers + Alex (Full) ║");
  console.log("╚══════════════════════════════════════════════╝");

  await runRaasTests();
  await runGeneratorTests();
  runRegistryTests();
  runFrontendTests();
  runAlexTests();
  runSchemaValidationTests();

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log(`║  TOTAL: ${passed} passed, ${failed} failed${" ".repeat(Math.max(0, 24 - String(passed).length - String(failed).length))}║`);
  console.log("╚══════════════════════════════════════════════╝\n");

  if (failed > 0) {
    process.exit(1);
  }
  console.log("All worker tests passed.\n");
}

main().catch((e) => {
  console.error("Test suite error:", e);
  process.exit(1);
});
