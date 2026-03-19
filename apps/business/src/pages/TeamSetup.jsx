import React, { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const VERTICALS = [
  { key: "aviation", label: "Aviation", icon: "\u2708" },
  { key: "auto_dealer", label: "Auto Dealer", icon: "\uD83D\uDE97" },
  { key: "real_estate_development", label: "Real Estate", icon: "\uD83C\uDFE0" },
  { key: "investment", label: "Investment", icon: "\uD83D\uDCC8" },
  { key: "solar_vpp", label: "Solar", icon: "\u2600\uFE0F" },
  { key: "web3", label: "Web3", icon: "\uD83D\uDD37" },
  { key: "re_operations", label: "Property Management", icon: "\uD83C\uDFE2" },
  { key: "creators", label: "Creator", icon: "\uD83C\uDFA8" },
];

const S = {
  page: { maxWidth: 520, margin: "0 auto", padding: "64px 24px" },
  title: { fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 32, textAlign: "center" },
  grid: { display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 32 },
  chip: { padding: "12px 20px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#ffffff", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#374151", display: "flex", alignItems: "center", gap: 8, transition: "border-color 0.2s" },
  chipActive: { borderColor: "#7c3aed", background: "#f3f0ff", color: "#7c3aed" },
  input: { width: "100%", padding: "12px 16px", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 15, boxSizing: "border-box", marginBottom: 16, outline: "none" },
  btn: { width: "100%", padding: "14px 24px", background: "#7c3aed", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  stepLabel: { fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: 12, textAlign: "center" },
  done: { textAlign: "center", padding: "32px 0" },
  doneIcon: { fontSize: 48, marginBottom: 16 },
  doneName: { fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 },
  doneSub: { fontSize: 14, color: "#6b7280", marginBottom: 24 },
};

export default function TeamSetup({ onComplete }) {
  const [step, setStep] = useState(1);
  const [vertical, setVertical] = useState("");
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);

  function handleVerticalSelect(v) {
    setVertical(v.key);
    setTeamName(v.label);
    setStep(2);
  }

  async function handleCreate() {
    if (!vertical || !teamName.trim()) return;
    setCreating(true);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const res = await fetch(`${API_BASE}/api?path=/v1/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: teamName.trim(), vertical }),
      });
      const data = await res.json();
      if (data.ok && data.workspace) {
        localStorage.setItem("VERTICAL", vertical);
        localStorage.setItem("WORKSPACE_ID", data.workspace.id);
        localStorage.setItem("WORKSPACE_NAME", teamName.trim());
        setStep(3);
        setTimeout(() => {
          if (onComplete) onComplete(data.workspace);
          else window.location.reload();
        }, 1500);
      }
    } catch (err) {
      console.error("Team creation failed:", err);
    }
    setCreating(false);
  }

  return (
    <div style={S.page}>
      {step === 1 && (
        <>
          <div style={S.title}>What industry are you in?</div>
          <div style={S.subtitle}>This determines which Digital Workers are available to your team.</div>
          <div style={S.grid}>
            {VERTICALS.map(v => (
              <div
                key={v.key}
                style={{ ...S.chip, ...(vertical === v.key ? S.chipActive : {}) }}
                onClick={() => handleVerticalSelect(v)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#c4b5fd"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = vertical === v.key ? "#7c3aed" : "#e5e7eb"; }}
              >
                <span>{v.icon}</span> {v.label}
              </div>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div style={S.stepLabel}>Step 2 of 2</div>
          <div style={S.title}>Name your team</div>
          <div style={S.subtitle}>You can always change this later.</div>
          <input
            style={S.input}
            type="text"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            placeholder="e.g. My Aviation Team"
            autoFocus
          />
          <button
            style={{ ...S.btn, ...(creating || !teamName.trim() ? S.btnDisabled : {}) }}
            onClick={handleCreate}
            disabled={creating || !teamName.trim()}
          >
            {creating ? "Creating..." : "Create Team"}
          </button>
        </>
      )}

      {step === 3 && (
        <div style={S.done}>
          <div style={S.doneIcon}>{VERTICALS.find(v => v.key === vertical)?.icon || "\uD83D\uDCBC"}</div>
          <div style={S.doneName}>{teamName} is ready.</div>
          <div style={S.doneSub}>Loading your workspace...</div>
        </div>
      )}
    </div>
  );
}
