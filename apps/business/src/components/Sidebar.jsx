import React from "react";
import { getAuth, signOut } from "firebase/auth";

const NAV_BY_VERTICAL = {
  consumer: [
    { id: "dashboard", label: "Dashboard" },
    { id: "vault-documents", label: "Documents" },
    { id: "vault-assets", label: "Assets" },
    { id: "vault-deadlines", label: "Deadlines" },
    { id: "vault-tools", label: "AI Tools" },
    { id: "reports", label: "Reports" },
    { id: "raas-store", label: "Marketplace" },
    { id: "settings", label: "Settings" },
  ],
  analyst: [
    { id: "dashboard", label: "Dashboard" },
    { id: "portfolio", label: "Portfolio" },
    { id: "research", label: "Research" },
    { id: "clients-lps", label: "Clients & LPs" },
    { id: "deal-pipeline", label: "Deal Pipeline" },
    { id: "reports", label: "Reports" },
    { id: "ai-chats", label: "AI Activity" },
    { id: "rules", label: "Rules" },
    { id: "raas-store", label: "Marketplace" },
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
    { id: "sales-pipeline", label: "Sales Pipeline" },
    { id: "fi-products", label: "F&I Products" },
    { id: "auto-service", label: "Service" },
    { id: "reports", label: "Reports" },
    { id: "ai-chats", label: "AI Activity" },
    { id: "rules", label: "Rules" },
    { id: "raas-store", label: "Marketplace" },
    { id: "settings", label: "Settings" },
  ],
  "real-estate": [
    { id: "dashboard", label: "Dashboard" },
    { id: "re-listings", label: "Listings" },
    { id: "re-buyers", label: "Buyers" },
    { id: "re-transactions", label: "Transactions" },
    { id: "re-properties", label: "Properties" },
    { id: "re-tenants", label: "Tenants" },
    { id: "re-maintenance", label: "Maintenance" },
    { id: "re-marketing", label: "Marketing" },
    { id: "reports", label: "Reports" },
    { id: "ai-chats", label: "AI Activity" },
    { id: "rules", label: "Rules" },
    { id: "raas-store", label: "Marketplace" },
    { id: "settings", label: "Settings" },
  ],
  investor: [
    { id: "dashboard", label: "Dashboard" },
    { id: "investor-data-room", label: "Data Room" },
    { id: "investor-cap-table", label: "Cap Table" },
    { id: "investor-pipeline", label: "Investor Pipeline" },
    { id: "reports", label: "Reports" },
    { id: "ai-chats", label: "AI Activity" },
    { id: "rules", label: "Rules" },
    { id: "raas-store", label: "Marketplace" },
    { id: "settings", label: "Settings" },
  ],
};

const DEFAULT_NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "rules-resources", label: "Rules & Resources" },
  { id: "ai-chats", label: "AI Activity" },
  { id: "reports", label: "Reports" },
  { id: "raas-store", label: "Marketplace" },
  { id: "settings", label: "Settings" },
];

export default function Sidebar({ currentSection, onNavigate, onClose, tenantName, onBackToHub }) {
  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const sections = NAV_BY_VERTICAL[vertical] || DEFAULT_NAV;
  const isPersonal = vertical === "consumer";

  // Resolve a human-readable name, rejecting raw IDs like ws_1771474949129_ryx41z
  const rawWsName = localStorage.getItem("WORKSPACE_NAME") || "";
  const isRawId = /^ws_\d+_[a-z0-9]+$/i.test(rawWsName);
  const workspaceName = isRawId ? "" : rawWsName;
  const companyName = workspaceName || tenantName || localStorage.getItem("COMPANY_NAME") || localStorage.getItem("TENANT_NAME") || "";
  const firstName = companyName.split(" ")[0] || "";
  const brandLabel = isPersonal && firstName
    ? `${firstName}'s Vault`
    : (workspaceName || tenantName || (isPersonal ? "Personal Vault" : "Business"));

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
            <div className="brandName">{isPersonal ? brandLabel : (workspaceName || "TitleApp AI")}</div>
            <div className="brandSub">{isPersonal ? "TitleApp Vault" : {auto: "Auto Dealer", analyst: "Investment Analyst", "real-estate": "Real Estate", aviation: "Aviation", investor: "Investor Relations"}[vertical] || "Business"}</div>
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
        {onBackToHub && (
          <button
            onClick={onBackToHub}
            className="iconBtn"
            style={{ width: "100%", marginTop: "10px", color: "#7c3aed" }}
          >
            Switch Workspace
          </button>
        )}
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
