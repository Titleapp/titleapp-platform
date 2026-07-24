/**
 * PLSummaryCard.jsx — P&L Summary canvas card (CODEX 43 Pattern B)
 * Signal: card:accounting-pl
 *
 * Pattern B: always fetches from backend. AI payload is ignored.
 */

import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import CanvasCardShell from "./CanvasCardShell";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function fetchPL() {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) return null;
  const tenantId = localStorage.getItem("TENANT_ID") || "";
  if (!tenantId) return null;
  const res = await fetch(`${API_BASE}/api?path=/v1/accounting:pl`, {
    headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.plData || null;
}

const S = {
  row: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 },
  label: { color: "#64748b" },
  value: { fontWeight: 600, color: "#1e293b" },
  total: { fontWeight: 700, color: "#111827", fontSize: 15 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  period: { fontSize: 12, color: "#94a3b8", marginBottom: 12 },
  loading: { fontSize: 13, color: "#94a3b8", padding: "24px 0", textAlign: "center" },
  error: { fontSize: 13, color: "#dc2626", padding: "12px 0" },
};

export default function PLSummaryCard({ resolved, context, onDismiss }) {
  // Always fetch from backend — never seed from context.payload (Pattern B).
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPL()
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  return (
    <CanvasCardShell
      title="P&L Summary"
      emptyPrompt={resolved?.emptyPrompt || "Ask Alex about your P&L to see it here."}
      onDismiss={onDismiss}
    >
      {loading && <div style={S.loading}>Loading from live data…</div>}
      {error && <div style={S.error}>Could not load — reload to try again.</div>}
      {!loading && !error && !data && (
        <div style={S.loading}>No transaction data on file yet.</div>
      )}
      {!loading && data && (
        <>
          {data.period && <div style={S.period}>{data.period}{data.meta?.truncated ? " (large dataset — figures approximate)" : ""}</div>}
          <div style={S.section}>
            <div style={S.sectionTitle}>Revenue</div>
            {(data.revenue || []).map((item, i) => (
              <div key={i} style={S.row}>
                <span style={S.label}>{item.label}</span>
                <span style={S.value}>${(item.amount || 0).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ ...S.row, borderBottom: "2px solid #e5e7eb" }}>
              <span style={S.total}>Total Revenue</span>
              <span style={S.total}>${(data.totalRevenue || 0).toLocaleString()}</span>
            </div>
          </div>
          <div style={S.section}>
            <div style={S.sectionTitle}>Expenses</div>
            {(data.expenses || []).map((item, i) => (
              <div key={i} style={S.row}>
                <span style={S.label}>{item.label}</span>
                <span style={{ ...S.value, color: "#dc2626" }}>-${(item.amount || 0).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ ...S.row, borderBottom: "2px solid #e5e7eb" }}>
              <span style={S.total}>Total Expenses</span>
              <span style={{ ...S.total, color: "#dc2626" }}>-${(data.totalExpenses || 0).toLocaleString()}</span>
            </div>
          </div>
          <div style={{ ...S.row, borderBottom: "none", paddingTop: 12 }}>
            <span style={{ ...S.total, fontSize: 16 }}>Net Income</span>
            <span style={{ ...S.total, fontSize: 16, color: (data.netIncome || 0) >= 0 ? "#16a34a" : "#dc2626" }}>
              ${(data.netIncome || 0).toLocaleString()}
            </span>
          </div>
        </>
      )}
    </CanvasCardShell>
  );
}
