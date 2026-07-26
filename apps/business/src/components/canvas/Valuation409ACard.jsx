/**
 * Valuation409ACard.jsx — 409A Fair Market Value canvas card
 * Signal: card:ir-409a
 * Data source: payload from Alex or fetched from /ir:valuation:409a
 */

import React, { useState, useEffect } from "react";
import CanvasCardShell from "./CanvasCardShell";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const S = {
  hero: {
    textAlign: "center", padding: "24px 0 20px", borderBottom: "1px solid #e2e8f0",
  },
  heroLabel: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  heroValue: { fontSize: 44, fontWeight: 700, color: "#1e293b", lineHeight: 1 },
  heroSub: { fontSize: 13, color: "#64748b", marginTop: 6 },
  section: { marginBottom: 20, paddingTop: 16 },
  sectionTitle: {
    fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase",
    letterSpacing: 0.5, marginBottom: 10,
  },
  row: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "7px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13,
  },
  label: { color: "#64748b" },
  value: { fontWeight: 600, color: "#1e293b" },
  totalRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 0", fontSize: 14, fontWeight: 700, color: "#111827",
    borderTop: "2px solid #e2e8f0", marginTop: 4,
  },
  approachRow: {
    display: "grid", gridTemplateColumns: "1fr 90px 50px",
    alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc",
    fontSize: 13, gap: 8,
  },
  approachLabel: { color: "#374151" },
  approachValue: { textAlign: "right", fontWeight: 600, color: "#1e293b" },
  approachWeight: {
    textAlign: "right", fontSize: 11, fontWeight: 600,
    color: "#7c3aed", background: "#f5f3ff", padding: "2px 6px",
    borderRadius: 999, whiteSpace: "nowrap",
  },
  shareholderRow: {
    display: "grid", gridTemplateColumns: "1fr 80px 60px",
    alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f8fafc",
    fontSize: 12, gap: 8,
  },
  pill: (color) => ({
    display: "inline-block", fontSize: 10, fontWeight: 700, padding: "2px 7px",
    borderRadius: 999, letterSpacing: 0.3,
    background: color === "green" ? "#dcfce7" : color === "amber" ? "#fef3c7" : "#eff6ff",
    color: color === "green" ? "#15803d" : color === "amber" ? "#b45309" : "#1d4ed8",
  }),
  disclaimer: {
    marginTop: 16, padding: "10px 12px", background: "#fafafa", borderRadius: 8,
    border: "1px solid #e2e8f0", fontSize: 11, color: "#64748b", lineHeight: 1.6,
  },
};

function fmt(n) {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString();
}

export default function Valuation409ACard({ resolved: _resolved, context, onDismiss }) {
  const [data, setData] = useState(context?.payload?.valuation409a || context?.payload || null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (data) return;
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("ID_TOKEN");
        const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID");
        const headers = { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId };
        const res = await fetch(`${API_BASE}/api?path=/v1/ir:valuation:409a`, { headers });
        const json = await res.json();
        if (cancelled) return;
        if (json?.ok) setData(json.valuation);
        else setError(json?.error || "Failed to load valuation");
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [data]);

  const d = data || {};
  const approaches = d.approaches || [
    { label: "Asset Approach", ev: d.assetEV, weight: "10%" },
    { label: "Market Comparable (AI/SaaS Seed)", ev: d.marketEV, weight: "40%" },
    { label: "PWERM (Exit Scenarios)", ev: d.pwermEV, weight: "50%" },
  ];
  const shareholders = d.shareholders || [];
  const fmvPerShare = d.fmvPerShare;
  const equityValue = d.equityValue;
  const blendedEV = d.blendedEV;
  const totalShares = d.totalShares || 10000000;
  const totalDebt = d.totalDebt || 0;
  const asOf = d.asOf || "current";

  return (
    <CanvasCardShell
      title="409A Valuation"
      loading={loading}
      emptyPrompt={error || "Ask Alex to generate a 409A valuation report."}
      onDismiss={onDismiss}
    >
      {(fmvPerShare != null || data) && (
        <>
          {/* Hero — FMV per share */}
          <div style={S.hero}>
            <div style={S.heroLabel}>Fair Market Value per Share</div>
            <div style={S.heroValue}>
              {fmvPerShare != null ? `$${fmvPerShare.toFixed(4)}` : "Computing..."}
            </div>
            <div style={S.heroSub}>
              As of {asOf} &nbsp;·&nbsp;{totalShares.toLocaleString()} shares outstanding
            </div>
            {equityValue != null && (
              <div style={{ ...S.heroSub, marginTop: 4, fontWeight: 600, color: "#374151" }}>
                Total Equity Value: {fmt(equityValue)}
              </div>
            )}
          </div>

          {/* Methodology waterfall */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Methodology — Three-Approach Blend</div>
            <div style={{ ...S.approachRow, fontWeight: 700, fontSize: 11, color: "#7c3aed" }}>
              <span>Approach</span><span style={{ textAlign: "right" }}>EV</span><span style={{ textAlign: "right" }}>Weight</span>
            </div>
            {approaches.map((a, i) => (
              <div key={i} style={S.approachRow}>
                <span style={S.approachLabel}>{a.label}</span>
                <span style={S.approachValue}>{fmt(a.ev)}</span>
                <span style={S.approachWeight}>{a.weight}</span>
              </div>
            ))}
            <div style={S.totalRow}>
              <span>Blended Enterprise Value</span>
              <span>{fmt(blendedEV)}</span>
            </div>
            {totalDebt > 0 && (
              <div style={{ ...S.row, borderBottom: "none" }}>
                <span style={S.label}>Less: Debt</span>
                <span style={{ ...S.value, color: "#dc2626" }}>({fmt(totalDebt)})</span>
              </div>
            )}
            <div style={{ ...S.row, borderBottom: "none" }}>
              <span style={S.label}>Less: DLOM (35%)</span>
              <span style={{ ...S.value, color: "#dc2626" }}>
                ({equityValue && blendedEV ? fmt((blendedEV - totalDebt) * 0.35) : "—"})
              </span>
            </div>
            <div style={S.totalRow}>
              <span>Equity Value (post-DLOM)</span>
              <span style={{ color: "#16a34a" }}>{fmt(equityValue)}</span>
            </div>
          </div>

          {/* Exit scenarios (PWERM) */}
          {d.scenarios && d.scenarios.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>Exit Scenario Assumptions</div>
              {d.scenarios.map((sc, i) => (
                <div key={i} style={S.row}>
                  <span style={S.label}>{sc.label}</span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={S.value}>{fmt(sc.ev)}</span>
                    <span style={S.pill(sc.prob >= 0.25 ? "green" : "amber")}>{Math.round(sc.prob * 100)}%</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Cap table summary */}
          {shareholders.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>Cap Table</div>
              <div style={{ ...S.shareholderRow, fontWeight: 700, fontSize: 11, color: "#475569" }}>
                <span>Shareholder</span><span style={{ textAlign: "right" }}>Shares</span><span style={{ textAlign: "right" }}>Ownership</span>
              </div>
              {shareholders.map((sh, i) => (
                <div key={i} style={S.shareholderRow}>
                  <span style={{ color: "#374151" }}>{sh.name}</span>
                  <span style={{ textAlign: "right", color: "#1e293b" }}>{(sh.shares || 0).toLocaleString()}</span>
                  <span style={{ textAlign: "right", fontWeight: 600, color: "#7c3aed" }}>
                    {sh.pct != null ? `${sh.pct}%` : `${((sh.shares / totalShares) * 100).toFixed(1)}%`}
                  </span>
                </div>
              ))}
              <div style={{ ...S.totalRow, fontSize: 13 }}>
                <span>Total</span>
                <span>{totalShares.toLocaleString()} shares</span>
              </div>
            </div>
          )}

          <div style={S.disclaimer}>
            AI-generated indicative valuation using standard IRS methodologies (Asset, Market Comparable, PWERM).
            For IRS Section 409A safe harbor, a qualified independent appraiser must review and sign.
            For Reg CF offering price disclosure, this computation provides a defensible basis.
            Use the ↓ button above to download this report.
          </div>
        </>
      )}
    </CanvasCardShell>
  );
}
