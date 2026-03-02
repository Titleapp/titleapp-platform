import React, { useState, useMemo } from "react";
import { getAuth, signOut } from "firebase/auth";
import WorkerIcon from "../utils/workerIcons";

// Worker slug → additional "My Work" nav items
const WORKER_NAV_MAP = {
  "cre-analyst": [{ id: "portfolio", label: "Portfolio" }],
  "investor-relations": [{ id: "investor-data-room", label: "Investor Relations" }],
  "construction-manager": [
    { id: "projects", label: "Projects" },
    { id: "schedule", label: "Schedule" },
  ],
  "construction-draws": [{ id: "draws", label: "Draw Requests" }],
  "title-escrow": [{ id: "title-orders", label: "Title Orders" }],
  "mortgage-broker": [{ id: "loan-pipeline", label: "Loan Pipeline" }],
  "permit-tracker": [{ id: "permits", label: "Permits" }],
  "insurance-coi": [{ id: "insurance", label: "Insurance & COIs" }],
  "tax-assessment": [{ id: "tax-appeals", label: "Tax Appeals" }],
  "compliance-tracker": [{ id: "compliance", label: "Compliance Calendar" }],
  "property-management": [
    { id: "inventory", label: "Properties" },
    { id: "customers", label: "Tenants" },
    { id: "appointments", label: "Maintenance" },
  ],
  "bid-procurement": [{ id: "bids", label: "Bids & Procurement" }],
  "labor-staffing": [{ id: "workforce", label: "Workforce" }],
  // Legacy vertical mappings — map vertical names to nav items too
  "analyst": [
    { id: "portfolio", label: "Portfolio" },
    { id: "deal-pipeline", label: "Deal Pipeline" },
  ],
  "auto": [
    { id: "inventory", label: "Inventory" },
    { id: "customers", label: "Customers" },
    { id: "sales-pipeline", label: "Sales Pipeline" },
    { id: "fi-products", label: "F&I Products" },
    { id: "auto-service", label: "Service" },
  ],
  "real-estate": [
    { id: "re-listings", label: "Listings" },
    { id: "re-buyers", label: "Buyers" },
    { id: "re-transactions", label: "Transactions" },
    { id: "re-properties", label: "Properties" },
    { id: "re-tenants", label: "Tenants" },
    { id: "re-maintenance", label: "Maintenance" },
    { id: "re-marketing", label: "Marketing" },
  ],
  "investor": [
    { id: "investor-data-room", label: "Data Room" },
    { id: "investor-cap-table", label: "Cap Table" },
    { id: "investor-pipeline", label: "Investor Pipeline" },
  ],
};

// Worker slug → display name
const WORKER_DISPLAY_NAMES = {
  "cre-analyst": "CRE Analyst",
  "investor-relations": "IR Worker",
  "construction-manager": "Construction Manager",
  "construction-draws": "Draw Manager",
  "title-escrow": "Title & Escrow",
  "mortgage-broker": "Mortgage Broker",
  "permit-tracker": "Permit Tracker",
  "insurance-coi": "Insurance & COI",
  "tax-assessment": "Tax Assessment",
  "compliance-tracker": "Compliance Tracker",
  "property-management": "Property Manager",
  "bid-procurement": "Bid & Procurement",
  "labor-staffing": "Labor & Staffing",
  "auto-dealer": "Auto Dealer",
  "aviation-ops": "Aviation Ops",
  "pilot-logbook": "Pilot Logbook",
  "part-135": "Part 135 Compliance",
};

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
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workersExpanded, setWorkersExpanded] = useState(false);
  const vertical = localStorage.getItem("VERTICAL") || "auto";
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

  function handleWorkerClick(worker) {
    setSelectedWorker(worker.slug);
    window.dispatchEvent(new CustomEvent("ta:select-worker", { detail: { slug: worker.slug, name: worker.name } }));
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

  // Build worker list for display
  const workerList = useMemo(() => {
    const workers = [];
    // Chief of Staff first
    if (chiefOfStaff?.enabled) {
      workers.push({
        slug: "chief-of-staff",
        name: chiefOfStaff.name || "Alex",
        isChiefOfStaff: true,
        active: true,
      });
    }
    // Active workers from workspace
    for (const wId of activeWorkers) {
      if (typeof wId === "string") {
        workers.push({
          slug: wId,
          name: WORKER_DISPLAY_NAMES[wId] || wId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          isChiefOfStaff: false,
          active: true,
        });
      } else if (wId && typeof wId === "object") {
        workers.push({
          slug: wId.slug || wId.id || "unknown",
          name: wId.displayName || wId.name || WORKER_DISPLAY_NAMES[wId.slug] || "Worker",
          isChiefOfStaff: wId.isChiefOfStaff || false,
          active: true,
        });
      }
    }
    return workers;
  }, [activeWorkers, chiefOfStaff]);


  // Build "My Work" nav items — universal + vertical + worker-triggered
  const myWorkItems = useMemo(() => {
    const items = [
      { id: "dashboard", label: "Dashboard" },
      { id: "deal-pipeline", label: "Deal Pipeline" },
      { id: "vault-documents", label: "Documents" },
      { id: "reports", label: "Reports" },
      { id: "clients-lps", label: "Clients & Contacts" },
    ];

    // Add vertical-specific items
    const verticalItems = WORKER_NAV_MAP[vertical] || [];
    const existingIds = new Set(items.map(i => i.id));
    for (const vi of verticalItems) {
      if (!existingIds.has(vi.id)) {
        items.push(vi);
        existingIds.add(vi.id);
      }
    }

    // Add worker-triggered items
    const workerSlugs = activeWorkers.map(w => typeof w === "string" ? w : w?.slug || "");
    for (const slug of workerSlugs) {
      const workerItems = WORKER_NAV_MAP[slug] || [];
      for (const wi of workerItems) {
        if (!existingIds.has(wi.id)) {
          items.push(wi);
          existingIds.add(wi.id);
        }
      }
    }

    return items;
  }, [vertical, activeWorkers]);

  // Group workspaces for the switcher
  const ownWorkspaces = workspaces.filter(w => w.type !== "shared");
  const sharedWorkspaces = workspaces.filter(w => w.type === "shared");

  return (
    <div className="sidebar">
      {/* ═══ WORKSPACE IDENTITY ═══ */}
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

      {/* ═══ SECTION 1: DIGITAL WORKERS ═══ */}
      <div className="sidebarSection">
        <div className="sidebarLabel">Digital Workers</div>

        <nav className="nav">
          {/* Worker list — collapsible when >6 */}
          {(() => {
            const COLLAPSE_THRESHOLD = 6;
            const COLLAPSED_SHOW = 3;
            const shouldCollapse = workerList.length > COLLAPSE_THRESHOLD;
            const visibleWorkers = shouldCollapse && !workersExpanded
              ? workerList.slice(0, COLLAPSED_SHOW)
              : workerList;
            const hiddenCount = workerList.length - COLLAPSED_SHOW;

            return (
              <div style={shouldCollapse && workersExpanded ? {
                maxHeight: 240, overflowY: "auto", overflowX: "hidden",
              } : undefined}>
                {visibleWorkers.map(worker => {
                  const isSelected = selectedWorker === worker.slug;
                  return (
                    <button
                      key={worker.slug}
                      className={`navItem ${isSelected ? "navItemActive" : ""}`}
                      onClick={() => handleWorkerClick(worker)}
                      style={{
                        width: "100%", textAlign: "left", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 10px", fontSize: 13,
                        ...(worker.isChiefOfStaff ? {
                          background: isSelected
                            ? "rgba(124,58,237,0.16)"
                            : "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.08) 100%)",
                          borderRadius: 10,
                          marginBottom: 2,
                        } : {}),
                      }}
                    >
                      <span style={{ position: "relative", flexShrink: 0, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <WorkerIcon
                          slug={worker.slug}
                          size={16}
                          color={worker.isChiefOfStaff ? "#c4b5fd" : (isSelected ? "#ddd6fe" : "rgba(255,255,255,0.55)")}
                        />
                        {worker.active && (
                          <span style={{
                            position: "absolute", bottom: -1, right: -1,
                            width: 6, height: 6, borderRadius: "50%",
                            background: "#22c55e", border: "1.5px solid #0b1020",
                          }} />
                        )}
                      </span>
                      <span style={{
                        flex: 1,
                        color: worker.isChiefOfStaff ? "#c4b5fd" : "rgba(255,255,255,0.85)",
                        fontWeight: worker.isChiefOfStaff ? 600 : 400,
                      }}>
                        {worker.name}
                      </span>
                      {worker.isChiefOfStaff && (
                        <span style={{ fontSize: 10, color: "#7c3aed", fontWeight: 600 }}>CoS</span>
                      )}
                    </button>
                  );
                })}

                {/* Collapse/expand toggle */}
                {shouldCollapse && (
                  <button
                    onClick={() => setWorkersExpanded(!workersExpanded)}
                    style={{
                      width: "100%", textAlign: "left", cursor: "pointer",
                      background: "none", border: "none",
                      fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500,
                      padding: "5px 10px",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
                  >
                    {workersExpanded ? "Show less" : `+ ${hiddenCount} more workers`}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Empty state */}
          {workerList.length === 0 && (
            <div style={{
              padding: "8px 16px",
              fontSize: "12px",
              color: "rgba(255,255,255,0.3)",
              fontStyle: "italic",
            }}>
              No workers yet
            </div>
          )}

          {/* Browse Marketplace */}
          <button
            className="navItem"
            onClick={() => handleNavClick("raas-store")}
            style={{
              width: "100%", textAlign: "left", cursor: "pointer",
              fontSize: 12, color: "#22c55e", fontWeight: 500,
              padding: "7px 10px",
            }}
          >
            + Browse Marketplace
          </button>
        </nav>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "4px 16px" }} />

      {/* ═══ SECTION 2: MY WORK ═══ */}
      <div className="sidebarSection" style={{ flex: 1 }}>
        <div className="sidebarLabel">My Work</div>
        <nav className="nav">
          {myWorkItems.map(item => (
            <button
              key={item.id}
              className={`navItem ${currentSection === item.id ? "navItemActive" : ""}`}
              onClick={() => handleNavClick(item.id)}
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "4px 16px" }} />

      {/* ═══ SECTION 3: SETTINGS ═══ */}
      <div className="sidebarSection">
        <div className="sidebarLabel">Settings</div>
        <nav className="nav">
          <button
            className={`navItem ${currentSection === "settings" ? "navItemActive" : ""}`}
            onClick={() => handleNavClick("settings")}
            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            Workspace Settings
          </button>
          <button
            className={`navItem ${currentSection === "rules" ? "navItemActive" : ""}`}
            onClick={() => handleNavClick("rules")}
            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            Worker Rules
          </button>
        </nav>
      </div>

      {/* Footer: Switch Workspace + Sign Out */}
      <div className="sidebarFooter">
        {onBackToHub && (
          <button
            onClick={onBackToHub}
            className="iconBtn"
            style={{
              width: "100%", marginBottom: 4, fontSize: 12,
              color: "rgba(255,255,255,0.5)", background: "none", border: "none",
              cursor: "pointer", padding: "8px 0",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >
            Switch Workspace
          </button>
        )}
        <button
          onClick={handleSignOut}
          className="iconBtn"
          style={{
            width: "100%", fontSize: 12,
            color: "rgba(255,255,255,0.4)", background: "none", border: "none",
            cursor: "pointer", padding: "8px 0",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
