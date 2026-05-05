/**
 * ChartCard.jsx (49.32) — Visual chart renderer for the canvas.
 *
 * One component handles three chart variants discriminated by `payload.chartType`:
 *   - "bar"     → horizontal bar chart of {label, value} series
 *   - "funnel"  → top-to-bottom funnel of {label, value} stages, widths scaled to max
 *   - "heatmap" → grid of {row, column, value} cells, intensity mapped to value
 *
 * The variant is also implied by the canvas type:
 *   card:chart-bar  /  card:chart-funnel  /  card:chart-heatmap
 *
 * Falls back to CanvasFallbackView if the payload has no usable data points.
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";
import CanvasFallbackView from "./CanvasFallbackView";

const ACCENT = "#7c3aed";
const ACCENT_SOFT = "#ede9fe";
const FUNNEL_PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#7c3aed", "#06b6d4", "#ec4899"];

const S = {
  meta: { fontSize: 12, color: "rgba(0,0,0,0.55)", marginBottom: 12, lineHeight: 1.5 },
  // Bar
  barRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  barLabel: { fontSize: 12, fontWeight: 600, color: "#1e293b", width: 120, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  barTrack: { flex: 1, height: 18, background: "#f1f5f9", borderRadius: 4, position: "relative", overflow: "hidden" },
  barFill: (pct, color) => ({ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.4s" }),
  barValue: { fontSize: 11, color: "rgba(0,0,0,0.6)", minWidth: 64, textAlign: "right", fontVariantNumeric: "tabular-nums" },
  // Funnel
  funnelStage: { display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 6 },
  funnelBar: (pct, color) => ({ width: `${pct}%`, minWidth: 80, padding: "10px 14px", background: color, color: "white", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 12, fontWeight: 600 }),
  funnelStageLabel: { fontSize: 11, color: "rgba(0,0,0,0.55)", marginTop: 4, marginBottom: 2 },
  // Heatmap
  hmTable: { width: "100%", borderCollapse: "collapse", fontSize: 11 },
  hmTh: { padding: "6px 8px", color: "rgba(0,0,0,0.5)", fontWeight: 600, textAlign: "center", borderBottom: "1px solid #f1f5f9" },
  hmRowLabel: { padding: "6px 8px", color: "#1e293b", fontWeight: 500, textAlign: "left", whiteSpace: "nowrap" },
  hmCell: (intensity) => ({
    padding: "10px 6px", textAlign: "center", color: intensity > 0.55 ? "#fff" : "#1e293b",
    background: `rgba(124,58,237,${0.06 + intensity * 0.74})`, fontWeight: 600,
    borderRadius: 4,
  }),
  legend: { display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 11, color: "rgba(0,0,0,0.5)" },
  legendBar: { flex: 1, height: 8, borderRadius: 4, background: `linear-gradient(90deg, rgba(124,58,237,0.06), rgba(124,58,237,0.8))` },
};

function fmtValue(v) {
  if (typeof v !== "number") return v ?? "";
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 10_000) return `$${(v / 1_000).toFixed(0)}K`;
  if (Math.abs(v) >= 1_000) return v.toLocaleString();
  return String(v);
}

function BarChart({ data }) {
  const max = Math.max(...data.map(d => Number(d.value) || 0), 1);
  return (
    <>
      {data.map((d, i) => {
        const v = Number(d.value) || 0;
        const pct = (v / max) * 100;
        const color = d.color || ACCENT;
        return (
          <div key={i} style={S.barRow}>
            <div style={S.barLabel} title={d.label}>{d.label}</div>
            <div style={S.barTrack}><div style={S.barFill(pct, color)} /></div>
            <div style={S.barValue}>{fmtValue(d.value)}</div>
          </div>
        );
      })}
    </>
  );
}

function FunnelChart({ data }) {
  const max = Math.max(...data.map(d => Number(d.value) || 0), 1);
  return (
    <>
      {data.map((d, i) => {
        const v = Number(d.value) || 0;
        const pct = Math.max(35, (v / max) * 100); // never narrower than 35% so labels stay readable
        const color = d.color || FUNNEL_PALETTE[i % FUNNEL_PALETTE.length];
        return (
          <div key={i} style={S.funnelStage}>
            <div style={S.funnelStageLabel}>{d.label}{d.subLabel ? ` — ${d.subLabel}` : ""}</div>
            <div style={S.funnelBar(pct, color)}>
              <span>{d.count != null ? `${d.count}` : ""}</span>
              <span>{fmtValue(d.value)}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}

function Heatmap({ data, rows, columns }) {
  // Auto-derive rows/columns if not provided.
  const rowSet = rows || Array.from(new Set(data.map(d => d.row)));
  const colSet = columns || Array.from(new Set(data.map(d => d.column)));
  const max = Math.max(...data.map(d => Number(d.value) || 0), 1);
  const lookup = {};
  for (const d of data) lookup[`${d.row}|${d.column}`] = d.value;

  return (
    <>
      <table style={S.hmTable}>
        <thead>
          <tr>
            <th style={S.hmTh}></th>
            {colSet.map((c, i) => <th key={i} style={S.hmTh}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rowSet.map((r, ri) => (
            <tr key={ri}>
              <td style={S.hmRowLabel}>{r}</td>
              {colSet.map((c, ci) => {
                const v = lookup[`${r}|${c}`];
                const intensity = v != null ? (Number(v) || 0) / max : 0;
                return (
                  <td key={ci} style={S.hmCell(intensity)}>{v != null ? fmtValue(v) : ""}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={S.legend}>
        <span>Low</span>
        <div style={S.legendBar} />
        <span>High</span>
      </div>
    </>
  );
}

export default function ChartCard({ resolved, context, onDismiss }) {
  const payload = context?.payload || {};
  const cardType = context?.type || "";
  const chartType = payload.chartType || (cardType.includes("funnel") ? "funnel" : cardType.includes("heatmap") ? "heatmap" : "bar");
  const title = payload.title || resolved?._title || (chartType === "funnel" ? "Funnel" : chartType === "heatmap" ? "Heatmap" : "Chart");
  const subtitle = payload.subtitle || payload.summary || null;
  const data = payload.data || payload.series || payload.cells || [];
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <CanvasCardShell
      title={title}
      emptyPrompt={resolved?.emptyPrompt || "Ask Alex to chart this for you to see it here."}
      onDismiss={onDismiss}
    >
      {hasData ? (
        <>
          {subtitle && <div style={S.meta}>{subtitle}</div>}
          {chartType === "funnel" && <FunnelChart data={data} />}
          {chartType === "heatmap" && <Heatmap data={data} rows={payload.rows} columns={payload.columns} />}
          {chartType !== "funnel" && chartType !== "heatmap" && <BarChart data={data} />}
        </>
      ) : (
        <CanvasFallbackView payload={payload} />
      )}
    </CanvasCardShell>
  );
}
