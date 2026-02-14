import React from "react";

/**
 * LogbookEntry - Display a logbook entry
 *
 * Logbook entries are dynamic updates that append to immutable DTCs,
 * keeping them current (like maintenance logs or transcript updates).
 */
export default function LogbookEntry({ entry, showDTC = false, onViewDTC }) {
  // Entry type configurations
  const entryTypes = {
    maintenance: { icon: "🔧", color: "#06b6d4", label: "Maintenance" },
    transfer: { icon: "🔄", color: "#7c3aed", label: "Transfer" },
    inspection: { icon: "🔍", color: "#22c55e", label: "Inspection" },
    update: { icon: "📝", color: "#f59e0b", label: "Update" },
    note: { icon: "💬", color: "#64748b", label: "Note" },
    default: { icon: "📄", color: "#64748b", label: "Entry" },
  };

  const config = entryTypes[entry.entryType] || entryTypes.default;

  return (
    <div
      style={{
        display: "flex",
        gap: "14px",
        padding: "14px 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      {/* Timeline indicator */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: `${config.color}15`,
            border: `2px solid ${config.color}35`,
            display: "grid",
            placeItems: "center",
            fontSize: "16px",
          }}
        >
          {config.icon}
        </div>
        <div
          style={{
            flex: 1,
            width: "2px",
            background: "var(--line)",
            marginTop: "4px",
          }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingTop: "2px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span
            className="badge"
            style={{
              background: `${config.color}15`,
              borderColor: `${config.color}35`,
              color: config.color,
            }}
          >
            {config.label}
          </span>
          <span className="tdMuted" style={{ fontSize: "13px" }}>
            {entry.createdAt
              ? new Date(entry.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Unknown date"}
          </span>
        </div>

        {/* DTC reference */}
        {showDTC && entry.dtcTitle && (
          <div style={{ marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>
              Attached to:{" "}
            </span>
            <button
              onClick={() => onViewDTC?.(entry.dtcId)}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                textDecoration: "underline",
                padding: 0,
                fontSize: "13px",
              }}
            >
              {entry.dtcTitle}
            </button>
          </div>
        )}

        {/* Entry data */}
        {entry.data && (
          <div style={{ marginBottom: "8px" }}>
            {Object.entries(entry.data).map(([key, value]) => (
              <div
                key={key}
                style={{
                  fontSize: "14px",
                  marginBottom: "4px",
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")}:
                </span>{" "}
                <span>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Files */}
        {entry.files && entry.files.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {entry.files.map((file, i) => (
              <div
                key={i}
                className="badge"
                style={{ fontSize: "11px", padding: "4px 8px" }}
              >
                📎 {file}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
