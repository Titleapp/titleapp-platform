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
const { callWithHealthCheck, getErrorMessage } = require("../health");
const { USAGE_EVENTS_COLLECTION } = require("../../config/usageEvents");
const { computeRevenueAttribution } = require("../../billing/recordUsageEvent");

function getDb() { return admin.firestore(); }

// ── fal.ai setup ─────────────────────────────────────────────
const { fal } = require("@fal-ai/client");
fal.config({ credentials: process.env.FAL_API_KEY });

const DEFAULT_MODEL = "fal-ai/flux/schnell";
const MAX_IMAGES_PER_WORKER = 50;
const GENERATION_TIMEOUT_MS = 30000;

// S52.46 — image billing. It's a data fee, so the customer pays 2x our cost
// (Sean's rule), charged in Data Credits. flux/schnell + storage ≈ $0.01/image →
// 2x = $0.02 = 1 credit (config/pricing.js creditRate is $0.02/credit).
const IMAGE_DATA_COST_USD = 0.01;
const _CREDIT_RATE_USD = 0.02;
const IMAGE_CREDIT_COST = Math.max(1, Math.ceil((2 * IMAGE_DATA_COST_USD) / _CREDIT_RATE_USD));
const IMAGE_PRICE_USD = IMAGE_CREDIT_COST * _CREDIT_RATE_USD;

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

// ── Aviation content gate — block crew PII in image prompts ──
const AVIATION_PII_PATTERNS = [
  /\b[NnCc]-?\d{3,5}[A-Za-z]{0,2}\b/g,              // tail numbers (N12345, C-GABC)
  /\bcrew\s+(?:name|member)\s*[:=]?\s*[A-Z][a-z]+/gi, // crew name: First
  /\bcaptain\s+[A-Z][a-z]+/gi,                         // Captain Smith
  /\bfirst\s+officer\s+[A-Z][a-z]+/gi,                 // First Officer Jones
  /\bFO\s+[A-Z][a-z]+/gi,                              // FO Jones
  /\bflight\s*#?\s*\d{2,6}/gi,                         // flight #1234
];

const AVIATION_VERTICALS = ["aviation", "pilot", "flight"];

// ── NSFW / profanity gate — all verticals ────────────────────
const NSFW_PATTERNS = [
  /\b(?:nude|naked|nsfw|pornograph|explicit|gore|violent\s+death)\b/gi,
  /\b(?:kill|murder|torture|dismember|mutilat)\b/gi,
  /\b(?:drug\s+use|inject(?:ing)?\s+(?:heroin|meth|cocaine))\b/gi,
];

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
 * Scrub aviation PII from image prompt (tail numbers, crew names, flight numbers).
 * @param {string} prompt
 * @returns {{ scrubbed: string, wasScrubbed: boolean }}
 */
function scrubAviationPii(prompt) {
  let scrubbed = prompt;
  let wasScrubbed = false;

  for (const pattern of AVIATION_PII_PATTERNS) {
    const replaced = scrubbed.replace(pattern, "[REDACTED]");
    if (replaced !== scrubbed) wasScrubbed = true;
    scrubbed = replaced;
  }

  return { scrubbed, wasScrubbed };
}

/**
 * Check prompt for NSFW/prohibited content.
 * @param {string} prompt
 * @returns {{ blocked: boolean, reason?: string }}
 */
function checkNsfw(prompt) {
  for (const pattern of NSFW_PATTERNS) {
    if (pattern.test(prompt)) {
      return { blocked: true, reason: "Prompt contains prohibited content." };
    }
  }
  return { blocked: false };
}

// ── IMG-02: real-location fabrication patterns ────────────────
const _MAP_VOCAB = /\b(satellite|aerial|bird'?s.?eye|drone|map of|aerial view|street ?view|topograph|parcel|lot ?lines?|plat ?map|site ?plan|floor ?plan|survey ?map|google ?maps?|real ?estate (photo|listing|image))\b/i;
const _PROP_PHOTO = /\b(photo|picture|image|render(ing)?|view)\b[\s\S]{0,40}\b(house|home|property|building|lot|land|parcel|residence|address)\b/i;
const _STREET_ADDR = /\b\d{1,6}\s+[\w.'-]+(\s+[\w.'-]+){0,3}\s+(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|way|ct|court|pl|place|hwy|highway|cir|circle|ter|terrace)\b/i;

// ── IMG-03: realistic named individuals ──────────────────────
// Catches "[realistic|photorealistic|hyperrealistic|photo] [of|portrait] <Name>"
// and "headshot of <Firstname Lastname>" patterns.
const _REAL_PERSON_PATTERNS = [
  /\b(?:realistic|photorealistic|hyperrealistic|lifelike)\b[\s\S]{0,30}\b(?:photo(?:graph)?|portrait|headshot|image)\b[\s\S]{0,30}\bof\b[\s\S]{0,20}[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/,
  /\b(?:photo(?:graph)?|portrait|headshot)\b[\s\S]{0,20}\bof\b[\s\S]{0,20}[A-Z][a-z]+\s+[A-Z][a-z]+/,
  /\b(?:photo(?:graph)?|portrait|headshot)\s+of\s+(?:President|Senator|CEO|Prime\s+Minister|Chancellor|Governor|Mayor)\s+[A-Z]/i,
];

// ── IMG-04: brand logos / trademarks ─────────────────────────
// Catches requests for well-known brand marks. Not exhaustive — catches the
// most common patterns. Creators using their OWN brand pass is_own_brand: true.
const _TRADEMARK_PATTERNS = [
  /\b(?:nike|adidas|apple|google|microsoft|meta|amazon|starbucks|mcdonald'?s|coca.cola|pepsi|disney|netflix|tesla|twitter|instagram|facebook|youtube|tiktok|snapchat|uber|airbnb|spotify|samsung|louis\s+vuitton|gucci|chanel|hermes|rolex|ferrari|lamborghini)\s+(?:logo|brand mark|trademark|icon|wordmark)\b/i,
  /\b(?:logo|brand mark|trademark|wordmark)\b[\s\S]{0,20}\b(?:nike|adidas|apple|google|microsoft|meta|amazon|starbucks|mcdonald'?s|coca.cola|pepsi|disney|netflix|tesla)\b/i,
];

/**
 * W-IMG-001 RAAS governance pre-flight for image generation.
 *
 * Runs BEFORE any fal.ai call or billing charge. Checks all four blocking
 * rules (IMG-01 through IMG-04). Returns { ok: true } if the prompt is clean,
 * or { ok: false, reason, rule } if it must be blocked.
 *
 * Blocked attempts are logged to auditLedger asynchronously — the caller
 * does not need to await the log write (fire-and-forget is fine here; the
 * record is best-effort and must not block the user response path).
 *
 * @param {string} prompt
 * @param {string} [vertical] — worker vertical (e.g. "real-estate", "marketing")
 * @param {object} [ctx] — optional context for audit logging
 * @param {string} [ctx.workerId]
 * @param {string} [ctx.userId]
 * @param {string} [ctx.tenantId]
 * @param {boolean} [ctx.isOwnBrand] — skip IMG-04 if creator confirmed own-brand
 * @returns {{ ok: boolean, reason?: string, rule?: string }}
 */
function validateImagePrompt(prompt, vertical, ctx = {}) {
  const p = String(prompt || "");

  // IMG-01 — NSFW
  for (const pattern of NSFW_PATTERNS) {
    // Reset lastIndex for global patterns (avoid stateful regex bugs)
    if (pattern.global) pattern.lastIndex = 0;
    if (pattern.test(p)) {
      _logImageBlocked({ rule: "IMG-01", reason: "Prompt contains NSFW or prohibited content.", prompt: p, vertical, ctx });
      return { ok: false, reason: "This image cannot be generated — it contains prohibited content (NSFW, graphic violence, or drug references). Please describe a different visual.", rule: "IMG-01" };
    }
  }

  // IMG-02 — Real-location fabrication
  if (_MAP_VOCAB.test(p) || _PROP_PHOTO.test(p) || _STREET_ADDR.test(p)) {
    _logImageBlocked({ rule: "IMG-02", reason: "Real-location fabrication blocked.", prompt: p, vertical, ctx });
    return {
      ok: false,
      reason: "I can't generate a map, satellite view, or photo of a real location — a generated image would be a fabrication, not a real photograph. Use a real data source instead (emit a card:re-map marker for the address, or use a Google Static Maps tile for aerial/satellite views).",
      rule: "IMG-02",
    };
  }

  // IMG-03 — Realistic named individuals / deepfakes
  for (const pattern of _REAL_PERSON_PATTERNS) {
    if (pattern.test(p)) {
      _logImageBlocked({ rule: "IMG-03", reason: "Realistic depiction of named individual blocked.", prompt: p, vertical, ctx });
      return {
        ok: false,
        reason: "I can't generate a realistic photo or portrait of a named real person — this could be mistaken for a real photograph. Use a clearly stylized or cartoon illustration of a generic, unnamed person instead.",
        rule: "IMG-03",
      };
    }
  }

  // IMG-04 — Brand logos / trademarks (skip if creator confirmed own brand)
  if (!ctx.isOwnBrand) {
    for (const pattern of _TRADEMARK_PATTERNS) {
      if (pattern.test(p)) {
        _logImageBlocked({ rule: "IMG-04", reason: "Third-party trademark reproduction blocked.", prompt: p, vertical, ctx });
        return {
          ok: false,
          reason: "I can't reproduce a third-party brand logo or trademark. Design an original logo instead, or describe your own brand mark.",
          rule: "IMG-04",
        };
      }
    }
  }

  return { ok: true };
}

/**
 * Fire-and-forget audit log for a blocked image prompt.
 * Writes to auditLedger (consistent with capability audit pattern).
 * Never throws — errors are swallowed so the block response is never delayed.
 * @private
 */
function _logImageBlocked({ rule, reason, prompt, vertical, ctx }) {
  try {
    const db = getDb();
    const entry = {
      actionType: "image_blocked",
      rule,
      reason,
      promptSnippet: String(prompt || "").slice(0, 120),
      vertical: vertical || null,
      workerId: ctx.workerId || null,
      userId: ctx.userId || null,
      tenantId: ctx.tenantId || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Fire-and-forget — do not await
    db.collection("auditLedger").add(entry).catch(e => {
      console.warn("[image:governance] auditLedger write failed:", e.message);
    });
    console.warn(`[image:governance] BLOCKED rule=${rule} vertical=${vertical || "none"} prompt="${String(prompt || "").slice(0, 80)}"`);
  } catch (e) {
    // Never propagate — the block response is what matters
    console.warn("[image:governance] _logImageBlocked error:", e.message);
  }
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
 * CODEX 50.5 — merges revenue-attribution fields so cycle-close picks up
 * Creator share when the worker is Creator-authored.
 */
async function logUsageEvent({ userId, workerId, model, cost, parentInteractionId, tenantId }) {
  const db = getDb();
  const attribution = await computeRevenueAttribution({
    workerId,
    userId,
    tenantId: tenantId || null,
    revenueBasis: cost > 0 ? "credit_pack" : "system",
    revenueAmount: Number(cost) || 0, // image cost is already in dollars
    timestamp: new Date(),
    parentInteractionId: parentInteractionId || null,
  }).catch(e => { console.warn("[50.5] image attribution failed:", e.message); return {}; });

  await db.collection(USAGE_EVENTS_COLLECTION).add({
    userId,
    workerId,
    event_type: "image_generate",
    cost,
    pass_through: true,
    model,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...attribution,
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
async function generateImage({ prompt, style = "cartoon", size = "square", workerId, creatorId, vertical, parentInteractionId, tenantId }) {
  const db = getDb();

  // ── Rate limit: 50 images per worker ───────────────────────
  const tenantRef = db.doc(`tenants/${creatorId}/workers/${workerId}`);
  const tenantSnap = await tenantRef.get();
  if (tenantSnap.exists) {
    const data = tenantSnap.data();
    const assets = (data.gameConfig?.assets || data.assets || []);
    if (assets.length >= MAX_IMAGES_PER_WORKER) {
      return { error: "rate_limit", message: `Maximum ${MAX_IMAGES_PER_WORKER} images per worker` };
    }
  }

  // ── NSFW / profanity gate — all verticals ─────────────────
  const nsfwCheck = checkNsfw(prompt);
  if (nsfwCheck.blocked) {
    return { error: "content_blocked", message: nsfwCheck.reason };
  }

  // ── No-fabrication gate (EH-01) — never text-to-image a real place ──
  // A diffusion model asked for a "map / satellite / aerial view of <real
  // address>" invents a plausible-but-fake place (the Lahaina "Candyland"
  // incident: hallucinated streets, garbled labels). That is fabrication of
  // real-world data. Maps/imagery of real locations must come from a real
  // source (card:re-map → Google Maps, Static Maps, Street View), never Fal.
  const _p = String(prompt || "");
  const _mapVocab = /\b(satellite|aerial|bird'?s.?eye|drone|map of|aerial view|street ?view|topograph|parcel|lot ?lines?|plat ?map|site ?plan|floor ?plan|survey ?map|google ?maps?|real ?estate (photo|listing|image))\b/i;
  // Also catch plain "photo/picture/image of the house/property at ..." and any
  // prompt containing a street address (number + name + suffix) — depicting a
  // real building is the same fabrication as a map (the Lahaina-class failure).
  const _propPhoto = /\b(photo|picture|image|render(ing)?|view)\b[\s\S]{0,40}\b(house|home|property|building|lot|land|parcel|residence|address)\b/i;
  const _streetAddr = /\b\d{1,6}\s+[\w.'-]+(\s+[\w.'-]+){0,3}\s+(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|way|ct|court|pl|place|hwy|highway|cir|circle|ter|terrace)\b/i;
  if (_mapVocab.test(_p) || _propPhoto.test(_p) || _streetAddr.test(_p)) {
    console.warn(`[image:generator] BLOCKED map/real-place fabrication for ${workerId}: "${String(prompt).slice(0, 80)}"`);
    return {
      error: "real_location_blocked",
      message: "I can't generate a map, satellite, or aerial image — a generated image would be a fabricated location, not the real place. Show the real map instead (emit a card:re-map marker for the address), and for a real aerial use a Google Static Maps satellite tile or Street View.",
    };
  }

  // ── PHI scrub for health verticals ─────────────────────────
  let finalPrompt = prompt;
  let phiScrubbed = false;
  let aviationScrubbed = false;
  const normalizedVertical = (vertical || "").toLowerCase().replace(/\s+/g, "_");
  if (PHI_VERTICALS.includes(normalizedVertical)) {
    const result = scrubPhi(prompt);
    finalPrompt = result.scrubbed;
    phiScrubbed = result.wasScrubbed;
    if (phiScrubbed) {
      console.warn(`[image:generator] PHI scrub applied for ${workerId} (vertical: ${vertical})`);
    }
  }

  // ── Aviation PII scrub — tail numbers, crew names, flight numbers ──
  if (AVIATION_VERTICALS.includes(normalizedVertical)) {
    const result = scrubAviationPii(finalPrompt);
    finalPrompt = result.scrubbed;
    aviationScrubbed = result.wasScrubbed;
    if (aviationScrubbed) {
      console.warn(`[image:generator] Aviation PII scrub applied for ${workerId} (vertical: ${vertical})`);
    }
  }

  // ── Billing gate (S52.46) — customer pays 2x the data fee, never the platform.
  // Charge BEFORE the paid fal.ai call; refund below if generation fails.
  // Anonymous users can't be billed — block them so they can't run up our bill.
  const _billUser = creatorId && creatorId !== "anonymous" ? creatorId : null;
  if (!_billUser) {
    return {
      error: "signin_required",
      message: `Sign in and add Data Credits to generate images — each image costs ${IMAGE_CREDIT_COST} credit ($${IMAGE_PRICE_USD.toFixed(2)}).`,
    };
  }
  let _chargedCredits = 0;
  try {
    const { checkAndDeductCredits } = require("../health/callWithHealthCheck");
    const charge = await checkAndDeductCredits(_billUser, `image_gen_${workerId || "chat"}`, IMAGE_CREDIT_COST, { workerId, tenantId, parentInteractionId });
    if (!charge.allowed) {
      return {
        error: "insufficient_credits",
        message: charge.message || `Generating an image costs ${IMAGE_CREDIT_COST} Data Credit ($${IMAGE_PRICE_USD.toFixed(2)}). Top up to continue.`,
        creditsRequired: charge.creditsRequired ?? IMAGE_CREDIT_COST,
        creditsAvailable: charge.creditsAvailable,
      };
    }
    if (charge.source) _chargedCredits = IMAGE_CREDIT_COST; // real deduction happened (not fail-open)
  } catch (billErr) {
    console.warn("[image:generator] billing gate error (failing open):", billErr.message);
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
    // Generation failed after we charged — give the credits back.
    if (_chargedCredits > 0) {
      try {
        const { refundCredits } = require("../health/callWithHealthCheck");
        await refundCredits(_billUser, `image_gen_${workerId || "chat"}`, _chargedCredits, { workerId, tenantId });
      } catch (rfErr) { console.warn("[image:generator] refund failed:", rfErr.message); }
    }
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
  await logUsageEvent({ userId: creatorId, workerId, model: DEFAULT_MODEL, cost: 0.008, parentInteractionId, tenantId });

  // ── RAAS governance audit (#80) — immutable record of every generation decision.
  // Captures what governance actions ran, what was scrubbed, what reached fal.ai.
  const governanceActions = [];
  if (phiScrubbed)       governanceActions.push({ rule: "phi_scrub", vertical, applied: true });
  if (aviationScrubbed)  governanceActions.push({ rule: "aviation_pii_scrub", vertical, applied: true });
  governanceActions.push({ rule: "nsfw_gate", applied: false /* would have blocked above */ });
  governanceActions.push({ rule: "real_location_gate", applied: false });

  try {
    await getDb().collection("imageGovernanceAudit").add({
      workerId: workerId || null,
      userId: creatorId || null,
      tenantId: tenantId || null,
      assetId,
      vertical: vertical || null,
      style: style || "cartoon",
      promptOriginal: prompt,
      promptSent: finalPrompt,
      promptWasScrubbed: phiScrubbed || aviationScrubbed,
      model: DEFAULT_MODEL,
      imageUrl,
      governanceActions,
      outcome: "generated",
      chargedCredits: _chargedCredits,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (auditErr) {
    console.warn("[image:generator] Governance audit write failed:", auditErr.message);
  }

  return { imageUrl, prompt: finalPrompt, model: DEFAULT_MODEL, assetId, phiScrubbed, aviationScrubbed, chargedCredits: _chargedCredits, priceUsd: _chargedCredits > 0 ? IMAGE_PRICE_USD : 0 };
}

module.exports = { generateImage, buildPrompt, scrubPhi, scrubAviationPii, checkNsfw, validateImagePrompt };
