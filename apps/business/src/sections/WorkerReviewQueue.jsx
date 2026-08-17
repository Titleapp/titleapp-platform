import React, { useEffect, useState } from "react";

/**
 * WorkerReviewQueue — CODEX S52.55.
 *
 * The admin-facing side of the real review gate. Server-side enforcement
 * (enforceRoleGate) is what actually protects this, not this component —
 * a non-admin hitting this page just gets a 403 from the list call and sees
 * the error state below. This exists because there was previously nowhere
 * for an admin to even see what's pending.
 */

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function authedHeaders(tenantId) {
  const token = localStorage.getItem("ID_TOKEN");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-tenant-id": tenantId };
}

export default function WorkerReviewQueue() {
  const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID") || null;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent(`/v1/worker:review:list?tenantId=${encodeURIComponent(tenantId)}&status=pending`)}`, { headers: authedHeaders(tenantId) });
      const data = await res.json();
      if (data?.ok) setReviews(data.reviews || []);
      else setError(data?.error === "insufficient_role" ? "Admin access required to view this queue." : (data?.error || "Failed to load"));
    } catch (e) {
      setError(e.message || "Failed to load review queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tenantId]);

  async function decide(reviewId, decision) {
    setBusyId(reviewId);
    try {
      await fetch(`${API_BASE}/api?path=${encodeURIComponent("/v1/worker:review:decide")}`, {
        method: "POST", headers: authedHeaders(tenantId),
        body: JSON.stringify({ reviewId, tenantId, decision }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", margin: "0 0 6px 0" }}>Worker Review Queue</h1>
        <p style={{ fontSize: 15, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
          Fast-path-built workers wait here for admin approval before they're live. Admin-only — enforced server-side.
        </p>
      </div>

      {loading && <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>Loading…</div>}
      {!loading && error && (
        <div style={{ padding: 24, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b" }}>{error}</div>
      )}
      {!loading && !error && reviews.length === 0 && (
        <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12 }}>
          Nothing pending review.
        </div>
      )}
      {!loading && !error && reviews.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #f1f5f9", borderTop: "3px solid #d97706", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{r.workerSlug}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Built via {r.buildSource} · submitted by {r.submittedBy}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={busyId === r.id} onClick={() => decide(r.id, "approved")}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#15803d", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    Approve
                  </button>
                  <button disabled={busyId === r.id} onClick={() => decide(r.id, "rejected")}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
