import React, { useState, useEffect } from "react";
import { auth } from "../../firebase";
import { driveImportCourseFiles } from "../../api/educationApi";

// CODEX 70 Surface 2 — Course Uploader, Step 3 Google Drive import.
//
// This is a direct generalization of components/DriveImportModal.jsx (used
// today for aviation/vault documents in CoPilotEFB.jsx and
// VaultDocuments.jsx) — same OAuth connect / browse / search flow against
// the real, live /v1/drive:* routes. NOT a new Drive integration.
//
// Two differences from the original:
//   1. IMPORT_DOC_TYPES is education-shaped (syllabus, rubric, learning
//      objectives, instructor notes) instead of aviation's POH/QRH/MEL list.
//   2. The final import step calls /v1/edu:course:driveImport (Studio Locker
//      ingest) instead of /v1/vault:importFromDrive (Vault chunk+embed
//      pipeline) — course materials need to land in the same place local
//      drag-and-drop uploads do.
//
// OneDrive stays visibly disabled ("Coming soon") — no import UI exists for
// it anywhere in this codebase, and building it is real, non-trivial work
// out of scope for this pass.

const API_BASE = "https://api-feyfibglbq-uc.a.run.app/v1";

async function driveApi(route, method = "GET", body = null) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  const opts = { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}/drive:${route}`, opts);
  return res.json();
}

const IMPORT_DOC_TYPES = [
  { id: "syllabus", label: "Syllabus" },
  { id: "objectives", label: "Learning Objectives / SLOs" },
  { id: "rubric", label: "Grading Rubric" },
  { id: "instructor_notes", label: "Instructor Notes / Study Guide" },
  { id: "other", label: "Other" },
];

function detectDocTypeFromFilename(fileName) {
  const lower = (fileName || "").toLowerCase();
  if (lower.includes("syllabus")) return "syllabus";
  if (lower.includes("objective") || lower.includes("slo") || lower.includes("outcome")) return "objectives";
  if (lower.includes("rubric") || lower.includes("grading")) return "rubric";
  if (lower.includes("note") || lower.includes("study guide") || lower.includes("guide")) return "instructor_notes";
  return "other";
}

export default function EduDriveImportModal({ isOpen, onClose, workerId, onImportComplete }) {
  const S = LIGHT;
  const [driveStatus, setDriveStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  const [assignmentData, setAssignmentData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  useEffect(() => {
    if (isOpen) checkDriveStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function checkDriveStatus() {
    try {
      const res = await driveApi("status");
      setDriveStatus(res);
      if (res.connected) browseFolder("root");
    } catch {
      setDriveStatus({ connected: false });
    }
  }

  async function connectDrive() {
    try {
      const res = await driveApi("authUrl");
      if (!res.authUrl) return;
      window.open(res.authUrl, "google-drive-auth", "width=600,height=700");
      const handler = async (event) => {
        if (event.data && event.data.type === "google-drive-auth-code") {
          window.removeEventListener("message", handler);
          const exchangeRes = await driveApi("exchangeCode", "POST", { code: event.data.code });
          if (exchangeRes.ok) {
            setDriveStatus({ connected: true, email: exchangeRes.email });
            browseFolder("root");
          }
        }
      };
      window.addEventListener("message", handler);
    } catch (e) {
      console.error("Drive connect failed:", e);
    }
  }

  async function browseFolder(folderId) {
    setLoading(true);
    setSearchQuery("");
    try {
      const res = await driveApi("browse", "POST", { folderId });
      if (res.ok) {
        setFiles(res.files || []);
        setBreadcrumbs(res.breadcrumbs || []);
      }
    } catch (e) {
      console.error("Browse failed:", e);
    }
    setLoading(false);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await driveApi("search", "POST", { query: searchQuery });
      if (res.ok) {
        setFiles(res.files || []);
        setBreadcrumbs([{ id: "root", name: "My Drive" }, { id: "search", name: `Search: "${searchQuery}"` }]);
      }
    } catch (e) {
      console.error("Search failed:", e);
    }
    setSearching(false);
  }

  function toggleSelect(file) {
    const next = new Map(selectedFiles);
    if (next.has(file.id)) next.delete(file.id);
    else next.set(file.id, file);
    setSelectedFiles(next);
  }

  function handleImportSelected() {
    const selected = Array.from(selectedFiles.values());
    const assignments = selected.map((f) => ({
      driveFileId: f.id,
      fileName: f.name,
      mimeType: f.mimeType,
      docType: detectDocTypeFromFilename(f.name),
    }));
    setAssignmentData(assignments);
    setShowAssignment(true);
  }

  async function handleStartImport() {
    setImporting(true);
    setImportError(null);
    try {
      const res = await driveImportCourseFiles({ workerId, files: assignmentData });
      if (res.ok) {
        onImportComplete(res.results || []);
        onClose();
      } else {
        setImportError(res.error || "Import failed");
      }
    } catch (e) {
      setImportError(e.message || "Import failed");
    }
    setImporting(false);
  }

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: S.card, borderRadius: 12, width: "90%", maxWidth: 720, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: S.text }}>
            {showAssignment ? "Assign Document Types" : "Import Course Materials from Google Drive"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: S.textMuted, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {!driveStatus ? (
            <div style={{ color: S.textMuted, textAlign: "center", padding: 40 }}>Loading...</div>
          ) : !driveStatus.connected ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24, flexWrap: "wrap" }}>
                <button onClick={connectDrive} style={{ padding: "12px 24px", background: S.accent, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
                  Connect Google Drive
                </button>
                <button disabled style={{ padding: "12px 24px", background: "none", border: `1px solid ${S.border}`, borderRadius: 8, color: S.textMuted, cursor: "not-allowed", fontSize: 14 }}>
                  OneDrive<span style={{ display: "block", fontSize: 10 }}>Coming soon</span>
                </button>
              </div>
              <div style={{ color: S.textMuted, fontSize: 13 }}>Connect your Google Drive to import your syllabus, rubrics, and notes directly.</div>
            </div>
          ) : showAssignment ? (
            <div>
              {assignmentData.map((file, idx) => (
                <div key={file.driveFileId} style={{ padding: "12px 0", borderBottom: idx < assignmentData.length - 1 ? `1px solid ${S.border}` : "none" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 8 }}>{file.fileName}</div>
                  <div>
                    <label style={{ fontSize: 11, color: S.textMuted, display: "block", marginBottom: 4 }}>Document Type</label>
                    <select
                      value={file.docType}
                      onChange={(e) => {
                        const next = [...assignmentData];
                        next[idx] = { ...next[idx], docType: e.target.value };
                        setAssignmentData(next);
                      }}
                      style={{ width: "100%", maxWidth: 260, padding: "6px 8px", background: S.input, border: `1px solid ${S.border}`, borderRadius: 4, color: S.text, fontSize: 12 }}
                    >
                      {IMPORT_DOC_TYPES.map((dt) => (
                        <option key={dt.id} value={dt.id}>{dt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              {importError && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 12 }}>{importError}</div>}
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Search Drive..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  style={{ flex: 1, padding: "8px 12px", background: S.input, border: `1px solid ${S.border}`, borderRadius: 6, color: S.text, fontSize: 13 }}
                />
                <button onClick={handleSearch} disabled={searching} style={{ padding: "8px 16px", background: S.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                  {searching ? "..." : "Search"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
                {breadcrumbs.map((crumb, i) => (
                  <span key={crumb.id}>
                    {i > 0 && <span style={{ color: S.textMuted, margin: "0 4px" }}>/</span>}
                    <button
                      onClick={() => crumb.id !== "search" && browseFolder(crumb.id)}
                      style={{ background: "none", border: "none", color: i === breadcrumbs.length - 1 ? S.text : S.accent, cursor: "pointer", fontSize: 12, padding: 0, textDecoration: i === breadcrumbs.length - 1 ? "none" : "underline" }}
                    >
                      {crumb.name}
                    </button>
                  </span>
                ))}
              </div>
              {loading ? (
                <div style={{ color: S.textMuted, textAlign: "center", padding: 40 }}>Loading...</div>
              ) : files.length === 0 ? (
                <div style={{ color: S.textMuted, textAlign: "center", padding: 40 }}>No files found</div>
              ) : (
                <div style={{ maxHeight: 350, overflow: "auto" }}>
                  {files.map((file) => (
                    <div
                      key={file.id}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: `1px solid ${S.border}`, opacity: file.importable ? 1 : 0.4, cursor: file.isFolder ? "pointer" : file.importable ? "pointer" : "not-allowed" }}
                      onClick={() => {
                        if (file.isFolder) browseFolder(file.id);
                        else if (file.importable) toggleSelect(file);
                      }}
                    >
                      {!file.isFolder && (
                        <input type="checkbox" checked={selectedFiles.has(file.id)} disabled={!file.importable} onChange={() => toggleSelect(file)} onClick={(e) => e.stopPropagation()} />
                      )}
                      <span style={{ fontSize: 16 }}>{file.isFolder ? "📁" : "📄"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: S.text }}>{file.name}</div>
                        <div style={{ fontSize: 11, color: S.textMuted }}>
                          {file.displayType}{file.size ? ` · ${(file.size / 1048576).toFixed(1)} MB` : ""}
                        </div>
                      </div>
                      {!file.importable && !file.isFolder && <span style={{ fontSize: 10, color: S.textMuted }}>Not supported</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {showAssignment ? (
            <>
              <button onClick={() => setShowAssignment(false)} style={{ padding: "8px 16px", background: "none", border: `1px solid ${S.border}`, borderRadius: 6, color: S.textMuted, cursor: "pointer", fontSize: 13 }}>Back</button>
              <button onClick={handleStartImport} disabled={importing} style={{ padding: "8px 20px", background: S.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                {importing ? "Importing..." : `Import ${assignmentData.length} File${assignmentData.length !== 1 ? "s" : ""}`}
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: S.textMuted }}>
                {selectedFiles.size > 0 ? `${selectedFiles.size} file${selectedFiles.size !== 1 ? "s" : ""} selected` : "Select files to import"}
              </div>
              <button onClick={handleImportSelected} disabled={selectedFiles.size === 0} style={{ padding: "8px 20px", background: selectedFiles.size > 0 ? S.accent : S.border, color: "#fff", border: "none", borderRadius: 6, cursor: selectedFiles.size > 0 ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 500 }}>
                Import Selected
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const LIGHT = {
  card: "#ffffff", border: "#e5e7eb", text: "#0f172a", textMuted: "#6b7280",
  accent: "#7c3aed", input: "#f9fafb",
};
