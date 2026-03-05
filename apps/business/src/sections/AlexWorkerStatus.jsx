import React, { useEffect, useState } from "react";

const RECOMMENDATION_TIERS = [
  { key: "mandatory", label: "Mandatory", color: "#dc2626", bg: "#fee2e2" },
  { key: "core", label: "Core", color: "#7c3aed", bg: "#ede9fe" },
  { key: "connected", label: "Connected", color: "#2563eb", bg: "#dbeafe" },
  { key: "efficiency", label: "Efficiency", color: "#059669", bg: "#d1fae5" },
  { key: "future", label: "Future", color: "#64748b", bg: "#f1f5f9" },
];

export default function AlexWorkerStatus() {
  const [workers, setWorkers] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [temporalHints, setTemporalHints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(true);

  useEffect(() => {
    loadWorkerStatus();
    loadRecommendations();
  }, []);

  function getApiHeaders() {
    const token = localStorage.getItem("ID_TOKEN");
    const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-tenant-id": tenantId,
    };
  }

  function getApiBase() {
    return import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
  }

  async function loadWorkerStatus() {
    try {
      const resp = await fetch(`${getApiBase()}/api?path=/v1/alex:status`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (data.ok && data.workers) {
        setWorkers(data.workers);
      }
      if (data.ok && data.temporalHints) {
        setTemporalHints(data.temporalHints);
      }
    } catch (err) {
      console.error("Failed to load worker status:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecommendations() {
    try {
      const resp = await fetch(`${getApiBase()}/api?path=/v1/alex:recommend`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (data.ok && data.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error("Failed to load recommendations:", err);
    } finally {
      setRecLoading(false);
    }
  }

  function getActivityLabel(worker) {
    if (!worker.lastActivity) return "No recent activity";
    const ts = worker.lastActivity._seconds
      ? worker.lastActivity._seconds * 1000
      : typeof worker.lastActivity === "string"
        ? new Date(worker.lastActivity).getTime()
        : null;
    if (!ts) return "No recent activity";
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Active now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
        Loading worker status...
      </div>
    );
  }

  const hasWorkspace = localStorage.getItem("WORKSPACE_ID") || localStorage.getItem("TENANT_ID");

  if (!hasWorkspace && workers.length === 0) {
    return (
      <div style={{
        background: "white", borderRadius: 12, border: "1px solid var(--line)",
        padding: 48, textAlign: "center", marginTop: 24,
      }}>
        <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6 }}>
          Set up your workspace to see worker recommendations.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Worker Status</div>
        <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>
          Health dashboard and recommendations from Alex
        </div>
      </div>

      {/* Worker Grid */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
          Active Workers
        </div>
        {workers.length === 0 ? (
          <div style={{
            background: "white", borderRadius: 12, border: "1px solid var(--line)",
            padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 14,
          }}>
            No active workers in this workspace.
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}>
            {workers.map(worker => (
              <div
                key={worker.id || worker.slug}
                style={{
                  background: "white", borderRadius: 12,
                  border: "1px solid var(--line)", padding: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontWeight: 700, fontSize: 14, flexShrink: 0,
                  }}>
                    {(worker.name || "W").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: "var(--text)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {worker.name}
                    </div>
                    {worker.price && (
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        ${worker.price}/mo
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: worker.status === "active" ? "#22c55e" : "#94a3b8",
                    }} />
                    <span style={{
                      fontSize: 12, fontWeight: 500,
                      color: worker.status === "active" ? "#16a34a" : "#64748b",
                    }}>
                      {worker.status === "active" ? "Active" : "Idle"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {getActivityLabel(worker)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Temporal Awareness */}
      {temporalHints.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
            Temporal Awareness
          </div>
          <div style={{
            background: "white", borderRadius: 12, border: "1px solid var(--line)",
            overflow: "hidden",
          }}>
            {temporalHints.map((hint, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 20px",
                  borderBottom: idx < temporalHints.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: hint.action === "activate" ? "#22c55e"
                    : hint.action === "pause" ? "#f59e0b"
                    : "#94a3b8",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
                    {hint.workerName}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {hint.reason}
                  </div>
                </div>
                <span style={{
                  display: "inline-block", padding: "2px 10px", borderRadius: 20,
                  fontSize: 11, fontWeight: 600,
                  background: hint.action === "activate" ? "#dcfce7" : hint.action === "pause" ? "#fef3c7" : "#f1f5f9",
                  color: hint.action === "activate" ? "#16a34a" : hint.action === "pause" ? "#d97706" : "#64748b",
                }}>
                  {hint.action === "activate" ? "Activate" : hint.action === "pause" ? "Pause" : hint.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations Panel */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
          Worker Recommendations
        </div>
        {recLoading ? (
          <div style={{ padding: 32, textAlign: "center", color: "#64748b", fontSize: 14 }}>
            Loading recommendations...
          </div>
        ) : !recommendations || Object.keys(recommendations).length === 0 ? (
          <div style={{
            background: "white", borderRadius: 12, border: "1px solid var(--line)",
            padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 14,
          }}>
            No recommendations available. Add more workers or projects to receive suggestions.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {RECOMMENDATION_TIERS.map(tier => {
              const items = recommendations[tier.key];
              if (!items || items.length === 0) return null;
              return (
                <div
                  key={tier.key}
                  style={{
                    background: "white", borderRadius: 12,
                    border: "1px solid var(--line)", overflow: "hidden",
                  }}
                >
                  <div style={{
                    padding: "12px 20px", borderBottom: "1px solid var(--line)",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{
                      display: "inline-block", padding: "2px 10px", borderRadius: 20,
                      fontSize: 11, fontWeight: 700,
                      background: tier.bg, color: tier.color,
                      textTransform: "uppercase", letterSpacing: "0.5px",
                    }}>
                      {tier.label}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>
                      {items.length} {items.length === 1 ? "worker" : "workers"}
                    </span>
                  </div>
                  {items.map((rec, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "14px 20px",
                        borderBottom: idx < items.length - 1 ? "1px solid #f1f5f9" : "none",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: tier.bg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: tier.color, fontWeight: 700, fontSize: 14, flexShrink: 0,
                      }}>
                        {(rec.name || "W").charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                          {rec.name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                          {rec.reason}
                        </div>
                      </div>
                      {rec.price && (
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", flexShrink: 0, marginRight: 8 }}>
                          ${rec.price}/mo
                        </div>
                      )}
                      <button
                        style={{
                          padding: "6px 16px", border: "1px solid #7c3aed", borderRadius: 8,
                          background: "white", cursor: "pointer",
                          fontSize: 13, fontWeight: 600, color: "#7c3aed", flexShrink: 0,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "#7c3aed";
                          e.currentTarget.style.color = "white";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.color = "#7c3aed";
                        }}
                      >
                        Subscribe
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
