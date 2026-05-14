/**
 * CODEX 50.15 P0-1 — Backfill existing contacts from spine_v1 → spine_v2.
 *
 * Adds default values for new v2 fields:
 *   - contact_tier (mapped from existing `type`)
 *   - lifecycle_stage = "cold"
 *   - lead_score = 0
 *   - source = { primary: "manual_import", sub: null, captured_at: <created_at> }
 *   - segments = []
 *   - engagement subcollection — left empty
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/migrateContactsToSpineV2.js          (dry-run)
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/migrateContactsToSpineV2.js --apply  (write)
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const DRY = !process.argv.includes("--apply");

const TIER_FROM_TYPE = {
  customer: "customer",
  vendor: "vendor",
  investor: "investor",
  tenant: "customer",
  patient: "customer",
  student: "customer",
  contractor: "professional",
  employee: "professional",
  personal: "personal",
};

(async () => {
  console.log(`\n${DRY ? "DRY RUN" : "APPLYING"} — Backfill contacts to spine_v2\n`);

  const snap = await db.collection("contacts")
    .where("schema_version", "==", "spine_v1")
    .limit(5000)
    .get();

  console.log(`Found ${snap.size} spine_v1 contacts to migrate`);

  if (snap.size === 0) {
    console.log("Nothing to do.");
    process.exit(0);
  }

  let batch = db.batch();
  let batchCount = 0;
  let migrated = 0;
  const tierCounts = {};

  for (const doc of snap.docs) {
    const data = doc.data();
    const tier = TIER_FROM_TYPE[data.type] || "professional";
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;

    const updates = {
      schema_version: "spine_v2",
      contact_tier: tier,
      lifecycle_stage: "cold",
      lead_score: 0,
      source: {
        primary: "manual_import",
        sub: null,
        captured_at: data.created_at || null,
      },
      segments: [],
      email: data.email || null,
      phone: data.phone || null,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (DRY && migrated < 3) {
      console.log(`  Sample [${doc.id}]:`, JSON.stringify({
        name: data.name,
        old_type: data.type,
        new_tier: tier,
        new_lifecycle: "cold",
      }));
    }

    if (!DRY) {
      batch.update(doc.ref, updates);
      if (++batchCount >= 450) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
    migrated++;
  }

  if (!DRY && batchCount > 0) await batch.commit();

  console.log(`\n${DRY ? "Would migrate" : "Migrated"} ${migrated} contacts`);
  console.log("Tier distribution:", JSON.stringify(tierCounts, null, 2));

  if (DRY) {
    console.log("\nDRY RUN — no writes. Run with --apply to migrate.\n");
  } else {
    console.log("\nDone.\n");
  }
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
