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
import WeightBalanceCalculator from "./WeightBalanceCalculator";
import { getAircraftTypeProfile } from "./aircraftTypeProfiles";

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

// AD/SB tab — per-tail airworthiness-directive detail. Same /v1/mx:listAircraft
// payload as airworthinessToBlocks (computeAirworthiness already returns
// adCompliance.items per tail), just rendered as the AD-specific breakdown
// instead of the one-line fleet summary. Per AV-M-HS-02, absence of records
// is not a basis to assume compliance — UNVERIFIED items render as such, not
// as a blank/green row.
function adComplianceToBlocks(fleet) {
  const list = fleet || [];
  if (!list.length) {
    return [{
      type: "cards",
      items: [{ band: "BLUE", label: "NO AIRCRAFT ON FILE", title: "Add your first aircraft", detail: "Tell Alex the tail number and type to get started — AD compliance can't be tracked without an aircraft record.", action: "Open chat" }],
    }];
  }
  const bandFor = { GREEN: "GREEN", YELLOW: "YELLOW", RED: "RED", UNVERIFIED: "BLUE" };
  const heroes = list.map(a => ({
    band: bandFor[a.adCompliance?.status] || "BLUE",
    title: `${a.tailNumber || "Unknown tail"} — AD status: ${a.adCompliance?.status || "UNVERIFIED"}`,
    detail: a.adCompliance?.detail || (a.adCompliance?.items?.length ? `${a.adCompliance.items.length} AD(s) on file` : "No AD compliance records on file — cannot assert compliance"),
  }));
  const rows = [];
  list.forEach(a => {
    (a.adCompliance?.items || []).forEach(item => {
      rows.push([
        a.tailNumber || "—",
        item.ad || item.adNumber || "—",
        item.subject || item.description || "—",
        item.compliantAsOf || "—",
        item.nextDue || "—",
        item.status || "UNVERIFIED",
      ]);
    });
  });
  const blocks = [{ type: "heroes", items: heroes }];
  if (rows.length) {
    blocks.push({ type: "table", title: "AD compliance — live from Firestore", cols: ["Tail", "AD #", "Subject", "Compliant as of", "Next due", "Status"], rows });
  } else {
    blocks.push({ type: "prose", items: [{ band: "BLUE", title: "No AD records on file", text: "Add AD compliance entries via Alex or the aircraft upsert form — until then this tab can't show real data, so it shows nothing rather than a fabricated example." }] });
  }
  return blocks;
}

// MX To-Do / Inspections — real scheduled-maintenance items from
// services/mx/airworthinessTracker.js's evaluateMaintenanceItems, flattened
// across the fleet from GET /v1/mx:listAircraft. Backs both the "Scheduled
// MX" and "Inspections" tabs (same real data — Sean's spec asks for both
// "MX to-do" and "inspection tracking"; this generalized list covers both).
function maintenanceScheduleToBlocks(fleet) {
  const list = fleet || [];
  const rows = [];
  list.forEach(a => {
    (a.maintenanceSchedule?.items || []).forEach(item => {
      rows.push([
        a.tailNumber || "—",
        item.description || "—",
        item.basis === "hours" ? "Hours" : "Calendar",
        item.basis === "hours" ? (item.dueAtHours != null ? `${item.dueAtHours} hrs` : "—") : (item.dueDate || "—"),
        item.detail || "—",
        item.mandatory === false ? "Advisory" : "Mandatory",
      ]);
    });
  });
  if (!rows.length) {
    return [{
      type: "cards",
      items: [{ band: "BLUE", label: "NO SCHEDULED ITEMS", title: "Add a scheduled-maintenance item", detail: "Use \"+ Add Maintenance Item\" above to add inspection intervals, phase checks, or recurring due items for a tail. Nothing is fabricated here — this list is empty until real items are added.", action: "Open form" }],
    }];
  }
  const flags = [];
  list.forEach(a => (a.maintenanceSchedule?.items || [])
    .filter(i => i.mandatory !== false && i.computedStatus === "RED")
    .forEach(i => flags.push({ band: "RED", title: `${a.tailNumber} · ${i.description}`, detail: i.detail })));
  const blocks = [];
  if (flags.length) blocks.push({ type: "flags", items: flags });
  blocks.push({ type: "table", title: "Scheduled maintenance — live from Firestore", cols: ["Tail", "Item", "Basis", "Due", "Status", "Priority"], rows });
  return blocks;
}

// MEL tab — every currently-deferred squawk, fleet-wide, with its real
// computed rectification deadline (same evaluateSquawk() computation the
// aircraft tab's airworthiness view uses — see handleListSquawks), MEL
// reference, and operating restrictions. Distinct view of the same real
// squawks collection the Aircraft tab's Corrective Action panel writes to.
function melItemsToBlocks(squawks) {
  const list = (squawks || []).filter(s => s.status === "deferred");
  if (!list.length) return [{
    type: "prose",
    items: [{ band: "GREEN", title: "No active MEL deferrals", text: "Nothing is currently deferred under an MEL category. Deferrals are created from the Aircraft tab's Corrective Action panel (\"Defer (MEL)\")." }],
  }];
  const flags = list
    .filter(s => s.computedStatus === "RED" || s.computedStatus === "YELLOW")
    .map(s => ({ band: s.computedStatus, title: `${s.tailNumber} · MEL ${s.category || "?"}${s.melReference ? ` (${s.melReference})` : ""}`, detail: `${s.description} — ${s.daysRemaining != null ? `${s.daysRemaining} day(s) remaining` : "deadline unverified"}` }));
  const rows = list.map(s => [
    s.tailNumber || "—",
    s.category || "—",
    s.melReference || "—",
    s.description ? s.description.slice(0, 40) + (s.description.length > 40 ? "…" : "") : "—",
    s.restrictions || "—",
    s.daysRemaining != null ? `${s.daysRemaining}d` : "—",
  ]);
  const blocks = [];
  if (flags.length) blocks.push({ type: "flags", items: flags });
  blocks.push({ type: "table", title: "Active MEL deferrals — live from Firestore", cols: ["Tail", "Cat", "MEL Ref", "Discrepancy", "Restrictions", "Remaining"], rows });
  return blocks;
}

// Warranty tab — component/engine/avionics coverage records. Informational
// only (see evaluateWarranties) — never contributes to airworthiness.
function warrantiesToBlocks(fleet) {
  const list = fleet || [];
  const rows = [];
  list.forEach(a => (a.warranties?.items || []).forEach(w => rows.push([
    a.tailNumber || "—",
    w.component || "—",
    w.provider || "—",
    w.coverageType || "—",
    w.expirationDate || (w.expirationHours != null ? `${w.expirationHours} hrs` : "—"),
    w.detail || "—",
  ])));
  if (!rows.length) {
    return [{
      type: "cards",
      items: [{ band: "BLUE", label: "NO WARRANTY RECORDS", title: "Add a warranty or coverage-plan record", detail: "Use \"+ Add Warranty\" above — e.g. engine Eagle Service Plan, avionics factory warranty. Nothing is fabricated here.", action: "Open form" }],
    }];
  }
  const flags = [];
  list.forEach(a => (a.warranties?.items || [])
    .filter(w => w.computedStatus === "RED" || w.computedStatus === "YELLOW")
    .forEach(w => flags.push({ band: w.computedStatus, title: `${a.tailNumber} · ${w.component}`, detail: w.detail })));
  const blocks = [];
  if (flags.length) blocks.push({ type: "flags", items: flags });
  blocks.push({ type: "table", title: "Warranty / coverage — live from Firestore", cols: ["Tail", "Component", "Provider", "Coverage", "Expires", "Status"], rows });
  blocks.push({ type: "prose", items: [{ band: "BLUE", title: "Informational only", text: "Warranty expiration is a cost/coverage concern, not a safety one — it never contributes to this aircraft's airworthiness status." }] });
  return blocks;
}

// NEF tab — equipment NOT installed that would otherwise be required
// (documented absence, per CODEX 40 §4). Pure documentation; no status.
function nefItemsToBlocks(fleet) {
  const list = fleet || [];
  const rows = [];
  list.forEach(a => (a.nefItems || []).forEach(n => rows.push([
    a.tailNumber || "—",
    n.equipment || "—",
    n.reason || "—",
    n.authorizationRef || "—",
    n.documentedBy || "—",
    n.documentedAt ? new Date(n.documentedAt).toLocaleDateString() : "—",
  ])));
  if (!rows.length) {
    return [{
      type: "cards",
      items: [{ band: "BLUE", label: "NO NEF ITEMS", title: "Document a negative-equipment item", detail: "Use \"+ Add NEF Item\" above for equipment intentionally not installed that would otherwise be required. Distinct from MEL — this is what was never installed, not what broke.", action: "Open form" }],
    }];
  }
  return [{ type: "table", title: "Negative Equipment List — live from Firestore", cols: ["Tail", "Equipment", "Reason", "Authorization", "Documented by", "Date"], rows }];
}

// Real flight-release history — GET /v1/aviation:dispatch:releases, backing
// POST /v1/aviation:dispatch:releaseFlight (ReleaseFlightModal above). This
// endpoint existed with no frontend reader before the 2026-09-05
// role-switcher pass; this is the real go/no-go record, not a new fixture.
function releasesToBlocks(releases) {
  const list = releases || [];
  if (!list.length) return [{
    type: "prose",
    items: [{ band: "BLUE", title: "No releases issued yet", text: "Releases appear here as soon as dispatch issues one via \"+ Release Flight\" above." }],
  }];
  const rows = list.slice(0, 20).map(r => [
    r.tailNumber || "—",
    `${r.depIcao || "—"} → ${r.arrIcao || "—"}`,
    r.proposedDepartureTime ? new Date(r.proposedDepartureTime).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—",
    r.pic || "—",
    r.operationType === "part135" ? "Part 135" : "Part 91",
    r.releasingAuthority || "—",
  ]);
  return [
    { type: "kpis", items: [{ label: "Releases on file", value: `${list.length}`, band: "GREEN" }] },
    { type: "table", title: "Flight releases — live from Firestore", cols: ["Tail", "Route", "Proposed dep.", "PIC", "Ops", "Released by"], rows },
  ];
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

// ── Role switcher ─────────────────────────────────────────────────────────
// 2026-09-05 — Pilots / MX / Dispatch are one real fleet record (same tails,
// same squawks, same flight logs), viewed through three role-scoped lenses —
// not three separate apps a user has to leave-and-reopen the worker
// marketplace to reach. This does not change what data each role can see
// (that's still enforced by each worker slug's own tabs/LIVE_TABS config,
// same as before); it just lets a user already on one aviation lens jump to
// another without leaving the canvas. The three real "-001" role slugs are
// the switch targets — not the older fleet-wide "av-aircraft"/"av-dispatch"
// slugs, which predate this pattern and stay reachable only their own way.
const AVIATION_ROLES = [
  { slug: "av-copilot-001",  label: "Pilots" },
  { slug: "av-mx-001",       label: "MX" },
  { slug: "av-dispatch-001", label: "Dispatch" },
];

function RoleSwitcher({ currentSlug, onSwitch }) {
  if (!AVIATION_ROLES.some(r => r.slug === currentSlug)) return null;
  return (
    <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, background: "#f1f5f9", marginBottom: 14, width: "fit-content" }}>
      {AVIATION_ROLES.map(r => {
        const active = r.slug === currentSlug;
        return (
          <button
            key={r.slug}
            type="button"
            onClick={() => onSwitch(r.slug)}
            style={{
              padding: "6px 16px", fontSize: 12.5, fontWeight: 700, borderRadius: 8, border: "none", cursor: "pointer",
              color: active ? "#0f172a" : "#64748b",
              background: active ? "#fff" : "transparent",
              boxShadow: active ? "0 1px 3px rgba(15,23,42,0.15)" : "none",
              transition: "all 0.12s",
            }}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

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
    // 2026-08-30 gap-audit fix — "Dashboard" was already wired to real
    // currency data, but the tab literally labeled "Currency" (fuller
    // compliance-record table) was not — still 100% static demo content
    // (fake FlightSafety-style items: PC12 Flight, CBT Q1-Q4, HUET, etc).
    // Reuses the same real /v1/pilot:currency payload as Dashboard —
    // there's no backend concept of itemized FlightSafety course codes,
    // just the generic FAA personal-currency computation (medical, BFR,
    // IPC, 90-day landings, 6-month approaches/holds, 135 line check) from
    // whatever the pilot has actually logged. See below.
    "currency":   { kind: "currency" },
    "preflight":  { kind: "weather", ids: "KLAS,KPHX,KLAX",
                    mapConfig: { address: "Las Vegas, NV", sectionLabel: "Route: KLAS → KLAX · IFR FL230" } },
    "logbook":    { kind: "logbook" },
  },
  "av-mx-001": {
    "aircraft": { kind: "airworthiness" },
    "squawks": { kind: "squawks" },
    // 2026-08-30 gap-audit fix — the "ADs / SBs" tab was 100% static demo
    // content (aviationCanvasData.js AV_CANVAS fixture), even though
    // computeAirworthiness() already returns real per-tail adCompliance.items
    // from Firestore. Wiring it here instead of inventing a new backend route.
    "ads-sbs": { kind: "adCompliance" },
    // 2026-09-05 MX deep-dive — "MX to-do" (scheduled maintenance / inspection
    // intervals). Both tabs read the same real evaluateMaintenanceItems()
    // list; "inspections" is the FAR-inspection framing of the same data.
    "scheduled-mx": { kind: "maintenanceSchedule" },
    "unscheduled-mx": { kind: "squawks" },
    "inspections": { kind: "maintenanceSchedule" },
    // MEL — fleet-wide view of real active deferrals (see melItemsToBlocks).
    "mel": { kind: "melItems" },
    // Warranty and NEF — both genuinely new; see aircraftRecords.js
    // handleAddWarranty / handleAddNefItem.
    "warranty": { kind: "warranties" },
    "nef": { kind: "nefItems" },
  },
  "av-dispatch-001": {
    // Was "trip-package" — that tab id doesn't exist in this worker's spec
    // (real tabs are fleet-map/schedule/crew/pax-manifest/aircraft-status/
    // notams), so this never fired. aircraft-status is the real target —
    // same real MX data MX Tracker now reads, so Dispatch can't show a
    // different airworthiness answer than the record it's supposed to defer to.
    "aircraft-status": { kind: "airworthiness" },
    // 2026-08-30 gap-audit fix — "notams" was also 100% static demo cards.
    // ICAOs below are Sean's actual Hawaii operating bases (matches the rest
    // of this worker's real content: Aeromed Air, PHOG/PHNL/PHKO/PHTO/PHNY).
    // Next step beyond this pass: derive these from the actual filed trip
    // instead of a fixed list, once Dispatch's Schedule tab is live-wired too.
    "notams": { kind: "notams", locations: "PHOG,PHNL,PHKO,PHTO,PHNY" },
    // 2026-09-05 role-switcher pass — same real METAR source as CoPilot's
    // preflight tab, same ICAO set as this worker's own NOTAMs tab above.
    "weather": { kind: "weather", ids: "PHOG,PHNL,PHKO,PHTO,PHNY" },
    // Real release history — see releasesToBlocks() and the "releases" kind
    // branch below. Reads the same endpoint ReleaseFlightModal writes to.
    "releases": { kind: "releases" },
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
  const [wbResult, setWbResult] = useState(null);
  const [status, setStatus] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const fieldStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };
  // W&B checkbox is only enabled once the calculator has produced a real
  // result — it attests to a computed number, not a blind assertion. If no
  // real limits are configured (anyLimitsConfigured false), still allow the
  // attestation — that mirrors today's behavior (pure trust) rather than
  // blocking release for aircraft without a profile yet.
  const wbReady = !!wbResult && (wbResult.withinLimits || !wbResult.anyLimitsConfigured);
  const aircraftProfile = getAircraftTypeProfile(form.aircraft);
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
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: wbReady ? "#334155" : "#94a3b8" }}>
            <input type="checkbox" checked={form.weightBalanceAcknowledged} disabled={!wbReady} onChange={(e) => set("weightBalanceAcknowledged", e.target.checked)} />
            Weight & balance computed and within limits *{!wbReady && " (compute below first)"}
          </label>
        </div>
        <WeightBalanceCalculator aircraftProfile={aircraftProfile} onResultChange={setWbResult} />
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

// ─────────────────────────────────────────────────────────────────────────
// AddSquawkModal — files a real discrepancy against the aircraft's actual
// record (POST /v1/mx:addSquawk, services/mx/aircraftRecords.js). Before
// this, filing a squawk was chat-only ("tell Alex: 'File a squawk on
// N701AA...'"), matching Log/Release Flight's own pattern of turning a
// buried chat tool into a first-class button.
//
// 2026-09-05 — the two-collection split flagged here previously (this
// modal vs. the read-only "Squawks" tab reading a different, older
// tenants/{tenantId}/squawks collection) is resolved: that older
// collection held zero real documents and has been removed. The Squawks
// tab now reads GET /v1/mx:listSquawks, the same aircraftRecords-based
// source this modal writes to and computeAirworthiness() computes from —
// one source of truth, all three entry methods (chat, this form, and the
// photo path) converge on the same addSquawkCore write.
// ─────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function AddSquawkModal({ onClose, onFiled }) {
  const [form, setForm] = useState({ tailNumber: "", description: "", workOrderNumber: "", reportedBy: "" });
  const [status, setStatus] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const fieldStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };
  const required = form.tailNumber.trim() && form.description.trim();

  async function run() {
    if (!required) return;
    setStatus({ state: "running" });
    try {
      const j = await apiPost("/v1/mx:addSquawk", {
        tailNumber: form.tailNumber.trim().toUpperCase(),
        description: form.description.trim(),
        workOrderNumber: form.workOrderNumber.trim() || undefined,
        reportedBy: form.reportedBy.trim() || undefined,
      });
      setStatus({ state: "done", squawkId: j.squawkId });
    } catch (e) {
      setStatus({ state: "error", message: e.message });
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "min(480px, 92vw)", maxHeight: "90vh", overflowY: "auto", padding: 24, background: "white", borderRadius: 12 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>File a squawk</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          Appends an immutable discrepancy to this aircraft's record — MX sees it immediately.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          <div><label style={labelStyle}>Tail number *</label><input style={fieldStyle} value={form.tailNumber} onChange={(e) => set("tailNumber", e.target.value)} placeholder="N701AA" /></div>
          <div><label style={labelStyle}>Description *</label><textarea rows={3} style={{ ...fieldStyle, fontFamily: "inherit", resize: "vertical" }} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What's wrong, what you observed" /></div>
          <div><label style={labelStyle}>Work order # (optional)</label><input style={fieldStyle} value={form.workOrderNumber} onChange={(e) => set("workOrderNumber", e.target.value)} /></div>
          <div><label style={labelStyle}>Reported by (optional)</label><input style={fieldStyle} value={form.reportedBy} onChange={(e) => set("reportedBy", e.target.value)} placeholder="defaults to you" /></div>
        </div>
        {status?.state === "error" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8 }}>{status.message}</div>}
        {status?.state === "done" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#16a34a", background: "#f0fdf4", borderRadius: 8 }}>Squawk filed. It's open on the aircraft's record now.</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 13, background: "white", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>Close</button>
          {status?.state === "done" ? (
            <button onClick={onFiled} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Done</button>
          ) : (
            <button onClick={run} disabled={!required || status?.state === "running"} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", opacity: (!required || status?.state === "running") ? 0.5 : 1 }}>
              {status?.state === "running" ? "Filing…" : "File squawk"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AddMaintenanceItemModal — "MX To-Do": adds one real scheduled-maintenance
// item (POST /v1/mx:addMaintenanceItem). Backs the "Scheduled MX" /
// "Inspections" tabs (maintenanceScheduleToBlocks).
// ─────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function AddMaintenanceItemModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ tailNumber: "", description: "", basis: "calendar", dueDate: "", dueAtHours: "", farReference: "", mandatory: true });
  const [status, setStatus] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const fieldStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };
  const required = form.tailNumber.trim() && form.description.trim() && (form.basis === "calendar" ? form.dueDate : form.dueAtHours);

  async function run() {
    if (!required) return;
    setStatus({ state: "running" });
    try {
      await apiPost("/v1/mx:addMaintenanceItem", {
        tailNumber: form.tailNumber.trim().toUpperCase(),
        description: form.description.trim(),
        basis: form.basis,
        dueDate: form.basis === "calendar" ? form.dueDate : undefined,
        dueAtHours: form.basis === "hours" ? Number(form.dueAtHours) : undefined,
        farReference: form.farReference.trim() || undefined,
        mandatory: form.mandatory,
      });
      setStatus({ state: "done" });
    } catch (e) {
      setStatus({ state: "error", message: e.message });
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "min(480px, 92vw)", maxHeight: "90vh", overflowY: "auto", padding: 24, background: "white", borderRadius: 12 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Add scheduled maintenance item</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>An inspection interval or recurring due item — evaluated against this aircraft's hours/date on every read.</p>
        <div style={{ display: "grid", gap: 10 }}>
          <div><label style={labelStyle}>Tail number *</label><input style={fieldStyle} value={form.tailNumber} onChange={(e) => set("tailNumber", e.target.value)} placeholder="N701AA" /></div>
          <div><label style={labelStyle}>Description *</label><input style={fieldStyle} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Annual inspection (91.409)" /></div>
          <div>
            <label style={labelStyle}>Basis *</label>
            <select style={fieldStyle} value={form.basis} onChange={(e) => set("basis", e.target.value)}>
              <option value="calendar">Calendar date</option>
              <option value="hours">Airframe hours</option>
            </select>
          </div>
          {form.basis === "calendar" ? (
            <div><label style={labelStyle}>Due date *</label><input type="date" style={fieldStyle} value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
          ) : (
            <div><label style={labelStyle}>Due at hours *</label><input type="number" style={fieldStyle} value={form.dueAtHours} onChange={(e) => set("dueAtHours", e.target.value)} placeholder="1900" /></div>
          )}
          <div><label style={labelStyle}>FAR reference (optional)</label><input style={fieldStyle} value={form.farReference} onChange={(e) => set("farReference", e.target.value)} placeholder="91.409" /></div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155" }}>
            <input type="checkbox" checked={form.mandatory} onChange={(e) => set("mandatory", e.target.checked)} />
            Mandatory — overdue blocks airworthiness (uncheck for advisory-only items, e.g. non-mandatory SBs)
          </label>
        </div>
        {status?.state === "error" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8 }}>{status.message}</div>}
        {status?.state === "done" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#16a34a", background: "#f0fdf4", borderRadius: 8 }}>Item added to the aircraft's real record.</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 13, background: "white", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>Close</button>
          {status?.state === "done" ? (
            <button onClick={onAdded} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Done</button>
          ) : (
            <button onClick={run} disabled={!required || status?.state === "running"} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", opacity: (!required || status?.state === "running") ? 0.5 : 1 }}>
              {status?.state === "running" ? "Adding…" : "Add item"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AddWarrantyModal — component/engine/avionics warranty or coverage-plan
// record (POST /v1/mx:addWarranty). Informational only.
// ─────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function AddWarrantyModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ tailNumber: "", component: "", provider: "", coverageType: "", expirationDate: "", expirationHours: "", notes: "" });
  const [status, setStatus] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const fieldStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };
  const required = form.tailNumber.trim() && form.component.trim();

  async function run() {
    if (!required) return;
    setStatus({ state: "running" });
    try {
      await apiPost("/v1/mx:addWarranty", {
        tailNumber: form.tailNumber.trim().toUpperCase(),
        component: form.component.trim(),
        provider: form.provider.trim() || undefined,
        coverageType: form.coverageType.trim() || undefined,
        expirationDate: form.expirationDate || undefined,
        expirationHours: form.expirationHours ? Number(form.expirationHours) : undefined,
        notes: form.notes.trim() || undefined,
      });
      setStatus({ state: "done" });
    } catch (e) {
      setStatus({ state: "error", message: e.message });
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "min(480px, 92vw)", maxHeight: "90vh", overflowY: "auto", padding: 24, background: "white", borderRadius: 12 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Add warranty / coverage record</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>Informational — never blocks airworthiness.</p>
        <div style={{ display: "grid", gap: 10 }}>
          <div><label style={labelStyle}>Tail number *</label><input style={fieldStyle} value={form.tailNumber} onChange={(e) => set("tailNumber", e.target.value)} placeholder="N701AA" /></div>
          <div><label style={labelStyle}>Component *</label><input style={fieldStyle} value={form.component} onChange={(e) => set("component", e.target.value)} placeholder="Engine — PT6A-67P" /></div>
          <div><label style={labelStyle}>Provider</label><input style={fieldStyle} value={form.provider} onChange={(e) => set("provider", e.target.value)} placeholder="Pratt & Whitney Canada" /></div>
          <div><label style={labelStyle}>Coverage type</label><input style={fieldStyle} value={form.coverageType} onChange={(e) => set("coverageType", e.target.value)} placeholder="Eagle Service Plan" /></div>
          <div><label style={labelStyle}>Expiration date</label><input type="date" style={fieldStyle} value={form.expirationDate} onChange={(e) => set("expirationDate", e.target.value)} /></div>
          <div><label style={labelStyle}>Or expiration hours</label><input type="number" style={fieldStyle} value={form.expirationHours} onChange={(e) => set("expirationHours", e.target.value)} placeholder="3600" /></div>
          <div><label style={labelStyle}>Notes</label><textarea rows={2} style={{ ...fieldStyle, fontFamily: "inherit", resize: "vertical" }} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
        </div>
        {status?.state === "error" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8 }}>{status.message}</div>}
        {status?.state === "done" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#16a34a", background: "#f0fdf4", borderRadius: 8 }}>Warranty record added.</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 13, background: "white", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>Close</button>
          {status?.state === "done" ? (
            <button onClick={onAdded} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Done</button>
          ) : (
            <button onClick={run} disabled={!required || status?.state === "running"} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", opacity: (!required || status?.state === "running") ? 0.5 : 1 }}>
              {status?.state === "running" ? "Adding…" : "Add warranty"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AddNefItemModal — Negative Equipment List entry (POST /v1/mx:addNefItem).
// Pure documentation record; no status is computed.
// ─────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function AddNefItemModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ tailNumber: "", equipment: "", reason: "", authorizationRef: "" });
  const [status, setStatus] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const fieldStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };
  const required = form.tailNumber.trim() && form.equipment.trim();

  async function run() {
    if (!required) return;
    setStatus({ state: "running" });
    try {
      await apiPost("/v1/mx:addNefItem", {
        tailNumber: form.tailNumber.trim().toUpperCase(),
        equipment: form.equipment.trim(),
        reason: form.reason.trim() || undefined,
        authorizationRef: form.authorizationRef.trim() || undefined,
      });
      setStatus({ state: "done" });
    } catch (e) {
      setStatus({ state: "error", message: e.message });
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "min(480px, 92vw)", maxHeight: "90vh", overflowY: "auto", padding: 24, background: "white", borderRadius: 12 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Add NEF item</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>Equipment not installed that would otherwise be required — a documented absence, distinct from MEL.</p>
        <div style={{ display: "grid", gap: 10 }}>
          <div><label style={labelStyle}>Tail number *</label><input style={fieldStyle} value={form.tailNumber} onChange={(e) => set("tailNumber", e.target.value)} placeholder="N701AA" /></div>
          <div><label style={labelStyle}>Equipment *</label><input style={fieldStyle} value={form.equipment} onChange={(e) => set("equipment", e.target.value)} placeholder="Second VOR receiver" /></div>
          <div><label style={labelStyle}>Reason</label><textarea rows={2} style={{ ...fieldStyle, fontFamily: "inherit", resize: "vertical" }} value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Why it's not installed" /></div>
          <div><label style={labelStyle}>Authorization reference</label><input style={fieldStyle} value={form.authorizationRef} onChange={(e) => set("authorizationRef", e.target.value)} placeholder="Ops Spec D-1 / STC #..." /></div>
        </div>
        {status?.state === "error" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8 }}>{status.message}</div>}
        {status?.state === "done" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#16a34a", background: "#f0fdf4", borderRadius: 8 }}>NEF item documented.</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 13, background: "white", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>Close</button>
          {status?.state === "done" ? (
            <button onClick={onAdded} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Done</button>
          ) : (
            <button onClick={run} disabled={!required || status?.state === "running"} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", opacity: (!required || status?.state === "running") ? 0.5 : 1 }}>
              {status?.state === "running" ? "Adding…" : "Add NEF item"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AddSquawkPhotoModal — the photo entry method (Sean, 2026-09-05: "voice or
// chat is best, but a photo is better, worst case a form"). Same two-step
// RAAS shape as MeterReadingCard.jsx: photo -> POST /v1/mx:readSquawkPhoto
// returns a DRAFT description only (nothing written yet) -> the pilot
// reviews/edits it -> POST /v1/mx:commitSquawkPhoto is the actual write,
// through the same addSquawkCore path as the manual form and chat. An
// unclear photo never gets a fabricated description — isUnclear forces the
// pilot to type their own.
// ─────────────────────────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AddSquawkPhotoModal({ onClose, onFiled }) {
  const [tailNumber, setTailNumber] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [draft, setDraft] = useState(null); // result of readSquawkPhoto
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [filed, setFiled] = useState(null);
  const fileRef = useRef(null);
  const fieldStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setDraft(null);
    setFiled(null);
    setPhotoPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await apiPost("/v1/mx:readSquawkPhoto", {
        tailNumber: tailNumber.trim() || undefined,
        imageBase64: base64,
        mediaType: file.type || "image/jpeg",
      });
      setDraft(result);
      setDescription(result.suggestedDescription || "");
    } catch (e2) {
      setErr(e2.message);
    }
    setBusy(false);
  }

  async function onFileSquawk() {
    if (!tailNumber.trim() || !description.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const j = await apiPost("/v1/mx:commitSquawkPhoto", {
        tailNumber: tailNumber.trim().toUpperCase(),
        description: description.trim(),
      });
      setFiled(j);
    } catch (e2) {
      setErr(e2.message);
    }
    setBusy(false);
  }

  const confidenceColor = draft?.confidence === "high" ? "#16a34a" : draft?.confidence === "medium" ? "#d97706" : "#dc2626";
  const canFile = tailNumber.trim() && description.trim();

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "min(480px, 92vw)", maxHeight: "90vh", overflowY: "auto", padding: 24, background: "white", borderRadius: 12 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>File a squawk — photo</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
          Photograph the discrepancy. Skye drafts a description — you review and confirm before it's logged.
        </p>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Tail number *</label>
          <input style={fieldStyle} value={tailNumber} onChange={(e) => setTailNumber(e.target.value)} placeholder="N701AA" />
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: "none" }} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} style={{
          width: "100%", padding: "12px", borderRadius: 10, border: "1.5px dashed #cbd5e1", background: "#f8fafc",
          color: "#334155", fontSize: 14, fontWeight: 600, cursor: busy ? "default" : "pointer", marginBottom: 12,
        }}>{busy ? "Reading photo…" : "📷 Take or choose a photo"}</button>

        {photoPreview && (
          <img src={photoPreview} alt="discrepancy" style={{ width: "100%", borderRadius: 8, marginBottom: 12, maxHeight: 180, objectFit: "cover" }} />
        )}

        {err && <div style={{ fontSize: 13, color: "#b91c1c", background: "#fef2f2", padding: 10, borderRadius: 8, marginBottom: 12 }}>{err}</div>}

        {draft && !filed && (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{draft.isUnclear ? "Couldn't tell what's wrong" : "Draft description"}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: confidenceColor, textTransform: "uppercase" }}>{draft.confidence} confidence</span>
            </div>
            {draft.visible && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, lineHeight: 1.4 }}>{draft.visible}</div>}
            {draft.isUnclear && (
              <div style={{ fontSize: 12, color: "#92400e", background: "#fffbeb", padding: 8, borderRadius: 6, marginBottom: 10 }}>
                ⚠ The photo didn't clearly show a discrepancy — describe it yourself below.
              </div>
            )}
            {draft.notes && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, lineHeight: 1.4 }}>{draft.notes}</div>}
            <label style={labelStyle}>Description {draft.isUnclear ? "*" : "(edit if needed)"}</label>
            <textarea rows={3} style={{ ...fieldStyle, fontFamily: "inherit", resize: "vertical", marginBottom: 10 }}
              value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's wrong, what you observed" />
          </div>
        )}

        {filed && <div style={{ marginTop: 4, padding: 10, fontSize: 13, color: "#16a34a", background: "#f0fdf4", borderRadius: 8 }}>Squawk filed on {filed.tailNumber} — work order {filed.workOrderNumber}. It's open on the aircraft's record now.</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 13, background: "white", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>Close</button>
          {filed ? (
            <button onClick={onFiled} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Done</button>
          ) : draft ? (
            <button onClick={onFileSquawk} disabled={!canFile || busy} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", opacity: (!canFile || busy) ? 0.5 : 1 }}>
              {busy ? "Filing…" : "File squawk"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CloseSquawkModal — the Corrective Action half. Takes an open/deferred
// squawk (from computeAirworthiness's real openSquawks, which preserves the
// real Firestore doc id) and lets MX either close it out or defer it under
// a real MEL category. Calls POST /v1/mx:updateSquawkStatus — the backend
// already enforces category being required to defer; this UI just surfaces
// that real constraint instead of re-inventing it client-side.
// ─────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function CloseSquawkModal({ squawk, onClose, onResolved }) {
  const [action, setAction] = useState("closed"); // closed | deferred
  const [category, setCategory] = useState("");
  const [melReference, setMelReference] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [by, setBy] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState(null);
  const fieldStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };
  const required = action === "deferred" ? !!category : by.trim().length > 0 || action === "closed";

  async function run() {
    setStatus({ state: "running" });
    try {
      await apiPost("/v1/mx:updateSquawkStatus", {
        tailNumber: squawk.tailNumber,
        squawkId: squawk.id,
        status: action,
        category: action === "deferred" ? category : undefined,
        deferredBy: action === "deferred" ? by.trim() : undefined,
        melReference: action === "deferred" ? melReference.trim() || undefined : undefined,
        restrictions: action === "deferred" ? restrictions.trim() || undefined : undefined,
        closedBy: action === "closed" ? by.trim() : undefined,
        closedNote: action === "closed" ? note.trim() : undefined,
      });
      setStatus({ state: "done" });
    } catch (e) {
      setStatus({ state: "error", message: e.message });
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "min(480px, 92vw)", maxHeight: "90vh", overflowY: "auto", padding: 24, background: "white", borderRadius: 12 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{squawk.tailNumber} — corrective action</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{squawk.description}</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => setAction("closed")} style={{ flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer", border: action === "closed" ? "2px solid #16a34a" : "1px solid #e2e8f0", background: action === "closed" ? "#f0fdf4" : "white", color: action === "closed" ? "#16a34a" : "#64748b" }}>Close it out</button>
          <button onClick={() => setAction("deferred")} style={{ flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer", border: action === "deferred" ? "2px solid #d97706" : "1px solid #e2e8f0", background: action === "deferred" ? "#fffbeb" : "white", color: action === "deferred" ? "#d97706" : "#64748b" }}>Defer (MEL)</button>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {action === "deferred" && (
            <>
              <div>
                <label style={labelStyle}>MEL category *</label>
                <select style={fieldStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="A">A — repair before next flight</option>
                  <option value="B">B — within 3 days</option>
                  <option value="C">C — within 10 days</option>
                  <option value="D">D — within 120 days</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>MEL reference (optional)</label>
                <input style={fieldStyle} value={melReference} onChange={(e) => setMelReference(e.target.value)} placeholder="e.g. 32-60-01" />
              </div>
              <div>
                <label style={labelStyle}>Operating restrictions (optional)</label>
                <textarea rows={2} style={{ ...fieldStyle, fontFamily: "inherit", resize: "vertical" }} value={restrictions} onChange={(e) => setRestrictions(e.target.value)} placeholder="What conditions apply while this is deferred — e.g. 'placarded inop, day VFR only'" />
              </div>
            </>
          )}
          <div><label style={labelStyle}>{action === "deferred" ? "Deferred by" : "Closed by"} *</label><input style={fieldStyle} value={by} onChange={(e) => setBy(e.target.value)} placeholder="A&P name / cert #" /></div>
          {action === "closed" && (
            <div><label style={labelStyle}>Corrective action taken</label><textarea rows={3} style={{ ...fieldStyle, fontFamily: "inherit", resize: "vertical" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was done to resolve it" /></div>
          )}
        </div>
        {status?.state === "error" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8 }}>{status.message}</div>}
        {status?.state === "done" && <div style={{ marginTop: 12, padding: 10, fontSize: 13, color: "#16a34a", background: "#f0fdf4", borderRadius: 8 }}>{action === "closed" ? "Squawk closed." : "Squawk deferred."} Record updated.</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 13, background: "white", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
          {status?.state === "done" ? (
            <button onClick={onResolved} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Done</button>
          ) : (
            <button onClick={run} disabled={!by.trim() || (action === "deferred" && !category) || status?.state === "running"} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", borderRadius: 8, cursor: "pointer", opacity: (!by.trim() || (action === "deferred" && !category) || status?.state === "running") ? 0.5 : 1 }}>
              {status?.state === "running" ? "Saving…" : action === "closed" ? "Close squawk" : "Defer squawk"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// OpenSquawksPanel — real, actionable list backing the "+ File Squawk" flow.
// Reads /v1/mx:listAircraft, the same real aircraftRecords-based source the
// "aircraft" tab's airworthiness status and the read-only "Squawks" tab
// (via /v1/mx:listSquawks) all now share — see AddSquawkModal's comment.
// ─────────────────────────────────────────────────────────────────────────
function OpenSquawksPanel({ refreshKey, onAction }) {
  const [fleet, setFleet] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let cancelled = false;
    apiGet("/v1/mx:listAircraft").then(j => { if (!cancelled) setFleet(j.fleet || []); }).catch(e => { if (!cancelled) setErr(e.message); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (err) return <div style={{ fontSize: 12, color: "#dc2626", marginTop: 12 }}>Couldn't load open squawks: {err}</div>;
  if (!fleet) return <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 12 }}>Loading open squawks…</div>;
  const rows = fleet.flatMap(a => (a.openSquawks || []).map(s => ({ ...s, tailNumber: a.tailNumber })));
  if (rows.length === 0) return <div style={{ fontSize: 13, color: "#16a34a", marginTop: 12, fontWeight: 600 }}>No open squawks — fleet is clean.</div>;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Open squawks — take action</div>
      {rows.map((s) => (
        <div key={`${s.tailNumber}-${s.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{s.tailNumber} <span style={{
              fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, marginLeft: 6,
              color: s.computedStatus === "RED" ? "#b91c1c" : s.computedStatus === "YELLOW" ? "#92400e" : "#64748b",
              background: s.computedStatus === "RED" ? "#fee2e2" : s.computedStatus === "YELLOW" ? "#fef3c7" : "#f1f5f9",
            }}>{s.computedStatus}{s.category ? ` · MEL ${s.category}` : ""}</span></div>
            <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.description}</div>
          </div>
          <button onClick={() => onAction(s)} style={{ flexShrink: 0, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#0284c7", background: "white", border: "1px solid #0284c7", borderRadius: 8, cursor: "pointer" }}>Take action</button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MissionRequestPanel — Dispatch "Requests" tab. Real mission intake:
// captures what's actually being asked for (aircraft type/category, mission
// type, seats, IFR, cargo) and matches it against the real fleet on file via
// POST /v1/dispatch:matchAircraft (services/dispatch/aircraftMatching.js) —
// scoring/ranking computed server-side against each tail's actual type,
// capabilities profile, and real computed airworthiness. An unmatched
// request (e.g. asking for a 777 when the fleet on file is all PC-12s)
// returns an honest "no match" with the real fleet size — never a
// fabricated candidate. A matched candidate can be turned directly into a
// real trip request (POST /v1/dispatch:createTripRequest) with the mission
// criteria and match reasons attached for audit.
// ─────────────────────────────────────────────────────────────────────────
function MissionRequestPanel() {
  const [form, setForm] = useState({
    requiredType: "", category: "", missionType: "", minSeats: "", requiresIfr: false, cargoCapacityLbs: "", destination: "",
  });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [createdFor, setCreatedFor] = useState({}); // tailNumber -> requestId, per-candidate "create trip" status
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const fieldStyle = { width: "100%", padding: "8px 10px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "white" };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 4 };

  async function runMatch() {
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const criteria = {
        requiredType: form.requiredType.trim() || undefined,
        category: form.category.trim() || undefined,
        missionType: form.missionType || undefined,
        minSeats: form.minSeats ? Number(form.minSeats) : undefined,
        requiresIfr: form.requiresIfr || undefined,
        cargoCapacityLbs: form.cargoCapacityLbs ? Number(form.cargoCapacityLbs) : undefined,
      };
      const j = await apiPost("/v1/dispatch:matchAircraft", criteria);
      setResult(j);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  async function createTripFor(candidate) {
    if (!form.destination.trim()) {
      setCreatedFor((prev) => ({ ...prev, [candidate.tailNumber]: "error: enter a destination ICAO above before creating a trip request" }));
      return;
    }
    setCreatedFor((prev) => ({ ...prev, [candidate.tailNumber]: "running" }));
    try {
      const j = await apiPost("/v1/dispatch:createTripRequest", {
        destination: form.destination.trim().toUpperCase(),
        tailNumber: candidate.tailNumber,
        missionRequest: result?.criteria || {},
        matchReasons: candidate.reasonsFor || [],
      });
      setCreatedFor((prev) => ({ ...prev, [candidate.tailNumber]: j.requestId }));
    } catch (e) {
      setCreatedFor((prev) => ({ ...prev, [candidate.tailNumber]: `error: ${e.message}` }));
    }
  }

  const scoreColor = (s) => (s.airworthinessStatus === "RED" ? "#b91c1c" : s.airworthinessStatus === "YELLOW" ? "#92400e" : s.airworthinessStatus === "UNVERIFIED" ? "#64748b" : "#15803d");

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 16, background: "#f8fafc" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Mission request</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><label style={labelStyle}>Aircraft type needed</label><input style={fieldStyle} value={form.requiredType} onChange={(e) => set("requiredType", e.target.value)} placeholder="C172 / King Air 350 / 777" /></div>
          <div>
            <label style={labelStyle}>Mission type</label>
            <select style={fieldStyle} value={form.missionType} onChange={(e) => set("missionType", e.target.value)}>
              <option value="">Any</option>
              <option value="training">Training</option>
              <option value="medevac">Medevac</option>
              <option value="charter">Charter</option>
              <option value="cargo">Cargo / freight</option>
              <option value="tour">Tour</option>
            </select>
          </div>
          <div><label style={labelStyle}>Category (optional)</label><input style={fieldStyle} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. turboprop-multi" /></div>
          <div><label style={labelStyle}>Min seats</label><input type="number" style={fieldStyle} value={form.minSeats} onChange={(e) => set("minSeats", e.target.value)} /></div>
          <div><label style={labelStyle}>Cargo capacity needed (lbs)</label><input type="number" style={fieldStyle} value={form.cargoCapacityLbs} onChange={(e) => set("cargoCapacityLbs", e.target.value)} /></div>
          <div><label style={labelStyle}>Destination ICAO (for trip request)</label><input style={fieldStyle} value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder="PHNL" /></div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", marginTop: 20 }}>
            <input type="checkbox" checked={form.requiresIfr} onChange={(e) => set("requiresIfr", e.target.checked)} />
            Requires IFR certification
          </label>
        </div>
        <button onClick={runMatch} disabled={busy} style={{ marginTop: 12, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "white", background: "linear-gradient(135deg, #0284c7, #0369a1)", border: "none", borderRadius: 8, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Matching against fleet…" : "Match against fleet"}
        </button>
      </div>

      {err && <div style={{ fontSize: 13, color: "#dc2626", background: "#fef2f2", padding: 10, borderRadius: 8, marginBottom: 12 }}>{err}</div>}

      {result && (
        <div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
            {result.fleetSize} tail(s) on file for this workspace{result.candidates.length ? ` · ${result.candidates.length} match(es)` : ""}
          </div>
          {result.message && (
            <div style={{ padding: 12, fontSize: 13, color: "#334155", background: "#f1f5f9", borderRadius: 8, marginBottom: 12 }}>{result.message}</div>
          )}
          {result.candidates.map((c) => (
            <div key={c.tailNumber} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                    {c.tailNumber} {c.type ? `· ${c.type}` : ""}
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, color: scoreColor(c), background: "#f8fafc", border: `1px solid ${scoreColor(c)}` }}>{c.airworthinessStatus}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Match score: {c.score}</div>
                </div>
                <button
                  onClick={() => createTripFor(c)}
                  disabled={createdFor[c.tailNumber] === "running" || (typeof createdFor[c.tailNumber] === "string" && !createdFor[c.tailNumber].startsWith("error"))}
                  style={{ flexShrink: 0, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#0284c7", background: "white", border: "1px solid #0284c7", borderRadius: 8, cursor: "pointer" }}
                >
                  {createdFor[c.tailNumber] && !String(createdFor[c.tailNumber]).startsWith("error") && createdFor[c.tailNumber] !== "running" ? "Trip request created ✓" : "Create trip request"}
                </button>
              </div>
              {c.reasonsFor.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {c.reasonsFor.map((r, i) => <div key={i} style={{ fontSize: 12, color: "#15803d" }}>✓ {r}</div>)}
                </div>
              )}
              {c.reasonsAgainst.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {c.reasonsAgainst.map((r, i) => <div key={i} style={{ fontSize: 12, color: "#b45309" }}>⚠ {r}</div>)}
                </div>
              )}
              {typeof createdFor[c.tailNumber] === "string" && createdFor[c.tailNumber].startsWith("error") && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#dc2626" }}>{createdFor[c.tailNumber]}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AviationWorkerCanvas({ workerSlug: incomingWorkerSlug }) {
  // Role switcher — local override of which of the three role slugs is
  // rendered, so switching Pilots/MX/Dispatch doesn't require leaving this
  // canvas. Defaults to whatever worker the user actually opened; only ever
  // overridden by an explicit click on RoleSwitcher.
  const [roleOverride, setRoleOverride] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  // If the user opens a genuinely different worker from outside this canvas
  // (marketplace/sidebar), drop any leftover role-switcher override instead
  // of silently keeping them on the previous worker's lens. Adjusting state
  // during render (not in an effect) per https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [prevIncomingSlug, setPrevIncomingSlug] = useState(incomingWorkerSlug);
  if (incomingWorkerSlug !== prevIncomingSlug) {
    setPrevIncomingSlug(incomingWorkerSlug);
    setRoleOverride(null);
    setActiveTab(null);
  }
  const workerSlug = roleOverride || incomingWorkerSlug;
  const spec = getAvCanvas(workerSlug);
  const [liveBlocks, setLiveBlocks] = useState({});
  const [loading, setLoading] = useState({});
  const pollingRef = useRef(null);
  // 2026-08-21 gap-audit fix — "+ Log Flight" (CoPilot) / "+ Release Flight" (Dispatch)
  const [showLogFlight, setShowLogFlight] = useState(false);
  const [showReleaseFlight, setShowReleaseFlight] = useState(false);
  // 2026-09-05 gap-audit fix — "+ File Squawk" (MX) / Corrective Action.
  // Filing and closing a squawk were chat-only before this; same pattern as
  // Log/Release Flight above.
  const [showAddSquawk, setShowAddSquawk] = useState(false);
  const [showAddSquawkPhoto, setShowAddSquawkPhoto] = useState(false);
  const [actionSquawk, setActionSquawk] = useState(null);
  const [squawksRefreshKey, setSquawksRefreshKey] = useState(0);
  // 2026-09-05 MX deep-dive — MX To-Do / Warranty / NEF "+ Add" modals.
  const [showAddMaintenanceItem, setShowAddMaintenanceItem] = useState(false);
  const [showAddWarranty, setShowAddWarranty] = useState(false);
  const [showAddNefItem, setShowAddNefItem] = useState(false);
  const [mxRefreshKey, setMxRefreshKey] = useState(0);
  const isCopilotWorker = (workerSlug || "").startsWith("av-copilot");
  const isDispatchWorker = (workerSlug || "").startsWith("av-dispatch");
  const isMxWorker = (workerSlug || "").startsWith("av-mx");

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
          // 2026-09-05 — now reads the same real aircraftRecords-based source
          // as the "aircraft" tab (GET /v1/mx:listSquawks), scoped server-side
          // the same way /v1/mx:listAircraft already is below — no more
          // separate tenantId query param or "open a workspace" special case.
          const data = await apiGet(`/v1/mx:listSquawks`);
          if (data.squawks) blocks = squawksToBlocks(data.squawks);
        } else if (cfg.kind === "airworthiness") {
          const data = await apiGet(`/v1/mx:listAircraft`);
          if (data.fleet) blocks = airworthinessToBlocks(data.fleet);
        } else if (cfg.kind === "adCompliance") {
          const data = await apiGet(`/v1/mx:listAircraft`);
          if (data.fleet) blocks = adComplianceToBlocks(data.fleet);
        } else if (cfg.kind === "maintenanceSchedule") {
          const data = await apiGet(`/v1/mx:listAircraft`);
          if (data.fleet) blocks = maintenanceScheduleToBlocks(data.fleet);
        } else if (cfg.kind === "melItems") {
          const data = await apiGet(`/v1/mx:listSquawks`);
          if (data.squawks) blocks = melItemsToBlocks(data.squawks);
        } else if (cfg.kind === "warranties") {
          const data = await apiGet(`/v1/mx:listAircraft`);
          if (data.fleet) blocks = warrantiesToBlocks(data.fleet);
        } else if (cfg.kind === "nefItems") {
          const data = await apiGet(`/v1/mx:listAircraft`);
          if (data.fleet) blocks = nefItemsToBlocks(data.fleet);
        } else if (cfg.kind === "releases") {
          const tenantId = typeof localStorage !== "undefined" ? localStorage.getItem("TENANT_ID") : null;
          const data = await apiGet(`/v1/aviation:dispatch:releases${tenantId && tenantId !== "vault" ? `?tenantId=${encodeURIComponent(tenantId)}` : ""}`);
          blocks = releasesToBlocks(data.releases);
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
  }, [workerSlug, currentTabId, mxRefreshKey]);

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
      <RoleSwitcher currentSlug={workerSlug} onSwitch={(slug) => { setRoleOverride(slug); setActiveTab(null); }} />

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
          {isMxWorker && (
            <>
              <button
                type="button"
                onClick={() => setShowAddSquawk(true)}
                style={{ flexShrink: 0, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "white", background: "linear-gradient(135deg, #0284c7, #0369a1)", border: "none", borderRadius: 8, cursor: "pointer" }}
              >
                + File Squawk
              </button>
              <button
                type="button"
                onClick={() => setShowAddSquawkPhoto(true)}
                style={{ flexShrink: 0, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#0369a1", background: "white", border: "1px solid #0369a1", borderRadius: 8, cursor: "pointer" }}
              >
                📷 Photo Squawk
              </button>
              {(currentTabId === "scheduled-mx" || currentTabId === "inspections") && (
                <button
                  type="button"
                  onClick={() => setShowAddMaintenanceItem(true)}
                  style={{ flexShrink: 0, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#0369a1", background: "white", border: "1px solid #0369a1", borderRadius: 8, cursor: "pointer" }}
                >
                  + Add Maintenance Item
                </button>
              )}
              {currentTabId === "warranty" && (
                <button
                  type="button"
                  onClick={() => setShowAddWarranty(true)}
                  style={{ flexShrink: 0, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#0369a1", background: "white", border: "1px solid #0369a1", borderRadius: 8, cursor: "pointer" }}
                >
                  + Add Warranty
                </button>
              )}
              {currentTabId === "nef" && (
                <button
                  type="button"
                  onClick={() => setShowAddNefItem(true)}
                  style={{ flexShrink: 0, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#0369a1", background: "white", border: "1px solid #0369a1", borderRadius: 8, cursor: "pointer" }}
                >
                  + Add NEF Item
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showLogFlight && <LogFlightModal onClose={() => setShowLogFlight(false)} onLogged={() => setShowLogFlight(false)} />}
      {showReleaseFlight && <ReleaseFlightModal onClose={() => setShowReleaseFlight(false)} onReleased={() => setShowReleaseFlight(false)} />}
      {showAddSquawk && (
        <AddSquawkModal
          onClose={() => setShowAddSquawk(false)}
          onFiled={() => { setShowAddSquawk(false); setSquawksRefreshKey(k => k + 1); setMxRefreshKey(k => k + 1); }}
        />
      )}
      {showAddSquawkPhoto && (
        <AddSquawkPhotoModal
          onClose={() => setShowAddSquawkPhoto(false)}
          onFiled={() => { setShowAddSquawkPhoto(false); setSquawksRefreshKey(k => k + 1); setMxRefreshKey(k => k + 1); }}
        />
      )}
      {showAddMaintenanceItem && (
        <AddMaintenanceItemModal
          onClose={() => setShowAddMaintenanceItem(false)}
          onAdded={() => { setShowAddMaintenanceItem(false); setMxRefreshKey(k => k + 1); }}
        />
      )}
      {showAddWarranty && (
        <AddWarrantyModal
          onClose={() => setShowAddWarranty(false)}
          onAdded={() => { setShowAddWarranty(false); setMxRefreshKey(k => k + 1); }}
        />
      )}
      {showAddNefItem && (
        <AddNefItemModal
          onClose={() => setShowAddNefItem(false)}
          onAdded={() => { setShowAddNefItem(false); setMxRefreshKey(k => k + 1); }}
        />
      )}
      {actionSquawk && (
        <CloseSquawkModal
          squawk={actionSquawk}
          onClose={() => setActionSquawk(null)}
          onResolved={() => { setActionSquawk(null); setSquawksRefreshKey(k => k + 1); setMxRefreshKey(k => k + 1); }}
        />
      )}

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

      {/* Real, actionable Corrective Action panel — placed on "aircraft"
          (not "squawks") deliberately, since that tab reads the same
          aircraftRecords-backed source this panel and its modals write to.
          See AddSquawkModal's comment on the two-collection split. */}
      {isMxWorker && currentTabId === "aircraft" && (
        <OpenSquawksPanel refreshKey={squawksRefreshKey} onAction={setActionSquawk} />
      )}

      {/* Mission request intake + real aircraft-type/capability matching —
          Dispatch "Requests" tab. See MissionRequestPanel above. */}
      {isDispatchWorker && currentTabId === "requests" && <MissionRequestPanel />}
    </div>
  );
}
