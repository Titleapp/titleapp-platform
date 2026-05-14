/**
 * Flip BANK-FUND-001 (Fundraise worker) from waitlist → live in Firestore.
 *
 * Source-of-truth catalog already updated. This pushes the change into the
 * runtime mirrors that the marketplace + Alex catalog loader read from.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/flipFundraiseToLive.js
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

(async () => {
  console.log("\n=== Flipping BANK-FUND-001 to live ===\n");

  // Mirror 1: digitalWorkers collection (marketplace view, keyed by slug)
  const dwRef = db.collection("digitalWorkers").doc("fundraise");
  const dwSnap = await dwRef.get();
  if (dwSnap.exists) {
    const before = dwSnap.data().status || "(unset)";
    await dwRef.update({
      status: "live",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ digitalWorkers/fundraise: status ${before} → live`);
  } else {
    console.log("⚠ digitalWorkers/fundraise not found — workerSync may need to run.");
  }

  // Mirror 2: raasCatalog (platform registry, keyed by id)
  const rcRef = db.collection("raasCatalog").doc("BANK-FUND-001");
  const rcSnap = await rcRef.get();
  if (rcSnap.exists) {
    const before = rcSnap.data().status || "(unset)";
    await rcRef.update({
      status: "live",
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ raasCatalog/BANK-FUND-001: status ${before} → live`);
  } else {
    console.log("⚠ raasCatalog/BANK-FUND-001 not found.");
  }

  // Verify with a marketplace-style read
  const marketSnap = await db.collection("digitalWorkers")
    .where("status", "==", "live")
    .where("slug", "==", "fundraise")
    .limit(1).get();
  if (!marketSnap.empty) {
    const d = marketSnap.docs[0].data();
    console.log(`\n✅ Marketplace query returned: ${d.name || d.slug} (status=${d.status}, price=$${d.pricing?.monthly || "?"})`);
  } else {
    console.log("\n⚠ Marketplace query did not return Fundraise — investigate.");
  }

  console.log("\nFundraise worker is live.\n");
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
