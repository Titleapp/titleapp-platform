import React, { useState } from "react";

const CATEGORIES = [
  { id: "vehicles", label: "Vehicles", icon: "V", color: "#7c3aed" },
  { id: "property", label: "Property", icon: "P", color: "#2563eb" },
  { id: "financial", label: "Financial", icon: "F", color: "#16a34a" },
  { id: "identity", label: "Identity", icon: "I", color: "#d97706" },
  { id: "medical", label: "Medical", icon: "M", color: "#dc2626" },
  { id: "education", label: "Education", icon: "E", color: "#06b6d4" },
  { id: "other", label: "Other", icon: "O", color: "#64748b" },
];

export default function VaultDocuments() {
  const [filter, setFilter] = useState("all");

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Documents</h1>
          <p className="subtle">All documents organized by category</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: "I want to add a new document to my vault" } }))}
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
        >
          Add Document
        </button>
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
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#7c3aed" }}>All</div>
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
          </div>
        ))}
      </div>

      {/* Empty State */}
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
    </div>
  );
}
