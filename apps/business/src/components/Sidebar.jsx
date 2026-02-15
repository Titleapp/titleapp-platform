import React from "react";

export default function Sidebar({ currentSection, onNavigate, onClose }) {
  const sections = [
    { id: "dashboard", label: "Dashboard" },
    { id: "rules-resources", label: "Rules & Resources" },
    { id: "inventory", label: "Services & Inventory" },
    { id: "ai-chats", label: "AI, GPTs & Chats" },
    { id: "customers", label: "Customers" },
    { id: "appointments", label: "Appointments" },
    { id: "staff", label: "Staff" },
    { id: "reports", label: "Reports" },
    { id: "data-apis", label: "Data & APIs" },
    { id: "settings", label: "Settings" },
  ];

  function handleNavClick(sectionId) {
    onNavigate(sectionId);
    if (onClose) onClose();
  }

  function handleSignOut() {
    localStorage.removeItem("ID_TOKEN");
    window.location.reload();
  }

  return (
    <div className="sidebar">
      <div className="sidebarHeader">
        <div className="brand">
          <img
            src="/logo.png"
            alt="TitleApp AI"
            style={{ width: "32px", height: "32px", borderRadius: "8px" }}
          />
          <div>
            <div className="brandName">TitleApp AI</div>
            <div className="brandSub">Business</div>
          </div>
        </div>
        <button
          className="sidebarClose iconBtn"
          onClick={onClose}
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      <div className="sidebarSection">
        <div className="sidebarLabel">Navigation</div>
        <nav className="nav">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`navItem ${
                currentSection === section.id ? "navItemActive" : ""
              }`}
              onClick={() => handleNavClick(section.id)}
              style={{
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebarFooter">
        <button
          onClick={handleSignOut}
          className="iconBtn"
          style={{ width: "100%", marginTop: "10px" }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
