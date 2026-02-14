import React from "react";

export default function Sidebar({ currentSection, onNavigate, onClose }) {
  const sections = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "my-stuff", label: "My Stuff", icon: "🎯" },
    { id: "my-logbooks", label: "My Logbooks", icon: "📝" },
    { id: "student-records", label: "Student & Professional", icon: "🎓" },
    { id: "my-gpts", label: "My GPTs", icon: "🤖" },
    { id: "reports", label: "Reports", icon: "📈" },
    { id: "escrow", label: "Escrow", icon: "🔒" },
    { id: "wallet", label: "Wallet", icon: "💰" },
    { id: "profile", label: "Profile", icon: "👤" },
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
            <div className="brandSub">Consumer</div>
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
