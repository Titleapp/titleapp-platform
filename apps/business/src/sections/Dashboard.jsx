import React, { useState, useEffect } from "react";
import * as api from "../api/client";

export default function Dashboard() {
  const [kpis, setKpis] = useState({
    revenue: { value: "$0", trend: "+0%" },
    activeDeals: { value: "0", trend: "+0" },
    aiConversations: { value: "0", trend: "+0" },
    customers: { value: "0", trend: "+0" },
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
      // Fetch inventory for revenue calculation
      const inventoryResult = await api.getInventory({ vertical, jurisdiction });
      const inventory = inventoryResult.inventory || [];

      // Calculate total revenue potential
      const totalRevenue = inventory
        .filter(i => i.status === "available")
        .reduce((sum, i) => sum + (i.price || 0), 0);

      // Fetch customers
      const customersResult = await api.getCustomers({ vertical, jurisdiction });
      const customers = customersResult.customers || [];

      // Fetch AI activity
      const aiResult = await api.getAIActivity({ vertical, jurisdiction, limit: 100 });
      const aiActivity = aiResult.activity || [];

      // Fetch appointments
      const appointmentsResult = await api.getAppointments({ vertical, jurisdiction });
      const appointments = appointmentsResult.appointments || [];

      // Update KPIs
      setKpis({
        revenue: {
          value: `$${totalRevenue.toLocaleString()}`,
          trend: "+18.2%",
        },
        activeDeals: {
          value: inventory.filter(i => i.status === "available").length.toString(),
          trend: `+${inventory.filter(i => {
            const created = new Date(i.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return created > weekAgo;
          }).length}`,
        },
        aiConversations: {
          value: aiActivity.length.toString(),
          trend: `+${aiActivity.filter(a => {
            const created = new Date(a.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return created > weekAgo;
          }).length}`,
        },
        customers: {
          value: customers.length.toString(),
          trend: `+${customers.filter(c => {
            const created = new Date(c.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return created > weekAgo;
          }).length}`,
        },
      });

      // Build recent activity from multiple sources
      const activity = [
        ...inventory.slice(0, 2).map(i => ({
          id: `inv-${i.id}`,
          type: "Inventory Added",
          description: `${i.metadata?.make || ""} ${i.metadata?.model || ""} - ${i.status}`,
          date: new Date(i.createdAt).toLocaleDateString(),
          status: i.status,
        })),
        ...aiActivity.slice(0, 2).map(a => ({
          id: `ai-${a.id}`,
          type: "AI Chat",
          description: `Workflow ${a.workflowId} - ${a.status}`,
          date: new Date(a.createdAt).toLocaleDateString(),
          status: a.status,
        })),
        ...appointments.slice(0, 2).map(a => ({
          id: `appt-${a.id}`,
          type: "Appointment",
          description: `${a.customerName} - ${a.type}`,
          date: new Date(a.datetime).toLocaleDateString(),
          status: a.status,
        })),
      ].slice(0, 5);

      setRecentActivity(activity);
    } catch (e) {
      console.error("Failed to load dashboard:", e);
    } finally {
      setLoading(false);
    }
  }

  const kpiArray = [
    { label: "Inventory Value", ...kpis.revenue },
    { label: "Available Units", ...kpis.activeDeals },
    { label: "AI Conversations", ...kpis.aiConversations },
    { label: "Total Customers", ...kpis.customers },
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
