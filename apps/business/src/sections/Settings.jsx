import React, { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import FormModal from "../components/FormModal";
import * as api from "../api/client";

// ── Personal Vault Settings ──────────────────────────────────────
function PersonalSettings() {
  const auth = getAuth();
  const user = auth.currentUser;
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    name: user?.displayName || localStorage.getItem("COMPANY_NAME") || "",
    email: user?.email || "",
    phone: "",
  });

  const [avatarPreview, setAvatarPreview] = useState(() => localStorage.getItem("VAULT_AVATAR") || null);

  const [chiefOfStaff, setChiefOfStaff] = useState(() => {
    const saved = localStorage.getItem("COS_CONFIG");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      name: "Alex",
      channel: "email",
      autonomy: "remind",
    };
  });

  const [toast, setToast] = useState(null);
  const [blockchainEnabled, setBlockchainEnabled] = useState(() => localStorage.getItem("VAULT_BLOCKCHAIN_ENABLED") === "true");

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    renewalReminders: true,
    expirationAlerts: true,
  });

  function saveCOS(updated) {
    setChiefOfStaff(updated);
    localStorage.setItem("COS_CONFIG", JSON.stringify(updated));
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setAvatarPreview(dataUrl);
      localStorage.setItem("VAULT_AVATAR", dataUrl);
      setToast("Photo updated");
      setTimeout(() => setToast(null), 3000);
    };
    reader.readAsDataURL(file);
    // Reset file input so re-selecting the same file triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleBlockchainToggle(checked) {
    setBlockchainEnabled(checked);
    localStorage.setItem("VAULT_BLOCKCHAIN_ENABLED", String(checked));
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Settings</h1>
          <p className="subtle">Your personal Vault preferences</p>
        </div>
      </div>

      {toast && (
        <div style={{ padding: "10px 16px", marginBottom: "12px", borderRadius: "10px", background: "#f0fdf4", color: "#16a34a", fontSize: "14px", fontWeight: 500 }}>
          {toast}
        </div>
      )}

      {/* Profile */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Profile</div>
            <div className="cardSub">Your personal information</div>
          </div>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: "24px",
                flexShrink: 0,
              }}>
                {profile.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "16px", color: "#1e293b" }}>{profile.name || "Your Name"}</div>
              <div style={{ fontSize: "13px", color: "#64748b" }}>{profile.email}</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: "none" }}
              />
              <button
                className="iconBtn"
                style={{ marginTop: "8px", fontSize: "12px" }}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Photo
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)", background: "#f8fafc", color: "#94a3b8" }}
              />
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Email is managed through your login credentials</div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="Optional -- used for text notifications"
                style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chief of Staff */}
      <div className="card" style={{ marginBottom: "16px", border: "1px solid #e9d5ff" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Chief of Staff</div>
            <div className="cardSub">Your personal AI assistant configuration</div>
          </div>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{
            padding: "14px 16px",
            background: "#faf5ff",
            borderRadius: "10px",
            fontSize: "14px",
            color: "#64748b",
            lineHeight: "1.6",
            marginBottom: "20px",
          }}>
            Your Chief of Staff manages follow-ups, tracks deadlines, and communicates on your behalf within the boundaries you set. Name them, choose how they reach you, and decide how much autonomy they get.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* AI Name */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>AI Name</label>
              <input
                type="text"
                value={chiefOfStaff.name}
                onChange={(e) => saveCOS({ ...chiefOfStaff, name: e.target.value })}
                placeholder="Give your AI a name"
                style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
              />
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>This is how your AI will introduce itself</div>
            </div>

            {/* AI Title */}
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Title</label>
              <input
                type="text"
                value="Chief of Staff"
                disabled
                style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)", background: "#f8fafc", color: "#94a3b8" }}
              />
            </div>

            {/* Communication Channel */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "13px" }}>Communication Channel</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { value: "email", label: "Email" },
                  { value: "text", label: "Text" },
                  { value: "both", label: "Both" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => saveCOS({ ...chiefOfStaff, channel: opt.value })}
                    style={{
                      padding: "8px 18px",
                      borderRadius: "10px",
                      border: chiefOfStaff.channel === opt.value ? "2px solid #7c3aed" : "1px solid var(--line)",
                      background: chiefOfStaff.channel === opt.value ? "rgba(124,58,237,0.08)" : "white",
                      color: chiefOfStaff.channel === opt.value ? "#7c3aed" : "#64748b",
                      fontWeight: chiefOfStaff.channel === opt.value ? 600 : 400,
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Autonomy Level */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "13px" }}>Autonomy Level</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { value: "remind", label: "Just remind me", desc: "Send me reminders about deadlines and tasks. I'll handle everything myself." },
                  { value: "schedule", label: "Schedule and remind me", desc: "Book appointments, set reminders, and organize my calendar. I approve before anything goes out." },
                  { value: "handle", label: "Handle it for me", desc: "Take action on routine items automatically. I'll review a summary after the fact." },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => saveCOS({ ...chiefOfStaff, autonomy: opt.value })}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "10px",
                      border: chiefOfStaff.autonomy === opt.value ? "2px solid #7c3aed" : "1px solid var(--line)",
                      background: chiefOfStaff.autonomy === opt.value ? "rgba(124,58,237,0.08)" : "white",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{
                      fontWeight: 600,
                      fontSize: "14px",
                      color: chiefOfStaff.autonomy === opt.value ? "#7c3aed" : "#1e293b",
                      marginBottom: "2px",
                    }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blockchain Verification */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Blockchain Verification</div>
            <div className="cardSub">Permanent, tamper-proof records</div>
          </div>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.7", marginBottom: "20px" }}>
            Save your most important records on the blockchain so they can never be lost, altered, or forged. Each verified item gets a permanent digital certificate that exists independently of any company or service.
          </div>
          <div style={{
            padding: "14px 16px",
            background: blockchainEnabled ? "#f0fdf4" : "#f8fafc",
            border: blockchainEnabled ? "1px solid #86efac" : "1px solid #e5e7eb",
            borderRadius: "10px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="checkbox"
                checked={blockchainEnabled}
                onChange={(e) => handleBlockchainToggle(e.target.checked)}
                style={{ width: "20px", height: "20px" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: "2px" }}>Enable Blockchain Record Keeping</div>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>Additional fee applies. Records are stored on Polygon blockchain via VENLY.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Notifications</div>
            <div className="cardSub">How you receive alerts and reminders</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { key: "email", label: "Email Notifications", desc: "Receive updates and reminders via email" },
            { key: "sms", label: "Text Notifications", desc: "Receive updates via text message" },
            { key: "renewalReminders", label: "Renewal Reminders", desc: "Get reminded when certifications or licenses are due for renewal" },
            { key: "expirationAlerts", label: "Expiration Alerts", desc: "Get alerted when documents or IDs are about to expire" },
          ].map((item) => (
            <div key={item.key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="checkbox"
                checked={notifications[item.key]}
                onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                style={{ width: "18px", height: "18px" }}
              />
              <div>
                <div style={{ fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Connected Accounts</div>
            <div className="cardSub">Link external accounts for faster verification</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Google</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Sign in and import contacts</div>
            </div>
            <button className="iconBtn">Connect</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Apple</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Sign in with Apple ID</div>
            </div>
            <button className="iconBtn">Connect</button>
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
            <div className="cardTitle" style={{ color: "var(--danger)" }}>Danger Zone</div>
            <div className="cardSub">Irreversible actions</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <button className="iconBtn" style={{ width: "fit-content", color: "var(--danger)" }}>
            Export All Data
          </button>
          <button className="iconBtn" style={{ width: "fit-content", color: "var(--danger)" }}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Business Settings ────────────────────────────────────────────
function BusinessSettings() {
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
    window.location.reload();
  }

  async function handleCreateCompany(e) {
    e.preventDefault();
    try {
      console.log("Creating new company:", newCompanyData);
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

      {/* My Companies */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">My Companies</div>
            <div className="cardSub">Manage multiple businesses with one account</div>
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
                  {company.type} {company.role ? `\u00B7 ${company.role}` : ""}
                  {currentTenantId === company.id && (
                    <span style={{ color: "var(--accent)", marginLeft: "8px" }}>Active</span>
                  )}
                </div>
              </div>
              {currentTenantId !== company.id && (
                <button className="iconBtn" onClick={() => switchTenant(company.id)}>Switch</button>
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
          <button className="iconBtn" onClick={() => handleEditClick("business")}>Edit</button>
        </div>
        <div className="detail">
          <div className="kvRow"><div className="k">Business Name</div><div className="v">{business.name}</div></div>
          <div className="kvRow"><div className="k">Type</div><div className="v">{business.type}</div></div>
          <div className="kvRow"><div className="k">Vertical</div><div className="v">{business.vertical.toUpperCase()} ({business.jurisdiction.toUpperCase()})</div></div>
          <div className="kvRow"><div className="k">Address</div><div className="v">{business.address}</div></div>
          <div className="kvRow"><div className="k">Phone</div><div className="v">{business.phone}</div></div>
          <div className="kvRow"><div className="k">Email</div><div className="v">{business.email}</div></div>
          <div className="kvRow"><div className="k">Timezone</div><div className="v">{business.timezone}</div></div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Notification Preferences</div>
            <div className="cardSub">How your business receives alerts</div>
          </div>
          <button className="iconBtn" onClick={() => handleEditClick("notifications")}>Edit</button>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input type="checkbox" checked={business.notifications.email} readOnly />
            <div><div style={{ fontWeight: 600 }}>Email Notifications</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Receive updates via email</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input type="checkbox" checked={business.notifications.sms} readOnly />
            <div><div style={{ fontWeight: 600 }}>SMS Notifications</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Receive updates via text message</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input type="checkbox" checked={business.notifications.lowInventoryAlert} readOnly />
            <div><div style={{ fontWeight: 600 }}>Low Inventory Alerts</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Get notified when inventory is running low</div></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input type="checkbox" checked={business.notifications.appointmentReminders} readOnly />
            <div><div style={{ fontWeight: 600 }}>Appointment Reminders</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Remind staff about upcoming appointments</div></div>
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
            <div><div style={{ fontWeight: 600 }}>Salesforce CRM</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Sync customer data with Salesforce</div></div>
            <button className="iconBtn">Connect</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontWeight: 600 }}>QuickBooks</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Sync financial data and invoices</div></div>
            <button className="iconBtn">Connect</button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontWeight: 600 }}>Stripe Payments</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Accept online payments</div></div>
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
          <div style={{ fontSize: "13px", color: "var(--textMuted)", marginBottom: "8px" }}>Production API Key</div>
          <div style={{ fontFamily: "monospace", padding: "12px", background: "#f8fafc", borderRadius: "8px", fontSize: "13px" }}>
            ta_prod_••••••••••••••••••••••••
          </div>
        </div>
      </div>

      {/* Blockchain */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Blockchain Verification</div>
            <div className="cardSub">NFT records for inventory and deals via VENLY</div>
          </div>
          <span className={`badge ${business.blockchain.enabled ? "badge-completed" : ""}`} style={{ fontSize: "11px" }}>
            {business.blockchain.enabled ? "Active" : "Inactive"}
          </span>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{
            padding: "16px",
            background: business.blockchain.enabled ? "#f0fdf4" : "#f8fafc",
            border: business.blockchain.enabled ? "1px solid #86efac" : "1px solid #e5e7eb",
            borderRadius: "12px",
            marginBottom: "16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <input
                type="checkbox"
                checked={business.blockchain.enabled}
                onChange={(e) => setBusiness({ ...business, blockchain: { ...business.blockchain, enabled: e.target.checked } })}
                style={{ width: "20px", height: "20px" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>Enable Blockchain Records</div>
                <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Create immutable NFT records of inventory and customer deals on Polygon</div>
              </div>
            </div>
            {business.blockchain.enabled && (
              <div style={{ paddingTop: "12px", borderTop: "1px solid #e5e7eb", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div><div style={{ color: "var(--textMuted)", marginBottom: "4px" }}>Inventory on Chain</div><div style={{ fontWeight: 600, fontSize: "18px" }}>{business.blockchain.inventoryOnChain}</div></div>
                <div><div style={{ color: "var(--textMuted)", marginBottom: "4px" }}>Deals on Chain</div><div style={{ fontWeight: 600, fontSize: "18px" }}>{business.blockchain.dealsOnChain}</div></div>
              </div>
            )}
          </div>
          <div style={{ padding: "12px", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", marginBottom: "12px" }}>
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>Cost Notice</div>
            <div style={{ color: "#dc2626" }}>VENLY blockchain integration costs $700/month when active. Requires 30+ active clients to justify the expense. Only enable when you have scale.</div>
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
          <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", fontSize: "14px", lineHeight: 1.6, minHeight: "60px", color: "#374151" }}>
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
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>Clear onboarding state and restart the setup flow.</div>
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
            <div className="cardTitle" style={{ color: "var(--danger)" }}>Danger Zone</div>
            <div className="cardSub">Irreversible actions</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <button className="iconBtn" style={{ width: "fit-content", color: "var(--danger)" }}>Export All Data</button>
          <button className="iconBtn" style={{ width: "fit-content", color: "var(--danger)" }}>Delete Business Account</button>
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
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Business Name</label>
              <input type="text" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Type</label>
              <input type="text" value={formData.type || ""} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Address</label>
              <input type="text" value={formData.address || ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Phone</label>
              <input type="tel" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Email</label>
              <input type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }} />
            </div>
          </div>
        )}
        {editSection === "notifications" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { key: "email", label: "Email Notifications", desc: "Receive updates via email" },
              { key: "sms", label: "SMS Notifications", desc: "Receive updates via text message" },
              { key: "lowInventoryAlert", label: "Low Inventory Alerts", desc: "Get notified when inventory is running low" },
              { key: "appointmentReminders", label: "Appointment Reminders", desc: "Remind staff about upcoming appointments" },
            ].map((item) => (
              <div key={item.key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input type="checkbox" checked={formData[item.key] || false} onChange={(e) => setFormData({ ...formData, [item.key]: e.target.checked })} />
                <div><div style={{ fontWeight: 600 }}>{item.label}</div><div style={{ fontSize: "13px", color: "var(--textMuted)" }}>{item.desc}</div></div>
              </div>
            ))}
          </div>
        )}
      </FormModal>
    </div>
  );
}

// ── Settings Router ──────────────────────────────────────────────
export default function Settings() {
  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const isPersonal = vertical === "consumer";

  return isPersonal ? <PersonalSettings /> : <BusinessSettings />;
}
