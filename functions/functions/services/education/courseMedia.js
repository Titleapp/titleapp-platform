"use strict";

/**
 * courseMedia.js — Course Uploader Step 2 media support (images/charts/
 * video) + fal.ai-generated supporting images (CODEX 70 Surface 2 rework).
 *
 * Two paths land here:
 *  1. Local media upload — instructor drags in an image/chart/video. Stored
 *     directly to Cloud Storage (same base64-buffer pattern the sandbox
 *     chat's inline file upload already uses in index.js) and recorded on
 *     courses/{slug}.mediaAssets. NOT pushed through
 *     services/sandbox/studioLocker.js's ingestDocument() — that pipeline
 *     only extracts TEXT from pdf/docx/pptx/txt (confirmed by reading
 *     inferSourceType() — it returns null for image/video mime types), so
 *     media assets are a separate, honestly-scoped concept: visual aids the
 *     instructor can see and manage, not text the tutor's chat is grounded
 *     in. That is a real v1 gap, flagged rather than silently pretended
 *     away — course_chat's grounding today still only reads Studio Locker
 *     text documents.
 *  2. fal.ai-generated images — reuses the REAL, already-live
 *     services/image/generator.js (generateImage()) used elsewhere on the
 *     platform (game asset generation, worker sandbox, etc.) — no new
 *     image-gen integration is built here. generateImage() already runs
 *     real content governance (NSFW/PHI/real-location/trademark gates) and
 *     REAL billing (checkAndDeductCredits — 1 Data Credit / ~$0.02 per
 *     image, charged before the paid fal.ai call, refunded on failure).
 *
 * Billing identity: course sessions run authenticated as the ephemeral,
 * unbilled `courseUid` (see courseSession.js) — that identity has no Data
 * Credit wallet. Both handlers below resolve the REAL instructor uid from
 * courses/{slug}.instructorUid (now tied to a real, billed tenant via
 * courses/{slug}.tenantId — see instructorTenant.js) and bill THAT account,
 * not courseUid. This is what makes course media generation actually
 * billed to a real account instead of silently free or silently broken.
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

const MAX_MEDIA_PER_COURSE = 30;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB — small-file v1 scope (see module doc: no resumable upload)

const MEDIA_MIME_MAP = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".mov": "video/quicktime",
  ".webm": "video/webm",
};

function inferMediaKind(mime) {
  if (!mime) return "file";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

async function loadCourseForSession(db, slug, courseAuthUser) {
  const ref = db.collection("courses").doc(String(slug));
  const snap = await ref.get();
  if (!snap.exists) return { error: { status: 404, message: "Course not found" } };
  const data = snap.data();
  if (data.courseUid !== courseAuthUser.uid) {
    return { error: { status: 403, message: "Not authorized for this course" } };
  }
  return { ref, data };
}

/**
 * POST /v1/edu:course:uploadMedia — authenticated as the course session.
 * Body: { slug, fileName, mimeType, data (base64, no data: prefix) }
 */
async function uploadCourseMedia(req, res, courseAuthUser) {
  const db = getDb();
  const { slug, fileName, mimeType, data: base64Data } = req.body || {};
  if (!slug) return res.status(400).json({ ok: false, error: "slug required" });
  if (!fileName || !base64Data) return res.status(400).json({ ok: false, error: "fileName and data required" });

  const { ref, data, error } = await loadCourseForSession(db, slug, courseAuthUser);
  if (error) return res.status(error.status).json({ ok: false, error: error.message });

  const existingCount = (data.mediaAssets || []).length;
  if (existingCount >= MAX_MEDIA_PER_COURSE) {
    return res.status(400).json({ ok: false, error: `Max ${MAX_MEDIA_PER_COURSE} media items per course` });
  }

  const ext = "." + (fileName.split(".").pop() || "").toLowerCase();
  const mime = mimeType || MEDIA_MIME_MAP[ext];
  const kind = inferMediaKind(mime);
  if (!mime || kind === "file") {
    return res.status(400).json({ ok: false, error: "Unsupported media type — images and video only" });
  }

  let buffer;
  try {
    buffer = Buffer.from(String(base64Data).replace(/^data:[^;]*;base64,/, ""), "base64");
  } catch (e) {
    return res.status(400).json({ ok: false, error: "Invalid file data" });
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return res.status(400).json({ ok: false, error: `File exceeds ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)}MB limit` });
  }

  const assetId = "media_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const storagePath = `courses/${slug}/media/${assetId}${ext}`;
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  await file.save(buffer, { metadata: { contentType: mime }, public: true });
  const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

  const asset = {
    assetId,
    kind,
    name: fileName,
    mime,
    url,
    source: "upload",
    sizeBytes: buffer.length,
    createdAt: new Date().toISOString(),
  };

  await ref.update({
    mediaAssets: admin.firestore.FieldValue.arrayUnion(asset),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return res.json({ ok: true, asset, mediaAssets: [...(data.mediaAssets || []), asset] });
}

/**
 * POST /v1/edu:course:generateImage — authenticated as the course session.
 * Body: { slug, prompt, style, size }
 *
 * Real cost, surfaced (not hidden): this calls the same
 * services/image/generator.js used elsewhere on the platform, which charges
 * IMAGE_CREDIT_COST Data Credits to the REAL instructor account (resolved
 * from courses/{slug}.instructorUid, not the ephemeral courseUid) before
 * the paid fal.ai call runs, and refunds on failure. The frontend must show
 * the cost BEFORE calling this route (see CourseUploader.jsx) — this
 * handler does not hide it either: it returns generator.js's own
 * IMAGE_PRICE_USD/creditsRequired fields verbatim on any billing error.
 */
async function generateCourseImage(req, res, courseAuthUser) {
  const db = getDb();
  const { slug, prompt, style, size } = req.body || {};
  if (!slug) return res.status(400).json({ ok: false, error: "slug required" });
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ ok: false, error: "prompt required" });
  }
  if (prompt.length > 500) return res.status(400).json({ ok: false, error: "Prompt exceeds 500 character limit" });

  const { data, error } = await loadCourseForSession(db, slug, courseAuthUser);
  if (error) return res.status(error.status).json({ ok: false, error: error.message });

  if (!data.instructorUid) {
    return res.status(400).json({ ok: false, error: "This course has no instructor account to bill — cannot generate an image." });
  }

  const existingCount = (data.mediaAssets || []).length;
  if (existingCount >= MAX_MEDIA_PER_COURSE) {
    return res.status(400).json({ ok: false, error: `Max ${MAX_MEDIA_PER_COURSE} media items per course` });
  }

  const { generateImage } = require("../image");
  const isNursing = /nurs|clinical|patient|health|medical|anatom|physiol|pharmac/i.test(
    `${data.courseName || ""} ${data.description || ""}`
  );
  const result = await generateImage({
    prompt: prompt.trim(),
    style: style || "diagram",
    size: size || "square",
    workerId: data.workerId,
    creatorId: data.instructorUid, // REAL, billed account — not courseUid
    vertical: isNursing ? "nursing" : "education",
    tenantId: data.tenantId || null,
  });

  if (result.error) {
    const status = result.error === "rate_limit" ? 429
      : result.error === "insufficient_credits" ? 402
      : result.error === "signin_required" ? 402
      : 500;
    return res.status(status).json({ ok: false, error: result.message || result.error, ...result });
  }

  const asset = {
    assetId: result.assetId,
    kind: "image",
    name: prompt.trim().slice(0, 80),
    mime: "image/png",
    url: result.imageUrl,
    source: "fal_ai_generated",
    prompt: result.prompt,
    style: style || "diagram",
    chargedCredits: result.chargedCredits || 0,
    priceUsd: result.priceUsd || 0,
    createdAt: new Date().toISOString(),
  };

  const ref = db.collection("courses").doc(String(slug));
  await ref.update({
    mediaAssets: admin.firestore.FieldValue.arrayUnion(asset),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return res.json({ ok: true, asset, mediaAssets: [...(data.mediaAssets || []), asset] });
}

/**
 * GET /v1/edu:course:media?slug=... — authenticated as the course session.
 * Lists this course's media assets (uploaded + generated).
 */
async function listCourseMedia(req, res, courseAuthUser) {
  const db = getDb();
  const slug = (req.query && req.query.slug) || null;
  if (!slug) return res.status(400).json({ ok: false, error: "slug required" });

  const { data, error } = await loadCourseForSession(db, slug, courseAuthUser);
  if (error) return res.status(error.status).json({ ok: false, error: error.message });

  return res.json({ ok: true, mediaAssets: data.mediaAssets || [] });
}

module.exports = { uploadCourseMedia, generateCourseImage, listCourseMedia, MAX_MEDIA_PER_COURSE, MAX_UPLOAD_BYTES };
