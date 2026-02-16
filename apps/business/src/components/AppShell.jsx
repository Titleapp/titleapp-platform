import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import FloatingChat from "./FloatingChat";
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

  return (
    <>
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

        {/* Main content */}
        <main className="main">{children}</main>
      </div>

      {/* FloatingChat - Door 2 */}
      <FloatingChat demoMode={false} />
    </>
  );
}
