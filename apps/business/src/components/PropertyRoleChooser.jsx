import React from "react";
import { PROPERTY_ROLE_LABELS } from "../utils/propertyRole";

// 2026-09-17 — the property-role cards for PropertyRolePrompt/Sidebar's
// RoleSwitcher, mirroring CrewRoleChooser's pattern for aviation. "Who are
// you," not "pick a tool" — see propertyRole.js for why Title & Escrow is
// in this set (real backend) and Finance & Acquisition isn't (not yet).
const ROLE_ICONS = { operations: "OP", leasing: "L", compliance: "C", title: "T" };

export default function PropertyRoleChooser({ selected, onSelect }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {Object.entries(PROPERTY_ROLE_LABELS).map(([role, label]) => {
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
