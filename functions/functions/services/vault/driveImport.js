"use strict";

/**
 * driveImport.js — Server-side import pipeline for Google Drive documents
 *
 * Pipeline per file:
 *   1. Fetch from Drive API → stream to Firebase Storage
 *   2. Download buffer → extract text (pdf-parse / mammoth / UTF-8)
 *   3. SHA-256 hash
 *   4. Chunk text (~500 tokens, 50 overlap)
 *   5. Generate embeddings (OpenAI text-embedding-3-small)
 *   6. Store metadata + chunks in Firestore
 *   7. Update import job progress
 *
 * Exports: handleImportFromDrive, handleImportStatus, handleCheckExisting
 */

const crypto = require("crypto");
const admin = require("firebase-admin");
const { getAuthenticatedDriveClient } = require("./driveAuth");
const { chunkText } = require("./textChunker");
const { generateEmbeddings, MODEL, DIMENSIONS } = require("./embeddingService");

function getDb() { return admin.firestore(); }

const STORAGE_BUCKET = process.env.STORAGE_BUCKET || "title-app-alpha.firebasestorage.app";
const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";

// ═══════════════════════════════════════════════════════════════
//  TEXT EXTRACTION
// ═══════════════════════════════════════════════════════════════

async function extractText(buffer, mimeType, fileName) {
  if (mimeType === "application/pdf" || (fileName && fileName.endsWith(".pdf"))) {
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(buffer);
    return result.text || "";
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      || (fileName && fileName.endsWith(".docx"))) {
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  // TXT, MD — direct UTF-8
  return buffer.toString("utf8");
}

// ═══════════════════════════════════════════════════════════════
//  DRIVE FILE DOWNLOAD → STORAGE
// ═══════════════════════════════════════════════════════════════

async function streamDriveFileToStorage(drive, driveFileId, mimeType, storagePath) {
  const bucket = admin.storage().bucket(STORAGE_BUCKET);
  const fileRef = bucket.file(storagePath);

  let downloadStream;
  let actualMimeType = mimeType;

  if (mimeType === GOOGLE_DOC_MIME) {
    // Google Docs: export as DOCX
    const exportMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const response = await drive.files.export(
      { fileId: driveFileId, mimeType: exportMime },
      { responseType: "stream" }
    );
    downloadStream = response.data;
    actualMimeType = exportMime;
  } else {
    const response = await drive.files.get(
      { fileId: driveFileId, alt: "media" },
      { responseType: "stream" }
    );
    downloadStream = response.data;
  }

  const writeStream = fileRef.createWriteStream({
    metadata: { contentType: actualMimeType },
    resumable: false,
  });

  return new Promise((resolve, reject) => {
    downloadStream
      .pipe(writeStream)
      .on("finish", () => resolve(actualMimeType))
      .on("error", reject);
  });
}

// ═══════════════════════════════════════════════════════════════
//  VERSION MANAGEMENT — supersede old documents
// ═══════════════════════════════════════════════════════════════

async function supersedeDocument(userId, oldDocId) {
  const db = getDb();
  const docRef = db.collection("vaultDocuments").doc(userId)
    .collection("docs").doc(oldDocId);

  // Mark parent doc as superseded
  await docRef.update({
    superseded: true,
    supersededAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Mark all chunks as superseded (batch writes, max 500 per batch)
  const chunksSnap = await docRef.collection("chunks").get();
  const batches = [];
  let batch = db.batch();
  let count = 0;

  for (const chunk of chunksSnap.docs) {
    batch.update(chunk.ref, { superseded: true });
    count++;
    if (count >= 450) {
      batches.push(batch);
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) batches.push(batch);

  for (const b of batches) {
    await b.commit();
  }
}

// ═══════════════════════════════════════════════════════════════
//  IMPORT JOB PROCESSOR
// ═══════════════════════════════════════════════════════════════

async function updateJobFileStatus(jobId, fileIndex, status, extra = {}) {
  const db = getDb();
  const update = {
    [`fileStatuses.${fileIndex}.status`]: status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...extra,
  };
  await db.collection("importJobs").doc(jobId).update(update).catch(() => {});
}

async function processImportJob(jobId, userId, workerId, files) {
  const db = getDb();
  const drive = await getAuthenticatedDriveClient(userId);
  let completedFiles = 0;
  let failedFiles = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const docId = `doc_${crypto.randomUUID().replace(/-/g, "")}`;

    try {
      // 1. Check for existing version (re-import)
      let version = 1;
      const existingSnap = await db.collection("vaultDocuments").doc(userId)
        .collection("docs")
        .where("driveFileId", "==", file.driveFileId)
        .where("superseded", "==", false)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        const oldDoc = existingSnap.docs[0];
        version = (oldDoc.data().version || 1) + 1;
        await supersedeDocument(userId, oldDoc.id);
      }

      // 2. Stream from Drive to Firebase Storage
      await updateJobFileStatus(jobId, i, "downloading");
      const ext = file.fileName ? file.fileName.split(".").pop() : "bin";
      const storagePath = `vault/${userId}/${workerId}/${docId}/original.${ext}`;
      const actualMimeType = await streamDriveFileToStorage(drive, file.driveFileId, file.mimeType || "", storagePath);

      // 3. Download buffer from Storage for text extraction
      await updateJobFileStatus(jobId, i, "extracting");
      const bucket = admin.storage().bucket(STORAGE_BUCKET);
      const [buffer] = await bucket.file(storagePath).download();

      // 4. Extract text
      const extractedText = await extractText(buffer, actualMimeType, file.fileName);

      // 5. SHA-256 hash
      const sha256hash = crypto.createHash("sha256").update(buffer).digest("hex");

      // 6. Chunk text
      await updateJobFileStatus(jobId, i, "chunking");
      const chunks = chunkText(extractedText);

      // 7. Generate embeddings
      await updateJobFileStatus(jobId, i, "embedding");
      const chunkTexts = chunks.map(c => c.text);
      let embeddings = [];
      if (chunkTexts.length > 0) {
        try {
          embeddings = await generateEmbeddings(chunkTexts);
        } catch (embErr) {
          console.error(`Embedding generation failed for ${file.fileName}:`, embErr.message);
          // Continue without embeddings — document is still searchable by text
        }
      }

      // 8. Store metadata document
      await updateJobFileStatus(jobId, i, "storing");
      const docMeta = {
        userId,
        workerId,
        driveFileId: file.driveFileId,
        fileName: file.fileName,
        mimeType: actualMimeType,
        docType: file.docType || "other",
        revisionNumber: file.revisionNumber || null,
        effectiveDate: file.effectiveDate || null,
        sha256hash,
        fileSize: buffer.length,
        storagePath,
        extractedTextLength: extractedText.length,
        chunkCount: chunks.length,
        embeddingModel: embeddings.length > 0 ? MODEL : null,
        embeddingDimensions: embeddings.length > 0 ? DIMENSIONS : null,
        version,
        superseded: false,
        status: "ready",
        importJobId: jobId,
        uploaderUid: userId,
        acknowledgmentTimestamp: new Date().toISOString(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = db.collection("vaultDocuments").doc(userId)
        .collection("docs").doc(docId);
      await docRef.set(docMeta);

      // 9. Store chunks in subcollection (batch writes)
      let chunkBatch = db.batch();
      let chunkCount = 0;

      for (let j = 0; j < chunks.length; j++) {
        const chunkRef = docRef.collection("chunks").doc(`chunk_${String(j).padStart(5, "0")}`);
        chunkBatch.set(chunkRef, {
          text: chunks[j].text,
          embedding: embeddings[j] || [],
          index: j,
          startOffset: chunks[j].startOffset,
          endOffset: chunks[j].endOffset,
          tokenEstimate: chunks[j].tokenEstimate,
          docType: file.docType || "other",
          workerId,
          fileName: file.fileName,
          version,
          superseded: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        chunkCount++;
        if (chunkCount >= 450) {
          await chunkBatch.commit();
          chunkBatch = db.batch();
          chunkCount = 0;
        }
      }
      if (chunkCount > 0) await chunkBatch.commit();

      // 10. Also write to vaultDocs for backward compat with documentResolver
      await db.collection("vaultDocs").doc(userId)
        .collection("private").doc(docId).set({
          type: file.docType || "other",
          fileName: file.fileName,
          mimeType: actualMimeType,
          extractedText: extractedText.substring(0, 50000), // First 50K chars for legacy queries
          textLength: extractedText.length,
          uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
          userId,
          workerId,
          sha256hash,
          revisionNumber: file.revisionNumber || null,
          effectiveDate: file.effectiveDate || null,
          source: "google_drive",
          driveFileId: file.driveFileId,
          chunked: true,
          chunkDocId: docId,
        });

      completedFiles++;
      await updateJobFileStatus(jobId, i, "completed", {
        completedFiles,
        [`fileStatuses.${i}.chunkCount`]: chunks.length,
      });

    } catch (fileErr) {
      console.error(`Import failed for ${file.fileName}:`, fileErr.message);
      failedFiles++;
      await updateJobFileStatus(jobId, i, "failed", {
        failedFiles,
        [`fileStatuses.${i}.error`]: fileErr.message,
      });
    }
  }

  // Final job status
  const finalStatus = failedFiles === files.length ? "failed"
    : failedFiles > 0 ? "completed_with_errors"
    : "completed";

  await db.collection("importJobs").doc(jobId).update({
    status: finalStatus,
    completedFiles,
    failedFiles,
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ═══════════════════════════════════════════════════════════════
//  HTTP HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Start a Drive import job. Returns jobId immediately, processes in background.
 *
 * Body: { workerId, files: [{ driveFileId, fileName, mimeType, docType, revisionNumber, effectiveDate, acknowledgment }] }
 */
async function handleImportFromDrive(req, res, { userId }) {
  const db = getDb();
  const { files, workerId } = req.body || {};

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ ok: false, error: "files array required" });
  }
  if (!workerId) {
    return res.status(400).json({ ok: false, error: "workerId required" });
  }
  if (files.length > 20) {
    return res.status(400).json({ ok: false, error: "Maximum 20 files per import" });
  }

  for (const f of files) {
    if (!f.acknowledgment) {
      return res.status(400).json({ ok: false, error: `Acknowledgment required for ${f.fileName}` });
    }
    if (!f.driveFileId) {
      return res.status(400).json({ ok: false, error: "driveFileId required for each file" });
    }
  }

  // Verify Drive is connected before starting
  const integSnap = await db.collection("users").doc(userId)
    .collection("integrations").doc("googleDrive").get();
  if (!integSnap.exists || !integSnap.data().connected) {
    return res.status(400).json({ ok: false, error: "Google Drive not connected" });
  }

  // Create import job
  const jobId = "import_" + crypto.randomUUID().replace(/-/g, "").substring(0, 16);
  await db.collection("importJobs").doc(jobId).set({
    userId,
    workerId,
    status: "processing",
    totalFiles: files.length,
    completedFiles: 0,
    failedFiles: 0,
    fileStatuses: files.map(f => ({
      driveFileId: f.driveFileId,
      fileName: f.fileName,
      status: "pending",
    })),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Return immediately
  res.json({ ok: true, jobId, message: "Import started" });

  // Process in background (fire and forget)
  processImportJob(jobId, userId, workerId, files).catch(err => {
    console.error(`Import job ${jobId} fatal error:`, err);
    db.collection("importJobs").doc(jobId).update({
      status: "failed",
      error: err.message,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
  });
}

/**
 * Check import job progress.
 *
 * Query: ?jobId=xxx
 */
async function handleImportStatus(req, res, { userId }) {
  const jobId = (req.query && req.query.jobId) || (req.body && req.body.jobId);
  if (!jobId) return res.status(400).json({ ok: false, error: "jobId required" });

  const db = getDb();
  const snap = await db.collection("importJobs").doc(jobId).get();
  if (!snap.exists) return res.status(404).json({ ok: false, error: "Job not found" });

  const job = snap.data();
  if (job.userId !== userId) return res.status(403).json({ ok: false, error: "Forbidden" });

  return res.json({
    ok: true,
    jobId,
    status: job.status,
    totalFiles: job.totalFiles,
    completedFiles: job.completedFiles,
    failedFiles: job.failedFiles,
    fileStatuses: job.fileStatuses,
  });
}

/**
 * Check if Drive files already exist in vault (for re-import version management).
 *
 * Body: { driveFileIds: string[] }
 */
async function handleCheckExisting(req, res, { userId }) {
  const { driveFileIds } = req.body || {};
  if (!Array.isArray(driveFileIds) || driveFileIds.length === 0) {
    return res.status(400).json({ ok: false, error: "driveFileIds array required" });
  }

  const db = getDb();
  const existing = {};

  // Firestore "in" query supports max 30 values
  for (let i = 0; i < driveFileIds.length; i += 30) {
    const batch = driveFileIds.slice(i, i + 30);
    const snap = await db.collection("vaultDocuments").doc(userId)
      .collection("docs")
      .where("driveFileId", "in", batch)
      .where("superseded", "==", false)
      .get();

    snap.forEach(doc => {
      const data = doc.data();
      existing[data.driveFileId] = {
        docId: doc.id,
        version: data.version || 1,
        fileName: data.fileName,
        revisionNumber: data.revisionNumber,
        importedAt: data.createdAt,
      };
    });
  }

  return res.json({ ok: true, existing });
}

module.exports = {
  handleImportFromDrive,
  handleImportStatus,
  handleCheckExisting,
};
