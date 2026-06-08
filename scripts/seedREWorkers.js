"use strict";

/**
 * Seed the 4 real-estate creator workers into Firestore so they (a) appear in
 * the marketplace + render their canvas, and (b) show up in Sean's CREATOR
 * dashboard (dogfooding). Fixes the substrate gap where workers built in the
 * repo (outside the sandbox) never got Firestore docs.
 *
 * Writes TWO docs per worker:
 *   - digitalWorkers/{slug}  → marketplace + RAASStore + WorkerStateContext
 *                              (selectWorker reads this for canvasTabs)
 *   - workers/{slug}         → CreatorDashboard (queries creator_id == uid)
 *
 * Source of truth: services/alex/catalogs/real-estate-development.json
 * (the 4 workers were registered there by scripts/registerREWorkers.js).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/seedREWorkers.js          (dry-run)
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/seedREWorkers.js --apply  (write)
 */

const path = require("path");
const fs = require("fs");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const APPLY = process.argv.includes("--apply");
const SEAN_UID = "WResykI56hW16silsOtvlw1UjJK2"; // Sean (creator + SOCIII admin), per installSociiiWorkers.js
const CATALOG = path.join(__dirname, "..", "functions", "functions", "services", "alex", "catalogs", "real-estate-development.json");
const RE_IDS = ["TITLE-ABSTRACT-001", "LAW-LANDUSE-001", "ZONING-001", "FEASIBILITY-001"];

const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
const workers = catalog.workers.filter((w) => RE_IDS.includes(w.id));

function digitalWorkerDoc(w) {
  return {
    slug: w.slug,
    catalogId: w.id,
    catalog_id: w.id,
    display_name: w.name,
    name: w.name,
    short_description: w.capabilitySummary.slice(0, 280),
    headline: w.capabilitySummary.slice(0, 140),
    description: w.capabilitySummary,
    worker_type: "worker",
    vertical: "Real Estate",
    suite: w.suite || "",
    status: w.status || "beta",
    pricing: w.pricing || { monthly: 0, free_worker: true },
    pricing_tier: 0,
    creator: w.creator || "sean-combs",
    emits: w.emits || [],
    accepts: w.accepts || [],
    canvasTabs: w.canvasTabs || [],
    landing_page_slug: `workers/${w.slug}`,
    workspaceLaunchPage: { tagline: w.name, whatYoullHave: "", quickStartPrompts: [], activeSubstrateFeatures: [] },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    _seededBy: "scripts/seedREWorkers.js",
  };
}

function creatorWorkerDoc(w) {
  return {
    creator_id: SEAN_UID,
    workerId: w.id,
    slug: w.slug,
    name: w.name,
    short_description: w.capabilitySummary.slice(0, 280),
    vertical: "Real Estate",
    suite: w.suite || "",
    status: w.status || "beta",
    published: true,
    canvasTabs: w.canvasTabs || [],
    emits: w.emits || [],
    accepts: w.accepts || [],
    builtIn: "repo", // built outside the sandbox; dogfood-registered
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    _seededBy: "scripts/seedREWorkers.js",
  };
}

(async () => {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — seeding ${workers.length} RE workers (creator_id=${SEAN_UID})\n`);
  for (const w of workers) {
    console.log(`• ${w.id} → digitalWorkers/${w.slug} + workers/${w.slug} (${(w.canvasTabs || []).length} tabs)`);
    if (APPLY) {
      await db.doc(`digitalWorkers/${w.slug}`).set(digitalWorkerDoc(w), { merge: true });
      await db.doc(`workers/${w.slug}`).set(creatorWorkerDoc(w), { merge: true });
    }
  }
  console.log(`\n${APPLY ? "✅ Wrote" : "DRY RUN — would write"} ${workers.length} workers × 2 collections.`);
  if (!APPLY) console.log("Re-run with --apply to write.");
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
