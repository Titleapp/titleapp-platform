"use strict";

/**
 * Catalog Loader
 *
 * Loads worker catalogs from local JSON files with in-memory caching.
 * New verticals are added by dropping a JSON file in this directory.
 */

const fs = require("fs");
const path = require("path");
const { validateCatalog, toRoutingIndex, toActiveWorkerDetail } = require("./schema");

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

function getCacheKey(vertical) {
  return `catalog:${vertical}`;
}

function isCacheValid(entry) {
  return entry && (Date.now() - entry.loadedAt) < CACHE_TTL_MS;
}

/**
 * Load a catalog by vertical name.
 * Looks for a JSON file named {vertical}.json in this directory.
 */
function loadCatalog(vertical) {
  const key = getCacheKey(vertical);
  const cached = cache.get(key);
  if (isCacheValid(cached)) return cached.data;

  const filePath = path.join(__dirname, `${vertical}.json`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const catalog = JSON.parse(raw);
    const validation = validateCatalog(catalog);
    if (!validation.valid) {
      console.warn(`Catalog validation warnings for ${vertical}:`, validation.errors);
    }
    cache.set(key, { data: catalog, loadedAt: Date.now() });
    return catalog;
  } catch (err) {
    console.error(`Failed to load catalog for ${vertical}:`, err.message);
    return null;
  }
}

/**
 * List all available verticals by scanning for JSON files.
 */
function listVerticals() {
  const dir = __dirname;
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .map(f => f.replace(".json", ""));
}

/**
 * Get the compact routing index for a vertical — one line per worker.
 * Always included in Alex's prompt.
 */
function getRoutingIndex(vertical) {
  const catalog = loadCatalog(vertical);
  if (!catalog) return "";
  return toRoutingIndex(catalog.workers);
}

/**
 * Get full details for active (subscribed) workers only.
 */
function getActiveWorkerDetails(vertical, activeSlugs) {
  const catalog = loadCatalog(vertical);
  if (!catalog) return "";
  const active = catalog.workers.filter(w => activeSlugs.includes(w.slug));
  return active.map(toActiveWorkerDetail).join("\n\n");
}

/**
 * Look up a single worker by slug or ID.
 */
function getWorker(vertical, slugOrId) {
  const catalog = loadCatalog(vertical);
  if (!catalog) return null;
  return catalog.workers.find(w => w.slug === slugOrId || w.id === slugOrId) || null;
}

/**
 * Get workers filtered by criteria.
 */
function filterWorkers(vertical, { phase, suite, type, status, priority } = {}) {
  const catalog = loadCatalog(vertical);
  if (!catalog) return [];
  return catalog.workers.filter(w => {
    if (phase !== undefined && w.phase !== phase) return false;
    if (suite && w.suite !== suite) return false;
    if (type && w.type !== type) return false;
    if (status && w.status !== status) return false;
    if (priority && w.alexRegistration?.priority !== priority) return false;
    return true;
  });
}

/**
 * Get lifecycle phases for a vertical.
 */
function getLifecycle(vertical) {
  const catalog = loadCatalog(vertical);
  if (!catalog) return [];
  return catalog.lifecycle || [];
}

/**
 * Get bundles for a vertical.
 */
function getBundles(vertical) {
  const catalog = loadCatalog(vertical);
  if (!catalog) return [];
  return catalog.bundles || [];
}

/**
 * Get all workers across all loaded verticals.
 */
function getAllWorkers() {
  const verticals = listVerticals();
  const all = [];
  for (const v of verticals) {
    const catalog = loadCatalog(v);
    if (catalog) all.push(...catalog.workers);
  }
  return all;
}

/**
 * Clear cache — useful for testing or after catalog updates.
 */
function clearCache() {
  cache.clear();
}

module.exports = {
  loadCatalog,
  listVerticals,
  getRoutingIndex,
  getActiveWorkerDetails,
  getWorker,
  filterWorkers,
  getLifecycle,
  getBundles,
  getAllWorkers,
  clearCache,
};
