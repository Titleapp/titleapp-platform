"use strict";

/**
 * pauseLinkedInVideoRoster.js — One-shot config flip.
 *
 * Sean, 2026-09-20: "LinkedIn is the blog posts" — LinkedIn should carry the
 * new 3x/week blog-promo poster (blogPromoPost.js) only, not the old
 * every-other-day "OF for Smart People" video roster (dailyLinkedInPost.js).
 * X keeps both (the "mix, more blog posts" instruction), so only LinkedIn's
 * old job is paused here.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/pauseLinkedInVideoRoster.js --apply
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

async function main() {
  const apply = process.argv.includes("--apply");
  const ref = db.doc("config/marketingWorker");
  const snap = await ref.get();
  const cfg = snap.exists ? snap.data() : {};
  console.log("Current config/marketingWorker:", cfg);

  if (!apply) {
    console.log("\nDry run — would set linkedInEveryOtherDayEnabled: false. Re-run with --apply to write.");
    return;
  }

  await ref.set({ linkedInEveryOtherDayEnabled: false }, { merge: true });
  console.log("Done — linkedInEveryOtherDayEnabled set to false.");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
