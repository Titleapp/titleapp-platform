#!/usr/bin/env node

/**
 * scripts/createWorker.js — scaffold a new creator worker from the template.
 *
 * Usage:
 *   npm run create-worker -- --handle=jane --slug=fitness-coach
 *   # or directly:
 *   node scripts/createWorker.js --handle=jane --slug=fitness-coach
 *
 * What it does:
 *   1. Copies creators/_template/ to creators/<handle>/<slug>/
 *   2. Replaces placeholder strings with your handle + slug
 *   3. Prints next steps
 *
 * What it does NOT do:
 *   - Validate that <handle> is yours (it's local — be honest)
 *   - Push to GitHub (you do that)
 *   - Open a PR (you do that when ready)
 */

const fs = require("fs");
const path = require("path");

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
  console.error("Usage: npm run create-worker -- --handle=<your-handle> --slug=<worker-slug>");
  console.error("");
  console.error("Example:");
  console.error("  npm run create-worker -- --handle=jane --slug=fitness-coach-001");
  console.error("");
  console.error("Naming:");
  console.error("  - <handle>: lowercase letters, numbers, hyphens (your GitHub username is a fine default)");
  console.error("  - <slug>:   lowercase letters, numbers, hyphens; ideally <domain>-<descriptor>-<version>");
  console.error("              examples: nursing-education-001, fitness-coach, title-search-ca");
  process.exit(1);
}

function isValidIdentifier(s) {
  return typeof s === "string" && /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(s);
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function walkAndReplace(dir, replacements) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walkAndReplace(full, replacements);
    } else {
      let content = fs.readFileSync(full, "utf8");
      let changed = false;
      for (const [from, to] of Object.entries(replacements)) {
        if (content.includes(from)) {
          content = content.split(from).join(to);
          changed = true;
        }
      }
      if (changed) fs.writeFileSync(full, content, "utf8");
    }
  }
}

function main() {
  const args = parseArgs();
  if (!args.handle) usageAndExit("--handle is required");
  if (!args.slug)   usageAndExit("--slug is required");
  if (!isValidIdentifier(args.handle)) usageAndExit(`--handle="${args.handle}" must be lowercase letters/numbers/hyphens, 3-50 chars`);
  if (!isValidIdentifier(args.slug))   usageAndExit(`--slug="${args.slug}" must be lowercase letters/numbers/hyphens, 3-50 chars`);

  const repoRoot = path.resolve(__dirname, "..");
  const templateDir = path.join(repoRoot, "creators", "_template");
  const targetDir = path.join(repoRoot, "creators", args.handle, args.slug);

  if (!fs.existsSync(templateDir)) {
    console.error(`Error: template directory not found at ${templateDir}`);
    console.error(`Are you running from the repo root?`);
    process.exit(2);
  }

  if (fs.existsSync(targetDir)) {
    console.error(`Error: ${targetDir} already exists. Choose a different slug or remove the existing directory.`);
    process.exit(3);
  }

  // 1. Copy
  copyRecursive(templateDir, targetDir);

  // 2. Replace placeholders
  walkAndReplace(targetDir, {
    "<your-worker-slug>": args.slug,
    "your-worker-slug":   args.slug,
    "<your-handle>":      args.handle,
    "your-handle":        args.handle,
  });

  // 3. Print next steps
  const rel = path.relative(repoRoot, targetDir);
  console.log("");
  console.log(`Created ${rel}`);
  console.log("");
  console.log("Next steps:");
  console.log(`  1. cd ${rel}`);
  console.log(`  2. Edit intent.md — fill in what / who / success / what-it's-NOT / why-it-dovetails`);
  console.log(`  3. Edit canvas-tabs.json — define your tabs`);
  console.log(`  4. Edit service.js — your worker's functions`);
  console.log(`  5. Edit sample-data.js — fixture data for first-visit users`);
  console.log(`  6. Edit tests/assertions.md — write ≥ 5 testable assertions`);
  console.log(`  7. (optional) Add a preview.html so reviewers can see your worker visually`);
  console.log("");
  console.log(`When ready, open a PR to upstream sociii/sociii-platform:main.`);
  console.log("");
  console.log(`Reference example: creators/ruthie/nursing-education-001/`);
  console.log(`Build pattern:     docs/CREATOR-WORKER-BUILD.md`);
  console.log("");
}

main();
