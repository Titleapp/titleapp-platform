import React from "react";

// SandboxJourneyRail — makes the build STORY visible (the thing creators couldn't
// see). Two lanes: what YOU do (Talk → Design → Rules → ✨ Live), and the CODE
// Claude writes in the background underneath each phase — then the worker pops
// in a new tab, and you move into code to refine it. Maps the real 9 steps onto
// 4 plain-language phases + a "refine in code" tail.

const PURPLE = "#7c3aed";

const PHASES = [
  { key: "talk",   label: "Talk",   icon: "💬", code: "intent.md",    stepIds: ["define"] },
  { key: "design", label: "Design", icon: "🎨", code: "canvas spec",  stepIds: ["design"] },
  { key: "rules",  label: "Rules",  icon: "📋", code: "rules engine", stepIds: ["knowledge", "rules", "tools"] },
  { key: "live",   label: "Live",   icon: "✨", code: "your worker",  stepIds: ["test", "preflight", "distribute"] },
];

function phaseIndexFor(stepId) {
  if (stepId === "grow") return PHASES.length; // past Live → refine stage
  const i = PHASES.findIndex((p) => p.stepIds.includes(stepId));
  return i < 0 ? 0 : i;
}

export default function SandboxJourneyRail({ activeStepId, publishedUrl }) {
  const active = phaseIndexFor(activeStepId);
  const live = publishedUrl || null;

  return (
    <div style={{ background: "#0f172a", color: "#fff", padding: "10px 18px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: "#94a3b8", marginRight: 12, marginTop: 6, minWidth: 34 }}>YOU</span>

        {PHASES.map((p, i) => {
          const done = i < active;
          const on = i === active;
          return (
            <React.Fragment key={p.key}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 84 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 999,
                  background: on ? PURPLE : done ? "rgba(124,58,237,0.16)" : "transparent",
                  border: on ? `1px solid ${PURPLE}` : "1px solid rgba(255,255,255,0.12)",
                  color: on ? "#fff" : done ? "#c4b5fd" : "#94a3b8", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap",
                }}>
                  <span>{p.icon}</span>{p.label}{done ? <span style={{ fontSize: 11 }}>✓</span> : null}
                </div>
                <div style={{ fontSize: 10, color: i <= active ? "#8b98ad" : "#475569", marginTop: 7, fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap" }}>
                  {i <= active ? "↳ " : "· "}{p.code}
                </div>
              </div>
              {i < PHASES.length - 1 && (
                <span style={{ color: i < active ? PURPLE : "rgba(255,255,255,0.22)", margin: "0 4px", fontSize: 14, marginTop: 6 }}>→</span>
              )}
            </React.Fragment>
          );
        })}

        {/* the magic moment + the handoff to code */}
        <span style={{ color: active >= PHASES.length ? PURPLE : "rgba(255,255,255,0.22)", margin: "0 8px", fontSize: 14, marginTop: 6 }}>→</span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: 2 }}>
          <a
            href={live || undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12.5, fontWeight: 700, textDecoration: "none",
              color: live ? "#4ade80" : "#64748b",
              cursor: live ? "pointer" : "default", pointerEvents: live ? "auto" : "none",
            }}
          >
            ✨ opens in a NEW TAB ↗
          </a>
          <span style={{ fontSize: 10, color: "#64748b", marginTop: 5, fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap" }}>
            then ⌨️ open in code to refine
          </span>
        </div>
      </div>

      <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 9, marginLeft: 46 }}>
        Claude is writing your worker's code in the background as you go — when it's ready, it comes alive.
      </div>
    </div>
  );
}
