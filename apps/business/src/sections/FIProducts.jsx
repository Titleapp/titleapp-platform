import React, { useState } from "react";

const FINANCING_PRODUCTS = [
  {
    id: "tmcc-standard",
    name: "TMCC Standard",
    type: "financing",
    rateRange: "4.9% – 8.9%",
    creditMin: 650,
    termRange: "24–84 months",
    notes: "Toyota Motor Credit Corp. Tier 1 financing for new and CPO vehicles.",
    dealerCostRange: "$0",
    estimatedProfit: "Reserve markup 1–2%",
  },
  {
    id: "tmcc-subprime",
    name: "TMCC Subprime",
    type: "financing",
    rateRange: "9.9% – 18.9%",
    creditMin: 520,
    termRange: "24–72 months",
    notes: "Toyota Motor Credit subprime program. Higher reserve opportunity.",
    dealerCostRange: "$0",
    estimatedProfit: "Reserve markup 2–4%",
  },
  {
    id: "se-toyota",
    name: "Southeast Toyota Finance",
    type: "financing",
    rateRange: "4.49% – 7.9%",
    creditMin: 660,
    termRange: "24–84 months",
    notes: "Regional lender for Southeast Toyota distributors. Competitive rates.",
    dealerCostRange: "$0",
    estimatedProfit: "Reserve markup 1–2%",
  },
  {
    id: "chase-auto",
    name: "Chase Auto Direct",
    type: "financing",
    rateRange: "5.49% – 9.9%",
    creditMin: 620,
    termRange: "24–84 months",
    notes: "National lender. Good for near-prime customers who don't qualify for TMCC.",
    dealerCostRange: "$0",
    estimatedProfit: "Reserve markup 1.5–2.5%",
  },
  {
    id: "capital-one",
    name: "Capital One Auto",
    type: "financing",
    rateRange: "6.9% – 14.9%",
    creditMin: 580,
    termRange: "24–72 months",
    notes: "Broad credit spectrum. Flexible on trade equity and LTV.",
    dealerCostRange: "$0",
    estimatedProfit: "Reserve markup 2–3%",
  },
  {
    id: "tfs-lease-standard",
    name: "TFS Lease Standard",
    type: "lease",
    rateRange: ".00125 – .00295 MF",
    creditMin: 650,
    termRange: "24–48 months",
    notes: "Toyota Financial Services standard lease. Money factor varies by model and term.",
    dealerCostRange: "$0",
    estimatedProfit: "MF markup + acquisition fee",
  },
  {
    id: "tfs-lease-special",
    name: "TFS Lease Special",
    type: "lease",
    rateRange: ".00098 – .00195 MF",
    creditMin: 680,
    termRange: "24–36 months",
    notes: "Select models only. Promotional money factors for qualified buyers.",
    dealerCostRange: "$0",
    estimatedProfit: "MF markup + acquisition fee",
  },
];

const PROTECTION_PRODUCTS = [
  {
    id: "extra-care-platinum",
    name: "Toyota Extra Care Platinum",
    type: "warranty",
    priceRange: "$1,295 – $3,895",
    coverage: "1,500+ components",
    dealerCost: "$650 – $1,800",
    estimatedProfit: "$645 – $2,095",
    notes: "Comprehensive bumper-to-bumper. Best for new vehicle buyers financing 60+ months.",
  },
  {
    id: "extra-care-gold",
    name: "Toyota Extra Care Gold",
    type: "warranty",
    priceRange: "$995 – $2,995",
    coverage: "900+ components",
    dealerCost: "$500 – $1,400",
    estimatedProfit: "$495 – $1,595",
    notes: "Strong coverage minus some luxury components. Best for CPO and late-model used.",
  },
  {
    id: "gap",
    name: "GAP Coverage",
    type: "protection",
    priceRange: "$595 – $895",
    coverage: "Covers loan-to-value gap in total loss",
    dealerCost: "$195 – $295",
    estimatedProfit: "$400 – $600",
    notes: "Essential for customers with low down payment or negative equity trade-ins.",
  },
  {
    id: "toyoguard-platinum",
    name: "ToyoGuard Platinum",
    type: "protection",
    priceRange: "$995 – $1,295",
    coverage: "Paint protection, interior, key, dent & ding",
    dealerCost: "$350 – $495",
    estimatedProfit: "$645 – $800",
    notes: "Bundled appearance package. High margin. Easy to present as monthly payment add.",
  },
  {
    id: "tire-wheel",
    name: "Tire & Wheel Protection",
    type: "protection",
    priceRange: "$495 – $895",
    coverage: "Road hazard tire/wheel replacement",
    dealerCost: "$150 – $295",
    estimatedProfit: "$345 – $600",
    notes: "Good for Texas roads. Present with pothole/road hazard data.",
  },
  {
    id: "key-replacement",
    name: "Key Replacement",
    type: "protection",
    priceRange: "$395 – $495",
    coverage: "Lost/stolen/damaged key fob replacement",
    dealerCost: "$95 – $145",
    estimatedProfit: "$300 – $350",
    notes: "Modern key fobs cost $300–$600 to replace. Easy close.",
  },
  {
    id: "windshield",
    name: "Windshield Protection",
    type: "protection",
    priceRange: "$295 – $395",
    coverage: "Windshield chip repair and replacement",
    dealerCost: "$75 – $120",
    estimatedProfit: "$220 – $275",
    notes: "Low cost, high margin. Bundle with Tire & Wheel for discount.",
  },
];

export default function FIProducts() {
  const [activeTab, setActiveTab] = useState("financing");

  function openChat(prompt) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", {
      detail: { message: prompt }
    }));
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">F&I Products</h1>
          <p className="subtle">Financing, warranties, and protection products</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => openChat("What F&I products should I recommend for a customer with a 680 credit score buying a new Camry?")}
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
        >
          Ask COS
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", marginBottom: "20px", borderBottom: "2px solid #e2e8f0" }}>
        {[
          { id: "financing", label: `Financing (${FINANCING_PRODUCTS.length})` },
          { id: "protection", label: `Protection Products (${PROTECTION_PRODUCTS.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #7c3aed" : "2px solid transparent",
              background: "transparent",
              color: activeTab === tab.id ? "#7c3aed" : "#64748b",
              cursor: "pointer",
              marginBottom: "-2px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Financing Tab */}
      {activeTab === "financing" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          {FINANCING_PRODUCTS.map((product) => (
            <div key={product.id} className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>{product.name}</div>
                  <span style={{
                    display: "inline-block",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    background: product.type === "lease" ? "#dbeafe" : "#ede9fe",
                    color: product.type === "lease" ? "#2563eb" : "#7c3aed",
                    marginTop: "4px",
                    textTransform: "uppercase",
                  }}>{product.type}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b" }}>{product.rateRange}</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>Min credit: {product.creditMin}</div>
                </div>
              </div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "10px" }}>{product.notes}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#94a3b8", borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
                <span>Terms: {product.termRange}</span>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>{product.estimatedProfit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Protection Products Tab */}
      {activeTab === "protection" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          {PROTECTION_PRODUCTS.map((product) => (
            <div key={product.id} className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>{product.name}</div>
                  <span style={{
                    display: "inline-block",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    background: product.type === "warranty" ? "#fef3c7" : "#dbeafe",
                    color: product.type === "warranty" ? "#d97706" : "#2563eb",
                    marginTop: "4px",
                    textTransform: "uppercase",
                  }}>{product.type}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b" }}>{product.priceRange}</div>
                </div>
              </div>
              <div style={{ fontSize: "13px", color: "#334155", marginBottom: "6px" }}>{product.coverage}</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "10px" }}>{product.notes}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
                <span style={{ color: "#94a3b8" }}>Dealer cost: {product.dealerCost}</span>
                <span style={{ color: "#16a34a", fontWeight: 700 }}>Profit: {product.estimatedProfit}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
