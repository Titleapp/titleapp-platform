import React, { useState, useEffect } from "react";
import * as api from "../api/client";

const AUTO_WEEKLY_REVENUE = [
  { week: "Week 1", sales: 287400, units: 11 },
  { week: "Week 2", sales: 318600, units: 12 },
  { week: "Week 3", sales: 265200, units: 10 },
  { week: "Week 4", sales: 376600, units: 14 },
];

const AUTO_RECENT_EVENTS = [
  { id: 1, time: "2h ago", text: "AI identified lease expiration upsell -- Maria Gonzalez, 2024 Corolla LE. Potential: $2,800", color: "#7c3aed" },
  { id: 2, time: "5h ago", text: "Jake Rivera closed deal -- Robert Chen, 2025 Camry XSE, $32,800", color: "#16a34a" },
  { id: 3, time: "8h ago", text: "AI sent service reminder -- Charles Cox, 60K Major Service", color: "#7c3aed" },
  { id: 4, time: "1d ago", text: "Trade-in appraisal completed -- 2021 BMW X3 xDrive30i, $28,500", color: "#d97706" },
  { id: 5, time: "1d ago", text: "AI drafted conquest offer -- Amanda Liu, 2025 RAV4 XLE", color: "#7c3aed" },
  { id: 6, time: "2d ago", text: "Lisa Chen moved Mark Brown to Negotiation -- 2025 RAV4 XLE, $37,500", color: "#2563eb" },
  { id: 7, time: "2d ago", text: "AI scheduled test drive -- Sandra Lee, 2025 Highlander XLE", color: "#7c3aed" },
  { id: 8, time: "3d ago", text: "Service-to-sales flag -- Angela Williams, 2021 Prius Prime, hybrid battery aging", color: "#dc2626" },
  { id: 9, time: "4d ago", text: "AI sent post-purchase follow-up -- 12 customers, 7-day check-in", color: "#7c3aed" },
  { id: 10, time: "5d ago", text: "Inventory alert -- 2021 BMW X3 hit 143 days on lot, recommend price reduction", color: "#dc2626" },
];

const AUTO_SALES_BY_SOURCE = [
  { source: "Walk-In", sales: 12, revenue: 318600 },
  { source: "Google Ads", sales: 10, revenue: 265500 },
  { source: "Meta (FB/IG)", sales: 8, revenue: 212400 },
  { source: "TrueCar", sales: 5, revenue: 132700 },
  { source: "AutoTrader", sales: 4, revenue: 106200 },
  { source: "Cars.com", sales: 3, revenue: 79600 },
  { source: "CarGurus", sales: 2, revenue: 53100 },
  { source: "Referral", sales: 2, revenue: 53100 },
  { source: "Direct Mail", sales: 1, revenue: 26600 },
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
        { label: "Total Revenue", value: "$1,247,800" },
        { label: "Total Sales", value: "47" },
        { label: "Active Customers", value: "152" },
        { label: "Avg Deal Size", value: "$26,549" },
      ];
    }
    return [
      { label: "Total Revenue", value: "--" },
      { label: "Total Sales", value: "--" },
      { label: "Active Customers", value: "--" },
      { label: "Avg Deal Size", value: "--" },
    ];
  }

  function exportCSV() {
    const rows = [
      ["TitleApp AI -- Monthly Report"],
      ["Date Range", dateRange],
      [""],
      ["KPI", "Value"],
      ...getKpiConfig().map(k => [k.label, k.value]),
      [""],
      ["Revenue Trend"],
      ["Week", "Revenue", "Units"],
      ...AUTO_WEEKLY_REVENUE.map(w => [w.week, `$${w.sales.toLocaleString()}`, w.units]),
      [""],
      ["Sales by Source"],
      ["Source", "Sales", "Revenue"],
      ...AUTO_SALES_BY_SOURCE.map(s => [s.source, s.sales, `$${s.revenue.toLocaleString()}`]),
      [""],
      ["Recent Activity"],
      ["Time", "Event"],
      ...AUTO_RECENT_EVENTS.map(e => [e.time, e.text]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `titleapp-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const win = window.open("", "_blank");
    const kpis = getKpiConfig();
    win.document.write(`<html><head><title>TitleApp AI Report</title><style>
      body{font-family:system-ui,sans-serif;padding:40px;color:#1e293b}
      h1{font-size:24px;margin-bottom:4px}
      h2{font-size:18px;margin-top:24px;margin-bottom:8px;color:#475569}
      .sub{color:#64748b;font-size:14px;margin-bottom:24px}
      table{border-collapse:collapse;width:100%;margin-bottom:16px}
      th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px}
      th{font-weight:700;background:#f8fafc}
      .kpis{display:flex;gap:16px;margin-bottom:24px}
      .kpi{flex:1;padding:16px;border:1px solid #e2e8f0;border-radius:8px;text-align:center}
      .kpi-label{font-size:12px;color:#64748b;text-transform:uppercase}
      .kpi-value{font-size:24px;font-weight:800;margin-top:4px}
      @media print{body{padding:20px}}
    </style></head><body>`);
    win.document.write(`<h1>TitleApp AI -- Monthly Report</h1><div class="sub">Generated ${new Date().toLocaleDateString()}</div>`);
    win.document.write(`<div class="kpis">${kpis.map(k => `<div class="kpi"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>`).join("")}</div>`);
    win.document.write(`<h2>Revenue Trend</h2><table><tr><th>Week</th><th>Revenue</th><th>Units</th></tr>${AUTO_WEEKLY_REVENUE.map(w => `<tr><td>${w.week}</td><td>$${w.sales.toLocaleString()}</td><td>${w.units}</td></tr>`).join("")}</table>`);
    win.document.write(`<h2>Sales by Source</h2><table><tr><th>Source</th><th>Sales</th><th>Revenue</th></tr>${AUTO_SALES_BY_SOURCE.map(s => `<tr><td>${s.source}</td><td>${s.sales}</td><td>$${s.revenue.toLocaleString()}</td></tr>`).join("")}</table>`);
    win.document.write(`<h2>Recent Activity</h2><table><tr><th>Time</th><th>Event</th></tr>${AUTO_RECENT_EVENTS.map(e => `<tr><td>${e.time}</td><td>${e.text}</td></tr>`).join("")}</table>`);
    win.document.write(`</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }

  function exportExcel() {
    // Generate CSV with .xlsx extension as lightweight Excel-compatible export
    const rows = [
      ["TitleApp AI -- Monthly Report"],
      ["Date Range", dateRange],
      [""],
      ["KPI", "Value"],
      ...getKpiConfig().map(k => [k.label, k.value]),
      [""],
      ["Revenue Trend"],
      ["Week", "Revenue", "Units"],
      ...AUTO_WEEKLY_REVENUE.map(w => [w.week, w.sales, w.units]),
      [""],
      ["Sales by Source"],
      ["Source", "Sales", "Revenue"],
      ...AUTO_SALES_BY_SOURCE.map(s => [s.source, s.sales, s.revenue]),
      [""],
      ["Recent Activity"],
      ["Time", "Event"],
      ...AUTO_RECENT_EVENTS.map(e => [e.time, e.text]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join("\t")).join("\n");
    const blob = new Blob([csv], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `titleapp-report-${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis = getKpiConfig();
  const maxRevenue = Math.max(...AUTO_WEEKLY_REVENUE.map(w => w.sales));
  const maxSourceSales = Math.max(...AUTO_SALES_BY_SOURCE.map(s => s.sales));

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
        {/* Revenue Trend */}
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
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#1e293b" }}>${(w.sales / 1000).toFixed(0)}K</div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>{w.units} units</div>
                    <div style={{ width: "100%", background: "#7c3aed", borderRadius: "4px 4px 0 0", height: `${(w.sales / maxRevenue) * 130}px`, minHeight: "20px" }} />
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>{w.week}</div>
                  </div>
                ))}
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
          ) : !isAuto ? (
            <div style={{ padding: "32px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px", color: "var(--textMuted)", background: "#f8fafc", borderRadius: "8px", margin: "16px", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "16px", fontWeight: 600 }}>No data yet</div>
              <div style={{ fontSize: "14px", textAlign: "center", maxWidth: "300px" }}>
                Reports will populate as you use the platform.
              </div>
            </div>
          ) : null}
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
              No activity recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Sales by Source -- Auto only */}
      {isAuto && (
        <div className="card" style={{ marginTop: "16px" }}>
          <div className="cardHeader">
            <div className="cardTitle">Sales by Source</div>
          </div>
          <div style={{ padding: "16px" }}>
            <div className="tableWrap">
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Sales</th>
                    <th>Revenue</th>
                    <th style={{ width: "40%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {AUTO_SALES_BY_SOURCE.map((s, i) => (
                    <tr key={i}>
                      <td className="tdStrong">{s.source}</td>
                      <td>{s.sales}</td>
                      <td style={{ fontWeight: 600 }}>${s.revenue.toLocaleString()}</td>
                      <td>
                        <div style={{ width: `${(s.sales / maxSourceSales) * 100}%`, height: "12px", background: "#7c3aed", borderRadius: "6px", minWidth: "8px" }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className="card" style={{ marginTop: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Export Reports</div>
            <div className="cardSub">Download data for external analysis</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", gap: "12px" }}>
          <button className="iconBtn" onClick={exportCSV}>Export as CSV</button>
          <button className="iconBtn" onClick={exportPDF}>Export as PDF</button>
          <button className="iconBtn" onClick={exportExcel}>Export as Excel</button>
        </div>
      </div>
    </div>
  );
}
