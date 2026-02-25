import React, { useState, useEffect } from "react";
import { getCapTables, getCapTable, updateCapTable } from "../api/client";

const TYPE_COLORS = {
  "Common": { bg: "#dbeafe", color: "#2563eb" },
  "SAFE": { bg: "#dcfce7", color: "#16a34a" },
  "Options": { bg: "#fef3c7", color: "#d97706" },
  "Preferred": { bg: "#f3e8ff", color: "#7c3aed" },
};

function formatValue(v) {
  if (!v || v === 0) return "$0";
  if (v >= 1000000) return "$" + (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return "$" + (v / 1000).toFixed(0) + "K";
  return "$" + v.toLocaleString();
}

export default function InvestorCapTable() {
  const [capTableId, setCapTableId] = useState(null);
  const [shareholders, setShareholders] = useState([]);
  const [totalShares, setTotalShares] = useState(0);
  const [valuation, setValuation] = useState(0);
  const [currentRound, setCurrentRound] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [modelAmount, setModelAmount] = useState("");
  const [modelValuation, setModelValuation] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSh, setNewSh] = useState({ name: "", shares: "", type: "Common", vesting: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const vertical = "investor";
  const jurisdiction = "GLOBAL";

  useEffect(() => { loadCapTable(); }, []);

  async function loadCapTable() {
    setLoading(true);
    try {
      const result = await getCapTables({ vertical, jurisdiction });
      const tables = result.capTables || [];
      if (tables.length > 0) {
        const first = tables[0];
        setCapTableId(first.id);
        const detail = await getCapTable({ vertical, jurisdiction, id: first.id });
        const ct = detail.capTable || {};
        setShareholders(ct.shareholders || []);
        setTotalShares(ct.totalShares || 0);
        setValuation(ct.valuation || 0);
        setCurrentRound(ct.currentRound || "");
      }
    } catch (e) {
      console.error("Failed to load cap table:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddShareholder(e) {
    e.preventDefault();
    if (!capTableId) return;
    setSaving(true);
    try {
      const updated = [...shareholders, {
        name: newSh.name,
        shares: parseInt(newSh.shares) || 0,
        type: newSh.type,
        vesting: newSh.vesting || "N/A",
        vestingPct: 0,
        notes: newSh.notes,
      }];
      const newTotal = updated.reduce((s, sh) => s + (sh.shares || 0), 0);
      await updateCapTable({
        vertical, jurisdiction, id: capTableId,
        capTable: { shareholders: updated, totalShares: newTotal },
      });
      setShowAddForm(false);
      setNewSh({ name: "", shares: "", type: "Common", vesting: "", notes: "" });
      await loadCapTable();
    } catch (e) {
      console.error("Failed to add shareholder:", e);
    } finally {
      setSaving(false);
    }
  }

  const pricePerShare = totalShares > 0 ? valuation / totalShares : 0;

  // Simple dilution modeling
  let modelResults = null;
  if (showModel && modelAmount && modelValuation) {
    const newShares = (parseFloat(modelAmount) / parseFloat(modelValuation)) * totalShares;
    const newTotal = totalShares + newShares;
    modelResults = {
      newShares: Math.round(newShares),
      newTotal: Math.round(newTotal),
      newPct: ((newShares / newTotal) * 100).toFixed(1),
      existingDilution: (((totalShares / newTotal) - 1) * 100).toFixed(1),
    };
  }

  if (loading) {
    return (
      <div>
        <div className="pageHeader">
          <div>
            <h1 className="h1">Cap Table</h1>
            <p className="subtle">Ownership structure and round modeling</p>
          </div>
        </div>
        <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Cap Table</h1>
          <p className="subtle">Ownership structure and round modeling</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            + Add Shareholder
          </button>
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
      </div>

      {/* KPIs */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total Shares</div>
          <div className="kpiValue">{totalShares >= 1000000 ? (totalShares / 1000000).toFixed(0) + "M" : totalShares.toLocaleString()}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Shareholders</div>
          <div className="kpiValue">{shareholders.length}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Valuation</div>
          <div className="kpiValue">{formatValue(valuation)}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Current Round</div>
          <div className="kpiValue" style={{ fontSize: "18px" }}>{currentRound || "—"}</div>
        </div>
      </div>

      {/* Add Shareholder Form */}
      {showAddForm && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: "#1e293b" }}>New Shareholder</div>
          <form onSubmit={handleAddShareholder} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <input placeholder="Name" required value={newSh.name} onChange={e => setNewSh(p => ({ ...p, name: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
            <input placeholder="Shares" required type="number" value={newSh.shares} onChange={e => setNewSh(p => ({ ...p, shares: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
            <select value={newSh.type} onChange={e => setNewSh(p => ({ ...p, type: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}>
              <option value="Common">Common</option>
              <option value="Preferred">Preferred</option>
              <option value="SAFE">SAFE</option>
              <option value="Options">Options</option>
            </select>
            <input placeholder="Vesting (e.g. 4yr / 1yr cliff)" value={newSh.vesting} onChange={e => setNewSh(p => ({ ...p, vesting: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
            <input placeholder="Notes" value={newSh.notes} onChange={e => setNewSh(p => ({ ...p, notes: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, gridColumn: "span 2" }} />
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#7c3aed", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                {saving ? "Saving..." : "Add Shareholder"}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
        {shareholders.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>
            No cap table data yet. Add shareholders or load sample data from onboarding.
          </div>
        ) : (
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
              {shareholders.map((sh, idx) => {
                const pct = totalShares > 0 ? ((sh.shares / totalShares) * 100).toFixed(1) : "0.0";
                const value = sh.shares * pricePerShare;
                const typeStyle = TYPE_COLORS[sh.type] || {};
                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 500, color: "#1e293b" }}>{sh.name}</div>
                      {sh.notes && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sh.notes}</div>}
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
                      {(sh.shares || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ fontWeight: 600, color: "#7c3aed" }}>{pct}%</div>
                      <div style={{ width: "60px", height: "4px", borderRadius: 2, background: "#e5e7eb", marginLeft: "auto", marginTop: 4 }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: "#7c3aed" }} />
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#475569", fontSize: 12 }}>
                      <div>{sh.vesting || "N/A"}</div>
                      {sh.vesting && sh.vesting !== "N/A" && (
                        <div style={{ width: "60px", height: "4px", borderRadius: 2, background: "#e5e7eb", marginTop: 4 }}>
                          <div style={{ width: `${sh.vestingPct || 0}%`, height: "100%", borderRadius: 2, background: "#16a34a" }} />
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500, color: "#1e293b" }}>
                      {formatValue(value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
