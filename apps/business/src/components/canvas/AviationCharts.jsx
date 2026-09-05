/**
 * AviationCharts.jsx — Approach charts, airport diagrams, and ramp info
 * scoped to the operator's actual bases.
 *
 * Chart PDFs sourced from FAA AeroNav (publicly available, AIRAC-cycled).
 * Ramp photos: placeholder until curated photo library is connected.
 */

import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiGet(path) {
  const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// Loose match between this file's static plate names ("ILS or LOC Rwy 02")
// and the FAA metafile's own chart names ("ILS Y OR LOC Y RWY 02", "AIRPORT
// DIAGRAM") — casing and wording differ, so this normalizes both sides
// (uppercase, strip non-alphanumerics) and checks for containment rather
// than requiring an exact match. Real mismatches fall back to no URL rather
// than a wrong one.
function normalizeChartName(s) {
  return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function findRealChartUrl(realCharts, plateName) {
  if (!Array.isArray(realCharts) || !realCharts.length) return null;
  const target = normalizeChartName(plateName);
  if (!target) return null;
  const exact = realCharts.find(c => normalizeChartName(c.name) === target);
  if (exact) return exact.url;
  const contains = realCharts.find(c => {
    const n = normalizeChartName(c.name);
    return n.includes(target) || target.includes(n);
  });
  return contains ? contains.url : null;
}

// Hawaii bases: hardcoded airport data + approach plate lists.
// Source: FAA Chart Supplement Pacific, AIRAC 2614.
const AIRPORTS = {
  PHOG: {
    name: "Kahului", island: "Maui",
    elevation: 54, magvar: "10°E",
    tower: "132.7", ground: "121.9", atis: "126.35", ctaf: null,
    runways: [
      { id: "02/20", length: 6995, width: 150, surface: "Asphalt", ils: ["ILS 02", "ILS 20"] },
      { id: "05/23", length: 4990, width: 75,  surface: "Asphalt", ils: [] },
    ],
    plates: [
      { name: "ILS or LOC Rwy 02",         type: "ILS",  rwy: "02" },
      { name: "ILS or LOC Rwy 20",         type: "ILS",  rwy: "20" },
      { name: "RNAV (GPS) Z Rwy 02",       type: "RNAV", rwy: "02" },
      { name: "RNAV (GPS) Y Rwy 02",       type: "RNAV", rwy: "02" },
      { name: "RNAV (GPS) Y Rwy 20",       type: "RNAV", rwy: "20" },
      { name: "VOR or GPS Rwy 02",         type: "VOR",  rwy: "02" },
      { name: "Airport Diagram",           type: "APD",  rwy: null },
    ],
    aeronavId: "PHOG",
  },
  PHNL: {
    name: "Honolulu Intl", island: "Oahu",
    elevation: 13, magvar: "10°E",
    tower: "118.1", ground: "121.9", atis: "127.9", ctaf: null,
    runways: [
      { id: "04L/22R", length: 12000, width: 200, surface: "Asphalt", ils: ["ILS 04L", "ILS 22R"] },
      { id: "08L/26R", length: 9000,  width: 150, surface: "Asphalt", ils: ["ILS 08L", "ILS 26R"] },
      { id: "04R/22L", length: 6952,  width: 150, surface: "Asphalt", ils: [] },
    ],
    plates: [
      { name: "ILS or LOC Rwy 04L",        type: "ILS",  rwy: "04L" },
      { name: "ILS or LOC Rwy 08L",        type: "ILS",  rwy: "08L" },
      { name: "ILS or LOC Rwy 22R",        type: "ILS",  rwy: "22R" },
      { name: "ILS or LOC Rwy 26R",        type: "ILS",  rwy: "26R" },
      { name: "RNAV (GPS) Y Rwy 04L",      type: "RNAV", rwy: "04L" },
      { name: "RNAV (GPS) Y Rwy 08L",      type: "RNAV", rwy: "08L" },
      { name: "RNAV (GPS) Z Rwy 04L",      type: "RNAV", rwy: "04L" },
      { name: "VOR or GPS Rwy 04R",        type: "VOR",  rwy: "04R" },
      { name: "Airport Diagram",           type: "APD",  rwy: null },
    ],
    aeronavId: "PHNL",
  },
  PHKO: {
    name: "Ellison Onizuka Kona Intl", island: "Hawaii",
    elevation: 47, magvar: "10°E",
    tower: "118.8", ground: "121.9", atis: "127.075", ctaf: null,
    runways: [
      { id: "17/35", length: 11000, width: 150, surface: "Asphalt", ils: [] },
    ],
    plates: [
      { name: "RNAV (GPS) Y Rwy 17",       type: "RNAV", rwy: "17" },
      { name: "RNAV (GPS) Y Rwy 35",       type: "RNAV", rwy: "35" },
      { name: "VOR or GPS-A",              type: "VOR",  rwy: null },
      { name: "Airport Diagram",           type: "APD",  rwy: null },
    ],
    aeronavId: "PHKO",
  },
  PHTO: {
    name: "Hilo Intl", island: "Hawaii",
    elevation: 38, magvar: "10°E",
    tower: "118.1", ground: "121.9", atis: "123.8", ctaf: null,
    runways: [
      { id: "03/21", length: 9800, width: 150, surface: "Asphalt", ils: ["ILS 03"] },
      { id: "08/26", length: 4847, width: 100, surface: "Asphalt", ils: [] },
    ],
    plates: [
      { name: "ILS or LOC Rwy 03",         type: "ILS",  rwy: "03" },
      { name: "RNAV (GPS) Y Rwy 03",       type: "RNAV", rwy: "03" },
      { name: "RNAV (GPS) Y Rwy 21",       type: "RNAV", rwy: "21" },
      { name: "VOR or GPS Rwy 03",         type: "VOR",  rwy: "03" },
      { name: "Airport Diagram",           type: "APD",  rwy: null },
    ],
    aeronavId: "PHTO",
  },
  PHNY: {
    name: "Lanai", island: "Lanai",
    elevation: 1308, magvar: "10°E",
    tower: null, ground: null, atis: null, ctaf: "122.8",
    runways: [
      { id: "03/21", length: 5001, width: 100, surface: "Asphalt", ils: [] },
    ],
    plates: [
      { name: "RNAV (GPS) Rwy 03",         type: "RNAV", rwy: "03" },
      { name: "RNAV (GPS) Rwy 21",         type: "RNAV", rwy: "21" },
      { name: "VOR or GPS-A",              type: "VOR",  rwy: null },
      { name: "Airport Diagram",           type: "APD",  rwy: null },
    ],
    aeronavId: "PHNY",
  },
};

const ICAO_ORDER = ["PHOG", "PHNL", "PHKO", "PHTO", "PHNY"];

const TYPE_COLOR = {
  ILS:  { bg: "#1e3a5f", text: "#60a5fa", border: "#2563eb" },
  RNAV: { bg: "#14532d", text: "#4ade80", border: "#16a34a" },
  VOR:  { bg: "#2d1b69", text: "#a78bfa", border: "#7c3aed" },
  APD:  { bg: "#292524", text: "#d6d3d1", border: "#57534e" },
};

function FreqBadge({ label, value }) {
  if (!value) return null;
  return (
    <span style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 5, padding: "2px 7px", fontSize: 11, color: "#94a3b8", fontFamily: "monospace", marginRight: 6 }}>
      <span style={{ color: "#64748b", marginRight: 3 }}>{label}</span>
      <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{value}</span>
    </span>
  );
}

function PlateRow({ plate, onClick, selected }) {
  const c = TYPE_COLOR[plate.type] || TYPE_COLOR.APD;
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
        borderRadius: 7, cursor: "pointer", marginBottom: 4,
        background: selected ? "#1e3a5f" : "rgba(255,255,255,0.03)",
        border: `1px solid ${selected ? "#2563eb" : "rgba(255,255,255,0.07)"}`,
        transition: "all 0.15s",
      }}
    >
      <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 4, padding: "1px 7px", fontSize: 10, fontFamily: "monospace", fontWeight: 700, minWidth: 40, textAlign: "center" }}>
        {plate.type}
      </span>
      <span style={{ flex: 1, color: "#e2e8f0", fontSize: 13 }}>{plate.name}</span>
      {plate.type !== "APD" && plate.rwy && (
        <span style={{ color: "#475569", fontSize: 11, fontFamily: "monospace" }}>RWY {plate.rwy}</span>
      )}
      <span style={{ color: "#3b82f6", fontSize: 11 }}>View →</span>
    </div>
  );
}

export default function AviationCharts() {
  const [selectedIcao, setSelectedIcao] = useState("PHOG");
  const [selectedPlate, setSelectedPlate] = useState(null);
  const [activeTab, setActiveTab] = useState("charts"); // charts | info | routing

  const airport = AIRPORTS[selectedIcao];

  // Real per-chart FAA PDF URLs for the selected airport — the previous
  // hardcoded `.../afd/2614/${icao}.PDF` link 404s (FAA no longer serves
  // charts by a guessable {ICAO}.PDF filename, and the AIRAC cycle "2614"
  // was stale). Fetched from the real d-TPP metafile via a backend route
  // that discovers the current cycle and resolves each chart's actual
  // FAA-assigned pdf_name — see functions/functions/services/aviation/dtpp.js.
  const [realCharts, setRealCharts] = useState({ charts: null, loading: true, error: null });
  useEffect(() => {
    setRealCharts({ charts: null, loading: true, error: null });
    apiGet(`/v1/aviation:dtppCharts?icao=${selectedIcao}`)
      .then(d => setRealCharts({ charts: d.charts || [], loading: false, error: null }))
      .catch(e => setRealCharts({ charts: null, loading: false, error: e.message }));
  }, [selectedIcao]);
  // Fallback when a specific chart can't be matched or the lookup failed —
  // FAA's real search form, prefilled with this airport's identifier, rather
  // than a dead direct-PDF guess.
  const dtppSearchFallbackUrl = `https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/dtpp/search/results/?ident=${selectedIcao}`;

  // Preferred routing for Hawaii inter-island IFR (common routes)
  const ROUTING = [
    { dep: "PHOG", dest: "PHNL", route: "PHOG DCT MAKAI DCT PHNL", alt: "FL180", note: "Common IFR; ATC may amend — always confirm" },
    { dep: "PHOG", dest: "PHKO", route: "PHOG DCT KOLEA DCT PHKO", alt: "FL180", note: "Short island hop; expect radar vectors" },
    { dep: "PHNL", dest: "PHOG", route: "PHNL DCT WOOSH DCT PHOG", alt: "FL180", note: "East flow — verify current NOTAM" },
    { dep: "PHOG", dest: "PHTO", route: "PHOG DCT LANAI DCT KUPAA DCT PHTO", alt: "FL180", note: "Multi-island; check TFRs" },
  ];

  return (
    <div style={{ background: "#0d1117", borderRadius: 12, overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
      {/* Airport selector */}
      <div style={{ display: "flex", gap: 6, padding: "12px 14px 0", overflowX: "auto" }}>
        {ICAO_ORDER.map(icao => (
          <button key={icao} onClick={() => { setSelectedIcao(icao); setSelectedPlate(null); }}
            style={{
              padding: "5px 14px", borderRadius: 7, border: `1.5px solid ${selectedIcao === icao ? "#2563eb" : "#1e293b"}`,
              background: selectedIcao === icao ? "#1e3a5f" : "#161b22",
              color: selectedIcao === icao ? "#60a5fa" : "#64748b",
              fontSize: 12, fontWeight: 700, fontFamily: "monospace", cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {icao}
          </button>
        ))}
      </div>

      {/* Airport name strip */}
      <div style={{ padding: "8px 16px 0", display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16 }}>{airport.name}</span>
        <span style={{ color: "#475569", fontSize: 12 }}>{airport.island} · {selectedIcao} · {airport.elevation}ft MSL</span>
      </div>

      {/* Frequency row */}
      <div style={{ padding: "6px 16px 0", display: "flex", flexWrap: "wrap", gap: 4 }}>
        {airport.tower  && <FreqBadge label="TWR"  value={airport.tower} />}
        {airport.ground && <FreqBadge label="GND"  value={airport.ground} />}
        {airport.atis   && <FreqBadge label="ATIS" value={airport.atis} />}
        {airport.ctaf   && <FreqBadge label="CTAF" value={airport.ctaf} />}
      </div>

      {/* Runway pills */}
      <div style={{ padding: "6px 16px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
        {airport.runways.map(rwy => (
          <div key={rwy.id} style={{ background: "#161b22", border: "1px solid #1e293b", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontFamily: "monospace" }}>
            <span style={{ color: "#94a3b8" }}>RWY </span>
            <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{rwy.id}</span>
            <span style={{ color: "#475569" }}> · {rwy.length.toLocaleString()}×{rwy.width}ft</span>
            {rwy.ils.length > 0 && <span style={{ color: "#2563eb", marginLeft: 4 }}>ILS ✓</span>}
          </div>
        ))}
      </div>

      {/* Inner tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1e293b", padding: "0 14px" }}>
        {[["charts","Approach Charts"], ["info","Airport Info"], ["routing","Preferred Routing"]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{
              padding: "8px 14px", border: "none", borderBottom: `2px solid ${activeTab === id ? "#3b82f6" : "transparent"}`,
              background: "transparent", color: activeTab === id ? "#60a5fa" : "#475569",
              fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 4,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Approach Charts tab ──────────────────────────── */}
      {activeTab === "charts" && (
        <div style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: "#64748b", fontSize: 11 }}>
              FAA AeroNav {realCharts.charts ? `· AIRAC current` : realCharts.loading ? "· loading current cycle…" : "· current cycle unavailable"} · Select a plate to view
            </span>
            <a href={dtppSearchFallbackUrl} target="_blank" rel="noreferrer"
              style={{ color: "#3b82f6", fontSize: 11, textDecoration: "none" }}>
              Search all charts on FAA AeroNav ↗
            </a>
          </div>

          {airport.plates.map((plate, i) => (
            <PlateRow key={i} plate={plate} selected={selectedPlate === i}
              onClick={() => setSelectedPlate(selectedPlate === i ? null : i)} />
          ))}

          {/* Chart viewer */}
          {selectedPlate !== null && (() => {
            const plateName = airport.plates[selectedPlate].name;
            const realUrl = findRealChartUrl(realCharts.charts, plateName);
            const linkUrl = realUrl || dtppSearchFallbackUrl;
            const linkLabel = realUrl ? `Open ${plateName} on FAA AeroNav ↗` : `Not matched — search FAA AeroNav for ${plateName} ↗`;
            return (
            <div style={{ marginTop: 14, borderRadius: 8, overflow: "hidden", border: "1px solid #1e293b" }}>
              <div style={{ background: "#161b22", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>{plateName} — {selectedIcao}</span>
                <a
                  href={linkUrl}
                  target="_blank" rel="noreferrer"
                  style={{ color: realUrl ? "#3b82f6" : "#f59e0b", fontSize: 11, textDecoration: "none" }}
                >
                  {realUrl ? "View real PDF on FAA AeroNav ↗" : "Not auto-matched — search AeroNav ↗"}
                </a>
              </div>
              <div style={{ background: "#0d1117", padding: 24, textAlign: "center" }}>
                <div style={{ color: "#475569", fontSize: 13, marginBottom: 8 }}>
                  {realCharts.loading
                    ? "Looking up the real, current chart list from FAA…"
                    : realUrl
                    ? "FAA chart PDFs open in a new tab (AeroNav login not required)."
                    : "This plate's name didn't auto-match a real chart from FAA's current catalog — search AeroNav directly instead of risking a wrong PDF."}
                </div>
                <a
                  href={linkUrl}
                  target="_blank" rel="noreferrer"
                  style={{
                    display: "inline-block", background: realUrl ? "#1e3a5f" : "#3f2d0f", color: realUrl ? "#60a5fa" : "#fbbf24",
                    border: `1.5px solid ${realUrl ? "#2563eb" : "#f59e0b"}`, borderRadius: 7, padding: "8px 20px",
                    fontSize: 13, fontWeight: 600, textDecoration: "none",
                  }}
                >
                  {linkLabel}
                </a>
                <div style={{ color: "#334155", fontSize: 10, marginTop: 8 }}>
                  Always verify currency of chart against current AIRAC cycle before flight
                </div>
              </div>
            </div>
            );
          })()}
        </div>
      )}

      {/* ── Airport Info tab ──────────────────────────────── */}
      {activeTab === "info" && (
        <div style={{ padding: "14px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["ICAO", selectedIcao],
              ["Field elevation", `${airport.elevation} ft MSL`],
              ["Magnetic variation", airport.magvar],
              ["Tower", airport.tower || "Uncontrolled"],
              ["Ground", airport.ground || "—"],
              ["ATIS / ASOS", airport.atis || "—"],
              ["CTAF", airport.ctaf || "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ background: "#161b22", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ color: "#475569", fontSize: 10, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                <div style={{ color: "#e2e8f0", fontSize: 14, fontFamily: "monospace", fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ color: "#475569", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Runways</div>
            {airport.runways.map(rwy => (
              <div key={rwy.id} style={{ background: "#161b22", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#e2e8f0", fontFamily: "monospace", fontWeight: 700, fontSize: 14 }}>RWY {rwy.id}</span>
                  <span style={{ color: "#475569", fontSize: 12 }}>{rwy.surface}</span>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>{rwy.length.toLocaleString()} × {rwy.width} ft</span>
                  {rwy.ils.length > 0 && <span style={{ color: "#60a5fa", fontSize: 12 }}>ILS: {rwy.ils.join(", ")}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Ramp photos placeholder */}
          <div style={{ marginTop: 14, background: "#161b22", border: "1px dashed #1e293b", borderRadius: 8, padding: 20, textAlign: "center" }}>
            <div style={{ color: "#475569", fontSize: 12, marginBottom: 4 }}>Ramp photos</div>
            <div style={{ color: "#334155", fontSize: 11 }}>Multi-angle ramp photos coming — same data tier as ForeFlight. Source: FAA airport diagram + curated operator photos.</div>
          </div>
        </div>
      )}

      {/* ── Preferred Routing tab ─────────────────────────── */}
      {activeTab === "routing" && (
        <div style={{ padding: "14px 16px" }}>
          <div style={{
            background: "#1c1917", border: "1px solid #44403c", borderRadius: 8, padding: "8px 12px", marginBottom: 12,
            color: "#d6d3d1", fontSize: 11,
          }}>
            ⚠ Routing is suggested based on FAA preferred routes — not ATC-granted. Confirm with ATC before filing. Wind, traffic, and TFRs affect actual clearances.
          </div>
          {ROUTING.filter(r => r.dep === selectedIcao || r.dest === selectedIcao).map((r, i) => (
            <div key={i} style={{ background: "#161b22", border: "1px solid #1e293b", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>
                  {r.dep} → {r.dest}
                </span>
                <span style={{ color: "#a78bfa", fontSize: 11, fontFamily: "monospace" }}>{r.alt}</span>
              </div>
              <div style={{ color: "#60a5fa", fontSize: 12, fontFamily: "monospace", marginBottom: 4, letterSpacing: 0.5 }}>{r.route}</div>
              <div style={{ color: "#64748b", fontSize: 11 }}>{r.note}</div>
            </div>
          ))}
          {ROUTING.filter(r => r.dep === selectedIcao || r.dest === selectedIcao).length === 0 && (
            <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: 24 }}>
              No preferred routes on file for {selectedIcao}. Ask Skye to suggest a routing in chat.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
