import React, { useState, useEffect } from "react";

const CATEGORIES = ["All", "Pitch Deck", "Financials", "Legal", "Team"];

const CATEGORY_COLORS = {
  "Pitch Deck": { bg: "#dbeafe", color: "#2563eb" },
  "Financials": { bg: "#dcfce7", color: "#16a34a" },
  "Legal": { bg: "#fef3c7", color: "#d97706" },
  "Team": { bg: "#f3e8ff", color: "#7c3aed" },
};

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + " KB";
  return bytes + " B";
}

function formatDate(ts) {
  if (!ts) return "";
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DataRoom() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => { loadDataRoom(); }, []);

  async function loadDataRoom() {
    setLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const token = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID");
      const res = await fetch(`${apiBase}/api?path=/v1/dataroom:list`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Vertical": "investor",
          "X-Jurisdiction": "GLOBAL",
          ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
        },
      });
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (e) {
      console.error("Failed to load data room:", e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = activeCategory === "All"
    ? documents
    : documents.filter(d => d.category === activeCategory);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Data Room</h1>
          <p className="subtle">Investor documents for TitleApp</p>
        </div>
      </div>

      {/* Category filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: activeCategory === cat ? "2px solid #7c3aed" : "1px solid #e2e8f0",
              background: activeCategory === cat ? "#f3e8ff" : "white",
              color: activeCategory === cat ? "#7c3aed" : "#64748b",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>
            {documents.length === 0 ? "No documents available yet." : "No documents match this filter."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Document</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Category</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Size</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => {
                const catStyle = CATEGORY_COLORS[doc.category] || {};
                return (
                  <tr key={doc.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 500, color: "#1e293b" }}>{doc.name}</div>
                      {doc.downloadUrl && (
                        <a
                          href={doc.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 12, color: "#7c3aed", textDecoration: "none", fontWeight: 500 }}
                        >
                          Download
                        </a>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "2px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        background: catStyle.bg || "#f1f5f9",
                        color: catStyle.color || "#64748b",
                      }}>
                        {doc.category}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#94a3b8" }}>{formatSize(doc.sizeBytes)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#94a3b8" }}>{formatDate(doc.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
