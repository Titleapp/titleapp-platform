/**
 * MsrAuditLogCard.jsx — CODEX S52.60. Signal: card:msr-audit-log
 * Pattern B (self-fetching). Append-only compliance events — see
 * CODEX S52.60 §3.4 (dedicated collection, not the blockchain-anchored
 * Audit Trail worker — confirmed by Sean 2026-08-21).
 */

import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import CanvasCardShell from "./CanvasCardShell";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function fetchAuditLog() {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) return null;
  const tenantId = localStorage.getItem("TENANT_ID") || "";
  if (!tenantId) return null;
  const res = await fetch(`${API_BASE}/api?path=/v1/msr:operator:auditlog`, {
    headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
  });
  if (!res.ok) return null;
  return res.json();
}

const S = {
  row: { padding: "9px 0", borderBottom: "1px solid #f1f5f9" },
  rule: { fontSize: 12, fontWeight: 700, color: "#0f172a", fontFamily: "monospace" },
  note: { fontSize: 12, color: "#475569", marginTop: 2 },
  badge: (bg, fg) => ({ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: bg, color: fg, whiteSpace: "nowrap" }),
  loading: { fontSize: 13, color: "#94a3b8", padding: "24px 0", textAlign: "center" },
};

const OUTCOME_COLORS = {
  blocked: ["#fee2e2", "#991b1b"],
  flagged: ["#fef3c7", "#b45309"],
  passed: ["#dcfce7", "#15803d"],
};

export default function MsrAuditLogCard({ resolved, context, onDismiss }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAuditLog().then(d => { if (!cancelled) { setData(d); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const events = data?.events || [];

  return (
    <CanvasCardShell
      title="Compliance Audit Log"
      emptyPrompt={resolved?.emptyPrompt || "No compliance events logged yet."}
      onDismiss={onDismiss}
    >
      {loading && <div style={S.loading}>Loading from live data…</div>}
      {!loading && events.length === 0 && <div style={S.loading}>No compliance events logged yet.</div>}
      {!loading && events.map(e => {
        const [bg, fg] = OUTCOME_COLORS[e.outcome] || ["#f1f5f9", "#64748b"];
        return (
          <div key={e.id} style={S.row}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={S.rule}>{e.ruleId}</div>
              <span style={S.badge(bg, fg)}>{(e.outcome || "").toUpperCase()}</span>
            </div>
            <div style={S.note}>{e.note}</div>
          </div>
        );
      })}
    </CanvasCardShell>
  );
}
