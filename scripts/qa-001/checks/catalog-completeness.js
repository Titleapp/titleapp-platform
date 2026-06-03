"use strict";

/**
 * Check: every worker in every catalog under
 *   functions/functions/services/alex/catalogs/*.json
 * carries the structural fields that workerSync writes through to
 *   digitalWorkers/{slug}.
 *
 * Catches:
 *   TC-001 — workerSync silently drops canvasTabs / constraintRaasSources /
 *            controlCenterContribution / intent
 *   TC-004 — Worker default landing reflects current catalog (no stale
 *            KPI cards without a controlCenterContribution declaration)
 *   TC-005 — Demo fixtures fire on tab click (every canvasTab has a
 *            non-empty signal + label)
 *
 * Static check only — does not touch Firestore. The sync-parity check
 * (Firestore mirror matches catalog deep-equal) is the next layer and
 * lives in a separate check that needs admin SDK.
 *
 * Scope: ALL catalog files (not just legal). Adding a new worker without
 * required structural fields is the bug class — surface it everywhere.
 */

const fs = require("fs");
const path = require("path");
const {
  validateCatalog,
  VALID_TYPES,
  VALID_STATUSES,
  VALID_TEMPORAL_TYPES,
} = require(path.join(__dirname, "..", "..", "..", "functions", "functions", "services", "alex", "catalogs", "schema"));

const CATALOGS_DIR = path.join(__dirname, "..", "..", "..", "functions", "functions", "services", "alex", "catalogs");

const REQUIRED_WORKER_FIELDS = [
  "id",
  "slug",
  "name",
  "type",
  "status",
  "temporalType",
  "capabilitySummary",
];

// Canonical pricing ladder per Sean 2026-06-02.
// INDIVIDUAL WORKERS price at one of [0, 29, 49, 79].
// $99 is reserved for Business in a Box (a bundle program loaded with multiple workers to run a company),
// NOT an individual worker tier.
// Enterprise/AG/insurer tiers are NEVER exposed in public catalogs — those are negotiated, not published.
const PRICE_LADDER = [0, 29, 49, 79];
const BUSINESS_IN_A_BOX_PRICE = 99;

const STRUCTURAL_FIELDS = [
  "canvasTabs",
  "constraintRaasSources",
  "controlCenterContribution",
  "intent",
];

const CANVAS_TAB_REQUIRED = ["id", "label", "signal"];

function listCatalogFiles() {
  return fs.readdirSync(CATALOGS_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => ({ vertical: f.replace(".json", ""), filePath: path.join(CATALOGS_DIR, f) }));
}

function readCatalog(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    return { __parseError: e.message };
  }
}

module.exports = {
  id: "catalog-completeness",
  title: "Every worker in every catalog has the structural fields workerSync writes through",
  severity: "p0",

  async run() {
    const findings = [];

    for (const { vertical, filePath } of listCatalogFiles()) {
      const catalog = readCatalog(filePath);
      if (catalog.__parseError) {
        findings.push({
          check: "catalog-completeness",
          severity: "p0",
          tc: "TC-001",
          title: `${vertical}: catalog JSON unparseable`,
          detail: `Cannot read ${vertical}.json: ${catalog.__parseError}`,
          evidence: { vertical, filePath },
        });
        continue;
      }

      const schemaCheck = validateCatalog(catalog);
      if (!schemaCheck.valid) {
        for (const err of schemaCheck.errors) {
          findings.push({
            check: "catalog-completeness",
            severity: "p0",
            tc: "TC-001",
            title: `${vertical}: schema violation`,
            detail: err,
            evidence: { vertical, error: err },
          });
        }
      }

      for (const w of (catalog.workers || [])) {
        const wid = w.id || w.slug || "unknown";

        for (const field of REQUIRED_WORKER_FIELDS) {
          if (w[field] === undefined || w[field] === null || w[field] === "") {
            findings.push({
              check: "catalog-completeness",
              severity: "p0",
              tc: "TC-001",
              title: `${vertical}/${wid}: missing required field "${field}"`,
              detail: `Worker ${wid} in ${vertical}.json has no ${field}. Catalog will load but worker UI will fall back to generic defaults.`,
              evidence: { vertical, workerId: wid, field },
            });
          }
        }

        for (const field of STRUCTURAL_FIELDS) {
          if (w[field] === undefined || w[field] === null) {
            findings.push({
              check: "catalog-completeness",
              severity: "p1",
              tc: "TC-001",
              title: `${vertical}/${wid}: missing structural field "${field}"`,
              detail: `Worker ${wid} has no ${field}. workerSync will not write this field and the frontend will use generic defaults.`,
              evidence: { vertical, workerId: wid, field },
            });
          }
        }

        if (Array.isArray(w.canvasTabs)) {
          if (w.canvasTabs.length === 0) {
            findings.push({
              check: "catalog-completeness",
              severity: "p1",
              tc: "TC-004",
              title: `${vertical}/${wid}: canvasTabs declared empty`,
              detail: `Empty canvasTabs array — frontend will show generic [Overview, Activity, Resources] tabs.`,
              evidence: { vertical, workerId: wid },
            });
          }

          const defaults = w.canvasTabs.filter(t => t.default === true);
          if (defaults.length === 0) {
            findings.push({
              check: "catalog-completeness",
              severity: "p1",
              tc: "TC-005",
              title: `${vertical}/${wid}: no default canvas tab declared`,
              detail: `Worker has canvasTabs but none marked default:true. First-visit fixture won't auto-fire.`,
              evidence: { vertical, workerId: wid, tabIds: w.canvasTabs.map(t => t.id) },
            });
          } else if (defaults.length > 1) {
            findings.push({
              check: "catalog-completeness",
              severity: "p1",
              tc: "TC-005",
              title: `${vertical}/${wid}: multiple default canvas tabs`,
              detail: `Worker has ${defaults.length} tabs marked default:true. Frontend will pick whichever Object.keys iterates first.`,
              evidence: { vertical, workerId: wid, defaultTabIds: defaults.map(t => t.id) },
            });
          }

          const seenIds = new Set();
          for (const tab of w.canvasTabs) {
            for (const field of CANVAS_TAB_REQUIRED) {
              if (!tab[field]) {
                findings.push({
                  check: "catalog-completeness",
                  severity: "p1",
                  tc: "TC-005",
                  title: `${vertical}/${wid}: canvas tab missing "${field}"`,
                  detail: `Tab ${tab.id || tab.label || "?"} has no ${field}. Frontend will not render the tab card.`,
                  evidence: { vertical, workerId: wid, tab },
                });
              }
            }
            if (tab.id) {
              if (seenIds.has(tab.id)) {
                findings.push({
                  check: "catalog-completeness",
                  severity: "p0",
                  tc: "TC-005",
                  title: `${vertical}/${wid}: duplicate canvas tab id "${tab.id}"`,
                  detail: `Two tabs share id "${tab.id}". Fixture loader will collide.`,
                  evidence: { vertical, workerId: wid, duplicateId: tab.id },
                });
              }
              seenIds.add(tab.id);
            }
          }
        }

        if (Array.isArray(w.constraintRaasSources)) {
          for (const src of w.constraintRaasSources) {
            if (typeof src === "object" && !src.moduleId) {
              findings.push({
                check: "catalog-completeness",
                severity: "p1",
                tc: "TC-001",
                title: `${vertical}/${wid}: constraintRaasSources entry missing moduleId`,
                detail: `RAAS source entry missing moduleId — loader will skip it.`,
                evidence: { vertical, workerId: wid, source: src },
              });
            }
          }
        }

        // Price-ladder enforcement (TC-046 — prevents random off-ladder pricing recurrence)
        const monthly = w.pricing?.monthly;
        if (monthly !== undefined && monthly !== null && !PRICE_LADDER.includes(monthly)) {
          findings.push({
            check: "catalog-completeness",
            severity: "p0",
            tc: "TC-046",
            title: `${vertical}/${wid}: off-ladder price $${monthly}/mo`,
            detail: `Worker price must be one of [${PRICE_LADDER.join(", ")}]. Got $${monthly}. Per pricing discipline 2026-06-02 — razor/blade model, no enterprise tiers in public catalog.`,
            evidence: { vertical, workerId: wid, monthly, ladder: PRICE_LADDER },
          });
        }
      }

      // Bundle pricing audit — bundles SHOULD sum to ladder math (no custom prices)
      if (Array.isArray(catalog.bundles)) {
        for (const b of catalog.bundles) {
          if (b.monthlyPrice !== undefined && b.monthlyPrice !== null) {
            const sum = (b.workerIds || []).reduce((acc, wid) => {
              const w = (catalog.workers || []).find(x => x.id === wid);
              return acc + (w?.pricing?.monthly || 0);
            }, 0);
            if (sum !== b.monthlyPrice) {
              findings.push({
                check: "catalog-completeness",
                severity: "p1",
                tc: "TC-046",
                title: `${vertical}/${b.id}: bundle price doesn't match worker sum`,
                detail: `Bundle ${b.id} priced at $${b.monthlyPrice} but worker subscriptions sum to $${sum}. Bundles must equal the sum of their worker prices (no custom discounts in catalog).`,
                evidence: { vertical, bundleId: b.id, declaredPrice: b.monthlyPrice, computedSum: sum },
              });
            }
          }
          // Reject bundles with customer-specific names
          const customerNamePatterns = [/blackrock/i, /jma\b/i, /layton/i, /storyhouse/i, /howard hughes/i];
          for (const pattern of customerNamePatterns) {
            if (pattern.test(b.name || "") || pattern.test(b.id || "")) {
              findings.push({
                check: "catalog-completeness",
                severity: "p0",
                tc: "TC-046",
                title: `${vertical}/${b.id}: customer-specific bundle name in public catalog`,
                detail: `Bundle name "${b.name}" references a specific customer. Public catalogs must use generic persona names (e.g. "investor-syndicator"), not customer names.`,
                evidence: { vertical, bundleId: b.id, bundleName: b.name },
              });
            }
          }
        }
      }
    }

    return { ok: findings.filter(f => f.severity === "p0").length === 0, findings };
  },
};
