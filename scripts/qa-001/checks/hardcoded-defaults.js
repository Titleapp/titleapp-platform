"use strict";

/**
 * Check: flow code has DEFAULT_* constants for values that should come
 * from the entity's parent record (e.g. fundraise.valuation_cap). If a
 * DEFAULT_* is used as the source-of-truth without a parent-record read
 * earlier in the same function, that's the TC-022 pattern.
 *
 * Catches:
 *   TC-022 — DEFAULT_VALUATION_CAP=$10M hardcoded throughout investorFlow,
 *            ignored the fundraise's actual $25M cap.
 *
 * Approach:
 *   1. Grep DEFAULT_[A-Z_]+ assignments + usages.
 *   2. For each usage in a function, look for the corresponding parent-read
 *      pattern (fundraise.X, advisor.Y, investor.Z, etc.) within the same
 *      function body.
 *   3. Flag any DEFAULT_* used without a matching parent-read.
 *
 * Note: this check is heuristic. Some DEFAULTs are legitimate (fallback when
 * the parent really has no value). Reviewer judgment required on each finding.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const FLOW_DIRS = [
  "functions/functions/services/ir",
  "functions/functions/services/creators",
  "functions/functions/services/fundraise",
];

function walkJs(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) out.push(...walkJs(p));
    else if (f.endsWith(".js")) out.push(p);
  }
  return out;
}

module.exports = {
  id: "hardcoded-defaults",
  title: "Flow code DEFAULT_* constants may shadow parent-record values",
  severity: "p1",

  async run() {
    const findings = [];

    for (const dir of FLOW_DIRS) {
      const fullDir = path.join(REPO_ROOT, dir);
      const files = walkJs(fullDir);
      for (const fullPath of files) {
        const rel = path.relative(REPO_ROOT, fullPath);
        const src = fs.readFileSync(fullPath, "utf8");

        // Find every DEFAULT_* constant.
        const declRe = /const\s+(DEFAULT_[A-Z_]+)\s*=\s*([^;]+);/g;
        const declared = new Map();
        let dm;
        while ((dm = declRe.exec(src)) !== null) {
          declared.set(dm[1], dm[2].trim());
        }
        if (declared.size === 0) continue;

        // For each usage, get the surrounding function block.
        for (const [constName, value] of declared.entries()) {
          const usageRe = new RegExp(`\\b${constName}\\b`, "g");
          let um;
          while ((um = usageRe.exec(src)) !== null) {
            // Skip the declaration line itself
            const lineStart = src.lastIndexOf("\n", um.index) + 1;
            const lineEnd = src.indexOf("\n", um.index);
            const line = src.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
            if (/const\s+DEFAULT_/.test(line)) continue;

            // Walk backward to find the enclosing function declaration.
            const beforeIdx = src.lastIndexOf("\nasync function ", um.index);
            const beforeIdxSync = src.lastIndexOf("\nfunction ", um.index);
            const funcStart = Math.max(beforeIdx, beforeIdxSync);
            if (funcStart === -1) continue;
            const funcHeaderEnd = src.indexOf("{", funcStart);
            if (funcHeaderEnd === -1) continue;

            // Approximate function body: walk braces. Cheap version: take
            // 5KB after the function header.
            const funcBody = src.slice(funcStart, funcHeaderEnd + 5000);

            // Heuristic: was there a fundraise/advisor/investor parent-read
            // earlier in the function?
            const parentReadRe = /\b(?:fundraise|advisor|investor|creator|warrant)(?:Snap|Data|Doc|Ref|\b)\b/;
            if (parentReadRe.test(funcBody)) continue;

            // No parent-read found. Flag.
            findings.push({
              check: "hardcoded-defaults",
              severity: "p1",
              tc: "TC-022",
              title: `${constName} used without parent-record read in same function`,
              detail: `In ${rel}: ${constName}=${value.slice(0, 80)}${value.length > 80 ? "…" : ""} is used at line ${src.slice(0, um.index).split("\n").length} without a fundraise/advisor/investor/creator/warrant lookup earlier in the function. Possible TC-022 — hardcoded default shadowing parent-record source of truth.`,
              evidence: { file: rel, constName, value, line: src.slice(0, um.index).split("\n").length, contextLine: line.trim() },
            });
            break; // one finding per declaration is enough
          }
        }
      }
    }

    return { ok: findings.filter(f => f.severity === "p0").length === 0, findings };
  },
};
