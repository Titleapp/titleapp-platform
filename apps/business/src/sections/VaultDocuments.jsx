import React, { useState, useEffect, useCallback } from "react";
import useDocuments from "../hooks/useDocuments";
import DriveImportModal from "../components/DriveImportModal";

// CODEX 50.13 Day 2 Fix #3 — mime-class taxonomy (Google Drive style).
// Drive holds raw files; classification is by file type, not asset class.
// Asset-class taxonomy lives in the Vault (DTCs), where it belongs.
const CATEGORIES = [
  { id: "documents",     label: "Documents",     icon: "D", color: "#2563eb" },
  { id: "spreadsheets",  label: "Spreadsheets",  icon: "S", color: "#16a34a" },
  { id: "images",        label: "Images",        icon: "I", color: "#7c3aed" },
  { id: "presentations", label: "Presentations", icon: "P", color: "#d97706" },
  { id: "other",         label: "Other",         icon: "O", color: "#64748b" },
];

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatDate(ts) {
  if (!ts) return "";
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function fileIconLabel(mime, name) {
  const m = (mime || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (m.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/.test(n)) return "IMG";
  if (m === "application/pdf" || n.endsWith(".pdf")) return "PDF";
  if (m.includes("word") || /\.docx?$/.test(n)) return "DOC";
  if (m.includes("sheet") || /\.xlsx?$/.test(n) || n.endsWith(".csv")) return "XLS";
  if (m.includes("presentation") || /\.pptx?$/.test(n)) return "PPT";
  if (m.startsWith("text/") || /\.(txt|md|json)$/.test(n)) return "TXT";
  return "FILE";
}

// Mime-class classifier — mirrors fileIconLabel but at the category level.
// PDF + Word + plain text → documents; Excel/CSV → spreadsheets; PNG/JPG/SVG →
// images; PPT → presentations; everything else → other.
function categoryFromMime(mime, name) {
  const m = (mime || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (m.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|heic)$/.test(n)) return "images";
  if (m.includes("sheet") || /\.(xlsx?|csv|numbers)$/.test(n)) return "spreadsheets";
  if (m.includes("presentation") || /\.(pptx?|key)$/.test(n)) return "presentations";
  if (
    m === "application/pdf" || n.endsWith(".pdf") ||
    m.includes("word") || /\.(docx?|rtf|odt|pages)$/.test(n) ||
    m.startsWith("text/") || /\.(txt|md|json)$/.test(n)
  ) return "documents";
  return "other";
}

// Extract the worker slug from a file's tags array. Tags look like
// "worker:platform-marketing" or "worker:av-pc12-ng". Returns null if the
// file isn't worker-scoped (e.g. legacy uploads, account-level docs).
function workerSlugFromTags(tags) {
  if (!Array.isArray(tags)) return null;
  const tag = tags.find(t => typeof t === "string" && t.startsWith("worker:"));
  return tag ? tag.substring("worker:".length) : null;
}

const DEMO_FILES = [
  { objectId: "_demo_1", filename: "Home Inspection Report — 4521 Maple St.pdf", mimeType: "application/pdf", sizeBytes: 2840000, tags: ["worker:platform-real-estate-ca"], createdAt: { _seconds: Math.floor(Date.now()/1000) - 86400 * 14 }, _demo: true },
  { objectId: "_demo_2", filename: "Tesla Model S — Title & Registration.pdf", mimeType: "application/pdf", sizeBytes: 312000, tags: ["worker:platform-real-estate-ca"], createdAt: { _seconds: Math.floor(Date.now()/1000) - 86400 * 30 }, _demo: true },
  { objectId: "_demo_3", filename: "Q1 2026 Financial Statement.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", sizeBytes: 88000, tags: ["worker:platform-accounting"], createdAt: { _seconds: Math.floor(Date.now()/1000) - 86400 * 7 }, _demo: true },
  { objectId: "_demo_4", filename: "Employee Handbook v2.3.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", sizeBytes: 540000, tags: ["worker:platform-hr"], createdAt: { _seconds: Math.floor(Date.now()/1000) - 86400 * 21 }, _demo: true },
  { objectId: "_demo_5", filename: "Board Pitch Deck — June 2026.pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", sizeBytes: 4200000, tags: [], createdAt: { _seconds: Math.floor(Date.now()/1000) - 86400 * 3 }, _demo: true },
];

export default function VaultDocuments() {
  const [filter, setFilter] = useState("all");
  const [workerFilter, setWorkerFilter] = useState(null); // null = show worker folders
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("DRIVE_VIEW_MODE") || "list");
  const [showDriveConnect, setShowDriveConnect] = useState(false);
  const [sortBy, setSortBy] = useState({ field: "createdAt", dir: "desc" });
  const { listDocuments, downloadFile, deleteDocument } = useDocuments();

  function setView(mode) {
    setViewMode(mode);
    localStorage.setItem("DRIVE_VIEW_MODE", mode);
  }

  function toggleSort(field) {
    setSortBy((s) => s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" });
  }

  const [isDemo, setIsDemo] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await listDocuments({ limit: 200 });
      if (result?.ok && Array.isArray(result.objects) && result.objects.length > 0) {
        setDocs(result.objects);
        setIsDemo(false);
      } else {
        setDocs(DEMO_FILES);
        setIsDemo(true);
        if (result?.error) setLoadError(result.error);
      }
    } catch (e) {
      setLoadError(e.message || "Failed to load documents");
      setDocs(DEMO_FILES);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [listDocuments]);

  useEffect(() => { refresh(); }, [refresh]);

  // Refetch on persona switch — useDocuments reads TENANT_ID from
  // localStorage at call time, so we re-run refresh() whenever the
  // workspace switcher fires ta:workspace-changed.
  useEffect(() => {
    function onWorkspaceChange() { refresh(); }
    window.addEventListener("ta:workspace-changed", onWorkspaceChange);
    return () => window.removeEventListener("ta:workspace-changed", onWorkspaceChange);
  }, [refresh]);

  // Refetch when a chat-attached file lands in Drive (ChatPanel emits this
  // after successful upload via /v1/files:sign + /v1/files:finalize).
  useEffect(() => {
    function onDriveUpdated() { refresh(); }
    window.addEventListener("ta:drive-updated", onDriveUpdated);
    return () => window.removeEventListener("ta:drive-updated", onDriveUpdated);
  }, [refresh]);

  // Sean's call 2026-05-13: Drive is most useful when scoped to a worker. The
  // default view is folder-style — one folder per worker that has documents,
  // plus an "Unassigned" folder for docs without a worker tag. Clicking a
  // folder sets workerFilter; the flat-list view returns when filtered.
  const docsByWorker = docs.reduce((acc, d) => {
    const slug = workerSlugFromTags(d.tags);
    const key = slug || "_unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  const workerFolders = Object.keys(docsByWorker)
    .map(k => ({
      slug: k === "_unassigned" ? null : k,
      label: k === "_unassigned" ? "Unassigned" : k,
      count: docsByWorker[k].length,
    }))
    .sort((a, b) => {
      if (a.slug === null) return 1;
      if (b.slug === null) return -1;
      return a.label.localeCompare(b.label);
    });

  const scopedDocs = workerFilter === null
    ? docs
    : (docsByWorker[workerFilter === "_unassigned" ? "_unassigned" : workerFilter] || []);

  const filteredUnsorted = filter === "all"
    ? scopedDocs
    : scopedDocs.filter(d => categoryFromMime(d.mimeType, d.filename) === filter);

  const filtered = [...filteredUnsorted].sort((a, b) => {
    const dir = sortBy.dir === "asc" ? 1 : -1;
    if (sortBy.field === "filename") {
      return (a.filename || "").localeCompare(b.filename || "") * dir;
    }
    if (sortBy.field === "sizeBytes") {
      return ((a.sizeBytes || 0) - (b.sizeBytes || 0)) * dir;
    }
    // createdAt — handle Firestore timestamp shape
    const at = a.createdAt?._seconds ?? (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
    const bt = b.createdAt?._seconds ?? (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
    return (at - bt) * dir;
  });

  const counts = docs.reduce((acc, d) => {
    const cat = categoryFromMime(d.mimeType, d.filename);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const handleDownload = async (objectId) => {
    if (String(objectId).startsWith("_demo_")) {
      window.alert("This is a sample file. Upload a real document or connect Google Drive to access your files.");
      return;
    }
    const result = await downloadFile(objectId);
    if (!result || !result.downloadUrl) {
      window.alert("This file can't be opened yet — it's a placeholder with no stored file behind it.");
    }
  };

  // Hand a Drive file to the active worker's chat (the Drive → worker handoff).
  // Fires a global event ChatPanel listens for; also used by drag-and-drop.
  const handleSendToChat = (doc) => {
    window.dispatchEvent(new CustomEvent("ta:drive-to-chat", {
      detail: { objectId: doc.objectId, filename: doc.filename, mimeType: doc.mimeType, createdByWorker: doc.createdByWorker || null },
    }));
  };

  const handleDelete = async (objectId, filename) => {
    if (String(objectId).startsWith("_demo_")) return;
    if (!window.confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    const result = await deleteDocument(objectId);
    if (result?.ok) refresh();
    else window.alert(`Delete failed: ${result?.error || "unknown error"}`);
  };

  return (
    <div>
      {showDriveConnect && (
        <DriveImportModal
          isOpen
          workerId="vault"
          onClose={() => setShowDriveConnect(false)}
          onImportStarted={() => { setShowDriveConnect(false); window.dispatchEvent(new Event('ta:drive-updated')); }}
        />
      )}
      <div className="pageHeader">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 className="h1">My Drive</h1>
            {isDemo && (
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: "2px 8px", borderRadius: 999, background: "#f59e0b22", color: "#d97706", textTransform: "uppercase", border: "1px solid #fcd34d" }}>
                SAMPLE
              </span>
            )}
          </div>
          <p className="subtle">
            {workerFilter
              ? <>
                  <button
                    onClick={() => setWorkerFilter(null)}
                    style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", padding: 0, fontSize: "inherit", textDecoration: "underline" }}
                  >All workers</button>
                  {" / "}
                  <strong>{workerFilter === "_unassigned" ? "Unassigned" : workerFilter}</strong>
                  {" — "}{filtered.length} document{filtered.length === 1 ? "" : "s"}
                </>
              : isDemo
                ? "Sample files — upload your first document or connect Google Drive to see your real files"
                : `${docs.length} document${docs.length === 1 ? "" : "s"} across ${workerFolders.length} folder${workerFolders.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setShowDriveConnect(true)}
            title="Connect your Google Drive"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#1e293b", cursor: "pointer" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
            Connect Google Drive
          </button>
          {/* View toggle — list (default, GDrive style) vs grid (cards). Persisted to localStorage. */}
          <div style={{ display: "inline-flex", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
            <button
              onClick={() => setView("list")}
              title="List view"
              style={{
                padding: "8px 10px", border: "none", cursor: "pointer",
                background: viewMode === "list" ? "#1e293b" : "white",
                color: viewMode === "list" ? "white" : "#64748b",
                display: "flex", alignItems: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
            <button
              onClick={() => setView("grid")}
              title="Grid view"
              style={{
                padding: "8px 10px", border: "none", cursor: "pointer", borderLeft: "1px solid #e2e8f0",
                background: viewMode === "grid" ? "#1e293b" : "white",
                color: viewMode === "grid" ? "white" : "#64748b",
                display: "flex", alignItems: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
          </div>
          <button
            className="iconBtn"
            onClick={refresh}
            style={{ background: "white", color: "#1e293b", border: "1px solid #e2e8f0" }}
          >
            Refresh
          </button>
          <button
            className="iconBtn"
            onClick={() => window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: "I want to add a new document to my vault" } }))}
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
          >
            Add Document
          </button>
        </div>
      </div>

      {/* Worker folders — top-level grouping. Drive is most useful scoped to
          a worker (Sean 2026-05-13). Folders render when no worker is selected;
          clicking enters that worker's documents. GDrive-style folder cards
          with a proper folder SVG icon. */}
      {!loading && !loadError && docs.length > 0 && workerFilter === null && workerFolders.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: "10px" }}>Folders</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
            {workerFolders.map(f => (
              <div
                key={f.slug || "_unassigned"}
                onClick={() => setWorkerFilter(f.slug || "_unassigned")}
                className="card"
                style={{ padding: "16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "14px", transition: "background 0.1s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill={f.slug ? "#7c3aed" : "#94a3b8"} style={{ flexShrink: 0 }}>
                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.label}</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>{f.count} file{f.count === 1 ? "" : "s"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter chips — compact filter row replaces the old big-tile category
          cards. Reads more like GDrive's chip row above the file list. */}
      {!loading && !loadError && docs.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
          {[
            { id: "all", label: "All", color: "#7c3aed", count: docs.length },
            ...CATEGORIES.map(cat => ({ id: cat.id, label: cat.label, color: cat.color, count: counts[cat.id] || 0 })),
          ].filter(c => c.id === "all" || c.count > 0).map(c => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              style={{
                padding: "6px 12px", borderRadius: "999px", fontSize: "13px", fontWeight: 500,
                border: filter === c.id ? `1px solid ${c.color}` : "1px solid #e2e8f0",
                background: filter === c.id ? `${c.color}12` : "white",
                color: filter === c.id ? c.color : "#475569",
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px",
              }}
            >
              {c.label}
              <span style={{ fontSize: "11px", opacity: 0.7 }}>{c.count}</span>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="card" style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
          Loading documents...
        </div>
      )}

      {!loading && loadError && (
        <div className="card" style={{ padding: "24px", textAlign: "center", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca" }}>
          Failed to load documents: {loadError}
        </div>
      )}

      {isDemo && !loading && (
        <div style={{ marginBottom: 20, padding: "14px 18px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "#92400e" }}>
            <strong>Sample files</strong> — showing example documents. Connect Google Drive or upload a file to see your real Drive.
          </div>
          <button
            onClick={() => setShowDriveConnect(true)}
            style={{ padding: "8px 16px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Connect Google Drive
          </button>
        </div>
      )}

      {!loading && !loadError && filtered.length === 0 && docs.length > 0 && (
        <div className="card" style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
          No documents in this category. <button onClick={() => setFilter("all")} style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", textDecoration: "underline", padding: 0 }}>Show all</button>
        </div>
      )}

      {/* List view — Google-Drive style table with sortable columns. */}
      {!loading && !loadError && filtered.length > 0 && viewMode === "list" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 1fr) 140px 120px 80px",
            padding: "10px 16px", borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc", fontSize: 12, fontWeight: 600, color: "#64748b",
            textTransform: "uppercase", letterSpacing: 0.4,
          }}>
            <button onClick={() => toggleSort("filename")} style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "inherit", fontSize: "inherit", fontWeight: "inherit", letterSpacing: "inherit", textTransform: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
              Name {sortBy.field === "filename" && (sortBy.dir === "asc" ? "↑" : "↓")}
            </button>
            <button onClick={() => toggleSort("createdAt")} style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "inherit", fontSize: "inherit", fontWeight: "inherit", letterSpacing: "inherit", textTransform: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
              Date {sortBy.field === "createdAt" && (sortBy.dir === "asc" ? "↑" : "↓")}
            </button>
            <button onClick={() => toggleSort("sizeBytes")} style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: "inherit", fontSize: "inherit", fontWeight: "inherit", letterSpacing: "inherit", textTransform: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
              Size {sortBy.field === "sizeBytes" && (sortBy.dir === "asc" ? "↑" : "↓")}
            </button>
            <span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {filtered.map(doc => {
            const cat = categoryFromMime(doc.mimeType, doc.filename);
            const catMeta = CATEGORIES.find(c => c.id === cat) || CATEGORIES[CATEGORIES.length - 1];
            const fromGdrive = Array.isArray(doc.tags) && doc.tags.includes("source:google_drive");
            const fromChat = Array.isArray(doc.tags) && doc.tags.includes("source:chat");
            const fromLogbook = Array.isArray(doc.tags) && doc.tags.includes("source:logbook");
            const sourceLabel = fromGdrive ? "Drive" : fromChat ? "Chat" : fromLogbook ? "Logbook" : doc.createdByWorker || null;
            return (
              <div
                key={doc.objectId}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-sociii-drive", JSON.stringify({ objectId: doc.objectId, filename: doc.filename, mimeType: doc.mimeType, createdByWorker: doc.createdByWorker || null }));
                  e.dataTransfer.setData("text/plain", doc.filename);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(240px, 1fr) 130px 110px 130px",
                  padding: "10px 16px", borderBottom: "1px solid #f1f5f9",
                  alignItems: "center", fontSize: 13,
                  cursor: "grab", transition: "background 0.1s ease",
                }}
                onClick={() => handleDownload(doc.objectId)}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                title="Drag into the chat, or use → Chat, to hand this file to a worker"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                    background: `${catMeta.color}15`, color: catMeta.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {fileIconLabel(doc.mimeType, doc.filename)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={doc.filename}>
                      {doc.filename}
                    </div>
                    {sourceLabel && (
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{sourceLabel}</div>
                    )}
                  </div>
                </div>
                <div style={{ color: "#475569" }}>{formatDate(doc.createdAt)}</div>
                <div style={{ color: "#475569" }}>{formatSize(doc.sizeBytes)}</div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleSendToChat(doc)}
                    title="Send this file to the worker chat"
                    style={{ padding: "4px 8px", fontSize: 11, fontWeight: 700, background: "#7c3aed", color: "#fff", border: "1px solid #7c3aed", borderRadius: 6, cursor: "pointer" }}
                  >
                    → Chat
                  </button>
                  <button
                    onClick={() => handleDownload(doc.objectId)}
                    title="Open"
                    style={{ padding: "4px 8px", fontSize: 11, fontWeight: 600, background: "#f8fafc", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer" }}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleDelete(doc.objectId, doc.filename)}
                    title="Delete"
                    style={{ padding: "4px 8px", fontSize: 11, fontWeight: 600, background: "white", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer" }}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !loadError && filtered.length > 0 && viewMode === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
          {filtered.map(doc => {
            const cat = categoryFromMime(doc.mimeType, doc.filename);
            const catMeta = CATEGORIES.find(c => c.id === cat) || CATEGORIES[CATEGORIES.length - 1];
            const fromGdrive = Array.isArray(doc.tags) && doc.tags.includes("source:google_drive");
            const fromChat = Array.isArray(doc.tags) && doc.tags.includes("source:chat");
            const fromLogbook = Array.isArray(doc.tags) && doc.tags.includes("source:logbook");
            const sourceLabel = fromGdrive ? "Drive" : fromChat ? "Chat" : fromLogbook ? "Logbook" : doc.createdByWorker || null;
            return (
              <div
                key={doc.objectId}
                className="card"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-sociii-drive", JSON.stringify({ objectId: doc.objectId, filename: doc.filename, mimeType: doc.mimeType, createdByWorker: doc.createdByWorker || null }));
                  e.dataTransfer.setData("text/plain", doc.filename);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                title="Drag into the chat, or use → Chat, to hand this file to a worker"
                style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px", cursor: "grab" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "8px",
                    background: `${catMeta.color}15`, color: catMeta.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: 700,
                  }}>
                    {fileIconLabel(doc.mimeType, doc.filename)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={doc.filename}>
                      {doc.filename}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                      {formatSize(doc.sizeBytes)} · {formatDate(doc.createdAt)}
                      {sourceLabel ? ` · ${sourceLabel}` : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => handleSendToChat(doc)}
                    title="Send this file to the worker chat"
                    style={{ flex: 1, padding: "6px 10px", fontSize: "12px", fontWeight: 700, background: "#7c3aed", color: "#fff", border: "1px solid #7c3aed", borderRadius: "6px", cursor: "pointer" }}
                  >
                    → Chat
                  </button>
                  <button
                    onClick={() => handleDownload(doc.objectId)}
                    style={{ flex: 1, padding: "6px 10px", fontSize: "12px", fontWeight: 600, background: "#f8fafc", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer" }}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleDelete(doc.objectId, doc.filename)}
                    style={{ padding: "6px 10px", fontSize: "12px", fontWeight: 600, background: "white", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer" }}
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
