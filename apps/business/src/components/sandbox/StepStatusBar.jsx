// CODEX 47.3-P Fix P1 — StepStatusBar
// Shared horizontal step status bar for game and worker sandboxes.
// Three states per step using traffic-light semantics: red (locked), yellow
// (in progress, tappable), green (complete, tappable). Active step has a
// stronger border. Swiss palette — flat colors, no decorative iconography.
import React, { useState } from "react";

const COLORS = {
  cold: { dot: "#DC2626", bg: "#FFFFFF", fg: "#64748B", border: "#E2E8F0", line: "#E2E8F0" }, // red
  warm: { dot: "#EAB308", bg: "#FFFFFF", fg: "#1a1a2e", border: "#E2E8F0", line: "#CBD5E1" }, // yellow
  hot:  { dot: "#16A34A", bg: "#FFFFFF", fg: "#1a1a2e", border: "#E2E8F0", line: "#16A34A" }, // green
};

export default function StepStatusBar({ steps = [], activeStep, onStepClick, accent = "#16A34A" }) {
  const [hoverIdx, setHoverIdx] = useState(-1);

  if (!steps.length) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "12px 8px",
        background: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
        overflowX: "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {steps.map((step, i) => {
        const state = step.state || "cold";
        const c = COLORS[state] || COLORS.cold;
        const isActive = step.id === activeStep;
        const isTappable = state === "warm" || state === "hot";
        const showLockTooltip = state === "cold" && hoverIdx === i;
        const prevLabel = i > 0 ? steps[i - 1].label : "the previous step";
        const lockTooltip = `Complete ${prevLabel} first.`;
        const nextState = steps[i + 1]?.state || "cold";
        const lineColor = state === "hot" && nextState === "hot" ? COLORS.hot.line : COLORS.cold.line;

        return (
          <React.Fragment key={step.id}>
            <div
              title={state === "cold" ? lockTooltip : ""}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(-1)}
              onClick={() => { if (isTappable && onStepClick) onStepClick(step.id); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 999,
                background: c.bg,
                color: c.fg,
                border: `2px solid ${isActive ? accent : c.border}`,
                fontSize: 12,
                fontWeight: 600,
                cursor: isTappable ? "pointer" : "default",
                whiteSpace: "nowrap",
                flexShrink: 0,
                position: "relative",
                transition: "background 0.15s, border-color 0.15s",
                opacity: state === "cold" ? 0.7 : 1,
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
              <span>{step.label}</span>
              {showLockTooltip && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    marginTop: 6,
                    padding: "4px 8px",
                    background: "#1a1a2e",
                    color: "white",
                    fontSize: 11,
                    borderRadius: 4,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                >
                  {lockTooltip}
                </div>
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                aria-hidden="true"
                style={{
                  width: 12,
                  height: 2,
                  background: lineColor,
                  flexShrink: 0,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
