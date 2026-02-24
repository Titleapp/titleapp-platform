import React, { useState } from "react";

const DOCUMENTS = [
  { id: 1, name: "Pitch Deck v3.2", category: "Pitch Deck", size: "4.2 MB", uploaded: "Feb 20, 2026", views: 24, lastViewed: "2 hours ago" },
  { id: 2, name: "Financial Projections 2026-2028", category: "Financials", size: "1.8 MB", uploaded: "Feb 18, 2026", views: 18, lastViewed: "5 hours ago" },
  { id: 3, name: "Cap Table (Current)", category: "Financials", size: "340 KB", uploaded: "Feb 15, 2026", views: 12, lastViewed: "1 day ago" },
  { id: 4, name: "SAFE Agreement Template", category: "Legal", size: "520 KB", uploaded: "Feb 12, 2026", views: 8, lastViewed: "3 days ago" },
  { id: 5, name: "Form C Draft", category: "Legal", size: "890 KB", uploaded: "Feb 10, 2026", views: 3, lastViewed: "5 days ago" },
  { id: 6, name: "Team Bios and Org Chart", category: "Team", size: "1.1 MB", uploaded: "Feb 8, 2026", views: 15, lastViewed: "12 hours ago" },
  { id: 7, name: "Product Roadmap Q1-Q3 2026", category: "Pitch Deck", size: "2.4 MB", uploaded: "Feb 5, 2026", views: 10, lastViewed: "2 days ago" },
  { id: 8, name: "Market Analysis Report", category: "Financials", size: "3.6 MB", uploaded: "Feb 3, 2026", views: 7, lastViewed: "4 days ago" },
];

const RECENT_VIEWS = [
  { investor: "Sarah Chen", document: "Pitch Deck v3.2", time: "2 hours ago" },
  { investor: "Mark Johnson", document: "Financial Projections 2026-2028", time: "5 hours ago" },
  { investor: "Sarah Chen", document: "Team Bios and Org Chart", time: "12 hours ago" },
  { investor: "David Park", document: "Cap Table (Current)", time: "1 day ago" },
  { investor: "Lisa Wang", document: "Pitch Deck v3.2", time: "1 day ago" },
  { investor: "Mark Johnson", document: "Pitch Deck v3.2", time: "2 days ago" },
];

const CATEGORIES = ["All", "Pitch Deck", "Financials", "Legal", "Team"];

const CATEGORY_COLORS = {
  "Pitch Deck": { bg: "#dbeafe", color: "#2563eb" },
  "Financials": { bg: "#dcfce7", color: "#16a34a" },
  "Legal": { bg: "#fef3c7", color: "#d97706" },
  "Team": { bg: "#f3e8ff", color: "#7c3aed" },
};

export default function InvestorDataRoom() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [dragOver, setDragOver] = useState(false);

  const filtered = activeCategory === "All"
    ? DOCUMENTS
    : DOCUMENTS.filter(d => d.category === activeCategory);

  const totalViews = DOCUMENTS.reduce((s, d) => s + d.views, 0);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Data Room</h1>
          <p className="subtle">Investor documents and view tracking</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Documents</div>
          <div className="kpiValue">{DOCUMENTS.length}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Total Views</div>
          <div className="kpiValue">{totalViews}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Unique Viewers</div>
          <div className="kpiValue">{new Set(RECENT_VIEWS.map(v => v.investor)).size}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Last Updated</div>
          <div className="kpiValue" style={{ fontSize: "18px" }}>2h ago</div>
        </div>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
        style={{
          border: dragOver ? "2px dashed #7c3aed" : "2px dashed #e2e8f0",
          borderRadius: 12,
          padding: "24px",
          textAlign: "center",
          marginBottom: 24,
          background: dragOver ? "#faf5ff" : "#fafafa",
          transition: "all 0.2s",
          cursor: "pointer",
        }}
      >
        <div style={{ fontSize: 14, color: "#64748b", marginBottom: 4 }}>
          Drag and drop files here, or click to upload
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          PDF, DOCX, XLSX, PPTX up to 50MB
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
        {/* Document list */}
        <div>
          {/* Category filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
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
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Document</th>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Category</th>
                  <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Views</th>
                  <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Size</th>
                  <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => {
                  const catStyle = CATEGORY_COLORS[doc.category] || {};
                  return (
                    <tr key={doc.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 500, color: "#1e293b" }}>{doc.name}</td>
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
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#475569" }}>{doc.views}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#94a3b8" }}>{doc.size}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#94a3b8" }}>{doc.uploaded}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Recent Activity</div>
          <div className="card" style={{ padding: 0 }}>
            {RECENT_VIEWS.map((view, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 16px",
                  borderBottom: i < RECENT_VIEWS.length - 1 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}>{view.investor}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  Viewed {view.document}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{view.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
