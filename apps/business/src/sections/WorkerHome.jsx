import React, { useState, useEffect } from "react";
import WorkerIcon from "../utils/workerIcons";
import { currentPersonaTint, gradient } from "../utils/personaColor";
import { prettyWorkerName } from "../utils/displayName";
import { useWorkerState } from "../context/WorkerStateContext";
import MorningBriefCanvas from "../components/MorningBriefCanvas";

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
  // Strip codename scaffolding so "vet-003-drug-dosing" never renders verbatim.
  return prettyWorkerName(slug);
}

const AVIATION_SLUGS = /^av-|aviation|copilot|pilot/i;

export default function WorkerHome() {
  const workerCtx = useWorkerState();
  const [workers, setWorkers] = useState([]);
  const [catalogMap, setCatalogMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    loadWorkers();
    loadNotes();
    const notesInterval = setInterval(loadNotes, 60000);
    return () => clearInterval(notesInterval);
  }, []);

  async function loadNotes() {
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const r = await fetch(`${apiBase}/api?path=/v1/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.ok && Array.isArray(d.notes)) setNotes(d.notes);
    } catch {
      // notes are optional — brief still renders without them
    }
  }

  async function loadWorkers() {
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

      const allWorkerSlugs = new Set();

      // Personal Space (Vault) scopes to the persona's OWN subscribed workers —
      // the SAME ACTIVE_WORKERS list the Vault dashboard reads. The /v1/workspaces
      // fetch below only knows BUSINESS workspaces; in the vault the lookup misses
      // and falls back to the business workspace, which wrongly showed all 8
      // business workers on the personal worker grid (Sean, 2026-06-26). Match
      // VaultDashboard's source so the two views agree.
      const isPersonal = (localStorage.getItem("VERTICAL") || "") === "consumer";
      if (isPersonal) {
        let active = [];
        try { active = JSON.parse(localStorage.getItem("ACTIVE_WORKERS") || "[]"); } catch { /* blocked */ }
        for (const w of active) {
          const s = typeof w === "string" ? w : (w?.slug || w?.id);
          if (s && !ALEX_SLUGS.has(s) && !(typeof w === "object" && w?.workerType === "game")) allWorkerSlugs.add(s);
        }
      } else {
        // Business workspace: scope to the CURRENT persona only — NEVER union
        // across workspaces. WORKSPACE_ID is the app's authoritative current-
        // workspace key; TENANT_ID can lag when switching, so prefer the former.
        const wsResp = await fetch(`${apiBase}/api?path=/v1/workspaces`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const wsData = await wsResp.json();
        let currentWs = null;
        try { currentWs = localStorage.getItem("WORKSPACE_ID") || localStorage.getItem("TENANT_ID"); } catch { /* blocked */ }
        if (wsData.ok && wsData.workspaces) {
          const current = wsData.workspaces.find(ws => ws.id === currentWs)
            || wsData.workspaces.find(ws => ws.isDefault)
            || wsData.workspaces[0];
          for (const w of (current?.activeWorkers || [])) {
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
    const cat = catalogMap[slug] || {};
    const name = WORKER_NAMES[slug] || cat.name || slugToName(slug);
    // Mirror Sidebar.handleWorkerClick — without these, WorkerHomeRenderer's
    // activeWorkerData is null and it falls through to the worker list,
    // re-showing this same view instead of opening the worker (CODEX 50.10-T3 follow-up).
    if (workerCtx?.setWorkerOptimistic) {
      workerCtx.setWorkerOptimistic({
        slug,
        name,
        suite: cat.suite || "",
        vertical: cat.vertical || cat.suite || "",
        description: cat.description || cat.headline || "",
        status: cat.status || "live",
      });
    }
    if (workerCtx?.selectWorker) workerCtx.selectWorker(slug);
    window.dispatchEvent(new CustomEvent("ta:select-worker", {
      detail: { slug, name },
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

  const hasAviationWorker = workers.some(s => AVIATION_SLUGS.test(s));

  if (loading) {
    return (
      <div style={{ padding: 40, color: "#94a3b8" }}>Loading...</div>
    );
  }

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      {/* Morning brief canvas — always shown at top */}
      <MorningBriefCanvas hasAviationWorker={hasAviationWorker} notes={notes} />

      {/* Workers section */}
      {workers.length > 0 && (
      <div style={{ padding: "0 32px 32px", maxWidth: 960 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
          Your Workers ({workers.length})
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
                        background: gradient(currentPersonaTint()),
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

      </div>
      )}

      {/* Add workers CTA when none yet */}
      {workers.length === 0 && (
        <div style={{ padding: "0 32px 32px", textAlign: "center" }}>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("ta:navigate", { detail: { section: "raas-store" } }))}
            style={{
              padding: "10px 24px", fontSize: 14, fontWeight: 600,
              color: "#7c3aed", background: "#f5f3ff",
              border: "1px solid #ddd6fe", borderRadius: 10, cursor: "pointer",
            }}
          >
            Browse Marketplace to add workers
          </button>
        </div>
      )}
    </div>
  );
}
