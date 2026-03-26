import React from "react";
import CanvasImageCard from "./CanvasImageCard";

const STYLE_CHIPS = [
  { id: "cartoon", label: "Cartoon", desc: "Default for games" },
  { id: "diagram", label: "Diagram", desc: "Default for nursing / education workers" },
  { id: "minimal", label: "Minimal", desc: "Default for icons / badges" },
  { id: "realistic", label: "Realistic", desc: "Professional workers" },
];

/**
 * Auto-select style based on worker vertical / game config.
 */
function getDefaultStyle(workerCardData) {
  if (workerCardData?.gameConfig?.isGame) return "cartoon";
  const v = (workerCardData?.vertical || "").toLowerCase();
  if (v.includes("nurs") || v.includes("health") || v.includes("edu")) return "diagram";
  return "realistic";
}

export default function CanvasImagePanel({
  assets = [],
  onRetry,
  onStyleSelect,
  selectedStyle,
  isGenerating,
  workerCardData,
  onUseAs,
}) {
  const displayAssets = assets.slice(-6);
  const autoStyle = selectedStyle || getDefaultStyle(workerCardData);
  const showStyleSelector = displayAssets.length > 0;

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>Canvas</div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        Generated images for your {workerCardData?.gameConfig?.isGame ? "game" : "worker"}.
      </div>

      {/* Style selector — shown after first image */}
      {showStyleSelector && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {STYLE_CHIPS.map(chip => (
            <button
              key={chip.id}
              onClick={() => onStyleSelect && onStyleSelect(chip.id)}
              title={chip.desc}
              style={{
                flex: 1, padding: "8px 6px", textAlign: "center", cursor: "pointer",
                borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: autoStyle === chip.id ? "rgba(107,70,193,0.08)" : "#f8fafc",
                border: `1px solid ${autoStyle === chip.id ? "#6B46C1" : "#e2e8f0"}`,
                color: autoStyle === chip.id ? "#6B46C1" : "#64748b",
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Image grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 12,
        marginBottom: 16,
      }}>
        {displayAssets.map((asset, i) => (
          <CanvasImageCard key={asset.id || i} asset={asset} onUseAs={onUseAs} />
        ))}

        {/* Generating placeholder */}
        {isGenerating && (
          <div style={{
            background: "#f8fafc", borderRadius: 10, border: "1px dashed #d4d4d8",
            minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center",
            animation: "canvasPulse 2s ease-in-out infinite",
          }}>
            <div style={{ textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
                Alex is generating your {workerCardData?.gameConfig?.isGame ? "game asset" : "image"}...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error / retry */}
      {!isGenerating && displayAssets.length > 0 && displayAssets[displayAssets.length - 1]?.error && (
        <div style={{
          padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 13, color: "#991b1b" }}>Generation timed out — try again</span>
          <button
            onClick={onRetry}
            style={{
              padding: "6px 14px", fontSize: 12, fontWeight: 600,
              background: "#fff", border: "1px solid #fecaca", borderRadius: 6,
              color: "#991b1b", cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isGenerating && displayAssets.length === 0 && (
        <div style={{
          padding: "40px 20px", textAlign: "center",
          background: "#f8fafc", borderRadius: 10, border: "1px dashed #d4d4d8",
        }}>
          <div style={{ fontSize: 14, color: "#94a3b8" }}>
            Ask Alex to generate images — they'll appear here.
          </div>
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes canvasPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
