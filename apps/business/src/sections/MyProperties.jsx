import React, { useState, useEffect } from "react";
import * as api from "../api/client";

export default function MyProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  async function loadProperties() {
    try {
      const result = await api.getInventory({ vertical: "consumer", jurisdiction: "GLOBAL" });
      const all = result.inventory || [];
      setProperties(all.filter((i) => i.metadata?.address || i.metadata?.propertyType));
    } catch (e) {
      console.error("Failed to load properties:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My Properties</h1>
          <p className="subtle">Your verified property records</p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: "24px", textAlign: "center" }}>
          Loading properties...
        </div>
      ) : properties.length === 0 ? (
        <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "10px" }}>
            Add your first property
          </div>
          <div style={{ fontSize: "14px", color: "#64748b", maxWidth: "420px", margin: "0 auto 24px", lineHeight: "1.6" }}>
            Keep track of deeds, leases, mortgage info, tax records, and insurance for every property -- owned or rented. Everything verified and in one place.
          </div>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("ta:chatPrompt", {
                detail: { message: "I want to add a property to my vault" },
              }));
            }}
            style={{
              padding: "12px 28px",
              background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add Property
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
          {properties.map((p) => (
            <div key={p.id} className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                    {p.metadata?.address || "Unnamed Property"}
                  </div>
                  {p.metadata?.propertyType && (
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                      {p.metadata.propertyType}
                    </div>
                  )}
                </div>
                <span className={`badge badge-${p.status || "draft"}`}>{p.status || "Draft"}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "10px" }}>
                Added {new Date(p.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
