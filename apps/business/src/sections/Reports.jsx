import React, { useState } from "react";

/**
 * Reports - Business analytics and performance metrics
 */
export default function Reports() {
  const [dateRange, setDateRange] = useState("30days");

  // Mock analytics data
  const kpis = {
    revenue: { value: "$127,450", change: "+12.5%", positive: true },
    sales: { value: "47", change: "+8.2%", positive: true },
    customers: { value: "234", change: "+15.3%", positive: true },
    avgDealSize: { value: "$2,712", change: "-3.1%", positive: false },
  };

  const topProducts = [
    { name: "2024 Honda Accord", sales: 12, revenue: "$34,200" },
    { name: "2023 Toyota Camry", sales: 8, revenue: "$28,400" },
    { name: "Premium Oil Change", sales: 45, revenue: "$3,600" },
    { name: "Tire Rotation", sales: 32, revenue: "$1,120" },
  ];

  const recentActivity = [
    {
      date: "2026-02-14",
      type: "Sale",
      description: "2024 Honda Accord to John Smith",
      amount: "$28,500",
    },
    {
      date: "2026-02-13",
      type: "Service",
      description: "Premium Oil Change for Sarah Lee",
      amount: "$79.99",
    },
    {
      date: "2026-02-13",
      type: "Sale",
      description: "2023 Toyota Camry to Mike Johnson",
      amount: "$25,900",
    },
    {
      date: "2026-02-12",
      type: "Service",
      description: "Brake Inspection for Lisa Park",
      amount: "$120.00",
    },
  ];

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
        <div className="card kpiCard">
          <div className="kpiLabel">Total Revenue</div>
          <div className="kpiValue">{kpis.revenue.value}</div>
          <div
            className="kpiChange"
            style={{ color: kpis.revenue.positive ? "var(--success)" : "var(--danger)" }}
          >
            {kpis.revenue.change}
          </div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Total Sales</div>
          <div className="kpiValue">{kpis.sales.value}</div>
          <div
            className="kpiChange"
            style={{ color: kpis.sales.positive ? "var(--success)" : "var(--danger)" }}
          >
            {kpis.sales.change}
          </div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Active Customers</div>
          <div className="kpiValue">{kpis.customers.value}</div>
          <div
            className="kpiChange"
            style={{ color: kpis.customers.positive ? "var(--success)" : "var(--danger)" }}
          >
            {kpis.customers.change}
          </div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Avg Deal Size</div>
          <div className="kpiValue">{kpis.avgDealSize.value}</div>
          <div
            className="kpiChange"
            style={{ color: kpis.avgDealSize.positive ? "var(--success)" : "var(--danger)" }}
          >
            {kpis.avgDealSize.change}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
        {/* Revenue Chart Placeholder */}
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Revenue Trend</div>
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
            }}
          >
            [Chart: Revenue over time - integrate Chart.js or similar]
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Top Products</div>
          </div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {topProducts.map((product, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  paddingBottom: "12px",
                  borderBottom: index < topProducts.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>{product.name}</div>
                  <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                    {product.sales} sales
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>{product.revenue}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card" style={{ marginTop: "16px" }}>
        <div className="cardHeader">
          <div className="cardTitle">Recent Activity</div>
        </div>
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((activity, index) => (
                <tr key={index}>
                  <td className="tdMuted">{new Date(activity.date).toLocaleDateString()}</td>
                  <td>
                    <span
                      className={`badge ${
                        activity.type === "Sale" ? "badge-completed" : ""
                      }`}
                    >
                      {activity.type}
                    </span>
                  </td>
                  <td>{activity.description}</td>
                  <td className="tdStrong">{activity.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
