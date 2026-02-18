import React from "react";
import { getAuth, signOut } from "firebase/auth";

const NAV_BY_VERTICAL = {
  consumer: [
    { id: "dashboard", label: "Dashboard" },
    { id: "my-vehicles", label: "My Vehicles" },
    { id: "my-properties", label: "My Properties" },
    { id: "my-documents", label: "My Documents" },
    { id: "my-logbook", label: "My Logbook" },
    { id: "my-certifications", label: "My Certifications" },
    { id: "ai-chats", label: "My AI & GPTs" },
    { id: "settings", label: "Settings" },
  ],
  analyst: [
    { id: "dashboard", label: "Dashboard" },
    { id: "analyst", label: "Analyst" },
    { id: "rules-resources", label: "Rules & Resources" },
    { id: "inventory", label: "Documents" },
    { id: "staff", label: "Team" },
    { id: "ai-chats", label: "AI & GPTs" },
    { id: "reports", label: "Reports" },
    { id: "data-apis", label: "Data & APIs" },
    { id: "settings", label: "Settings" },
  ],
  "property-mgmt": [
    { id: "dashboard", label: "Dashboard" },
    { id: "inventory", label: "Properties" },
    { id: "customers", label: "Tenants" },
    { id: "appointments", label: "Maintenance" },
    { id: "rules-resources", label: "Rules & Resources" },
    { id: "reports", label: "Reports" },
    { id: "settings", label: "Settings" },
  ],
  auto: [
    { id: "dashboard", label: "Dashboard" },
    { id: "inventory", label: "Inventory" },
    { id: "customers", label: "Customers" },
    { id: "appointments", label: "Appointments" },
    { id: "staff", label: "Staff" },
    { id: "rules-resources", label: "Rules & Resources" },
    { id: "reports", label: "Reports" },
    { id: "settings", label: "Settings" },
  ],
  "real-estate": [
    { id: "dashboard", label: "Dashboard" },
    { id: "inventory", label: "Listings" },
    { id: "customers", label: "Clients" },
    { id: "rules-resources", label: "Rules & Resources" },
    { id: "reports", label: "Reports" },
    { id: "settings", label: "Settings" },
  ],
};

const DEFAULT_NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "rules-resources", label: "Rules & Resources" },
  { id: "ai-chats", label: "AI & GPTs" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "Settings" },
];

export default function Sidebar({ currentSection, onNavigate, onClose, tenantName }) {
  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const sections = NAV_BY_VERTICAL[vertical] || DEFAULT_NAV;

  function handleNavClick(sectionId) {
    onNavigate(sectionId);
    if (onClose) onClose();
  }

  function handleSignOut() {
    const auth = getAuth();
    signOut(auth).then(() => {
      localStorage.removeItem("ID_TOKEN");
      localStorage.removeItem("TENANT_ID");
      window.location.reload();
    }).catch(() => {
      localStorage.removeItem("ID_TOKEN");
      localStorage.removeItem("TENANT_ID");
      window.location.reload();
    });
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
            <div className="brandSub">{tenantName || (vertical === "consumer" ? "Personal Vault" : "Business")}</div>
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
