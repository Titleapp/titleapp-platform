"use strict";
/**
 * Document Generation Pipeline — CODEX 49.5 Phase B
 * Two-phase: generate payload → render → verify → store → emit canvas event.
 * Delegates to existing documentEngine generators for actual rendering.
 */

const admin = require("firebase-admin");
const path = require("path");
const { verify } = require("./verify");

function getDb() { return admin.firestore(); }

// Lazy-load existing document engine
let _docEngine;
function getDocEngine() {
  if (!_docEngine) _docEngine = require("../../services/documentEngine");
  return _docEngine;
}

// Lazy-load storage service
let _storage;
function getStorage() {
  if (!_storage) _storage = require("../storage");
  return _storage;
}

// Lazy-load canvas emitter
let _emitter;
function getEmitter() {
  if (!_emitter) _emitter = require("../canvas/emitter");
  return _emitter;
}

// Load document schemas
let _schemas;
function getSchemas() {
  if (!_schemas) {
    try {
      _schemas = require("../../../contracts/document-schemas.json");
    } catch {
      _schemas = {};
    }
  }
  return _schemas;
}

const MIME_MAP = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const FORMAT_MAP = {
  "financial-model": "xlsx",
  "marketing-brief": "docx",
  "press-release": "docx",
  "campaign-plan": "pdf",
  "social-strategy": "pdf",
  "content-brief": "docx",
  "report-standard": "pdf",
  "memo-executive": "pdf",
  "agreement-standard": "docx",
  "model-cashflow": "xlsx",
  "model-proforma": "xlsx",
};

const MAX_GENERATION_MS = 60000; // 60s timeout
const MAX_RETRIES = 1;

/**
 * Full pipeline: generate → verify → store → emit.
 * @param {object} opts
 * @returns {{ ok, objectId, downloadUrl, format, verified }}
 */
async function generateAndStore({ uid, type, context = {}, workerSlug, projectId }) {
  const format = FORMAT_MAP[type] || "pdf";
  const mimeType = MIME_MAP[format];
  const schemas = getSchemas();
  const schema = schemas[type];

  let buffer = null;
  let attempts = 0;
  let verificationResult = null;

  while (attempts <= MAX_RETRIES) {
    attempts++;

    // Phase 1: Generate
    try {
      buffer = await generateWithTimeout(type, format, context, uid);
    } catch (e) {
      if (attempts > MAX_RETRIES) {
        return { ok: false, error: "generation_failed", message: e.message };
      }
      continue;
    }

    if (!buffer || buffer.length === 0) {
      if (attempts > MAX_RETRIES) {
        return { ok: false, error: "empty_output", message: "Document generation produced empty output" };
      }
      continue;
    }

    // Phase 2: Verify
    if (schema) {
      verificationResult = verify(buffer, type, schema, format);
      if (!verificationResult.ok) {
        console.warn(`Document verification failed (attempt ${attempts}):`, verificationResult.missing);
        if (attempts > MAX_RETRIES) {
          return {
            ok: false,
            error: "verification_failed",
            message: `Missing required sections: ${verificationResult.missing.join(", ")}`,
            missing: verificationResult.missing,
          };
        }
        // Retry with enriched context
        context._retryHint = `Previous generation was missing: ${verificationResult.missing.join(", ")}. Ensure all sections are complete.`;
        continue;
      }
    }

    break; // Success
  }

  // Phase 3: Store
  const filename = `${type}_${Date.now()}.${format}`;
  const storage = getStorage();
  const uploadResult = await storage.upload({
    uid,
    scope: "personal",
    subdir: "documents",
    filename,
    buffer,
    mimeType,
    createdByWorker: workerSlug || null,
    parentProjectId: projectId || null,
    tags: [type, format, workerSlug || "system"].filter(Boolean),
  });

  if (!uploadResult.ok) return uploadResult;

  // Phase 4: Emit canvas event
  try {
    const emitter = getEmitter();
    await emitter.emit(uid, "document.created", {
      objectId: uploadResult.objectId,
      filename,
      type,
      format,
      workerSlug,
      projectId,
      sizeBytes: uploadResult.sizeBytes,
    });

    // Add document to project if projectId specified
    if (projectId) {
      await emitter.addDocumentToProject(uid, projectId, uploadResult.objectId);
    }
  } catch (e) {
    console.warn("Canvas emit failed (non-fatal):", e.message);
  }

  return {
    ok: true,
    objectId: uploadResult.objectId,
    downloadUrl: uploadResult.downloadUrl,
    storagePath: uploadResult.storagePath,
    filename,
    format,
    sizeBytes: uploadResult.sizeBytes,
    verified: verificationResult ? verificationResult.ok : true,
    sections: verificationResult ? verificationResult.found : [],
  };
}

/**
 * Generate document with timeout.
 */
async function generateWithTimeout(type, format, context, uid) {
  const docEngine = getDocEngine();

  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Document generation timed out after ${MAX_GENERATION_MS / 1000}s`));
    }, MAX_GENERATION_MS);

    try {
      // Use existing document engine
      const result = await docEngine.generateDocument({
        templateId: type,
        format,
        data: context,
        tenantId: context.tenantId || uid,
        userId: uid,
      });

      clearTimeout(timer);

      if (result.ok && result.buffer) {
        resolve(result.buffer);
      } else if (result.ok && result.storagePath) {
        // Engine already stored it — fetch the buffer
        const bucket = admin.storage().bucket();
        const [buf] = await bucket.file(result.storagePath).download();
        resolve(buf);
      } else {
        reject(new Error(result.error || "Generation returned no output"));
      }
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}

module.exports = { generateAndStore };
