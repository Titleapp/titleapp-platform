import React, { useState } from "react";

const DEALS = [
  { id: 1, name: "TechBridge Solutions Acquisition", type: "Acquisition", stage: "Due Diligence", value: "$45M", assignedTo: "Sarah Chen", source: "Broker Listing", daysInStage: 12, notes: "$45M revenue, 22% EBITDA margin. Risk score: 58/100. Comparable transactions suggest 2.8x fair." },
  { id: 2, name: "Parkview Apartments -- 48 Units", type: "Investment", stage: "Initial Review", value: "$8.2M", assignedTo: "Michael Torres", source: "Public Records -- CMBS", daysInStage: 5, notes: "CMBS loan matures Aug 2026. Matches multifamily criteria. Cap rate estimate: 6.2%." },
  { id: 3, name: "Desert Ridge Office Plaza", type: "Investment", stage: "Negotiation", value: "$12.5M", assignedTo: "Michael Torres", source: "CBRE Listing", daysInStage: 18, notes: "Below market ask for submarket. Low risk (38). Tenant rollover risk in 2027." },
  { id: 4, name: "ClearView Analytics Series C", type: "Investment", stage: "Due Diligence", value: "$5M", assignedTo: "Sarah Chen", source: "Direct", daysInStage: 8, notes: "Series C participation. Current position holder. Strong product-market fit, growing ARR." },
  { id: 5, name: "Cactus Lane Industrial", type: "Acquisition", stage: "Initial Review", value: "$3.1M", assignedTo: "David Park", source: "Tax Lien Records", daysInStage: 3, notes: "Tax lien filed. Potential distressed acquisition. High risk (78). Needs environmental review." },
  { id: 6, name: "Sunrise Senior Living Portfolio", type: "Investment", stage: "Term Sheet", value: "$15M", assignedTo: "Sarah Chen", source: "Notice of Default", daysInStage: 22, notes: "NOD filed Jan 2026. Lender may accept discount. 3 facilities, 180 beds total." },
  { id: 7, name: "Quantum Computing Inc IPO", type: "Disposition", stage: "Monitoring", value: "$2.8M", assignedTo: "David Park", source: "Portfolio", daysInStage: 45, notes: "IPO expected Q2 2026. Lock-up period planning. Current unrealized gain: +38%." },
  { id: 8, name: "Iron Ridge Mining Divestiture", type: "Disposition", stage: "Marketing", value: "$3.0M", assignedTo: "Michael Torres", source: "Portfolio", daysInStage: 14, notes: "Position underperforming. Energy sector headwinds. Seeking secondary buyer." },
];

const STAGES = ["Initial Review", "Due Diligence", "Negotiation", "Term Sheet", "Monitoring", "Marketing"];

const STAGE_COLORS = {
  "Initial Review": "#64748b",
  "Due Diligence": "#2563eb",
  "Negotiation": "#d97706",
  "Term Sheet": "#7c3aed",
  "Monitoring": "#16a34a",
  "Marketing": "#ec4899",
};

const TYPE_STYLES = {
  "Acquisition": { bg: "#dbeafe", color: "#2563eb" },
  "Investment": { bg: "#dcfce7", color: "#16a34a" },
  "Disposition": { bg: "#fef3c7", color: "#d97706" },
};

export default function DealPipeline() {
  const [view, setView] = useState("table");
  const [expandedId, setExpandedId] = useState(null);

  const totalValue = DEALS.reduce((s, d) => {
    const val = parseFloat(d.value.replace(/[$M,]/g, ""));
    return s + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Deal Pipeline</h1>
          <p className="subtle">Active deals, acquisitions, and investment opportunities</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setView("table")} style={{ padding: "8px 14px", borderRadius: "8px", border: view === "table" ? "2px solid #7c3aed" : "1px solid #e2e8f0", background: view === "table" ? "#f3e8ff" : "white", color: view === "table" ? "#7c3aed" : "#64748b", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            Table
          </button>
          <button onClick={() => setView("kanban")} style={{ padding: "8px 14px", borderRadius: "8px", border: view === "kanban" ? "2px solid #7c3aed" : "1px solid #e2e8f0", background: view === "kanban" ? "#f3e8ff" : "white", color: view === "kanban" ? "#7c3aed" : "#64748b", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            Kanban
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Active Deals</div>
          <div className="kpiValue">{DEALS.length}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Total Pipeline Value</div>
          <div className="kpiValue">${totalValue.toFixed(1)}M</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">In Due Diligence</div>
          <div className="kpiValue">{DEALS.filter(d => d.stage === "Due Diligence").length}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Near Close</div>
          <div className="kpiValue">{DEALS.filter(d => d.stage === "Term Sheet" || d.stage === "Negotiation").length}</div>
        </div>
      </div>

      {view === "table" ? (
        <div className="card" style={{ marginTop: "14px" }}>
          <div className="tableWrap">
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Type</th>
                  <th>Stage</th>
                  <th>Value</th>
                  <th>Assigned To</th>
                  <th>Days in Stage</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {DEALS.map(deal => {
                  const ts = TYPE_STYLES[deal.type] || TYPE_STYLES.Investment;
                  const sc = STAGE_COLORS[deal.stage] || "#64748b";
                  return (
                    <React.Fragment key={deal.id}>
                      <tr style={{ cursor: "pointer" }} onClick={() => setExpandedId(expandedId === deal.id ? null : deal.id)}>
                        <td className="tdStrong">{deal.name}</td>
                        <td>
                          <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: ts.bg, color: ts.color }}>
                            {deal.type}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: `${sc}18`, color: sc }}>
                            {deal.stage}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{deal.value}</td>
                        <td style={{ fontSize: "13px" }}>{deal.assignedTo}</td>
                        <td style={{ fontSize: "13px", color: deal.daysInStage > 20 ? "#d97706" : "#64748b" }}>
                          {deal.daysInStage}d
                        </td>
                        <td style={{ fontSize: "12px", color: "#64748b" }}>{deal.source}</td>
                      </tr>
                      {expandedId === deal.id && (
                        <tr>
                          <td colSpan={7} style={{ padding: "12px 16px", background: "#f8fafc", fontSize: "13px", color: "#475569", lineHeight: 1.6, borderBottom: "2px solid #e2e8f0" }}>
                            {deal.notes}
                            <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                              <button
                                className="iconBtn" style={{ fontSize: "12px" }}
                                onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: `Analyze the deal: ${deal.name}. ${deal.notes}` } })); }}
                              >Analyze with AI</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div style={{ display: "flex", gap: "12px", marginTop: "14px", overflowX: "auto", paddingBottom: "8px" }}>
          {STAGES.map(stage => {
            const stageDeals = DEALS.filter(d => d.stage === stage);
            const sc = STAGE_COLORS[stage] || "#64748b";
            return (
              <div key={stage} style={{ minWidth: "240px", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", padding: "0 4px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: sc }} />
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#1e293b" }}>{stage}</div>
                  <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>({stageDeals.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {stageDeals.length > 0 ? stageDeals.map(deal => {
                    const ts = TYPE_STYLES[deal.type] || TYPE_STYLES.Investment;
                    return (
                      <div key={deal.id} className="card" style={{ padding: "14px" }}>
                        <div style={{ fontWeight: 600, fontSize: "14px", color: "#1e293b", marginBottom: "6px" }}>{deal.name}</div>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                          <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "9999px", background: ts.bg, color: ts.color }}>{deal.type}</span>
                        </div>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>{deal.value}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{deal.assignedTo} -- {deal.daysInStage}d</div>
                      </div>
                    );
                  }) : (
                    <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "12px", border: "1px dashed #e2e8f0", borderRadius: "8px" }}>
                      No deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
