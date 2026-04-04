import React, { useState } from "react";

const ASSET_TYPE_OPTIONS = ["background", "character", "icon"];

export default function CanvasImageCard({
  asset,
  onUseAs,
  onIncludeInBuild,
  onSaveToLibrary,
  onDelete,
  includedInBuild = false,
  savedToLibrary = false,
  showLedgerButton = false,
  onLedgerClick,
}) {
  const [expanded, setExpanded] = useState(false);
  const [useAs, setUseAs] = useState(asset.useAs || null);
  const [included, setIncluded] = useState(includedInBuild);
  const [saved, setSaved] = useState(savedToLibrary);

  function handleUseAs(value) {
    setUseAs(value);
    if (onUseAs) onUseAs(asset, value);
  }

  function handleIncludeInBuild() {
    const next = !included;
    setIncluded(next);
    if (next) setSaved(true);
    if (onIncludeInBuild) onIncludeInBuild(asset, next);
  }

  function handleSaveToLibrary() {
    setSaved(true);
    if (onSaveToLibrary) onSaveToLibrary(asset);
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 10,
      border: included ? "3px solid var(--accent, #6B46C1)" : "1px solid #e2e8f0",
      overflow: "hidden", position: "relative",
    }}>
      {/* In Build badge */}
      {included && (
        <div style={{
          position: "absolute", top: 8, right: 8, zIndex: 2,
          background: "var(--accent, #6B46C1)", color: "#fff",
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
        }}>
          In Build
        </div>
      )}

      {/* Asset type badge */}
      {useAs && (
        <div style={{
          position: "absolute", top: 8, left: 8, zIndex: 2,
          background: "rgba(0,0,0,0.5)", color: "#fff",
          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
          textTransform: "capitalize",
        }}>
          {useAs}
        </div>
      )}

      {/* Image */}
      <div style={{ position: "relative", background: "#f8fafc", minHeight: 140 }}>
        <img
          src={asset.imageUrl}
          alt={asset.prompt || "Generated image"}
          style={{
            width: "100%", display: "block",
            objectFit: "contain", maxHeight: 260, borderRadius: included ? "7px 7px 0 0" : "10px 10px 0 0",
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

        {/* Asset type selector */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {ASSET_TYPE_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => handleUseAs(opt)}
              style={{
                flex: 1, padding: "5px 8px", fontSize: 11, fontWeight: 600,
                textTransform: "capitalize", borderRadius: 6, cursor: "pointer",
                background: useAs === opt ? "var(--accent-light, rgba(107,70,193,0.08))" : "#f8fafc",
                border: `1px solid ${useAs === opt ? "var(--accent, #6B46C1)" : "#e2e8f0"}`,
                color: useAs === opt ? "var(--accent, #6B46C1)" : "#64748b",
              }}
            >
              {opt === "background" ? "BG" : opt === "character" ? "Char" : "Icon"}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          {onIncludeInBuild && (
            <button
              onClick={handleIncludeInBuild}
              style={{
                flex: 1, padding: "5px 8px", fontSize: 11, fontWeight: 600,
                borderRadius: 6, cursor: "pointer",
                background: included ? "var(--accent, #6B46C1)" : "#fff",
                border: `1px solid var(--accent, #6B46C1)`,
                color: included ? "#fff" : "var(--accent, #6B46C1)",
              }}
            >
              {included ? "\u2713 In Build" : "Include"}
            </button>
          )}
          {onSaveToLibrary && (
            <button
              onClick={handleSaveToLibrary}
              disabled={saved}
              style={{
                flex: 1, padding: "5px 8px", fontSize: 11, fontWeight: 600,
                borderRadius: 6, cursor: saved ? "default" : "pointer",
                background: saved ? "#f0fdf4" : "#fff",
                border: `1px solid ${saved ? "#86efac" : "#e2e8f0"}`,
                color: saved ? "#16a34a" : "#64748b",
              }}
            >
              {saved ? "\u2713 Saved" : "Save"}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(asset)}
              style={{
                padding: "5px 8px", fontSize: 11, fontWeight: 600,
                borderRadius: 6, cursor: "pointer",
                background: "#fff", border: "1px solid #fecaca", color: "#dc2626",
              }}
            >
              \u2715
            </button>
          )}
          {showLedgerButton && (
            <button
              onClick={() => onLedgerClick && onLedgerClick(asset)}
              style={{
                padding: "5px 8px", fontSize: 11, fontWeight: 600,
                borderRadius: 6, cursor: "pointer",
                background: "#fff", border: "1px solid #e2e8f0", color: "#64748b",
              }}
              title="Save to Ledger"
            >
              &#x1f517;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
