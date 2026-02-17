import React, { useState } from "react";

/**
 * Reports - Business analytics and performance metrics
 */
export default function Reports() {
  const [dateRange, setDateRange] = useState("30days");
  const vertical = localStorage.getItem("VERTICAL") || "auto";

  const VERTICAL_LABELS = {
    auto: "Auto Dealer",
    analyst: "Investment Analyst",
    "real-estate": "Real Estate Brokerage",
    "property-mgmt": "Property Management",
    aviation: "Aviation",
    marine: "Marine",
  };

  function getKpiConfig() {
    if (vertical === "analyst") {
      return [
        { label: "Deals Analyzed", value: "--" },
        { label: "Avg Risk Score", value: "--" },
        { label: "AI Sessions", value: "--" },
        { label: "Reports Generated", value: "--" },
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
    // auto default
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
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
        {/* Revenue Chart Placeholder */}
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">
              {vertical === "analyst" ? "Analysis Activity" : "Revenue Trend"}
            </div>
          </div>
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
        </div>

        {/* Activity Summary */}
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Recent Activity</div>
          </div>
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--textMuted)", fontSize: "14px" }}>
            No activity recorded yet. Use the AI assistant or add records to see activity here.
          </div>
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
