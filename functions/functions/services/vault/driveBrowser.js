"use strict";

/**
 * driveBrowser.js — Google Drive file browsing and search
 *
 * Provides folder navigation and full-text search within the user's
 * connected Google Drive. Classifies files as importable or not.
 *
 * Exports: handleDriveBrowse, handleDriveSearch
 */

const { getAuthenticatedDriveClient } = require("./driveAuth");

// Supported MIME types for import
const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "application/vnd.google-apps.document", // Google Docs — exported as DOCX
]);

const FOLDER_MIME = "application/vnd.google-apps.folder";

const FILE_FIELDS = "id, name, mimeType, size, modifiedTime, iconLink, parents";

function getDisplayType(mimeType) {
  if (mimeType === FOLDER_MIME) return "folder";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "DOCX";
  if (mimeType === "text/plain") return "TXT";
  if (mimeType === "text/markdown") return "MD";
  if (mimeType === "application/vnd.google-apps.document") return "Google Doc";
  return "Other";
}

function classifyFile(file) {
  const isFolder = file.mimeType === FOLDER_MIME;
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size ? parseInt(file.size, 10) : null,
    modifiedTime: file.modifiedTime || null,
    iconLink: file.iconLink || null,
    isFolder,
    importable: isFolder || SUPPORTED_MIME_TYPES.has(file.mimeType),
    displayType: getDisplayType(file.mimeType),
  };
}

/**
 * Build breadcrumb trail from a folder ID back to root.
 */
async function buildBreadcrumbs(drive, folderId) {
  const crumbs = [];
  let currentId = folderId;

  // Walk parent chain (max 10 levels to prevent loops)
  for (let i = 0; i < 10 && currentId && currentId !== "root"; i++) {
    try {
      const res = await drive.files.get({
        fileId: currentId,
        fields: "id, name, parents",
      });
      crumbs.unshift({ id: res.data.id, name: res.data.name });
      currentId = (res.data.parents && res.data.parents[0]) || null;
    } catch (err) {
      break;
    }
  }

  // Always prepend My Drive root
  crumbs.unshift({ id: "root", name: "My Drive" });
  return crumbs;
}

/**
 * Browse files and folders in a Google Drive folder.
 *
 * Body: { folderId?: string, pageToken?: string }
 * Returns: { ok, files[], nextPageToken, breadcrumbs[] }
 */
async function handleDriveBrowse(req, res, { userId }) {
  const { folderId = "root", pageToken } = req.body || {};
  const drive = await getAuthenticatedDriveClient(userId);

  const query = `'${folderId}' in parents and trashed = false`;
  const listRes = await drive.files.list({
    q: query,
    fields: `nextPageToken, files(${FILE_FIELDS})`,
    orderBy: "folder, name",
    pageSize: 50,
    pageToken: pageToken || undefined,
  });

  const files = (listRes.data.files || []).map(classifyFile);
  const breadcrumbs = await buildBreadcrumbs(drive, folderId);

  return res.json({
    ok: true,
    files,
    nextPageToken: listRes.data.nextPageToken || null,
    breadcrumbs,
  });
}

/**
 * Search files across the user's Google Drive.
 *
 * Body: { query: string, pageToken?: string }
 * Returns: { ok, files[], nextPageToken }
 */
async function handleDriveSearch(req, res, { userId }) {
  const { query, pageToken } = req.body || {};
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({ ok: false, error: "Search query required" });
  }

  const drive = await getAuthenticatedDriveClient(userId);

  // Escape single quotes in the query
  const safeQuery = query.replace(/'/g, "\\'");
  const driveQuery = `fullText contains '${safeQuery}' and trashed = false`;

  const listRes = await drive.files.list({
    q: driveQuery,
    fields: `nextPageToken, files(${FILE_FIELDS})`,
    pageSize: 50,
    pageToken: pageToken || undefined,
  });

  const files = (listRes.data.files || []).map(classifyFile);

  return res.json({
    ok: true,
    files,
    nextPageToken: listRes.data.nextPageToken || null,
  });
}

module.exports = {
  handleDriveBrowse,
  handleDriveSearch,
};
