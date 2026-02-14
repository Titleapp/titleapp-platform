import React, { useState } from "react";
import FormModal from "../components/FormModal";

/**
 * Profile - User settings and account management
 */
export default function Profile() {
  const [user, setUser] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1-555-0123",
    timezone: "America/Chicago",
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [formData, setFormData] = useState({});

  function handleEditClick(section) {
    setEditSection(section);
    if (section === "personal") {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      });
    } else if (section === "notifications") {
      setFormData({ ...user.notifications });
    }
    setShowEditModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (editSection === "personal") {
      setUser({ ...user, ...formData });
    } else if (editSection === "notifications") {
      setUser({ ...user, notifications: formData });
    }
    setShowEditModal(false);
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Profile</h1>
          <p className="subtle">Account settings and preferences</p>
        </div>
      </div>

      {/* Personal Information */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Personal Information</div>
            <div className="cardSub">Your account details</div>
          </div>
          <button className="iconBtn" onClick={() => handleEditClick("personal")}>
            ✏️ Edit
          </button>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px" }}>
            <div style={{ fontWeight: 600, color: "var(--textMuted)" }}>Name</div>
            <div>{user.firstName} {user.lastName}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px" }}>
            <div style={{ fontWeight: 600, color: "var(--textMuted)" }}>Email</div>
            <div>{user.email}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px" }}>
            <div style={{ fontWeight: 600, color: "var(--textMuted)" }}>Phone</div>
            <div>{user.phone}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px" }}>
            <div style={{ fontWeight: 600, color: "var(--textMuted)" }}>Timezone</div>
            <div>{user.timezone}</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Notification Preferences</div>
            <div className="cardSub">How you receive updates</div>
          </div>
          <button className="iconBtn" onClick={() => handleEditClick("notifications")}>
            ✏️ Edit
          </button>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input type="checkbox" checked={user.notifications.email} readOnly />
            <div>
              <div style={{ fontWeight: 600 }}>Email Notifications</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                Receive updates via email
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input type="checkbox" checked={user.notifications.sms} readOnly />
            <div>
              <div style={{ fontWeight: 600 }}>SMS Notifications</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                Receive updates via text message
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input type="checkbox" checked={user.notifications.push} readOnly />
            <div>
              <div style={{ fontWeight: 600 }}>Push Notifications</div>
              <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                Receive browser notifications
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Security</div>
            <div className="cardSub">Password and authentication</div>
          </div>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <button className="iconBtn" style={{ width: "fit-content" }}>
            🔑 Change Password
          </button>
          <button className="iconBtn" style={{ width: "fit-content" }}>
            📱 Two-Factor Authentication
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      <FormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={editSection === "personal" ? "Edit Personal Information" : "Edit Notifications"}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      >
        {editSection === "personal" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName || ""}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName || ""}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
                checked={formData.push || false}
                onChange={(e) => setFormData({ ...formData, push: e.target.checked })}
              />
              <div>
                <div style={{ fontWeight: 600 }}>Push Notifications</div>
                <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                  Receive browser notifications
                </div>
              </div>
            </div>
          </div>
        )}
      </FormModal>
    </div>
  );
}
