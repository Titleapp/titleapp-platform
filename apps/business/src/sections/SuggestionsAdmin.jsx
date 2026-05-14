import React, { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiFetch(path, method = "GET", body = null) {
  const token = localStorage.getItem("ID_TOKEN");
  const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID") || "vault";
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-tenant-id": tenantId,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Status → next allowed transitions. Mirrors the server-side
// VALID_TRANSITIONS so the UI only surfaces achievable moves.
const NEXT_STATUSES = {
  open:      ["reviewed", "declined"],
  reviewed:  ["planned", "declined"],
  planned:   ["shipped", "declined"],
  shipped:   [],
  declined:  ["open"],
};

const STATUS_STYLES = {
  open:     { bg: "#dbeafe", color: "#1d4ed8", label: "Open" },
  reviewed: { bg: "#fef3c7", color: "#a16207", label: "Reviewed" },
  planned:  { bg: "#e0e7ff", color: "#4338ca", label: "Planned" },
  shipped:  { bg: "#dcfce7", color: "#15803d", label: "Shipped" },
  declined: { bg: "#fee2e2", color: "#b91c1c", label: "Declined" },
};

const SEVERITY_LABELS = {
  urgent_regulatory_or_safety: "Urgent / Regulatory",
  important: "Important",
  my_opinion: "Opinion",
};

export default function SuggestionsAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "200");
      const result = await apiFetch(`/v1/improvementRequests:adminList?${params.toString()}`);
      setItems(result.items || []);
    } catch (e) {
      if (/admin role required/i.test(e.message) || /403/.test(e.message)) {
        setForbidden(true);
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const transition = async (item, toStatus) => {
    setBusyId(item.id);
    try {
      await apiFetch("/v1/improvementRequests:transition", "POST", {
        requestId: item.id,
        toStatus,
        note: `Transitioned from admin review`,
      });
      // Update locally instead of full refresh for snappy UX.
      setItems(prev => prev.map(x => x.id === item.id ? { ...x, status: toStatus } : x));
    } catch (e) {
      setError(`Transition failed: ${e.message}`);
    } finally {
      setBusyId(null);
    }
  };

  if (forbidden) {
    return (
      <div style={{ padding: 24 }}>
        <h1 className="h1" style={{ margin: 0 }}>Suggestions</h1>
        <div className="card" style={{ padding: 24, marginTop: 16, textAlign: "center", color: "#475569" }}>
          Admin role required. Ask the platform owner to add your uid to <code>admins/{"{uid}"}</code>.
        </div>
      </div>
    );
  }

  const fmtDate = (ts) => {
    const sec = ts?._seconds || ts?.seconds;
    if (!sec) return "—";
    return new Date(sec * 1000).toLocaleString();
  };

  return (
    <div>
      <div className="pageHeader" style={{ alignItems: "center" }}>
        <h1 className="h1" style={{ margin: 0 }}>Suggestions</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: "8px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" }}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="reviewed">Reviewed</option>
            <option value="planned">Planned</option>
            <option value="shipped">Shipped</option>
            <option value="declined">Declined</option>
          </select>
          <button className="iconBtn" onClick={refresh} style={{ background: "white", color: "#1e293b", border: "1px solid #e2e8f0" }}>
            Refresh
          </button>
        </div>
      </div>

      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        Submissions from the “Suggest improvement” link on every worker. Move them through open → reviewed → planned → shipped as you triage.
      </div>

      {loading && <div className="card" style={{ padding: 24, textAlign: "center", color: "#64748b" }}>Loading suggestions…</div>}
      {!loading && error && (
        <div className="card" style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", marginBottom: 12, fontSize: 13 }}>
          {error}
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>No suggestions yet</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            When users click “Suggest improvement” on a worker, submissions land here.
          </div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map(item => {
            const style = STATUS_STYLES[item.status] || STATUS_STYLES.open;
            const nextStatuses = NEXT_STATUSES[item.status] || [];
            const isBusy = busyId === item.id;
            return (
              <div key={item.id} className="card" style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: style.bg, color: style.color, textTransform: "uppercase", letterSpacing: 0.4 }}>
                        {style.label}
                      </span>
                      <span style={{ fontSize: 11, color: "#64748b" }}>{item.workerSlug}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>· {SEVERITY_LABELS[item.severity] || item.severity}</span>
                      {item.submitterRole === "domain_expert" && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#fef3c7", color: "#a16207" }}>EXPERT</span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: "#475569", marginTop: 6, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{item.description}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
                      Submitted {fmtDate(item.createdAt)} by {item.submitterId?.slice(0, 8)}…
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    {nextStatuses.map(next => {
                      const ns = STATUS_STYLES[next];
                      return (
                        <button
                          key={next}
                          onClick={() => transition(item, next)}
                          disabled={isBusy}
                          style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", border: `1px solid ${ns.color}`, color: ns.color, background: "white", borderRadius: 6, cursor: isBusy ? "default" : "pointer", whiteSpace: "nowrap" }}
                        >
                          {isBusy ? "…" : `→ ${ns.label}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
