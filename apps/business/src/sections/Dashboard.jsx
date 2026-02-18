import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import * as api from "../api/client";

const PIE_COLORS = ["#7c3aed", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const ENTRY_TYPES = {
  creation: { icon: "C", color: "#7c3aed", label: "Created" },
  maintenance: { icon: "M", color: "#06b6d4", label: "Maintenance" },
  transfer: { icon: "T", color: "#7c3aed", label: "Transfer" },
  inspection: { icon: "I", color: "#22c55e", label: "Inspection" },
  update: { icon: "U", color: "#f59e0b", label: "Update" },
  payment: { icon: "P", color: "#16a34a", label: "Payment" },
  verification: { icon: "V", color: "#6366f1", label: "Verification" },
  note: { icon: "N", color: "#64748b", label: "Note" },
  attestation: { icon: "A", color: "#7c3aed", label: "Attestation" },
};

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getAssetValue(item) {
  const m = item.metadata || {};
  return Number(m.estimatedValue) || Number(m.value) || Number(m.purchasePrice) || Number(item.estimatedValue) || Number(item.value) || Number(item.price) || 0;
}

function getAssetTitle(item) {
  const m = item.metadata || {};
  if (m.title) return m.title;
  if (m.make) return `${m.year || ""} ${m.make} ${m.model || ""}`.trim();
  if (m.credentialName) return m.credentialName;
  if (m.documentName) return m.documentName;
  if (m.address) return m.address;
  if (m.school) return m.school;
  return "Untitled";
}

// ── Consumer Vault Dashboard ────────────────────────────────────
function ConsumerDashboard() {
  const auth = getAuth();
  const db = getFirestore();
  const currentUser = auth.currentUser;

  const [assets, setAssets] = useState([]);
  const [logbookEntries, setLogbookEntries] = useState([]);
  const [totalLogbookCount, setTotalLogbookCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    loadConsumerData();
  }, [currentUser]);

  async function loadConsumerData() {
    try {
      // Load inventory via API (matches existing pattern)
      const inventoryResult = await api.getInventory({ vertical: "consumer", jurisdiction: "GLOBAL" });
      const items = inventoryResult.inventory || [];
      setAssets(items);

      // Load recent logbook entries from Firestore
      try {
        const logbookQ = query(
          collection(db, "logbookEntries"),
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const snap = await getDocs(logbookQ);
        const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLogbookEntries(entries);

        // Get total count from all logbook entries
        const countQ = query(
          collection(db, "logbookEntries"),
          where("userId", "==", currentUser.uid)
        );
        const countSnap = await getDocs(countQ);
        setTotalLogbookCount(countSnap.size);
      } catch (logErr) {
        console.warn("Logbook query failed (index building?):", logErr.message);
      }
    } catch (e) {
      console.error("Failed to load consumer dashboard:", e);
    } finally {
      setLoading(false);
    }
  }

  // Computed values
  const totalValue = assets.reduce((sum, a) => sum + getAssetValue(a), 0);
  const topAssets = [...assets]
    .map(a => ({ ...a, _value: getAssetValue(a), _title: getAssetTitle(a) }))
    .sort((a, b) => b._value - a._value)
    .slice(0, 5);
  const totalDTCs = assets.length;
  const hasData = assets.length > 0;

  // Pie chart data
  const pieTotal = topAssets.reduce((s, a) => s + a._value, 0) || 1;
  let cumulativePct = 0;

  if (loading) {
    return (
      <div className="card" style={{ padding: "48px", textAlign: "center" }}>
        <div style={{ fontSize: "15px", color: "#64748b" }}>Loading your Vault...</div>
      </div>
    );
  }

  return (
    <>
      {/* Row 1: Net Worth */}
      <div className="card" style={{ marginBottom: "14px", padding: "28px 24px", background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)", border: "1px solid #e9d5ff" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
          My Net Worth
        </div>
        <div style={{ fontSize: "36px", fontWeight: 900, color: "#1e293b", lineHeight: 1.1 }}>
          ${totalValue.toLocaleString()}
        </div>
        <div style={{ fontSize: "13px", color: "#64748b", marginTop: "6px" }}>
          {hasData ? `Across ${totalDTCs} Digital Title Certificate${totalDTCs !== 1 ? "s" : ""}` : "Add your first item to start tracking your net worth"}
        </div>
      </div>

      {/* Row 2: Top Assets + Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "14px", marginBottom: "14px" }}>
        {/* Left: Top Valued Assets */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b", marginBottom: "4px" }}>Top Valued Assets</div>
          <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>Your five most valuable items by estimated worth</div>

          {topAssets.length > 0 && topAssets.some(a => a._value > 0) ? (
            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              {/* CSS Donut Chart */}
              <div style={{ position: "relative", width: "120px", height: "120px", flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ width: "120px", height: "120px", transform: "rotate(-90deg)" }}>
                  {topAssets.filter(a => a._value > 0).map((asset, idx) => {
                    const pct = (asset._value / pieTotal) * 100;
                    const offset = cumulativePct;
                    cumulativePct += pct;
                    return (
                      <circle
                        key={idx}
                        cx="18" cy="18" r="14"
                        fill="none"
                        stroke={PIE_COLORS[idx % PIE_COLORS.length]}
                        strokeWidth="5"
                        strokeDasharray={`${pct} ${100 - pct}`}
                        strokeDashoffset={-offset}
                        style={{ transition: "stroke-dasharray 0.3s" }}
                      />
                    );
                  })}
                </svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b" }}>{topAssets.filter(a => a._value > 0).length}</div>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>items</div>
                </div>
              </div>

              {/* Legend */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                {topAssets.filter(a => a._value > 0).map((asset, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: PIE_COLORS[idx % PIE_COLORS.length], flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: "13px", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset._title}</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", flexShrink: 0 }}>${asset._value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
              {hasData ? "No items have estimated values yet. Add values to your records to see them here." : "Add items to your Vault to see your top assets."}
            </div>
          )}
        </div>

        {/* Right: Stats stack */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Total DTCs */}
          <div className="card" style={{ padding: "20px", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "#1e293b", lineHeight: 1 }}>{totalDTCs}</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>Digital Title Certificates</div>
              </div>
            </div>
          </div>

          {/* Logbook Entries */}
          <div className="card" style={{ padding: "20px", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: "28px", fontWeight: 900, color: "#1e293b", lineHeight: 1 }}>{totalLogbookCount}</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>Total logbook entries</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Three cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
        {/* Wallet Summary */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b", marginBottom: "4px" }}>Wallet Summary</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px" }}>Connected wallets and on-chain assets</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #f1f5f9", marginBottom: "10px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: localStorage.getItem("VAULT_BLOCKCHAIN_ENABLED") === "true" ? "#16a34a" : "#94a3b8" }} />
            <div style={{ fontSize: "13px", color: "#334155" }}>
              {localStorage.getItem("VAULT_BLOCKCHAIN_ENABLED") === "true" ? "TitleApp Wallet -- Connected" : "No wallets connected"}
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>0 on-chain assets</div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("ta:navigate", { detail: { section: "my-wallet" } }))}
            style={{ fontSize: "13px", fontWeight: 600, color: "#7c3aed", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Manage Wallets &rarr;
          </button>
        </div>

        {/* My GPTs */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b", marginBottom: "4px" }}>My GPTs</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px" }}>Your specialized AI assistants</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px", background: "#f3e8ff", color: "#7c3aed" }}>Chief of Staff</span>
            <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px", background: "#ecfdf5", color: "#059669" }}>Investment Analyst</span>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("ta:navigate", { detail: { section: "ai-chats" } }))}
            style={{ fontSize: "13px", fontWeight: 600, color: "#7c3aed", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Go to My GPTs &rarr;
          </button>
        </div>

        {/* Recent Activity */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b", marginBottom: "4px" }}>Recent Activity</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px" }}>Latest updates across your Vault</div>
          {logbookEntries.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {logbookEntries.slice(0, 4).map((entry) => {
                const config = ENTRY_TYPES[entry.entryType] || ENTRY_TYPES.note;
                return (
                  <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: "24px", height: "24px", borderRadius: "6px",
                      background: `${config.color}15`, border: `1px solid ${config.color}30`,
                      display: "grid", placeItems: "center", fontSize: "11px", fontWeight: 700, color: config.color, flexShrink: 0,
                    }}>{config.icon}</div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ fontSize: "12px", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.dtcTitle || entry.data?.description || config.label}
                      </div>
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", flexShrink: 0 }}>{formatDate(entry.createdAt)}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: "13px", color: "#94a3b8" }}>No activity yet</div>
          )}
          {logbookEntries.length > 0 && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("ta:navigate", { detail: { section: "my-logbook" } }))}
              style={{ fontSize: "13px", fontWeight: 600, color: "#7c3aed", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: "10px" }}
            >
              View All &rarr;
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Dashboard (routes consumer vs business) ────────────────
export default function Dashboard() {
  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const isConsumer = vertical === "consumer";
  const isAnalyst = vertical.toLowerCase() === "analyst";

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

  const [opportunities, setOpportunities] = useState([
    {
      id: 1,
      name: "Parkview Apartments -- 48 Units",
      location: "Phoenix, AZ",
      type: "Multifamily",
      reason: "CMBS loan matures Aug 2026. Matches your multifamily criteria.",
      value: "$8.2M",
      risk: 62,
      source: "Public Records -- Maturing CMBS"
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
      source: "Public Records -- Tax Delinquency"
    },
    {
      id: 4,
      name: "Sunrise Senior Living Portfolio",
      location: "Tempe, AZ",
      type: "Senior Housing",
      reason: "Notice of Default filed Jan 2026. Lender may accept discount.",
      value: "$15M",
      risk: 55,
      source: "Public Records -- Notice of Default"
    }
  ]);
  const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";

  useEffect(() => {
    if (!isConsumer) loadBusinessDashboard();
  }, []);

  async function loadBusinessDashboard() {
    setLoading(true);
    try {
      const membershipResult = await api.getMemberships({ vertical, jurisdiction });
      if (membershipResult.ok && membershipResult.memberships?.length > 0) {
        const tid = membershipResult.memberships[0].tenantId;
        const tenant = membershipResult.tenants?.[tid];
        if (tenant?.name) setTenantName(tenant.name);
      }

      const aiResult = await api.getAIActivity({ vertical, jurisdiction, limit: 100 });
      const aiActivity = aiResult.activity || [];

      const now = new Date();
      const thisMonthActions = aiActivity.filter(a => {
        const d = new Date(a.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const actionsCount = thisMonthActions.length;
      const hoursSaved = actionsCount * 0.25;
      const valueSaved = hoursSaved * 35;
      setValueTracker({ actions: actionsCount, hoursSaved, valueSaved });

      if (vertical === "analyst") {
        // Get analyzed deals from API
        const analyzedResult = await api.getAnalyzedDeals({ vertical, jurisdiction });
        const analyzedDeals = analyzedResult.deals || [];

        // Compute dealflow value: COS-found opportunities + analyzed deals
        const oppValueM = opportunities.reduce((s, o) => {
          const val = parseFloat(o.value.replace(/[$M,]/g, ""));
          return s + (isNaN(val) ? 0 : val);
        }, 0);
        const analyzedValueM = analyzedDeals.reduce((s, d) => {
          const raw = (d.dealInput?.askAmount || "").replace(/[$,]/g, "");
          const val = parseFloat(raw);
          return s + (isNaN(val) ? 0 : val / 1000000);
        }, 0);
        const totalDealflowM = oppValueM + analyzedValueM;

        const dealsInPipeline = opportunities.length + analyzedDeals.length;
        const dealsAnalyzedCount = analyzedDeals.filter(d => d.analysis?.riskScore).length;
        const avgRisk = dealsAnalyzedCount > 0
          ? Math.round(analyzedDeals.filter(d => d.analysis?.riskScore).reduce((s, d) => s + d.analysis.riskScore, 0) / dealsAnalyzedCount)
          : 0;

        setKpis({
          revenue: { value: `$${totalDealflowM.toFixed(1)}M`, trend: "" },
          activeDeals: { value: dealsInPipeline.toString(), trend: "" },
          aiConversations: { value: dealsAnalyzedCount.toString(), trend: "" },
          customers: { value: avgRisk > 0 ? avgRisk.toString() : "0", trend: "" },
        });
      } else if (vertical === "property-mgmt") {
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
    if (vertical === "analyst") {
      return ["Dealflow Value", "Deals in Pipeline", "Analyzed This Month", "Avg Risk Score"];
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
          <p className="subtle">{isConsumer ? "Your personal Vault" : `Welcome to ${tenantName || "your business"} -- Your overview`}</p>
        </div>
      </div>

      {/* ── Consumer Vault ── */}
      {isConsumer && <ConsumerDashboard />}

      {/* ── Business KPIs ── */}
      {!isConsumer && (
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
      )}

      {/* Opportunities -- Analyst only */}
      {isAnalyst && (
        <div style={{ marginTop: "14px" }}>
          <div style={{ marginBottom: "12px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>While You Were Out...</h2>
            <p style={{ fontSize: "14px", color: "var(--muted)", margin: "4px 0 0" }}>
              {opportunities.length > 0
                ? `Your Chief of Staff found ${opportunities.length} opportunit${opportunities.length === 1 ? "y" : "ies"} matching your investment criteria`
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

      {/* Recent Activity -- business only */}
      {!isConsumer && (
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
      )}

      {/* Value Tracker -- business only */}
      {!isConsumer && (
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
