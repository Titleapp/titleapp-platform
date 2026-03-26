"use strict";

/**
 * scheduledWorkerSync.js — Nightly Catalog-to-Firestore Sync
 *
 * Runs daily at midnight HST (10:00 UTC).
 * Also callable via POST /v1/admin:workers:sync:scheduled
 *
 * Reads all catalog JSONs and syncs catalog-sourced fields to digitalWorkers/.
 * NEVER overwrites admin-set fields: status, trialStatus, qualityStatus,
 * approvedAt, workspaceLaunchPage.
 *
 * Writes a sync report to syncReports/{date}.
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

function getDb() { return admin.firestore(); }

// Fields that come from catalog and are safe to update
const CATALOG_SYNC_FIELDS = [
  "display_name", "headline", "capabilitySummary", "suite",
  "pricing_tier", "raas_tier_0", "raas_tier_1", "raas_tier_2", "raas_tier_3",
  "worker_type", "vault_reads", "vault_writes", "referral_triggers",
  "document_templates", "modeAware", "modes", "modeTiers",
  "highRisk", "groundUseOnly", "documentHierarchy", "documentChecklist",
  "catalogId", "catalogSlug", "catalogPhase", "vertical",
  "temporalType", "alexRegistration", "rulesetId",
];

async function scheduledWorkerSync() {
  const db = getDb();
  const { MARKETPLACE_SLUG_MAP, RULESET_MAP, DISPLAY_NAME_MAP, HEADLINE_MAP, CATALOG_VERTICAL_MAP } = require("../helpers/workerSync");
  const { autoFixWorkerRecord, TIER_0_DEFAULTS } = require("../helpers/workerSchema");

  const results = { checked: 0, created: 0, updated: 0, errors: [], skipped: 0 };

  // Load all catalog JSONs
  const catalogsDir = path.join(__dirname, "../services/alex/catalogs");
  const catalogFiles = fs.readdirSync(catalogsDir).filter(f => f.endsWith(".json"));
  const allWorkers = [];

  for (const file of catalogFiles) {
    try {
      const catalog = JSON.parse(fs.readFileSync(path.join(catalogsDir, file), "utf8"));
      if (Array.isArray(catalog.workers)) {
        const catalogVertical = (CATALOG_VERTICAL_MAP && CATALOG_VERTICAL_MAP[catalog.vertical]) || catalog.vertical || "";
        for (const w of catalog.workers) {
          w._vertical = catalogVertical;
        }
        allWorkers.push(...catalog.workers);
      }
    } catch (err) {
      results.errors.push(`Failed to load ${file}: ${err.message}`);
    }
  }

  console.log(`[scheduledWorkerSync] Loaded ${allWorkers.length} workers from ${catalogFiles.length} catalogs`);

  // Load rulesets directory
  const rulesetsDir = path.join(__dirname, "../raas/rulesets");

  for (const worker of allWorkers) {
    results.checked++;

    const marketplaceSlug = MARKETPLACE_SLUG_MAP[worker.id];
    if (!marketplaceSlug) {
      results.skipped++;
      continue;
    }

    // Load ruleset if available
    const rulesetId = RULESET_MAP[marketplaceSlug];
    let tier1Rules = [];
    let tier2Rules = [];
    let documentTemplates = [];

    if (rulesetId) {
      try {
        const rulesetPath = path.join(rulesetsDir, `${rulesetId}.json`);
        const ruleset = JSON.parse(fs.readFileSync(rulesetPath, "utf8"));
        tier1Rules = (ruleset.hard_stops || []).map(r => `${r.id}: ${r.label}`);
        tier2Rules = (ruleset.soft_flags || []).map(r => `${r.id}: ${r.label}`);
        documentTemplates = ruleset.outputs || [];
      } catch (_) { /* ruleset not found — use empty */ }
    }

    if (tier1Rules.length < 3 && worker.tier1Compliance) {
      for (const rule of worker.tier1Compliance) {
        if (!tier1Rules.includes(rule)) tier1Rules.push(rule);
      }
    }

    const displayName = (DISPLAY_NAME_MAP && DISPLAY_NAME_MAP[worker.id]) || worker.name;
    const headline = (HEADLINE_MAP && HEADLINE_MAP[marketplaceSlug]) || worker.capabilitySummary || displayName;

    // Build catalog-sourced fields only
    const catalogFields = {
      display_name: displayName,
      headline,
      capabilitySummary: worker.capabilitySummary || "",
      suite: worker.suite || null,
      worker_type: worker.type === "orchestrator" ? "orchestrator" : worker.type,
      pricing_tier: worker.pricing?.monthly || 0,
      raas_tier_0: TIER_0_DEFAULTS,
      raas_tier_1: tier1Rules,
      raas_tier_2: tier2Rules,
      raas_tier_3: [],
      vault_reads: (worker.vault && worker.vault.reads) || [],
      vault_writes: (worker.vault && worker.vault.writes) || [],
      referral_triggers: (worker.referrals || []).map(r => `${r.event} → ${r.routesTo}`),
      document_templates: documentTemplates,
      modeAware: worker.modeAware || false,
      modes: worker.modes || [],
      modeTiers: worker.modeTiers || null,
      highRisk: worker.highRisk || false,
      groundUseOnly: worker.groundUseOnly || false,
      documentHierarchy: worker.documentHierarchy || ["titleapp_baseline", "public_regulatory"],
      documentChecklist: worker.documentChecklist || [],
      vertical: worker._vertical || "",
      catalogId: worker.id,
      catalogSlug: worker.slug,
      catalogPhase: worker.phase,
      temporalType: worker.temporalType || "always_on",
      alexRegistration: worker.alexRegistration || null,
      rulesetId: rulesetId || null,
      syncedAt: new Date().toISOString(),
    };

    try {
      const docRef = db.doc(`digitalWorkers/${marketplaceSlug}`);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        // New worker — create with full fields + default status
        const record = { ...catalogFields, status: "waitlist", worker_id: marketplaceSlug };
        const fixed = autoFixWorkerRecord(record);
        await docRef.set(fixed, { merge: true });
        results.created++;
        console.log(`[scheduledWorkerSync] Created: ${marketplaceSlug}`);
      } else {
        // Existing worker — update catalog fields only, never touch admin fields
        await docRef.update(catalogFields);
        results.updated++;
      }
    } catch (err) {
      results.errors.push(`${worker.id} (${marketplaceSlug}): ${err.message}`);
      console.error(`[scheduledWorkerSync] Error syncing ${marketplaceSlug}:`, err.message);
    }
  }

  // Write sync report
  const today = new Date().toISOString().slice(0, 10);
  await db.doc(`syncReports/${today}`).set({
    date: today,
    checkedCount: results.checked,
    createdCount: results.created,
    updatedCount: results.updated,
    skippedCount: results.skipped,
    errorCount: results.errors.length,
    errors: results.errors,
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Send alert email if errors occurred
  if (results.errors.length > 0) {
    try {
      const { sendViaSendGrid } = require("../services/marketingService/emailNotify");
      await sendViaSendGrid({
        to: "sean@titleapp.ai",
        subject: `Worker Sync Alert: ${results.errors.length} error(s)`,
        htmlBody: `<p>Nightly worker sync completed with ${results.errors.length} error(s):</p>
<ul>${results.errors.map(e => `<li>${e}</li>`).join("")}</ul>
<p>Checked: ${results.checked} | Created: ${results.created} | Updated: ${results.updated}</p>`,
      });
    } catch (emailErr) {
      console.warn("[scheduledWorkerSync] Alert email failed:", emailErr.message);
    }
  }

  console.log(`[scheduledWorkerSync] Done: ${results.checked} checked, ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`);
  return results;
}

module.exports = { scheduledWorkerSync };
