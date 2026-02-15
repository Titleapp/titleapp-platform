import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import * as api from "../api/client";

/**
 * MyGPTs - Personal AI assistants and conversation history
 */
export default function MyGPTs() {
  const [gpts, setGpts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGPT, setSelectedGPT] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    capabilities: [],
  });

  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";

  useEffect(() => {
    loadGPTs();
  }, []);

  async function loadGPTs() {
    setLoading(true);
    setError("");
    try {
      const result = await api.getGPTs({ vertical, jurisdiction });
      setGpts(result.gpts || []);
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to load GPTs:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createGPT({
        vertical,
        jurisdiction,
        gpt: formData,
      });
      await loadGPTs();
      setShowCreateModal(false);
      setFormData({
        name: "",
        description: "",
        systemPrompt: "",
        capabilities: [],
      });
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to create GPT:", e);
    }
  }

  async function handleDelete(gptId) {
    if (confirm("Are you sure you want to delete this GPT? All conversations will be lost.")) {
      setError("");
      try {
        await api.deleteGPT({ vertical, jurisdiction, gptId });
        await loadGPTs();
        if (selectedGPT?.id === gptId) {
          setSelectedGPT(null);
        }
      } catch (e) {
        setError(e?.message || String(e));
        console.error("Failed to delete GPT:", e);
      }
    }
  }

  function handleCapabilityToggle(capability) {
    const updated = formData.capabilities.includes(capability)
      ? formData.capabilities.filter((c) => c !== capability)
      : [...formData.capabilities, capability];
    setFormData({ ...formData, capabilities: updated });
  }

  const stats = {
    total: gpts.length,
    conversations: gpts.reduce((sum, g) => sum + g.conversationCount, 0),
    active: gpts.filter((g) => g.lastUsed).length,
  };

  const capabilityOptions = [
    { value: "web_search", label: "Web Search" },
    { value: "file_analysis", label: "File Analysis" },
    { value: "calculations", label: "Advanced Calculations" },
    { value: "document_generation", label: "Document Generation" },
    { value: "code_execution", label: "Code Execution" },
  ];

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My GPTs</h1>
          <p className="subtle">Personal AI assistants configured for your needs</p>
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
          + Create GPT
        </button>
      </div>

      {/* Stats */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total GPTs</div>
          <div className="kpiValue">{stats.total}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Conversations</div>
          <div className="kpiValue">{stats.conversations}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Active GPTs</div>
          <div className="kpiValue">{stats.active}</div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card">
          <div className="empty">Loading GPTs...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && gpts.length === 0 && (
        <div className="card">
          <div className="empty">
            <p>No custom GPTs yet.</p>
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
                Create your first GPT
              </button>
            </p>
          </div>
        </div>
      )}

      {/* GPTs Grid */}
      {!loading && gpts.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "14px",
          }}
        >
          {gpts.map((gpt) => (
            <div key={gpt.id} className="card">
              <div className="cardHeader">
                <div>
                  <div className="cardTitle">{gpt.name}</div>
                  <div className="cardSub">{gpt.description}</div>
                </div>
              </div>
              <div className="detail">
                <div className="kvRow">
                  <div className="k">Conversations</div>
                  <div className="v">{gpt.conversationCount}</div>
                </div>
                <div className="kvRow">
                  <div className="k">Last Used</div>
                  <div className="v">
                    {gpt.lastUsed
                      ? new Date(gpt.lastUsed).toLocaleDateString()
                      : "Never"}
                  </div>
                </div>
                <div className="kvRow">
                  <div className="k">Capabilities</div>
                  <div className="v">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {gpt.capabilities.map((cap) => (
                        <span key={cap} className="badge" style={{ fontSize: "11px" }}>
                          {cap.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: "16px", borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="iconBtn"
                    style={{ flex: 1 }}
                    onClick={() => setSelectedGPT(gpt)}
                  >
                    Configure
                  </button>
                  <button
                    className="iconBtn"
                    style={{ flex: 1 }}
                    onClick={() => alert(`Opening chat with ${gpt.name}...`)}
                  >
                    Chat
                  </button>
                  <button
                    className="iconBtn"
                    onClick={() => handleDelete(gpt.id)}
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

      {/* GPT Details Panel */}
      {selectedGPT && (
        <div className="card" style={{ marginTop: "16px" }}>
          <div className="cardHeader">
            <div>
              <div className="cardTitle">{selectedGPT.name} Configuration</div>
              <div className="cardSub">System prompt and capabilities</div>
            </div>
            <button className="iconBtn" onClick={() => setSelectedGPT(null)}>
              Close
            </button>
          </div>
          <div style={{ padding: "16px" }}>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>System Prompt</div>
              <div
                style={{
                  padding: "12px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedGPT.systemPrompt}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>Enabled Capabilities</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {selectedGPT.capabilities.map((cap) => (
                  <span key={cap} className="badge">
                    {cap.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <FormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Custom GPT"
        onSubmit={handleSubmit}
        submitLabel="Create GPT"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Tax Helper, Auto Advisor"
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
              placeholder="Brief description of what this GPT does"
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
              System Prompt *
            </label>
            <textarea
              placeholder="You are an expert assistant that..."
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              rows={6}
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
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Capabilities
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {capabilityOptions.map((option) => (
                <label
                  key={option.value}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <input
                    type="checkbox"
                    checked={formData.capabilities.includes(option.value)}
                    onChange={() => handleCapabilityToggle(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
