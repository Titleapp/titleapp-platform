import React, { useEffect, useState } from "react";

/**
 * WorkerReviewQueue — CODEX S52.55.
 *
 * The admin-facing side of the real review gate. Server-side enforcement
 * (enforceRoleGate) is what actually protects this, not this component —
 * a non-admin hitting this page just gets a 403 from the list call and sees
 * the error state below.
 *
 * Shows the actual worker content (rules, escalation triggers, judged test
 * transcript) — an approve button next to a bare slug isn't a real review,
 * it's a rubber stamp with extra steps.
 */

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
const CLASS_COLOR = { clean: "#15803d", flagged: "#b45309", escalated: "#7c3aed", failed: "#b91c1c" };

function authedHeaders(tenantId) {
  const token = localStorage.getItem("ID_TOKEN");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-tenant-id": tenantId };
}

function elapsedLabel(minutes) {
  if (minutes == null) return "";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function WorkerReviewQueue() {
  const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID") || null;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [expanded, setExpanded] = useState(null);

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
          {reviews.map((r) => {
            const stale = r.minutesPending != null && r.minutesPending > 24 * 60;
            const isOpen = expanded === r.id;
            const testFailed = r.testSummary && r.testSummary.passed === false;
            return (
              <div key={r.id} style={{ background: "#fff", border: "1px solid #f1f5f9", borderTop: `3px solid ${testFailed ? "#b91c1c" : "#d97706"}`, borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{r.workerName || r.workerSlug}</div>
                    {r.evaluationWorkerName && <div style={{ fontSize: 12, color: "#64748b" }}>+ {r.evaluationWorkerName} (teacher dashboard)</div>}
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      Built via {r.buildSource} · submitted by {r.submittedBy}
                      {r.minutesPending != null && (
                        <span style={{ color: stale ? "#b91c1c" : "#64748b", fontWeight: stale ? 700 : 400 }}> · {elapsedLabel(r.minutesPending)}{stale ? " — over 24h, needs attention" : ""}</span>
                      )}
                    </div>
                    {r.testSummary && (
                      <div style={{ fontSize: 12, marginTop: 6, fontWeight: 700, color: testFailed ? "#b91c1c" : "#15803d" }}>
                        Automated test: {testFailed ? "FAILED — a rule violation was judged, review carefully" : "passed (independent judge, not self-graded)"}
                      </div>
                    )}
                    <button onClick={() => setExpanded(isOpen ? null : r.id)}
                      style={{ marginTop: 8, background: "none", border: "none", color: "#7c3aed", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                      {isOpen ? "Hide details" : "Show what this worker actually does"}
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
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

                {isOpen && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                    {r.job && <div style={{ fontSize: 13, color: "#334155", marginBottom: 10 }}><strong>Job:</strong> {r.job}</div>}
                    {r.knowledgeSummary && <div style={{ fontSize: 13, color: "#334155", marginBottom: 10 }}><strong>What it learned from uploaded materials:</strong> {r.knowledgeSummary}</div>}
                    {r.testSummary?.results?.map((tr) => (
                      <div key={tr.id} style={{ padding: "8px 0", borderTop: "1px solid #f8fafc" }}>
                        <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2 }}>{tr.category}</div>
                        <div style={{ fontSize: 13, color: "#334155", marginBottom: 4 }}>{tr.answer?.slice(0, 260)}{tr.answer?.length > 260 ? "…" : ""}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: CLASS_COLOR[tr.classification] || "#64748b", textTransform: "uppercase" }}>{tr.classification}</span>
                        {tr.judgeReason && <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 8 }}>— {tr.judgeReason}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
