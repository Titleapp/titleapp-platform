/**
 * AviationMap.jsx — Interactive aviation map with live FAA data overlays.
 * Dark Matter tiles · FAA sectional icons · airplane traffic icons · SIGMET/AIRMET
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, WMSTileLayer, CircleMarker, Polygon, Polyline, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// Side-effect only — attaches L.ImageOverlay.Rotated / L.imageOverlay.rotated
// onto the global `L` that leaflet's own UMD build assigns to `window.L` as
// it initializes (verified in leaflet-src.js: `window.L = exports` runs
// unconditionally, regardless of which UMD branch — CJS/AMD/global — Vite's
// bundler takes). Must load after the "leaflet" import above.
import "leaflet-imageoverlay-rotated";
import { getAuth } from "firebase/auth";
import ChartCalibrationPanel from "./ChartCalibrationPanel";

// Fix Leaflet default icon broken by Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiGet(path) {
  const auth = getAuth();
  const token = auth.currentUser ? await auth.currentUser.getIdToken(false).catch(() => null) : null;
  const url = `${API_BASE}/api?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// Flight category → color
const CAT_COLOR = { VFR: "#22c55e", MVFR: "#3b82f6", IFR: "#ef4444", LIFR: "#a855f7" };
const CAT_LABEL = { VFR: "VFR", MVFR: "Marginal", IFR: "IFR", LIFR: "Low IFR" };

// Airspace class → style (brighter on dark background)
const AIRSPACE_STYLE = {
  B: { color: "#60a5fa", fill: "#60a5fa", fillOpacity: 0.10, weight: 2 },
  C: { color: "#e879f9", fill: "#e879f9", fillOpacity: 0.08, weight: 1.5 },
  D: { color: "#818cf8", fill: "#818cf8", fillOpacity: 0.07, weight: 1.5, dashArray: "6 4" },
  E: { color: "#94a3b8", fill: "#94a3b8", fillOpacity: 0.04, weight: 0.8 },
};

// GeoJSON ring → Leaflet [[lat,lon]]
function geoRingToLeaflet(ring) {
  if (!Array.isArray(ring)) return [];
  return ring.map(([lon, lat]) => [lat, lon]).filter(([lat, lon]) => lat != null && lon != null);
}

function geoPolygonToLeaflet(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) return null;
  if (geometry.type === "Polygon") return geometry.coordinates.map(geoRingToLeaflet);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flatMap(p => p.map(geoRingToLeaflet));
  return null;
}

// ── FAA Sectional SVG icon factories ─────────────────────────────────────────

// Public airport: blue open circle with 4 tick marks (FAA VFR sectional style)
// Private airport: magenta filled circle
// Military: blue circle with star
function makeAirportIcon(airport) {
  const isPrivate = airport.privateUse || (airport.use || "").includes("PR");
  const isMilitary = (airport.use || "").includes("MIL");
  const color = isPrivate ? "#e879f9" : isMilitary ? "#60a5fa" : "#60a5fa";
  const size = 20;

  let svgBody;
  if (isPrivate) {
    svgBody = `<circle cx="0" cy="0" r="5" stroke="${color}" stroke-width="1.5" fill="${color}" fill-opacity="0.3"/>`;
  } else {
    svgBody = `
      <circle cx="0" cy="0" r="5" stroke="${color}" stroke-width="1.5" fill="none"/>
      <line x1="0" y1="-5" x2="0" y2="-8.5" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="0" y1="5" x2="0" y2="8.5" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="-5" y1="0" x2="-8.5" y2="0" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="5" y1="0" x2="8.5" y2="0" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
    `;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-10 -10 20 20">${svgBody}</svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

// VOR: hexagonal compass rose (FAA IFR enroute chart style)
function makeVorIcon() {
  const size = 22;
  const pts = [0, 60, 120, 180, 240, 300].map(deg => {
    const r = (deg - 90) * Math.PI / 180;
    return `${(Math.cos(r) * 8).toFixed(1)},${(Math.sin(r) * 8).toFixed(1)}`;
  }).join(" ");
  const spokes = [0, 60, 120, 180, 240, 300].map(deg => {
    const r = (deg - 90) * Math.PI / 180;
    const x1 = (Math.cos(r) * 3).toFixed(1), y1 = (Math.sin(r) * 3).toFixed(1);
    const x2 = (Math.cos(r) * 8).toFixed(1), y2 = (Math.sin(r) * 8).toFixed(1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#60a5fa" stroke-width="1"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-11 -11 22 22">
    <polygon points="${pts}" fill="none" stroke="#60a5fa" stroke-width="1.5"/>
    ${spokes}
    <circle cx="0" cy="0" r="3" stroke="#60a5fa" stroke-width="1" fill="#1e3a5f"/>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

// NDB: dot in double circle
function makeNdbIcon() {
  const size = 16;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-8 -8 16 16">
    <circle cx="0" cy="0" r="7" fill="none" stroke="#a78bfa" stroke-width="1"/>
    <circle cx="0" cy="0" r="4" fill="none" stroke="#a78bfa" stroke-width="1"/>
    <circle cx="0" cy="0" r="1.5" fill="#a78bfa"/>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

// Fix/RNAV waypoint: open cyan triangle
function makeFixIcon() {
  const size = 14;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-7 -7 14 14">
    <polygon points="0,-6 5.2,3 -5.2,3" fill="none" stroke="#22d3ee" stroke-width="1.5"/>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

// PIREP: green speech-bubble dot, red for urgent (UUA) reports.
function makePirepIcon(urgent) {
  const size = 16;
  const color = urgent ? "#ef4444" : "#34d399";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-8 -8 16 16">
    <circle cx="0" cy="0" r="6" fill="${color}" fill-opacity="0.85" stroke="#0f172a" stroke-width="1"/>
    <text x="0" y="3" text-anchor="middle" font-size="8" font-weight="700" fill="#0f172a">${urgent ? "!" : "P"}</text>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

// Aircraft traffic: top-down airplane SVG rotated by heading.
// fleet=true renders in gold with a halo ring so owned aircraft stand out from general ADS-B traffic.
function makeAircraftIcon(heading, emergency, fleet) {
  const size = fleet ? 28 : 22;
  const h = heading != null ? heading : 0;
  const bodyColor = emergency ? "#fca5a5" : fleet ? "#fbbf24" : "#f1f5f9";
  const strokeColor = emergency ? "#dc2626" : fleet ? "#92400e" : "#1e293b";
  const haloRing = fleet
    ? `<circle cx="0" cy="0" r="10" fill="none" stroke="#fbbf24" stroke-width="1" stroke-dasharray="3 2" opacity="0.7"/>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-14 -14 28 28"
    style="transform:rotate(${h}deg);display:block;">
    ${haloRing}
    <path d="M0,-9 C0.5,-8 1.5,-5 1.5,-2 L7.5,2 L7.5,4 L1.5,2 L1.5,6.5 L3.5,7.5 L3.5,9 L0,8 L-3.5,9 L-3.5,7.5 L-1.5,6.5 L-1.5,2 L-7.5,4 L-7.5,2 L-1.5,-2 C-1.5,-5 -0.5,-8 0,-9 Z"
      fill="${bodyColor}" stroke="${strokeColor}" stroke-width="0.7"/>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

// ── RecenterMap helper ────────────────────────────────────────────────────────
function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
}

// ── Georeferenced chart overlay (imperative Leaflet layer) ───────────────────
// L.ImageOverlay.Rotated isn't a react-leaflet component, so it's added/removed
// directly on the underlying map instance via useMap() — same imperative
// pattern DrawLayer below uses for useMapEvents.
function RotatedImageOverlayLayer({ imageUrl, topLeft, topRight, bottomLeft, opacity = 0.75 }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!imageUrl || !topLeft || !topRight || !bottomLeft) return undefined;
    const layer = L.imageOverlay.rotated(
      imageUrl,
      L.latLng(topLeft[0], topLeft[1]),
      L.latLng(topRight[0], topRight[1]),
      L.latLng(bottomLeft[0], bottomLeft[1]),
      { opacity, interactive: false }
    );
    layer.addTo(map);
    layerRef.current = layer;
    return () => { map.removeLayer(layer); layerRef.current = null; };
  }, [map, imageUrl, topLeft && topLeft[0], topLeft && topLeft[1], topRight && topRight[0], topRight && topRight[1], bottomLeft && bottomLeft[0], bottomLeft && bottomLeft[1], opacity]);

  return null;
}

// ── Freehand chart annotation ─────────────────────────────────────────────────
// Geo-referenced ink, ForeFlight-style — strokes are lat/lon points (not
// screen pixels), so they stay pinned to the chart through pan/zoom, same as
// the SIGMET/AIRMET polygons below. In-memory only for now: whether markup
// should persist (save with a route, share with dispatch) is an open
// question, not assumed here.
function DrawLayer({ active, onStrokeComplete }) {
  const map = useMap();
  const drawingRef = useRef(false);
  const pointsRef = useRef([]);
  const [livePoints, setLivePoints] = useState(null);

  useEffect(() => {
    map.dragging[active ? "disable" : "enable"]();
    if (!active) { drawingRef.current = false; pointsRef.current = []; setLivePoints(null); }
  }, [active, map]);

  useMapEvents({
    mousedown(e) {
      if (!active) return;
      drawingRef.current = true;
      pointsRef.current = [[e.latlng.lat, e.latlng.lng]];
      setLivePoints([...pointsRef.current]);
    },
    mousemove(e) {
      if (!active || !drawingRef.current) return;
      pointsRef.current.push([e.latlng.lat, e.latlng.lng]);
      setLivePoints([...pointsRef.current]);
    },
    mouseup() {
      if (!active || !drawingRef.current) return;
      drawingRef.current = false;
      if (pointsRef.current.length > 1) onStrokeComplete(pointsRef.current);
      pointsRef.current = [];
      setLivePoints(null);
    },
  });

  if (!livePoints || livePoints.length < 2) return null;
  return <Polyline positions={livePoints} pathOptions={{ color: "#facc15", weight: 3, opacity: 0.9 }} />;
}

// ── Layer toggle button ───────────────────────────────────────────────────────
function LayerToggle({ label, enabled, loading, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        fontSize: 11,
        fontWeight: 600,
        border: `1.5px solid ${enabled ? (color || "#0284c7") : "#475569"}`,
        borderRadius: 4,
        background: enabled ? (color ? `${color}28` : "#0c2235") : "rgba(15,23,42,0.85)",
        color: enabled ? (color || "#60a5fa") : "#94a3b8",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 4,
        whiteSpace: "nowrap",
        transition: "all 0.15s",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color || "#60a5fa", animation: "pulse 1s infinite" }} />}
      {label}
    </button>
  );
}

// ── Compact icon-only toggle (ForeFlight-style vertical rail) ────────────────
// Same on/off semantics as LayerToggle, but a fixed-size icon button with a
// native title-attribute tooltip instead of a text label — the layout a
// touch-sized phone/iPad map screen needs instead of wrapping label pills.
function IconToggle({ icon, title, enabled, loading, onClick, color }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 34, height: 34, padding: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1.5px solid ${enabled ? (color || "#0284c7") : "#334155"}`,
        borderRadius: 8,
        background: enabled ? (color ? `${color}28` : "#0c2235") : "rgba(15,23,42,0.85)",
        color: enabled ? (color || "#60a5fa") : "#94a3b8",
        cursor: "pointer",
        fontSize: 15,
        lineHeight: 1,
        position: "relative",
        opacity: loading ? 0.7 : 1,
        flexShrink: 0,
      }}
    >
      {icon}
      {loading && <span style={{ position: "absolute", top: 3, right: 3, width: 5, height: 5, borderRadius: "50%", background: color || "#60a5fa", animation: "pulse 1s infinite" }} />}
    </button>
  );
}

// Hazard-type filters shared by the SIGMET (has real polygon coords) and
// AIRMET (text/region only — the AWC airmet endpoint carries no geometry, so
// these render as a list, not shapes on the map) feeds. Turb Hi/Lo is an
// altitude-threshold split at FL180 (Class A floor) applied to AIRMET Tango's
// base/top fields — a reasonable approximation, not a verified match to
// ForeFlight's own internal Turb Hi/Lo product boundary.
const HAZARD_FILTERS = {
  ts:     { label: "TS / Convective", icon: "⛈", color: "#f87171", test: h => h.source === "sigmet" && h.hazard === "CONVECTIVE" },
  ice:    { label: "Icing",           icon: "❄", color: "#7dd3fc", test: h => h.hazard === "ICE" },
  turbHi: { label: "Turb — High",     icon: "〰︎ᴴ", color: "#fbbf24", test: h => h.hazard === "TURB" && (h.base == null || h.base >= 180) },
  turbLo: { label: "Turb — Low",      icon: "〰︎ᴸ", color: "#fbbf24", test: h => h.hazard === "TURB" && h.base != null && h.base < 180 },
  ifr:    { label: "IFR",             icon: "☁", color: "#c084fc", test: h => h.hazard === "IFR" },
};

// ── Main component ────────────────────────────────────────────────────────────
export default function AviationMap({
  center = [20.5, -157.0],
  zoom = 7,
  height = 500,
  icaos = ["PHOG", "PHNL", "PHKO", "PHTO", "PHNY", "PHJH"],
  compact = false,
  fleetTails = [],   // e.g. ["N701AA","N702AA","N703AA"] — rendered gold with halo
}) {
  const fleetSet = new Set((fleetTails || []).map(t => t.toUpperCase()));
  const [weather, setWeather] = useState({ data: null, loading: true });
  const [layers, setLayers] = useState({
    airports: { enabled: false, data: null, loading: false },
    airspace: { enabled: false, data: null, loading: false },
    navaids:  { enabled: false, data: null, loading: false },
    traffic:  { enabled: false, data: null, loading: false },
    pireps:   { enabled: false, data: null, loading: false },
    runways:  { enabled: false, data: null, loading: false },
  });
  // Hazard toggles read straight from `weather.data` (already fetched on
  // mount) — no separate loading state needed, they're pure client filters.
  const [hazardsOn, setHazardsOn] = useState({ ts: false, ice: false, turbHi: false, turbLo: false, ifr: false });
  const toggleHazard = useCallback((key) => {
    setHazardsOn(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const anyHazardOn = Object.values(hazardsOn).some(Boolean);
  const [drawMode, setDrawMode] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const trafficTimer = useRef(null);

  // Airport Diagram georeferencing (GCP calibration) — panel renders outside
  // the MapContainer (it's a floating tool UI, not a map layer); the resulting
  // overlay renders inside via RotatedImageOverlayLayer once the user applies
  // a fit. Keyed by icao so switching airports drops the previous overlay.
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [chartOverlay, setChartOverlay] = useState(null); // { icao, imageUrl, topLeft, topRight, bottomLeft, residualsFt }

  // Weather radar time-scrubber — Iowa Environmental Mesonet's WMS-T NEXRAD
  // mosaic (free, keyless, genuinely time-aware — verified this session: a
  // TIME= query 3h back over CONUS returned real, different reflectivity
  // data than "now"). RADAR_STEPS mirrors ForeFlight's own -5min cadence
  // over the last hour.
  const RADAR_STEP_MIN = 5;
  const RADAR_STEPS = 12; // last 60 minutes in 5-minute steps
  const [radarOn, setRadarOn] = useState(false);
  const [radarStepIdx, setRadarStepIdx] = useState(RADAR_STEPS); // 0=oldest, RADAR_STEPS=now
  const [radarPlaying, setRadarPlaying] = useState(false);
  const radarPlayTimer = useRef(null);
  const radarTimeIso = radarStepIdx >= RADAR_STEPS
    ? "0"
    : new Date(Date.now() - (RADAR_STEPS - radarStepIdx) * RADAR_STEP_MIN * 60000).toISOString().slice(0, 16) + ":00Z";
  // Memoized so WMSTileLayer's `params` reference only changes when the
  // timestamp actually does — otherwise every unrelated re-render (a hazard
  // toggle, a new stroke) would trigger a redundant tile refetch.
  const radarParams = useMemo(() => ({ time: radarTimeIso }), [radarTimeIso]);
  useEffect(() => {
    if (radarPlaying) {
      radarPlayTimer.current = setInterval(() => {
        setRadarStepIdx(i => (i >= RADAR_STEPS ? 0 : i + 1));
      }, 800);
    } else {
      clearInterval(radarPlayTimer.current);
    }
    return () => clearInterval(radarPlayTimer.current);
  }, [radarPlaying]);

  // Auto-load METAR weather on mount
  useEffect(() => {
    const ids = icaos.join(",");
    apiGet(`/v1/aviation:weather?ids=${ids}&taf=1&sigmet=1`)
      .then(d => setWeather({ data: d, loading: false }))
      .catch(() => setWeather({ data: null, loading: false }));
  }, [icaos.join(",")]);

  const fetchLayer = useCallback(async (key) => {
    setLayers(prev => ({ ...prev, [key]: { ...prev[key], loading: true } }));
    try {
      let data = null;
      const [lat, lon] = center;
      if (key === "airports") {
        data = await apiGet(`/v1/aviation:airports?lat=${lat}&lon=${lon}&dist=200`);
      } else if (key === "airspace") {
        data = await apiGet(`/v1/aviation:airspace?lat=${lat}&lon=${lon}&dist=150`);
      } else if (key === "navaids") {
        data = await apiGet(`/v1/aviation:navaids?lat=${lat}&lon=${lon}&dist=200`);
      } else if (key === "traffic") {
        data = await apiGet(`/v1/aviation:traffic?lat=${lat}&lon=${lon}&dist=150`);
      } else if (key === "pireps") {
        data = await apiGet(`/v1/aviation:pireps?lat=${lat}&lon=${lon}&dist=200`);
      } else if (key === "runways") {
        // Per-airport (not spatial radius) — one call per ICAO already on the map.
        const results = await Promise.all(
          icaos.map(icao => apiGet(`/v1/aviation:runways?icao=${icao}`).catch(() => null))
        );
        const runways = results.filter(Boolean).flatMap(r =>
          (r.runways || []).map(rwy => ({ ...rwy, icao: r.icao, airportName: r.airportName }))
        );
        data = { runways };
      }
      setLayers(prev => ({ ...prev, [key]: { enabled: prev[key].enabled, data, loading: false } }));
    } catch (e) {
      setLayers(prev => ({ ...prev, [key]: { ...prev[key], loading: false } }));
    }
  }, [center[0], center[1], icaos.join(",")]);

  const toggleLayer = useCallback((key) => {
    setLayers(prev => {
      const cur = prev[key];
      const nextEnabled = !cur.enabled;
      if (nextEnabled && !cur.data) fetchLayer(key);
      if (key === "traffic") {
        if (nextEnabled) {
          trafficTimer.current = setInterval(() => fetchLayer("traffic"), 60_000);
        } else {
          clearInterval(trafficTimer.current);
        }
      }
      return { ...prev, [key]: { ...cur, enabled: nextEnabled } };
    });
  }, [fetchLayer]);

  useEffect(() => () => clearInterval(trafficTimer.current), []);

  const metars = (weather.data?.metars || []).filter(m => m.lat != null && m.lon != null);
  const airportList = (layers.airports.data?.airports || []).filter(a => a.lat && a.lon);
  const airspaceList = (layers.airspace.data?.airspace || []).filter(a => a.geometry);
  const navaidList = (layers.navaids.data?.navaids || []).filter(n => n.lat && n.lon);
  const trafficList = (layers.traffic.data?.aircraft || []).filter(a => a.lat != null && a.lon != null);
  const pirepList = (layers.pireps.data?.pireps || []).filter(p => p.lat != null && p.lon != null);
  const runwayList = (layers.runways.data?.runways || []).filter(r => r.thresholds?.endA && r.thresholds?.endB);

  // SIGMETs carry real polygon coords; AIRMETs (AWC's /api/data/airmet) carry
  // only region/altitude/valid-time, no geometry — so only SIGMETs ever draw
  // as map polygons. Both feed the hazard-toggle filters below either way.
  const allSigmets = weather.data?.sigmets || [];
  const allAirmets = weather.data?.airmets || [];
  const hazardItems = [
    ...allSigmets.map(s => ({ ...s, source: "sigmet" })),
    ...allAirmets.map(a => ({ ...a, source: "airmet" })),
  ];
  const activeHazardKeys = Object.keys(hazardsOn).filter(k => hazardsOn[k]);
  const visibleHazards = anyHazardOn
    ? hazardItems.filter(h => activeHazardKeys.some(k => HAZARD_FILTERS[k].test(h)))
    : [];
  const sigmets = anyHazardOn ? visibleHazards.filter(h => (h.area || h.coords) && h.source === "sigmet") : [];
  const airmets = anyHazardOn ? visibleHazards.filter(h => (h.area || h.coords) && h.source === "airmet") : [];
  // AIRMETs never have coords today (see note above) — this list is what
  // actually renders for them, as text rows rather than shapes.
  const hazardTextRows = anyHazardOn ? visibleHazards.filter(h => !(h.area || h.coords)) : [];

  const mapHeight = compact ? 240 : height;

  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #1e293b" }}>
      {/* ForeFlight-style vertical icon rail — data layers, then hazard filters,
          each an independent on/off button (no separate "layers menu" screen).
          Positioned below Leaflet's own top-left zoom control (kept as-is —
          a custom one via a MapContainer ref broke under React StrictMode's
          dev-mode double-mount) so the two don't overlap. */}
      <div style={{
        position: "absolute", top: compact ? 8 : 90, left: 8, zIndex: 1000,
        display: "flex", flexDirection: "column", gap: 4,
        background: "rgba(15,23,42,0.85)", borderRadius: 8, padding: 5,
        boxShadow: "0 1px 4px rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      }}>
        <IconToggle icon="🛩" title="Airports" enabled={layers.airports.enabled} loading={layers.airports.loading} onClick={() => toggleLayer("airports")} color="#60a5fa" />
        <IconToggle icon="⬠" title="Airspace" enabled={layers.airspace.enabled} loading={layers.airspace.loading} onClick={() => toggleLayer("airspace")} color="#a78bfa" />
        <IconToggle icon="◈" title="Navaids"  enabled={layers.navaids.enabled}  loading={layers.navaids.loading}  onClick={() => toggleLayer("navaids")}  color="#22d3ee" />
        <IconToggle icon="✈" title="Traffic"  enabled={layers.traffic.enabled}  loading={layers.traffic.loading}  onClick={() => toggleLayer("traffic")}  color="#f87171" />
        <IconToggle icon="💬" title="PIREPs"   enabled={layers.pireps.enabled}   loading={layers.pireps.loading}   onClick={() => toggleLayer("pireps")}   color="#34d399" />
        <IconToggle icon="▭" title="Runways (georeferencing GCPs)" enabled={layers.runways.enabled} loading={layers.runways.loading} onClick={() => toggleLayer("runways")} color="#fbbf24" />
        <IconToggle icon="🗺" title="Calibrate Airport Diagram overlay" enabled={calibrationOpen} loading={false} onClick={() => setCalibrationOpen(v => !v)} color="#c084fc" />
        <IconToggle icon="🌧" title="Weather radar (time scrubber)" enabled={radarOn} loading={false} onClick={() => setRadarOn(v => !v)} color="#38bdf8" />
        <div style={{ height: 1, background: "#334155", margin: "2px 2px" }} />
        {Object.entries(HAZARD_FILTERS).map(([key, cfg]) => (
          <IconToggle key={key} icon={cfg.icon} title={cfg.label} enabled={hazardsOn[key]} loading={false} onClick={() => toggleHazard(key)} color={cfg.color} />
        ))}
        <div style={{ height: 1, background: "#334155", margin: "2px 2px" }} />
        <IconToggle icon="✏️" title={drawMode ? "Stop drawing" : "Draw on chart"} enabled={drawMode} loading={false} onClick={() => setDrawMode(v => !v)} color="#facc15" />
        {strokes.length > 0 && (
          <>
            <IconToggle icon="↩︎" title="Undo last stroke" enabled={false} loading={false} onClick={() => setStrokes(prev => prev.slice(0, -1))} color="#94a3b8" />
            <IconToggle icon="🗑" title="Clear all strokes" enabled={false} loading={false} onClick={() => setStrokes([])} color="#94a3b8" />
          </>
        )}
      </div>

      {/* Map */}
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: mapHeight, width: "100%" }}
        zoomControl={!compact}
        attributionControl={false}
      >
        {/* Voyager tiles — day/VFR-style: light terrain, water, and geographic
            labels (cities, coastlines, roads) instead of the near-blank dark
            basemap. Overlay colors (airspace, METAR, traffic) already match
            real FAA sectional conventions (blue=B, magenta=C, indigo=D) and
            read fine on a light base — no overlay color changes needed. */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          subdomains="abcd"
          maxZoom={19}
        />

        {/* Weather radar — IEM's time-aware WMS NEXRAD mosaic. `params.time`
            changing on every scrub/play tick forces react-leaflet's
            WMSTileLayer to re-request tiles for that timestamp — verified
            this session that the TIME param genuinely returns different
            reflectivity data, not a cached "latest" image regardless of it. */}
        {radarOn && (
          <WMSTileLayer
            url="https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r-t.cgi"
            layers="nexrad-n0r-wmst"
            format="image/png"
            transparent={true}
            version="1.1.1"
            opacity={0.65}
            params={radarParams}
          />
        )}

        <RecenterMap center={center} zoom={zoom} />

        {/* METAR dots — always on, colored by flight category */}
        {metars.map(m => (
          <CircleMarker
            key={m.icao}
            center={[m.lat, m.lon]}
            radius={compact ? 5 : 7}
            pathOptions={{
              color: "#fff",
              weight: 1.5,
              fillColor: CAT_COLOR[m.flightCategory] || "#94a3b8",
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, background: "#1e293b", color: "#e2e8f0", padding: "4px 6px", borderRadius: 4 }}>
                <strong style={{ color: CAT_COLOR[m.flightCategory] || "#94a3b8" }}>{m.icao} — {m.flightCategory || "Unknown"}</strong>
                {m.raw && <><br /><code style={{ fontSize: 10, whiteSpace: "pre-wrap", color: "#cbd5e1" }}>{m.raw}</code></>}
                {m.windDir != null && <><br />Wind: {m.windDir}°/{m.windSpeedKt}kt{m.windGustKt ? ` G${m.windGustKt}` : ""}</>}
                {m.visibilitySm != null && <><br />Vis: {m.visibilitySm}SM</>}
                {m.altimeterInHg != null && <><br />Altm: {m.altimeterInHg}&quot;</>}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Airports — FAA sectional icons */}
        {layers.airports.enabled && airportList.map((a, i) => (
          <Marker
            key={a.icao || a.ident || i}
            position={[a.lat, a.lon]}
            icon={makeAirportIcon(a)}
          >
            <Popup>
              <div style={{ fontFamily: "sans-serif", fontSize: 12, lineHeight: 1.6, background: "#1e293b", color: "#e2e8f0", padding: "4px 6px", borderRadius: 4, minWidth: 160 }}>
                <strong style={{ color: "#60a5fa" }}>{a.icao || a.ident}</strong> — {a.name || "—"}
                <br />Elev: {a.elevationFt != null ? `${a.elevationFt}ft` : "—"}
                {a.hasApproaches && <><br /><span style={{ color: "#a78bfa" }}>✓ Instrument approaches</span></>}
                {a.privateUse && <><br /><span style={{ color: "#e879f9" }}>Private use</span></>}
                {a.fuelTypes && <><br />Fuel: {a.fuelTypes}</>}
                <br />{a.city}{a.state ? `, ${a.state}` : ""}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Airspace polygons */}
        {layers.airspace.enabled && airspaceList.map((a, i) => {
          const style = AIRSPACE_STYLE[a.airspaceClass] || AIRSPACE_STYLE.E;
          const positions = geoPolygonToLeaflet(a.geometry);
          if (!positions || !positions.length) return null;
          return (
            <Polygon key={i} positions={positions}
              pathOptions={{ color: style.color, fillColor: style.fill, fillOpacity: style.fillOpacity, weight: style.weight, dashArray: style.dashArray }}>
              <Popup>
                <div style={{ fontSize: 12, background: "#1e293b", color: "#e2e8f0", padding: "4px 6px", borderRadius: 4 }}>
                  <strong>Class {a.airspaceClass}</strong> — {a.name || "—"}
                  <br />Floor: {a.floor != null ? `${a.floor}${a.floorUom || "ft"}` : "SFC"}
                  <br />Ceiling: {a.ceiling != null ? `${a.ceiling}${a.ceilingUom || "ft"}` : "—"}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Navaids — type-specific icons */}
        {layers.navaids.enabled && navaidList.map((n, i) => {
          const type = (n.type || "").toUpperCase();
          const isVor = type.includes("VOR");
          const isNdb = type.includes("NDB");
          const icon = isVor ? makeVorIcon() : isNdb ? makeNdbIcon() : makeFixIcon();
          return (
            <Marker key={n.ident || i} position={[n.lat, n.lon]} icon={icon}>
              <Popup>
                <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, background: "#1e293b", color: "#e2e8f0", padding: "4px 6px", borderRadius: 4 }}>
                  <strong style={{ color: "#22d3ee" }}>{n.ident}</strong> {n.type || ""}
                  <br />{n.name || "—"}
                  {n.frequency && <><br />{n.frequency} {n.frequencyUom || "MHz"}</>}
                  {n.elevationFt != null && <><br />Elev: {n.elevationFt}ft</>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Traffic — airplane icons rotated by heading */}
        {layers.traffic.enabled && trafficList.map((a, i) => (
          <Marker
            key={a.hex || i}
            position={[a.lat, a.lon]}
            icon={makeAircraftIcon(a.heading || a.track, !!a.emergency, fleetSet.has((a.registration || "").toUpperCase()))}
          >
            <Popup>
              <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, background: "#1e293b", color: "#e2e8f0", padding: "4px 6px", borderRadius: 4 }}>
                {a.registration && <><strong style={{ color: "#f87171" }}>{a.registration}</strong><br /></>}
                {a.flight && <>{a.flight.trim()}<br /></>}
                {a.type && <>Type: {a.type}<br /></>}
                {a.altitudeFt != null && <>Alt: {a.onGround ? "GND" : `${a.altitudeFt.toLocaleString()}ft`}<br /></>}
                {a.groundSpeedKt != null && <>GS: {a.groundSpeedKt}kt<br /></>}
                {a.heading != null && <>Hdg: {a.heading}°<br /></>}
                {a.emergency && <><span style={{ color: "#ef4444" }}>⚠ EMERGENCY: {a.emergency}</span><br /></>}
              </div>
            </Popup>
          </Marker>
        ))}

        {layers.pireps.enabled && pirepList.map((p, i) => (
          <Marker
            key={`pirep-${i}`}
            position={[p.lat, p.lon]}
            icon={makePirepIcon(p.pirepType === "UUA")}
          >
            <Popup>
              <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, background: "#1e293b", color: "#e2e8f0", padding: "4px 6px", borderRadius: 4 }}>
                <strong style={{ color: p.pirepType === "UUA" ? "#ef4444" : "#34d399" }}>{p.pirepType === "UUA" ? "URGENT PIREP" : "PIREP"}</strong>{p.icaoId && <> · {p.icaoId}</>}<br />
                {p.aircraftType && <>Type: {p.aircraftType}<br /></>}
                {p.flightLevel != null && <>Level: FL{String(p.flightLevel).padStart(3, "0")}<br /></>}
                {p.icing && <>Icing: {p.icing.intensity || "reported"} {p.icing.type || ""}<br /></>}
                {p.turbulence && <>Turb: {p.turbulence.intensity || "reported"}<br /></>}
                {p.weather && <>Wx: {p.weather}<br /></>}
                {p.raw && <code style={{ fontSize: 10, whiteSpace: "pre-wrap" }}>{p.raw}</code>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Runway centerlines + threshold ground-control-points — real FAA
            NASR data, cross-validated against declared runway length. This
            is the reference data an Airport Diagram calibration UI will
            match against clicked pixel positions (not yet built — this
            layer proves the GCP source, not the image-overlay itself). */}
        {layers.runways.enabled && runwayList.map((r, i) => {
          const { endA, endB } = r.thresholds;
          const legs = r.designator ? r.designator.split("/") : [null, null];
          return (
            <React.Fragment key={`rwy-${i}`}>
              <Polyline positions={[[endA.lat, endA.lon], [endB.lat, endB.lon]]}
                pathOptions={{ color: "#fbbf24", weight: 2, dashArray: "4 4", opacity: 0.85 }} />
              {[[endA, legs[0]], [endB, legs[1]]].map(([end, leg], j) => (
                <CircleMarker key={j} center={[end.lat, end.lon]} radius={5}
                  pathOptions={{ color: "#0f172a", weight: 1, fillColor: "#fbbf24", fillOpacity: 0.95 }}>
                  <Popup>
                    <div style={{ fontFamily: "monospace", fontSize: 11, lineHeight: 1.6, background: "#1e293b", color: "#fde68a", padding: "4px 6px", borderRadius: 4 }}>
                      <strong>{r.icao} Rwy {leg || "?"}</strong> — threshold GCP<br />
                      {end.lat.toFixed(6)}, {end.lon.toFixed(6)}<br />
                      {r.designator} · {r.lengthFt}ft × {r.widthFt}ft {r.surface}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </React.Fragment>
          );
        })}

        {chartOverlay && (
          <RotatedImageOverlayLayer
            imageUrl={chartOverlay.imageUrl}
            topLeft={chartOverlay.topLeft}
            topRight={chartOverlay.topRight}
            bottomLeft={chartOverlay.bottomLeft}
          />
        )}

        <DrawLayer active={drawMode} onStrokeComplete={(pts) => setStrokes(prev => [...prev, pts])} />
        {strokes.map((pts, i) => (
          <Polyline key={`stroke-${i}`} positions={pts} pathOptions={{ color: "#facc15", weight: 3, opacity: 0.9 }} />
        ))}

        {/* SIGMET polygons — the only hazard feed with real geometry today */}
        {sigmets.map((s, i) => {
          const coords = s.area || s.coords || [];
          if (!coords.length) return null;
          const positions = coords.map(([lon, lat]) => [lat, lon]);
          return (
            <Polygon key={`sigmet-${i}`} positions={positions}
              pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.12, weight: 2, dashArray: "8 4" }}>
              <Popup>
                <div style={{ fontSize: 11, background: "#1e293b", color: "#fca5a5", padding: "4px 6px", borderRadius: 4 }}>
                  <strong>SIGMET</strong><br />
                  {s.hazard || s.type || "Convective"}<br />
                  {s.validTimeFrom && <>From: {new Date(s.validTimeFrom * 1000).toISOString()}<br /></>}
                  {s.validTimeTo && <>To: {new Date(s.validTimeTo * 1000).toISOString()}<br /></>}
                  {s.rawAirSigmet && <code style={{ fontSize: 10, whiteSpace: "pre-wrap" }}>{s.rawAirSigmet.slice(0, 120)}</code>}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* AIRMET polygons — kept for the day the AWC feed (or a swapped
            source) carries real geometry; airmets is always [] today since
            the airmet endpoint returns region/altitude only, no coords. */}
        {airmets.map((a, i) => {
          const coords = a.area || a.coords || [];
          if (!coords.length) return null;
          const positions = coords.map(([lon, lat]) => [lat, lon]);
          return (
            <Polygon key={`airmet-${i}`} positions={positions}
              pathOptions={{ color: "#fb923c", fillColor: "#fb923c", fillOpacity: 0.10, weight: 1.5, dashArray: "6 3" }}>
              <Popup>
                <div style={{ fontSize: 11, background: "#1e293b", color: "#fdba74", padding: "4px 6px", borderRadius: 4 }}>
                  <strong>AIRMET {a.airmetType || ""}</strong><br />
                  {a.hazard || a.type || "Weather"}<br />
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>

      {/* Weather radar time-scrubber — ForeFlight-style bottom playback bar.
          Tick labels are relative to "now" (far right), matching the
          reference screenshots' "-48m ... -13m" style. */}
      {radarOn && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1000,
          background: "rgba(15,23,42,0.92)", padding: "6px 10px",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 -1px 4px rgba(0,0,0,0.4)",
        }}>
          <button
            onClick={() => setRadarPlaying(p => !p)}
            title={radarPlaying ? "Pause" : "Play"}
            style={{ width: 26, height: 26, flexShrink: 0, border: "1px solid #334155", borderRadius: 6, background: "#0c2235", color: "#e2e8f0", cursor: "pointer", fontSize: 12 }}
          >
            {radarPlaying ? "❚❚" : "▶"}
          </button>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="range"
              min={0}
              max={RADAR_STEPS}
              step={1}
              value={radarStepIdx}
              onChange={e => { setRadarPlaying(false); setRadarStepIdx(Number(e.target.value)); }}
              style={{ width: "100%", accentColor: "#38bdf8" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8", marginTop: -2 }}>
              <span>-{RADAR_STEPS * RADAR_STEP_MIN}m</span>
              <span>-{(RADAR_STEPS * RADAR_STEP_MIN) / 2}m</span>
              <span>now</span>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#cbd5e1", flexShrink: 0, minWidth: 34, textAlign: "right" }}>
            {radarStepIdx >= RADAR_STEPS ? "now" : `-${(RADAR_STEPS - radarStepIdx) * RADAR_STEP_MIN}m`}
          </div>
        </div>
      )}

      {/* Legend */}
      {!compact && (
        <div style={{
          position: "absolute", bottom: radarOn ? 44 : 8, left: 8, zIndex: 1000,
          background: "rgba(15,23,42,0.88)", borderRadius: 6,
          padding: "4px 8px", display: "flex", gap: 10,
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
        }}>
          {Object.entries(CAT_LABEL).map(([k, label]) => (
            <span key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#cbd5e1" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLOR[k], display: "inline-block" }} />
              {label}
            </span>
          ))}
          {layers.traffic.enabled && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#cbd5e1" }}>
              ✈ Traffic
            </span>
          )}
          {hazardTextRows.length > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#fca5a5" }}>
              ⚠ {hazardTextRows.length} advisor{hazardTextRows.length > 1 ? "ies" : "y"} active
            </span>
          )}
        </div>
      )}

      {/* Active hazard text list — every AIRMET, plus any SIGMET without a
          usable polygon (rare, but the feed occasionally omits coords) */}
      {hazardTextRows.length > 0 && (
        <div style={{
          position: "absolute", bottom: radarOn ? 72 : 36, left: 8, right: 8, zIndex: 1000,
          background: "rgba(127,29,29,0.92)", borderRadius: 6,
          padding: "6px 10px", maxHeight: 100, overflowY: "auto",
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
        }}>
          {hazardTextRows.map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontFamily: "monospace", color: "#fca5a5", lineHeight: 1.4, marginBottom: 2 }}>
              <strong>{h.source === "sigmet" ? "SIGMET" : `AIRMET (${h.region || "?"})`}:</strong>{" "}
              {h.hazard}
              {h.base != null || h.top != null ? ` — ${h.base != null ? `FL${String(h.base).padStart(3, "0")}` : "SFC"}–${h.top != null ? `FL${String(h.top).padStart(3, "0")}` : "?"}` : ""}
              {h.rawAirSigmet ? ` — ${h.rawAirSigmet.slice(0, 80)}…` : ""}
            </div>
          ))}
        </div>
      )}

      {calibrationOpen && (
        <ChartCalibrationPanel
          defaultIcao={icaos[0]}
          apiGet={apiGet}
          existingOverlay={chartOverlay}
          onApply={(overlay) => setChartOverlay(overlay)}
          onClear={() => setChartOverlay(null)}
          onClose={() => setCalibrationOpen(false)}
        />
      )}

      {/* Loading indicator */}
      {weather.loading && (
        <div style={{
          position: "absolute", bottom: 8, right: 8, zIndex: 1000,
          background: "rgba(15,23,42,0.88)", borderRadius: 6,
          padding: "3px 8px", fontSize: 10, color: "#94a3b8",
        }}>
          Loading weather…
        </div>
      )}
    </div>
  );
}
