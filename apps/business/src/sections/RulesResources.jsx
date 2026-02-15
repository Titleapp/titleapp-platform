import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";

/**
 * RulesResources - Configure RAAS workflows for vertical and jurisdiction
 */
export default function RulesResources() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rules: "",
    enabled: true,
  });

  // Mock RAAS workflows
  const mockWorkflows = [
    {
      id: "wf-001",
      name: "Vehicle Purchase Flow",
      vertical: "auto",
      jurisdiction: "IL",
      description: "Complete workflow for vehicle purchase and title transfer",
      rules: [
        "VIN verification required",
        "Odometer disclosure mandatory",
        "Lien release check before transfer",
        "Sales tax calculation (IL: 7.25% base + local)",
      ],
      enabled: true,
      executionCount: 47,
      lastUsed: "2026-02-14T10:30:00Z",
    },
    {
      id: "wf-002",
      name: "Service Work Order",
      vertical: "auto",
      jurisdiction: "IL",
      description: "Service appointment and work order processing",
      rules: [
        "Customer authorization required for work >$100",
        "Parts inventory check before quoting",
        "Labor rate: $125/hour standard, $150/hour diagnostic",
        "Warranty verification for covered repairs",
      ],
      enabled: true,
      executionCount: 234,
      lastUsed: "2026-02-14T15:00:00Z",
    },
    {
      id: "wf-003",
      name: "Trade-In Valuation",
      vertical: "auto",
      jurisdiction: "IL",
      description: "Vehicle trade-in appraisal workflow",
      rules: [
        "KBB/NADA price check required",
        "Visual inspection checklist (25 points)",
        "CarFax/AutoCheck history review",
        "Outstanding loan payoff verification",
      ],
      enabled: true,
      executionCount: 18,
      lastUsed: "2026-02-13T11:00:00Z",
    },
    {
      id: "wf-004",
      name: "Financing Application",
      vertical: "auto",
      jurisdiction: "IL",
      description: "Customer financing and credit check",
      rules: [
        "Credit score check (minimum 600)",
        "Debt-to-income ratio <43%",
        "Down payment: 10% minimum for used, 5% for new",
        "APR range: 3.9%-18% based on credit tier",
      ],
      enabled: false,
      executionCount: 12,
      lastUsed: "2026-02-10T09:00:00Z",
    },
  ];

  useEffect(() => {
    loadWorkflows();
  }, []);

  async function loadWorkflows() {
    setLoading(true);
    setTimeout(() => {
      setWorkflows(mockWorkflows);
      setLoading(false);
    }, 500);
  }

  function handleEditClick(workflow) {
    setSelectedWorkflow(workflow);
    setFormData({
      name: workflow.name,
      description: workflow.description,
      rules: workflow.rules.join("\n"),
      enabled: workflow.enabled,
    });
    setShowEditModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const updatedWorkflows = workflows.map((w) =>
      w.id === selectedWorkflow.id
        ? {
            ...w,
            name: formData.name,
            description: formData.description,
            rules: formData.rules.split("\n").filter((r) => r.trim()),
            enabled: formData.enabled,
          }
        : w
    );
    setWorkflows(updatedWorkflows);
    setShowEditModal(false);
  }

  function toggleWorkflow(workflowId) {
    setWorkflows(
      workflows.map((w) => (w.id === workflowId ? { ...w, enabled: !w.enabled } : w))
    );
  }

  const stats = {
    total: workflows.length,
    enabled: workflows.filter((w) => w.enabled).length,
    disabled: workflows.filter((w) => !w.enabled).length,
    executions: workflows.reduce((sum, w) => sum + w.executionCount, 0),
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Rules & Resources</h1>
          <p className="subtle">Configure RAAS workflows for your vertical and jurisdiction</p>
        </div>
        <button className="iconBtn" onClick={() => alert("Create new workflow...")}>
          + Add Workflow
        </button>
      </div>

      {/* Stats */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total Workflows</div>
          <div className="kpiValue">{stats.total}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Enabled</div>
          <div className="kpiValue">{stats.enabled}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Disabled</div>
          <div className="kpiValue">{stats.disabled}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Total Executions</div>
          <div className="kpiValue">{stats.executions}</div>
        </div>
      </div>

      {/* Vertical & Jurisdiction Info */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div className="cardTitle">Current Configuration</div>
        </div>
        <div className="detail">
          <div className="kvRow">
            <div className="k">Vertical</div>
            <div className="v">Auto Dealer</div>
          </div>
          <div className="kvRow">
            <div className="k">Jurisdiction</div>
            <div className="v">Illinois (IL)</div>
          </div>
          <div className="kvRow">
            <div className="k">RAAS Version</div>
            <div className="v">2.1.0</div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card">
          <div className="empty">Loading workflows...</div>
        </div>
      )}

      {/* Workflows List */}
      {!loading && workflows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {workflows.map((workflow) => (
            <div key={workflow.id} className="card">
              <div className="cardHeader">
                <div>
                  <div className="cardTitle">{workflow.name}</div>
                  <div className="cardSub">{workflow.description}</div>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span
                    className={`badge ${workflow.enabled ? "badge-completed" : ""}`}
                    style={{ fontSize: "11px" }}
                  >
                    {workflow.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <span className="badge" style={{ fontSize: "11px" }}>
                    {workflow.executionCount} runs
                  </span>
                </div>
              </div>
              <div style={{ padding: "16px" }}>
                <div style={{ fontWeight: 600, marginBottom: "8px" }}>Rules</div>
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  {workflow.rules.map((rule, i) => (
                    <li key={i} style={{ marginBottom: "4px", fontSize: "14px" }}>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="detail" style={{ borderTop: "1px solid var(--line)" }}>
                <div className="kvRow">
                  <div className="k">Vertical</div>
                  <div className="v">{workflow.vertical.toUpperCase()}</div>
                </div>
                <div className="kvRow">
                  <div className="k">Jurisdiction</div>
                  <div className="v">{workflow.jurisdiction}</div>
                </div>
                <div className="kvRow">
                  <div className="k">Last Used</div>
                  <div className="v">{new Date(workflow.lastUsed).toLocaleString()}</div>
                </div>
              </div>
              <div style={{ padding: "16px", borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="iconBtn"
                    onClick={() => handleEditClick(workflow)}
                    style={{ flex: 1 }}
                  >
                    Edit Rules
                  </button>
                  <button
                    className="iconBtn"
                    onClick={() => toggleWorkflow(workflow.id)}
                    style={{ flex: 1 }}
                  >
                    {workflow.enabled ? "Disable" : "Enable"}
                  </button>
                  <button className="iconBtn" style={{ flex: 1 }}>
                    Test Workflow
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Workflow Details Panel */}
      {selectedWorkflow && !showEditModal && (
        <div className="card" style={{ marginTop: "16px" }}>
          <div className="cardHeader">
            <div>
              <div className="cardTitle">{selectedWorkflow.name}</div>
              <div className="cardSub">Workflow Details</div>
            </div>
            <button className="iconBtn" onClick={() => setSelectedWorkflow(null)}>
              Close
            </button>
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>Execution History</div>
              <div style={{ fontSize: "14px", color: "var(--textMuted)" }}>
                This workflow has been executed {selectedWorkflow.executionCount} times.
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>Recent Runs</div>
              <div
                style={{
                  padding: "12px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "var(--textMuted)",
                }}
              >
                Execution logs would appear here
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <FormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Workflow Rules"
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Workflow Name *
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
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              Rules (one per line) *
            </label>
            <textarea
              value={formData.rules}
              onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
              rows={10}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
                fontFamily: "monospace",
                fontSize: "13px",
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              />
              <span style={{ fontWeight: 600 }}>Enabled</span>
            </label>
            <div style={{ fontSize: "13px", color: "var(--textMuted)", marginTop: "4px" }}>
              Only enabled workflows will execute
            </div>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
