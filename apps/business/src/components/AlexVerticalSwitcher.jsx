import React from "react";

const WORKER_VERTICALS = {
  "cre-analyst": "Real Estate",
  "cre-deal-analyst": "Real Estate",
  "construction-manager": "Real Estate",
  "construction-lending": "Real Estate",
  "capital-stack-optimizer": "Real Estate",
  "site-selector": "Real Estate",
  "zoning-analyst": "Real Estate",
  "environmental-compliance": "Real Estate",
  "title-escrow": "Title & Escrow",
  "digital-title-agent": "Title & Escrow",
  "contract-review": "Title & Escrow",
  "pilot-pro": "Aviation",
  "pilot-pro-plus": "Aviation",
  "flight-crew-scheduler": "Aviation",
  "part-135-assistant": "Aviation",
  "gom-authoring": "Aviation",
  "ad-sb-tracker": "Aviation",
  "safety-reporting": "Aviation",
  "charter-quoting": "Aviation",
  "dealer-licensing": "Auto Dealer",
  "ftc-safeguards": "Auto Dealer",
  "auction-intelligence": "Auto Dealer",
  "trade-in-valuation": "Auto Dealer",
  "market-pricing": "Auto Dealer",
  "lead-management": "Auto Dealer",
  "desking-deal-structure": "Auto Dealer",
  "fi-menu-builder": "Auto Dealer",
  "lender-matching": "Auto Dealer",
  "equity-mining": "Auto Dealer",
  "investor-relations": "Investment",
  "investment-analyst": "Investment",
  "mortgage-underwriter": "Mortgage",
  "income-verification": "Mortgage",
  "credit-analysis": "Mortgage",
  "property-manager": "Property Management",
  "tenant-screening": "Property Management",
  "health-ems": "Health & EMS",
  "government": "Government",
  "solar-sales-closer": "Solar Energy",
  "solar-permit-navigator": "Solar Energy",
  "solar-hoa-approval": "Solar Energy",
  "solar-insurance-warranty": "Solar Energy",
  "solar-easement-title": "Solar Energy",
  "solar-incentive-tracker": "Solar Energy",
  "solar-system-monitor": "Solar Energy",
  "solar-credit-ledger": "Solar Energy",
  "srec-exchange-compliance": "Solar Energy",
};

const VERTICAL_ICONS = {
  "Real Estate": "\u{1F3D7}",
  "Title & Escrow": "\u{1F4DC}",
  "Aviation": "\u{2708}",
  "Auto Dealer": "\u{1F697}",
  "Investment": "\u{1F4C8}",
  "Mortgage": "\u{1F3E0}",
  "Property Management": "\u{1F3E2}",
  "Health & EMS": "\u{1F3E5}",
  "Government": "\u{1F3DB}",
  "Solar Energy": "\u2600",
};

export function getVerticalsFromWorkers(activeWorkers = []) {
  const verticalMap = {};
  for (const slug of activeWorkers) {
    const vertical = WORKER_VERTICALS[slug];
    if (vertical) {
      if (!verticalMap[vertical]) verticalMap[vertical] = [];
      verticalMap[vertical].push(slug);
    }
  }
  return Object.entries(verticalMap).map(([name, workers]) => ({
    name,
    icon: VERTICAL_ICONS[name] || "",
    workerCount: workers.length,
    slugs: workers,
  }));
}

export default function AlexVerticalSwitcher({ verticals, focusedVertical, onFocus }) {
  return (
    <div style={{
      width: 240, minWidth: 240, background: "#0b1020",
      color: "#e5e7eb", display: "flex", flexDirection: "column",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      height: "100vh", overflow: "auto",
    }}>
      <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em", color: "#a78bfa" }}>
          Alex
        </div>
        <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Chief of Staff</div>
      </div>

      <div style={{ padding: "8px 8px 0" }}>
        {focusedVertical && (
          <button
            onClick={() => onFocus(null)}
            style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "6px 12px", marginBottom: 4,
              background: "none", border: "none", color: "#a78bfa",
              fontSize: 12, cursor: "pointer",
            }}
          >
            Back to All
          </button>
        )}

        <button
          onClick={() => onFocus(null)}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", textAlign: "left",
            padding: "10px 12px", marginBottom: 2, borderRadius: 8,
            background: !focusedVertical ? "rgba(124,58,237,0.15)" : "transparent",
            border: !focusedVertical ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
            color: !focusedVertical ? "#a78bfa" : "#e5e7eb",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          All Verticals
        </button>

        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 0" }} />

        {verticals.map(v => (
          <button
            key={v.name}
            onClick={() => onFocus(v.name)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", textAlign: "left",
              padding: "10px 12px", marginBottom: 2, borderRadius: 8,
              background: focusedVertical === v.name ? "rgba(124,58,237,0.15)" : "transparent",
              border: focusedVertical === v.name ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
              color: focusedVertical === v.name ? "#a78bfa" : "#e5e7eb",
              fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            <span>{v.icon} {v.name}</span>
            <span style={{
              background: "rgba(255,255,255,0.08)", borderRadius: 10,
              padding: "2px 8px", fontSize: 11, color: "#94a3b8",
            }}>
              {v.workerCount}
            </span>
          </button>
        ))}

        {verticals.length === 0 && (
          <div style={{ padding: "20px 12px", color: "#64748B", fontSize: 12, textAlign: "center" }}>
            No active worker subscriptions yet
          </div>
        )}
      </div>
    </div>
  );
}
