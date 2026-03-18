import React, { useState, useEffect, useCallback, useRef } from "react";
import useAdminAuth from "./hooks/useAdminAuth";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

// Pages (lazy-loaded stubs for now, built out in later steps)
import Dashboard from "./pages/Dashboard";
import AIControls from "./pages/AIControls";
import PipelineB2B from "./pages/PipelineB2B";
import PipelineCreators from "./pages/PipelineCreators";
import PipelineInvestors from "./pages/PipelineInvestors";
import Communications from "./pages/Communications";
import Campaigns from "./pages/Campaigns";
import Accounting from "./pages/Accounting";
import Settings from "./pages/Settings";
import Inventory from "./pages/Inventory";
import ReviewQueue from "./pages/ReviewQueue";
import VerificationQueue from "./pages/VerificationQueue";
import IdVerificationQueue from "./pages/IdVerificationQueue";
import MarketingTab from "./pages/MarketingTab";
import LifecycleTab from "./pages/LifecycleTab";
import GrowthTab from "./pages/GrowthTab";
import PricingCompliance from "./pages/PricingCompliance";
import WorkerPipeline from "./pages/WorkerPipeline";
import BogoManager from "./pages/BogoManager";
import PipelineMonitor from "./pages/PipelineMonitor";
import UsersPanel from "./pages/UsersPanel";
import ABTests from "./pages/ABTests";
import AdminChatPanel from "./components/AdminChatPanel";

const NAV_SECTIONS = [
  {
    label: null,
    items: [{ id: "dashboard", label: "Dashboard", permission: "dashboard" }],
  },
  {
    label: null,
    items: [
      {
        id: "ai-controls",
        label: "AI Controls",
        permission: "monitoring",
      },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { id: "pipeline-b2b", label: "B2B Deals", permission: "pipeline" },
      {
        id: "pipeline-creators",
        label: "Creator Funnel",
        permission: "pipeline",
      },
      {
        id: "review-queue",
        label: "Review Queue",
        permission: "pipeline",
      },
      {
        id: "verification-queue",
        label: "Verification Queue",
        permission: "pipeline",
      },
      {
        id: "id-verification",
        label: "ID Verification",
        permission: "pipeline",
      },
      {
        id: "pipeline-investors",
        label: "Investor Relations",
        permission: "pipeline",
      },
      { id: "users", label: "Users", permission: "all" },
    ],
  },
  {
    label: null,
    items: [
      {
        id: "communications",
        label: "Communications",
        permission: "communications",
      },
    ],
  },
  {
    label: null,
    items: [
      { id: "campaigns", label: "Campaigns", permission: "campaigns" },
    ],
  },
  {
    label: null,
    items: [
      {
        id: "inventory",
        label: "Inventory",
        permission: "all",
      },
    ],
  },
  {
    label: "Growth",
    items: [
      { id: "marketing", label: "Marketing", permission: "campaigns" },
      { id: "lifecycle", label: "Lifecycle", permission: "campaigns" },
      { id: "growth-programs", label: "Growth", permission: "campaigns" },
      { id: "ab-tests", label: "A/B Tests", permission: "campaigns" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "pricing-compliance", label: "Pricing Compliance", permission: "all" },
      { id: "worker-pipeline", label: "Worker Pipeline", permission: "pipeline" },
      { id: "bogo-manager", label: "BOGO Manager", permission: "all" },
      { id: "pipeline-monitor", label: "Pipeline Monitor", permission: "monitoring" },
    ],
  },
  {
    label: null,
    items: [
      {
        id: "accounting",
        label: "Billing & Accounting",
        permission: "all",
      },
    ],
  },
  {
    label: null,
    items: [{ id: "settings", label: "Settings", permission: "all" }],
  },
];

function renderPage(page) {
  switch (page) {
    case "dashboard":
      return <Dashboard />;
    case "ai-controls":
      return <AIControls />;
    case "pipeline-b2b":
      return <PipelineB2B />;
    case "pipeline-creators":
      return <PipelineCreators />;
    case "review-queue":
      return <ReviewQueue />;
    case "verification-queue":
      return <VerificationQueue />;
    case "id-verification":
      return <IdVerificationQueue />;
    case "pipeline-investors":
      return <PipelineInvestors />;
    case "communications":
      return <Communications />;
    case "campaigns":
      return <Campaigns />;
    case "inventory":
      return <Inventory />;
    case "accounting":
      return <Accounting />;
    case "settings":
      return <Settings />;
    case "marketing":
      return <MarketingTab />;
    case "lifecycle":
      return <LifecycleTab />;
    case "growth-programs":
      return <GrowthTab />;
    case "pricing-compliance":
      return <PricingCompliance />;
    case "worker-pipeline":
      return <WorkerPipeline />;
    case "bogo-manager":
      return <BogoManager />;
    case "pipeline-monitor":
      return <PipelineMonitor />;
    case "users":
      return <UsersPanel />;
    case "ab-tests":
      return <ABTests />;
    default:
      return <Dashboard />;
  }
}

export default function AdminCommandCenter({ onBackToHub }) {
  const { user, role, hasPermission } = useAdminAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [staleDraftCount, setStaleDraftCount] = useState(0);

  // Sidebar resize (180-320px)
  const [acSidebarWidth, setAcSidebarWidth] = useState(() => {
    const v = parseInt(localStorage.getItem("AC_SIDEBAR_WIDTH"));
    return v >= 180 && v <= 320 ? v : 260;
  });
  const [isResizing, setIsResizing] = useState(false);

  const handleSidebarResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    function onMove(e) {
      setAcSidebarWidth(Math.min(320, Math.max(180, e.clientX)));
    }
    function onUp() {
      setIsResizing(false);
      setAcSidebarWidth(prev => { localStorage.setItem("AC_SIDEBAR_WIDTH", String(prev)); return prev; });
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  // Workspace data
  const [workspaces, setWorkspaces] = useState([]);
  const [wsDropOpen, setWsDropOpen] = useState(false);

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
    const token = localStorage.getItem("ID_TOKEN");
    if (!token) return;
    fetch(`${API_BASE}/api?path=/v1/admin:worker:pipeline`, {
      headers: { Authorization: `Bearer ${token}`, "X-Tenant-Id": "admin", "X-Vertical": "developer", "X-Jurisdiction": "GLOBAL" },
    })
      .then(r => r.json())
      .then(data => { if (data.ok) setStaleDraftCount(data.staleDraftCount || 0); })
      .catch(() => {});
    // Load workspaces
    fetch(`${API_BASE}/api?path=/v1/workspaces`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.ok && data.workspaces) setWorkspaces(data.workspaces); })
      .catch(() => {});
  }, []);

  function handleSwitchWorkspace(ws) {
    localStorage.setItem("VERTICAL", ws.vertical);
    localStorage.setItem("WORKSPACE_ID", ws.id);
    localStorage.setItem("WORKSPACE_NAME", ws.name);
    localStorage.setItem("COMPANY_NAME", ws.name);
    if (ws.jurisdiction) localStorage.setItem("JURISDICTION", ws.jurisdiction);
    if (ws.cosConfig) localStorage.setItem("COS_CONFIG", JSON.stringify(ws.cosConfig));
    window.location.reload();
  }

  async function handleSignOut() {
    await signOut(auth);
    localStorage.removeItem("ID_TOKEN");
    if (onBackToHub) onBackToHub();
    else window.location.href = "/";
  }

  return (
    <div className="ac-shell">
      {/* Mobile topbar */}
      <div className="ac-topbar">
        <button
          className="ac-topbar-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <span className="ac-topbar-title">TitleApp Admin</span>
      </div>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="ac-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`ac-sidebar ${sidebarOpen ? "ac-sidebar-open" : ""}`} style={{ width: acSidebarWidth + "px", minWidth: acSidebarWidth + "px" }}>
        <div className="ac-sidebar-header">
          <div className="ac-brand">
            <div className="ac-brand-mark">T</div>
            <div>
              <div className="ac-brand-name">TitleApp</div>
              <div className="ac-brand-sub">Command Center</div>
            </div>
          </div>
          <button
            className="ac-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Workspace switcher */}
        {workspaces.length > 0 && (
          <div style={{ padding: "0 12px 8px", position: "relative" }}>
            <button
              onClick={() => setWsDropOpen(!wsDropOpen)}
              style={{ width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#e5e7eb", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {localStorage.getItem("WORKSPACE_NAME") || "Alex"}
              </span>
              <span style={{ fontSize: 10, opacity: 0.5 }}>{wsDropOpen ? "\u25B2" : "\u25BC"}</span>
            </button>
            {wsDropOpen && (
              <div style={{ position: "absolute", left: 12, right: 12, top: "100%", background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, zIndex: 100, maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                <div
                  onClick={() => { setWsDropOpen(false); if (onBackToHub) onBackToHub(); }}
                  style={{ padding: "8px 10px", fontSize: 12, color: "#c4b5fd", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 600 }}
                >
                  Alex
                </div>
                {workspaces.map(ws => (
                  <div
                    key={ws.id}
                    onClick={() => { setWsDropOpen(false); handleSwitchWorkspace(ws); }}
                    style={{ padding: "8px 10px", fontSize: 12, color: "#e5e7eb", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {ws.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {onBackToHub && (
          <button
            className="ac-nav-item"
            style={{ margin: '0 12px 8px', fontSize: 12, color: '#94a3b8' }}
            onClick={onBackToHub}
          >
            &larr; Back to Workspaces
          </button>
        )}

        <nav className="ac-nav">
          {NAV_SECTIONS.map((section, si) => {
            const visibleItems = section.items.filter(
              (item) =>
                item.permission === "dashboard" || hasPermission(item.permission)
            );
            if (!visibleItems.length) return null;
            return (
              <div key={si} className="ac-nav-section">
                {section.label && (
                  <div className="ac-nav-label">{section.label}</div>
                )}
                {visibleItems.map((item) => (
                  <button
                    key={item.id}
                    className={`ac-nav-item ${
                      currentPage === item.id ? "ac-nav-item-active" : ""
                    }`}
                    onClick={() => {
                      setCurrentPage(item.id);
                      setSidebarOpen(false);
                    }}
                  >
                    {item.label}
                    {item.id === "worker-pipeline" && staleDraftCount > 0 && (
                      <span className="ac-nav-badge">{staleDraftCount}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="ac-sidebar-footer">
          <div className="ac-user-info">
            <div className="ac-user-email">
              {user?.email || ""}
            </div>
            <div className="ac-user-role">{role}</div>
          </div>
          <button className="ac-signout-btn" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar resize handle */}
      <div
        style={{ width: 6, cursor: "col-resize", background: isResizing ? "rgba(124,58,237,0.12)" : "transparent", flexShrink: 0, zIndex: 10 }}
        onMouseDown={handleSidebarResizeStart}
        onDoubleClick={() => { setAcSidebarWidth(220); localStorage.setItem("AC_SIDEBAR_WIDTH", "220"); }}
      />

      {/* Main content with Alex chat */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <AdminChatPanel currentPage={currentPage} />
        <main className="ac-main" style={{ flex: 1, overflow: "auto" }}>{renderPage(currentPage)}</main>
      </div>
    </div>
  );
}
