import React, { useState, useEffect } from "react";
import ConnectorCard from "./ConnectorCard";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

/**
 * ConnectorLibrary — creator-facing connector browser.
 *
 * Filtered by current worker's vertical.
 * Never shows API names, endpoints, or key names.
 */
export default function ConnectorLibrary({ vertical, workerId, tenantId, pricingTier, activeConnectors: initialActive }) {
  const [connectors, setConnectors] = useState([]);
  const [active, setActive] = useState(initialActive || []);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(null);

  const token = localStorage.getItem("ID_TOKEN") || "";

  useEffect(() => {
    if (!vertical) return;
    setLoading(true);
    fetch(`${API_BASE}/api?path=/v1/connectors/available&vertical=${encodeURIComponent(vertical)}&pricingTier=${pricingTier || 0}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) setConnectors(data.connectors || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [vertical, pricingTier]);

  async function handleActivate(connectorId) {
    setActionPending(connectorId);
    try {
      const res = await fetch(`${API_BASE}/api?path=/v1/connectors/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, workerId, connectorId }),
      });
      const data = await res.json();
      if (data.ok) {
        setActive(data.dataConnectors?.active || [...active, connectorId]);
      }
    } catch { /* ignore */ }
    setActionPending(null);
  }

  async function handleDeactivate(connectorId) {
    setActionPending(connectorId);
    try {
      const res = await fetch(`${API_BASE}/api?path=/v1/connectors/deactivate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, workerId, connectorId }),
      });
      const data = await res.json();
      if (data.ok) {
        setActive(data.dataConnectors?.active || active.filter(id => id !== connectorId));
      }
    } catch { /* ignore */ }
    setActionPending(null);
  }

  if (loading) {
    return <div style={{ fontSize: 12, color: "#6b7280", padding: 16 }}>Loading connectors...</div>;
  }

  if (connectors.length === 0) {
    return <div style={{ fontSize: 12, color: "#6b7280", padding: 16 }}>No connectors available for this vertical.</div>;
  }

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: 1, marginBottom: 10, paddingLeft: 2 }}>
        DATA CONNECTIONS
      </div>
      {connectors.map(c => (
        <ConnectorCard
          key={c.id}
          connector={c}
          isActive={active.includes(c.id)}
          onActivate={handleActivate}
          onDeactivate={handleDeactivate}
          disabled={actionPending === c.id}
        />
      ))}
    </div>
  );
}
