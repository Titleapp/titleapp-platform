/**
 * AviationProfileView.jsx — vertical-profile / terrain-avoidance chart.
 * This is SKYE's version of the view ForeFlight calls "Profile" under its
 * FPL panel: a planned-altitude line over a real ground-elevation
 * silhouette, plus a Highest Point / Clearance / First Strike stats panel.
 * Built to be a faithful, well-executed rendition of that specific
 * ForeFlight view in SKYE's own dark-cockpit palette — the differentiation
 * SOCIII is building is integration/governance/wearables, not a reinvented
 * version of this particular chart. Per Sean's explicit direction: don't
 * redesign what already works well.
 *
 * ── What's real vs. simplified (read before trusting a number here) ──
 *
 * Route input is HONEST MANUAL ENTRY, not a live flight-plan object. There
 * is no live route/flight-plan state anywhere in this codebase as of
 * 2026-09-07 — the existing "Flight" tab Navlog table in
 * aviationCanvasData.js is 100% static per-worker demo fixture content, not
 * a wired object this view could subscribe to. So: the pilot types in a
 * short list of ICAO waypoints + a planned cruise altitude here, same as
 * they'd type a route into ForeFlight's own route editor.
 *
 * Waypoint resolution only covers AIRPORTS (via GET /v1/aviation:airport,
 * itself FAA NASR data) — an enroute fix/VOR identifier will fail to
 * resolve. FAA NASR waypoint/navaid lookup BY IDENTIFIER (as opposed to by
 * lat/lon radius, which is all faaData.js currently supports) isn't wired
 * up; airport-to-airport routing is the real, working MVP.
 *
 * Terrain is real public elevation data — Open-Meteo's free, keyless
 * Elevation API (Copernicus GLO-90 DEM, ~90m resolution), proxied through
 * POST /v1/aviation:elevation so the client never calls a third party
 * directly. It is NOT a certified terrain database (see TERRAIN_DISCLAIMER
 * below, carried verbatim).
 *
 * Terrain sampling is along the DIRECT point-to-point route centerline
 * only — there is no lateral corridor scan. ForeFlight's configurable
 * "1nm corridor" (highest terrain within N nm either side of course) is
 * NOT implemented; the settings row below says so instead of showing a
 * corridor-width number that doesn't do anything.
 *
 * The planned-altitude line is a straight-line model (climb at a fixed
 * planning-rule-of-thumb gradient, level cruise, descend at a fixed
 * gradient) — not a performance-modeled climb/descent calculation for any
 * specific aircraft type. That simplification is explicitly acceptable per
 * the brief this view was built against.
 *
 * There is no "actual" GPS-tracked altitude trace overlaid on the planned
 * line — only the planned profile. Wiring real in-flight position onto this
 * chart is a real, separate follow-on, not faked here.
 */
import React, { useState, useMemo, useCallback } from "react";
import { getAuth } from "firebase/auth";
import { TERRAIN_DISCLAIMER } from "../aviation/aviationDisclaimers";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiGet(path) {
  const auth = getAuth();
  const token = auth.currentUser ? await auth.currentUser.getIdToken(false).catch(() => null) : null;
  const url = `${API_BASE}/api?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

async function apiPost(path, payload) {
  const auth = getAuth();
  const token = auth.currentUser ? await auth.currentUser.getIdToken(false).catch(() => null) : null;
  const url = `${API_BASE}/api?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

// ── planning constants — rule-of-thumb defaults, not per-aircraft performance ──
const CLIMB_GRADIENT_FT_PER_NM = 400;   // ~typical GA/light-turboprop enroute climb
const DESCENT_GRADIENT_FT_PER_NM = 300; // ~"3nm per 1000ft" enroute descent planning rule
const MAX_SAMPLE_POINTS = 100;          // matches Open-Meteo's documented per-request cap
const DEFAULT_BUFFER_FT = 1000;

// Free-tier default route — real Hawaii/mainland bases already used
// elsewhere in this suite, chosen here because it crosses real mountainous
// terrain (San Gabriel/San Bernardino ranges) rather than flat/over-water,
// so the chart shows something meaningful the first time it's opened.
const DEFAULT_WAYPOINTS = ["KLAS", "KLAX"];
const DEFAULT_CRUISE_FT = "17000";

function haversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // nm
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Nice round tick step for an axis given its max value and a target tick count.
function niceStep(maxVal, targetTicks, steps) {
  for (const s of steps) {
    if (maxVal / s <= targetTicks) return s;
  }
  return steps[steps.length - 1];
}

function fmtAlt(ft) {
  return `${Math.round(ft).toLocaleString()}'`;
}
function fmtNm(nm) {
  return `${Math.round(nm)}nm`;
}

// Build the piecewise-linear planned-altitude profile (climb / cruise / descend)
// as a small list of {distNm, altFt} vertices, given field elevations at each
// end, a target cruise altitude, and the two planning gradients above. Falls
// back to a triangle (no level cruise segment) when the route is too short
// for both the climb and descent to complete before meeting each other.
//
// Also returns `cruiseWindow` — the [start, end] distance range of the level
// cruise segment, or null when there isn't one (the triangle case). This is
// what the terrain-conflict test below is restricted to; see the comment on
// CONFLICT WINDOW for why.
function buildPlannedProfile({ totalNm, originFt, destFt, cruiseFt }) {
  const climbNm = Math.max(0, (cruiseFt - originFt) / CLIMB_GRADIENT_FT_PER_NM);
  const descentStartNm = totalNm - Math.max(0, (cruiseFt - destFt) / DESCENT_GRADIENT_FT_PER_NM);

  if (climbNm <= descentStartNm) {
    return {
      profile: [
        { distNm: 0, altFt: originFt },
        { distNm: climbNm, altFt: cruiseFt },
        { distNm: descentStartNm, altFt: cruiseFt },
        { distNm: totalNm, altFt: destFt },
      ],
      cruiseWindow: [climbNm, descentStartNm],
    };
  }
  // Short route — climb and descent gradients would cross before reaching
  // cruise. Solve for the apex where the two lines intersect instead.
  // There's no level segment here, so cruiseWindow is null.
  const apexNm =
    (destFt - originFt + DESCENT_GRADIENT_FT_PER_NM * totalNm) /
    (CLIMB_GRADIENT_FT_PER_NM + DESCENT_GRADIENT_FT_PER_NM);
  const clampedApexNm = Math.min(totalNm, Math.max(0, apexNm));
  const apexFt = originFt + CLIMB_GRADIENT_FT_PER_NM * clampedApexNm;
  return {
    profile: [
      { distNm: 0, altFt: originFt },
      { distNm: clampedApexNm, altFt: apexFt },
      { distNm: totalNm, altFt: destFt },
    ],
    cruiseWindow: null,
  };
}

// CONFLICT WINDOW — why the terrain/buffer conflict test (and First Strike)
// only runs across the level cruise segment, not the climb-out or descent:
// this view's planned-altitude line is a straight-line model that meets
// field elevation exactly at distance 0 and at the route's total distance
// (that's just "on the runway"). Sampled terrain right next to an airport is
// necessarily close to that airport's own field elevation too — so
// `terrain + bufferFt >= plannedAlt` is trivially true for the first mile or
// two of every single route (the aircraft hasn't out-climbed the buffer
// margin yet), independent of whether there's any real terrain hazard. That
// is a modeling artifact, not a real safety signal, and showing it as
// "First Strike: 0.2nm" on every route would be actively misleading —
// verified against real data during this build (KLAS→KLAX trivially
// "conflicted" at 0nm and ~2nm on flat desert terrain). Restricting the
// check to the level-cruise window sidesteps that artifact entirely. The
// real cost: obstacle clearance during climb-out and descent — a genuinely
// different, harder problem (FAA obstacle departure procedures, not a
// straight-line planning gradient) — is NOT evaluated here. Said plainly in
// the settings row and disclaimer below rather than silently assumed safe.
function conflictSamples(samples, profile, cruiseWindow, bufferFt) {
  if (!cruiseWindow) return [];
  const [start, end] = cruiseWindow;
  return samples.filter((s) => s.distNm >= start && s.distNm <= end && s.terrainFt + bufferFt >= plannedAltAt(profile, s.distNm));
}

function plannedAltAt(profile, distNm) {
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i], b = profile[i + 1];
    if (distNm >= a.distNm && distNm <= b.distNm) {
      const span = b.distNm - a.distNm;
      const f = span > 0 ? (distNm - a.distNm) / span : 0;
      return a.altFt + (b.altFt - a.altFt) * f;
    }
  }
  return profile[profile.length - 1]?.altFt ?? 0;
}

// ── route input row ──────────────────────────────────────────────────────
function WaypointRow({ value, onChange, onRemove, canRemove }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="ICAO"
        maxLength={4}
        style={{
          width: 64, padding: "5px 7px", fontSize: 12.5, fontFamily: "monospace", fontWeight: 700,
          textAlign: "center", background: "#0c2235", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0",
        }}
      />
      {canRemove && (
        <button
          type="button" onClick={onRemove} title="Remove waypoint" aria-label="Remove waypoint"
          style={{ width: 20, height: 20, padding: 0, border: "1px solid #475569", borderRadius: 5, background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 11, lineHeight: 1 }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function StatTile({ label, value, color, sub }) {
  return (
    <div style={{ padding: "8px 10px", borderBottom: "1px solid #1e293b" }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: color || "#e2e8f0", fontFamily: "monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── main chart ───────────────────────────────────────────────────────────
function ProfileChart({ samples, profile, cruiseWindow, bufferFt, waypointMarkers }) {
  const width = 720, height = 300;
  const marginLeft = 58, marginRight = 14, marginTop = 12, marginBottom = 26;
  const plotW = width - marginLeft - marginRight;
  const plotH = height - marginTop - marginBottom;

  const totalNm = samples[samples.length - 1].distNm;
  const terrainMax = Math.max(...samples.map((s) => s.terrainFt));
  const terrainMin = Math.min(...samples.map((s) => s.terrainFt), 0);
  const cruiseFt = Math.max(...profile.map((p) => p.altFt));
  const altMax = Math.ceil(Math.max(cruiseFt, terrainMax) * 1.12 / 500) * 500;
  const altMin = Math.min(0, Math.floor(terrainMin / 500) * 500);
  const altSpan = Math.max(1, altMax - altMin);

  const x = (nm) => marginLeft + (nm / Math.max(1, totalNm)) * plotW;
  const y = (ft) => marginTop + plotH - ((ft - altMin) / altSpan) * plotH;

  const altStep = niceStep(altMax - altMin, 4, [500, 1000, 2000, 5000, 10000]);
  const altTicks = [];
  for (let v = Math.ceil(altMin / altStep) * altStep; v <= altMax; v += altStep) altTicks.push(v);

  const nmStep = niceStep(totalNm, 5, [10, 25, 50, 100, 250, 500]);
  const nmTicks = [];
  for (let v = 0; v <= totalNm; v += nmStep) nmTicks.push(v);

  const terrainPath =
    `M ${x(0)},${y(altMin)} ` +
    samples.map((s) => `L ${x(s.distNm)},${y(s.terrainFt)}`).join(" ") +
    ` L ${x(totalNm)},${y(altMin)} Z`;

  const plannedPath = profile.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.distNm)},${y(p.altFt)}`).join(" ");

  // Contiguous conflict runs → hatched wedge between terrain+buffer and the
  // planned-altitude line, same visual idea as ForeFlight's magenta overlay.
  // Restricted to the level-cruise window — see the CONFLICT WINDOW comment
  // above buildPlannedProfile for why climb-out/descent are excluded.
  const conflictRuns = [];
  let run = null;
  samples.forEach((s, i) => {
    const inWindow = cruiseWindow && s.distNm >= cruiseWindow[0] && s.distNm <= cruiseWindow[1];
    const conflicted = inWindow && s.terrainFt + bufferFt >= plannedAltAt(profile, s.distNm);
    if (conflicted) {
      if (!run) run = { start: i, end: i };
      else run.end = i;
    } else if (run) {
      conflictRuns.push(run);
      run = null;
    }
  });
  if (run) conflictRuns.push(run);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block", background: "#0f172a", borderRadius: 8 }}>
      <defs>
        <pattern id="terrainConflictHatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="rgba(232,121,249,0.14)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#e879f9" strokeWidth="2" />
        </pattern>
      </defs>

      {/* gridlines + altitude axis */}
      {altTicks.map((v) => (
        <g key={`alt-${v}`}>
          <line x1={marginLeft} x2={width - marginRight} y1={y(v)} y2={y(v)} stroke="#1e293b" strokeWidth="1" />
          <text x={marginLeft - 6} y={y(v) + 3} textAnchor="end" fontSize="9.5" fill="#64748b" fontFamily="monospace">{fmtAlt(v)}</text>
        </g>
      ))}
      {/* distance axis */}
      {nmTicks.map((v) => (
        <g key={`nm-${v}`}>
          <line x1={x(v)} x2={x(v)} y1={marginTop} y2={height - marginBottom} stroke="#1e293b" strokeWidth="1" />
          <text x={x(v)} y={height - marginBottom + 13} textAnchor="middle" fontSize="9.5" fill="#64748b" fontFamily="monospace">{fmtNm(v)}</text>
        </g>
      ))}

      {/* terrain fill */}
      <path d={terrainPath} fill="#166534" fillOpacity="0.85" stroke="#22c55e" strokeWidth="1" />

      {/* conflict corridor hatch */}
      {conflictRuns.map((r, i) => {
        const seg = samples.slice(r.start, r.end + 1);
        const top = seg.map((s) => `L ${x(s.distNm)},${y(plannedAltAt(profile, s.distNm))}`).join(" ");
        const bottom = seg.slice().reverse().map((s) => `L ${x(s.distNm)},${y(s.terrainFt)}`).join(" ");
        const d = `M ${x(seg[0].distNm)},${y(plannedAltAt(profile, seg[0].distNm))} ${top} ${bottom} Z`;
        return <path key={i} d={d} fill="url(#terrainConflictHatch)" stroke="#e879f9" strokeWidth="1" strokeOpacity="0.7" />;
      })}

      {/* planned altitude line */}
      <path d={plannedPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
      {profile.map((p, i) => (
        <circle key={i} cx={x(p.distNm)} cy={y(p.altFt)} r="3" fill="#38bdf8" />
      ))}

      {/* waypoint identifiers along the top */}
      {waypointMarkers.map((w, i) => (
        <g key={i}>
          <line x1={x(w.distNm)} x2={x(w.distNm)} y1={marginTop} y2={height - marginBottom} stroke="#475569" strokeDasharray="2 3" strokeWidth="1" />
          <text x={x(w.distNm)} y={marginTop + 10} textAnchor="middle" fontSize="10" fontWeight="700" fill="#93c5fd" fontFamily="monospace">{w.icao}</text>
        </g>
      ))}
    </svg>
  );
}

// ── panel body (shared by both mount points) ────────────────────────────
function ProfilePanelBody() {
  const [waypoints, setWaypoints] = useState(DEFAULT_WAYPOINTS);
  const [cruiseFtStr, setCruiseFtStr] = useState(DEFAULT_CRUISE_FT);
  const [bufferFtStr, setBufferFtStr] = useState(String(DEFAULT_BUFFER_FT));
  const [state, setState] = useState({ status: "idle", error: null, samples: null, profile: null, waypointMarkers: null, resolved: null });

  const bufferFt = Number(bufferFtStr) || 0;

  const setWaypoint = (i, v) => setWaypoints((ws) => ws.map((w, idx) => (idx === i ? v : w)));
  const removeWaypoint = (i) => setWaypoints((ws) => ws.filter((_, idx) => idx !== i));
  const addWaypoint = () => setWaypoints((ws) => [...ws, ""]);

  const build = useCallback(async () => {
    const idents = waypoints.map((w) => w.trim().toUpperCase()).filter(Boolean);
    const cruiseFt = Number(cruiseFtStr);
    if (idents.length < 2) {
      setState({ status: "error", error: "Enter at least a departure and destination ICAO.", samples: null, profile: null, waypointMarkers: null, resolved: null });
      return;
    }
    if (!Number.isFinite(cruiseFt) || cruiseFt <= 0) {
      setState({ status: "error", error: "Enter a valid planned cruise altitude (ft).", samples: null, profile: null, waypointMarkers: null, resolved: null });
      return;
    }
    setState((s) => ({ ...s, status: "loading", error: null }));
    try {
      const resolved = await Promise.all(
        idents.map(async (icao) => {
          const r = await apiGet(`/v1/aviation:airport?icao=${encodeURIComponent(icao)}`);
          return { icao, lat: r.lat, lon: r.lon, elevationFt: r.elevationFt ?? 0 };
        })
      );

      // Total route distance, then one sample per ~1nm (capped to the
      // Open-Meteo per-request limit), distributed across legs by length so
      // no leg gets zero points.
      const legDistances = [];
      for (let i = 0; i < resolved.length - 1; i++) {
        legDistances.push(haversineNm(resolved[i].lat, resolved[i].lon, resolved[i + 1].lat, resolved[i + 1].lon));
      }
      const totalNm = legDistances.reduce((a, b) => a + b, 0);
      if (!(totalNm > 0)) throw new Error("Route has zero distance — check waypoints.");
      const targetPoints = Math.min(MAX_SAMPLE_POINTS, Math.max(20, Math.round(totalNm)));

      const points = []; // [lat, lon]
      const dists = []; // cumulative nm at each point
      let cumBase = 0;
      legDistances.forEach((legNm, i) => {
        const legPoints = Math.max(2, Math.round((legNm / totalNm) * targetPoints));
        const a = resolved[i], b = resolved[i + 1];
        for (let k = 0; k < legPoints; k++) {
          // Skip the very first point of every leg after the first — it's
          // the same point as the previous leg's last point.
          if (i > 0 && k === 0) continue;
          const f = k / (legPoints - 1);
          points.push([a.lat + (b.lat - a.lat) * f, a.lon + (b.lon - a.lon) * f]);
          dists.push(cumBase + legNm * f);
        }
        cumBase += legNm;
      });

      const elev = await apiPost("/v1/aviation:elevation", { points });
      const samples = points.map((_, i) => ({ distNm: dists[i], terrainFt: elev.elevationsFt[i] }));

      const { profile, cruiseWindow } = buildPlannedProfile({
        totalNm,
        originFt: resolved[0].elevationFt,
        destFt: resolved[resolved.length - 1].elevationFt,
        cruiseFt,
      });

      const waypointMarkers = [];
      let acc = 0;
      resolved.forEach((r, i) => {
        waypointMarkers.push({ icao: r.icao, distNm: acc });
        if (i < legDistances.length) acc += legDistances[i];
      });

      setState({ status: "done", error: null, samples, profile, cruiseWindow, waypointMarkers, resolved, totalNm, cruiseFt });
    } catch (e) {
      setState({ status: "error", error: e.message || "Failed to build profile.", samples: null, profile: null, cruiseWindow: null, waypointMarkers: null, resolved: null });
    }
  }, [waypoints, cruiseFtStr]);

  const stats = useMemo(() => {
    if (state.status !== "done") return null;
    const highest = state.samples.reduce((m, s) => (s.terrainFt > m.terrainFt ? s : m), state.samples[0]);
    const clearanceFt = state.cruiseFt - highest.terrainFt;
    const conflicted = conflictSamples(state.samples, state.profile, state.cruiseWindow, bufferFt);
    const firstStrikeNm = conflicted.length ? conflicted[0].distNm : null;
    return { highestFt: highest.terrainFt, clearanceFt, firstStrikeNm, hasCruiseWindow: !!state.cruiseWindow };
  }, [state, bufferFt]);

  const fieldStyle = { width: "100%", padding: "6px 8px", fontSize: 12, background: "#0c2235", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0", fontFamily: "monospace" };
  const labelStyle = { fontSize: 9.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 3 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Route entry — honest manual entry, not a live flight-plan object */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12, padding: "10px 12px", background: "#161b22", border: "1px solid #1e293b", borderRadius: 8 }}>
        <div>
          <span style={labelStyle}>Route (ICAO waypoints)</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {waypoints.map((w, i) => (
              <React.Fragment key={i}>
                <WaypointRow value={w} onChange={(v) => setWaypoint(i, v)} onRemove={() => removeWaypoint(i)} canRemove={waypoints.length > 2} />
                {i < waypoints.length - 1 && <span style={{ color: "#475569", fontSize: 12 }}>→</span>}
              </React.Fragment>
            ))}
            <button type="button" onClick={addWaypoint} title="Add waypoint"
              style={{ padding: "5px 9px", fontSize: 11, fontWeight: 700, border: "1px solid #334155", borderRadius: 6, background: "transparent", color: "#94a3b8", cursor: "pointer" }}>
              + Waypoint
            </button>
          </div>
        </div>
        <div style={{ width: 110 }}>
          <span style={labelStyle}>Cruise Alt (ft)</span>
          <input value={cruiseFtStr} onChange={(e) => setCruiseFtStr(e.target.value.replace(/[^0-9]/g, ""))} style={fieldStyle} />
        </div>
        <div style={{ width: 100 }}>
          <span style={labelStyle}>Buffer (ft)</span>
          <input value={bufferFtStr} onChange={(e) => setBufferFtStr(e.target.value.replace(/[^0-9]/g, ""))} style={fieldStyle} />
        </div>
        <button
          type="button" onClick={build} disabled={state.status === "loading"}
          style={{ padding: "8px 16px", fontSize: 12.5, fontWeight: 700, color: "white", background: "linear-gradient(135deg, #0284c7, #0369a1)", border: "none", borderRadius: 8, cursor: state.status === "loading" ? "default" : "pointer", opacity: state.status === "loading" ? 0.7 : 1 }}
        >
          {state.status === "loading" ? "Sampling terrain…" : "Build Profile"}
        </button>
      </div>

      {/* Settings row — mirrors ForeFlight's gear/corridor row, but honest
          about what's actually implemented: only the vertical buffer does
          anything today. */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "#64748b", padding: "0 2px", flexWrap: "wrap" }}>
        <span aria-hidden>⚙</span>
        <span>Corridor: centerline only — lateral off-course scan not implemented</span>
        <span style={{ color: "#334155" }}>·</span>
        <span>Buffer: {bufferFt.toLocaleString()}'</span>
        <span style={{ color: "#334155" }}>·</span>
        <span>Conflict check: level cruise segment only — climb-out/descent not evaluated</span>
      </div>

      {state.status === "error" && (
        <div style={{ padding: 10, fontSize: 12.5, color: "#fca5a5", background: "rgba(127,29,29,0.3)", border: "1px solid #7f1d1d", borderRadius: 8 }}>
          {state.error}
        </div>
      )}

      {state.status === "done" && stats && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 480px", minWidth: 280 }}>
            <ProfileChart samples={state.samples} profile={state.profile} cruiseWindow={state.cruiseWindow} bufferFt={bufferFt} waypointMarkers={state.waypointMarkers} />
          </div>
          <div style={{ flex: "0 0 190px", background: "#161b22", border: "1px solid #1e293b", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#94a3b8", background: "#0c2235", borderBottom: "1px solid #1e293b", textTransform: "uppercase", letterSpacing: 0.5 }}>Route</div>
            <StatTile label="Highest Point" value={fmtAlt(stats.highestFt)} sub="MSL, along direct route" />
            <StatTile
              label="Clearance"
              value={fmtAlt(stats.clearanceFt)}
              color={stats.clearanceFt < 0 ? "#f87171" : stats.clearanceFt < bufferFt ? "#facc15" : "#4ade80"}
              sub="Cruise alt − highest point"
            />
            <StatTile
              label="First Strike"
              value={!stats.hasCruiseWindow ? "N/A" : stats.firstStrikeNm != null ? fmtNm(stats.firstStrikeNm) : "None"}
              color={!stats.hasCruiseWindow ? "#94a3b8" : stats.firstStrikeNm != null ? "#f59e0b" : "#4ade80"}
              sub={
                !stats.hasCruiseWindow
                  ? "Route too short for a level cruise segment — not evaluated"
                  : stats.firstStrikeNm != null
                  ? "Cruise-segment terrain+buffer ≥ planned alt"
                  : "No buffer conflict during level cruise"
              }
            />
          </div>
        </div>
      )}

      {state.status === "idle" && (
        <div style={{ padding: 24, textAlign: "center", color: "#475569", fontSize: 12.5 }}>
          Enter a route and cruise altitude, then Build Profile.
        </div>
      )}

      <div style={{ padding: "8px 10px", borderRadius: 6, background: "#3f2d0f", border: "1px solid #f59e0b", fontSize: 10.5, color: "#fde68a", lineHeight: 1.4 }}>
        {TERRAIN_DISCLAIMER} Terrain: Open-Meteo public elevation data (Copernicus GLO-90 DEM, ~90m resolution) sampled along the direct route only — not a certified terrain database, and not a lateral corridor scan. Planned altitude is a straight-line climb/cruise/descend model, not a performance calculation for a specific aircraft. PIC remains responsible for published minimums, charts, and terrain avoidance.
      </div>
    </div>
  );
}

// ── mount point: button + modal, same pattern as ScratchPad ────────────
export default function AviationProfileView() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Terrain Profile — vertical profile & terrain-avoidance chart"
        aria-label="Open Terrain Profile"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", fontSize: 12.5, fontWeight: 700,
          borderRadius: 8, border: "1.5px solid #cbd5e1", background: "#fff",
          color: "#0f172a", cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        <span aria-hidden="true">🏔</span> Profile
      </button>

      {open && (
        <div
          role="dialog" aria-modal="true" aria-label="Terrain Profile"
          style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{ width: "min(1040px, 98vw)", maxHeight: "94vh", overflowY: "auto", background: "#0d1117", borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.5)", border: "1px solid #1e293b" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1e293b" }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>Terrain Profile</span>
                <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>Vertical profile & terrain-avoidance — planning aid, not TAWS</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close Terrain Profile"
                style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #334155", background: "#161b22", color: "#e2e8f0", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>
                ✕
              </button>
            </div>
            <div style={{ padding: 14 }}>
              <ProfilePanelBody />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
