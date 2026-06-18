// ListingScorecardCard.jsx — S52.47
// Dynamic canvas card for the Listing Readiness worker (real estate). The worker
// emits a |||CANVAS_RENDER|||{type:"card:listing-readiness",payload:{...}}|||END_CANVAS|||
// marker built from the AGENT'S actual property + situation — so this reflects the
// real session, not fixture data. Pure expert-judgment scorecard; no external API.

import React from "react";

const BANDS = {
  GREEN:  { dot: "#16a34a", text: "#166534", bg: "#f0fdf4", border: "#bbf7d0" },
  YELLOW: { dot: "#d97706", text: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  RED:    { dot: "#dc2626", text: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  WHITE:  { dot: "#94a3b8", text: "#475569", bg: "#f8fafc", border: "#e2e8f0" },
};
const band = (b) => BANDS[(b || "WHITE").toUpperCase()] || BANDS.WHITE;
const PRIO = { high: "#dc2626", med: "#d97706", low: "#16a34a" };

export default function ListingScorecardCard({ resolved = {}, context = {}, onDismiss }) {
  const p = context?.payload || resolved?.payload || resolved || {};
  const {
    address = "", overallReadiness = null, verdict = "", band: overallBand = "WHITE",
    categories = [], flags = [], punchList = [], summary = "", nextSteps = "",
  } = p;
  const ob = band(overallBand);

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
      {/* Header */}
      <div style={{ padding: "16px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", letterSpacing: 0.5, textTransform: "uppercase" }}>Listing Readiness</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{address || "Subject property"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {overallReadiness != null && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: ob.text, lineHeight: 1 }}>{overallReadiness}<span style={{ fontSize: 15 }}>%</span></div>
              <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 }}>ready</div>
            </div>
          )}
          {verdict && <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: ob.dot, borderRadius: 999, padding: "5px 12px", whiteSpace: "nowrap" }}>{verdict}</span>}
          {onDismiss && <button onClick={onDismiss} aria-label="Dismiss" style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18 }}>×</button>}
        </div>
      </div>

      <div style={{ padding: "16px 18px" }}>
        {/* Category bars */}
        {categories.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            {categories.map((c, i) => { const cb = band(c.band); return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{c.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cb.text }}>{c.score}%</span>
                </div>
                <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(c.score || 0, 2)}%`, height: "100%", background: cb.dot, borderRadius: 4 }} />
                </div>
                {c.note && <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 3, lineHeight: 1.4 }}>{c.note}</div>}
              </div>
            ); })}
          </div>
        )}

        {/* Flags */}
        {flags.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.35)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Flags</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {flags.map((f, i) => { const fb = band(f.band); return (
                <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: fb.bg, borderLeft: `3px solid ${fb.dot}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: fb.text }}>{f.title}</div>
                  {f.detail && <div style={{ fontSize: 12, color: "#475569", marginTop: 2, lineHeight: 1.4 }}>{f.detail}</div>}
                </div>
              ); })}
            </div>
          </div>
        )}

        {/* Punch list */}
        {punchList.length > 0 && (
          <div style={{ marginBottom: summary || nextSteps ? 18 : 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.35)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Punch list before listing</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {punchList.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#334155" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: PRIO[(t.priority || "med").toLowerCase()] || PRIO.med, flexShrink: 0 }} />
                  <span>{t.item || t}</span>
                  {t.priority && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, color: PRIO[(t.priority || "med").toLowerCase()] || PRIO.med, textTransform: "uppercase" }}>{t.priority}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {(summary || nextSteps) && (
          <div style={{ padding: "12px 14px", borderRadius: 8, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
            {summary && <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5 }}>{summary}</div>}
            {nextSteps && <div style={{ fontSize: 12.5, color: "#7c3aed", fontWeight: 600, marginTop: summary ? 8 : 0, lineHeight: 1.5 }}>Next: {nextSteps}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
