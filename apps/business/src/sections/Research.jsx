import React, { useState } from "react";

const RESEARCH_ITEMS = [
  { id: 1, company: "NovaTech Corp", type: "Earnings Analysis", status: "Published", analyst: "Sarah Chen", updated: "Feb 19, 2026", priority: "High", notes: "Q4 beat estimates by 12%. Model updated. Fair value raised to $89." },
  { id: 2, company: "Meridian Healthcare", type: "Earnings Analysis", status: "In Progress", analyst: "Sarah Chen", updated: "Feb 18, 2026", priority: "High", notes: "Earnings tomorrow. Model needs CMS reimbursement rate update." },
  { id: 3, company: "Sentinel Defense", type: "Event Analysis", status: "Draft", analyst: "Michael Torres", updated: "Feb 19, 2026", priority: "High", notes: "Contract delay impact assessment. Position at 4.2% of portfolio." },
  { id: 4, company: "Healthcare IT Sector", type: "Sector Review", status: "Published", analyst: "Sarah Chen", updated: "Feb 17, 2026", priority: "Medium", notes: "Sector up 4.2% MTD. Telehealth leading. 3 portfolio companies exposed." },
  { id: 5, company: "TechBridge Solutions", type: "Deal Evaluation", status: "In Progress", analyst: "Michael Torres", updated: "Feb 16, 2026", priority: "Medium", notes: "Acquisition target: $45M revenue, 22% EBITDA margin. Risk score 58." },
  { id: 6, company: "Energy Sector", type: "Sector Review", status: "Draft", analyst: "David Park", updated: "Feb 15, 2026", priority: "Medium", notes: "Oil price volatility impact on portfolio positions. Summit Energy down." },
  { id: 7, company: "Apex Industries", type: "Model Update", status: "Needs Update", analyst: "Sarah Chen", updated: "Jan 8, 2026", priority: "High", notes: "Model 42 days old. New contract win not reflected. Needs refresh." },
  { id: 8, company: "ClearView Analytics", type: "Model Update", status: "Needs Update", analyst: "Michael Torres", updated: "Jan 12, 2026", priority: "Medium", notes: "Model 38 days old. Product launch results not incorporated." },
  { id: 9, company: "Summit Energy Partners", type: "Model Update", status: "Needs Update", analyst: "David Park", updated: "Jan 15, 2026", priority: "Medium", notes: "Model 35 days old. New well production data available." },
  { id: 10, company: "US Macro", type: "Macro Briefing", status: "Published", analyst: "David Park", updated: "Feb 18, 2026", priority: "Low", notes: "Fed meeting next week. Market pricing 60% chance of hold." },
  { id: 11, company: "Pacific Rim Holdings", type: "Deal Evaluation", status: "Published", analyst: "Michael Torres", updated: "Feb 14, 2026", priority: "Low", notes: "REIT valuation analysis. NAV discount of 12%. Hold recommendation." },
  { id: 12, company: "Emerging Markets", type: "Macro Briefing", status: "Draft", analyst: "David Park", updated: "Feb 13, 2026", priority: "Low", notes: "EM allocation review. Currency headwinds in Q1. Considering reduction." },
];

const STATUS_STYLES = {
  "Published": { bg: "#dcfce7", color: "#16a34a" },
  "In Progress": { bg: "#dbeafe", color: "#2563eb" },
  "Draft": { bg: "#fef3c7", color: "#d97706" },
  "Needs Update": { bg: "#fee2e2", color: "#dc2626" },
};

const PRIORITY_STYLES = {
  "High": { bg: "#fee2e2", color: "#dc2626" },
  "Medium": { bg: "#fef3c7", color: "#d97706" },
  "Low": { bg: "#f1f5f9", color: "#64748b" },
};

export default function Research() {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const filtered = filter === "all" ? RESEARCH_ITEMS : RESEARCH_ITEMS.filter(r => r.status === filter);

  const counts = {
    all: RESEARCH_ITEMS.length,
    "Published": RESEARCH_ITEMS.filter(r => r.status === "Published").length,
    "In Progress": RESEARCH_ITEMS.filter(r => r.status === "In Progress").length,
    "Draft": RESEARCH_ITEMS.filter(r => r.status === "Draft").length,
    "Needs Update": RESEARCH_ITEMS.filter(r => r.status === "Needs Update").length,
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Research</h1>
          <p className="subtle">Active research items, analyses, and sector reviews</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: "Start a new research analysis. What company or sector should I look at?" } }))}
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
        >
          New Analysis
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {["all", "Published", "In Progress", "Draft", "Needs Update"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: filter === f ? "2px solid #7c3aed" : "1px solid #e2e8f0",
              background: filter === f ? "#f3e8ff" : "white",
              color: filter === f ? "#7c3aed" : "#64748b",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {f === "all" ? "All" : f} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Research Table */}
      <div className="card">
        <div className="tableWrap">
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Company / Topic</th>
                <th>Type</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Analyst</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const ss = STATUS_STYLES[item.status] || STATUS_STYLES.Draft;
                const ps = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.Low;
                return (
                  <React.Fragment key={item.id}>
                    <tr style={{ cursor: "pointer" }} onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                      <td className="tdStrong">{item.company}</td>
                      <td style={{ fontSize: "13px", color: "#64748b" }}>{item.type}</td>
                      <td>
                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: ss.bg, color: ss.color }}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: ps.bg, color: ps.color }}>
                          {item.priority}
                        </span>
                      </td>
                      <td style={{ fontSize: "13px" }}>{item.analyst}</td>
                      <td style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>{item.updated}</td>
                    </tr>
                    {expandedId === item.id && (
                      <tr>
                        <td colSpan={6} style={{ padding: "12px 16px", background: "#f8fafc", fontSize: "13px", color: "#475569", lineHeight: 1.6, borderBottom: "2px solid #e2e8f0" }}>
                          {item.notes}
                          <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                            <button
                              className="iconBtn"
                              style={{ fontSize: "12px" }}
                              onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: `Update the research on ${item.company}. Current notes: ${item.notes}` } })); }}
                            >Update with AI</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
