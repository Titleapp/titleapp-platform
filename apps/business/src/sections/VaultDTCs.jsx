import React, { useState, useMemo, useEffect } from "react";
import { useDtcCatalog, ASSET_CLASSES } from "../data/useDtcCatalog";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function formatTimestamp(ts) {
  if (!ts) return "";
  const ms = ts._seconds ? ts._seconds * 1000 : (ts.toMillis ? ts.toMillis() : new Date(ts).getTime());
  if (!ms) return "";
  return new Date(ms).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const EDUCATION_ENTRY_COLORS = {
  enrollment:            { dot: "#2563eb", label: "Enrollment" },
  degree_conferred:      { dot: "#7c3aed", label: "Degree conferred" },
  course_completed:      { dot: "#059669", label: "Course completed" },
  milestone:             { dot: "#0891b2", label: "Milestone" },
  ce_credit:             { dot: "#7c3aed", label: "CE credit" },
  renewal:               { dot: "#059669", label: "Renewal" },
  certification_issued:  { dot: "#7c3aed", label: "Certification issued" },
  externship:            { dot: "#0891b2", label: "Externship" },
  created:               { dot: "#94a3b8", label: "Added to Vault" },
};

function gradeColor(grade) {
  if (!grade) return "#64748b";
  const g = String(grade).trim().toUpperCase();
  if (g === "A" || g === "A+") return "#059669";
  if (g.startsWith("A")) return "#16a34a";
  if (g === "B+" || g === "B") return "#0891b2";
  if (g.startsWith("B")) return "#2563eb";
  if (g === "PASS" || g === "COMPLETED") return "#7c3aed";
  return "#64748b";
}

// Per-DTC logbook viewer. Education DTCs get a structured course+timeline view.
// scoped via /v1/logbook:list?dtcId=xxx.
function LogbookModal({ dtc, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("timeline");

  const isEducation = EDUCATION_TYPES.has(dtc.type);
  const m = dtc.metadata || {};
  const courses = Array.isArray(m.courses) ? m.courses : [];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = localStorage.getItem("ID_TOKEN");
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        headers["x-tenant-id"] = "vault";
        const res = await fetch(`${API_BASE}/api?path=${encodeURIComponent(`/v1/logbook:list?dtcId=${dtc.id}`)}`, { headers });
        const data = await res.json();
        if (cancelled) return;
        if (data?.ok && Array.isArray(data.entries)) setEntries(data.entries);
        else { setEntries([]); if (data?.error) setError(data.error); }
      } catch (e) {
        if (!cancelled) { setError(e.message || "Failed to load logbook"); setEntries([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [dtc.id]);

  // Sort entries chronologically (oldest first) for the timeline
  const sorted = [...entries].sort((a, b) => {
    const aMs = a.createdAt?._seconds ?? 0;
    const bMs = b.createdAt?._seconds ?? 0;
    return aMs - bMs;
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, width: "100%",
          maxWidth: isEducation && courses.length > 0 ? 720 : 640,
          maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
                {isEducation ? "Education" : (dtc.assetClass || "Vault")} · Logbook
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
                {m.title || m.name || dtc.type || "Record"}
              </div>
              {m.institution && (
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>{m.institution}</div>
              )}
              {isEducation && (m.gpa || m.years || m.conferred || m.level || m.expires) && (
                <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                  {m.years && <span style={{ fontSize: 12, color: "#64748b" }}>{m.years}</span>}
                  {m.conferred && <span style={{ fontSize: 12, color: "#64748b" }}>Conferred {m.conferred}</span>}
                  {m.gpa && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#059669", background: "#f0fdf4", padding: "1px 8px", borderRadius: 999 }}>
                      GPA {m.gpa}
                    </span>
                  )}
                  {m.hoursLogged != null && m.hoursRequired != null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", padding: "1px 8px", borderRadius: 999 }}>
                      {m.hoursLogged}/{m.hoursRequired} hrs CE
                    </span>
                  )}
                  {m.expires && (
                    <span style={{ fontSize: 12, color: "#64748b" }}>Expires {m.expires}</span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", fontSize: 24, color: "#64748b", cursor: "pointer", lineHeight: 1, padding: 4, flexShrink: 0 }}
              aria-label="Close"
            >×</button>
          </div>
          {/* Tab bar for education DTCs with courses */}
          {isEducation && courses.length > 0 && (
            <div style={{ display: "flex", gap: 0, marginTop: 14, borderBottom: "1px solid #f1f5f9" }}>
              {["timeline", "courses"].map((t) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "6px 16px", fontSize: 13, fontWeight: tab === t ? 600 : 500,
                  cursor: "pointer", background: "none", border: "none", whiteSpace: "nowrap",
                  color: tab === t ? "#7c3aed" : "#64748b",
                  borderBottom: tab === t ? "2px solid #7c3aed" : "2px solid transparent",
                }}>
                  {t === "timeline" ? `Timeline (${entries.length})` : `Courses (${courses.length})`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {loading && (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading…</div>
          )}
          {!loading && error && (
            <div style={{ padding: 16, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Courses tab — structured course list with grades */}
          {!loading && !error && tab === "courses" && courses.length > 0 && (
            <div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    {["Code", "Course", "Credits", "Grade", "Term"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 12, color: "#64748b" }}>{c.code || "—"}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 500, color: "#1e293b" }}>{c.title}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", color: "#475569" }}>{c.credits ?? "—"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                        <span style={{ fontWeight: 700, color: gradeColor(c.grade) }}>{c.grade || "—"}</span>
                      </td>
                      <td style={{ padding: "8px 10px", color: "#64748b", whiteSpace: "nowrap" }}>{c.term || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {m.gpa && (
                <div style={{ marginTop: 14, textAlign: "right", fontSize: 13, color: "#64748b" }}>
                  Cumulative GPA: <strong style={{ color: "#059669" }}>{m.gpa}</strong>
                </div>
              )}
            </div>
          )}

          {/* Timeline tab (or default for non-education) */}
          {!loading && !error && tab === "timeline" && entries.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>No logbook entries yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                Events are appended here as workers act on this record.
              </div>
            </div>
          )}
          {!loading && !error && tab === "timeline" && sorted.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative" }}>
              {sorted.map((entry, idx) => {
                const edColors = EDUCATION_ENTRY_COLORS[entry.entryType] || { dot: "#7c3aed", label: entry.entryType?.replace(/_/g, " ") || "event" };
                const isEd = isEducation;
                const dot = isEd ? edColors.dot : "#7c3aed";
                const noteText = entry.data?.note || entry.note || null;
                const dataEntries = Object.entries(entry.data || {}).filter(([k]) => k !== "note").slice(0, 4);
                return (
                  <div key={entry.id || idx} style={{ display: "flex", gap: 12 }}>
                    {isEd && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot, marginTop: 3, flexShrink: 0 }} />
                        {idx < sorted.length - 1 && <div style={{ width: 2, flex: 1, background: "#f1f5f9", marginTop: 4 }} />}
                      </div>
                    )}
                    <div style={{ flex: 1, paddingLeft: isEd ? 0 : 14, borderLeft: isEd ? "none" : `3px solid #7c3aed`, paddingTop: 0, paddingBottom: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: isEd ? dot : "#1e293b" }}>
                          {isEd ? (edColors.label || (entry.entryType || "event").replace(/_/g, " ")) : (entry.entryType || "event").replace(/_/g, " ")}
                        </span>
                        <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", marginLeft: 8 }}>{formatTimestamp(entry.createdAt)}</span>
                      </div>
                      {noteText && (
                        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: dataEntries.length ? 4 : 0 }}>
                          {noteText.length > 200 ? noteText.slice(0, 199).trimEnd() + "…" : noteText}
                        </div>
                      )}
                      {dataEntries.length > 0 && (
                        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                          {dataEntries.map(([k, v]) => (
                            <span key={k} style={{ marginRight: 12 }}>
                              <span style={{ color: "#94a3b8" }}>{k}:</span> {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid #f1f5f9", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
          Logbook is append-only — entries written by workers cannot be edited or deleted.
        </div>
      </div>
    </div>
  );
}

/**
 * VaultDTCs — CODEX 50.13 Layer C.
 *
 * Renders Digital Title Certificates from the Firestore `dtcs` collection
 * via `/v1/dtc:list`. Six-class asset taxonomy (Real Property, Vehicles,
 * Personal Assets, Credentials, Business Records, Compliance). Per-DTC
 * cards show type, primary metadata, chain anchor status badge, and
 * logbook entry count. v1 ships flat-list; detail panel + Logbook
 * append UI are v1.1 polish.
 *
 * This is the first frontend caller of /v1/dtc:list — before this, DTCs
 * existed in the backend but had no UI surface. Drive (storageObjects,
 * formerly mislabeled as "Vault") and Vault (DTCs) are now peer top-level
 * destinations rather than the same surface confusing two distinct stores.
 */

function chainBadge(dtc) {
  const status = dtc.chain_anchor_status || "hash_only";
  const map = {
    hash_only:       { label: "Hash anchored",   bg: "#dcfce7", color: "#15803d" },
    chain_pending:   { label: "Chain pending",   bg: "#fef3c7", color: "#92400e" },
    chain_confirmed: { label: "Chain confirmed", bg: "#ddd6fe", color: "#5b21b6" },
    chain_failed:    { label: "Chain failed",    bg: "#fee2e2", color: "#991b1b" },
  };
  const s = map[status] || map.hash_only;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase",
      padding: "3px 8px", borderRadius: 999, background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
}

const HEALTH_TYPES = new Set(["medical_record", "medical_certificate", "immunization", "lab_result", "prescription", "health_visit", "allergy"]);
const MONEY_TYPES = new Set(["bank_account", "investment_account", "retirement_account", "crypto_account", "liability"]);
const EDUCATION_TYPES = new Set(["education_record", "degree", "training_record", "course"]);

// CAS palette (same language as the worker canvas) for the dashboard's
// "needs attention" flags: RED past-due · YELLOW due-soon · BLUE upcoming.
const CAS = {
  RED: { dot: "#dc2626", bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" },
  YELLOW: { dot: "#d97706", bg: "#fffbeb", border: "#fde68a", text: "#b45309" },
  BLUE: { dot: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  GREEN: { dot: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
  WHITE: { dot: "#64748b", bg: "#f8fafc", border: "#e2e8f0", text: "#475569" },
};

// Same primitives the worker canvas uses, so the Vault reads as one of our
// canvases — not a different-looking page.
const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.35)", letterSpacing: "0.05em", textTransform: "uppercase", margin: "4px 0 10px" }}>{children}</div>
);

function fmtUsd(n) {
  if (n == null || isNaN(n)) return "—";
  const neg = n < 0;
  return (neg ? "−$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
}

// Signed USD value of a DTC for the net-worth rollup. Prefers metadata.valueUsd
// (number); else parses a currency string (balance/estValue/value). Liabilities
// (type "liability" or metadata.liability) contribute negatively.
function dtcValue(dtc) {
  const m = dtc.metadata || {};
  let v = null;
  if (typeof m.valueUsd === "number") v = m.valueUsd;
  else {
    const raw = m.balance ?? m.estValue ?? m.value ?? m.marketValue;
    if (raw != null) { const n = parseFloat(String(raw).replace(/[^0-9.]/g, "")); if (!isNaN(n)) v = n; }
  }
  if (v == null) return null;
  const isLiability = dtc.type === "liability" || m.liability === true;
  return isLiability ? -Math.abs(v) : Math.abs(v);
}

// Clip long text so a multi-sentence summary doesn't blow out the card.
function clip(s, max = 72) {
  if (!s) return s;
  const t = String(s).trim().replace(/\s+/g, " ");
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}

function metadataPreview(dtc) {
  const m = dtc.metadata || {};
  const lines = [];
  // Pick up to 3 informative lines based on type.
  if (dtc.type === "vehicle") {
    if (m.year || m.make || m.model) lines.push([m.year, m.make, m.model].filter(Boolean).join(" "));
    if (m.vin) lines.push(`VIN: ${m.vin}`);
    if (m.licensePlate) lines.push(`Plate: ${m.licensePlate}`);
  } else if (dtc.type === "property") {
    if (m.address) lines.push(m.address);
    if (m.parcelId) lines.push(`Parcel: ${m.parcelId}`);
    if (m.county) lines.push(m.county);
  } else if (dtc.type === "credential") {
    if (m.credentialName) lines.push(m.credentialName);
    if (m.issuer) lines.push(`Issuer: ${m.issuer}`);
    if (m.expirationDate) lines.push(`Expires: ${m.expirationDate}`);
  } else if (HEALTH_TYPES.has(dtc.type)) {
    if (dtc.type === "medical_certificate") {
      if (m.class) lines.push(m.class);
      if (m.expires) lines.push(`Expires: ${m.expires}`);
      if (m.examiner) lines.push(m.examiner);
    } else {
      if (m.provider) lines.push(m.provider);
      if (m.date || m.issued) lines.push(m.date || m.issued);
      if (m.summary) lines.push(clip(m.summary));
    }
  } else if (MONEY_TYPES.has(dtc.type)) {
    if (m.institution) lines.push(m.institution);
    if (m.balance) lines.push(`Balance: ${m.balance}`);
    if (m.accountType || m.lender) lines.push(m.accountType || m.lender);
  } else if (EDUCATION_TYPES.has(dtc.type)) {
    if (m.institution) lines.push(m.institution);
    if (m.degree || m.course || m.level || m.rating) lines.push(m.degree || m.course || m.level || m.rating);
    if (m.conferred || m.years || m.currentCycle) lines.push(m.conferred ? `Conferred ${m.conferred}` : (m.currentCycle || m.years));
    if (m.gpa) lines.push(`GPA ${m.gpa}`);
    else if (m.hoursLogged != null) lines.push(`${m.hoursLogged} CE hrs logged`);
    else if (!lines.length && m.summary) lines.push(clip(m.summary));
  } else {
    // Generic: show top-level keys.
    Object.entries(m).slice(0, 3).forEach(([k, v]) => {
      if (typeof v !== "object") lines.push(clip(`${k}: ${v}`));
    });
  }
  return lines.filter(Boolean).slice(0, 3);
}

export default function VaultDTCs() {
  const { dtcs, loading, error } = useDtcCatalog();
  const [activeClass, setActiveClass] = useState("Dashboard");
  const [selectedDtc, setSelectedDtc] = useState(null);

  const counts = useMemo(() => {
    const c = { All: dtcs.length };
    for (const cls of ASSET_CLASSES) c[cls] = 0;
    for (const d of dtcs) c[d.assetClass] = (c[d.assetClass] || 0) + 1;
    return c;
  }, [dtcs]);

  // "Credentials" is a CROSS-CUTTING view: licenses, certifications, registrations,
  // memberships, and medical certs live under Health/Education pillars but a vet
  // wants them all in one place. Match by type/expiry/name, not just assetClass
  // (Sean, 2026-06-26 — the dedicated Credentials tab was empty otherwise).
  const isCredential = (d) => {
    if (d.assetClass === "Credentials") return true;
    if (d.type === "credential" || d.type === "medical_certificate") return true;
    const m = d.metadata || {};
    if (m.expires) return true;
    return /licen|certif|registrat|credential|membership|titer|\bDVM\b|\bDEA\b|OSHA|E&O|liability insurance/i.test(`${d.title || ""} ${m.title || ""} ${m.credentialName || ""}`);
  };
  const filtered = activeClass === "All" ? dtcs
    : activeClass === "Credentials" ? dtcs.filter(isCredential)
    : dtcs.filter(d => d.assetClass === activeClass);

  // Net-worth rollup across every valued record: property + personal property +
  // accounts, minus liabilities. The "my money" payoff — one real-time picture.
  const worth = useMemo(() => {
    let assets = 0, liabilities = 0, valued = 0;
    for (const d of dtcs) {
      const v = dtcValue(d);
      if (v == null) continue;
      valued += 1;
      if (v < 0) liabilities += -v; else assets += v;
    }
    return { assets, liabilities, net: assets - liabilities, valued };
  }, [dtcs]);

  // "Needs attention" — anything with an expiry or next-due date that's near or
  // past. Same currency idea as the AIRAC nav data + 83(b) deadlines, unified
  // across the whole Vault.
  const attention = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- current time is intentional here
    const today = Date.now();
    const items = [];
    for (const d of dtcs) {
      const m = d.metadata || {};
      for (const c of [{ kind: "Expires", when: m.expires }, { kind: "Due", when: m.nextDue }]) {
        if (!c.when) continue;
        const t = Date.parse(c.when);
        if (isNaN(t)) continue;
        const days = Math.ceil((t - today) / 86400000);
        if (days > 180) continue;
        const band = days < 0 ? "RED" : days <= 60 ? "YELLOW" : "BLUE";
        items.push({ title: m.title || d.type, kind: c.kind, when: c.when, days, band });
      }
    }
    return items.sort((a, b) => a.days - b.days);
  }, [dtcs]);

  // Per-pillar tiles for the dashboard.
  const pillars = useMemo(() => {
    const sum = (pred) => dtcs.reduce((acc, d) => { const v = dtcValue(d); return acc + (v != null && v > 0 && pred(d) ? v : 0); }, 0);
    const stuff = sum(d => ["Real Property", "Vehicles", "Personal Assets"].includes(d.assetClass));
    const liquid = sum(d => ["bank_account", "investment_account", "crypto_account"].includes(d.type));
    const realProp = sum(d => d.assetClass === "Real Property");
    const vehicles = sum(d => d.assetClass === "Vehicles");
    const personal = sum(d => d.assetClass === "Personal Assets");
    const med = dtcs.find(d => d.type === "medical_certificate");
    return {
      stuff, liquid, realProp, vehicles, personal,
      stuffCount: dtcs.filter(d => ["Real Property", "Vehicles", "Personal Assets"].includes(d.assetClass)).length,
      health: dtcs.filter(d => d.assetClass === "Health").length,
      education: dtcs.filter(d => d.assetClass === "Education").length,
      medExpires: med?.metadata?.expires || null,
    };
  }, [dtcs]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", margin: "0 0 6px 0" }}>
          Vault
        </h1>
        <p style={{ fontSize: 15, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
          Your stuff, money, health, and education — one tamper-evident record, watching the dates.
        </p>
      </div>

      {/* Net worth — picture-first hero (Trump Rule): big number + visual asset-mix bar. */}
      {worth.valued > 0 && (() => {
        const mixSlices = [
          { label: "Real Property", value: pillars.realProp, color: "#7c3aed" },
          { label: "Vehicles",      value: pillars.vehicles,  color: "#2563eb" },
          { label: "Personal Assets", value: pillars.personal, color: "#0891b2" },
          { label: "Liquid",        value: pillars.liquid,    color: "#059669" },
        ].filter(s => s.value > 0);
        const totalMix = mixSlices.reduce((a, s) => a + s.value, 0);
        return (
          <div style={{ padding: "16px 20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 16 }}>
            {/* Row 1: headline */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
              <div>
                <SectionTitle>Net worth</SectionTitle>
                <div style={{ fontSize: 36, fontWeight: 700, color: "#0f172a", letterSpacing: -1, lineHeight: 1 }}>{fmtUsd(worth.net)}</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ background: CAS.GREEN.bg, border: `1px solid ${CAS.GREEN.border}`, borderRadius: 8, padding: "8px 12px", minWidth: 96, textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>Assets</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: CAS.GREEN.text }}>{fmtUsd(worth.assets)}</div>
                </div>
                {worth.liabilities > 0 && (
                  <div style={{ background: CAS.RED.bg, border: `1px solid ${CAS.RED.border}`, borderRadius: 8, padding: "8px 12px", minWidth: 96, textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>Liabilities</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: CAS.RED.text }}>{fmtUsd(-worth.liabilities)}</div>
                  </div>
                )}
              </div>
            </div>
            {/* Row 2: visual asset-mix bar — where the wealth lives */}
            {mixSlices.length > 0 && (
              <div>
                <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", gap: 2, marginBottom: 10 }}>
                  {mixSlices.map(s => (
                    <div key={s.label} style={{ flex: s.value / totalMix, background: s.color, minWidth: 4, borderRadius: 2 }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  {mixSlices.map(s => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "#64748b" }}>{s.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{fmtUsd(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Tabs — underline style. Show ALL pillars always (even empty) so a new user
          sees where their things go and Alex can guide/organize them (Sean 2026-06-24). */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #f1f5f9", marginBottom: 18, overflowX: "auto" }}>
        {["Dashboard", "All", ...ASSET_CLASSES].map((cls) => {
          const active = activeClass === cls;
          const n = counts[cls] || 0;
          const fixed = cls === "Dashboard" || cls === "All";
          return (
            <button key={cls} onClick={() => setActiveClass(cls)} style={{
              padding: "8px 14px", fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer",
              background: "none", border: "none", whiteSpace: "nowrap",
              color: active ? "#7c3aed" : "#64748b",
              borderBottom: active ? "2px solid #7c3aed" : "2px solid transparent",
            }}>
              {cls}{!fixed && n > 0 ? ` (${n})` : ""}
            </button>
          );
        })}
      </div>

      {loading && (
        <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>Loading…</div>
      )}

      {!loading && error && (
        <div style={{ padding: 24, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b" }}>
          {error}
        </div>
      )}

      {/* DASHBOARD — picture-first overview in the canvas vocabulary */}
      {!loading && !error && activeClass === "Dashboard" && (
        <div>
          {/* Currency instrument panel — the through-line (current / expiring / overdue) */}
          {(() => {
            const overdue = attention.filter(a => a.band === "RED").length;
            const expiring = attention.filter(a => a.band === "YELLOW").length;
            const upcoming = attention.filter(a => a.band === "BLUE").length;
            const pills = [
              { band: "GREEN", label: "current", n: attention.length === 0 ? "✓" : Math.max(0, worth.valued - overdue - expiring) },
              { band: "BLUE", label: "upcoming", n: upcoming },
              { band: "YELLOW", label: "expiring", n: expiring },
              { band: "RED", label: "overdue", n: overdue },
            ];
            return (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                {pills.map((p) => { const cc = CAS[p.band]; const muted = !p.n || p.n === 0; return (
                  <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, background: muted ? "#f8fafc" : cc.bg, border: `1px solid ${muted ? "#e2e8f0" : cc.border}`, opacity: muted ? 0.6 : 1 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: cc.dot }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: muted ? "#94a3b8" : cc.text }}>{p.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: muted ? "#cbd5e1" : cc.dot, minWidth: 18, textAlign: "center", borderRadius: 999, padding: "1px 6px" }}>{p.n}</span>
                  </div>
                ); })}
              </div>
            );
          })()}

          <SectionTitle>Your four pillars</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, marginBottom: 20 }}>
            {[
              { label: "My Stuff", big: fmtUsd(pillars.stuff), sub: `${pillars.stuffCount} assets · property, vehicles, valuables` },
              { label: "My Money · liquid", big: fmtUsd(pillars.liquid), sub: "bank + brokerage + crypto" },
              { label: "My Health", big: pillars.medExpires ? "Current" : `${pillars.health} records`, sub: pillars.medExpires ? `FAA medical valid to ${pillars.medExpires}` : "medical records on file" },
              { label: "My Education", big: `${pillars.education}`, sub: "degrees · ratings · training" },
            ].map((t) => (
              <div key={t.label} style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{t.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{t.big}</div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{t.sub}</div>
              </div>
            ))}
          </div>

          {dtcs.length === 0 && (
            <div style={{ padding: "14px 16px", borderRadius: 10, background: "#f5f3ff", border: "1px solid #ddd6fe", marginBottom: 16, fontSize: 13, lineHeight: 1.65, color: "#4c1d95" }}>
              <strong>Your Vault is empty — let's fill it.</strong> The tabs above are your pillars: <strong>Real Property</strong> (home, land), <strong>Vehicles</strong>, <strong>Personal Assets</strong> (valuables, art), <strong>Health</strong> (records, certifications), <strong>Education</strong> (degrees, training), and <strong>Money</strong> (accounts). Just tell Alex — “I have a 2022 Tesla” or “add my house” — and it lands in the right pillar. Or upload a document and Alex files it for you.
            </div>
          )}

          <SectionTitle>Needs attention</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {attention.length === 0 ? (
              <div style={{ padding: "10px 12px", borderRadius: 8, background: CAS.GREEN.bg, borderLeft: `3px solid ${CAS.GREEN.dot}`, fontSize: 13, fontWeight: 600, color: CAS.GREEN.text }}>
                Everything current — nothing expiring soon.
              </div>
            ) : attention.map((a, i) => {
              const cc = CAS[a.band];
              const label = a.days < 0 ? `${Math.abs(a.days)} days overdue` : a.days === 0 ? "due today" : `${a.days} days`;
              return (
                <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: cc.bg, borderLeft: `3px solid ${cc.dot}`, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: cc.text, flex: 1 }}>{a.title}</span>
                  <span style={{ fontSize: 12, color: "#475569" }}>{a.kind} {a.when}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cc.text, minWidth: 92, textAlign: "right" }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !error && activeClass !== "Dashboard" && filtered.length === 0 && (
        <div style={{
          padding: "60px 24px", textAlign: "center",
          background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9",
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>
            No records yet
          </div>
          <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>
            Vault holds your Digital Title Certificates — vehicles, property, credentials, and
            business records. Records minted via your workers will appear here automatically.
          </div>
        </div>
      )}

      {selectedDtc && <LogbookModal dtc={selectedDtc} onClose={() => setSelectedDtc(null)} />}

      {!loading && !error && activeClass !== "Dashboard" && filtered.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16,
        }}>
          {filtered.map((dtc) => {
            const lines = metadataPreview(dtc);
            return (
              <div
                key={dtc.id}
                onClick={() => setSelectedDtc(dtc)}
                style={{
                  background: "#fff", borderRadius: 12,
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  padding: 20, display: "flex", flexDirection: "column",
                  cursor: "pointer", transition: "box-shadow 0.15s ease, transform 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", letterSpacing: 0.5, textTransform: "uppercase" }}>
                    {dtc.assetClass}
                  </div>
                  {chainBadge(dtc)}
                </div>

                <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
                  {dtc.metadata?.title || dtc.metadata?.name || dtc.type || "Record"}
                </div>

                {dtcValue(dtc) != null && (
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 10,
                    color: dtcValue(dtc) < 0 ? "#dc2626" : "#16a34a" }}>
                    {fmtUsd(dtcValue(dtc))}
                  </div>
                )}

                {lines.length > 0 && (
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: 12 }}>
                    {lines.map((l, i) => <div key={i}>{l}</div>)}
                  </div>
                )}

                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#94a3b8" }}>
                  <span>{dtc.logbookCount || 0} logbook {dtc.logbookCount === 1 ? "entry" : "entries"}</span>
                  <code style={{ fontSize: 10 }}>{(dtc.id || "").slice(0, 8)}</code>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
