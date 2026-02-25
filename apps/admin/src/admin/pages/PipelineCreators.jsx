import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

const CREATOR_STAGES = [
  { id: "SIGNUP", label: "Signup" },
  { id: "FIRST_WORKER_STARTED", label: "First Worker Started" },
  { id: "FIRST_WORKER_COMPLETED", label: "First Worker Completed" },
  { id: "FIRST_WORKER_PUBLISHED", label: "Published" },
  { id: "FIRST_REVENUE", label: "First Revenue" },
  { id: "POWER_USER", label: "Power User" },
  { id: "STALLED", label: "Stalled" },
  { id: "CHURNED", label: "Churned" },
];

function healthColor(score) {
  if (score >= 70) return "#16a34a";
  if (score >= 40) return "#d97706";
  return "#ef4444";
}

function healthBg(score) {
  if (score >= 70) return "rgba(34,197,94,0.06)";
  if (score >= 40) return "rgba(245,158,11,0.06)";
  return "rgba(239,68,68,0.06)";
}

export default function PipelineCreators() {
  const [creators, setCreators] = useState([]);
  const [tab, setTab] = useState("funnel");

  useEffect(() => {
    const q = query(
      collection(db, "pipeline", "creators", "users"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setCreators(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Funnel metrics
  const funnelData = CREATOR_STAGES.map((stage) => ({
    ...stage,
    count: creators.filter((c) => c.stage === stage.id).length,
  }));

  const totalCreators = creators.length;
  const activeCreators = creators.filter((c) => !["STALLED", "CHURNED"].includes(c.stage)).length;
  const avgHealth = creators.length > 0
    ? Math.round(creators.reduce((s, c) => s + (c.healthScore || 0), 0) / creators.length)
    : 0;

  return (
    <div>
      <div className="ac-page-header">
        <h1 className="ac-page-title">Creator Funnel</h1>
        <p className="ac-page-subtitle">Creator lifecycle and health scores</p>
      </div>

      <div className="ac-metrics" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Total Creators</div>
          <div className="ac-metric-value">{totalCreators}</div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Active</div>
          <div className="ac-metric-value" style={{ color: "#16a34a" }}>{activeCreators}</div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Avg Health Score</div>
          <div className="ac-metric-value" style={{ color: healthColor(avgHealth) }}>{avgHealth}</div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Stalled / Churned</div>
          <div className="ac-metric-value" style={{ color: "#ef4444" }}>
            {creators.filter((c) => c.stage === "STALLED" || c.stage === "CHURNED").length}
          </div>
        </div>
      </div>

      <div className="ac-tabs">
        <button className={`ac-tab ${tab === "funnel" ? "ac-tab-active" : ""}`} onClick={() => setTab("funnel")}>Funnel</button>
        <button className={`ac-tab ${tab === "table" ? "ac-tab-active" : ""}`} onClick={() => setTab("table")}>Creator Table</button>
      </div>

      {/* Funnel */}
      {tab === "funnel" && (
        <div className="ac-card">
          <div className="ac-card-body">
            {funnelData.map((stage, i) => {
              const prev = i === 0 ? totalCreators : funnelData[i - 1].count;
              const convRate = prev > 0 ? Math.round((stage.count / prev) * 100) : 0;
              const widthPct = totalCreators > 0 ? Math.max(10, (stage.count / totalCreators) * 100) : 10;
              return (
                <div key={stage.id} style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600 }}>{stage.label}</span>
                    <span style={{ color: "#64748b" }}>{stage.count} {i > 0 ? `(${convRate}%)` : ""}</span>
                  </div>
                  <div style={{ height: "24px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${widthPct}%`,
                      background: stage.id === "STALLED" || stage.id === "CHURNED" ? "#ef4444" : "#7c3aed",
                      borderRadius: "6px",
                      transition: "width 0.3s",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Creator Table */}
      {tab === "table" && (
        <div className="ac-card">
          <div className="ac-card-body" style={{ padding: 0 }}>
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Stage</th>
                  <th>Health</th>
                  <th>Workers Published</th>
                  <th>Revenue</th>
                  <th>Source</th>
                  <th>Churn Risk</th>
                </tr>
              </thead>
              <tbody>
                {creators.length === 0 && (
                  <tr><td colSpan="7" className="ac-empty">No creators yet.</td></tr>
                )}
                {creators.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.email}</td>
                    <td><span className="ac-badge">{c.stage}</span></td>
                    <td>
                      <span style={{
                        fontWeight: 800,
                        color: healthColor(c.healthScore || 0),
                        background: healthBg(c.healthScore || 0),
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}>
                        {c.healthScore || 0}
                      </span>
                    </td>
                    <td>{c.workersPublished || 0}</td>
                    <td>${(c.totalRevenue || 0).toFixed(2)}</td>
                    <td>{c.source || "--"}</td>
                    <td>
                      <span className={`ac-badge ${
                        c.churnRisk === "high" ? "ac-badge-error" :
                        c.churnRisk === "medium" ? "ac-badge-warning" : "ac-badge-success"
                      }`}>
                        {c.churnRisk || "low"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
