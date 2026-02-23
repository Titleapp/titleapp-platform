import React, { useState } from "react";

const LISTINGS = [
  { id: 1, address: "1247 Palm Ave", city: "Jacksonville FL 32207", price: 485000, beds: 4, baths: 2.5, sqft: 2400, dom: 12, status: "active", type: "Single Family", agent: "Sarah Mitchell", desc: "Updated 4/2.5 in San Marco. New roof 2024, renovated kitchen." },
  { id: 2, address: "892 Riverside Dr #4B", city: "Jacksonville FL 32204", price: 275000, beds: 2, baths: 2, sqft: 1200, dom: 28, status: "active", type: "Condo", agent: "Sarah Mitchell", desc: "River views, in-unit laundry, HOA pool/gym." },
  { id: 3, address: "3421 Beach Blvd", city: "Jacksonville Beach FL 32250", price: 395000, beds: 3, baths: 2, sqft: 1800, dom: 45, status: "stale", type: "Single Family", agent: "David Park", desc: "Beach cottage 4 blocks from ocean. Price reduction recommended." },
  { id: 4, address: "567 Mandarin Rd", city: "Jacksonville FL 32258", price: 625000, beds: 5, baths: 3.5, sqft: 3200, dom: 8, status: "active", type: "Single Family", agent: "Sarah Mitchell", desc: "Executive home, pool, 3-car garage, A-rated schools." },
  { id: 5, address: "1893 San Jose Blvd", city: "Jacksonville FL 32207", price: 335000, beds: 3, baths: 2, sqft: 1650, dom: 18, status: "under-contract", type: "Single Family", agent: "David Park", desc: "Bungalow, updated kitchen, new HVAC. Closing March 10." },
  { id: 6, address: "432 Ponte Vedra Blvd", city: "Ponte Vedra Beach FL 32082", price: 725000, beds: 4, baths: 3, sqft: 2800, dom: 52, status: "stale", type: "Single Family", agent: "Sarah Mitchell", desc: "Ocean access. AI recommends $675-700K." },
  { id: 7, address: "7891 Baymeadows Rd", city: "Jacksonville FL 32256", price: 365000, beds: 3, baths: 2.5, sqft: 1900, dom: 5, status: "active", type: "Townhome", agent: "David Park", desc: "End-unit, 2-car garage, gated community." },
  { id: 8, address: "2345 University Blvd", city: "Jacksonville FL 32211", price: 195000, beds: 2, baths: 1, sqft: 950, dom: 35, status: "active", type: "Single Family", agent: "David Park", desc: "Investor special near UNF. Rented at $1,400/mo." },
];

const STATUS_STYLES = {
  "active": { bg: "#dcfce7", color: "#16a34a" },
  "under-contract": { bg: "#dbeafe", color: "#2563eb" },
  "stale": { bg: "#fee2e2", color: "#dc2626" },
};

const MAP_DOTS = [
  { id: 1, x: "38%", y: "42%" },
  { id: 2, x: "30%", y: "35%" },
  { id: 3, x: "72%", y: "55%" },
  { id: 4, x: "55%", y: "68%" },
  { id: 5, x: "40%", y: "50%" },
  { id: 6, x: "80%", y: "30%" },
  { id: 7, x: "60%", y: "45%" },
  { id: 8, x: "48%", y: "38%" },
];

const PROPERTY_IMAGES = {
  "Single Family": `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect width="400" height="200" fill="#f0fdf4"/><path d="M200 40 L320 110 L320 170 L80 170 L80 110 Z" fill="#86efac" stroke="#16a34a" stroke-width="2"/><rect x="110" y="110" width="40" height="60" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/><rect x="170" y="120" width="30" height="25" fill="#bfdbfe" stroke="#2563eb" stroke-width="1"/><rect x="220" y="120" width="30" height="25" fill="#bfdbfe" stroke="#2563eb" stroke-width="1"/><rect x="260" y="130" width="50" height="40" fill="#e2e8f0" stroke="#64748b" stroke-width="1.5"/><path d="M200 40 L80 110" stroke="#16a34a" stroke-width="3" fill="none"/><path d="M200 40 L320 110" stroke="#16a34a" stroke-width="3" fill="none"/></svg>')}`,
  "Condo": `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect width="400" height="200" fill="#eff6ff"/><rect x="120" y="30" width="160" height="140" fill="#bfdbfe" stroke="#2563eb" stroke-width="2" rx="4"/><rect x="140" y="50" width="25" height="20" fill="#dbeafe" stroke="#93c5fd" stroke-width="1"/><rect x="180" y="50" width="25" height="20" fill="#dbeafe" stroke="#93c5fd" stroke-width="1"/><rect x="220" y="50" width="25" height="20" fill="#dbeafe" stroke="#93c5fd" stroke-width="1"/><rect x="140" y="85" width="25" height="20" fill="#dbeafe" stroke="#93c5fd" stroke-width="1"/><rect x="180" y="85" width="25" height="20" fill="#dbeafe" stroke="#93c5fd" stroke-width="1"/><rect x="220" y="85" width="25" height="20" fill="#dbeafe" stroke="#93c5fd" stroke-width="1"/><rect x="140" y="120" width="25" height="20" fill="#fef9c3" stroke="#facc15" stroke-width="1"/><rect x="180" y="130" width="30" height="40" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/><rect x="220" y="120" width="25" height="20" fill="#dbeafe" stroke="#93c5fd" stroke-width="1"/></svg>')}`,
  "Townhome": `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect width="400" height="200" fill="#faf5ff"/><path d="M120 70 L170 35 L220 70" fill="#e9d5ff" stroke="#7c3aed" stroke-width="2"/><rect x="120" y="70" width="100" height="100" fill="#f3e8ff" stroke="#7c3aed" stroke-width="2"/><path d="M220 70 L270 35 L320 70" fill="#e9d5ff" stroke="#7c3aed" stroke-width="2"/><rect x="220" y="70" width="100" height="100" fill="#f3e8ff" stroke="#7c3aed" stroke-width="2"/><rect x="150" y="130" width="25" height="40" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/><rect x="255" y="130" width="25" height="40" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/><rect x="140" y="90" width="20" height="18" fill="#bfdbfe" stroke="#2563eb" stroke-width="1"/><rect x="245" y="90" width="20" height="18" fill="#bfdbfe" stroke="#2563eb" stroke-width="1"/><rect x="280" y="90" width="20" height="18" fill="#bfdbfe" stroke="#2563eb" stroke-width="1"/></svg>')}`,
};

function getPropertyImage(type) {
  return PROPERTY_IMAGES[type] || PROPERTY_IMAGES["Single Family"];
}

function statusLabel(s) {
  if (s === "active") return "Active";
  if (s === "under-contract") return "Under Contract";
  if (s === "stale") return "Stale";
  return s;
}

function dotColor(s) {
  if (s === "active") return "#16a34a";
  if (s === "under-contract") return "#2563eb";
  if (s === "stale") return "#dc2626";
  return "#64748b";
}

export default function REListings() {
  const [view, setView] = useState("card");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  function openChat(prompt) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", {
      detail: { message: prompt }
    }));
  }

  const filtered = LISTINGS.filter((l) => {
    if (filter === "all") return true;
    if (filter === "active") return l.status === "active";
    if (filter === "under-contract") return l.status === "under-contract";
    if (filter === "stale") return l.dom >= 30;
    return true;
  });

  const activeCount = LISTINGS.filter((l) => l.status === "active").length;
  const ucCount = LISTINGS.filter((l) => l.status === "under-contract").length;
  const staleCount = LISTINGS.filter((l) => l.dom >= 30).length;
  const avgDom = Math.round(LISTINGS.reduce((s, l) => s + l.dom, 0) / LISTINGS.length);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Listings</h1>
          <p className="subtle">Active inventory and listing performance</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            className="iconBtn"
            onClick={() => openChat("Give me a listings overview. Which properties need attention and what pricing adjustments should we consider?")}
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
          >
            AI Listings Brief
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpiRow" style={{ marginBottom: "20px" }}>
        <div className="card kpiCard">
          <div className="kpiLabel">Active</div>
          <div className="kpiValue" style={{ color: "#16a34a" }}>{activeCount}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Under Contract</div>
          <div className="kpiValue" style={{ color: "#2563eb" }}>{ucCount}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Stale (30+ DOM)</div>
          <div className="kpiValue" style={{ color: "#dc2626" }}>{staleCount}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Avg DOM</div>
          <div className="kpiValue">{avgDom}</div>
        </div>
      </div>

      {/* View switcher + filters */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          {["card", "list", "map"].map((v) => (
            <button
              key={v}
              className="iconBtn"
              onClick={() => setView(v)}
              style={{
                background: view === v ? "#7c3aed" : "#f1f5f9",
                color: view === v ? "white" : "#475569",
                border: "none",
                fontSize: "12px",
                padding: "6px 14px",
              }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "under-contract", label: "Under Contract" },
            { key: "stale", label: "Stale" },
          ].map((f) => (
            <button
              key={f.key}
              className="iconBtn"
              onClick={() => setFilter(f.key)}
              style={{
                background: filter === f.key ? "#1e293b" : "#f1f5f9",
                color: filter === f.key ? "white" : "#475569",
                border: "none",
                fontSize: "12px",
                padding: "6px 14px",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card View */}
      {view === "card" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {filtered.map((l) => {
            const ss = STATUS_STYLES[l.status] || STATUS_STYLES["active"];
            return (
              <div
                key={l.id}
                className="card"
                style={{ padding: "0", cursor: "pointer", borderLeft: `3px solid ${ss.color}`, overflow: "hidden" }}
                onClick={() => setSelected(l)}
              >
                <div style={{
                  width: "100%",
                  height: "120px",
                  backgroundImage: `url("${getPropertyImage(l.type)}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  borderBottom: "1px solid #f1f5f9",
                }} />
                <div style={{ padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b" }}>{l.address}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{l.city}</div>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: ss.bg, color: ss.color }}>
                    {statusLabel(l.status)}
                  </span>
                </div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                  ${l.price.toLocaleString()}
                </div>
                <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
                  <span>{l.beds}bd / {l.baths}ba</span>
                  <span>{l.sqft.toLocaleString()} sqft</span>
                  <span style={{ color: l.dom > 30 ? "#dc2626" : "#64748b", fontWeight: l.dom > 30 ? 700 : 400 }}>
                    {l.dom} DOM
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>{l.type}</span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>{l.agent}</span>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Address</th>
                <th>Price</th>
                <th>Beds/Baths</th>
                <th>SqFt</th>
                <th>DOM</th>
                <th>Status</th>
                <th>Agent</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const ss = STATUS_STYLES[l.status] || STATUS_STYLES["active"];
                return (
                  <tr key={l.id} onClick={() => setSelected(l)} style={{ cursor: "pointer" }}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: "13px" }}>{l.address}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>{l.city}</div>
                    </td>
                    <td style={{ fontWeight: 700 }}>${l.price.toLocaleString()}</td>
                    <td>{l.beds}bd / {l.baths}ba</td>
                    <td>{l.sqft.toLocaleString()}</td>
                    <td style={{ color: l.dom > 30 ? "#dc2626" : "#1e293b", fontWeight: l.dom > 30 ? 700 : 400 }}>{l.dom}</td>
                    <td>
                      <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: ss.bg, color: ss.color }}>
                        {statusLabel(l.status)}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px", color: "#64748b" }}>{l.agent}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Map View */}
      {view === "map" && (
        <div className="card" style={{ padding: "0", overflow: "hidden" }}>
          <div style={{ position: "relative", width: "100%", height: "420px", background: "linear-gradient(135deg, #e2e8f0, #f1f5f9)", borderRadius: "8px" }}>
            <div style={{ position: "absolute", top: "12px", left: "12px", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
              Jacksonville Metro Area
            </div>
            {/* Legend */}
            <div style={{ position: "absolute", top: "12px", right: "12px", display: "flex", gap: "12px", fontSize: "11px", color: "#64748b" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a", display: "inline-block" }} /> Active
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb", display: "inline-block" }} /> Under Contract
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#dc2626", display: "inline-block" }} /> Stale
              </span>
            </div>
            {/* Grid lines */}
            {[20, 40, 60, 80].map((p) => (
              <React.Fragment key={p}>
                <div style={{ position: "absolute", left: `${p}%`, top: 0, bottom: 0, width: "1px", background: "#cbd5e1", opacity: 0.3 }} />
                <div style={{ position: "absolute", top: `${p}%`, left: 0, right: 0, height: "1px", background: "#cbd5e1", opacity: 0.3 }} />
              </React.Fragment>
            ))}
            {/* Dots */}
            {LISTINGS.map((l) => {
              const dot = MAP_DOTS.find((d) => d.id === l.id);
              if (!dot) return null;
              const show = filter === "all" ||
                (filter === "active" && l.status === "active") ||
                (filter === "under-contract" && l.status === "under-contract") ||
                (filter === "stale" && l.dom >= 30);
              if (!show) return null;
              return (
                <div
                  key={l.id}
                  onClick={() => setSelected(l)}
                  style={{
                    position: "absolute",
                    left: dot.x,
                    top: dot.y,
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    background: dotColor(l.status),
                    border: "2px solid white",
                    cursor: "pointer",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                    transform: "translate(-50%, -50%)",
                    transition: "transform 0.15s",
                  }}
                  title={`${l.address} - $${l.price.toLocaleString()}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <div style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "400px",
          height: "100vh",
          background: "white",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          zIndex: 999,
          overflowY: "auto",
          padding: "24px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Listing Detail</h2>
            <button
              className="iconBtn"
              onClick={() => setSelected(null)}
              style={{ background: "#f1f5f9", border: "none", fontSize: "16px", padding: "4px 10px" }}
            >
              X
            </button>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>{selected.address}</div>
            <div style={{ fontSize: "13px", color: "#64748b" }}>{selected.city}</div>
          </div>

          <div style={{ fontSize: "28px", fontWeight: 700, color: "#1e293b", marginBottom: "16px" }}>
            ${selected.price.toLocaleString()}
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: (STATUS_STYLES[selected.status] || {}).bg, color: (STATUS_STYLES[selected.status] || {}).color }}>
              {statusLabel(selected.status)}
            </span>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: "#f1f5f9", color: "#475569" }}>
              {selected.type}
            </span>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: selected.dom > 30 ? "#fee2e2" : "#f1f5f9", color: selected.dom > 30 ? "#dc2626" : "#475569" }}>
              {selected.dom} DOM
            </span>
          </div>

          <div style={{ display: "flex", gap: "20px", marginBottom: "20px", fontSize: "13px", color: "#475569" }}>
            <div><span style={{ fontWeight: 600 }}>{selected.beds}</span> beds</div>
            <div><span style={{ fontWeight: 600 }}>{selected.baths}</span> baths</div>
            <div><span style={{ fontWeight: 600 }}>{selected.sqft.toLocaleString()}</span> sqft</div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Description</div>
            <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>{selected.desc}</div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Listing Agent</div>
            <div style={{ fontSize: "13px", color: "#1e293b", fontWeight: 600 }}>{selected.agent}</div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="iconBtn"
              onClick={() => {
                openChat(`Analyze the listing at ${selected.address}, ${selected.city}. Price: $${selected.price.toLocaleString()}, ${selected.beds}bd/${selected.baths}ba, ${selected.sqft} sqft, ${selected.dom} days on market. ${selected.desc} What pricing and marketing recommendations do you have?`);
                setSelected(null);
              }}
              style={{ flex: 1, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none", padding: "10px" }}
            >
              Ask AI
            </button>
            <button
              className="iconBtn"
              onClick={() => {
                openChat(`Draft a compelling listing description for ${selected.address}, ${selected.city}. ${selected.beds}bd/${selected.baths}ba, ${selected.sqft} sqft. Current notes: ${selected.desc}`);
                setSelected(null);
              }}
              style={{ flex: 1, background: "#f1f5f9", color: "#475569", border: "none", padding: "10px" }}
            >
              AI: Write Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
