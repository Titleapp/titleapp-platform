import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";

/**
 * RulesResources - Configure Digital Worker workflows for vertical and jurisdiction
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
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [showAddSopModal, setShowAddSopModal] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", description: "", condition: "", action: "" });
  const [sopFile, setSopFile] = useState(null);
  const [sopName, setSopName] = useState("");
  const [customRules, setCustomRules] = useState([]);
  const [sopDocs, setSopDocs] = useState([]);

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

  useEffect(() => {
    loadWorkflows();
  }, []);

  async function loadWorkflows() {
    setLoading(true);
    try {
      // Workflows will be loaded from RAAS catalog when backend is ready
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
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
          <p className="subtle">Configure enforcement workflows for your vertical and jurisdiction</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="iconBtn"
            onClick={() => setShowAddRuleModal(true)}
            style={{ background: "var(--accent)", color: "white", borderColor: "var(--accent)" }}
          >
            + Add Rule
          </button>
          <button
            className="iconBtn"
            onClick={() => setShowAddSopModal(true)}
          >
            + Add SOP
          </button>
        </div>
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
            <div className="v">{VERTICAL_LABELS[vertical] || vertical}</div>
          </div>
          <div className="kvRow">
            <div className="k">Jurisdiction</div>
            <div className="v">{jurisdiction.toUpperCase()}</div>
          </div>
          <div className="kvRow">
            <div className="k">Rules Version</div>
            <div className="v">2.1.0</div>
          </div>
          {localStorage.getItem("RAAS_RULES") && (
            <div className="kvRow">
              <div className="k">Custom Rules</div>
              <div className="v" style={{ whiteSpace: "pre-wrap" }}>{localStorage.getItem("RAAS_RULES")}</div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Rules */}
      {customRules.length > 0 && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <div className="cardHeader">
            <div className="cardTitle">Custom Rules ({customRules.length})</div>
          </div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {customRules.map((rule, i) => (
              <div key={i} style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>{rule.name}</div>
                  {rule.description && <div style={{ fontSize: "13px", color: "var(--textMuted)", marginTop: "2px" }}>{rule.description}</div>}
                  {rule.condition && <div style={{ fontSize: "12px", color: "#7c3aed", marginTop: "4px" }}>When: {rule.condition}</div>}
                  {rule.action && <div style={{ fontSize: "12px", color: "#059669", marginTop: "2px" }}>Then: {rule.action}</div>}
                </div>
                <button
                  className="iconBtn"
                  onClick={() => setCustomRules(customRules.filter((_, idx) => idx !== i))}
                  style={{ fontSize: "12px", padding: "4px 8px", color: "var(--danger)", borderColor: "var(--danger)" }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOP Documents */}
      {sopDocs.length > 0 && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <div className="cardHeader">
            <div className="cardTitle">SOP Documents ({sopDocs.length})</div>
          </div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {sopDocs.map((sop, i) => (
              <div key={i} style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>{sop.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--textMuted)" }}>{sop.fileName} ({(sop.fileSize / 1024).toFixed(1)} KB)</div>
                </div>
                <button
                  className="iconBtn"
                  onClick={() => setSopDocs(sopDocs.filter((_, idx) => idx !== i))}
                  style={{ fontSize: "12px", padding: "4px 8px", color: "var(--danger)", borderColor: "var(--danger)" }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card">
          <div className="empty">Loading workflows...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && workflows.length === 0 && (
        <div className="card" style={{ marginTop: "16px" }}>
          <div className="empty" style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>No workflows configured yet</div>
            <div style={{ fontSize: "14px", color: "var(--textMuted)", marginBottom: "16px", maxWidth: "400px", margin: "0 auto 16px" }}>
              Workflows define the rules your AI assistant follows. They are configured per vertical and jurisdiction. Create your first workflow or ask the AI assistant to set one up for you.
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              <button
                className="iconBtn"
                onClick={() => setShowAddRuleModal(true)}
                style={{ background: "var(--accent)", color: "white", borderColor: "var(--accent)" }}
              >
                + Add Rule
              </button>
              <button
                className="iconBtn"
                onClick={() => setShowAddSopModal(true)}
              >
                + Add SOP Document
              </button>
            </div>
          </div>
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

      {/* Add Rule Modal */}
      <FormModal
        isOpen={showAddRuleModal}
        onClose={() => { setShowAddRuleModal(false); setNewRule({ name: "", description: "", condition: "", action: "" }); }}
        title="Add Custom Rule"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newRule.name.trim()) return;
          setCustomRules([...customRules, { ...newRule }]);
          setNewRule({ name: "", description: "", condition: "", action: "" });
          setShowAddRuleModal(false);
        }}
        submitLabel="Add Rule"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Rule Name *</label>
            <input
              type="text"
              value={newRule.name}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              placeholder="e.g., Minimum Deal Size Check"
              style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
              required
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Description</label>
            <input
              type="text"
              value={newRule.description}
              onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
              placeholder="What does this rule do?"
              style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Condition (when)</label>
            <textarea
              value={newRule.condition}
              onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
              placeholder="e.g., Deal ask amount is below $500,000"
              rows={2}
              style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)", fontFamily: "inherit" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Action (then)</label>
            <textarea
              value={newRule.action}
              onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
              placeholder="e.g., Auto-pass and notify user"
              rows={2}
              style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)", fontFamily: "inherit" }}
            />
          </div>
        </div>
      </FormModal>

      {/* Add SOP Modal */}
      <FormModal
        isOpen={showAddSopModal}
        onClose={() => { setShowAddSopModal(false); setSopFile(null); setSopName(""); }}
        title="Add SOP Documentation"
        onSubmit={(e) => {
          e.preventDefault();
          if (!sopFile) return;
          setSopDocs([...sopDocs, { name: sopName.trim() || sopFile.name, fileName: sopFile.name, fileSize: sopFile.size }]);
          setSopFile(null);
          setSopName("");
          setShowAddSopModal(false);
        }}
        submitLabel="Upload SOP"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Document Name</label>
            <input
              type="text"
              value={sopName}
              onChange={(e) => setSopName(e.target.value)}
              placeholder="e.g., Deal Screening SOP"
              style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>Upload Document *</label>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSopFile(file);
                  if (!sopName.trim()) setSopName(file.name.replace(/\.[^.]+$/, ""));
                }
              }}
              style={{ width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" }}
              required
            />
            {sopFile && (
              <div style={{ marginTop: "8px", fontSize: "13px", color: "var(--textMuted)" }}>
                {sopFile.name} ({(sopFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>
          <div style={{ padding: "12px", background: "#f8f4ff", borderRadius: "8px", fontSize: "13px", color: "#6b7280" }}>
            SOP documents feed into your enforcement engine. The AI assistant will reference these when handling your business operations.
          </div>
        </div>
      </FormModal>
    </div>
  );
}
