import React, { useState } from "react";

const REQUESTS = [
  { id: 1, title: "Water Heater Replacement", property: "Riverside Apartments", unit: "1A", tenant: "Maria Santos", priority: "emergency", status: "in-progress", created: "2026-02-14", vendor: "ABC Plumbing", cost: 1200, description: "No hot water. Water heater leaking. Emergency dispatch.", flag: "5 days overdue" },
  { id: 2, title: "Garbage Disposal Repair", property: "San Marco Townhomes", unit: "TH-3", tenant: "Chris Adams", priority: "medium", status: "new", created: "2026-02-18", vendor: null, cost: null, description: "Disposal jammed and making grinding noise." },
  { id: 3, title: "HVAC Filter Change", property: "Beach Cottages", unit: "C", tenant: "Brian Foster", priority: "low", status: "complete", created: "2026-02-10", vendor: "Cool Air HVAC", cost: 85, description: "Quarterly filter replacement. Completed Feb 15." },
  { id: 4, title: "Toilet Running", property: "Riverside Apartments", unit: "4B", tenant: "Nicole Johnson", priority: "medium", status: "new", created: "2026-02-17", vendor: null, cost: null, description: "Toilet in master bath runs continuously." },
  { id: 5, title: "Broken Window Lock", property: "Southside Flats", unit: "1", tenant: "Angela Davis", priority: "high", status: "waiting-vendor", created: "2026-02-15", vendor: "SecureAll Windows", cost: 250, description: "Bedroom window lock broken. Security concern.", scheduledDate: "2026-02-21" },
  { id: 6, title: "Parking Lot Light Out", property: "Riverside Apartments", unit: "Common", tenant: null, priority: "medium", status: "in-progress", created: "2026-02-16", vendor: "BrightStar Electric", cost: 175, description: "Light pole #3 in parking lot not functioning." },
  { id: 7, title: "Roof Leak - Unit 2B", property: "Riverside Apartments", unit: "2B", tenant: "Ashley Torres", priority: "high", status: "waiting-vendor", created: "2026-02-13", vendor: "TopNotch Roofing", cost: 800, description: "Ceiling stain growing in bedroom. Roof inspection scheduled.", scheduledDate: "2026-02-22" },
];

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

  function openChat(prompt) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", {
      detail: { message: prompt },
    }));
  }

  // KPIs
  const openCount = REQUESTS.filter((r) => r.status !== "complete").length;
  const emergencyCount = REQUESTS.filter((r) => r.priority === "emergency").length;
  const overdueCount = REQUESTS.filter((r) => r.flag && r.flag.includes("overdue")).length;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Maintenance</h1>
          <p className="subtle">{REQUESTS.length} requests -- {openCount} open</p>
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
          const items = REQUESTS.filter((r) => r.status === col.key);
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
                                onClick={() => openChat(`Dispatch a vendor for maintenance request: "${r.title}" at ${r.property} unit ${r.unit}. ${r.description} Priority: ${r.priority}.`)}
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
