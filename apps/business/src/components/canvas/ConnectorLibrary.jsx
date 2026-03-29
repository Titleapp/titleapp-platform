import React, { useState, useEffect, useCallback } from "react";
import ConnectorCard from "./ConnectorCard";
import ConnectorCostSummary from "./ConnectorCostSummary";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// Static catalog — replace with /v1/connectors/available when T2 is live
const CONNECTOR_CATALOG = {
  Aviation: [
    { id: "weather", label: "Live Weather", description: "Real-time METAR, TAF, and winds aloft for any airport.", costPerSession: 0, minTier: 0 },
    { id: "notams", label: "NOTAM Briefings", description: "Active NOTAMs for departure, destination, and alternates.", costPerSession: 0, minTier: 0 },
    { id: "tfrs", label: "TFR Alerts", description: "Temporary flight restrictions along your planned route.", costPerSession: 0, minTier: 0 },
    { id: "fbo-fuel", label: "FBO & Fuel Prices", description: "Fuel pricing and FBO services at destination airports.", costPerSession: 0.12, minTier: 1 },
    { id: "maintenance-tracking", label: "Maintenance Tracking", description: "Airworthiness directives and upcoming inspection windows.", costPerSession: 0.60, minTier: 2 },
  ],
  "Real Estate": [
    { id: "property-records", label: "Property Records", description: "County assessor data, deed history, and liens.", costPerSession: 0.15, minTier: 1 },
    { id: "mls-comps", label: "MLS Comparables", description: "Recent sales and active listings within your market area.", costPerSession: 0.45, minTier: 2 },
    { id: "title-search", label: "Title Search", description: "Preliminary title report for any parcel.", costPerSession: 0.72, minTier: 2 },
  ],
  "Auto Dealer": [
    { id: "vin-decode", label: "VIN Decoder", description: "Full vehicle history, specs, and recall status.", costPerSession: 0.08, minTier: 0 },
    { id: "market-value", label: "Market Value", description: "Real-time wholesale and retail pricing data.", costPerSession: 0.25, minTier: 1 },
    { id: "credit-prequalify", label: "Credit Pre-Qualify", description: "Soft-pull credit check for finance pre-approval.", costPerSession: 0.60, minTier: 2 },
  ],
  Healthcare: [
    { id: "drug-interactions", label: "Drug Interactions", description: "Real-time medication interaction checking.", costPerSession: 0, minTier: 0 },
    { id: "protocol-lookup", label: "Protocol Lookup", description: "Current clinical protocols and treatment guidelines.", costPerSession: 0, minTier: 0 },
    { id: "ems-dispatch", label: "EMS Dispatch Data", description: "Response times, unit availability, and hospital status.", costPerSession: 0.30, minTier: 1 },
  ],
  Solar: [
    { id: "irradiance", label: "Solar Irradiance", description: "Location-specific solar resource data and production estimates.", costPerSession: 0, minTier: 0 },
    { id: "utility-rates", label: "Utility Rate Lookup", description: "Current electricity rates by zip code and utility provider.", costPerSession: 0.10, minTier: 1 },
  ],
  Web3: [
    { id: "gas-tracker", label: "Gas Tracker", description: "Real-time gas prices across major networks.", costPerSession: 0, minTier: 0 },
    { id: "token-prices", label: "Token Prices", description: "Live token pricing from aggregated DEX and CEX feeds.", costPerSession: 0.05, minTier: 1 },
  ],
};

// Map vertical name variations to catalog keys
function resolveVertical(vertical) {
  if (!vertical) return null;
  const v = vertical.trim();
  // Direct match
  if (CONNECTOR_CATALOG[v]) return v;
  // Fuzzy matches
  const lower = v.toLowerCase();
  if (lower.includes("aviation") || lower.includes("pilot")) return "Aviation";
  if (lower.includes("real estate") || lower.includes("title")) return "Real Estate";
  if (lower.includes("auto") || lower.includes("dealer")) return "Auto Dealer";
  if (lower.includes("health") || lower.includes("nursing") || lower.includes("ems")) return "Healthcare";
  if (lower.includes("solar") || lower.includes("energy")) return "Solar";
  if (lower.includes("web3") || lower.includes("crypto") || lower.includes("token")) return "Web3";
  return null;
}

// Map tier ID to tier index (0=Free, 1=$29, 2=$49, 3=$79)
function tierIdToIndex(selectedTier) {
  return typeof selectedTier === "number" ? selectedTier : 0;
}

export default function ConnectorLibrary({ worker, workerCardData, selectedTier }) {
  const [activeConnectors, setActiveConnectors] = useState(new Set());
  const [activatingConnectors, setActivatingConnectors] = useState(new Set());
  const [deactivatingConnectors, setDeactivatingConnectors] = useState(new Set());
  const [healthData, setHealthData] = useState(null);

  const vertical = workerCardData?.vertical || worker?.vertical || "";
  const resolvedVertical = resolveVertical(vertical);
  const connectors = resolvedVertical ? (CONNECTOR_CATALOG[resolvedVertical] || []) : [];
  const workerTier = tierIdToIndex(selectedTier);

  // Poll /v1/api-health for connector health dots
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const token = localStorage.getItem("ID_TOKEN");
        if (!token) return;
        const res = await fetch(`${API_BASE}/api?path=/v1/api-health`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setHealthData(data);
        }
      } catch {
        // Silent — health is optional
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = useCallback((connectorId) => {
    if (activeConnectors.has(connectorId)) {
      // Deactivate
      setDeactivatingConnectors(prev => new Set(prev).add(connectorId));
      setTimeout(() => {
        setActiveConnectors(prev => {
          const next = new Set(prev);
          next.delete(connectorId);
          return next;
        });
        setDeactivatingConnectors(prev => {
          const next = new Set(prev);
          next.delete(connectorId);
          return next;
        });
      }, 800);
    } else {
      // Activate
      setActivatingConnectors(prev => new Set(prev).add(connectorId));
      setTimeout(() => {
        setActiveConnectors(prev => new Set(prev).add(connectorId));
        setActivatingConnectors(prev => {
          const next = new Set(prev);
          next.delete(connectorId);
          return next;
        });
      }, 1200);
    }
  }, [activeConnectors]);

  // No connectors for this vertical — hide entirely
  if (connectors.length === 0) return null;

  // Get health status for a connector (stubbed — returns "ok" by default)
  const getHealthStatus = (connectorId) => {
    if (!healthData || !healthData.services) return "ok";
    const svc = healthData.services[connectorId];
    if (!svc) return "ok";
    return svc.consecutiveErrors >= 3 ? "degraded" : "ok";
  };

  // Active connector objects for cost summary
  const activeConnectorObjects = connectors.filter(c => activeConnectors.has(c.id));

  return (
    <div style={{
      background: "#FFFFFF", border: "1px solid #E2E8F0",
      borderRadius: 12, padding: 20, marginBottom: 20,
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>
        Data Connections
      </div>
      <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16, lineHeight: 1.5 }}>
        Connect live data sources to your worker. Subscribers never enter anything — it pulls automatically.
      </div>

      {connectors.map(c => (
        <ConnectorCard
          key={c.id}
          connector={c}
          isActive={activeConnectors.has(c.id)}
          isActivating={activatingConnectors.has(c.id)}
          isDeactivating={deactivatingConnectors.has(c.id)}
          onToggle={handleToggle}
          healthStatus={getHealthStatus(c.id)}
          tierLocked={c.minTier > 0 && workerTier === 0}
        />
      ))}

      <ConnectorCostSummary activeConnectors={activeConnectorObjects} />
    </div>
  );
}
