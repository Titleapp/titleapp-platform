import React, { useState } from "react";

const PIPELINE_STAGES = [
  { id: "lead", label: "Lead", color: "#64748b" },
  { id: "contacted", label: "Contacted", color: "#2563eb" },
  { id: "test-drive", label: "Test Drive", color: "#7c3aed" },
  { id: "negotiation", label: "Negotiation", color: "#d97706" },
  { id: "fi-desk", label: "F&I Desk", color: "#16a34a" },
  { id: "sold", label: "Sold", color: "#059669" },
];

const PIPELINE_DEALS = [
  { id: 1, customer: "Maria Gonzalez", vehicle: "2025 Corolla LE", value: 24500, stage: "contacted", salesperson: "Jake Rivera", daysInStage: 2, notes: "Lease expiring. Cash buyer. Matched to 3 vehicles.", source: "AI -- Lease Expiring", assignedTo: { type: "ai", name: "Alex (AI)" } },
  { id: 2, customer: "Web Lead -- Amanda Liu", vehicle: "2025 RAV4 XLE", value: 34200, stage: "lead", salesperson: "Unassigned", daysInStage: 1, notes: "TrueCar lead. Requested quote on RAV4 XLE in Lunar Rock.", source: "TrueCar", assignedTo: { type: "ai", name: "Alex (AI)" } },
  { id: 3, customer: "Robert Chen", vehicle: "2025 Camry XSE", value: 32800, stage: "test-drive", salesperson: "Jake Rivera", daysInStage: 1, notes: "Drove Camry XSE and Crown. Leaning XSE. Coming back Saturday.", source: "Walk-In", assignedTo: { type: "human", name: "Jake Rivera" } },
  { id: 4, customer: "Mark Brown", vehicle: "2025 RAV4 XLE Premium", value: 37500, stage: "negotiation", salesperson: "Lisa Chen", daysInStage: 3, notes: "Trade-in 2025 Corolla Cross. Approved TMCC Tier 1. Working numbers.", source: "AI -- Trade-Up", assignedTo: { type: "human", name: "Lisa Chen" } },
  { id: 5, customer: "James Mitchell", vehicle: "2024 Tundra SR5 CrewMax", value: 48900, stage: "fi-desk", salesperson: "Jake Rivera", daysInStage: 0, notes: "Approved Chase Auto 5.49%. Presenting warranty menu today.", source: "Referral", assignedTo: { type: "human", name: "Jake Rivera" } },
  { id: 6, customer: "Thomas Garcia", vehicle: "2025 Tacoma TRD Sport", value: 42300, stage: "contacted", salesperson: "Lisa Chen", daysInStage: 4, notes: "Phone inquiry. Wants to compare with Colorado. Invited for Saturday.", source: "Phone", assignedTo: { type: "human", name: "Lisa Chen" } },
  { id: 7, customer: "Kevin O'Brien", vehicle: "2022 Ford Explorer XLT (Used)", value: 28500, stage: "negotiation", salesperson: "Jake Rivera", daysInStage: 2, notes: "Wants $2K off. Stock U30012, 86 days on lot. Room to negotiate.", source: "Facebook Marketplace", assignedTo: { type: "human", name: "Jake Rivera" } },
  { id: 8, customer: "Sandra Lee", vehicle: "2025 Highlander XLE", value: 42900, stage: "lead", salesperson: "Unassigned", daysInStage: 0, notes: "Autotrader lead. Requested info on Highlander lease specials.", source: "Autotrader", assignedTo: { type: "ai", name: "Alex (AI)" } },
  { id: 9, customer: "Patricia Adams", vehicle: "2025 Camry LE", value: 28400, stage: "sold", salesperson: "Lisa Chen", daysInStage: 0, notes: "Delivered yesterday. Extra Care Gold + GAP added. Great deal.", source: "AI -- Service Upsell", assignedTo: { type: "human", name: "Lisa Chen" } },
  { id: 10, customer: "Daniel Green", vehicle: "2025 GR86 Premium", value: 33500, stage: "sold", salesperson: "Jake Rivera", daysInStage: 0, notes: "Cash deal. ToyoGuard added. Enthusiast buyer.", source: "Walk-In", assignedTo: { type: "human", name: "Jake Rivera" } },
];

export default function SalesPipeline() {
  const [selectedDeal, setSelectedDeal] = useState(null);

  function openChat(prompt) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", {
      detail: { message: prompt }
    }));
  }

  const totalPipeline = PIPELINE_DEALS.filter((d) => d.stage !== "sold").reduce((s, d) => s + d.value, 0);
  const soldThisMonth = PIPELINE_DEALS.filter((d) => d.stage === "sold");
  const soldValue = soldThisMonth.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Sales Pipeline</h1>
          <p className="subtle">Active deals by stage</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => openChat("Give me a pipeline summary. What deals are stalling and what should I prioritize today?")}
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
        >
          AI Pipeline Brief
        </button>
      </div>

      {/* Pipeline KPIs */}
      <div className="kpiRow" style={{ marginBottom: "20px" }}>
        <div className="card kpiCard">
          <div className="kpiLabel">Active Deals</div>
          <div className="kpiValue">{PIPELINE_DEALS.filter((d) => d.stage !== "sold").length}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Pipeline Value</div>
          <div className="kpiValue">${totalPipeline.toLocaleString()}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Sold This Month</div>
          <div className="kpiValue">{soldThisMonth.length}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Sold Value</div>
          <div className="kpiValue" style={{ color: "#16a34a" }}>${soldValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Pipeline board */}
      <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }}>
        {PIPELINE_STAGES.map((stage) => {
          const deals = PIPELINE_DEALS.filter((d) => d.stage === stage.id);
          const stageValue = deals.reduce((s, d) => s + d.value, 0);
          return (
            <div key={stage.id} style={{ minWidth: "220px", flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", padding: "0 4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: stage.color }} />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{stage.label}</span>
                </div>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>{deals.length}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px", padding: "0 4px" }}>
                ${stageValue.toLocaleString()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="card"
                    style={{ padding: "12px", cursor: "pointer", borderLeft: `3px solid ${stage.color}` }}
                    onClick={() => {
                      setSelectedDeal(deal);
                      openChat(`Tell me about the ${deal.customer} deal for the ${deal.vehicle}. Current stage: ${stage.label}. What should we do next?`);
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "2px" }}>{deal.customer}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>{deal.vehicle}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>${deal.value.toLocaleString()}</span>
                      {deal.daysInStage > 3 && (
                        <span style={{ fontSize: "10px", fontWeight: 600, padding: "1px 6px", borderRadius: "4px", background: "#fee2e2", color: "#dc2626" }}>
                          {deal.daysInStage}d
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>{deal.source}</div>
                      <span style={{ fontSize: "10px", fontWeight: 600, padding: "1px 6px", borderRadius: "9999px", background: deal.assignedTo?.type === "ai" ? "#f3e8ff" : "#f1f5f9", color: deal.assignedTo?.type === "ai" ? "#7c3aed" : "#475569" }}>
                        {deal.assignedTo?.type === "ai" ? "AI" : (deal.assignedTo?.name?.split(" ").map(n => n[0]).join("") || deal.salesperson.split(" ").map(n => n[0]).join(""))}
                      </span>
                    </div>
                  </div>
                ))}
                {deals.length === 0 && (
                  <div style={{ padding: "20px 12px", textAlign: "center", fontSize: "12px", color: "#cbd5e1", border: "1px dashed #e2e8f0", borderRadius: "8px" }}>
                    No deals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
