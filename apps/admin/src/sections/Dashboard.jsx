import React from "react";

export default function Dashboard() {
  // Mock KPI data
  const kpis = [
    { label: "Total Assets", value: "$284,500", trend: "+12.5%" },
    { label: "My DTCs", value: "8", trend: "+2" },
    { label: "Logbook Entries", value: "47", trend: "+5" },
    { label: "Wallet Balance", value: "$2,840", trend: "-$120" },
  ];

  const recentActivity = [
    {
      id: 1,
      type: "DTC Created",
      description: "2022 Honda Civic - VIN ...3456",
      date: "2026-02-14",
      status: "completed",
    },
    {
      id: 2,
      type: "Logbook Entry",
      description: "Oil change at 35,000 miles",
      date: "2026-02-12",
      status: "completed",
    },
    {
      id: 3,
      type: "Credential Added",
      description: "B.S. Computer Science - UIUC",
      date: "2026-02-10",
      status: "completed",
    },
    {
      id: 4,
      type: "Escrow Created",
      description: "Vehicle title transfer - Pending",
      date: "2026-02-08",
      status: "processing",
    },
  ];

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Dashboard</h1>
          <p className="subtle">Welcome back! Here's your asset overview.</p>
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
            <div className="cardSub">Your latest actions and updates</div>
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
