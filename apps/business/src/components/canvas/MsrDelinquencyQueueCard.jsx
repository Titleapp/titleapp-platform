/**
 * MsrDelinquencyQueueCard.jsx — CODEX S52.60. Signal: card:msr-delinquency-queue
 * Pattern B (self-fetching, same shape as PLSummaryCard) — AI payload ignored.
 */

import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import CanvasCardShell from "./CanvasCardShell";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function fetchLoans() {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) return null;
  const tenantId = localStorage.getItem("TENANT_ID") || "";
  if (!tenantId) return null;
  const res = await fetch(`${API_BASE}/api?path=/v1/msr:operator:loans`, {
    headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
  });
  if (!res.ok) return null;
  return res.json();
}

// 12 CFR 1024.39(a)/(b)(1) — two independent triggers, never collapsed into one.
function earlyInterventionStatus(loan) {
  if (loan.status !== "delinquent" || !loan.delinquencyStartDate) return null;
  const start = new Date(loan.delinquencyStartDate + "T00:00:00");
  const days = Math.floor((Date.now() - start.getTime()) / 86400000);
  const liveContactDue = !loan.liveContactLoggedAt && days >= 31; // within 5 days of day-36
  const writtenNoticeDue = !loan.writtenNoticeLoggedAt && days >= 40; // within 5 days of day-45
  if (liveContactDue || writtenNoticeDue) {
    const parts = [];
    if (liveContactDue) parts.push(`live-contact (§1024.39(a)) due day 36, on day ${days}`);
    if (writtenNoticeDue) parts.push(`written notice (§1024.39(b)(1)) due day 45, on day ${days}`);
    return parts.join(" · ");
  }
  return null;
}

const S = {
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #e2e8f0", fontSize: 11, textTransform: "uppercase" },
  td: { padding: "8px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" },
  badge: (bg, fg) => ({ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: bg, color: fg, whiteSpace: "nowrap" }),
  flag: { fontSize: 11, color: "#b45309", marginTop: 2 },
  loading: { fontSize: 13, color: "#94a3b8", padding: "24px 0", textAlign: "center" },
};

export default function MsrDelinquencyQueueCard({ resolved, context, onDismiss }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLoans().then(d => { if (!cancelled) { setData(d); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const loans = data?.loans || [];
  const delinquent = loans.filter(l => l.status === "delinquent");

  return (
    <CanvasCardShell
      title="Delinquency Queue"
      emptyPrompt={resolved?.emptyPrompt || "No loans on file yet."}
      onDismiss={onDismiss}
    >
      {loading && <div style={S.loading}>Loading from live data…</div>}
      {!loading && loans.length === 0 && <div style={S.loading}>No loans on file yet.</div>}
      {!loading && loans.length > 0 && (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Borrower</th>
              <th style={S.th}>Property</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Early Intervention</th>
            </tr>
          </thead>
          <tbody>
            {loans.map(l => {
              const flag = earlyInterventionStatus(l);
              return (
                <tr key={l.loanId}>
                  <td style={S.td}>{l.borrowerName}{l.ceaseCommunication && <div style={S.flag}>Cease-communication on file</div>}</td>
                  <td style={S.td}>{l.propertyAddress}</td>
                  <td style={S.td}>
                    <span style={S.badge(l.status === "delinquent" ? "#fef3c7" : "#dcfce7", l.status === "delinquent" ? "#b45309" : "#15803d")}>
                      {(l.status || "").toUpperCase()}
                    </span>
                  </td>
                  <td style={S.td}>{flag ? <span style={S.flag}>{flag}</span> : <span style={{ color: "#94a3b8" }}>—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {!loading && loans.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>{delinquent.length} of {loans.length} loans delinquent.</div>
      )}
    </CanvasCardShell>
  );
}
