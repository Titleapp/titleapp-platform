/**
 * WeightBalanceCalculator.jsx — Real weight & moment-arm CG calculator.
 *
 * Per Sean's architecture call: aircraft-specific LIMITS (empty weight, arms,
 * max weights, fuel capacity, CG envelope) come from an "Aircraft Type"
 * profile — conceptually its own worker/data source (the AFM/POH), not
 * hardcoded here — this component only takes that profile as a prop and
 * lets the user enter what changes per flight: fuel loaded and station
 * (pax/baggage) weights. See aircraftTypeProfiles.js for the current
 * placeholder shape (no real "Aircraft Type" worker exists yet).
 *
 * If no profile is passed (unmatched tail/type), falls back to manual entry
 * of the same limit fields so the tool still works for any aircraft — but
 * that fallback is clearly labeled as unsourced/operator-entered, never
 * presented with the same confidence as a real cited profile.
 *
 * The arithmetic itself — weight × arm = moment, sum moments ÷ sum weights
 * = CG — is real and exact regardless of aircraft type or data source.
 * CG-envelope pass/fail only evaluates if real envelope breakpoints exist;
 * otherwise it reports the computed CG with an explicit "not checked" note
 * rather than silently passing.
 */

import React, { useState, useMemo, useEffect } from "react";

// lbs per US gallon at typical conditions — real, standard planning values
// (not temperature-corrected; POH fuel-density tables vary slightly by °C).
const FUEL_DENSITY = { "Jet-A": 6.7, "100LL": 6.0, "Mogas": 6.0 };

const inputStyle = { width: "100%", padding: "6px 8px", fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, background: "white", fontFamily: "inherit" };
const roInputStyle = { ...inputStyle, background: "#f1f5f9", color: "#475569" };
const labelStyle = { fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.3, display: "block", marginBottom: 2 };
const smallBtn = { padding: "4px 8px", fontSize: 11, fontWeight: 600, border: "1px solid #cbd5e1", borderRadius: 6, background: "#f8fafc", color: "#334155", cursor: "pointer" };

function n(v) {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : 0;
}

// Linear-interpolate the fwd/aft CG limit at a given weight from envelope breakpoints.
function envelopeLimitAt(breakpoints, weight, key) {
  const pts = (breakpoints || []).filter(b => Number.isFinite(n(b.weight)) && n(b.weight) > 0).sort((a, b) => n(a.weight) - n(b.weight));
  if (pts.length < 2) return null;
  if (weight <= n(pts[0].weight)) return n(pts[0][key]);
  if (weight >= n(pts[pts.length - 1].weight)) return n(pts[pts.length - 1][key]);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (weight >= n(a.weight) && weight <= n(b.weight)) {
      const t = (weight - n(a.weight)) / (n(b.weight) - n(a.weight) || 1);
      return n(a[key]) + t * (n(b[key]) - n(a[key]));
    }
  }
  return null;
}

const EMPTY_MANUAL_PROFILE = {
  emptyWeight: "", emptyArm: "", maxRampWeight: "", maxTakeoffWeight: "", maxZeroFuelWeight: "",
  fuelType: "Jet-A", fuelArm: "", fuelCapacityGal: "", cgEnvelope: [{ weight: "", fwdCG: "", aftCG: "" }, { weight: "", fwdCG: "", aftCG: "" }],
  stations: [{ label: "Pilot + front seat", arm: "" }, { label: "Row 2", arm: "" }, { label: "Baggage", arm: "" }],
};

export default function WeightBalanceCalculator({ aircraftProfile, onResultChange }) {
  const hasRealProfile = !!aircraftProfile;
  // Manual fallback profile — only used/editable when no real Aircraft Type profile matched.
  const [manualProfile, setManualProfile] = useState(EMPTY_MANUAL_PROFILE);
  const profile = hasRealProfile ? aircraftProfile : manualProfile;

  const [fuelGal, setFuelGal] = useState("");
  const [fuelLbs, setFuelLbs] = useState("");
  // Station weights are always user-entered (pax/baggage change per flight) —
  // arms come from the profile (real or manual-fallback), never re-entered here.
  const [stationWeights, setStationWeights] = useState({});

  const density = FUEL_DENSITY[profile.fuelType] || 6.7;
  const stations = profile.stations || [];

  function setFuelFromGal(val) {
    setFuelGal(val);
    setFuelLbs(val === "" ? "" : (n(val) * density).toFixed(1));
  }
  function setFuelFromLbs(val) {
    setFuelLbs(val);
    setFuelGal(val === "" ? "" : (n(val) / density).toFixed(1));
  }
  function fillFullTanks() {
    if (!profile.fuelCapacityGal) return;
    setFuelFromGal(profile.fuelCapacityGal);
  }

  function updateManual(field, val) {
    setManualProfile(p => ({ ...p, [field]: val }));
  }
  function updateManualStation(i, field, val) {
    setManualProfile(p => ({ ...p, stations: p.stations.map((s, idx) => idx === i ? { ...s, [field]: val } : s) }));
  }
  function addManualStation() {
    setManualProfile(p => ({ ...p, stations: [...p.stations, { label: `Station ${p.stations.length + 1}`, arm: "" }] }));
  }
  function removeManualStation(i) {
    setManualProfile(p => ({ ...p, stations: p.stations.filter((_, idx) => idx !== i) }));
  }
  function updateManualEnvelope(i, field, val) {
    setManualProfile(p => ({ ...p, cgEnvelope: p.cgEnvelope.map((b, idx) => idx === i ? { ...b, [field]: val } : b) }));
  }

  const result = useMemo(() => {
    const items = [
      { label: "Empty weight", weight: n(profile.emptyWeight), arm: n(profile.emptyArm) },
      { label: "Fuel", weight: n(fuelLbs), arm: n(profile.fuelArm) },
      ...stations.map((s, i) => ({ label: s.label, weight: n(stationWeights[i]), arm: n(s.arm) })),
    ];
    const totalWeight = items.reduce((sum, it) => sum + it.weight, 0);
    const totalMoment = items.reduce((sum, it) => sum + it.weight * it.arm, 0);
    const cg = totalWeight > 0 ? totalMoment / totalWeight : 0;
    const zeroFuelWeight = totalWeight - n(fuelLbs);

    const envelope = profile.cgEnvelope || [];
    const envelopeConfigured = envelope.filter(b => n(b.weight) > 0).length >= 2;
    const fwdLimit = envelopeConfigured ? envelopeLimitAt(envelope, totalWeight, "fwdCG") : null;
    const aftLimit = envelopeConfigured ? envelopeLimitAt(envelope, totalWeight, "aftCG") : null;
    const cgWithinEnvelope = envelopeConfigured && fwdLimit != null && aftLimit != null
      ? (cg >= Math.min(fwdLimit, aftLimit) && cg <= Math.max(fwdLimit, aftLimit))
      : null;

    const checks = [];
    if (profile.maxRampWeight) checks.push({ label: "Max ramp weight", limit: n(profile.maxRampWeight), value: totalWeight, ok: totalWeight <= n(profile.maxRampWeight) });
    if (profile.maxTakeoffWeight) checks.push({ label: "Max takeoff weight", limit: n(profile.maxTakeoffWeight), value: totalWeight, ok: totalWeight <= n(profile.maxTakeoffWeight) });
    if (profile.maxZeroFuelWeight) checks.push({ label: "Max zero-fuel weight", limit: n(profile.maxZeroFuelWeight), value: zeroFuelWeight, ok: zeroFuelWeight <= n(profile.maxZeroFuelWeight) });

    const allWeightChecksPass = checks.every(c => c.ok);
    const anyLimitsConfigured = checks.length > 0 || envelopeConfigured;
    const withinLimits = anyLimitsConfigured && allWeightChecksPass && (cgWithinEnvelope === null || cgWithinEnvelope === true);

    return { items, totalWeight, totalMoment, cg, zeroFuelWeight, checks, envelopeConfigured, fwdLimit, aftLimit, cgWithinEnvelope, withinLimits, anyLimitsConfigured };
  }, [profile, stations, stationWeights, fuelLbs]);

  useEffect(() => {
    onResultChange?.(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.totalWeight, result.cg, result.withinLimits]);

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#f8fafc", marginTop: 4 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Weight & Balance</div>

      {hasRealProfile ? (
        <div style={{ fontSize: 11, color: "#0369a1", marginBottom: 8, background: "#eff6ff", padding: "6px 8px", borderRadius: 6 }}>
          Using aircraft-type profile: <strong>{profile.label}</strong>. Limits below come from that profile, not manual entry.
          {profile._sourceNote && <div style={{ marginTop: 3, color: "#64748b" }}>{profile._sourceNote}</div>}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "#b45309", marginBottom: 8, background: "#fffbeb", padding: "6px 8px", borderRadius: 6 }}>
          No Aircraft Type profile matched for this tail/type — enter limits manually below from the real POH. Treat this as operator-entered, not a cited source.
        </div>
      )}

      {/* Limits: read-only display when a real profile is matched, editable when falling back to manual entry */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div><label style={labelStyle}>Empty weight (lb)</label><input style={hasRealProfile ? roInputStyle : inputStyle} readOnly={hasRealProfile} value={hasRealProfile ? (profile.emptyWeight ?? "—") : manualProfile.emptyWeight} onChange={e => updateManual("emptyWeight", e.target.value)} placeholder="6320" /></div>
        <div><label style={labelStyle}>Empty wt. arm (in)</label><input style={hasRealProfile ? roInputStyle : inputStyle} readOnly={hasRealProfile} value={hasRealProfile ? (profile.emptyArm ?? "not sourced") : manualProfile.emptyArm} onChange={e => updateManual("emptyArm", e.target.value)} placeholder="185" /></div>
        {hasRealProfile ? (
          <div><label style={labelStyle}>Fuel type</label><input style={roInputStyle} readOnly value={profile.fuelType} /></div>
        ) : (
          <div>
            <label style={labelStyle}>Fuel type</label>
            <select style={inputStyle} value={manualProfile.fuelType} onChange={e => updateManual("fuelType", e.target.value)}>
              {Object.keys(FUEL_DENSITY).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        )}
        <div><label style={labelStyle}>Max ramp wt. (lb)</label><input style={hasRealProfile ? roInputStyle : inputStyle} readOnly={hasRealProfile} value={hasRealProfile ? (profile.maxRampWeight ?? "—") : manualProfile.maxRampWeight} onChange={e => updateManual("maxRampWeight", e.target.value)} placeholder="10495" /></div>
        <div><label style={labelStyle}>Max takeoff wt. (lb)</label><input style={hasRealProfile ? roInputStyle : inputStyle} readOnly={hasRealProfile} value={hasRealProfile ? (profile.maxTakeoffWeight ?? "—") : manualProfile.maxTakeoffWeight} onChange={e => updateManual("maxTakeoffWeight", e.target.value)} /></div>
        <div><label style={labelStyle}>Max zero-fuel wt. (lb)</label><input style={hasRealProfile ? roInputStyle : inputStyle} readOnly={hasRealProfile} value={hasRealProfile ? (profile.maxZeroFuelWeight ?? "—") : manualProfile.maxZeroFuelWeight} onChange={e => updateManual("maxZeroFuelWeight", e.target.value)} placeholder="9039" /></div>
        <div><label style={labelStyle}>Fuel arm (in)</label><input style={hasRealProfile ? roInputStyle : inputStyle} readOnly={hasRealProfile} value={hasRealProfile ? (profile.fuelArm ?? "not sourced") : manualProfile.fuelArm} onChange={e => updateManual("fuelArm", e.target.value)} /></div>
        <div><label style={labelStyle}>Fuel capacity (gal, usable)</label><input style={hasRealProfile ? roInputStyle : inputStyle} readOnly={hasRealProfile} value={hasRealProfile ? (profile.fuelCapacityGal ?? "not sourced") : manualProfile.fuelCapacityGal} onChange={e => updateManual("fuelCapacityGal", e.target.value)} /></div>
      </div>

      {/* Fuel loaded — always user-entered, this is what changes per flight */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Fuel loaded (gal)</label>
          <input style={inputStyle} value={fuelGal} onChange={e => setFuelFromGal(e.target.value)} placeholder="0" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Fuel loaded (lb) — autofills from gal ({density} lb/gal, {profile.fuelType})</label>
          <input style={inputStyle} value={fuelLbs} onChange={e => setFuelFromLbs(e.target.value)} placeholder="0" />
        </div>
        <button type="button" style={smallBtn} onClick={fillFullTanks} disabled={!profile.fuelCapacityGal} title={!profile.fuelCapacityGal ? "No fuel capacity known — enter manually above" : "Fill to capacity"}>Full tanks</button>
      </div>

      {/* Stations — arm from profile (real or manual), weight always user-entered per flight */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>STATIONS — weight loaded this flight (arm from aircraft profile)</div>
      {stations.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
          {hasRealProfile ? (
            <input style={{ ...roInputStyle, flex: 2 }} readOnly value={s.label} />
          ) : (
            <input style={{ ...inputStyle, flex: 2 }} value={s.label} onChange={e => updateManualStation(i, "label", e.target.value)} />
          )}
          <input style={{ ...inputStyle, flex: 1 }} value={stationWeights[i] || ""} onChange={e => setStationWeights(prev => ({ ...prev, [i]: e.target.value }))} placeholder="lb this flight" />
          <input style={{ ...(hasRealProfile ? roInputStyle : inputStyle), flex: 1 }} readOnly={hasRealProfile} value={hasRealProfile ? (s.arm ?? "not sourced") : s.arm} onChange={e => !hasRealProfile && updateManualStation(i, "arm", e.target.value)} placeholder="arm in" />
          {!hasRealProfile && <button type="button" style={{ ...smallBtn, padding: "4px 7px" }} onClick={() => removeManualStation(i)}>×</button>}
        </div>
      ))}
      {!hasRealProfile && <button type="button" style={smallBtn} onClick={addManualStation}>+ Add station</button>}

      {!hasRealProfile && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 11, fontWeight: 700, color: "#64748b", cursor: "pointer" }}>CG envelope (optional — leave blank to skip envelope check)</summary>
          {manualProfile.cgEnvelope.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={b.weight} onChange={e => updateManualEnvelope(i, "weight", e.target.value)} placeholder="weight lb" />
              <input style={{ ...inputStyle, flex: 1 }} value={b.fwdCG} onChange={e => updateManualEnvelope(i, "fwdCG", e.target.value)} placeholder="fwd limit in" />
              <input style={{ ...inputStyle, flex: 1 }} value={b.aftCG} onChange={e => updateManualEnvelope(i, "aftCG", e.target.value)} placeholder="aft limit in" />
            </div>
          ))}
          <button type="button" style={{ ...smallBtn, marginTop: 6 }} onClick={() => setManualProfile(p => ({ ...p, cgEnvelope: [...p.cgEnvelope, { weight: "", fwdCG: "", aftCG: "" }] }))}>+ Add breakpoint</button>
        </details>
      )}

      <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: result.withinLimits ? "#f0fdf4" : "#fef2f2", border: `1px solid ${result.withinLimits ? "#86efac" : "#fca5a5"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
          <span>Total weight: {result.totalWeight.toFixed(0)} lb</span>
          <span>CG: {result.cg.toFixed(1)} in{profile.emptyArm == null && !hasRealProfile ? "" : (profile.emptyArm == null ? " (arms incomplete — figure not meaningful yet)" : "")}</span>
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Zero-fuel weight: {result.zeroFuelWeight.toFixed(0)} lb</div>
        {result.checks.map((c, i) => (
          <div key={i} style={{ fontSize: 11, color: c.ok ? "#16a34a" : "#dc2626", marginTop: 2 }}>
            {c.ok ? "✓" : "✗"} {c.label}: {c.value.toFixed(0)} / {c.limit.toFixed(0)} lb
          </div>
        ))}
        {result.envelopeConfigured ? (
          <div style={{ fontSize: 11, color: result.cgWithinEnvelope ? "#16a34a" : "#dc2626", marginTop: 2 }}>
            {result.cgWithinEnvelope ? "✓" : "✗"} CG within envelope ({Math.min(result.fwdLimit, result.aftLimit).toFixed(1)}–{Math.max(result.fwdLimit, result.aftLimit).toFixed(1)} in at this weight)
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>⚠ No CG envelope available — CG shown but not checked against limits</div>
        )}
        {!result.anyLimitsConfigured && (
          <div style={{ fontSize: 11, color: "#b45309", marginTop: 4, fontWeight: 600 }}>⚠ No real limits configured yet — this is arithmetic only, not a pass/fail safety check.</div>
        )}
      </div>
    </div>
  );
}
