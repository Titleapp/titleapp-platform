/**
 * MsrLicensingCard.jsx — CODEX S52.60. Signal: card:msr-licensing
 * Pattern B (self-fetching). State licensing status tracker — schema-ready
 * for multistate expansion (Phase 3); Phase 1 has one demo state (TX).
 */

import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import CanvasCardShell from "./CanvasCardShell";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function fetchLicensing() {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) return null;
  const tenantId = localStorage.getItem("TENANT_ID") || "";
  if (!tenantId) return null;
  const res = await fetch(`${API_BASE}/api?path=/v1/msr:operator:licensing`, {
    headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
  });
  if (!res.ok) return null;
  return res.json();
}

const S = {
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" },
  state: { fontSize: 14, fontWeight: 700, color: "#0f172a" },
  sub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  badge: (bg, fg) => ({ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: bg, color: fg, whiteSpace: "nowrap" }),
  loading: { fontSize: 13, color: "#94a3b8", padding: "24px 0", textAlign: "center" },
};

export default function MsrLicensingCard({ resolved, context, onDismiss }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchLicensing().then(d => { if (!cancelled) { setData(d); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const states = data?.states || [];

  return (
    <CanvasCardShell
      title="State Licensing"
      emptyPrompt={resolved?.emptyPrompt || "No state licenses on file yet."}
      onDismiss={onDismiss}
    >
      {loading && <div style={S.loading}>Loading from live data…</div>}
      {!loading && states.length === 0 && <div style={S.loading}>No state licenses on file yet.</div>}
      {!loading && states.map(s => (
        <div key={s.state} style={S.row}>
          <div>
            <div style={S.state}>{s.state}</div>
            <div style={S.sub}>{s.licenseNumber} · renews {s.renewalDate}</div>
          </div>
          <span style={S.badge(s.licenseStatus === "active" ? "#dcfce7" : "#fef3c7", s.licenseStatus === "active" ? "#15803d" : "#b45309")}>
            {(s.licenseStatus || "").toUpperCase()}{s.heightenedScrutiny ? " · SCRUTINY" : ""}
          </span>
        </div>
      ))}
    </CanvasCardShell>
  );
}
