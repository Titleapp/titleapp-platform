import React from "react";

export default function VaultDeadlines() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Deadlines</h1>
          <p className="subtle">Upcoming expirations, renewals, and important dates</p>
        </div>
      </div>

      {/* Empty State */}
      <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>No deadlines to track yet</div>
        <div style={{ fontSize: "14px", color: "#64748b", maxWidth: "400px", margin: "0 auto", lineHeight: 1.6, marginBottom: "20px" }}>
          As you add documents and assets, your AI will automatically detect expiration dates, renewal deadlines, and important dates. You will never miss a registration, insurance renewal, or passport expiration again.
        </div>
        <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px" }}>
          Deadlines are auto-populated from your documents and assets.
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: "What deadlines can you help me track?" } }))}
          style={{ padding: "10px 20px", fontSize: "14px", fontWeight: 600, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer" }}
        >
          Learn More
        </button>
      </div>

      {/* What gets tracked */}
      <div className="card" style={{ padding: "24px", marginTop: "14px" }}>
        <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b", marginBottom: "16px" }}>What We Track</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[
            { label: "Vehicle Registrations", detail: "Expiration dates, renewal reminders" },
            { label: "Insurance Policies", detail: "Renewal dates, coverage gaps" },
            { label: "Passports & IDs", detail: "Expiration dates, travel validity" },
            { label: "Property Taxes", detail: "Due dates, payment tracking" },
            { label: "Leases & Mortgages", detail: "Payment schedules, end dates" },
            { label: "Warranties", detail: "Coverage periods, service windows" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#d97706", flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#1e293b" }}>{item.label}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
