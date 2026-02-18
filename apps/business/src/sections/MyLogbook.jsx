import React, { useState, useEffect } from "react";
import * as api from "../api/client";

const ENTRY_TYPES = {
  maintenance: { icon: "M", color: "#06b6d4", label: "Maintenance" },
  transfer: { icon: "T", color: "#7c3aed", label: "Transfer" },
  inspection: { icon: "I", color: "#22c55e", label: "Inspection" },
  update: { icon: "U", color: "#f59e0b", label: "Update" },
  note: { icon: "N", color: "#64748b", label: "Note" },
  creation: { icon: "C", color: "#7c3aed", label: "Created" },
};

export default function MyLogbook() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedAssets, setExpandedAssets] = useState({});

  useEffect(() => { loadLogbook(); }, []);

  async function loadLogbook() {
    try {
      const result = await api.getLogbooks({ vertical: "consumer", jurisdiction: "GLOBAL" });
      setEntries(result.entries || []);
      // Auto-expand all assets
      const expanded = {};
      (result.entries || []).forEach((e) => { if (e.dtcId) expanded[e.dtcId] = true; });
      setExpandedAssets(expanded);
    } catch (e) {
      console.error("Failed to load logbook:", e);
      // Fallback: try AI activity
      try {
        const result = await api.getAIActivity({ vertical: "consumer", jurisdiction: "GLOBAL", limit: 50 });
        setEntries(result.activity || []);
      } catch (e2) {
        console.error("Fallback also failed:", e2);
      }
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function toggleAsset(dtcId) {
    setExpandedAssets((prev) => ({ ...prev, [dtcId]: !prev[dtcId] }));
  }

  // Group entries by dtcId
  const grouped = {};
  entries.forEach((entry) => {
    const key = entry.dtcId || entry.id || "other";
    if (!grouped[key]) grouped[key] = { title: entry.dtcTitle || entry.workflowId || "Activity", entries: [] };
    grouped[key].entries.push(entry);
  });

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My Logbooks</h1>
          <p className="subtle">Every important item gets its own permanent timeline</p>
        </div>
      </div>

      {/* DTC Explanation */}
      <div className="card" style={{ marginBottom: "16px", padding: "20px", background: "#faf5ff", border: "1px solid #e9d5ff" }}>
        <div style={{ fontSize: "15px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
          How Logbooks Work
        </div>
        <div style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.7" }}>
          Every important item in your Vault gets its own logbook -- a permanent timeline of everything that happens to it. When you add a vehicle, property, or valuable item, TitleApp automatically starts tracking it. Every update, verification, and change is recorded with a timestamp so you always have proof of what happened and when.
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: "24px", textAlign: "center" }}>
          Loading logbooks...
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "10px" }}>
            No logbook entries yet
          </div>
          <div style={{ fontSize: "14px", color: "#64748b", maxWidth: "420px", margin: "0 auto", lineHeight: "1.6" }}>
            Add a vehicle, property, or important item to get started. Each item gets its own logbook that tracks everything automatically.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {Object.entries(grouped).map(([dtcId, group]) => (
            <div key={dtcId} className="card" style={{ overflow: "hidden" }}>
              <button
                onClick={() => toggleAsset(dtcId)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "16px 20px",
                  background: "#faf5ff",
                  border: "none",
                  borderBottom: expandedAssets[dtcId] ? "1px solid #e9d5ff" : "none",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b" }}>
                    Logbook: {group.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    {group.entries.length} {group.entries.length === 1 ? "entry" : "entries"}
                  </div>
                </div>
                <span style={{ color: "#7c3aed", fontSize: "18px" }}>{expandedAssets[dtcId] ? "\u25B2" : "\u25BC"}</span>
              </button>

              {expandedAssets[dtcId] && (
                <div style={{ padding: "16px 20px" }}>
                  {group.entries.map((entry, idx) => {
                    const config = ENTRY_TYPES[entry.entryType] || ENTRY_TYPES.note;
                    return (
                      <div key={entry.id || idx} style={{ display: "flex", gap: "14px", padding: "14px 0", borderBottom: idx < group.entries.length - 1 ? "1px solid var(--line)" : "none" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            background: `${config.color}15`,
                            border: `2px solid ${config.color}35`,
                            display: "grid",
                            placeItems: "center",
                            fontSize: "14px",
                            fontWeight: 700,
                            color: config.color,
                          }}>
                            {config.icon}
                          </div>
                          {idx < group.entries.length - 1 && (
                            <div style={{ flex: 1, width: "2px", background: "var(--line)", marginTop: "4px" }} />
                          )}
                        </div>
                        <div style={{ flex: 1, paddingTop: "2px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", background: `${config.color}15`, color: config.color }}>
                              {config.label}
                            </span>
                            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                              {formatDate(entry.createdAt)}
                            </span>
                          </div>
                          {entry.data && Object.entries(entry.data).map(([key, value]) => (
                            <div key={key} style={{ fontSize: "13px", marginBottom: "2px" }}>
                              <span style={{ fontWeight: 600 }}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")}:</span>{" "}
                              <span style={{ color: "#475569" }}>{value}</span>
                            </div>
                          ))}
                          {entry.description && <div style={{ fontSize: "13px", color: "#475569" }}>{entry.description}</div>}
                          {entry.summary && <div style={{ fontSize: "13px", color: "#475569" }}>{entry.summary}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
