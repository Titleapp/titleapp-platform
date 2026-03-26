import React, { useState } from "react";

const USE_AS_OPTIONS = ["background", "character", "icon"];

export default function CanvasImageCard({ asset, onUseAs }) {
  const [expanded, setExpanded] = useState(false);
  const [useAs, setUseAs] = useState(asset.useAs || null);

  function handleUseAs(value) {
    setUseAs(value);
    if (onUseAs) onUseAs(asset, value);
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0",
      overflow: "hidden",
    }}>
      {/* Image */}
      <div style={{ position: "relative", background: "#f8fafc", minHeight: 140 }}>
        <img
          src={asset.imageUrl}
          alt={asset.prompt || "Generated image"}
          style={{
            width: "100%", display: "block",
            objectFit: "contain", maxHeight: 260, borderRadius: "10px 10px 0 0",
          }}
          onError={e => { e.target.style.display = "none"; }}
        />
      </div>

      {/* Details */}
      <div style={{ padding: "10px 12px" }}>
        {/* Prompt */}
        {asset.prompt && (
          <div
            onClick={() => setExpanded(!expanded)}
            style={{
              fontSize: 12, color: "#64748b", lineHeight: 1.5, cursor: "pointer",
              overflow: expanded ? "visible" : "hidden",
              textOverflow: expanded ? "unset" : "ellipsis",
              whiteSpace: expanded ? "normal" : "nowrap",
              marginBottom: 8,
            }}
          >
            {asset.prompt}
          </div>
        )}

        {/* Use as selector */}
        <div style={{ display: "flex", gap: 6 }}>
          {USE_AS_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => handleUseAs(opt)}
              style={{
                flex: 1, padding: "5px 8px", fontSize: 11, fontWeight: 600,
                textTransform: "capitalize", borderRadius: 6, cursor: "pointer",
                background: useAs === opt ? "rgba(107,70,193,0.08)" : "#f8fafc",
                border: `1px solid ${useAs === opt ? "#6B46C1" : "#e2e8f0"}`,
                color: useAs === opt ? "#6B46C1" : "#64748b",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
