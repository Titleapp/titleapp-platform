"use strict";

/**
 * Check: every flowStep value that a flow's onSignaturePacketSigned (or
 * equivalent) writes must be recognized in pendingInvites.js enrichment's
 * "completed" list for the corresponding obligation.
 *
 * Catches:
 *   TC-027 — onSignaturePacketSigned writes "signature_complete" but
 *            pendingInvites enrichment only checked [safe_signed,
 *            safe_complete, closed]. State-machine convention drift.
 *
 * Approach (cheap static scan):
 *   1. Grep every "flowStep:\\s*\"[a-z_]+\"" assignment in flow files.
 *   2. Read the recognized arrays in pendingInvites.js enrichment.
 *   3. Cross-reference: any flowStep value written by a flow but not in
 *      the enrichment's "completed" check is a finding.
 *
 * Limits: regex-only. Doesn't catch dynamically-computed values or
 * cross-collection scenarios. Future v2 can swap to AST parsing.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const FLOW_FILES = [
  "functions/functions/services/ir/advisorFlow.js",
  "functions/functions/services/ir/investorFlow.js",
  "functions/functions/services/creators/creatorFlow.js",
];
const ENRICHMENT_FILE = "functions/functions/services/invites/pendingInvites.js";

function readFile(rel) {
  const p = path.join(REPO_ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}

module.exports = {
  id: "state-machine",
  title: "flowStep values written by flows are recognized by pendingInvites enrichment",
  severity: "p0",

  async run() {
    const findings = [];
    const enrichSrc = readFile(ENRICHMENT_FILE);
    if (!enrichSrc) {
      return {
        ok: false,
        findings: [{
          check: "state-machine",
          severity: "p1",
          tc: null,
          title: "enrichment_file_missing",
          detail: `Could not read ${ENRICHMENT_FILE}.`,
          evidence: {},
        }],
      };
    }

    // Pull every array like ["x","y","z"].includes(entity.flowStep) from the
    // enrichment file. Each array represents a "set of states considered
    // complete for some obligation."
    const recognizedStates = new Set();
    const arrayRe = /\[\s*((?:"[a-z_]+"\s*,?\s*)+)\]\s*\.includes\(\s*entity\.flowStep\s*\)/g;
    let am;
    while ((am = arrayRe.exec(enrichSrc)) !== null) {
      for (const s of am[1].matchAll(/"([a-z_]+)"/g)) {
        recognizedStates.add(s[1]);
      }
    }

    // Now scan each flow file for `flowStep: "x"` assignments (the values
    // the flow actually writes).
    const writtenStates = new Map(); // value → [{file, snippet}]
    for (const rel of FLOW_FILES) {
      const src = readFile(rel);
      if (!src) continue;
      const re = /flowStep:\s*"([a-z_]+)"/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        const value = m[1];
        const lineStart = src.lastIndexOf("\n", m.index) + 1;
        const lineEnd = src.indexOf("\n", m.index);
        const snippet = src.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim();
        if (!writtenStates.has(value)) writtenStates.set(value, []);
        writtenStates.get(value).push({ file: rel, snippet });
      }
    }

    // Compare. Skip transient/in-progress states (not expected to be
    // "completed" markers): flowStep values ending in "_pending" or set
    // by `_create` / "created" patterns are intermediate.
    const TRANSIENT_PATTERNS = [/_pending$/, /^created$/, /^pending$/, /^in_progress$/];
    for (const [value, occurrences] of writtenStates.entries()) {
      if (TRANSIENT_PATTERNS.some(p => p.test(value))) continue;
      if (recognizedStates.has(value)) continue;
      findings.push({
        check: "state-machine",
        severity: "p0",
        tc: "TC-027",
        title: `flowStep "${value}" written but not recognized by enrichment`,
        detail: `Flow code writes flowStep="${value}" but pendingInvites enrichment doesn't include it in any completion-recognition list. The obligation will stay "open" in the workspace banner even though the entity is actually done. ${occurrences.length} occurrence(s) across ${[...new Set(occurrences.map(o => o.file))].join(", ")}.`,
        evidence: { value, occurrences, recognizedStates: [...recognizedStates] },
      });
    }

    return { ok: findings.filter(f => f.severity === "p0").length === 0, findings };
  },
};
