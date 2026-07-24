/**
 * BalanceSheetCard.jsx — Balance Sheet canvas card (CODEX 43 Pattern B)
 * Signal: card:accounting-balance-sheet
 *
 * Pattern B: always fetches from backend. Never uses AI-supplied payload —
 * the AI is not trusted to emit financial figures accurately. If the AI
 * happens to include a payload, it is ignored entirely (the $150K-balance
 * hallucination happened because the card trusted the AI's numbers).
 */

import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import CanvasCardShell from "./CanvasCardShell";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function fetchBalanceSheet() {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) return null;
  // x-tenant-id MUST be explicit — never inferred from session (red team F1).
  const tenantId = localStorage.getItem("TENANT_ID") || "";
  if (!tenantId) return null;
  const res = await fetch(`${API_BASE}/api?path=/v1/accounting:balance-sheet`, {
    headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.balanceSheet || null;
}

const S = {
  row: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 },
  label: { color: "#64748b" },
  value: { fontWeight: 600, color: "#1e293b" },
  total: { fontWeight: 700, color: "#111827", fontSize: 15 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  subsectionTitle: { fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  asOf: { fontSize: 12, color: "#94a3b8", marginBottom: 12 },
  checkRow: { display: "flex", justifyContent: "space-between", padding: "10px 0", marginTop: 8, fontSize: 12, color: "#64748b", fontStyle: "italic" },
  loading: { fontSize: 13, color: "#94a3b8", padding: "24px 0", textAlign: "center" },
  error: { fontSize: 13, color: "#dc2626", padding: "12px 0" },
};

function fmt(n) {
  return `$${(Number(n) || 0).toLocaleString()}`;
}

function renderItems(items) {
  return (items || []).map((item, i) => (
    <div key={i} style={S.row}>
      <span style={S.label}>{item.label}</span>
      <span style={S.value}>{fmt(item.amount)}</span>
    </div>
  ));
}

export default function BalanceSheetCard({ resolved, context, onDismiss }) {
  // Always fetch from backend — never seed from context.payload.
  // AI payload is intentionally ignored (Pattern B: data-heavy cards must not
  // trust model-generated numbers; they always self-fetch from the rules engine).
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchBalanceSheet()
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const currentAssets = data?.currentAssets || [];
  const nonCurrentAssets = data?.nonCurrentAssets || [];
  const currentLiabilities = data?.currentLiabilities || [];
  const longTermLiabilities = data?.longTermLiabilities || [];
  const equity = data?.equity || [];

  const totalCurrentAssets = currentAssets.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalNonCurrentAssets = nonCurrentAssets.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;
  const totalCurrentLiabilities = currentLiabilities.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalLongTermLiabilities = longTermLiabilities.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;
  const totalEquity = equity.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalLiabAndEquity = totalLiabilities + totalEquity;
  const balanced = Math.abs(totalAssets - totalLiabAndEquity) < 0.5;

  return (
    <CanvasCardShell
      title="Balance Sheet"
      emptyPrompt={resolved?.emptyPrompt || "Ask Alex to show the balance sheet."}
      onDismiss={onDismiss}
    >
      {loading && <div style={S.loading}>Loading from live data…</div>}
      {error && <div style={S.error}>Could not load — reload to try again.</div>}
      {!loading && !error && !data && (
        <div style={S.loading}>No transaction data on file yet.</div>
      )}
      {!loading && data && (
        <>
          {data.asOf && <div style={S.asOf}>As of {data.asOf}{data.meta?.truncated ? " (large dataset — figures approximate)" : ""}</div>}

          <div style={S.section}>
            <div style={S.sectionTitle}>Assets</div>
            {currentAssets.length > 0 && (
              <>
                <div style={S.subsectionTitle}>Current Assets</div>
                {renderItems(currentAssets)}
                <div style={{ ...S.row, borderBottom: "1px solid #cbd5e1" }}>
                  <span style={S.value}>Total Current Assets</span>
                  <span style={S.value}>{fmt(totalCurrentAssets)}</span>
                </div>
              </>
            )}
            {nonCurrentAssets.length > 0 && (
              <>
                <div style={S.subsectionTitle}>Non-Current Assets</div>
                {renderItems(nonCurrentAssets)}
                <div style={{ ...S.row, borderBottom: "1px solid #cbd5e1" }}>
                  <span style={S.value}>Total Non-Current Assets</span>
                  <span style={S.value}>{fmt(totalNonCurrentAssets)}</span>
                </div>
              </>
            )}
            <div style={{ ...S.row, borderBottom: "2px solid #e5e7eb", paddingTop: 10 }}>
              <span style={S.total}>Total Assets</span>
              <span style={S.total}>{fmt(totalAssets)}</span>
            </div>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}>Liabilities</div>
            {currentLiabilities.length > 0 && (
              <>
                <div style={S.subsectionTitle}>Current Liabilities</div>
                {renderItems(currentLiabilities)}
                <div style={{ ...S.row, borderBottom: "1px solid #cbd5e1" }}>
                  <span style={S.value}>Total Current Liabilities</span>
                  <span style={{ ...S.value, color: "#dc2626" }}>{fmt(totalCurrentLiabilities)}</span>
                </div>
              </>
            )}
            {longTermLiabilities.length > 0 && (
              <>
                <div style={S.subsectionTitle}>Long-Term Liabilities</div>
                {renderItems(longTermLiabilities)}
                <div style={{ ...S.row, borderBottom: "1px solid #cbd5e1" }}>
                  <span style={S.value}>Total Long-Term Liabilities</span>
                  <span style={{ ...S.value, color: "#dc2626" }}>{fmt(totalLongTermLiabilities)}</span>
                </div>
              </>
            )}
            <div style={{ ...S.row, borderBottom: "2px solid #e5e7eb", paddingTop: 10 }}>
              <span style={S.total}>Total Liabilities</span>
              <span style={{ ...S.total, color: "#dc2626" }}>{fmt(totalLiabilities)}</span>
            </div>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}>Equity</div>
            {renderItems(equity)}
            <div style={{ ...S.row, borderBottom: "2px solid #e5e7eb", paddingTop: 10 }}>
              <span style={S.total}>Total Equity</span>
              <span style={{ ...S.total, color: "#16a34a" }}>{fmt(totalEquity)}</span>
            </div>
          </div>

          <div style={{ ...S.row, borderBottom: "none", paddingTop: 12 }}>
            <span style={{ ...S.total, fontSize: 16 }}>Total Liabilities + Equity</span>
            <span style={{ ...S.total, fontSize: 16 }}>{fmt(totalLiabAndEquity)}</span>
          </div>

          <div style={S.checkRow}>
            <span>Balance check</span>
            <span style={{ color: balanced ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
              {balanced ? "Assets = Liabilities + Equity" : `Off by ${fmt(Math.abs(totalAssets - totalLiabAndEquity))}`}
            </span>
          </div>
        </>
      )}
    </CanvasCardShell>
  );
}
