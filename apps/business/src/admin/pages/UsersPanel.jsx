import React, { useState, useEffect } from "react";
import MetricCard from "../components/MetricCard";
import useAdminAuth from "../hooks/useAdminAuth";

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

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const PLAN_BADGE = {
  free: "",
  tier1: "ac-badge-success",
  tier2: "ac-badge-success",
  tier3: "ac-badge-success",
  enterprise: "ac-badge-warning",
};

export default function UsersPanel() {
  const { role } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [impersonating, setImpersonating] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await adminApi("GET", "admin:users:list");
      if (res.ok) setUsers(res.users || []);
    } catch (e) {
      console.error("Failed to load users:", e);
    }
    setLoading(false);
  }

  async function handleImpersonate(uid) {
    setImpersonating(uid);
    try {
      const res = await adminApi("POST", "admin:users:impersonate", { uid });
      if (res.ok && res.token) {
        // Open platform in new tab with impersonation token
        window.open(`${window.location.origin}/?token=${res.token}&impersonate=true`, "_blank");
      }
    } catch (e) {
      console.error("Impersonate failed:", e);
    }
    setImpersonating(null);
  }

  const filtered = search
    ? users.filter(u =>
        (u.displayName || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.tenantId || "").toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const isOwner = role === "owner";
  const withPlan = users.filter(u => u.plan && u.plan !== "free").length;
  const recent7d = users.filter(u => {
    if (!u.createdAt) return false;
    return new Date(u.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }).length;

  return (
    <div>
      <div className="ac-page-header">
        <div>
          <h1 className="ac-page-title">Users</h1>
          <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
            All registered users from Firebase Authentication + Firestore
          </p>
        </div>
        <button className="ac-btn" onClick={loadData}>Refresh</button>
      </div>

      <div className="ac-metrics">
        <MetricCard label="Total Users" value={users.length} />
        <MetricCard label="Paid Plans" value={withPlan} />
        <MetricCard label="New (7d)" value={recent7d} delta={recent7d > 0 ? "Growing" : "—"} deltaDir={recent7d > 0 ? "up" : "flat"} />
      </div>

      <div className="ac-card">
        <div className="ac-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>All Users ({filtered.length})</strong>
          <input className="ac-input" placeholder="Search name, email, tenant…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 260 }} />
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading…</div>
        ) : (
          <table className="ac-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Signup Date</th>
                <th>Last Sign-in</th>
                <th>Plan</th>
                <th>Tenant</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.uid}>
                  <td style={{ fontWeight: 600 }}>{u.displayName || "—"}</td>
                  <td>{u.email}</td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>{formatDateTime(u.lastLoginAt)}</td>
                  <td>
                    <span className={`ac-badge ${PLAN_BADGE[u.plan] || ""}`}>
                      {u.plan || "free"}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "#64748B" }}>{u.tenantId || "—"}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <a href={`mailto:${u.email}`} className="ac-btn ac-btn-sm" style={{ textDecoration: "none" }}>
                      Email
                    </a>
                    {isOwner && (
                      <button
                        className="ac-btn ac-btn-sm"
                        onClick={() => handleImpersonate(u.uid)}
                        disabled={impersonating === u.uid}
                        style={{ background: "#7c3aed", color: "#fff", border: "none" }}
                      >
                        {impersonating === u.uid ? "…" : "Impersonate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "#64748B", padding: 20 }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
