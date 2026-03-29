import React from "react";

export default function ConnectorCostSummary({ activeConnectors }) {
  const total = (activeConnectors || []).reduce(
    (sum, c) => sum + (c.costPerSession || 0),
    0
  );

  if (!activeConnectors || activeConnectors.length === 0) return null;

  return (
    <div style={{ fontSize: 13, color: total === 0 ? "#10b981" : "#64748B", marginTop: 8, paddingLeft: 2 }}>
      {total === 0
        ? "Free — all public data sources."
        : `Estimated data cost: ~$${total.toFixed(2)} per subscriber session`}
    </div>
  );
}
