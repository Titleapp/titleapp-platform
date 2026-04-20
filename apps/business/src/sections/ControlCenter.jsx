/**
 * ControlCenter.jsx — Spine Control Center dashboard (49.1-E)
 *
 * Reads from briefings/{uid} (written by generateDailyDigest / cosScheduler).
 * Default KPI set selected by workspace vertical.
 * PFD status indicators: green arrow up, yellow sideways, red down, grey dash.
 * User can show/hide KPIs; config stored in users/{uid}/controlCenterConfig.
 */

import React, { useState, useEffect } from "react";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ═══════════════════════════════════════════════════════════════
//  DEFAULT KPI SETS BY VERTICAL
// ═══════════════════════════════════════════════════════════════

const DEFAULT_KPIS = {
  // TitleApp platform owner
  platform: [
    { id: "revenue_mtd", label: "Revenue MTD", field: "spine.incomeMtd", format: "currency", target: 10000 },
    { id: "expenses_mtd", label: "Expenses MTD", field: "spine.expenseMtd", format: "currency" },
    { id: "contacts", label: "Contacts", field: "spine.contacts", format: "number" },
    { id: "transactions", label: "Transactions", field: "spine.transactions", format: "number" },
    { id: "employees", label: "Employees", field: "spine.employees", format: "number" },
    { id: "assets", label: "Assets", field: "spine.assets", format: "number" },
    { id: "pending_tx", label: "Pending Transactions", field: "spine.pendingTransactions", format: "number" },
    { id: "compliance", label: "Compliance Items", field: "spine.complianceFlags", format: "number" },
  ],
  // Small business
  business: [
    { id: "revenue_mtd", label: "Revenue MTD", field: "spine.incomeMtd", format: "currency", target: 5000 },
    { id: "expenses_mtd", label: "Expenses MTD", field: "spine.expenseMtd", format: "currency" },
    { id: "contacts", label: "Active Customers", field: "spine.contacts", format: "number" },
    { id: "pending_tx", label: "Outstanding Invoices", field: "spine.pendingTransactions", format: "number" },
    { id: "employees", label: "Headcount", field: "spine.employees", format: "number" },
    { id: "assets", label: "Assets", field: "spine.assets", format: "number" },
  ],
  // Household / consumer
  consumer: [
    { id: "expenses_mtd", label: "Spending MTD", field: "spine.expenseMtd", format: "currency" },
    { id: "assets", label: "Assets Tracked", field: "spine.assets", format: "number" },
    { id: "contacts", label: "Contacts", field: "spine.contacts", format: "number" },
    { id: "transactions", label: "Transactions", field: "spine.transactions", format: "number" },
  ],
  // Property management
  "property-mgmt": [
    { id: "revenue_mtd", label: "Rent Collected MTD", field: "spine.incomeMtd", format: "currency" },
    { id: "expenses_mtd", label: "Expenses MTD", field: "spine.expenseMtd", format: "currency" },
    { id: "contacts", label: "Tenants", field: "spine.contacts", format: "number" },
    { id: "assets", label: "Properties", field: "spine.assets", format: "number" },
    { id: "pending_tx", label: "Pending Payments", field: "spine.pendingTransactions", format: "number" },
    { id: "compliance", label: "Maintenance Items", field: "spine.complianceFlags", format: "number" },
  ],
};

// Fallback for verticals without a specific set
DEFAULT_KPIS.auto = DEFAULT_KPIS.business;
DEFAULT_KPIS["real-estate"] = DEFAULT_KPIS.business;
DEFAULT_KPIS.aviation = DEFAULT_KPIS.business;
DEFAULT_KPIS.analyst = DEFAULT_KPIS.business;
DEFAULT_KPIS.investor = DEFAULT_KPIS.business;
DEFAULT_KPIS.solar = DEFAULT_KPIS.business;
DEFAULT_KPIS.web3 = DEFAULT_KPIS.business;

function getDefaultKpis(vertical) {
  return DEFAULT_KPIS[vertical] || DEFAULT_KPIS.business;
}

// ═══════════════════════════════════════════════════════════════
//  VALUE HELPERS
// ═══════════════════════════════════════════════════════════════

function resolvePath(obj, path) {
  return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : null), obj);
}

function formatValue(val, format) {
  if (val == null) return "—";
  if (format === "currency") return "$" + Number(val).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return Number(val).toLocaleString("en-US");
}

function kpiStatus(val, kpi) {
  if (val == null) return "none";
  if (kpi.id === "compliance" || kpi.id === "pending_tx") {
    if (val === 0) return "green";
    if (val <= 3) return "yellow";
    return "red";
  }
  if (kpi.target) {
    const pct = val / kpi.target;
    if (pct >= 0.8) return "green";
    if (pct >= 0.4) return "yellow";
    return "red";
  }
  return "green";
}

// ═══════════════════════════════════════════════════════════════
//  PFD STATUS ARROWS
// ═══════════════════════════════════════════════════════════════

function StatusArrow({ status }) {
  const size = 14;
  if (status === "green") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <path d="M7 11V3M7 3L3 7M7 3l4 4" stroke="var(--status-green, #16A34A)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "yellow") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <path d="M2 7h10" stroke="var(--status-yellow, #EAB308)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === "red") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <path d="M7 3v8M7 11l-4-4M7 11l4-4" stroke="var(--status-red, #DC2626)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // none / grey dash
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M4 7h6" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════

const S = {
  container: {
    padding: "24px 28px", maxWidth: 860, margin: "0 auto",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 24,
  },
  title: {
    fontSize: "var(--text-heading-size, 28px)",
    fontWeight: "var(--text-heading-weight, 700)",
    color: "var(--text-primary, #111827)",
  },
  date: { fontSize: 13, color: "var(--text-muted, #64748B)" },
  priority: {
    padding: "12px 16px", borderRadius: 10, marginBottom: 24,
    display: "flex", alignItems: "center", gap: 10, fontSize: 14,
  },
  priorityGreen: { background: "#dcfce7", color: "#166534" },
  priorityYellow: { background: "#fefce8", color: "#a16207" },
  priorityRed: { background: "#fef2f2", color: "#991b1b" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 },
  card: {
    background: "var(--canvas-bg, #F8FAFC)", borderRadius: 10,
    padding: "var(--canvas-card-padding, 16px)",
    border: "1px solid var(--canvas-border, #E2E8F0)",
    position: "relative",
  },
  cardHidden: { opacity: 0.4 },
  cardLabel: { fontSize: 11, color: "var(--text-muted, #64748B)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 },
  cardValue: { fontSize: 22, fontWeight: 700, color: "var(--text-primary, #111827)" },
  toggle: {
    position: "absolute", top: 8, right: 8,
    background: "none", border: "none", cursor: "pointer",
    fontSize: 14, color: "var(--text-muted, #64748B)", padding: 4,
  },
  footer: {
    borderTop: "1px solid var(--canvas-border, #E2E8F0)",
    paddingTop: 16, marginTop: 8,
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  footerText: { fontSize: 12, color: "var(--text-muted, #64748B)" },
  resetBtn: {
    background: "none", border: "1px solid var(--canvas-border, #E2E8F0)",
    borderRadius: 6, padding: "4px 12px", fontSize: 12,
    color: "var(--text-muted, #64748B)", cursor: "pointer",
  },
  empty: {
    textAlign: "center", padding: "48px 24px",
    fontSize: 14, color: "var(--text-muted, #64748B)", lineHeight: 1.6,
  },
  loading: {
    textAlign: "center", padding: "48px 24px",
    fontSize: 14, color: "var(--text-muted, #64748B)",
  },
};

// ═══════════════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ControlCenter() {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hiddenKpis, setHiddenKpis] = useState({});
  const [configLoaded, setConfigLoaded] = useState(false);

  const vertical = (localStorage.getItem("VERTICAL") || "").toLowerCase() || "business";
  const kpis = getDefaultKpis(vertical);

  // Load briefing data + user config
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const auth = getAuth();
        const uid = auth.currentUser?.uid;
        if (!uid) { setLoading(false); return; }
        const db = getFirestore();

        const [briefSnap, configSnap] = await Promise.all([
          getDoc(doc(db, "briefings", uid)),
          getDoc(doc(db, "users", uid, "controlCenterConfig", "default")),
        ]);

        if (!cancelled) {
          if (briefSnap.exists()) setBriefing(briefSnap.data());
          if (configSnap.exists()) {
            const cfg = configSnap.data();
            setHiddenKpis(cfg.hiddenKpis || {});
          }
          setConfigLoaded(true);
        }
      } catch (err) {
        console.warn("ControlCenter load failed:", err.message);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Persist config on toggle
  function toggleKpi(kpiId) {
    const next = { ...hiddenKpis, [kpiId]: !hiddenKpis[kpiId] };
    setHiddenKpis(next);
    // Fire-and-forget save
    try {
      const auth = getAuth();
      const uid = auth.currentUser?.uid;
      if (uid) {
        const db = getFirestore();
        setDoc(doc(db, "users", uid, "controlCenterConfig", "default"), {
          hiddenKpis: next,
          vertical,
          lastUpdated: new Date().toISOString(),
        }, { merge: true });
      }
    } catch (e) { /* non-fatal */ }
  }

  function resetConfig() {
    setHiddenKpis({});
    try {
      const auth = getAuth();
      const uid = auth.currentUser?.uid;
      if (uid) {
        const db = getFirestore();
        setDoc(doc(db, "users", uid, "controlCenterConfig", "default"), {
          hiddenKpis: {},
          vertical,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (e) { /* non-fatal */ }
  }

  if (loading) {
    return <div style={S.loading}>Loading Control Center...</div>;
  }

  if (!briefing) {
    return (
      <div style={S.container}>
        <div style={S.header}>
          <div style={S.title}>Control Center</div>
        </div>
        <div style={S.empty}>
          No briefing data yet. Alex generates your daily brief automatically.<br />
          Ask Alex "What is on my plate today?" to get started.
        </div>
      </div>
    );
  }

  const priority = briefing.priority || { level: "green", text: "All systems green." };
  const priorityStyle = priority.level === "red" ? S.priorityRed
    : priority.level === "yellow" ? S.priorityYellow
    : S.priorityGreen;

  const visibleKpis = kpis.filter(k => !hiddenKpis[k.id]);
  const hiddenCount = kpis.length - visibleKpis.length;

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div style={S.title}>Control Center</div>
        <div style={S.date}>{briefing.date || ""}</div>
      </div>

      <div style={{ ...S.priority, ...priorityStyle }}>
        <StatusArrow status={priority.level} />
        <span>{priority.text}</span>
      </div>

      <div style={S.grid}>
        {visibleKpis.map((kpi) => {
          const val = resolvePath(briefing, kpi.field);
          const status = kpiStatus(val, kpi);
          return (
            <div key={kpi.id} style={S.card}>
              <button style={S.toggle} onClick={() => toggleKpi(kpi.id)} title="Hide this KPI">×</button>
              <div style={S.cardLabel}>
                <StatusArrow status={status} />
                {kpi.label}
              </div>
              <div style={S.cardValue}>{formatValue(val, kpi.format)}</div>
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted, #64748B)", marginBottom: 8 }}>
            {hiddenCount} hidden KPI{hiddenCount > 1 ? "s" : ""}:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {kpis.filter(k => hiddenKpis[k.id]).map((kpi) => (
              <button
                key={kpi.id}
                onClick={() => toggleKpi(kpi.id)}
                style={{
                  background: "var(--canvas-bg, #F8FAFC)",
                  border: "1px solid var(--canvas-border, #E2E8F0)",
                  borderRadius: 6, padding: "4px 10px", fontSize: 11,
                  color: "var(--text-muted, #64748B)", cursor: "pointer",
                }}
              >
                + {kpi.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={S.footer}>
        <div style={S.footerText}>
          Updated {briefing.runType === "manual" ? "manually" : briefing.runType || "daily"} — {briefing.date || ""}
        </div>
        {hiddenCount > 0 && (
          <button style={S.resetBtn} onClick={resetConfig}>Reset to defaults</button>
        )}
      </div>
    </div>
  );
}
