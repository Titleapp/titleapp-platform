/**
 * MsrEscrowCard.jsx — CODEX S52.60. Signal: card:msr-escrow
 * Pattern B (self-fetching). Escrow charge cap + cushion are both governed
 * by 12 CFR 1024.17(c)(1)(ii) for ongoing servicing (not (c)(1)(i), which
 * is an at-settlement-only rule this worker doesn't reach).
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

const S = {
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #e2e8f0", fontSize: 11, textTransform: "uppercase" },
  td: { padding: "8px", borderBottom: "1px solid #f1f5f9" },
  badge: (bg, fg) => ({ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: bg, color: fg, whiteSpace: "nowrap" }),
  loading: { fontSize: 13, color: "#94a3b8", padding: "24px 0", textAlign: "center" },
  note: { fontSize: 11, color: "#94a3b8", marginTop: 12, lineHeight: 1.5 },
};

export default function MsrEscrowCard({ resolved, context, onDismiss }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLoans().then(d => { if (!cancelled) { setData(d); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const loans = data?.loans || [];
  const insuranceSubmissions = data?.insuranceSubmissions || [];
  const oneMonth = (l) => (l.escrowAnnualTotal || 0) / 12;
  const hasSubmission = (loanId) => insuranceSubmissions.some(s => s.loanId === loanId);

  return (
    <CanvasCardShell
      title="Escrow"
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
              <th style={S.th}>Annual Escrow</th>
              <th style={S.th}>Shortage</th>
              <th style={S.th}>Force-Placed Insurance</th>
            </tr>
          </thead>
          <tbody>
            {loans.map(l => {
              const shortage = l.escrowShortage || 0;
              const overThreshold = shortage > oneMonth(l);
              return (
                <tr key={l.loanId}>
                  <td style={S.td}>{l.borrowerName}</td>
                  <td style={S.td}>{l.escrowAnnualTotal != null ? `$${Number(l.escrowAnnualTotal).toLocaleString()}` : "—"}</td>
                  <td style={S.td}>
                    {shortage > 0
                      ? <span style={S.badge(overThreshold ? "#fef3c7" : "#f1f5f9", overThreshold ? "#b45309" : "#64748b")}>${shortage.toLocaleString()}{overThreshold ? " — REVIEW" : ""}</span>
                      : <span style={{ color: "#15803d" }}>None</span>}
                  </td>
                  <td style={S.td}>
                    {hasSubmission(l.loanId)
                      ? <span style={S.badge("#dbeafe", "#1e40af")}>PROOF SUBMITTED — PENDING REVIEW</span>
                      : l.forcePlacedInsuranceActive
                      ? <span style={S.badge("#fef3c7", "#b45309")}>NOTICE ACTIVE{l.forcePlacedNoticeDate ? ` (${l.forcePlacedNoticeDate})` : ""}</span>
                      : <span style={{ color: "#94a3b8" }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div style={S.note}>Escrow charges and cushion are both capped under 12 CFR 1024.17(c)(1)(ii): 1/12 annual (monthly) + up to 1/6 annual (cushion). Shortages over one month's deposit are flagged for review — this worker does not propose repayment terms unilaterally. Force-placed insurance requires a reasonable basis, a 45-day prior notice, and a second 15-day-prior notice (12 CFR 1024.37) — a borrower's submitted proof is intake only, reviewed and cleared by servicing staff, never auto-waived here.</div>
    </CanvasCardShell>
  );
}
