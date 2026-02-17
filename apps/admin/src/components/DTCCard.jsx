import React from "react";

/**
 * DTCCard - Display a Digital Title Certificate
 *
 * DTCs are immutable ownership records (like a car title or diploma).
 * They serve as the anchor for dynamic logbook entries.
 */
export default function DTCCard({ dtc, onView, onTransfer, onRefreshValue }) {
  // Determine icon and color based on DTC type
  const typeConfig = {
    vehicle: { icon: "V", color: "#7c3aed" },
    property: { icon: "P", color: "#22c55e" },
    credential: { icon: "C", color: "#06b6d4" },
    default: { icon: "R", color: "#64748b" },
  };

  const config = typeConfig[dtc.type] || typeConfig.default;

  return (
    <div className="card" style={{ position: "relative" }}>
      {/* Header with type badge */}
      <div className="cardHeader">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: `${config.color}15`,
              border: `1px solid ${config.color}35`,
              display: "grid",
              placeItems: "center",
              fontSize: "20px",
            }}
          >
            {config.icon}
          </div>
          <div>
            <div className="cardTitle">{dtc.metadata?.title || "Untitled DTC"}</div>
            <div className="cardSub">
              {dtc.type.charAt(0).toUpperCase() + dtc.type.slice(1)} Certificate
            </div>
          </div>
        </div>

        {/* Blockchain proof indicator */}
        {dtc.blockchainProof && (
          <div
            className="badge badge-completed"
            style={{ fontSize: "11px", padding: "4px 8px" }}
            title="Verified on blockchain"
          >
            ✓ Verified
          </div>
        )}
      </div>

      {/* Metadata details */}
      <div className="detail">
        {Object.entries(dtc.metadata || {}).map(([key, value]) => {
          if (key === "title") return null; // Already shown in header
          return (
            <div key={key} className="kvRow">
              <div className="k">{key.replace(/_/g, " ")}</div>
              <div className="v">{value}</div>
            </div>
          );
        })}

        {/* DTC ID */}
        <div className="kvRow">
          <div className="k">DTC ID</div>
          <div className="v mono">{dtc.id}</div>
        </div>

        {/* Created date */}
        <div className="kvRow">
          <div className="k">Created</div>
          <div className="v">
            {dtc.createdAt
              ? new Date(dtc.createdAt).toLocaleDateString()
              : "Unknown"}
          </div>
        </div>

        {/* Logbook entries count */}
        {dtc.logbookCount !== undefined && (
          <div className="kvRow">
            <div className="k">Logbook Entries</div>
            <div className="v">{dtc.logbookCount}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            className="iconBtn"
            onClick={() => onView?.(dtc)}
            style={{ flex: 1, minWidth: "120px" }}
          >
            View Details
          </button>
          <button
            className="iconBtn"
            onClick={() => onTransfer?.(dtc)}
            style={{ flex: 1, minWidth: "120px" }}
          >
            Transfer
          </button>
          {/* Refresh Value button (only for vehicles and property) */}
          {(dtc.type === "vehicle" || dtc.type === "property") && onRefreshValue && (
            <button
              className="iconBtn"
              onClick={() => onRefreshValue?.(dtc)}
              style={{
                flex: 1,
                minWidth: "120px",
                background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                color: "white",
                border: "none"
              }}
              title="Update current market value"
            >
              Refresh Value
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
