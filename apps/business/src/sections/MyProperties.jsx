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
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>&#x1F3E0;</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
            No properties yet
          </div>
          <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
            Add your first property by chatting with the AI assistant. Just say "Add a property" to get started.
          </div>
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
