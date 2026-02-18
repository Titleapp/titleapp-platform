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
  const [tenantName, setTenantName] = useState("");
  const [valueTracker, setValueTracker] = useState({ actions: 0, hoursSaved: 0, valueSaved: 0 });

  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const isAnalyst = vertical.toLowerCase() === "analyst";

  const [opportunities, setOpportunities] = useState([
    {
      id: 1,
      name: "Parkview Apartments — 48 Units",
      location: "Phoenix, AZ",
      type: "Multifamily",
      reason: "CMBS loan matures Aug 2026. Matches your multifamily criteria.",
      value: "$8.2M",
      risk: 62,
      source: "Public Records — Maturing CMBS"
    },
    {
      id: 2,
      name: "Desert Ridge Office Plaza",
      location: "Scottsdale, AZ",
      type: "Office",
      reason: "Listed by CBRE, below market ask for submarket.",
      value: "$12.5M",
      risk: 38,
      source: "Broker Listing"
    },
    {
      id: 3,
      name: "Cactus Lane Industrial",
      location: "Mesa, AZ",
      type: "Industrial",
      reason: "Tax lien filed. Potential distressed acquisition.",
      value: "$3.1M",
      risk: 78,
      source: "Public Records — Tax Delinquency"
    },
    {
      id: 4,
      name: "Sunrise Senior Living Portfolio",
      location: "Tempe, AZ",
      type: "Senior Housing",
      reason: "Notice of Default filed Jan 2026. Lender may accept discount.",
      value: "$15M",
      risk: 55,
      source: "Public Records — Notice of Default"
    }
  ]);
  const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      // Fetch tenant name
      const membershipResult = await api.getMemberships({ vertical, jurisdiction });
      if (membershipResult.ok && membershipResult.memberships?.length > 0) {
        const tid = membershipResult.memberships[0].tenantId;
        const tenant = membershipResult.tenants?.[tid];
        if (tenant?.name) setTenantName(tenant.name);
      }

      // Fetch AI activity
      const aiResult = await api.getAIActivity({ vertical, jurisdiction, limit: 100 });
      const aiActivity = aiResult.activity || [];

      // Value tracker calculation
      const now = new Date();
      const thisMonthActions = aiActivity.filter(a => {
        const d = new Date(a.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const actionsCount = thisMonthActions.length;
      const hoursSaved = actionsCount * 0.25;
      const valueSaved = hoursSaved * 35;
      setValueTracker({ actions: actionsCount, hoursSaved, valueSaved });

      if (vertical === "consumer") {
        // Consumer KPIs — count of items by type
        const inventoryResult = await api.getInventory({ vertical: "consumer", jurisdiction: "GLOBAL" });
        const items = inventoryResult.inventory || [];
        const vehicleCount = items.filter(i => i.metadata?.vin || i.metadata?.make).length;
        const propertyCount = items.filter(i => i.metadata?.address || i.metadata?.propertyType).length;
        const docCount = items.filter(i => i.metadata?.credentialName || i.metadata?.school || i.metadata?.issuer).length;

        setKpis({
          revenue: { value: vehicleCount.toString(), trend: "" },
          activeDeals: { value: propertyCount.toString(), trend: "" },
          aiConversations: { value: docCount.toString(), trend: "" },
          customers: { value: aiActivity.length.toString(), trend: "" },
        });
      } else if (vertical === "analyst") {
        // Analyst KPIs
        const inventoryResult = await api.getInventory({ vertical, jurisdiction });
        const deals = inventoryResult.inventory || [];
        const avgRisk = deals.length > 0
          ? Math.round(deals.reduce((s, d) => s + (d.metadata?.riskScore || 0), 0) / deals.length)
          : 0;

        setKpis({
          revenue: { value: deals.length.toString(), trend: "" },
          activeDeals: {
            value: deals.filter(d => {
              const c = new Date(d.createdAt);
              return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear();
            }).length.toString(),
            trend: "",
          },
          aiConversations: { value: avgRisk.toString(), trend: "" },
          customers: { value: aiActivity.length.toString(), trend: "" },
        });
      } else if (vertical === "property-mgmt") {
        // Property management KPIs
        const inventoryResult = await api.getInventory({ vertical, jurisdiction });
        const properties = inventoryResult.inventory || [];
        const totalUnits = properties.reduce((s, p) => s + (p.metadata?.unitCount || 1), 0);

        setKpis({
          revenue: { value: properties.length.toString(), trend: "" },
          activeDeals: { value: totalUnits.toString(), trend: "" },
          aiConversations: { value: "95%", trend: "" },
          customers: { value: "0", trend: "" },
        });
      } else {
        // Auto (default) KPIs
        const inventoryResult = await api.getInventory({ vertical, jurisdiction });
        const inventory = inventoryResult.inventory || [];
        const totalRevenue = inventory
          .filter(i => i.status === "available")
          .reduce((sum, i) => sum + (i.price || 0), 0);

        const customersResult = await api.getCustomers({ vertical, jurisdiction });
        const customers = customersResult.customers || [];

        setKpis({
          revenue: { value: `$${totalRevenue.toLocaleString()}`, trend: "" },
          activeDeals: { value: inventory.filter(i => i.status === "available").length.toString(), trend: "" },
          aiConversations: { value: aiActivity.length.toString(), trend: "" },
          customers: { value: customers.length.toString(), trend: "" },
        });
      }

      // Build recent activity
      const inventoryResult2 = await api.getInventory({ vertical, jurisdiction });
      const inventory2 = inventoryResult2.inventory || [];
      const appointmentsResult = await api.getAppointments({ vertical, jurisdiction });
      const appointments = appointmentsResult.appointments || [];

      const activity = [
        ...inventory2.slice(0, 2).map(i => ({
          id: `inv-${i.id}`,
          type: "Record Added",
          description: `${i.metadata?.make || i.metadata?.address || ""} ${i.metadata?.model || ""} - ${i.status}`,
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

  function getKpiLabels() {
    if (vertical === "consumer") {
      return ["My Vehicles", "My Properties", "My Documents", "Logbook Entries"];
    }
    if (vertical === "analyst") {
      return ["Deals in Pipeline", "Analyzed This Month", "Avg Risk Score", "AI Conversations"];
    }
    if (vertical === "property-mgmt") {
      return ["Properties", "Total Units", "Occupancy Rate", "Open Requests"];
    }
    return ["Inventory Value", "Available Units", "AI Conversations", "Total Customers"];
  }

  const kpiLabels = getKpiLabels();
  const kpiArray = [
    { label: kpiLabels[0], ...kpis.revenue },
    { label: kpiLabels[1], ...kpis.activeDeals },
    { label: kpiLabels[2], ...kpis.aiConversations },
    { label: kpiLabels[3], ...kpis.customers },
  ];

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Dashboard</h1>
          <p className="subtle">{vertical === "consumer" ? "Your personal vault overview" : `Welcome to ${tenantName || "your business"} -- Your overview`}</p>
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

      {/* Opportunities — Analyst only */}
      {isAnalyst && (
        <div style={{ marginTop: "14px" }}>
          <div style={{ marginBottom: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Opportunities Found by Your Chief of Staff</h2>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
              {opportunities.length > 0
                ? `${opportunities.length} opportunit${opportunities.length === 1 ? "y" : "ies"} matching your investment criteria`
                : ""}
            </p>
          </div>
          {opportunities.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {opportunities.map((deal) => {
                const riskLabel = deal.risk < 40 ? "Low Risk" : deal.risk <= 65 ? "Medium Risk" : "High Risk";
                const riskBg = deal.risk < 40 ? "#dcfce7" : deal.risk <= 65 ? "#fef3c7" : "#fee2e2";
                const riskColor = deal.risk < 40 ? "#16a34a" : deal.risk <= 65 ? "#d97706" : "#dc2626";
                return (
                  <div key={deal.id} className="card" style={{ padding: "20px" }}>
                    <div style={{ marginBottom: "10px" }}>
                      <div style={{ fontSize: "16px", fontWeight: 700 }}>{deal.name}</div>
                      <div style={{ fontSize: "13px", color: "var(--muted)" }}>{deal.location}</div>
                    </div>
                    <span style={{
                      display: "inline-block",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      background: "var(--bg2, #f1f5f9)",
                      color: "var(--fg, #334155)",
                      marginBottom: "10px",
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                    }}>{deal.type}</span>
                    <div style={{ fontSize: "14px", color: "var(--fg)", marginBottom: "12px", lineHeight: 1.4 }}>
                      {deal.reason}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "18px", fontWeight: 700 }}>{deal.value}</span>
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        background: riskBg,
                        color: riskColor,
                      }}>{riskLabel} ({deal.risk})</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "14px" }}>{deal.source}</div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        style={{
                          flex: 1,
                          padding: "8px 14px",
                          fontSize: "13px",
                          fontWeight: 600,
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          color: "#fff",
                          background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                        }}
                        onClick={() => window.dispatchEvent(new CustomEvent("ta:chatPrompt", {
                          detail: { message: "Analyze the opportunity: " + deal.name + " in " + deal.location + ". Value: " + deal.value + ". Risk score: " + deal.risk + ". Source: " + deal.source }
                        }))}
                      >Review Analysis</button>
                      <button
                        style={{
                          padding: "8px 14px",
                          fontSize: "13px",
                          fontWeight: 600,
                          border: "1px solid var(--border, #e2e8f0)",
                          borderRadius: "8px",
                          cursor: "pointer",
                          background: "transparent",
                          color: "var(--muted)",
                        }}
                        onClick={() => setOpportunities(prev => prev.filter(d => d.id !== deal.id))}
                      >Dismiss</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card" style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: "14px" }}>
              No new opportunities. Your Chief of Staff is scanning for matches.
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Recent Activity</div>
            <div className="cardSub">{vertical === "consumer" ? "Your recent activity" : "Latest business actions and AI worker activity"}</div>
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
      {/* Value Tracker — business only */}
      {vertical !== "consumer" && (
        <div
          className="card"
          style={{
            marginTop: "14px",
            borderLeft: "4px solid var(--accent2)",
          }}
        >
          <div className="cardHeader">
            <div>
              <div className="cardTitle">Value Tracker</div>
              <div className="cardSub">AI-powered ROI this month</div>
            </div>
          </div>
          <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Actions</div>
              <div style={{ fontSize: "24px", fontWeight: 900, marginTop: "4px" }}>{valueTracker.actions}</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Hours Saved</div>
              <div style={{ fontSize: "24px", fontWeight: 900, marginTop: "4px" }}>{valueTracker.hoursSaved.toFixed(1)}</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Value at $35/hr</div>
              <div style={{ fontSize: "24px", fontWeight: 900, marginTop: "4px", color: "var(--accent2)" }}>${valueTracker.valueSaved.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Cost</div>
              <div style={{ fontSize: "24px", fontWeight: 900, marginTop: "4px" }}>$9<span style={{ fontSize: "14px", fontWeight: 400, color: "var(--muted)" }}>/user/mo</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
