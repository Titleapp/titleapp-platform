/**
 * AviationMap.jsx — Interactive aviation map with live FAA data overlays.
 * Dark Matter tiles · FAA sectional icons · airplane traffic icons · SIGMET/AIRMET
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Polygon, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getAuth } from "firebase/auth";

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
    wxhazards:{ enabled: false, data: null, loading: false },
  });
  const trafficTimer = useRef(null);

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
      } else if (key === "wxhazards") {
        // Wx hazards: SIGMETs + AIRMETs from weather data already fetched
        data = weather.data || {};
      }
      setLayers(prev => ({ ...prev, [key]: { enabled: prev[key].enabled, data, loading: false } }));
    } catch (e) {
      setLayers(prev => ({ ...prev, [key]: { ...prev[key], loading: false } }));
    }
  }, [center[0], center[1], weather.data]);

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

  // SIGMETs and AIRMETs from weather data
  const sigmets = ((layers.wxhazards.enabled ? layers.wxhazards.data?.sigmets : null) ||
                   weather.data?.sigmets || []).filter(s => s.area || s.coords);
  const airmets = ((layers.wxhazards.enabled ? layers.wxhazards.data?.airmets : null) ||
                   weather.data?.airmets || []).filter(s => s.area || s.coords);

  // Inline SIGMET text list when no polygon data
  const sigmetTexts = (weather.data?.sigmets || []).filter(s => !s.area && !s.coords && s.raw);

  const mapHeight = compact ? 240 : height;

  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #1e293b" }}>
      {/* Layer toggles */}
      <div style={{
        position: "absolute", top: 8, left: 8, zIndex: 1000,
        display: "flex", gap: 4, flexWrap: "wrap",
        pointerEvents: "auto",
      }}>
        <div style={{
          display: "flex", gap: 4, flexWrap: "wrap",
          background: "rgba(15,23,42,0.85)",
          borderRadius: 6, padding: "4px 6px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
        }}>
          <LayerToggle label="Airports" enabled={layers.airports.enabled} loading={layers.airports.loading} onClick={() => toggleLayer("airports")} color="#60a5fa" />
          <LayerToggle label="Airspace" enabled={layers.airspace.enabled} loading={layers.airspace.loading} onClick={() => toggleLayer("airspace")} color="#a78bfa" />
          <LayerToggle label="Navaids"  enabled={layers.navaids.enabled}  loading={layers.navaids.loading}  onClick={() => toggleLayer("navaids")}  color="#22d3ee" />
          <LayerToggle label="Traffic"  enabled={layers.traffic.enabled}  loading={layers.traffic.loading}  onClick={() => toggleLayer("traffic")}  color="#f87171" />
          <LayerToggle label="Wx Hazards" enabled={layers.wxhazards.enabled} loading={layers.wxhazards.loading} onClick={() => toggleLayer("wxhazards")} color="#fb923c" />
        </div>
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

        {/* SIGMET polygons — red overlays */}
        {layers.wxhazards.enabled && sigmets.map((s, i) => {
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
                  {s.validFrom && <>From: {s.validFrom}<br /></>}
                  {s.validTo && <>To: {s.validTo}<br /></>}
                  {s.raw && <code style={{ fontSize: 10, whiteSpace: "pre-wrap" }}>{s.raw.slice(0, 120)}</code>}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* AIRMET polygons — orange overlays */}
        {layers.wxhazards.enabled && airmets.map((a, i) => {
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
                  {a.raw && <code style={{ fontSize: 10, whiteSpace: "pre-wrap" }}>{a.raw.slice(0, 120)}</code>}
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>

      {/* Legend */}
      {!compact && (
        <div style={{
          position: "absolute", bottom: 8, left: 8, zIndex: 1000,
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
          {layers.wxhazards.enabled && sigmetTexts.length > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#fca5a5" }}>
              ⚠ {sigmetTexts.length} SIGMET{sigmetTexts.length > 1 ? "s" : ""} active
            </span>
          )}
        </div>
      )}

      {/* Active SIGMET text list when no polygon data */}
      {layers.wxhazards.enabled && sigmetTexts.length > 0 && (
        <div style={{
          position: "absolute", bottom: 36, left: 8, right: 8, zIndex: 1000,
          background: "rgba(127,29,29,0.92)", borderRadius: 6,
          padding: "6px 10px", maxHeight: 80, overflowY: "auto",
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
        }}>
          {sigmetTexts.map((s, i) => (
            <div key={i} style={{ fontSize: 10, fontFamily: "monospace", color: "#fca5a5", lineHeight: 1.4, marginBottom: 2 }}>
              <strong>SIGMET:</strong> {s.raw ? s.raw.slice(0, 100) + "…" : JSON.stringify(s).slice(0, 80)}
            </div>
          ))}
        </div>
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
