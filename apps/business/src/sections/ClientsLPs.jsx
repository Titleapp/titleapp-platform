import React, { useState } from "react";

const CLIENTS = [
  { id: 1, name: "Blackstone Partners", type: "LP", aum: 8500000, lastContact: "Feb 18, 2026", nextAction: "Q4 letter due Friday", status: "Active" },
  { id: 2, name: "Smith Family Office", type: "LP", aum: 5200000, lastContact: "Feb 17, 2026", nextAction: "Meeting next Tuesday", status: "Active" },
  { id: 3, name: "Wellington Capital", type: "LP", aum: 12000000, lastContact: "Feb 10, 2026", nextAction: "Capital call notice", status: "Active" },
  { id: 4, name: "Pacific Ventures", type: "LP", aum: 3800000, lastContact: "Feb 14, 2026", nextAction: "Performance review", status: "Active" },
  { id: 5, name: "Meridian Endowment", type: "LP", aum: 15000000, lastContact: "Feb 5, 2026", nextAction: "Annual meeting invite", status: "Active" },
  { id: 6, name: "Atlas Retirement Fund", type: "Client", aum: 6700000, lastContact: "Feb 12, 2026", nextAction: "Portfolio rebalance review", status: "Active" },
  { id: 7, name: "Horizon Foundation", type: "LP", aum: 4100000, lastContact: "Jan 28, 2026", nextAction: "Follow-up on commitment", status: "Pending" },
  { id: 8, name: "Chen Family Trust", type: "Client", aum: 2800000, lastContact: "Feb 16, 2026", nextAction: "Tax planning discussion", status: "Active" },
  { id: 9, name: "Northern Lights Capital", type: "Prospect", aum: 0, lastContact: "Feb 8, 2026", nextAction: "Send pitch deck", status: "Prospecting" },
  { id: 10, name: "Redwood Partners", type: "Prospect", aum: 0, lastContact: "Feb 1, 2026", nextAction: "Schedule intro call", status: "Prospecting" },
  { id: 11, name: "Summit Advisors", type: "LP", aum: 7300000, lastContact: "Feb 6, 2026", nextAction: "Quarterly call", status: "Active" },
  { id: 12, name: "Eagle Point Capital", type: "Client", aum: 4500000, lastContact: "Feb 11, 2026", nextAction: "Strategy update", status: "Active" },
  { id: 13, name: "Pineview Investments", type: "LP", aum: 9100000, lastContact: "Jan 20, 2026", nextAction: "Re-up discussion", status: "Active" },
  { id: 14, name: "Cascade Partners", type: "Prospect", aum: 0, lastContact: "Jan 15, 2026", nextAction: "Second meeting", status: "Prospecting" },
  { id: 15, name: "Granite Holdings", type: "LP", aum: 6200000, lastContact: "Feb 13, 2026", nextAction: "Wire confirmation", status: "Active" },
];

const COMMUNICATION_LOG = [
  { id: 1, client: "Blackstone Partners", type: "Email", subject: "Q4 Performance Update Draft", date: "Feb 18, 2026", status: "Sent" },
  { id: 2, client: "Smith Family Office", type: "Email", subject: "Meeting Confirmation", date: "Feb 17, 2026", status: "Sent" },
  { id: 3, client: "Wellington Capital", type: "Email", subject: "Capital Call Notice", date: "Feb 15, 2026", status: "Opened" },
  { id: 4, client: "Pacific Ventures", type: "Call", subject: "Q4 Performance Discussion", date: "Feb 14, 2026", status: "Completed" },
  { id: 5, client: "Chen Family Trust", type: "Email", subject: "Tax Strategy Memo", date: "Feb 16, 2026", status: "Sent" },
  { id: 6, client: "Meridian Endowment", type: "Email", subject: "Annual Meeting Save the Date", date: "Feb 5, 2026", status: "Opened" },
];

const TYPE_STYLES = {
  "LP": { bg: "#dbeafe", color: "#2563eb" },
  "Client": { bg: "#dcfce7", color: "#16a34a" },
  "Prospect": { bg: "#fef3c7", color: "#d97706" },
};

export default function ClientsLPs() {
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("clients");

  const totalAUM = CLIENTS.filter(c => c.aum > 0).reduce((s, c) => s + c.aum, 0);
  const activeCount = CLIENTS.filter(c => c.status === "Active").length;
  const prospectCount = CLIENTS.filter(c => c.status === "Prospecting").length;

  const filtered = filter === "all" ? CLIENTS : CLIENTS.filter(c => c.type === filter);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Clients & LPs</h1>
          <p className="subtle">Limited partners, clients, and prospect management</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: "Draft a quarterly update letter for all LPs with our current performance data" } }))}
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
        >
          Draft LP Update
        </button>
      </div>

      {/* KPIs */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total AUM</div>
          <div className="kpiValue">${(totalAUM / 1000000).toFixed(1)}M</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Active Relationships</div>
          <div className="kpiValue">{activeCount}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Prospects</div>
          <div className="kpiValue">{prospectCount}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Communications This Month</div>
          <div className="kpiValue">{COMMUNICATION_LOG.length}</div>
        </div>
      </div>

      {/* View Toggle */}
      <div style={{ display: "flex", gap: "8px", marginTop: "14px", marginBottom: "14px" }}>
        <button onClick={() => setView("clients")} style={{ padding: "8px 16px", borderRadius: "8px", border: view === "clients" ? "2px solid #7c3aed" : "1px solid #e2e8f0", background: view === "clients" ? "#f3e8ff" : "white", color: view === "clients" ? "#7c3aed" : "#64748b", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          Client List
        </button>
        <button onClick={() => setView("log")} style={{ padding: "8px 16px", borderRadius: "8px", border: view === "log" ? "2px solid #7c3aed" : "1px solid #e2e8f0", background: view === "log" ? "#f3e8ff" : "white", color: view === "log" ? "#7c3aed" : "#64748b", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          Communication Log
        </button>
        {view === "clients" && (
          <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
            {["all", "LP", "Client", "Prospect"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 12px", borderRadius: "16px", border: filter === f ? "2px solid #7c3aed" : "1px solid #e2e8f0", background: filter === f ? "#f3e8ff" : "white", color: filter === f ? "#7c3aed" : "#64748b", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === "clients" ? (
        <div className="card">
          <div className="tableWrap">
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>AUM</th>
                  <th>Last Contact</th>
                  <th>Next Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const ts = TYPE_STYLES[c.type] || TYPE_STYLES.Client;
                  return (
                    <tr key={c.id}>
                      <td className="tdStrong">{c.name}</td>
                      <td>
                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: ts.bg, color: ts.color }}>
                          {c.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{c.aum > 0 ? `$${(c.aum / 1000000).toFixed(1)}M` : "--"}</td>
                      <td style={{ fontSize: "12px", color: "#64748b" }}>{c.lastContact}</td>
                      <td style={{ fontSize: "13px" }}>{c.nextAction}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="tableWrap">
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {COMMUNICATION_LOG.map(log => (
                  <tr key={log.id}>
                    <td className="tdStrong">{log.client}</td>
                    <td style={{ fontSize: "12px", color: "#64748b" }}>{log.type}</td>
                    <td style={{ fontSize: "13px" }}>{log.subject}</td>
                    <td style={{ fontSize: "12px", color: "#64748b" }}>{log.date}</td>
                    <td>
                      <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: log.status === "Opened" ? "#dbeafe" : log.status === "Completed" ? "#dcfce7" : "#f1f5f9", color: log.status === "Opened" ? "#2563eb" : log.status === "Completed" ? "#16a34a" : "#475569" }}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
