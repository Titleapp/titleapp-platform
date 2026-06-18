"use strict";
/**
 * betaAndFreeAllWorkers.js — S52.45. Credibility pass: across the ENTIRE catalog,
 * (1) price → $0 (also routes everything through the free subscribe path, no Stripe
 * paywall) and (2) mark every worker beta:true. The "in development / glitchy"
 * warning banner is a frontend change; this is the data half.
 *
 *   node scripts/betaAndFreeAllWorkers.js          (dry run)
 *   node scripts/betaAndFreeAllWorkers.js --apply
 */
const admin = require(require("path").join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();
const APPLY = process.argv.includes("--apply");

const PATCH = {
  price: 0,
  pricing_tier: 0,
  monthly: 0,
  pricing: { monthly: 0, free_worker: true },
  beta: true,
};

(async () => {
  let n = 0, alreadyFree = 0;
  for (const col of ["digitalWorkers", "workers"]) {
    const snap = await db.collection(col).get();
    for (const d of snap.docs) {
      const x = d.data();
      const wasPriced = (x.pricing_tier || x.price || 0) !== 0;
      if (wasPriced) alreadyFree++;
      n++;
      if (APPLY) await db.doc(`${col}/${d.id}`).set({ ...PATCH, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
    console.log(`${col}: ${snap.size} docs`);
  }
  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"} — ${n} worker docs → $0 + beta:true (${alreadyFree} were previously priced)`);
  if (!APPLY) console.log("Re-run with --apply.");
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
