import React, { useState, useEffect } from "react";
import * as api from "../api/client";

/**
 * Reports - Business analytics and performance metrics
 */
export default function Reports() {
  const [dateRange, setDateRange] = useState("30days");
  const [reportData, setReportData] = useState({
    deals: 0, avgRisk: 0, sessions: 0, reports: 0, recentDeals: [],
  });
  const [loading, setLoading] = useState(true);

  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";

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
    if (vertical === "property-mgmt") {
      return [
        { label: "Revenue", value: "--" },
        { label: "Occupancy Rate", value: "--" },
        { label: "Work Orders", value: "--" },
        { label: "Lease Renewals", value: "--" },
      ];
    }
    if (vertical === "real-estate") {
      return [
        { label: "Active Listings", value: "--" },
        { label: "Closings", value: "--" },
        { label: "Commission", value: "--" },
        { label: "Days on Market", value: "--" },
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
          style={{
            padding: "10px 16px",
            borderRadius: "12px",
            border: "1px solid var(--line)",
          }}
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
        {/* Analysis Activity */}
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">
              {vertical === "analyst" ? "Analysis Activity" : "Revenue Trend"}
            </div>
          </div>
          {vertical === "analyst" && reportData.recentDeals.length > 0 ? (
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
                          <td>
                            <span style={{ fontWeight: 600, color: getRiskColor(score) }}>{score}/100</span>
                          </td>
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
            <div
              style={{
                padding: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "300px",
                color: "var(--textMuted)",
                background: "#f8fafc",
                borderRadius: "8px",
                margin: "16px",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: 600 }}>No data yet</div>
              <div style={{ fontSize: "14px", textAlign: "center", maxWidth: "300px" }}>
                Reports will populate as you use the platform. Start by adding records or running AI workflows.
              </div>
            </div>
          )}
        </div>

        {/* Activity Summary */}
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Recent Activity</div>
          </div>
          {vertical === "analyst" && reportData.recentDeals.length > 0 ? (
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
