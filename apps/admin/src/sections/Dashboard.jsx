import React, { useState, useEffect } from "react";
import * as api from "../api/client";

export default function Dashboard() {
  const [kpis, setKpis] = useState({
    totalAssets: { value: "$0", trend: "+0%" },
    dtcCount: { value: "0", trend: "+0" },
    logbookCount: { value: "0", trend: "+0" },
    walletBalance: { value: "$0", trend: "$0" },
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(false);

  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      // Fetch DTCs for asset value
      const dtcsResult = await api.getDTCs({ vertical, jurisdiction });
      const dtcs = dtcsResult.dtcs || [];

      // Calculate total asset value
      const totalValue = dtcs.reduce((sum, dtc) => sum + (dtc.metadata?.value || 0), 0);

      // Fetch logbook entries for recent activity
      const logbookResult = await api.getLogbookEntries({ vertical, jurisdiction });
      const entries = logbookResult.entries || [];

      // Fetch wallet assets
      const walletResult = await api.getWalletAssets({ vertical, jurisdiction });
      const walletTotal = walletResult.assets ?
        Object.values(walletResult.assets).reduce((sum, cat) => sum + (cat.value || 0), 0) : 0;

      // Update KPIs
      setKpis({
        totalAssets: {
          value: `$${totalValue.toLocaleString()}`,
          trend: "+12.5%", // Could calculate from valuationHistory
        },
        dtcCount: {
          value: dtcs.length.toString(),
          trend: `+${dtcs.filter(d => {
            const created = new Date(d.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return created > weekAgo;
          }).length}`,
        },
        logbookCount: {
          value: entries.length.toString(),
          trend: `+${entries.filter(e => {
            const created = new Date(e.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return created > weekAgo;
          }).length}`,
        },
        walletBalance: {
          value: `$${walletTotal.toLocaleString()}`,
          trend: "$0",
        },
      });

      // Format recent activity from logbook entries
      const activity = entries.slice(0, 5).map(entry => ({
        id: entry.id,
        type: entry.entryType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        description: entry.dtcTitle || "Activity",
        date: new Date(entry.createdAt).toLocaleDateString(),
        status: "completed",
      }));

      setRecentActivity(activity);
    } catch (e) {
      console.error("Failed to load dashboard:", e);
    } finally {
      setLoading(false);
    }
  }

  const kpiArray = [
    { label: "Total Assets", ...kpis.totalAssets },
    { label: "My DTCs", ...kpis.dtcCount },
    { label: "Logbook Entries", ...kpis.logbookCount },
    { label: "Wallet Balance", ...kpis.walletBalance },
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
        {loading ? (
          <div className="card" style={{ padding: "24px", textAlign: "center" }}>
            Loading dashboard...
          </div>
        ) : (
          kpiArray.map((kpi, i) => (
          <div key={i} className="card kpiCard">
            <div className="kpiLabel">{kpi.label}</div>
            <div className="kpiValue">{kpi.value}</div>
            <div style={{ fontSize: "12px", marginTop: "4px", color: "#64748b" }}>
              {kpi.trend}
            </div>
          </div>
          ))
        )}
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
