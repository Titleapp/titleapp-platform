import React, { useState } from "react";
import Sidebar from "./Sidebar";
import FloatingChat from "./FloatingChat";

export default function AppShell({ children, currentSection, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <div className="pill">Consumer</div>
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
