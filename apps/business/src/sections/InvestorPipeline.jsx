import React, { useState } from "react";

const INVESTORS = [
  { id: 1, name: "Sarah Chen", type: "Angel", status: "Committed", amount: "$150K", email: "sarah@angel.vc", lastActivity: "Signed SAFE", lastDate: "Feb 22, 2026", notes: "Fintech focus, active in seed rounds" },
  { id: 2, name: "Mark Johnson", type: "Angel", status: "Verified", amount: "$75K", email: "mark@gmail.com", lastActivity: "Viewed data room (3x)", lastDate: "Feb 21, 2026", notes: "Repeat investor, referred by Sarah" },
  { id: 3, name: "Venture Fund Alpha", type: "VC", status: "Interested", amount: "$500K", email: "deals@vfalpha.com", lastActivity: "Intro call scheduled", lastDate: "Feb 24, 2026", notes: "Series A focus but flexible, $10M fund" },
  { id: 4, name: "David Park", type: "Angel", status: "Committed", amount: "$100K", email: "david@parkventures.co", lastActivity: "Wire sent", lastDate: "Feb 20, 2026", notes: "SaaS operator, can help with GTM" },
  { id: 5, name: "Lisa Wang", type: "Angel", status: "Interested", amount: "$50K", email: "lisa@wang.me", lastActivity: "Viewed pitch deck", lastDate: "Feb 19, 2026", notes: "First-time angel, healthcare background" },
  { id: 6, name: "TechStars Alumni Fund", type: "Fund", status: "Verified", amount: "$250K", email: "invest@tsalumni.co", lastActivity: "KYC completed", lastDate: "Feb 18, 2026", notes: "Standard terms, quick close" },
  { id: 7, name: "James Miller", type: "Angel", status: "Contacted", amount: "$25K", email: "james@miller.io", lastActivity: "Cold intro sent", lastDate: "Feb 17, 2026", notes: "Met at conference, interested in RegTech" },
  { id: 8, name: "Pacific Growth Partners", type: "VC", status: "Contacted", amount: "$300K", email: "info@pgp.vc", lastActivity: "Deck sent", lastDate: "Feb 15, 2026", notes: "Pre-seed/seed fund, West Coast" },
  { id: 9, name: "Rachel Torres", type: "Angel", status: "Invested", amount: "$50K", email: "rachel@torres.com", lastActivity: "Investment received", lastDate: "Feb 10, 2026", notes: "Early supporter, community builder" },
  { id: 10, name: "Horizon Seed Fund", type: "Fund", status: "Interested", amount: "$200K", email: "pipeline@horizon.fund", lastActivity: "Follow-up meeting", lastDate: "Feb 23, 2026", notes: "Fintech thesis, $25M fund" },
];

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

export default function InvestorPipeline() {
  const [filterStatus, setFilterStatus] = useState("All");
  const [expandedId, setExpandedId] = useState(null);

  const filtered = filterStatus === "All"
    ? INVESTORS
    : INVESTORS.filter(i => i.status === filterStatus);

  const sorted = [...filtered].sort((a, b) =>
    (STATUS_CONFIG[b.status]?.order || 0) - (STATUS_CONFIG[a.status]?.order || 0)
  );

  // Compute KPIs
  const parseAmount = (s) => {
    const n = parseFloat(s.replace(/[$K,]/g, ""));
    return s.includes("K") ? n * 1000 : n;
  };
  const totalTarget = 1500000;
  const committed = INVESTORS.filter(i => i.status === "Committed" || i.status === "Invested");
  const committedTotal = committed.reduce((s, i) => s + parseAmount(i.amount), 0);
  const verified = INVESTORS.filter(i => i.status === "Verified");

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Investor Pipeline</h1>
          <p className="subtle">Track investor relationships and fundraise progress</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total Prospects</div>
          <div className="kpiValue">{INVESTORS.length}</div>
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
            ${(committedTotal / 1000).toFixed(0)}K / ${(totalTarget / 1000000).toFixed(1)}M
          </div>
          <div style={{ width: "100%", height: 4, borderRadius: 2, background: "#e5e7eb", marginTop: 8 }}>
            <div style={{ width: `${Math.min((committedTotal / totalTarget) * 100, 100)}%`, height: "100%", borderRadius: 2, background: "#7c3aed", transition: "width 0.3s" }} />
          </div>
        </div>
      </div>

      {/* Status filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["All", "Contacted", "Interested", "Verified", "Committed", "Invested"].map(s => (
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
            {s} {s !== "All" && `(${INVESTORS.filter(i => i.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Pipeline table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Investor</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Type</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Status</th>
              <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Amount</th>
              <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Last Activity</th>
              <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Date</th>
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
                        padding: "2px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        background: typeStyle.bg || "#f1f5f9",
                        color: typeStyle.color || "#64748b",
                      }}>
                        {inv.type}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "2px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        background: statusStyle.bg || "#f1f5f9",
                        color: statusStyle.color || "#64748b",
                      }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#1e293b" }}>{inv.amount}</td>
                    <td style={{ padding: "12px 16px", color: "#475569" }}>{inv.lastActivity}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#94a3b8" }}>{inv.lastDate}</td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} style={{ padding: "0 16px 12px", background: "#fafafa" }}>
                        <div style={{ fontSize: 12, color: "#475569", padding: "8px 0" }}>
                          {inv.notes}
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
  );
}
