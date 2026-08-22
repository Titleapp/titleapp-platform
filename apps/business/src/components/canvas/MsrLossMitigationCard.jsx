/**
 * MsrLossMitigationCard.jsx — CODEX S52.60. Signal: card:msr-loss-mitigation
 * Pattern B (self-fetching). Shows hardship-request intake only — never a
 * decision. Approving/denying a modification is always an authorized human
 * call (msr-no-unilateral-modification-decision, 12 CFR 1024.41(c)(1)) —
 * there is deliberately no "approve/deny" action anywhere in this card.
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
  row: { padding: "10px 0", borderBottom: "1px solid #f1f5f9" },
  name: { fontSize: 13, fontWeight: 700, color: "#0f172a" },
  reason: { fontSize: 12, color: "#475569", marginTop: 2 },
  badge: { fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#fef3c7", color: "#b45309", whiteSpace: "nowrap" },
  loading: { fontSize: 13, color: "#94a3b8", padding: "24px 0", textAlign: "center" },
  note: { fontSize: 11, color: "#94a3b8", marginTop: 12, lineHeight: 1.5 },
};

export default function MsrLossMitigationCard({ resolved, context, onDismiss }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLoans().then(d => { if (!cancelled) { setData(d); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const requests = data?.hardshipRequests || [];

  return (
    <CanvasCardShell
      title="Loss Mitigation"
      emptyPrompt={resolved?.emptyPrompt || "No hardship requests on file yet."}
      onDismiss={onDismiss}
    >
      {loading && <div style={S.loading}>Loading from live data…</div>}
      {!loading && requests.length === 0 && <div style={S.loading}>No hardship requests on file yet.</div>}
      {!loading && requests.map(r => {
        const required = r.documentsRequired || [];
        const submitted = r.documentsSubmitted || [];
        const outstanding = required.filter(d => !submitted.includes(d));
        return (
          <div key={r.id} style={S.row}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={S.name}>{r.borrowerName}</div>
              <span style={S.badge}>{(r.status || "").toUpperCase()}</span>
            </div>
            <div style={S.reason}>{r.reason}</div>
            {required.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.6 }}>
                <div style={{ color: "#15803d" }}>
                  Submitted ({submitted.length}/{required.length}): {submitted.length > 0 ? submitted.join(", ") : "none yet"}
                </div>
                {outstanding.length > 0 && (
                  <div style={{ color: "#b45309" }}>Outstanding: {outstanding.join(", ")}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {!loading && requests.length > 0 && (
        <div style={S.note}>Every complete application is evaluated for all available options (12 CFR 1024.41(c)(1)) — the evaluation outcome is a servicing team decision, not made here.</div>
      )}
    </CanvasCardShell>
  );
}
