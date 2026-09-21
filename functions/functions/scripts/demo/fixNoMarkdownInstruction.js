// Fix cached workerSystemPrompts docs that were cloned from Alex's core prompt
// and inherited its "plain text only, never use markdown" instruction. That
// cached prompt short-circuits the auto-generated prompt in index.js (which
// has the correct FORMATTING RULES block: use bullet/numbered lists, bold for
// key figures, short paragraphs) — so these workers were rendering every
// reply as a single unformatted wall of text even though ChatMarkdown.jsx
// renders real markdown correctly when it receives it. Found 2026-09-18
// ahead of a live demo (Ivy/platform-marketing was the reported symptom).
//
// Run from functions/functions/:
//   node scripts/demo/fixNoMarkdownInstruction.js
"use strict";

const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const SLUGS = [
  "platform-accounting",
  "platform-contacts",
  "platform-hr",
  "platform-marketing",
  "platform-control-center-pro",
];

const GOOD_FORMATTING = [
  "- No emojis. Clean and professional -- Switzerland, not Disneyland.",
  "- DO format for readability. Break your answer into short paragraphs with a blank line between distinct points. NEVER return one dense wall of text.",
  "- When you give multiple items, figures, or steps, use a bullet or numbered list -- one item per line -- not a run-on sentence.",
  "- Use bold sparingly to highlight a key figure, name, or label.",
].join("\n");

// Matches the whole anti-formatting block from "Never use emojis" through
// "Use plain text only" (inclusive), whatever lines fall between them — the
// docs vary slightly (some also add "Never use bullet points or numbered
// lists unless the user explicitly asks for a list.").
const BAD_BLOCK = /- Never use emojis in your responses\.[\s\S]*?- Write in complete, clean sentences\. Use plain text only\./;

async function fixWorker(slug) {
  const ref = db.doc(`workerSystemPrompts/${slug}`);
  const snap = await ref.get();
  if (!snap.exists) { console.log(`  · ${slug}: no cached doc, skipped`); return; }
  const text = snap.data().systemPrompt || "";
  if (!BAD_BLOCK.test(text)) { console.log(`  · ${slug}: pattern not found (already fixed or different wording) — check manually`); return; }
  const fixed = text.replace(BAD_BLOCK, GOOD_FORMATTING);
  await ref.update({ systemPrompt: fixed, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  console.log(`  ✓ ${slug}: formatting instruction corrected`);
}

(async () => {
  console.log("═══ fixNoMarkdownInstruction.js ═══\n");
  for (const slug of SLUGS) await fixWorker(slug);
  console.log("\n═══ Done ═══");
})().catch(e => { console.error(e); process.exit(1); });
