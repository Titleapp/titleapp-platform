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

export default function PricingCompliance() {
  const [workers, setWorkers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, compliant: 0, nonCompliant: 0, revenueImpact: 0 });
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(null);
  const [auditing, setAuditing] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await adminApi("GET", "admin:pricing:compliance");
      if (res.ok) {
        setWorkers(res.workers || []);
        setSummary(res.summary || {});
      }
    } catch (e) {
      console.error("Failed to load pricing data:", e);
    }
    setLoading(false);
  }

  async function handleFix(worker) {
    setFixing(worker.id);
    try {
      const res = await adminApi("POST", "admin:pricing:fix", {
        workerId: worker.id,
        collection: worker.collection,
        targetPrice: worker.nearestTier,
      });
      if (res.ok) await loadData();
    } catch (e) {
      console.error("Fix failed:", e);
    }
    setFixing(null);
  }

  async function handleFullAudit() {
    setAuditing(true);
    try {
      await adminApi("POST", "admin:pricingAudit");
      await loadData();
    } catch (e) {
      console.error("Audit failed:", e);
    }
    setAuditing(false);
  }

  const filtered = search
    ? workers.filter(w => w.name.toLowerCase().includes(search.toLowerCase()) || w.vertical.toLowerCase().includes(search.toLowerCase()))
    : workers;

  return (
    <div>
      <div className="ac-page-header">
        <div>
          <h1 className="ac-page-title">Pricing Compliance</h1>
          <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
            Worker pricing audit against standard tiers [Free, $29, $49, $79]
          </p>
        </div>
        <button className="ac-btn ac-btn-primary" onClick={handleFullAudit} disabled={auditing}>
          {auditing ? "Running…" : "Run Full Audit"}
        </button>
      </div>

      <div className="ac-metrics">
        <MetricCard label="Total Workers" value={summary.total} />
        <MetricCard label="Compliant" value={summary.compliant} delta={summary.total ? `${Math.round((summary.compliant / summary.total) * 100)}%` : "—"} deltaDir="up" />
        <MetricCard label="Non-Compliant" value={summary.nonCompliant} delta={summary.nonCompliant > 0 ? "Needs fix" : "All clear"} deltaDir={summary.nonCompliant > 0 ? "down" : "up"} />
        <MetricCard label="Revenue Impact" value={`$${summary.revenueImpact}/mo`} />
      </div>

      <div className="ac-card">
        <div className="ac-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>All Workers</strong>
          <input className="ac-input" placeholder="Search workers…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading…</div>
        ) : (
          <table className="ac-table">
            <thead>
              <tr>
                <th>Worker</th>
                <th>Vertical</th>
                <th>Current Price</th>
                <th>Standard Tier</th>
                <th>Collection</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <tr key={`${w.collection}-${w.id}`} className={w.compliant ? "" : "ac-row-error"}>
                  <td style={{ fontWeight: 600 }}>{w.name}</td>
                  <td>{w.vertical}</td>
                  <td>${w.price}/mo</td>
                  <td>${w.nearestTier}/mo</td>
                  <td><span className="ac-badge">{w.collection}</span></td>
                  <td>
                    {w.compliant
                      ? <span className="ac-badge ac-badge-success">Compliant</span>
                      : <span className="ac-badge ac-badge-error">Non-Compliant</span>
                    }
                  </td>
                  <td>
                    {!w.compliant && (
                      <button className="ac-btn ac-btn-sm" onClick={() => handleFix(w)} disabled={fixing === w.id}>
                        {fixing === w.id ? "Fixing…" : `Fix → $${w.nearestTier}`}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "#64748B", padding: 20 }}>No workers found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
