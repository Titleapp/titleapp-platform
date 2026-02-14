import React from "react";

export default function Sidebar({ currentSection, onNavigate, onClose }) {
  const sections = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "rules-resources", label: "Rules & Resources", icon: "⚙️" },
    { id: "inventory", label: "Services & Inventory", icon: "📦" },
    { id: "ai-chats", label: "AI, GPTs & Chats", icon: "🤖" },
    { id: "customers", label: "Customers", icon: "👥" },
    { id: "appointments", label: "Appointments", icon: "📅" },
    { id: "staff", label: "Staff", icon: "👤" },
    { id: "reports", label: "Reports", icon: "📈" },
    { id: "data-apis", label: "Data & APIs", icon: "🔌" },
    { id: "settings", label: "Settings", icon: "⚙️" },
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
          <div className="brandMark">T</div>
          <div>
            <div className="brandName">TitleApp</div>
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
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
              }}
            >
              <span>{section.icon}</span>
              <span>{section.label}</span>
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
