"use strict";

/**
 * generator.js — fal.ai Image Generation Service
 *
 * Text-to-image only (v1). Uses fal-ai/flux/turbo model.
 * $0.008/image, ~6 seconds, optimized for stylized/game art.
 *
 * PHI scrub: nursing/health/healthcare verticals get prompt
 * scrubbed before sending to fal.ai. Never send potential PHI
 * to an external API.
 *
 * Storage: fal.ai URLs are temporary. Images are copied to
 * Firebase Storage on generation. The Firebase URL is stored,
 * not the fal.ai URL.
 */

const admin = require("firebase-admin");
const crypto = require("crypto");
const { callWithHealthCheck, getErrorMessage } = require("../apiHealth");

function getDb() { return admin.firestore(); }

// ── fal.ai setup ─────────────────────────────────────────────
const { fal } = require("@fal-ai/client");
fal.config({ credentials: process.env.FAL_API_KEY });

const DEFAULT_MODEL = "fal-ai/flux/turbo";
const MAX_IMAGES_PER_WORKER = 10;
const GENERATION_TIMEOUT_MS = 30000;

// ── Style map ────────────────────────────────────────────────
const STYLE_MAP = {
  cartoon: "cartoon style, flat colors, game art, clean lines, vibrant",
  realistic: "realistic, detailed, professional illustration",
  diagram: "clean educational diagram, labeled, medical illustration style",
  minimal: "minimal, flat design, icon style, simple shapes",
};

// ── PHI scrub patterns ───────────────────────────────────────
const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g,                           // SSN
  /\b\d{2}\/\d{2}\/\d{4}\b/g,                          // DOB mm/dd/yyyy
  /\b\d{4}-\d{2}-\d{2}\b/g,                             // DOB yyyy-mm-dd
  /\b(?:DOB|dob|D\.O\.B\.?)\s*[:=]?\s*\S+/gi,          // DOB: label
  /\b(?:SSN|ssn|S\.S\.N\.?)\s*[:=]?\s*\S+/gi,          // SSN: label
  /\b(?:MRN|mrn|M\.R\.N\.?)\s*[:=]?\s*\S+/gi,          // MRN: label
  /\bMR#?\s*\d+/gi,                                     // MR# patterns
  /\bpatient\s+name\s*[:=]?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/gi, // patient name: First Last
];

const PHI_VERTICALS = ["nursing", "health", "healthcare", "ems"];

/**
 * Scrub potential PHI from image prompt.
 * @param {string} prompt
 * @returns {{ scrubbed: string, wasScrubbed: boolean }}
 */
function scrubPhi(prompt) {
  let scrubbed = prompt;
  let wasScrubbed = false;

  for (const pattern of PHI_PATTERNS) {
    const replaced = scrubbed.replace(pattern, "[REDACTED]");
    if (replaced !== scrubbed) wasScrubbed = true;
    scrubbed = replaced;
  }

  return { scrubbed, wasScrubbed };
}

/**
 * Build styled prompt from user input.
 * @param {string} userPrompt
 * @param {string} style
 * @returns {string}
 */
function buildPrompt(userPrompt, style) {
  const suffix = STYLE_MAP[style] || STYLE_MAP.cartoon;
  return `${userPrompt}. ${suffix}. White background.`;
}

/**
 * Copy image from fal.ai URL to Firebase Storage.
 * @param {string} falUrl — temporary fal.ai URL
 * @param {string} workerId
 * @param {string} assetId
 * @returns {Promise<string>} — Firebase Storage public URL
 */
async function copyToStorage(falUrl, workerId, assetId) {
  const response = await fetch(falUrl);
  if (!response.ok) throw new Error(`Failed to fetch image from fal.ai: ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const bucket = admin.storage().bucket();
  const filePath = `workers/${workerId}/assets/${assetId}.png`;
  const file = bucket.file(filePath);

  await file.save(buffer, {
    metadata: { contentType: "image/png" },
    public: true,
  });

  return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
}

/**
 * Store asset reference in worker record.
 */
async function storeAsset({ workerId, creatorId, imageUrl, prompt, style, model, assetId }) {
  const db = getDb();
  const asset = {
    assetId,
    imageUrl,
    prompt,
    style: style || "cartoon",
    model,
    createdAt: new Date().toISOString(),
    usedAs: null,
  };

  // Try tenant-scoped worker first, then top-level
  const tenantRef = db.doc(`tenants/${creatorId}/workers/${workerId}`);
  const tenantSnap = await tenantRef.get();

  if (tenantSnap.exists) {
    const data = tenantSnap.data();
    if (data.worker_type === "game" || data.gameConfig) {
      await tenantRef.update({ "gameConfig.assets": admin.firestore.FieldValue.arrayUnion(asset) });
    } else {
      // Non-game workers: use top-level assets array
      await tenantRef.update({ assets: admin.firestore.FieldValue.arrayUnion(asset) });
    }
    return asset;
  }

  // Fallback: top-level workers collection
  const workerRef = db.doc(`workers/${workerId}`);
  const workerSnap = await workerRef.get();
  if (workerSnap.exists) {
    await workerRef.update({ assets: admin.firestore.FieldValue.arrayUnion(asset) });
  }

  return asset;
}

/**
 * Log image generation usage event.
 */
async function logUsageEvent({ userId, workerId, model, cost }) {
  const db = getDb();
  await db.collection("usageEvents").add({
    userId,
    workerId,
    event_type: "image_generate",
    cost,
    pass_through: true,
    model,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Generate an image via fal.ai.
 *
 * @param {object} opts
 * @param {string} opts.prompt — user's image description
 * @param {string} [opts.style] — cartoon | realistic | diagram | minimal
 * @param {string} [opts.size] — square | landscape_4_3 | portrait_3_4
 * @param {string} opts.workerId
 * @param {string} opts.creatorId
 * @param {string} [opts.vertical] — worker vertical (triggers PHI scrub for health verticals)
 * @returns {Promise<object>}
 */
async function generateImage({ prompt, style = "cartoon", size = "square", workerId, creatorId, vertical }) {
  const db = getDb();

  // ── Rate limit: 10 images per worker ───────────────────────
  const tenantRef = db.doc(`tenants/${creatorId}/workers/${workerId}`);
  const tenantSnap = await tenantRef.get();
  if (tenantSnap.exists) {
    const data = tenantSnap.data();
    const assets = (data.gameConfig?.assets || data.assets || []);
    if (assets.length >= MAX_IMAGES_PER_WORKER) {
      return { error: "rate_limit", message: `Maximum ${MAX_IMAGES_PER_WORKER} images per worker` };
    }
  }

  // ── PHI scrub for health verticals ─────────────────────────
  let finalPrompt = prompt;
  let phiScrubbed = false;
  const normalizedVertical = (vertical || "").toLowerCase().replace(/\s+/g, "_");
  if (PHI_VERTICALS.includes(normalizedVertical)) {
    const result = scrubPhi(prompt);
    finalPrompt = result.scrubbed;
    phiScrubbed = result.wasScrubbed;
    if (phiScrubbed) {
      console.warn(`[image:generator] PHI scrub applied for ${workerId} (vertical: ${vertical})`);
    }
  }

  // ── Build styled prompt ────────────────────────────────────
  const styledPrompt = buildPrompt(finalPrompt, style);

  // ── Call fal.ai via health monitor ─────────────────────────
  const healthResult = await callWithHealthCheck({
    serviceName: "fal_ai",
    fn: () => fal.subscribe(DEFAULT_MODEL, {
      input: {
        prompt: styledPrompt,
        image_size: size,
        num_inference_steps: 8,
        num_images: 1,
      },
    }),
    timeout: GENERATION_TIMEOUT_MS,
  });

  if (!healthResult.success) {
    const msg = getErrorMessage("fal_ai");
    if (healthResult.error === "timeout") {
      return { error: "generation_timeout", message: "Image generation timed out. Please try again." };
    }
    return { error: "service_unavailable", message: msg.message };
  }

  const falResult = healthResult.data;

  const falUrl = falResult.data.images[0].url;
  const assetId = "asset_" + Date.now().toString(36) + crypto.randomBytes(4).toString("hex");

  // ── Copy to Firebase Storage (fal.ai URLs are temporary) ───
  let imageUrl;
  try {
    imageUrl = await copyToStorage(falUrl, workerId, assetId);
  } catch (storageErr) {
    console.error("[image:generator] Storage copy failed, using fal.ai URL:", storageErr.message);
    imageUrl = falUrl; // Fallback to fal.ai URL
  }

  // ── Store asset + log usage ────────────────────────────────
  await storeAsset({ workerId, creatorId, imageUrl, prompt: finalPrompt, style, model: DEFAULT_MODEL, assetId });
  await logUsageEvent({ userId: creatorId, workerId, model: DEFAULT_MODEL, cost: 0.008 });

  return { imageUrl, prompt: finalPrompt, model: DEFAULT_MODEL, assetId, phiScrubbed };
}

module.exports = { generateImage, buildPrompt, scrubPhi };
