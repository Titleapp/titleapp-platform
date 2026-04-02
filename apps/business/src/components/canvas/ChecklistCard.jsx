/**
 * ChecklistCard.jsx — Checklist canvas card (44.9)
 * Signal: checklist:hr-onboarding
 * Data source: hardcoded onboarding steps
 */

import React, { useState } from "react";
import CanvasCardShell from "./CanvasCardShell";

const ONBOARDING_STEPS = [
  { id: 1, label: "Send offer letter", description: "Draft and send the formal offer letter" },
  { id: 2, label: "Collect signed documents", description: "W-4, I-9, direct deposit, NDA" },
  { id: 3, label: "Set up payroll", description: "Add to payroll system with correct classification" },
  { id: 4, label: "Provision accounts", description: "Email, Slack, tools access" },
  { id: 5, label: "Schedule orientation", description: "First-day walkthrough and team introductions" },
  { id: 6, label: "Assign onboarding buddy", description: "Pair with a team member for first 30 days" },
  { id: 7, label: "30-day check-in", description: "Schedule manager check-in at day 30" },
];

const S = {
  item: { display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #f8fafc", cursor: "pointer" },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, border: "2px solid #d1d5db",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginTop: 1, transition: "all 0.15s",
  },
  checked: { background: "#7c3aed", borderColor: "#7c3aed" },
  label: { fontSize: 13, fontWeight: 600, color: "#1e293b", lineHeight: 1.4 },
  labelDone: { textDecoration: "line-through", color: "#9ca3af" },
  desc: { fontSize: 11, color: "#9ca3af", lineHeight: 1.4, marginTop: 2 },
  progress: { fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 12 },
  bar: { height: 4, background: "#f1f5f9", borderRadius: 2, marginBottom: 16, overflow: "hidden" },
  barFill: { height: "100%", background: "#7c3aed", borderRadius: 2, transition: "width 0.3s" },
};

export default function ChecklistCard({ resolved, context, onDismiss }) {
  const [checked, setChecked] = useState(new Set());

  function toggle(id) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const pct = Math.round((checked.size / ONBOARDING_STEPS.length) * 100);

  return (
    <CanvasCardShell title="Onboarding Checklist" onDismiss={onDismiss}>
      <div style={S.progress}>{checked.size} of {ONBOARDING_STEPS.length} complete ({pct}%)</div>
      <div style={S.bar}><div style={{ ...S.barFill, width: `${pct}%` }} /></div>
      {ONBOARDING_STEPS.map(step => {
        const done = checked.has(step.id);
        return (
          <div key={step.id} style={S.item} onClick={() => toggle(step.id)}>
            <div style={{ ...S.checkbox, ...(done ? S.checked : {}) }}>
              {done && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div>
              <div style={{ ...S.label, ...(done ? S.labelDone : {}) }}>{step.label}</div>
              <div style={S.desc}>{step.description}</div>
            </div>
          </div>
        );
      })}
    </CanvasCardShell>
  );
}
