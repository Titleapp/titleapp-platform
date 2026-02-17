import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import ChatPanel from "./ChatPanel";
import * as api from "../api/client";

export default function AppShell({ children, currentSection, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tenantInfo, setTenantInfo] = useState(null);

  useEffect(() => {
    loadTenantInfo();
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

  const [chatOpen, setChatOpen] = useState(false);

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
              {tenantInfo.name || "Business"}
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
        />
      </div>

      {/* Dual-panel: main content + chat sidebar */}
      <div className="dualPanel">
        <main className="main">{children}</main>
        <aside className="chatSidebar">
          <ChatPanel currentSection={currentSection} />
        </aside>
      </div>

      {/* Mobile chat toggle */}
      <button
        className="chatToggleTab"
        onClick={() => setChatOpen(!chatOpen)}
        aria-label={chatOpen ? "Close chat" : "Open chat"}
      >
        {chatOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>

      {/* Mobile chat slide-up */}
      {chatOpen && (
        <>
          <div className="mobileChatBackdrop" onClick={() => setChatOpen(false)} />
          <div className="mobileChatPanel">
            <ChatPanel currentSection={currentSection} />
          </div>
        </>
      )}
    </div>
  );
}
