"use strict";

/**
 * workerOverlay.js — Surface 1 / R2 (CODEX 2026-06-22)
 *
 * "Change MY worker, not everyone's."
 *
 * The runtime serves a single GLOBAL base worker doc (`digitalWorkers/{slug}`).
 * A tenant that wants its own behavior writes a SPARSE overlay at
 * `tenants/{tenantId}/workerOverlays/{slug}` — only the fields it changed. At
 * runtime the base is merged with the overlay (overlay wins per-field), so one
 * tenant's customization never touches the shared base or any other tenant.
 *
 * This is the seam Surface 3 (Alex-dispatches-Code) writes through: a client
 * tells Alex "the eval worker keeps doing X wrong" → Alex writes an overlay →
 * only that tenant's worker changes. If no overlay exists, behavior is identical
 * to base (safe fallback). Overlay reads/writes go through the Admin SDK only.
 *
 * Identity / security / billing fields are PROTECTED: an overlay can never
 * change ownership, visibility, pricing, credits, or publish state — so it
 * cannot be used to escalate privileges or alter billing. Overlays may only
 * change behavior/presentation: rules, system prompt, name, description,
 * canvas tabs/spec, knowledge, intake, etc.
 */

const admin = require("firebase-admin");
const { isPersonalContext } = require("../middleware/membershipCheck");

// Fields a tenant overlay must NEVER override — always taken from the base doc.
const PROTECTED_WORKER_FIELDS = new Set([
  "id",
  "slug",
  "ownerTenantId",
  "visibility",
  "published",
  "status",
  "creditCost",
  "creditTiming",
  "price",
  "priceDisplay",
  "pricing",
  "pricing_tier",
  "creatorId",
  "creatorName",
]);

function db() {
  return admin.firestore();
}

/**
 * Read a tenant's sparse overlay for a worker. Returns the overlay object, or
 * null when there is none / personal context / a read error (fail safe to base).
 */
async function getWorkerOverlay(tenantId, slug) {
  if (!tenantId || isPersonalContext(tenantId) || !slug) return null;
  try {
    const snap = await db().doc(`tenants/${tenantId}/workerOverlays/${slug}`).get();
    return snap.exists ? (snap.data() || {}) : null;
  } catch (e) {
    // Never break a worker because its overlay couldn't be read — fall to base.
    console.warn(`[workerOverlay] read failed ${tenantId}/${slug}:`, e.message);
    return null;
  }
}

/**
 * Merge a sparse overlay over a base worker doc. Overlay fields win, except
 * PROTECTED identity/security/billing fields which always come from base.
 */
function mergeOverlay(base, overlay) {
  if (!overlay || typeof overlay !== "object") return base;
  const safe = stripProtected(overlay);
  if (Object.keys(safe).length === 0) return base;
  return { ...base, ...safe, _overlayApplied: true };
}

/**
 * Strip protected + bookkeeping fields from an incoming overlay write so a
 * client can never set ownership/billing/publish state via an overlay.
 */
function sanitizeOverlayWrite(overlay) {
  const safe = stripProtected(overlay);
  // Bookkeeping fields are managed by the endpoint, not the caller.
  delete safe.updatedAt;
  delete safe.updatedBy;
  return safe;
}

function stripProtected(overlay) {
  const safe = {};
  for (const k of Object.keys(overlay || {})) {
    if (!PROTECTED_WORKER_FIELDS.has(k)) safe[k] = overlay[k];
  }
  return safe;
}

module.exports = {
  getWorkerOverlay,
  mergeOverlay,
  sanitizeOverlayWrite,
  PROTECTED_WORKER_FIELDS,
};
