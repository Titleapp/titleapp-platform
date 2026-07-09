// CODEX 19 — B1: Backfill baseline capability contract
// Sweeps ALL raasCatalog entries (creator + spine) and sets:
//   - baselineCapabilities: true
//   - personaSlug: "business" (default; update per-worker if different)
//   - lastRun stub (if no lastRun doc exists yet)
//
// Idempotent — safe to re-run. Skips docs that already have the flag.
// Logged to config/migrations/baseline-backfill-{date}.
//
// Usage: node scripts/backfill-baseline-capabilities.js  (from repo root)

const path = require("path");
// firebase-admin lives in functions/functions/node_modules — not at repo root.
const adminPath = path.resolve(__dirname, "../functions/functions/node_modules/firebase-admin");
const admin = require(adminPath);
const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : null;

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    admin.initializeApp(); // uses ADC in Cloud Shell / GCP env
  }
}

const db = admin.firestore();

async function run() {
  console.log("[B1] Starting baseline capability backfill...");
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  // baselineCapabilities lives on digitalWorkers/{slug}, not raasCatalog.
  // raasCatalog = rule/ruleset catalog; digitalWorkers = live worker instances.
  const catalogSnap = await db.collection("digitalWorkers").get();
  console.log(`[B1] Found ${catalogSnap.size} digitalWorkers entries.`);

  let updated = 0, alreadySet = 0, lastRunStubbed = 0, errors = 0;

  for (const doc of catalogSnap.docs) {
    const data = doc.data();
    const slug = doc.id;

    try {
      // Set baselineCapabilities + personaSlug if missing.
      const needsFlag = data.baselineCapabilities !== true;
      const needsPersona = !data.personaSlug;

      if (needsFlag || needsPersona) {
        const update = {};
        if (needsFlag) update.baselineCapabilities = true;
        if (needsPersona) {
          // Default persona: "business". Override here for known persona slugs.
          const personaMap = {
            "vault": "personal",
            "nursing-education-001": "personal",
          };
          update.personaSlug = personaMap[slug] || "business";
        }
        await doc.ref.update(update);
        updated++;
        console.log(`  [updated] ${slug}`);
      } else {
        alreadySet++;
      }

      // Write lastRun stub if the doc doesn't exist yet.
      const lastRunRef = db.doc(`creatorLastRun/${slug}`);
      const lastRunSnap = await lastRunRef.get();
      if (!lastRunSnap.exists) {
        await lastRunRef.set({
          canvasSummary: null,
          renderedAt: null,
          alertsPushed: 0,
          _stub: true,
          _stubbedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        lastRunStubbed++;
        console.log(`  [lastRun stub] ${slug}`);
      }
    } catch (e) {
      console.error(`  [error] ${slug}:`, e.message);
      errors++;
    }
  }

  // Log migration result.
  await db.doc(`migrations/baseline-backfill-${dateStr}`).set({
    runAt: admin.firestore.FieldValue.serverTimestamp(),
    totalCatalogEntries: catalogSnap.size,
    updated,
    alreadySet,
    lastRunStubbed,
    errors,
  });

  console.log(`\n[B1] Done.`);
  console.log(`  Catalog entries:  ${catalogSnap.size}`);
  console.log(`  Flags written:    ${updated}`);
  console.log(`  Already set:      ${alreadySet}`);
  console.log(`  lastRun stubs:    ${lastRunStubbed}`);
  console.log(`  Errors:           ${errors}`);
  console.log(`  Log: config/migrations/baseline-backfill-${dateStr}`);

  process.exit(errors > 0 ? 1 : 0);
}

run().catch(e => { console.error("[B1] Fatal:", e); process.exit(1); });
