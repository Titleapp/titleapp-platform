import React, { useState, useEffect } from "react";
import DTCCard from "../components/DTCCard";
import FormModal from "../components/FormModal";

/**
 * MyStuff - Digital Title Certificates (DTCs)
 *
 * DTCs are immutable ownership records - like car titles, property deeds, or diplomas.
 * They serve as anchors for dynamic logbook entries.
 */
export default function MyStuff() {
  const [dtcs, setDtcs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState("all");
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    type: "vehicle",
    metadata: {},
  });

  // Mock data for demonstration
  const mockDTCs = [
    {
      id: "dtc-001",
      type: "vehicle",
      metadata: {
        title: "2022 Honda Civic",
        vin: "1HGCM82633A123456",
        year: 2022,
        make: "Honda",
        model: "Civic",
        titleStatus: "Clean Title - Illinois",
      },
      blockchainProof: {
        hash: "0x1234abcd...",
        network: "polygon",
        timestamp: "2026-02-14T10:30:00Z",
      },
      logbookCount: 12,
      createdAt: "2026-01-15T09:00:00Z",
    },
    {
      id: "dtc-002",
      type: "property",
      metadata: {
        title: "123 Main Street, Chicago IL",
        address: "123 Main Street",
        city: "Chicago",
        state: "IL",
        zipCode: "60601",
        parcelId: "14-08-203-024-0000",
      },
      blockchainProof: {
        hash: "0x5678efgh...",
        network: "polygon",
        timestamp: "2026-01-20T14:15:00Z",
      },
      logbookCount: 5,
      createdAt: "2026-01-20T14:00:00Z",
    },
    {
      id: "dtc-003",
      type: "credential",
      metadata: {
        title: "B.S. Computer Science",
        institution: "University of Illinois",
        degree: "Bachelor of Science",
        field: "Computer Science",
        graduationDate: "2020-05-15",
      },
      blockchainProof: null, // Not yet verified on blockchain
      logbookCount: 2,
      createdAt: "2026-02-01T11:00:00Z",
    },
  ];

  useEffect(() => {
    loadDTCs();
  }, []);

  async function loadDTCs() {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setDtcs(mockDTCs);
      setLoading(false);
    }, 500);
  }

  function handleCreateDTC(e) {
    e.preventDefault();

    // Create new DTC with form data
    const newDTC = {
      id: `dtc-${Date.now()}`,
      type: formData.type,
      metadata: formData.metadata,
      blockchainProof: null, // Will be added later
      logbookCount: 0,
      createdAt: new Date().toISOString(),
    };

    setDtcs([newDTC, ...dtcs]);
    setShowCreateModal(false);
    setFormData({ type: "vehicle", metadata: {} });
  }

  function handleMetadataChange(key, value) {
    setFormData({
      ...formData,
      metadata: {
        ...formData.metadata,
        [key]: value,
      },
    });
  }

  const filteredDTCs =
    activeType === "all"
      ? dtcs
      : dtcs.filter((dtc) => dtc.type === activeType);

  const types = [
    { id: "all", label: "All", icon: "📋", count: dtcs.length },
    { id: "vehicle", label: "Vehicles", icon: "🚗", count: dtcs.filter(d => d.type === "vehicle").length },
    { id: "property", label: "Property", icon: "🏠", count: dtcs.filter(d => d.type === "property").length },
    { id: "credential", label: "Credentials", icon: "🎓", count: dtcs.filter(d => d.type === "credential").length },
  ];

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My Stuff</h1>
          <p className="subtle">
            Digital Title Certificates - Immutable ownership records for your assets
          </p>
        </div>
        <button
          className="iconBtn"
          onClick={() => setShowCreateModal(true)}
          style={{
            background: "var(--accent)",
            color: "white",
            borderColor: "var(--accent)",
          }}
        >
          + New DTC
        </button>
      </div>

      {/* Type tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        {types.map((type) => (
          <button
            key={type.id}
            className={`iconBtn ${activeType === type.id ? "navItemActive" : ""}`}
            onClick={() => setActiveType(type.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: activeType === type.id ? "rgba(124,58,237,0.16)" : "#fff",
              borderColor: activeType === type.id ? "rgba(124,58,237,0.35)" : "var(--line)",
            }}
          >
            <span>{type.icon}</span>
            <span>{type.label}</span>
            <span
              className="badge"
              style={{ fontSize: "10px", padding: "2px 6px", marginLeft: "4px" }}
            >
              {type.count}
            </span>
          </button>
        ))}
      </div>

      {/* View mode toggle */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button
          className="iconBtn"
          onClick={() => setViewMode("cards")}
          style={{
            background: viewMode === "cards" ? "#f8fafc" : "#fff",
          }}
        >
          Cards
        </button>
        <button
          className="iconBtn"
          onClick={() => setViewMode("table")}
          style={{
            background: viewMode === "table" ? "#f8fafc" : "#fff",
          }}
        >
          Table
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card">
          <div className="empty">Loading DTCs...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredDTCs.length === 0 && (
        <div className="card">
          <div className="empty">
            <p>
              🎯 No {activeType !== "all" ? activeType : ""} DTCs yet.
            </p>
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
                Create your first DTC
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Cards view */}
      {!loading && viewMode === "cards" && filteredDTCs.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "14px",
          }}
        >
          {filteredDTCs.map((dtc) => (
            <DTCCard
              key={dtc.id}
              dtc={dtc}
              onView={(dtc) => alert(`View DTC: ${dtc.id}`)}
              onTransfer={(dtc) => alert(`Transfer DTC: ${dtc.id}`)}
            />
          ))}
        </div>
      )}

      {/* Table view */}
      {!loading && viewMode === "table" && filteredDTCs.length > 0 && (
        <div className="card">
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Logbook Entries</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredDTCs.map((dtc) => (
                  <tr key={dtc.id}>
                    <td>
                      {dtc.type === "vehicle" && "🚗"}
                      {dtc.type === "property" && "🏠"}
                      {dtc.type === "credential" && "🎓"}
                      {" " + dtc.type}
                    </td>
                    <td className="tdStrong">{dtc.metadata?.title || "Untitled"}</td>
                    <td>{dtc.logbookCount}</td>
                    <td>
                      {dtc.blockchainProof ? (
                        <span className="badge badge-completed">✓ Verified</span>
                      ) : (
                        <span className="badge">Pending</span>
                      )}
                    </td>
                    <td className="tdMuted">
                      {new Date(dtc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create DTC Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData({ type: "vehicle", metadata: {} });
        }}
        title="Create New DTC"
        onSubmit={handleCreateDTC}
        submitLabel="Create DTC"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Type selector */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              DTC Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value, metadata: {} })}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
            >
              <option value="vehicle">Vehicle</option>
              <option value="property">Property</option>
              <option value="credential">Credential</option>
            </select>
          </div>

          {/* Vehicle-specific fields */}
          {formData.type === "vehicle" && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., 2022 Honda Civic"
                  value={formData.metadata.title || ""}
                  onChange={(e) => handleMetadataChange("title", e.target.value)}
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
                  VIN
                </label>
                <input
                  type="text"
                  placeholder="17-character VIN"
                  value={formData.metadata.vin || ""}
                  onChange={(e) => handleMetadataChange("vin", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                  required
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Year
                  </label>
                  <input
                    type="number"
                    placeholder="2022"
                    value={formData.metadata.year || ""}
                    onChange={(e) => handleMetadataChange("year", e.target.value)}
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
                    Make
                  </label>
                  <input
                    type="text"
                    placeholder="Honda"
                    value={formData.metadata.make || ""}
                    onChange={(e) => handleMetadataChange("make", e.target.value)}
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
                    Model
                  </label>
                  <input
                    type="text"
                    placeholder="Civic"
                    value={formData.metadata.model || ""}
                    onChange={(e) => handleMetadataChange("model", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Property-specific fields */}
          {formData.type === "property" && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., 123 Main Street, Chicago IL"
                  value={formData.metadata.title || ""}
                  onChange={(e) => handleMetadataChange("title", e.target.value)}
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
                  Address
                </label>
                <input
                  type="text"
                  placeholder="123 Main Street"
                  value={formData.metadata.address || ""}
                  onChange={(e) => handleMetadataChange("address", e.target.value)}
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
                  Parcel ID
                </label>
                <input
                  type="text"
                  placeholder="County parcel identifier"
                  value={formData.metadata.parcelId || ""}
                  onChange={(e) => handleMetadataChange("parcelId", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                />
              </div>
            </>
          )}

          {/* Credential-specific fields */}
          {formData.type === "credential" && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., B.S. Computer Science"
                  value={formData.metadata.title || ""}
                  onChange={(e) => handleMetadataChange("title", e.target.value)}
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
                  Institution
                </label>
                <input
                  type="text"
                  placeholder="University or organization"
                  value={formData.metadata.institution || ""}
                  onChange={(e) => handleMetadataChange("institution", e.target.value)}
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
                  placeholder="e.g., Computer Science"
                  value={formData.metadata.field || ""}
                  onChange={(e) => handleMetadataChange("field", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                />
              </div>
            </>
          )}
        </div>
      </FormModal>
    </div>
  );
}
