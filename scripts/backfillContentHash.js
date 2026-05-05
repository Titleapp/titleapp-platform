/**
 * CODEX 50.14 backfill — populate contentHash on every existing DTC.
 *
 * After CODEX 50.13 Step 2 (DTC schema migration), every DTC has
 * contentHash: null. This script computes the contentHash for each one
 * via the canonical serialization in services/anchor/hashAnchor.js and
 * writes the value back. Idempotent — DTCs with a non-null contentHash
 * are skipped.
 *
 * Run after the schema migration, before the daily batch job runs for
 * the first time. Once contentHash is populated, the next daily batch
 * picks the DTCs up.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/backfillContentHash.js          (dry-run)
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/backfillContentHash.js --apply  (write)
 */

const admin = require("/Users/seancombs/titleapp-platform/functions/functions/node_modules/firebase-admin");
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const { contentHash } = require("/Users/seancombs/titleapp-platform/functions/functions/services/anchor/hashAnchor");

const DRY = !process.argv.includes("--apply");

(async () => {
  console.log(`\n${DRY ? "DRY RUN" : "APPLYING"} — contentHash backfill\n`);

  const snap = await db.collection("dtcs").get();
  console.log(`Scanning ${snap.size} dtcs/* docs...\n`);

  let touched = 0, skipped = 0;

  for (const doc of snap.docs) {
    const dtc = doc.data();
    if (dtc.contentHash) {
      skipped++;
      continue;
    }
    // Need a createdAt that's serializable. Convert Firestore Timestamp
    // to ISO string so the canonical serialization is stable across
    // runtimes (server SDK, client SDK, browser verifier).
    const createdAtIso = dtc.createdAt?.toDate?.().toISOString() || dtc.createdAt || null;
    const canonicalDtc = { ...dtc, createdAt: createdAtIso };
    const hash = contentHash(canonicalDtc);

    console.log(`  ${doc.id.padEnd(28)}  → ${hash.slice(0, 16)}...`);
    if (!DRY) {
      // Also explicitly write batchId: null so the daily batch query
      // (.where('batchId', '==', null)) finds these DTCs. The schema v2
      // migration added the other fields but not batchId — that one is
      // owned by the anchor pipeline.
      const updates = { contentHash: hash };
      if (dtc.batchId === undefined) updates.batchId = null;
      await doc.ref.update(updates);
    }
    touched++;
  }

  console.log();
  console.log(`Touched: ${touched}    Skipped (already hashed): ${skipped}`);
  console.log(`\n${DRY ? "DRY RUN — no writes performed. Re-run with --apply." : "Done."}\n`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
