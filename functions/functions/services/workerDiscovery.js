/**
 * workerDiscovery.js — Worker Discovery + Inventory API
 *
 * Public marketplace endpoints (no auth required):
 *   GET /v1/marketplace:search      — search/filter workers with facets
 *   GET /v1/marketplace:featured    — trending, new, popular workers
 *   GET /v1/marketplace:categories  — browse verticals/suites with counts
 *   GET /v1/marketplace:worker      — full public worker profile
 *   GET /v1/marketplace:compare     — side-by-side comparison (up to 4)
 *
 * Data sources:
 *   - Catalog JSON files via loader.js (in-memory, 5-min cache)
 *   - Creator workers from Firestore `workers` collection (published=true)
 *   - Pre-computed stats from `platform/marketplaceStats` (rebuilt by onContentSync)
 */

"use strict";

const admin = require("firebase-admin");
const { sendError, CODES } = require("../helpers/apiResponse");

function getDb() { return admin.firestore(); }

// Lazy-load catalog loader (lives in services/alex/catalogs/)
let _loader;
function getLoader() {
  if (!_loader) _loader = require("./alex/catalogs/loader");
  return _loader;
}

// ═══════════════════════════════════════════════════════════════
//  NORMALIZE WORKER — unified public shape
// ═══════════════════════════════════════════════════════════════

/**
 * Map a catalog-format or creator-format worker into a unified public shape.
 * Never exposes internal fields (approved_by, Stripe IDs, internal_only, etc.)
 */
function normalizeWorker(source, worker, vertical) {
  if (source === "catalog") {
    return {
      id: worker.id,
      slug: worker.slug,
      name: worker.name,
      suite: worker.suite || null,
      phase: worker.phase ?? null,
      type: worker.type || "standalone",
      status: worker.status || "waitlist",
      vertical: vertical || null,
      price: worker.pricing?.monthly ?? 0,
      capabilitySummary: worker.capabilitySummary || "",
      temporalType: worker.temporalType || "always_on",
      source: "platform",
    };
  }

  // Creator worker from Firestore
  return {
    id: worker.docId || worker.id,
    slug: worker.slug || null,
    name: worker.name || worker.title || "",
    suite: worker.category || worker.vertical || null,
    phase: null,
    type: "standalone",
    status: worker.published ? "live" : "draft",
    vertical: worker.vertical || null,
    price: worker.monthlyPrice || 0,
    capabilitySummary: worker.description || "",
    temporalType: "always_on",
    source: "creator",
  };
}

// ═══════════════════════════════════════════════════════════════
//  FACETS
// ═══════════════════════════════════════════════════════════════

function buildFacets(workers) {
  const verticals = {};
  const suites = {};
  const types = {};
  const priceRanges = { free: 0, under_30: 0, "30_to_59": 0, "60_to_99": 0, "100_plus": 0 };

  for (const w of workers) {
    if (w.vertical) verticals[w.vertical] = (verticals[w.vertical] || 0) + 1;
    if (w.suite) suites[w.suite] = (suites[w.suite] || 0) + 1;
    if (w.type) types[w.type] = (types[w.type] || 0) + 1;

    const p = w.price || 0;
    if (p === 0) priceRanges.free++;
    else if (p < 30) priceRanges.under_30++;
    else if (p < 60) priceRanges["30_to_59"]++;
    else if (p < 100) priceRanges["60_to_99"]++;
    else priceRanges["100_plus"]++;
  }

  return { verticals, suites, types, priceRanges };
}

// ═══════════════════════════════════════════════════════════════
//  SORTING
// ═══════════════════════════════════════════════════════════════

function relevanceScore(worker, terms) {
  let score = 0;
  const name = (worker.name || "").toLowerCase();
  const summary = (worker.capabilitySummary || "").toLowerCase();
  const slug = (worker.slug || "").toLowerCase();

  for (const term of terms) {
    if (name.includes(term)) score += 10;
    if (name.startsWith(term)) score += 5;
    if (slug.includes(term)) score += 4;
    if (summary.includes(term)) score += 3;
  }

  if (worker.status === "live") score += 2;
  return score;
}

function sortWorkers(workers, sort, query) {
  switch (sort) {
    case "price_asc":
      workers.sort((a, b) => (a.price || 0) - (b.price || 0));
      break;
    case "price_desc":
      workers.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
    case "popular":
      workers.sort((a, b) => {
        if (a.status === "live" && b.status !== "live") return -1;
        if (a.status !== "live" && b.status === "live") return 1;
        return (a.phase || 0) - (b.phase || 0);
      });
      break;
    case "newest":
      workers.sort((a, b) => (b.phase || 0) - (a.phase || 0));
      break;
    case "relevance":
    default:
      if (query && query.trim()) {
        const terms = query.toLowerCase().trim().split(/\s+/);
        workers.sort((a, b) => relevanceScore(b, terms) - relevanceScore(a, terms));
      } else {
        workers.sort((a, b) => {
          if (a.status === "live" && b.status !== "live") return -1;
          if (a.status !== "live" && b.status === "live") return 1;
          return (a.phase || 0) - (b.phase || 0);
        });
      }
      break;
  }
}

// ═══════════════════════════════════════════════════════════════
//  LOAD ALL WORKERS (catalog + creator)
// ═══════════════════════════════════════════════════════════════

function loadCatalogWorkers(verticalFilter) {
  const loader = getLoader();
  const result = [];

  if (verticalFilter) {
    const catalog = loader.loadCatalog(verticalFilter);
    if (catalog) {
      for (const w of catalog.workers) {
        result.push(normalizeWorker("catalog", w, verticalFilter));
      }
    }
  } else {
    const verticals = loader.listVerticals();
    for (const v of verticals) {
      const catalog = loader.loadCatalog(v);
      if (catalog) {
        for (const w of catalog.workers) {
          result.push(normalizeWorker("catalog", w, v));
        }
      }
    }
  }

  return result;
}

async function loadCreatorWorkers() {
  const db = getDb();
  try {
    const snap = await db.collection("workers")
      .where("published", "==", true)
      .limit(200)
      .get();

    return snap.docs.map(doc => normalizeWorker("creator", {
      ...doc.data(),
      docId: doc.id,
    }));
  } catch (e) {
    console.warn("[workerDiscovery] Failed to load creator workers:", e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH WORKERS
// ═══════════════════════════════════════════════════════════════

/**
 * Search/filter workers across catalog + creator collections.
 */
async function searchWorkers(req, res) {
  const {
    q = "",
    vertical,
    suite,
    type,
    status,
    priceMin,
    priceMax,
    phase,
    sort = "relevance",
    limit: rawLimit = 20,
    offset: rawOffset = 0,
  } = req.query || {};

  const limit = Math.min(Math.max(1, Number(rawLimit) || 20), 50);
  const offset = Math.max(0, Number(rawOffset) || 0);

  // 1. Load all workers
  const catalogWorkers = loadCatalogWorkers(vertical);
  const creatorWorkers = await loadCreatorWorkers();
  let merged = [...catalogWorkers, ...creatorWorkers];

  // 2. Status filter (public: live or waitlist only)
  if (status) {
    const allowed = ["live", "waitlist"];
    if (allowed.includes(status)) {
      merged = merged.filter(w => w.status === status);
    }
  } else {
    merged = merged.filter(w => w.status === "live" || w.status === "waitlist");
  }

  // 3. Structured filters
  if (suite) {
    const sl = suite.toLowerCase();
    merged = merged.filter(w => (w.suite || "").toLowerCase() === sl);
  }
  if (type) {
    merged = merged.filter(w => w.type === type);
  }
  if (phase !== undefined && phase !== null && phase !== "") {
    const pn = Number(phase);
    if (!isNaN(pn)) merged = merged.filter(w => w.phase === pn);
  }
  if (priceMin !== undefined && priceMin !== null && priceMin !== "") {
    merged = merged.filter(w => (w.price || 0) >= Number(priceMin));
  }
  if (priceMax !== undefined && priceMax !== null && priceMax !== "") {
    merged = merged.filter(w => (w.price || 0) <= Number(priceMax));
  }

  // 4. Free-text search
  if (q && q.trim()) {
    const terms = q.toLowerCase().trim().split(/\s+/);
    merged = merged.filter(w => {
      const haystack = [w.name, w.slug, w.suite, w.capabilitySummary, w.vertical, w.type]
        .filter(Boolean).join(" ").toLowerCase();
      return terms.every(t => haystack.includes(t));
    });
  }

  // 5. Facets (computed after filters, before pagination)
  const facets = buildFacets(merged);

  // 6. Sort
  sortWorkers(merged, sort, q);

  // 7. Paginate
  const total = merged.length;
  const paged = merged.slice(offset, offset + limit);

  return res.json({
    ok: true,
    workers: paged,
    total,
    limit,
    offset,
    facets,
  });
}

// ═══════════════════════════════════════════════════════════════
//  FEATURED WORKERS
// ═══════════════════════════════════════════════════════════════

/**
 * Curated lists: trending (by priority), new (waitlist), popular (live, early-phase).
 */
async function getFeaturedWorkers(req, res) {
  const loader = getLoader();
  const verticals = loader.listVerticals();

  const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
  const trending = [];
  const live = [];
  const waitlist = [];

  for (const v of verticals) {
    const catalog = loader.loadCatalog(v);
    if (!catalog) continue;

    for (const w of catalog.workers) {
      const norm = normalizeWorker("catalog", w, v);

      if (w.status === "live") {
        live.push(norm);
        trending.push({
          ...norm,
          _priority: priorityOrder[w.alexRegistration?.priority] ?? 2,
        });
      } else if (w.status === "waitlist") {
        waitlist.push(norm);
      }
    }
  }

  trending.sort((a, b) => a._priority - b._priority);
  live.sort((a, b) => (a.phase || 0) - (b.phase || 0));

  // Strip internal sort key
  const cleanTrending = trending.slice(0, 10).map(({ _priority, ...rest }) => rest);

  return res.json({
    ok: true,
    trending: cleanTrending,
    new: waitlist.slice(0, 10),
    popular: live.slice(0, 10),
  });
}

// ═══════════════════════════════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════════════════════════════

/**
 * Browse categories with counts. Reads pre-computed stats when available.
 */
async function getCategories(req, res) {
  const db = getDb();

  // Try pre-computed stats first (written by onContentSync)
  try {
    const statsDoc = await db.doc("platform/marketplaceStats").get();
    if (statsDoc.exists) {
      const stats = statsDoc.data();
      const updatedMs = stats.last_updated?._seconds
        ? stats.last_updated._seconds * 1000
        : stats.last_updated?.toMillis ? stats.last_updated.toMillis() : 0;

      if (Date.now() - updatedMs < 3600000) {
        return res.json({ ok: true, ...stats, cached: true });
      }
    }
  } catch (e) {
    console.warn("[workerDiscovery] marketplaceStats read failed:", e.message);
  }

  // Fallback: compute from catalog data
  const loader = getLoader();
  const verts = loader.listVerticals();
  const verticalList = [];
  const suiteCounts = {};
  const priceBuckets = { free: 0, under_30: 0, "30_to_59": 0, "60_to_99": 0, "100_plus": 0 };
  let totalLive = 0;
  let totalAll = 0;

  for (const v of verts) {
    const catalog = loader.loadCatalog(v);
    if (!catalog) continue;

    let liveCount = 0;
    for (const w of catalog.workers) {
      totalAll++;
      if (w.status === "live") { liveCount++; totalLive++; }

      if (w.suite) suiteCounts[w.suite] = (suiteCounts[w.suite] || 0) + 1;

      const p = w.pricing?.monthly || 0;
      if (p === 0) priceBuckets.free++;
      else if (p < 30) priceBuckets.under_30++;
      else if (p < 60) priceBuckets["30_to_59"]++;
      else if (p < 100) priceBuckets["60_to_99"]++;
      else priceBuckets["100_plus"]++;
    }

    verticalList.push({
      id: v,
      name: catalog.name,
      workerCount: catalog.workers.length,
      liveCount,
      suites: catalog.suites || [],
    });
  }

  return res.json({
    ok: true,
    verticals: verticalList,
    suites: suiteCounts,
    priceRanges: priceBuckets,
    totalLive,
    totalAll,
    cached: false,
  });
}

// ═══════════════════════════════════════════════════════════════
//  WORKER PROFILE
// ═══════════════════════════════════════════════════════════════

/**
 * Full public profile for a single worker by slug or ID.
 */
async function getWorkerProfile(req, res) {
  const slugOrId = req.query.slug || req.query.workerId;
  if (!slugOrId) return sendError(res, 400, CODES.MISSING_FIELDS, "slug or workerId required");

  const profile = await resolveWorkerProfile(slugOrId);
  if (!profile) return sendError(res, 404, CODES.NOT_FOUND, "Worker not found");

  return res.json({ ok: true, worker: profile });
}

async function resolveWorkerProfile(slugOrId) {
  const loader = getLoader();
  const { MARKETPLACE_SLUG_MAP, HEADLINE_MAP, DISPLAY_NAME_MAP } = require("../helpers/workerSync");

  // Build reverse slug map: marketplace slug → worker ID
  const reverseSlugMap = {};
  for (const [wid, mslug] of Object.entries(MARKETPLACE_SLUG_MAP)) {
    reverseSlugMap[mslug] = wid;
  }

  // If the input is a marketplace slug, resolve to catalog ID
  const catalogId = reverseSlugMap[slugOrId] || null;
  const searchTerms = [slugOrId];
  if (catalogId) searchTerms.push(catalogId);

  // 1. Search catalog workers
  const verticals = loader.listVerticals();
  for (const v of verticals) {
    const catalog = loader.loadCatalog(v);
    if (!catalog) continue;

    const worker = catalog.workers.find(w =>
      searchTerms.includes(w.slug) || searchTerms.includes(w.id)
    );

    if (worker) {
      const mSlug = MARKETPLACE_SLUG_MAP[worker.id] || worker.slug;
      const headline = HEADLINE_MAP?.[mSlug] || worker.capabilitySummary || "";
      const displayName = DISPLAY_NAME_MAP?.[worker.id] || worker.name;

      // Related workers: same suite in this vertical
      const related = catalog.workers
        .filter(w => w.id !== worker.id && w.suite === worker.suite)
        .slice(0, 5)
        .map(w => normalizeWorker("catalog", w, v));

      return {
        ...normalizeWorker("catalog", worker, v),
        name: displayName,
        marketplaceSlug: mSlug,
        headline,
        vault: {
          reads: worker.vault?.reads || [],
          writes: worker.vault?.writes || [],
        },
        referrals: (worker.referrals || []).map(r => ({
          event: r.event,
          routesTo: r.routesTo,
        })),
        pricing: { monthly: worker.pricing?.monthly ?? 0 },
        mandatoryWhen: worker.mandatoryWhen || [],
        related,
      };
    }
  }

  // 2. Fallback to Firestore `workers` collection (creator workers)
  const db = getDb();
  try {
    const snap = await db.collection("workers")
      .where("slug", "==", slugOrId)
      .where("published", "==", true)
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0];
      const w = doc.data();

      let creatorName = null;
      if (w.creatorId) {
        const userSnap = await db.collection("users").doc(w.creatorId).get();
        if (userSnap.exists) {
          const u = userSnap.data();
          creatorName = u.displayName || u.name || null;
        }
      }

      return {
        ...normalizeWorker("creator", { ...w, docId: doc.id }),
        headline: w.description || w.name,
        creatorName,
        vault: { reads: [], writes: [] },
        referrals: [],
        pricing: { monthly: w.monthlyPrice || 0 },
        mandatoryWhen: [],
        related: [],
      };
    }
  } catch (e) {
    console.warn("[workerDiscovery] Creator worker lookup failed:", e.message);
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
//  COMPARE WORKERS
// ═══════════════════════════════════════════════════════════════

/**
 * Compare up to 4 workers side-by-side.
 */
async function compareWorkers(req, res) {
  let workerIds = req.query.workerIds;
  if (typeof workerIds === "string") {
    workerIds = workerIds.split(",").map(s => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(workerIds) || workerIds.length === 0) {
    return sendError(res, 400, CODES.MISSING_FIELDS, "workerIds required (comma-separated, max 4)");
  }

  const ids = workerIds.slice(0, 4);
  const workers = [];

  for (const id of ids) {
    const profile = await resolveWorkerProfile(id);
    if (profile) workers.push(profile);
  }

  if (workers.length === 0) {
    return sendError(res, 404, CODES.NOT_FOUND, "No matching workers found");
  }

  return res.json({
    ok: true,
    workers,
    comparisonFields: [
      "name", "suite", "type", "phase", "price", "status",
      "capabilitySummary", "temporalType", "vault",
    ],
  });
}

module.exports = {
  searchWorkers,
  getFeaturedWorkers,
  getCategories,
  getWorkerProfile,
  compareWorkers,
};
