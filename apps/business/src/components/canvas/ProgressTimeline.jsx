/**
 * ProgressTimeline.jsx — CODEX 49.5 Phase D
 * Milestone visualization for project progress in canvas.
 */

import React from "react";

const S = {
  container: {
    padding: "16px 0",
  },
  title: {
    fontSize: 12, fontWeight: 700, color: "#64748b",
    letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12,
  },
  timeline: {
    position: "relative",
    paddingLeft: 20,
  },
  line: {
    position: "absolute", left: 7, top: 4, bottom: 4,
    width: 2, background: "#E5E7EB",
  },
  item: {
    position: "relative",
    paddingBottom: 16,
    paddingLeft: 16,
  },
  dot: {
    position: "absolute", left: -20, top: 3,
    width: 14, height: 14, borderRadius: "50%",
    border: "2px solid #6B46C1", background: "#fff",
  },
  dotCompleted: {
    position: "absolute", left: -20, top: 3,
    width: 14, height: 14, borderRadius: "50%",
    border: "2px solid #6B46C1", background: "#6B46C1",
  },
  label: { fontSize: 13, fontWeight: 600, color: "#1e293b" },
  date: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  empty: { fontSize: 13, color: "#94a3b8", fontStyle: "italic" },
};

export default function ProgressTimeline({ milestones = [], title = "Progress" }) {
  if (milestones.length === 0) {
    return (
      <div style={S.container}>
        <div style={S.title}>{title}</div>
        <div style={S.empty}>No milestones yet</div>
      </div>
    );
  }

  return (
    <div style={S.container}>
      <div style={S.title}>{title}</div>
      <div style={S.timeline}>
        <div style={S.line} />
        {milestones.map((m, i) => (
          <div key={i} style={S.item}>
            <div style={m.completedAt ? S.dotCompleted : S.dot} />
            <div style={S.label}>{m.label}</div>
            {m.completedAt && (
              <div style={S.date}>
                {new Date(m.completedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
