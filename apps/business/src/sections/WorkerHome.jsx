import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import WorkerIcon from "../utils/workerIcons";

// Worker slug → display name (matches Sidebar WORKER_DISPLAY_NAMES)
const WORKER_NAMES = {
  "chief-of-staff": "Alex — Chief of Staff",
  "platform-accounting": "Accounting",
  "platform-hr": "HR & People",
  "platform-marketing": "Marketing & Content",
  "platform-control-center-pro": "Control Center Pro",
  "platform-contacts": "Contacts",
  "cre-analyst": "CRE Analyst",
  "investor-relations": "IR Worker",
  "construction-manager": "Construction Manager",
  "construction-draws": "Draw Manager",
  "construction-lending": "Construction Lending",
  "capital-stack-optimizer": "Capital Stack Optimizer",
  "property-management": "Property Manager",
  "compliance-tracker": "Compliance Tracker",
  "legal-contracts": "Legal Contracts",
};

// CODEX 49.16 — Alex variants that should not appear as duplicate cards
const ALEX_SLUGS = new Set(["alex-platform", "alex"]);

// Vertical category colors — matches sidebar theme system
const VERTICAL_COLORS = {
  "Spine":       { accent: "#7c3aed", gradient: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)" },
  "Aviation":    { accent: "#0284c7", gradient: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)" },
  "Auto Dealer": { accent: "#0284c7", gradient: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)" },
  "Real Estate": { accent: "#16a34a", gradient: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" },
  "Web3":        { accent: "#16a34a", gradient: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" },
  "Solar":       { accent: "#0891b2", gradient: "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)" },
  "Government":  { accent: "#16a34a", gradient: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" },
  "Other":       { accent: "#7c3aed", gradient: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)" },
};

function normalizeVertical(slug) {
  if (!slug) return "Other";
  if (slug.startsWith("platform-") || slug === "chief-of-staff") return "Spine";
  if (slug.startsWith("av-")) return "Aviation";
  if (slug.startsWith("ad-")) return "Auto Dealer";
  if (slug.startsWith("w3-") || slug.startsWith("web3")) return "Web3";
  if (slug.startsWith("gov-")) return "Government";
  if (slug.startsWith("solar")) return "Solar";
  if (slug.startsWith("esc-")) return "Real Estate";
  const reStarts = ["cre-", "investor-", "construction-", "mortgage-", "capital-", "property-", "bid-", "insurance-", "quality-", "safety-", "mep-", "labor-", "materials-", "mezzanine-", "crowdfunding-", "site-", "land-", "permit-", "lease-", "accounting-", "market-", "architecture-", "engineering-", "environmental-", "energy-", "accessibility-", "government-", "fire-", "opportunity-", "appraisal-", "tenant-", "rent-", "maintenance-", "utility-", "hoa-", "warranty-", "vendor-", "disposition-", "exchange-", "entity-", "legal-", "compliance-"];
  for (const p of reStarts) {
    if (slug.startsWith(p)) return "Real Estate";
  }
  return "Other";
}

function slugToName(slug) {
  if (WORKER_NAMES[slug]) return WORKER_NAMES[slug];
  return slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function WorkerHome() {
  const auth = getAuth();
  const [workers, setWorkers] = useState([]);
  const [catalogMap, setCatalogMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  useEffect(() => {
    loadWorkers();
  }, []);

  async function loadWorkers() {
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

      // Load workspaces to get activeWorkers
      const wsResp = await fetch(`${apiBase}/api?path=/v1/workspaces`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const wsData = await wsResp.json();
      const allWorkerSlugs = new Set();
      if (wsData.ok && wsData.workspaces) {
        for (const ws of wsData.workspaces) {
          for (const w of (ws.activeWorkers || [])) {
            const s = typeof w === "string" ? w : w.slug || w.id;
            // Filter out Alex duplicates — chief-of-staff is added explicitly
            if (!ALEX_SLUGS.has(s)) allWorkerSlugs.add(s);
          }
        }
      }

      // Load catalog for names + taglines
      const catResp = await fetch(`${apiBase}/api?path=/v1/catalog:byVertical&vertical=all&limit=300`);
      const catData = await catResp.json();
      const map = {};
      for (const w of (catData.workers || [])) {
        const id = w.workerId || w.slug;
        if (id) map[id] = w;
      }
      setCatalogMap(map);

      setWorkers([...allWorkerSlugs]);
    } catch (e) {
      console.error("WorkerHome: load failed:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleOpen(slug) {
    window.dispatchEvent(new CustomEvent("ta:select-worker", {
      detail: { slug, name: WORKER_NAMES[slug] || catalogMap[slug]?.name || slugToName(slug) },
    }));
  }

  // Group workers by vertical
  const grouped = {};
  for (const slug of workers) {
    const v = normalizeVertical(slug);
    if (!grouped[v]) grouped[v] = [];
    const cat = catalogMap[slug] || {};
    grouped[v].push({
      slug,
      name: WORKER_NAMES[slug] || cat.name || slugToName(slug),
      tagline: cat.headline || cat.tagline || cat.capabilitySummary || "",
      price: cat.price || 0,
    });
  }
  // Sort groups: Spine first, Other last, rest alphabetical
  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    if (a === "Spine") return -1;
    if (b === "Spine") return 1;
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return a.localeCompare(b);
  });

  const firstName = (() => {
    const user = auth.currentUser;
    if (user?.displayName) return user.displayName.split(" ")[0];
    if (user?.email) return user.email.split("@")[0];
    return "";
  })();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) {
    return (
      <div style={{ padding: 40, color: "#94a3b8" }}>Loading your workers...</div>
    );
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 960, overflowY: "auto", height: "100%" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", margin: 0 }}>
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", margin: "6px 0 0" }}>
          {workers.length > 0
            ? `You have ${workers.length} active worker${workers.length === 1 ? "" : "s"}`
            : "Get started by adding your first Digital Worker"}
        </p>
      </div>

      {/* Workers grouped by vertical — collapsible */}
      {sortedGroups.map(([verticalName, vWorkers]) => {
        const colors = VERTICAL_COLORS[verticalName] || VERTICAL_COLORS["Other"];
        const isCollapsed = collapsedGroups[verticalName] === true;
        return (
          <div key={verticalName} style={{ marginBottom: 28 }}>
            <button
              onClick={() => setCollapsedGroups(prev => ({ ...prev, [verticalName]: !prev[verticalName] }))}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", background: "none", border: "none", cursor: "pointer",
                padding: "0 0 6px", margin: "0 0 12px",
                borderBottom: `2px solid ${colors.accent}20`,
              }}
            >
              <span style={{
                fontSize: 13, fontWeight: 600, color: colors.accent,
                textTransform: "uppercase", letterSpacing: "0.5px",
              }}>
                {verticalName} ({vWorkers.length})
              </span>
              <span style={{
                fontSize: 12, color: colors.accent, transition: "transform 0.2s",
                transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
              }}>
                &#8250;
              </span>
            </button>

            {!isCollapsed && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}>
                {vWorkers.map(w => {
                  const colors = VERTICAL_COLORS[verticalName] || VERTICAL_COLORS["Other"];
                  return (
                    <div
                      key={w.slug}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "14px 16px",
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        cursor: "pointer",
                        transition: "border-color 150ms, box-shadow 150ms",
                      }}
                      onClick={() => handleOpen(w.slug)}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = colors.accent;
                        e.currentTarget.style.boxShadow = `0 2px 8px ${colors.accent}1a`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: colors.gradient,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <WorkerIcon slug={w.slug} size={20} color="#fff" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                          {w.name}
                        </div>
                        {w.tagline && (
                          <div style={{
                            fontSize: 12, color: "#64748b", marginTop: 2,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {w.tagline}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: 12, fontWeight: 600, color: colors.accent,
                        whiteSpace: "nowrap", flexShrink: 0,
                      }}>
                        Open &rarr;
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {workers.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "#f8fafc", borderRadius: 16,
          border: "1px dashed #cbd5e1",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1e293b", margin: "0 0 8px" }}>
            No workers yet
          </h3>
          <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px", maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
            Browse the marketplace to find Digital Workers that can help run your business.
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("ta:navigate", { detail: { section: "raas-store" } }))}
            style={{
              padding: "10px 24px", fontSize: 14, fontWeight: 600,
              color: "#fff", background: "#7c3aed",
              border: "none", borderRadius: 10, cursor: "pointer",
            }}
          >
            Browse Marketplace
          </button>
        </div>
      )}
    </div>
  );
}
