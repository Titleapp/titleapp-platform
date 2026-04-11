"use strict";

/**
 * Studio Locker — knowledge ingestion for the Worker Sandbox.
 * CODEX 47.4 Phase A (T1).
 *
 * MVP formats: PDF, DOCX, plain text (.txt/.md/.csv), URL, raw paste.
 * Stub: PPTX (returns a clear error message asking the creator to paste text).
 *
 * No embeddings. No RAG. Confidence = % of pages/sections successfully parsed.
 *
 * Persistence:
 *   studioLockers/{userId}/workers/{workerId}/documents/{docId}
 *
 * Each document doc holds:
 *   { name, sourceType, tier, ingestionStatus, confidence, charCount,
 *     pageCount, extractedText (capped), tags, createdAt, updatedAt,
 *     storagePath?, sourceUrl?, deletedAt? }
 *
 * The ingested text is stored on the doc (capped) so the Build Log,
 * test protocol, and future RAG layer can read it without re-parsing.
 */

const admin = require("firebase-admin");

function getDb() { return admin.firestore(); }

// ─── Tunables ───────────────────────────────────────────────────────────────

// Cap stored extracted text per document so a single 4,000-page POH does not
// blow up Firestore document size (1 MiB hard cap). 200 KB leaves room for
// metadata and is plenty for a Build Log preview / future chunked RAG.
const MAX_STORED_TEXT_CHARS = 200 * 1024;

// Tier definitions per CODEX 47.4 Part 5
const TIERS = {
  1: { id: 1, label: "Platform",          description: "TitleApp platform-level reference" },
  2: { id: 2, label: "Professional Library", description: "Vertical or organization library" },
  3: { id: 3, label: "Worker-Specific",   description: "Knowledge unique to this worker" },
};

const VALID_TIERS = [1, 2, 3];

const SOURCE_TYPES = {
  PDF:   "pdf",
  DOCX:  "docx",
  PPTX:  "pptx",
  TEXT:  "text",
  URL:   "url",
  PASTE: "paste",
};

const INGESTION_STATUS = {
  PROCESSING:  "processing",
  COMPLETE:    "complete",
  NEEDS_REVIEW: "needs_review",
  FAILED:      "failed",
};

// ─── Internal helpers ───────────────────────────────────────────────────────

function lockerCol(userId, workerId) {
  return getDb()
    .collection("studioLockers").doc(userId)
    .collection("workers").doc(workerId)
    .collection("documents");
}

function clamp(text, max = MAX_STORED_TEXT_CHARS) {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.substring(0, max) + "\n... [truncated, document continues]";
}

function inferSourceType(name = "", mime = "") {
  const lower = String(name).toLowerCase();
  const m = String(mime).toLowerCase();
  if (lower.endsWith(".pdf") || m === "application/pdf") return SOURCE_TYPES.PDF;
  if (lower.endsWith(".docx") || m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return SOURCE_TYPES.DOCX;
  if (lower.endsWith(".pptx") || m === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return SOURCE_TYPES.PPTX;
  if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".csv") || m.startsWith("text/")) return SOURCE_TYPES.TEXT;
  return null;
}

function nowServerTs() { return admin.firestore.FieldValue.serverTimestamp(); }

// ─── Parsers ────────────────────────────────────────────────────────────────

/**
 * Parse a PDF buffer. Returns { text, pageCount, parsedPages, confidence }.
 * Confidence = parsedPages / pageCount.
 */
async function parsePdf(buffer) {
  const pdfParse = require("pdf-parse");
  const result = await pdfParse(buffer);
  const text = (result.text || "").trim();
  const pageCount = result.numpages || 0;

  // pdf-parse does not give us a per-page success count. We approximate
  // confidence by checking that text was extracted at all and that the
  // text length is plausible relative to page count. A blank page yields
  // ~0 chars; a healthy page yields a few hundred. < 50 chars/page is a
  // strong signal that the PDF is scanned/image-only and needs OCR.
  let confidence = 0;
  if (pageCount > 0 && text.length > 0) {
    const charsPerPage = text.length / pageCount;
    if (charsPerPage >= 200) confidence = 1.0;
    else if (charsPerPage >= 50) confidence = 0.7;
    else if (charsPerPage >= 10) confidence = 0.3;
    else confidence = 0.1;
  } else if (pageCount === 0 && text.length > 0) {
    // Single-page or page-count missing but text present
    confidence = 0.8;
  }

  return {
    text,
    pageCount,
    confidence,
    needsReview: confidence < 0.5,
  };
}

/**
 * Parse a DOCX buffer with mammoth.
 * Returns { text, sectionCount, confidence }.
 */
async function parseDocx(buffer) {
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  const text = (result.value || "").trim();

  // Mammoth surfaces extraction warnings as messages. Treat warnings as
  // partial-success: confidence drops with the ratio of warnings to text.
  const warningCount = Array.isArray(result.messages) ? result.messages.length : 0;
  const sectionCount = (text.match(/\n\n/g) || []).length + 1;

  let confidence = 1.0;
  if (text.length === 0) confidence = 0;
  else if (warningCount > 10) confidence = 0.5;
  else if (warningCount > 0) confidence = 0.85;

  return {
    text,
    sectionCount,
    confidence,
    needsReview: confidence < 0.5,
  };
}

/**
 * Parse a plain text / markdown / csv buffer.
 */
function parseText(buffer) {
  const text = buffer.toString("utf-8").trim();
  return {
    text,
    confidence: text.length > 0 ? 1.0 : 0,
    needsReview: text.length === 0,
  };
}

/**
 * Fetch a URL and strip HTML to text.
 * Uses Node's built-in fetch (Node 22 — see package.json engines).
 */
async function parseUrl(url) {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("URL must start with http:// or https://");
  }

  const response = await fetch(url, {
    method: "GET",
    headers: { "User-Agent": "TitleApp-StudioLocker/1.0" },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`URL fetch failed: HTTP ${response.status}`);
  }

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  const raw = await response.text();

  let text = raw;
  if (contentType.includes("html") || raw.includes("<html") || raw.includes("<body")) {
    // Naive HTML strip. Good enough for MVP — we are not building a
    // full Readability pipeline. Removes scripts/styles then tags.
    text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  }

  return {
    text,
    confidence: text.length > 100 ? 1.0 : (text.length > 0 ? 0.5 : 0),
    needsReview: text.length < 100,
    contentType,
  };
}

// ─── Public ingest API ─────────────────────────────────────────────────────

/**
 * Ingest a single source into the Studio Locker.
 *
 * @param {object} args
 * @param {string} args.userId        — owner
 * @param {string} args.workerId      — worker (use sessionId if no published worker yet)
 * @param {string} args.name          — display name
 * @param {string} args.sourceType    — one of SOURCE_TYPES
 * @param {Buffer} [args.buffer]      — file bytes (for pdf/docx/text/pptx)
 * @param {string} [args.mime]        — mime type
 * @param {string} [args.url]         — for URL ingest
 * @param {string} [args.text]        — for paste ingest
 * @param {number} [args.tier]        — 1/2/3, defaults to 3 (worker-specific)
 * @param {string} [args.storagePath] — Cloud Storage path if file was already uploaded
 *
 * @returns {Promise<{docId, document}>}
 */
async function ingestDocument(args) {
  const {
    userId, workerId, name, sourceType,
    buffer, mime, url, text: pasteText,
    tier = 3, storagePath,
  } = args;

  if (!userId)     throw new Error("userId required");
  if (!workerId)   throw new Error("workerId required");
  if (!name)       throw new Error("name required");
  if (!sourceType) throw new Error("sourceType required");

  if (!VALID_TIERS.includes(tier)) {
    throw new Error(`tier must be one of ${VALID_TIERS.join(", ")}`);
  }

  const col = lockerCol(userId, workerId);

  // Pre-create the doc in PROCESSING state so the UI sees a tile immediately
  const docRef = await col.add({
    name: String(name).slice(0, 200),
    sourceType,
    tier,
    ingestionStatus: INGESTION_STATUS.PROCESSING,
    confidence: 0,
    charCount: 0,
    pageCount: null,
    extractedText: "",
    storagePath: storagePath || null,
    sourceUrl: url || null,
    tags: [],
    createdAt: nowServerTs(),
    updatedAt: nowServerTs(),
    deletedAt: null,
  });

  let parsed;
  let failureReason = null;

  try {
    switch (sourceType) {
      case SOURCE_TYPES.PDF: {
        if (!buffer) throw new Error("buffer required for PDF ingest");
        parsed = await parsePdf(buffer);
        break;
      }
      case SOURCE_TYPES.DOCX: {
        if (!buffer) throw new Error("buffer required for DOCX ingest");
        parsed = await parseDocx(buffer);
        break;
      }
      case SOURCE_TYPES.PPTX: {
        // Stubbed per CODEX 47.4 Phase A scope decision
        throw new Error("PPTX support coming soon — paste the text directly for now.");
      }
      case SOURCE_TYPES.TEXT: {
        if (!buffer) throw new Error("buffer required for text ingest");
        parsed = parseText(buffer);
        break;
      }
      case SOURCE_TYPES.URL: {
        if (!url) throw new Error("url required for URL ingest");
        parsed = await parseUrl(url);
        break;
      }
      case SOURCE_TYPES.PASTE: {
        if (!pasteText) throw new Error("text required for paste ingest");
        parsed = {
          text: String(pasteText).trim(),
          confidence: pasteText.length > 0 ? 1.0 : 0,
          needsReview: false,
        };
        break;
      }
      default:
        throw new Error(`Unsupported sourceType: ${sourceType}`);
    }
  } catch (e) {
    failureReason = e.message;
    console.error(`[studioLocker] ingest failed for ${name}:`, e.message);
  }

  if (!parsed || failureReason) {
    await docRef.update({
      ingestionStatus: INGESTION_STATUS.FAILED,
      confidence: 0,
      updatedAt: nowServerTs(),
      failureReason: failureReason || "Unknown ingest failure",
    });
    const snap = await docRef.get();
    return { docId: docRef.id, document: { id: docRef.id, ...snap.data() }, error: failureReason };
  }

  const storedText = clamp(parsed.text || "");
  const finalStatus = parsed.needsReview
    ? INGESTION_STATUS.NEEDS_REVIEW
    : INGESTION_STATUS.COMPLETE;

  await docRef.update({
    ingestionStatus: finalStatus,
    confidence: parsed.confidence || 0,
    charCount: (parsed.text || "").length,
    pageCount: parsed.pageCount || null,
    extractedText: storedText,
    updatedAt: nowServerTs(),
  });

  const snap = await docRef.get();
  return { docId: docRef.id, document: { id: docRef.id, ...snap.data() } };
}

/**
 * List documents in the Studio Locker for a given (user, worker).
 * Excludes soft-deleted docs by default.
 */
async function listDocuments({ userId, workerId, includeDeleted = false }) {
  const col = lockerCol(userId, workerId);
  const snap = await col.orderBy("createdAt", "desc").limit(500).get();
  const docs = [];
  snap.forEach(d => {
    const data = d.data();
    if (!includeDeleted && data.deletedAt) return;
    docs.push({ id: d.id, ...data });
  });
  return docs;
}

/**
 * Re-assign a document's tier.
 */
async function setDocumentTier({ userId, workerId, docId, tier }) {
  if (!VALID_TIERS.includes(tier)) {
    throw new Error(`tier must be one of ${VALID_TIERS.join(", ")}`);
  }
  const ref = lockerCol(userId, workerId).doc(docId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Document not found");
  await ref.update({ tier, updatedAt: nowServerTs() });
  const fresh = await ref.get();
  return { id: docId, ...fresh.data() };
}

/**
 * Soft-delete a document. Append-only — we never hard-delete, we just stamp
 * deletedAt so the Build Log can still reference it if needed.
 */
async function deleteDocument({ userId, workerId, docId }) {
  const ref = lockerCol(userId, workerId).doc(docId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Document not found");
  await ref.update({ deletedAt: nowServerTs(), updatedAt: nowServerTs() });
  return { id: docId, deleted: true };
}

// ─── Route handlers ────────────────────────────────────────────────────────

/**
 * POST /v1/sandbox:worker:knowledge:ingest
 *
 * Body shapes:
 *   { workerId, name, sourceType: "paste", text }
 *   { workerId, name, sourceType: "url", url }
 *   { workerId, name, sourceType: "pdf"|"docx"|"text", base64, mime? }
 *
 * tier defaults to 3 (worker-specific) if not provided.
 *
 * For files, the client sends a base64-encoded buffer. We do not yet wire
 * Cloud Storage upload from this endpoint — that is a follow-up. Today the
 * extracted text + metadata is the durable artifact; the original blob lives
 * in the client until the Vault upload pipeline is wired in T2.
 */
async function handleIngest(req, res, user) {
  try {
    const body = req.body || {};
    const { workerId, name, sourceType, tier, base64, mime, url, text } = body;

    if (!workerId || !name || !sourceType) {
      return res.status(400).json({ ok: false, error: "workerId, name, and sourceType required" });
    }

    let buffer = null;
    if (base64) {
      try {
        buffer = Buffer.from(base64, "base64");
      } catch (e) {
        return res.status(400).json({ ok: false, error: "Invalid base64" });
      }
    }

    // Auto-infer sourceType if caller passed "auto" + file name + mime
    let resolvedSourceType = sourceType;
    if (sourceType === "auto") {
      resolvedSourceType = inferSourceType(name, mime);
      if (!resolvedSourceType) {
        return res.status(400).json({ ok: false, error: "Could not infer sourceType from name/mime" });
      }
    }

    const result = await ingestDocument({
      userId: user.uid,
      workerId,
      name,
      sourceType: resolvedSourceType,
      tier: tier || 3,
      buffer,
      mime,
      url,
      text,
    });

    if (result.error) {
      // We still return 200 with the doc record so the UI can show the failure tile
      return res.status(200).json({ ok: false, error: result.error, document: result.document });
    }

    return res.json({ ok: true, document: result.document });
  } catch (e) {
    console.error("[sandbox:worker:knowledge:ingest] failed:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * GET /v1/sandbox:worker:knowledge:list?workerId=...
 */
async function handleList(req, res, user) {
  try {
    const workerId = (req.query && req.query.workerId) || (req.body && req.body.workerId);
    if (!workerId) {
      return res.status(400).json({ ok: false, error: "workerId required" });
    }
    const docs = await listDocuments({ userId: user.uid, workerId });
    return res.json({ ok: true, documents: docs, tiers: TIERS });
  } catch (e) {
    console.error("[sandbox:worker:knowledge:list] failed:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * POST /v1/sandbox:worker:knowledge:tier
 * Body: { workerId, docId, tier }
 */
async function handleSetTier(req, res, user) {
  try {
    const { workerId, docId, tier } = req.body || {};
    if (!workerId || !docId || !tier) {
      return res.status(400).json({ ok: false, error: "workerId, docId, and tier required" });
    }
    const document = await setDocumentTier({ userId: user.uid, workerId, docId, tier });
    return res.json({ ok: true, document });
  } catch (e) {
    console.error("[sandbox:worker:knowledge:tier] failed:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

/**
 * DELETE /v1/sandbox:worker:knowledge:doc
 * Body or query: { workerId, docId }
 */
async function handleDelete(req, res, user) {
  try {
    const workerId = (req.body && req.body.workerId) || (req.query && req.query.workerId);
    const docId    = (req.body && req.body.docId)    || (req.query && req.query.docId);
    if (!workerId || !docId) {
      return res.status(400).json({ ok: false, error: "workerId and docId required" });
    }
    const result = await deleteDocument({ userId: user.uid, workerId, docId });
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error("[sandbox:worker:knowledge:doc DELETE] failed:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

module.exports = {
  // Constants
  TIERS,
  VALID_TIERS,
  SOURCE_TYPES,
  INGESTION_STATUS,
  // Internal API
  ingestDocument,
  listDocuments,
  setDocumentTier,
  deleteDocument,
  inferSourceType,
  // Route handlers
  handleIngest,
  handleList,
  handleSetTier,
  handleDelete,
};
