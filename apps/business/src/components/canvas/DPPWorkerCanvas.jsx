// DPP Worker Canvas — EU Battery Passport Advisor (eu-battery-dpp-001)
// Trump Rule: big picture first. Dashboard tab shows the Passport Charge Bar
// for every product in scope — grey/yellow/green battery visual.
// 5 tabs: Dashboard · Passport Builder · Timeline · Client File · Reports

import React, { useState } from "react";

const DPP_SLUGS = new Set([
  "eu-battery-dpp-001",
  "eu-passport-builder-001",
  "eu-supply-chain-tracer-001",
  "eu-registry-manager-001",
  "eu-lifecycle-monitor-001",
]);

export function isDPPWorker(w) {
  return DPP_SLUGS.has(w?.workerId || w?.slug || "");
}

// ── Static demo data (matches seedTraitlyDemo.js) ────────────────────────────

const CLIENT = {
  name: "Battlink BV",
  jurisdiction: "Netherlands",
  contact: "Jan van der Berg",
  email: "jvdberg@battlink.nl",
  batteryTypes: ["EV", "Industrial", "LMT"],
  dpaSigned: true,
  sccCompliant: true,
  licenseStatus: "Active",
  onboarded: "1 Jul 2026",
  deadline: "18 Feb 2027",
};

const SKUS = [
  {
    id: "btl-ev48-001", sku: "BTL-EV48", name: "EV Module 48V 200Ah",
    category: "EV", pct: 0, color: "grey", daysAtStatus: 14,
    priority: false, status: "Not started",
    gaps: ["All 7 clusters — not yet started"],
  },
  {
    id: "btl-ev72-001", sku: "BTL-EV72", name: "EV Module 72V 150Ah",
    category: "EV", pct: 8, color: "grey", daysAtStatus: 7,
    priority: false, status: "Not started",
    gaps: ["Clusters 2–7 not yet started"],
  },
  {
    id: "btl-ind24-001", sku: "BTL-IND24", name: "Industrial 24V 500Ah",
    category: "Industrial", pct: 38, color: "yellow", daysAtStatus: 21,
    priority: true, status: "In progress",
    gaps: ["Cluster 3: Carbon footprint LCA not initiated", "Clusters 4+5: Supply chain data awaited from cell supplier"],
  },
  {
    id: "btl-ind48-001", sku: "BTL-IND48", name: "Industrial 48V 400Ah",
    category: "Industrial", pct: 64, color: "yellow", daysAtStatus: 35,
    priority: true, status: "In progress",
    gaps: ["Cluster 3: LCA initiated, awaiting third-party assessor report"],
  },
  {
    id: "btl-lmt12-001", sku: "BTL-LMT12", name: "LMT Module 12V 100Ah",
    category: "LMT", pct: 87, color: "yellow", daysAtStatus: 8,
    priority: false, status: "In review",
    gaps: ["3 attribute clarifications requested by advisor"],
  },
  {
    id: "btl-lmt24-001", sku: "BTL-LMT24", name: "LMT Module 24V 80Ah",
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

// Per-cluster pct by SKU pct bucket
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

// ── Design tokens ─────────────────────────────────────────────────────────────

const COLOR = {
  grey:   { bar: "#cbd5e1", bg: "#f8fafc", text: "#64748b", badge: "#e2e8f0", badgeText: "#475569" },
  yellow: { bar: "#fbbf24", bg: "#fffbeb", text: "#92400e", badge: "#fef3c7", badgeText: "#78350f" },
  green:  { bar: "#34d399", bg: "#ecfdf5", text: "#065f46", badge: "#d1fae5", badgeText: "#064e3b" },
};

const CATEGORY_COLOR = { EV: "#3b82f6", Industrial: "#f59e0b", LMT: "#8b5cf6" };

// Days remaining until Feb 18 2027
function daysToDeadline() {
  const deadline = new Date("2027-02-18");
  const today = new Date();
  return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ChargeBar({ pct, color, width = 160 }) {
  const c = COLOR[color];
  const fillW = Math.round((pct / 100) * (width - 14));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {/* Battery body */}
      <div style={{
        width, height: 18, borderRadius: 4,
        border: `1.5px solid ${color === "grey" ? "#cbd5e1" : color === "yellow" ? "#fbbf24" : "#34d399"}`,
        background: "#f8fafc", position: "relative", overflow: "hidden",
        flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: fillW, background: c.bar,
          borderRadius: "2px 0 0 2px",
          transition: "width 0.4s ease",
        }} />
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700,
          color: pct > 45 ? "#fff" : c.text,
        }}>
          {pct}%
        </div>
      </div>
      {/* Battery terminal nub */}
      <div style={{
        width: 5, height: 10, borderRadius: "0 2px 2px 0",
        background: color === "grey" ? "#cbd5e1" : color === "yellow" ? "#fbbf24" : "#34d399",
        flexShrink: 0, marginLeft: -6,
      }} />
    </div>
  );
}

function StatusBadge({ status, color }) {
  const c = COLOR[color];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
      background: c.badge, color: c.badgeText, letterSpacing: "0.03em",
      textTransform: "uppercase",
    }}>
      {status}
    </span>
  );
}

function CategoryDot({ cat }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
      background: `${CATEGORY_COLOR[cat]}18`, color: CATEGORY_COLOR[cat],
      letterSpacing: "0.02em",
    }}>
      {cat}
    </span>
  );
}

// ── Tab 1: Dashboard ──────────────────────────────────────────────────────────

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
      {/* Header strip */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        borderRadius: 12, padding: "16px 20px", marginBottom: 18, color: "#fff",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 2 }}>
            EU Battery Regulation 2023/1542
          </div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Battlink BV · DPP Compliance</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>6 products in scope · Netherlands</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: days < 300 ? "#fbbf24" : "#34d399", lineHeight: 1 }}>{days}</div>
          <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.05em" }}>DAYS TO DEADLINE</div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>18 Feb 2027</div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total SKUs", value: summary.total, color: "#6366f1" },
          { label: "Data Complete", value: summary.complete, color: "#34d399" },
          { label: "In Progress", value: summary.progress, color: "#fbbf24" },
          { label: "Not Started", value: summary.notStarted, color: "#94a3b8" },
        ].map(k => (
          <div key={k.label} style={{
            padding: "12px 14px", borderRadius: 10, background: "#f8fafc",
            border: "1px solid #e2e8f0", textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginTop: 2, letterSpacing: "0.03em" }}>{k.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Passport charge bar grid */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
        Passport Charge Status
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SKUS.map(sku => (
          <button
            key={sku.id}
            onClick={() => onSelectSku(sku)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 10,
              background: COLOR[sku.color].bg,
              border: `1.5px solid ${sku.color === "grey" ? "#e2e8f0" : sku.color === "yellow" ? "#fde68a" : "#a7f3d0"}`,
              cursor: "pointer", textAlign: "left", width: "100%",
              transition: "box-shadow 0.15s",
            }}
          >
            {/* Charge bar */}
            <ChargeBar pct={sku.pct} color={sku.color} width={130} />

            {/* Name + category */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                {sku.priority && <span style={{ fontSize: 9, fontWeight: 700, color: "#ef4444", letterSpacing: "0.05em" }}>★ PRIORITY</span>}
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {sku.sku}
                </span>
                <CategoryDot cat={sku.category} />
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{sku.name}</div>
            </div>

            {/* Status badge + days */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
              <StatusBadge status={sku.status} color={sku.color} />
              <span style={{ fontSize: 10, color: "#94a3b8" }}>{sku.daysAtStatus}d at status</span>
            </div>

            {/* Arrow */}
            <div style={{ color: "#cbd5e1", fontSize: 14, flexShrink: 0 }}>›</div>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
        {[
          { color: "grey", label: "Not started" },
          { color: "yellow", label: "In progress" },
          { color: "green", label: "Data complete" },
        ].map(l => (
          <div key={l.color} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: COLOR[l.color].bar }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>{l.label}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 10, color: "#94a3b8", fontStyle: "italic" }}>Click any row to drill into the Passport Builder</div>
      </div>
    </div>
  );
}

// ── Tab 2: Passport Builder ───────────────────────────────────────────────────

function TabPassport({ selectedSku, onSelectSku }) {
  const [expanded, setExpanded] = useState(null);
  const sku = selectedSku || SKUS[3]; // default to BTL-IND48 (most interesting)
  const clusters = getClusters(sku.pct);
  const SOURCE_COLOR = {
    "Manual upload": "#6366f1", "Supplier portal": "#f59e0b", "BMS direct": "#10b981",
  };

  return (
    <div>
      {/* SKU selector */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Select product</div>
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

      {/* Selected SKU header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", background: COLOR[sku.color].bg,
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

      {/* 7-cluster accordion */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
        90 Attributes across 7 Clusters
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {clusters.map((cl) => (
          <div key={cl.id} style={{
            borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden",
            background: cl.pct === 100 ? "#f0fdf4" : cl.pct === 0 ? "#f8fafc" : "#fff",
          }}>
            <button
              onClick={() => setExpanded(expanded === cl.id ? null : cl.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 14px", cursor: "pointer", background: "transparent", border: "none", textAlign: "left",
              }}
            >
              {/* Mini bar */}
              <div style={{ width: 60, height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                <div style={{ height: "100%", width: `${cl.pct}%`, borderRadius: 4,
                  background: cl.pct === 100 ? "#34d399" : cl.pct === 0 ? "#cbd5e1" : "#fbbf24" }} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>Cluster {cl.id} — {cl.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {cl.source && (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
                    background: `${SOURCE_COLOR[cl.source]}18`, color: SOURCE_COLOR[cl.source] }}>
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
                    ✓ All {cl.total} attributes collected.
                    {cl.source && ` Source: ${cl.source}.`}
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
          Cluster 3 (carbon footprint) must reach 100% before the EU registry-ready passport draft can be exported. Cluster 3 requires a verified LCA certificate from an accredited third-party assessor (TÜV, Bureau Veritas, SGS).
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Timeline ───────────────────────────────────────────────────────────

function TabTimeline() {
  const milestones = [
    { date: "18 Aug 2025", label: "Carbon footprint declarations", status: "past", note: "Already in force. Some clients may already be non-compliant." },
    { date: "19 Jul 2026", label: "EU DPP Central Registry goes live", status: "soon", note: "Early submission now open. Credibility advantage for first movers." },
    { date: "18 Feb 2027", label: "Full passport mandatory — no exceptions", status: "deadline", note: "No EU market access without a registered Digital Battery Passport." },
  ];
  const clientStages = [
    { stage: "Audit & scope", done: true },
    { stage: "Gap fill", done: true },
    { stage: "Passport draft", done: false },
    { stage: "Advisor review", done: false },
    { stage: "Registry submit", done: false },
    { stage: "Registered", done: false },
  ];
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Hard deadlines</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {milestones.map(m => (
          <div key={m.date} style={{
            padding: "12px 16px", borderRadius: 10, border: "1px solid",
            borderColor: m.status === "deadline" ? "#fca5a5" : m.status === "soon" ? "#fde68a" : "#d1fae5",
            background: m.status === "deadline" ? "#fff5f5" : m.status === "soon" ? "#fffbeb" : "#f0fdf4",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: m.status === "deadline" ? "#ef4444" : m.status === "soon" ? "#f59e0b" : "#34d399",
              }} />
              <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{m.date}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: m.status === "deadline" ? "#dc2626" : m.status === "soon" ? "#92400e" : "#065f46" }}>
                {m.label}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, marginLeft: 18 }}>{m.note}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
        Battlink milestone tracker
      </div>
      <div style={{ display: "flex", gap: 0, marginBottom: 24 }}>
        {clientStages.map((s, i) => (
          <div key={s.stage} style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              height: 4, background: s.done ? "#6366f1" : "#e2e8f0",
              marginBottom: 6, borderRadius: i === 0 ? "2px 0 0 2px" : i === clientStages.length - 1 ? "0 2px 2px 0" : 0,
            }} />
            <div style={{
              width: 20, height: 20, borderRadius: "50%", margin: "0 auto 4px",
              background: s.done ? "#6366f1" : "#e2e8f0",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: s.done ? "#fff" : "#94a3b8", fontWeight: 700,
            }}>{s.done ? "✓" : i + 1}</div>
            <div style={{ fontSize: 9, color: s.done ? "#4f46e5" : "#94a3b8", fontWeight: s.done ? 700 : 400, lineHeight: 1.3 }}>{s.stage}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab 4: Client File ────────────────────────────────────────────────────────

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
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Battlink BV</div>
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
          SOCIII Firestore must be migrated to an EU-region before EU client battery attribute data is stored at scale. Currently using US-central. Required before Battlink goes beyond the pilot phase.
        </div>
      </div>
    </div>
  );
}

// ── Tab 5: Advisory Reports ───────────────────────────────────────────────────

function TabReports() {
  const urgent = [
    "BTL-LMT24: Cluster 3 LCA certificate outstanding — blocks registry submission",
    "BTL-IND24 + BTL-IND48: Supplier portal not yet accepted by cell manufacturer",
    "BTL-EV48 + BTL-EV72: Not yet started — kickoff session needed",
  ];
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Draft — Week of 7 Jul 2026</div>
      <div style={{
        padding: "14px 16px", borderRadius: 12, background: "#fff7ed",
        border: "1.5px solid #fed7aa", marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#c2410c" }}>⏳ Pending review</div>
          <div style={{ fontSize: 11, color: "#9a3412", marginLeft: "auto" }}>Auto-generated · Awaiting Elise approval before sending</div>
        </div>
        <div style={{ fontSize: 12, color: "#7c2d12" }}>
          This weekly status report is ready for your review. No report is sent to Battlink without your explicit approval. Review it, add commentary, then click Send.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Data complete", value: "1 / 6", color: "#34d399" },
          { label: "In progress", value: "2 / 6", color: "#fbbf24" },
          { label: "Not started", value: "2 / 6", color: "#94a3b8" },
        ].map(k => (
          <div key={k.label} style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Urgent items</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {urgent.map((item, i) => (
          <div key={i} style={{
            padding: "10px 14px", background: "#fef2f2", borderRadius: 8,
            border: "1px solid #fecaca", fontSize: 12, color: "#991b1b",
            display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <span style={{ fontWeight: 700, flexShrink: 0 }}>!</span>
            <span>{item}</span>
          </div>
        ))}
      </div>

      <button style={{
        width: "100%", padding: "12px", borderRadius: 10, fontWeight: 700,
        fontSize: 13, cursor: "pointer", border: "none",
        background: "#6366f1", color: "#fff",
      }}>
        Review + Approve Report
      </button>
    </div>
  );
}

// ── Main canvas ───────────────────────────────────────────────────────────────

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "passport", label: "Passport Builder" },
  { id: "timeline", label: "Timeline" },
  { id: "client", label: "Client File" },
  { id: "reports", label: "Advisory Reports" },
];

// ── Suite worker spec view (workers 2–5) ─────────────────────────────────────

const SUITE_SPECS = {
  "eu-passport-builder-001": {
    number: 2,
    name: "Passport Builder",
    phase: "Now — activates when Compliance Auditor reaches 100%",
    phaseColor: "#6366f1",
    icon: "📄",
    tagline: "Generates EU registry-ready Digital Battery Passports in Annex XIII JSON-LD format.",
    what: "Takes a battery product whose 90 attributes are fully collected and generates the submission-ready passport file. Handles format validation, QR code generation, and dual Vault write on registration.",
    keyCapabilities: [
      "Annex XIII JSON-LD export — the exact format EU registry requires",
      "Hard gate on Cluster 3 (carbon footprint) — can't export until LCA is verified",
      "Format validation pass: kg CO₂ eq/kWh, ISO 8601 dates, % for SoH",
      "Submit to EU DPP Central Registry via POST /v1/dpp:submit",
      "Dual Vault write: both advisor and client get an immutable DTC on registration",
      "QR code generation — downloadable PNG for product labeling",
    ],
    tabs: ["Passport Queue", "Passport Preview", "Export + Submit", "Passport Ledger"],
    blockers: ["EU DPP Central Registry allowlisting (apply when registry opens 19 Jul 2026)", "Cluster 3 must be 100% complete for any product before export is unlocked"],
    codex: "CODEX 30",
  },
  "eu-supply-chain-tracer-001": {
    number: 3,
    name: "Supply Chain Tracer",
    phase: "Phase 2 — after Compliance Auditor reaches scale with multiple clients",
    phaseColor: "#f59e0b",
    icon: "🔗",
    tagline: "Supplier submits data once — it flows to every passport using their components.",
    what: "Builds and manages the Supplier Data Network. Cell manufacturers and materials suppliers submit sourcing declarations once through a dedicated portal. That data automatically satisfies Clusters 4+5 across every client who uses that supplier — the data moat that compounds with scale.",
    keyCapabilities: [
      "Supplier portal: cell manufacturers submit directly, no advisor manual entry",
      "Fan-out write: one supplier submission → compliance events on all matching passports",
      "Catena-X connector: pull supply chain data from EU automotive network",
      "GBA Battery Passport framework: Global Battery Alliance standard exchange",
      "SCIP Database: EU hazardous substances automatic pulls (ECHA REST API)",
      "Certificate verification: TÜV, Bureau Veritas, SGS direct API connections",
      "3-tier access: Operator sees all, Client sees their suppliers, Supplier sees only their own submissions",
    ],
    tabs: ["Supplier Network", "Supplier Portal", "Platform Connectors", "Coverage Gap Analysis"],
    blockers: ["Supplier portal requires Firebase custom claims for supplier access tier", "Catena-X connector credentials", "First live supplier must be onboarded manually to prove the pattern"],
    codex: "CODEX 31",
  },
  "eu-registry-manager-001": {
    number: 4,
    name: "EU Registry Manager",
    phase: "Activates 19 July 2026 — EU DPP Central Registry goes live",
    phaseColor: "#ef4444",
    icon: "🏛️",
    tagline: "Manages the live relationship with the EU DPP Central Registry.",
    what: "The Registry Manager handles everything after the passport file is generated: batch submission, amendment lifecycle, QR code monitoring, and renewal alerts. It is the ongoing operational layer — the Passport Builder creates the file, the Registry Manager keeps the file current with the government system.",
    keyCapabilities: [
      "Batch submit: queue multiple passports and submit in one operation",
      "Registry Ledger: real-time status from EU registry API (Submitted / Registered / Failed)",
      "QR code audit: verify QR resolves correctly post-registration",
      "QR download pack: all product QR codes as ZIP for labeling team",
      "Lifecycle amendment: trigger passport updates from Lifecycle Monitor (Worker 5)",
      "Client notification: sends Battlink their passport ID + QR on registration",
      "Renewal alerts: flags passports approaching mandatory update deadlines",
    ],
    tabs: ["Registry Status", "Submission Queue", "Registry Ledger", "QR Code Manager", "Alerts + Renewals"],
    blockers: ["Government allowlisting required — third-party submitters must be approved by EU Commission", "Registry API schema not yet published (due pre-19 Jul 2026)", "Registry go-live date: 19 July 2026"],
    codex: "CODEX 32",
  },
  "eu-lifecycle-monitor-001": {
    number: 5,
    name: "Lifecycle Monitor",
    phase: "Platform tier — post-registration, ongoing subscription",
    phaseColor: "#10b981",
    icon: "⚡",
    tagline: "BMS direct API. Passport updates itself as batteries age.",
    what: "Connects directly to the battery management system (BMS) in the field, pulls live State of Health telemetry, and automatically keeps the registered passport current. This is the recurring revenue moat: the client pays monthly because the data keeps flowing — no manual effort, no compliance risk from stale passport data.",
    keyCapabilities: [
      "BMS direct API: pulls SoH %, charge cycle count, capacity kWh from deployed batteries",
      "Real-time fleet view: every connected battery's current health status",
      "SoH trend chart: degradation rate vs. manufacturer specification",
      "Automatic passport amendments: files updates when SoH drops >10% since last registration",
      "Second-life detector: flags batteries at <80% SoH (EV repurposing threshold per EU reg)",
      "Second-life workflow: initiates new passport for repurposed battery with new product identity",
      "End-of-life notification: mandatory decommission alert at rated cycle count",
    ],
    tabs: ["Live Battery Fleet", "SoH Trends", "Passport Update Queue", "BMS Connections", "Second-Life Tracker"],
    blockers: ["BMS API integration is custom per manufacturer — requires hardware/firmware cooperation from client", "No standard BMS API exists: Battlink integration is the first proof-of-concept", "Registry Manager (Worker 4) must be live before amendments can be submitted"],
    codex: "CODEX 33",
    subscriptionNote: "This is the reason the Platform subscription exists. Advisory (Workers 1–4) is a project. Lifecycle monitoring is a contract.",
  },
};

function DPPSuiteWorkerSpec({ slug }) {
  const spec = SUITE_SPECS[slug];
  if (!spec) return null;
  return (
    <div style={{ marginTop: 16 }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        borderRadius: 12, padding: "18px 20px", marginBottom: 18, color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 32, lineHeight: 1 }}>{spec.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#93c5fd", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>
              EU DPP Suite · Worker {spec.number} of 5
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{spec.name}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{spec.tagline}</div>
          </div>
          <div style={{
            padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 700,
            background: `${spec.phaseColor}30`, color: spec.phaseColor,
            border: `1px solid ${spec.phaseColor}50`, flexShrink: 0,
          }}>
            {spec.codex}
          </div>
        </div>
      </div>

      {/* Phase badge */}
      <div style={{
        padding: "10px 14px", borderRadius: 8, marginBottom: 18,
        background: `${spec.phaseColor}10`, border: `1px solid ${spec.phaseColor}40`,
        fontSize: 12, color: spec.phaseColor, fontWeight: 600,
      }}>
        Phase: {spec.phase}
      </div>

      {/* What it does */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>What this worker does</div>
        <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>{spec.what}</div>
      </div>

      {/* Key capabilities */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Key capabilities</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {spec.keyCapabilities.map((cap, i) => (
            <div key={i} style={{
              padding: "8px 12px", background: "#f8fafc", borderRadius: 8,
              border: "1px solid #e2e8f0", fontSize: 12, color: "#374151",
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              <span style={{ color: spec.phaseColor, fontWeight: 700, flexShrink: 0 }}>→</span>
              <span>{cap}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas tabs preview */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Canvas tabs when built</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {spec.tabs.map((tab, i) => (
            <div key={i} style={{
              padding: "5px 12px", background: "#f1f5f9", borderRadius: 20,
              fontSize: 12, fontWeight: 600, color: "#475569",
              border: "1px solid #e2e8f0",
            }}>
              {tab}
            </div>
          ))}
        </div>
      </div>

      {/* Build blockers */}
      <div style={{ marginBottom: spec.subscriptionNote ? 16 : 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Build prerequisites</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {spec.blockers.map((b, i) => (
            <div key={i} style={{
              padding: "8px 12px", background: "#fef2f2", borderRadius: 8,
              border: "1px solid #fecaca", fontSize: 12, color: "#991b1b",
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              <span style={{ fontWeight: 700, flexShrink: 0 }}>⚠</span>
              <span>{b}</span>
            </div>
          ))}
        </div>
      </div>

      {spec.subscriptionNote && (
        <div style={{
          padding: "12px 16px", background: "#ecfdf5", borderRadius: 10,
          border: "1.5px solid #6ee7b7", marginTop: 16,
          fontSize: 12, color: "#065f46", fontStyle: "italic",
        }}>
          💡 {spec.subscriptionNote}
        </div>
      )}
    </div>
  );
}

export default function DPPWorkerCanvas({ worker }) {
  const slug = worker?.workerId || worker?.slug || "";

  // Workers 2–5: rich spec/roadmap view
  if (slug !== "eu-battery-dpp-001") {
    return <DPPSuiteWorkerSpec slug={slug} />;
  }

  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedSku, setSelectedSku] = useState(null);

  function handleSkuSelect(sku) {
    setSelectedSku(sku);
    setActiveTab("passport");
  }

  return (
    <div style={{ marginTop: 16 }}>
      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 2, borderBottom: "2px solid #f1f5f9",
        marginBottom: 20, overflowX: "auto",
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "8px 14px", fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? "#4f46e5" : "#64748b",
              background: "transparent", border: "none", cursor: "pointer",
              borderBottom: `2px solid ${activeTab === t.id ? "#4f46e5" : "transparent"}`,
              marginBottom: -2, whiteSpace: "nowrap", transition: "color 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "dashboard" && <TabDashboard onSelectSku={handleSkuSelect} />}
      {activeTab === "passport"  && <TabPassport selectedSku={selectedSku} onSelectSku={setSelectedSku} />}
      {activeTab === "timeline"  && <TabTimeline />}
      {activeTab === "client"    && <TabClientFile />}
      {activeTab === "reports"   && <TabReports />}
    </div>
  );
}
