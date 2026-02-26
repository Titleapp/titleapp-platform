import React from "react";

const BUILT_IN_TOOLS = [
  {
    id: "cap-table",
    name: "Cap Table Viewer",
    description: "See your ownership stakes across any company using TitleApp",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="3" y1="9" x2="21" y2="9"></line>
        <line x1="9" y1="21" x2="9" y2="9"></line>
      </svg>
    ),
    comingSoon: true,
  },
  {
    id: "tokens",
    name: "My Tokens",
    description: "Manage blockchain tokens and ownership records",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v12"></path>
        <path d="M6 12h12"></path>
      </svg>
    ),
    comingSoon: true,
  },
  {
    id: "voting",
    name: "Voting",
    description: "Active proposals and governance decisions",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4"></polyline>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
      </svg>
    ),
    comingSoon: true,
  },
  {
    id: "identity",
    name: "My Identity (KYC)",
    description: "Verified identity status, reusable across TitleApp",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
    ),
    comingSoon: true,
  },
  {
    id: "data-rooms",
    name: "Data Rooms",
    description: "Access shared data rooms you've been invited to",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
    ),
    comingSoon: true,
  },
  {
    id: "investments",
    name: "My Investments",
    description: "Portfolio of investments made through TitleApp",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
    ),
    comingSoon: true,
  },
];

const SAMPLE_SUBSCRIPTIONS = [
  { id: "s1", name: "Relocation Expert AI", price: "$15/mo", creator: "MoveSmart LLC", status: "Active" },
  { id: "s2", name: "Tax Advisor", price: "$9/mo", creator: "TaxPro AI", status: "Active" },
];

export default function VaultTools() {

  function handleNavigate(section) {
    window.dispatchEvent(new CustomEvent("ta:navigate", { detail: { section } }));
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">AI Tools</h1>
          <p className="subtle">Your Digital Workers and built-in tools</p>
        </div>
      </div>

      {/* Subscriptions */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 12 }}>My Digital Workers</div>
        {SAMPLE_SUBSCRIPTIONS.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {SAMPLE_SUBSCRIPTIONS.map(sub => (
              <div
                key={sub.id}
                className="card"
                style={{
                  padding: 20,
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                  border: "1px solid #e2e8f0",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#7c3aed")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontWeight: 700, fontSize: 14, marginBottom: 12,
                }}>
                  {sub.name.charAt(0)}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b", marginBottom: 4 }}>{sub.name}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>by {sub.creator}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>{sub.price}</span>
                  <span style={{
                    padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                    background: "#dcfce7", color: "#16a34a",
                  }}>
                    {sub.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
            No active subscriptions.{" "}
            <span
              onClick={() => handleNavigate("raas-store")}
              style={{ color: "#7c3aed", cursor: "pointer", textDecoration: "underline" }}
            >
              Browse the Marketplace
            </span>
          </div>
        )}
      </div>

      {/* Built-in Tools */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#374141", marginBottom: 12 }}>Built-in Tools</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {BUILT_IN_TOOLS.map(tool => (
            <div
              key={tool.id}
              className="card"
              style={{
                padding: 20,
                cursor: tool.comingSoon ? "default" : "pointer",
                transition: "border-color 0.2s",
                border: "1px solid #e2e8f0",
                position: "relative",
                opacity: tool.comingSoon ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!tool.comingSoon) e.currentTarget.style.borderColor = "#7c3aed"; }}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
            >
              {tool.comingSoon && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                  background: "#f3e8ff", color: "#7c3aed",
                }}>
                  Coming Soon
                </div>
              )}
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "#f3e8ff",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12,
              }}>
                {tool.icon}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b", marginBottom: 4 }}>{tool.name}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{tool.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Browse store link */}
      <div style={{ textAlign: "center" }}>
        <button
          onClick={() => handleNavigate("raas-store")}
          style={{
            padding: "12px 32px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "white",
            color: "#7c3aed",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Browse Marketplace
        </button>
      </div>
    </div>
  );
}
