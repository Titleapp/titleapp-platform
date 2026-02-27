/**
 * seedDigitalWorkerCatalog.js
 *
 * Seeds the Firestore `digitalWorkers` collection from a JSON catalog file.
 *
 * Usage:
 *   node scripts/seedDigitalWorkerCatalog.js [path/to/catalog.json]
 *
 * If no path is given, defaults to src/data/digitalWorkerCatalog.json
 *
 * The JSON file should be an array of objects with at minimum:
 *   { id, name, suite, industry, category, price, description }
 *
 * Each entry gets the full digitalWorkers schema applied with defaults.
 * Uses { merge: true } so re-running is safe — subscriber/revenue data is preserved.
 *
 * Firestore batches are capped at 500 operations, so we chunk automatically.
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS or default service account)
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const BATCH_LIMIT = 500;

function generateId(worker) {
  const base = (worker.name || "worker")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (worker.state) {
    return `${base}-${worker.state.toLowerCase()}`;
  }
  return base;
}

async function seed() {
  // Resolve catalog path
  const catalogPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, "../src/data/digitalWorkerCatalog.json");

  if (!fs.existsSync(catalogPath)) {
    console.error(`Catalog file not found: ${catalogPath}`);
    console.error("Provide a path as argument or place catalog at src/data/digitalWorkerCatalog.json");
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

  if (!Array.isArray(catalog)) {
    console.error("Catalog JSON must be an array of worker objects.");
    process.exit(1);
  }

  console.log(`Seeding ${catalog.length} Digital Workers to Firestore...`);

  // Chunk into batches of 500
  const chunks = [];
  for (let i = 0; i < catalog.length; i += BATCH_LIMIT) {
    chunks.push(catalog.slice(i, i + BATCH_LIMIT));
  }

  let total = 0;
  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const batch = db.batch();

    for (const worker of chunk) {
      const workerId = worker.id || generateId(worker);
      const ref = db.collection("digitalWorkers").doc(workerId);

      batch.set(ref, {
        // Identity
        id: workerId,
        name: worker.name || "",
        shortName: worker.shortName || (worker.name || "").substring(0, 30),

        // Classification
        suite: worker.suite || worker.category || "General",
        industry: (worker.industry || worker.suite || "general").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        category: worker.category || "General",
        state: worker.state || null,
        tags: worker.tags || [],

        // Content
        description: worker.description || "",
        shortDescription: worker.shortDescription || (worker.description || "").substring(0, 100),

        // Pricing
        price: worker.price || 9,
        priceDisplay: `$${worker.price || 9}/mo`,
        trialDays: worker.trialDays || 7,

        // Status
        status: worker.status || "coming-soon",
        featured: worker.featured || false,
        published: worker.published !== undefined ? worker.published : true,

        // Metrics — merge: true preserves existing values on re-run
        subscriberCount: 0,
        totalRevenue: 0,
        rating: null,
        reviewCount: 0,

        // Builder info
        creatorId: worker.creatorId || "titleapp-internal",
        creatorName: worker.creatorName || "TitleApp",
        cloneOf: worker.cloneOf || null,

        // Timestamps
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),

        // RAAS config reference
        raasConfigId: worker.raasConfigId || null,

        // Marketing (populated later by Content Machine)
        marketing: {
          landingPageCopy: null,
          linkedInPost: null,
          tiktokScript: null,
          googleAdsKeywords: null,
          emailSequence: null,
          generatedAt: null,
        },
      }, { merge: true });
    }

    await batch.commit();
    total += chunk.length;
    console.log(`  Batch ${ci + 1}/${chunks.length} committed (${total}/${catalog.length})`);
  }

  console.log(`\nDone. Seeded ${total} Digital Workers to Firestore.`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
