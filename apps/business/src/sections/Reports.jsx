import React, { useState, useEffect } from "react";
import * as api from "../api/client";

// ── Auto data ──
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

// ── Analyst data ──
const ANALYST_WEEKLY_PERFORMANCE = [
  { week: "Week 1", value: 41200000, pctChange: 1.2 },
  { week: "Week 2", value: 42100000, pctChange: 2.2 },
  { week: "Week 3", value: 41800000, pctChange: -0.7 },
  { week: "Week 4", value: 42800000, pctChange: 2.4 },
];

const ANALYST_RECENT_EVENTS = [
  { id: 1, time: "1h ago", text: "NovaTech Corp Q4 earnings beat -- EPS $1.42 vs $1.27 consensus (+12%)", color: "#16a34a" },
  { id: 2, time: "3h ago", text: "Sentinel Defense dropped 6.2% on contract delay -- position at 4.2% of portfolio", color: "#dc2626" },
  { id: 3, time: "5h ago", text: "DCF model updated for Meridian Healthcare -- fair value revised to $148 from $156", color: "#7c3aed" },
  { id: 4, time: "8h ago", text: "LP quarterly letter drafted for Blackstone Partners -- pending compliance review", color: "#2563eb" },
  { id: 5, time: "1d ago", text: "Healthcare IT sector up 4.2% MTD -- 3 portfolio companies in sector", color: "#16a34a" },
  { id: 6, time: "1d ago", text: "TechBridge acquisition target screened -- $45M revenue, risk score 58/100", color: "#d97706" },
  { id: 7, time: "2d ago", text: "Compliance flagged LinkedIn post -- performance claim needs net-of-fees disclosure", color: "#dc2626" },
  { id: 8, time: "2d ago", text: "Research gap: 3 company models older than 30 days need updating", color: "#d97706" },
  { id: 9, time: "3d ago", text: "Smith Family Office LP inquiry responded -- meeting scheduled for next week", color: "#7c3aed" },
  { id: 10, time: "4d ago", text: "Monthly portfolio risk report generated -- VaR within acceptable range", color: "#16a34a" },
];

const ANALYST_PERFORMANCE_BY_SECTOR = [
  { sector: "Technology", pctReturn: 12.3, value: 12840000 },
  { sector: "Healthcare", pctReturn: 6.1, value: 8560000 },
  { sector: "Industrials", pctReturn: 4.8, value: 6420000 },
  { sector: "Financial Services", pctReturn: 3.2, value: 5140000 },
  { sector: "Energy", pctReturn: -2.4, value: 4280000 },
  { sector: "Consumer", pctReturn: 1.7, value: 3210000 },
  { sector: "Real Estate", pctReturn: -0.8, value: 2350000 },
];

// ── Vault data ──
const VAULT_RECENT_EVENTS = [
  { id: 1, time: "Today", text: "Vehicle registration scanned -- 2022 RAV4 XLE, expires Aug 2026", color: "#7c3aed" },
  { id: 2, time: "Today", text: "Market value updated -- 2022 RAV4 XLE now $27,500 (was $28,200)", color: "#d97706" },
  { id: 3, time: "Yesterday", text: "Homeowner's insurance filed -- $425K dwelling coverage, renews Nov 2026", color: "#16a34a" },
  { id: 4, time: "3 days ago", text: "Auto insurance payment reminder sent -- $142/month due on the 15th", color: "#2563eb" },
  { id: 5, time: "5 days ago", text: "Passport expiration flagged -- expires Mar 2028, 24 months remaining", color: "#dc2626" },
];

const VAULT_ASSETS_BY_CATEGORY = [
  { category: "Property", value: 425000, count: 1 },
  { category: "Vehicles", value: 54000, count: 2 },
  { category: "Financial Accounts", value: 38000, count: 3 },
  { category: "Documents", value: 0, count: 6 },
];

// ── Real Estate data ──
const RE_WEEKLY_COMMISSION = [
  { week: "Week 1", commission: 8500, deals: 1 },
  { week: "Week 2", commission: 14200, deals: 2 },
  { week: "Week 3", commission: 0, deals: 0 },
  { week: "Week 4", commission: 12800, deals: 1 },
];

const RE_RECENT_EVENTS = [
  { id: 1, time: "2h ago", text: "AI confirmed showing -- Amanda Liu, 567 Mandarin Rd, Saturday 10 AM", color: "#7c3aed" },
  { id: 2, time: "5h ago", text: "Price reduction recommended -- 3421 Beach Blvd, 45 DOM, suggest $379K", color: "#dc2626" },
  { id: 3, time: "8h ago", text: "Lease renewal drafted -- James Lopez, San Marco TH-1, $1,750/mo (+3%)", color: "#2563eb" },
  { id: 4, time: "1d ago", text: "Rent reminder sent -- Kevin Williams, 30 days past due, $1,850 balance", color: "#d97706" },
  { id: 5, time: "1d ago", text: "Emergency maintenance dispatched -- Riverside 1A water heater, ABC Plumbing", color: "#dc2626" },
  { id: 6, time: "2d ago", text: "CMA generated -- 432 Ponte Vedra Blvd, market suggests $695K vs listed $725K", color: "#7c3aed" },
  { id: 7, time: "2d ago", text: "New lead -- Sarah Anderson, $400-500K budget, Zillow inquiry", color: "#16a34a" },
  { id: 8, time: "3d ago", text: "Transaction alert -- 1893 San Jose Blvd inspection contingency expires in 3 days", color: "#d97706" },
  { id: 9, time: "3d ago", text: "Vacancy marketing -- Southside Flats Unit 3, 45 days vacant, rent reduced to $1,150", color: "#dc2626" },
  { id: 10, time: "4d ago", text: "Owner report sent -- Riverside Apartments January, net to owner $11,200", color: "#16a34a" },
];

const RE_PERFORMANCE_BREAKDOWN = [
  { category: "Listing Commissions", count: 4, revenue: 18200 },
  { category: "Buyer Commissions", count: 4, revenue: 17300 },
  { category: "PM Management Fees", count: 28, revenue: 3740 },
  { category: "Leasing Fees", count: 2, revenue: 700 },
  { category: "Referral Income", count: 1, revenue: 1500 },
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
  const isAnalyst = vertical === "analyst";
  const isVault = vertical === "consumer";
  const isRealEstate = vertical === "real-estate";

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
    if (isAnalyst) {
      return [
        { label: "Portfolio Value", value: "$42.8M" },
        { label: "Active Positions", value: "23" },
        { label: "YTD Return", value: "+8.4%" },
        { label: "Research Output", value: "15 memos" },
      ];
    }
    if (isVault) {
      return [
        { label: "Total Assets Tracked", value: "5" },
        { label: "Total Documents", value: "12" },
        { label: "Estimated Net Worth", value: "$382,000" },
        { label: "Upcoming Deadlines", value: "3" },
      ];
    }
    if (isRealEstate) {
      return [
        { label: "Commission YTD", value: "$127,500" },
        { label: "Deals Closed", value: "8" },
        { label: "Monthly PM Revenue", value: "$3,740" },
        { label: "Occupancy Rate", value: "85.7%" },
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

  // Pick the right data sets
  const weeklyData = isRealEstate ? RE_WEEKLY_COMMISSION : isAuto ? AUTO_WEEKLY_REVENUE : isAnalyst ? ANALYST_WEEKLY_PERFORMANCE : null;
  const recentEvents = isRealEstate ? RE_RECENT_EVENTS : isAuto ? AUTO_RECENT_EVENTS : isAnalyst ? ANALYST_RECENT_EVENTS : VAULT_RECENT_EVENTS;
  const breakdownData = isRealEstate ? RE_PERFORMANCE_BREAKDOWN : isAuto ? AUTO_SALES_BY_SOURCE : isAnalyst ? ANALYST_PERFORMANCE_BY_SECTOR : VAULT_ASSETS_BY_CATEGORY;

  function exportCSV() {
    const kpis = getKpiConfig();
    const rows = [
      ["TitleApp AI -- Monthly Report"],
      ["Date Range", dateRange],
      ["Vertical", vertical],
      [""],
      ["KPI", "Value"],
      ...kpis.map(k => [k.label, k.value]),
      [""],
      ["Recent Activity"],
      ["Time", "Event"],
      ...recentEvents.map(e => [e.time, e.text]),
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
    win.document.write(`<h1>TitleApp AI -- ${isVault ? "Vault" : "Business"} Report</h1><div class="sub">Generated ${new Date().toLocaleDateString()}</div>`);
    win.document.write(`<div class="kpis">${kpis.map(k => `<div class="kpi"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>`).join("")}</div>`);
    win.document.write(`<h2>Recent Activity</h2><table><tr><th>Time</th><th>Event</th></tr>${recentEvents.map(e => `<tr><td>${e.time}</td><td>${e.text}</td></tr>`).join("")}</table>`);
    win.document.write(`</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }

  function exportExcel() {
    const kpis = getKpiConfig();
    const rows = [
      ["TitleApp AI -- Monthly Report"],
      ["Date Range", dateRange],
      [""],
      ["KPI", "Value"],
      ...kpis.map(k => [k.label, k.value]),
      [""],
      ["Recent Activity"],
      ["Time", "Event"],
      ...recentEvents.map(e => [e.time, e.text]),
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

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Reports</h1>
          <p className="subtle">{isVault ? "Vault analytics and asset tracking" : "Business analytics and performance metrics"}</p>
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
        {/* Main Chart Area */}
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">
              {isRealEstate ? "Commission Trend" : isAnalyst ? "Portfolio Performance" : isVault ? "Asset Summary" : "Revenue Trend"}
            </div>
          </div>
          {isAuto && weeklyData ? (
            <div style={{ padding: "16px" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", height: "180px", padding: "0 8px" }}>
                {weeklyData.map((w, i) => {
                  const maxVal = Math.max(...weeklyData.map(x => x.sales));
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#1e293b" }}>${(w.sales / 1000).toFixed(0)}K</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>{w.units} units</div>
                      <div style={{ width: "100%", background: "#7c3aed", borderRadius: "4px 4px 0 0", height: `${(w.sales / maxVal) * 130}px`, minHeight: "20px" }} />
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>{w.week}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : isAnalyst ? (
            <div style={{ padding: "16px" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", height: "180px", padding: "0 8px" }}>
                {ANALYST_WEEKLY_PERFORMANCE.map((w, i) => {
                  const maxVal = Math.max(...ANALYST_WEEKLY_PERFORMANCE.map(x => x.value));
                  const minVal = Math.min(...ANALYST_WEEKLY_PERFORMANCE.map(x => x.value));
                  const range = maxVal - minVal || 1;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#1e293b" }}>${(w.value / 1000000).toFixed(1)}M</div>
                      <div style={{ fontSize: "10px", color: w.pctChange >= 0 ? "#16a34a" : "#dc2626" }}>{w.pctChange >= 0 ? "+" : ""}{w.pctChange}%</div>
                      <div style={{ width: "100%", background: w.pctChange >= 0 ? "#16a34a" : "#dc2626", borderRadius: "4px 4px 0 0", height: `${40 + ((w.value - minVal) / range) * 100}px`, minHeight: "20px" }} />
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>{w.week}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : isRealEstate && weeklyData ? (
            <div style={{ padding: "16px" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", height: "180px", padding: "0 8px" }}>
                {weeklyData.map((w, i) => {
                  const maxVal = Math.max(...weeklyData.map(x => x.commission));
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#1e293b" }}>${(w.commission / 1000).toFixed(1)}K</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>{w.deals} deal{w.deals !== 1 ? "s" : ""}</div>
                      <div style={{ width: "100%", background: "#16a34a", borderRadius: "4px 4px 0 0", height: `${maxVal > 0 ? (w.commission / maxVal) * 130 : 0}px`, minHeight: w.commission > 0 ? "20px" : "4px" }} />
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>{w.week}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : isVault ? (
            <div style={{ padding: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {VAULT_ASSETS_BY_CATEGORY.map((cat, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "120px", fontSize: "13px", fontWeight: 600, color: "#334155" }}>{cat.category}</div>
                    <div style={{ flex: 1, height: "24px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                      {cat.value > 0 && (
                        <div style={{ height: "100%", width: `${Math.max(5, (cat.value / 425000) * 100)}%`, background: "#7c3aed", borderRadius: "6px" }} />
                      )}
                    </div>
                    <div style={{ width: "100px", textAlign: "right", fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                      {cat.value > 0 ? `$${cat.value.toLocaleString()}` : `${cat.count} docs`}
                    </div>
                    <div style={{ width: "40px", textAlign: "right", fontSize: "12px", color: "#64748b" }}>({cat.count})</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: "32px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px", color: "var(--textMuted)", background: "#f8fafc", borderRadius: "8px", margin: "16px", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "16px", fontWeight: 600 }}>No data yet</div>
              <div style={{ fontSize: "14px", textAlign: "center", maxWidth: "300px" }}>
                Reports will populate as you use the platform.
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Recent Activity</div>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {recentEvents.slice(0, 8).map((evt) => (
              <div key={evt.id} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: evt.color, flexShrink: 0, marginTop: "5px" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.5 }}>{evt.text}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{evt.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Breakdown Section */}
      {(isAuto || isAnalyst || isRealEstate) && (
        <div className="card" style={{ marginTop: "16px" }}>
          <div className="cardHeader">
            <div className="cardTitle">{isRealEstate ? "Revenue Breakdown" : isAnalyst ? "Performance by Sector" : "Sales by Source"}</div>
          </div>
          <div style={{ padding: "16px" }}>
            <div className="tableWrap">
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>{isRealEstate ? "Category" : isAnalyst ? "Sector" : "Source"}</th>
                    <th>{isRealEstate ? "Count" : isAnalyst ? "YTD Return" : "Sales"}</th>
                    <th>{isAnalyst ? "Portfolio Value" : "Revenue"}</th>
                    <th style={{ width: "40%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {isAuto ? AUTO_SALES_BY_SOURCE.map((s, i) => {
                    const maxVal = Math.max(...AUTO_SALES_BY_SOURCE.map(x => x.sales));
                    return (
                      <tr key={i}>
                        <td className="tdStrong">{s.source}</td>
                        <td>{s.sales}</td>
                        <td style={{ fontWeight: 600 }}>${s.revenue.toLocaleString()}</td>
                        <td>
                          <div style={{ width: `${(s.sales / maxVal) * 100}%`, height: "12px", background: "#7c3aed", borderRadius: "6px", minWidth: "8px" }} />
                        </td>
                      </tr>
                    );
                  }) : isRealEstate ? RE_PERFORMANCE_BREAKDOWN.map((s, i) => {
                    const maxVal = Math.max(...RE_PERFORMANCE_BREAKDOWN.map(x => x.revenue));
                    return (
                      <tr key={i}>
                        <td className="tdStrong">{s.category}</td>
                        <td>{s.count}</td>
                        <td style={{ fontWeight: 600 }}>${s.revenue.toLocaleString()}</td>
                        <td>
                          <div style={{ width: `${(s.revenue / maxVal) * 100}%`, height: "12px", background: "#16a34a", borderRadius: "6px", minWidth: "8px" }} />
                        </td>
                      </tr>
                    );
                  }) : ANALYST_PERFORMANCE_BY_SECTOR.map((s, i) => {
                    const maxVal = Math.max(...ANALYST_PERFORMANCE_BY_SECTOR.map(x => Math.abs(x.pctReturn)));
                    return (
                      <tr key={i}>
                        <td className="tdStrong">{s.sector}</td>
                        <td style={{ fontWeight: 600, color: s.pctReturn >= 0 ? "#16a34a" : "#dc2626" }}>
                          {s.pctReturn >= 0 ? "+" : ""}{s.pctReturn}%
                        </td>
                        <td style={{ fontWeight: 600 }}>${(s.value / 1000000).toFixed(1)}M</td>
                        <td>
                          <div style={{ width: `${(Math.abs(s.pctReturn) / maxVal) * 100}%`, height: "12px", background: s.pctReturn >= 0 ? "#16a34a" : "#dc2626", borderRadius: "6px", minWidth: "8px" }} />
                        </td>
                      </tr>
                    );
                  })}
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
          {!isVault && <button className="iconBtn" onClick={exportExcel}>Export as Excel</button>}
        </div>
      </div>
    </div>
  );
}
