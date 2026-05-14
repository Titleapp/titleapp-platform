/**
 * CODEX 50.18 — Backfill existing contacts from spine_v2 → spine_v2.1.
 *
 * Adds:
 *   - personas[] = [synthesized from singular fields]
 *   - primary_persona_id = "p_001"
 *   - tiers_index[] = [primary persona tier]
 *   - types_index[] = [primary persona type]
 *   - schema_version = "spine_v2.1"
 *
 * Top-level singular fields (type, contact_tier, lifecycle_stage, lead_score)
 * are PRESERVED as back-compat mirrors.
 *
 * Idempotent — second run is a no-op (skips records already at spine_v2.1
 * with personas[] populated).
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/migrateContactsToSpineV2_1.js          (dry-run)
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/migrateContactsToSpineV2_1.js --apply  (write)
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
const {
  buildV2_1FieldsFromV2,
} = require(path.join(__dirname, "..", "functions", "functions", "api", "routes", "_contactsHelpers"));

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const DRY = !process.argv.includes("--apply");
const PAGE_SIZE = 500;

(async () => {
  console.log(`\n${DRY ? "DRY RUN" : "APPLYING"} — Backfill contacts to spine_v2.1\n`);

  // We page through ALL contacts (any schema version) and skip records that
  // are already v2.1 with personas[] populated. Idempotency is enforced by
  // buildV2_1FieldsFromV2 returning null on already-v2.1 records.
  let scanned = 0;
  let migrated = 0;
  let skipped = 0;
  let lastDoc = null;

  while (true) {
    let q = db.collection("contacts").orderBy("__name__").limit(PAGE_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;

    let batch = db.batch();
    let batchCount = 0;
    for (const doc of snap.docs) {
      scanned++;
      const data = doc.data();
      const v21Fields = buildV2_1FieldsFromV2(data);
      if (v21Fields === null) {
        skipped++;
        continue;
      }

      if (DRY) {
        if (migrated < 5) {
          console.log(`Would migrate ${doc.id}:`, {
            from: { schema_version: data.schema_version, type: data.type, contact_tier: data.contact_tier },
            to: { schema_version: v21Fields.schema_version, persona_count: v21Fields.personas.length, primary: v21Fields.primary_persona_id },
          });
        }
      } else {
        batch.update(doc.ref, {
          ...v21Fields,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        batchCount++;
        if (batchCount >= 450) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
      migrated++;
    }

    if (!DRY && batchCount > 0) await batch.commit();

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE_SIZE) break;
  }

  console.log("\n=== Migration summary ===");
  console.log(`Scanned:  ${scanned}`);
  console.log(`Migrated: ${migrated} ${DRY ? "(would be)" : ""}`);
  console.log(`Skipped:  ${skipped} (already v2.1)`);
  console.log(DRY ? "\nThis was a DRY RUN. Re-run with --apply to write changes.\n" : "\nDone.\n");
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
