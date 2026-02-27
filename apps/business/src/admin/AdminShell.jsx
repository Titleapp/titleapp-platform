import React, { useState } from "react";
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
        id: "pipeline-investors",
        label: "Investor Relations",
        permission: "pipeline",
      },
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
    default:
      return <Dashboard />;
  }
}

export default function AdminCommandCenter({ onBackToHub }) {
  const { user, role, hasPermission } = useAdminAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <aside className={`ac-sidebar ${sidebarOpen ? "ac-sidebar-open" : ""}`}>
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

      {/* Main content with Alex chat */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <AdminChatPanel currentPage={currentPage} />
        <main className="ac-main" style={{ flex: 1, overflow: "auto" }}>{renderPage(currentPage)}</main>
      </div>
    </div>
  );
}
