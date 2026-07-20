// DPP Worker Canvas — EU Battery Passport Suite (Workers 1–5)
// Trump Rule: big picture first. Every worker opens on a charge-bar overview
// using the same battery health visual language across all 5 workers.

import React, { useState } from "react";

// ── Slug registry ─────────────────────────────────────────────────────────────

const DPP_SLUGS = new Set([
  "eu-battery-dpp-001",
  "eu-passport-builder-001",
  "eu-supply-chain-tracer-001",
  "eu-registry-manager-001",
  "eu-lifecycle-monitor-001",
]);

// eslint-disable-next-line react-refresh/only-export-components
export function isDPPWorker(w) {
  return DPP_SLUGS.has(w?.workerId || w?.slug || "");
}

// ── Shared demo data (matches seedTraitlyDemo.js) ─────────────────────────────

const CLIENT = {
  name: "Voltara BV",
  jurisdiction: "Netherlands",
  contact: "Jan van der Berg",
  email: "jvdberg@voltara.nl",
  batteryTypes: ["EV", "Industrial", "LMT"],
  dpaSigned: true,
  sccCompliant: true,
  licenseStatus: "Active",
  onboarded: "1 Jul 2026",
  deadline: "18 Feb 2027",
};

const SKUS = [
  {
    id: "btl-ev48-001", sku: "VLT-EV48", name: "EV Module 48V 200Ah",
    category: "EV", pct: 0, color: "grey", daysAtStatus: 14,
    priority: false, status: "Not started",
    gaps: ["All 7 clusters — not yet started"],
  },
  {
    id: "btl-ev72-001", sku: "VLT-EV72", name: "EV Module 72V 150Ah",
    category: "EV", pct: 8, color: "grey", daysAtStatus: 7,
    priority: false, status: "Not started",
    gaps: ["Clusters 2–7 not yet started"],
  },
  {
    id: "btl-ind24-001", sku: "VLT-IND24", name: "Industrial 24V 500Ah",
    category: "Industrial", pct: 38, color: "yellow", daysAtStatus: 21,
    priority: true, status: "In progress",
    gaps: ["Cluster 3: Carbon footprint LCA not initiated", "Clusters 4+5: Supply chain data awaited from cell supplier"],
  },
  {
    id: "btl-ind48-001", sku: "VLT-IND48", name: "Industrial 48V 400Ah",
    category: "Industrial", pct: 64, color: "yellow", daysAtStatus: 35,
    priority: true, status: "In progress",
    gaps: ["Cluster 3: LCA initiated, awaiting third-party assessor report"],
  },
  {
    id: "btl-lmt12-001", sku: "VLT-LMT12", name: "LMT Module 12V 100Ah",
    category: "LMT", pct: 87, color: "yellow", daysAtStatus: 8,
    priority: false, status: "In review",
    gaps: ["3 attribute clarifications requested by advisor"],
  },
  {
    id: "btl-lmt24-001", sku: "VLT-LMT24", name: "LMT Module 24V 80Ah",
    category: "LMT", pct: 95, color: "green", daysAtStatus: 3,
    priority: false, status: "Data complete",
    gaps: ["Cluster 3: Third-party LCA certificate outstanding — blocks registry submission"],
  },
];

const CLUSTERS = [
  { id: 1, name: "General battery & manufacturer information", total: 12 },
  { id: 2, name: "Compliance, labels & certifications", total: 8 },
  { id: 3, name: "Battery carbon footprint (LCA)", total: 15 },
  { id: 4, name: "Supply chain due diligence", total: 18 },
  { id: 5, name: "Battery materials & composition", total: 14 },
  { id: 6, name: "Circularity & resource efficiency", total: 10 },
  { id: 7, name: "Performance & durability (SoH)", total: 13 },
];

const CLUSTER_TABLE = {
  0:  [0,   0,   0,   0,   0,   0,   0  ],
  8:  [55,  0,   0,   0,   0,   0,   0  ],
  38: [90,  75,  0,   30,  20,  0,   0  ],
  64: [100, 100, 8,   65,  70,  40,  55 ],
  87: [100, 100, 60,  95,  95,  90,  85 ],
  95: [100, 100, 80,  100, 100, 100, 100],
};

function getClusters(skuPct) {
  const row = CLUSTER_TABLE[skuPct] || CLUSTER_TABLE[0];
  return CLUSTERS.map((c, i) => {
    const pct = row[i];
    const collected = Math.round((pct / 100) * c.total);
    const source = pct === 0 ? null
      : (i === 3 || i === 4) ? "Supplier portal"
      : i === 6 ? "BMS direct"
      : "Manual upload";
    return { ...c, pct, collected, source };
  });
}

// ── Worker 2 — Passport generation readiness ──────────────────────────────────

const C3_BY_SKU_PCT = { 0: 0, 8: 0, 38: 0, 64: 8, 87: 60, 95: 80 };
const GEN_STATUS = SKUS.map(s => {
  const c3 = C3_BY_SKU_PCT[s.pct] || 0;
  let genStatus, genColor, genNote;
  if (s.pct < 15) {
    genStatus = "Not started"; genColor = "grey";
    genNote = "Data collection not yet begun.";
  } else if (s.pct < 80) {
    genStatus = "Data in progress"; genColor = "grey";
    genNote = `${s.pct}% of 90 attributes collected — 100% required before export is possible.`;
  } else {
    genStatus = "Cluster 3 blocked"; genColor = "yellow";
    genNote = `Cluster 3 LCA at ${c3}% — third-party LCA certificate required to unlock passport export.`;
  }
  return { ...s, c3, genStatus, genColor, genNote };
});

// ── Worker 3 — Supply chain cluster 4+5 automation coverage ──────────────────

const SUPPLY_COVERAGE = [
  { ...SKUS[0], autoPct: 0,  covStatus: "Not started",   covColor: "grey"   },
  { ...SKUS[1], autoPct: 0,  covStatus: "Not started",   covColor: "grey"   },
  { ...SKUS[2], autoPct: 22, covStatus: "Low coverage",  covColor: "grey"   },
  { ...SKUS[3], autoPct: 45, covStatus: "In progress",   covColor: "yellow" },
  { ...SKUS[4], autoPct: 68, covStatus: "Good coverage", covColor: "yellow" },
  { ...SKUS[5], autoPct: 83, covStatus: "High coverage", covColor: "green"  },
];

const SUPPLIERS = [
  { id: "zhenghe",   name: "Zhenghe Celltech Co.", country: "CN", material: "Cell (EV modules)",    status: "Connected", skus: ["VLT-EV48","VLT-EV72"],                            lastUpdate: "4d ago", verified: true  },
  { id: "hanam",     name: "Hanam Cell Corp.",      country: "KR", material: "Cell (Industrial)",   status: "Invited",   skus: ["VLT-IND24","VLT-IND48"],                          lastUpdate: "—",      verified: false },
  { id: "shinpower", name: "ShinPower Corp.",       country: "KR", material: "Cell (LMT modules)",  status: "Connected", skus: ["VLT-LMT12","VLT-LMT24"],                          lastUpdate: "2d ago", verified: true  },
  { id: "rheinwerk", name: "Rheinwerk GmbH",        country: "DE", material: "Electrolyte + cathode", status: "Pending", skus: ["VLT-IND24","VLT-IND48","VLT-LMT12","VLT-LMT24"], lastUpdate: "—",      verified: false },
];

const CONNECTORS = [
  { id: "scip",    name: "SCIP Database",    desc: "ECHA EU hazardous substances — automatic pulls", status: "Configured",  color: "#6366f1" },
  { id: "catenax", name: "Catena-X",         desc: "EU automotive supply chain data exchange",       status: "Coming soon", color: "#94a3b8" },
  { id: "gba",     name: "GBA Battery Pass", desc: "Global Battery Alliance standard exchange",      status: "Coming soon", color: "#94a3b8" },
  { id: "certs",   name: "TÜV / SGS / BV",  desc: "Certificate body direct API verification",       status: "Coming soon", color: "#94a3b8" },
];

// ── Worker 4 — Registry submission pipeline ───────────────────────────────────

const DAYS_TO_REGISTRY = Math.max(0, Math.ceil((new Date("2026-07-19") - new Date()) / (1000 * 60 * 60 * 24)));

const REG_STATUS = SKUS.map(s => {
  let regPct, regStatus, regColor, regNote;
  if (s.pct < 50) {
    regPct = 0; regStatus = "Not ready"; regColor = "grey";
    regNote = "Data completeness too low to queue for submission.";
  } else if (s.pct < 87) {
    regPct = 25; regStatus = "Data in progress"; regColor = "grey";
    regNote = "Complete the compliance record before queuing for submission.";
  } else {
    regPct = 55; regStatus = "Queued — C3 pending"; regColor = "yellow";
    regNote = "Passport draft generated. LCA certificate will unlock registry submission.";
  }
  return { ...s, regPct, regStatus, regColor, regNote };
});

// ── Worker 5 — Live battery fleet (deployed units with BMS telemetry) ─────────

const FLEET = [
  { sku: "VLT-IND24", name: "Industrial 24V 500Ah",  cat: "Industrial", units: 23, soh: 94, cycles: 312,  rated: 2000, pull: "2h ago", bmsStatus: "Live",                  color: "green",  trend: "−0.3%/mo", amendPending: false },
  { sku: "VLT-IND48", name: "Industrial 48V 400Ah",  cat: "Industrial", units: 41, soh: 88, cycles: 587,  rated: 2000, pull: "2h ago", bmsStatus: "Live",                  color: "green",  trend: "−0.4%/mo", amendPending: false },
  { sku: "VLT-LMT12", name: "LMT Module 12V 100Ah",  cat: "LMT",        units: 67, soh: 79, cycles: 1103, rated: 1500, pull: "3h ago", bmsStatus: "Live — ⚠ near threshold", color: "yellow", trend: "−0.6%/mo", amendPending: true  },
  { sku: "VLT-LMT24", name: "LMT Module 24V 80Ah",   cat: "LMT",        units: 89, soh: 71, cycles: 1298, rated: 1500, pull: "4h ago", bmsStatus: "Live — ⚠⚠ second-life",   color: "yellow", trend: "−0.7%/mo", amendPending: true  },
  { sku: "VLT-EV48",  name: "EV Module 48V 200Ah",   cat: "EV",         units: 0,  soh: null, cycles: null, rated: 3000, pull: "—",    bmsStatus: "Not connected",          color: "grey",   trend: "—",        amendPending: false },
  { sku: "VLT-EV72",  name: "EV Module 72V 150Ah",   cat: "EV",         units: 0,  soh: null, cycles: null, rated: 3000, pull: "—",    bmsStatus: "Not connected",          color: "grey",   trend: "—",        amendPending: false },
];

// ── Design tokens ─────────────────────────────────────────────────────────────

const COLOR = {
  grey:   { bar: "#cbd5e1", bg: "#f8fafc", text: "#64748b", badge: "#e2e8f0", badgeText: "#475569" },
  yellow: { bar: "#fbbf24", bg: "#fffbeb", text: "#92400e", badge: "#fef3c7", badgeText: "#78350f" },
  green:  { bar: "#34d399", bg: "#ecfdf5", text: "#065f46", badge: "#d1fae5", badgeText: "#064e3b" },
};

const CATEGORY_COLOR = { EV: "#3b82f6", Industrial: "#f59e0b", LMT: "#8b5cf6" };

function daysToDeadline() {
  const deadline = new Date("2027-02-18");
  const today = new Date();
  return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function ChargeBar({ pct, color, width = 160 }) {
  const displayPct = pct ?? 0;
  const c = COLOR[color] || COLOR.grey;
  const fillW = Math.round((displayPct / 100) * (width - 14));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        width, height: 18, borderRadius: 4,
        border: `1.5px solid ${color === "green" ? "#34d399" : color === "yellow" ? "#fbbf24" : "#cbd5e1"}`,
        background: "#f8fafc", position: "relative", overflow: "hidden", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: fillW,
          background: c.bar, borderRadius: "2px 0 0 2px", transition: "width 0.4s ease",
        }} />
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700,
          color: displayPct > 45 ? "#fff" : c.text,
        }}>
          {pct !== null ? `${displayPct}%` : "—"}
        </div>
      </div>
      <div style={{
        width: 5, height: 10, borderRadius: "0 2px 2px 0",
        background: color === "green" ? "#34d399" : color === "yellow" ? "#fbbf24" : "#cbd5e1",
        flexShrink: 0, marginLeft: -6,
      }} />
    </div>
  );
}

function StatusBadge({ status, color }) {
  const c = COLOR[color] || COLOR.grey;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
      background: c.badge, color: c.badgeText, letterSpacing: "0.03em", textTransform: "uppercase",
    }}>
      {status}
    </span>
  );
}

function CategoryDot({ cat }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
      background: `${CATEGORY_COLOR[cat] || "#6366f1"}18`, color: CATEGORY_COLOR[cat] || "#6366f1",
      letterSpacing: "0.02em",
    }}>
      {cat}
    </span>
  );
}

function SectionLabel({ text }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
      {text}
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #f1f5f9", marginBottom: 20, overflowX: "auto" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: "8px 14px", fontSize: 13, fontWeight: active === t.id ? 700 : 500,
          color: active === t.id ? "#4f46e5" : "#64748b",
          background: "transparent", border: "none", cursor: "pointer",
          borderBottom: `2px solid ${active === t.id ? "#4f46e5" : "transparent"}`,
          marginBottom: -2, whiteSpace: "nowrap",
        }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function SuiteHeader({ workerNum, name, tagline, icon, codex }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
      borderRadius: 12, padding: "16px 20px", marginBottom: 18, color: "#fff",
      display: "flex", alignItems: "flex-start", gap: 14,
    }}>
      <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#93c5fd", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 3 }}>
          EU DPP Suite · Worker {workerNum} of 5
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 3 }}>{name}</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{tagline}</div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "#ffffff18", color: "#93c5fd", flexShrink: 0 }}>
        {codex}
      </div>
    </div>
  );
}

// ── Worker 1 Tab Components ───────────────────────────────────────────────────

function TabDashboard({ onSelectSku }) {
  const days = daysToDeadline();
  const summary = {
    total: SKUS.length,
    complete: SKUS.filter(s => s.color === "green").length,
    progress: SKUS.filter(s => s.color === "yellow").length,
    notStarted: SKUS.filter(s => s.color === "grey").length,
  };
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        borderRadius: 12, padding: "16px 20px", marginBottom: 18, color: "#fff",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 2 }}>
            EU Battery Regulation 2023/1542
          </div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Voltara BV · DPP Compliance</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>6 products in scope · Netherlands</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: days < 300 ? "#fbbf24" : "#34d399", lineHeight: 1 }}>{days}</div>
          <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.05em" }}>DAYS TO DEADLINE</div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>18 Feb 2027</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total SKUs",    value: summary.total,      color: "#6366f1" },
          { label: "Data Complete", value: summary.complete,   color: "#34d399" },
          { label: "In Progress",   value: summary.progress,   color: "#fbbf24" },
          { label: "Not Started",   value: summary.notStarted, color: "#94a3b8" },
        ].map(k => (
          <div key={k.label} style={{ padding: "12px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginTop: 2, letterSpacing: "0.03em" }}>{k.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <SectionLabel text="Passport Charge Status" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SKUS.map(sku => (
          <button key={sku.id} onClick={() => onSelectSku(sku)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10,
            background: COLOR[sku.color].bg,
            border: `1.5px solid ${sku.color === "grey" ? "#e2e8f0" : sku.color === "yellow" ? "#fde68a" : "#a7f3d0"}`,
            cursor: "pointer", textAlign: "left", width: "100%",
          }}>
            <ChargeBar pct={sku.pct} color={sku.color} width={130} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                {sku.priority && <span style={{ fontSize: 9, fontWeight: 700, color: "#ef4444", letterSpacing: "0.05em" }}>★ PRIORITY</span>}
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{sku.sku}</span>
                <CategoryDot cat={sku.category} />
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{sku.name}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
              <StatusBadge status={sku.status} color={sku.color} />
              <span style={{ fontSize: 10, color: "#94a3b8" }}>{sku.daysAtStatus}d at status</span>
            </div>
            <div style={{ color: "#cbd5e1", fontSize: 14, flexShrink: 0 }}>›</div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
        {[{ color: "grey", label: "Not started" }, { color: "yellow", label: "In progress" }, { color: "green", label: "Data complete — ready for advisor review" }].map(l => (
          <div key={l.color} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: COLOR[l.color].bar }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabPassport({ selectedSku, onSelectSku }) {
  const [expanded, setExpanded] = useState(null);
  const sku = selectedSku || SKUS[3];
  const clusters = getClusters(sku.pct);
  const SOURCE_COLOR = { "Manual upload": "#6366f1", "Supplier portal": "#f59e0b", "BMS direct": "#10b981" };
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <SectionLabel text="Select product" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SKUS.map(s => (
            <button key={s.id} onClick={() => onSelectSku(s)} style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: s.id === sku.id ? "#1e293b" : "#f1f5f9",
              color: s.id === sku.id ? "#fff" : "#475569",
              border: s.id === sku.id ? "none" : "1px solid #e2e8f0",
            }}>
              {s.sku}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
        background: COLOR[sku.color].bg,
        border: `1px solid ${sku.color === "grey" ? "#e2e8f0" : sku.color === "yellow" ? "#fde68a" : "#a7f3d0"}`,
        borderRadius: 10, marginBottom: 16,
      }}>
        <ChargeBar pct={sku.pct} color={sku.color} width={120} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{sku.sku} — {sku.name}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{sku.pct}% complete · {sku.status}</div>
        </div>
        <StatusBadge status={sku.status} color={sku.color} />
      </div>

      <SectionLabel text="90 Attributes across 7 Clusters" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {clusters.map(cl => (
          <div key={cl.id} style={{ borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden", background: cl.pct === 100 ? "#f0fdf4" : cl.pct === 0 ? "#f8fafc" : "#fff" }}>
            <button onClick={() => setExpanded(expanded === cl.id ? null : cl.id)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 14px", cursor: "pointer", background: "transparent", border: "none", textAlign: "left",
            }}>
              <div style={{ width: 60, height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                <div style={{ height: "100%", width: `${cl.pct}%`, borderRadius: 4, background: cl.pct === 100 ? "#34d399" : cl.pct === 0 ? "#cbd5e1" : "#fbbf24" }} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>Cluster {cl.id} — {cl.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {cl.source && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: `${SOURCE_COLOR[cl.source]}18`, color: SOURCE_COLOR[cl.source] }}>
                    {cl.source}
                  </span>
                )}
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{cl.collected}/{cl.total}</span>
                <span style={{ color: "#cbd5e1", fontSize: 12 }}>{expanded === cl.id ? "∧" : "∨"}</span>
              </div>
            </button>
            {expanded === cl.id && (
              <div style={{ padding: "0 14px 12px", borderTop: "1px solid #f1f5f9" }}>
                {cl.pct === 0 ? (
                  <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", padding: "8px 0" }}>
                    No attributes collected yet. {cl.id === 4 || cl.id === 5 ? "Supplier portal invitation pending." : "Upload documents or ask Elara to guide you through."}
                  </div>
                ) : cl.pct === 100 ? (
                  <div style={{ fontSize: 12, color: "#059669", padding: "8px 0", fontWeight: 600 }}>
                    ✓ All {cl.total} attributes collected.{cl.source && ` Source: ${cl.source}.`}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#64748b", padding: "8px 0" }}>
                    {cl.collected} of {cl.total} attributes collected.
                    {cl.id === 3 && " Third-party LCA certification is blocking completion of this cluster."}
                    {(cl.id === 4 || cl.id === 5) && " Remaining attributes require supplier portal submission from cell manufacturer."}
                    {cl.source && ` Primary source: ${cl.source}.`}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: "12px 16px", background: "#fef2f2", borderRadius: 10, border: "1px solid #fecaca" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#991b1b", marginBottom: 4 }}>Export blocked</div>
        <div style={{ fontSize: 11, color: "#7f1d1d" }}>
          Cluster 3 (carbon footprint) must reach 100% before the EU registry-ready passport draft can be exported. Requires a verified LCA certificate from an accredited third-party assessor (TÜV, Bureau Veritas, SGS).
        </div>
      </div>
    </div>
  );
}

function TabTimeline() {
  const milestones = [
    { date: "18 Aug 2025", label: "Carbon footprint declarations in force", status: "past", note: "Already in force. Some clients may already be non-compliant." },
    { date: "19 Jul 2026",  label: "EU DPP Central Registry goes live",      status: "soon", note: "Early submission now open. Credibility advantage for first movers." },
    { date: "18 Feb 2027",  label: "Full passport mandatory — no exceptions", status: "deadline", note: "No EU market access without a registered Digital Battery Passport." },
  ];
  const clientStages = [
    { stage: "Audit & scope", done: true }, { stage: "Gap fill", done: true },
    { stage: "Passport draft", done: false }, { stage: "Advisor review", done: false },
    { stage: "Registry submit", done: false }, { stage: "Registered", done: false },
  ];
  return (
    <div>
      <SectionLabel text="Hard deadlines" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {milestones.map(m => (
          <div key={m.date} style={{
            padding: "12px 16px", borderRadius: 10, border: "1px solid",
            borderColor: m.status === "deadline" ? "#fca5a5" : m.status === "soon" ? "#fde68a" : "#d1fae5",
            background: m.status === "deadline" ? "#fff5f5" : m.status === "soon" ? "#fffbeb" : "#f0fdf4",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: m.status === "deadline" ? "#ef4444" : m.status === "soon" ? "#f59e0b" : "#34d399" }} />
              <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{m.date}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: m.status === "deadline" ? "#dc2626" : m.status === "soon" ? "#92400e" : "#065f46" }}>{m.label}</div>
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, marginLeft: 18 }}>{m.note}</div>
          </div>
        ))}
      </div>
      <SectionLabel text="Voltara milestone tracker" />
      <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
        {clientStages.map((s, i) => (
          <div key={s.stage} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ height: 4, background: s.done ? "#6366f1" : "#e2e8f0", marginBottom: 6, borderRadius: i === 0 ? "2px 0 0 2px" : i === clientStages.length - 1 ? "0 2px 2px 0" : 0 }} />
            <div style={{ width: 20, height: 20, borderRadius: "50%", margin: "0 auto 4px", background: s.done ? "#6366f1" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: s.done ? "#fff" : "#94a3b8", fontWeight: 700 }}>
              {s.done ? "✓" : i + 1}
            </div>
            <div style={{ fontSize: 9, color: s.done ? "#4f46e5" : "#94a3b8", fontWeight: s.done ? 700 : 400, lineHeight: 1.3 }}>{s.stage}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabClientFile() {
  const fields = [
    ["Company", CLIENT.name], ["Jurisdiction", CLIENT.jurisdiction],
    ["Contact", CLIENT.contact], ["Email", CLIENT.email],
    ["Battery types", CLIENT.batteryTypes.join(", ")],
    ["DPA signed", CLIENT.dpaSigned ? "✓ Yes" : "No"],
    ["SCC compliant", CLIENT.sccCompliant ? "✓ Yes" : "No"],
    ["License", CLIENT.licenseStatus],
    ["Onboarded", CLIENT.onboarded], ["Hard deadline", CLIENT.deadline],
  ];
  return (
    <div>
      <SectionLabel text="Voltara BV" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {fields.map(([label, value]) => (
          <div key={label} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 16px", background: "#fef9c3", borderRadius: 10, border: "1px solid #fde68a" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#78350f", marginBottom: 4 }}>EU data residency — pending</div>
        <div style={{ fontSize: 11, color: "#92400e" }}>
          SOCIII Firestore must be migrated to an EU-region before EU client battery attribute data is stored at scale. Currently using US-central. Required before Voltara goes beyond the pilot phase.
        </div>
      </div>
    </div>
  );
}

function TabReports() {
  const urgent = [
    "VLT-LMT24: Cluster 3 LCA certificate outstanding — blocks registry submission",
    "VLT-IND24 + VLT-IND48: Supplier portal not yet accepted by cell manufacturer",
    "VLT-EV48 + VLT-EV72: Not yet started — kickoff session needed",
  ];
  return (
    <div>
      <SectionLabel text="Draft — Week of 7 Jul 2026" />
      <div style={{ padding: "14px 16px", borderRadius: 12, background: "#fff7ed", border: "1.5px solid #fed7aa", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#c2410c" }}>⏳ Pending review</div>
          <div style={{ fontSize: 11, color: "#9a3412", marginLeft: "auto" }}>Auto-generated · 48-hour hold · Awaiting Elise approval</div>
        </div>
        <div style={{ fontSize: 12, color: "#7c2d12" }}>
          This weekly status report is ready for your review. No report is sent to Voltara without your explicit approval.
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        {[{ label: "Data complete", value: "1 / 6", color: "#34d399" }, { label: "In progress", value: "2 / 6", color: "#fbbf24" }, { label: "Not started", value: "2 / 6", color: "#94a3b8" }].map(k => (
          <div key={k.label} style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</div>
          </div>
        ))}
      </div>
      <SectionLabel text="Urgent items" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {urgent.map((item, i) => (
          <div key={i} style={{ padding: "10px 14px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", fontSize: 12, color: "#991b1b", display: "flex", gap: 8 }}>
            <span style={{ fontWeight: 700, flexShrink: 0 }}>!</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
      <button style={{ width: "100%", padding: "12px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", border: "none", background: "#6366f1", color: "#fff" }}>
        Review + Approve Report
      </button>
    </div>
  );
}

// ── Worker 1 Canvas ───────────────────────────────────────────────────────────

const W1_TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "passport",  label: "Passport Builder" },
  { id: "timeline",  label: "Timeline" },
  { id: "client",    label: "Client File" },
  { id: "reports",   label: "Advisory Reports" },
];

function Worker1Canvas() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedSku, setSelectedSku] = useState(null);

  function handleSkuSelect(sku) {
    setSelectedSku(sku);
    setActiveTab("passport");
  }

  return (
    <div style={{ marginTop: 16 }}>
      <TabBar tabs={W1_TABS} active={activeTab} onChange={setActiveTab} />
      {activeTab === "dashboard" && <TabDashboard onSelectSku={handleSkuSelect} />}
      {activeTab === "passport"  && <TabPassport selectedSku={selectedSku} onSelectSku={setSelectedSku} />}
      {activeTab === "timeline"  && <TabTimeline />}
      {activeTab === "client"    && <TabClientFile />}
      {activeTab === "reports"   && <TabReports />}
    </div>
  );
}

// ── Worker 2 — EU Passport Builder ────────────────────────────────────────────

function PBTabQueue() {
  const noneReady = GEN_STATUS.every(s => s.genColor !== "green");
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        borderRadius: 12, padding: "16px 20px", marginBottom: 18, color: "#fff",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 2 }}>Passport Generation Queue</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Voltara BV — 6 Products</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>0 ready to generate · 2 near-ready (C3 pending) · 4 in progress</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>0 / 6</div>
          <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.05em" }}>READY TO GENERATE</div>
        </div>
      </div>

      {noneReady && (
        <div style={{ padding: "10px 14px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, marginBottom: 18, fontSize: 12, color: "#92400e" }}>
          <strong>Cluster 3 gate is active for all products.</strong> Carbon footprint LCA certificate required before any passport can be exported. VLT-LMT24 is closest at 80% — one certificate away.
        </div>
      )}

      <SectionLabel text="Generation readiness by product" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {GEN_STATUS.map(s => (
          <div key={s.id} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10,
            background: COLOR[s.genColor].bg,
            border: `1.5px solid ${s.genColor === "green" ? "#a7f3d0" : s.genColor === "yellow" ? "#fde68a" : "#e2e8f0"}`,
          }}>
            <ChargeBar pct={s.pct} color={s.genColor} width={110} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{s.sku}</span>
                <CategoryDot cat={s.category} />
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{s.genNote}</div>
            </div>
            <div style={{ flexShrink: 0, textAlign: "right" }}>
              <StatusBadge status={s.genStatus} color={s.genColor} />
              {s.c3 > 0 && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>Cluster 3: {s.c3}%</div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
        {[{ color: "grey", label: "Data in progress" }, { color: "yellow", label: "Cluster 3 blocked" }, { color: "green", label: "Ready to generate" }].map(l => (
          <div key={l.color} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: COLOR[l.color].bar }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PBTabExport() {
  return (
    <div>
      {DAYS_TO_REGISTRY > 0 ? (
        <div style={{ padding: "16px", background: "#fef2f2", border: "2px solid #fca5a5", borderRadius: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#991b1b", marginBottom: 6 }}>⚠ TEST MODE — Registry not yet live</div>
          <div style={{ fontSize: 12, color: "#7f1d1d", lineHeight: 1.6 }}>
            The EU DPP Central Registry opens in {DAYS_TO_REGISTRY} day{DAYS_TO_REGISTRY !== 1 ? "s" : ""} (19 July 2026). Any passport ID or QR code generated now is a mock stub. <strong>Do not print QR codes on product labels</strong> before the real registry is live and your passport is officially registered.
          </div>
        </div>
      ) : (
        <div style={{ padding: "16px", background: "#ecfdf5", border: "2px solid #6ee7b7", borderRadius: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#065f46", marginBottom: 6 }}>✓ Registry is live — 19 Jul 2026</div>
          <div style={{ fontSize: 12, color: "#064e3b", lineHeight: 1.6 }}>
            The EU DPP Central Registry is open. Products with completed passports (Cluster 3 at 100%) are eligible for official submission. Submitted passports receive a real registry ID and scannable QR code.
          </div>
        </div>
      )}

      <SectionLabel text="Products eligible for export" />
      <div style={{ padding: "24px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", textAlign: "center", color: "#64748b", fontSize: 13, marginBottom: 20 }}>
        No products currently eligible. All require Cluster 3 (carbon footprint LCA) to reach 100% before passport export is unlocked.
      </div>

      <SectionLabel text="Pre-submission checklist" />
      {[
        { label: "Cluster 3 (LCA) verified at 100%",  done: false },
        { label: "DPA signed — Voltara BV",           done: true  },
        { label: "SCC compliant — confirmed",          done: true  },
        { label: "EU data residency confirmed",        done: false },
        { label: "Registry allowlisting applied for", done: false },
      ].map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: item.done ? "#d1fae5" : "#f1f5f9", border: `1.5px solid ${item.done ? "#34d399" : "#e2e8f0"}`, fontSize: 11, color: item.done ? "#059669" : "#94a3b8", fontWeight: 700 }}>
            {item.done ? "✓" : "○"}
          </div>
          <span style={{ fontSize: 12, color: item.done ? "#059669" : "#374151" }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function PBTabLedger() {
  return (
    <div>
      <SectionLabel text="Registered passports" />
      <div style={{ padding: "40px 20px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>No passports registered yet</div>
        <div style={{ fontSize: 12, color: "#64748b", maxWidth: 320, margin: "0 auto" }}>
          Passports appear here after submission to the EU DPP Central Registry (opens 19 Jul 2026) and receipt of an official passport ID and QR code.
        </div>
      </div>
    </div>
  );
}

function PassportBuilderCanvas() {
  const [active, setActive] = useState("queue");
  const [selectedSku, setSelectedSku] = useState(null);
  const tabs = [
    { id: "queue",   label: "Passport Queue" },
    { id: "preview", label: "Passport Preview" },
    { id: "export",  label: "Export + Submit" },
    { id: "ledger",  label: "Passport Ledger" },
  ];
  return (
    <div style={{ marginTop: 16 }}>
      <SuiteHeader workerNum={2} name="EU Passport Builder" tagline="Generates registry-ready Digital Battery Passports in Annex XIII JSON-LD format." icon="📄" codex="CODEX 30" />
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === "queue"   && <PBTabQueue />}
      {active === "preview" && <TabPassport selectedSku={selectedSku} onSelectSku={setSelectedSku} />}
      {active === "export"  && <PBTabExport />}
      {active === "ledger"  && <PBTabLedger />}
    </div>
  );
}

// ── Worker 3 — EU Supply Chain Tracer ─────────────────────────────────────────

function SCTabCoverage() {
  const netCovered = SUPPLY_COVERAGE.filter(s => s.covColor !== "grey").length;
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        borderRadius: 12, padding: "16px 20px", marginBottom: 18, color: "#fff",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 2 }}>Supplier Data Network</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Voltara BV — Cluster 4+5 Automation</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            {SUPPLIERS.filter(s => s.status === "Connected").length} suppliers connected · {SUPPLIERS.filter(s => s.status !== "Connected").length} pending
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>{netCovered} / 6</div>
          <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.05em" }}>SKUS WITH COVERAGE</div>
        </div>
      </div>

      <div style={{ padding: "10px 14px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, marginBottom: 18, fontSize: 12, color: "#0369a1" }}>
        The charge bar shows what % of Cluster 4+5 attributes are sourced automatically via the supplier network — not manually uploaded. Higher automation = lower advisor effort per passport.
      </div>

      <SectionLabel text="Cluster 4+5 automation coverage by product" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SUPPLY_COVERAGE.map(s => (
          <div key={s.id} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10,
            background: COLOR[s.covColor].bg,
            border: `1.5px solid ${s.covColor === "green" ? "#a7f3d0" : s.covColor === "yellow" ? "#fde68a" : "#e2e8f0"}`,
          }}>
            <ChargeBar pct={s.autoPct} color={s.covColor} width={110} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{s.sku}</span>
                <CategoryDot cat={s.category} />
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{s.name}</div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <StatusBadge status={s.covStatus} color={s.covColor} />
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, textAlign: "right" }}>{s.autoPct}% automated</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
        {[{ color: "grey", label: "No supplier connection yet" }, { color: "yellow", label: "Partial — invites pending" }, { color: "green", label: "High automation" }].map(l => (
          <div key={l.color} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: COLOR[l.color].bar }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SCTabSuppliers() {
  const statusColor = { Connected: "#059669", Invited: "#d97706", Pending: "#6366f1" };
  const statusBg   = { Connected: "#d1fae5", Invited: "#fef3c7", Pending: "#ede9fe" };
  return (
    <div>
      <SectionLabel text="Supplier network — Voltara BV" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {SUPPLIERS.map(sup => (
          <div key={sup.id} style={{ padding: "14px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#475569", flexShrink: 0 }}>
                {sup.country}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{sup.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: statusBg[sup.status] || "#f1f5f9", color: statusColor[sup.status] || "#64748b" }}>
                    {sup.status}
                  </span>
                  {sup.verified && <span style={{ fontSize: 10, color: "#059669" }}>✓ Verified</span>}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{sup.material}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {sup.skus.map(s => (
                    <span key={s} style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>{s}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>Last update</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{sup.lastUpdate}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button style={{ width: "100%", padding: "11px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#374151" }}>
        + Invite supplier
      </button>
    </div>
  );
}

function SCTabConnectors() {
  return (
    <div>
      <div style={{ padding: "10px 14px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, marginBottom: 18, fontSize: 12, color: "#0369a1" }}>
        Platform connectors automatically pull Cluster 4+5 data from industry networks — no manual upload required. Each connected data source auto-satisfies attributes across all clients using that supplier.
      </div>
      <SectionLabel text="Platform data connectors" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {CONNECTORS.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{c.desc}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: c.status === "Configured" ? "#ede9fe" : "#f1f5f9", color: c.status === "Configured" ? "#6366f1" : "#94a3b8", flexShrink: 0 }}>
              {c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SCTabGaps() {
  return (
    <div>
      <SectionLabel text="Cluster 4+5 gap analysis by product" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {SUPPLY_COVERAGE.map(s => {
          const gap = 100 - s.autoPct;
          return (
            <div key={s.id} style={{ padding: "14px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{s.sku}</span>
                <CategoryDot cat={s.category} />
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#64748b" }}>{s.autoPct}% automated · {gap}% still manual</span>
              </div>
              <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                <div style={{ height: "100%", width: `${s.autoPct}%`, background: s.covColor === "green" ? "#34d399" : s.covColor === "yellow" ? "#fbbf24" : "#cbd5e1", borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                {s.autoPct === 0 ? "No supplier connections for this product yet. Invite cell manufacturer to Supplier Portal to start automating." :
                 s.autoPct < 50 ? "Supplier invited but data submission pending. Follow up with Samsung SDI." :
                 "Good coverage. Remaining gaps are materials certifications — invite BASF to complete."}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SupplyChainCanvas() {
  const [active, setActive] = useState("coverage");
  const tabs = [
    { id: "coverage",    label: "Coverage Overview" },
    { id: "suppliers",   label: "Supplier Network" },
    { id: "connectors",  label: "Platform Connectors" },
    { id: "gaps",        label: "Gap Analysis" },
  ];
  return (
    <div style={{ marginTop: 16 }}>
      <SuiteHeader workerNum={3} name="Supply Chain Tracer" tagline="Supplier submits once — data flows to every passport using their components." icon="🔗" codex="CODEX 31" />
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === "coverage"   && <SCTabCoverage />}
      {active === "suppliers"  && <SCTabSuppliers />}
      {active === "connectors" && <SCTabConnectors />}
      {active === "gaps"       && <SCTabGaps />}
    </div>
  );
}

// ── Worker 4 — EU Registry Manager ────────────────────────────────────────────

function RMTabStatus() {
  const ready = REG_STATUS.filter(s => s.regColor === "green").length;
  const queued = REG_STATUS.filter(s => s.regPct === 55).length;
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        borderRadius: 12, padding: "16px 20px", marginBottom: 18, color: "#fff",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 2 }}>EU DPP Central Registry</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Voltara BV — Submission Pipeline</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{queued} passport{queued !== 1 ? "s" : ""} queued · {ready} registered · allowlisting pending</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>{DAYS_TO_REGISTRY}</div>
          <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.05em" }}>DAYS TO REGISTRY OPEN</div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>19 Jul 2026</div>
        </div>
      </div>

      <div style={{ padding: "10px 14px", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 18, fontSize: 12, color: "#78350f" }}>
        <strong>Allowlisting required.</strong> Third-party submitters (advisors, platforms) must register with the EU Commission's registry operator before submission is possible. Apply immediately when the registry opens on 19 Jul 2026.
      </div>

      <SectionLabel text="Submission pipeline by product" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {REG_STATUS.map(s => (
          <div key={s.id} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10,
            background: COLOR[s.regColor].bg,
            border: `1.5px solid ${s.regColor === "green" ? "#a7f3d0" : s.regColor === "yellow" ? "#fde68a" : "#e2e8f0"}`,
          }}>
            <ChargeBar pct={s.regPct} color={s.regColor} width={110} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{s.sku}</span>
                <CategoryDot cat={s.category} />
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{s.regNote}</div>
            </div>
            <StatusBadge status={s.regStatus} color={s.regColor} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
        {[{ color: "grey", label: "Not ready" }, { color: "yellow", label: "Queued — Cluster 3 pending" }, { color: "green", label: "Registered" }].map(l => (
          <div key={l.color} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: COLOR[l.color].bar }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RMTabQueue() {
  const queuedSkus = REG_STATUS.filter(s => s.regPct === 55);
  return (
    <div>
      <SectionLabel text="Passports queued for submission" />
      {queuedSkus.length === 0 ? (
        <div style={{ padding: "24px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", textAlign: "center", color: "#64748b", fontSize: 13 }}>
          No passports are ready for submission yet. Complete compliance records and Cluster 3 LCA to add products to the submission queue.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {queuedSkus.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10 }}>
              <ChargeBar pct={s.regPct} color="yellow" width={80} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{s.sku} — {s.name}</div>
                <div style={{ fontSize: 11, color: "#92400e", marginTop: 2 }}>{s.regNote}</div>
              </div>
              <button style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "1px solid #fbbf24", background: "#fffbeb", color: "#78350f", cursor: "not-allowed", opacity: 0.6 }}>
                Submit (registry opens {DAYS_TO_REGISTRY}d)
              </button>
            </div>
          ))}
        </div>
      )}

      <SectionLabel text="Submission prerequisites" />
      {[
        { label: "Registry allowlisting",          done: false, note: "Apply on 19 Jul 2026 when registry opens" },
        { label: "Registry API schema received",   done: false, note: "EU Commission publishes pre-launch" },
        { label: "Passport Builder active",        done: true,  note: "CODEX 30 — live" },
        { label: "EU data residency confirmed",    done: false, note: "Firestore EU-region migration required" },
      ].map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", background: item.done ? "#d1fae5" : "#f1f5f9", border: `1.5px solid ${item.done ? "#34d399" : "#e2e8f0"}`, fontSize: 11, color: item.done ? "#059669" : "#94a3b8", fontWeight: 700 }}>
            {item.done ? "✓" : "○"}
          </div>
          <div>
            <div style={{ fontSize: 12, color: item.done ? "#059669" : "#374151", fontWeight: item.done ? 600 : 400 }}>{item.label}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.note}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RMTabQR() {
  return (
    <div>
      {DAYS_TO_REGISTRY > 0 && (
        <div style={{ padding: "16px", background: "#fef2f2", border: "2px solid #fca5a5", borderRadius: 12, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#991b1b", marginBottom: 6 }}>⚠ TEST MODE — QR download disabled</div>
          <div style={{ fontSize: 12, color: "#7f1d1d", lineHeight: 1.6 }}>
            QR codes are mock stubs until passports are registered with the EU DPP Central Registry (opens 19 Jul 2026, {DAYS_TO_REGISTRY} day{DAYS_TO_REGISTRY !== 1 ? "s" : ""}). QR download is disabled until official registration is confirmed. Do not use test QR codes on product labels.
          </div>
        </div>
      )}
      <SectionLabel text="QR code status by product" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SKUS.map(s => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 6, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 22, height: 22, background: "#94a3b8", borderRadius: 2 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{s.sku}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>No passport ID assigned — pending registration</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#e2e8f0", color: "#64748b" }}>Not registered</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RMTabAlerts() {
  const days = daysToDeadline();
  return (
    <div>
      <SectionLabel text="Upcoming deadlines" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { label: "EU DPP Central Registry opens",    date: "19 Jul 2026", urgency: "soon",     note: `${DAYS_TO_REGISTRY} days. Apply for allowlisting on day one.`, action: "Register for allowlist" },
          { label: "Full passport mandatory",          date: "18 Feb 2027", urgency: "deadline", note: `${days} days. VLT-LMT24 is closest to ready — prioritize LCA certificate.`, action: null },
        ].map((a, i) => (
          <div key={i} style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid", borderColor: a.urgency === "deadline" ? "#fca5a5" : "#fde68a", background: a.urgency === "deadline" ? "#fff5f5" : "#fffbeb" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.urgency === "deadline" ? "#ef4444" : "#f59e0b", flexShrink: 0 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{a.date}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: a.urgency === "deadline" ? "#dc2626" : "#92400e" }}>{a.label}</div>
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginLeft: 18, marginBottom: a.action ? 10 : 0 }}>{a.note}</div>
            {a.action && (
              <button style={{ marginLeft: 18, padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "1.5px solid #fbbf24", background: "#fffbeb", color: "#78350f", cursor: "pointer" }}>
                {a.action}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RegistryManagerCanvas() {
  const [active, setActive] = useState("status");
  const tabs = [
    { id: "status", label: "Registry Status" },
    { id: "queue",  label: "Submission Queue" },
    { id: "qr",     label: "QR Codes" },
    { id: "alerts", label: "Alerts" },
  ];
  return (
    <div style={{ marginTop: 16 }}>
      <SuiteHeader workerNum={4} name="EU Registry Manager" tagline="Manages the live relationship with the EU DPP Central Registry." icon="🏛️" codex="CODEX 32" />
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === "status" && <RMTabStatus />}
      {active === "queue"  && <RMTabQueue />}
      {active === "qr"     && <RMTabQR />}
      {active === "alerts" && <RMTabAlerts />}
    </div>
  );
}

// ── Worker 5 — EU Lifecycle Monitor ──────────────────────────────────────────

function LMTabFleet() {
  const live = FLEET.filter(f => f.soh !== null);
  const alerts = FLEET.filter(f => f.soh !== null && f.soh < 80);
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        borderRadius: 12, padding: "16px 20px", marginBottom: 18, color: "#fff",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 2 }}>Live Battery Fleet</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Voltara — Deployed Units</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            {live.reduce((n, f) => n + f.units, 0)} units monitored · {alerts.length} product{alerts.length !== 1 ? "s" : ""} with SoH alerts
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: alerts.length > 0 ? "#fbbf24" : "#34d399", lineHeight: 1 }}>{alerts.length}</div>
          <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.05em" }}>SoH ALERTS</div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div style={{ padding: "10px 14px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, marginBottom: 18, fontSize: 12, color: "#92400e" }}>
          <strong>{alerts.length} product line{alerts.length !== 1 ? "s" : ""} below 80% SoH.</strong> EU Battery Regulation requires documentation of repurposing or retirement at this threshold. Draft amendment queued for advisor review.
        </div>
      )}

      <SectionLabel text="State of Health by product line" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {FLEET.map(f => (
          <div key={f.sku} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10,
            background: COLOR[f.color].bg,
            border: `1.5px solid ${f.color === "green" ? "#a7f3d0" : f.color === "yellow" ? "#fde68a" : "#e2e8f0"}`,
          }}>
            <ChargeBar pct={f.soh} color={f.color} width={110} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{f.sku}</span>
                <CategoryDot cat={f.cat} />
                {f.amendPending && <span style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.05em" }}>● AMENDMENT QUEUED</span>}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{f.units > 0 ? `${f.units} units · ${f.cycles !== null ? `${f.cycles}/${f.rated} cycles` : "—"} · Last pull: ${f.pull}` : "Not deployed — no BMS data"}</div>
            </div>
            <div style={{ flexShrink: 0, textAlign: "right" }}>
              <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: COLOR[f.color].badge, color: COLOR[f.color].badgeText, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {f.soh !== null ? `${f.soh}% SoH` : "No data"}
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>{f.trend}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
        {[{ color: "grey", label: "BMS not connected" }, { color: "yellow", label: "SoH < 80% — action required" }, { color: "green", label: "Healthy (SoH ≥ 80%)" }].map(l => (
          <div key={l.color} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: COLOR[l.color].bar }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LMTabAmendments() {
  const pending = FLEET.filter(f => f.amendPending);
  return (
    <div>
      <SectionLabel text="Passport update queue" />
      {pending.length === 0 ? (
        <div style={{ padding: "24px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #a7f3d0", textAlign: "center", color: "#065f46", fontSize: 13 }}>
          No amendments pending. All registered passports reflect current SoH.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {pending.map(f => (
            <div key={f.sku} style={{ padding: "14px 16px", background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>{f.sku} — {f.name}</div>
                  <div style={{ fontSize: 11, color: "#92400e" }}>SoH {f.soh}% — below 80% EV repurposing threshold (EU Battery Reg Article 14)</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#fef3c7", color: "#78350f", flexShrink: 0 }}>Draft ready</span>
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>
                Amendment pre-drafted: SoH update from last registered value → {f.soh}%. Advisor review required before submission to EU Registry Manager.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, padding: "7px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "1.5px solid #fbbf24", background: "#fffbeb", color: "#78350f", cursor: "pointer" }}>
                  Review amendment
                </button>
                <button style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", cursor: "pointer" }}>
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, color: "#64748b" }}>
        Amendments are prepared by the Lifecycle Monitor but require explicit advisor approval before submission. RAAS rule: no autonomous registry updates.
      </div>
    </div>
  );
}

function LMTabBMS() {
  return (
    <div>
      <SectionLabel text="BMS connections by product" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {FLEET.map(f => (
          <div key={f.sku} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: f.soh !== null ? "#34d399" : "#cbd5e1" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{f.sku}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{f.bmsStatus}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{f.soh !== null ? `${f.units} units live` : "No connection"}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>{f.pull !== "—" ? `Last pull: ${f.pull}` : "—"}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 16px", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, fontSize: 12, color: "#78350f" }}>
        <strong>BMS integration note:</strong> No standard BMS API exists — each product line requires a bespoke integration with Voltara's hardware team. EV48 and EV72 BMS adapters are not yet commissioned. Contact Voltara firmware team to scope the integration.
      </div>
    </div>
  );
}

function LMTabSecondLife() {
  const secondLife = FLEET.filter(f => f.soh !== null && f.soh < 80);
  return (
    <div>
      <SectionLabel text="Products at or below 80% SoH (EV second-life threshold)" />
      {secondLife.length === 0 ? (
        <div style={{ padding: "24px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #a7f3d0", textAlign: "center", color: "#065f46", fontSize: 13 }}>
          No products currently below the 80% SoH threshold.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {secondLife.map(f => (
            <div key={f.sku} style={{ padding: "14px 16px", background: "#fffbeb", border: "1.5px solid #fed7aa", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <ChargeBar pct={f.soh} color="yellow" width={90} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{f.sku}</div>
                  <div style={{ fontSize: 11, color: "#92400e" }}>{f.units} units · {f.cycles}/{f.rated} rated cycles</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>
                At {f.soh}% SoH, these units are below the EU EV second-life threshold. Options: (1) repurpose for stationary/industrial use with a new passport, or (2) document planned retirement. EU Battery Regulation Article 14 requires this to be recorded.
              </div>
              <button style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "1.5px solid #fbbf24", background: "#fffbeb", color: "#78350f", cursor: "pointer" }}>
                Initiate second-life passport
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, color: "#64748b" }}>
        <strong>Open decision:</strong> Second-life market connections (battery recyclers, refurbishers) are planned for this tab. Scope must be confirmed before build — informational list vs. referral marketplace are two distinct models. See CODEX 33 §3 Tab 5.
      </div>
    </div>
  );
}

function LifecycleMonitorCanvas() {
  const [active, setActive] = useState("fleet");
  const tabs = [
    { id: "fleet",      label: "Live Battery Fleet" },
    { id: "amendments", label: "Update Queue" },
    { id: "bms",        label: "BMS Connections" },
    { id: "secondlife", label: "Second-Life Tracker" },
  ];
  return (
    <div style={{ marginTop: 16 }}>
      <SuiteHeader workerNum={5} name="Lifecycle Monitor" tagline="BMS direct API. Passport updates itself as batteries age." icon="⚡" codex="CODEX 33" />
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === "fleet"      && <LMTabFleet />}
      {active === "amendments" && <LMTabAmendments />}
      {active === "bms"        && <LMTabBMS />}
      {active === "secondlife" && <LMTabSecondLife />}
    </div>
  );
}

// ── Main export — routes to the correct canvas by slug ────────────────────────

export default function DPPWorkerCanvas({ worker }) {
  const slug = worker?.workerId || worker?.slug || "";
  if (slug === "eu-passport-builder-001")    return <PassportBuilderCanvas />;
  if (slug === "eu-supply-chain-tracer-001") return <SupplyChainCanvas />;
  if (slug === "eu-registry-manager-001")    return <RegistryManagerCanvas />;
  if (slug === "eu-lifecycle-monitor-001")   return <LifecycleMonitorCanvas />;
  return <Worker1Canvas />;
}
