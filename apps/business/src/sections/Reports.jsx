import React, { useState, useEffect } from "react";
import * as api from "../api/client";

const AUTO_WEEKLY_REVENUE = [
  { week: "Jan 27", sales: 412000, service: 18200 },
  { week: "Feb 3", sales: 385000, service: 21400 },
  { week: "Feb 10", sales: 448000, service: 19800 },
  { week: "Feb 17", sales: 396000, service: 22100 },
];

const AUTO_RECENT_EVENTS = [
  { id: 1, time: "2h ago", text: "AI identified upsell for Charles Cox -- $3,450 potential (Extra Care Gold)", color: "#d97706" },
  { id: 2, time: "4h ago", text: "Trade-in appraisal completed -- 2021 BMW X3 xDrive30i, est. $28,500", color: "#7c3aed" },
  { id: 3, time: "6h ago", text: "Maria Gonzalez moved to Contacted stage -- lease expiring outreach sent", color: "#2563eb" },
  { id: 4, time: "Yesterday", text: "Patricia Adams -- Camry LE delivered. Extra Care Gold + GAP added.", color: "#16a34a" },
  { id: 5, time: "Yesterday", text: "AI sent 4 lease-expiration offers to qualifying customers", color: "#7c3aed" },
  { id: 6, time: "2 days ago", text: "Price reduction on 2022 Ford Explorer XLT -- $34,169 to $31,999", color: "#dc2626" },
  { id: 7, time: "2 days ago", text: "Daniel Green -- GR86 Premium cash deal closed. ToyoGuard added.", color: "#16a34a" },
  { id: 8, time: "3 days ago", text: "AI generated Facebook Marketplace listing for 2025 Camry LE (Stock N25000)", color: "#7c3aed" },
];

export default function Reports() {
  const [dateRange, setDateRange] = useState("30days");
  const [reportData, setReportData] = useState({
    deals: 0, avgRisk: 0, sessions: 0, reports: 0, recentDeals: [],
  });
  const [loading, setLoading] = useState(true);

  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";
  const isAuto = vertical === "auto";

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  async function loadReportData() {
    setLoading(true);
    try {
      if (vertical === "analyst") {
        const analyzedResult = await api.getAnalyzedDeals({ vertical, jurisdiction });
        const deals = analyzedResult.deals || [];
        const withScore = deals.filter(d => d.analysis?.riskScore);
        const avgRisk = withScore.length > 0
          ? Math.round(withScore.reduce((s, d) => s + d.analysis.riskScore, 0) / withScore.length)
          : 0;
        const aiResult = await api.getAIActivity({ vertical, jurisdiction, limit: 100 });
        const sessions = (aiResult.activity || []).length;
        setReportData({
          deals: deals.length,
          avgRisk,
          sessions,
          reports: deals.length,
          recentDeals: deals.slice(0, 5),
        });
      } else {
        const aiResult = await api.getAIActivity({ vertical, jurisdiction, limit: 100 });
        const sessions = (aiResult.activity || []).length;
        setReportData(prev => ({ ...prev, sessions }));
      }
    } catch (e) {
      console.error("Failed to load report data:", e);
    } finally {
      setLoading(false);
    }
  }

  function getRiskColor(score) {
    if (score >= 70) return "#ef4444";
    if (score >= 40) return "#f59e0b";
    return "#10b981";
  }

  function getKpiConfig() {
    if (vertical === "analyst") {
      return [
        { label: "Deals Analyzed", value: reportData.deals.toString() },
        { label: "Avg Risk Score", value: reportData.avgRisk > 0 ? `${reportData.avgRisk}/100` : "0" },
        { label: "AI Sessions", value: reportData.sessions.toString() },
        { label: "Reports Generated", value: reportData.reports.toString() },
      ];
    }
    if (isAuto) {
      return [
        { label: "Total Revenue MTD", value: "$1,641,000" },
        { label: "Units Sold", value: "47" },
        { label: "Active Customers", value: "150" },
        { label: "Avg Deal Size", value: "$34,915" },
      ];
    }
    return [
      { label: "Total Revenue", value: "--" },
      { label: "Total Sales", value: "--" },
      { label: "Active Customers", value: "--" },
      { label: "Avg Deal Size", value: "--" },
    ];
  }

  const kpis = getKpiConfig();
  const maxRevenue = Math.max(...AUTO_WEEKLY_REVENUE.map(w => w.sales));

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Reports</h1>
          <p className="subtle">Business analytics and performance metrics</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          style={{ padding: "10px 16px", borderRadius: "12px", border: "1px solid var(--line)" }}
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="kpiRow">
        {kpis.map((kpi, i) => (
          <div key={i} className="card kpiCard">
            <div className="kpiLabel">{kpi.label}</div>
            <div className="kpiValue" style={{ color: kpi.value === "--" ? "var(--textMuted)" : undefined }}>
              {loading ? "..." : kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
        {/* Revenue Trend (Auto) or Analysis Activity (Analyst) */}
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">
              {vertical === "analyst" ? "Analysis Activity" : "Revenue Trend"}
            </div>
          </div>
          {isAuto ? (
            <div style={{ padding: "16px" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", height: "180px", padding: "0 8px" }}>
                {AUTO_WEEKLY_REVENUE.map((w, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>${(w.sales / 1000).toFixed(0)}K</div>
                    <div style={{ width: "100%", background: "#7c3aed", borderRadius: "4px 4px 0 0", height: `${(w.sales / maxRevenue) * 120}px`, minHeight: "20px" }} />
                    <div style={{ width: "100%", background: "#06b6d4", borderRadius: "4px 4px 0 0", height: `${(w.service / maxRevenue) * 120}px`, minHeight: "8px" }} />
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>{w.week}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#7c3aed" }} /> Sales
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#06b6d4" }} /> Service
                </div>
              </div>
            </div>
          ) : vertical === "analyst" && reportData.recentDeals.length > 0 ? (
            <div style={{ padding: "16px" }}>
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Risk Score</th>
                      <th>Recommendation</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.recentDeals.map((deal) => {
                      const score = deal.analysis?.riskScore || 0;
                      const at = deal.analyzedAt || deal.createdAt;
                      let dateStr = "Today";
                      if (at) {
                        const d = at.seconds ? new Date(at.seconds * 1000) : at._seconds ? new Date(at._seconds * 1000) : new Date(at);
                        if (!isNaN(d.getTime())) dateStr = d.toLocaleDateString();
                      }
                      return (
                        <tr key={deal.id}>
                          <td className="tdStrong">{deal.dealInput?.companyName || "Unknown"}</td>
                          <td><span style={{ fontWeight: 600, color: getRiskColor(score) }}>{score}/100</span></td>
                          <td>
                            <span className={`badge badge-${deal.analysis?.recommendation === "INVEST" ? "completed" : deal.analysis?.recommendation === "PASS" ? "" : "processing"}`}>
                              {deal.analysis?.recommendation || "WAIT"}
                            </span>
                          </td>
                          <td className="tdMuted">{dateStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ padding: "32px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px", color: "var(--textMuted)", background: "#f8fafc", borderRadius: "8px", margin: "16px", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "16px", fontWeight: 600 }}>No data yet</div>
              <div style={{ fontSize: "14px", textAlign: "center", maxWidth: "300px" }}>
                Reports will populate as you use the platform. Start by adding records or running AI workflows.
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Recent Activity</div>
          </div>
          {isAuto ? (
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "2px" }}>
              {AUTO_RECENT_EVENTS.map((evt) => (
                <div key={evt.id} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: evt.color, flexShrink: 0, marginTop: "5px" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.5 }}>{evt.text}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{evt.time}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : vertical === "analyst" && reportData.recentDeals.length > 0 ? (
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {reportData.recentDeals.slice(0, 4).map((deal) => {
                const score = deal.analysis?.riskScore || 0;
                return (
                  <div key={deal.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: getRiskColor(score), flexShrink: 0 }} />
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {deal.dealInput?.companyName || "Unknown"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {deal.analysis?.recommendation || "WAIT"} -- {score}/100
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--textMuted)", fontSize: "14px" }}>
              No activity recorded yet. Use the AI assistant or add records to see activity here.
            </div>
          )}
        </div>
      </div>

      {/* Export Options */}
      <div className="card" style={{ marginTop: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Export Reports</div>
            <div className="cardSub">Download data for external analysis</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", gap: "12px" }}>
          <button className="iconBtn">Export as CSV</button>
          <button className="iconBtn">Export as PDF</button>
          <button className="iconBtn">Export as Excel</button>
        </div>
      </div>
    </div>
  );
}
