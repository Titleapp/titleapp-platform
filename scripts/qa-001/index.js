#!/usr/bin/env node
"use strict";

/**
 * QA-001 — worker testing harness.
 *
 * Runs a set of structural + integration checks that catch the bug classes
 * we've seen in real dogfood sessions. Each check is a module under ./checks/
 * exporting { id, title, severity, run() -> {ok, findings[]} }.
 *
 * Findings shape:
 *   {
 *     check: string,        // check id
 *     severity: "p0"|"p1"|"p2",
 *     tc: string,           // related TC entry from docs/QA-001-TEST-CORPUS.md
 *     title: string,        // one-line summary
 *     detail: string,       // longer explanation
 *     evidence: object,     // structured data for re-running / reproducing
 *   }
 *
 * Success metric (memory: feedback_qa001_success_metric.md):
 *   Bugs caught here / total bugs caught in this build's lifecycle.
 *
 * Usage:
 *   node scripts/qa-001/index.js              # run all checks
 *   node scripts/qa-001/index.js --check=template-sanity
 *   node scripts/qa-001/index.js --json       # JSON output instead of console
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const onlyCheck = args.find(a => a.startsWith("--check="))?.split("=")[1];
const jsonOutput = args.includes("--json");

const CHECKS_DIR = path.join(__dirname, "checks");
const checks = fs.readdirSync(CHECKS_DIR)
  .filter(f => f.endsWith(".js"))
  .map(f => require(path.join(CHECKS_DIR, f)))
  .filter(c => !onlyCheck || c.id === onlyCheck);

(async () => {
  const startedAt = new Date().toISOString();
  const results = [];

  for (const check of checks) {
    if (!jsonOutput) {
      process.stderr.write(`[qa-001] running ${check.id}…\n`);
    }
    const t0 = Date.now();
    let result;
    try {
      result = await check.run();
    } catch (e) {
      result = {
        ok: false,
        findings: [{
          check: check.id,
          severity: "p0",
          tc: null,
          title: "check_threw",
          detail: `Check itself threw: ${e.message}`,
          evidence: { stack: e.stack },
        }],
      };
    }
    results.push({
      check: check.id,
      title: check.title,
      severity: check.severity,
      durationMs: Date.now() - t0,
      ok: result.ok,
      findings: result.findings || [],
    });
  }

  const allFindings = results.flatMap(r => r.findings);
  const summary = {
    startedAt,
    durationMs: results.reduce((s, r) => s + r.durationMs, 0),
    checksRan: results.length,
    checksPassed: results.filter(r => r.ok).length,
    findingsTotal: allFindings.length,
    findingsBySeverity: {
      p0: allFindings.filter(f => f.severity === "p0").length,
      p1: allFindings.filter(f => f.severity === "p1").length,
      p2: allFindings.filter(f => f.severity === "p2").length,
    },
    findingsByTc: Object.fromEntries(
      Object.entries(allFindings.reduce((acc, f) => {
        if (f.tc) acc[f.tc] = (acc[f.tc] || 0) + 1;
        return acc;
      }, {}))
    ),
  };

  if (jsonOutput) {
    console.log(JSON.stringify({ summary, results }, null, 2));
  } else {
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("QA-001 RUN SUMMARY");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`Started: ${summary.startedAt}`);
    console.log(`Duration: ${(summary.durationMs / 1000).toFixed(1)}s`);
    console.log(`Checks: ${summary.checksPassed}/${summary.checksRan} passed`);
    console.log(`Findings: ${summary.findingsTotal} (P0:${summary.findingsBySeverity.p0} P1:${summary.findingsBySeverity.p1} P2:${summary.findingsBySeverity.p2})`);
    if (Object.keys(summary.findingsByTc).length > 0) {
      console.log(`By TC: ${Object.entries(summary.findingsByTc).map(([tc, n]) => `${tc}×${n}`).join(", ")}`);
    }
    console.log();

    for (const r of results) {
      const icon = r.ok ? "✓" : "✗";
      console.log(`${icon} ${r.check} — ${r.title} (${r.durationMs}ms)`);
      for (const f of r.findings) {
        console.log(`    [${f.severity.toUpperCase()}${f.tc ? " " + f.tc : ""}] ${f.title}`);
        if (f.detail) console.log(`        ${f.detail}`);
      }
    }
    console.log();
  }

  process.exit(allFindings.some(f => f.severity === "p0") ? 1 : 0);
})().catch(e => { console.error("FATAL:", e.stack); process.exit(2); });
