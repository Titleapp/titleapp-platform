import React from "react";

const VERTICAL_ICONS = {
  aviation: "\u2708",
  auto: "\uD83D\uDE97",
  "auto_dealer": "\uD83D\uDE97",
  "real-estate": "\uD83C\uDFE0",
  "real_estate_development": "\uD83C\uDFE0",
  investor: "\uD83D\uDCC8",
  investment: "\uD83D\uDCC8",
  solar: "\u2600\uFE0F",
  solar_vpp: "\u2600\uFE0F",
  web3: "\uD83D\uDD37",
  "property-mgmt": "\uD83C\uDFE2",
  consumer: "\uD83C\uDFE0",
  personal: "\uD83C\uDFE0",
};

const S = {
  card: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "18px 20px", cursor: "pointer", transition: "border-color 0.2s, box-shadow 0.2s", minWidth: 200, flex: "1 1 200px", maxWidth: 260, position: "relative" },
  cardActive: { borderColor: "#7c3aed", boxShadow: "0 0 0 1px rgba(124,58,237,0.2)" },
  cardPersonal: { background: "#faf5ff", border: "1px solid #e9d5ff" },
  cardEmpty: { background: "#f8fafc", border: "2px dashed #e5e7eb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 120 },
  icon: { fontSize: 24, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 2 },
  org: { fontSize: 12, color: "#6b7280", marginBottom: 8 },
  meta: { fontSize: 12, color: "#94a3b8" },
  status: { display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: "#dcfce7", color: "#166534" },
  statusInactive: { background: "#f1f5f9", color: "#64748b" },
  menuBtn: { position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16, padding: 4, lineHeight: 1 },
  addIcon: { fontSize: 28, color: "#94a3b8", marginBottom: 8 },
  addLabel: { fontSize: 14, fontWeight: 500, color: "#6b7280" },
};

export function TeamCard({ team, isActive, isPersonal, onClick, onMenu }) {
  const icon = team.icon || VERTICAL_ICONS[team.vertical] || "\uD83D\uDCBC";

  return (
    <div
      style={{ ...S.card, ...(isActive ? S.cardActive : {}), ...(isPersonal ? S.cardPersonal : {}) }}
      onClick={onClick}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = "#c4b5fd"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = isPersonal ? "#e9d5ff" : "#e5e7eb"; }}
    >
      {onMenu && <button style={S.menuBtn} onClick={e => { e.stopPropagation(); onMenu(team); }}>&middot;&middot;&middot;</button>}
      <div style={S.icon}>{icon}</div>
      <div style={S.name}>{team.name}</div>
      {team.orgName && <div style={S.org}>{team.orgName}</div>}
      <div style={S.meta}>
        {isPersonal
          ? `${team.documentCount || 0} documents`
          : `${team.workerCount || 0} worker${(team.workerCount || 0) !== 1 ? "s" : ""}`}
        {team.lastStatus && <span> &middot; {team.lastStatus}</span>}
      </div>
      <div style={{ marginTop: 8 }}>
        <span style={{ ...S.status, ...(isPersonal || team.active !== false ? {} : S.statusInactive) }}>
          {isPersonal ? "Always on" : team.active !== false ? "Active" : "Inactive"}
        </span>
      </div>
    </div>
  );
}

export function AddTeamCard({ onClick }) {
  return (
    <div style={{ ...S.card, ...S.cardEmpty }} onClick={onClick}>
      <div style={S.addIcon}>+</div>
      <div style={S.addLabel}>Add a Team</div>
    </div>
  );
}

export default TeamCard;
