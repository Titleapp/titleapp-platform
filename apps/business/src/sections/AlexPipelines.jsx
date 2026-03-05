import React, { useEffect, useState } from "react";

export default function AlexPipelines() {
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [advancingStep, setAdvancingStep] = useState(null);

  // Create modal state
  const [newName, setNewName] = useState("");
  const [newSteps, setNewSteps] = useState([{ name: "", worker: "" }]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    loadPipelines();
  }, []);

  function getApiHeaders() {
    const token = localStorage.getItem("ID_TOKEN");
    const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-tenant-id": tenantId,
    };
  }

  function getApiBase() {
    return import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
  }

  async function loadPipelines() {
    try {
      const resp = await fetch(`${getApiBase()}/api?path=/v1/alex:status`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (data.ok && data.pipelines) {
        setPipelines(data.pipelines);
      }
    } catch (err) {
      console.error("Failed to load pipelines:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) {
      setCreateError("Pipeline name is required");
      return;
    }
    const validSteps = newSteps.filter(s => s.name.trim());
    if (validSteps.length === 0) {
      setCreateError("At least one step is required");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const resp = await fetch(`${getApiBase()}/api?path=/v1/alex:pipeline:create`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          name: newName.trim(),
          steps: validSteps.map(s => ({
            name: s.name.trim(),
            worker: s.worker.trim() || null,
          })),
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        setShowCreate(false);
        setNewName("");
        setNewSteps([{ name: "", worker: "" }]);
        loadPipelines();
      } else {
        setCreateError(data.error || "Failed to create pipeline");
      }
    } catch (err) {
      setCreateError("Failed to create pipeline");
    } finally {
      setCreating(false);
    }
  }

  async function handleAdvanceStep(pipelineId, stepIndex) {
    setAdvancingStep(`${pipelineId}-${stepIndex}`);
    try {
      const resp = await fetch(`${getApiBase()}/api?path=/v1/alex:pipeline:advance`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({ pipelineId, stepIndex }),
      });
      const data = await resp.json();
      if (data.ok) {
        loadPipelines();
      }
    } catch (err) {
      console.error("Failed to advance step:", err);
    } finally {
      setAdvancingStep(null);
    }
  }

  function addStep() {
    setNewSteps([...newSteps, { name: "", worker: "" }]);
  }

  function updateStep(index, field, value) {
    const updated = [...newSteps];
    updated[index] = { ...updated[index], [field]: value };
    setNewSteps(updated);
  }

  function removeStep(index) {
    if (newSteps.length <= 1) return;
    setNewSteps(newSteps.filter((_, i) => i !== index));
  }

  function getStatusColor(status) {
    switch (status) {
      case "completed": return { bg: "#dcfce7", text: "#16a34a" };
      case "in_progress": return { bg: "#dbeafe", text: "#2563eb" };
      case "blocked": return { bg: "#fee2e2", text: "#dc2626" };
      default: return { bg: "#f1f5f9", text: "#64748b" };
    }
  }

  function getStatusLabel(status) {
    switch (status) {
      case "completed": return "Completed";
      case "in_progress": return "In Progress";
      case "blocked": return "Blocked";
      default: return "Pending";
    }
  }

  function computeProgress(pipeline) {
    if (!pipeline.steps || pipeline.steps.length === 0) return 0;
    const completed = pipeline.steps.filter(s => s.status === "completed").length;
    return Math.round((completed / pipeline.steps.length) * 100);
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
        Loading pipelines...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Pipelines</div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>
            Cross-worker orchestration managed by Alex
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "10px 20px", border: "none", borderRadius: 8,
            background: "#7c3aed", color: "white", cursor: "pointer",
            fontSize: 14, fontWeight: 600,
          }}
        >
          Create Pipeline
        </button>
      </div>

      {/* Pipeline Cards */}
      {pipelines.length === 0 ? (
        <div style={{
          background: "white", borderRadius: 12, border: "1px solid var(--line)",
          padding: 48, textAlign: "center",
        }}>
          <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6 }}>
            No pipelines yet. Create your first cross-worker pipeline to coordinate
            multiple Digital Workers on a shared task.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {pipelines.map(pipeline => {
            const progress = computeProgress(pipeline);
            const isExpanded = expandedId === pipeline.id;
            return (
              <div
                key={pipeline.id}
                style={{
                  background: "white", borderRadius: 12,
                  border: "1px solid var(--line)", overflow: "hidden",
                }}
              >
                {/* Pipeline header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : pipeline.id)}
                  style={{
                    padding: "16px 20px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 16,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                        {pipeline.name}
                      </div>
                      <span style={{
                        display: "inline-block", padding: "2px 10px", borderRadius: 20,
                        fontSize: 12, fontWeight: 600,
                        background: getStatusColor(pipeline.status).bg,
                        color: getStatusColor(pipeline.status).text,
                      }}>
                        {getStatusLabel(pipeline.status)}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>
                      {pipeline.steps?.length || 0} steps
                      {pipeline.createdAt && (
                        <span style={{ marginLeft: 12 }}>
                          Created {pipeline.createdAt._seconds
                            ? new Date(pipeline.createdAt._seconds * 1000).toLocaleDateString()
                            : typeof pipeline.createdAt === "string"
                              ? new Date(pipeline.createdAt).toLocaleDateString()
                              : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ width: 120, flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4, textAlign: "right" }}>
                      {progress}%
                    </div>
                    <div style={{
                      height: 6, borderRadius: 3, background: "#e2e8f0", overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        background: progress === 100 ? "#22c55e" : "#7c3aed",
                        width: `${progress}%`,
                        transition: "width 300ms ease",
                      }} />
                    </div>
                  </div>

                  <svg
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    style={{
                      flexShrink: 0, color: "#94a3b8",
                      transform: isExpanded ? "rotate(180deg)" : "none",
                      transition: "transform 150ms ease",
                    }}
                  >
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* Expanded steps */}
                {isExpanded && pipeline.steps && (
                  <div style={{ borderTop: "1px solid var(--line)", padding: "16px 20px" }}>
                    {pipeline.steps.map((step, idx) => {
                      const stepStatus = getStatusColor(step.status);
                      const isAdvancing = advancingStep === `${pipeline.id}-${idx}`;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "10px 0",
                            borderBottom: idx < pipeline.steps.length - 1 ? "1px solid #f1f5f9" : "none",
                          }}
                        >
                          <div style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: step.status === "completed" ? "#dcfce7" : "#f1f5f9",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 600,
                            color: step.status === "completed" ? "#16a34a" : "#64748b",
                            flexShrink: 0,
                          }}>
                            {step.status === "completed" ? (
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : (
                              idx + 1
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
                              {step.name}
                            </div>
                            {step.worker && (
                              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                                Assigned to: {step.worker}
                              </div>
                            )}
                          </div>
                          <span style={{
                            display: "inline-block", padding: "2px 10px", borderRadius: 20,
                            fontSize: 11, fontWeight: 600,
                            background: stepStatus.bg, color: stepStatus.text,
                          }}>
                            {getStatusLabel(step.status)}
                          </span>
                          {step.status !== "completed" && step.status !== "blocked" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdvanceStep(pipeline.id, idx);
                              }}
                              disabled={isAdvancing}
                              style={{
                                padding: "4px 12px", border: "1px solid #e2e8f0", borderRadius: 6,
                                background: "white", cursor: isAdvancing ? "default" : "pointer",
                                fontSize: 12, fontWeight: 500, color: "#7c3aed",
                                opacity: isAdvancing ? 0.6 : 1,
                              }}
                            >
                              {isAdvancing ? "..." : "Advance"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Pipeline Modal */}
      {showCreate && (
        <>
          <div
            onClick={() => setShowCreate(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)",
              zIndex: 200, backdropFilter: "blur(4px)",
            }}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "white", borderRadius: 16, padding: 32, zIndex: 201,
            width: 520, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>
              Create Pipeline
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Pipeline Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. New Deal Onboarding"
                style={{
                  width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
                  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Steps
              </label>
              {newSteps.map((step, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    value={step.name}
                    onChange={e => updateStep(idx, "name", e.target.value)}
                    placeholder={`Step ${idx + 1} name`}
                    style={{
                      flex: 1, padding: "8px 12px", border: "1px solid #d1d5db",
                      borderRadius: 8, fontSize: 13, outline: "none",
                    }}
                  />
                  <input
                    type="text"
                    value={step.worker}
                    onChange={e => updateStep(idx, "worker", e.target.value)}
                    placeholder="Worker (optional)"
                    style={{
                      width: 160, padding: "8px 12px", border: "1px solid #d1d5db",
                      borderRadius: 8, fontSize: 13, outline: "none",
                    }}
                  />
                  {newSteps.length > 1 && (
                    <button
                      onClick={() => removeStep(idx)}
                      style={{
                        width: 32, height: 36, border: "1px solid #e2e8f0", borderRadius: 8,
                        background: "white", cursor: "pointer", fontSize: 16, color: "#94a3b8",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      x
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addStep}
                style={{
                  padding: "6px 14px", border: "1px dashed #d1d5db", borderRadius: 8,
                  background: "transparent", cursor: "pointer", fontSize: 13, color: "#7c3aed",
                  fontWeight: 500,
                }}
              >
                + Add Step
              </button>
            </div>

            {createError && (
              <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{createError}</div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                onClick={() => { setShowCreate(false); setCreateError(null); }}
                style={{
                  padding: "10px 20px", border: "1px solid #e2e8f0", borderRadius: 8,
                  background: "white", cursor: "pointer", fontSize: 14, color: "#64748b",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  flex: 1, padding: "10px 20px", border: "none", borderRadius: 8,
                  background: creating ? "#a78bfa" : "#7c3aed", color: "white",
                  cursor: creating ? "default" : "pointer", fontSize: 14, fontWeight: 600,
                }}
              >
                {creating ? "Creating..." : "Create Pipeline"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
