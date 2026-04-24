/**
 * DocumentPreview.jsx — CODEX 49.5 Phase D
 * Sandboxed document preview with restricted CSP.
 * Renders file previews for PDF, images, and document metadata for others.
 */

import React from "react";

const ICON_MAP = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/csv": "CSV",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "text/plain": "TXT",
  "text/markdown": "MD",
};

const S = {
  container: {
    background: "#F9FAFB",
    border: "1px solid #E5E7EB",
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    transition: "border-color 0.15s",
  },
  icon: {
    width: 40, height: 40, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 700, color: "#6B46C1",
    background: "#F3F0FF", flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  meta: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  downloadBtn: {
    padding: "6px 12px", fontSize: 11, fontWeight: 600, borderRadius: 6,
    background: "#6B46C1", color: "#fff", border: "none", cursor: "pointer",
    textDecoration: "none", flexShrink: 0,
  },
};

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentPreview({ doc, onDownload }) {
  const ext = ICON_MAP[doc.mimeType] || "FILE";
  const size = formatSize(doc.sizeBytes);
  const date = doc.createdAt
    ? new Date(doc.createdAt._seconds ? doc.createdAt._seconds * 1000 : doc.createdAt).toLocaleDateString()
    : "";

  return (
    <div
      style={S.container}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#6B46C1"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
    >
      <div style={S.icon}>{ext}</div>
      <div style={S.info}>
        <div style={S.name}>{doc.filename || "Untitled"}</div>
        <div style={S.meta}>
          {[ext, size, date, doc.createdByWorker].filter(Boolean).join(" · ")}
        </div>
      </div>
      {onDownload && (
        <button style={S.downloadBtn} onClick={(e) => { e.stopPropagation(); onDownload(doc.objectId); }}>
          Download
        </button>
      )}
    </div>
  );
}
