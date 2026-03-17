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

function formatDollars(n) {
  return `$${(n || 0).toLocaleString()}`;
}

export default function BogoManager() {
  const [platformEnabled, setPlatformEnabled] = useState(true);
  const [workers, setWorkers] = useState([]);
  const [totals, setTotals] = useState({ totalRedemptions: 0, totalDiscounted: 0 });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await adminApi("GET", "admin:bogo:status");
      if (res.ok) {
        setPlatformEnabled(res.platformBogoEnabled);
        setWorkers(res.workers || []);
        setTotals(res.totals || {});
      }
    } catch (e) {
      console.error("Failed to load BOGO data:", e);
    }
    setLoading(false);
  }

  async function handlePlatformToggle() {
    setToggling("platform");
    const prev = platformEnabled;
    setPlatformEnabled(!prev);
    try {
      const res = await adminApi("POST", "admin:bogo:toggle", { scope: "platform" });
      if (res.ok) setPlatformEnabled(res.newValue);
      else setPlatformEnabled(prev);
    } catch (e) {
      setPlatformEnabled(prev);
    }
    setToggling(null);
  }

  async function handleWorkerToggle(worker) {
    setToggling(worker.id);
    const prevWorkers = [...workers];
    setWorkers(ws => ws.map(w => w.id === worker.id ? { ...w, bogoEligible: !w.bogoEligible } : w));
    try {
      const res = await adminApi("POST", "admin:bogo:toggle", { scope: "worker", workerId: worker.id });
      if (!res.ok) setWorkers(prevWorkers);
    } catch (e) {
      setWorkers(prevWorkers);
    }
    setToggling(null);
  }

  return (
    <div>
      <div className="ac-page-header">
        <div>
          <h1 className="ac-page-title">BOGO Manager</h1>
          <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
            Buy One Get One Free — platform promotion controls
          </p>
        </div>
      </div>

      <div className="ac-metrics">
        <MetricCard label="BOGO Status" value={platformEnabled ? "Active" : "Inactive"} delta={platformEnabled ? "Enabled" : "Disabled"} deltaDir={platformEnabled ? "up" : "down"} />
        <MetricCard label="Total Redemptions" value={totals.totalRedemptions} />
        <MetricCard label="Revenue Discounted" value={formatDollars(totals.totalDiscounted)} />
      </div>

      <div className="ac-card" style={{ marginBottom: 16 }}>
        <div className="ac-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>Platform-Wide BOGO</strong>
            <p style={{ color: "#64748B", fontSize: 12, margin: "4px 0 0" }}>
              Disabling stops all BOGO checkouts across the platform
            </p>
          </div>
          <button
            className={`ac-toggle ${platformEnabled ? "ac-toggle-on" : ""}`}
            onClick={handlePlatformToggle}
            disabled={toggling === "platform"}
          >
            <span className="ac-toggle-knob" />
          </button>
        </div>
      </div>

      <div className="ac-card">
        <div className="ac-card-header">
          <strong>Per-Worker BOGO Eligibility</strong>
          <p style={{ color: "#64748B", fontSize: 12, margin: "4px 0 0" }}>
            Only platform workers (creatorId = titleapp-platform) can be BOGO eligible
          </p>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading…</div>
        ) : (
          <table className="ac-table">
            <thead>
              <tr>
                <th>Worker</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Redemptions</th>
                <th>Discounted</th>
                <th>Toggle</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(w => (
                <tr key={w.id}>
                  <td style={{ fontWeight: 600 }}>{w.name}</td>
                  <td style={{ fontSize: 12, color: "#64748B" }}>{w.slug}</td>
                  <td>
                    {w.bogoEligible
                      ? <span className="ac-badge ac-badge-success">Eligible</span>
                      : <span className="ac-badge">Ineligible</span>
                    }
                  </td>
                  <td>{w.redemptionCount}</td>
                  <td>{formatDollars(w.revenueDiscounted)}</td>
                  <td>
                    <button
                      className={`ac-toggle ${w.bogoEligible ? "ac-toggle-on" : ""}`}
                      onClick={() => handleWorkerToggle(w)}
                      disabled={toggling === w.id}
                    >
                      <span className="ac-toggle-knob" />
                    </button>
                  </td>
                </tr>
              ))}
              {workers.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "#64748B", padding: 20 }}>No platform workers found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
