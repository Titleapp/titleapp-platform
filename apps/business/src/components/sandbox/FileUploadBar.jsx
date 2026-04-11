// CODEX 47.10 — FileUploadBar
// Shared file attachment UI for game and worker sandbox chats.
// Shows attached files as chips with progress indicators and type badges.
// Swiss palette — flat colors, no decorative iconography.
import React, { memo } from "react";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const TYPE_COLORS = {
  document: "#3B82F6", // blue
  image: "#16A34A",    // green
  video: "#F59E0B",    // amber
  unknown: "#94A3B8",  // gray
};

const STATUS_DOTS = {
  pending: "#94A3B8",   // gray
  uploading: "#EAB308", // yellow
  done: "#16A34A",      // green
  error: "#DC2626",     // red
};

// Accepted file extensions — keep in sync with the <input accept=""> attributes
export const ACCEPTED_EXTENSIONS = [
  // documents
  "pdf", "docx", "doc", "txt", "md", "csv", "xlsx", "xls", "pptx", "ppt", "rtf",
  // images
  "png", "jpg", "jpeg", "gif", "webp", "svg",
  // video
  "mp4", "mov", "webm",
];

export const ACCEPT_STRING = ACCEPTED_EXTENSIONS.map(e => `.${e}`).join(",");

export function classifyFile(file) {
  const ext = (file.name || "").toLowerCase().split(".").pop();
  if (["pdf", "docx", "doc", "txt", "md", "csv", "xlsx", "xls", "pptx", "ppt", "rtf"].includes(ext)) return "document";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["mp4", "mov", "webm"].includes(ext)) return "video";
  return "unknown";
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateFiles(fileList) {
  const valid = [];
  const rejected = [];
  for (const f of Array.from(fileList)) {
    if (f.size > MAX_FILE_SIZE) {
      rejected.push({ name: f.name, reason: `Exceeds ${formatSize(MAX_FILE_SIZE)} limit` });
    } else if (classifyFile(f) === "unknown") {
      rejected.push({ name: f.name, reason: "Unsupported file type" });
    } else {
      valid.push(f);
    }
  }
  return { valid, rejected };
}

export default memo(function FileUploadBar({ files = [], onRemove, onClear, disabled }) {
  if (!files.length) return null;

  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
  const uploading = files.some(f => f.status === "uploading");

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 8,
        padding: "8px 10px",
        marginBottom: 8,
      }}
    >
      {/* Summary line */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: files.length > 0 ? 6 : 0,
          fontSize: 12,
          color: "#64748B",
        }}
      >
        <span style={{ fontWeight: 600 }}>
          {files.length} file{files.length !== 1 ? "s" : ""} attached
          <span style={{ fontWeight: 400 }}> · {formatSize(totalSize)}</span>
        </span>
        {!uploading && !disabled && (
          <button
            type="button"
            onClick={onClear}
            style={{
              background: "none",
              border: "none",
              color: "#64748B",
              fontSize: 12,
              cursor: "pointer",
              padding: "2px 4px",
              textDecoration: "underline",
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* File chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {files.map((f) => (
          <div
            key={f.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 8px",
              background: "#F8FAFC",
              borderRadius: 6,
              borderLeft: `3px solid ${TYPE_COLORS[f.type] || TYPE_COLORS.unknown}`,
              fontSize: 12,
              color: "#1a1a2e",
              position: "relative",
              overflow: "hidden",
              maxWidth: 200,
            }}
          >
            {/* Status dot */}
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: STATUS_DOTS[f.status] || STATUS_DOTS.pending,
                flexShrink: 0,
              }}
            />
            {/* File name */}
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
              title={f.name}
            >
              {f.name}
            </span>
            {/* Size */}
            <span style={{ color: "#94A3B8", fontSize: 11, flexShrink: 0 }}>
              {formatSize(f.size)}
            </span>
            {/* Remove button */}
            {!uploading && !disabled && (
              <button
                type="button"
                onClick={() => onRemove(f.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94A3B8",
                  fontSize: 14,
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                title="Remove"
              >
                &times;
              </button>
            )}
            {/* Progress bar */}
            {f.status === "uploading" && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  height: 2,
                  background: TYPE_COLORS[f.type] || TYPE_COLORS.unknown,
                  width: `${f.progress || 0}%`,
                  transition: "width 0.3s",
                }}
              />
            )}
            {/* Error label */}
            {f.status === "error" && (
              <span style={{ color: "#DC2626", fontSize: 11, flexShrink: 0 }}>
                Failed
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
