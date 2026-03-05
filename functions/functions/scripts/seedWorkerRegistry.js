#!/usr/bin/env node
/**
 * seedWorkerRegistry.js — Bulk seed pre-approved workers into raasCatalog
 *
 * One-time seed for the master worker catalog (Sessions 24-26).
 * Every worker here was fully spec'd. After this seed, ALL new workers
 * must pass the full Worker #1 pipeline. No exceptions. (P0.18)
 *
 * Usage:
 *   cd functions/functions
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json node scripts/seedWorkerRegistry.js
 *
 * Or via Cloud Function:
 *   POST /v1/admin:registry:seed (requires Firebase Auth admin)
 */

"use strict";

const admin = require("firebase-admin");

// Initialize if running standalone
if (!admin.apps.length) {
  admin.initializeApp();
}

function getDb() { return admin.firestore(); }

// ═══════════════════════════════════════════════════════════════
//  AUTO DEALER — 29 workers
// ═══════════════════════════════════════════════════════════════

const AUTO_DEALER_WORKERS = [
  { worker_id: "AD-001", name: "Dealer License Monitor", vertical: "auto_dealer", price_tier: "$29", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Tracks dealer license expiry, DMV renewals, bond compliance across all states", phase: "Phase 0: Setup & Licensing", phase_number: 0, tags: ["compliance", "licensing"] },
  { worker_id: "AD-002", name: "FTC Safeguards Compliance", vertical: "auto_dealer", price_tier: "$49", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Monitors FTC Safeguards Rule gaps, generates remediation plan, audit trail", phase: "Phase 0: Setup & Licensing", phase_number: 0, tags: ["compliance", "FTC"] },
  { worker_id: "AD-003", name: "Auction Intelligence", vertical: "auto_dealer", price_tier: "$49", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Sources auction inventory, compares market values, recommends acquisition targets", phase: "Phase 1: Inventory Acquisition", phase_number: 1, tags: ["inventory", "acquisition"] },
  { worker_id: "AD-004", name: "Trade-In Valuation", vertical: "auto_dealer", price_tier: "$29", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Real-time trade appraisal against KBB/Manheim, generates counter-offer", phase: "Phase 1: Inventory Acquisition", phase_number: 1, tags: ["inventory", "valuation"] },
  { worker_id: "AD-005", name: "Vehicle History & Recon", vertical: "auto_dealer", price_tier: "$29", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Pulls Carfax/AutoCheck, estimates recon cost, sets retail-ready timeline", phase: "Phase 1: Inventory Acquisition", phase_number: 1, tags: ["inventory", "compliance"] },
  { worker_id: "AD-006", name: "Market Pricing Intelligence", vertical: "auto_dealer", price_tier: "$49", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Competitive pricing analysis, days-on-lot alerts, markdown recommendations", phase: "Phase 2: Merchandising & Pricing", phase_number: 2, tags: ["pricing", "intelligence"] },
  { worker_id: "AD-007", name: "VDP & Photo Compliance", vertical: "auto_dealer", price_tier: "$29", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Monitors vehicle detail pages for photo count, price accuracy, description quality", phase: "Phase 2: Merchandising & Pricing", phase_number: 2, tags: ["compliance", "marketing"] },
  { worker_id: "AD-008", name: "Incentive & Rebate Tracker", vertical: "auto_dealer", price_tier: "$29", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Tracks OEM incentives, regional rebates, stacking rules by vehicle and buyer", phase: "Phase 2: Merchandising & Pricing", phase_number: 2, tags: ["pricing", "revenue"] },
  { worker_id: "AD-009", name: "Lead Management & Speed-to-Lead", vertical: "auto_dealer", price_tier: "$49", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Routes internet leads, triggers 90-second response, tracks follow-up cadence", phase: "Phase 3: Sales & Desking", phase_number: 3, tags: ["sales", "leads"] },
  { worker_id: "AD-010", name: "Desking & Deal Structure", vertical: "auto_dealer", price_tier: "$49", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Structures deal, calculates payment options, flags profit below threshold", phase: "Phase 3: Sales & Desking", phase_number: 3, tags: ["sales", "compliance"] },
  { worker_id: "AD-011", name: "OFAC & Red Flags Screening", vertical: "auto_dealer", price_tier: "$29", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Screens every customer against OFAC, Red Flags Rule, military lending", phase: "Phase 3: Sales & Desking", phase_number: 3, tags: ["compliance", "security"] },
  { worker_id: "AD-012", name: "F&I Menu Builder", vertical: "auto_dealer", price_tier: "$49", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Builds compliant F&I menu from deal data, tracks product penetration", phase: "Phase 4: F&I", phase_number: 4, tags: ["finance", "compliance"] },
  { worker_id: "AD-013", name: "F&I Compliance Monitor", vertical: "auto_dealer", price_tier: "$49", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Verifies every product at published price, ECOA monitoring, audit trail", phase: "Phase 4: F&I", phase_number: 4, tags: ["compliance", "finance"] },
  { worker_id: "AD-014", name: "Lender Matching & RouteOne", vertical: "auto_dealer", price_tier: "$49", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Matches deal to best lender, monitors approval and stipulation status", phase: "Phase 4: F&I", phase_number: 4, tags: ["finance", "lending"] },
  { worker_id: "AD-015", name: "Reserve & Chargeback Tracker", vertical: "auto_dealer", price_tier: "$29", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Tracks F&I reserve, monitors chargeback risk, alerts on early payoffs", phase: "Phase 4: F&I", phase_number: 4, tags: ["finance", "compliance"] },
  { worker_id: "AD-016", name: "RO Writer Assist", vertical: "auto_dealer", price_tier: "$29", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Suggests op codes, flags declined services, monitors labor time accuracy", phase: "Phase 5: Service & Parts", phase_number: 5, tags: ["service", "revenue"] },
  { worker_id: "AD-017", name: "Service MPI & Trade Flag", vertical: "auto_dealer", price_tier: "$79", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Flags when repair cost exceeds 60% of vehicle value — service-to-sales trigger", phase: "Phase 5: Service & Parts", phase_number: 5, tags: ["service", "revenue", "sales"] },
  { worker_id: "AD-018", name: "Parts Inventory & Returns", vertical: "auto_dealer", price_tier: "$29", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Tracks parts on-hand, monitors warranty return deadlines, flags aging inventory", phase: "Phase 5: Service & Parts", phase_number: 5, tags: ["service", "inventory"] },
  { worker_id: "AD-019", name: "Warranty Claims Optimizer", vertical: "auto_dealer", price_tier: "$49", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Optimizes op code selection, monitors claim status, flags rejection patterns", phase: "Phase 5: Service & Parts", phase_number: 5, tags: ["service", "revenue"] },
  { worker_id: "AD-020", name: "Declined Service Follow-Up", vertical: "auto_dealer", price_tier: "$49", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Tracks declined services, triggers re-engagement at 3/14/30/60 days", phase: "Phase 5: Service & Parts", phase_number: 5, tags: ["service", "retention", "revenue"] },
  { worker_id: "AD-021", name: "Equity Mining & Retention", vertical: "auto_dealer", price_tier: "$79", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Monitors customer equity positions, generates advisor talk tracks, flags pull-ahead", phase: "Phase 6: Retention & Marketing", phase_number: 6, tags: ["retention", "revenue", "sales"] },
  { worker_id: "AD-022", name: "CSI & Review Management", vertical: "auto_dealer", price_tier: "$29", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Monitors CSI scores, triggers review requests, routes complaints before they post", phase: "Phase 6: Retention & Marketing", phase_number: 6, tags: ["retention", "compliance"] },
  { worker_id: "AD-023", name: "Conquest & Loyalty Campaigns", vertical: "auto_dealer", price_tier: "$49", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Identifies conquest targets, manages loyalty outreach, tracks campaign ROI", phase: "Phase 6: Retention & Marketing", phase_number: 6, tags: ["marketing", "retention"] },
  { worker_id: "AD-024", name: "FTC CARS Rule Monitor", vertical: "auto_dealer", price_tier: "$49", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Tracks CARS Rule compliance (eff. Jan 2026), flags prohibited dealer practices", phase: "Phase 7: Compliance & HR", phase_number: 7, tags: ["compliance", "FTC"] },
  { worker_id: "AD-025", name: "TCPA Compliance", vertical: "auto_dealer", price_tier: "$29", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Manages text/call consent records, suppression lists, opt-out compliance", phase: "Phase 7: Compliance & HR", phase_number: 7, tags: ["compliance", "TCPA"] },
  { worker_id: "AD-026", name: "HR & Payroll Compliance", vertical: "auto_dealer", price_tier: "$29", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Monitors dealer HR compliance, wage/hour, commissioned sales comp rules", phase: "Phase 7: Compliance & HR", phase_number: 7, tags: ["compliance", "HR"] },
  { worker_id: "AD-027", name: "DMS Integration Monitor", vertical: "auto_dealer", price_tier: "$49", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Monitors Reynolds/CDK/Dealertrack data quality, flags integration errors", phase: "Phase 8: Intelligence & Reporting", phase_number: 8, tags: ["integration", "intelligence"] },
  { worker_id: "AD-028", name: "Daily Gross & Velocity Report", vertical: "auto_dealer", price_tier: "$29", revenue_model: "tech_fee_and_subscription", status: "live", short_description: "Automated daily/weekly gross reporting by department, trend alerts", phase: "Phase 8: Intelligence & Reporting", phase_number: 8, tags: ["reporting", "intelligence"] },
  { worker_id: "AD-029", name: "Alex — Chief of Staff", vertical: "auto_dealer", price_tier: "FREE", revenue_model: "free", status: "live", short_description: "Cross-worker orchestration, daily ops briefing, pricing model recommendation", phase: "Horizontal", phase_number: 99, tags: ["alex", "orchestration"] },
];

// ═══════════════════════════════════════════════════════════════
//  ALL WORKERS — Combined array
//  NOTE: RE, RS, PM, AV workers will be added from the master
//  registry doc. The schema is identical to AUTO_DEALER_WORKERS.
// ═══════════════════════════════════════════════════════════════

const ALL_WORKERS = [
  ...AUTO_DEALER_WORKERS,
  // RE Development (52 workers) — add from TitleApp-Master-Worker-Registry.docx
  // RE Sales (20 workers) — add from registry doc
  // Property Management (18 workers) — add from registry doc
  // Aviation 135/91 (38 built + 12 planned) — add from registry doc
  // Pilot Suite (6 workers) — add from registry doc
];

// ═══════════════════════════════════════════════════════════════
//  SEED FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Seed all pre-approved workers into raasCatalog.
 * Safe to re-run — uses merge: true.
 *
 * @param {FirebaseFirestore.Firestore} [dbOverride] — optional Firestore instance
 * @returns {object} — { seeded, errors }
 */
async function seedWorkerRegistry(dbOverride) {
  const db = dbOverride || getDb();
  const { validateRegistryRecord } = require("../helpers/workerSchema");
  const { rebuildAllCounters } = require("../helpers/workerSync");

  console.log(`[seedWorkerRegistry] Seeding ${ALL_WORKERS.length} workers...`);
  let seeded = 0;
  const errors = [];

  for (const w of ALL_WORKERS) {
    try {
      // Validate
      const { record: validated } = validateRegistryRecord({
        ...w,
        approved_by: "sean_seed_v1",
        pipeline_version: "v1.0_seed",
      }, { isSeed: true });

      // Write
      await db.collection("raasCatalog").doc(w.worker_id).set({
        ...validated,
        status: w.status,
        approved_by: "sean_seed_v1",
        approved_at: admin.firestore.FieldValue.serverTimestamp(),
        pipeline_completed_at: admin.firestore.FieldValue.serverTimestamp(),
        pipeline_version: "v1.0_seed",
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // Write to Alex knowledge
      await db.collection("alex").doc("knowledge").collection("workers").doc(w.worker_id).set({
        worker_id: w.worker_id,
        name: w.name,
        vertical: w.vertical,
        price_tier: w.price_tier,
        revenue_model: w.revenue_model,
        short_description: w.short_description,
        tags: w.tags || [],
        status: w.status,
        worker_url: w.worker_url || null,
        added_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      seeded++;
      if (seeded % 10 === 0) console.log(`  ${seeded}/${ALL_WORKERS.length} seeded...`);
    } catch (e) {
      errors.push({ worker_id: w.worker_id, error: e.message });
      console.error(`  FAILED ${w.worker_id}: ${e.message}`);
    }
  }

  // Rebuild all counters
  const counts = await rebuildAllCounters(db);

  // Trigger homepage cache update
  await db.collection("platform").doc("contentSync").collection("events").add({
    event_type: "counters_rebuild",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[seedWorkerRegistry] Complete: ${seeded} seeded, ${errors.length} errors`);
  console.log(`[seedWorkerRegistry] Counters: ${counts.total_live} live, ${counts.total_all_statuses} total`);

  return { seeded, errors, counts };
}

// Run standalone if called directly
if (require.main === module) {
  seedWorkerRegistry()
    .then(r => { console.log("\nResult:", JSON.stringify(r, null, 2)); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
}

module.exports = { seedWorkerRegistry, ALL_WORKERS };
