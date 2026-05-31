#!/usr/bin/env node

/**
 * scripts/previewWorker.js — open a worker's preview.html in the browser.
 *
 * Usage:
 *   npm run preview-worker -- --worker=ruthie/nursing-education-001
 *   # or:
 *   node scripts/previewWorker.js --worker=jane/fitness-coach
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) {
      const [k, v] = arg.slice(2).split("=");
      args[k] = v ?? true;
    }
  }
  return args;
}

function usageAndExit(msg) {
  if (msg) console.error(`Error: ${msg}\n`);
  console.error("Usage: npm run preview-worker -- --worker=<handle>/<slug>");
  console.error("");
  console.error("Example:");
  console.error("  npm run preview-worker -- --worker=ruthie/nursing-education-001");
  process.exit(1);
}

function main() {
  const args = parseArgs();
  if (!args.worker) usageAndExit("--worker=<handle>/<slug> is required");

  const [handle, slug] = String(args.worker).split("/");
  if (!handle || !slug) usageAndExit(`--worker="${args.worker}" must be in the form <handle>/<slug>`);

  const repoRoot = path.resolve(__dirname, "..");
  const previewPath = path.join(repoRoot, "creators", handle, slug, "preview.html");

  if (!fs.existsSync(previewPath)) {
    console.error(`Error: no preview.html found at ${path.relative(repoRoot, previewPath)}`);
    console.error("");
    console.error("This worker doesn't have a preview yet. To add one:");
    console.error(`  1. Copy creators/ruthie/nursing-education-001/preview.html as a starting point`);
    console.error(`  2. Save it to creators/${handle}/${slug}/preview.html`);
    console.error(`  3. Customize it for your worker`);
    process.exit(2);
  }

  const platform = process.platform;
  const opener =
    platform === "darwin" ? "open" :
    platform === "win32"  ? "start" :
                            "xdg-open";

  try {
    execSync(`${opener} "${previewPath}"`, { stdio: "inherit" });
    console.log(`Opened ${path.relative(repoRoot, previewPath)}`);
  } catch (e) {
    console.error(`Failed to open preview. You can open it manually:`);
    console.error(`  ${previewPath}`);
    process.exit(3);
  }
}

main();
