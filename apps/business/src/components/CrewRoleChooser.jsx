import React from "react";
import { CREW_ROLE_LABELS } from "../utils/crewRole";

// S52.71 Step 1 — the 3 crew-role cards shared by CrewRolePrompt (first-run,
// full-screen) and Sidebar's RoleSwitcher (persistent, popover). Styled after
// OnboardingWizard.jsx's "Step 0: Choose Your Path" grid so it reads as one
// family of choice UI, but kept visually distinct from the generic worker
// list per S52.71 — this is "who are you," not "pick a tool."
const ROLE_ICONS = { pilot: "P", mx: "MX", dispatch: "D" };

export default function CrewRoleChooser({ selected, onSelect }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
      {Object.entries(CREW_ROLE_LABELS).map(([role, label]) => {
        const isSelected = selected === role;
        return (
          <button
            key={role}
            onClick={() => onSelect(role)}
            style={{
              padding: "14px 10px", borderRadius: 10, textAlign: "center", cursor: "pointer",
              border: isSelected ? "2px solid #7c3aed" : "1px solid #e5e7eb",
              background: isSelected ? "rgba(124,58,237,0.06)" : "white",
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10, margin: "0 auto 8px",
              background: isSelected ? "#7c3aed" : "#f1f5f9",
              color: isSelected ? "white" : "#64748b",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 13,
            }}>{ROLE_ICONS[role]}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</div>
          </button>
        );
      })}
    </div>
  );
}
