/**
 * AviationNearest.jsx — Nearest airports with glide-ring and arrival-altitude calculation.
 *
 * PC-12/47E: best glide = 118 KIAS → 15:1 glide ratio per POH/AFM.
 * Glide range (nm) = (altitude_ft / 6076.115) * glide_ratio
 * Arrival altitude (ft MSL) = current_alt - (dist_nm * 6076.115 / glide_ratio)
 *
 * Color coding based on arrival altitude vs field elevation:
 *   GREEN  — arrives ≥500 ft AGL (enough altitude for an approach)
 *   YELLOW — arrives 0–499 ft AGL (marginal — very low energy arrival)
 *   RED    — arrives below field elevation (cannot reach)
 *
 * Glide ratio must match the specific aircraft type's POH/AFM.
 * PC-12/47E = 15:1. Future: pull from Foundation document per aircraft reg.
 *
 * Data: nearest airports from aviation:airports backend endpoint, filtered
 * to within 100nm of current GPS position.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Glide calculation ─────────────────────────────────────────────────────────
// PC-12/47E: 15:1 per POH/AFM (best glide 118 KIAS). Varies by aircraft type/wing shape.
// TODO: pull from Foundation document keyed by aircraft registration.
const GLIDE_RATIO = 15;
const FT_PER_NM  = 6076.115;

function glideRangeNm(altitudeFt) {
  return altitudeFt / FT_PER_NM * GLIDE_RATIO;
}

function arrivalAltFt(currentAltFt, distNm) {
  return Math.round(currentAltFt - (distNm * FT_PER_NM / GLIDE_RATIO));
}

function nmToMeters(nm) { return nm * 1852; }

// Haversine distance in nm
function distanceNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // earth radius in nm
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Bearing in degrees (0=N, 90=E)
function bearingDeg(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

// Hawaii airports hardcoded as the live-data fallback (same set as Charts)
const HAWAII_AIRPORTS = [
  { icao: "PHOG", name: "Kahului",   lat: 20.8986, lon: -156.4305, elev: 54,   ils: true  },
  { icao: "PHNL", name: "Honolulu",  lat: 21.3187, lon: -157.9224, elev: 13,   ils: true  },
  { icao: "PHKO", name: "Kona",      lat: 19.7388, lon: -156.0456, elev: 47,   ils: false },
  { icao: "PHTO", name: "Hilo",      lat: 19.7213, lon: -155.0480, elev: 38,   ils: true  },
  { icao: "PHNY", name: "Lanai",     lat: 20.7856, lon: -156.9514, elev: 1308, ils: false },
  { icao: "PHJH", name: "Kapalua",   lat: 20.9629, lon: -156.6731, elev: 26,   ils: false },
  { icao: "PHLI", name: "Lihue",     lat: 21.9760, lon: -159.3388, elev: 153,  ils: true  },
  { icao: "PHHI", name: "Wheeler",   lat: 21.4835, lon: -158.0400, elev: 837,  ils: false },
  { icao: "PHMK", name: "Molokai",   lat: 21.1529, lon: -157.0957, elev: 454,  ils: false },
];

const BAND_STYLE = {
  GREEN:  { bg: "#14532d", text: "#4ade80", border: "#16a34a" },
  YELLOW: { bg: "#422006", text: "#fbbf24", border: "#d97706" },
  RED:    { bg: "#450a0a", text: "#f87171", border: "#dc2626" },
};

// Leaflet icon for position
const POSITION_ICON = L.divIcon({
  html: `<svg width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="5" fill="#fbbf24" stroke="#fff" stroke-width="2"/>
    <circle cx="10" cy="10" r="9" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="3 2"/>
  </svg>`,
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function makeAirportDot(band) {
  const c = band === "GREEN" ? "#4ade80" : band === "YELLOW" ? "#fbbf24" : "#f87171";
  return L.divIcon({
    html: `<svg width="12" height="12" viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="5" fill="${c}" stroke="#fff" stroke-width="1.5"/>
    </svg>`,
    className: "",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function MapFit({ position, airports }) {
  const map = useMap();
  useEffect(() => {
    if (!position || airports.length === 0) return;
    const points = [[position.lat, position.lon], ...airports.map(a => [a.lat, a.lon])];
    map.fitBounds(points, { padding: [30, 30] });
  }, [position, airports.length]);
  return null;
}

export default function AviationNearest() {
  const [position, setPosition] = useState(null); // { lat, lon, altFt }
  const [altInput, setAltInput] = useState("8500");
  const [status, setStatus] = useState("idle"); // idle | locating | active | denied
  const [nearest, setNearest] = useState([]);
  const watchRef = useRef(null);

  const altFt = parseInt(altInput.replace(/,/g, ""), 10) || 0;
  const rangeNm = glideRangeNm(altFt);

  function classifyAirport(apt, pos) {
    if (!pos) return { dist: null, bearing: null, band: "RED", arrivalAlt: null, marginAgl: null };
    const dist = distanceNm(pos.lat, pos.lon, apt.lat, apt.lon);
    const bearing = bearingDeg(pos.lat, pos.lon, apt.lat, apt.lon);
    const arrival = arrivalAltFt(altFt, dist);
    const margin = arrival - apt.elev;
    // Band based on arrival margin above field elevation
    const band = margin >= 500 ? "GREEN" : margin >= 0 ? "YELLOW" : "RED";
    return {
      dist: Math.round(dist * 10) / 10,
      bearing: Math.round(bearing),
      arrivalAlt: arrival,
      marginAgl: Math.round(margin),
      band,
    };
  }

  const updateNearest = useCallback((pos) => {
    const computed = HAWAII_AIRPORTS
      .map(apt => ({ ...apt, ...classifyAirport(apt, pos) }))
      .sort((a, b) => (a.dist ?? 999) - (b.dist ?? 999));
    setNearest(computed);
  }, [altFt]);

  function locate() {
    if (!navigator.geolocation) { setStatus("denied"); return; }
    setStatus("locating");
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          altFt: pos.coords.altitude != null ? pos.coords.altitude * 3.28084 : null,
        };
        setPosition(p);
        if (p.altFt != null) setAltInput(String(Math.round(p.altFt)));
        updateNearest(p);
        setStatus("active");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }

  // Recompute nearest whenever alt input changes
  useEffect(() => {
    if (position) updateNearest(position);
  }, [altFt]);

  useEffect(() => {
    return () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  const mapCenter = position ? [position.lat, position.lon] : [20.5, -157.0];

  const ringColors = [
    { factor: 1.0, color: "#22c55e", weight: 2, dash: null },    // Glide range
    { factor: 0.75, color: "#fbbf24", weight: 1, dash: "6 4" },  // 75%
    { factor: 0.5,  color: "#64748b", weight: 1, dash: "3 4" },  // 50%
  ];

  return (
    <div style={{ background: "#0d1117", borderRadius: 12, overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
      {/* Header strip */}
      <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#475569", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Aircraft</div>
          <div style={{ color: "#e2e8f0", fontSize: 13, fontFamily: "monospace", fontWeight: 600 }}>PC-12/47E · Best glide 118 KIAS · 15:1 (POH/AFM)</div>
        </div>
        <div>
          <div style={{ color: "#475569", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Current altitude</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="text"
              value={altInput}
              onChange={e => setAltInput(e.target.value)}
              style={{
                background: "#161b22", border: "1px solid #334155", borderRadius: 6,
                color: "#e2e8f0", fontFamily: "monospace", fontSize: 14, fontWeight: 700,
                padding: "4px 10px", width: 90, textAlign: "right",
              }}
            />
            <span style={{ color: "#64748b", fontSize: 12 }}>ft MSL</span>
          </div>
        </div>
        <div>
          <div style={{ color: "#475569", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Glide range</div>
          <div style={{ color: "#4ade80", fontFamily: "monospace", fontSize: 14, fontWeight: 700 }}>
            {rangeNm.toFixed(1)} nm
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          {status === "idle" && (
            <button onClick={locate}
              style={{ background: "#1e3a5f", color: "#60a5fa", border: "1.5px solid #2563eb", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Use GPS
            </button>
          )}
          {status === "locating" && <span style={{ color: "#94a3b8", fontSize: 12 }}>Locating…</span>}
          {status === "active" && (
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#4ade80", fontSize: 11, fontFamily: "monospace" }}>
                {position?.lat.toFixed(4)}°N {Math.abs(position?.lon).toFixed(4)}°W
              </div>
              {position?.altFt != null && <div style={{ color: "#64748b", fontSize: 10 }}>GPS alt: {Math.round(position.altFt)} ft</div>}
            </div>
          )}
          {status === "denied" && <span style={{ color: "#f87171", fontSize: 12 }}>GPS denied — enter altitude manually</span>}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, padding: "8px 16px", flexWrap: "wrap" }}>
        {[["GREEN","Arrive ≥500 ft AGL"],["YELLOW","Arrive <500 ft AGL"],["RED","Below field elevation"]].map(([band, label]) => {
          const c = BAND_STYLE[band];
          return (
            <div key={band} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.text }} />
              <span style={{ color: "#64748b", fontSize: 11 }}>{label}</span>
            </div>
          );
        })}
        <div style={{ color: "#334155", fontSize: 11, marginLeft: "auto" }}>Enter altitude to recalculate arrival altitudes</div>
      </div>

      {/* Map */}
      <div style={{ height: 300, margin: "0 0 0 0" }}>
        <MapContainer
          center={mapCenter}
          zoom={7}
          style={{ width: "100%", height: "100%" }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

          {/* Glide rings */}
          {position && ringColors.map((ring, i) => (
            <Circle key={i}
              center={[position.lat, position.lon]}
              radius={nmToMeters(rangeNm * ring.factor)}
              pathOptions={{
                color: ring.color,
                weight: ring.weight,
                fill: false,
                dashArray: ring.dash,
                opacity: 0.8,
              }}
            />
          ))}

          {/* Aircraft position */}
          {position && (
            <Marker position={[position.lat, position.lon]} icon={POSITION_ICON}>
              <Popup>Your position</Popup>
            </Marker>
          )}

          {/* Airport dots */}
          {nearest.map(apt => {
            const icon = makeAirportDot(apt.band);
            return (
              <Marker key={apt.icao} position={[apt.lat, apt.lon]} icon={icon}>
                <Popup>
                  <div style={{ fontFamily: "monospace", fontSize: 12, background: "#0d1117", color: "#e2e8f0", padding: 6, borderRadius: 4 }}>
                    <strong>{apt.icao}</strong> {apt.name}<br />
                    {apt.dist != null && <>{apt.dist} nm · {apt.bearing}°<br /></>}
                    Elev: {apt.elev} ft MSL
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {position && <MapFit position={position} airports={nearest} />}
        </MapContainer>
      </div>

      {/* Airport list */}
      <div style={{ padding: "10px 14px 14px" }}>
        {(position ? nearest : HAWAII_AIRPORTS.map(apt => ({ ...apt, ...classifyAirport(apt, null) }))).map((apt, i) => {
          const c = BAND_STYLE[apt.band ?? "RED"];
          const hasCalc = apt.arrivalAlt != null;
          return (
            <div key={apt.icao} style={{
              borderRadius: 7, marginBottom: 4,
              background: i === 0 ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${i === 0 ? "#16a34a" : "rgba(255,255,255,0.05)"}`,
              overflow: "hidden",
            }}>
              {/* Main row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
                {/* Rank */}
                <span style={{ color: "#475569", fontFamily: "monospace", fontSize: 11, minWidth: 14 }}>{i + 1}</span>

                {/* Status dot */}
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.text, flexShrink: 0 }} />

                {/* ICAO */}
                <span style={{ color: "#e2e8f0", fontFamily: "monospace", fontWeight: 700, fontSize: 13, minWidth: 50 }}>{apt.icao}</span>

                {/* Name */}
                <span style={{ color: "#94a3b8", fontSize: 12, flex: 1 }}>{apt.name}</span>

                {/* ILS badge */}
                {apt.ils && <span style={{ color: "#60a5fa", fontSize: 10, background: "#1e3a5f", border: "1px solid #2563eb", borderRadius: 4, padding: "1px 5px" }}>ILS</span>}

                {/* Field elevation */}
                <span style={{ color: "#475569", fontSize: 10, fontFamily: "monospace" }}>field {apt.elev} ft</span>

                {/* Distance + bearing */}
                {apt.dist != null ? (
                  <div style={{ textAlign: "right", minWidth: 64 }}>
                    <div style={{ color: c.text, fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>{apt.dist} nm</div>
                    <div style={{ color: "#475569", fontSize: 10 }}>{apt.bearing}°</div>
                  </div>
                ) : (
                  <div style={{ color: "#334155", fontSize: 11, minWidth: 64, textAlign: "right" }}>Use GPS</div>
                )}
              </div>

              {/* Arrival altitude bar — only shown when position is known */}
              {hasCalc && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "5px 12px 7px 44px",
                  background: "rgba(0,0,0,0.25)",
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <div>
                    <span style={{ color: "#475569", fontSize: 10, marginRight: 6 }}>Arrive</span>
                    <span style={{
                      color: c.text, fontFamily: "monospace", fontSize: 13, fontWeight: 700,
                    }}>
                      {apt.arrivalAlt.toLocaleString()} ft MSL
                    </span>
                  </div>
                  <div style={{
                    background: c.bg, color: c.text, border: `1px solid ${c.border}`,
                    borderRadius: 5, padding: "2px 9px", fontSize: 10, fontFamily: "monospace", fontWeight: 700,
                  }}>
                    {apt.marginAgl >= 0
                      ? `+${apt.marginAgl.toLocaleString()} ft AGL`
                      : `${Math.abs(apt.marginAgl).toLocaleString()} ft BELOW FIELD`}
                  </div>
                  {apt.band === "YELLOW" && (
                    <span style={{ color: "#fbbf24", fontSize: 10 }}>⚠ Very low energy arrival</span>
                  )}
                  {apt.band === "RED" && (
                    <span style={{ color: "#f87171", fontSize: 10 }}>✗ Cannot reach</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "0 14px 12px", color: "#334155", fontSize: 10, textAlign: "center" }}>
        Arrival altitude = current MSL − (dist × 6076 ft/nm ÷ 15:1 glide ratio per PC-12/47E POH/AFM).
        Does not account for wind, terrain, or obstacle clearance. Verify with AFM. Not for navigation.
      </div>
    </div>
  );
}
