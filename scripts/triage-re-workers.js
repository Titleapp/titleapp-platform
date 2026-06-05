#!/usr/bin/env node
/**
 * triage-re-workers.js
 *
 * One-shot scan of the two Real Estate catalogs to produce a
 * presentability ranking for Sean's Scott Eschelman + Kim Bennett
 * Monday meeting (#416).
 *
 * Output: ~/Downloads/RE-worker-triage-2026-06-05.md with three
 * tiers — SHOW (top demoable), CONDITIONAL (with caveats), HIDE
 * (do not pull up).
 *
 * Scoring criteria, weighted:
 *   - status === "live"                       +30  (table stakes)
 *   - canvasTabs.length >= 3                  +20  (visual demo)
 *   - capabilitySummary length >= 60 chars    +10  (has a real pitch)
 *   - tier1Compliance present + non-trivial    +5
 *   - vault.outputs present + non-empty        +5
 *   - alexRegistration present                 +5
 *   - referrals present                        +3
 *   - name doesn't contain TBD/TODO/FIXME     +5  (clean naming)
 *   - capabilitySummary doesn't say "coming"  +5
 *
 * Higher score = more demoable.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const CATS = [
  { file: "real-estate-development.json", label: "RE Development (Scott)" },
  { file: "real-estate-professional.json", label: "RE Professional / Brokerage (Kim)" },
];

const CATALOGS_DIR = path.join(__dirname, "..", "functions", "functions", "services", "alex", "catalogs");

function scoreWorker(w) {
  // Catalog files in services/alex/catalogs/ don't carry canvasTabs —
  // those are propagated to Firestore by workerSync (S51.28). So we
  // score on what's resident in the catalog file only: status, pitch
  // depth, compliance, vault outputs, alex/cross-worker awareness,
  // and clean naming.
  let score = 0;
  const reasons = [];

  if (w.status === "live") { score += 30; reasons.push("live"); }
  else reasons.push(`status:${w.status || "(none)"}`);

  const cap = (w.capabilitySummary || w.summary || "").trim();
  if (cap.length >= 150) { score += 20; reasons.push("deep pitch"); }
  else if (cap.length >= 60) { score += 12; reasons.push("real pitch"); }
  else if (cap.length > 0) reasons.push("pitch brief");
  else reasons.push("NO pitch");

  const compKeys = w.tier1Compliance ? Object.keys(w.tier1Compliance).length : 0;
  if (compKeys >= 3) { score += 12; reasons.push(`${compKeys} compliance refs`); }
  else if (compKeys > 0) { score += 5; reasons.push(`${compKeys} compliance refs`); }

  const vaultOutputs = w.vault?.outputs;
  const vaultOutputCount = vaultOutputs ? (Array.isArray(vaultOutputs) ? vaultOutputs.length : Object.keys(vaultOutputs).length) : 0;
  if (vaultOutputCount > 0) { score += 8; reasons.push(`${vaultOutputCount} vault outputs`); }

  if (w.alexRegistration) { score += 10; reasons.push("alex-aware"); }
  if (w.referrals) {
    const refCount = Array.isArray(w.referrals) ? w.referrals.length : Object.keys(w.referrals).length;
    score += Math.min(8, refCount * 2);
    if (refCount > 0) reasons.push(`${refCount} cross-worker refs`);
  }
  if (w.valueBucket) { score += 5; reasons.push(`tier:${w.valueBucket}`); }

  const dirty = /tbd|todo|fixme|placeholder|coming\s*soon/i;
  if (!dirty.test(JSON.stringify({ name: w.name, cap }))) {
    score += 5;
  } else {
    reasons.push("DIRTY (TBD/TODO/coming soon)");
  }

  return { score, reasons };
}

function tier(score) {
  if (score >= 60) return "SHOW";
  if (score >= 40) return "CONDITIONAL";
  return "HIDE";
}

function main() {
  const lines = [];
  const push = (s) => lines.push(s);

  push(`# RE Worker Triage — Scott + Kim Monday Meeting`);
  push("");
  push(`Generated: ${new Date().toISOString()}`);
  push(`Catalogs scanned: real-estate-development.json (52 workers) + real-estate-professional.json (13 workers)`);
  push("");
  push(`**How to use this:** the SHOW tier is your safe demo list — pick 8-10 from there. CONDITIONAL is "could open if asked, with caveats." HIDE is "do not click during the meeting."`);
  push("");
  push(`Scoring criteria (max ~85): status:live (+30) · canvasTabs >=3 (+20) · pitch >=60 chars (+10) · compliance (+5) · vault outputs (+5) · alex-aware (+5) · cross-worker (+3) · clean naming (+5).`);
  push("");

  let allRanked = [];

  for (const cat of CATS) {
    const catalog = require(path.join(CATALOGS_DIR, cat.file));
    const workers = catalog.workers || [];
    push(`## ${cat.label} (${workers.length} workers)`);
    push("");

    const ranked = workers.map(w => {
      const { score, reasons } = scoreWorker(w);
      return {
        id: w.id,
        slug: w.slug,
        name: w.name,
        suite: w.suite || "(no suite)",
        phase: w.phase || "?",
        status: w.status || "(none)",
        score,
        tier: tier(score),
        reasons,
        cap: (w.capabilitySummary || w.summary || "").slice(0, 200),
        catalog: cat.label,
      };
    }).sort((a, b) => b.score - a.score);

    allRanked.push(...ranked);
  }

  // Cross-catalog tiers
  const show = allRanked.filter(r => r.tier === "SHOW").sort((a, b) => b.score - a.score);
  const conditional = allRanked.filter(r => r.tier === "CONDITIONAL").sort((a, b) => b.score - a.score);
  const hide = allRanked.filter(r => r.tier === "HIDE").sort((a, b) => b.score - a.score);

  push(`---`);
  push(``);
  push(`## SHOW tier — ${show.length} workers`);
  push(``);
  push(`The presentable suite. Pick 8-10 from these for the Monday demo.`);
  push(``);
  for (const w of show) {
    push(`### ${w.score} | ${w.id} — ${w.name}`);
    push(`*${w.catalog} → ${w.suite}*`);
    push(``);
    push(`- **Slug:** \`${w.slug}\``);
    push(`- **Status:** ${w.status}`);
    push(`- **Phase:** ${w.phase}`);
    push(`- **Signals:** ${w.reasons.join(" · ")}`);
    if (w.cap) push(`- **Pitch:** ${w.cap}`);
    push(``);
  }

  push(`---`);
  push(``);
  push(`## CONDITIONAL tier — ${conditional.length} workers`);
  push(``);
  push(`Open if asked but expect rough edges. NOT for opening the meeting with.`);
  push(``);
  for (const w of conditional) {
    push(`- **${w.score}** | ${w.id} — ${w.name} (${w.status}, ${w.reasons.join(", ")})`);
  }
  push(``);

  push(`---`);
  push(``);
  push(`## HIDE tier — ${hide.length} workers`);
  push(``);
  push(`Skip during the meeting. Most are waitlist / no canvas / placeholder. Useful as "and we have N more on the roadmap" volume metric — never click into one.`);
  push(``);
  for (const w of hide) {
    push(`- ${w.id} — ${w.name} (score ${w.score}, ${w.reasons.slice(0, 3).join(", ")})`);
  }
  push(``);

  push(`---`);
  push(``);
  push(`## Summary`);
  push(``);
  push(`- **SHOW:** ${show.length} workers — your demo bench`);
  push(`- **CONDITIONAL:** ${conditional.length} workers — backup, talk before click`);
  push(`- **HIDE:** ${hide.length} workers — do not show`);
  push(``);
  push(`Top SHOW workers by score:`);
  for (const w of show.slice(0, 10)) {
    push(`  ${w.score}. ${w.id} — ${w.name}`);
  }

  const out = lines.join("\n");
  const outPath = path.join(process.env.HOME, "Downloads", "RE-worker-triage-2026-06-05.md");
  fs.writeFileSync(outPath, out);
  console.log(`✓ Wrote ${outPath}`);
  console.log(`  SHOW: ${show.length} · CONDITIONAL: ${conditional.length} · HIDE: ${hide.length}`);
  console.log(`\nTop 10 SHOW:`);
  for (const w of show.slice(0, 10)) {
    console.log(`  ${w.score}. ${w.id} — ${w.name}`);
  }
}

main();
