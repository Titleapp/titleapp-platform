import React, { useState, useCallback, useRef } from "react";
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
  onIncludeInBuild,
  onSaveToLibrary,
  onDelete,
  currentWorkerId,
  includedAssetIds = [],
}) {
  // Show all assets up to MAX_DISPLAY in oldest-first order so the newest appears at the bottom.
  // 50 max before paginating (per CODEX 46.10 Fix 5).
  const MAX_DISPLAY = 50;
  const displayAssets = assets.slice(-MAX_DISPLAY);
  const hasOverflow = assets.length > MAX_DISPLAY;
  const autoStyle = selectedStyle || getDefaultStyle(workerCardData);

  // Auto-scroll to newest image when assets length grows
  const gridRef = React.useRef(null);
  const prevLenRef = React.useRef(assets.length);
  React.useEffect(() => {
    if (assets.length > prevLenRef.current && gridRef.current) {
      // Scroll to bottom of the canvas to reveal newest image
      gridRef.current.scrollTop = gridRef.current.scrollHeight;
    }
    prevLenRef.current = assets.length;
  }, [assets.length]);

  // Undo toast state
  const [undoToast, setUndoToast] = useState(null);
  const undoTimerRef = useRef(null);

  const handleDelete = useCallback((asset) => {
    // Optimistic delete — call parent
    if (onDelete) onDelete(asset);
    // Show undo toast
    setUndoToast(asset);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 5000);
  }, [onDelete]);

  const handleUndo = useCallback(() => {
    if (!undoToast) return;
    // Re-add asset — parent should handle re-insertion
    if (onSaveToLibrary) onSaveToLibrary(undoToast);
    setUndoToast(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, [undoToast, onSaveToLibrary]);
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
                background: autoStyle === chip.id ? "var(--accent-light, rgba(107,70,193,0.08))" : "#f8fafc",
                border: `1px solid ${autoStyle === chip.id ? "var(--accent, #6B46C1)" : "#e2e8f0"}`,
                color: autoStyle === chip.id ? "var(--accent, #6B46C1)" : "#64748b",
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Image grid — scrollable canvas, all images persist */}
      {hasOverflow && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
          Showing the most recent {MAX_DISPLAY} of {assets.length} images.
        </div>
      )}
      <div ref={gridRef} style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 12,
        marginBottom: 16,
        maxHeight: "70vh",
        overflowY: "auto",
        padding: 4,
      }}>
        {displayAssets.map((asset, i) => (
          <CanvasImageCard
            key={asset.id || i}
            asset={asset}
            onUseAs={onUseAs}
            onIncludeInBuild={onIncludeInBuild}
            onSaveToLibrary={onSaveToLibrary}
            onDelete={handleDelete}
            includedInBuild={includedAssetIds.includes(asset.assetId || asset.id)}
            savedToLibrary={asset.savedToLibrary || false}
            showLedgerButton={!!asset.assetId}
          />
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

      {/* Undo delete toast */}
      {undoToast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1a1a2e", color: "#fff", padding: "10px 20px", borderRadius: 10,
          display: "flex", alignItems: "center", gap: 12, zIndex: 1000,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)", fontSize: 13,
        }}>
          <span>Image deleted.</span>
          <button
            onClick={handleUndo}
            style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff", padding: "4px 12px", borderRadius: 6,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            Undo
          </button>
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
