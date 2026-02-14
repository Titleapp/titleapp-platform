import React from "react";

export default function Dashboard() {
  // Mock KPI data for business
  const kpis = [
    { label: "Revenue (MTD)", value: "$127,400", trend: "+18.2%" },
    { label: "Active Deals", value: "23", trend: "+5" },
    { label: "AI Conversations", value: "1,248", trend: "+342" },
    { label: "Customer NPS", value: "94", trend: "+2" },
  ];

  const recentActivity = [
    {
      id: 1,
      type: "Deal Created",
      description: "2024 Toyota Camry - John Smith",
      date: "2026-02-14",
      status: "processing",
    },
    {
      id: 2,
      type: "AI Chat",
      description: "GPT analyzed credit report for Sarah Lee",
      date: "2026-02-14",
      status: "completed",
    },
    {
      id: 3,
      type: "Appointment",
      description: "Service appointment - Mike Johnson",
      date: "2026-02-13",
      status: "completed",
    },
    {
      id: 4,
      type: "Inventory Added",
      description: "2023 Honda Accord - VIN ...7890",
      date: "2026-02-12",
      status: "completed",
    },
  ];

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Dashboard</h1>
          <p className="subtle">Welcome to Velocity Motors - Your business overview</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpiRow">
        {kpis.map((kpi, i) => (
          <div key={i} className="card kpiCard">
            <div className="kpiLabel">{kpi.label}</div>
            <div className="kpiValue">{kpi.value}</div>
            <div style={{ fontSize: "12px", marginTop: "4px", color: "#64748b" }}>
              {kpi.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Recent Activity</div>
            <div className="cardSub">Latest business actions and AI worker activity</div>
          </div>
          <button className="iconBtn">View All</button>
        </div>
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((item) => (
                <tr key={item.id}>
                  <td className="tdStrong">{item.type}</td>
                  <td>{item.description}</td>
                  <td className="tdMuted">{item.date}</td>
                  <td>
                    <span className={`badge badge-${item.status}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
