import React, { useState } from "react";
import CanvasCardShell from "./CanvasCardShell";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const BUNDLE_CONFIGS = {
  "business-in-a-box": {
    title: "Business-in-a-Box",
    subtitle: "Five AI workers, one workspace. Everything a small business needs — accounting, HR, marketing, contacts, and a Chief of Staff to tie it all together.",
    accentColor: "#7c3aed",
    workers: [
      {
        slug: "platform-accounting",
        name: "Accounting Pro",
        icon: "📊",
        accent: "#0891b2",
        description: "Live P&L, burn rate, transaction categorization, invoice tracker, tax prep.",
      },
      {
        slug: "platform-hr",
        name: "HR & People",
        icon: "👥",
        accent: "#059669",
        description: "Roster, time-off, payroll data, hiring pipeline, contractor records.",
      },
      {
        slug: "platform-marketing",
        name: "Marketing & Content",
        icon: "📣",
        accent: "#d97706",
        description: "Campaign drafts, social calendar, ad copy, email sequences, brand assets.",
      },
      {
        slug: "platform-contacts",
        name: "Contacts & CRM",
        icon: "📋",
        accent: "#2563eb",
        description: "Contact lists, lead tracking, Apollo enrichment, segment builder.",
      },
    ],
  },
  "re-in-a-box": {
    title: "Real Estate in a Box",
    subtitle: "7 workers for the full CRE deal lifecycle",
    accentColor: "#15803d",
    workers: [
      { slug: "site-recon-001", name: "Site Recon", icon: "🗺", description: "Parcel scout — ranked opportunities with title + assessor data, feasibility verdict." },
      { slug: "title-abstract-001", name: "Title Abstract", icon: "📜", description: "Full chain of title, encumbrances, and rights stack. Source-pinned, Vault-anchored." },
      { slug: "cre-analyst", name: "CRE Deal Analyst", icon: "📊", description: "Deal screen + pro forma. Go/no-go verdict with ATTOM comps." },
      { slug: "feasibility-001", name: "Market & Feasibility", icon: "📈", description: "Lender-defensible demand/supply study. Census + ATTOM sourced." },
      { slug: "zoning-001", name: "Zoning + Entitlement", icon: "🏛", description: "Plain-English zoning verdict with live code citations. No model recall." },
      { slug: "law-landuse-001", name: "Land Use Attorney", icon: "⚖️", description: "Entitlement roadmap with version-pinned citations. UPL-compliant." },
      { slug: "re-marketing-001", name: "RE Broker & Marketing", icon: "🏡", description: "Listing readiness scorecard, showing schedule, buyer pipeline." },
    ],
  },
  "education-in-a-box": {
    title: "Education in a Box",
    subtitle: "Student evaluation, CE tracking, and immutable learning records — built for schools and programs.",
    accentColor: "#1d4ed8",
    workers: [
      { slug: "student-eval-001", name: "Student Evaluation", icon: "🎓", description: "Clinical evaluation, competency tracking, and immutable learning records." },
      { slug: "nursing-ce-001", name: "Nursing CE & License", icon: "🏥", description: "CE credit tracking, CEU verification, and state board renewal calendar." },
    ],
  },
  "aviation-in-a-box": {
    title: "Aviation in a Box",
    subtitle: "CoPilot, maintenance, and dispatch for pilots and operators",
    accentColor: "#0369a1",
    workers: [
      { slug: "av-copilot-001", name: "CoPilot", icon: "✈️", description: "Currency tracking, weather briefing, flight planning, and logbook." },
      { slug: "av-mx-001", name: "MX Tracker", icon: "🔧", description: "Airworthiness calendar, AD compliance, inspection due-list." },
      { slug: "av-dispatch-001", name: "Dispatch", icon: "🗼", description: "Trip planning, NOTAM briefing, fuel/FBO coordination." },
    ],
  },
};

export default function BundleOfferCard({ resolved: _resolved, context, onDismiss }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  const bundleId = context?.payload?.bundleId || "business-in-a-box";
  const config = BUNDLE_CONFIGS[bundleId] || BUNDLE_CONFIGS["business-in-a-box"];
  const { title, subtitle, accentColor, workers } = config;

  async function subscribe() {
    setBusy(true);
    setErr(null);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID") || null;
      const res = await fetch(`${API_BASE}/api?path=/v1/bundle:subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantId ? { "x-tenant-id": tenantId } : {}),
        },
        body: JSON.stringify({ bundleId, tenantId }),
      });
      const data = await res.json();
      if (data?.ok) {
        setResult(data);
        setDone(true);
        window.dispatchEvent(new CustomEvent("ta:workspace-changed", { detail: {} }));
      } else {
        setErr(data?.error || "Could not subscribe — try again.");
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (done && result) {
    const added = result.subscribed?.length || 0;
    const already = result.skipped?.filter(s => s.reason === "already subscribed").length || 0;
    return (
      <CanvasCardShell title={title} onDismiss={onDismiss}>
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>
            {added > 0 ? `${added} worker${added !== 1 ? "s" : ""} added to your account` : "All set"}
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
            {added > 0 && `${added} new worker${added !== 1 ? "s" : ""} activated. `}
            {already > 0 && `${already} already in your account. `}
            Your suite is live — chat with any worker by clicking its tab.
          </div>
        </div>
      </CanvasCardShell>
    );
  }

  // For business-in-a-box workers, use the per-worker accent; for other bundles fall back to bundle accent.
  function workerAccent(w) {
    return w.accent || accentColor;
  }

  return (
    <CanvasCardShell title={title} onDismiss={onDismiss}>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, marginTop: -4, lineHeight: 1.6 }}>
        {subtitle}
      </div>

      {/* Worker list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {workers.map(w => (
          <div key={w.slug} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "12px 14px", borderRadius: 10, background: "#fff",
            border: "1px solid #f1f5f9", boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: workerAccent(w) + "18",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: typeof w.icon === "string" && w.icon.length > 1 ? 16 : 18,
              color: workerAccent(w),
            }}>{w.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>{w.name}</div>
              <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>{w.description}</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>FREE</div>
          </div>
        ))}
      </div>

      {/* Value callout */}
      <div style={{ padding: "12px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #f1f5f9", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#64748b" }}>Included with your SOCIII account</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#16a34a" }}>Free</span>
      </div>

      {err && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 12, marginBottom: 12 }}>{err}</div>
      )}

      <button
        onClick={subscribe}
        disabled={busy}
        style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "none",
          fontSize: 15, fontWeight: 700, cursor: busy ? "default" : "pointer",
          background: busy ? "#94a3b8" : "#1e293b", color: "#fff",
          opacity: busy ? 0.8 : 1,
        }}
      >
        {busy ? "Setting up your workers…" : `Add all ${workers.length} worker${workers.length !== 1 ? "s" : ""} — free`}
      </button>
    </CanvasCardShell>
  );
}
