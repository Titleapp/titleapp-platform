import React from "react";

export default function MetricCard({ label, value, delta, deltaDir, onClick }) {
  return (
    <div className="ac-metric-card" onClick={onClick}>
      <div className="ac-metric-label">{label}</div>
      <div className="ac-metric-value">{value || "--"}</div>
      {delta && (
        <div className={`ac-metric-delta ac-metric-delta-${deltaDir || "flat"}`}>
          {delta}
        </div>
      )}
    </div>
  );
}
