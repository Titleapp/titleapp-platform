import React from "react";

export default function SessionEndCTA({ style }) {
  return (
    <div style={{
      textAlign: "center", padding: "20px 16px",
      background: "#f8fafc", borderRadius: 12,
      border: "1px solid #e2e8f0",
      ...style,
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
        Built on TitleApp
      </div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
        Alex built this. You can build one too.
      </div>
      <a
        href="/sandbox"
        style={{
          display: "inline-block", padding: "10px 24px",
          background: "#7c3aed", color: "#fff", borderRadius: 8,
          fontSize: 14, fontWeight: 600, textDecoration: "none",
          border: "none", cursor: "pointer",
        }}
      >
        Start building &rarr;
      </a>
    </div>
  );
}
