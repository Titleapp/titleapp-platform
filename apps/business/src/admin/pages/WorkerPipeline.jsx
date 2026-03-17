import React, { useState, useEffect } from "react";
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
  draft: "",
  waitlist: "ac-badge-warning",
  claimed: "ac-badge-warning",
  planned: "",
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function WorkerPipeline() {
  const [workers, setWorkers] = useState([]);
  const [staleDraftCount, setStaleDraftCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [publishing, setPublishing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await adminApi("GET", "admin:worker:pipeline");
      if (res.ok) {
        setWorkers(res.workers || []);
        setStaleDraftCount(res.staleDraftCount || 0);
      }
    } catch (e) {
      console.error("Failed to load pipeline:", e);
    }
    setLoading(false);
  }

  async function handlePublish(ids) {
    setPublishing(true);
    try {
      const res = await adminApi("POST", "admin:worker:bulkPublish", { workerIds: Array.from(ids) });
      if (res.ok) {
        setSelected(new Set());
        await loadData();
      }
    } catch (e) {
      console.error("Publish failed:", e);
    }
    setPublishing(false);
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(w => w.id)));
  }

  const filtered = statusFilter === "all"
    ? workers
    : workers.filter(w => w.status === statusFilter);

  const waitlisted = workers.filter(w => w.status === "waitlist").length;
  const planned = workers.filter(w => w.status === "planned").length;

  return (
    <div>
      <div className="ac-page-header">
        <div>
          <h1 className="ac-page-title">Worker Pipeline</h1>
          <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
            Workers in development — not yet published
          </p>
        </div>
      </div>

      <div className="ac-metrics">
        <MetricCard label="In Pipeline" value={workers.length} />
        <MetricCard label="Stale Drafts" value={staleDraftCount} delta={staleDraftCount > 0 ? "Needs attention" : "All fresh"} deltaDir={staleDraftCount > 0 ? "down" : "up"} />
        <MetricCard label="Waitlisted" value={waitlisted} />
        <MetricCard label="Planned" value={planned} />
      </div>

      <div className="ac-card">
        <div className="ac-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <strong>Pipeline Workers</strong>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select className="ac-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="waitlist">Waitlist</option>
              <option value="claimed">Claimed</option>
              <option value="planned">Planned</option>
            </select>
            <button className="ac-btn ac-btn-primary" onClick={() => handlePublish(selected)} disabled={selected.size === 0 || publishing}>
              {publishing ? "Publishing…" : `Publish Selected (${selected.size})`}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading…</div>
        ) : (
          <table className="ac-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </th>
                <th>Worker</th>
                <th>Vertical</th>
                <th>Status</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <tr key={`${w.collection}-${w.id}`} className={w.isStale ? "ac-row-error" : ""}>
                  <td><input type="checkbox" checked={selected.has(w.id)} onChange={() => toggleSelect(w.id)} /></td>
                  <td style={{ fontWeight: 600 }}>{w.name}</td>
                  <td>{w.vertical}</td>
                  <td><span className={`ac-badge ${STATUS_BADGE[w.status] || ""}`}>{w.status}</span></td>
                  <td>{formatDate(w.createdAt)}</td>
                  <td>{formatDate(w.updatedAt)}{w.isStale && <span style={{ color: "#ef4444", fontSize: 11, marginLeft: 4 }}>stale</span>}</td>
                  <td><span className="ac-badge">{w.collection}</span></td>
                  <td>
                    <button className="ac-btn ac-btn-sm" onClick={() => handlePublish(new Set([w.id]))} disabled={publishing}>
                      Publish
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "#64748B", padding: 20 }}>No workers in pipeline</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
