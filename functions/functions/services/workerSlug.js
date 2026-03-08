/**
 * workerSlug.js — Worker Slug Management
 *
 * Auto-generates URL-safe slugs from worker name.
 * Enforces uniqueness across all workers.
 * Allows one-time edit by the creator.
 *
 * Slug format: titleapp.ai/w/[slug]
 * Suite slug format: titleapp.ai/s/[suite-slug]
 */

"use strict";

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

/**
 * Generate a URL-safe slug from a worker name.
 * e.g. "Expense Genius Pro" → "expense-genius-pro"
 */
function slugify(name) {
  return (name || "worker")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60);
}

/**
 * Ensure slug is unique. Appends -2, -3, etc. if collision.
 */
async function ensureUniqueSlug(db, baseSlug, excludeWorkerId) {
  let candidate = baseSlug;
  let suffix = 1;

  for (let i = 0; i < 20; i++) {
    const snap = await db.collection("workers")
      .where("slug", "==", candidate)
      .limit(1)
      .get();

    if (snap.empty) return candidate;

    // If the only match is the worker we're editing, it's fine
    if (snap.docs.length === 1 && excludeWorkerId && snap.docs[0].id === excludeWorkerId) {
      return candidate;
    }

    suffix++;
    candidate = `${baseSlug}-${suffix}`;
  }

  // Fallback: append random suffix
  const rand = Math.random().toString(36).substring(2, 6);
  return `${baseSlug}-${rand}`;
}

/**
 * Auto-generate and assign a slug to a worker.
 * Called on worker creation or when worker has no slug.
 *
 * POST /v1/worker-slug:generate
 * Body: { workerId }
 */
async function generateWorkerSlug(req, res) {
  const db = getDb();
  const user = req._user;
  const { workerId } = req.body || {};

  if (!workerId) return res.status(400).json({ ok: false, error: "workerId required" });

  const workerRef = db.collection("workers").doc(workerId);
  const workerSnap = await workerRef.get();

  if (!workerSnap.exists) return res.status(404).json({ ok: false, error: "Worker not found" });

  const workerData = workerSnap.data();

  if (workerData.creatorId !== user.uid && workerData.ownerId !== user.uid) {
    return res.status(403).json({ ok: false, error: "Not the owner of this worker" });
  }

  // If slug already exists, return it
  if (workerData.slug) {
    return res.json({ ok: true, slug: workerData.slug, alreadySet: true });
  }

  const baseSlug = slugify(workerData.name || workerData.title || "worker");
  const slug = await ensureUniqueSlug(db, baseSlug, workerId);

  await workerRef.update({ slug, slugEdited: false });

  return res.json({ ok: true, slug });
}

/**
 * Edit a worker's slug (one-time only).
 *
 * PUT /v1/worker-slug:edit
 * Body: { workerId, newSlug }
 */
async function editWorkerSlug(req, res) {
  const db = getDb();
  const user = req._user;
  const { workerId, newSlug } = req.body || {};

  if (!workerId || !newSlug) {
    return res.status(400).json({ ok: false, error: "workerId and newSlug required" });
  }

  const workerRef = db.collection("workers").doc(workerId);
  const workerSnap = await workerRef.get();

  if (!workerSnap.exists) return res.status(404).json({ ok: false, error: "Worker not found" });

  const workerData = workerSnap.data();

  if (workerData.creatorId !== user.uid && workerData.ownerId !== user.uid) {
    return res.status(403).json({ ok: false, error: "Not the owner of this worker" });
  }

  if (workerData.slugEdited) {
    return res.status(400).json({ ok: false, error: "Slug can only be edited once" });
  }

  // Validate slug format
  const sanitized = slugify(newSlug);
  if (!sanitized || sanitized.length < 3) {
    return res.status(400).json({ ok: false, error: "Slug must be at least 3 characters" });
  }

  // Check uniqueness
  const slug = await ensureUniqueSlug(db, sanitized, workerId);
  if (slug !== sanitized) {
    return res.status(409).json({ ok: false, error: `Slug '${sanitized}' is taken. Try '${slug}'`, suggestion: slug });
  }

  await workerRef.update({ slug: sanitized, slugEdited: true });

  return res.json({ ok: true, slug: sanitized });
}

/**
 * Generate and assign a slug to a suite.
 *
 * POST /v1/suite-slug:generate
 * Body: { suiteId }
 */
async function generateSuiteSlug(req, res) {
  const db = getDb();
  const user = req._user;
  const { suiteId } = req.body || {};

  if (!suiteId) return res.status(400).json({ ok: false, error: "suiteId required" });

  const suiteRef = db.collection("suites").doc(suiteId);
  const suiteSnap = await suiteRef.get();

  if (!suiteSnap.exists) return res.status(404).json({ ok: false, error: "Suite not found" });

  const suiteData = suiteSnap.data();

  if (suiteData.creatorId !== user.uid && suiteData.ownerId !== user.uid) {
    return res.status(403).json({ ok: false, error: "Not the owner of this suite" });
  }

  if (suiteData.slug) {
    return res.json({ ok: true, slug: suiteData.slug, alreadySet: true });
  }

  const baseSlug = slugify(suiteData.name || "suite");
  // Check suites collection for uniqueness
  let candidate = baseSlug;
  let suffix = 1;
  for (let i = 0; i < 20; i++) {
    const snap = await db.collection("suites").where("slug", "==", candidate).limit(1).get();
    if (snap.empty || (snap.docs.length === 1 && snap.docs[0].id === suiteId)) break;
    suffix++;
    candidate = `${baseSlug}-${suffix}`;
  }

  await suiteRef.update({ slug: candidate });

  return res.json({ ok: true, slug: candidate });
}

module.exports = {
  slugify,
  ensureUniqueSlug,
  generateWorkerSlug,
  editWorkerSlug,
  generateSuiteSlug,
};
