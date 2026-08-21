// fixSpineWorkerPersonaNames.js — root-cause fix for "Accounting chat calls
// itself Alex instead of Max" (Sean, 2026-08-20), confirmed platform-wide
// across the back-of-house spine workers.
//
// Root cause: digitalWorkers/{slug}.display_name still carries a stale
// "Alex " prefix left over from before per-worker personas (Max/Jordan/Sage/
// Ivy/Reed) existed:
//   platform-accounting -> "Alex Business Accounting"
//   platform-hr         -> "Alex HR & People"
//   platform-marketing  -> "Alex Marketing & Content"
// The chat-prompt builder (functions/index.js ~line 3946 and ~7282) reads
// `dw.persona_name || dw.display_name || dw.name || workerSlug` for the
// worker's name, then instructs the model "You are {workerName} ... never
// say you are Alex or Chief of Staff." With display_name = "Alex Business
// Accounting" and no persona_name set, that instruction is self-contradictory
// (told to be "Alex ..." AND told never to say "Alex") -- the model resolves
// it by introducing itself as Alex. platform-contacts and investor-relations
// already had clean display_names (no "Alex" prefix) and were not affected.
//
// Fix: set persona_name explicitly on every spine worker (so the correct
// name wins outright, independent of the _SUITE_PERSONAS override table
// duplicated in index.js) and strip the stale "Alex " prefix from
// display_name so the tab/worker label itself is also correct.
//
// Idempotent — safe to run more than once.
//
// Run from functions/functions/:
//   node scripts/demo/fixSpineWorkerPersonaNames.js
"use strict";

const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const FIXES = {
  "platform-accounting": { display_name: "Accounting", persona_name: "Max" },
  "platform-hr":         { display_name: "HR & People", persona_name: "Jordan" },
  "platform-marketing":  { display_name: "Marketing & Content", persona_name: "Ivy" },
  "platform-contacts":   { persona_name: "Sage" },   // display_name already clean
  "investor-relations":  { persona_name: "Reed" },   // display_name already clean
};

(async () => {
  console.log("═══ fixSpineWorkerPersonaNames.js ═══\n");
  for (const [slug, patch] of Object.entries(FIXES)) {
    const ref = db.doc(`digitalWorkers/${slug}`);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`  ⚠ ${slug}: no digitalWorkers doc, skipped`);
      continue;
    }
    const before = snap.data();
    await ref.update(patch);
    console.log(`  ✓ ${slug}: display_name "${before.display_name || ""}" -> "${patch.display_name || before.display_name || ""}", persona_name -> "${patch.persona_name}"`);
  }
  console.log("\n═══ Done ═══");
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
