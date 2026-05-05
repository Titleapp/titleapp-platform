// scripts/deprecate50_4UsageEventsSnakeCase.js — CODEX 50.4 Phase 3a Step 7
//
// Symbolic deprecation of `usage_events` (snake_case). Phase 1 diagnostic
// confirmed the collection has zero documents, so this is cheap insurance
// rather than a real data move. Two functions:
//
//   1. Audit usage_events for any docs that may have appeared since the
//      Phase 1 diagnostic (e.g. an unsurfaced write path firing once).
//   2. Copy any docs found to usage_events_deprecated_50_4 (preserving doc
//      ids), then write a `_deprecation_marker` doc explaining the move.
//
// Idempotent: re-running adds no new docs and updates the marker timestamp.
//
// Usage:
//   cd functions/functions
//   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
//     NODE_PATH=./node_modules \
//     node ../../scripts/deprecate50_4UsageEventsSnakeCase.js [--dry-run]

const admin = require("firebase-admin");

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const SOURCE = "usage_events";
const DEST = "usage_events_deprecated_50_4";

async function main() {
  console.log(`CODEX 50.4 Phase 3a Step 7 — ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Source: ${SOURCE}`);
  console.log(`Destination: ${DEST}\n`);

  const snap = await db.collection(SOURCE).get();
  console.log(`${SOURCE} contains ${snap.size} document(s)`);

  let copied = 0;
  if (snap.size > 0) {
    for (const doc of snap.docs) {
      const data = doc.data();
      console.log(`  - ${doc.id} (will copy)`);
      if (!dryRun) {
        await db.collection(DEST).doc(doc.id).set({
          ...data,
          _migrated_from: SOURCE,
          _migrated_at: admin.firestore.FieldValue.serverTimestamp(),
          _migration_codex: "50.4-phase-3a",
        });
        copied++;
      }
    }
  }

  // Drop a marker doc explaining the deprecation.
  const marker = {
    _deprecation_marker: true,
    deprecated_collection: SOURCE,
    canonical_collection: "usageEvents",
    codex: "50.4-phase-3a",
    reason: "Read paths in stripeWebhook.js and quarterlyPricingReview.js were querying this snake_case collection while every write path used the camelCase usageEvents. The 50.4 Phase 1 diagnostic found this collection empty (no Creator-share data was ever written here). All read paths now use USAGE_EVENTS_COLLECTION constant pointing at usageEvents.",
    note: "If you find docs in this collection more than 90 days after creation, audit for stray write paths. Otherwise the collection is safe to hard-delete after 2026-08-01.",
    next_step: "CODEX 50.5 wires the recordUsageEvent function into worker execution.",
    deprecated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!dryRun) {
    await db.collection(DEST).doc("_deprecation_marker").set(marker, { merge: true });
    console.log(`\nWrote ${DEST}/_deprecation_marker`);
  } else {
    console.log(`\n[dry] Would write ${DEST}/_deprecation_marker`);
  }

  console.log(`\nSummary:`);
  console.log(`  Source docs found: ${snap.size}`);
  console.log(`  Copied to deprecated collection: ${dryRun ? "(dry run)" : copied}`);
  console.log(`  Deprecation marker: ${dryRun ? "(dry run)" : "written"}`);
  console.log(`\nNote: this script does NOT delete the source collection. Snake_case`);
  console.log(`reads no longer happen anywhere in code (verified via grep), so the`);
  console.log(`source can be hard-deleted manually after a 90-day soak.`);

  process.exit(0);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
