"use strict";

/**
 * manualBlogPromoPost.js — Manually fire the blog-promo poster right now,
 * bypassing the Mon/Wed/Fri schedule gate (Sean, 2026-09-20: "Can we promote
 * some of those posts on LinkedIn using Ivy right now?").
 *
 *   node scripts/manualBlogPromoPost.js linkedin --apply
 *   node scripts/manualBlogPromoPost.js x --apply
 */

const path = require("path");
const fs = require("fs");

const envPath = path.join(__dirname, "..", "functions", "functions", ".env");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) {
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const admin = require(path.join(__dirname, "..", "functions", "functions", "node_modules", "firebase-admin"));
admin.initializeApp({ projectId: "title-app-alpha" });

const channel = process.argv[2];
const apply = process.argv.includes("--apply");

if (channel !== "x" && channel !== "linkedin") {
  console.error("Usage: node scripts/manualBlogPromoPost.js <x|linkedin> [--apply]");
  process.exit(1);
}

async function main() {
  const { pickBlogForSlot } = require(
    path.join(__dirname, "..", "functions", "functions", "marketing", "blogRoster")
  );

  if (!apply) {
    const now = new Date();
    const start = Date.UTC(now.getUTCFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start) / 86400000);
    const pick = pickBlogForSlot(dayOfYear);
    console.log("Dry run — would post to", channel, "right now:");
    console.log(pick);
    console.log("\nRe-run with --apply to actually post.");
    return;
  }

  const { runBlogPromoPost } = require(
    path.join(__dirname, "..", "functions", "functions", "marketing", "blogPromoPost")
  );
  const result = await runBlogPromoPost(channel, { force: true });
  console.log("Posted:", result);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
