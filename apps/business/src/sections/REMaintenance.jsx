// CODEX 90 (2026-09-16): reads/writes real tickets via
// services/re/maintenanceTickets.js (tenants/{scopeId}/maintenanceTickets)
// instead of the hardcoded REQUESTS array below. Column mapping (this board
// uses new/in-progress/waiting-vendor/complete; the backend uses
// open/in_progress/assigned/completed):
//   open -> "new", assigned -> "waiting-vendor" (assigned to a named
//   vendor/tech IS "waiting on vendor"), in_progress -> "in-progress",
//   completed -> "complete". No backend schema change needed for this.
import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiGet(path) {
  const auth = getAuth();
  const token = auth.currentUser ? await auth.currentUser.getIdToken(false).catch(() => null) : null;
  const tenantId = typeof localStorage !== "undefined" ? localStorage.getItem("TENANT_ID") : null;
  const url = `${API_BASE}/api?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId && tenantId !== "vault" ? { "X-Tenant-Id": tenantId } : {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function apiPost(path, payload) {
  const auth = getAuth();
  const token = auth.currentUser ? await auth.currentUser.getIdToken(false).catch(() => null) : null;
  const tenantId = typeof localStorage !== "undefined" ? localStorage.getItem("TENANT_ID") : null;
  const url = `${API_BASE}/api?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId && tenantId !== "vault" ? { "X-Tenant-Id": tenantId } : {}),
    },
    body: JSON.stringify(payload || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || json.message || `Request failed (${res.status})`);
  return json;
}

const STATUS_FROM_BACKEND = {
  open: "new",
  assigned: "waiting-vendor",
  in_progress: "in-progress",
  completed: "complete",
};

function ticketToRequest(t) {
  return {
    id: t.id,
    title: t.description,
    property: t.assetId || "",
    unit: t.unitId || "",
    tenant: t.reportedBy || null,
    priority: t.severityReported === "emergency" ? "emergency" : (t.severityReported || "medium"),
    status: STATUS_FROM_BACKEND[t.status] || "new",
    created: t.reportedAt?._seconds ? new Date(t.reportedAt._seconds * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    vendor: t.assignedTo || null,
    cost: t.costEstimate ?? null,
    description: t.description,
    flag: null,
    photos: (t.photosIssue?.length || 0) + (t.photosResolution?.length || 0),
  };
}

const PRIORITY_BADGES = {
  emergency: { background: "#fee2e2", color: "#dc2626" },
  high: { background: "#fff7ed", color: "#d97706" },
  medium: { background: "#fef3c7", color: "#92400e" },
  low: { background: "#f0fdf4", color: "#16a34a" },
};

const COLUMNS = [
  { key: "new", label: "New", color: "#2563eb" },
  { key: "in-progress", label: "In Progress", color: "#7c3aed" },
  { key: "waiting-vendor", label: "Waiting on Vendor", color: "#d97706" },
  { key: "complete", label: "Complete", color: "#16a34a" },
];

function daysOpen(created) {
  const now = new Date("2026-02-19");
  const start = new Date(created);
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function REMaintenance() {
  const [expandedId, setExpandedId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadRequests() {
    try {
      const result = await apiGet("/v1/re:listMaintenanceTickets");
      setRequests(Array.isArray(result.tickets) ? result.tickets.map(ticketToRequest) : []);
    } catch (e) {
      console.warn("[REMaintenance] failed to load tickets:", e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRequests(); }, []);

  function openChat(prompt) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", {
      detail: { message: prompt },
    }));
  }

  async function dispatchVendor(r) {
    openChat(`Dispatch a vendor for maintenance request: "${r.title}" at ${r.property} unit ${r.unit}. ${r.description} Priority: ${r.priority}.`);
    try {
      await apiPost("/v1/re:updateMaintenanceTicket", { ticketId: r.id, status: "in_progress" });
      await loadRequests();
    } catch (e) {
      console.warn("[REMaintenance] status update failed:", e.message);
    }
  }

  // KPIs
  const openCount = requests.filter((r) => r.status !== "complete").length;
  const emergencyCount = requests.filter((r) => r.priority === "emergency").length;
  const overdueCount = requests.filter((r) => r.flag && r.flag.includes("overdue")).length;

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading maintenance requests…</div>;
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Maintenance</h1>
          <p className="subtle">{requests.length} requests -- {openCount} open</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => openChat("Give me a maintenance priority report. What needs immediate attention, what is overdue, and vendor follow-ups needed?")}
          style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
        >
          AI Maintenance Report
        </button>
      </div>

      {/* KPI Row */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Open Requests</div>
          <div className="kpiValue" style={{ color: "#2563eb" }}>{openCount}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Emergency</div>
          <div className="kpiValue" style={{ color: "#dc2626" }}>{emergencyCount}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Avg Response Time</div>
          <div className="kpiValue" style={{ color: "#7c3aed" }}>1.2 days</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Overdue</div>
          <div className="kpiValue" style={{ color: "#d97706" }}>{overdueCount}</div>
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "16px",
        alignItems: "start",
      }}>
        {COLUMNS.map((col) => {
          const items = requests.filter((r) => r.status === col.key);
          return (
            <div key={col.key}>
              {/* Column Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
                padding: "0 4px",
              }}>
                <div style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: col.color,
                }} />
                <span style={{ fontWeight: 700, fontSize: "14px" }}>{col.label}</span>
                <span style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#64748b",
                  background: "#f1f5f9",
                  borderRadius: "9999px",
                  padding: "2px 8px",
                }}>
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {items.map((r) => {
                  const pBadge = PRIORITY_BADGES[r.priority] || PRIORITY_BADGES.medium;
                  const isOverdue = r.flag && r.flag.includes("overdue");
                  const isExpanded = expandedId === r.id;
                  const days = daysOpen(r.created);

                  return (
                    <div
                      key={r.id}
                      className="card"
                      style={{
                        cursor: "pointer",
                        border: isOverdue ? "2px solid #dc2626" : undefined,
                        padding: "16px",
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    >
                      {/* Overdue Label */}
                      {isOverdue && (
                        <div style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "#dc2626",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "6px",
                        }}>
                          OVERDUE
                        </div>
                      )}

                      {/* Title */}
                      <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px", lineHeight: 1.3 }}>
                        {r.title}
                      </div>

                      {/* Property + Unit */}
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                        {r.property} -- {r.unit}
                      </div>

                      {/* Tenant */}
                      {r.tenant && (
                        <div style={{ fontSize: "12px", color: "#475569", marginBottom: "8px" }}>
                          {r.tenant}
                        </div>
                      )}

                      {/* Priority Badge + Days Open */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "9999px",
                          background: pBadge.background,
                          color: pBadge.color,
                          textTransform: "uppercase",
                        }}>
                          {r.priority}
                        </span>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                          {days} day{days !== 1 ? "s" : ""} open
                        </span>
                      </div>

                      {/* Vendor */}
                      {r.vendor && (
                        <div style={{ fontSize: "12px", color: "#475569", marginBottom: "4px" }}>
                          Vendor: {r.vendor}
                        </div>
                      )}

                      {/* Cost */}
                      {r.cost != null && (
                        <div style={{ fontSize: "12px", color: "#475569" }}>
                          Est. ${r.cost.toLocaleString()}
                        </div>
                      )}

                      {/* Photo indicator */}
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "6px", fontSize: "11px", color: r.photos > 0 ? "#475569" : "#94a3b8" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={r.photos > 0 ? "#475569" : "#cbd5e1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        {r.photos > 0 ? `${r.photos} photo${r.photos !== 1 ? "s" : ""}` : "No photos"}
                      </div>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div style={{
                          marginTop: "12px",
                          paddingTop: "12px",
                          borderTop: "1px solid var(--line)",
                          fontSize: "13px",
                        }}>
                          <div style={{ marginBottom: "8px" }}>
                            <div style={{ color: "#64748b", marginBottom: "2px" }}>Description</div>
                            <div style={{ lineHeight: 1.5 }}>{r.description}</div>
                          </div>
                          {r.vendor && (
                            <div style={{ marginBottom: "8px" }}>
                              <div style={{ color: "#64748b", marginBottom: "2px" }}>Vendor</div>
                              <div style={{ fontWeight: 600 }}>{r.vendor}</div>
                            </div>
                          )}
                          {r.cost != null && (
                            <div style={{ marginBottom: "8px" }}>
                              <div style={{ color: "#64748b", marginBottom: "2px" }}>Cost Estimate</div>
                              <div style={{ fontWeight: 600 }}>${r.cost.toLocaleString()}</div>
                            </div>
                          )}
                          <div style={{ marginBottom: "8px" }}>
                            <div style={{ color: "#64748b", marginBottom: "2px" }}>Created</div>
                            <div>{new Date(r.created).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                          </div>
                          {r.scheduledDate && (
                            <div style={{ marginBottom: "8px" }}>
                              <div style={{ color: "#64748b", marginBottom: "2px" }}>Scheduled Date</div>
                              <div style={{ fontWeight: 600 }}>{new Date(r.scheduledDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }} onClick={(e) => e.stopPropagation()}>
                            {r.status === "new" && (
                              <button
                                className="iconBtn"
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "12px",
                                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                                  color: "white",
                                  border: "none",
                                }}
                                onClick={() => dispatchVendor(r)}
                              >
                                AI: Dispatch vendor
                              </button>
                            )}
                            {(r.status === "in-progress" || r.status === "waiting-vendor") && (
                              <button
                                className="iconBtn"
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "12px",
                                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                                  color: "white",
                                  border: "none",
                                }}
                                onClick={() => openChat(`Follow up on maintenance request: "${r.title}" at ${r.property} unit ${r.unit}. Vendor: ${r.vendor || "unassigned"}. Status: ${r.status}. ${r.flag ? "Note: " + r.flag + "." : ""} Days open: ${daysOpen(r.created)}.`)}
                              >
                                AI: Follow up
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Empty column */}
                {items.length === 0 && (
                  <div style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: "13px",
                    border: "2px dashed #e2e8f0",
                    borderRadius: "12px",
                  }}>
                    No requests
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
