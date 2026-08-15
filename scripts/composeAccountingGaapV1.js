/**
 * ACCT-001 — Compose accounting_gaap_v1 constraint RAAS module.
 *
 * Fixes the root cause found 2026-08-15: Max (platform-accounting) had zero
 * RAAS ruleset behind it — 100% prompt-defined, so it could (and did) treat
 * a raw unreconciled transaction tab as a final Net Income figure with no
 * rule catching it. This composes the enforced ruleset from
 * raas/horizontal/GLOBAL/ACCT-001-gaap-reconciliation-rules.md into the
 * constraintRaasModules schema so it actually gets injected into worker
 * prompts at chat time (see functions/functions/services/raas/
 * workerPromptComposer.js + constraintModules.js:composePromptText).
 *
 * Status saved as `draft`. Sean reviews (and can act as the "counsel"
 * reviewer for internal ops rules like this one, since these are accounting
 * process rules rather than legal/regulatory ones) before transitioning to
 * `live` and wiring onto worker docs.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/composeAccountingGaapV1.js          (dry-run, default)
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/composeAccountingGaapV1.js --apply  (write)
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));

admin.initializeApp({ projectId: "title-app-alpha" });

const cm = require(path.join(__dirname, "..", "functions", "functions", "services", "raas", "constraintModules"));

const DRY = !process.argv.includes("--apply");
const MODULE_ID = "accounting_gaap_v1";

// ═══════════════════════════════════════════════════════════════
//  SECTION DEFINITIONS — from ACCT-001-gaap-reconciliation-rules.md
// ═══════════════════════════════════════════════════════════════

const HARD_STOP_SECTIONS = [
  {
    sectionId: "never-treat-raw-feed-as-final",
    priority: "critical",
    section_type: "hard_stop_rule",
    title: "Never treat a raw transaction feed as a final total",
    body_markdown:
      "If a source document contains both a raw/unreconciled tab and a reconciled tab, and their totals materially disagree, the reconciled tab wins — never the raw one — and the disagreement itself must be surfaced to the user.\n\nSignal words indicating a RECONCILED source (prefer): \"Detail,\" \"Reconciled,\" \"Final,\" \"CPA,\" \"Summary.\" Signal words indicating a RAW/UNRECONCILED source (never present as final without reconciling first): \"Expenses,\" \"Transactions,\" \"Raw,\" \"Export,\" \"Statement.\" If genuinely ambiguous, ask the user which tab is authoritative rather than guessing.\n\nDISPOSITION: block_with_explanation if the worker is about to present a Net Income/Total Expenses figure sourced from a tab whose name or content (personal charges, unrelated transactions) suggests it is unreconciled.",
    source_refs: [{ docId: "raas/horizontal/GLOBAL/ACCT-001-gaap-reconciliation-rules.md", section: "ACCT001-R01" }],
  },
  {
    sectionId: "no-silent-recomputation",
    priority: "critical",
    section_type: "hard_stop_rule",
    title: "No silent recomputation of previously-stated figures",
    body_markdown:
      "Any change to a previously-stated material figure must be flagged with old value, new value, and reason for the change (e.g., \"$12,556.58 -> $13,436.56 (+$879.98) because newly found Cloudflare/OpenAI charges\"). Never quietly restate a different number as if it were always the number — this is what causes a user to be stuck re-asking the same question and getting a different unexplained answer each time.\n\nDISPOSITION: block_with_explanation if a material figure changes from a prior turn without an explicit before/after/why.",
    source_refs: [{ docId: "raas/horizontal/GLOBAL/ACCT-001-gaap-reconciliation-rules.md", section: "ACCT001-R02" }],
  },
  {
    sectionId: "no-plug-numbers-to-force-tie-out",
    priority: "critical",
    section_type: "hard_stop_rule",
    title: "Never force a balance-sheet or cash-flow tie-out with a plug number",
    body_markdown:
      "If Assets != Liabilities + Equity, or cash-flow-derived ending cash doesn't match a confirmed bank balance, name the variance and its likely real-world cause instead of inventing a number to make it match. Flag as an open item for the tenant's CPA.\n\nDISPOSITION: block_with_explanation if a fabricated figure appears whose only justification is making a statement numerically foot.",
    source_refs: [{ docId: "raas/horizontal/GLOBAL/ACCT-001-gaap-reconciliation-rules.md", section: "ACCT001-R03" }],
  },
  {
    sectionId: "management-estimate-non-gaap-disclosure",
    priority: "critical",
    section_type: "hard_stop_rule",
    title: "Management-estimate asset values must be labeled non-GAAP",
    body_markdown:
      "Internally-developed software/IP is expensed, not capitalized, by default (ASC 350-40 — only actual cash costs incurred during the application-development stage are capitalizable). If a user directs a management-estimate valuation to be booked as an asset anyway, it must carry an explicit non-GAAP, pending-CPA-review label, with the offsetting equity entry similarly labeled and tax implications (e.g., Section 351 for post-incorporation IP contributions) flagged for counsel.\n\nDISPOSITION: block_with_explanation if a management-estimate asset appears without its disclosure callout.",
    source_refs: [{ docId: "raas/horizontal/GLOBAL/ACCT-001-gaap-reconciliation-rules.md", section: "ACCT001-R04" }],
  },
  {
    sectionId: "cross-tenant-isolation-accounting",
    priority: "critical",
    section_type: "hard_stop_rule",
    title: "No cross-tenant financial data leakage",
    body_markdown:
      "Every read and write must be scoped to the current tenant. Never surface another tenant's records, balances, or chat history in this session — including demo/sample tenant data leaking into a real customer's session, or vice versa.\n\nDISPOSITION: block_with_explanation if any figure, balance, or record from a different tenantId would appear in this worker's response.",
    source_refs: [{ docId: "raas/horizontal/GLOBAL/ACCT-001-gaap-reconciliation-rules.md", section: "Tier 0 P0.6" }],
  },
];

const GUIDANCE_SECTIONS = [
  {
    sectionId: "personal-vs-business-separation",
    priority: "high",
    section_type: "guidance",
    title: "Personal vs. business separation",
    body_markdown:
      "Internal transfers between a founder's personal accounts and company accounts are not expenses. Personal charges (groceries, personal medical, personal entertainment) that happen to appear on a business-linked card are not company expenses unless explicitly confirmed as reimbursable business use. When in doubt, flag the line item for user confirmation rather than including or excluding it silently.",
    source_refs: [{ docId: "raas/horizontal/GLOBAL/ACCT-001-gaap-reconciliation-rules.md", section: "Tier 1" }],
  },
  {
    sectionId: "verification-before-answer",
    priority: "high",
    section_type: "guidance",
    title: "Verification-before-answer discipline",
    body_markdown:
      "Before presenting any material total (operating expenses, net income, asset value, loan balance) as final, check it against at least one other available source if one exists. Label every material figure with its verification status: VERIFIED (confirmed against a primary source document), CORRECTED (source-documented change from a prior figure), or PENDING/UNVERIFIED (no independent source checked yet). Never present a PENDING figure with the same confidence as a VERIFIED one.",
    source_refs: [{ docId: "raas/horizontal/GLOBAL/ACCT-001-gaap-reconciliation-rules.md", section: "Tier 1" }],
  },
];

const SOP_SECTIONS = [
  {
    sectionId: "cogs-methodology",
    priority: "standard",
    section_type: "sop",
    title: "COGS methodology — separate direct costs from operating expenses",
    body_markdown:
      "For any tenant with product/service revenue (not pure pre-revenue R&D), separate direct costs of delivering the product/service (COGS) from operating expenses (SG&A). Ask/infer whether the tenant has a per-unit or per-transaction direct cost (e.g., a title company's per-transaction title search fee, a nursing program's per-student credential-verification cost). If yes, build a COGS line distinct from Operating Expenses so gross margin can be computed. If pre-revenue with no COGS yet, say so explicitly rather than omitting the section silently.",
    source_refs: [{ docId: "raas/horizontal/GLOBAL/ACCT-001-gaap-reconciliation-rules.md", section: "Section 7" }],
  },
  {
    sectionId: "depreciation-amortization-schedule",
    priority: "standard",
    section_type: "sop",
    title: "Depreciation & Amortization schedule for capitalized assets",
    body_markdown:
      "Any capitalized asset (equipment, capitalized software under ASC 350-40, intangibles under ASC 350) needs a real schedule: useful life, method (straight-line unless the tenant specifies otherwise), monthly/annual depreciation expense, and accumulated depreciation to date. Do not list a capitalized asset's cost basis without also producing (or explicitly flagging as pending) its depreciation schedule.",
    source_refs: [{ docId: "raas/horizontal/GLOBAL/ACCT-001-gaap-reconciliation-rules.md", section: "Section 7" }],
  },
  {
    sectionId: "standard-chart-of-accounts",
    priority: "standard",
    section_type: "sop",
    title: "Standard Chart of Accounts template",
    body_markdown:
      "Default template: 1000s Assets (Cash, AR, Prepaid, Fixed Assets, Intangibles), 2000s Liabilities (AP, Accrued Expenses, Notes Payable, Deferred Revenue), 3000s Equity (Common Stock, APIC, Retained Earnings/Deficit), 4000s Revenue, 5000s COGS, 6000s Operating Expenses (by department/category), 7000s Other Income/Expense (interest, one-time items). Map tenant-specific categories onto this structure rather than inventing a new one-off structure per tenant.",
    source_refs: [{ docId: "raas/horizontal/GLOBAL/ACCT-001-gaap-reconciliation-rules.md", section: "Section 7" }],
  },
  {
    sectionId: "loan-schedule-running-balance",
    priority: "standard",
    section_type: "sop",
    title: "Running-balance loans get a real monthly accrual table",
    body_markdown:
      "Running-balance loans (e.g., founder self-funding that grows month over month) must get a real month-by-month accrual table showing principal added, cumulative principal, interest accrued, and cumulative interest — never a single lump estimate. Deferred-interest loans show accrual math explicitly, not just a final number.",
    source_refs: [{ docId: "raas/horizontal/GLOBAL/ACCT-001-gaap-reconciliation-rules.md", section: "Core Capabilities" }],
  },
];

// ═══════════════════════════════════════════════════════════════
//  EXECUTION
// ═══════════════════════════════════════════════════════════════

(async () => {
  console.log(`\n${DRY ? "DRY RUN" : "APPLYING"} — Composing ${MODULE_ID}\n`);

  const allSections = [...HARD_STOP_SECTIONS, ...GUIDANCE_SECTIONS, ...SOP_SECTIONS];

  console.log(`Composed ${allSections.length} sections:`);
  console.log(`  - ${HARD_STOP_SECTIONS.length} hard-stop rules`);
  console.log(`  - ${GUIDANCE_SECTIONS.length} guidance sections`);
  console.log(`  - ${SOP_SECTIONS.length} SOPs (incl. COGS, depreciation, chart of accounts, loan schedules)`);

  const totalEstimate = allSections.reduce((sum, s) => sum + Math.ceil((s.body_markdown || "").length / 4), 0);
  console.log(`Total token estimate: ~${totalEstimate}`);

  if (DRY) {
    console.log("\nFirst section preview:");
    console.log("  id:", allSections[0].sectionId);
    console.log("  priority:", allSections[0].priority);
    console.log("  type:", allSections[0].section_type);
    console.log("  title:", allSections[0].title);
    console.log("  body length:", allSections[0].body_markdown.length, "chars");
    console.log("\nDRY RUN — no writes. Run with --apply to create the module.\n");
    process.exit(0);
  }

  try {
    await cm.createModule({
      moduleId: MODULE_ID,
      name: "GAAP Reconciliation & Corporate Books",
      description: "Source-hierarchy discipline (never treat a raw feed as final), no-silent-recomputation, no plug numbers to force tie-outs, non-GAAP disclosure for management estimates, cross-tenant isolation, COGS/depreciation/chart-of-accounts SOPs.",
      domain: "accounting",
      jurisdiction_scope: ["US-federal"],
      disposition_default: "block_with_explanation",
    });
    console.log(`✅ Module created: ${MODULE_ID}`);
  } catch (e) {
    if (/already exists/.test(e.message)) {
      console.log(`⚠️  Module ${MODULE_ID} exists — adding any missing sections only.`);
    } else {
      throw e;
    }
  }

  let order = 0;
  let added = 0;
  let skipped = 0;
  for (const s of allSections) {
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
  console.log(`\nModule status: draft. To promote:`);
  console.log(`  1. Review via GET /v1/admin:raas:module:get?moduleId=${MODULE_ID}&includeSections=1`);
  console.log(`  2. Sean reviews + revises sections via /v1/admin:raas:module:section:update`);
  console.log(`  3. POST /v1/admin:raas:module:counsel { moduleId, reviewer: "Sean Lee Combs", approval_notes }`);
  console.log(`  4. POST /v1/admin:raas:module:transition { moduleId, status: "live" }`);
  console.log(`  5. Wire constraintRaasSources: [{moduleId: "${MODULE_ID}", required: true, load_when: "always"}]`);
  console.log(`     onto digitalWorkers/platform-accounting, and onto any future accounting-adjacent worker doc\n`);

  process.exit(0);
})().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
