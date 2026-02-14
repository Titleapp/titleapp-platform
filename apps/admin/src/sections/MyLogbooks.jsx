import React, { useState, useEffect } from "react";
import LogbookEntry from "../components/LogbookEntry";
import FormModal from "../components/FormModal";
import { getDTCs, getLogbooks, appendLogbook } from "../api/client";

/**
 * MyLogbooks - Logbook entries for DTCs
 *
 * Logbooks append dynamic updates to immutable DTCs, keeping them current.
 * Like maintenance logs for a car or transcript updates for a degree.
 */
export default function MyLogbooks() {
  const [entries, setEntries] = useState([]);
  const [dtcs, setDtcs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterDTC, setFilterDTC] = useState("all");
  const [showAppendModal, setShowAppendModal] = useState(false);
  const [formData, setFormData] = useState({
    dtcId: "",
    entryType: "maintenance",
    data: {},
  });

  const vertical = "auto";
  const jurisdiction = "il";

  // Remove mock data - will load from API
  const mockEntries = [
    {
      id: "log-001",
      dtcId: "dtc-001",
      dtcTitle: "2022 Honda Civic",
      entryType: "maintenance",
      data: {
        type: "Oil Change",
        mileage: "35,000 miles",
        cost: "$45.00",
        vendor: "QuickLube",
      },
      files: ["receipt-001.pdf"],
      createdAt: "2026-02-14T10:30:00Z",
    },
    {
      id: "log-002",
      dtcId: "dtc-001",
      dtcTitle: "2022 Honda Civic",
      entryType: "inspection",
      data: {
        type: "Annual Safety Inspection",
        result: "Passed",
        inspector: "IL State Inspector #12345",
        validUntil: "2027-02-14",
      },
      files: ["inspection-cert.pdf"],
      createdAt: "2026-02-10T14:00:00Z",
    },
    {
      id: "log-003",
      dtcId: "dtc-002",
      dtcTitle: "123 Main Street, Chicago IL",
      entryType: "update",
      data: {
        type: "Property Tax Payment",
        amount: "$3,250.00",
        year: "2026",
        status: "Paid in Full",
      },
      files: [],
      createdAt: "2026-02-08T09:15:00Z",
    },
    {
      id: "log-004",
      dtcId: "dtc-003",
      dtcTitle: "B.S. Computer Science",
      entryType: "note",
      data: {
        type: "Continuing Education",
        course: "Machine Learning Specialization",
        provider: "Stanford Online",
        completed: "2026-01-20",
      },
      files: ["certificate.pdf"],
      createdAt: "2026-01-20T16:45:00Z",
    },
    {
      id: "log-005",
      dtcId: "dtc-001",
      dtcTitle: "2022 Honda Civic",
      entryType: "maintenance",
      data: {
        type: "Tire Rotation",
        mileage: "32,500 miles",
        cost: "$35.00",
        vendor: "Discount Tire",
      },
      files: [],
      createdAt: "2026-01-15T11:00:00Z",
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [dtcsResult, logbooksResult] = await Promise.all([
        getDTCs({ vertical, jurisdiction }),
        getLogbooks({ vertical, jurisdiction }),
      ]);
      setDtcs(dtcsResult.dtcs || []);
      setEntries(logbooksResult.logbooks || []);
    } catch (e) {
      setError(e?.message || String(e));
      setDtcs([]);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAppendEntry(e) {
    e.preventDefault();
    setError("");

    try {
      await appendLogbook({
        vertical,
        jurisdiction,
        entry: {
          dtcId: formData.dtcId,
          entryType: formData.entryType,
          data: formData.data,
          files: [],
        },
      });

      // Reload logbooks to get the new entry from server
      await loadData();

      setShowAppendModal(false);
      setFormData({ dtcId: "", entryType: "maintenance", data: {} });
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  function handleDataChange(key, value) {
    setFormData({
      ...formData,
      data: {
        ...formData.data,
        [key]: value,
      },
    });
  }

  const filteredEntries =
    filterDTC === "all"
      ? entries
      : entries.filter((entry) => entry.dtcId === filterDTC);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My Logbooks</h1>
          <p className="subtle">
            Dynamic updates that keep your DTCs current and append-only audit trail
          </p>
        </div>
        <button
          className="iconBtn"
          onClick={() => setShowAppendModal(true)}
          style={{
            background: "var(--accent)",
            color: "white",
            borderColor: "var(--accent)",
          }}
        >
          + Append Entry
        </button>
      </div>

      {/* DTC filter */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
          Filter by DTC
        </label>
        <select
          value={filterDTC}
          onChange={(e) => setFilterDTC(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "12px",
            border: "1px solid var(--line)",
            minWidth: "300px",
          }}
        >
          <option value="all">All DTCs ({entries.length} entries)</option>
          {dtcs.map((dtc) => (
            <option key={dtc.id} value={dtc.id}>
              {dtc.title} ({entries.filter((e) => e.dtcId === dtc.id).length} entries)
            </option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <div className="empty" style={{ color: "var(--danger)" }}>
            ❌ {error}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="card">
          <div className="empty">Loading logbook entries...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredEntries.length === 0 && (
        <div className="card">
          <div className="empty">
            <p>📝 No logbook entries yet.</p>
            <p style={{ marginTop: "8px" }}>
              <button
                className="iconBtn"
                onClick={() => setShowAppendModal(true)}
                style={{
                  background: "var(--accent)",
                  color: "white",
                  borderColor: "var(--accent)",
                }}
              >
                Append your first entry
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Timeline view */}
      {!loading && filteredEntries.length > 0 && (
        <div className="card">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">Activity Timeline</div>
              <div className="cardSub">
                {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
                {filterDTC !== "all" && ` for ${dtcs.find((d) => d.id === filterDTC)?.title}`}
              </div>
            </div>
          </div>

          <div style={{ padding: "14px 16px" }}>
            {filteredEntries.map((entry, index) => (
              <LogbookEntry
                key={entry.id}
                entry={entry}
                showDTC={filterDTC === "all"}
                onViewDTC={(dtcId) => setFilterDTC(dtcId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Append Entry Modal */}
      <FormModal
        isOpen={showAppendModal}
        onClose={() => {
          setShowAppendModal(false);
          setFormData({ dtcId: "", entryType: "maintenance", data: {} });
        }}
        title="Append Logbook Entry"
        onSubmit={handleAppendEntry}
        submitLabel="Append Entry"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* DTC selector */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Select DTC *
            </label>
            <select
              value={formData.dtcId}
              onChange={(e) => setFormData({ ...formData, dtcId: e.target.value })}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
              required
            >
              <option value="">Choose a DTC...</option>
              {dtcs.map((dtc) => (
                <option key={dtc.id} value={dtc.id}>
                  {dtc.title}
                </option>
              ))}
            </select>
          </div>

          {/* Entry type */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Entry Type *
            </label>
            <select
              value={formData.entryType}
              onChange={(e) =>
                setFormData({ ...formData, entryType: e.target.value, data: {} })
              }
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
              required
            >
              <option value="maintenance">🔧 Maintenance</option>
              <option value="inspection">🔍 Inspection</option>
              <option value="transfer">🔄 Transfer</option>
              <option value="update">📝 Update</option>
              <option value="note">💬 Note</option>
            </select>
          </div>

          {/* Maintenance fields */}
          {formData.entryType === "maintenance" && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Type
                </label>
                <input
                  type="text"
                  placeholder="e.g., Oil Change, Tire Rotation"
                  value={formData.data.type || ""}
                  onChange={(e) => handleDataChange("type", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                  required
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Mileage
                  </label>
                  <input
                    type="text"
                    placeholder="35,000 miles"
                    value={formData.data.mileage || ""}
                    onChange={(e) => handleDataChange("mileage", e.target.value)}
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
                    Cost
                  </label>
                  <input
                    type="text"
                    placeholder="$45.00"
                    value={formData.data.cost || ""}
                    onChange={(e) => handleDataChange("cost", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Vendor
                </label>
                <input
                  type="text"
                  placeholder="Service provider"
                  value={formData.data.vendor || ""}
                  onChange={(e) => handleDataChange("vendor", e.target.value)}
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

          {/* Inspection fields */}
          {formData.entryType === "inspection" && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Inspection Type
                </label>
                <input
                  type="text"
                  placeholder="e.g., Annual Safety Inspection"
                  value={formData.data.type || ""}
                  onChange={(e) => handleDataChange("type", e.target.value)}
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
                  Result
                </label>
                <select
                  value={formData.data.result || ""}
                  onChange={(e) => handleDataChange("result", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                  required
                >
                  <option value="">Select result...</option>
                  <option value="Passed">Passed</option>
                  <option value="Failed">Failed</option>
                  <option value="Conditional">Conditional</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Inspector
                </label>
                <input
                  type="text"
                  placeholder="Inspector name or ID"
                  value={formData.data.inspector || ""}
                  onChange={(e) => handleDataChange("inspector", e.target.value)}
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

          {/* Note/Update fields */}
          {(formData.entryType === "note" || formData.entryType === "update") && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Title
                </label>
                <input
                  type="text"
                  placeholder="Brief description"
                  value={formData.data.type || ""}
                  onChange={(e) => handleDataChange("type", e.target.value)}
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
                  Details
                </label>
                <textarea
                  placeholder="Additional details..."
                  value={formData.data.details || ""}
                  onChange={(e) => handleDataChange("details", e.target.value)}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                    fontFamily: "inherit",
                    resize: "vertical",
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
