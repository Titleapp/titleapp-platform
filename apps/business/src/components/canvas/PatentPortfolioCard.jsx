import React, { useState, useEffect } from "react";
import CanvasCardShell from "./CanvasCardShell";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const STATUS_COLOR = {
  provisional_filed: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", dot: "#2563eb", label: "Provisional filed" },
  conversion_pending: { bg: "#fef3c7", border: "#fde68a", text: "#b45309", dot: "#d97706", label: "Awaiting conversion" },
  nonprovisional_filed: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", dot: "#16a34a", label: "Nonprovisional filed" },
  granted: { bg: "#f5f3ff", border: "#ddd6fe", text: "#5b21b6", dot: "#7c3aed", label: "Granted" },
  abandoned: { bg: "#f1f5f9", border: "#e2e8f0", text: "#64748b", dot: "#94a3b8", label: "Abandoned" },
  deferred: { bg: "#f8fafc", border: "#f1f5f9", text: "#94a3b8", dot: "#cbd5e1", label: "Deferred" },
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  if (isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

function deadlineBand(days) {
  if (days == null) return null;
  if (days < 0) return "RED";
  if (days <= 30) return "RED";
  if (days <= 90) return "YELLOW";
  return "GREEN";
}

const CAS = {
  RED:    { dot: "#dc2626", bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
  YELLOW: { dot: "#d97706", bg: "#fffbeb", border: "#fde68a", text: "#b45309" },
  GREEN:  { dot: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
};

export default function PatentPortfolioCard({ resolved, context, onDismiss }) {
  const [portfolio, setPortfolio] = useState(context?.payload?.patents || null);
  const [loading, setLoading] = useState(!context?.payload?.patents);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (portfolio) return;
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("ID_TOKEN");
        const tenantId = localStorage.getItem("TENANT_ID") || "sociii-inc";
        const headers = { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId };
        const res = await fetch(`${API_BASE}/api?path=/v1/patent:portfolio`, { headers });
        const data = await res.json();
        if (cancelled) return;
        if (data?.ok) setPortfolio(data.patents || []);
        else setError(data?.error || "Failed to load");
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const patents = portfolio || [];

  // Find the most urgent conversion deadline
  const deadlines = patents
    .filter(p => p.conversionDeadline && p.status === "provisional_filed")
    .map(p => ({ ...p, days: daysUntil(p.conversionDeadline) }))
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

  const nextDeadline = deadlines[0] || null;
  const nextDays = nextDeadline?.days;
  const band = deadlineBand(nextDays);
  const cc = band ? CAS[band] : null;

  return (
    <CanvasCardShell
      title="Patent Portfolio"
      onDismiss={onDismiss}
    >
      {!loading && !error && patents.length > 0 && (
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16, marginTop: -4 }}>
          {patents.length} filing{patents.length !== 1 ? "s" : ""} · SOCIII Inc. · Sean Lee Combs
        </div>
      )}
      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading portfolio…</div>
      )}
      {!loading && error && (
        <div style={{ padding: 16, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: 13 }}>{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* Deadline engine — the hero alert */}
          {nextDeadline && cc && (
            <div style={{
              padding: "14px 16px", marginBottom: 20, borderRadius: 10,
              background: cc.bg, border: `1px solid ${cc.border}`,
              display: "flex", alignItems: "flex-start", gap: 12,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: cc.dot, marginTop: 4, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: cc.text, marginBottom: 3 }}>
                  {nextDays != null && nextDays < 0
                    ? `Conversion deadline OVERDUE by ${Math.abs(nextDays)} days`
                    : nextDays === 0 ? "Conversion deadline TODAY"
                    : `${nextDays} days until conversion deadline`}
                </div>
                <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                  <strong>{nextDeadline.filingNumber || nextDeadline.title}</strong> must convert to nonprovisional or PCT by{" "}
                  <strong>{nextDeadline.conversionDeadline}</strong>. Failure to convert causes permanent lapse.
                </div>
                {deadlines.length > 1 && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    + {deadlines.length - 1} more provisional{deadlines.length - 1 !== 1 ? "s" : ""} on the same deadline.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Portfolio table */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {patents.map((p, i) => {
              const sc = STATUS_COLOR[p.status] || STATUS_COLOR.provisional_filed;
              const pDays = p.conversionDeadline ? daysUntil(p.conversionDeadline) : null;
              const pBand = deadlineBand(pDays);
              const pCc = pBand ? CAS[pBand] : null;
              return (
                <div key={p.id || i} style={{
                  padding: "14px 16px", borderRadius: 10, background: "#fff",
                  border: "1px solid #f1f5f9", boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", lineHeight: 1.3, marginBottom: 4 }}>{p.title}</div>
                      {p.filingNumber && (
                        <code style={{ fontSize: 11, color: "#94a3b8" }}>{p.filingNumber}</code>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
                      padding: "3px 8px", borderRadius: 999, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                      whiteSpace: "nowrap", flexShrink: 0,
                    }}>{sc.label}</span>
                  </div>

                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#64748b" }}>
                    {p.filedDate && <span>Filed {p.filedDate}</span>}
                    {p.entityStatus && <span>{p.entityStatus} entity · ${p.filingFee || "130"}</span>}
                    {p.inventors && <span>Inventor: {p.inventors}</span>}
                  </div>

                  {p.conversionDeadline && p.status === "provisional_filed" && pCc && pDays != null && (
                    <div style={{
                      marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "3px 10px", borderRadius: 999, background: pCc.bg, border: `1px solid ${pCc.border}`,
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: pCc.dot }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: pCc.text }}>
                        Convert by {p.conversionDeadline}
                        {pDays >= 0 ? ` (${pDays} days)` : ` (${Math.abs(pDays)}d overdue)`}
                      </span>
                    </div>
                  )}

                  {p.abstract && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#475569", lineHeight: 1.5, borderTop: "1px solid #f8fafc", paddingTop: 8 }}>
                      {p.abstract.slice(0, 200)}{p.abstract.length > 200 ? "…" : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {patents.length === 0 && (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>No patents on file yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                Tell Alex about an invention and I'll draft a provisional patent application and help you file it through USPTO Patent Center.
              </div>
            </div>
          )}
        </>
      )}
    </CanvasCardShell>
  );
}
