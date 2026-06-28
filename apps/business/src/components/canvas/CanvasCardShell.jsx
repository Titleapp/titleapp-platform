/**
 * CanvasCardShell.jsx — Shared wrapper for all canvas protocol cards (44.9)
 *
 * Provides: header with title + dismiss X, loading shimmer, empty prompt, content slot.
 * Every canvas card wraps its content in this shell.
 */

import React, { createContext, useContext, useRef, useState } from "react";

// 50.10-T4 — shells auto-render a SAMPLE chip when wrapped in a CanvasDemoContext
// with value true. CanvasPanel wraps every card with this provider so individual
// card files don't need to thread the flag.
export const CanvasDemoContext = createContext(false);

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
  // 50.10-T4 — header SAMPLE chip mirrors the existing "DEMO MODE — Sample data shown..."
  // pill on the worker landing page so the canvas tells the same story.
  titleRow: { display: "flex", alignItems: "center", gap: 10 },
  demoChip: {
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
    color: "#15803d", background: "#dcfce7", padding: "3px 8px", borderRadius: 999,
  },
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

export default function CanvasCardShell({ title, emptyPrompt, loading, onDismiss, isDemo, children }) {
  const ctxDemo = useContext(CanvasDemoContext);
  const showDemo = isDemo || ctxDemo;
  const hasContent = React.Children.count(children) > 0;
  const bodyRef = useRef(null);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = bodyRef.current?.innerText || '';
    if (!text) return;
    const full = title ? `${title}\n\n${text}` : text;
    navigator.clipboard.writeText(full).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = full;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const text = bodyRef.current?.innerText || '';
    if (!text) return;
    const full = title ? `${title}\n\n${text}` : text;
    const slug = (title || 'canvas').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const blob = new Blob([full], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={S.shell}>
      <div style={S.header}>
        <div style={S.titleRow}>
          <div style={S.title}>{title}</div>
          {showDemo && <span style={S.demoChip}>Sample</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button style={S.dismissBtn} onClick={handleCopy} title={copied ? 'Copied!' : 'Copy content'}>
            {copied ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            )}
          </button>
          <button style={S.dismissBtn} onClick={handleDownload} title="Download as text">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          {onDismiss && (
          <button style={S.dismissBtn} onClick={onDismiss} title="Dismiss">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          )}
        </div>
      </div>
      <div style={S.body} ref={bodyRef}>
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
