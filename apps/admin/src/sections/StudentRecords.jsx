import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import AddRecordForm from "../components/AddRecordForm";
import * as api from "../api/client";

/**
 * StudentRecords - Education credentials and professional certifications
 */
export default function StudentRecords() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "education",
    title: "",
    institution: "",
    field: "",
    date: "",
    verified: false,
  });

  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";

  useEffect(() => {
    loadCredentials();
  }, [filterType]);

  async function loadCredentials() {
    setLoading(true);
    setError("");
    try {
      const result = await api.getCredentials({
        vertical,
        jurisdiction,
        type: filterType === "all" ? undefined : filterType,
      });
      setCredentials(result.credentials || []);
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to load credentials:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.addCredential({
        vertical,
        jurisdiction,
        credential: formData,
      });
      await loadCredentials();
      setShowCreateModal(false);
      setFormData({
        type: "education",
        title: "",
        institution: "",
        field: "",
        date: "",
        verified: false,
      });
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to add credential:", e);
    }
  }

  function handleDelete(credId) {
    if (confirm("Are you sure you want to delete this credential?")) {
      setCredentials(credentials.filter((c) => c.id !== credId));
    }
  }

  const filteredCredentials =
    filterType === "all"
      ? credentials
      : credentials.filter((c) => c.type === filterType);

  const stats = {
    total: credentials.length,
    education: credentials.filter((c) => c.type === "education").length,
    professional: credentials.filter((c) => c.type === "professional").length,
    verified: credentials.filter((c) => c.verified).length,
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Student & Professional Records</h1>
          <p className="subtle">Education credentials and professional certifications</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => setShowInlineForm(true)}
          style={{
            background: "var(--accent)",
            color: "white",
            borderColor: "var(--accent)",
          }}
        >
          + Add Record
        </button>
      </div>

      {/* Stats */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total Credentials</div>
          <div className="kpiValue">{stats.total}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Education</div>
          <div className="kpiValue">{stats.education}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Professional</div>
          <div className="kpiValue">{stats.professional}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Verified</div>
          <div className="kpiValue">{stats.verified}</div>
        </div>
      </div>

      {/* Inline Add Form */}
      {showInlineForm && (
        <AddRecordForm
          onSave={async (record) => {
            // Convert to API format
            const credential = {
              type: record.recordType === "professional" ? "professional" : "education",
              title: record.degree,
              institution: record.name,
              field: record.field,
              date: record.graduationDate || new Date().toISOString().split('T')[0],
              verified: false,
            };

            await api.addCredential({
              vertical,
              jurisdiction,
              credential,
            });

            await loadCredentials();
          }}
          onCancel={() => setShowInlineForm(false)}
          onAddAnother={() => {
            // Form handles the "add another" prompt
            return true;
          }}
        />
      )}

      {/* Type tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button
          className={`iconBtn ${filterType === "all" ? "navItemActive" : ""}`}
          onClick={() => setFilterType("all")}
          style={{
            background: filterType === "all" ? "rgba(124,58,237,0.16)" : "#fff",
            borderColor: filterType === "all" ? "rgba(124,58,237,0.35)" : "var(--line)",
          }}
        >
          All ({stats.total})
        </button>
        <button
          className={`iconBtn ${filterType === "education" ? "navItemActive" : ""}`}
          onClick={() => setFilterType("education")}
          style={{
            background: filterType === "education" ? "rgba(124,58,237,0.16)" : "#fff",
            borderColor: filterType === "education" ? "rgba(124,58,237,0.35)" : "var(--line)",
          }}
        >
          Education ({stats.education})
        </button>
        <button
          className={`iconBtn ${filterType === "professional" ? "navItemActive" : ""}`}
          onClick={() => setFilterType("professional")}
          style={{
            background: filterType === "professional" ? "rgba(124,58,237,0.16)" : "#fff",
            borderColor:
              filterType === "professional" ? "rgba(124,58,237,0.35)" : "var(--line)",
          }}
        >
          Professional ({stats.professional})
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card">
          <div className="empty">Loading credentials...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredCredentials.length === 0 && (
        <div className="card">
          <div className="empty">
            <p>No {filterType !== "all" ? filterType : ""} credentials yet.</p>
            <p style={{ marginTop: "8px" }}>
              <button
                className="iconBtn"
                onClick={() => setShowCreateModal(true)}
                style={{
                  background: "var(--accent)",
                  color: "white",
                  borderColor: "var(--accent)",
                }}
              >
                Add your first credential
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Credentials grid */}
      {!loading && filteredCredentials.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "14px",
          }}
        >
          {filteredCredentials.map((credential) => (
            <div key={credential.id} className="card">
              <div className="cardHeader">
                <div>
                  <div className="cardTitle">{credential.title}</div>
                  <div className="cardSub">{credential.institution}</div>
                </div>
                {credential.verified && (
                  <span className="badge badge-completed">Verified</span>
                )}
              </div>
              <div className="detail">
                <div className="kvRow">
                  <div className="k">Type</div>
                  <div className="v">{credential.type === "education" ? "Education" : "Professional"}</div>
                </div>
                <div className="kvRow">
                  <div className="k">Field</div>
                  <div className="v">{credential.field}</div>
                </div>
                <div className="kvRow">
                  <div className="k">Date</div>
                  <div className="v">{new Date(credential.date).toLocaleDateString()}</div>
                </div>
                {credential.files.length > 0 && (
                  <div className="kvRow">
                    <div className="k">Files</div>
                    <div className="v">{credential.files.length} attached</div>
                  </div>
                )}
              </div>
              <div style={{ padding: "16px", borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="iconBtn" style={{ flex: 1 }}>
                    View
                  </button>
                  <button className="iconBtn" style={{ flex: 1 }}>
                    Share
                  </button>
                  <button
                    className="iconBtn"
                    onClick={() => handleDelete(credential.id)}
                    style={{ color: "var(--danger)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Credential"
        onSubmit={handleSubmit}
        submitLabel="Add Credential"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
              required
            >
              <option value="education">Education</option>
              <option value="professional">Professional Certification</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Title *
            </label>
            <input
              type="text"
              placeholder="e.g., Bachelor of Science, AWS Certification"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
              Institution *
            </label>
            <input
              type="text"
              placeholder="e.g., University of Illinois, AWS"
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
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
              Field of Study
            </label>
            <input
              type="text"
              placeholder="e.g., Computer Science, Cloud Computing"
              value={formData.field}
              onChange={(e) => setFormData({ ...formData, field: e.target.value })}
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
              Date Earned *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
              required
            />
          </div>
        </div>
      </FormModal>
    </div>
  );
}
