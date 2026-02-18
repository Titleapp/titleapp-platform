import React, { useState, useEffect } from "react";
import * as api from "../api/client";

const ENTRY_TYPES = {
  creation: { icon: "C", color: "#7c3aed", label: "Created" },
  maintenance: { icon: "M", color: "#06b6d4", label: "Maintenance" },
  transfer: { icon: "T", color: "#7c3aed", label: "Transfer" },
  inspection: { icon: "I", color: "#22c55e", label: "Inspection" },
  update: { icon: "U", color: "#f59e0b", label: "Update" },
  payment: { icon: "P", color: "#16a34a", label: "Payment" },
  verification: { icon: "V", color: "#6366f1", label: "Verification" },
  note: { icon: "N", color: "#64748b", label: "Note" },
  attestation: { icon: "A", color: "#7c3aed", label: "Attestation" },
};

const ADD_ENTRY_TYPES = [
  { value: "update", label: "Update" },
  { value: "maintenance", label: "Maintenance" },
  { value: "payment", label: "Payment" },
  { value: "note", label: "Note" },
  { value: "verification", label: "Verification" },
  { value: "transfer", label: "Transfer" },
];

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function MyLogbook() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedAssets, setExpandedAssets] = useState({});
  const [addingTo, setAddingTo] = useState(null);
  const [newEntry, setNewEntry] = useState({ entryType: "update", description: "" });
  const [saving, setSaving] = useState(false);
  const [entryFile, setEntryFile] = useState(null);
  const entryFileRef = React.useRef(null);

  useEffect(() => { loadLogbook(); }, []);

  async function loadLogbook() {
    try {
      const result = await api.getLogbooks({ vertical: "consumer", jurisdiction: "GLOBAL" });
      setEntries(result.entries || []);
      const expanded = {};
      (result.entries || []).forEach((e) => { if (e.dtcId) expanded[e.dtcId] = true; });
      setExpandedAssets(expanded);
    } catch (e) {
      console.error("Failed to load logbook:", e);
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

  function toggleAsset(dtcId) {
    setExpandedAssets((prev) => ({ ...prev, [dtcId]: !prev[dtcId] }));
  }

  async function handleAddEntry(dtcId) {
    if (!newEntry.description.trim()) return;
    setSaving(true);
    try {
      // Read file as base64 if attached
      let filePayload = null;
      if (entryFile) {
        filePayload = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ name: entryFile.name, type: entryFile.type, data: reader.result });
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(entryFile);
        });
      }

      await api.appendLogbook({
        vertical: "consumer",
        jurisdiction: "GLOBAL",
        entry: {
          dtcId,
          entryType: newEntry.entryType,
          data: { description: newEntry.description },
        },
        ...(filePayload ? { file: filePayload } : {}),
      });
      setAddingTo(null);
      setNewEntry({ entryType: "update", description: "" });
      setEntryFile(null);
      setLoading(true);
      await loadLogbook();
    } catch (e) {
      console.error("Failed to add entry:", e);
    } finally {
      setSaving(false);
    }
  }

  // Group entries by dtcId
  const grouped = {};
  entries.forEach((entry) => {
    const key = entry.dtcId || entry.id || "other";
    if (!grouped[key]) grouped[key] = { title: entry.dtcTitle || entry.workflowId || "Activity", entries: [] };
    grouped[key].entries.push(entry);
  });

  const inputStyle = { width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" };
  const selectStyle = { ...inputStyle, background: "white" };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My Logbooks</h1>
          <p className="subtle">Every important item gets its own permanent timeline</p>
        </div>
      </div>

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
                  {/* Add Entry button */}
                  {addingTo !== dtcId && (
                    <div style={{ marginBottom: "14px" }}>
                      <button
                        onClick={() => { setAddingTo(dtcId); setNewEntry({ entryType: "update", description: "" }); }}
                        className="iconBtn"
                        style={{ fontSize: "13px" }}
                      >
                        + Add Entry
                      </button>
                    </div>
                  )}

                  {/* Inline add entry form */}
                  {addingTo === dtcId && (
                    <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "12px", border: "1px solid var(--line)", marginBottom: "16px" }}>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "#1e293b", marginBottom: "12px" }}>New Entry</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "4px", fontWeight: 600, fontSize: "12px", color: "#64748b" }}>Type</label>
                          <select value={newEntry.entryType} onChange={(e) => setNewEntry({ ...newEntry, entryType: e.target.value })} style={selectStyle}>
                            {ADD_ENTRY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "4px", fontWeight: 600, fontSize: "12px", color: "#64748b" }}>Description</label>
                          <textarea
                            value={newEntry.description}
                            onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                            rows={2}
                            placeholder="What happened?"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "4px", fontWeight: 600, fontSize: "12px", color: "#64748b" }}>Attach File (optional)</label>
                          <input ref={entryFileRef} type="file" style={{ display: "none" }} onChange={(e) => setEntryFile(e.target.files?.[0] || null)} />
                          {entryFile ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "white", borderRadius: "10px", border: "1px solid var(--line)", fontSize: "13px" }}>
                              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#475569" }}>{entryFile.name}</span>
                              <button type="button" onClick={() => { setEntryFile(null); if (entryFileRef.current) entryFileRef.current.value = ""; }} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "14px" }}>x</button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => entryFileRef.current?.click()} className="iconBtn" style={{ fontSize: "12px" }}>
                              Choose File
                            </button>
                          )}
                        </div>
                        <div>
                          <button
                            type="button"
                            disabled
                            className="iconBtn"
                            style={{ fontSize: "12px", opacity: 0.4, cursor: "not-allowed" }}
                            title="E-signature integration coming soon"
                          >
                            Request Signature
                          </button>
                          <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "8px" }}>DocuSign / e-signature coming soon</span>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleAddEntry(dtcId)}
                            disabled={saving || !newEntry.description.trim()}
                            className="iconBtn"
                            style={{ background: "var(--accent)", color: "white", borderColor: "var(--accent)", opacity: saving ? 0.6 : 1 }}
                          >
                            {saving ? "Saving..." : "Save Entry"}
                          </button>
                          <button onClick={() => { setAddingTo(null); setEntryFile(null); }} className="iconBtn">Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}

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
                          {entry.data && typeof entry.data === "object" && Object.entries(entry.data).map(([key, value]) => (
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
