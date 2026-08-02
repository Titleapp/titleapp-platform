"use strict";

/**
 * Tenant Studio Locker — per-tenant knowledge layer for published workers.
 *
 * Tenants (subscribers) can add context documents to any worker they have
 * access to. These docs are injected into that worker's chat system prompt
 * for that tenant's session only. Completely independent of the creator's
 * knowledge base.
 *
 * Collection:
 *   tenantLockers/{tenantId}/workers/{workerId}/documents/{docId}
 *
 * Each doc: { name, text (capped), type, charCount, createdAt }
 */

const admin = require("firebase-admin");

function db() { return admin.firestore(); }

const MAX_CHARS = 12000; // ~3k tokens — fits in system prompt budget

function lockerCol(tenantId, workerId) {
  return db()
    .collection("tenantLockers").doc(tenantId)
    .collection("workers").doc(workerId)
    .collection("documents");
}

function clamp(text) {
  if (!text || text.length <= MAX_CHARS) return text || "";
  return text.substring(0, MAX_CHARS) + "\n... [truncated]";
}

async function parsePdf(buffer) {
  const pdfParse = require("pdf-parse");
  const result = await pdfParse(buffer);
  return (result.text || "").trim();
}

async function parseDocx(buffer) {
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return (result.value || "").trim();
}

function parseText(buffer) {
  return buffer.toString("utf-8").trim();
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleLockerList(req, res, user) {
  const tenantId = req.headers["x-tenant-id"] || req.body?.tenantId;
  const workerId = req.query?.workerId || req.body?.workerId;
  if (!tenantId) return res.json({ ok: false, error: "Missing tenantId" });
  if (!workerId) return res.json({ ok: false, error: "Missing workerId" });

  const snap = await lockerCol(tenantId, workerId)
    .where("deletedAt", "==", null)
    .orderBy("createdAt", "desc")
    .get();

  const documents = [];
  snap.forEach(d => {
    const data = d.data();
    documents.push({
      id: d.id,
      name: data.name,
      type: data.type,
      charCount: data.charCount,
      createdAt: data.createdAt?.toMillis?.() || null,
    });
  });

  return res.json({ ok: true, documents });
}

async function handleLockerIngest(req, res, user) {
  const tenantId = req.headers["x-tenant-id"] || req.body?.tenantId;
  const { workerId, name, text, base64, fileName, type } = req.body || {};
  if (!tenantId) return res.json({ ok: false, error: "Missing tenantId" });
  if (!workerId) return res.json({ ok: false, error: "Missing workerId" });

  let extractedText = "";
  let docType = type || "paste";
  let docName = name || "Pasted note";

  if (base64 && fileName) {
    // File upload path
    docType = "upload";
    docName = fileName;
    let buffer;
    try {
      buffer = Buffer.from(base64, "base64");
    } catch {
      return res.json({ ok: false, error: "Invalid base64" });
    }
    const lower = String(fileName).toLowerCase();
    try {
      if (lower.endsWith(".pdf")) {
        extractedText = await parsePdf(buffer);
      } else if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
        extractedText = await parseDocx(buffer);
      } else {
        extractedText = parseText(buffer);
      }
    } catch (e) {
      return res.json({ ok: false, error: `Could not extract text: ${e.message}` });
    }
    if (!extractedText.trim()) return res.json({ ok: false, error: "No text could be extracted from this file" });
  } else if (text) {
    extractedText = text;
  } else {
    return res.json({ ok: false, error: "Provide either text or base64+fileName" });
  }

  const clamped = clamp(extractedText);
  const docRef = lockerCol(tenantId, workerId).doc();
  await docRef.set({
    name: docName,
    text: clamped,
    type: docType,
    charCount: clamped.length,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedAt: null,
    createdBy: user?.uid || null,
  });

  return res.json({ ok: true, docId: docRef.id });
}

async function handleLockerDelete(req, res, user) {
  const tenantId = req.headers["x-tenant-id"] || req.body?.tenantId;
  const { workerId, docId } = req.body || {};
  if (!tenantId || !workerId || !docId) return res.json({ ok: false, error: "Missing tenantId, workerId, or docId" });

  await lockerCol(tenantId, workerId).doc(docId).update({
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return res.json({ ok: true });
}

/**
 * Read all tenant locker docs for a given tenant + worker.
 * Returns concatenated text, capped at MAX_CHARS total.
 * Used internally by the worker chat handler.
 */
async function getLockerContext(tenantId, workerId) {
  if (!tenantId || !workerId) return null;
  try {
    const snap = await lockerCol(tenantId, workerId)
      .where("deletedAt", "==", null)
      .orderBy("createdAt", "asc")
      .get();
    if (snap.empty) return null;
    const parts = [];
    let total = 0;
    snap.forEach(d => {
      const text = d.data().text || "";
      if (text && total < MAX_CHARS) {
        const name = d.data().name || "Document";
        const chunk = `## ${name}\n${text}`;
        parts.push(chunk);
        total += chunk.length;
      }
    });
    return parts.length ? parts.join("\n\n") : null;
  } catch {
    return null;
  }
}

module.exports = { handleLockerList, handleLockerIngest, handleLockerDelete, getLockerContext };
