const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

(async () => {
  const dw = await db.collection("digitalWorkers").doc("fundraise").get();
  if (!dw.exists) { console.log("(does not exist)"); process.exit(1); }
  const d = dw.data();
  console.log("Top-level keys:", Object.keys(d).sort().join(", "));
  console.log("\nFull doc:");
  console.log(JSON.stringify(d, null, 2).slice(0, 3000));
  process.exit(0);
})().catch(e => { console.error("FATAL:", e); process.exit(1); });
