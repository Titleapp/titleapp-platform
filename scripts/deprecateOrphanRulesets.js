/**
 * CODEX 50.10 Phase 1 — deprecate orphan v1 ruleset files.
 *
 * Per the locked spec, Cluster A (18 ad_012-029 v1) + Cluster B (4
 * platform v1, excluding platform_legal_v1 which is being kept and
 * registered as the new "Legal Companion" worker) + Cluster E
 * aviation_compliance_v1 are renamed to .deprecated.json. Audit trail
 * preserved per Q1.
 *
 * RULESET_MAP doesn't reference any of these files (auto-dealer workers
 * source rules from suiteDefaults/auto_dealer.js, not individual ad_*
 * rulesets; platform Spine workers have explicit null entries). Safe to
 * rename without breaking workerSync.
 *
 *   node scripts/deprecateOrphanRulesets.js          (dry-run)
 *   node scripts/deprecateOrphanRulesets.js --apply  (rename)
 */

const fs = require("fs");
const path = require("path");

const DRY = !process.argv.includes("--apply");
const RULESETS_DIR = path.join(__dirname, "..", "functions", "functions", "raas", "rulesets");

const TARGETS = [
  // Cluster A — auto-dealer mid/late tier v1
  "ad_012_fi_menu_v1",
  "ad_013_fi_compliance_v1",
  "ad_014_lender_relations_v1",
  "ad_015_aftermarket_admin_v1",
  "ad_016_service_scheduling_v1",
  "ad_017_service_upsell_v1",
  "ad_018_parts_inventory_v1",
  "ad_019_warranty_admin_v1",
  "ad_020_body_shop_v1",
  "ad_021_customer_retention_v1",
  "ad_022_reputation_management_v1",
  "ad_023_digital_marketing_v1",
  "ad_024_title_registration_v1",
  "ad_025_deal_accounting_v1",
  "ad_026_regulatory_compliance_v1",
  "ad_027_hr_payroll_v1",
  "ad_028_floor_plan_cash_v1",
  "ad_029_dms_technology_v1",
  // Cluster B — platform Spine v1 (excluding platform_legal_v1 which becomes a new worker)
  "platform_accounting_v1",
  "platform_contacts_v1",
  "platform_hr_v1",
  "platform_marketing_v1",
  // Cluster E — aviation generic compliance superseded by per-aircraft rulesets
  "aviation_compliance_v1",
];

console.log(`\n${DRY ? "DRY RUN" : "APPLYING"} — orphan ruleset deprecation\n`);

let renamed = 0, missing = 0, alreadyDone = 0;
for (const name of TARGETS) {
  const src = path.join(RULESETS_DIR, `${name}.json`);
  const dst = path.join(RULESETS_DIR, `${name}.deprecated.json`);
  if (!fs.existsSync(src)) {
    if (fs.existsSync(dst)) {
      console.log(`  ${name.padEnd(32)} → already deprecated`);
      alreadyDone++;
    } else {
      console.log(`  ${name.padEnd(32)} → MISSING`);
      missing++;
    }
    continue;
  }
  console.log(`  ${name.padEnd(32)} → ${path.basename(dst)}`);
  if (!DRY) fs.renameSync(src, dst);
  renamed++;
}

console.log();
console.log(`Renamed: ${renamed}    Already deprecated: ${alreadyDone}    Missing: ${missing}`);
console.log(`\n${DRY ? "DRY RUN — no renames performed. Re-run with --apply." : "Done."}\n`);
