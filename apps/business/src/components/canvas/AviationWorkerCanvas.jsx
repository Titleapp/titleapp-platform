// AviationWorkerCanvas.jsx — Data-driven canvas for aviation workers.
// Follows the same CAS-panel + tab-bar + block-renderer pattern as
// RealEstateWorkerCanvas.jsx. Data from aviationCanvasData.js.
// CODEX 61 Phase 2: live data for weather/NOTAM/logbook tabs.

import React, { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { getAvCanvas, AV_CAS, AV_CAS_ORDER, AV_CAS_LABELS } from "./aviationCanvasData";
import MapCard from "./MapCard";
import TabDescription from "./TabDescription";
import AviationMap from "./AviationMap";
import AviationCharts from "./AviationCharts";
import SyntheticPFD from "./SyntheticPFD";
import AviationNearest from "./AviationNearest";
import AviationQRH from "./AviationQRH";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiGet(path) {
  const auth = getAuth();
  const token = auth.currentUser ? await auth.currentUser.getIdToken(false).catch(() => null) : null;
  const tenantId = typeof localStorage !== "undefined" ? localStorage.getItem("TENANT_ID") : null;
  const url = `${API_BASE}/api?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId && tenantId !== "vault" ? { "X-Tenant-Id": tenantId } : {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// 2026-08-21 gap-audit fix — POST helper for the "+ Log Flight" and
// "+ Release Flight" buttons below. Mirrors apiGet's auth/tenant headers.
async function apiPost(path, payload) {
  const auth = getAuth();
  const token = auth.currentUser ? await auth.currentUser.getIdToken(false).catch(() => null) : null;
  const tenantId = typeof localStorage !== "undefined" ? localStorage.getItem("TENANT_ID") : null;
  const url = `${API_BASE}/api?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId && tenantId !== "vault" ? { "X-Tenant-Id": tenantId } : {}),
    },
    body: JSON.stringify(payload || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || json.message || `Request failed (${res.status})`);
  return json;
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
    items: [{ band: "GREEN", label: "NO OPEN SQUAWKS", title: "Fleet is clean", detail: "No squawks on file. File a new squawk by telling Alex: 'File a squawk on N701AA — [describe the issue].' It goes into the aircraft record immediately.", action: "Open chat" }],
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
  blocks.push({ type: "cards", items: [{ band: "BLUE", label: "LOG A SQUAWK", title: "Tell Alex about any discrepancy", detail: "Say: 'File a squawk on N701AA — [describe the issue].' Alex creates a timestamped entry and notifies MX. Immutable once filed.", action: "Open chat" }] });
  return blocks;
}

// Real per-tail airworthiness from services/mx/airworthinessTracker.js
// (computeAirworthiness), fetched via GET /v1/mx:listAircraft. Replaces the
// static "AIRWORTHY · PC-12/47E ... 1,847 TTSN" hero block that was the same
// hardcoded fixture for every user, forever.
function airworthinessToBlocks(fleet) {
  const list = fleet || [];
  if (!list.length) {
    return [{
      type: "cards",
      items: [{ band: "BLUE", label: "NO AIRCRAFT ON FILE", title: "Add your first aircraft", detail: "Tell Alex the tail number, type, and current hours — or say 'add N701AA, PC-12/47E' to get started. Nothing here is real yet, so nothing is assumed airworthy.", action: "Open chat" }],
    }];
  }
  const bandFor = { GREEN: "GREEN", YELLOW: "YELLOW", RED: "RED", UNVERIFIED: "BLUE" };
  const heroes = list.map(a => ({
    band: bandFor[a.status] || "BLUE",
    title: `${a.status} · ${a.tailNumber || "Unknown tail"}${a.type ? " · " + a.type : ""}`,
    detail: a.summary || "",
  }));
  const flags = [];
  list.forEach(a => {
    (a.blockingItems || []).forEach(item => flags.push({ band: "RED", title: a.tailNumber || "Unknown tail", detail: item }));
  });
  const rows = list.map(a => [
    a.tailNumber || "—",
    a.type || "—",
    a.status,
    String((a.openSquawks || []).length),
    a.inspection?.detail || "—",
    a.adCompliance?.status || "—",
  ]);
  const blocks = [{ type: "heroes", items: heroes }];
  if (flags.length) blocks.push({ type: "flags", items: flags });
  blocks.push({ type: "table", title: "Fleet — live from Firestore", cols: ["Tail", "Type", "Status", "Open squawks", "Inspection", "AD status"], rows });
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

// Extract the "Say: '...'" prompt from a card's detail text.
function extractSayPrompt(detail) {
  const m = (detail || "").match(/Say:\s*['"](.+?)['"]/);
  return m ? m[1] : null;
}

function Cards({ items, onTabSwitch, onChatFill }) {
  return (
    <div style={{ marginBottom: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((card, i) => {
        const cc = c(card.band);
        const sayPrompt = extractSayPrompt(card.detail);

        function handleAction() {
          if (!card.action) return;
          if (card.action === "Open course" && onTabSwitch) {
            onTabSwitch("active-course");
          } else if (
            (card.action === "Start quiz" || card.action === "Start lesson" || card.action === "Study with Skye") &&
            sayPrompt
          ) {
            window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: sayPrompt } }));
            if (onChatFill) onChatFill(sayPrompt);
          }
        }

        const isClickable = card.action === "Open course" ||
          ((card.action === "Start quiz" || card.action === "Start lesson" || card.action === "Study with Skye") && sayPrompt);

        return (
          <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: cc.bg, border: `1px solid ${cc.border}` }}>
            {card.label && <div style={{ fontSize: 10, fontWeight: 700, color: cc.text, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{card.label}</div>}
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{card.title}</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.5 }}>{card.detail}</div>
            {card.action && (
              isClickable ? (
                <button
                  onClick={handleAction}
                  style={{
                    marginTop: 10, padding: "5px 14px", fontSize: 12, fontWeight: 700,
                    background: "#0284c7", color: "#fff", border: "none",
                    borderRadius: 6, cursor: "pointer",
                  }}
                >
                  {card.action} →
                </button>
              ) : (
                <div style={{ fontSize: 12, fontWeight: 600, color: "#0284c7", marginTop: 8 }}>{card.action} →</div>
              )
            )}
          </div>
        );
      })}
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

function Block({ block, onTabSwitch, onChatFill }) {
  switch (block.type) {
    case "heroes":  return <Heroes items={block.items} />;
    case "kpis":    return <Kpis items={block.items} />;
    case "flags":   return <Flags items={block.items} />;
    case "cards":   return <Cards items={block.items} onTabSwitch={onTabSwitch} onChatFill={onChatFill} />;
    case "table":   return <AvTable title={block.title} cols={block.cols} rows={block.rows} />;
    case "prose":   return <Prose items={block.items} />;
    case "map":
      return (
        <div style={{ marginBottom: 18 }}>
          <MapCard resolved={{ address: block.address, region: block.region, mapType: block.mapType, sectionLabel: block.sectionLabel }} />
        </div>
      );
    case "aviationMap":
      return (
        <div style={{ marginBottom: 18, marginLeft: -20, marginRight: -20 }}>
          <AviationMap
            center={block.center || [20.5, -157.0]}
            zoom={block.zoom || 7}
            height={block.height || 560}
            icaos={block.icaos || ["PHOG", "PHNL", "PHKO", "PHTO", "PHNY", "PHJH"]}
            fleetTails={block.fleetTails || []}
            compact={false}
          />
        </div>
      );
    case "aviationCharts":
      return <div style={{ marginBottom: 18 }}><AviationCharts /></div>;
    case "syntheticPfd":
      return <div style={{ marginBottom: 18 }}><SyntheticPFD /></div>;
    case "nearest":
      return <div style={{ marginBottom: 18 }}><AviationNearest /></div>;
    case "aviationQrh":
      return <div style={{ marginBottom: 18 }}><AviationQRH initialProcedureId={block.procedureId} /></div>;
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
    "aircraft": { kind: "airworthiness" },
    "squawks": { kind: "squawks" },
  },
  "av-dispatch-001": {
    // Was "trip-package" — that tab id doesn't exist in this worker's spec
    // (real tabs are fleet-map/schedule/crew/pax-manifest/aircraft-status/
    // notams), so this never fired. aircraft-status is the real target —
    // same real MX data MX Tracker now reads, so Dispatch can't show a
    // different airworthiness answer than the record it's supposed to defer to.
    "aircraft-status": { kind: "airworthiness" },
  },
  "av-ground-school-001": {
    "quiz-zone": { kind: "currency" },
  },
};

// ─────────────────────────────────────────────────────────────────────────
// LogFlightModal — 2026-08-21 gap-audit fix (2a). Surfaces the pilot's own
// flight-logging as a first-class action on the CoPilot worker canvas
// instead of leaving it buried as a generic Alex Chief-of-Staff chat tool.
// Calls POST /v1/logbook:flight:add (capability aviation.log_flight_v1) —
// same aviation.flight write shape as the existing chat-based log_flight
// tool. Visual pattern matches Contacts.jsx's ManualAddModal.
// ─────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function LogFlightModal({ onClose, onLogged }) {
  const [form, setForm] = useState({
    tailNumber: "", date: new Date().toISOString().slice(0, 10), depIcao: "", arrIcao: "",
    flightTime: "", picTime: "", nightTime: "", instrumentTime: "", approachCount: "",
    flightType: "part91", businessPurpose: "", remarks: "",
  });
  const [status, setStatus] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const fieldStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };
  const required = form.tailNumber.trim() && form.date && form.depIcao.trim() && form.arrIcao.trim() && form.flightTime;

  async function run() {
    if (!required) return;
    setStatus({ state: "running" });
    try {
      const j = await apiPost("/v1/logbook:flight:add", {
        tailNumber: form.tailNumber.trim().toUpperCase(),
        date: form.date,
        depIcao: form.depIcao.trim().toUpperCase(),
        arrIcao: form.arrIcao.trim().toUpperCase(),
        flightTime: Number(form.flightTime),
        picTime: form.picTime ? Number(form.picTime) : undefined,
        nightTime: form.nightTime ? Number(form.nightTime) : undefined,
        instrumentTime: form.instrumentTime ? Number(form.instrumentTime) : undefined,
        approachCount: form.approachCount ? Number(form.approachCount) : undefined,
        flightType: form.flightType,
        businessPurpose: form.businessPurpose || undefined,
        remarks: form.remarks || undefined,
      });
      setStatus({ state: "done", entryId: j.entryId });
    } catch (e) {
      setStatus({ state: "error", message: e.message });
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 92vw)", maxHeight: "90vh", overflowY: "auto", padding: 24, background: "white", borderRadius: 12 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Log a flight</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          Appends an immutable entry to your personal Vault logbook. Cannot be edited after logging.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={labelStyle}>Tail number *</label><input style={fieldStyle} value={form.tailNumber} onChange={(e) => set("tailNumber", e.target.value)} placeholder="N701AA" /></div>
          <div><label style={labelStyle}>Date *</label><input type="date" style={fieldStyle} value={form.date} onChange={(e) => set("date", e.target.value)} /></div>
          <div><label style={labelStyle}>Departure ICAO *</label><input style={fieldStyle} value={form.depIcao} onChange={(e) => set("depIcao", e.target.value)} placeholder="KLAS" /></div>
          <div><label style={labelStyle}>Arrival ICAO *</label><input style={fieldStyle} value={form.arrIcao} onChange={(e) => set("arrIcao", e.target.value)} placeholder="KPHX" /></div>
          <div><label style={labelStyle}>Total flight time (hrs) *</label><input type="number" step="0.1" style={fieldStyle} value={form.flightTime} onChange={(e) => set("flightTime", e.target.value)} placeholder="2.1" /></div>
          <div><label style={labelStyle}>PIC time (hrs)</label><input type="number" step="0.1" style={fieldStyle} value={form.picTime} onChange={(e) => set("picTime", e.target.value)} placeholder="defaults to total" /></div>
          <div><label style={labelStyle}>Night time (hrs)</label><input type="number" step="0.1" style={fieldStyle} value={form.nightTime} onChange={(e) => set("nightTime", e.target.value)} /></div>
          <div><label style={labelStyle}>Instrument time (hrs)</label><input type="number" step="0.1" style={fieldStyle} value={form.instrumentTime} onChange={(e) => set("instrumentTime", e.target.value)} /></div>
          <div><label style={labelStyle}>Approaches</label><input type="number" style={fieldStyle} value={form.approachCount} onChange={(e) => set("approachCount", e.target.value)} /></div>
          <div>
            <label style={labelStyle}>Flight type *</label>
            <select style={fieldStyle} value={form.flightType} onChange={(e) => set("flightType", e.target.value)}>
              <option value="part91">Part 91</option>
              <option value="part135">Part 135</option>
              <option value="training">Training</option>
              <option value="checkride">Checkride</option>
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Business purpose</label><input style={fieldStyle} value={form.businessPurpose} onChange={(e) => set("businessPurpose", e.target.value)} placeholder="optional — IRS-required if claiming business use" /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>Remarks</label><textarea rows={2} style={{ ...fieldStyle, fontFamily: "inherit", resize: "vertical" }} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} /></div>
        </div>
        {status?.state === "error" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8 }}>{status.message}</div>}
        {status?.state === "done" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#16a34a", background: "#f0fdf4", borderRadius: 8 }}>Flight logged. Entry ID: {status.entryId}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 13, background: "white", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>Close</button>
          {status?.state === "done" ? (
            <button onClick={onLogged} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Done</button>
          ) : (
            <button onClick={run} disabled={!required || status?.state === "running"} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", opacity: (!required || status?.state === "running") ? 0.5 : 1 }}>
              {status?.state === "running" ? "Logging…" : "Log flight"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ReleaseFlightModal — 2026-08-21 gap-audit fix (2b). Dispatch/releasing
// authority issues a flight release BEFORE a pilot may fly it — a distinct,
// prerequisite action from the pilot's own log_flight, per Sean: "Dispatch
// has to issue the flight in a Part 135 (or even 91) operation before the
// pilot can do so." Calls POST /v1/aviation:dispatch:releaseFlight
// (capability aviation.dispatch_release_flight_v1), writing flightReleases.
// This does NOT gate or reference log_flight in any way — that link is an
// open design question, intentionally left undecided here.
// ─────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function ReleaseFlightModal({ onClose, onReleased }) {
  const [form, setForm] = useState({
    tailNumber: "", aircraft: "", depIcao: "", arrIcao: "", proposedDepartureTime: "",
    pic: "", sic: "", operationType: "part135", weatherBriefingAcknowledged: false,
    weightBalanceAcknowledged: false, fuelLoad: "", releasingAuthority: "",
  });
  const [status, setStatus] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const fieldStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };
  const required = form.tailNumber.trim() && form.depIcao.trim() && form.arrIcao.trim() && form.proposedDepartureTime
    && form.pic.trim() && form.operationType && form.releasingAuthority.trim() && form.fuelLoad
    && form.weatherBriefingAcknowledged && form.weightBalanceAcknowledged;

  async function run() {
    if (!required) return;
    setStatus({ state: "running" });
    try {
      const j = await apiPost("/v1/aviation:dispatch:releaseFlight", {
        tailNumber: form.tailNumber.trim().toUpperCase(),
        aircraft: form.aircraft.trim() || undefined,
        depIcao: form.depIcao.trim().toUpperCase(),
        arrIcao: form.arrIcao.trim().toUpperCase(),
        proposedDepartureTime: form.proposedDepartureTime,
        pic: form.pic.trim(),
        sic: form.sic.trim() || undefined,
        operationType: form.operationType,
        weatherBriefingAcknowledged: form.weatherBriefingAcknowledged,
        weightBalanceAcknowledged: form.weightBalanceAcknowledged,
        fuelLoad: form.fuelLoad,
        releasingAuthority: form.releasingAuthority.trim(),
      });
      setStatus({ state: "done", releaseId: j.releaseId });
    } catch (e) {
      setStatus({ state: "error", message: e.message });
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "min(600px, 92vw)", maxHeight: "90vh", overflowY: "auto", padding: 24, background: "white", borderRadius: 12 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Release a flight</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          Formal dispatch release — required for Part 135 operational control (14 CFR 135.77 and neighboring sections) before departure.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={labelStyle}>Tail number *</label><input style={fieldStyle} value={form.tailNumber} onChange={(e) => set("tailNumber", e.target.value)} placeholder="N701AA" /></div>
          <div><label style={labelStyle}>Aircraft type</label><input style={fieldStyle} value={form.aircraft} onChange={(e) => set("aircraft", e.target.value)} placeholder="PC-12/47E" /></div>
          <div><label style={labelStyle}>Departure ICAO *</label><input style={fieldStyle} value={form.depIcao} onChange={(e) => set("depIcao", e.target.value)} placeholder="PHOG" /></div>
          <div><label style={labelStyle}>Destination ICAO *</label><input style={fieldStyle} value={form.arrIcao} onChange={(e) => set("arrIcao", e.target.value)} placeholder="PHNL" /></div>
          <div><label style={labelStyle}>Proposed departure (UTC) *</label><input type="datetime-local" style={fieldStyle} value={form.proposedDepartureTime} onChange={(e) => set("proposedDepartureTime", e.target.value)} /></div>
          <div>
            <label style={labelStyle}>Operation type *</label>
            <select style={fieldStyle} value={form.operationType} onChange={(e) => set("operationType", e.target.value)}>
              <option value="part135">Part 135</option>
              <option value="part91">Part 91</option>
            </select>
          </div>
          <div><label style={labelStyle}>PIC *</label><input style={fieldStyle} value={form.pic} onChange={(e) => set("pic", e.target.value)} placeholder="Rivera A." /></div>
          <div><label style={labelStyle}>SIC</label><input style={fieldStyle} value={form.sic} onChange={(e) => set("sic", e.target.value)} placeholder="optional" /></div>
          <div><label style={labelStyle}>Fuel load *</label><input style={fieldStyle} value={form.fuelLoad} onChange={(e) => set("fuelLoad", e.target.value)} placeholder="280 gal" /></div>
          <div><label style={labelStyle}>Releasing authority *</label><input style={fieldStyle} value={form.releasingAuthority} onChange={(e) => set("releasingAuthority", e.target.value)} placeholder="Dispatcher name" /></div>
        </div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155" }}>
            <input type="checkbox" checked={form.weatherBriefingAcknowledged} onChange={(e) => set("weatherBriefingAcknowledged", e.target.checked)} />
            Weather briefing obtained and acknowledged *
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155" }}>
            <input type="checkbox" checked={form.weightBalanceAcknowledged} onChange={(e) => set("weightBalanceAcknowledged", e.target.checked)} />
            Weight & balance computed and within limits *
          </label>
        </div>
        {status?.state === "error" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8 }}>{status.message}</div>}
        {status?.state === "done" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#16a34a", background: "#f0fdf4", borderRadius: 8 }}>Flight released. Release ID: {status.releaseId}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 13, background: "white", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>Close</button>
          {status?.state === "done" ? (
            <button onClick={onReleased} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Done</button>
          ) : (
            <button onClick={run} disabled={!required || status?.state === "running"} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", opacity: (!required || status?.state === "running") ? 0.5 : 1 }}>
              {status?.state === "running" ? "Releasing…" : "Release flight"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AviationWorkerCanvas({ workerSlug }) {
  const spec = getAvCanvas(workerSlug);
  const [activeTab, setActiveTab] = useState(null);
  const [liveBlocks, setLiveBlocks] = useState({});
  const [loading, setLoading] = useState({});
  const pollingRef = useRef(null);
  // 2026-08-21 gap-audit fix — "+ Log Flight" (CoPilot) / "+ Release Flight" (Dispatch)
  const [showLogFlight, setShowLogFlight] = useState(false);
  const [showReleaseFlight, setShowReleaseFlight] = useState(false);
  const isCopilotWorker = (workerSlug || "").startsWith("av-copilot");
  const isDispatchWorker = (workerSlug || "").startsWith("av-dispatch");

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
        } else if (cfg.kind === "airworthiness") {
          const data = await apiGet(`/v1/mx:listAircraft`);
          if (data.fleet) blocks = airworthinessToBlocks(data.fleet);
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
        No canvas data for {workerSlug}. Ask Skye to run a briefing.
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
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{spec.title}</span>
              <span style={{ fontSize: 12, color: "#64748b" }}>{spec.subtitle}</span>
            </div>
            {spec.disclaimer && (
              <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>{spec.disclaimer}</div>
            )}
          </div>
          {/* 2026-08-21 gap-audit fix — prominent primary actions, matching
              Contacts.jsx's "+ Add Contacts" purple-gradient button pattern. */}
          {isCopilotWorker && (
            <button
              type="button"
              onClick={() => setShowLogFlight(true)}
              style={{ flexShrink: 0, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "white", background: "linear-gradient(135deg, #0284c7, #0369a1)", border: "none", borderRadius: 8, cursor: "pointer" }}
            >
              + Log Flight
            </button>
          )}
          {isDispatchWorker && (
            <button
              type="button"
              onClick={() => setShowReleaseFlight(true)}
              style={{ flexShrink: 0, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "white", background: "linear-gradient(135deg, #0284c7, #0369a1)", border: "none", borderRadius: 8, cursor: "pointer" }}
            >
              + Release Flight
            </button>
          )}
        </div>
      </div>

      {showLogFlight && <LogFlightModal onClose={() => setShowLogFlight(false)} onLogged={() => setShowLogFlight(false)} />}
      {showReleaseFlight && <ReleaseFlightModal onClose={() => setShowReleaseFlight(false)} onReleased={() => setShowReleaseFlight(false)} />}

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
        <Block key={i} block={block} onTabSwitch={setActiveTab} onChatFill={null} />
      ))}
    </div>
  );
}
