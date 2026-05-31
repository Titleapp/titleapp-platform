#!/usr/bin/env node

/**
 * scripts/validateWorker.js — run the Worker DoD checks against one creator
 * directory. Exits 0 on pass, non-zero with a list of issues on fail.
 *
 * Usage:
 *   npm run validate-worker -- --worker=<handle>/<slug>
 *
 * Example:
 *   npm run validate-worker -- --worker=ruthie/nursing-education-001
 *
 * Checks (mirrors docs/CREATOR-WORKER-BUILD.md § "Worker DoD"):
 *   1. All 5 required files exist (intent.md, canvas-tabs.json, service.js,
 *      sample-data.js, tests/assertions.md)
 *   2. intent.md has all required H2 sections and no <placeholder> markers
 *   3. canvas-tabs.json has 3-7 tabs, exactly one default:true, valid view
 *      types, unique ids
 *   4. service.js exports SERVICE_ID and REQUIRED_CAPABILITIES and at least
 *      one function
 *   5. sample-data.js has SAMPLE_CANVAS_PAYLOADS with an entry per canvas tab
 *   6. tests/assertions.md has at least 5 TC-### entries
 *   7. No obvious secrets (API keys, tokens) in any file
 *
 * This is a STRUCTURAL check, not a behavioral test. QA-001 runs the
 * behavioral tests against the assertions file separately.
 */

const fs = require("fs");
const path = require("path");

const REQUIRED_FILES = [
  "intent.md",
  "canvas-tabs.json",
  "service.js",
  "sample-data.js",
  "tests/assertions.md",
];

const INTENT_REQUIRED_SECTIONS = [
  "What it does",
  "Who uses it",
  "What success looks like",
  "What this worker is NOT",
];

const PLACEHOLDER_PATTERNS = [
  /<your-worker-slug>/i,
  /<your-handle>/i,
  /<your-name>/i,
  /<placeholder>/i,
  /<TBD>/i,
  /\byour@email\.com\b/i,
  /\bYour Name\b/,
  /What this worker is called/i,
];

const VALID_VIEW_TYPES = ["operator", "admin", "member", "instructor", "student", "hr"];

const SECRET_PATTERNS = [
  /sk_live_[a-zA-Z0-9]{20,}/,
  /sk_test_[a-zA-Z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /xox[baprs]-[a-zA-Z0-9-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq === -1) args[arg.slice(2)] = true;
      else args[arg.slice(2, eq)] = arg.slice(eq + 1);
    }
  }
  return args;
}

function fail(issues, msg) {
  issues.push(msg);
}

function checkPlaceholders(filePath, content, issues, relPath) {
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(content)) {
      fail(issues, `${relPath}: contains placeholder text (${pattern.source}) — fill it in`);
      break;
    }
  }
}

function checkSecrets(filePath, content, issues, relPath) {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      fail(issues, `${relPath}: looks like it contains a secret/API key — remove it`);
      break;
    }
  }
}

function checkFilesExist(workerDir, relWorkerDir, issues) {
  for (const f of REQUIRED_FILES) {
    const full = path.join(workerDir, f);
    if (!fs.existsSync(full)) {
      fail(issues, `${relWorkerDir}/${f}: missing required file`);
    }
  }
}

function checkIntent(workerDir, relWorkerDir, issues) {
  const filePath = path.join(workerDir, "intent.md");
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const section of INTENT_REQUIRED_SECTIONS) {
    const re = new RegExp(`^##\\s+${section}`, "mi");
    if (!re.test(content)) {
      fail(issues, `${relWorkerDir}/intent.md: missing required section "## ${section}"`);
    }
  }
  checkPlaceholders(filePath, content, issues, `${relWorkerDir}/intent.md`);
}

function checkCanvasTabs(workerDir, relWorkerDir, issues) {
  const filePath = path.join(workerDir, "canvas-tabs.json");
  if (!fs.existsSync(filePath)) return { tabs: [] };
  const content = fs.readFileSync(filePath, "utf8");

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    fail(issues, `${relWorkerDir}/canvas-tabs.json: invalid JSON — ${e.message}`);
    return { tabs: [] };
  }
  const tabs = parsed.canvasTabs;
  if (!Array.isArray(tabs)) {
    fail(issues, `${relWorkerDir}/canvas-tabs.json: must export canvasTabs as an array`);
    return { tabs: [] };
  }
  if (tabs.length < 3 || tabs.length > 7) {
    fail(issues, `${relWorkerDir}/canvas-tabs.json: must have 3-7 tabs (found ${tabs.length})`);
  }
  const defaults = tabs.filter((t) => t.default === true);
  if (defaults.length !== 1) {
    fail(issues, `${relWorkerDir}/canvas-tabs.json: exactly one tab must have default:true (found ${defaults.length})`);
  }
  const ids = new Set();
  for (const tab of tabs) {
    if (!tab.id) {
      fail(issues, `${relWorkerDir}/canvas-tabs.json: a tab is missing "id"`);
      continue;
    }
    if (ids.has(tab.id)) {
      fail(issues, `${relWorkerDir}/canvas-tabs.json: duplicate tab id "${tab.id}"`);
    }
    ids.add(tab.id);
    if (!tab.label) fail(issues, `${relWorkerDir}/canvas-tabs.json: tab "${tab.id}" missing "label"`);
    if (!tab.signal) fail(issues, `${relWorkerDir}/canvas-tabs.json: tab "${tab.id}" missing "signal"`);
    if (typeof tab.order !== "number") fail(issues, `${relWorkerDir}/canvas-tabs.json: tab "${tab.id}" missing or invalid "order" (must be a number)`);
    if (tab.view && !VALID_VIEW_TYPES.includes(tab.view)) {
      fail(issues, `${relWorkerDir}/canvas-tabs.json: tab "${tab.id}" has invalid view "${tab.view}" (allowed: ${VALID_VIEW_TYPES.join(", ")})`);
    }
  }
  return { tabs };
}

function checkService(workerDir, relWorkerDir, issues) {
  const filePath = path.join(workerDir, "service.js");
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");

  if (!/export\s+const\s+SERVICE_ID\s*=/.test(content)) {
    fail(issues, `${relWorkerDir}/service.js: must export SERVICE_ID`);
  }
  if (!/export\s+const\s+REQUIRED_CAPABILITIES\s*=/.test(content)) {
    fail(issues, `${relWorkerDir}/service.js: must export REQUIRED_CAPABILITIES (array, can be empty)`);
  }
  const fnCount = (content.match(/export\s+function\s+[a-zA-Z_]\w*\s*\(/g) || []).length;
  if (fnCount < 1) {
    fail(issues, `${relWorkerDir}/service.js: must export at least one function`);
  }
  const stripped = stripComments(content);
  if (/process\.env\.[A-Z_][A-Z0-9_]*/.test(stripped)) {
    fail(issues, `${relWorkerDir}/service.js: do not read process.env — declare capabilities instead`);
  }
  checkPlaceholders(filePath, content, issues, `${relWorkerDir}/service.js`);
  checkSecrets(filePath, content, issues, `${relWorkerDir}/service.js`);
}

function checkSampleData(workerDir, relWorkerDir, tabs, issues) {
  const filePath = path.join(workerDir, "sample-data.js");
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  if (!/SAMPLE_CANVAS_PAYLOADS/.test(content)) {
    fail(issues, `${relWorkerDir}/sample-data.js: must export SAMPLE_CANVAS_PAYLOADS`);
  }
  if (tabs && tabs.length) {
    for (const tab of tabs) {
      if (!tab.id) continue;
      const re = new RegExp(`["']${tab.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']\\s*:`);
      if (!re.test(content)) {
        fail(issues, `${relWorkerDir}/sample-data.js: SAMPLE_CANVAS_PAYLOADS is missing an entry for tab id "${tab.id}"`);
      }
    }
  }
  checkPlaceholders(filePath, content, issues, `${relWorkerDir}/sample-data.js`);
  checkSecrets(filePath, content, issues, `${relWorkerDir}/sample-data.js`);
}

function checkAssertions(workerDir, relWorkerDir, issues) {
  const filePath = path.join(workerDir, "tests", "assertions.md");
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  const tcMatches = content.match(/TC-\d{3,}/g) || [];
  const unique = new Set(tcMatches);
  if (unique.size < 5) {
    fail(issues, `${relWorkerDir}/tests/assertions.md: needs at least 5 TC-### assertions (found ${unique.size})`);
  }
}

function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function checkAllFilesForSecrets(workerDir, relWorkerDir, issues) {
  if (!fs.existsSync(workerDir)) return;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if ([".md", ".json", ".js", ".jsx", ".ts", ".tsx", ".html"].includes(ext)) {
          const content = fs.readFileSync(full, "utf8");
          const rel = path.relative(workerDir, full);
          checkSecrets(full, content, issues, `${relWorkerDir}/${rel}`);
        }
      }
    }
  };
  walk(workerDir);
}

function main() {
  const args = parseArgs();

  if (args.help || args.h) {
    console.log("Usage:");
    console.log("  npm run validate-worker -- --worker=<handle>/<slug>");
    console.log("");
    console.log("Example:");
    console.log("  npm run validate-worker -- --worker=ruthie/nursing-education-001");
    process.exit(0);
  }

  if (!args.worker) {
    console.error("Error: --worker=<handle>/<slug> is required");
    console.error("Example: npm run validate-worker -- --worker=ruthie/nursing-education-001");
    process.exit(1);
  }
  const [handle, slug] = String(args.worker).split("/");
  if (!handle || !slug) {
    console.error(`Error: --worker="${args.worker}" must be in the form <handle>/<slug>`);
    process.exit(1);
  }

  const repoRoot = path.resolve(__dirname, "..");
  const workerDir = path.join(repoRoot, "creators", handle, slug);
  const relWorkerDir = path.relative(repoRoot, workerDir);

  if (!fs.existsSync(workerDir)) {
    console.error(`Error: ${relWorkerDir} does not exist.`);
    console.error("");
    console.error("To create a new worker, run: npm run init-worker");
    process.exit(2);
  }

  console.log("");
  console.log(`Validating ${relWorkerDir}...`);
  console.log("");

  const issues = [];
  checkFilesExist(workerDir, relWorkerDir, issues);
  checkIntent(workerDir, relWorkerDir, issues);
  const { tabs } = checkCanvasTabs(workerDir, relWorkerDir, issues);
  checkService(workerDir, relWorkerDir, issues);
  checkSampleData(workerDir, relWorkerDir, tabs, issues);
  checkAssertions(workerDir, relWorkerDir, issues);
  checkAllFilesForSecrets(workerDir, relWorkerDir, issues);

  if (issues.length === 0) {
    console.log("PASS — all DoD checks passed.");
    console.log("");
    console.log("Your worker is ready for PR. Push your fork and open a Pull Request.");
    console.log("A SOCIII maintainer will review it (typically within 24-48 hours).");
    console.log("");
    process.exit(0);
  }

  console.log(`FAIL — ${issues.length} issue(s):`);
  console.log("");
  for (const issue of issues) {
    console.log(`  - ${issue}`);
  }
  console.log("");
  console.log("Fix the above and run again. See docs/CREATOR-WORKER-BUILD.md for the full guide.");
  console.log("");
  process.exit(1);
}

main();
