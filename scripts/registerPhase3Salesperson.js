/**
 * CODEX 50.10 Phase 3 — Real Estate Salesperson worker registration.
 *
 * Per T1 ADR Section 13 sequencing. Registers re-salesperson, owning
 * the 546 lines of authored RAAS at raas/real-estate/sales/ — buyer
 * lifecycle, listing lifecycle, showings, inspections, commission
 * structures, transaction fee, transaction management.
 *
 * Worker shape:
 *   - vertical: re_professional, suite: Sales, status: live, $79/mo
 *   - raas_tier_0 derived from README's "AI Operational Rules for Sales"
 *     (6 categories × 4-7 bullets each = ~30 operational rules)
 *   - rulesetSource references the markdown directory; the future
 *     Editor worker (v2) and the v1.1 system-prompt builder can read
 *     the full 8 files for richer context.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/registerPhase3Salesperson.js          (dry-run)
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/registerPhase3Salesperson.js --apply  (write)
 */

const admin = require("/Users/seancombs/titleapp-platform/functions/functions/node_modules/firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const DRY = !process.argv.includes("--apply");

// Extracted from README.md "AI Operational Rules for Sales" — categorized,
// structured, source-attributed. The rest of the 8 markdown files inform
// the system-prompt builder, not this rules array.
const RULES = [
  // Lead Response (5)
  { id: "lead_web_5min",        label: "Web leads: respond within 5 minutes (speed-to-lead is critical)", severity: "soft_flag", source: "README.md#lead-response" },
  { id: "lead_sign_15min",      label: "Sign calls: respond within 15 minutes", severity: "soft_flag", source: "README.md#lead-response" },
  { id: "lead_referral_1hr",    label: "Referrals: respond within 1 hour with warm personalized message", severity: "soft_flag", source: "README.md#lead-response" },
  { id: "lead_oh_same_day",     label: "Open house follow-up: same day, within 2 hours of close", severity: "soft_flag", source: "README.md#lead-response" },
  { id: "lead_alert_agent",     label: "AI sends initial response immediately, then alerts agent", severity: "hard_stop", source: "README.md#lead-response" },

  // Listing Management (6)
  { id: "list_dom_alerts",      label: "Track DOM — alert at 14, 30, 45, 60 days", severity: "hard_stop", source: "README.md#listing-management" },
  { id: "list_21d_price",       label: "21+ days no showings: recommend price adjustment or marketing change", severity: "soft_flag", source: "README.md#listing-management" },
  { id: "list_45d_price",       label: "45+ days: stronger price adjustment recommendation with market data", severity: "soft_flag", source: "README.md#listing-management" },
  { id: "list_90d_serious",     label: "90+ days: serious conversation about pricing, condition, or timing", severity: "hard_stop", source: "README.md#listing-management" },
  { id: "list_competitor_daily", label: "Monitor competing listings daily — alert on new competition / price changes", severity: "soft_flag", source: "README.md#listing-management" },
  { id: "list_feedback_pattern", label: "Track showing feedback — aggregate and identify patterns", severity: "soft_flag", source: "README.md#listing-management" },

  // Buyer Management (5)
  { id: "buy_motivation_track", label: "Track buyer motivation and timeline", severity: "hard_stop", source: "README.md#buyer-management" },
  { id: "buy_match_mls",        label: "Match new MLS listings to buyer criteria automatically", severity: "hard_stop", source: "README.md#buyer-management" },
  { id: "buy_match_alert_1hr",  label: "Alert within 1 hour of matching listing hitting MLS", severity: "soft_flag", source: "README.md#buyer-management" },
  { id: "buy_activity_14d",     label: "If buyer goes 14+ days without activity: check-in", severity: "soft_flag", source: "README.md#buyer-management" },
  { id: "buy_inactive_30d",     label: "If buyer goes 30+ days: re-engage or classify inactive", severity: "soft_flag", source: "README.md#buyer-management" },

  // Offer Management (5)
  { id: "offer_cma_draft",      label: "Draft offers based on CMA data and buyer's position", severity: "hard_stop", source: "README.md#offer-management" },
  { id: "offer_multi_track",    label: "Track multiple offer scenarios", severity: "soft_flag", source: "README.md#offer-management" },
  { id: "offer_competing_mon",  label: "Monitor competing offers if disclosed", severity: "soft_flag", source: "README.md#offer-management" },
  { id: "offer_net_calc",       label: "Calculate net proceeds for sellers", severity: "hard_stop", source: "README.md#offer-management" },
  { id: "offer_contingency_dl", label: "Track contingency deadlines ruthlessly — these kill deals when missed", severity: "hard_stop", source: "README.md#offer-management" },

  // Post-Closing (7)
  { id: "post_24h_followup",    label: "24-hour follow-up: 'How was your first night?'", severity: "soft_flag", source: "README.md#post-closing" },
  { id: "post_7d_followup",     label: "7-day follow-up: settling in, vendor recommendations", severity: "soft_flag", source: "README.md#post-closing" },
  { id: "post_30d_followup",    label: "30-day follow-up: review request", severity: "soft_flag", source: "README.md#post-closing" },
  { id: "post_anniversary",     label: "Home anniversary: annual touchpoint with market update", severity: "soft_flag", source: "README.md#post-closing" },
  { id: "post_birthday",        label: "Client birthdays: card or message", severity: "soft_flag", source: "README.md#post-closing" },
  { id: "post_holiday",         label: "Annual holiday touchpoint", severity: "soft_flag", source: "README.md#post-closing" },
  { id: "post_quarterly_mkt",   label: "Quarterly market update with their home's estimated value", severity: "soft_flag", source: "README.md#post-closing" },
];

const longTailTabs = () => [
  { id: "overview",  label: "Overview",  signal: "card:work-product", default: true, order: 0 },
  { id: "activity",  label: "Activity",  signal: "card:work-product", order: 1 },
  { id: "resources", label: "Resources", signal: "card:work-product", order: 2 },
];

const SLUG = "re-salesperson";

(async () => {
  console.log(`\n${DRY ? "DRY RUN" : "APPLYING"} — Phase 3: re-salesperson registration\n`);

  const ref = db.collection("digitalWorkers").doc(SLUG);
  const existing = await ref.get();
  if (existing.exists) {
    console.log(`  ${SLUG} already exists — skipping`);
    process.exit(0);
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  console.log(`  ${SLUG.padEnd(34)} → live · Sales · ${RULES.length} rules · price=$79`);
  console.log(`  rulesetSource: raas/real-estate/sales/ (8 markdown files, 546 lines)`);

  if (DRY) { console.log("\nDRY RUN — no writes performed.\n"); process.exit(0); }

  await ref.set({
    worker_id: SLUG,
    catalogSlug: SLUG,
    display_name: "Real Estate Salesperson",
    headline: "Buy-side and sell-side workflows for real estate agents — lead-to-close",
    capabilitySummary: "Manages buyer and listing pipelines end-to-end. Tracks DOM and recommends price moves; matches MLS to buyer criteria; drafts offers from CMA data; enforces contingency deadlines; runs the post-close cadence.",
    vertical: "re_professional",
    suite: "Sales",
    status: "live",
    price: 79,
    pricing_tier: 79,
    creditCost: 1,
    creditTiming: "session_open",
    creatorId: "titleapp-platform",
    type: "individual",
    worker_type: "individual",
    rulesetId: null,
    rulesetSource: "raas/real-estate/sales/",
    raas_tier_0: RULES,
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

  console.log("\nDone.\n");
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
