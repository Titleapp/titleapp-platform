// QA-001 check: dead-code
// Scans for symbols that were deliberately removed. If they reappear
// (copy-paste from old branch, revert, etc.) this fires P0.
// Add entries to REMOVED_SYMBOLS whenever you clean up a pattern.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "../../..");

// Each entry: { symbol, description, severity, files (glob patterns to scan) }
const REMOVED_SYMBOLS = [
  // set_priorities — replaced by push_alert / Operating Feed (CODEX 18, 2026-07-04)
  { symbol: "set_priorities", description: "set_priorities tool was replaced by push_alert / Operating Feed", severity: "p0" },
  { symbol: "userPriorities", description: "userPriorities collection removed when set_priorities was cleaned up", severity: "p0" },
  { symbol: "ta:priorities-updated", description: "priorities-updated event removed — no longer emitted or consumed", severity: "p1" },
  { symbol: "fetchedPriorities", description: "fetchedPriorities state removed from MorningBriefCanvas", severity: "p1" },
  // Add new removed symbols here as they are cleaned up
];

// Files/dirs to search (relative to ROOT)
const SEARCH_PATHS = [
  "apps/business/src",
  "functions/functions/index.js",
];

// Paths to explicitly skip (dist, node_modules, etc.)
const SKIP_PATTERNS = ["/node_modules/", "/dist/", "/.git/", "/qa-001/"];

function grepInFile(filePath, symbol) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const hits = [];
    lines.forEach((line, i) => {
      // Skip comment-only lines
      const trimmed = line.trimStart();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
      if (line.includes(symbol)) {
        hits.push({ line: i + 1, text: line.trim().slice(0, 120) });
      }
    });
    return hits;
  } catch { return []; }
}

function walkDir(dir, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (SKIP_PATTERNS.some(p => full.includes(p))) continue;
    if (e.isDirectory()) walkDir(full, results);
    else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) results.push(full);
  }
  return results;
}

module.exports = {
  id: "dead-code",
  title: "Removed symbols do not reappear (dead-code guard)",
  severity: "p0",
  async run() {
    const findings = [];

    // Collect files to scan
    const files = [];
    for (const sp of SEARCH_PATHS) {
      const full = path.join(ROOT, sp);
      if (!fs.existsSync(full)) continue;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walkDir(full, files);
      else files.push(full);
    }

    for (const entry of REMOVED_SYMBOLS) {
      const { symbol, description, severity } = entry;
      const found = [];
      for (const f of files) {
        const hits = grepInFile(f, symbol);
        if (hits.length) found.push({ file: path.relative(ROOT, f), hits });
      }
      if (found.length) {
        findings.push({
          check: "dead-code",
          severity,
          title: `Removed symbol reappeared: "${symbol}"`,
          detail: `${description}. Found in ${found.length} file(s):\n${found.map(f => `  ${f.file}: lines ${f.hits.map(h => h.line).join(", ")}`).join("\n")}`,
          evidence: { symbol, found },
        });
      }
    }

    return { ok: findings.filter(f => f.severity === "p0").length === 0, findings };
  },
};
