import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function fmt(n) {
  if (n == null || n === 0) return "—";
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "$" + Math.round(n).toLocaleString();
  return "$" + n.toFixed(4);
}

function fmtPct(n) {
  if (n == null) return "—";
  return (n * 100).toFixed(0) + "%";
}

const PILL = {
  green:  { background: "#dcfce7", color: "#15803d" },
  amber:  { background: "#fef3c7", color: "#b45309" },
  purple: { background: "#f3e8ff", color: "#7c3aed" },
  blue:   { background: "#dbeafe", color: "#1d4ed8" },
};

export default function Valuation409A() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load(force = false) {
    if (force) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const token    = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID");
      const res = await fetch(`${API_BASE}/api?path=/v1/ir:valuation:409a`, {
        headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
      });
      const json = await res.json();
      if (json?.ok) setData(json.valuation);
      else setError(json?.error || "Failed to load valuation");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>
        Computing 409A valuation...
      </div>
    );
  }

  const d = data || {};
  const shareholders = d.shareholders || [
    { name: "Sean L. Combs", shares: 7_100_000, pct: 71 },
    { name: "Kent Redwine", shares: 1_700_000, pct: 17 },
    { name: "Advisor Pool (6 × 2%)", shares: 1_200_000, pct: 12 },
  ];
  const totalShares = d.totalShares || 10_000_000;
  const fmvPerShare = d.fmvPerShare;
  const equityValue = d.equityValue;
  const blendedEV   = d.blendedEV;
  const totalDebt   = d.totalDebt || 0;
  const asOf        = d.asOf || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const approaches  = d.approaches || [
    { label: "Asset Approach",                    ev: d.assetEV,  weight: 0.10 },
    { label: "Market Comparable (AI/SaaS Seed)",  ev: d.marketEV, weight: 0.40 },
    { label: "PWERM (Probability-Weighted Exit)",  ev: d.pwermEV,  weight: 0.50 },
  ];
  const scenarios = d.scenarios || [];

  return (
    <div>
      {/* Header */}
      <div className="pageHeader" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="h1">409A Valuation</h1>
          <p className="subtle">AI-computed fair market value · IRS Section 409A methodology</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>As of {asOf}</span>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
              background: "white", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 16, background: "#fef2f2", borderRadius: 10, color: "#dc2626", fontSize: 13, marginBottom: 20 }}>
          {error} — check that the cap table is seeded.
        </div>
      )}

      {/* KPIs */}
      <div className="kpiRow" style={{ marginBottom: 24 }}>
        <div className="card kpiCard">
          <div className="kpiLabel">FMV per Share</div>
          <div className="kpiValue" style={{ fontSize: 26 }}>
            {fmvPerShare != null ? `$${fmvPerShare.toFixed(4)}` : "Computing..."}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Common stock strike price</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Equity Value</div>
          <div className="kpiValue">{fmt(equityValue)}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Post-DLOM (35%)</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Enterprise Value</div>
          <div className="kpiValue">{fmt(blendedEV)}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Blended (3-approach)</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">SAFE Valuation Cap</div>
          <div className="kpiValue">$15M</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>20% discount · Post-money</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Methodology */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
            Three-Approach Methodology
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12, lineHeight: 1.5 }}>
            IRS §409A requires a reasonable valuation method. This computation applies the standard three-approach blend used by qualified independent appraisers.
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ textAlign: "left", padding: "6px 0", fontWeight: 600, color: "#475569", fontSize: 11 }}>Approach</th>
                <th style={{ textAlign: "right", padding: "6px 0", fontWeight: 600, color: "#475569", fontSize: 11 }}>EV</th>
                <th style={{ textAlign: "right", padding: "6px 0", fontWeight: 600, color: "#475569", fontSize: 11 }}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {approaches.map((a, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                  <td style={{ padding: "10px 0", color: "#374151" }}>{a.label}</td>
                  <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#1e293b" }}>{fmt(a.ev)}</td>
                  <td style={{ padding: "10px 0", textAlign: "right" }}>
                    <span style={{ ...PILL.purple, padding: "2px 7px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                      {typeof a.weight === "number" ? fmtPct(a.weight) : a.weight}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 13 }}>
            <span>Blended EV</span>
            <span>{fmt(blendedEV)}</span>
          </div>
          {totalDebt > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingTop: 8, color: "#dc2626" }}>
              <span>Less: Debt</span>
              <span>({fmt(totalDebt)})</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingTop: 8, color: "#dc2626" }}>
            <span>Less: DLOM (35%)</span>
            <span>({fmt(blendedEV && totalDebt != null ? (blendedEV - totalDebt) * 0.35 : 0)})</span>
          </div>
          <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: 10, marginTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14, color: "#16a34a" }}>
            <span>Equity Value (post-DLOM)</span>
            <span>{fmt(equityValue)}</span>
          </div>
        </div>

        {/* Cap Table Value at FMV */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
            Shareholder Value at FMV
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ textAlign: "left", padding: "6px 0", fontWeight: 600, color: "#475569", fontSize: 11 }}>Shareholder</th>
                <th style={{ textAlign: "right", padding: "6px 0", fontWeight: 600, color: "#475569", fontSize: 11 }}>Shares</th>
                <th style={{ textAlign: "right", padding: "6px 0", fontWeight: 600, color: "#475569", fontSize: 11 }}>%</th>
                <th style={{ textAlign: "right", padding: "6px 0", fontWeight: 600, color: "#475569", fontSize: 11 }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {shareholders.map((sh, i) => {
                const pct = sh.pct ?? (sh.shares / totalShares) * 100;
                const val = equityValue ? (pct / 100) * equityValue : null;
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "10px 0", color: "#374151" }}>{sh.name}</td>
                    <td style={{ padding: "10px 0", textAlign: "right", color: "#64748b" }}>
                      {(sh.shares || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#7c3aed" }}>
                      {pct.toFixed(1)}%
                    </td>
                    <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#1e293b" }}>
                      {val != null ? fmt(val) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 13 }}>
            <span>Total</span>
            <span>{fmt(equityValue)}</span>
          </div>
          {fmvPerShare && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: "#f5f3ff", borderRadius: 8, fontSize: 12, color: "#6d28d9" }}>
              <strong>Option strike price:</strong> ${fmvPerShare.toFixed(4)} per share (use this for any option grants issued today to satisfy §409A safe harbor)
            </div>
          )}
        </div>

      </div>

      {/* Exit Scenarios */}
      {scenarios.length > 0 && (
        <div className="card" style={{ padding: 20, marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
            PWERM Exit Scenarios
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {scenarios.map((sc, i) => (
              <div key={i} style={{ padding: 14, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>{sc.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b" }}>{fmt(sc.ev)}</div>
                <div style={{ marginTop: 6 }}>
                  <span style={{ ...PILL[sc.prob >= 0.25 ? "green" : "amber"], padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                    {Math.round((sc.prob || 0) * 100)}% probability
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOCIII vs Carta comparison */}
      <div className="card" style={{ padding: 20, marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
          Why This Beats Carta's 409A
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { label: "Cost", sociii: "Included in subscription", carta: "$3,000–$5,000 per appraisal" },
            { label: "Speed", sociii: "Real-time, any time", carta: "2–4 weeks turnaround" },
            { label: "Frequency", sociii: "Refresh daily or per grant", carta: "Annual or pre-grant cycle" },
            { label: "Reg CF support", sociii: "Native — wired to raise", carta: "Not supported" },
            { label: "Chat-driven", sociii: "Ask Alex for any scenario", carta: "Manual form entry" },
            { label: "Audit trail", sociii: "Immutable Vault record", carta: "PDF report only" },
          ].map((row, i) => (
            <div key={i} style={{ padding: 12, background: "#fafafa", borderRadius: 8, border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>{row.label}</div>
              <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, marginBottom: 3 }}>✓ {row.sociii}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Carta: {row.carta}</div>
            </div>
          ))}
        </div>
      </div>

      {/* IRS disclaimer */}
      <div style={{ marginTop: 16, padding: "12px 16px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a", fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
        <strong>IRS §409A Note:</strong> This is an AI-generated indicative valuation using standard IRS-recognized methodologies (Asset Approach, Market Comparable, PWERM). For safe harbor protection on option grants, a qualified independent appraiser must review and sign. This computation provides the defensible basis for that review — and for Reg CF offering price disclosure. Refresh before each grant cycle.
      </div>
    </div>
  );
}
