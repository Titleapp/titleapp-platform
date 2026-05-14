"use strict";

/**
 * regulatoryIngest/index.js — CODEX 50.17 P0-1 entrypoint
 *
 * Orchestrates the per-source adapters and writes a per-run report to
 * regulatoryIngestRuns/{runId} for observability.
 *
 * Two callers:
 *   - Scheduled: `regulatoryIngestDaily` Cloud Function (onSchedule)
 *   - Manual trigger: POST /v1/admin:regulatory:ingest (admin-only)
 *
 * Adapters are isolated. One failure does not block others. Per-source
 * results bubble up to the run record.
 */

const admin = require("firebase-admin");
const secEdgar = require("./adapters/secEdgar");
const federalRegister = require("./adapters/federalRegister");
const cfpb = require("./adapters/cfpb");

const ADAPTERS = {
  "sec-edgar": secEdgar,
  "federal-register": federalRegister,
  "cfpb": cfpb,
};

function getDb() { return admin.firestore(); }

/**
 * Run all enabled adapters. Returns a per-run summary.
 * @param {object} [opts]
 * @param {string[]} [opts.sources] — subset of adapter IDs to run; default = all
 * @param {string}   [opts.trigger] — "scheduled" | "manual" | "test"
 */
async function runIngest(opts = {}) {
  const sources = opts.sources && opts.sources.length > 0
    ? opts.sources.filter(s => ADAPTERS[s])
    : Object.keys(ADAPTERS);
  const trigger = opts.trigger || "scheduled";

  const db = getDb();
  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = admin.firestore.FieldValue.serverTimestamp();

  await db.collection("regulatoryIngestRuns").doc(runId).set({
    runId,
    trigger,
    sources,
    startedAt,
    status: "running",
  });

  const perSource = [];
  let totals = { attempted: 0, created: 0, updated: 0, unchanged: 0, failed: 0 };

  for (const sourceId of sources) {
    const adapter = ADAPTERS[sourceId];
    let result;
    try {
      result = await adapter.ingest();
    } catch (e) {
      result = { source: sourceId, attempted: 0, created: 0, updated: 0, unchanged: 0, failed: 1, errors: [`adapter-throw: ${e.message}`] };
    }
    perSource.push(result);
    totals.attempted += result.attempted || 0;
    totals.created += result.created || 0;
    totals.updated += result.updated || 0;
    totals.unchanged += result.unchanged || 0;
    totals.failed += result.failed || 0;
  }

  await db.collection("regulatoryIngestRuns").doc(runId).update({
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: "completed",
    perSource,
    totals,
  });

  return { runId, totals, perSource };
}

module.exports = { runIngest, ADAPTERS };
