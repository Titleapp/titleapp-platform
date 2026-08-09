/**
 * AviationMap.jsx — Interactive aviation map with live FAA data overlays.
 *
 * Layers (all data from existing backend APIs — zero new infrastructure):
 *   - METAR station markers: flight category dots at airport positions (always on)
 *   - Airports: FAA NASR markers, clickable for ICAO/name/approaches
 *   - Airspace: FAA Class B/C/D/E GeoJSON polygons, color-coded by class
 *   - Navaids: VOR/NDB/DME markers with frequency
 *   - Traffic: ADS-B Exchange live aircraft, 60s refresh
 *   - SIGMET/TFR: convective SIGMETs + TFR overlays
 *
 * Toggle bar at map bottom matches ForeFlight's layer toggle pattern.
 * Airport click shows ICAO, name, elevation, approach types.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Polygon, Marker, Popup, useMap } from "react-leaflet";
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
const CAT_COLOR = { VFR: "#16a34a", MVFR: "#2563eb", IFR: "#dc2626", LIFR: "#7c3aed" };
const CAT_LABEL = { VFR: "VFR", MVFR: "Marginal", IFR: "IFR", LIFR: "Low IFR" };

// Airspace class → style
const AIRSPACE_STYLE = {
  B: { color: "#1a6fd4", fill: "#1a6fd4", fillOpacity: 0.08, weight: 2 },
  C: { color: "#cc44aa", fill: "#cc44aa", fillOpacity: 0.07, weight: 1.5 },
  D: { color: "#5555dd", fill: "#5555dd", fillOpacity: 0.06, weight: 1.5, dashArray: "6 4" },
  E: { color: "#888888", fill: "#888888", fillOpacity: 0.03, weight: 0.8 },
};

// GeoJSON ring → Leaflet [[lat,lon]] (reverses coordinate order)
function geoRingToLeaflet(ring) {
  if (!Array.isArray(ring)) return [];
  return ring.map(([lon, lat]) => [lat, lon]).filter(([lat, lon]) => lat != null && lon != null);
}

function geoPolygonToLeaflet(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) return null;
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map(geoRingToLeaflet);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap(poly => poly.map(geoRingToLeaflet));
  }
  return null;
}

// ── RecenterMap helper — lets parent reposition map programmatically ──────────
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
        border: `1.5px solid ${enabled ? (color || "#0284c7") : "#94a3b8"}`,
        borderRadius: 4,
        background: enabled ? (color ? `${color}18` : "#e0f2fe") : "#fff",
        color: enabled ? (color || "#0284c7") : "#64748b",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 4,
        whiteSpace: "nowrap",
        transition: "all 0.15s",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color || "#0284c7", animation: "pulse 1s infinite" }} />}
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
}) {
  // Layer state: each has enabled + data + loading
  const [weather, setWeather] = useState({ data: null, loading: true });
  const [layers, setLayers] = useState({
    airports: { enabled: false, data: null, loading: false },
    airspace: { enabled: false, data: null, loading: false },
    navaids:  { enabled: false, data: null, loading: false },
    traffic:  { enabled: false, data: null, loading: false },
  });
  const [selectedAirport, setSelectedAirport] = useState(null);
  const trafficTimer = useRef(null);

  // Auto-load METAR weather on mount
  useEffect(() => {
    const ids = icaos.join(",");
    apiGet(`/v1/aviation:weather?ids=${ids}&taf=1`)
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
      }
      setLayers(prev => ({ ...prev, [key]: { enabled: prev[key].enabled, data, loading: false } }));
    } catch (e) {
      setLayers(prev => ({ ...prev, [key]: { ...prev[key], loading: false } }));
    }
  }, [center[0], center[1]]);

  const toggleLayer = useCallback((key) => {
    setLayers(prev => {
      const cur = prev[key];
      const nextEnabled = !cur.enabled;
      if (nextEnabled && !cur.data) {
        fetchLayer(key);
      }
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

  const metars = weather.data?.metars || [];

  // Build airport markers from METAR data (always shown — flight cat dots)
  const metarMarkers = metars.filter(m => m.lat != null && m.lon != null);

  // Airport markers from FAA NASR
  const airportList = (layers.airports.data?.airports || []).filter(a => a.lat && a.lon);

  // Airspace polygons
  const airspaceList = (layers.airspace.data?.airspace || []).filter(a => a.geometry);

  // Navaids
  const navaidList = (layers.navaids.data?.navaids || []).filter(n => n.lat && n.lon);

  // Traffic
  const trafficList = (layers.traffic.data?.aircraft || []).filter(a => a.lat != null && a.lon != null);

  const mapHeight = compact ? 240 : height;

  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" }}>
      {/* Layer toggles — floating at top */}
      <div style={{
        position: "absolute", top: 8, left: 8, right: 8, zIndex: 1000,
        display: "flex", gap: 4, flexWrap: "wrap",
        pointerEvents: "auto",
      }}>
        <div style={{
          display: "flex", gap: 4, flexWrap: "wrap", background: "rgba(255,255,255,0.92)",
          borderRadius: 6, padding: "4px 6px", boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
          backdropFilter: "blur(4px)",
        }}>
          <LayerToggle
            label="Airports"
            enabled={layers.airports.enabled}
            loading={layers.airports.loading}
            onClick={() => toggleLayer("airports")}
            color="#0284c7"
          />
          <LayerToggle
            label="Airspace"
            enabled={layers.airspace.enabled}
            loading={layers.airspace.loading}
            onClick={() => toggleLayer("airspace")}
            color="#7c3aed"
          />
          <LayerToggle
            label="Navaids"
            enabled={layers.navaids.enabled}
            loading={layers.navaids.loading}
            onClick={() => toggleLayer("navaids")}
            color="#0891b2"
          />
          <LayerToggle
            label="Traffic"
            enabled={layers.traffic.enabled}
            loading={layers.traffic.loading}
            onClick={() => toggleLayer("traffic")}
            color="#dc2626"
          />
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
        {/* Base tile: CartoDB Voyager — clean, aviation-neutral */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; CartoDB"
          subdomains="abcd"
          maxZoom={19}
        />

        {/* METAR station dots — always on, color = flight category */}
        {metarMarkers.map(m => (
          <CircleMarker
            key={m.icao}
            center={[m.lat, m.lon]}
            radius={compact ? 6 : 8}
            pathOptions={{
              color: "#fff",
              weight: 1.5,
              fillColor: CAT_COLOR[m.flightCategory] || "#94a3b8",
              fillOpacity: 1,
            }}
          >
            <Popup>
              <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.6 }}>
                <strong>{m.icao}</strong> — <span style={{ color: CAT_COLOR[m.flightCategory] }}>{m.flightCategory || "Unknown"}</span>
                {m.raw && <><br /><code style={{ fontSize: 10, whiteSpace: "pre-wrap" }}>{m.raw}</code></>}
                {m.windDir != null && <><br />Wind: {m.windDir}° / {m.windSpeedKt}kt{m.windGustKt ? ` G${m.windGustKt}` : ""}</>}
                {m.visibilitySm != null && <><br />Vis: {m.visibilitySm}SM</>}
                {m.altimeterInHg != null && <><br />Altimeter: {m.altimeterInHg}&quot;</>}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Airports layer */}
        {layers.airports.enabled && airportList.map((a, i) => (
          <CircleMarker
            key={a.icao || a.ident || i}
            center={[a.lat, a.lon]}
            radius={4}
            pathOptions={{ color: "#0284c7", weight: 1.5, fillColor: "#e0f2fe", fillOpacity: 0.9 }}
            eventHandlers={{ click: () => setSelectedAirport(a) }}
          >
            <Popup>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, lineHeight: 1.6, minWidth: 160 }}>
                <strong>{a.icao || a.ident}</strong> — {a.name || "—"}
                <br />Elev: {a.elevationFt != null ? `${a.elevationFt}ft` : "—"}
                {a.hasApproaches && <><br /><span style={{ color: "#7c3aed" }}>✓ Instrument approaches</span></>}
                {a.privateUse && <><br /><span style={{ color: "#f59e0b" }}>⚠ Private use</span></>}
                <br />{a.city}, {a.state}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Airspace layer */}
        {layers.airspace.enabled && airspaceList.map((a, i) => {
          const style = AIRSPACE_STYLE[a.airspaceClass] || AIRSPACE_STYLE.E;
          const positions = geoPolygonToLeaflet(a.geometry);
          if (!positions || !positions.length) return null;
          return (
            <Polygon
              key={i}
              positions={positions}
              pathOptions={{
                color: style.color,
                fillColor: style.fill,
                fillOpacity: style.fillOpacity,
                weight: style.weight,
                dashArray: style.dashArray,
              }}
            >
              <Popup>
                <div style={{ fontSize: 12 }}>
                  <strong>Class {a.airspaceClass}</strong> — {a.name || "—"}
                  <br />Floor: {a.floor != null ? `${a.floor}${a.floorUom || "ft"}` : "SFC"}
                  <br />Ceiling: {a.ceiling != null ? `${a.ceiling}${a.ceilingUom || "ft"}` : "—"}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Navaid layer */}
        {layers.navaids.enabled && navaidList.map((n, i) => (
          <CircleMarker
            key={n.ident || i}
            center={[n.lat, n.lon]}
            radius={3}
            pathOptions={{ color: "#0891b2", weight: 1.5, fillColor: "#cffafe", fillOpacity: 1 }}
          >
            <Popup>
              <div style={{ fontSize: 12 }}>
                <strong>{n.ident}</strong> — {n.name || "—"}
                {n.frequency && <><br />{n.frequency} {n.frequencyUom || "MHz"}</>}
                {n.elevationFt != null && <><br />Elev: {n.elevationFt}ft</>}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Traffic layer — ADS-B dots */}
        {layers.traffic.enabled && trafficList.map((a, i) => (
          <CircleMarker
            key={a.hex || i}
            center={[a.lat, a.lon]}
            radius={5}
            pathOptions={{ color: "#dc2626", weight: 1.5, fillColor: a.emergency ? "#dc2626" : "#fef2f2", fillOpacity: 1 }}
          >
            <Popup>
              <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.6 }}>
                {a.registration && <><strong>{a.registration}</strong><br /></>}
                {a.flight && <>{a.flight.trim()}<br /></>}
                {a.type && <>Type: {a.type}<br /></>}
                {a.altitudeFt != null && <>Alt: {a.onGround ? "GND" : `${a.altitudeFt.toLocaleString()}ft`}<br /></>}
                {a.groundSpeedKt != null && <>GS: {a.groundSpeedKt}kt<br /></>}
                {a.emergency && <><span style={{ color: "#dc2626" }}>⚠ EMERGENCY: {a.emergency}</span><br /></>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend strip at bottom */}
      {!compact && (
        <div style={{
          position: "absolute", bottom: 8, left: 8, zIndex: 1000,
          background: "rgba(255,255,255,0.9)", borderRadius: 6,
          padding: "4px 8px", display: "flex", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        }}>
          {Object.entries(CAT_LABEL).map(([k, label]) => (
            <span key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#475569" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLOR[k], display: "inline-block" }} />
              {label}
            </span>
          ))}
          {layers.traffic.enabled && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#475569" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", display: "inline-block" }} />
              Traffic
            </span>
          )}
        </div>
      )}

      {/* Loading indicator */}
      {weather.loading && (
        <div style={{
          position: "absolute", bottom: 8, right: 8, zIndex: 1000,
          background: "rgba(255,255,255,0.9)", borderRadius: 6,
          padding: "3px 8px", fontSize: 10, color: "#64748b",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}>
          Loading weather…
        </div>
      )}
    </div>
  );
}
