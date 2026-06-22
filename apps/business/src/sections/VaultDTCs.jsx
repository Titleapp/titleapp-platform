import React, { useState, useMemo, useEffect } from "react";
import { useDtcCatalog, ASSET_CLASSES } from "../data/useDtcCatalog";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function formatTimestamp(ts) {
  if (!ts) return "";
  const ms = ts._seconds ? ts._seconds * 1000 : (ts.toMillis ? ts.toMillis() : new Date(ts).getTime());
  if (!ms) return "";
  return new Date(ms).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Per-DTC logbook viewer. Each DTC owns a logbook of immutable events
// (registration, lien added/cleared, transfer, status change, etc.)
// scoped via /v1/logbook:list?dtcId=xxx. Append form is v1.1.
function LogbookModal({ dtc, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = localStorage.getItem("ID_TOKEN");
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        headers["x-tenant-id"] = "vault"; // MY VAULT is always personal, not the active persona
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
          background: "#fff", borderRadius: 16, width: "100%", maxWidth: 640,
          maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
                {dtc.assetClass} · Logbook
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
                {dtc.metadata?.title || dtc.metadata?.name || dtc.type || "Record"}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                <code style={{ fontSize: 11 }}>{dtc.id}</code>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", fontSize: 24, color: "#64748b", cursor: "pointer", lineHeight: 1, padding: 4 }}
              aria-label="Close"
            >×</button>
          </div>
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
          {!loading && !error && entries.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>No logbook entries yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                Events are appended here as workers act on this record — registrations, liens,
                transfers, inspections, status changes.
              </div>
            </div>
          )}
          {!loading && !error && entries.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  style={{ borderLeft: "3px solid #7c3aed", paddingLeft: 14, paddingTop: 2, paddingBottom: 2 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", textTransform: "capitalize" }}>
                      {(entry.entryType || "event").replace(/_/g, " ")}
                    </span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{formatTimestamp(entry.createdAt)}</span>
                  </div>
                  {entry.data && (
                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                      {Object.entries(entry.data).slice(0, 4).map(([k, v]) => (
                        <div key={k}><span style={{ color: "#94a3b8" }}>{k}:</span> {typeof v === "object" ? JSON.stringify(v) : String(v)}</div>
                      ))}
                    </div>
                  )}
                  {entry.createdByWorker && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                      via {entry.createdByWorker}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer note — append form lands in v1.1 */}
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
      if (m.summary) lines.push(m.summary);
    }
  } else if (MONEY_TYPES.has(dtc.type)) {
    if (m.institution) lines.push(m.institution);
    if (m.balance) lines.push(`Balance: ${m.balance}`);
    if (m.accountType || m.lender) lines.push(m.accountType || m.lender);
  } else if (EDUCATION_TYPES.has(dtc.type)) {
    if (m.institution) lines.push(m.institution);
    if (m.date || m.conferred) lines.push(m.date || m.conferred);
    if (m.summary) lines.push(m.summary);
  } else {
    // Generic: show top-level keys.
    Object.entries(m).slice(0, 3).forEach(([k, v]) => {
      if (typeof v !== "object") lines.push(`${k}: ${v}`);
    });
  }
  return lines.slice(0, 3);
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

  const filtered = activeClass === "All" ? dtcs : dtcs.filter(d => d.assetClass === activeClass);

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
    const med = dtcs.find(d => d.type === "medical_certificate");
    return {
      stuff, liquid,
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

      {/* Net worth — refined hero in the canvas card style (not a loud dark card). */}
      {worth.valued > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap", padding: "16px 20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 16 }}>
          <div>
            <SectionTitle>Net worth</SectionTitle>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#0f172a", letterSpacing: -0.5, lineHeight: 1 }}>{fmtUsd(worth.net)}</div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ background: CAS.GREEN.bg, border: `1px solid ${CAS.GREEN.border}`, borderRadius: 10, padding: "10px 14px", minWidth: 112 }}>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Assets</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: CAS.GREEN.text }}>{fmtUsd(worth.assets)}</div>
            </div>
            <div style={{ background: CAS.RED.bg, border: `1px solid ${CAS.RED.border}`, borderRadius: 10, padding: "10px 14px", minWidth: 112 }}>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Liabilities</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: CAS.RED.text }}>{worth.liabilities ? fmtUsd(-worth.liabilities) : "$0"}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs — underline style, same as the worker canvas. Only pillars with records. */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #f1f5f9", marginBottom: 18, overflowX: "auto" }}>
        {["Dashboard", "All", ...ASSET_CLASSES.filter((cls) => (counts[cls] || 0) > 0)].map((cls) => {
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
