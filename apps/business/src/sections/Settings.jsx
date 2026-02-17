import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import * as api from "../api/client";

/**
 * Settings - Business configuration and preferences
 */
export default function Settings() {
  const [myCompanies, setMyCompanies] = useState([]);
  const [currentTenantId, setCurrentTenantId] = useState(
    localStorage.getItem("CURRENT_TENANT_ID") || null
  );
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({
    name: "",
    type: "business",
    vertical: "auto",
    jurisdiction: "IL",
  });

  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";

  const VERTICAL_LABELS = {
    auto: "Auto Dealer",
    analyst: "Investment Analyst",
    "real-estate": "Real Estate Brokerage",
    "property-mgmt": "Property Management",
    aviation: "Aviation",
    marine: "Marine",
  };

  const [business, setBusiness] = useState({
    name: "",
    type: VERTICAL_LABELS[vertical] || vertical,
    vertical,
    jurisdiction,
    address: "",
    phone: "",
    email: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
    notifications: {
      email: true,
      sms: false,
      lowInventoryAlert: true,
      appointmentReminders: true,
    },
    blockchain: {
      enabled: false,
      provider: "venly",
      inventoryOnChain: 0,
      dealsOnChain: 0,
    },
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [formData, setFormData] = useState({});

  function handleEditClick(section) {
    setEditSection(section);
    if (section === "business") {
      setFormData({
        name: business.name,
        type: business.type,
        address: business.address,
        phone: business.phone,
        email: business.email,
      });
    } else if (section === "notifications") {
      setFormData({ ...business.notifications });
    }
    setShowEditModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (editSection === "business") {
      setBusiness({ ...business, ...formData });
    } else if (editSection === "notifications") {
      setBusiness({ ...business, notifications: formData });
    }
    setShowEditModal(false);
  }

  useEffect(() => {
    loadMyCompanies();
  }, []);

  async function loadMyCompanies() {
    try {
      const result = await api.getMemberships({ vertical, jurisdiction });
      if (result.ok && result.memberships?.length > 0) {
        const companies = result.memberships.map((m) => {
          const tenant = result.tenants?.[m.tenantId];
          return {
            id: m.tenantId,
            name: tenant?.name || m.tenantId,
            type: VERTICAL_LABELS[tenant?.vertical || vertical] || tenant?.vertical || vertical,
            role: m.role || "member",
          };
        });
        setMyCompanies(companies);

        // Also populate business info from the first tenant
        const firstTenant = result.tenants?.[result.memberships[0].tenantId];
        if (firstTenant) {
          setBusiness((prev) => ({
            ...prev,
            name: firstTenant.name || prev.name,
            type: VERTICAL_LABELS[firstTenant.vertical || vertical] || prev.type,
            vertical: firstTenant.vertical || vertical,
            jurisdiction: firstTenant.jurisdiction || jurisdiction,
            email: firstTenant.email || prev.email,
            phone: firstTenant.phone || prev.phone,
            address: firstTenant.address || prev.address,
          }));
        }

        // Set current tenant if not already set
        if (!currentTenantId && companies.length > 0) {
          setCurrentTenantId(companies[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load companies:", e);
    }
  }

  function switchTenant(tenantId) {
    localStorage.setItem("CURRENT_TENANT_ID", tenantId);
    setCurrentTenantId(tenantId);
    window.location.reload(); // Reload to apply new context
  }

  async function handleCreateCompany(e) {
    e.preventDefault();
    try {
      // Call onboarding endpoint to create new tenant
      console.log("Creating new company:", newCompanyData);
      // TODO: Wire to real API
      // await api.claimTenant({ ...newCompanyData });
      setShowNewCompanyModal(false);
      loadMyCompanies();
    } catch (e) {
      console.error("Failed to create company:", e);
    }
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Settings</h1>
          <p className="subtle">Business configuration and preferences</p>
        </div>
      </div>

      {/* My Companies - Multi-Tenant Switcher */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">My Companies</div>
            <div className="cardSub">
              Manage multiple businesses with one account (perfect for ICs & solo operators)
            </div>
          </div>
          <button
            className="iconBtn"
            onClick={() => setShowNewCompanyModal(true)}
            style={{ background: "var(--accent)", color: "white", borderColor: "var(--accent)" }}
          >
            + New Company
          </button>
        </div>
        <div style={{ padding: "16px" }}>
          {myCompanies.map((company) => (
            <div
              key={company.id}
              style={{
                padding: "12px",
                marginBottom: "8px",
                border: `2px solid ${currentTenantId === company.id ? "var(--accent)" : "var(--line)"}`,
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: currentTenantId === company.id ? "rgba(124,58,237,0.05)" : "transparent",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{company.name}</div>
                <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                  {company.type} • {company.role}
                  {currentTenantId === company.id && (
                    <span style={{ color: "var(--accent)", marginLeft: "8px" }}>● Active</span>
                  )}
                </div>
              </div>
              {currentTenantId !== company.id && (
                <button className="iconBtn" onClick={() => switchTenant(company.id)}>
                  Switch
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Business Information */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Business Information</div>
            <div className="cardSub">Your business details</div>
          </div>
          <button className="iconBtn" onClick={() => handleEditClick("business")}>
            Edit
          </button>
        </div>
        <div className="detail">
          <div className="kvRow">
            <div className="k">Business Name</div>
            <div className="v">{business.name}</div>
          </div>
          <div className="kvRow">
            <div className="k">Type</div>
            <div className="v">{business.type}</div>
          </div>
          <div className="kvRow">
            <div className="k">Vertical</div>
            <div className="v">
              {business.vertical.toUpperCase()} ({business.jurisdiction.toUpperCase()})
            </div>
          </div>
          <div className="kvRow">
            <div className="k">Address</div>
            <div className="v">{business.address}</div>
          </div>
          <div className="kvRow">
            <div className="k">Phone</div>
            <div className="v">{business.phone}</div>
          </div>
          <div className="kvRow">
            <div className="k">Email</div>
            <div className="v">{business.email}</div>
          </div>
          <div className="kvRow">
            <div className="k">Timezone</div>
            <div className="v">{business.timezone}</div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Notification Preferences</div>
            <div className="cardSub">How your business receives alerts</div>
          </div>
          <button className="iconBtn" onClick={() => handleEditClick("notifications")}>
            Edit
          </button>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input type="checkbox" checked={business.notifications.email} readOnly />
            <div>
              <div style={{ fontWeight: 600 }}>Email Notifications</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                Receive updates via email
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input type="checkbox" checked={business.notifications.sms} readOnly />
            <div>
              <div style={{ fontWeight: 600 }}>SMS Notifications</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                Receive updates via text message
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input type="checkbox" checked={business.notifications.lowInventoryAlert} readOnly />
            <div>
              <div style={{ fontWeight: 600 }}>Low Inventory Alerts</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                Get notified when inventory is running low
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input type="checkbox" checked={business.notifications.appointmentReminders} readOnly />
            <div>
              <div style={{ fontWeight: 600 }}>Appointment Reminders</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                Remind staff about upcoming appointments
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Integrations</div>
            <div className="cardSub">Connected third-party services</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Salesforce CRM</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                Sync customer data with Salesforce
              </div>
            </div>
            <button className="iconBtn">Connect</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>QuickBooks</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                Sync financial data and invoices
              </div>
            </div>
            <button className="iconBtn">Connect</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Stripe Payments</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                Accept online payments
              </div>
            </div>
            <span className="badge badge-completed">Connected</span>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">API Access</div>
            <div className="cardSub">API keys for programmatic access</div>
          </div>
          <button className="iconBtn">Generate New Key</button>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ fontSize: "13px", color: "var(--textMuted)", marginBottom: "8px" }}>
            Production API Key
          </div>
          <div
            style={{
              fontFamily: "monospace",
              padding: "12px",
              background: "#f8fafc",
              borderRadius: "8px",
              fontSize: "13px",
            }}
          >
            ta_prod_••••••••••••••••••••••••
          </div>
        </div>
      </div>

      {/* Blockchain Verification */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Blockchain Verification</div>
            <div className="cardSub">NFT records for inventory and deals via VENLY</div>
          </div>
          <span
            className={`badge ${business.blockchain.enabled ? "badge-completed" : ""}`}
            style={{ fontSize: "11px" }}
          >
            {business.blockchain.enabled ? "Active" : "Inactive"}
          </span>
        </div>
        <div style={{ padding: "16px" }}>
          <div
            style={{
              padding: "16px",
              background: business.blockchain.enabled ? "#f0fdf4" : "#f8fafc",
              border: business.blockchain.enabled
                ? "1px solid #86efac"
                : "1px solid #e5e7eb",
              borderRadius: "12px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <input
                type="checkbox"
                checked={business.blockchain.enabled}
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    blockchain: { ...business.blockchain, enabled: e.target.checked },
                  })
                }
                style={{ width: "20px", height: "20px" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                  Enable Blockchain Records
                </div>
                <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                  Create immutable NFT records of inventory and customer deals on Polygon
                </div>
              </div>
            </div>

            {business.blockchain.enabled && (
              <div
                style={{
                  paddingTop: "12px",
                  borderTop: "1px solid #e5e7eb",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  fontSize: "13px",
                }}
              >
                <div>
                  <div style={{ color: "var(--textMuted)", marginBottom: "4px" }}>
                    Inventory on Chain
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "18px" }}>
                    {business.blockchain.inventoryOnChain}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--textMuted)", marginBottom: "4px" }}>
                    Deals on Chain
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "18px" }}>
                    {business.blockchain.dealsOnChain}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              padding: "12px",
              background: "#fff5f5",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "12px",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>Cost Notice</div>
            <div style={{ color: "#dc2626" }}>
              VENLY blockchain integration costs $700/month when active. Requires 30+ active
              clients to justify the expense. Only enable when you have scale.
            </div>
          </div>

          <div style={{ fontSize: "13px", color: "var(--textMuted)", lineHeight: "1.6" }}>
            <strong>How it works:</strong> When enabled, all new inventory items and customer
            deals are minted as NFTs on Polygon blockchain via VENLY. This provides immutable
            proof of transactions and builds trust with customers through verifiable records.
          </div>
        </div>
      </div>

      {/* AI Assistant Rules */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">AI Assistant Rules (RAAS)</div>
            <div className="cardSub">Custom rules and compliance settings for your AI assistant</div>
          </div>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ fontSize: "14px", color: "var(--textMuted)", marginBottom: "8px" }}>
            These rules were set during onboarding. You can update them anytime.
          </div>
          <div style={{
            padding: "12px",
            background: "#f8fafc",
            borderRadius: "8px",
            fontSize: "14px",
            lineHeight: 1.6,
            minHeight: "60px",
            color: "#374151",
          }}>
            {localStorage.getItem("RAAS_RULES") || "Standard rules (no custom rules set)"}
          </div>
        </div>
      </div>

      {/* Developer Tools */}
      <div className="card" style={{ marginBottom: "16px", borderColor: "#e9d5ff" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Developer Tools</div>
            <div className="cardSub">Testing and debugging utilities</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Reset Onboarding</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                Clear onboarding state and restart the setup flow. Your data is preserved.
              </div>
            </div>
            <button
              className="iconBtn"
              style={{ color: "#f59e0b", borderColor: "#fcd34d" }}
              onClick={() => {
                if (window.confirm("This will reset your onboarding flow. Your existing data will be preserved. Continue?")) {
                  localStorage.removeItem("TENANT_ID");
                  localStorage.removeItem("VERTICAL");
                  localStorage.removeItem("JURISDICTION");
                  window.location.reload();
                }
              }}
            >
              Reset
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Current Config</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                Vertical: {localStorage.getItem("VERTICAL") || "auto"} | Jurisdiction: {localStorage.getItem("JURISDICTION") || "IL"} | Tenant: {localStorage.getItem("TENANT_ID") || "none"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ borderColor: "var(--danger)" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle" style={{ color: "var(--danger)" }}>
              Danger Zone
            </div>
            <div className="cardSub">Irreversible actions</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <button className="iconBtn" style={{ width: "fit-content", color: "var(--danger)" }}>
            Export All Data
          </button>
          <button className="iconBtn" style={{ width: "fit-content", color: "var(--danger)" }}>
            Delete Business Account
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      <FormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={editSection === "business" ? "Edit Business Information" : "Edit Notifications"}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      >
        {editSection === "business" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                Business Name
              </label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Type</label>
              <input
                type="text"
                value={formData.type || ""}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                Address
              </label>
              <input
                type="text"
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                }}
              />
            </div>
          </div>
        )}

        {editSection === "notifications" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="checkbox"
                checked={formData.email || false}
                onChange={(e) => setFormData({ ...formData, email: e.target.checked })}
              />
              <div>
                <div style={{ fontWeight: 600 }}>Email Notifications</div>
                <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                  Receive updates via email
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="checkbox"
                checked={formData.sms || false}
                onChange={(e) => setFormData({ ...formData, sms: e.target.checked })}
              />
              <div>
                <div style={{ fontWeight: 600 }}>SMS Notifications</div>
                <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                  Receive updates via text message
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="checkbox"
                checked={formData.lowInventoryAlert || false}
                onChange={(e) => setFormData({ ...formData, lowInventoryAlert: e.target.checked })}
              />
              <div>
                <div style={{ fontWeight: 600 }}>Low Inventory Alerts</div>
                <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                  Get notified when inventory is running low
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="checkbox"
                checked={formData.appointmentReminders || false}
                onChange={(e) =>
                  setFormData({ ...formData, appointmentReminders: e.target.checked })
                }
              />
              <div>
                <div style={{ fontWeight: 600 }}>Appointment Reminders</div>
                <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                  Remind staff about upcoming appointments
                </div>
              </div>
            </div>
          </div>
        )}
      </FormModal>
    </div>
  );
}
