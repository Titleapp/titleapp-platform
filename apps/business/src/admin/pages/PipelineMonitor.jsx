import React, { useState, useEffect, useRef } from "react";
import MetricCard from "../components/MetricCard";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function adminApi(method, endpoint, body) {
  const token = localStorage.getItem("ID_TOKEN");
  const res = await fetch(`${API_BASE}/api?path=/v1/${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Tenant-Id": "admin",
      "X-Vertical": "developer",
      "X-Jurisdiction": "GLOBAL",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

const STATUS_BADGE = {
  failed: "ac-badge-error",
  pending: "ac-badge-warning",
  processing: "ac-badge-warning",
  ready: "ac-badge-success",
};

function formatAge(hours) {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d ${Math.round(hours % 24)}h`;
}

export default function PipelineMonitor() {
  const [orphanDocs, setOrphanDocs] = useState([]);
  const [stats, setStats] = useState({ totalDocs24h: 0, failedDocs24h: 0, failureRate: 0, alertActive: false });
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, 60000);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function loadData() {
    try {
      const res = await adminApi("GET", "admin:pipeline:monitor");
      if (res.ok) {
        setOrphanDocs(res.orphanDocs || []);
        setStats(res.stats || {});
      }
    } catch (e) {
      console.error("Failed to load pipeline monitor:", e);
    }
    setLoading(false);
  }

  async function handleRetry(docId) {
    setRetrying(docId);
    try {
      const res = await adminApi("POST", "admin:pipeline:retry", { docId });
      if (res.ok) await loadData();
    } catch (e) {
      console.error("Retry failed:", e);
    }
    setRetrying(null);
  }

  return (
    <div>
      <div className="ac-page-header">
        <div>
          <h1 className="ac-page-title">Pipeline Monitor</h1>
          <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
            Vault document health and orphan detection — auto-refreshes every 60s
          </p>
        </div>
      </div>

      <div className="ac-metrics">
        <MetricCard label="Docs (24h)" value={stats.totalDocs24h} />
        <MetricCard label="Failed" value={stats.failedDocs24h} delta={stats.failedDocs24h > 0 ? "Has failures" : "Clean"} deltaDir={stats.failedDocs24h > 0 ? "down" : "up"} />
        <MetricCard label="Failure Rate" value={`${stats.failureRate}%`} delta={stats.alertActive ? "ALERT" : "Normal"} deltaDir={stats.alertActive ? "down" : "up"} />
        <MetricCard label="Alert Status" value={stats.alertActive ? "ALERT" : "Normal"} />
      </div>

      {stats.alertActive && (
        <div style={{
          background: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "#ef4444",
          fontSize: 13,
          fontWeight: 600,
        }}>
          <span style={{ fontSize: 18 }}>!</span>
          Failure rate exceeds 5% threshold — {stats.failedDocs24h} of {stats.totalDocs24h} documents failed in the last 24 hours
        </div>
      )}

      <div className="ac-card">
        <div className="ac-card-header">
          <strong>Orphan / Failed Documents</strong>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading…</div>
        ) : (
          <table className="ac-table">
            <thead>
              <tr>
                <th>Doc ID</th>
                <th>Tenant</th>
                <th>Created</th>
                <th>Age</th>
                <th>Template</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orphanDocs.map(d => (
                <tr key={d.id} className={d.isOld ? "ac-row-error" : ""}>
                  <td style={{ fontFamily: "monospace", fontSize: 11 }}>{d.id.substring(0, 12)}…</td>
                  <td>{d.tenantId}</td>
                  <td>{new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td style={{ color: d.isOld ? "#ef4444" : "inherit", fontWeight: d.isOld ? 600 : 400 }}>
                    {formatAge(d.ageHours)}
                  </td>
                  <td>{d.templateId}</td>
                  <td>
                    <span className={`ac-badge ${STATUS_BADGE[d.status] || ""}`}>{d.status}</span>
                  </td>
                  <td>
                    <button className="ac-btn ac-btn-sm" onClick={() => handleRetry(d.id)} disabled={retrying === d.id}>
                      {retrying === d.id ? "Retrying…" : "Retry"}
                    </button>
                  </td>
                </tr>
              ))}
              {orphanDocs.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "#64748B", padding: 20 }}>No orphan documents — all clear</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
