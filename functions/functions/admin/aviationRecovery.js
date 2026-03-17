/**
 * aviationRecovery.js — 34.2 Aviation Worker Recovery
 *
 * Searches for missing GA aircraft CoPilot workers from Session 26,
 * cross-references with vault documents, recovers and publishes
 * complete workers, flags incomplete ones.
 *
 * Recovery steps:
 *   1. SEARCH VAULT — query vault for aviation docs (AFMs, SOPs, GOMs, MMELs)
 *   2. SEARCH WORKERS — query workers collection for unpublished aviation workers
 *   3. CROSS-REFERENCE — match vault docs to workers
 *   4. RECOVER — publish complete workers, flag incomplete
 *   5. REPORT — summary of findings
 *
 * Also ensures workerSync loads all 3 catalogs (RE, Aviation, Auto).
 *
 * Deployed as route: POST /v1/admin:aviationRecovery
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const AVIATION_DOC_TYPES = [
  "afm", "aircraft_flight_manual",
  "sop", "standard_operating_procedure",
  "gom", "general_operations_manual",
  "mmel", "master_minimum_equipment_list",
  "mel", "minimum_equipment_list",
  "checklist", "performance_data",
  "weight_balance", "poh", "pilots_operating_handbook",
];

const AVIATION_WORKER_PREFIXES = ["AV-", "av-"];

async function runAviationRecovery(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  }

  const dryRun = req.query.dryRun === "true";
  const db = getDb();

  const report = {
    dryRun,
    vaultDocs: { total: 0, aviation: 0, byType: {} },
    workers: { total: 0, unpublished: 0, published: 0, missing: 0 },
    catalogSync: { total: 0, alreadySynced: 0, newlySynced: 0, failed: 0 },
    crossReference: [],
    recovered: [],
    flaggedIncomplete: [],
  };

  try {
    // ── 1. SEARCH VAULT — aviation documents across all tenants ──
    const vaultCollections = ["vaultRecords", "documents", "files"];
    const aviationDocs = [];

    for (const collName of vaultCollections) {
      try {
        const snap = await db.collection(collName).get();
        for (const doc of snap.docs) {
          const data = doc.data();
          const docType = (data.type || data.documentType || data.category || "").toLowerCase();
          const docName = (data.name || data.title || data.fileName || "").toLowerCase();
          const vertical = (data.vertical || "").toLowerCase();

          const isAviation = vertical === "aviation" ||
            AVIATION_DOC_TYPES.some(t => docType.includes(t) || docName.includes(t)) ||
            docName.includes("aircraft") || docName.includes("flight") ||
            docName.includes("pilot") || docName.includes("faa") ||
            docName.includes("aviation");

          if (isAviation) {
            aviationDocs.push({
              id: doc.id,
              collection: collName,
              name: data.name || data.title || data.fileName || "unnamed",
              type: docType,
              vertical: data.vertical || "unknown",
              tenantId: data.tenantId || null,
              createdAt: data.createdAt || null,
            });
          }
        }
      } catch (e) {
        // Collection may not exist — skip
      }
    }

    report.vaultDocs.total = aviationDocs.length;
    report.vaultDocs.aviation = aviationDocs.length;
    for (const doc of aviationDocs) {
      const t = doc.type || "unknown";
      report.vaultDocs.byType[t] = (report.vaultDocs.byType[t] || 0) + 1;
    }

    // ── 2. SEARCH WORKERS — aviation workers in workers collection ──
    const workersSnap = await db.collection("workers").get();
    const aviationWorkers = [];

    for (const doc of workersSnap.docs) {
      const data = doc.data();
      const vertical = (data.vertical || "").toLowerCase();
      const name = (data.name || data.title || data.display_name || "").toLowerCase();
      const id = doc.id.toLowerCase();

      const isAviation = vertical === "aviation" ||
        vertical.includes("aviat") ||
        AVIATION_WORKER_PREFIXES.some(p => id.startsWith(p)) ||
        name.includes("aircraft") || name.includes("flight") ||
        name.includes("pilot") || name.includes("aviation") ||
        name.includes("copilot");

      if (isAviation) {
        report.workers.total++;
        aviationWorkers.push({
          id: doc.id,
          name: data.name || data.title || data.display_name || "unnamed",
          vertical: data.vertical,
          published: data.published === true,
          status: data.status || "unknown",
          creatorId: data.creatorId || null,
          pricingTier: data.monthlyPrice || data.pricingTier || data.pricing_tier || 0,
          hasRules: Array.isArray(data.raas_tier_1) && data.raas_tier_1.length > 0,
          hasDescription: !!(data.description || data.capabilitySummary),
        });

        if (data.published) report.workers.published++;
        else report.workers.unpublished++;
      }
    }

    // ── 3. CHECK digitalWorkers for synced aviation catalog entries ──
    const dwSnap = await db.collection("digitalWorkers").get();
    const syncedSlugs = new Set();
    for (const doc of dwSnap.docs) {
      const data = doc.data();
      if (doc.id.startsWith("av-") || (data.catalogId || "").startsWith("AV-")) {
        syncedSlugs.add(doc.id);
      }
    }

    // ── 4. CROSS-REFERENCE catalog vs synced ──
    const fs = require("fs");
    const path = require("path");
    const catalogPath = path.join(__dirname, "../services/alex/catalogs/aviation.json");
    const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
    const { MARKETPLACE_SLUG_MAP } = require("../helpers/workerSync");

    for (const worker of catalog.workers) {
      const slug = MARKETPLACE_SLUG_MAP[worker.id];
      report.catalogSync.total++;

      if (!slug) {
        report.flaggedIncomplete.push({
          id: worker.id,
          name: worker.name,
          reason: "No marketplace slug mapping",
        });
        continue;
      }

      if (syncedSlugs.has(slug)) {
        report.catalogSync.alreadySynced++;
      } else {
        report.catalogSync.newlySynced++;
        report.crossReference.push({
          catalogId: worker.id,
          slug,
          name: worker.name,
          status: worker.status,
          price: worker.pricing.monthly,
          action: "needs_sync",
        });
      }
    }

    // ── 5. RECOVER — run sync for unsynced aviation workers ──
    if (!dryRun && report.catalogSync.newlySynced > 0) {
      const { syncCatalogWorkers } = require("../helpers/workerSync");
      const aviationWorkerIds = report.crossReference
        .filter(w => w.action === "needs_sync")
        .map(w => w.catalogId);

      try {
        const syncResult = await syncCatalogWorkers(db, { workerIds: aviationWorkerIds });
        report.recovered = syncResult.details.filter(d => d.status === "synced");
        report.catalogSync.failed = syncResult.failed;

        // Mark synced entries
        for (const detail of syncResult.details) {
          const entry = report.crossReference.find(w => w.catalogId === detail.id);
          if (entry) {
            entry.action = detail.status === "synced" ? "recovered" : detail.status;
          }
        }
      } catch (e) {
        console.error("[aviationRecovery] Sync failed:", e);
        report.catalogSync.failed = aviationWorkerIds.length;
      }
    }

    // ── 6. FLAG incomplete workers ──
    for (const w of aviationWorkers) {
      if (!w.published && !w.hasRules && !w.hasDescription) {
        report.flaggedIncomplete.push({
          id: w.id,
          name: w.name,
          reason: "Unpublished, no rules, no description",
        });
      } else if (!w.published && (!w.hasRules || !w.hasDescription)) {
        report.flaggedIncomplete.push({
          id: w.id,
          name: w.name,
          reason: !w.hasRules ? "Missing rules" : "Missing description",
        });
      }
    }

    // Workers from catalog with no slug mapping
    report.workers.missing = report.flaggedIncomplete.length;

    console.log("[aviationRecovery] Report:", JSON.stringify(report, null, 2));
    return res.json({ ok: true, ...report });
  } catch (e) {
    console.error("[aviationRecovery] Error:", e);
    return res.status(500).json({ ok: false, error: e.message, code: "INTERNAL_ERROR" });
  }
}

module.exports = { runAviationRecovery };
