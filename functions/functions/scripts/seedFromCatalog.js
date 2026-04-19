#!/usr/bin/env node
/**
 * seedFromCatalog.js — Seed workers from catalog JSON files to Firestore
 *
 * Reads catalog JSON files from services/alex/catalogs/ and syncs to:
 *   - digitalWorkers/{slug}
 *   - raasCatalog/{worker_id}
 *   - alex/knowledge/workers/{worker_id}
 *
 * Uses the existing workerSync infrastructure (MARKETPLACE_SLUG_MAP,
 * autoFixWorkerRecord, validateWorkerRecord).
 *
 * Usage:
 *   cd functions/functions
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
 *     node scripts/seedFromCatalog.js --dry-run
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
 *     node scripts/seedFromCatalog.js --commit
 *
 * Options:
 *   --dry-run   Validate and report without writing (default)
 *   --commit    Write to Firestore
 *   --vertical  Only sync a specific vertical (e.g., --vertical platform)
 *
 * CODEX 49.1 Phase A2
 */

"use strict";

const admin = require("firebase-admin");
const path = require("path");
const { listVerticals, loadCatalog } = require("../services/alex/catalogs/loader");

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "title-app-alpha" });
}

function getDb() { return admin.firestore(); }

// Import sync infrastructure from workerSync
const {
  syncCatalogWorkers,
  rebuildAllCounters,
} = require("../helpers/workerSync");

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--commit");
  const verticalFilter = args.includes("--vertical")
    ? args[args.indexOf("--vertical") + 1]
    : null;

  console.log("=".repeat(60));
  console.log("seedFromCatalog.js — CODEX 49.1");
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "COMMIT (writing to Firestore)"}`);
  if (verticalFilter) console.log(`Vertical filter: ${verticalFilter}`);
  console.log("=".repeat(60));
  console.log();

  // Step 1: Discover available catalogs
  const verticals = listVerticals();
  const targetVerticals = verticalFilter
    ? verticals.filter(v => v === verticalFilter)
    : verticals;

  if (targetVerticals.length === 0) {
    console.error(`No catalog found for vertical: ${verticalFilter}`);
    console.log("Available verticals:", verticals.join(", "));
    process.exit(1);
  }

  console.log(`Found ${targetVerticals.length} catalog(s): ${targetVerticals.join(", ")}`);
  console.log();

  // Step 2: Load and summarize each catalog
  let totalWorkers = 0;
  const summaries = [];

  for (const vertical of targetVerticals) {
    const catalog = loadCatalog(vertical);
    if (!catalog || !catalog.workers) {
      console.warn(`  [SKIP] ${vertical}: no workers found`);
      continue;
    }

    const live = catalog.workers.filter(w => w.status === "live").length;
    const planned = catalog.workers.filter(w => w.status !== "live").length;
    totalWorkers += catalog.workers.length;

    summaries.push({
      vertical,
      total: catalog.workers.length,
      live,
      planned,
    });

    console.log(`  ${vertical}: ${catalog.workers.length} workers (${live} live, ${planned} planned/waitlist)`);
  }

  console.log();
  console.log(`Total workers across all catalogs: ${totalWorkers}`);
  console.log();

  // Step 3: Sync using existing workerSync infrastructure
  if (dryRun) {
    console.log("DRY RUN — validating worker records...");
    console.log();

    const db = getDb();
    // If vertical filter, get worker IDs from that catalog
    let workerIds = null;
    if (verticalFilter) {
      const cat = loadCatalog(verticalFilter);
      if (cat && cat.workers) {
        workerIds = cat.workers.map(w => w.id);
      }
    }

    const result = await syncCatalogWorkers(db, {
      dryRun: true,
      workerIds,
    });

    console.log("Validation results:");
    console.log(`  Synced (would write): ${result.synced || 0}`);
    console.log(`  Skipped: ${result.skipped || 0}`);
    console.log(`  Failed: ${result.failed || 0}`);
    if (result.warnings && result.warnings.length > 0) {
      console.log(`  Warnings: ${result.warnings.length}`);
      for (const w of result.warnings) {
        console.log(`    - ${w}`);
      }
    }
    if (result.details) {
      const failures = result.details.filter(d => d.status === "failed");
      if (failures.length > 0) {
        console.log();
        console.log("Failed workers:");
        for (const f of failures) {
          console.log(`  ${f.id}: ${f.error}`);
        }
      }
    }

    console.log();
    console.log("DRY RUN COMPLETE — no data was written.");
    console.log("Run with --commit to write to Firestore.");
  } else {
    console.log("COMMITTING to Firestore...");
    console.log();

    const db = getDb();
    // If vertical filter, get worker IDs from that catalog
    let workerIds = null;
    if (verticalFilter) {
      const cat = loadCatalog(verticalFilter);
      if (cat && cat.workers) {
        workerIds = cat.workers.map(w => w.id);
      }
    }

    const result = await syncCatalogWorkers(db, {
      dryRun: false,
      workerIds,
    });

    console.log("Sync results:");
    console.log(`  Synced: ${result.synced || 0}`);
    console.log(`  Skipped: ${result.skipped || 0}`);
    console.log(`  Failed: ${result.failed || 0}`);

    // Rebuild counters
    console.log();
    console.log("Rebuilding worker counters...");
    const counts = await rebuildAllCounters(db);
    console.log(`  Total live: ${counts.total_live || 0}`);

    console.log();
    console.log("COMMIT COMPLETE.");
  }

  console.log();
  console.log("Summary:");
  console.table(summaries);
}

main().then(() => {
  console.log("Done.");
  process.exit(0);
}).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
