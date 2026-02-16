import React, { useState } from "react";

interface InvestmentCriteriaProps {
  onComplete: (criteria: any) => void;
  onSkip: () => void;
}

export default function InvestmentCriteriaStep({ onComplete, onSkip }: InvestmentCriteriaProps) {
  const [mode, setMode] = useState<"choose" | "novice" | "experienced">("choose");

  // Novice preset
  const [noviceRisk, setNoviceRisk] = useState("medium");

  // Experienced parameters
  const [dealTypes, setDealTypes] = useState<string[]>(["private_equity"]);
  const [minNetIRR, setMinNetIRR] = useState("");
  const [minCashOnCash, setMinCashOnCash] = useState("");
  const [minEquityMultiple, setMinEquityMultiple] = useState("");
  const [riskTolerance, setRiskTolerance] = useState("medium");
  const [dealSizeMin, setDealSizeMin] = useState("");
  const [dealSizeMax, setDealSizeMax] = useState("");

  function handleNoviceComplete() {
    const criteria = {
      target_asset_types: ["private_equity"],
      risk_tolerance: noviceRisk,
      min_net_irr: noviceRisk === "low" ? 20 : noviceRisk === "medium" ? 15 : 12,
      min_equity_multiple: 2.0,
      onboarding_preset: "novice",
    };
    onComplete(criteria);
  }

  function handleExperiencedComplete() {
    const criteria: any = {
      target_asset_types: dealTypes,
      risk_tolerance: riskTolerance,
      onboarding_preset: "experienced",
    };

    if (minNetIRR) criteria.min_net_irr = parseFloat(minNetIRR);
    if (minCashOnCash) criteria.min_cash_on_cash = parseFloat(minCashOnCash);
    if (minEquityMultiple) criteria.min_equity_multiple = parseFloat(minEquityMultiple);
    if (dealSizeMin) criteria.deal_size_min = parseFloat(dealSizeMin);
    if (dealSizeMax) criteria.deal_size_max = parseFloat(dealSizeMax);

    onComplete(criteria);
  }

  function toggleDealType(type: string) {
    if (dealTypes.includes(type)) {
      setDealTypes(dealTypes.filter(t => t !== type));
    } else {
      setDealTypes([...dealTypes, type]);
    }
  }

  if (mode === "choose") {
    return (
      <div style={{ display: "grid", gap: "24px" }}>
        <div>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: 700 }}>
            Investment Experience
          </h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
            Help us set up your deal screening criteria
          </p>
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          <button
            onClick={() => setMode("novice")}
            style={{
              padding: "20px",
              textAlign: "left",
              background: "white",
              border: "2px solid #e5e7eb",
              borderRadius: "12px",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
              🌱 I'm new to investing
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>
              We'll set up sensible defaults and guide you through the basics
            </div>
          </button>

          <button
            onClick={() => setMode("experienced")}
            style={{
              padding: "20px",
              textAlign: "left",
              background: "white",
              border: "2px solid #e5e7eb",
              borderRadius: "12px",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
              💼 I have a target box
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>
              Define specific criteria: IRR targets, deal size, risk parameters
            </div>
          </button>
        </div>

        <button
          onClick={onSkip}
          style={{
            padding: "12px",
            fontSize: "14px",
            background: "transparent",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          Skip for now (set up later in Settings)
        </button>
      </div>
    );
  }

  if (mode === "novice") {
    return (
      <div style={{ display: "grid", gap: "24px" }}>
        <div>
          <button
            onClick={() => setMode("choose")}
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              background: "transparent",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              cursor: "pointer",
              marginBottom: "16px",
            }}
          >
            ← Back
          </button>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: 700 }}>
            Getting Started with Deal Analysis
          </h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
            We'll set up conservative defaults to protect you
          </p>
        </div>

        <div
          style={{
            padding: "16px",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "8px",
            fontSize: "14px",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "8px" }}>📚 What we'll set up:</div>
          <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
            <li>Minimum 15% net IRR target (industry standard)</li>
            <li>2x equity multiple minimum (double your money)</li>
            <li>Evidence-first analysis (no assumptions without data)</li>
            <li>Red flags for high-risk sectors (crypto, pre-revenue, etc.)</li>
          </ul>
        </div>

        <label style={{ display: "grid", gap: "12px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>
            How conservative should we be?
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            {[
              { value: "low", label: "Conservative (20% IRR min)", desc: "Only strong, proven deals" },
              { value: "medium", label: "Balanced (15% IRR min)", desc: "Industry standard" },
              { value: "high", label: "Aggressive (12% IRR min)", desc: "More opportunities, higher risk" },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setNoviceRisk(option.value)}
                style={{
                  padding: "16px",
                  textAlign: "left",
                  background: noviceRisk === option.value ? "rgba(124,58,237,0.1)" : "white",
                  border: noviceRisk === option.value ? "2px solid rgb(124,58,237)" : "2px solid #e5e7eb",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 600 }}>{option.label}</div>
                <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
                  {option.desc}
                </div>
              </button>
            ))}
          </div>
        </label>

        <button
          onClick={handleNoviceComplete}
          style={{
            padding: "14px",
            fontSize: "15px",
            fontWeight: 600,
            background: "rgb(124,58,237)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Continue with These Settings →
        </button>
      </div>
    );
  }

  // Experienced mode
  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <div>
        <button
          onClick={() => setMode("choose")}
          style={{
            padding: "8px 12px",
            fontSize: "14px",
            background: "transparent",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            cursor: "pointer",
            marginBottom: "16px",
          }}
        >
          ← Back
        </button>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: 700 }}>
          Define Your Target Box
        </h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
          Set specific criteria for deal screening
        </p>
      </div>

      <label style={{ display: "grid", gap: "8px" }}>
        <div style={{ fontSize: "14px", fontWeight: 600 }}>Deal Types *</div>
        <div style={{ display: "grid", gap: "8px" }}>
          {[
            { value: "private_equity", label: "Private Equity" },
            { value: "commercial_real_estate", label: "Commercial Real Estate" },
            { value: "refinance", label: "Refinance" },
            { value: "conversion", label: "Conversion" },
            { value: "entitlement", label: "Entitlement" },
            { value: "debt_acquisition", label: "Debt Acquisition" },
          ].map(type => (
            <button
              key={type.value}
              onClick={() => toggleDealType(type.value)}
              style={{
                padding: "12px",
                textAlign: "left",
                background: dealTypes.includes(type.value) ? "rgba(124,58,237,0.1)" : "white",
                border: dealTypes.includes(type.value) ? "1px solid rgb(124,58,237)" : "1px solid #e5e7eb",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              {dealTypes.includes(type.value) ? "✓ " : ""}{type.label}
            </button>
          ))}
        </div>
      </label>

      <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "1fr 1fr" }}>
        <label style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Min Net IRR (%)</div>
          <input
            type="number"
            value={minNetIRR}
            onChange={(e) => setMinNetIRR(e.target.value)}
            placeholder="15"
            style={{
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Min Cash-on-Cash (%)</div>
          <input
            type="number"
            value={minCashOnCash}
            onChange={(e) => setMinCashOnCash(e.target.value)}
            placeholder="8"
            style={{
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Min Equity Multiple</div>
          <input
            type="number"
            step="0.1"
            value={minEquityMultiple}
            onChange={(e) => setMinEquityMultiple(e.target.value)}
            placeholder="2.0"
            style={{
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Risk Tolerance *</div>
          <select
            value={riskTolerance}
            onChange={(e) => setRiskTolerance(e.target.value)}
            style={{
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              background: "white",
            }}
          >
            <option value="low">Conservative</option>
            <option value="medium">Balanced</option>
            <option value="high">Aggressive</option>
          </select>
        </label>
      </div>

      <label style={{ display: "grid", gap: "8px" }}>
        <div style={{ fontSize: "14px", fontWeight: 600 }}>Deal Size Range (USD)</div>
        <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "1fr 1fr" }}>
          <input
            type="number"
            value={dealSizeMin}
            onChange={(e) => setDealSizeMin(e.target.value)}
            placeholder="Min (e.g., 500000)"
            style={{
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
          />
          <input
            type="number"
            value={dealSizeMax}
            onChange={(e) => setDealSizeMax(e.target.value)}
            placeholder="Max (e.g., 10000000)"
            style={{
              padding: "10px 12px",
              fontSize: "14px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
          />
        </div>
      </label>

      <button
        onClick={handleExperiencedComplete}
        disabled={dealTypes.length === 0}
        style={{
          padding: "14px",
          fontSize: "15px",
          fontWeight: 600,
          background: dealTypes.length === 0 ? "#9ca3af" : "rgb(124,58,237)",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: dealTypes.length === 0 ? "not-allowed" : "pointer",
        }}
      >
        Save Investment Criteria →
      </button>

      <p style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", margin: 0 }}>
        You can refine these parameters later in Settings
      </p>
    </div>
  );
}
