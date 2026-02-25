import React, { useEffect, useState } from "react";
import useAdminAuth from "../hooks/useAdminAuth";
import { db } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

const VENDORS = [
  { id: "stripe", name: "Stripe", purpose: "Payments & billing", keyPrefix: "sk_" },
  { id: "dropbox_sign", name: "Dropbox Sign", purpose: "E-signatures (SAFEs, contracts)", keyPrefix: "" },
  { id: "twilio", name: "Twilio", purpose: "SMS communications", keyPrefix: "AC" },
  { id: "sendgrid", name: "SendGrid", purpose: "Email delivery", keyPrefix: "SG." },
  { id: "anthropic", name: "Anthropic", purpose: "AI engine (Claude)", keyPrefix: "sk-ant-" },
  { id: "openai", name: "OpenAI", purpose: "AI engine (GPT)", keyPrefix: "sk-" },
  { id: "venly", name: "Venly", purpose: "Blockchain / token minting", keyPrefix: "" },
];

function maskKey(key) {
  if (!key) return "";
  if (key.length <= 8) return key.slice(0, 2) + "..." + key.slice(-2);
  return key.slice(0, 6) + "..." + key.slice(-4);
}

export default function Settings() {
  const { user, role } = useAdminAuth();
  const [tab, setTab] = useState("company");

  // Company profile
  const [company, setCompany] = useState({
    name: "The Title App LLC",
    dba: "TitleApp",
    ein: "33-1330902",
    address: "1209 N Orange St, Wilmington, DE 19801",
    ceo: "Sean Lee Combs",
    cfo: "Kent Redwine",
  });
  const [companySaving, setCompanySaving] = useState(false);

  // Brand
  const [brand, setBrand] = useState({
    primaryColor: "#7c3aed",
    secondaryColor: "#1a1a2e",
    tagline: "Build it anywhere. Title it here.",
    voiceNotes: "Swiss tone — professional, calm. No emojis, no bullet points. Evidence-first.",
  });
  const [brandSaving, setBrandSaving] = useState(false);

  // Vendor status
  const [vendorStatus, setVendorStatus] = useState({});

  // Admin users
  const [admins, setAdmins] = useState([]);

  // Platform config
  const [platform, setPlatform] = useState({
    trialDays: 14,
    workspacePrice: 900,
    aiCreditPrice: 0,
    marketplaceSplit: 75,
  });
  const [platformSaving, setPlatformSaving] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState({
    dailyDigest: true,
    digestTime: "07:00",
    digestDelivery: "email",
    escalationAlerts: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    revenueMilestones: [100, 1000, 10000, 100000],
  });
  const [notifSaving, setNotifSaving] = useState(false);

  // Load company profile
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "company"), (snap) => {
      if (snap.exists()) setCompany((prev) => ({ ...prev, ...snap.data() }));
    });
    return () => unsub();
  }, []);

  // Load brand
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "brand"), (snap) => {
      if (snap.exists()) setBrand((prev) => ({ ...prev, ...snap.data() }));
    });
    return () => unsub();
  }, []);

  // Load vendor status
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "vendors"), (snap) => {
      if (snap.exists()) setVendorStatus(snap.data());
    });
    return () => unsub();
  }, []);

  // Load admins
  useEffect(() => {
    async function loadAdmins() {
      try {
        const snap = await getDocs(collection(db, "admins"));
        setAdmins(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn("[Settings] Admin list load failed:", err);
        // Hardcoded fallback
        setAdmins([
          { id: "1", email: "seanlcombs@gmail.com", role: "owner" },
          { id: "2", email: "sean@titleapp.ai", role: "owner" },
          { id: "3", email: "kent@titleapp.ai", role: "admin" },
        ]);
      }
    }
    loadAdmins();
  }, []);

  // Load platform config
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "platform"), (snap) => {
      if (snap.exists()) setPlatform((prev) => ({ ...prev, ...snap.data() }));
    });
    return () => unsub();
  }, []);

  // Load notification prefs
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "notifications"), (snap) => {
      if (snap.exists()) setNotifications((prev) => ({ ...prev, ...snap.data() }));
    });
    return () => unsub();
  }, []);

  async function saveCompany() {
    setCompanySaving(true);
    try {
      await setDoc(doc(db, "config", "company"), { ...company, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) { console.error("Save failed:", err); }
    setCompanySaving(false);
  }

  async function saveBrand() {
    setBrandSaving(true);
    try {
      await setDoc(doc(db, "config", "brand"), { ...brand, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) { console.error("Save failed:", err); }
    setBrandSaving(false);
  }

  async function savePlatform() {
    setPlatformSaving(true);
    try {
      await setDoc(doc(db, "config", "platform"), { ...platform, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) { console.error("Save failed:", err); }
    setPlatformSaving(false);
  }

  async function saveNotifications() {
    setNotifSaving(true);
    try {
      await setDoc(doc(db, "config", "notifications"), { ...notifications, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) { console.error("Save failed:", err); }
    setNotifSaving(false);
  }

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "13px",
    background: "#fff",
    color: "#1e293b",
  };

  const labelStyle = {
    fontSize: "12px",
    fontWeight: 600,
    color: "#64748b",
    marginBottom: "4px",
    display: "block",
  };

  const fieldStyle = { marginBottom: "14px" };

  const tabs = [
    { id: "company", label: "Company" },
    { id: "brand", label: "Brand" },
    { id: "vendors", label: "Vendors & API Keys" },
    { id: "admins", label: "Admin Users" },
    { id: "platform", label: "Platform Config" },
    { id: "notifications", label: "Notifications" },
    { id: "session", label: "Session" },
  ];

  return (
    <div>
      <div className="ac-page-header">
        <h1 className="ac-page-title">Settings</h1>
        <p className="ac-page-subtitle">Platform configuration and administration</p>
      </div>

      <div className="ac-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`ac-tab ${tab === t.id ? "ac-tab-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Company Profile */}
      {tab === "company" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Company Profile</span>
          </div>
          <div className="ac-card-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Company Name</label>
                <input style={inputStyle} value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>DBA</label>
                <input style={inputStyle} value={company.dba} onChange={(e) => setCompany({ ...company, dba: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>EIN</label>
                <input style={inputStyle} value={company.ein} onChange={(e) => setCompany({ ...company, ein: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Address</label>
                <input style={inputStyle} value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>CEO</label>
                <input style={inputStyle} value={company.ceo} onChange={(e) => setCompany({ ...company, ceo: e.target.value })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>CFO</label>
                <input style={inputStyle} value={company.cfo} onChange={(e) => setCompany({ ...company, cfo: e.target.value })} />
              </div>
            </div>
            <div style={{ marginTop: "8px" }}>
              <button className="ac-btn ac-btn-primary" onClick={saveCompany} disabled={companySaving}>
                {companySaving ? "Saving..." : "Save Company Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brand */}
      {tab === "brand" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Brand Guidelines</span>
          </div>
          <div className="ac-card-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Primary Color</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="color" value={brand.primaryColor} onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })} style={{ width: "40px", height: "36px", border: "none", cursor: "pointer" }} />
                  <input style={inputStyle} value={brand.primaryColor} onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })} />
                </div>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Secondary Color</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="color" value={brand.secondaryColor} onChange={(e) => setBrand({ ...brand, secondaryColor: e.target.value })} style={{ width: "40px", height: "36px", border: "none", cursor: "pointer" }} />
                  <input style={inputStyle} value={brand.secondaryColor} onChange={(e) => setBrand({ ...brand, secondaryColor: e.target.value })} />
                </div>
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Tagline</label>
              <input style={inputStyle} value={brand.tagline} onChange={(e) => setBrand({ ...brand, tagline: e.target.value })} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Brand Voice Notes (for Alex)</label>
              <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} value={brand.voiceNotes} onChange={(e) => setBrand({ ...brand, voiceNotes: e.target.value })} />
            </div>
            <div style={{ marginTop: "8px" }}>
              <button className="ac-btn ac-btn-primary" onClick={saveBrand} disabled={brandSaving}>
                {brandSaving ? "Saving..." : "Save Brand Guidelines"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendors */}
      {tab === "vendors" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Vendor & API Key Status</span>
          </div>
          <div className="ac-card-body" style={{ padding: 0 }}>
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Key Preview</th>
                </tr>
              </thead>
              <tbody>
                {VENDORS.map((v) => {
                  const status = vendorStatus[v.id];
                  const isConnected = status?.connected;
                  return (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 700 }}>{v.name}</td>
                      <td style={{ fontSize: "13px", color: "#64748b" }}>{v.purpose}</td>
                      <td>
                        <span className={`ac-badge ${isConnected ? "ac-badge-success" : "ac-badge-warning"}`}>
                          {isConnected ? "Connected" : "Not configured"}
                        </span>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "11px", color: "#94a3b8" }}>
                        {status?.keyPreview ? maskKey(status.keyPreview) : "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: "12px 16px", fontSize: "12px", color: "#94a3b8" }}>
              API keys are stored in Firebase Functions environment config, not in Firestore.
              To configure a vendor, use the CLI: <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "3px" }}>firebase functions:config:set vendor.key="value"</code>
            </div>
          </div>
        </div>
      )}

      {/* Admin Users */}
      {tab === "admins" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Admin Users</span>
          </div>
          <div className="ac-card-body" style={{ padding: 0 }}>
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td style={{ fontWeight: 600 }}>{admin.email}</td>
                    <td>
                      <span className={`ac-badge ${admin.role === "owner" ? "ac-badge-success" : ""}`} style={{ textTransform: "uppercase" }}>
                        {admin.role}
                      </span>
                    </td>
                    <td>
                      <span className="ac-badge ac-badge-success">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Platform Config */}
      {tab === "platform" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Platform Configuration</span>
          </div>
          <div className="ac-card-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Default Trial Length (days)</label>
                <input style={inputStyle} type="number" value={platform.trialDays} onChange={(e) => setPlatform({ ...platform, trialDays: parseInt(e.target.value) || 14 })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Workspace Price (cents/mo)</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input style={inputStyle} type="number" value={platform.workspacePrice} onChange={(e) => setPlatform({ ...platform, workspacePrice: parseInt(e.target.value) || 0 })} />
                  <span style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>${(platform.workspacePrice / 100).toFixed(2)}/mo</span>
                </div>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>AI Credit Price (cents)</label>
                <input style={inputStyle} type="number" value={platform.aiCreditPrice} onChange={(e) => setPlatform({ ...platform, aiCreditPrice: parseInt(e.target.value) || 0 })} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Marketplace Split (creator %)</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input style={inputStyle} type="number" value={platform.marketplaceSplit} onChange={(e) => setPlatform({ ...platform, marketplaceSplit: parseInt(e.target.value) || 75 })} />
                  <span style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>{platform.marketplaceSplit}/{100 - platform.marketplaceSplit}</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: "8px" }}>
              <button className="ac-btn ac-btn-primary" onClick={savePlatform} disabled={platformSaving}>
                {platformSaving ? "Saving..." : "Save Platform Config"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {tab === "notifications" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Notification Preferences</span>
          </div>
          <div className="ac-card-body">
            <div style={{ display: "grid", gap: "16px" }}>
              {/* Daily Digest */}
              <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>Daily Digest</div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input type="checkbox" checked={notifications.dailyDigest} onChange={(e) => setNotifications({ ...notifications, dailyDigest: e.target.checked })} />
                    <span style={{ fontSize: "12px" }}>{notifications.dailyDigest ? "On" : "Off"}</span>
                  </label>
                </div>
                {notifications.dailyDigest && (
                  <div style={{ display: "flex", gap: "16px" }}>
                    <div>
                      <label style={labelStyle}>Time</label>
                      <input type="time" style={{ ...inputStyle, width: "auto" }} value={notifications.digestTime} onChange={(e) => setNotifications({ ...notifications, digestTime: e.target.value })} />
                    </div>
                    <div>
                      <label style={labelStyle}>Delivery</label>
                      <select style={{ ...inputStyle, width: "auto" }} value={notifications.digestDelivery} onChange={(e) => setNotifications({ ...notifications, digestDelivery: e.target.value })}>
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="both">Email + SMS</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Escalation Alerts */}
              <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>Escalation Alerts</div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input type="checkbox" checked={notifications.escalationAlerts} onChange={(e) => setNotifications({ ...notifications, escalationAlerts: e.target.checked })} />
                    <span style={{ fontSize: "12px" }}>{notifications.escalationAlerts ? "On" : "Off"}</span>
                  </label>
                </div>
                {notifications.escalationAlerts && (
                  <div style={{ display: "flex", gap: "16px" }}>
                    <div>
                      <label style={labelStyle}>Quiet Hours Start</label>
                      <input type="time" style={{ ...inputStyle, width: "auto" }} value={notifications.quietHoursStart} onChange={(e) => setNotifications({ ...notifications, quietHoursStart: e.target.value })} />
                    </div>
                    <div>
                      <label style={labelStyle}>Quiet Hours End</label>
                      <input type="time" style={{ ...inputStyle, width: "auto" }} value={notifications.quietHoursEnd} onChange={(e) => setNotifications({ ...notifications, quietHoursEnd: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>

              {/* Revenue Milestones */}
              <div style={{ padding: "14px", background: "#f8fafc", borderRadius: "8px" }}>
                <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "10px" }}>Revenue Milestone Alerts</div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[100, 1000, 10000, 100000].map((m) => (
                    <label key={m} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#fff", borderRadius: "6px", border: "1px solid #e2e8f0", cursor: "pointer", fontSize: "13px" }}>
                      <input
                        type="checkbox"
                        checked={(notifications.revenueMilestones || []).includes(m)}
                        onChange={(e) => {
                          const current = notifications.revenueMilestones || [];
                          setNotifications({
                            ...notifications,
                            revenueMilestones: e.target.checked
                              ? [...current, m]
                              : current.filter((v) => v !== m),
                          });
                        }}
                      />
                      ${m.toLocaleString()}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: "16px" }}>
              <button className="ac-btn ac-btn-primary" onClick={saveNotifications} disabled={notifSaving}>
                {notifSaving ? "Saving..." : "Save Notification Preferences"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session */}
      {tab === "session" && (
        <div className="ac-card">
          <div className="ac-card-header">
            <span className="ac-card-title">Current Session</span>
          </div>
          <div className="ac-card-body">
            <div style={{ fontSize: "13px", lineHeight: "2" }}>
              <div><strong>Email:</strong> {user?.email}</div>
              <div><strong>UID:</strong> {user?.uid}</div>
              <div><strong>Role:</strong> {role}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
