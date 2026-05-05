/**
 * CODEX 50.10 Phase 1 worker registrations + IR flip.
 *
 * Per Sean's locked decisions:
 *   Q2: platform-legal ("Legal Companion") — live, $0/2 credits.
 *   Q3: investor-relations stays as CRE archetype (flip to live, attach
 *       ir_compliance_v0). Three new INV-* workers + founder-ir all
 *       waitlist; ir_fund_v0 → inv-fund-001; ir_syndication_v0 → inv-pe-001.
 *   Q4: 5 analyst workers, "Investment Analysts" suite, $49/mo, all
 *       waitlist; one ruleset each.
 *
 * Writes directly to digitalWorkers/. Marketplace UI (Phase 2) reads
 * Firestore truth so workers appear immediately. Catalog file polish
 * (services/alex/catalogs/*.json) is a follow-up — Phase 2 already
 * decoupled marketplace browse from those files.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/registerPhase1Workers.js          (dry-run)
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/registerPhase1Workers.js --apply  (write)
 */

const path = require("path");
const fs = require("fs");
const admin = require("/Users/seancombs/titleapp-platform/functions/functions/node_modules/firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const DRY = !process.argv.includes("--apply");
const RULESETS_DIR = "/Users/seancombs/titleapp-platform/functions/functions/raas/rulesets";

function readRules(rulesetName) {
  const p = path.join(RULESETS_DIR, `${rulesetName}.json`);
  if (!fs.existsSync(p)) return [];
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  // Flatten hard_stops + soft_flags + chat_rules into the tier-0 array.
  // Coerce nulls — Firestore rejects undefined.
  const rules = [];
  const norm = (r, severity) => ({
    id: r.id || `unnamed_${severity}`,
    label: r.label || r.message || r.logic || r.id || "",
    severity,
    source: rulesetName,
  });
  for (const r of data.hard_stops || []) rules.push(norm(r, "hard_stop"));
  for (const r of data.soft_flags || []) rules.push(norm(r, "soft_flag"));
  for (const r of data.chat_rules || []) rules.push(norm(r, "chat_rule"));
  return rules;
}

function longTailTabs() {
  return [
    { id: "overview",  label: "Overview",  signal: "card:work-product", default: true, order: 0 },
    { id: "activity",  label: "Activity",  signal: "card:work-product", order: 1 },
    { id: "resources", label: "Resources", signal: "card:work-product", order: 2 },
  ];
}

const workers = [
  // Q2 — Legal Companion (Spine, live)
  {
    slug: "platform-legal",
    display_name: "Legal Companion",
    headline: "Contract review and W-045 compliance — flag, don't counsel",
    capabilitySummary: "Reviews contracts for W-045 enforcement (RESPA, TILA, UCC, state title regs); flags AI-disclosure, statute-of-frauds, securities, usury, draft markings; never provides legal advice.",
    vertical: "platform",
    suite: "Legal",
    status: "live",
    price: 0,
    creditCost: 2,
    creditTiming: "session_open",
    creatorId: "titleapp-platform",
    type: "platform",
    rulesetName: "platform_legal_v1",
  },

  // Q3 — Investor Relations cluster
  {
    slug: "founder-ir",
    display_name: "Founder IR",
    headline: "Startup investor communication — narrative, deck, cap table sync",
    capabilitySummary: "Founder-side investor relations for early-stage operators. Update narratives, prep cap-table snapshots, draft investor updates aligned with the round you're running.",
    vertical: "investor",
    suite: "Investor Relations",
    status: "waitlist",
    price: 79,
    creditCost: 1,
    creditTiming: "session_open",
    creatorId: "titleapp-platform",
    type: "individual",
    rulesetName: "ir_compliance_v0",
  },
  {
    slug: "inv-fund-001",
    display_name: "Fund Formation Analyst",
    headline: "Fund formation deal screen — fees, carry, GP commit, structure",
    capabilitySummary: "Screens fund formation deals against management fee, carry split, GP commitment, and structural-rule baselines. Hard-stops on insufficient GP commit; soft flags on fee outliers.",
    vertical: "investor",
    suite: "Investor Relations",
    status: "waitlist",
    price: 79,
    creditCost: 1,
    creditTiming: "session_open",
    creatorId: "titleapp-platform",
    type: "individual",
    rulesetName: "ir_fund_v0",
  },
  {
    slug: "inv-debt-001",
    display_name: "Debt Investment Analyst",
    headline: "Debt investment screen — covenants, rate, term, sponsor",
    capabilitySummary: "Screens debt investments against covenant, rate, term, and sponsor-quality baselines. Ruleset authoring deferred — v1 ships as discoverable shell with intake form; raas binding lands in v1.1.",
    vertical: "investor",
    suite: "Investor Relations",
    status: "waitlist",
    price: 79,
    creditCost: 1,
    creditTiming: "session_open",
    creatorId: "titleapp-platform",
    type: "individual",
    rulesetName: null,
  },
  {
    slug: "inv-pe-001",
    display_name: "PE Syndication Analyst",
    headline: "PE syndication screen — sponsor track, structure, distribution",
    capabilitySummary: "Screens private-equity syndication deals against sponsor-quality, capital-structure, and distribution-waterfall baselines. Hard-stops on sponsor disqualification; soft flags on structure anomalies.",
    vertical: "investor",
    suite: "Investor Relations",
    status: "waitlist",
    price: 79,
    creditCost: 1,
    creditTiming: "session_open",
    creatorId: "titleapp-platform",
    type: "individual",
    rulesetName: "ir_syndication_v0",
  },

  // Q4 — Analyst Suite (Investment Analysts)
  {
    slug: "analyst-conversion-screen",
    display_name: "Conversion Screen Analyst",
    headline: "Asset-conversion screening — feasibility, basis, exit",
    capabilitySummary: "Screens conversion deals (e.g., office-to-residential) against feasibility, basis, and exit-yield baselines. Surfaces hard stops on unfeasible structures and soft flags on capital-stack anomalies.",
    vertical: "investor",
    suite: "Investment Analysts",
    status: "waitlist",
    price: 49,
    creditCost: 1,
    creditTiming: "session_open",
    creatorId: "titleapp-platform",
    type: "individual",
    rulesetName: "conversion_screen_v0",
  },
  {
    slug: "analyst-debt-acquisition",
    display_name: "Debt Acquisition Analyst",
    headline: "Debt acquisition screening — discount, recovery, sponsor",
    capabilitySummary: "Screens debt acquisition opportunities against discount-to-par, recovery, and sponsor-quality baselines. Pairs with portfolio cash-flow analysis at deal-team level.",
    vertical: "investor",
    suite: "Investment Analysts",
    status: "waitlist",
    price: 49,
    creditCost: 1,
    creditTiming: "session_open",
    creatorId: "titleapp-platform",
    type: "individual",
    rulesetName: "debt_acquisition_screen_v0",
  },
  {
    slug: "analyst-entitlement-screen",
    display_name: "Entitlement Screen Analyst",
    headline: "Entitlement screening — zoning, approvals, timeline risk",
    capabilitySummary: "Screens entitlement plays against zoning baselines, approval-timeline risk, and political feasibility. Surfaces hard stops on jurisdictional infeasibility.",
    vertical: "investor",
    suite: "Investment Analysts",
    status: "waitlist",
    price: 49,
    creditCost: 1,
    creditTiming: "session_open",
    creatorId: "titleapp-platform",
    type: "individual",
    rulesetName: "entitlement_screen_v0",
  },
  {
    slug: "analyst-pe-deal-screen",
    display_name: "PE Deal Screen Analyst",
    headline: "PE deal screening — sponsor track, structure, market multiple",
    capabilitySummary: "Screens private-equity deals against sponsor-quality, capital-structure, and market-multiple baselines. Hard-stops on disqualified sponsors; soft flags on structural anomalies.",
    vertical: "investor",
    suite: "Investment Analysts",
    status: "waitlist",
    price: 49,
    creditCost: 1,
    creditTiming: "session_open",
    creatorId: "titleapp-platform",
    type: "individual",
    rulesetName: "pe_deal_screen_v0",
  },
  {
    slug: "analyst-refinance-screen",
    display_name: "Refinance Screen Analyst",
    headline: "Refinance screening — DSCR, LTV, rate, term",
    capabilitySummary: "Screens refinance opportunities against DSCR, LTV, rate spread, and term baselines. Pairs with the loan-pipeline view for portfolio-level prioritization.",
    vertical: "investor",
    suite: "Investment Analysts",
    status: "waitlist",
    price: 49,
    creditCost: 1,
    creditTiming: "session_open",
    creatorId: "titleapp-platform",
    type: "individual",
    rulesetName: "refinance_screen_v0",
  },
];

(async () => {
  console.log(`\n${DRY ? "DRY RUN" : "APPLYING"} — Phase 1 worker registrations\n`);

  const now = admin.firestore.FieldValue.serverTimestamp();

  // 1. Flip existing investor-relations to live + attach ir_compliance_v0
  const irRef = db.collection("digitalWorkers").doc("investor-relations");
  const irSnap = await irRef.get();
  if (irSnap.exists) {
    const irRules = readRules("ir_compliance_v0");
    console.log(`  investor-relations  → status: live, raas_tier_0: ${irRules.length} rules (CRE archetype)`);
    if (!DRY) {
      await irRef.update({
        status: "live",
        rulesetId: "ir_compliance_v0",
        raas_tier_0: irRules,
        suite: "Investor Relations",
        syncedAt: now,
      });
    }
  } else {
    console.log(`  investor-relations  → MISSING in Firestore — skipping`);
  }

  // 2. New worker registrations
  for (const w of workers) {
    const ref = db.collection("digitalWorkers").doc(w.slug);
    const existing = await ref.get();
    if (existing.exists) {
      console.log(`  ${w.slug.padEnd(34)} → already exists, skipping`);
      continue;
    }
    const rules = w.rulesetName ? readRules(w.rulesetName) : [];
    console.log(`  ${w.slug.padEnd(34)} → ${w.status} · ${w.suite} · ${rules.length} rules · price=$${w.price} (${w.rulesetName || "no raas"})`);
    if (DRY) continue;

    await ref.set({
      worker_id: w.slug,
      catalogSlug: w.slug,
      display_name: w.display_name,
      headline: w.headline,
      capabilitySummary: w.capabilitySummary,
      vertical: w.vertical,
      suite: w.suite,
      status: w.status,
      price: w.price,
      pricing_tier: w.price,
      creditCost: w.creditCost,
      creditTiming: w.creditTiming,
      creatorId: w.creatorId,
      type: w.type,
      worker_type: w.type,
      rulesetId: w.rulesetName || null,
      raas_tier_0: rules,
      raas_tier_1: [],
      raas_tier_2: [],
      raas_tier_3: [],
      canvasTabs: longTailTabs(),
      internal_only: false,
      bogoEligible: false,
      certificationIssues: [],
      verticalIntegrations: [],
      syncedAt: now,
      qualityAuditedAt: null,
      qualityScore: null,
      qualityStatus: "unaudited",
    });
  }

  console.log(`\n${DRY ? "DRY RUN — no writes performed. Re-run with --apply." : "Done."}\n`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
