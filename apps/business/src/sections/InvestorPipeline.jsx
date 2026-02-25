import React, { useState, useEffect } from "react";
import { getInvestors, createInvestor, updateInvestor, deleteInvestor } from "../api/client";

const STATUS_CONFIG = {
  "Contacted": { bg: "#f1f5f9", color: "#475569", order: 0 },
  "Interested": { bg: "#dbeafe", color: "#2563eb", order: 1 },
  "Verified": { bg: "#fef3c7", color: "#d97706", order: 2 },
  "Committed": { bg: "#dcfce7", color: "#16a34a", order: 3 },
  "Invested": { bg: "#f3e8ff", color: "#7c3aed", order: 4 },
};

const TYPE_STYLES = {
  "Angel": { bg: "#dbeafe", color: "#2563eb" },
  "VC": { bg: "#f3e8ff", color: "#7c3aed" },
  "Fund": { bg: "#dcfce7", color: "#16a34a" },
};

const STATUSES = ["Contacted", "Interested", "Verified", "Committed", "Invested"];

function formatAmount(n) {
  if (!n || n === 0) return "$0";
  if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return "$" + (n / 1000).toFixed(0) + "K";
  return "$" + n.toLocaleString();
}

function formatDate(ts) {
  if (!ts) return "";
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function InvestorPipeline() {
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", type: "Angel", targetAmount: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const vertical = "investor";
  const jurisdiction = "GLOBAL";

  useEffect(() => { loadInvestors(); }, []);

  async function loadInvestors() {
    setLoading(true);
    try {
      const result = await getInvestors({ vertical, jurisdiction });
      setInvestors(result.investors || []);
    } catch (e) {
      console.error("Failed to load investors:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createInvestor({
        vertical, jurisdiction,
        investor: {
          name: formData.name,
          email: formData.email,
          type: formData.type,
          targetAmount: parseFloat(formData.targetAmount) || 0,
          notes: formData.notes,
        },
      });
      setShowForm(false);
      setFormData({ name: "", email: "", type: "Angel", targetAmount: "", notes: "" });
      await loadInvestors();
    } catch (e) {
      console.error("Failed to create investor:", e);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(investorId, newStatus) {
    try {
      await updateInvestor({
        vertical, jurisdiction, id: investorId,
        investor: { status: newStatus, lastActivity: `Status changed to ${newStatus}` },
      });
      await loadInvestors();
    } catch (e) {
      console.error("Failed to update investor:", e);
    }
  }

  async function handleDelete(investorId) {
    if (!confirm("Remove this investor from the pipeline?")) return;
    try {
      await deleteInvestor({ vertical, jurisdiction, id: investorId });
      await loadInvestors();
    } catch (e) {
      console.error("Failed to delete investor:", e);
    }
  }

  const filtered = filterStatus === "All"
    ? investors
    : investors.filter(i => i.status === filterStatus);

  const sorted = [...filtered].sort((a, b) =>
    (STATUS_CONFIG[b.status]?.order || 0) - (STATUS_CONFIG[a.status]?.order || 0)
  );

  const totalTarget = 1500000;
  const committed = investors.filter(i => i.status === "Committed" || i.status === "Invested");
  const committedTotal = committed.reduce((s, i) => s + (i.targetAmount || 0), 0);
  const verified = investors.filter(i => i.status === "Verified");

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Investor Pipeline</h1>
          <p className="subtle">Track investor relationships and fundraise progress</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => setShowForm(true)}
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", padding: "8px 20px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          + Add Investor
        </button>
      </div>

      {/* KPIs */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total Prospects</div>
          <div className="kpiValue">{investors.length}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Verified</div>
          <div className="kpiValue">{verified.length}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Committed / Invested</div>
          <div className="kpiValue">{committed.length}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Raised / Target</div>
          <div className="kpiValue" style={{ fontSize: "18px" }}>
            {formatAmount(committedTotal)} / {formatAmount(totalTarget)}
          </div>
          <div style={{ width: "100%", height: 4, borderRadius: 2, background: "#e5e7eb", marginTop: 8 }}>
            <div style={{ width: `${Math.min((committedTotal / totalTarget) * 100, 100)}%`, height: "100%", borderRadius: 2, background: "#7c3aed", transition: "width 0.3s" }} />
          </div>
        </div>
      </div>

      {/* Add Investor Form */}
      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: "#1e293b" }}>New Investor</div>
          <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <input placeholder="Name" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
            <input placeholder="Email" required type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
            <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}>
              <option value="Angel">Angel</option>
              <option value="VC">VC</option>
              <option value="Fund">Fund</option>
            </select>
            <input placeholder="Target Amount ($)" type="number" value={formData.targetAmount} onChange={e => setFormData(p => ({ ...p, targetAmount: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
            <textarea placeholder="Notes" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, gridColumn: "1 / -1", minHeight: 60, resize: "vertical" }} />
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#7c3aed", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                {saving ? "Saving..." : "Add Investor"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["All", ...STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: filterStatus === s ? "2px solid #7c3aed" : "1px solid #e2e8f0",
              background: filterStatus === s ? "#f3e8ff" : "white",
              color: filterStatus === s ? "#7c3aed" : "#64748b",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {s} {s !== "All" && `(${investors.filter(i => i.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Pipeline table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Loading...</div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>
            {investors.length === 0 ? "No investors yet. Add your first investor above." : "No investors match this filter."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Investor</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Type</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Status</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Amount</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Last Activity</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Added</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(inv => {
                const statusStyle = STATUS_CONFIG[inv.status] || {};
                const typeStyle = TYPE_STYLES[inv.type] || {};
                const isExpanded = expandedId === inv.id;
                return (
                  <React.Fragment key={inv.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 500, color: "#1e293b" }}>{inv.name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{inv.email}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: typeStyle.bg || "#f1f5f9", color: typeStyle.color || "#64748b",
                        }}>
                          {inv.type}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: statusStyle.bg || "#f1f5f9", color: statusStyle.color || "#64748b",
                        }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#1e293b" }}>{formatAmount(inv.targetAmount)}</td>
                      <td style={{ padding: "12px 16px", color: "#475569" }}>{inv.lastActivity || ""}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#94a3b8" }}>{formatDate(inv.createdAt)}</td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} style={{ padding: "0 16px 12px", background: "#fafafa" }}>
                          <div style={{ fontSize: 12, color: "#475569", padding: "8px 0" }}>
                            {inv.notes || "No notes."}
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 8 }}>
                            <select
                              value={inv.status}
                              onClick={e => e.stopPropagation()}
                              onChange={e => { e.stopPropagation(); handleStatusChange(inv.id, e.target.value); }}
                              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12 }}
                            >
                              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(inv.id); }}
                              style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
