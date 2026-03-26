import React from "react";

export default function CanvasComingSoon({ onContinue }) {
  return (
    <div style={{
      textAlign: "center", padding: "40px 24px",
      background: "#f8fafc", borderRadius: 12,
      border: "1px solid #e2e8f0", maxWidth: 480, margin: "0 auto",
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
        Canvas games are coming.
      </div>
      <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, marginBottom: 6 }}>
        Your game runs in chat today.
      </div>
      <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, marginBottom: 20 }}>
        When canvas launches, your worker upgrades automatically.
      </div>
      {onContinue && (
        <button
          onClick={onContinue}
          style={{
            padding: "10px 24px", background: "#7c3aed", color: "#fff",
            borderRadius: 8, fontSize: 14, fontWeight: 600,
            textDecoration: "none", border: "none", cursor: "pointer",
          }}
        >
          Continue with conversational game &rarr;
        </button>
      )}
    </div>
  );
}
