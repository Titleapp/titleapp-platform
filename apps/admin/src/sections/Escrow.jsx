import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import * as api from "../api/client";

/**
 * Escrow - Secure escrow locker transactions with AI verification
 */
export default function Escrow() {
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEscrow, setSelectedEscrow] = useState(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    counterparty: "",
    dtcIds: [],
    terms: "",
    releaseConditions: "",
    amount: "",
  });

  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";

  useEffect(() => {
    loadEscrows();
  }, []);

  async function loadEscrows() {
    setLoading(true);
    setError("");
    try {
      const result = await api.getEscrows({ vertical, jurisdiction });
      setEscrows(result.escrows || []);
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to load escrows:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const newEscrow = {
      id: `escrow-${Date.now()}`,
      ...formData,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    setEscrows([newEscrow, ...escrows]);
    setShowCreateModal(false);
    setFormData({
      title: "",
      counterparty: "",
      dtcIds: [],
      terms: "",
      releaseConditions: "",
    });
  }

  function handleRelease(escrowId) {
    if (confirm("Are you sure you want to release this escrow? This action cannot be undone.")) {
      setEscrows(
        escrows.map((e) =>
          e.id === escrowId
            ? { ...e, status: "completed", completedAt: new Date().toISOString() }
            : e
        )
      );
    }
  }

  function handleCancel(escrowId) {
    if (confirm("Are you sure you want to cancel this escrow?")) {
      setEscrows(
        escrows.map((e) => (e.id === escrowId ? { ...e, status: "cancelled" } : e))
      );
    }
  }

  async function requestAIAnalysis(escrow) {
    setAiAnalysisLoading(true);
    setSelectedEscrow(escrow);

    // Simulate AI analysis
    setTimeout(() => {
      if (escrow.aiAnalysis) {
        setAiAnalysis(escrow.aiAnalysis);
      } else {
        setAiAnalysis({
          summary: "Transaction appears standard with no unusual terms.",
          risks: ["Verify counterparty identity", "Confirm payment method"],
          recommendations: ["Use certified funds", "Document all communications"],
          confidence: 0.85,
        });
      }
      setAiAnalysisLoading(false);
    }, 1500);
  }

  const stats = {
    total: escrows.length,
    pending: escrows.filter((e) => e.status === "pending").length,
    active: escrows.filter((e) => e.status === "active").length,
    completed: escrows.filter((e) => e.status === "completed").length,
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Escrow</h1>
          <p className="subtle">Secure escrow locker transactions with AI verification</p>
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
          + New Escrow
        </button>
      </div>

      {/* Stats */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total Escrows</div>
          <div className="kpiValue">{stats.total}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Pending</div>
          <div className="kpiValue">{stats.pending}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Active</div>
          <div className="kpiValue">{stats.active}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Completed</div>
          <div className="kpiValue">{stats.completed}</div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card">
          <div className="empty">Loading escrows...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && escrows.length === 0 && (
        <div className="card">
          <div className="empty">
            <p>No escrow transactions yet.</p>
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
                Create your first escrow
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Escrows List */}
      {!loading && escrows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {escrows.map((escrow) => (
            <div key={escrow.id} className="card">
              <div className="cardHeader">
                <div>
                  <div className="cardTitle">{escrow.title}</div>
                  <div className="cardSub">Counterparty: {escrow.counterparty}</div>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span
                    className={`badge ${
                      escrow.status === "completed"
                        ? "badge-completed"
                        : escrow.status === "active"
                        ? "badge-pending"
                        : ""
                    }`}
                  >
                    {escrow.status}
                  </span>
                  {escrow.amount && (
                    <div style={{ fontWeight: 700, fontSize: "18px" }}>{escrow.amount}</div>
                  )}
                </div>
              </div>
              <div className="detail">
                <div className="kvRow">
                  <div className="k">Terms</div>
                  <div className="v">{escrow.terms}</div>
                </div>
                <div className="kvRow">
                  <div className="k">Release Conditions</div>
                  <div className="v">{escrow.releaseConditions}</div>
                </div>
                <div className="kvRow">
                  <div className="k">Created</div>
                  <div className="v">{new Date(escrow.createdAt).toLocaleDateString()}</div>
                </div>
                {escrow.completedAt && (
                  <div className="kvRow">
                    <div className="k">Completed</div>
                    <div className="v">{new Date(escrow.completedAt).toLocaleDateString()}</div>
                  </div>
                )}
                {escrow.dtcIds.length > 0 && (
                  <div className="kvRow">
                    <div className="k">Linked DTCs</div>
                    <div className="v">{escrow.dtcIds.length} certificate(s)</div>
                  </div>
                )}
              </div>
              <div style={{ padding: "16px", borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    className="iconBtn"
                    onClick={() => requestAIAnalysis(escrow)}
                    style={{
                      background: "rgba(124,58,237,0.1)",
                      borderColor: "rgba(124,58,237,0.3)",
                    }}
                  >
                    AI Analysis
                  </button>
                  {escrow.status === "pending" && (
                    <>
                      <button
                        className="iconBtn"
                        onClick={() =>
                          setEscrows(
                            escrows.map((e) =>
                              e.id === escrow.id ? { ...e, status: "active" } : e
                            )
                          )
                        }
                      >
                        Activate
                      </button>
                      <button
                        className="iconBtn"
                        onClick={() => handleCancel(escrow.id)}
                        style={{ color: "var(--danger)" }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {escrow.status === "active" && (
                    <button
                      className="iconBtn"
                      onClick={() => handleRelease(escrow.id)}
                      style={{
                        background: "var(--success)",
                        color: "white",
                        borderColor: "var(--success)",
                      }}
                    >
                      Release Escrow
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Analysis Panel */}
      {selectedEscrow && (
        <div className="card" style={{ marginTop: "16px" }}>
          <div className="cardHeader">
            <div>
              <div className="cardTitle">AI Analysis: {selectedEscrow.title}</div>
              <div className="cardSub">Powered by Claude</div>
            </div>
            <button className="iconBtn" onClick={() => setSelectedEscrow(null)}>
              Close
            </button>
          </div>
          <div style={{ padding: "16px" }}>
            {aiAnalysisLoading ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--textMuted)" }}>
                Analyzing escrow terms...
              </div>
            ) : aiAnalysis ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "8px" }}>Summary</div>
                  <div
                    style={{
                      padding: "12px",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  >
                    {aiAnalysis.summary}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "8px" }}>Identified Risks</div>
                  <ul style={{ margin: 0, paddingLeft: "20px" }}>
                    {aiAnalysis.risks.map((risk, i) => (
                      <li key={i} style={{ marginBottom: "4px" }}>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "8px" }}>Recommendations</div>
                  <ul style={{ margin: 0, paddingLeft: "20px" }}>
                    {aiAnalysis.recommendations.map((rec, i) => (
                      <li key={i} style={{ marginBottom: "4px" }}>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "8px" }}>Confidence Score</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        flex: 1,
                        height: "8px",
                        background: "#e5e7eb",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${aiAnalysis.confidence * 100}%`,
                          height: "100%",
                          background: "var(--success)",
                        }}
                      />
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {Math.round(aiAnalysis.confidence * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Create Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Escrow Transaction"
        onSubmit={handleSubmit}
        submitLabel="Create Escrow"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Title *
            </label>
            <input
              type="text"
              placeholder="e.g., Vehicle Sale - 2022 Honda Civic"
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
              Counterparty *
            </label>
            <input
              type="text"
              placeholder="Name of other party"
              value={formData.counterparty}
              onChange={(e) => setFormData({ ...formData, counterparty: e.target.value })}
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
              Terms *
            </label>
            <textarea
              placeholder="Describe the escrow terms..."
              value={formData.terms}
              onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
              rows={3}
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
              Release Conditions *
            </label>
            <textarea
              placeholder="What conditions must be met to release the escrow?"
              value={formData.releaseConditions}
              onChange={(e) => setFormData({ ...formData, releaseConditions: e.target.value })}
              rows={3}
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
              Linked DTCs (optional)
            </label>
            <input
              type="text"
              placeholder="Select DTCs to include..."
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
            />
            <div style={{ fontSize: "13px", color: "var(--textMuted)", marginTop: "4px" }}>
              You can link Digital Title Certificates to this escrow
            </div>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
