/**
 * CanvasCardShell.jsx — Shared wrapper for all canvas protocol cards (44.9)
 *
 * Provides: header with title + dismiss X, loading shimmer, empty prompt, content slot.
 * Every canvas card wraps its content in this shell.
 */

import React from "react";

const S = {
  shell: {
    height: "100%", display: "flex", flexDirection: "column",
    background: "var(--card)", color: "var(--text-primary)", overflow: "hidden",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "var(--canvas-card-padding) 20px", borderBottom: "1px solid var(--canvas-border)", flexShrink: 0,
  },
  title: { fontSize: 15, fontWeight: "var(--text-heading-weight)", color: "var(--text-primary)" },
  dismissBtn: {
    background: "none", border: "none", cursor: "pointer", padding: 4,
    color: "var(--text-muted)", display: "flex", alignItems: "center",
  },
  body: { flex: 1, padding: "var(--canvas-card-padding)", overflowY: "auto" },
  empty: {
    display: "flex", alignItems: "center", justifyContent: "center",
    height: "100%", fontSize: 14, color: "var(--text-muted)", textAlign: "center",
    padding: "0 24px", lineHeight: 1.6,
  },
  shimmerRow: {
    height: 14, background: "linear-gradient(90deg, var(--canvas-bg) 25%, var(--canvas-border) 50%, var(--canvas-bg) 75%)",
    backgroundSize: "200% 100%", animation: "canvasShimmer 1.5s ease-in-out infinite",
    borderRadius: 6, marginBottom: 10,
  },
};

const shimmerKeyframes = `@keyframes canvasShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;

function ShimmerBlock({ rows = 4 }) {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ ...S.shimmerRow, width: i === rows - 1 ? "60%" : `${85 + Math.random() * 15}%` }} />
      ))}
    </>
  );
}

export default function CanvasCardShell({ title, emptyPrompt, loading, onDismiss, children }) {
  const hasContent = React.Children.count(children) > 0;

  return (
    <div style={S.shell}>
      <div style={S.header}>
        <div style={S.title}>{title}</div>
        {onDismiss && (
          <button style={S.dismissBtn} onClick={onDismiss} title="Dismiss">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <div style={S.body}>
        {loading ? (
          <ShimmerBlock rows={5} />
        ) : hasContent ? (
          children
        ) : emptyPrompt ? (
          <div style={S.empty}>{emptyPrompt}</div>
        ) : (
          <ShimmerBlock rows={3} />
        )}
      </div>
    </div>
  );
}

export { ShimmerBlock };
