import React, { useState, useMemo } from "react";
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
    { id: "b2b-analytics", label: "B2B Distribution" },
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
    { id: "b2b-analytics", label: "B2B Distribution" },
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
    { id: "b2b-analytics", label: "B2B Distribution" },
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
    { id: "b2b-analytics", label: "B2B Distribution" },
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
    { id: "b2b-analytics", label: "B2B Distribution" },
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

const VERTICAL_LABELS = {
  auto: "Auto Dealer",
  analyst: "Investment Analyst",
  "real-estate": "Real Estate",
  aviation: "Aviation",
  investor: "Investor Relations",
  "property-mgmt": "Property Management",
  consumer: "Personal Vault",
};

export default function Sidebar({
  currentSection,
  onNavigate,
  onClose,
  tenantName,
  onBackToHub,
  workspaces = [],
  currentWorkspaceId,
  onSwitchWorkspace,
  workerGroups = [],
  activeWorkers = [],
  chiefOfStaff,
}) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [workerFilter, setWorkerFilter] = useState("work");
  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const sections = NAV_BY_VERTICAL[vertical] || DEFAULT_NAV;
  const isPersonal = vertical === "consumer";

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

  function toggleGroup(groupId) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  // Filter workers by tab
  const filteredWorkers = useMemo(() => {
    switch (workerFilter) {
      case "work": return activeWorkers;
      case "personal": return [];
      case "shared": return [];
      default: return activeWorkers;
    }
  }, [workerFilter, activeWorkers]);

  const filteredGroups = useMemo(() => {
    switch (workerFilter) {
      case "work": return workerGroups;
      case "personal": return [];
      case "shared": return [];
      default: return workerGroups;
    }
  }, [workerFilter, workerGroups]);

  // Group workspaces for the switcher
  const ownWorkspaces = workspaces.filter(w => w.type !== "shared");
  const sharedWorkspaces = workspaces.filter(w => w.type === "shared");

  return (
    <div className="sidebar">
      {/* Workspace Switcher Header */}
      <div className="sidebarHeader" style={{ position: "relative" }}>
        <div
          className="brand"
          onClick={() => workspaces.length > 1 && setShowSwitcher(!showSwitcher)}
          style={{ cursor: workspaces.length > 1 ? "pointer" : "default", flex: 1 }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 700, fontSize: 14, flexShrink: 0,
          }}>
            {(brandLabel || "T").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="brandName" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {isPersonal ? brandLabel : (workspaceName || "TitleApp AI")}
            </div>
            <div className="brandSub">{VERTICAL_LABELS[vertical] || "Business"}</div>
          </div>
          {workspaces.length > 1 && (
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              style={{
                flexShrink: 0, color: "rgba(226,232,240,0.6)",
                transform: showSwitcher ? "rotate(180deg)" : "none",
                transition: "transform 150ms ease",
              }}
            >
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <button className="sidebarClose iconBtn" onClick={onClose} aria-label="Close menu">
          ✕
        </button>

        {/* Workspace Switcher Dropdown */}
        {showSwitcher && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
            background: "#0f172a", borderRadius: "0 0 12px 12px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            maxHeight: 320, overflowY: "auto",
          }}>
            {ownWorkspaces.length > 0 && (
              <div style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Your Workspaces
              </div>
            )}
            {ownWorkspaces.map(ws => (
              <div
                key={ws.id}
                onClick={() => { setShowSwitcher(false); if (ws.id !== currentWorkspaceId) onSwitchWorkspace(ws); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", cursor: "pointer",
                  background: ws.id === currentWorkspaceId ? "rgba(124,58,237,0.15)" : "transparent",
                  borderRadius: 8, margin: "2px 8px",
                }}
                onMouseEnter={e => { if (ws.id !== currentWorkspaceId) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { if (ws.id !== currentWorkspaceId) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: ws.id === currentWorkspaceId ? "#7c3aed" : "#1e293b",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontWeight: 600, fontSize: 12, flexShrink: 0,
                }}>
                  {(ws.name || "?").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ws.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {VERTICAL_LABELS[ws.vertical] || ws.vertical}
                  </div>
                </div>
                {ws.id === currentWorkspaceId && (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                )}
              </div>
            ))}

            {sharedWorkspaces.length > 0 && (
              <>
                <div style={{ padding: "12px 12px 4px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Shared With You
                </div>
                {sharedWorkspaces.map(ws => (
                  <div
                    key={ws.id}
                    onClick={() => { setShowSwitcher(false); if (ws.id !== currentWorkspaceId) onSwitchWorkspace(ws); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 12px", cursor: "pointer",
                      background: ws.id === currentWorkspaceId ? "rgba(124,58,237,0.15)" : "transparent",
                      borderRadius: 8, margin: "2px 8px",
                    }}
                    onMouseEnter={e => { if (ws.id !== currentWorkspaceId) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                    onMouseLeave={e => { if (ws.id !== currentWorkspaceId) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: "#0f766e",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: 600, fontSize: 12, flexShrink: 0,
                    }}>
                      {(ws.senderOrgName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ws.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        From {ws.senderOrgName}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0" }} />

            {onBackToHub && (
              <div
                onClick={() => { setShowSwitcher(false); onBackToHub(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", cursor: "pointer", margin: "2px 8px", borderRadius: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 6, border: "1px dashed #475569", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3aed", fontSize: 16, fontWeight: 600 }}>+</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>Add Workspace</div>
              </div>
            )}

            {onBackToHub && (
              <div
                onClick={() => { setShowSwitcher(false); onBackToHub(); }}
                style={{
                  padding: "6px 12px 10px", cursor: "pointer",
                  fontSize: 12, color: "#64748b", textAlign: "center",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#94a3b8"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; }}
              >
                Manage Workspaces
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dashboard — first nav item */}
      <div className="sidebarSection" style={{ paddingBottom: 0 }}>
        <nav className="nav">
          <button
            className={`navItem ${currentSection === "dashboard" ? "navItemActive" : ""}`}
            onClick={() => handleNavClick("dashboard")}
            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            Dashboard
          </button>
        </nav>
      </div>

      {/* Digital Workers — second position */}
      <div className="sidebarSection">
        <div className="sidebarLabel">Digital Workers</div>

        {/* Work / Personal / Shared tabs */}
        <div style={{
          display: "flex",
          gap: "2px",
          padding: "4px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "6px",
          margin: "4px 12px 8px",
        }}>
          {["Work", "Personal", "Shared"].map(tab => (
            <button
              key={tab}
              onClick={() => setWorkerFilter(tab.toLowerCase())}
              style={{
                flex: 1,
                padding: "4px 6px",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.3px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                background: workerFilter === tab.toLowerCase()
                  ? "rgba(124, 58, 237, 0.3)"
                  : "transparent",
                color: workerFilter === tab.toLowerCase()
                  ? "#ffffff"
                  : "rgba(255,255,255,0.4)",
                transition: "all 0.15s ease",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <nav className="nav">
          {/* Chief of Staff — show on Work tab */}
          {workerFilter === "work" && chiefOfStaff?.enabled && (
            <button
              className={`navItem ${currentSection === "chief-of-staff" ? "navItemActive" : ""}`}
              onClick={() => handleNavClick("chief-of-staff")}
              style={{
                width: "100%", textAlign: "left", cursor: "pointer",
                background: currentSection === "chief-of-staff"
                  ? "rgba(124,58,237,0.16)"
                  : "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.08) 100%)",
                borderRadius: 10, padding: "8px 10px", marginBottom: 4,
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: "#c4b5fd" }}>{chiefOfStaff.name || "Alex"}</span>
              <span style={{ fontSize: 10, color: "#7c3aed", marginLeft: "auto" }}>CoS</span>
            </button>
          )}

          {/* Worker Groups */}
          {filteredGroups.map((group) => {
            const isCollapsed = collapsedGroups.has(group.id);
            return (
              <div key={group.id}>
                <div
                  onClick={() => toggleGroup(group.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", cursor: "pointer", borderRadius: 10,
                    fontSize: 13, fontWeight: 600,
                    color: "rgba(226,232,240,0.8)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    style={{ transform: isCollapsed ? "rotate(-90deg)" : "none", transition: "transform 150ms ease", flexShrink: 0 }}
                  >
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span style={{ color: group.color || "#94a3b8", fontSize: 10 }}>{"\u25CF"}</span>
                  <span>{group.name}</span>
                  <span style={{ fontSize: 11, color: "#475569", marginLeft: "auto" }}>{group.workerIds?.length || 0}</span>
                </div>
                {!isCollapsed && group.workerIds?.map(wId => (
                  <button
                    key={wId}
                    className={`navItem ${currentSection === `worker-${wId}` ? "navItemActive" : ""}`}
                    onClick={() => handleNavClick(`worker-${wId}`)}
                    style={{
                      width: "100%", textAlign: "left", cursor: "pointer",
                      paddingLeft: 28, fontSize: 13,
                    }}
                  >
                    {wId}
                  </button>
                ))}
              </div>
            );
          })}

          {/* Ungrouped Workers */}
          {filteredWorkers
            .filter(wId => !filteredGroups.some(g => g.workerIds?.includes(wId)))
            .map(wId => (
              <button
                key={wId}
                className={`navItem ${currentSection === `worker-${wId}` ? "navItemActive" : ""}`}
                onClick={() => handleNavClick(`worker-${wId}`)}
                style={{ width: "100%", textAlign: "left", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", border: "1.5px solid #64748b", flexShrink: 0 }} />
                {wId}
              </button>
            ))
          }

          {/* Empty state for Personal and Shared */}
          {workerFilter !== "work" && filteredWorkers.length === 0 && !filteredGroups.length && (
            <div style={{
              padding: "12px 16px",
              fontSize: "12px",
              color: "rgba(255,255,255,0.35)",
              fontStyle: "italic",
            }}>
              {workerFilter === "personal"
                ? "No personal workers yet"
                : "No shared workers yet"}
            </div>
          )}

          {/* Add Workers link */}
          <button
            className="navItem"
            onClick={() => handleNavClick("raas-store")}
            style={{ width: "100%", textAlign: "left", cursor: "pointer", fontSize: 13, color: "#7c3aed", opacity: 0.8 }}
          >
            + Add Workers
          </button>
        </nav>
      </div>

      {/* Divider */}
      <div style={{
        height: "1px",
        background: "rgba(255,255,255,0.08)",
        margin: "0 16px",
      }} />

      {/* Remaining Navigation */}
      <div className="sidebarSection">
        <nav className="nav">
          {sections.filter(s => s.id !== "dashboard").map((section) => (
            <button
              key={section.id}
              className={`navItem ${currentSection === section.id ? "navItemActive" : ""}`}
              onClick={() => handleNavClick(section.id)}
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
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
