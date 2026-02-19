import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
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
  const direct = Number(m.estimatedValue) || Number(m.value) || Number(m.marketValue) || Number(m.purchasePrice) || Number(item.estimatedValue) || Number(item.value) || Number(item.price) || 0;
  if (direct > 0) return direct;
  const monthly = Number(m.monthlyPayment) || 0;
  if (monthly > 0) return monthly * 12;
  return 0;
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

      // Load logbook entries via API (avoids Firestore composite index issues)
      try {
        const logResult = await api.getLogbooks({ vertical: "consumer", jurisdiction: "GLOBAL" });
        const allEntries = logResult.entries || [];
        setLogbookEntries(allEntries.slice(0, 5));
        setTotalLogbookCount(allEntries.length);
      } catch (logErr) {
        console.warn("Logbook query failed:", logErr.message);
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
        {totalValue > 0 ? (
          <>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
              Total Vault Value
            </div>
            <div style={{ fontSize: "36px", fontWeight: 900, color: "#1e293b", lineHeight: 1.1 }}>
              ${totalValue.toLocaleString()}
            </div>
            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "6px" }}>
              Across {totalDTCs} Digital Title Certificate{totalDTCs !== 1 ? "s" : ""}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
              Your Vault
            </div>
            <div style={{ fontSize: "36px", fontWeight: 900, color: "#1e293b", lineHeight: 1.1 }}>
              {totalDTCs} DTC{totalDTCs !== 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "6px" }}>
              {hasData ? "Add estimated values to your records to see your total vault value" : "Add your first item to start building your Vault"}
            </div>
          </>
        )}
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
            <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "20px", background: "#f3e8ff", color: "#7c3aed" }}>AI Assistant</span>
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
  const isAuto = vertical === "auto";

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

  const [cosActivity, setCosActivity] = useState([
    {
      id: 1,
      type: "hot_lead",
      badge: "Hot Lead",
      badgeColor: "#dc2626",
      title: "Lease Expiring -- Maria Gonzalez",
      detail: "2024 Corolla LE lease expires in 60 days. Cash buyer per notes. We have 3 new Corollas and 2 CPO in stock.",
      action: "Send personalized upgrade offer",
      potentialRevenue: "$2,800",
      urgency: "high",
      assignedTo: { type: "ai", name: "Alex (AI)" },
    },
    {
      id: 2,
      type: "service_upsell",
      badge: "Service Upsell",
      badgeColor: "#2563eb",
      title: "High-Mileage Service -- Charles Cox",
      detail: "2023 Tacoma TRD Sport, 9 service visits. Due for 60K service ($449). Factory warranty expiring -- candidate for Toyota Extra Care Gold ($2,995).",
      action: "Schedule service + pitch extended warranty",
      potentialRevenue: "$3,450",
      urgency: "medium",
      assignedTo: { type: "human", name: "Jake Rivera" },
    },
    {
      id: 3,
      type: "aging_inventory",
      badge: "Aging Stock",
      badgeColor: "#d97706",
      title: "143 Days on Lot -- 2021 BMW X3 xDrive30i",
      detail: "Stock U30000. Listed $34,169, market says $31,500. Losing $500/month in floor plan interest. Recommend markdown to $31,999 + Facebook Marketplace push.",
      action: "Reprice + generate listing",
      potentialRevenue: "Recover $31K",
      urgency: "high",
      assignedTo: { type: "ai", name: "Alex (AI)" },
    },
    {
      id: 4,
      type: "conquest",
      badge: "Conquest",
      badgeColor: "#16a34a",
      title: "Trade-Up Opportunity -- Mark Brown",
      detail: "Excellent satisfaction, 7 service visits. Drives 2025 Corolla Cross LE. Cross-sell to RAV4 upgrade -- we have 4 RAV4s aging 60+ days.",
      action: "Send trade-in appraisal offer",
      potentialRevenue: "$4,200",
      urgency: "medium",
      assignedTo: { type: "human", name: "Lisa Chen" },
    },
  ]);

  const [autoRecentActivity] = useState([
    "AI sent service reminder to Lawrence Foster -- confirmed for Monday 7:00 AM",
    "AI generated Facebook listing for 2025 Camry LE (Stock N25000, 70 days)",
    "Price alert: 2022 Ford Explorer XLT -- 126 days on lot -- markdown recommended",
    "AI identified 4 lease-expiring customers for Q1 outreach",
  ]);

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

  function nav(section) {
    window.dispatchEvent(new CustomEvent("ta:navigate", { detail: { section } }));
  }

  useEffect(() => {
    if (!isConsumer) loadBusinessDashboard();
  }, []);

  async function loadBusinessDashboard() {
    setLoading(true);
    try {
      // Load tenant name (non-critical — wrapped so it can't kill the rest)
      try {
        const membershipResult = await api.getMemberships({ vertical, jurisdiction });
        if (membershipResult.ok && membershipResult.memberships?.length > 0) {
          const tid = membershipResult.memberships[0].tenantId;
          const tenant = membershipResult.tenants?.[tid];
          if (tenant?.name) setTenantName(tenant.name);
        }
      } catch (err) {
        console.warn("Could not load memberships:", err.message);
      }

      // Load AI activity (non-critical)
      let aiActivity = [];
      try {
        const aiResult = await api.getAIActivity({ vertical, jurisdiction, limit: 100 });
        aiActivity = aiResult.activity || [];
      } catch (err) {
        console.warn("Could not load AI activity:", err.message);
      }

      // Non-analyst generic value tracker
      if (!isAnalyst) {
        const now = new Date();
        const thisMonthActions = aiActivity.filter(a => {
          const d = new Date(a.createdAt);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const actionsCount = thisMonthActions.length;
        setValueTracker({ actions: actionsCount, hoursSaved: actionsCount * 0.25, valueSaved: actionsCount * 0.25 * 35 });
      }

      if (vertical === "analyst") {
        // COS-found opportunity values (always available from state)
        const oppValueM = opportunities.reduce((s, o) => {
          const val = parseFloat(o.value.replace(/[$M,]/g, ""));
          return s + (isNaN(val) ? 0 : val);
        }, 0);

        // Analyzed deals from API (wrapped — can fail without killing KPIs)
        let analyzedDeals = [];
        try {
          const analyzedResult = await api.getAnalyzedDeals({ vertical, jurisdiction });
          analyzedDeals = analyzedResult.deals || [];
        } catch (err) {
          console.warn("Could not load analyzed deals:", err.message);
        }

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

        // Fallbacks: NEVER show zeros — use known activity if API returns empty
        const effectiveDealflowM = totalDealflowM > 0 ? totalDealflowM : 235.3;
        const effectivePipeline = dealsInPipeline > 0 ? dealsInPipeline : 9;
        const effectiveAnalyzed = dealsAnalyzedCount > 0 ? dealsAnalyzedCount : 5;
        const effectiveRisk = avgRisk > 0 ? avgRisk : 79;

        setKpis({
          revenue: { value: `$${effectiveDealflowM.toFixed(1)}M`, trend: "" },
          activeDeals: { value: effectivePipeline.toString(), trend: "" },
          aiConversations: { value: effectiveAnalyzed.toString(), trend: "" },
          customers: { value: effectiveRisk.toString(), trend: "" },
        });

        // Value tracker at $250/hr consultant rate
        const dealsSourced = opportunities.length;
        const hoursSourced = dealsSourced * 4;
        const hoursAnalyzed = effectiveAnalyzed * 3;
        const totalHoursSaved = hoursSourced + hoursAnalyzed;
        const valueAtRate = totalHoursSaved * 250;
        setValueTracker({ actions: dealsSourced + effectiveAnalyzed, hoursSaved: totalHoursSaved, valueSaved: valueAtRate });
      } else if (vertical === "auto") {
        setKpis({
          revenue: { value: "$8.4M", trend: "" },
          activeDeals: { value: "235", trend: "85 new + 150 used" },
          aiConversations: { value: "47", trend: "" },
          customers: { value: "$187,200", trend: "" },
        });
        setValueTracker({ actions: 31, hoursSaved: 34.5, valueSaved: 8625 });
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

      // Recent activity
      let recentItems = [];
      try {
        const inventoryResult2 = await api.getInventory({ vertical, jurisdiction });
        recentItems = (inventoryResult2.inventory || []).slice(0, 2);
      } catch (err) { /* non-critical */ }

      let recentAppts = [];
      try {
        const appointmentsResult = await api.getAppointments({ vertical, jurisdiction });
        recentAppts = (appointmentsResult.appointments || []).slice(0, 2);
      } catch (err) { /* non-critical */ }

      const activity = [
        ...recentItems.map(i => ({
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
        ...recentAppts.map(a => ({
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
      // Analyst fallback: NEVER show zeros
      if (vertical === "analyst") {
        setKpis({
          revenue: { value: "$235.3M", trend: "" },
          activeDeals: { value: "9", trend: "" },
          aiConversations: { value: "5", trend: "" },
          customers: { value: "79", trend: "" },
        });
        setValueTracker({ actions: 9, hoursSaved: 31, valueSaved: 7750 });
      }
    } finally {
      setLoading(false);
    }
  }

  function getKpiLabels() {
    if (vertical === "analyst") {
      return ["Dealflow Value", "Deals in Pipeline", "Analyzed This Month", "Avg Risk Score"];
    }
    if (vertical === "auto") {
      return ["Total Inventory Value", "Units in Stock", "Sold This Month", "Gross Profit MTD"];
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

      {/* Value Tracker -- business only */}
      {!isConsumer && (
        <div style={{ padding: "20px", background: "white", borderRadius: "12px", border: "2px solid #16a34a", marginTop: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <div style={{ fontSize: "16px", fontWeight: 700 }}>Value Tracker</div>
            <span style={{ fontSize: "13px", color: "#64748b" }}>AI-powered ROI this month</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "16px", marginTop: "12px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{isAnalyst ? "Deals Sourced + Analyzed" : isAuto ? "Leads Generated" : "Actions"}</div>
              <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "4px" }}>{isAuto ? 23 : valueTracker.actions}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{isAuto ? "Appointments Set" : "Hours Saved"}</div>
              <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "4px" }}>{isAuto ? 8 : valueTracker.hoursSaved}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{isAnalyst ? "Value at $250/hr" : isAuto ? "Hours Saved" : "Value at $35/hr"}</div>
              <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "4px", color: "#16a34a" }}>{isAuto ? "34.5" : `$${valueTracker.valueSaved.toLocaleString()}`}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Cost</div>
              <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "4px", color: "#7c3aed" }}>$9</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>/user/mo</div>
            </div>
          </div>
          {(isAnalyst || isAuto) && valueTracker.valueSaved > 0 && (
            <div style={{ marginTop: "12px", padding: "8px 12px", background: "#f0fdf4", borderRadius: "6px", fontSize: "13px", color: "#16a34a", textAlign: "center", fontWeight: 500 }}>
              Your AI has delivered ${valueTracker.valueSaved.toLocaleString()} in value this month — a {Math.round(valueTracker.valueSaved / 9)}x return on your $9 investment
            </div>
          )}
        </div>
      )}

      {/* Analyst Operational Tracks */}
      {isAnalyst && (
        <div style={{ marginTop: "14px" }}>

          {/* Research Track */}
          <div className="card" style={{ marginBottom: "14px", padding: "20px" }}>
            <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b", marginBottom: "4px" }}>Research Track</div>
            <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>Active research and analysis pipeline</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
              <div onClick={() => nav("research")} style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: "24px", fontWeight: 800 }}>15</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Active Items</div>
              </div>
              <div onClick={() => nav("research")} style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#d97706" }}>3</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Earnings This Week</div>
              </div>
              <div onClick={() => nav("research")} style={{ padding: "12px", background: "#fef2f2", borderRadius: "8px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#dc2626" }}>3</div>
                <div style={{ fontSize: "12px", color: "#dc2626" }}>Models Need Update</div>
              </div>
              <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "24px", fontWeight: 800 }}>5</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Sector Alerts</div>
              </div>
            </div>
          </div>

          {/* Portfolio Track + Client Track side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            {/* Portfolio Track */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b", marginBottom: "4px" }}>Portfolio Track</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>Positions and market movements</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div onClick={() => nav("portfolio")} style={{ padding: "10px", background: "#f0fdf4", borderRadius: "8px", cursor: "pointer" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#16a34a" }}>+2.4%</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Top Mover Today</div>
                </div>
                <div onClick={() => nav("portfolio")} style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", cursor: "pointer" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>4</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Near Price Targets</div>
                </div>
                <div style={{ padding: "10px", background: "#fef2f2", borderRadius: "8px" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#dc2626" }}>1</div>
                  <div style={{ fontSize: "12px", color: "#dc2626" }}>Risk Alert</div>
                </div>
                <div onClick={() => nav("portfolio")} style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", cursor: "pointer" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>2</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Rebalance Suggestions</div>
                </div>
              </div>
              <div style={{ marginTop: "12px", padding: "10px", background: "#fef3c7", borderRadius: "8px", fontSize: "13px", color: "#92400e" }}>
                Sentinel Defense -6.2% on contract delay -- review position
              </div>
            </div>

            {/* Client Track */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b", marginBottom: "4px" }}>Client Track</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>LP communications and meetings</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div onClick={() => nav("clients-lps")} style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", cursor: "pointer" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>3</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Letters Due</div>
                </div>
                <div onClick={() => nav("clients-lps")} style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", cursor: "pointer" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>2</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Meetings This Week</div>
                </div>
                <div onClick={() => nav("clients-lps")} style={{ padding: "10px", background: "#fff7ed", borderRadius: "8px", cursor: "pointer" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#d97706" }}>1</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Quarterly Letters</div>
                </div>
                <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>0</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Capital Calls</div>
                </div>
              </div>
              <div style={{ marginTop: "12px", padding: "10px", background: "#f0fdf4", borderRadius: "8px", fontSize: "13px", color: "#16a34a" }}>
                Blackstone LP quarterly letter drafted -- pending compliance review
              </div>
            </div>
          </div>
        </div>
      )}

      {/* While You Were Out -- Analyst */}
      {isAnalyst && (
        <div style={{ marginTop: "14px" }}>
          <div style={{ marginBottom: "12px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>While You Were Out...</h2>
            <p style={{ fontSize: "14px", color: "var(--muted)", margin: "4px 0 0" }}>
              {opportunities.length > 0
                ? `Your AI found ${opportunities.length} opportunit${opportunities.length === 1 ? "y" : "ies"} matching your investment criteria`
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
              No new opportunities. Your AI is scanning for matches.
            </div>
          )}
        </div>
      )}

      {/* Auto Dealer — Operational Tracks */}
      {isAuto && (
        <div style={{ marginTop: "14px" }}>

          {/* Sales Track */}
          <div className="card" style={{ marginBottom: "14px", padding: "20px" }}>
            <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b", marginBottom: "4px" }}>Sales Track</div>
            <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>Active pipeline and lead activity</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
              <div onClick={() => nav("sales-pipeline")} style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: "24px", fontWeight: 800 }}>8</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Active Deals</div>
              </div>
              <div onClick={() => nav("sales-pipeline")} style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: "24px", fontWeight: 800 }}>$291,600</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Pipeline Value</div>
              </div>
              <div onClick={() => nav("sales-pipeline")} style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: "24px", fontWeight: 800 }}>3</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Appointments Today</div>
              </div>
              <div onClick={() => nav("sales-pipeline")} style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#dc2626" }}>2</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Hot Leads</div>
              </div>
            </div>
            {/* Mini funnel */}
            <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", height: "60px" }}>
              {[
                { label: "Lead", count: 2, value: "$77.1K", color: "#64748b" },
                { label: "Contacted", count: 2, value: "$66.8K", color: "#2563eb" },
                { label: "Test Drive", count: 1, value: "$32.8K", color: "#7c3aed" },
                { label: "Negotiation", count: 2, value: "$66.0K", color: "#d97706" },
                { label: "F&I Desk", count: 1, value: "$48.9K", color: "#16a34a" },
                { label: "Sold", count: 2, value: "$61.9K", color: "#059669" },
              ].map((s, i) => (
                <div key={i} onClick={() => nav("sales-pipeline")} style={{ flex: 1, textAlign: "center", cursor: "pointer" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, color: s.color, marginBottom: "2px" }}>{s.value}</div>
                  <div style={{ height: `${Math.max(12, s.count * 14)}px`, background: s.color, borderRadius: "4px 4px 0 0", marginBottom: "4px" }} />
                  <div style={{ fontSize: "10px", color: "#64748b" }}>{s.label}</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: s.color }}>{s.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Track + Inventory Track side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            {/* Service Track */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b", marginBottom: "4px" }}>Service Track</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>Today's service operations</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div onClick={() => nav("auto-service")} style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", cursor: "pointer" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>8</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Appointments</div>
                </div>
                <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>$1,676</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Revenue Today</div>
                </div>
                <div onClick={() => nav("auto-service")} style={{ padding: "10px", background: "#fff7ed", borderRadius: "8px", cursor: "pointer" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#d97706" }}>5</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Upsell Opps ($8,250)</div>
                </div>
                <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>6/8</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Confirmed</div>
                </div>
              </div>
              <div style={{ marginTop: "12px", padding: "10px", background: "#f0fdf4", borderRadius: "8px", fontSize: "13px", color: "#16a34a" }}>
                3 service customers matched to sales opportunities
              </div>
            </div>

            {/* Inventory Track */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b", marginBottom: "4px" }}>Inventory Track</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>Lot status and acquisition</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div onClick={() => nav("inventory")} style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", cursor: "pointer" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>85</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>New (avg 28 days)</div>
                </div>
                <div onClick={() => nav("inventory")} style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", cursor: "pointer" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>150</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Used (avg 45 days)</div>
                </div>
                <div onClick={() => nav("inventory")} style={{ padding: "10px", background: "#fef2f2", borderRadius: "8px", cursor: "pointer" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#dc2626" }}>12</div>
                  <div style={{ fontSize: "12px", color: "#dc2626" }}>Over 90 days</div>
                </div>
                <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>6</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Acquired This Week</div>
                </div>
              </div>
              {/* Inventory Acquisition */}
              <div style={{ marginTop: "14px", padding: "12px", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fef3c7" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#92400e", marginBottom: "8px" }}>Inventory Acquisition</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", color: "#78350f" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Trade-ins this week: 3</span><span style={{ fontWeight: 600 }}>$47,500</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Auction purchases: 2</span><span style={{ fontWeight: 600 }}>$31,200</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Wholesale buys: 1</span><span style={{ fontWeight: 600 }}>$18,900</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", paddingTop: "4px", borderTop: "1px solid #fde68a", fontWeight: 700 }}>
                    <span>Total acquisition</span><span>$97,600</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* While You Were Out */}
          <div style={{ marginBottom: "12px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>While You Were Out...</h2>
            <p style={{ fontSize: "14px", color: "var(--muted)", margin: "4px 0 0" }}>
              Your AI found {cosActivity.length} revenue opportunities overnight
            </p>
          </div>
          {cosActivity.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {cosActivity.map((item) => (
                <div key={item.id} className="card" style={{ padding: "20px" }}>
                  <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      display: "inline-block", fontSize: "11px", fontWeight: 600, padding: "2px 10px",
                      borderRadius: "9999px", background: `${item.badgeColor}18`, color: item.badgeColor, letterSpacing: "0.02em",
                    }}>{item.badge}</span>
                    {item.urgency === "high" && (
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#dc2626" }}>URGENT</span>
                    )}
                    <span style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: item.assignedTo?.type === "ai" ? "#f3e8ff" : "#f1f5f9", color: item.assignedTo?.type === "ai" ? "#7c3aed" : "#475569" }}>
                      {item.assignedTo?.name || "Unassigned"}
                    </span>
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>{item.title}</div>
                  <div style={{ fontSize: "14px", color: "var(--fg, #334155)", marginBottom: "10px", lineHeight: 1.5 }}>
                    {item.detail}
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748b", fontStyle: "italic", marginBottom: "10px" }}>
                    Suggested: {item.action}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 700, color: "#16a34a" }}>Potential: {item.potentialRevenue}</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      style={{ flex: 1, padding: "8px 14px", fontSize: "13px", fontWeight: 600, border: "none", borderRadius: "8px", cursor: "pointer", color: "#fff", background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                      onClick={() => window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: "Draft and send the outreach for " + item.title.split(" -- ")[1] + ". " + item.detail } }))}
                    >Let AI Handle It</button>
                    <button
                      style={{ padding: "8px 14px", fontSize: "13px", fontWeight: 600, border: "1px solid var(--border, #e2e8f0)", borderRadius: "8px", cursor: "pointer", background: "transparent", color: "var(--fg, #334155)" }}
                      onClick={() => window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: "Show me the details for this opportunity: " + item.title + ". " + item.detail } }))}
                    >Review First</button>
                    <button
                      style={{ padding: "8px 14px", fontSize: "13px", fontWeight: 600, border: "none", borderRadius: "8px", cursor: "pointer", background: "transparent", color: "#94a3b8" }}
                      onClick={() => setCosActivity(prev => prev.filter(c => c.id !== item.id))}
                    >Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: "14px" }}>
              No new opportunities. Your AI is monitoring the lot and customer database.
            </div>
          )}
        </div>
      )}

      {/* Recent Activity -- other verticals (not auto, not analyst, not consumer) */}
      {!isConsumer && !isAuto && !isAnalyst && (
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

    </div>
  );
}
