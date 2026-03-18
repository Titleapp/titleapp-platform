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
const { validateWorkerRecord, autoFixWorkerRecord, TIER_0_DEFAULTS } = require("./workerSchema");

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
  // Aviation — Part 135/91 Operator Suite
  "AV-001": "av-cert-assistant",
  "AV-002": "av-gom-authoring",
  "AV-003": "av-regulatory-monitor",
  "AV-004": "av-aircraft-status-mel",
  "AV-005": "av-ad-sb-tracker",
  "AV-006": "av-component-tracker",
  "AV-007": "av-maintenance-logbook",
  "AV-008": "av-parts-inventory",
  "AV-009": "av-flight-duty-enforcer",
  "AV-010": "av-qualification-tracker",
  "AV-011": "av-training-records",
  "AV-012": "av-medical-tracker",
  "AV-013": "av-mission-builder",
  "AV-014": "av-frat",
  "AV-015": "av-weight-balance",
  "AV-016": "av-weather-intel",
  "AV-017": "av-flight-following",
  "AV-018": "av-safety-reporting",
  "AV-019": "av-foqa",
  "AV-020": "av-emergency-response",
  "AV-021": "av-post-flight-debrief",
  "AV-022": "av-hazard-register",
  "AV-023": "av-sms-monitor",
  "AV-024": "av-safety-officer",
  "AV-025": "av-charter-quoting",
  "AV-026": "av-billing",
  "AV-027": "av-medevac-billing",
  "AV-028": "av-customer-portal",
  "AV-029": "av-alex",
  "AV-030": "av-far-compliance",
  "AV-031": "av-drug-alcohol",
  "AV-032": "av-crew-scheduling",
  "AV-033": "av-reserve-swap",
  "AV-034": "av-airport-intel",
  "AV-035": "av-notam-intel",
  "AV-036": "av-efb-companion",
  "AV-037": "av-training-courseware",
  "AV-038": "av-crew-housing",
  // Health & EMS Education — Anchor Workers
  "HE-001": "he-curriculum-architect",
  "HE-011": "he-scenario-simulator",
  "HE-019": "he-epcr-builder",
  "HE-029": "he-protocol-reference",
  "HE-032": "he-ceu-tracker",
  "HE-037": "he-creator-analytics",
  // Aviation — Pilot Suite
  "AV-P01": "av-digital-logbook",
  "AV-P02": "av-currency-tracker",
  "AV-P03": "av-my-aircraft",
  "AV-P04": "av-training-proficiency",
  "AV-P05": "av-flight-planning",
  "AV-P06": "av-alex-personal",
  "AV-P07": "av-pc12-ng",
  // Solar Energy
  "SOL-001": "solar-sales-closer",
  "SOL-002": "solar-permit-navigator",
  "SOL-003": "solar-hoa-approval",
  "SOL-004": "solar-insurance-warranty",
  "SOL-005": "solar-easement-title",
  "SOL-006": "solar-incentive-tracker",
  "SOL-007": "solar-system-monitor",
  "SOL-008": "solar-credit-ledger",
  "SOL-009": "srec-exchange-compliance",
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
  // Health & EMS Education
  "he-curriculum-architect": "he_001_curriculum_architect_v0",
  "he-scenario-simulator": "he_011_scenario_simulator_v0",
  "he-epcr-builder": "he_019_epcr_builder_v0",
  "he-protocol-reference": "he_029_protocol_reference_v0",
  "he-ceu-tracker": "he_032_ceu_tracker_v0",
  "he-creator-analytics": "he_037_creator_analytics_v0",
  // Aviation — All Workers
  "av-cert-assistant": "av_001_cert_assistant_v0",
  "av-gom-authoring": "av_002_gom_authoring_v0",
  "av-regulatory-monitor": "av_003_regulatory_monitor_v0",
  "av-aircraft-status-mel": "av_004_aircraft_status_mel_v0",
  "av-ad-sb-tracker": "av_005_ad_sb_tracker_v0",
  "av-component-tracker": "av_006_component_tracker_v0",
  "av-maintenance-logbook": "av_007_maintenance_logbook_v0",
  "av-parts-inventory": "av_008_parts_inventory_v0",
  "av-flight-duty-enforcer": "av_009_flight_duty_enforcer_v0",
  "av-qualification-tracker": "av_010_qualification_tracker_v0",
  "av-training-records": "av_011_training_records_v0",
  "av-medical-tracker": "av_012_medical_tracker_v0",
  "av-mission-builder": "av_013_mission_builder_v0",
  "av-frat": "av_014_frat_v0",
  "av-weight-balance": "av_015_weight_balance_v0",
  "av-weather-intel": "av_016_weather_intel_v0",
  "av-flight-following": "av_017_flight_following_v0",
  "av-safety-reporting": "av_018_safety_reporting_v0",
  "av-foqa": "av_019_foqa_v0",
  "av-emergency-response": "av_020_emergency_response_v0",
  "av-post-flight-debrief": "av_021_post_flight_debrief_v0",
  "av-hazard-register": "av_022_hazard_register_v0",
  "av-sms-monitor": "av_023_sms_monitor_v0",
  "av-safety-officer": "av_024_safety_officer_v0",
  "av-charter-quoting": "av_025_charter_quoting_v0",
  "av-billing": "av_026_billing_v0",
  "av-medevac-billing": "av_027_medevac_billing_v0",
  "av-customer-portal": "av_028_customer_portal_v0",
  "av-alex": "av_029_alex_aviation_v0",
  "av-far-compliance": "av_030_far_compliance_v0",
  "av-drug-alcohol": "av_031_drug_alcohol_v0",
  "av-crew-scheduling": "av_032_crew_scheduling_v0",
  "av-reserve-swap": "av_033_reserve_swap_v0",
  "av-airport-intel": "av_034_airport_intel_v0",
  "av-notam-intel": "av_035_notam_intel_v0",
  "av-efb-companion": "av_036_efb_companion_v0",
  "av-training-courseware": "av_037_training_courseware_v0",
  "av-crew-housing": "av_038_crew_housing_v0",
  // Aviation — Pilot Suite
  "av-digital-logbook": "av_p01_digital_logbook_v0",
  "av-currency-tracker": "av_p02_currency_tracker_v0",
  "av-my-aircraft": "av_p03_my_aircraft_v0",
  "av-training-proficiency": "av_p04_training_proficiency_v0",
  "av-flight-planning": "av_p05_flight_planning_v0",
  "av-alex-personal": "av_p06_alex_personal_v0",
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
  "AV-001": "Cert Assistant",
  "AV-002": "GOM Authoring",
  "AV-004": "Aircraft Status & MEL",
  "AV-009": "Duty Enforcer",
  "AV-013": "Mission Builder",
  "AV-014": "FRAT",
  "AV-021": "Post-Flight Debrief",
  "AV-024": "Safety Officer",
  "AV-027": "Medevac Billing",
  "AV-029": "Alex — Aviation CoS",
  "AV-032": "Crew Scheduling",
  "AV-P01": "Digital Logbook",
  "AV-P02": "Currency & Medical",
  "AV-P03": "My Aircraft",
  "AV-P04": "Training & Proficiency",
  "AV-P05": "Flight Planning",
  "AV-P06": "Alex — Personal",
  "AV-P07": "PC12-NG CoPilot",
  // Health & EMS Education
  "HE-001": "Curriculum Architect",
  "HE-011": "Scenario Simulator",
  "HE-019": "ePCR Builder",
  "HE-029": "Protocol Reference",
  "HE-032": "CEU & License Tracker",
  "HE-037": "Creator Analytics",
  // Solar Energy
  "SOL-001": "Solar Sales Closer",
  "SOL-002": "Permit & Interconnection",
  "SOL-003": "HOA Solar Approval",
  "SOL-004": "Insurance & Warranty",
  "SOL-005": "Easement & Title",
  "SOL-006": "Incentive Tracker",
  "SOL-007": "System Monitor",
  "SOL-008": "Credit Ledger",
  "SOL-009": "Exchange Compliance",
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
  // Aviation — Wave 1
  "av-mission-builder": "Every mission authorized with full context — crew, aircraft, weather, risk",
  "av-flight-duty-enforcer": "Hard stops on illegal crew assignments before they reach the board",
  "av-aircraft-status-mel": "Real-time airworthiness status for every tail on the certificate",
  "av-frat": "Risk quantified before every flight — not after the incident",
  "av-crew-scheduling": "Every assignment pre-validated for legality before it reaches the board",
  "av-alex": "Your workers, orchestrated — 0500 briefing to anomaly detection",
  "av-digital-logbook": "Blockchain-verified logbook that replaces paper permanently",
  "av-currency-tracker": "Am I legal for this flight? Currency and medical — always current",
  "av-my-aircraft": "Type-specific V-speeds, W&B, checklists, and performance data",
  "av-training-proficiency": "Certificate progression, oral prep, written prep, proficiency trending",
  "av-flight-planning": "Personal FRAT, plain-language weather, NOTAM filtering, personal minimums",
  "av-alex-personal": "Your personal aviation chief of staff — briefings, nudges, reminders",
  "av-pc12-ng": "Type-rated CoPilot for the PC-12/47E — systems, SOPs, examiner prep",
  // Health & EMS Education
  "he-curriculum-architect": "Accreditation-ready programs designed by domain experts, not committees",
  "he-scenario-simulator": "Clinical scenarios that teach judgment, not just protocol recall",
  "he-epcr-builder": "NEMSIS-compliant reports that survive QA review every time",
  "he-protocol-reference": "The right protocol for your jurisdiction, your scope, your patient",
  "he-ceu-tracker": "Every CE hour tracked, every license renewal flagged before it lapses",
  "he-creator-analytics": "Know which content performs and where your subscribers come from",
  // Solar Energy
  "solar-sales-closer": "Qualify leads, calculate savings, navigate financing options",
  "solar-permit-navigator": "AHJ permits to utility interconnection — every jurisdiction",
  "solar-hoa-approval": "HOA approval backed by state solar access law",
  "solar-insurance-warranty": "Equipment warranties, policy riders, and claims tracked",
  "solar-easement-title": "Roof leases, PACE liens, and title issues handled",
  "solar-incentive-tracker": "Federal ITC to local rebates — every dollar found",
  "solar-system-monitor": "Your solar system performance, tracked permanently",
  "solar-credit-ledger": "SRECs issued as DTCs — blockchain-verified, registry-reported",
  "srec-exchange-compliance": "KYC/AML and trade verification for SREC exchange participants",
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

  // Load all catalogs
  const catalogsDir = path.join(__dirname, "../services/alex/catalogs");
  const catalogFiles = fs.readdirSync(catalogsDir).filter(f => f.endsWith(".json"));
  const allWorkers = [];
  for (const file of catalogFiles) {
    const catalog = JSON.parse(fs.readFileSync(path.join(catalogsDir, file), "utf8"));
    if (Array.isArray(catalog.workers)) {
      allWorkers.push(...catalog.workers);
    }
  }

  // Load template registry
  const { SYSTEM_TEMPLATES } = require("../services/documentEngine/templates/registry");

  // Load rulesets directory
  const rulesetsDir = path.join(__dirname, "../raas/rulesets");

  for (const worker of allWorkers) {
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

    // Auto-fix (normalizes non-approved pricing_tier to 0 for draft/waitlist)
    const fixed = autoFixWorkerRecord(record);

    // Validate
    try {
      const { record: validated, warnings } = validateWorkerRecord(fixed);
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
          notifications: validated.notifications || null,
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

// ═══════════════════════════════════════════════════════════════
//  REGISTRY SYNC — Fires on admin approval in ReviewQueue.jsx
// ═══════════════════════════════════════════════════════════════

const { validateRegistryRecord, parsePriceTier } = require("./workerSchema");

/**
 * Sync an approved worker to the live raasCatalog registry.
 * This is the ONLY path to status='live'. (P0.18)
 *
 * Called from: ReviewQueue approval → index.js admin:worker:review → here
 *
 * @param {FirebaseFirestore.Firestore} db — Firestore instance
 * @param {object} workerData — full worker data from pipeline
 * @param {string} adminUid — uid of the admin who approved
 * @returns {object} — { worker_id, status }
 */
async function syncApprovedWorker(db, workerData, adminUid) {
  const admin = require("firebase-admin");

  // Validate against registry schema
  const { record: validated } = validateRegistryRecord({
    ...workerData,
    status: "live",
    approved_by: adminUid,
    pipeline_version: workerData.pipeline_version || "v1.0",
  }, { isAdminApproval: true });

  // 1. WRITE FULL RECORD TO raasCatalog
  const workerRecord = {
    ...validated,
    status: "live",
    approved_by: adminUid,
    approved_at: admin.firestore.FieldValue.serverTimestamp(),
    pipeline_completed_at: admin.firestore.FieldValue.serverTimestamp(),
    pipeline_version: workerData.pipeline_version || "v1.0",
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("raasCatalog").doc(workerData.worker_id).set(workerRecord, { merge: true });

  // 2. UPDATE AGGREGATE COUNTERS
  const countersRef = db.doc("platform/workerCounts");
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(countersRef);
    const counts = doc.exists ? doc.data() : {};

    counts.total_live = (counts.total_live || 0) + 1;
    const vertKey = `vertical_${workerData.vertical}`;
    counts[vertKey] = (counts[vertKey] || 0) + 1;
    counts.total_all_statuses = (counts.total_all_statuses || 0) + 1;
    counts.last_updated = admin.firestore.FieldValue.serverTimestamp();

    tx.set(countersRef, counts);
  });

  // 3. TRIGGER CONTENT SYNC
  await triggerContentSync(db, workerRecord);

  // 4. NOTIFY ALEX
  await notifyAlex(db, workerRecord);

  console.log(`[workerSync] Worker ${workerData.worker_id} synced to registry. Status: live.`);
  return { worker_id: workerData.worker_id, status: "live" };
}

/**
 * Write a content sync event — triggers onContentSync Cloud Function.
 */
async function triggerContentSync(db, worker) {
  const admin = require("firebase-admin");
  await db.collection("platform").doc("contentSync").collection("events").add({
    event_type: "worker_approved",
    worker_id: worker.worker_id,
    vertical: worker.vertical,
    name: worker.name,
    price_tier: worker.price_tier,
    short_description: worker.short_description,
    status: worker.status,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Write to Alex knowledge base so she knows about the new worker.
 */
async function notifyAlex(db, worker) {
  const admin = require("firebase-admin");
  await db.collection("alex").doc("knowledge").collection("workers").doc(worker.worker_id).set({
    worker_id: worker.worker_id,
    name: worker.name,
    vertical: worker.vertical,
    price_tier: worker.price_tier,
    revenue_model: worker.revenue_model,
    short_description: worker.short_description,
    tags: worker.tags || [],
    status: worker.status,
    worker_url: worker.worker_url || null,
    monthly_price_usd: parsePriceTier(worker.price_tier),
    is_tech_fee_vertical: ["auto_dealer", "re_sales", "property_management"].includes(worker.vertical),
    added_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Deprecate a worker — removes from live, updates counters, triggers sync.
 */
async function deprecateWorker(db, workerId, adminUid) {
  const admin = require("firebase-admin");

  const workerRef = db.collection("raasCatalog").doc(workerId);
  const workerSnap = await workerRef.get();
  if (!workerSnap.exists) throw new Error(`Worker ${workerId} not found in raasCatalog`);
  const workerData = workerSnap.data();

  if (workerData.status !== "live") {
    throw new Error(`Worker ${workerId} is not live (status: ${workerData.status})`);
  }

  // Update status
  await workerRef.update({
    status: "deprecated",
    deprecated_by: adminUid,
    deprecated_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Decrement counters
  const countersRef = db.doc("platform/workerCounts");
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(countersRef);
    const counts = doc.exists ? doc.data() : {};
    counts.total_live = Math.max(0, (counts.total_live || 0) - 1);
    const vertKey = `vertical_${workerData.vertical}`;
    counts[vertKey] = Math.max(0, (counts[vertKey] || 0) - 1);
    counts.last_updated = admin.firestore.FieldValue.serverTimestamp();
    tx.set(countersRef, counts);
  });

  // Content sync event
  await db.collection("platform").doc("contentSync").collection("events").add({
    event_type: "worker_deprecated",
    worker_id: workerId,
    vertical: workerData.vertical,
    name: workerData.name,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Remove from Alex knowledge
  await db.collection("alex").doc("knowledge").collection("workers").doc(workerId).delete().catch(() => {});

  console.log(`[workerSync] Worker ${workerId} deprecated by ${adminUid}.`);
  return { worker_id: workerId, status: "deprecated" };
}

/**
 * Rebuild all counters from scratch (used after bulk seed).
 */
async function rebuildAllCounters(db) {
  const admin = require("firebase-admin");
  const snapshot = await db.collection("raasCatalog").get();
  const counts = { total_live: 0, total_all_statuses: 0 };

  for (const doc of snapshot.docs) {
    const data = doc.data();
    counts.total_all_statuses++;
    if (data.status === "live") {
      counts.total_live++;
      const vertKey = `vertical_${data.vertical}`;
      counts[vertKey] = (counts[vertKey] || 0) + 1;
    }
    const statusKey = `status_${data.status}`;
    counts[statusKey] = (counts[statusKey] || 0) + 1;
  }

  counts.last_updated = admin.firestore.FieldValue.serverTimestamp();
  await db.doc("platform/workerCounts").set(counts);
  console.log(`[workerSync] Counters rebuilt: ${counts.total_live} live, ${counts.total_all_statuses} total`);
  return counts;
}

module.exports = {
  syncCatalogWorkers,
  syncApprovedWorker,
  deprecateWorker,
  rebuildAllCounters,
  triggerContentSync,
  notifyAlex,
  MARKETPLACE_SLUG_MAP,
  RULESET_MAP,
  DISPLAY_NAME_MAP,
  HEADLINE_MAP,
};
