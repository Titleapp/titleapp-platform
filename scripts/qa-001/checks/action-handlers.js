"use strict";

/**
 * Check: every action string declared in pendingInvites.DEFAULT_OBLIGATIONS
 * (e.g. "ir:investor:step:start_safe_signing") must have a matching handler
 * in functions/functions/index.js (the route action switch).
 *
 * Catches:
 *   TC-021 — Obligation declared start_safe_signing but route only knew
 *            start_signature. Banner clicks → "Unknown action" error.
 *
 * Approach:
 *   1. Parse pendingInvites.DEFAULT_OBLIGATIONS for { action: "x:y:z:VERB" }.
 *   2. Split each into route prefix (e.g. /v1/ir:investor:step) + VERB.
 *   3. Read index.js, find each route block, scan for handled action verbs.
 *   4. Flag any declared verb that has no handler.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const OBLIGATIONS_FILE = "functions/functions/services/invites/pendingInvites.js";
const INDEX_FILE = "functions/functions/index.js";

function readFile(rel) {
  const p = path.join(REPO_ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}

module.exports = {
  id: "action-handlers",
  title: "Obligation actions have route handlers",
  severity: "p0",

  async run() {
    const findings = [];
    const obSrc = readFile(OBLIGATIONS_FILE);
    const idxSrc = readFile(INDEX_FILE);
    if (!obSrc || !idxSrc) {
      return {
        ok: false,
        findings: [{
          check: "action-handlers",
          severity: "p1",
          tc: null,
          title: "source_files_missing",
          detail: "Could not read pendingInvites.js or index.js.",
          evidence: { obligationsFound: !!obSrc, indexFound: !!idxSrc },
        }],
      };
    }

    // Parse declared action strings from DEFAULT_OBLIGATIONS.
    const actionRe = /action:\s*"([^"]+)"/g;
    const declared = new Set();
    let am;
    while ((am = actionRe.exec(obSrc)) !== null) {
      declared.add(am[1]);
    }

    // Group by route prefix.
    const byRoute = new Map();
    for (const action of declared) {
      // Action format: "ir:investor:step:start_safe_signing"
      // → route: "/v1/ir:investor:step"  verb: "start_safe_signing"
      const parts = action.split(":");
      if (parts.length < 2) continue;
      const verb = parts[parts.length - 1];
      const routePath = "/" + parts.slice(0, -1).join(":");
      if (!byRoute.has(routePath)) byRoute.set(routePath, new Set());
      byRoute.get(routePath).add(verb);
    }

    // For each route, find its handler block in index.js + extract handled verbs.
    for (const [routePath, expectedVerbs] of byRoute.entries()) {
      // Find: `if (route === "<routePath>" && method === "POST")` ... action handling block
      const routeRe = new RegExp(`if\\s*\\(\\s*route\\s*===\\s*"${routePath.replace(/[:/]/g, "\\$&")}"\\s*&&\\s*method\\s*===\\s*"POST"\\s*\\)([\\s\\S]*?)(?=\\n\\s{0,4}if\\s*\\(|\\n\\s{0,4}return\\s+jsonError|\\n\\s{0,4}\\}\\s*\\n\\s{0,4}\\/\\/)`, "m");
      const rm = routeRe.exec(idxSrc);
      if (!rm) {
        for (const verb of expectedVerbs) {
          findings.push({
            check: "action-handlers",
            severity: "p0",
            tc: "TC-021",
            title: `Route ${routePath} not found for action verb "${verb}"`,
            detail: `Obligation declares action "${routePath.slice(1).replace(/\//g, ":")}:${verb}" but no POST route block for ${routePath} exists in index.js.`,
            evidence: { routePath, verb },
          });
        }
        continue;
      }
      const handlerBlock = rm[1];

      // Find every action handled. Patterns like `if (action === "x")` or
      // `if (action === "x" || action === "y")`.
      const handledVerbs = new Set();
      const handledRe = /action\s*===\s*"([^"]+)"/g;
      let hm;
      while ((hm = handledRe.exec(handlerBlock)) !== null) {
        handledVerbs.add(hm[1]);
      }

      for (const verb of expectedVerbs) {
        if (handledVerbs.has(verb)) continue;
        findings.push({
          check: "action-handlers",
          severity: "p0",
          tc: "TC-021",
          title: `Action "${verb}" declared on ${routePath} but not handled`,
          detail: `Obligation declares action "${routePath.slice(1).replace(/\//g, ":")}:${verb}". Route handler block exists but has no matching action===\"${verb}\" branch. Click → "Unknown action" error.`,
          evidence: { routePath, verb, handledVerbs: [...handledVerbs], expectedVerbs: [...expectedVerbs] },
        });
      }
    }

    return { ok: findings.filter(f => f.severity === "p0").length === 0, findings };
  },
};
