/**
 * CanvasTabBar.jsx — Horizontal tab strip rendered above CanvasPanel
 * (CODEX 50.10-T3).
 *
 * Tabs come from the active worker's canvasTabs[] field. Click resolves
 * the tab's signal through the existing CANVAS_TYPES registry and pushes
 * the resolved card into RightPanelContext via showCanvas().
 *
 * If a chat turn emits its own signal, the parent finds the matching tab
 * (by signal) and passes it as activeSignal so the bar auto-selects it.
 */
import React, { useEffect, useState } from "react";
import { lookupSignal } from "../../config/canvasTypes";

export default function CanvasTabBar({ tabs, activeSignal, onSelectTab }) {
  const sorted = (tabs || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const defaultTab = sorted.find(t => t.default) || sorted[0];
  const [activeId, setActiveId] = useState(defaultTab?.id || null);

  // Sync to chat-emitted signal: if a tab matches, select it.
  useEffect(() => {
    if (!activeSignal) return;
    const match = sorted.find(t => t.signal === activeSignal);
    if (match && match.id !== activeId) setActiveId(match.id);
  }, [activeSignal, sorted, activeId]);

  if (!sorted.length) return null;

  function handleClick(tab) {
    setActiveId(tab.id);
    const resolved = lookupSignal(tab.signal);
    if (!resolved) return;
    if (typeof onSelectTab === "function") onSelectTab(tab, resolved);
  }

  return (
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid #e5e7eb",
        background: "#fff",
        overflowX: "auto",
        flexShrink: 0,
      }}
    >
      {sorted.map(t => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id}
            onClick={() => handleClick(t)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              color: active ? "#111" : "#6b7280",
              borderBottom: active ? "2px solid #7c3aed" : "2px solid transparent",
              whiteSpace: "nowrap",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "#111"; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "#6b7280"; }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
