import React from "react";

/**
 * ConnectorCard — individual connector display card.
 *
 * Shows: display name, description, cost estimate.
 * Never shows: API name, endpoint URL, key name.
 * Activated connectors have green indicator.
 * Paid connectors show cost — creator acknowledges before activating.
 */
export default function ConnectorCard({ connector, isActive, onActivate, onDeactivate, disabled }) {
  const { label, description, costLabel, costPerSession, tierRequired, locked } = connector;
  const isPaid = tierRequired === "paid";

  return (
    <div style={{
      background: isActive ? "rgba(22,163,106,0.08)" : "#1a1a2e",
      border: `1px solid ${isActive ? "#16a34a" : "#2d2d44"}`,
      borderRadius: 10, padding: 14, marginBottom: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isActive && (
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a" }} />
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: "#e5e7eb" }}>{label}</span>
        </div>
        {!locked && (
          <button
            onClick={() => isActive ? onDeactivate?.(connector.id) : onActivate?.(connector.id)}
            disabled={disabled}
            style={{
              fontSize: 11, fontWeight: 600, padding: "4px 12px",
              borderRadius: 6, border: "none", cursor: disabled ? "not-allowed" : "pointer",
              background: isActive ? "#2d2d44" : "#7c3aed",
              color: isActive ? "#9ca3af" : "#fff",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {isActive ? "Disconnect" : "Connect"}
          </button>
        )}
        {locked && (
          <span style={{ fontSize: 11, color: "#eab308", fontWeight: 600 }}>
            Upgrade required
          </span>
        )}
      </div>
      <p style={{ fontSize: 12, color: "#9ca3af", margin: "6px 0 0", lineHeight: 1.4 }}>
        {description}
      </p>
      {isPaid && costLabel && (
        <p style={{ fontSize: 11, color: "#eab308", margin: "4px 0 0" }}>
          {costLabel}
        </p>
      )}
      {!isPaid && (
        <p style={{ fontSize: 11, color: "#16a34a", margin: "4px 0 0" }}>
          Free
        </p>
      )}
    </div>
  );
}
