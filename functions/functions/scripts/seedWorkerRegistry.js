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
//  HEALTH & EMS EDUCATION — 6 anchor workers (one per lane)
// ═══════════════════════════════════════════════════════════════

const HE_WORKERS = [
  { worker_id: "HE-001", name: "Curriculum Architect", vertical: "health_education", price_tier: "$29", revenue_model: "subscription", status: "waitlist", short_description: "Design accreditation-ready nursing and EMS programs with competency alignment", phase: "Build It — Curriculum & Accreditation", phase_number: 1, tags: ["curriculum", "accreditation", "education"], subject_domain: "nursing_education_faculty", deployment_tier: 2, disclaimer_active: false },
  { worker_id: "HE-011", name: "Scenario Simulator", vertical: "health_education", price_tier: "$29", revenue_model: "subscription", status: "waitlist", short_description: "Generate clinical scenarios for skills labs, sim center, and exam prep", phase: "Learn It — Scenarios & Exam Prep", phase_number: 2, tags: ["simulation", "scenarios", "exam-prep"], subject_domain: "ems_paramedic", deployment_tier: 2, disclaimer_active: true },
  { worker_id: "HE-019", name: "ePCR Builder", vertical: "health_education", price_tier: "$49", revenue_model: "subscription", status: "waitlist", short_description: "NEMSIS-compliant ePCR generation with narrative builder and QA scoring", phase: "Chart It — Documentation & Records", phase_number: 3, tags: ["epcr", "documentation", "nemsis"], subject_domain: "ems_paramedic", deployment_tier: 2, disclaimer_active: true },
  { worker_id: "HE-029", name: "Protocol Reference", vertical: "health_education", price_tier: "$49", revenue_model: "subscription", status: "waitlist", short_description: "Jurisdiction-aware protocol and drug reference with scope of practice enforcement", phase: "Back Me Up — Protocol & Drug Reference", phase_number: 4, tags: ["protocol", "drug-reference", "scope-of-practice"], subject_domain: "emergency_er", deployment_tier: 2, disclaimer_active: true, medical_director_approval: true },
  { worker_id: "HE-032", name: "CEU & License Tracker", vertical: "health_education", price_tier: "$29", revenue_model: "subscription", status: "waitlist", short_description: "Track CE hours, license renewal deadlines, and certification status", phase: "Cert It — CEU & License Tracking", phase_number: 5, tags: ["ceu", "license", "certification"], subject_domain: "nursing_education_faculty", deployment_tier: 2, disclaimer_active: false },
  { worker_id: "HE-037", name: "Creator Analytics", vertical: "health_education", price_tier: "FREE", revenue_model: "free", status: "waitlist", short_description: "Subscriber growth, engagement metrics, and revenue tracking for HE creators", phase: "Grow It — Creator Tools & Analytics", phase_number: 6, tags: ["analytics", "creator", "revenue"], subject_domain: "nursing_education_faculty", deployment_tier: 2, disclaimer_active: false },
];

// ═══════════════════════════════════════════════════════════════
//  ALL WORKERS — Combined array
//  NOTE: RE, RS, PM, AV workers will be added from the master
//  registry doc. The schema is identical to HE_WORKERS.
// ═══════════════════════════════════════════════════════════════

const ALL_WORKERS = [
  ...HE_WORKERS,
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
