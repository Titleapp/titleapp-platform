/**
 * CODEX S52.48 — Port legacy accounting rules into accounting_gaap_v1.
 *
 * Adds sections ported from two legacy systems being consolidated:
 *   - raas/rulesets/platform_accounting_v1.json (real, pre-existing rules
 *     that were live via tenantLocker's system-doc display but never
 *     confirmed reaching the model through the same precedence chain as
 *     constraintRaasModules — no_fabricated_transactions, no_tax_advice,
 *     unreconciled_balance)
 *   - studioLocker/index.js's precedence/conflict-resolution logic (the
 *     "company doc vs. platform baseline, stricter wins" rule), adapted
 *     for the tenantLocker consolidation (System B) vs constraintRaasModules
 *     (System A) split.
 *
 * Module accounting_gaap_v1 must already exist (created by
 * composeAccountingGaapV1.js). This only adds sections — safe to re-run.
 *
 *   node scripts/extendAccountingGaapV1LegacyContent.js          (dry-run)
 *   node scripts/extendAccountingGaapV1LegacyContent.js --apply  (write)
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));

admin.initializeApp({ projectId: "title-app-alpha" });

const cm = require(path.join(__dirname, "..", "functions", "functions", "services", "raas", "constraintModules"));

const DRY = !process.argv.includes("--apply");
const MODULE_ID = "accounting_gaap_v1";

const LEGACY_SECTIONS = [
  {
    sectionId: "no-fabricated-transactions",
    priority: "critical",
    section_type: "hard_stop_rule",
    title: "Never invent, estimate, or fabricate transaction amounts or balances",
    body_markdown:
      "Never invent, estimate, or fabricate transaction amounts, account balances, or tax figures. Only report figures present in the user's actual connected data or explicitly-provided source documents. This is distinct from ACCT001-R01 (source hierarchy) — that rule governs which REAL source to trust when several exist; this rule prohibits generating a number that exists in no source at all.\n\nDISPOSITION: block_with_explanation if a figure appears in worker output with no traceable source document.",
    source_refs: [{ docId: "raas/rulesets/platform_accounting_v1.json", section: "hard_stops.no_fabricated_transactions" }],
  },
  {
    sectionId: "no-tax-advice",
    priority: "high",
    section_type: "hard_stop_rule",
    title: "No specific tax advice or IRS filing positions",
    body_markdown:
      "Do not provide specific tax advice, tax filing guidance, or IRS positions. Surface the data; recommend a licensed CPA or financial advisor for tax strategy and filing decisions. This applies even when a user directly asks \"what should I deduct\" or \"how should I file this.\"\n\nDISPOSITION: block_with_explanation if output contains a specific deduction recommendation, filing position, or IRS-outcome prediction.",
    source_refs: [{ docId: "raas/rulesets/platform_accounting_v1.json", section: "hard_stops.no_tax_advice" }],
  },
  {
    sectionId: "unreconciled-balance-flag",
    priority: "standard",
    section_type: "soft_flag",
    title: "Flag balances that differ materially from connected bank data",
    body_markdown:
      "If a reported balance differs from connected bank/source data by more than 5%, flag for reconciliation before reporting it as final. Pair this with ACCT001-R01's verification-status labeling (VERIFIED/CORRECTED/PENDING) rather than silently reporting the larger or smaller figure.",
    source_refs: [{ docId: "raas/rulesets/platform_accounting_v1.json", section: "soft_flags.unreconciled_balance" }],
  },
  {
    sectionId: "tenant-doc-precedence",
    priority: "high",
    section_type: "guidance",
    title: "Precedence when a tenant's own documents conflict with these platform rules",
    body_markdown:
      "A tenant's own uploaded company documents (via their Studio Locker) are authoritative for their own company-specific policy (their chart of accounts, their internal SOP text) — EXCEPT where the company document is less restrictive than one of this module's critical or high-priority rules. In that case, apply this module's stricter standard and flag the conflict explicitly: \"Your company policy states X, but platform accounting rules require Y (stricter). I'm applying the platform standard — please update your company document if this was intentional, or flag it for review if not.\"\n\nIf you cannot confidently determine which standard is stricter, default to this module's standard (the conservative choice) and flag for human review rather than guessing.\n\nWhen a topic is covered by neither this module nor any tenant document, say so explicitly rather than inferring from general training data: \"I don't have a specific rule or your company's policy on this topic — treating this as an open question for you to confirm.\"",
    source_refs: [{ docId: "functions/functions/services/studioLocker/index.js", section: "precedence rules, lines 104-110" }],
  },
];

(async () => {
  console.log(`\n${DRY ? "DRY RUN" : "APPLYING"} — Extending ${MODULE_ID} with legacy content\n`);

  let order = 100; // append after the 11 sections already present
  let added = 0;
  let skipped = 0;

  for (const s of LEGACY_SECTIONS) {
    console.log(`  - ${s.sectionId} (${s.priority}/${s.section_type})`);
  }
  const totalEstimate = LEGACY_SECTIONS.reduce((sum, s) => sum + Math.ceil((s.body_markdown || "").length / 4), 0);
  console.log(`\nToken estimate for new sections: ~${totalEstimate}`);

  if (DRY) {
    console.log("\nDRY RUN — no writes. Run with --apply to add these sections.\n");
    process.exit(0);
  }

  for (const s of LEGACY_SECTIONS) {
    try {
      await cm.addSection({ moduleId: MODULE_ID, ...s, order: order++ });
      added++;
    } catch (e) {
      if (/already exists/.test(e.message)) {
        skipped++;
        continue;
      }
      console.error(`❌ Failed to add section ${s.sectionId}:`, e.message);
    }
  }
  console.log(`\n✅ Sections added: ${added}, skipped (already existed): ${skipped}`);
  process.exit(0);
})().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
