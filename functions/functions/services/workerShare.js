/**
 * workerShare.js — Worker Share Link Service
 *
 * Handles:
 *   - Link expiry (optional TTL, 410 Gone after expiry)
 *   - PIN protection (hashed, validate before render)
 *   - Existing subscriber detection on link load
 *   - Worker landing data endpoint for T1
 *   - og:image generation endpoint (branded preview card)
 *
 * Routes:
 *   GET  /v1/worker-landing:data?slug=xxx       — landing page data (no auth)
 *   POST /v1/worker-landing:verify-pin          — verify PIN before accessing worker
 *   GET  /v1/worker-landing:og-image?slug=xxx   — og:image for link previews
 *   GET  /v1/worker-landing:check-access        — check if current user is subscribed (auth required)
 */

"use strict";

const admin = require("firebase-admin");
const crypto = require("crypto");
const { sendError, CODES } = require("../helpers/apiResponse");
const { SUBSCRIBED, isActive } = require("../config/subscriptionStatus");

function getDb() { return admin.firestore(); }

// ═══════════════════════════════════════════════════════════════
//  PIN HASHING
// ═══════════════════════════════════════════════════════════════

function hashPin(pin) {
  return crypto.createHash("sha256").update(pin.toString()).digest("hex");
}

// ═══════════════════════════════════════════════════════════════
//  SET LINK OPTIONS (expiry, PIN)
// ═══════════════════════════════════════════════════════════════

/**
 * Update share link options for a worker.
 * POST /v1/worker-share:configure
 * Body: { workerId, expiryDate, pin, trialDays }
 */
async function configureShareLink(req, res) {
  const db = getDb();
  const user = req._user;
  const { workerId, expiryDate, pin, trialDays } = req.body || {};

  if (!workerId) return sendError(res, 400, CODES.MISSING_FIELDS, "workerId required");

  const workerRef = db.collection("workers").doc(workerId);
  const workerSnap = await workerRef.get();

  if (!workerSnap.exists) return sendError(res, 404, CODES.NOT_FOUND, "Worker not found");

  const workerData = workerSnap.data();
  if (workerData.creatorId !== user.uid && workerData.ownerId !== user.uid) {
    return sendError(res, 403, CODES.FORBIDDEN, "Not the owner");
  }

  const updates = {};

  if (expiryDate !== undefined) {
    updates.slugExpiry = expiryDate ? admin.firestore.Timestamp.fromDate(new Date(expiryDate)) : null;
  }

  if (pin !== undefined) {
    updates.slugPin = pin ? hashPin(pin) : null;
  }

  if (trialDays !== undefined) {
    updates.trialDays = typeof trialDays === "number" ? trialDays : 14;
  }

  await workerRef.update(updates);

  return res.json({ ok: true, updated: Object.keys(updates) });
}

// ═══════════════════════════════════════════════════════════════
//  WORKER LANDING DATA (no auth required)
// ═══════════════════════════════════════════════════════════════

/**
 * Get worker data for the landing page.
 * GET /v1/worker-landing:data?slug=xxx
 *
 * No auth required — this powers the pre-signup experience.
 * Returns only public-safe fields.
 */
async function getWorkerLandingData(req, res) {
  const db = getDb();
  const { slug } = req.query || {};

  if (!slug) return sendError(res, 400, CODES.MISSING_FIELDS, "slug required");

  // Find worker by slug
  const snap = await db.collection("workers")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snap.empty) {
    return sendError(res, 404, CODES.NOT_FOUND, "Worker not found");
  }

  const workerDoc = snap.docs[0];
  const w = workerDoc.data();

  // Check expiry
  if (w.slugExpiry) {
    const expiryMs = w.slugExpiry._seconds
      ? w.slugExpiry._seconds * 1000
      : w.slugExpiry.toMillis ? w.slugExpiry.toMillis() : new Date(w.slugExpiry).getTime();

    if (Date.now() > expiryMs) {
      return res.status(410).json({
        ok: false,
        error: "This link has expired",
        code: "LINK_EXPIRED",
        expired: true,
      });
    }
  }

  // Check PIN protection
  if (w.slugPin) {
    return res.json({
      ok: true,
      requiresPin: true,
      workerId: workerDoc.id,
      workerName: w.name || w.title || "Worker",
    });
  }

  // Get creator info
  let creatorName = null;
  let creatorCredential = null;
  if (w.creatorId) {
    const creatorSnap = await db.collection("users").doc(w.creatorId).get();
    if (creatorSnap.exists) {
      const c = creatorSnap.data();
      creatorName = c.displayName || c.name || null;
      creatorCredential = c.creatorCredential || null;
    }
  }

  return res.json({
    ok: true,
    requiresPin: false,
    worker: {
      id: workerDoc.id,
      name: w.name || w.title,
      slug: w.slug,
      description: w.description || w.whatItDoes || null,
      vertical: w.vertical || null,
      monthlyPrice: w.monthlyPrice || null,
      pricingTier: w.pricingTier || 1,
      trialDays: w.trialDays || 14,
      requiresSubscriberVerification: w.requiresSubscriberVerification || false,
      rating: w.rating || null,
      subscriberCount: w.subscriberCount || 0,
      sampleInteractions: w.sampleInteractions || [],
      creatorName,
      creatorCredential,
      creatorBadge: creatorName
        ? `Built by ${creatorName}${creatorCredential ? `, ${creatorCredential}` : ""}`
        : null,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
//  SUITE LANDING DATA (no auth required)
// ═══════════════════════════════════════════════════════════════

/**
 * Get suite data for suite landing page.
 * GET /v1/suite-landing:data?slug=xxx
 */
async function getSuiteLandingData(req, res) {
  const db = getDb();
  const { slug } = req.query || {};

  if (!slug) return sendError(res, 400, CODES.MISSING_FIELDS, "slug required");

  const snap = await db.collection("suites")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snap.empty) {
    return sendError(res, 404, CODES.NOT_FOUND, "Suite not found");
  }

  const suiteDoc = snap.docs[0];
  const s = suiteDoc.data();
  const workerIds = s.workerIds || [];

  // Get all workers in the suite
  const workers = [];
  for (const wId of workerIds) {
    const wSnap = await db.collection("workers").doc(wId).get();
    if (wSnap.exists) {
      const w = wSnap.data();
      workers.push({
        id: wSnap.id,
        name: w.name || w.title,
        slug: w.slug,
        description: w.description || w.whatItDoes || null,
        monthlyPrice: w.monthlyPrice || null,
        isPrimary: wSnap.id === s.primaryWorkerId,
      });
    }
  }

  return res.json({
    ok: true,
    suite: {
      id: suiteDoc.id,
      name: s.name,
      slug: s.slug,
      description: s.description || null,
      monthlyPrice: s.monthlyPrice || null,
      primaryWorkerId: s.primaryWorkerId || (workerIds[0] || null),
      workers,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
//  PIN VERIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Verify PIN for a protected worker link.
 * POST /v1/worker-landing:verify-pin
 * Body: { workerId, pin }
 *
 * No auth required.
 */
async function verifyWorkerPin(req, res) {
  const db = getDb();
  const { workerId, pin } = req.body || {};

  if (!workerId || !pin) {
    return sendError(res, 400, CODES.MISSING_FIELDS, "workerId and pin required");
  }

  const workerSnap = await db.collection("workers").doc(workerId).get();
  if (!workerSnap.exists) return sendError(res, 404, CODES.NOT_FOUND, "Worker not found");

  const w = workerSnap.data();

  if (!w.slugPin) {
    return res.json({ ok: true, message: "No PIN required" });
  }

  if (hashPin(pin) !== w.slugPin) {
    return sendError(res, 403, CODES.FORBIDDEN, "Incorrect PIN");
  }

  // Get creator info (same as getWorkerLandingData)
  let creatorName = null;
  let creatorCredential = null;
  if (w.creatorId) {
    const creatorSnap = await db.collection("users").doc(w.creatorId).get();
    if (creatorSnap.exists) {
      const c = creatorSnap.data();
      creatorName = c.displayName || c.name || null;
      creatorCredential = c.creatorCredential || null;
    }
  }

  return res.json({
    ok: true,
    worker: {
      id: workerSnap.id,
      name: w.name || w.title,
      slug: w.slug,
      description: w.description || w.whatItDoes || null,
      vertical: w.vertical || null,
      monthlyPrice: w.monthlyPrice || null,
      pricingTier: w.pricingTier || 1,
      trialDays: w.trialDays || 14,
      requiresSubscriberVerification: w.requiresSubscriberVerification || false,
      rating: w.rating || null,
      subscriberCount: w.subscriberCount || 0,
      sampleInteractions: w.sampleInteractions || [],
      creatorName,
      creatorCredential,
      creatorBadge: creatorName
        ? `Built by ${creatorName}${creatorCredential ? `, ${creatorCredential}` : ""}`
        : null,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
//  CHECK ACCESS (auth required)
// ═══════════════════════════════════════════════════════════════

/**
 * Check if authenticated user is already subscribed to a worker.
 * GET /v1/worker-landing:check-access?workerId=xxx
 *
 * Used on link load: if subscribed, T1 redirects to Vault.
 */
async function checkWorkerAccess(req, res) {
  const db = getDb();
  const user = req._user;
  const { workerId } = req.query || {};

  if (!workerId) return sendError(res, 400, CODES.MISSING_FIELDS, "workerId required");

  const subId = `${user.uid}_${workerId}`;
  const subSnap = await db.collection("subscriptions").doc(subId).get();

  if (!subSnap.exists) {
    return res.json({ ok: true, hasAccess: false, trialStatus: null });
  }

  const data = subSnap.data();
  const hasAccess = isActive(data.trialStatus);

  return res.json({
    ok: true,
    hasAccess,
    trialStatus: data.trialStatus,
    redirectToVault: data.trialStatus === SUBSCRIBED,
  });
}

// ═══════════════════════════════════════════════════════════════
//  OG:IMAGE GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate og:image HTML for a worker — rendered server-side.
 * GET /v1/worker-landing:og-image?slug=xxx
 *
 * Returns an SVG-based image as HTML that can be screenshot/rendered.
 * Dimensions: 1200 x 630px.
 *
 * No auth required.
 */
async function getWorkerOgImage(req, res) {
  const db = getDb();
  const { slug } = req.query || {};

  if (!slug) return sendError(res, 400, CODES.MISSING_FIELDS, "slug required");

  const snap = await db.collection("workers")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snap.empty) return sendError(res, 404, CODES.NOT_FOUND, "Worker not found");

  const w = snap.docs[0].data();

  // Get creator name
  let creatorName = "TitleApp Creator";
  if (w.creatorId) {
    const cSnap = await db.collection("users").doc(w.creatorId).get();
    if (cSnap.exists) creatorName = cSnap.data().displayName || cSnap.data().name || creatorName;
  }

  const workerName = w.name || w.title || "AI Worker";
  const trialText = (w.trialDays || 14) > 0 ? `Free ${w.trialDays || 14} days` : "Subscribe now";

  // Return SVG image
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1e1b4b"/>
        <stop offset="100%" style="stop-color:#312e81"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect x="60" y="60" width="1080" height="510" rx="24" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="120" y="140" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" fill="#7c3aed">TitleApp</text>
    <text x="120" y="240" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="700" fill="#ffffff">${escapeXml(workerName)}</text>
    <text x="120" y="300" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="#a5b4fc">AI Worker by ${escapeXml(creatorName)}</text>
    <rect x="120" y="360" width="240" height="48" rx="24" fill="#16a34a"/>
    <text x="240" y="392" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="white" text-anchor="middle">${escapeXml(trialText)}</text>
    <text x="120" y="480" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="#94a3b8">titleapp.ai/w/${escapeXml(w.slug || "")}</text>
  </svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.send(svg);
}

function escapeXml(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

module.exports = {
  configureShareLink,
  getWorkerLandingData,
  getSuiteLandingData,
  verifyWorkerPin,
  checkWorkerAccess,
  getWorkerOgImage,
};
