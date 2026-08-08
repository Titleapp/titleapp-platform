// AviationWorkerCanvas.jsx — Data-driven canvas for aviation workers.
// Follows the same CAS-panel + tab-bar + block-renderer pattern as
// RealEstateWorkerCanvas.jsx. Data from aviationCanvasData.js.
// CODEX 61 Phase 2: live data for weather/NOTAM/logbook tabs.

import React, { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { getAvCanvas, AV_CAS, AV_CAS_ORDER, AV_CAS_LABELS } from "./aviationCanvasData";
import MapCard from "./MapCard";
import TabDescription from "./TabDescription";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiGet(path) {
  const auth = getAuth();
  const token = auth.currentUser ? await auth.currentUser.getIdToken(false).catch(() => null) : null;
  const url = `${API_BASE}/api?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// Ceiling from raw METAR text — returns "CLR", "SKC", or e.g. "OVC030"
function parseCeiling(raw) {
  if (!raw) return "—";
  const m = raw.match(/\b(OVC|BKN|SCT|FEW)(\d{3})\b/);
  if (!m) return raw.includes("CLR") || raw.includes("SKC") ? "CLR" : "—";
  return `${m[1]}${parseInt(m[2]) * 100}`;
}

function weatherToBlocks(metars) {
  if (!metars || !metars.length) return null;
  const catBand = { VFR: "GREEN", MVFR: "BLUE", IFR: "RED", LIFR: "RED" };
  const rows = metars.map(s => [
    s.icao || "—",
    s.flightCategory || "—",
    parseCeiling(s.raw),
    s.visibilitySm != null ? `${s.visibilitySm}SM` : "—",
    s.windDir != null && s.windSpeedKt != null
      ? `${String(s.windDir).padStart(3, "0")}/${s.windSpeedKt}${s.windGustKt ? `G${s.windGustKt}` : ""}KT`
      : "Calm",
  ]);
  return [
    { type: "heroes", items: metars.map(s => ({
      band: catBand[s.flightCategory] || "WHITE",
      title: `${s.icao} — ${s.flightCategory || "Unknown"}`,
      detail: s.raw || "No METAR available",
    })) },
    { type: "table", title: "Route weather — live · FAA aviationweather.gov", cols: ["Station", "Category", "Ceiling", "Vis", "Wind"], rows },
  ];
}

function logbookToBlocks(entries) {
  const flights = (entries || []).filter(e => e.entryType === "aviation.flight" || (e.data && e.data.tailNumber));
  if (!flights.length) return [{
    type: "prose",
    items: [{ band: "BLUE", title: "No logbook entries yet", text: "Log your first flight by telling Alex: 'Log a flight — [tail], [dep], [arr], [hours], PIC.' The entry saves to your Vault and appears here." }],
  }];
  const rows = flights.slice(0, 15).map(e => {
    const d = e.data || e;
    const date = d.date || (e.createdAt ? new Date(e.createdAt._seconds * 1000).toISOString().slice(0, 10) : "—");
    return [date, d.tailNumber || "—", `${d.depIcao || "—"} → ${d.arrIcao || "—"}`, d.flightTime != null ? `${d.flightTime}h` : "—", d.flightType || "—"];
  });
  const total = flights.reduce((s, e) => s + ((e.data || e).flightTime || 0), 0);
  return [
    { type: "kpis", items: [
      { label: "Entries (Vault)", value: `${flights.length}`, band: "WHITE" },
      { label: "Total time shown", value: `${total.toFixed(1)}h`, band: "GREEN" },
    ] },
    { type: "table", title: "Recent flights — live from your Vault", cols: ["Date", "Tail", "Route", "Time", "Type"], rows },
    { type: "prose", items: [{ band: "GREEN", title: "Your logbook is portable", text: "These entries live in your personal Vault — not in this worker. They travel with you between employers. Every entry is append-only and chain-signed." }] },
  ];
}

function currencyToBlocks(c) {
  if (!c) return null;
  if (!c.hasFlightLog && !c.hasEvents) return [{
    type: "prose",
    items: [{ band: "BLUE", title: "No logbook data yet", text: "Log your first flight or currency event by telling Alex — e.g. 'Log a flight' or 'Add my medical: Class 1, expires Dec 2026.' Data appears here automatically." }],
  }];

  const heroes = [];
  if (c.medical) heroes.push({ band: c.medical.band, title: `Medical — ${c.medical.medicalClass || "Class 1"}`, detail: `Expires ${c.medical.expiration || "—"} · ${c.medical.daysRemaining != null ? `${c.medical.daysRemaining}d remaining` : ""}` });
  if (c.bfr)     heroes.push({ band: c.bfr.band,     title: "BFR",                detail: `${c.bfr.date || "—"} · ${c.bfr.daysRemaining != null ? `${c.bfr.daysRemaining}d until due` : ""}` });
  if (c.typeRecurrent) heroes.push({ band: c.typeRecurrent.band, title: `Type Recurrent${c.typeRecurrent.aircraftType ? ` — ${c.typeRecurrent.aircraftType}` : ""}`, detail: `${c.typeRecurrent.date || "—"} · ${c.typeRecurrent.daysRemaining != null ? `${c.typeRecurrent.daysRemaining}d remaining` : ""}` });

  const kpis = [
    { label: "90-day landings",    value: `${c.recency90Day.dayLandings} / 3 req`,   band: c.recency90Day.band },
    { label: "Night landings",     value: `${c.recency90Day.nightLandings} (90 days)`, band: c.recency90Day.nightLandings >= 3 ? "GREEN" : "YELLOW" },
    { label: "IFR approaches (6mo)", value: `${c.instrumentCurrency.approaches6mo} / 6 req`, band: c.instrumentCurrency.band },
    { label: "Holds (6mo)",        value: `${c.instrumentCurrency.holds6mo} / 1 req`,   band: c.instrumentCurrency.holds6mo >= 1 ? "GREEN" : "RED" },
  ];
  if (c.ipc) kpis.push({ label: "IPC", value: `${c.ipc.date || "—"} · ${c.ipc.daysRemaining != null ? `${c.ipc.daysRemaining}d` : ""}`, band: c.ipc.band });
  if (c.lineCheck135) kpis.push({ label: "135 Line Check", value: `${c.lineCheck135.date || "—"} · ${c.lineCheck135.daysRemaining != null ? `${c.lineCheck135.daysRemaining}d` : ""}`, band: c.lineCheck135.band });

  const blocks = [];
  if (heroes.length) blocks.push({ type: "heroes", items: heroes });
  blocks.push({ type: "kpis", items: kpis });

  const flags = [];
  [{ label: "Medical",       item: c.medical },
   { label: "BFR",           item: c.bfr },
   { label: "Type Recurrent", item: c.typeRecurrent },
   { label: "IPC",           item: c.ipc },
   { label: "135 Line Check", item: c.lineCheck135 }]
    .filter(({ item }) => item && (item.band === "RED" || item.band === "YELLOW"))
    .forEach(({ label, item }) => flags.push({
      band: item.band,
      title: `${label} — ${item.band === "RED" ? "expired or not on file" : "due soon"}`,
      detail: `${item.date || "No date"} · Expires ${item.expiration || "—"} · ${item.daysRemaining != null ? `${item.daysRemaining} days` : ""}`,
    }));
  if (flags.length) blocks.push({ type: "flags", items: flags });

  return blocks;
}

function squawksToBlocks(squawks) {
  const list = squawks || [];
  if (!list.length) return [{
    type: "cards",
    items: [{ band: "GREEN", label: "NO OPEN SQUAWKS", title: "Fleet is clean", detail: "No squawks on file. File a new squawk by telling Alex: 'File a squawk on N661LF — [describe the issue].' It goes into the aircraft record immediately.", action: "Open chat" }],
  }];
  const open   = list.filter(s => s.status === "open");
  const closed = list.filter(s => s.status !== "open");
  const flags  = open.map(s => ({
    band: "RED",
    title: `${s.tailNumber} · ${s.workOrderNumber || "No WO"} · ${s.description}`,
    detail: `${s.pilotName ? `Reported by ${s.pilotName}` : ""} · ${s.reportedAt ? new Date(s.reportedAt).toLocaleDateString() : ""}`,
  }));
  const rows = list.slice(0, 15).map(s => [
    s.tailNumber || "—",
    s.reportedAt ? new Date(s.reportedAt).toLocaleDateString() : "—",
    s.description ? s.description.slice(0, 50) + (s.description.length > 50 ? "…" : "") : "—",
    s.status === "open" ? "OPEN" : "CLOSED",
    s.workOrderNumber || "—",
  ]);
  const blocks = [];
  if (flags.length) blocks.push({ type: "flags", items: flags });
  if (open.length === 0) blocks.push({ type: "prose", items: [{ band: "GREEN", title: "No open squawks", text: "All fleet items are closed or resolved." }] });
  blocks.push({ type: "table", title: "Squawk log — live from Firestore", cols: ["Tail", "Date", "Description", "Status", "WO #"], rows });
  blocks.push({ type: "cards", items: [{ band: "BLUE", label: "LOG A SQUAWK", title: "Tell Alex about any discrepancy", detail: "Say: 'File a squawk on N661LF — [describe the issue].' Alex creates a timestamped entry and notifies MX. Immutable once filed.", action: "Open chat" }] });
  return blocks;
}

function trafficToBlocks(ac) {
  const list = ac || [];
  if (!list.length) return [{
    type: "prose",
    items: [{ band: "WHITE", title: "No traffic in range", text: "ADS-B Exchange returned no aircraft for this area. Clear skies or the area is below 10,000ft AGL radar coverage." }],
  }];
  const rows = list.slice(0, 12).map(a => [
    a.reg || a.r || a.icao24 || "—",
    (a.flight || a.callsign || "").trim() || "—",
    a.t || a.type || "—",
    a.alt_baro != null ? `${a.alt_baro}ft` : "—",
    a.gs != null ? `${Math.round(a.gs)}kt` : "—",
  ]);
  return [
    { type: "kpis", items: [{ label: "Aircraft in range", value: `${list.length}`, band: "BLUE" }] },
    { type: "table", title: "Traffic — live ADS-B Exchange", cols: ["Reg", "Flight", "Type", "Altitude", "GS"], rows },
  ];
}

const c = (band) => AV_CAS[band] || AV_CAS.WHITE;

// ── CAS instrument panel ──────────────────────────────────────────────────────
function CasPanel({ counts }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      {AV_CAS_ORDER.map((k) => {
        const cc = AV_CAS[k];
        const n = counts?.[k] ?? 0;
        const muted = n === 0;
        return (
          <div key={k} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999,
            background: muted ? "#f8fafc" : cc.bg, border: `1px solid ${muted ? "#e2e8f0" : cc.border}`, opacity: muted ? 0.5 : 1,
          }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: cc.dot }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: muted ? "#94a3b8" : cc.text, textTransform: "capitalize" }}>
              {AV_CAS_LABELS[k]}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: muted ? "#cbd5e1" : cc.dot, minWidth: 18, textAlign: "center", borderRadius: 999, padding: "1px 6px" }}>{n}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Block components ──────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.35)", letterSpacing: "0.05em", textTransform: "uppercase", margin: "4px 0 10px" }}>{children}</div>
);

function Heroes({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`, gap: 12, marginBottom: 18 }}>
      {items.map((v, i) => { const cc = c(v.band); return (
        <div key={i} style={{ padding: "16px 14px", borderRadius: 12, textAlign: "center", background: cc.bg, border: `1.5px solid ${cc.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: cc.text, marginBottom: 4 }}>{v.title}</div>
          <div style={{ fontSize: 12, color: cc.text, opacity: 0.85, lineHeight: 1.4 }}>{v.detail}</div>
        </div>
      ); })}
    </div>
  );
}

function Kpis({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 18 }}>
      {items.map((k, i) => { const cc = c(k.band); return (
        <div key={i} style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 10, padding: "14px" }}>
          <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{k.label}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: cc.text }}>{k.value}</div>
        </div>
      ); })}
    </div>
  );
}

function Flags({ items }) {
  const sorted = [...items].sort((a, b) => AV_CAS_ORDER.indexOf(a.band) - AV_CAS_ORDER.indexOf(b.band));
  return (
    <div style={{ marginBottom: 18 }}>
      <SectionTitle>CAS flags</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((f, i) => { const cc = c(f.band); return (
          <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: cc.bg, borderLeft: `3px solid ${cc.dot}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: cc.text }}>{f.title}</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 2, lineHeight: 1.4 }}>{f.detail}</div>
          </div>
        ); })}
      </div>
    </div>
  );
}

function Cards({ items }) {
  return (
    <div style={{ marginBottom: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((card, i) => { const cc = c(card.band); return (
        <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: cc.bg, border: `1px solid ${cc.border}` }}>
          {card.label && <div style={{ fontSize: 10, fontWeight: 700, color: cc.text, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{card.label}</div>}
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{card.title}</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.5 }}>{card.detail}</div>
          {card.action && <div style={{ fontSize: 12, fontWeight: 600, color: "#0284c7", marginTop: 8 }}>{card.action} →</div>}
        </div>
      ); })}
    </div>
  );
}

// Simple table — cols: string[], rows: string[][]. Each row optionally starts
// with a CAS band key as a special first cell to color the left border.
function AvTable({ title, cols, rows }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {title && <SectionTitle>{title}</SectionTitle>}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, 1fr)`, background: "#0f172a", color: "#fff", fontSize: 11, fontWeight: 600 }}>
          {cols.map((col, i) => <div key={i} style={{ padding: "8px 10px" }}>{col}</div>)}
        </div>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, 1fr)`, fontSize: 12, borderTop: "1px solid #f1f5f9", background: i % 2 ? "#fafafa" : "#fff" }}>
            {row.map((cell, j) => {
              const isStatus = j === cols.length - 1 && typeof cell === "string" && (cell === "GROUNDED" || cell === "En route" || cell === "Airborne" || cell === "Pending WX");
              const statusColor = cell === "GROUNDED" ? "#b91c1c" : cell === "En route" || cell === "Airborne" ? "#15803d" : "#b45309";
              return (
                <div key={j} style={{ padding: "8px 10px", color: isStatus ? statusColor : "#334155", fontWeight: isStatus ? 700 : 400 }}>
                  {cell}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Prose({ items }) {
  return (
    <div style={{ marginBottom: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((s, i) => { const cc = c(s.band); return (
        <div key={i} style={{ padding: "12px 14px", borderRadius: 8, background: cc.bg, borderLeft: `3px solid ${cc.dot}` }}>
          {s.title && <div style={{ fontSize: 13, fontWeight: 600, color: cc.text, marginBottom: 4 }}>{s.title}</div>}
          <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.55 }}>{s.text}</div>
        </div>
      ); })}
    </div>
  );
}

function Block({ block }) {
  switch (block.type) {
    case "heroes":  return <Heroes items={block.items} />;
    case "kpis":    return <Kpis items={block.items} />;
    case "flags":   return <Flags items={block.items} />;
    case "cards":   return <Cards items={block.items} />;
    case "table":   return <AvTable title={block.title} cols={block.cols} rows={block.rows} />;
    case "prose":   return <Prose items={block.items} />;
    case "map":
      return (
        <div style={{ marginBottom: 18 }}>
          <MapCard resolved={{ address: block.address, region: block.region, mapType: block.mapType, sectionLabel: block.sectionLabel }} />
        </div>
      );
    default: return null;
  }
}

// ── Live data fetch config ────────────────────────────────────────────────────
// Maps workerSlug + tabId → fetch params.
// mapConfig (optional): appends a route/area map block after weather blocks.
const LIVE_TABS = {
  // Fleet workers — operator-wide views (PAP Florida routes)
  "av-dispatch": {
    "weather-map":      { kind: "weather",  ids: "KTLH,KGNV,KOCF,KMCO,KTPA",
                          mapConfig: { address: "Tallahassee, FL", sectionLabel: "Corridor: KTLH → KTPA → KMCO" } },
    "notam":            { kind: "notams",   locations: "KTLH,KMCO" },
    "flight-following": { kind: "traffic",  lat: 28.5, lon: -82.5, dist: 400 },
  },
  "av-aircraft": {
    "squawks": { kind: "squawks" },
  },
  // Personal workers — owner-operator (Las Vegas home base: KLAS/KVGT)
  "av-copilot-001": {
    "dashboard":  { kind: "currency" },
    "preflight":  { kind: "weather", ids: "KLAS,KPHX,KLAX",
                    mapConfig: { address: "Las Vegas, NV", sectionLabel: "Route: KLAS → KLAX · IFR FL230" } },
    "logbook":    { kind: "logbook" },
  },
  "av-mx-001": {
    "squawks": { kind: "squawks" },
  },
  "av-dispatch-001": {
    "trip-package": { kind: "weather", ids: "KLAS,KPHX,KLAX",
                      mapConfig: { address: "Las Vegas, NV", sectionLabel: "Route: KLAS → KLAX" } },
  },
  "av-ground-school-001": {
    "quiz-zone": { kind: "currency" },
  },
};

// ── Main component ────────────────────────────────────────────────────────────
export default function AviationWorkerCanvas({ workerSlug }) {
  const spec = getAvCanvas(workerSlug);
  const [activeTab, setActiveTab] = useState(null);
  const [liveBlocks, setLiveBlocks] = useState({});
  const [loading, setLoading] = useState({});
  const pollingRef = useRef(null);

  const currentTabId = activeTab || spec?.tabs[0]?.id;

  useEffect(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (!workerSlug || !currentTabId) return;
    const cfg = LIVE_TABS[workerSlug]?.[currentTabId];
    if (!cfg) return;

    const key = `${workerSlug}|${currentTabId}`;

    async function fetchLive() {
      setLoading(prev => ({ ...prev, [key]: true }));
      try {
        let blocks = null;
        if (cfg.kind === "weather") {
          const data = await apiGet(`/v1/aviation:weather?ids=${cfg.ids}`);
          if (data.metars?.length) {
            blocks = weatherToBlocks(data.metars);
            if (cfg.mapConfig && blocks) blocks.push({ type: "map", ...cfg.mapConfig });
          }
        } else if (cfg.kind === "notams") {
          const data = await apiGet(`/v1/aviation:notams?locations=${cfg.locations}`);
          const allNotams = (data.airports || []).flatMap(a => a.notams || []);
          if (allNotams.length) {
            const relevant = allNotams.filter(n =>
              !n.text?.toLowerCase().includes("light") && !n.text?.toLowerCase().includes("obstruction")
            ).slice(0, 8);
            if (relevant.length) {
              blocks = [{ type: "cards", items: relevant.map(n => ({
                band: n.text?.toLowerCase().includes("ils") || n.text?.toLowerCase().includes("rwy") ? "YELLOW" : "BLUE",
                label: n.airport || n.location || "NOTAM",
                title: n.notamId || n.id || "NOTAM",
                detail: n.text || n.message || JSON.stringify(n).slice(0, 120),
              })) }];
            }
          }
        } else if (cfg.kind === "traffic") {
          const data = await apiGet(`/v1/aviation:traffic?lat=${cfg.lat}&lon=${cfg.lon}&dist=${cfg.dist}`);
          if (data.aircraft) blocks = trafficToBlocks(data.aircraft);
        } else if (cfg.kind === "logbook") {
          const data = await apiGet(`/v1/logbook:list`);
          if (data.entries) blocks = logbookToBlocks(data.entries);
        } else if (cfg.kind === "currency") {
          const data = await apiGet(`/v1/pilot:currency`);
          if (data.currency) blocks = currencyToBlocks(data.currency);
        } else if (cfg.kind === "squawks") {
          const tenantId = typeof localStorage !== "undefined" ? localStorage.getItem("TENANT_ID") : null;
          if (!tenantId || tenantId === "vault") {
            blocks = [{ type: "text", content: "Open an operator workspace to view squawks." }];
          } else {
            const qs = `?tenantId=${encodeURIComponent(tenantId)}`;
            const data = await apiGet(`/v1/aviation:squawks${qs}`);
            if (data.squawks) blocks = squawksToBlocks(data.squawks);
          }
        }
        if (blocks) setLiveBlocks(prev => ({ ...prev, [key]: blocks }));
      } catch (e) {
        console.warn(`Aviation live fetch failed (${cfg.kind}):`, e.message);
      }
      setLoading(prev => ({ ...prev, [key]: false }));
    }

    fetchLive();
    // Poll flight following every 60s; cancel when tab changes
    if (cfg.kind === "traffic") {
      pollingRef.current = setInterval(fetchLive, 60_000);
    }
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [workerSlug, currentTabId]);

  if (!spec) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
        No canvas data for {workerSlug}. Ask Alex to run a briefing.
      </div>
    );
  }

  const tab = spec.tabs.find((t) => t.id === currentTabId) || spec.tabs[0];
  const liveKey = `${workerSlug}|${currentTabId}`;
  const isLiveTab = !!LIVE_TABS[workerSlug]?.[currentTabId];
  const tabBlocks = liveBlocks[liveKey] || tab?.blocks || [];

  return (
    <div style={{ padding: "20px 20px 40px", fontFamily: "'Inter', sans-serif", maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{spec.title}</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>{spec.subtitle}</span>
        </div>
        {spec.disclaimer && (
          <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>{spec.disclaimer}</div>
        )}
      </div>

      {/* CAS instrument panel */}
      <CasPanel counts={spec.cas} />

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #e2e8f0", paddingBottom: 0 }}>
        {spec.tabs.map((t) => {
          const active = t.id === currentTabId;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "8px 14px", fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? "#0284c7" : "#64748b", background: "none", border: "none",
                borderBottom: active ? "2px solid #0284c7" : "2px solid transparent",
                cursor: "pointer", marginBottom: -1, transition: "color 0.15s",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab description blurb */}
      {tab?.description && (
        <TabDescription slug={workerSlug} tabId={tab.id} description={tab.description} />
      )}

      {/* Live data indicator */}
      {isLiveTab && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 11, color: "#64748b" }}>
          {loading[liveKey]
            ? <><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#d97706", display: "inline-block" }} /> Fetching live data…</>
            : liveBlocks[liveKey]
              ? <><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} /> Live data · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
              : <><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#94a3b8", display: "inline-block" }} /> Showing sample data</>
          }
        </div>
      )}

      {/* Tab blocks */}
      {tabBlocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}
