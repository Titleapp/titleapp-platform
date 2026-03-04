/**
 * workerSync.js — Catalog-to-Firestore sync for Digital Workers
 *
 * Reads worker data from:
 *   1. Catalog JSON (services/alex/catalogs/real-estate-development.json)
 *   2. RAAS rulesets (raas/rulesets/*.json)
 *   3. Template registry (services/documentEngine/templates/registry.js)
 *   4. System prompt files (raas/{vertical}/GLOBAL/prompts/{name}.md)
 *
 * Writes unified records to: digitalWorkers/{marketplace-slug}
 *
 * Run via: POST /v1/admin:workers:sync (requires Firebase Auth admin)
 */

const path = require("path");
const fs = require("fs");
const { validateWorkerRecord, TIER_0_DEFAULTS } = require("./workerSchema");

// ═══════════════════════════════════════════════════════════════
//  CATALOG-TO-MARKETPLACE SLUG MAPPING
// ═══════════════════════════════════════════════════════════════

// Marketplace uses shorter slugs than the catalog. Map catalog worker ID → marketplace slug.
const MARKETPLACE_SLUG_MAP = {
  "W-001": "market-research",
  "W-002": "cre-analyst",
  "W-003": "site-due-diligence",
  "W-004": "land-use-entitlement",
  "W-005": "architecture-review",
  "W-006": "engineering-review",
  "W-007": "environmental-cultural-review",
  "W-008": "energy-sustainability",
  "W-009": "accessibility-fair-housing",
  "W-010": "government-relations",
  "W-011": "fire-life-safety",
  "W-012": "permit-submission",
  "W-013": "mortgage-senior-debt",
  "W-014": "mezzanine-preferred-equity",
  "W-015": "construction-lending",
  "W-016": "capital-stack-optimizer",
  "W-017": "tax-credit-incentive",
  "W-018": "crowdfunding-regd",
  "W-019": "investor-relations",
  "W-020": "opportunity-zone",
  "W-021": "construction-manager",
  "W-022": "construction-draws",
  "W-023": "bid-procurement",
  "W-024": "mep-coordination",
  "W-025": "insurance-risk",
  "W-026": "quality-control",
  "W-027": "lease-up-marketing",
  "W-028": "safety-osha",
  "W-029": "insurance-risk",
  "W-030": "appraisal-valuation",
  "W-031": "property-management",
  "W-032": "tenant-screening",
  "W-033": "property-management",
  "W-034": "rent-roll-revenue",
  "W-035": "maintenance-work-order",
  "W-036": "utility-management",
  "W-037": "hoa-association",
  "W-038": "warranty-defect",
  "W-039": "accounting",
  "W-040": "tax-assessment",
  "W-041": "vendor-contract",
  "W-042": "disposition-preparation",
  "W-043": "exchange-1031",
  "W-044": "title-escrow",
  "W-045": "legal-contracts",
  "W-046": "entity-formation",
  "W-047": "compliance-tracker",
  "W-048": "chief-of-staff",
  "W-049": "property-insurance",
  "W-050": "disposition-marketing",
  "W-051": "investor-reporting",
  "W-052": "debt-service",
};

// Ruleset ID mapping: marketplace slug → ruleset file name
const RULESET_MAP = {
  "market-research": "market_research_v0",
  "cre-analyst": "cre_deal_screen_v0",
  "architecture-review": "architecture_design_review_v0",
  "engineering-review": "engineering_review_v0",
  "environmental-cultural-review": "environmental_cultural_review_v0",
  "energy-sustainability": "energy_sustainability_v0",
  "accessibility-fair-housing": "accessibility_fair_housing_v0",
  "government-relations": "government_relations_v0",
  "fire-life-safety": "fire_life_safety_v0",
  "opportunity-zone": "opportunity_zone_v0",
  "appraisal-valuation": "appraisal_valuation_review_v0",
  "tenant-screening": "tenant_screening_v0",
  "rent-roll-revenue": "rent_roll_revenue_v0",
  "maintenance-work-order": "maintenance_work_order_v0",
  "utility-management": "utility_management_v0",
  "hoa-association": "hoa_association_v0",
  "warranty-defect": "warranty_defect_v0",
  "tax-assessment": "tax_assessment_v0",
  "vendor-contract": "vendor_contract_v0",
  "disposition-preparation": "disposition_preparation_v0",
  "exchange-1031": "exchange_1031_v0",
  "entity-formation": "entity_formation_v0",
  "property-insurance": "property_insurance_risk_v0",
  "disposition-marketing": "disposition_marketing_v0",
  "investor-reporting": "investor_reporting_distributions_v0",
  "debt-service": "debt_service_loan_compliance_v0",
  "construction-manager": "construction_manager_v0",
  "construction-lending": "construction_lending_v0",
  "capital-stack-optimizer": "capital_stack_optimizer_v0",
  "chief-of-staff": "chief_of_staff_v0",
  "bid-procurement": "bid_procurement_v0",
  "insurance-risk": "insurance_risk_v0",
  "quality-control": "quality_control_v0",
  "safety-osha": "safety_osha_v0",
  "mep-coordination": "mep_coordination_v0",
  "construction-draws": "construction_draw_v0",
};

// Display name overrides (marketplace uses shorter names)
const DISPLAY_NAME_MAP = {
  "W-001": "Market Research",
  "W-002": "CRE Deal Analyst",
  "W-010": "Government Relations",
  "W-030": "Appraisal & Valuation",
  "W-034": "Rent Roll & Revenue",
  "W-037": "HOA & Association",
  "W-038": "Warranty & Defect",
  "W-041": "Vendor & Contract",
  "W-042": "Disposition Prep",
  "W-048": "Alex — Chief of Staff",
  "W-050": "Disposition Marketing",
  "W-051": "Investor Reporting",
};

// Headline overrides from App.jsx WORKER_DETAIL_CONTENT (first 80 chars)
const HEADLINE_MAP = {
  "market-research": "Know the market before you commit capital",
  "cre-analyst": "Evidence-first deal analysis in minutes",
  "architecture-review": "Plans reviewed before they reach the plan check counter",
  "engineering-review": "Civil, structural, and traffic — coordinated, not siloed",
  "environmental-cultural-review": "Phase I through NEPA — nothing buried in the file",
  "energy-sustainability": "Green building compliance without the guesswork",
  "accessibility-fair-housing": "Accessibility and Fair Housing — documented, not assumed",
  "government-relations": "Council meetings, public comment, and entitlement strategy in one place",
  "fire-life-safety": "Fire code and life safety — reviewed before the marshal arrives",
  "opportunity-zone": "Opportunity Zone compliance that survives an audit",
  "appraisal-valuation": "Valuations you can defend to any stakeholder",
  "tenant-screening": "Screen tenants consistently, document everything",
  "rent-roll-revenue": "Rent roll accuracy you can take to closing",
  "maintenance-work-order": "Every work order tracked from request to close-out",
  "utility-management": "Utility costs visible, benchmarked, and optimized",
  "hoa-association": "HOA governance and compliance — every vote, every dollar",
  "warranty-defect": "Warranty claims tracked before the statute runs",
  "tax-assessment": "Property taxes reviewed before you overpay",
  "vendor-contract": "Vendors qualified, contracts managed, performance tracked",
  "disposition-preparation": "Sale-ready in weeks, not months",
  "exchange-1031": "1031 exchange timelines that never slip",
  "entity-formation": "The right entity structure for the deal",
  "property-insurance": "Coverage verified, claims tracked, risk quantified",
  "disposition-marketing": "Buyers found, materials polished, offers managed",
  "investor-reporting": "LP reporting that builds confidence every quarter",
  "debt-service": "Loan payments, covenants, and compliance — nothing missed",
  "construction-manager": "Every dollar, day, and trade — tracked",
  "construction-lending": "Term sheets decoded, draws modeled, conversion tracked",
  "capital-stack-optimizer": "The optimal capital structure for every deal",
  "chief-of-staff": "Your workers, orchestrated",
  "investor-relations": "LP compliance, reporting, and capital calls — handled",
  "construction-draws": "Draw requests validated against budget and schedule",
  "bid-procurement": "Bids compared, scopes verified, awards documented",
  "insurance-risk": "Coverage gaps found before claims happen",
  "quality-control": "Inspections tracked, defects documented, standards enforced",
  "safety-osha": "OSHA compliance from site-specific plan to daily logs",
  "mep-coordination": "MEP systems coordinated before they clash in the field",
};

// ═══════════════════════════════════════════════════════════════
//  SYNC FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Sync catalog workers to Firestore digitalWorkers/{slug} collection.
 *
 * @param {FirebaseFirestore.Firestore} db — Firestore instance
 * @param {object} [opts] — options
 * @param {boolean} [opts.dryRun=false] — if true, validate but don't write
 * @param {string[]} [opts.workerIds] — sync specific worker IDs only (e.g. ["W-002", "W-048"])
 * @returns {object} — { synced, skipped, failed, warnings, details }
 */
async function syncCatalogWorkers(db, opts = {}) {
  const { dryRun = false, workerIds = null } = opts;
  const results = { synced: 0, skipped: 0, failed: 0, warnings: [], details: [] };

  // Load catalog
  const catalogPath = path.join(__dirname, "../services/alex/catalogs/real-estate-development.json");
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

  // Load template registry
  const { SYSTEM_TEMPLATES } = require("../services/documentEngine/templates/registry");

  // Load rulesets directory
  const rulesetsDir = path.join(__dirname, "../raas/rulesets");

  for (const worker of catalog.workers) {
    // Filter to specific workers if requested
    if (workerIds && !workerIds.includes(worker.id)) continue;

    const marketplaceSlug = MARKETPLACE_SLUG_MAP[worker.id];
    if (!marketplaceSlug) {
      results.skipped++;
      results.details.push({ id: worker.id, status: "skipped", reason: "No marketplace slug mapping" });
      continue;
    }

    // Load ruleset if available
    const rulesetId = RULESET_MAP[marketplaceSlug];
    let ruleset = null;
    let tier1Rules = [];
    let tier2Rules = [];
    let documentTemplates = [];

    if (rulesetId) {
      try {
        const rulesetPath = path.join(rulesetsDir, `${rulesetId}.json`);
        ruleset = JSON.parse(fs.readFileSync(rulesetPath, "utf8"));
        tier1Rules = (ruleset.hard_stops || []).map(r => `${r.id}: ${r.label}`);
        tier2Rules = (ruleset.soft_flags || []).map(r => `${r.id}: ${r.label}`);
        documentTemplates = ruleset.outputs || [];
      } catch (e) {
        results.warnings.push(`${worker.id}: Ruleset ${rulesetId} load failed: ${e.message}`);
      }
    }

    // If tier1 is too short, supplement from catalog compliance data
    if (tier1Rules.length < 3 && worker.tier1Compliance) {
      for (const rule of worker.tier1Compliance) {
        if (!tier1Rules.includes(rule)) tier1Rules.push(rule);
      }
    }

    // Build referral triggers from catalog
    const referralTriggers = (worker.referrals || []).map(r =>
      `${r.event} → ${r.routesTo}`
    );

    // Resolve display name
    const displayName = DISPLAY_NAME_MAP[worker.id] || worker.name;

    // Resolve headline
    const headline = HEADLINE_MAP[marketplaceSlug] || worker.capabilitySummary || displayName;

    // Determine status — use catalog status, map "development" → "draft"
    let status = worker.status || "waitlist";
    if (status === "development") status = "draft";

    // Build the unified record
    const record = {
      worker_id: marketplaceSlug,
      display_name: displayName,
      headline,
      suite: worker.suite,
      worker_type: worker.type === "orchestrator" ? "orchestrator" : worker.type,
      pricing_tier: worker.pricing.monthly,
      raas_tier_0: TIER_0_DEFAULTS,
      raas_tier_1: tier1Rules,
      raas_tier_2: tier2Rules,
      raas_tier_3: [],
      vault_reads: (worker.vault && worker.vault.reads) || [],
      vault_writes: (worker.vault && worker.vault.writes) || [],
      referral_triggers: referralTriggers,
      document_templates: documentTemplates,
      landing_page_slug: `workers/${marketplaceSlug}`,
      status,
    };

    // Validate
    try {
      const { record: validated, warnings } = validateWorkerRecord(record);
      if (warnings.length > 0) {
        results.warnings.push(`${worker.id} (${marketplaceSlug}): ${warnings.join("; ")}`);
      }

      if (!dryRun) {
        // Write to Firestore
        await db.doc(`digitalWorkers/${marketplaceSlug}`).set({
          ...validated,
          // Additional metadata
          catalogId: worker.id,
          catalogSlug: worker.slug,
          catalogPhase: worker.phase,
          temporalType: worker.temporalType || "always_on",
          capabilitySummary: worker.capabilitySummary || "",
          alexRegistration: worker.alexRegistration || null,
          rulesetId: rulesetId || null,
          syncedAt: new Date().toISOString(),
        });
      }

      results.synced++;
      results.details.push({
        id: worker.id,
        slug: marketplaceSlug,
        status: dryRun ? "validated" : "synced",
        tier1Count: validated.raas_tier_1.length,
        tier2Count: validated.raas_tier_2.length,
        templateCount: validated.document_templates.length,
        vaultReads: validated.vault_reads.length,
        vaultWrites: validated.vault_writes.length,
      });
    } catch (valErr) {
      results.failed++;
      results.details.push({
        id: worker.id,
        slug: marketplaceSlug,
        status: "failed",
        errors: valErr.validationErrors || [valErr.message],
      });
    }
  }

  return results;
}

module.exports = { syncCatalogWorkers, MARKETPLACE_SLUG_MAP, RULESET_MAP };
