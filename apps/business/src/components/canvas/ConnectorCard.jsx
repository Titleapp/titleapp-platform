import React from "react";

export default function ConnectorCard({
  connector,
  isActive,
  isActivating,
  isDeactivating,
  onToggle,
  healthStatus,
  tierLocked,
}) {
  const busy = isActivating || isDeactivating;
  const degraded = isActive && healthStatus === "degraded";

  // Health dot color — green or yellow, never red on cards
  const dotColor = degraded ? "#eab308" : "#22c55e";

  // Cost badge
  const isFree = connector.costPerSession === 0;
  const costLabel = isFree ? "Free" : `~$${connector.costPerSession.toFixed(2)}/session`;
  const costColor = isFree ? "#10b981" : "#d97706";
  const costBg = isFree ? "rgba(16,185,129,0.1)" : "rgba(217,119,6,0.1)";

  // Status text below label
  let statusText = null;
  if (isActivating) statusText = "Connecting...";
  else if (isDeactivating) statusText = "Disconnecting...";
  else if (degraded) statusText = "Connected — running slow";
  else if (isActive) statusText = "Connected";

  // Toggle colors
  const toggleBg = tierLocked
    ? "#E2E8F0"
    : isActive
    ? "#6B46C1"
    : "#CBD5E1";

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 8,
      padding: "14px 16px", borderRadius: 10,
      border: "1px solid #E2E8F0",
      background: isActive ? "rgba(107,70,193,0.03)" : "#FAFBFC",
      marginBottom: 8, transition: "background 0.2s",
    }}>
      {/* Row 1: health dot + label + cost badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: dotColor, flexShrink: 0,
        }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", flex: 1 }}>
          {connector.label}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "2px 8px",
          borderRadius: 4, color: costColor, background: costBg,
        }}>
          {costLabel}
        </span>
      </div>

      {/* Row 2: description */}
      <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, paddingLeft: 16 }}>
        {connector.description}
      </div>

      {/* Row 3: toggle + status */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 16 }}>
        <button
          onClick={() => !tierLocked && !busy && onToggle(connector.id)}
          disabled={tierLocked || busy}
          title={tierLocked ? "Upgrade to $29+ to activate" : undefined}
          style={{
            position: "relative",
            width: 36, height: 20, borderRadius: 10,
            background: toggleBg,
            border: "none", cursor: tierLocked ? "not-allowed" : busy ? "wait" : "pointer",
            transition: "background 0.2s", padding: 0, flexShrink: 0,
          }}
        >
          {/* Knob */}
          {busy ? (
            <span style={{
              position: "absolute", top: 3, left: isActive ? 18 : 3,
              width: 14, height: 14, borderRadius: "50%",
              border: "2px solid white", borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }} />
          ) : (
            <span style={{
              position: "absolute", top: 3,
              left: isActive ? 18 : 3,
              width: 14, height: 14, borderRadius: "50%",
              background: "white",
              transition: "left 0.2s",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            }} />
          )}
          {/* Lock icon overlay */}
          {tierLocked && (
            <span style={{
              position: "absolute", top: -1, right: -6,
              fontSize: 10, color: "#94A3B8",
            }}>
              🔒
            </span>
          )}
        </button>

        {/* Status text */}
        {statusText && (
          <span style={{
            fontSize: 12, fontWeight: 500,
            color: isActivating || isDeactivating
              ? "#6B46C1"
              : degraded
              ? "#d97706"
              : "#10b981",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {isActive && !busy && !degraded && <span>✓</span>}
            {statusText}
          </span>
        )}

        {/* Tier lock hint */}
        {tierLocked && (
          <span style={{ fontSize: 11, color: "#94A3B8" }}>
            Upgrade to $29+ to activate
          </span>
        )}
      </div>

      {/* Spinner keyframes */}
      {busy && (
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      )}
    </div>
  );
}
