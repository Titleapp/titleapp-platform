import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";

/**
 * Staff - Team member management and permissions
 */
export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "sales",
    permissions: [],
  });

  // Mock staff data
  const mockStaff = [
    {
      id: "staff-001",
      name: "Jane Smith",
      email: "jane.smith@dealer.com",
      role: "manager",
      permissions: ["all"],
      status: "active",
      createdAt: "2026-01-15T09:00:00Z",
      lastLogin: "2026-02-14T08:30:00Z",
    },
    {
      id: "staff-002",
      name: "Bob Johnson",
      email: "bob.j@dealer.com",
      role: "sales",
      permissions: ["customers.write", "inventory.read", "appointments.write"],
      status: "active",
      createdAt: "2026-02-01T10:00:00Z",
      lastLogin: "2026-02-13T16:45:00Z",
    },
    {
      id: "staff-003",
      name: "Sarah Williams",
      email: "sarah.w@dealer.com",
      role: "service",
      permissions: ["appointments.write", "customers.read"],
      status: "active",
      createdAt: "2026-02-05T11:00:00Z",
      lastLogin: "2026-02-14T07:15:00Z",
    },
  ];

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setLoading(true);
    setTimeout(() => {
      setStaff(mockStaff);
      setLoading(false);
    }, 500);
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (editingStaff) {
      setStaff(
        staff.map((s) =>
          s.id === editingStaff.id
            ? {
                ...s,
                ...formData,
              }
            : s
        )
      );
    } else {
      const newStaff = {
        id: `staff-${Date.now()}`,
        ...formData,
        status: "active",
        createdAt: new Date().toISOString(),
        lastLogin: null,
      };
      setStaff([newStaff, ...staff]);
    }

    setShowCreateModal(false);
    setEditingStaff(null);
    setFormData({ name: "", email: "", role: "sales", permissions: [] });
  }

  function handleEdit(staffMember) {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      role: staffMember.role,
      permissions: staffMember.permissions,
    });
    setShowCreateModal(true);
  }

  function handleDelete(staffId) {
    if (confirm("Are you sure you want to remove this staff member?")) {
      setStaff(staff.filter((s) => s.id !== staffId));
      if (selectedStaff?.id === staffId) {
        setSelectedStaff(null);
      }
    }
  }

  function handleDeactivate(staffId) {
    setStaff(
      staff.map((s) =>
        s.id === staffId ? { ...s, status: s.status === "active" ? "inactive" : "active" } : s
      )
    );
  }

  const filteredStaff = staff.filter((member) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query)
    );
  });

  const roleOptions = [
    { value: "manager", label: "Manager" },
    { value: "sales", label: "Sales Representative" },
    { value: "service", label: "Service Technician" },
    { value: "admin", label: "Administrator" },
  ];

  const permissionOptions = [
    { value: "customers.read", label: "View Customers" },
    { value: "customers.write", label: "Edit Customers" },
    { value: "inventory.read", label: "View Inventory" },
    { value: "inventory.write", label: "Edit Inventory" },
    { value: "appointments.read", label: "View Appointments" },
    { value: "appointments.write", label: "Edit Appointments" },
    { value: "reports.read", label: "View Reports" },
    { value: "settings.write", label: "Edit Settings" },
  ];

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Staff</h1>
          <p className="subtle">Team member management and permissions</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => {
            setEditingStaff(null);
            setFormData({ name: "", email: "", role: "sales", permissions: [] });
            setShowCreateModal(true);
          }}
          style={{
            background: "var(--accent)",
            color: "white",
            borderColor: "var(--accent)",
          }}
        >
          + Add Staff
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Search staff by name, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "500px",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid var(--line)",
            fontSize: "14px",
          }}
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <div className="empty" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card">
          <div className="empty">Loading staff members...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredStaff.length === 0 && (
        <div className="card">
          <div className="empty">
            <p>No staff members found.</p>
          </div>
        </div>
      )}

      {/* Staff grid */}
      {!loading && filteredStaff.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
          {/* Staff list */}
          <div className="card">
            <div className="cardHeader">
              <div className="cardTitle">Team Members ({filteredStaff.length})</div>
            </div>
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((member) => (
                    <tr
                      key={member.id}
                      style={{
                        cursor: "pointer",
                        backgroundColor:
                          selectedStaff?.id === member.id ? "#f8fafc" : "transparent",
                      }}
                      onClick={() => setSelectedStaff(member)}
                    >
                      <td>
                        <div className="tdStrong">{member.name}</div>
                        <div className="tdMuted">{member.email}</div>
                      </td>
                      <td>{roleOptions.find((r) => r.value === member.role)?.label}</td>
                      <td>
                        {member.status === "active" ? (
                          <span className="badge badge-completed">Active</span>
                        ) : (
                          <span className="badge">Inactive</span>
                        )}
                      </td>
                      <td className="tdMuted">
                        {member.lastLogin
                          ? new Date(member.lastLogin).toLocaleString()
                          : "Never"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="iconBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(member);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="iconBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeactivate(member.id);
                            }}
                          >
                            {member.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Staff details panel */}
          {selectedStaff && (
            <div className="card">
              <div className="cardHeader">
                <div>
                  <div className="cardTitle">{selectedStaff.name}</div>
                  <div className="cardSub">{selectedStaff.email}</div>
                </div>
              </div>
              <div className="detail">
                <div className="kvRow">
                  <div className="k">Role</div>
                  <div className="v">
                    {roleOptions.find((r) => r.value === selectedStaff.role)?.label}
                  </div>
                </div>
                <div className="kvRow">
                  <div className="k">Status</div>
                  <div className="v">
                    {selectedStaff.status === "active" ? (
                      <span className="badge badge-completed">Active</span>
                    ) : (
                      <span className="badge">Inactive</span>
                    )}
                  </div>
                </div>
                <div className="kvRow">
                  <div className="k">Member Since</div>
                  <div className="v">{new Date(selectedStaff.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="kvRow">
                  <div className="k">Last Login</div>
                  <div className="v">
                    {selectedStaff.lastLogin
                      ? new Date(selectedStaff.lastLogin).toLocaleString()
                      : "Never"}
                  </div>
                </div>
              </div>

              <div style={{ padding: "16px", borderTop: "1px solid var(--line)" }}>
                <div style={{ fontWeight: 600, marginBottom: "12px" }}>Permissions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {selectedStaff.permissions.includes("all") ? (
                    <span className="badge badge-completed">Full Access</span>
                  ) : selectedStaff.permissions.length > 0 ? (
                    selectedStaff.permissions.map((perm) => (
                      <span key={perm} className="badge">
                        {permissionOptions.find((p) => p.value === perm)?.label || perm}
                      </span>
                    ))
                  ) : (
                    <span className="tdMuted">No permissions assigned</span>
                  )}
                </div>
              </div>

              <div style={{ padding: "16px", borderTop: "1px solid var(--line)" }}>
                <button
                  className="iconBtn"
                  onClick={() => handleDelete(selectedStaff.id)}
                  style={{ width: "100%", color: "var(--danger)" }}
                >
                  Remove Staff Member
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingStaff(null);
        }}
        title={editingStaff ? "Edit Staff Member" : "Add Staff Member"}
        onSubmit={handleSubmit}
        submitLabel={editingStaff ? "Save Changes" : "Add Staff Member"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
              required
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Permissions
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {permissionOptions.map((perm) => (
                <label
                  key={perm.value}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(perm.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          permissions: [...formData.permissions, perm.value],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          permissions: formData.permissions.filter((p) => p !== perm.value),
                        });
                      }
                    }}
                  />
                  <span>{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
