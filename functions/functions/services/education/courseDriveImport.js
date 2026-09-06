"use strict";

/**
 * courseDriveImport.js — Course Uploader Step 3, Google Drive path.
 *
 * Sean's explicit ask beyond the CODEX 70 doc: instructors should be able to
 * import course materials directly from Google Drive, not just local
 * drag-and-drop. This is NOT a new Drive integration — it reuses the real,
 * live OAuth + browse/search plumbing already in services/vault/driveAuth.js
 * and services/vault/driveBrowser.js (the same code DriveImportModal.jsx
 * uses for aviation/vault documents via the generic /v1/drive:* routes).
 *
 * What's different from the Vault's own /v1/vault:importFromDrive: that
 * pipeline stores into Cloud Storage + a chunked/embedded Vault document
 * store. Course materials instead need to land in the Studio Locker (the
 * same place local file uploads land, via sandbox:worker:knowledge:ingest),
 * so a course worker's chat can eventually be grounded in them. This module
 * downloads the Drive file server-side and calls studioLocker.ingestDocument
 * directly — the exact same ingest path local uploads use.
 *
 * OneDrive is explicitly out of scope (confirmed: no import UI exists for it
 * anywhere in this codebase, and it would be a real, non-trivial integration
 * to build from scratch) — noted as a v2 gap, not attempted here.
 */

const { getAuthenticatedDriveClient } = require("../vault/driveAuth");
const { ingestDocument, inferSourceType } = require("../sandbox/studioLocker");

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
const MAX_FILES_PER_CALL = 10;

async function downloadDriveFileBuffer(drive, driveFileId, mimeType) {
  if (mimeType === GOOGLE_DOC_MIME) {
    const exportMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const response = await drive.files.export(
      { fileId: driveFileId, mimeType: exportMime },
      { responseType: "arraybuffer" }
    );
    return { buffer: Buffer.from(response.data), mime: exportMime, sourceType: "docx" };
  }
  const response = await drive.files.get(
    { fileId: driveFileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return { buffer: Buffer.from(response.data), mime: mimeType, sourceType: null };
}

/**
 * POST /v1/edu:course:driveImport — authenticated as the course session
 * (courseUid). Body: { workerId, files: [{ driveFileId, fileName, mimeType, docType }] }
 */
async function importCourseFilesFromDrive(req, res, courseAuthUser) {
  const { workerId, files } = req.body || {};
  if (!workerId) return res.status(400).json({ ok: false, error: "workerId required" });
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ ok: false, error: "files[] required" });
  }
  if (files.length > MAX_FILES_PER_CALL) {
    return res.status(400).json({ ok: false, error: `Import at most ${MAX_FILES_PER_CALL} files at a time` });
  }

  let drive;
  try {
    drive = await getAuthenticatedDriveClient(courseAuthUser.uid);
  } catch (e) {
    return res.status(400).json({ ok: false, error: "Google Drive is not connected for this session." });
  }

  const results = [];
  for (const f of files) {
    const { driveFileId, fileName, mimeType, docType } = f || {};
    if (!driveFileId || !fileName) {
      results.push({ driveFileId: driveFileId || null, fileName: fileName || null, ok: false, error: "Missing driveFileId or fileName" });
      continue;
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      const { buffer, mime, sourceType: forcedType } = await downloadDriveFileBuffer(drive, driveFileId, mimeType);
      const sourceType = forcedType || inferSourceType(fileName, mime) || "text";
      // eslint-disable-next-line no-await-in-loop
      const result = await ingestDocument({
        userId: courseAuthUser.uid,
        workerId,
        name: fileName,
        sourceType,
        tier: 3,
        buffer,
        mime,
      });
      results.push({
        driveFileId,
        fileName,
        docType: docType || null,
        ok: !result.error,
        document: result.document,
        error: result.error || null,
      });
    } catch (e) {
      console.error("[edu:course:driveImport] file failed:", fileName, e.message);
      results.push({ driveFileId, fileName, docType: docType || null, ok: false, error: e.message });
    }
  }

  return res.json({ ok: true, results });
}

module.exports = { importCourseFilesFromDrive };
