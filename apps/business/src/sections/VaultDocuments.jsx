import React, { useState, useEffect, useCallback } from "react";
import useDocuments from "../hooks/useDocuments";

const CATEGORIES = [
  { id: "vehicles", label: "Vehicles", icon: "V", color: "#7c3aed" },
  { id: "property", label: "Property", icon: "P", color: "#2563eb" },
  { id: "financial", label: "Financial", icon: "F", color: "#16a34a" },
  { id: "identity", label: "Identity", icon: "I", color: "#d97706" },
  { id: "medical", label: "Medical", icon: "M", color: "#dc2626" },
  { id: "education", label: "Education", icon: "E", color: "#06b6d4" },
  { id: "other", label: "Other", icon: "O", color: "#64748b" },
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

function categoryFromTags(tags) {
  if (!Array.isArray(tags)) return "other";
  const tag = tags.find(t => typeof t === "string" && t.startsWith("category:"));
  if (!tag) return "other";
  const id = tag.slice("category:".length);
  return CATEGORIES.find(c => c.id === id) ? id : "other";
}

export default function VaultDocuments() {
  const [filter, setFilter] = useState("all");
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const { listDocuments, downloadFile, deleteDocument } = useDocuments();

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await listDocuments({ limit: 200 });
      if (result?.ok && Array.isArray(result.objects)) {
        setDocs(result.objects);
      } else {
        setDocs([]);
        if (result?.error) setLoadError(result.error);
      }
    } catch (e) {
      setLoadError(e.message || "Failed to load documents");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [listDocuments]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = filter === "all"
    ? docs
    : docs.filter(d => categoryFromTags(d.tags) === filter);

  const counts = docs.reduce((acc, d) => {
    const cat = categoryFromTags(d.tags);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const handleDownload = async (objectId) => {
    await downloadFile(objectId);
  };

  const handleDelete = async (objectId, filename) => {
    if (!window.confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    const result = await deleteDocument(objectId);
    if (result?.ok) refresh();
    else window.alert(`Delete failed: ${result?.error || "unknown error"}`);
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Documents</h1>
          <p className="subtle">{docs.length} document{docs.length === 1 ? "" : "s"} in your vault</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
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

      {/* Category Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px", marginBottom: "20px" }}>
        <div
          onClick={() => setFilter("all")}
          className="card"
          style={{
            padding: "16px", textAlign: "center", cursor: "pointer",
            border: filter === "all" ? "2px solid #7c3aed" : undefined,
            background: filter === "all" ? "#faf5ff" : undefined,
          }}
        >
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#7c3aed" }}>{docs.length}</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>All Categories</div>
        </div>
        {CATEGORIES.map(cat => (
          <div
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className="card"
            style={{
              padding: "16px", textAlign: "center", cursor: "pointer",
              border: filter === cat.id ? `2px solid ${cat.color}` : undefined,
              background: filter === cat.id ? `${cat.color}08` : undefined,
            }}
          >
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px", margin: "0 auto 8px",
              background: `${cat.color}15`, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: 700, color: cat.color,
            }}>
              {cat.icon}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{cat.label}</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{counts[cat.id] || 0}</div>
          </div>
        ))}
      </div>

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

      {!loading && !loadError && filtered.length === 0 && docs.length === 0 && (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>No documents yet</div>
          <div style={{ fontSize: "14px", color: "#64748b", maxWidth: "400px", margin: "0 auto", lineHeight: 1.6, marginBottom: "20px" }}>
            Upload your first document or tell the AI about something you want to track. Photos, PDFs, or just describe it in chat.
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: "Help me add my first document to the vault" } }))}
            style={{ padding: "10px 20px", fontSize: "14px", fontWeight: 600, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer" }}
          >
            Get Started
          </button>
        </div>
      )}

      {!loading && !loadError && filtered.length === 0 && docs.length > 0 && (
        <div className="card" style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
          No documents in this category. <button onClick={() => setFilter("all")} style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", textDecoration: "underline", padding: 0 }}>Show all</button>
        </div>
      )}

      {!loading && !loadError && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
          {filtered.map(doc => {
            const cat = categoryFromTags(doc.tags);
            const catMeta = CATEGORIES.find(c => c.id === cat) || CATEGORIES[CATEGORIES.length - 1];
            const fromGdrive = Array.isArray(doc.tags) && doc.tags.includes("source:google_drive");
            const fromChat = Array.isArray(doc.tags) && doc.tags.includes("source:chat");
            const fromLogbook = Array.isArray(doc.tags) && doc.tags.includes("source:logbook");
            const sourceLabel = fromGdrive ? "Drive" : fromChat ? "Chat" : fromLogbook ? "Logbook" : doc.createdByWorker || null;
            return (
              <div key={doc.objectId} className="card" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
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
