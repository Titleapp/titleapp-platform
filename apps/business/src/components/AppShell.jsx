import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import Sidebar from "./Sidebar";
import ChatPanel from "./ChatPanel";
import QuickSwitcher from "./QuickSwitcher";
import CartDrawer from "./CartDrawer";
import * as api from "../api/client";
import { RightPanelProvider } from "../context/RightPanelContext";
import { useVisitorContext } from "../hooks/useVisitorContext";

const RightPanel = lazy(() => import("./RightPanel/RightPanel"));

export default function AppShell({ children, currentSection, onNavigate, onBackToHub, guestMode, guestVertical, guestId }) {
  const visitorCtx = useVisitorContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);

  // Resizable panels state
  const savedWidth = parseFloat(localStorage.getItem("PANEL_WIDTH")) || 40;
  const [chatWidth, setChatWidth] = useState(Math.min(65, Math.max(25, savedWidth)));
  const [isResizing, setIsResizing] = useState(false); // false | "chat" | "sidebar"
  const dualPanelRef = useRef(null);
  const shellRef = useRef(null);

  // Sidebar resize state (Col1: 180-320px, default 280)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const v = parseInt(localStorage.getItem("SIDEBAR_WIDTH"));
    return v >= 180 && v <= 320 ? v : 280;
  });

  // Alex review notification badge
  const [alexBadge, setAlexBadge] = useState(() => localStorage.getItem("ta_alex_pending_review") === "true");
  useEffect(() => {
    function onReview() { setAlexBadge(true); localStorage.setItem("ta_alex_pending_review", "true"); }
    function onDismiss() { setAlexBadge(false); localStorage.removeItem("ta_alex_pending_review"); }
    window.addEventListener("ta:alex-has-recommendation", onReview);
    window.addEventListener("ta:alex-review-dismissed", onDismiss);
    return () => { window.removeEventListener("ta:alex-has-recommendation", onReview); window.removeEventListener("ta:alex-review-dismissed", onDismiss); };
  }, []);

  useEffect(() => {
    if (guestMode) return;
    loadTenantInfo();
    loadWorkspaces();
  }, [guestMode]);

  // Reload workspace data on smooth context switch
  useEffect(() => {
    function handleWorkspaceChange() {
      loadWorkspaces();
      loadTenantInfo();
    }
    window.addEventListener("ta:workspace-changed", handleWorkspaceChange);
    return () => window.removeEventListener("ta:workspace-changed", handleWorkspaceChange);
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
        // Sync localStorage vertical with actual workspace data
        const wsId = localStorage.getItem("WORKSPACE_ID") || "vault";
        const matchedWs = data.workspaces.find(w => w.id === wsId);
        if (matchedWs && matchedWs.vertical) {
          const storedVertical = localStorage.getItem("VERTICAL");
          if (storedVertical !== matchedWs.vertical) {
            localStorage.setItem("VERTICAL", matchedWs.vertical);
          }
        }
        // Update active workers in localStorage
        if (matchedWs) {
          localStorage.setItem("ACTIVE_WORKERS", JSON.stringify(matchedWs.activeWorkers || []));
        }
        // Store all team names for Alex context
        localStorage.setItem("ta_all_teams", JSON.stringify(data.workspaces.map(w => w.name || w.vertical || "Workspace")));
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
    localStorage.setItem("TENANT_ID", workspace.id);
    if (workspace.jurisdiction) {
      localStorage.setItem("JURISDICTION", workspace.jurisdiction);
    } else {
      localStorage.removeItem("JURISDICTION");
    }
    if (workspace.cosConfig) {
      localStorage.setItem("COS_CONFIG", JSON.stringify(workspace.cosConfig));
    }
    // Smooth context switch instead of full reload
    window.dispatchEvent(new CustomEvent("ta:workspace-changed", { detail: { teamId: workspace.id, vertical: workspace.vertical, name: workspace.name } }));
    window.dispatchEvent(new CustomEvent("ta:navigate", { detail: { section: "dashboard" } }));
  }

  // Resize handlers
  const handleChatResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing("chat");
  }, []);

  const handleSidebarResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing("sidebar");
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    function handleResizeMove(e) {
      if (isResizing === "chat") {
        if (!dualPanelRef.current) return;
        const rect = dualPanelRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = (x / rect.width) * 100;
        const clamped = Math.min(65, Math.max(25, pct));
        setChatWidth(clamped);
      } else if (isResizing === "sidebar") {
        const x = e.clientX;
        const clamped = Math.min(320, Math.max(180, x));
        setSidebarWidth(clamped);
      }
    }

    function handleResizeEnd() {
      if (isResizing === "chat") {
        setChatWidth(prev => { localStorage.setItem("PANEL_WIDTH", String(prev)); return prev; });
      } else if (isResizing === "sidebar") {
        setSidebarWidth(prev => { localStorage.setItem("SIDEBAR_WIDTH", String(prev)); return prev; });
      }
      setIsResizing(false);
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

  const [chatOpen, setChatOpen] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("promoted") === "true"; } catch { return false; }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ta_cart") || "[]").length; } catch { return 0; }
  });

  useEffect(() => {
    function onCartUpdated() {
      try { setCartCount(JSON.parse(localStorage.getItem("ta_cart") || "[]").length); } catch { setCartCount(0); }
    }
    window.addEventListener("ta:cart-updated", onCartUpdated);
    return () => window.removeEventListener("ta:cart-updated", onCartUpdated);
  }, []);

  const currentWorkspaceId = localStorage.getItem("WORKSPACE_ID") || "vault";

  // Load worker data from current workspace
  const currentWs = workspaces.find(w => w.id === currentWorkspaceId) || {};
  const workerGroups = currentWs.workerGroups || [];
  const activeWorkers = currentWs.activeWorkers || [];
  // Store active workers in localStorage so ChatPanel can pass them to Alex
  useEffect(() => {
    if (activeWorkers.length > 0) {
      localStorage.setItem("ACTIVE_WORKERS", JSON.stringify(activeWorkers));
    }
  }, [activeWorkers]);
  const chiefOfStaffConfig = (() => {
    try { return JSON.parse(localStorage.getItem("COS_CONFIG") || "{}"); } catch { return {}; }
  })();
  const chiefOfStaff = chiefOfStaffConfig.name ? { enabled: true, ...chiefOfStaffConfig } : null;

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
                return tenantInfo.name || "Personal";
              })()}
            </div>
          </div>
        )}
        {!tenantInfo && <div className="pill">Personal</div>}
        <button
          onClick={() => setCartOpen(!cartOpen)}
          style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 6, marginLeft: "auto", color: "#64748b" }}
          aria-label="Cart"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          {cartCount > 0 && (
            <span style={{ position: "absolute", top: 0, right: 0, width: 16, height: 16, borderRadius: 8, background: "#0B7A6E", color: "white", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>
          )}
        </button>
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
      <div className={sidebarOpen ? "sidebar sidebarOpen" : "sidebar"} style={{ width: sidebarWidth + "px", minWidth: sidebarWidth + "px" }}>
        <Sidebar
          currentSection={currentSection}
          onNavigate={guestMode ? () => {} : onNavigate}
          onClose={() => setSidebarOpen(false)}
          tenantName={guestMode ? ({ solar: "Solar Energy", solar_vpp: "Solar Energy", "auto-dealer": "Auto Dealer", auto_dealer: "Auto Dealer", "real-estate": "Real Estate", real_estate_development: "Real Estate", aviation: "Aviation", creator: "Creator Studio", creators: "Creator Studio" }[guestVertical] || "TitleApp") : tenantInfo?.name}
          onBackToHub={onBackToHub}
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          onSwitchWorkspace={handleSwitchWorkspace}
          workerGroups={workerGroups}
          activeWorkers={activeWorkers}
          chiefOfStaff={chiefOfStaff}
          guestMode={guestMode}
        />
      </div>

      {/* Sidebar resize handle */}
      <div
        className={`resizeHandle${isResizing === "sidebar" ? " active" : ""}`}
        onMouseDown={handleSidebarResizeStart}
        onDoubleClick={() => {
          setSidebarWidth(220);
          localStorage.setItem("SIDEBAR_WIDTH", "220");
          setChatWidth(40);
          localStorage.setItem("PANEL_WIDTH", "40");
        }}
      />

      {/* Dual-panel: chat sidebar + resize handle + main content */}
      <div className="dualPanel" ref={dualPanelRef}>
        <aside
          className="chatSidebar"
          style={{ width: chatWidth + "%", maxWidth: "none", minWidth: "400px" }}
        >
          {guestMode ? children : <ChatPanel currentSection={currentSection} />}
        </aside>
        <div
          className={`resizeHandle${isResizing === "chat" ? " active" : ""}`}
          onMouseDown={handleChatResizeStart}
          onDoubleClick={() => {
            setChatWidth(40);
            localStorage.setItem("PANEL_WIDTH", "40");
          }}
        />
        <main className="main">
          {guestMode ? (
            <RightPanelProvider initialState={visitorCtx.state} initialVertical={visitorCtx.vertical} initialVerticalLabel={visitorCtx.verticalLabel}>
              <Suspense fallback={<div style={{ padding: 40, color: "#94a3b8" }}>Loading...</div>}>
                <RightPanel />
              </Suspense>
            </RightPanelProvider>
          ) : children}
        </main>
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
          className={`mobileBottomNavItem${chatOpen ? " active" : ""}`}
          onClick={() => setChatOpen(!chatOpen)}
          style={{ position: "relative" }}
          title={alexBadge ? "Alex has a recommendation" : undefined}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <circle cx="9" cy="10" r="1" fill="currentColor" />
            <circle cx="12" cy="10" r="1" fill="currentColor" />
            <circle cx="15" cy="10" r="1" fill="currentColor" />
          </svg>
          {alexBadge && <span style={{ position: "absolute", top: 4, right: "calc(50% - 16px)", width: 10, height: 10, borderRadius: 5, background: "#7c3aed", border: "2px solid white" }} />}
          Explore
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

      {/* Mobile chat — full screen */}
      {chatOpen && (
        <>
          <div className="mobileChatBackdrop" onClick={() => setChatOpen(false)} />
          <div className="mobileChatPanel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #f1f5f9", flexShrink: 0, background: "white" }}>
              <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: "#64748b", padding: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                Back
              </button>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>Explore</span>
              <div style={{ width: 50 }} />
            </div>
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

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
