"use strict";

/**
 * regulatoryIngest/pipeline.js — CODEX 50.17 P0-1
 *
 * Per-document ingestion pipeline. Forks the driveImport.js pattern but
 * targets platform-level regulatory content (not per-user vault docs).
 *
 * Pipeline per document:
 *   1. Fetch source content (HTTP GET — caller provides the URL or buffer)
 *   2. Extract text (HTML / PDF / plain)
 *   3. SHA-256 hash for content-equality detection
 *   4. Check for existing version (by source_id + external_id) — supersede if changed
 *   5. Chunk text (~500 tokens, 50 overlap)
 *   6. Generate embeddings (OpenAI text-embedding-3-small)
 *   7. Store metadata + chunks in regulatoryDocuments/{docId}
 *   8. Return docId for adapter bookkeeping
 *
 * Collection layout:
 *   regulatoryDocuments/{docId}            — metadata
 *   regulatoryDocuments/{docId}/chunks/    — vectorized chunks
 *
 * Documents are platform-level: NOT per-user, NOT per-tenant. Read-access
 * is server-only (firestore.rules denies client reads on this collection).
 * Constraint RAAS modules query this collection during composition (CODEX
 * 50.17 P0-3).
 */

const crypto = require("crypto");
const admin = require("firebase-admin");
const { chunkText } = require("../../vault/textChunker");
const { generateEmbeddings, MODEL, DIMENSIONS } = require("../../vault/embeddingService");

function getDb() { return admin.firestore(); }

// ═══════════════════════════════════════════════════════════════
//  TEXT EXTRACTION
// ═══════════════════════════════════════════════════════════════

/**
 * Extract plain text from a buffer based on mime type.
 * Supports text/html, application/pdf, text/plain, application/xml, application/rss+xml.
 */
async function extractText(buffer, mimeType, sourceUrl) {
  const mt = (mimeType || "").toLowerCase();

  if (mt.includes("pdf") || (sourceUrl && sourceUrl.endsWith(".pdf"))) {
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(buffer);
    return result.text || "";
  }

  if (mt.includes("html") || mt.includes("xml") || mt.includes("rss") || mt.includes("atom")) {
    // Strip tags — regulatory feeds are mostly clean HTML/XML; full HTML parser
    // adds a heavy dep for marginal gain. Markdown-ish output is fine for chunking.
    const text = buffer.toString("utf8")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
    return text;
  }

  // Plain text fallback
  return buffer.toString("utf8");
}

// ═══════════════════════════════════════════════════════════════
//  SUPERSESSION
// ═══════════════════════════════════════════════════════════════

/**
 * Find the current (non-superseded) version of a document keyed by
 * source_id + external_id. Returns { docId, sha256, version } or null.
 */
async function findCurrentVersion(sourceId, externalId) {
  const db = getDb();
  const snap = await db.collection("regulatoryDocuments")
    .where("source_id", "==", sourceId)
    .where("external_id", "==", externalId)
    .where("superseded", "==", false)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { docId: d.id, sha256: d.data().sha256, version: d.data().version || 1 };
}

/**
 * Mark an existing document + its chunks as superseded.
 */
async function supersedeDocument(docId, supersededByDocId) {
  const db = getDb();
  const docRef = db.collection("regulatoryDocuments").doc(docId);

  await docRef.update({
    superseded: true,
    supersededAt: admin.firestore.FieldValue.serverTimestamp(),
    supersededBy: supersededByDocId,
  });

  // Chunks superseded in batches of 450
  const chunksSnap = await docRef.collection("chunks").get();
  let batch = db.batch();
  let count = 0;
  for (const c of chunksSnap.docs) {
    batch.update(c.ref, { superseded: true });
    if (++count >= 450) { await batch.commit(); batch = db.batch(); count = 0; }
  }
  if (count > 0) await batch.commit();
}

// ═══════════════════════════════════════════════════════════════
//  INGEST ONE DOCUMENT
// ═══════════════════════════════════════════════════════════════

/**
 * @param {object} input
 * @param {string} input.source_id        — adapter ID, e.g., "sec-edgar"
 * @param {string} input.external_id      — source's natural ID (URL hash, FR doc ID, etc.)
 * @param {string} input.source_url       — URL we fetched from (audit trail)
 * @param {string} input.title
 * @param {string} input.document_type    — "rule" | "guidance" | "enforcement_action" | "notice" | "final_rule" | "proposed_rule" | "feed_item"
 * @param {string} input.domain           — "securities" | "lending" | "banking" | "aviation" | "healthcare" | "tax" | "general"
 * @param {string} input.jurisdiction     — "US-federal" | "US-state-CA" | "EU" | "UK" | etc.
 * @param {string} [input.published_at]   — ISO timestamp, when the source published it
 * @param {string} [input.effective_date] — ISO date, when rule takes effect
 * @param {string} [input.summary]        — optional source-provided summary
 * @param {Buffer} input.buffer           — raw content bytes
 * @param {string} input.mimeType
 * @returns {Promise<{ docId: string, version: number, status: "created" | "updated" | "unchanged" }>}
 */
async function ingestDocument(input) {
  const {
    source_id, external_id, source_url, title,
    document_type, domain, jurisdiction,
    published_at = null, effective_date = null, summary = null,
    buffer, mimeType,
  } = input;

  if (!source_id || !external_id || !buffer) {
    throw new Error("ingestDocument: missing required fields (source_id, external_id, buffer)");
  }

  const db = getDb();

  // 1. Hash content for change detection
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  // 2. Check existing version
  const existing = await findCurrentVersion(source_id, external_id);
  if (existing && existing.sha256 === sha256) {
    return { docId: existing.docId, version: existing.version, status: "unchanged" };
  }

  // 3. Extract + chunk
  const fullText = await extractText(buffer, mimeType, source_url);
  if (!fullText || fullText.length < 50) {
    throw new Error(`ingestDocument: extracted text too short (${fullText.length} chars) for ${source_url}`);
  }
  const chunks = chunkText(fullText);

  // 4. Embed
  let embeddings = [];
  if (chunks.length > 0) {
    try {
      embeddings = await generateEmbeddings(chunks.map(c => c.text));
    } catch (e) {
      console.error(`[regIngest] embedding failed for ${source_url}:`, e.message);
      // Continue without embeddings — text is still searchable; module composer can re-embed later
    }
  }

  // 5. Compute version
  const version = existing ? (existing.version + 1) : 1;

  // 6. Write metadata doc
  const docId = `reg_${crypto.randomUUID().replace(/-/g, "")}`;
  const docMeta = {
    source_id,
    external_id,
    source_url,
    title: title || "(untitled)",
    document_type,
    domain,
    jurisdiction,
    published_at: published_at ? new Date(published_at) : null,
    effective_date: effective_date ? new Date(effective_date) : null,
    fetched_at: admin.firestore.FieldValue.serverTimestamp(),
    summary,

    sha256,
    text_length: fullText.length,
    chunk_count: chunks.length,
    embedding_model: embeddings.length > 0 ? MODEL : null,
    embedding_dimensions: embeddings.length > 0 ? DIMENSIONS : null,

    version,
    superseded: false,
    supersededAt: null,
    supersededBy: null,

    affected_modules: [], // populated at module-composition time (P0-3)

    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = db.collection("regulatoryDocuments").doc(docId);
  await docRef.set(docMeta);

  // 7. Write chunks (batches of 450)
  let batch = db.batch();
  let count = 0;
  for (let i = 0; i < chunks.length; i++) {
    batch.set(docRef.collection("chunks").doc(`chunk_${String(i).padStart(5, "0")}`), {
      text: chunks[i].text,
      embedding: embeddings[i] || [],
      index: i,
      startOffset: chunks[i].startOffset,
      endOffset: chunks[i].endOffset,
      tokenEstimate: chunks[i].tokenEstimate,
      version,
      superseded: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (++count >= 450) { await batch.commit(); batch = db.batch(); count = 0; }
  }
  if (count > 0) await batch.commit();

  // 8. Supersede prior version if any
  if (existing) {
    await supersedeDocument(existing.docId, docId);
  }

  return { docId, version, status: existing ? "updated" : "created" };
}

module.exports = {
  ingestDocument,
  extractText,
  findCurrentVersion,
  supersedeDocument,
};
