import React from "react";

const ASSET_CATEGORIES = [
  { id: "vehicles", label: "Vehicles", icon: "V", color: "#7c3aed", description: "Cars, trucks, motorcycles, boats" },
  { id: "property", label: "Property", icon: "P", color: "#2563eb", description: "Homes, land, rental properties" },
  { id: "financial", label: "Financial Accounts", icon: "F", color: "#16a34a", description: "Bank accounts, investments, retirement" },
];

export default function VaultAssets() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Assets</h1>
          <p className="subtle">Vehicles, property, and financial accounts you own</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: "I want to add a new asset to track" } }))}
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
        >
          Add Asset
        </button>
      </div>

      {/* Category Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "20px" }}>
        {ASSET_CATEGORIES.map(cat => (
          <div key={cat.id} className="card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px",
                background: `${cat.color}15`, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", fontWeight: 700, color: cat.color,
              }}>
                {cat.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>{cat.label}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{cat.description}</div>
              </div>
            </div>
            <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "10px" }}>No {cat.label.toLowerCase()} tracked yet</div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: `I want to add a ${cat.label.toLowerCase().slice(0, -1) || cat.label.toLowerCase()} to my vault` } }))}
                style={{ fontSize: "13px", fontWeight: 600, color: "#7c3aed", background: "none", border: "none", cursor: "pointer" }}
              >
                Add First {cat.label.endsWith("s") ? cat.label.slice(0, -1) : cat.label}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="card" style={{ padding: "24px" }}>
        <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b", marginBottom: "4px" }}>About Asset Tracking</div>
        <div style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.6 }}>
          When you add assets, your AI will automatically track market values, detect important deadlines (registration renewals, insurance expirations), and help you understand what you own. Start by adding one item — a vehicle VIN, a property address, or an account name.
        </div>
      </div>
    </div>
  );
}
