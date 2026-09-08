/**
 * PerformanceCalculator.jsx — Takeoff/landing distance planning estimate.
 *
 * CODEX S52.67 gap #1. Mirrors WeightBalanceCalculator.jsx's pattern: takes
 * a real Aircraft Type profile as a prop (see aircraftTypeProfiles.js), and
 * only computes when that profile has a real, sourced baseline distance —
 * otherwise says plainly that this aircraft isn't covered yet, rather than
 * falling back to a manual/generic baseline (unlike W&B, there's no honest
 * manual fallback here: a pilot typing in "my own" takeoff distance number
 * defeats the point of a calculator meant to check that number).
 *
 * Informational only — NOT wired as a release-flight gate (unlike W&B's
 * `weightBalanceAcknowledged` checkbox) because real coverage is currently
 * one aircraft type, one phase (takeoff only) — gating release on a check
 * that silently can't run for most aircraft would be worse than not gating.
 */

import React, { useState, useMemo } from "react";
import { PERFORMANCE_DISCLAIMER } from "../aviation/aviationDisclaimers";
import { pressureAltitudeFt, densityAltitudeFt, estimateDistance, windComponentAlongRunway } from "./aviationPerformance";

const inputStyle = { width: "100%", padding: "6px 8px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "white", fontFamily: "inherit" };
const labelStyle = { fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 2 };

function n(v) {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : NaN;
}

export default function PerformanceCalculator({ aircraftProfile }) {
  const [phase, setPhase] = useState("takeoff");
  const [fieldElevFt, setFieldElevFt] = useState("");
  const [altimeterInHg, setAltimeterInHg] = useState("29.92");
  const [oatC, setOatC] = useState("");
  const [windDirDeg, setWindDirDeg] = useState("");
  const [windSpeedKt, setWindSpeedKt] = useState("");
  const [runwayHeadingDeg, setRunwayHeadingDeg] = useState("");

  const da = useMemo(() => {
    const pa = pressureAltitudeFt(n(fieldElevFt), n(altimeterInHg));
    if (pa == null) return null;
    return densityAltitudeFt(pa, n(oatC));
  }, [fieldElevFt, altimeterInHg, oatC]);

  const windComponentKt = useMemo(
    () => windComponentAlongRunway(n(windDirDeg), n(windSpeedKt), n(runwayHeadingDeg)),
    [windDirDeg, windSpeedKt, runwayHeadingDeg]
  );

  const result = useMemo(() => {
    if (!aircraftProfile) return { ok: false, reason: "No Aircraft Type profile matched — performance estimate needs a real, sourced aircraft profile (see aircraftTypeProfiles.js), unlike W&B there is no manual fallback here." };
    return estimateDistance({ profile: aircraftProfile, phase, densityAltFt: da, windComponentKt });
  }, [aircraftProfile, phase, da, windComponentKt]);

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#f8fafc", marginTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Takeoff / Landing Performance</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {["takeoff", "landing"].map(p => (
          <button key={p} type="button" onClick={() => setPhase(p)}
            style={{
              padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer",
              border: phase === p ? "1px solid #0369a1" : "1px solid #cbd5e1",
              background: phase === p ? "#eff6ff" : "white", color: phase === p ? "#0369a1" : "#475569",
            }}>
            {p === "takeoff" ? "Takeoff" : "Landing"}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div><label style={labelStyle}>Field elevation (ft)</label><input style={inputStyle} value={fieldElevFt} onChange={e => setFieldElevFt(e.target.value)} placeholder="892" /></div>
        <div><label style={labelStyle}>Altimeter (inHg)</label><input style={inputStyle} value={altimeterInHg} onChange={e => setAltimeterInHg(e.target.value)} placeholder="29.92" /></div>
        <div><label style={labelStyle}>OAT (°C)</label><input style={inputStyle} value={oatC} onChange={e => setOatC(e.target.value)} placeholder="28" /></div>
        <div><label style={labelStyle}>Wind FROM (°)</label><input style={inputStyle} value={windDirDeg} onChange={e => setWindDirDeg(e.target.value)} placeholder="270" /></div>
        <div><label style={labelStyle}>Wind speed (kt)</label><input style={inputStyle} value={windSpeedKt} onChange={e => setWindSpeedKt(e.target.value)} placeholder="12" /></div>
        <div><label style={labelStyle}>Runway heading (°)</label><input style={inputStyle} value={runwayHeadingDeg} onChange={e => setRunwayHeadingDeg(e.target.value)} placeholder="260" /></div>
      </div>

      {da != null && (
        <div style={{ fontSize: 11, color: "#334155", marginBottom: 8 }}>
          Density altitude: <strong>{Math.round(da).toLocaleString()} ft</strong>
          {Number.isFinite(windComponentKt) && windComponentKt !== 0 && (
            <> · {windComponentKt >= 0 ? "Headwind" : "Tailwind"} component: <strong>{Math.abs(Math.round(windComponentKt))} kt</strong></>
          )}
        </div>
      )}

      {result.ok ? (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "#0369a1" }}>
            Baseline (sea level, ISA): <strong>{result.baselineFt.toLocaleString()} ft</strong>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
            {result.estimatedFt.toLocaleString()} ft <span style={{ fontSize: 12, fontWeight: 500, color: "#64748b" }}>estimated {phase} distance</span>
          </div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
            Density-altitude factor ×{result.daFactor.toFixed(2)} · Wind factor ×{result.windFactor.toFixed(2)}
          </div>
          {result.sourceNote && <div style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>{result.sourceNote}</div>}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "#b45309", background: "#fffbeb", padding: "6px 8px", borderRadius: 6, marginBottom: 8 }}>
          {result.reason}
        </div>
      )}

      <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.4 }}>{PERFORMANCE_DISCLAIMER}</div>
    </div>
  );
}
