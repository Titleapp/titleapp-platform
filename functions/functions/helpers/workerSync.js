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
  "W-029": "mep-systems",
  "W-030": "appraisal-valuation",
  "W-031": "lease-up",
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
  "AV-P08": "av-king-air-b200",
  "AV-P09": "av-king-air-350",
  "AV-P10": "av-king-air-c90",
  "AV-P11": "av-caravan-208b",
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
  // Web3
  "W3-001": "w3-token-economics",
  "W3-002": "w3-nft-launch",
  "W3-003": "w3-regulatory-framing",
  "W3-004": "w3-smart-contract-audit",
  "W3-005": "w3-treasury-reporter",
  "W3-006": "w3-governance-docs",
  "W3-007": "w3-telegram-community",
  "W3-008": "w3-social-narrative",
  "W3-009": "w3-sentiment-monitor",
  "W3-010": "w3-community-ir",
  "W3-011": "w3-alex-web3",
  "W3-012": "w3-token-code-generator",
  "W3-013": "w3-contract-auditor",
  // Auto Dealer
  "AD-001": "ad-dealer-license-monitor",
  "AD-002": "ad-ftc-safeguards",
  "AD-003": "ad-auction-intelligence",
  "AD-004": "ad-trade-in-valuation",
  "AD-005": "ad-vehicle-history-recon",
  "AD-006": "ad-market-pricing",
  "AD-007": "ad-vdp-photo-compliance",
  "AD-008": "ad-incentive-rebate",
  "AD-009": "ad-lead-management",
  "AD-010": "ad-desking-deal",
  "AD-011": "ad-ofac-screening",
  "AD-012": "ad-fi-menu-builder",
  "AD-013": "ad-fi-compliance",
  "AD-014": "ad-lender-matching",
  "AD-015": "ad-reserve-chargeback",
  "AD-016": "ad-ro-writer",
  "AD-017": "ad-service-mpi",
  "AD-018": "ad-parts-inventory",
  "AD-019": "ad-warranty-claims",
  "AD-020": "ad-declined-service",
  "AD-021": "ad-equity-mining",
  "AD-022": "ad-csi-reviews",
  "AD-023": "ad-conquest-loyalty",
  "AD-024": "ad-cars-rule",
  "AD-025": "ad-tcpa-compliance",
  "AD-026": "ad-hr-payroll",
  "AD-027": "ad-dms-integration",
  "AD-028": "ad-daily-report",
  "AD-029": "ad-alex",
  // Government
  "GOV-000": "gov-jurisdiction-onboarding",
  "GOV-001": "gov-title-registration",
  "GOV-002": "gov-registration-renewal",
  "GOV-003": "gov-license-issuance",
  "GOV-004": "gov-vin-verification",
  "GOV-005": "gov-lien-processing",
  "GOV-006": "gov-emissions-compliance",
  "GOV-007": "gov-dealer-licensing",
  "GOV-008": "gov-salvage-rebuilt-title",
  "GOV-009": "gov-fleet-registration",
  "GOV-010": "gov-cdl-processing",
  "GOV-011": "gov-dmv-correspondence",
  "GOV-012": "gov-hearings-appeals",
  "GOV-013": "gov-fraud-detection",
  "GOV-014": "gov-revenue-reconciliation",
  "GOV-015": "gov-customer-queue",
  "GOV-016": "gov-permit-intake",
  "GOV-017": "gov-plan-review",
  "GOV-018": "gov-zoning-verification",
  "GOV-019": "gov-contractor-license-verify",
  "GOV-020": "gov-fire-prevention-review",
  "GOV-021": "gov-environmental-review",
  "GOV-022": "gov-variance-cup",
  "GOV-023": "gov-subdivision-review",
  "GOV-024": "gov-impact-fee-calc",
  "GOV-025": "gov-code-enforcement",
  "GOV-026": "gov-certificate-occupancy",
  "GOV-027": "gov-sign-permit",
  "GOV-028": "gov-demolition-permit",
  "GOV-029": "gov-grading-excavation",
  "GOV-030": "gov-row-encroachment",
  "GOV-031": "gov-building-inspector",
  "GOV-032": "gov-electrical-inspector",
  "GOV-033": "gov-plumbing-inspector",
  "GOV-034": "gov-mechanical-inspector",
  "GOV-035": "gov-fire-inspector",
  "GOV-036": "gov-structural-inspector",
  "GOV-037": "gov-elevator-inspector",
  "GOV-038": "gov-health-food-inspector",
  "GOV-039": "gov-ada-accessibility",
  "GOV-040": "gov-environmental-compliance",
  "GOV-041": "gov-document-recording",
  "GOV-042": "gov-deed-processing",
  "GOV-043": "gov-mortgage-recording",
  "GOV-044": "gov-lien-filing",
  "GOV-045": "gov-ucc-filing",
  "GOV-046": "gov-plat-map-recording",
  "GOV-047": "gov-vital-records",
  "GOV-048": "gov-notary-administration",
  "GOV-049": "gov-erecording-gateway",
  "GOV-050": "gov-title-search",
  "GOV-051": "gov-easement-row-recording",
  "GOV-052": "gov-lis-pendens-court-orders",
  "GOV-053": "gov-tax-lien-assessment",
  "GOV-054": "gov-redaction-privacy",
  "GOV-055": "gov-gis-parcel-mapping",
  "GOV-056": "gov-document-preservation",
  "GOV-057": "gov-alex-government-cos",
  // Title & Escrow
  "ESC-001": "esc-escrow-locker",
  "ESC-002": "esc-wire-fraud-prevention",
  "ESC-003": "esc-title-search-commitment",
  "ESC-004": "esc-lien-clearance",
  "ESC-005": "esc-disclosure-package",
  "ESC-006": "esc-closing-disclosure",
  "ESC-007": "esc-firpta-1031-exchange",
  "ESC-008": "esc-commission-reconciliation",
  "ESC-009": "esc-hoa-estoppel",
  "ESC-010": "esc-status-portal",
  "ESC-011": "esc-recording-monitor",
  "ESC-012": "esc-alex-title-escrow",
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
  // Web3
  "w3-token-code-generator": "w3_012_token_code_generator_v0",
  "w3-contract-auditor": "w3_013_contract_auditor_v0",
  // Government
  "gov-jurisdiction-onboarding": "gov_000_jurisdiction_onboarding_v0",
  "gov-title-registration": "gov_001_title_registration_v0",
  "gov-registration-renewal": "gov_002_registration_renewal_v0",
  "gov-license-issuance": "gov_003_license_issuance_v0",
  "gov-vin-verification": "gov_004_vin_verification_v0",
  "gov-lien-processing": "gov_005_lien_processing_v0",
  "gov-emissions-compliance": "gov_006_emissions_compliance_v0",
  "gov-dealer-licensing": "gov_007_dealer_licensing_v0",
  "gov-salvage-rebuilt-title": "gov_008_salvage_rebuilt_title_v0",
  "gov-fleet-registration": "gov_009_fleet_registration_v0",
  "gov-cdl-processing": "gov_010_cdl_processing_v0",
  "gov-dmv-correspondence": "gov_011_dmv_correspondence_v0",
  "gov-hearings-appeals": "gov_012_hearings_appeals_v0",
  "gov-fraud-detection": "gov_013_fraud_detection_v0",
  "gov-revenue-reconciliation": "gov_014_revenue_reconciliation_v0",
  "gov-customer-queue": "gov_015_customer_queue_v0",
  "gov-permit-intake": "gov_016_permit_intake_v0",
  "gov-plan-review": "gov_017_plan_review_v0",
  "gov-zoning-verification": "gov_018_zoning_verification_v0",
  "gov-contractor-license-verify": "gov_019_contractor_license_verify_v0",
  "gov-fire-prevention-review": "gov_020_fire_prevention_review_v0",
  "gov-environmental-review": "gov_021_environmental_review_v0",
  "gov-variance-cup": "gov_022_variance_cup_v0",
  "gov-subdivision-review": "gov_023_subdivision_review_v0",
  "gov-impact-fee-calc": "gov_024_impact_fee_calc_v0",
  "gov-code-enforcement": "gov_025_code_enforcement_v0",
  "gov-certificate-occupancy": "gov_026_certificate_occupancy_v0",
  "gov-sign-permit": "gov_027_sign_permit_v0",
  "gov-demolition-permit": "gov_028_demolition_permit_v0",
  "gov-grading-excavation": "gov_029_grading_excavation_v0",
  "gov-row-encroachment": "gov_030_row_encroachment_v0",
  "gov-building-inspector": "gov_031_building_inspector_v0",
  "gov-electrical-inspector": "gov_032_electrical_inspector_v0",
  "gov-plumbing-inspector": "gov_033_plumbing_inspector_v0",
  "gov-mechanical-inspector": "gov_034_mechanical_inspector_v0",
  "gov-fire-inspector": "gov_035_fire_inspector_v0",
  "gov-structural-inspector": "gov_036_structural_inspector_v0",
  "gov-elevator-inspector": "gov_037_elevator_inspector_v0",
  "gov-health-food-inspector": "gov_038_health_food_inspector_v0",
  "gov-ada-accessibility": "gov_039_ada_accessibility_v0",
  "gov-environmental-compliance": "gov_040_environmental_compliance_v0",
  "gov-document-recording": "gov_041_document_recording_v0",
  "gov-deed-processing": "gov_042_deed_processing_v0",
  "gov-mortgage-recording": "gov_043_mortgage_recording_v0",
  "gov-lien-filing": "gov_044_lien_filing_v0",
  "gov-ucc-filing": "gov_045_ucc_filing_v0",
  "gov-plat-map-recording": "gov_046_plat_map_recording_v0",
  "gov-vital-records": "gov_047_vital_records_v0",
  "gov-notary-administration": "gov_048_notary_administration_v0",
  "gov-erecording-gateway": "gov_049_erecording_gateway_v0",
  "gov-title-search": "gov_050_title_search_v0",
  "gov-easement-row-recording": "gov_051_easement_row_recording_v0",
  "gov-lis-pendens-court-orders": "gov_052_lis_pendens_court_orders_v0",
  "gov-tax-lien-assessment": "gov_053_tax_lien_assessment_v0",
  "gov-redaction-privacy": "gov_054_redaction_privacy_v0",
  "gov-gis-parcel-mapping": "gov_055_gis_parcel_mapping_v0",
  "gov-document-preservation": "gov_056_document_preservation_v0",
  "gov-alex-government-cos": "gov_057_alex_government_cos_v0",
  // Title & Escrow
  "esc-escrow-locker": "esc_001_escrow_locker_v0",
  "esc-wire-fraud-prevention": "esc_002_wire_fraud_prevention_v0",
  "esc-title-search-commitment": "esc_003_title_search_commitment_v0",
  "esc-lien-clearance": "esc_004_lien_clearance_v0",
  "esc-disclosure-package": "esc_005_disclosure_package_v0",
  "esc-closing-disclosure": "esc_006_closing_disclosure_v0",
  "esc-firpta-1031-exchange": "esc_007_firpta_1031_exchange_v0",
  "esc-commission-reconciliation": "esc_008_commission_reconciliation_v0",
  "esc-hoa-estoppel": "esc_009_hoa_estoppel_v0",
  "esc-status-portal": "esc_010_status_portal_v0",
  "esc-recording-monitor": "esc_011_recording_monitor_v0",
  "esc-alex-title-escrow": "esc_012_alex_title_escrow_v0",
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
  "AV-P08": "King Air B200 CoPilot",
  "AV-P09": "King Air 350 CoPilot",
  "AV-P10": "King Air C90 CoPilot",
  "AV-P11": "Caravan 208B CoPilot",
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
  // Web3
  "W3-001": "Token Economics Modeler",
  "W3-002": "NFT Launch Strategist",
  "W3-003": "Regulatory Framing",
  "W3-004": "Smart Contract Audit Prep",
  "W3-005": "Treasury Transparency",
  "W3-006": "Governance Documentation",
  "W3-007": "Telegram Community Manager",
  "W3-008": "Social Narrative",
  "W3-009": "Sentiment Monitor",
  "W3-010": "Community IR & Announcements",
  "W3-011": "Alex \u2014 Web3 Chief of Staff",
  "W3-012": "Token Code Generator",
  "W3-013": "Token Contract Auditor",
  // Auto Dealer
  "AD-001": "Dealer License Monitor",
  "AD-002": "FTC Safeguards Compliance",
  "AD-003": "Auction Intelligence",
  "AD-004": "Trade-In Valuation",
  "AD-005": "Vehicle History & Recon",
  "AD-006": "Market Pricing Intelligence",
  "AD-007": "VDP & Photo Compliance",
  "AD-008": "Incentive & Rebate Tracker",
  "AD-009": "Lead Management",
  "AD-010": "Desking & Deal Structure",
  "AD-011": "OFAC & Red Flags",
  "AD-012": "F&I Menu Builder",
  "AD-013": "F&I Compliance Monitor",
  "AD-014": "Lender Matching",
  "AD-015": "Reserve & Chargeback Tracker",
  "AD-016": "RO Writer Assist",
  "AD-017": "Service MPI & Trade Flag",
  "AD-018": "Parts Inventory & Returns",
  "AD-019": "Warranty Claims Optimizer",
  "AD-020": "Declined Service Follow-Up",
  "AD-021": "Equity Mining & Retention",
  "AD-022": "CSI & Review Management",
  "AD-023": "Conquest & Loyalty Campaigns",
  "AD-024": "FTC CARS Rule Monitor",
  "AD-025": "TCPA Compliance",
  "AD-026": "HR & Payroll Compliance",
  "AD-027": "DMS Integration Monitor",
  "AD-028": "Daily Gross & Velocity Report",
  "AD-029": "Alex \u2014 Auto Dealer CoS",
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
  "av-king-air-b200": "Your King Air B200 CoPilot. Every system. Every limitation. Every procedure.",
  "av-king-air-350": "Your King Air 350 CoPilot. Built for the aircraft that never stops working.",
  "av-king-air-c90": "Your King Air C90 CoPilot. The trainer and the workhorse.",
  "av-caravan-208b": "Your Caravan CoPilot. The workhorse deserves a great CoPilot.",
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
  // Web3
  "w3-token-economics": "Token supply, distribution, and vesting — modeled before you launch",
  "w3-nft-launch": "Mint strategy, pricing, and distribution — ready for launch day",
  "w3-regulatory-framing": "Legal framing that keeps your project off the wrong side of the Howey Test",
  "w3-smart-contract-audit": "Audit-ready contracts before the auditor shows up",
  "w3-treasury-reporter": "Treasury balances transparent to your community, every cycle",
  "w3-governance-docs": "Governance proposals, votes, and documentation — all on the record",
  "w3-telegram-community": "Your Telegram community managed 24/7 with compliance guardrails",
  "w3-social-narrative": "Social narrative that builds trust without making promises",
  "w3-sentiment-monitor": "Community sentiment tracked in real time — before it becomes a problem",
  "w3-community-ir": "Holder communications and project updates — compliant, on-brand, on-time",
  "w3-alex-web3": "Your Web3 project, orchestrated — compliance to community",
  "w3-token-code-generator": "Production-ready token contract code — Solana SPL and EVM ERC-20 — with deployment scripts and security checks",
  "w3-contract-auditor": "Automated security audit for token contracts — vulnerability detection, rugpull patterns, severity-graded findings",
  // Auto Dealer
  "ad-dealer-license-monitor": "Dealer license expiry, DMV renewals, bond compliance — tracked across all states",
  "ad-ftc-safeguards": "FTC Safeguards Rule gaps found and remediated before the audit",
  "ad-auction-intelligence": "Auction sourcing, market comp, and acquisition targeting in one worker",
  "ad-trade-in-valuation": "Real-time trade appraisal against KBB and Manheim — counter-offer ready",
  "ad-vehicle-history-recon": "Carfax, recon cost, and retail-ready timeline — before the car hits the lot",
  "ad-market-pricing": "Competitive pricing, days-on-lot alerts, and markdown timing",
  "ad-vdp-photo-compliance": "Every VDP checked for photo count, price accuracy, and description quality",
  "ad-incentive-rebate": "OEM incentives, regional rebates, and stacking rules — always current",
  "ad-lead-management": "Internet leads routed in 90 seconds, follow-up cadence enforced",
  "ad-desking-deal": "Deal structure, payment options, and profit threshold — calculated before the handshake",
  "ad-ofac-screening": "OFAC, Red Flags Rule, and military lending — screened on every deal",
  "ad-fi-menu-builder": "Compliant F&I menu built from deal data with penetration tracking",
  "ad-fi-compliance": "Every product verified at published price — ECOA monitoring and audit trail",
  "ad-lender-matching": "Best lender for the deal — approval status and stipulations tracked",
  "ad-reserve-chargeback": "F&I reserve tracked, chargeback risk flagged, early payoffs alerted",
  "ad-ro-writer": "Op codes suggested, declined services flagged, labor time monitored",
  "ad-service-mpi": "When repair cost exceeds vehicle value — service-to-sales trigger fires",
  "ad-parts-inventory": "Parts on-hand, warranty return deadlines, and aging inventory flagged",
  "ad-warranty-claims": "Op code optimization, claim status, and rejection pattern detection",
  "ad-declined-service": "Declined services re-engaged at 3, 14, 30, and 60 days automatically",
  "ad-equity-mining": "Customer equity positions monitored — pull-ahead opportunities flagged",
  "ad-csi-reviews": "CSI scores monitored, reviews requested, complaints routed before they post",
  "ad-conquest-loyalty": "Conquest targets identified, loyalty outreach managed, campaign ROI tracked",
  "ad-cars-rule": "FTC CARS Rule compliance tracked — prohibited dealer practices flagged",
  "ad-tcpa-compliance": "Text and call consent, suppression lists, and opt-out compliance managed",
  "ad-hr-payroll": "Dealer HR compliance, wage/hour, and commissioned sales comp rules",
  "ad-dms-integration": "Reynolds, CDK, and Dealertrack data quality monitored for integration errors",
  "ad-daily-report": "Daily and weekly gross reporting by department with trend alerts",
  "ad-alex": "Your dealership, orchestrated — ops briefing to pricing recommendations",
};

// Catalog vertical → Firestore vertical (matches frontend VERTICAL_MAP firestoreValues)
const CATALOG_VERTICAL_MAP = {
  "auto_dealer": "auto_dealer",
  "aviation": "aviation",
  "real-estate-development": "real_estate_development",
  "solar_energy": "solar_vpp",
  "web3": "web3",
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
      // Attach normalized vertical from catalog root to each worker
      const catalogVertical = CATALOG_VERTICAL_MAP[catalog.vertical] || catalog.vertical || "";
      for (const w of catalog.workers) {
        w._vertical = catalogVertical;
      }
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

    // Determine status — honor catalog status field (Memo 43.5a Step 4)
    // STATUS_MAP is the canonical mapping. Never assume live.
    const STATUS_MAP = { live: "live", waitlist: "waitlist", development: "draft" };
    const catalogStatus = worker.status || "waitlist";
    let status = STATUS_MAP[catalogStatus] || "waitlist";

    // Preserve existing Firestore status for fields set outside sync
    // (raasStatus, connectors, etc. are never overwritten by sync)
    if (!dryRun) {
      try {
        const existingSnap = await db.doc(`digitalWorkers/${marketplaceSlug}`).get();
        if (existingSnap.exists) {
          const existingStatus = existingSnap.data().status;
          if (existingStatus && existingStatus !== status) {
            console.log(`[workerSync] ${marketplaceSlug} status change: ${existingStatus} → ${status}`);
          }
          // Preserve live status — never demote a live worker via sync
          if (existingStatus === "live" && status === "waitlist") {
            status = "live";
            console.log(`[workerSync] ${marketplaceSlug} preserving live status (catalog says waitlist)`);
          }
        }
      } catch (_) { /* ignore — use catalog status */ }
    }

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
      // CoPilot Mode Framework fields — pass through from catalog
      modeAware: worker.modeAware || false,
      modes: worker.modes || [],
      modeTiers: worker.modeTiers || null,
      highRisk: worker.highRisk || false,
      groundUseOnly: worker.groundUseOnly || false,
      documentHierarchy: worker.documentHierarchy || ["titleapp_baseline", "public_regulatory"],
      documentChecklist: worker.documentChecklist || [],
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
          // Vertical (for catalog:byVertical and leaderboard queries)
          vertical: worker._vertical || "",
          // Additional metadata
          catalogId: worker.id,
          catalogSlug: worker.slug,
          catalogPhase: worker.phase,
          notifications: validated.notifications || null,
          temporalType: worker.temporalType || "always_on",
          capabilitySummary: worker.capabilitySummary || "",
          alexRegistration: worker.alexRegistration || null,
          rulesetId: rulesetId || null,
          // CoPilot Mode Framework fields
          modeAware: validated.modeAware || false,
          modes: validated.modes || [],
          modeTiers: validated.modeTiers || null,
          highRisk: validated.highRisk || false,
          groundUseOnly: validated.groundUseOnly || false,
          documentHierarchy: validated.documentHierarchy || ["titleapp_baseline", "public_regulatory"],
          documentChecklist: validated.documentChecklist || [],
          syncedAt: new Date().toISOString(),
        }, { merge: true });
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
  CATALOG_VERTICAL_MAP,
};
