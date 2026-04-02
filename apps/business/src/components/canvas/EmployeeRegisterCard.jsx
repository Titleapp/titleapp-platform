/**
 * EmployeeRegisterCard.jsx — Employee register canvas card (44.9)
 * Signal: card:hr-employee-register
 * Data source: conversation context
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";

const S = {
  row: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
    borderBottom: "1px solid #f1f5f9",
  },
  avatar: {
    width: 32, height: 32, borderRadius: "50%", background: "#f3e8ff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, color: "#7c3aed", flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: 600, color: "#1e293b" },
  role: { fontSize: 11, color: "#64748b" },
  status: { fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, flexShrink: 0 },
  active: { background: "#dcfce7", color: "#166534" },
  onboarding: { background: "#fefce8", color: "#a16207" },
  inactive: { background: "#f1f5f9", color: "#64748b" },
};

function getInitials(name) {
  return (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function statusStyle(status) {
  if (status === "active") return S.active;
  if (status === "onboarding") return S.onboarding;
  return S.inactive;
}

export default function EmployeeRegisterCard({ resolved, context, onDismiss }) {
  const employees = context?.employees || null;

  return (
    <CanvasCardShell
      title="Employee Register"
      emptyPrompt={resolved?.emptyPrompt || "Ask Alex about your employees to see them here."}
      onDismiss={onDismiss}
    >
      {employees && employees.length > 0 && employees.map((emp, i) => (
        <div key={i} style={S.row}>
          <div style={S.avatar}>{getInitials(emp.name)}</div>
          <div style={S.info}>
            <div style={S.name}>{emp.name}</div>
            <div style={S.role}>{emp.role || emp.title || ""}</div>
          </div>
          <span style={{ ...S.status, ...statusStyle(emp.status || "active") }}>{emp.status || "active"}</span>
        </div>
      ))}
    </CanvasCardShell>
  );
}
