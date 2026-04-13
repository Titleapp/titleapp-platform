// CODEX 47.3-P Fix P2 — CollapsibleSection
// Shared collapsible wrapper for canvas sections in game and worker sandboxes.
// Header is always visible (title + state pill + chevron). Click header toggles.
// 47.9 HOTFIX: removed max-height transition (caused repaint storms on mobile),
// removed setState-during-render pattern, added React.memo.
import React, { useState, useEffect, memo } from "react";

// Traffic-light status indicators. Swiss palette — flat dots, no badges.
// CODEX 48.4 — "idle" is the post-concept silver state: clickable, expandable,
// but no content yet. Replaces "cold/locked" for all downstream sections once
// the concept is saved. Non-linear navigation — creators can peek ahead.
const STATE_COLORS = {
  cold: { dot: "#DC2626", label: "Locked" },      // red  — only before concept
  idle: { dot: "#94A3B8", label: "Pending" },     // silver — after concept, empty
  warm: { dot: "#EAB308", label: "In Progress" }, // yellow
  hot:  { dot: "#16A34A", label: "Complete" },    // green
};

export default memo(function CollapsibleSection({
  title,
  state = "cold",
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggle,
  summary = "",
  children,
}) {
  const isControlled = typeof controlledExpanded === "boolean";
  const [manualOverride, setManualOverride] = useState(null);

  // 47.9 HOTFIX: reset manual override when defaultExpanded changes
  // via useEffect instead of setState-during-render (which caused
  // synchronous re-renders amplifying the parent re-render cascade).
  useEffect(() => {
    setManualOverride(null);
  }, [defaultExpanded]);

  const internalExpanded = manualOverride !== null ? manualOverride : defaultExpanded;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  function toggle() {
    const next = !expanded;
    if (onToggle) onToggle(next);
    if (!isControlled) setManualOverride(next);
  }

  const c = STATE_COLORS[state] || STATE_COLORS.cold;

  return (
    <div
      style={{
        border: "1px solid #E2E8F0",
        borderRadius: 8,
        background: "#FFFFFF",
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={toggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#1a1a2e",
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
          {!expanded && summary && (
            <span style={{ fontSize: 12, fontWeight: 400, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              · {summary}
            </span>
          )}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: "#64748B",
            flexShrink: 0,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 10, height: 10, borderRadius: 5,
              background: c.dot,
              flexShrink: 0,
            }}
          />
          {c.label}
        </span>
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            color: "#94A3B8",
            fontSize: 14,
            transition: "transform 0.2s",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        >
          &rsaquo;
        </span>
      </button>
      {/* 47.9 HOTFIX: replaced max-height:100000px transition with simple
          show/hide. The 100K max-height caused mobile repaint storms with
          9 instances each triggering layout recalc on every frame. */}
      {expanded && (
        <div style={{ padding: "0 14px 14px 14px" }}>
          {children}
        </div>
      )}
    </div>
  );
});
