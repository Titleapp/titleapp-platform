/**
 * AviationWeatherCard.jsx — Live METAR/TAF weather briefing canvas card
 * Signal: card:aviation-weather
 * Payload: { icaos: string[], metars: [{ icao, flightCategory, windDir, windSpeedKt, windGustKt, visibilitySm, altimeterInHg, raw, observed }] }
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";

const CATEGORY_STYLE = {
  VFR:  { bg: "#dcfce7", text: "#166534", label: "VFR" },
  MVFR: { bg: "#dbeafe", text: "#1e40af", label: "MVFR" },
  IFR:  { bg: "#fef2f2", text: "#dc2626", label: "IFR" },
  LIFR: { bg: "#fdf4ff", text: "#9333ea", label: "LIFR" },
};

const S = {
  station: {
    background: "#0f172a", color: "#f8fafc", borderRadius: 10,
    padding: "12px 14px", marginBottom: 10,
  },
  stationHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8,
  },
  icao: { fontSize: 20, fontWeight: 700, fontFamily: "ui-monospace, SFMono-Regular, monospace" },
  observed: { fontSize: 11, color: "#94a3b8" },
  badge: { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 },
  metricsRow: {
    display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8,
  },
  metric: { display: "flex", flexDirection: "column", gap: 2 },
  metricLabel: { fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: "#94a3b8", textTransform: "uppercase" },
  metricValue: { fontSize: 15, fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular, monospace" },
  raw: {
    fontSize: 10, color: "#64748b", fontFamily: "ui-monospace, SFMono-Regular, monospace",
    background: "#1e293b", borderRadius: 6, padding: "6px 8px", wordBreak: "break-all",
  },
  nodata: { fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "20px 0" },
};

function categoryStyle(cat) {
  return CATEGORY_STYLE[cat?.toUpperCase()] || CATEGORY_STYLE.VFR;
}

function windStr(m) {
  if (m.windDir == null && m.windSpeedKt == null) return "—";
  const dir = m.windDir != null ? String(m.windDir).padStart(3, "0") : "VRB";
  const spd = m.windSpeedKt ?? "?";
  const gust = m.windGustKt ? `G${m.windGustKt}` : "";
  return `${dir}°/${spd}${gust}kt`;
}

export default function AviationWeatherCard({ resolved: _resolved, context, onDismiss }) {
  const payload = context?.payload;
  const metars = payload?.metars || [];

  return (
    <CanvasCardShell
      title={payload?.title || "Weather Briefing"}
      emptyPrompt="Ask about weather at a departure or destination airport."
      onDismiss={onDismiss}
    >
      {metars.length === 0 && (
        <div style={S.nodata}>No METAR data — ask about weather at a specific airport.</div>
      )}
      {metars.map((m, i) => {
        const cs = categoryStyle(m.flightCategory);
        return (
          <div key={i} style={S.station}>
            <div style={S.stationHeader}>
              <span style={S.icao}>{m.icao || "????"}  </span>
              {m.flightCategory && (
                <span style={{ ...S.badge, background: cs.bg, color: cs.text }}>{cs.label}</span>
              )}
            </div>
            {m.observed && <div style={S.observed}>Observed: {m.observed}</div>}
            <div style={S.metricsRow}>
              <div style={S.metric}>
                <div style={S.metricLabel}>Wind</div>
                <div style={S.metricValue}>{windStr(m)}</div>
              </div>
              <div style={S.metric}>
                <div style={S.metricLabel}>Vis</div>
                <div style={S.metricValue}>{m.visibilitySm != null ? `${m.visibilitySm}SM` : "—"}</div>
              </div>
              <div style={S.metric}>
                <div style={S.metricLabel}>Altimeter</div>
                <div style={S.metricValue}>{m.altimeterInHg != null ? `${m.altimeterInHg}"` : "—"}</div>
              </div>
            </div>
            {m.raw && <div style={S.raw}>{m.raw}</div>}
          </div>
        );
      })}
    </CanvasCardShell>
  );
}
