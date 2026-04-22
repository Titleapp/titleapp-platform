/**
 * MarketingDrafts.jsx — Draft queue with approve/reject workflow (49.2)
 * Replaces SpineSection for "campaigns" nav item under platform-marketing worker.
 */

import React, { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const PLATFORM_COLORS = {
  linkedin:  { bg: "#e0e7ff", color: "#4338ca" },
  twitter:   { bg: "#e0f2fe", color: "#0369a1" },
  facebook:  { bg: "#dbeafe", color: "#1d4ed8" },
  instagram: { bg: "#fce7f3", color: "#be185d" },
  email:     { bg: "#fef3c7", color: "#92400e" },
  tiktok:    { bg: "#f0fdf4", color: "#166534" },
  gbp:       { bg: "#fef9c3", color: "#854d0e" },
};

const STATUS_COLORS = {
  draft:    { bg: "#f1f5f9", color: "#475569" },
  approved: { bg: "#dbeafe", color: "#1d4ed8" },
  rejected: { bg: "#fee2e2", color: "#dc2626" },
  posted:   { bg: "#dcfce7", color: "#16a34a" },
};

const FILTERS = ["all", "draft", "approved", "rejected", "posted"];

const S = {
  container: { padding: "28px 32px", maxWidth: 900 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 4 },
  filters: { display: "flex", gap: 6, marginBottom: 20 },
  filterBtn: {
    padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 6,
    border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer",
  },
  filterActive: {
    padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 6,
    border: "1px solid #6B46C1", background: "#f5f3ff", color: "#6B46C1", cursor: "pointer",
  },
  card: {
    background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0",
    padding: "16px 20px", marginBottom: 12,
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#1e293b" },
  statusBadge: {
    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  content: { fontSize: 13, color: "#374151", lineHeight: 1.5, marginBottom: 10, whiteSpace: "pre-wrap" },
  platforms: { display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 },
  platformTag: { fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, flexShrink: 0 },
  meta: { fontSize: 11, color: "#9ca3af" },
  actions: { display: "flex", gap: 8, marginTop: 12 },
  approveBtn: {
    padding: "8px 16px", fontSize: 12, fontWeight: 600, borderRadius: 6,
    border: "none", background: "#6B46C1", color: "#fff", cursor: "pointer",
  },
  rejectBtn: {
    padding: "8px 16px", fontSize: 12, fontWeight: 600, borderRadius: 6,
    border: "1px solid #e2e8f0", background: "#fff", color: "#dc2626", cursor: "pointer",
  },
  empty: {
    padding: 48, textAlign: "center", background: "#f8fafc", borderRadius: 10,
    border: "1px dashed #e2e8f0", color: "#94a3b8", fontSize: 14,
  },
  loading: { padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 },
  error: { padding: 16, background: "#fef2f2", borderRadius: 8, color: "#dc2626", fontSize: 13, marginBottom: 16 },
};

async function apiFetch(path, method = "GET", body = null) {
  const token = localStorage.getItem("ID_TOKEN");
  const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent(path)}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export default function MarketingDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = filter === "all" ? "" : `&status=${filter}`;
      const result = await apiFetch(`/v1/marketing:listDrafts?limit=50${statusParam}`);
      setDrafts(result.drafts || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  async function handleApprove(draftId) {
    setActionLoading(draftId);
    try {
      await apiFetch("/v1/marketing:approveDraft", "POST", { draftId });
      await loadDrafts();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(draftId) {
    const reason = window.prompt("Rejection reason (optional):");
    if (reason === null) return; // cancelled
    setActionLoading(draftId);
    try {
      await apiFetch("/v1/marketing:rejectDraft", "POST", { draftId, reason: reason || undefined });
      await loadDrafts();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div>
          <div style={S.title}>Marketing Drafts</div>
          <div style={S.subtitle}>Review, approve, and publish content across platforms</div>
        </div>
      </div>

      <div style={S.filters}>
        {FILTERS.map(f => (
          <button
            key={f}
            style={filter === f ? S.filterActive : S.filterBtn}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {error && <div style={S.error}>{error}</div>}

      {loading ? (
        <div style={S.loading}>Loading drafts...</div>
      ) : drafts.length === 0 ? (
        <div style={S.empty}>
          No drafts yet. Ask Alex to write content, then save it as a draft.
        </div>
      ) : (
        drafts.map(draft => {
          const sc = STATUS_COLORS[draft.status] || STATUS_COLORS.draft;
          return (
            <div key={draft.id} style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>{draft.title || "Untitled Draft"}</div>
                <span style={{ ...S.statusBadge, background: sc.bg, color: sc.color }}>
                  {draft.status}
                </span>
              </div>

              <div style={S.content}>
                {draft.content?.length > 300 ? draft.content.slice(0, 300) + "..." : draft.content}
              </div>

              {draft.platforms?.length > 0 && (
                <div style={S.platforms}>
                  {draft.platforms.map(p => {
                    const pc = PLATFORM_COLORS[p.toLowerCase()] || PLATFORM_COLORS.linkedin;
                    return (
                      <span key={p} style={{ ...S.platformTag, background: pc.bg, color: pc.color }}>
                        {p}
                      </span>
                    );
                  })}
                </div>
              )}

              <div style={S.meta}>
                {draft.createdAt ? new Date(draft.createdAt).toLocaleString() : ""}
                {draft.rejectionReason && ` — Rejected: ${draft.rejectionReason}`}
              </div>

              {draft.status === "draft" && (
                <div style={S.actions}>
                  <button
                    style={S.approveBtn}
                    onClick={() => handleApprove(draft.id)}
                    disabled={actionLoading === draft.id}
                  >
                    {actionLoading === draft.id ? "Posting..." : "Approve & Post"}
                  </button>
                  <button
                    style={S.rejectBtn}
                    onClick={() => handleReject(draft.id)}
                    disabled={actionLoading === draft.id}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
