import React, { useState } from "react";

const BUYERS = [
  { id: 1, name: "Amanda Liu", budget: "$350-450K", preApproved: true, type: "Single Family", status: "showing", agent: "Sarah Mitchell", note: "Relocating from NYC, starts job Mar 1", urgency: "high", lastContact: "Today" },
  { id: 2, name: "Michael Torres", budget: "$250-325K", preApproved: true, type: "Any", status: "contacted", agent: "David Park", note: "First-time buyer", urgency: "normal", lastContact: "Yesterday" },
  { id: 3, name: "Sarah Anderson", budget: "$400-500K", preApproved: false, type: "Single Family", status: "lead", agent: "Unassigned", note: "Referral from past client", urgency: "warning", lastContact: "3 days ago" },
  { id: 4, name: "Daniel Wright", budget: "$200-275K", preApproved: true, type: "Condo/Townhome", status: "showing", agent: "Sarah Mitchell", note: "Investor, wants rental income", urgency: "stale", lastContact: "30 days ago" },
  { id: 5, name: "Jennifer Kim", budget: "$500-650K", preApproved: true, type: "Single Family", status: "under-contract", agent: "David Park", note: "Under contract on 1893 San Jose Blvd", urgency: "normal", lastContact: "Today" },
  { id: 6, name: "Robert Martinez", budget: "$300-400K", preApproved: true, type: "Single Family", status: "showing", agent: "Sarah Mitchell", note: "Downsizing from 4bd", urgency: "normal", lastContact: "2 days ago" },
  { id: 7, name: "Emily Chen", budget: "$175-225K", preApproved: true, type: "Any", status: "contacted", agent: "David Park", note: "Investment property #2", urgency: "normal", lastContact: "Yesterday" },
  { id: 8, name: "James Wilson", budget: "$600-750K", preApproved: true, type: "Single Family", status: "showing", agent: "Sarah Mitchell", note: "Waterfront preferred", urgency: "normal", lastContact: "3 days ago" },
  { id: 9, name: "Lisa Thompson", budget: "$275-350K", preApproved: true, type: "Townhome", status: "contacted", agent: "David Park", note: "Recently divorced, needs quick close", urgency: "normal", lastContact: "Yesterday" },
  { id: 10, name: "David Brown", budget: "$450-550K", preApproved: true, type: "Single Family", status: "lead", agent: "Unassigned", note: "Military relocation PCS", urgency: "warning", lastContact: "5 days ago" },
];

const KANBAN_COLUMNS = [
  { id: "lead", label: "Lead", color: "#64748b" },
  { id: "contacted", label: "Contacted", color: "#2563eb" },
  { id: "showing", label: "Showing", color: "#7c3aed" },
  { id: "under-contract", label: "Under Contract", color: "#16a34a" },
  { id: "closed", label: "Closed", color: "#059669" },
];

const STATUS_STYLES = {
  "lead": { bg: "#f1f5f9", color: "#64748b" },
  "contacted": { bg: "#dbeafe", color: "#2563eb" },
  "showing": { bg: "#f3e8ff", color: "#7c3aed" },
  "under-contract": { bg: "#dcfce7", color: "#16a34a" },
  "closed": { bg: "#d1fae5", color: "#059669" },
};

function urgencyDot(urgency) {
  if (urgency === "high") return { color: "#dc2626", label: "URGENT" };
  if (urgency === "stale") return { color: "#d97706", label: "INACTIVE 30d" };
  if (urgency === "warning") return { color: "#eab308", label: "NEEDS CONTACT" };
  return null;
}

function statusLabel(s) {
  if (s === "lead") return "Lead";
  if (s === "contacted") return "Contacted";
  if (s === "showing") return "Showing";
  if (s === "under-contract") return "Under Contract";
  if (s === "closed") return "Closed";
  return s;
}

export default function REBuyers() {
  const [view, setView] = useState("kanban");
  const [selected, setSelected] = useState(null);

  function openChat(prompt) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", {
      detail: { message: prompt }
    }));
  }

  const totalBuyers = BUYERS.length;
  const activeShowings = BUYERS.filter((b) => b.status === "showing").length;
  const underContract = BUYERS.filter((b) => b.status === "under-contract").length;
  const uncontactedLeads = BUYERS.filter((b) => b.status === "lead").length;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Buyers</h1>
          <p className="subtle">Buyer pipeline and relationship management</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            className="iconBtn"
            onClick={() => openChat("Give me a buyer pipeline summary. Who needs follow-up, which leads are going stale, and what showings should I prioritize this week?")}
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
          >
            AI Buyer Brief
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpiRow" style={{ marginBottom: "20px" }}>
        <div className="card kpiCard">
          <div className="kpiLabel">Total Buyers</div>
          <div className="kpiValue">{totalBuyers}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Active Showings</div>
          <div className="kpiValue" style={{ color: "#7c3aed" }}>{activeShowings}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Under Contract</div>
          <div className="kpiValue" style={{ color: "#16a34a" }}>{underContract}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Uncontacted Leads</div>
          <div className="kpiValue" style={{ color: "#d97706" }}>{uncontactedLeads}</div>
        </div>
      </div>

      {/* View switcher */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
        {["kanban", "list"].map((v) => (
          <button
            key={v}
            className="iconBtn"
            onClick={() => setView(v)}
            style={{
              background: view === v ? "#7c3aed" : "#f1f5f9",
              color: view === v ? "white" : "#475569",
              border: "none",
              fontSize: "12px",
              padding: "6px 14px",
            }}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }}>
          {KANBAN_COLUMNS.map((col) => {
            const buyers = BUYERS.filter((b) => b.status === col.id);
            return (
              <div key={col.id} style={{ minWidth: "220px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", padding: "0 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: col.color }} />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>{buyers.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {buyers.map((buyer) => {
                    const urg = urgencyDot(buyer.urgency);
                    return (
                      <div
                        key={buyer.id}
                        className="card"
                        style={{ padding: "12px", cursor: "pointer", borderLeft: `3px solid ${col.color}` }}
                        onClick={() => setSelected(buyer)}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <div style={{ fontWeight: 700, fontSize: "13px", color: "#1e293b" }}>{buyer.name}</div>
                          {urg && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: urg.color, display: "inline-block" }} />
                              <span style={{ fontSize: "9px", fontWeight: 700, color: urg.color, letterSpacing: "0.3px" }}>{urg.label}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>{buyer.budget}</div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>{buyer.type}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          {buyer.preApproved ? (
                            <span style={{ fontSize: "10px", fontWeight: 600, padding: "1px 6px", borderRadius: "9999px", background: "#dcfce7", color: "#16a34a" }}>
                              Pre-Approved
                            </span>
                          ) : (
                            <span style={{ fontSize: "10px", fontWeight: 600, padding: "1px 6px", borderRadius: "9999px", background: "#fee2e2", color: "#dc2626" }}>
                              Not Pre-Approved
                            </span>
                          )}
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>{buyer.agent}</span>
                        </div>
                      </div>
                    );
                  })}
                  {buyers.length === 0 && (
                    <div style={{ padding: "20px 12px", textAlign: "center", fontSize: "12px", color: "#cbd5e1", border: "1px dashed #e2e8f0", borderRadius: "8px" }}>
                      No buyers
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Budget</th>
                <th>Type</th>
                <th>Status</th>
                <th>Pre-Approved</th>
                <th>Agent</th>
                <th>Last Contact</th>
              </tr>
            </thead>
            <tbody>
              {BUYERS.map((b) => {
                const ss = STATUS_STYLES[b.status] || STATUS_STYLES["lead"];
                const urg = urgencyDot(b.urgency);
                return (
                  <tr key={b.id} onClick={() => setSelected(b)} style={{ cursor: "pointer" }}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {urg && (
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: urg.color, display: "inline-block", flexShrink: 0 }} />
                        )}
                        <span style={{ fontWeight: 600, fontSize: "13px" }}>{b.name}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{b.budget}</td>
                    <td style={{ fontSize: "12px", color: "#64748b" }}>{b.type}</td>
                    <td>
                      <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: ss.bg, color: ss.color }}>
                        {statusLabel(b.status)}
                      </span>
                    </td>
                    <td>
                      {b.preApproved ? (
                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: "#dcfce7", color: "#16a34a" }}>Yes</span>
                      ) : (
                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: "#fee2e2", color: "#dc2626" }}>No</span>
                      )}
                    </td>
                    <td style={{ fontSize: "12px", color: b.agent === "Unassigned" ? "#d97706" : "#64748b", fontWeight: b.agent === "Unassigned" ? 600 : 400 }}>
                      {b.agent}
                    </td>
                    <td style={{ fontSize: "12px", color: "#64748b" }}>{b.lastContact}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <div style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "400px",
          height: "100vh",
          background: "white",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          zIndex: 999,
          overflowY: "auto",
          padding: "24px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Buyer Detail</h2>
            <button
              className="iconBtn"
              onClick={() => setSelected(null)}
              style={{ background: "#f1f5f9", border: "none", fontSize: "16px", padding: "4px 10px" }}
            >
              X
            </button>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontWeight: 700, fontSize: "18px", color: "#1e293b" }}>{selected.name}</div>
            {(() => {
              const urg = urgencyDot(selected.urgency);
              if (!urg) return null;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: urg.color, display: "inline-block" }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: urg.color }}>{urg.label}</span>
                </div>
              );
            })()}
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: (STATUS_STYLES[selected.status] || {}).bg, color: (STATUS_STYLES[selected.status] || {}).color }}>
              {statusLabel(selected.status)}
            </span>
            {selected.preApproved ? (
              <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: "#dcfce7", color: "#16a34a" }}>Pre-Approved</span>
            ) : (
              <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: "#fee2e2", color: "#dc2626" }}>Not Pre-Approved</span>
            )}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Budget</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>{selected.budget}</div>
          </div>

          <div style={{ display: "flex", gap: "24px", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Property Type</div>
              <div style={{ fontSize: "13px", color: "#1e293b", fontWeight: 600 }}>{selected.type}</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Agent</div>
              <div style={{ fontSize: "13px", color: selected.agent === "Unassigned" ? "#d97706" : "#1e293b", fontWeight: 600 }}>{selected.agent}</div>
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Notes</div>
            <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>{selected.note}</div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Last Contact</div>
            <div style={{ fontSize: "13px", color: "#475569" }}>{selected.lastContact}</div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
            <button
              className="iconBtn"
              onClick={() => {
                openChat(`Tell me about buyer ${selected.name}. Budget: ${selected.budget}, looking for: ${selected.type}. Notes: ${selected.note}. What listings should I match them with and what's the best next step?`);
                setSelected(null);
              }}
              style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", padding: "10px" }}
            >
              Ask AI
            </button>
            {(selected.status === "lead" || selected.status === "contacted") && (
              <button
                className="iconBtn"
                onClick={() => {
                  openChat(`Draft a personalized outreach message for ${selected.name}. They are a ${selected.status} looking for ${selected.type} in the ${selected.budget} range. Notes: ${selected.note}. Make it warm, professional, and actionable.`);
                  setSelected(null);
                }}
                style={{ background: "#f1f5f9", color: "#475569", border: "none", padding: "10px" }}
              >
                AI: Draft Outreach
              </button>
            )}
            <button
              className="iconBtn"
              onClick={() => {
                openChat(`Find matching listings for ${selected.name}. Budget: ${selected.budget}, property type: ${selected.type}. Notes: ${selected.note}. Show me the best matches from our current inventory.`);
                setSelected(null);
              }}
              style={{ background: "#f1f5f9", color: "#475569", border: "none", padding: "10px" }}
            >
              AI: Match Listings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
