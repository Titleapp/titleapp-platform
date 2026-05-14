const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

(async () => {
  // 1) Direct read on the digitalWorkers/fundraise doc
  const dw = await db.collection("digitalWorkers").doc("fundraise").get();
  console.log("digitalWorkers/fundraise:");
  if (dw.exists) {
    const d = dw.data();
    console.log("  status:", d.status);
    console.log("  slug:", d.slug);
    console.log("  workerId:", d.workerId || d.id || "(none)");
    console.log("  pricing:", JSON.stringify(d.pricing || {}));
  } else {
    console.log("  (does not exist)");
  }

  // 2) Look for any raasCatalog docs containing BANK-FUND or fundraise
  console.log("\nSearching raasCatalog for fundraise references…");
  const rcSnap = await db.collection("raasCatalog").get();
  let matches = 0;
  rcSnap.forEach(d => {
    const data = d.data();
    const json = JSON.stringify(data).toLowerCase();
    if (json.includes("bank-fund-001") || json.includes("fundraise") || json.includes("\"slug\":\"fundraise\"")) {
      console.log(`  Match: id=${d.id} status=${data.status || "?"}`);
      matches++;
    }
  });
  console.log(`  Total raasCatalog scanned: ${rcSnap.size}, matches: ${matches}`);

  // 3) Try the marketplace query the route would actually run
  console.log("\nMarketplace-style query (status=live):");
  const liveSnap = await db.collection("digitalWorkers").where("status", "==", "live").limit(500).get();
  console.log(`  Total live workers: ${liveSnap.size}`);
  const fundraise = liveSnap.docs.find(d => d.id === "fundraise" || d.data().slug === "fundraise");
  console.log(`  Fundraise present: ${fundraise ? "YES" : "NO"}`);

  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
