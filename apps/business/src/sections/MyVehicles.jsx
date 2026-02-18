import React, { useState, useEffect } from "react";
import * as api from "../api/client";

export default function MyVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    try {
      const result = await api.getInventory({ vertical: "consumer", jurisdiction: "GLOBAL" });
      const all = result.inventory || [];
      setVehicles(all.filter((i) => i.metadata?.vin || i.metadata?.make));
    } catch (e) {
      console.error("Failed to load vehicles:", e);
    } finally {
      setLoading(false);
    }
  }

  function openChat(vehicle) {
    window.dispatchEvent(
      new CustomEvent("ta:chatPrompt", {
        detail: { message: `Tell me about my ${vehicle.metadata?.year || ""} ${vehicle.metadata?.make || ""} ${vehicle.metadata?.model || ""}`.trim() },
      })
    );
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My Vehicles</h1>
          <p className="subtle">Your verified vehicle records</p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: "24px", textAlign: "center" }}>
          Loading vehicles...
        </div>
      ) : vehicles.length === 0 ? (
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>&#x1F697;</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e293b", marginBottom: "8px" }}>
            No vehicles yet
          </div>
          <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
            Add your first vehicle by chatting with the AI assistant. Just say "Track a vehicle" to get started.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
          {vehicles.map((v) => (
            <div key={v.id} className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "16px", color: "#1e293b" }}>
                    {v.metadata?.year} {v.metadata?.make} {v.metadata?.model}
                  </div>
                  {v.metadata?.vin && (
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", fontFamily: "monospace" }}>
                      VIN: {v.metadata.vin}
                    </div>
                  )}
                </div>
                <span className={`badge badge-${v.status || "draft"}`}>{v.status || "Draft"}</span>
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "14px", fontSize: "13px", color: "#64748b" }}>
                {v.metadata?.color && <span>Color: {v.metadata.color}</span>}
                {v.metadata?.mileage && <span>Mileage: {Number(v.metadata.mileage).toLocaleString()}</span>}
                {v.metadata?.ownership && <span>Ownership: {v.metadata.ownership}</span>}
              </div>
              <div style={{ marginTop: "14px", display: "flex", gap: "8px" }}>
                <button className="iconBtn" onClick={() => openChat(v)} style={{ fontSize: "13px" }}>
                  Ask AI
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
