import React from "react";
import SessionEndCTA from "../worker/SessionEndCTA";

export default function GameEndScreen({ gameResult, workerSlug }) {
  if (!gameResult) return null;

  const passed = gameResult.passed !== false;
  const shareUrl = workerSlug ? `https://titleapp.ai/w/${workerSlug}` : null;

  return (
    <div style={{
      textAlign: "center", padding: "32px 24px",
      background: "#fff", borderRadius: 12,
      border: "1px solid #e2e8f0", maxWidth: 480, margin: "0 auto",
    }}>
      {/* Score */}
      {gameResult.score != null && (
        <div style={{ fontSize: 48, fontWeight: 800, color: passed ? "#10b981" : "#ef4444", marginBottom: 4 }}>
          {gameResult.score}
        </div>
      )}
      <div style={{
        display: "inline-block", padding: "4px 14px", borderRadius: 20,
        fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
        background: passed ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
        color: passed ? "#10b981" : "#ef4444",
        marginBottom: 16,
      }}>
        {passed ? "Passed" : "Try again"}
      </div>

      {/* Summary */}
      {gameResult.summary && (
        <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
          {gameResult.summary}
        </div>
      )}

      {/* Share link */}
      {shareUrl && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => { navigator.clipboard.writeText(shareUrl); }}
            style={{
              padding: "8px 20px", background: "#f1f5f9", color: "#475569",
              borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: "1px solid #e2e8f0", cursor: "pointer",
            }}
          >
            Copy share link
          </button>
        </div>
      )}

      <SessionEndCTA style={{ marginTop: 16 }} />
    </div>
  );
}
