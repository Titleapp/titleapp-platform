// Fix stale cached system prompts in workerSystemPrompts/{slug} — these were
// written before per-worker personas existed and take precedence over the
// correctly-generated live prompt (which is why chat headers show the right
// name like "Max" but the actual chat still introduces itself as "Alex
// Business Accounting"). Only touches self-reference and cross-reference-
// by-old-name text; leaves genuine references to the real Chief of Staff
// persona ("Alex or Chief of Staff", "Alex or another worker") untouched.
//
// Run from functions/functions/:
//   node scripts/demo/fixCachedWorkerSystemPrompts.js
"use strict";

const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

// Ordered longest-match-first so "Alex Business Accounting" is replaced
// before a shorter overlapping pattern could match part of it.
const REPLACEMENTS = [
  ["Alex Business Accounting", "Max"],
  ["Alex Accounting", "Max"],
  ["Alex HR and People", "Jordan"],
  ["Alex HR", "Jordan"],
  ["Alex Marketing and Content", "Ivy"],
  ["Alex Marketing", "Ivy"],
  ["Alex Contacts", "Sage"],
];

const SLUGS = ["platform-accounting", "platform-hr", "platform-marketing", "platform-contacts"];

async function fixWorker(slug) {
  const ref = db.doc(`workerSystemPrompts/${slug}`);
  const snap = await ref.get();
  if (!snap.exists) { console.log(`  · ${slug}: no cached doc, skipped`); return; }
  let text = snap.data().systemPrompt || "";
  const before = text;
  for (const [from, to] of REPLACEMENTS) {
    text = text.split(from).join(to);
  }
  if (text === before) { console.log(`  · ${slug}: no change needed`); return; }
  await ref.update({ systemPrompt: text, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  console.log(`  ✓ ${slug}: cached prompt corrected`);
}

async function fixInvestorRelations() {
  const ref = db.doc("workerSystemPrompts/investor-relations");
  const snap = await ref.get();
  if (!snap.exists) { console.log("  · investor-relations: no cached doc, skipped"); return; }
  let text = snap.data().systemPrompt || "";
  const before = text;
  // Only the self-reference at the very start — "You are Alex, the FOUNDER'S..."
  // Do not touch any other bare "Alex" mention further in the text without
  // checking context first (this one was verified directly before writing this script).
  text = text.replace(/^You are Alex, the FOUNDER'S/, "You are Reed, the FOUNDER'S");
  if (text === before) { console.log("  · investor-relations: no change needed (pattern not found — check manually)"); return; }
  await ref.update({ systemPrompt: text, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  console.log("  ✓ investor-relations: cached prompt corrected");
}

(async () => {
  console.log("═══ fixCachedWorkerSystemPrompts.js ═══\n");
  for (const slug of SLUGS) await fixWorker(slug);
  await fixInvestorRelations();
  console.log("\n═══ Done ═══");
})().catch(e => { console.error(e); process.exit(1); });
