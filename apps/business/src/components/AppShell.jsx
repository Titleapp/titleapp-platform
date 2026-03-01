import React, { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "./Sidebar";
import ChatPanel from "./ChatPanel";
import QuickSwitcher from "./QuickSwitcher";
import * as api from "../api/client";

export default function AppShell({ children, currentSection, onNavigate, onBackToHub }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);

  // Resizable panels state
  const savedWidth = parseFloat(localStorage.getItem("PANEL_WIDTH")) || 40;
  const [chatWidth, setChatWidth] = useState(Math.min(65, Math.max(25, savedWidth)));
  const [isResizing, setIsResizing] = useState(false);
  const dualPanelRef = useRef(null);

  useEffect(() => {
    loadTenantInfo();
    loadWorkspaces();
  }, []);

  async function loadTenantInfo() {
    try {
      const vertical = localStorage.getItem("VERTICAL") || "auto";
      const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";
      const result = await api.getMemberships({ vertical, jurisdiction });

      if (result.ok && result.memberships && result.memberships.length > 0) {
        const tenantId = result.memberships[0].tenantId;
        const tenant = result.tenants?.[tenantId];
        setTenantInfo(tenant);
      }
    } catch (error) {
      console.error("Failed to load tenant info:", error);
    }
  }

  async function loadWorkspaces() {
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const resp = await fetch(`${apiBase}/api?path=/v1/workspaces`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (data.ok && data.workspaces) {
        setWorkspaces(data.workspaces);
      }
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    }
  }

  function handleSwitchWorkspace(workspace) {
    localStorage.setItem("VERTICAL", workspace.vertical);
    localStorage.setItem("WORKSPACE_ID", workspace.id);
    localStorage.setItem("WORKSPACE_NAME", workspace.name);
    localStorage.setItem("COMPANY_NAME", workspace.name);
    localStorage.setItem("TENANT_NAME", workspace.name);
    if (workspace.jurisdiction) {
      localStorage.setItem("JURISDICTION", workspace.jurisdiction);
    } else {
      localStorage.removeItem("JURISDICTION");
    }
    if (workspace.cosConfig) {
      localStorage.setItem("COS_CONFIG", JSON.stringify(workspace.cosConfig));
    }
    window.location.reload();
  }

  // Resize handlers
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    function handleResizeMove(e) {
      if (!dualPanelRef.current) return;
      const rect = dualPanelRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = (x / rect.width) * 100;
      const clamped = Math.min(65, Math.max(25, pct));
      setChatWidth(clamped);
    }

    function handleResizeEnd() {
      setIsResizing(false);
      setChatWidth(prev => {
        localStorage.setItem("PANEL_WIDTH", String(prev));
        return prev;
      });
    }

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  // Quick Switcher keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowQuickSwitcher(prev => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [chatOpen, setChatOpen] = useState(false);

  const currentWorkspaceId = localStorage.getItem("WORKSPACE_ID") || "vault";

  return (
    <div className="appShell">
      {/* Mobile topbar */}
      <div className="topbar">
        <button
          className="iconBtn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <div className="topbarTitle">TitleApp</div>
        {tenantInfo && (
          <div style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 16px",
            background: "rgba(124, 58, 237, 0.1)",
            borderRadius: "12px",
            border: "1px solid rgba(124, 58, 237, 0.2)"
          }}>
            {tenantInfo.logoUrl ? (
              <img
                src={tenantInfo.logoUrl}
                alt={tenantInfo.name || "Business logo"}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  objectFit: "cover"
                }}
              />
            ) : (
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgb(124, 58, 237) 0%, rgb(147, 51, 234) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 600,
                fontSize: "14px"
              }}>
                {tenantInfo.name?.charAt(0)?.toUpperCase() || "B"}
              </div>
            )}
            <div style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text)",
              whiteSpace: "nowrap"
            }}>
              {(() => {
                const v = localStorage.getItem("VERTICAL") || "auto";
                if (v === "consumer") {
                  const first = (tenantInfo.name || "").split(" ")[0];
                  return first ? `${first}'s Vault` : "My Vault";
                }
                return tenantInfo.name || "Business";
              })()}
            </div>
          </div>
        )}
        {!tenantInfo && <div className="pill">Business</div>}
      </div>

      {/* Backdrop for mobile menu */}
      {sidebarOpen && (
        <div
          className="backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div className={sidebarOpen ? "sidebar sidebarOpen" : "sidebar"}>
        <Sidebar
          currentSection={currentSection}
          onNavigate={onNavigate}
          onClose={() => setSidebarOpen(false)}
          tenantName={tenantInfo?.name}
          onBackToHub={onBackToHub}
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          onSwitchWorkspace={handleSwitchWorkspace}
        />
      </div>

      {/* Dual-panel: chat sidebar + resize handle + main content */}
      <div className="dualPanel" ref={dualPanelRef}>
        <aside
          className="chatSidebar"
          style={{ width: chatWidth + "%", maxWidth: "none", minWidth: "280px" }}
        >
          <ChatPanel currentSection={currentSection} />
        </aside>
        <div
          className={`resizeHandle${isResizing ? " active" : ""}`}
          onMouseDown={handleResizeStart}
          onDoubleClick={() => {
            setChatWidth(40);
            localStorage.setItem("PANEL_WIDTH", "40");
          }}
        />
        <main className="main">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="mobileBottomNav">
        <button
          className={`mobileBottomNavItem${currentSection === "dashboard" ? " active" : ""}`}
          onClick={() => onNavigate("dashboard")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          Home
        </button>
        <button
          className="mobileBottomNavItem"
          onClick={() => setSidebarOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Workers
        </button>
        <button
          className={`mobileBottomNavItem${chatOpen ? " active" : ""}`}
          onClick={() => setChatOpen(!chatOpen)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Chat
        </button>
        {workspaces.length > 1 && (
          <button
            className="mobileBottomNavItem"
            onClick={() => setShowQuickSwitcher(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" />
            </svg>
            Spaces
          </button>
        )}
      </nav>

      {/* Mobile chat slide-up */}
      {chatOpen && (
        <>
          <div className="mobileChatBackdrop" onClick={() => setChatOpen(false)} />
          <div className="mobileChatPanel">
            <ChatPanel currentSection={currentSection} />
          </div>
        </>
      )}

      {/* Quick Switcher (Cmd+K) */}
      <QuickSwitcher
        isOpen={showQuickSwitcher}
        onClose={() => setShowQuickSwitcher(false)}
        workspaces={workspaces}
        onNavigate={onNavigate}
        onSwitchWorkspace={handleSwitchWorkspace}
      />
    </div>
  );
}
