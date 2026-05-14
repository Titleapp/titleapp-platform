/**
 * Push bespoke canvas tabs for the top 10 RE workers (CODEX 50.18 follow-up
 * 2026-05-12). Replaces generic Overview/Activity/Resources defaults with
 * workflow-specific tabs.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/pushReWorkerCanvasTabs.js
 *
 * Side effect on canvasTabs.js — these designs should be folded into the
 * generator so re-runs produce the same output. See follow-up task.
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const WORKER_TABS = {
  // ESC-001 Escrow Locker — secure document staging for closings
  "esc-escrow-locker": [
    { id: "active-closings", label: "Active Closings", signal: "card:real-estate-closing", default: true, order: 0 },
    { id: "documents",       label: "Documents",       signal: "card:work-product",        order: 1 },
    { id: "disbursements",   label: "Disbursements",   signal: "card:accounting-cashflow", order: 2 },
    { id: "compliance",      label: "Compliance",      signal: "card:work-product",        order: 3 },
    { id: "audit-trail",     label: "Audit Trail",     signal: "card:work-product",        order: 4 },
  ],

  // ESC-003 Title Search and Commitment — chain analysis, commitment drafting
  "esc-title-search-commitment": [
    { id: "property",   label: "Property",         signal: "card:re-property-analysis", default: true, order: 0 },
    { id: "chain",      label: "Chain of Title",   signal: "card:work-product",         order: 1 },
    { id: "defects",    label: "Defects & Flags",  signal: "card:work-product",         order: 2 },
    { id: "commitment", label: "Commitment Draft", signal: "card:work-product",         order: 3 },
    { id: "sources",    label: "Source Documents", signal: "card:work-product",         order: 4 },
  ],

  // W-001 Market Research & Demographics
  "market-research": [
    { id: "market",       label: "Market Overview",  signal: "card:re-market-report",    default: true, order: 0 },
    { id: "demographics", label: "Demographics",     signal: "card:chart-bar",           order: 1 },
    { id: "comps",        label: "Comps & Trends",   signal: "card:re-comp-analysis",    order: 2 },
    { id: "supply",       label: "Supply Pipeline",  signal: "card:work-product",        order: 3 },
    { id: "demand",       label: "Demand Drivers",   signal: "card:chart-bar",           order: 4 },
  ],

  // W-002 Real Estate Analyst + Investor — deal screening, evidence-first analysis
  "cre-analyst": [
    { id: "deal-screen",   label: "Deal Screen",     signal: "card:analyst-report",       default: true, order: 0 },
    { id: "underwriting",  label: "Underwriting",    signal: "card:re-property-analysis", order: 1 },
    { id: "sensitivity",   label: "Sensitivity",     signal: "card:chart-bar",            order: 2 },
    { id: "capital-stack", label: "Capital Stack",   signal: "card:work-product",         order: 3 },
    { id: "decision",      label: "Decision Memo",   signal: "card:analyst-report",       order: 4 },
  ],

  // W-003 Site Due Diligence
  "site-due-diligence": [
    { id: "property",      label: "Property",       signal: "card:re-property-analysis", default: true, order: 0 },
    { id: "environmental", label: "Environmental",  signal: "card:work-product",         order: 1 },
    { id: "title-zoning",  label: "Title & Zoning", signal: "card:work-product",         order: 2 },
    { id: "physical",      label: "Physical Site",  signal: "card:work-product",         order: 3 },
    { id: "punchlist",     label: "DD Punchlist",   signal: "card:work-product",         order: 4 },
  ],

  // W-031 Lease-Up & Marketing
  "lease-up-marketing": [
    { id: "pipeline",      label: "Pipeline",         signal: "card:chart-funnel",      default: true, order: 0 },
    { id: "traffic",       label: "Traffic Sources",  signal: "card:chart-bar",         order: 1 },
    { id: "applications",  label: "Applications",    signal: "card:work-product",      order: 2 },
    { id: "channels",      label: "Marketing Channels", signal: "card:marketing-email", order: 3 },
    { id: "conversion",    label: "Conversion Funnel", signal: "card:chart-funnel",    order: 4 },
  ],

  // W-033 Property Management
  "property-management": [
    { id: "units",       label: "Units",       signal: "card:work-product",         default: true, order: 0 },
    { id: "tenants",     label: "Tenants",     signal: "card:hr-employee-register", order: 1 },
    { id: "work-orders", label: "Work Orders", signal: "card:work-product",         order: 2 },
    { id: "financials",  label: "Financials",  signal: "card:accounting-pl",        order: 3 },
    { id: "renewals",    label: "Renewals",    signal: "card:work-product",         order: 4 },
  ],

  // W-034 Rent Roll & Revenue Management
  "rent-roll-revenue": [
    { id: "rent-roll",   label: "Rent Roll",        signal: "card:work-product",      default: true, order: 0 },
    { id: "vacancy",     label: "Vacancy",          signal: "card:chart-bar",         order: 1 },
    { id: "concessions", label: "Concessions",     signal: "card:work-product",      order: 2 },
    { id: "renewals",    label: "Renewals",         signal: "card:work-product",      order: 3 },
    { id: "projections", label: "Revenue Projection", signal: "card:chart-bar",      order: 4 },
  ],

  // W-042 Disposition Preparation
  "disposition-preparation": [
    { id: "property",       label: "Property",          signal: "card:re-property-analysis", default: true, order: 0 },
    { id: "broker",         label: "Broker Selection",  signal: "card:work-product",         order: 1 },
    { id: "package",        label: "Marketing Package", signal: "card:work-product",         order: 2 },
    { id: "buyers",         label: "Buyer Pool",        signal: "card:work-product",         order: 3 },
    { id: "negotiations",   label: "Negotiations",      signal: "card:trade-summary",        order: 4 },
  ],

  // W-044 Title & Escrow (development-side)
  "title-escrow": [
    { id: "timeline",  label: "Closing Timeline", signal: "card:real-estate-closing", default: true, order: 0 },
    { id: "title",     label: "Title Status",     signal: "card:work-product",        order: 1 },
    { id: "documents", label: "Escrow Documents", signal: "card:work-product",        order: 2 },
    { id: "funding",   label: "Funding",          signal: "card:accounting-cashflow", order: 3 },
    { id: "recording", label: "Recording",        signal: "card:work-product",        order: 4 },
  ],
};

(async () => {
  console.log("\n=== Push bespoke canvas tabs for top 10 RE workers ===\n");

  let pushed = 0;
  let skipped = 0;
  let errored = 0;
  for (const [slug, tabs] of Object.entries(WORKER_TABS)) {
    try {
      const docRef = db.collection("digitalWorkers").doc(slug);
      const snap = await docRef.get();
      if (!snap.exists) {
        console.log(`⚠ ${slug}: doc not found — skipped`);
        skipped++;
        continue;
      }
      await docRef.update({
        canvasTabs: tabs,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const labels = tabs.map(t => t.label).join(" | ");
      console.log(`✅ ${slug}: ${labels}`);
      pushed++;
    } catch (e) {
      console.error(`❌ ${slug}: ${e.message}`);
      errored++;
    }
  }

  console.log(`\nSummary: ${pushed} pushed · ${skipped} skipped · ${errored} errored\n`);
  process.exit(errored > 0 ? 1 : 0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
