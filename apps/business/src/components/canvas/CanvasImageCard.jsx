import React, { useState } from "react";

const ASSET_TYPE_OPTIONS = [
  { value: "background", label: "Background" },
  { value: "character", label: "Character" },
  { value: "icon", label: "Icon/Item" },
];

// Inline trash can icon (Lucide-style)
function TrashIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

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

      {/* Image — Character assets get idle float animation by default */}
      <div style={{ position: "relative", background: "#f8fafc", minHeight: 140 }}>
        <img
          src={asset.imageUrl}
          alt={asset.prompt || "Generated image"}
          className={useAs === "character" ? `ta-anim-${asset.animationConfig?.defaultAnimation || "idle"}` : undefined}
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

        {/* Asset type selector — mutually exclusive toggles */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {ASSET_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleUseAs(opt.value)}
              style={{
                flex: "1 1 auto", minWidth: 0, padding: "6px 8px", fontSize: 11, fontWeight: 600,
                borderRadius: 6, cursor: "pointer",
                background: useAs === opt.value ? "var(--accent-light, rgba(107,70,193,0.08))" : "#f8fafc",
                border: `1px solid ${useAs === opt.value ? "var(--accent, #6B46C1)" : "#e2e8f0"}`,
                color: useAs === opt.value ? "var(--accent, #6B46C1)" : "#64748b",
                whiteSpace: "nowrap",
              }}
            >
              {opt.label}
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
              title="Delete asset"
              aria-label="Delete asset"
              style={{
                padding: "6px 8px", fontSize: 11, fontWeight: 600,
                borderRadius: 6, cursor: "pointer",
                background: "#fff", border: "1px solid #fecaca", color: "#dc2626",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <TrashIcon />
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

      {/* Character animation keyframes — applied to character assets via .ta-anim-* class */}
      <style>{`
        @keyframes taAnimIdle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes taAnimAction {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes taAnimHit {
          0%, 100% { transform: translateX(0); filter: none; }
          25% { transform: translateX(-4px); filter: drop-shadow(0 0 6px #ef4444); }
          75% { transform: translateX(4px); filter: drop-shadow(0 0 6px #ef4444); }
        }
        @keyframes taAnimCelebrate {
          0% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.12) rotate(180deg); }
          100% { transform: scale(1) rotate(360deg); }
        }
        .ta-anim-idle { animation: taAnimIdle 3s ease-in-out infinite; }
        .ta-anim-action { animation: taAnimAction 0.6s ease-in-out infinite; }
        .ta-anim-hit { animation: taAnimHit 0.4s ease-in-out 2; }
        .ta-anim-celebrate { animation: taAnimCelebrate 1.2s ease-in-out 1; }
        .ta-anim-none { animation: none; }
      `}</style>
    </div>
  );
}
