import React, { useState } from "react";

/**
 * Reports - Analytics and summaries of assets and activity
 */
export default function Reports() {
  const [dateRange, setDateRange] = useState("year");

  // Mock data
  const assetSummary = {
    totalValue: "$287,450",
    vehicles: { count: 2, value: "$58,000" },
    property: { count: 1, value: "$225,000" },
    credentials: { count: 3, value: "$4,450" },
  };

  const recentActivity = [
    {
      date: "2026-02-14",
      type: "Maintenance",
      description: "Oil Change - 2022 Honda Civic",
      amount: "$45.00",
    },
    {
      date: "2026-02-10",
      type: "Inspection",
      description: "Annual Safety Inspection - 2022 Honda Civic",
      amount: "$35.00",
    },
    {
      date: "2026-02-08",
      type: "Payment",
      description: "Property Tax Payment - 123 Main Street",
      amount: "$3,250.00",
    },
    {
      date: "2026-01-20",
      type: "Credential",
      description: "Machine Learning Specialization - Stanford Online",
      amount: "$0.00",
    },
  ];

  const upcomingTasks = [
    { task: "Vehicle Registration Renewal", due: "2026-03-15", priority: "High" },
    { task: "Property Tax Q2 Payment", due: "2026-05-01", priority: "Medium" },
    { task: "Next Oil Change", due: "2026-05-01", priority: "Low" },
  ];

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Reports</h1>
          <p className="subtle">Analytics and summaries of your assets and activity</p>
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
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Asset Summary */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div className="cardTitle">Asset Summary</div>
        </div>
        <div className="kpiRow" style={{ padding: "16px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "32px", fontWeight: 700, color: "var(--accent)" }}>
              {assetSummary.totalValue}
            </div>
            <div style={{ fontSize: "13px", color: "var(--textMuted)", marginTop: "4px" }}>
              Total Asset Value
            </div>
          </div>
        </div>
      </div>

      {/* Asset Breakdown */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Vehicles</div>
          <div className="kpiValue">{assetSummary.vehicles.value}</div>
          <div className="kpiChange">{assetSummary.vehicles.count} assets</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Property</div>
          <div className="kpiValue">{assetSummary.property.value}</div>
          <div className="kpiChange">{assetSummary.property.count} asset</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Credentials</div>
          <div className="kpiValue">{assetSummary.credentials.value}</div>
          <div className="kpiChange">{assetSummary.credentials.count} assets</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginTop: "16px" }}>
        {/* Recent Activity */}
        <div className="card">
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
                      <span className="badge">{activity.type}</span>
                    </td>
                    <td>{activity.description}</td>
                    <td className="tdStrong">{activity.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Upcoming Tasks</div>
          </div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {upcomingTasks.map((task, index) => (
              <div
                key={index}
                style={{
                  paddingBottom: "12px",
                  borderBottom: index < upcomingTasks.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>
                  {task.task}
                </div>
                <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                  Due: {new Date(task.due).toLocaleDateString()}
                </div>
                <span
                  className={`badge ${
                    task.priority === "High"
                      ? "badge-completed"
                      : task.priority === "Medium"
                      ? ""
                      : ""
                  }`}
                  style={{
                    marginTop: "6px",
                    display: "inline-block",
                    fontSize: "11px",
                  }}
                >
                  {task.priority} Priority
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Net Worth Trend Placeholder */}
      <div className="card" style={{ marginTop: "16px" }}>
        <div className="cardHeader">
          <div className="cardTitle">Net Worth Trend</div>
        </div>
        <div
          style={{
            padding: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "250px",
            color: "var(--textMuted)",
            background: "#f8fafc",
            borderRadius: "8px",
            margin: "16px",
          }}
        >
          [Chart: Net worth over time - integrate Chart.js or similar]
        </div>
      </div>

      {/* Export Options */}
      <div className="card" style={{ marginTop: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Export Reports</div>
            <div className="cardSub">Download your data for tax preparation or records</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", gap: "12px" }}>
          <button className="iconBtn">Export as PDF</button>
          <button className="iconBtn">Export as CSV</button>
          <button className="iconBtn">Tax Summary</button>
        </div>
      </div>
    </div>
  );
}
