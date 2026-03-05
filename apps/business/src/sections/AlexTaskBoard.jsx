import React, { useEffect, useState } from "react";

const STATUS_FILTERS = ["all", "pending", "in_progress", "completed"];
const PRIORITY_OPTIONS = ["critical", "high", "normal", "low"];

export default function AlexTaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [updatingTask, setUpdatingTask] = useState(null);

  // Create modal state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newWorker, setNewWorker] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newDueDate, setNewDueDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    loadTasks();
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

  async function loadTasks() {
    try {
      const resp = await fetch(`${getApiBase()}/api?path=/v1/alex:tasks`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (data.ok && data.tasks) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newTitle.trim()) {
      setCreateError("Task title is required");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const resp = await fetch(`${getApiBase()}/api?path=/v1/alex:task:create`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          assignedWorker: newWorker.trim() || null,
          priority: newPriority,
          dueDate: newDueDate || null,
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        setShowCreate(false);
        setNewTitle("");
        setNewDescription("");
        setNewWorker("");
        setNewPriority("normal");
        setNewDueDate("");
        loadTasks();
      } else {
        setCreateError(data.error || "Failed to create task");
      }
    } catch (err) {
      setCreateError("Failed to create task");
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusCycle(task) {
    const nextStatus = {
      pending: "in_progress",
      in_progress: "completed",
      completed: "pending",
    };
    const newStatus = nextStatus[task.status] || "pending";
    setUpdatingTask(task.id);

    try {
      const resp = await fetch(`${getApiBase()}/api?path=/v1/alex:task:update`, {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({ taskId: task.id, status: newStatus }),
      });
      const data = await resp.json();
      if (data.ok) {
        loadTasks();
      }
    } catch (err) {
      console.error("Failed to update task:", err);
    } finally {
      setUpdatingTask(null);
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case "completed": return { bg: "#dcfce7", text: "#16a34a" };
      case "in_progress": return { bg: "#dbeafe", text: "#2563eb" };
      default: return { bg: "#f1f5f9", text: "#64748b" };
    }
  }

  function getStatusLabel(status) {
    switch (status) {
      case "completed": return "Completed";
      case "in_progress": return "In Progress";
      default: return "Pending";
    }
  }

  function getPriorityColor(priority) {
    switch (priority) {
      case "critical": return { bg: "#fee2e2", text: "#dc2626" };
      case "high": return { bg: "#fff7ed", text: "#ea580c" };
      case "low": return { bg: "#f0fdf4", text: "#16a34a" };
      default: return { bg: "#f1f5f9", text: "#64748b" };
    }
  }

  function getPriorityLabel(priority) {
    switch (priority) {
      case "critical": return "Critical";
      case "high": return "High";
      case "low": return "Low";
      default: return "Normal";
    }
  }

  const filteredTasks = filter === "all"
    ? tasks
    : tasks.filter(t => t.status === filter);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
        Loading tasks...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Task Board</div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>
            Cross-worker tasks coordinated by Alex
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
          Create Task
        </button>
      </div>

      {/* Status Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "6px 16px", border: "1px solid",
              borderColor: filter === s ? "#7c3aed" : "#e2e8f0",
              borderRadius: 20,
              background: filter === s ? "#7c3aed" : "white",
              color: filter === s ? "white" : "#64748b",
              cursor: "pointer", fontSize: 13, fontWeight: 500,
            }}
          >
            {s === "all" ? "All" : getStatusLabel(s)}
            {s !== "all" && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>
                {tasks.filter(t => t.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div style={{
          background: "white", borderRadius: 12, border: "1px solid var(--line)",
          padding: 48, textAlign: "center",
        }}>
          <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6 }}>
            {filter === "all"
              ? "No tasks yet. Tasks are created when Alex coordinates work across your Digital Workers."
              : `No ${getStatusLabel(filter).toLowerCase()} tasks.`}
          </div>
        </div>
      ) : (
        <div style={{
          background: "white", borderRadius: 12, border: "1px solid var(--line)", overflow: "hidden",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Task</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Assigned Worker</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Priority</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => {
                const statusColor = getStatusColor(task.status);
                const priorityColor = getPriorityColor(task.priority);
                const isUpdating = updatingTask === task.id;
                return (
                  <tr
                    key={task.id}
                    style={{ borderBottom: "1px solid var(--line)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                          {task.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text)" }}>
                      {task.assignedWorker || "--"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        display: "inline-block", padding: "2px 10px", borderRadius: 20,
                        fontSize: 12, fontWeight: 600,
                        background: priorityColor.bg, color: priorityColor.text,
                      }}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => handleStatusCycle(task)}
                        disabled={isUpdating}
                        style={{
                          display: "inline-block", padding: "2px 10px", borderRadius: 20,
                          fontSize: 12, fontWeight: 600, border: "none", cursor: isUpdating ? "default" : "pointer",
                          background: statusColor.bg, color: statusColor.text,
                          opacity: isUpdating ? 0.6 : 1,
                        }}
                        title="Click to change status"
                      >
                        {getStatusLabel(task.status)}
                      </button>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)" }}>
                      {task.dueDate
                        ? new Date(task.dueDate._seconds ? task.dueDate._seconds * 1000 : task.dueDate).toLocaleDateString()
                        : "--"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
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
              Create Task
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Review term sheet from ABC Lender"
                style={{
                  width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
                  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Description (optional)
              </label>
              <textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Additional details about the task"
                rows={3}
                style={{
                  width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
                  borderRadius: 8, fontSize: 14, outline: "none", resize: "vertical",
                  boxSizing: "border-box", fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Assigned Worker (optional)
                </label>
                <input
                  type="text"
                  value={newWorker}
                  onChange={e => setNewWorker(e.target.value)}
                  placeholder="e.g. CRE Analyst"
                  style={{
                    width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
                    borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ width: 160 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
                    borderRadius: 8, fontSize: 14, outline: "none", background: "white",
                    boxSizing: "border-box",
                  }}
                >
                  {PRIORITY_OPTIONS.map(p => (
                    <option key={p} value={p}>{getPriorityLabel(p)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Due Date (optional)
              </label>
              <input
                type="date"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
                  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
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
                {creating ? "Creating..." : "Create Task"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
