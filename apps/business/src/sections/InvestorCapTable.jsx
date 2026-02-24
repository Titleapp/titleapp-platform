import React, { useState } from "react";

const SHAREHOLDERS = [
  { id: 1, name: "Founder 1 (CEO)", shares: 4000000, type: "Common", vesting: "4yr / 1yr cliff", vestingPct: 75, notes: "Full-time since inception" },
  { id: 2, name: "Founder 2 (CTO)", shares: 3000000, type: "Common", vesting: "4yr / 1yr cliff", vestingPct: 75, notes: "Full-time since inception" },
  { id: 3, name: "Employee Pool", shares: 1500000, type: "Options", vesting: "4yr / 1yr cliff", vestingPct: 20, notes: "750K allocated, 750K reserved" },
  { id: 4, name: "Angel Group (Seed)", shares: 1000000, type: "SAFE", vesting: "N/A", vestingPct: 100, notes: "$500K at $5M cap, MFN" },
  { id: 5, name: "Advisor 1", shares: 250000, type: "Common", vesting: "2yr / 6mo cliff", vestingPct: 50, notes: "Industry advisor, quarterly calls" },
  { id: 6, name: "Advisor 2", shares: 250000, type: "Common", vesting: "2yr / 6mo cliff", vestingPct: 25, notes: "Go-to-market advisor" },
];

const TOTAL_SHARES = 10000000;
const VALUATION = 5000000;
const CURRENT_ROUND = "Seed";

const TYPE_COLORS = {
  "Common": { bg: "#dbeafe", color: "#2563eb" },
  "SAFE": { bg: "#dcfce7", color: "#16a34a" },
  "Options": { bg: "#fef3c7", color: "#d97706" },
  "Preferred": { bg: "#f3e8ff", color: "#7c3aed" },
};

export default function InvestorCapTable() {
  const [showModel, setShowModel] = useState(false);
  const [modelAmount, setModelAmount] = useState("");
  const [modelValuation, setModelValuation] = useState("");

  const pricePerShare = VALUATION / TOTAL_SHARES;

  // Simple dilution modeling
  let modelResults = null;
  if (showModel && modelAmount && modelValuation) {
    const newShares = (parseFloat(modelAmount) / parseFloat(modelValuation)) * TOTAL_SHARES;
    const newTotal = TOTAL_SHARES + newShares;
    modelResults = {
      newShares: Math.round(newShares),
      newTotal: Math.round(newTotal),
      newPct: ((newShares / newTotal) * 100).toFixed(1),
      existingDilution: (((TOTAL_SHARES / newTotal) - 1) * 100).toFixed(1),
    };
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Cap Table</h1>
          <p className="subtle">Ownership structure and round modeling</p>
        </div>
        <button
          onClick={() => setShowModel(!showModel)}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: showModel ? "2px solid #7c3aed" : "1px solid #e2e8f0",
            background: showModel ? "#f3e8ff" : "white",
            color: showModel ? "#7c3aed" : "#64748b",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showModel ? "Hide Modeling" : "Model New Round"}
        </button>
      </div>

      {/* KPIs */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total Shares</div>
          <div className="kpiValue">{(TOTAL_SHARES / 1000000).toFixed(0)}M</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Shareholders</div>
          <div className="kpiValue">{SHAREHOLDERS.length}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Valuation</div>
          <div className="kpiValue">${(VALUATION / 1000000).toFixed(0)}M</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Current Round</div>
          <div className="kpiValue" style={{ fontSize: "18px" }}>{CURRENT_ROUND}</div>
        </div>
      </div>

      {/* Round modeling */}
      {showModel && (
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 16 }}>Model New Investment</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Investment Amount ($)</label>
              <input
                type="number"
                value={modelAmount}
                onChange={(e) => setModelAmount(e.target.value)}
                placeholder="500000"
                style={{
                  width: "100%", padding: "8px 12px", border: "1px solid #d1d5db",
                  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
                onFocus={e => (e.target.style.borderColor = "#7c3aed")}
                onBlur={e => (e.target.style.borderColor = "#d1d5db")}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Pre-Money Valuation ($)</label>
              <input
                type="number"
                value={modelValuation}
                onChange={(e) => setModelValuation(e.target.value)}
                placeholder="10000000"
                style={{
                  width: "100%", padding: "8px 12px", border: "1px solid #d1d5db",
                  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
                onFocus={e => (e.target.style.borderColor = "#7c3aed")}
                onBlur={e => (e.target.style.borderColor = "#d1d5db")}
              />
            </div>
          </div>
          {modelResults && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div style={{ background: "#f0fdf4", padding: "12px", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>New Investor Ownership</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#166534" }}>{modelResults.newPct}%</div>
              </div>
              <div style={{ background: "#fef2f2", padding: "12px", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>Existing Dilution</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#991b1b" }}>{modelResults.existingDilution}%</div>
              </div>
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>New Total Shares</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{(modelResults.newTotal / 1000000).toFixed(1)}M</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cap table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Shareholder</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Type</th>
              <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Shares</th>
              <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Ownership</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Vesting</th>
              <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {SHAREHOLDERS.map(sh => {
              const pct = ((sh.shares / TOTAL_SHARES) * 100).toFixed(1);
              const value = sh.shares * pricePerShare;
              const typeStyle = TYPE_COLORS[sh.type] || {};
              return (
                <tr key={sh.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 500, color: "#1e293b" }}>{sh.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sh.notes}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      padding: "2px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background: typeStyle.bg || "#f1f5f9",
                      color: typeStyle.color || "#64748b",
                    }}>
                      {sh.type}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500, color: "#1e293b" }}>
                    {sh.shares.toLocaleString()}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <div style={{ fontWeight: 600, color: "#7c3aed" }}>{pct}%</div>
                    <div style={{ width: "60px", height: "4px", borderRadius: 2, background: "#e5e7eb", marginLeft: "auto", marginTop: 4 }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: "#7c3aed" }} />
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#475569", fontSize: 12 }}>
                    <div>{sh.vesting}</div>
                    {sh.vesting !== "N/A" && (
                      <div style={{ width: "60px", height: "4px", borderRadius: 2, background: "#e5e7eb", marginTop: 4 }}>
                        <div style={{ width: `${sh.vestingPct}%`, height: "100%", borderRadius: 2, background: "#16a34a" }} />
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500, color: "#1e293b" }}>
                    ${value >= 1000000 ? (value / 1000000).toFixed(1) + "M" : (value / 1000).toFixed(0) + "K"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
