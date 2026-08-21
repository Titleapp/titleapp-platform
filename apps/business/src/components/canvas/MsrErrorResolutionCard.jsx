/**
 * MsrErrorResolutionCard.jsx — CODEX S52.60. Signal: card:msr-error-resolution
 * Pattern B (self-fetching). NOE/RFI tracker — deadlines computed per the
 * actual tiered structure (12 CFR 1024.35(e)(3), 1024.36(d)(2)), not a flat
 * 30 days.
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
  sub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  badge: (bg, fg) => ({ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: bg, color: fg, whiteSpace: "nowrap" }),
  loading: { fontSize: 13, color: "#94a3b8", padding: "24px 0", textAlign: "center" },
};

export default function MsrErrorResolutionCard({ resolved, context, onDismiss }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLoans().then(d => { if (!cancelled) { setData(d); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const requests = data?.errorRequests || [];

  return (
    <CanvasCardShell
      title="NOE / RFI Tracker"
      emptyPrompt={resolved?.emptyPrompt || "No open Notices of Error or Requests for Information."}
      onDismiss={onDismiss}
    >
      {loading && <div style={S.loading}>Loading from live data…</div>}
      {!loading && requests.length === 0 && <div style={S.loading}>No open Notices of Error or Requests for Information.</div>}
      {!loading && requests.map(r => (
        <div key={r.id} style={S.row}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div>
              <div style={S.name}>{r.subject || (r.type === "notice_of_error" ? "Notice of Error" : "Request for Information")}</div>
              <div style={S.sub}>{r.borrowerName} · received {r.receivedDate}</div>
            </div>
            <span style={S.badge(r.responseLogged ? "#dcfce7" : "#fef3c7", r.responseLogged ? "#15803d" : "#b45309")}>
              {r.responseLogged ? "RESPONDED" : `DUE ${r.responseDeadline || "—"}`}
            </span>
          </div>
        </div>
      ))}
    </CanvasCardShell>
  );
}
