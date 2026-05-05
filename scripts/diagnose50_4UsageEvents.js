// scripts/diagnose50_4UsageEvents.js — CODEX 50.4 Phase 1 diagnostic
//
// READ-ONLY. Inventories both `usageEvents` (camelCase) and `usage_events`
// (snake_case) collections to determine which Phase 2 path applies.
//
// Outputs:
//   - Document counts in each collection
//   - Earliest + latest createdAt / timestamp / _written_at on each
//   - Revenue-bearing event count (creator_share_amount > 0) on each
//   - Sum of creator_share_amount across all docs in each
//   - Affected Creator list grouped by creator_id with their owed totals
//   - Scenario classification (A / B / C) per spec
//
// Usage:
//   cd functions/functions
//   GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/titleapp_core_gmail.com_application_default_credentials.json \
//     NODE_PATH=./node_modules \
//     node ../../scripts/diagnose50_4UsageEvents.js [--out <path>]
//
// Default output path: docs/CODEX-50.4-Phase1-Diagnostic.md

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outPath = outIdx >= 0 ? args[outIdx + 1] : path.join(__dirname, "..", "docs", "CODEX-50.4-Phase1-Diagnostic.md");

const TIMESTAMP_FIELDS = ["createdAt", "timestamp", "_written_at"];

function pickTimestamp(doc) {
  for (const f of TIMESTAMP_FIELDS) {
    if (doc[f]) {
      try {
        return doc[f].toDate ? doc[f].toDate() : new Date(doc[f]);
      } catch (_) { /* skip */ }
    }
  }
  return null;
}

async function inspectCollection(name) {
  const result = {
    name,
    totalCount: 0,
    earliest: null,
    latest: null,
    revenueBearingCount: 0,
    revenueBearingSum: 0,
    creatorTotals: {},      // creator_id -> sum
    creatorCounts: {},      // creator_id -> count
    fieldsSeen: new Set(),  // keys observed in any doc, for shape verification
    sampleDoc: null,
    notes: [],
  };

  try {
    const snap = await db.collection(name).get();
    result.totalCount = snap.size;

    snap.forEach(doc => {
      const data = doc.data();
      // Track the union of fields ever seen.
      Object.keys(data).slice(0, 50).forEach(k => result.fieldsSeen.add(k));
      if (!result.sampleDoc) result.sampleDoc = { id: doc.id, ...data };

      // Timestamp range — try all known fields.
      const ts = pickTimestamp(data);
      if (ts) {
        if (!result.earliest || ts < result.earliest) result.earliest = ts;
        if (!result.latest || ts > result.latest) result.latest = ts;
      }

      // Revenue-bearing detection (snake or camel).
      const share = data.creator_share_amount ?? data.creatorShareAmount;
      if (typeof share === "number" && share > 0) {
        result.revenueBearingCount++;
        result.revenueBearingSum += share;

        const creatorId = data.creator_id ?? data.creatorId ?? data.userId ?? "<unknown>";
        result.creatorTotals[creatorId] = (result.creatorTotals[creatorId] || 0) + share;
        result.creatorCounts[creatorId] = (result.creatorCounts[creatorId] || 0) + 1;
      }
    });
  } catch (err) {
    result.notes.push(`Query failed: ${err.message}`);
  }

  return result;
}

function fmtDate(d) {
  return d ? d.toISOString().slice(0, 19).replace("T", " ") + " UTC" : "—";
}

function classifyScenario(camel, snake) {
  const camelHas = camel.totalCount > 0;
  const snakeHas = snake.totalCount > 0;
  if (camelHas && !snakeHas) return "B";
  if (!camelHas && snakeHas) return "A";
  if (camelHas && snakeHas) return "C";
  return "EMPTY";
}

function buildReport(camel, snake, scenario) {
  const lines = [];
  lines.push("# CODEX 50.4 Phase 1 — Diagnostic Report");
  lines.push("");
  lines.push(`**Run at:** ${new Date().toISOString()}`);
  lines.push(`**Project:** title-app-alpha`);
  lines.push(`**Mode:** read-only — no writes performed`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | usageEvents (camelCase) | usage_events (snake_case) |");
  lines.push("|---|---|---|");
  lines.push(`| Total document count | ${camel.totalCount.toLocaleString()} | ${snake.totalCount.toLocaleString()} |`);
  lines.push(`| Earliest timestamp | ${fmtDate(camel.earliest)} | ${fmtDate(snake.earliest)} |`);
  lines.push(`| Latest timestamp | ${fmtDate(camel.latest)} | ${fmtDate(snake.latest)} |`);
  lines.push(`| Revenue-bearing count (creator_share_amount > 0) | ${camel.revenueBearingCount.toLocaleString()} | ${snake.revenueBearingCount.toLocaleString()} |`);
  lines.push(`| Sum of creator_share_amount | $${camel.revenueBearingSum.toFixed(2)} | $${snake.revenueBearingSum.toFixed(2)} |`);
  lines.push(`| Distinct creators with shares | ${Object.keys(camel.creatorTotals).length} | ${Object.keys(snake.creatorTotals).length} |`);
  lines.push("");

  lines.push("## Scenario classification");
  lines.push("");
  const scenarioMap = {
    A: "**A — Only snake_case usage_events populated.** Light backfill or accept loss.",
    B: "**B — Only camelCase usageEvents populated.** Full backfill required (Sean authorization).",
    C: "**C — Both populated.** Scoped backfill from split point.",
    EMPTY: "**EMPTY — Neither collection has documents.** Either the platform has zero usage history yet OR neither write path is firing in production. Re-confirm by triggering a synthetic execution.",
  };
  lines.push(`Scenario: ${scenarioMap[scenario]}`);
  lines.push("");

  lines.push("## Field shape (per collection)");
  lines.push("");
  lines.push(`### usageEvents (camelCase) — ${camel.fieldsSeen.size} distinct fields seen`);
  lines.push("```");
  lines.push(Array.from(camel.fieldsSeen).sort().join(", ") || "(no documents)");
  lines.push("```");
  if (camel.sampleDoc) {
    lines.push(`Sample doc id: \`${camel.sampleDoc.id}\``);
    lines.push("```json");
    lines.push(JSON.stringify(camel.sampleDoc, null, 2).slice(0, 1500));
    lines.push("```");
  }
  lines.push("");
  lines.push(`### usage_events (snake_case) — ${snake.fieldsSeen.size} distinct fields seen`);
  lines.push("```");
  lines.push(Array.from(snake.fieldsSeen).sort().join(", ") || "(no documents)");
  lines.push("```");
  if (snake.sampleDoc) {
    lines.push(`Sample doc id: \`${snake.sampleDoc.id}\``);
    lines.push("```json");
    lines.push(JSON.stringify(snake.sampleDoc, null, 2).slice(0, 1500));
    lines.push("```");
  }
  lines.push("");

  // Affected creators (combined from both collections).
  const combined = {};
  for (const [cid, amt] of Object.entries(camel.creatorTotals)) combined[cid] = (combined[cid] || 0) + amt;
  for (const [cid, amt] of Object.entries(snake.creatorTotals)) combined[cid] = (combined[cid] || 0) + amt;
  const creators = Object.entries(combined).sort(([, a], [, b]) => b - a);

  lines.push("## Estimated Creator share — by creator_id");
  lines.push("");
  if (creators.length === 0) {
    lines.push("_No revenue-bearing events found in either collection._");
  } else {
    lines.push("| Creator ID | Total share | Camel events | Snake events |");
    lines.push("|---|---|---|---|");
    for (const [cid, total] of creators) {
      const camelCt = camel.creatorCounts[cid] || 0;
      const snakeCt = snake.creatorCounts[cid] || 0;
      lines.push(`| \`${cid}\` | $${total.toFixed(2)} | ${camelCt} | ${snakeCt} |`);
    }
    const grandTotal = creators.reduce((s, [, a]) => s + a, 0);
    lines.push("");
    lines.push(`**Total creator share across both collections:** $${grandTotal.toFixed(2)}`);
  }
  lines.push("");

  lines.push("## Estimated financial impact");
  lines.push("");
  if (scenario === "B") {
    lines.push(`Under-paid amount (sum of unaggregated camelCase creator_share_amount): **$${camel.revenueBearingSum.toFixed(2)}**`);
    lines.push("");
    lines.push("This is what cycle-close failed to compute because it reads from `usage_events` while writes went to `usageEvents`.");
  } else if (scenario === "A") {
    const camelButNotSnake = Math.max(0, camel.revenueBearingSum);
    lines.push(`Snake_case is canonical. CamelCase has $${camelButNotSnake.toFixed(2)} of telemetry events that may or may not be revenue-bearing — verify field shape above.`);
  } else if (scenario === "C") {
    lines.push(`Snake_case (read path) sum: $${snake.revenueBearingSum.toFixed(2)}`);
    lines.push(`CamelCase (potentially missed by reads) sum: $${camel.revenueBearingSum.toFixed(2)}`);
    const gap = camel.revenueBearingSum - snake.revenueBearingSum;
    if (gap > 0) {
      lines.push(`Gap (camelCase events not visible to read path): **$${gap.toFixed(2)}**`);
    } else {
      lines.push(`Snake_case has at least as many revenue-bearing events as camelCase — no clear under-payment, but verify by inspecting the date ranges to confirm overlap.`);
    }
  } else {
    lines.push("No revenue-bearing events found in either collection.");
  }
  lines.push("");

  lines.push("## Spec-vs-reality reconciliation");
  lines.push("");
  lines.push("**Critical static-analysis finding (independent of the live data above):**");
  lines.push("");
  lines.push("- `usageEvents` (camelCase) is written by 4 code paths: `callWithHealthCheck.js`, `image/generator.js`, `documentControl/documentControlSchema.js`, `campaigns/subscriberDigest.js`. None of these writes include a `creator_share_amount` field. They write only `creditsUsed`, `event_type`, `connectorId`, `userId`, `workerId` etc. — credit-deduction telemetry.");
  lines.push("- `usage_events` (snake_case) is written by exactly one function: `billing/recordUsageEvent.js`. This is the only write path in the entire codebase that produces a `creator_share_amount` field.");
  lines.push("- `recordUsageEvent` is **never invoked** from any production execution path. `grep -rn 'recordUsageEvent('` in `functions/functions/` returns only the function definition itself.");
  lines.push("- `stripeWebhook.js` cycle-close reads `usage_events` and aggregates `creator_share_amount` by `creator_id`. With nothing writing to `usage_events`, this aggregation is computing $0 for every period.");
  lines.push("");
  lines.push("In other words: the bug isn't a name mismatch causing events to land in the wrong place. The bug is that the Creator-share write path (`recordUsageEvent`) was built but never wired into worker execution. The camelCase collection holds telemetry that doesn't include Creator-share data — even if you copied those events to `usage_events`, the field needed for payout aggregation isn't there.");
  lines.push("");

  lines.push("## Recommended next steps");
  lines.push("");
  lines.push("1. **Confirm with Sean which scenario applies** based on the live data above. The static analysis points to scenario B-prime: usage_events is empty AND camelCase doesn't have creator_share_amount fields, which is functionally a no-revenue-events state. No catch-up payouts are owed (because no revenue events ever existed in the canonical store).");
  lines.push("2. **Wire `recordUsageEvent` into worker execution.** Determine the right entry point — likely `index.js` after a successful billable worker call. This is what the spec's Phase 3 'consolidation' should produce.");
  lines.push("3. **If any Creator subscriptions have been monetized** since launch, manually backfill the missing revenue events using Stripe invoice line items or subscription start records as the source of truth — not the `usageEvents` telemetry collection (which lacks the necessary fields).");
  lines.push("");

  lines.push("## Pre-flight notes");
  lines.push("");
  lines.push("- Firestore export of both collections **was not run** by this script. The spec recommends exports as a Phase 1 safety step before any Phase 2 write. This diagnostic is read-only so the export gap is not blocking, but if Phase 2 backfill is authorized, do the gcloud-based export first.");
  lines.push("- gcloud is not installed locally. Sean / DevOps will need to run the export from a machine that has it: `gcloud firestore export gs://title-app-alpha-backups/codex-50-4-pre-phase2 --collection-ids=usageEvents,usage_events,creatorPayouts`");
  lines.push("- Cycle-close handler (`stripeWebhook.js` invoice.paid path) was not disabled during this diagnostic. Read-only queries don't interfere with it.");
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("End of Phase 1 diagnostic. Hand this report to Sean before proceeding to Phase 2.");
  return lines.join("\n");
}

async function main() {
  console.log("CODEX 50.4 Phase 1 — diagnostic starting (read-only)\n");

  console.log("Inspecting usageEvents (camelCase)...");
  const camel = await inspectCollection("usageEvents");
  console.log(`  ${camel.totalCount} docs, ${camel.revenueBearingCount} revenue-bearing`);

  console.log("Inspecting usage_events (snake_case)...");
  const snake = await inspectCollection("usage_events");
  console.log(`  ${snake.totalCount} docs, ${snake.revenueBearingCount} revenue-bearing`);

  const scenario = classifyScenario(camel, snake);
  console.log(`\nScenario: ${scenario}`);

  const report = buildReport(camel, snake, scenario);
  fs.writeFileSync(outPath, report, "utf8");
  console.log(`\nReport written to: ${outPath}`);
  process.exit(0);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
