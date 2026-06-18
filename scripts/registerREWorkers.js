#!/usr/bin/env node
"use strict";

// One-shot: register the 4 real-estate creator workers into the RE-development
// catalog so workerSync surfaces them in the marketplace + Alex discovery.
// Idempotent — skips any worker id already present. Safe JSON mutation.

const fs = require("fs");
const path = require("path");

const CATALOG = path.join(__dirname, "..", "functions", "functions", "services", "alex", "catalogs", "real-estate-development.json");

const PRICING = (note) => ({
  monthly: 0,
  currency: "USD",
  free_worker: true,
  per_pull_data_fees: true,
  pricing_note: note,
  markup_percent: 100,
  creator_share_of_markup_percent: 20,
});

const PLATFORM_RAAS = [
  { moduleId: "platform-raas-invariants-s52-43", required: true, load_when: "always" },
  { moduleId: "deposition-rule-anchor-classification", required: true, load_when: "always" },
];

const tab = (id, label, order, def) => ({ id, label, signal: `card:${id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`, ...(def ? { default: true } : {}), order });

const WORKERS = [
  {
    id: "TITLE-ABSTRACT-001",
    name: "Title Abstract",
    slug: "title-abstract-001",
    suite: "Investment",
    phase: 0,
    type: "standalone",
    pricing: PRICING("Free to add — pay only for data: ATTOM property/sales/tax pulls + county-recorder instrument retrieval at substrate cost + 100% markup. Typical single-parcel Abstract ≈ $4–$8. FREE-worker principle (S52.43)."),
    creator: "sean-combs",
    jurisdiction: "US-NATIONAL",
    lane: "marketplace",
    status: "beta",
    capabilitySummary: "Title Abstract Report — a strict superset of a title company's preliminary report. Vesting + chain of title + encumbrances + tax/liens + the full rights stratum (air/spectrum/surface/water/carbon/mineral/oil-gas/digital — what is held, severed, unverified) on any US parcel, every field source-pinned and anchored on the property DTC (Deposition Rule). NOT an insured-title product. Accepts parcel-bundle/v1 from SITE-RECON-001; emits title-abstract-bundle/v1 to LAW-LANDUSE-001 / ZONING-001 / FEASIBILITY-001 / W-002.",
    temporalType: "always_on",
    emits: ["title-abstract-bundle/v1"],
    accepts: ["parcel-bundle/v1", "video-tile/v1"],
    constraintRaasSources: [...PLATFORM_RAAS, { moduleId: "attom-api-usage-terms", required: true, load_when: "always" }, { moduleId: "title-not-insured-disclaimer", required: true, load_when: "always" }],
    canvasTabs: [tab("ownership-chain", "Ownership chain", 0, true), tab("encumbrances", "Encumbrances", 1), tab("recorded-docs", "Recorded docs", 2), tab("rights-stack", "Rights stack", 3), tab("plain-english", "Plain English", 4)],
    vault: { reads: ["parcel-atlas", "attom-cache", "recorder-index"], writes: ["parcel-logbook", "pull-receipts", "title-abstracts"] },
    spec_ref: "creators/sean-combs/title-abstract-001/WORKER-SPEC.md",
  },
  {
    id: "LAW-LANDUSE-001",
    name: "Land Use Attorney",
    slug: "law-landuse-001",
    suite: "Legal",
    phase: 1,
    type: "standalone",
    pricing: PRICING("Free to add — pay only for data: authority retrieval (Municode/state feeds) + comparable-case pulls + optional ATTOM/HOA OCR at substrate cost + 100% markup. Tier-Q quick-look cheapest; Tier-R/S scale with authorities + comparables. FREE-worker principle (S52.43)."),
    creator: "sean-combs",
    jurisdiction: "US-NATIONAL",
    lane: "marketplace",
    status: "beta",
    capabilitySummary: "Land Use AI Attorney — the legal feasibility layer on Site Recon's data substrate. Given a parcel + a land-use question (trivial to major), returns what the law says, what it takes, and the realistic path — plain English with version-pinned citations a real attorney can audit, comparable cases from verifiable sources (no fabrication), a CAS-coded entitlement roadmap, and a UPL disclaimer. Anchored to PLAT-008 (Deposition Rule). Accepts parcel-bundle/v1 + title-abstract-bundle/v1; emits feasibility-roadmap/v1 + legal-opinion-bundle/v1.",
    temporalType: "always_on",
    emits: ["feasibility-roadmap/v1", "legal-opinion-bundle/v1"],
    accepts: ["parcel-bundle/v1", "title-abstract-bundle/v1", "legal-question-bundle/v1"],
    constraintRaasSources: [...PLATFORM_RAAS, { moduleId: "upl-unauthorized-practice-of-law", required: true, load_when: "always" }, { moduleId: "fair-housing-act", required: true, load_when: "always" }, { moduleId: "citation-version-pin-discipline", required: true, load_when: "always" }],
    canvasTabs: [tab("entitlement-roadmap", "Entitlement Roadmap", 0, true), tab("citations", "Citations", 1), tab("comparable-cases", "Comparable cases", 2), tab("plain-english", "Plain English", 3)],
    vault: { reads: ["parcel-atlas", "authority-cache", "comparable-cases"], writes: ["parcel-logbook", "pull-receipts", "legal-opinions"] },
    spec_ref: "creators/sean-combs/law-landuse-001/WORKER-SPEC.md",
  },
  {
    id: "ZONING-001",
    name: "Zoning + Entitlement",
    slug: "zoning-001",
    suite: "Entitlement",
    phase: 1,
    type: "standalone",
    pricing: PRICING("Free to add — pay only for data: ATTOM zoning/permits + live county code-section retrieval + GIS overlay evaluation at substrate cost + 100% markup. Typical consumer verdict ≈ a few dollars. FREE-worker principle (S52.43)."),
    creator: "sean-combs",
    jurisdiction: "US-NATIONAL",
    lane: "marketplace",
    status: "beta",
    capabilitySummary: "Zoning + Entitlement (consumer side) — answers 'what can I build on this parcel?' in plain English for a homeowner without a land use attorney. Allowed/conditional/not-allowed verdict + live code-section citations (no model recall) + next-step procedure with cost/timeline + the restrictions that actually bite + hyper-local overlays (SMA/flood/historic/HOA/special-tax). Escalates to LAW-LANDUSE-001 when stakes rise. Accepts parcel-bundle/v1 (incl. SITE-RECON ZONING_UNAVAILABLE flip); emits zoning-verdict-bundle/v1 + legal-question-bundle/v1 + permit-intent-bundle/v1.",
    temporalType: "always_on",
    emits: ["zoning-verdict-bundle/v1", "legal-question-bundle/v1", "permit-intent-bundle/v1"],
    accepts: ["parcel-bundle/v1"],
    constraintRaasSources: [...PLATFORM_RAAS, { moduleId: "consumer-not-legal-advice-disclaimer", required: true, load_when: "always" }, { moduleId: "citation-version-pin-discipline", required: true, load_when: "always" }],
    canvasTabs: [tab("zoning-verdict", "Zoning verdict", 0, true), tab("permitted-uses", "Permitted uses", 1), tab("overlays", "Overlays", 2), tab("plain-english", "Plain English", 3)],
    vault: { reads: ["parcel-atlas", "zoning-cache", "code-section-cache"], writes: ["parcel-logbook", "pull-receipts", "zoning-verdicts"] },
    spec_ref: "creators/sean-combs/zoning-001/WORKER-SPEC.md",
  },
  {
    id: "FEASIBILITY-001",
    name: "Market & Feasibility Study",
    slug: "feasibility-001",
    suite: "Investment",
    phase: 0,
    type: "standalone",
    pricing: PRICING("Free to add — pay only for data: Census ACS/BLS (free) + ATTOM/MLS comps + supply-pipeline pulls at substrate cost + 100% markup. Tier-Q snapshot cheapest; Tier-R/S scale with paid comp sources. FREE-worker principle (S52.43)."),
    creator: "sean-combs",
    jurisdiction: "US-NATIONAL",
    lane: "marketplace",
    status: "beta",
    capabilitySummary: "Market & Feasibility Study — the lender-defensible deliverable a developer takes to a lender or equity investor: demand (demographics + employment + capture rate), supply pipeline, rent/sale comps (with provenance, no fabrication), and a lender-readiness badge, every input version-pinned and audit-anchored (Deposition Rule). NOT financial underwriting (that is W-002) — produces the demand/supply/comp inputs W-002 consumes. Accepts parcel-bundle/v1 + title-abstract-bundle/v1; emits market-snapshot/v1 + feasibility-study/v1 + investment-market-study/v1.",
    temporalType: "always_on",
    emits: ["market-snapshot/v1", "feasibility-study/v1", "investment-market-study/v1"],
    accepts: ["parcel-bundle/v1", "title-abstract-bundle/v1", "underwriting-model/v1", "video-tile/v1"],
    constraintRaasSources: [...PLATFORM_RAAS, { moduleId: "census-acs-fair-use", required: true, load_when: "always" }, { moduleId: "attom-api-usage-terms", required: true, load_when: "always" }, { moduleId: "not-lender-investment-advice-disclaimer", required: true, load_when: "always" }],
    canvasTabs: [tab("demand", "Demand", 0, true), tab("supply", "Supply", 1), tab("comps", "Comps", 2), tab("demographics", "Demographics", 3), tab("sources", "Sources", 4)],
    vault: { reads: ["parcel-atlas", "census-cache", "comp-cache", "supply-pipeline"], writes: ["parcel-logbook", "pull-receipts", "feasibility-studies"] },
    spec_ref: "creators/sean-combs/feasibility-001/WORKER-SPEC.md",
  },
];

const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
if (!Array.isArray(catalog.workers)) throw new Error("catalog.workers is not an array");

const existing = new Set(catalog.workers.map((w) => w.id));
let added = 0;
// Insert the 4 RE workers right after SITE-RECON-001 to keep the RE suite grouped.
const anchorIdx = catalog.workers.findIndex((w) => w.id === "SITE-RECON-001");
const insertAt = anchorIdx === -1 ? catalog.workers.length : anchorIdx + 1;
const toInsert = [];
for (const w of WORKERS) {
  if (existing.has(w.id)) {
    console.log(`SKIP ${w.id} — already registered`);
    continue;
  }
  toInsert.push(w);
  added++;
}
catalog.workers.splice(insertAt, 0, ...toInsert);

fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + "\n", "utf8");
console.log(`\nRegistered ${added} worker(s). catalog.workers now has ${catalog.workers.length} entries.`);
console.log("RE suite:", catalog.workers.filter((w) => w.creator === "sean-combs").map((w) => w.id).join(", "));
