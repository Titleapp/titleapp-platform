import React, { useState, useEffect } from "react";
import * as api from "../api/client";

/**
 * AIGPTsChats - AI worker activity log and conversation history
 */
export default function AIGPTsChats() {
  const [activities, setActivities] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [activeTab, setActiveTab] = useState("activity");

  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";

  useEffect(() => {
    if (activeTab === "activity") {
      loadActivity();
    } else {
      loadConversations();
    }
  }, [activeTab]);

  async function loadActivity() {
    setLoading(true);
    setError("");
    try {
      const result = await api.getAIActivity({ vertical, jurisdiction, limit: 50 });
      setActivities(result.activity || []);
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to load AI activity:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadConversations() {
    setLoading(true);
    setError("");
    try {
      const result = await api.getConversations({ vertical, jurisdiction });
      setConversations(result.conversations || []);
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to load conversations:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleViewConversation(conversationId) {
    try {
      const result = await api.getConversationReplay({ vertical, jurisdiction, conversationId });
      setSelectedConversation(result);
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to load conversation replay:", e);
    }
  }

  // Mock data for fallback (will be replaced with real data)
  const mockActivities = [
    {
      id: "act-001",
      type: "workflow_execution",
      workflow: "Vehicle Purchase Flow",
      customer: "John Smith",
      model: "Claude Opus 4.6",
      status: "completed",
      duration: "2.3s",
      timestamp: "2026-02-14T15:30:00Z",
    },
    {
      id: "act-002",
      type: "workflow_execution",
      workflow: "Service Work Order",
      customer: "Sarah Lee",
      model: "Claude Opus 4.6",
      status: "completed",
      duration: "1.8s",
      timestamp: "2026-02-14T14:15:00Z",
    },
    {
      id: "act-003",
      type: "trade_analysis",
      workflow: "Trade-In Valuation",
      customer: "Mike Johnson",
      model: "GPT-4",
      status: "completed",
      duration: "3.1s",
      timestamp: "2026-02-14T13:00:00Z",
    },
    {
      id: "act-004",
      type: "workflow_execution",
      workflow: "Financing Application",
      customer: "Lisa Park",
      model: "Claude Opus 4.6",
      status: "failed",
      duration: "0.9s",
      timestamp: "2026-02-14T11:45:00Z",
      error: "Credit score below minimum threshold",
    },
  ];

  const mockConversations = [
    {
      id: "conv-001",
      customer: "John Smith",
      subject: "Vehicle purchase assistance",
      messageCount: 12,
      model: "Claude Opus 4.6",
      started: "2026-02-14T15:28:00Z",
      lastMessage: "2026-02-14T15:30:00Z",
      status: "closed",
    },
    {
      id: "conv-002",
      customer: "Sarah Lee",
      subject: "Service appointment scheduling",
      messageCount: 5,
      model: "Claude Opus 4.6",
      started: "2026-02-14T14:10:00Z",
      lastMessage: "2026-02-14T14:15:00Z",
      status: "closed",
    },
    {
      id: "conv-003",
      customer: "Mike Johnson",
      subject: "Trade-in valuation inquiry",
      messageCount: 8,
      model: "GPT-4",
      started: "2026-02-14T12:55:00Z",
      lastMessage: "2026-02-14T13:00:00Z",
      status: "closed",
    },
    {
      id: "conv-004",
      customer: "Emma Wilson",
      subject: "Financing options question",
      messageCount: 3,
      model: "Claude Opus 4.6",
      started: "2026-02-14T10:00:00Z",
      lastMessage: "2026-02-14T10:15:00Z",
      status: "active",
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setTimeout(() => {
      setActivities(mockActivities);
      setConversations(mockConversations);
      setLoading(false);
    }, 500);
  }

  function handleReplayConversation(conversation) {
    setSelectedConversation(conversation);
  }

  const stats = {
    totalActivity: activities.length,
    successful: activities.filter((a) => a.status === "completed").length,
    failed: activities.filter((a) => a.status === "failed").length,
    conversations: conversations.length,
    active: conversations.filter((c) => c.status === "active").length,
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">AI, GPTs & Chats</h1>
          <p className="subtle">AI worker activity log and conversation history</p>
        </div>
      </div>

      {/* Stats */}
      <div className="kpiRow">
        <div className="card kpiCard">
          <div className="kpiLabel">Total Activity</div>
          <div className="kpiValue">{stats.totalActivity}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Successful</div>
          <div className="kpiValue">{stats.successful}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Failed</div>
          <div className="kpiValue">{stats.failed}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Conversations</div>
          <div className="kpiValue">{stats.conversations}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button
          className={`iconBtn ${activeTab === "activity" ? "navItemActive" : ""}`}
          onClick={() => setActiveTab("activity")}
          style={{
            background: activeTab === "activity" ? "rgba(124,58,237,0.16)" : "#fff",
            borderColor: activeTab === "activity" ? "rgba(124,58,237,0.35)" : "var(--line)",
          }}
        >
          Activity Log ({activities.length})
        </button>
        <button
          className={`iconBtn ${activeTab === "conversations" ? "navItemActive" : ""}`}
          onClick={() => setActiveTab("conversations")}
          style={{
            background: activeTab === "conversations" ? "rgba(124,58,237,0.16)" : "#fff",
            borderColor: activeTab === "conversations" ? "rgba(124,58,237,0.35)" : "var(--line)",
          }}
        >
          Conversations ({conversations.length})
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card">
          <div className="empty">Loading AI activity...</div>
        </div>
      )}

      {/* Activity Log Tab */}
      {!loading && activeTab === "activity" && (
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">Recent AI Activity</div>
          </div>
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Workflow</th>
                  <th>Customer</th>
                  <th>Model</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td className="tdMuted">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </td>
                    <td>
                      <span className="badge" style={{ fontSize: "11px" }}>
                        {activity.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="tdStrong">{activity.workflow}</td>
                    <td>{activity.customer}</td>
                    <td className="tdMuted">{activity.model}</td>
                    <td>{activity.duration}</td>
                    <td>
                      <span
                        className={`badge ${
                          activity.status === "completed"
                            ? "badge-completed"
                            : activity.status === "failed"
                            ? ""
                            : "badge-pending"
                        }`}
                        style={{ fontSize: "11px" }}
                      >
                        {activity.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activities.some((a) => a.error) && (
            <div style={{ padding: "16px", borderTop: "1px solid var(--line)" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>Recent Errors</div>
              {activities
                .filter((a) => a.error)
                .map((activity) => (
                  <div
                    key={activity.id}
                    style={{
                      padding: "12px",
                      background: "#fff5f5",
                      border: "1px solid #fecaca",
                      borderRadius: "8px",
                      fontSize: "13px",
                      marginBottom: "8px",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                      {activity.workflow} - {activity.customer}
                    </div>
                    <div style={{ color: "var(--danger)" }}>{activity.error}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Conversations Tab */}
      {!loading && activeTab === "conversations" && (
        <div>
          {conversations.length === 0 ? (
            <div className="card">
              <div className="empty">
                <p>No conversations yet.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {conversations.map((conversation) => (
                <div key={conversation.id} className="card">
                  <div className="cardHeader">
                    <div>
                      <div className="cardTitle">{conversation.subject}</div>
                      <div className="cardSub">Customer: {conversation.customer}</div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span
                        className={`badge ${
                          conversation.status === "active" ? "badge-pending" : ""
                        }`}
                        style={{ fontSize: "11px" }}
                      >
                        {conversation.status}
                      </span>
                      <span className="badge" style={{ fontSize: "11px" }}>
                        {conversation.messageCount} messages
                      </span>
                    </div>
                  </div>
                  <div className="detail">
                    <div className="kvRow">
                      <div className="k">Model</div>
                      <div className="v">{conversation.model}</div>
                    </div>
                    <div className="kvRow">
                      <div className="k">Started</div>
                      <div className="v">{new Date(conversation.started).toLocaleString()}</div>
                    </div>
                    <div className="kvRow">
                      <div className="k">Last Message</div>
                      <div className="v">
                        {new Date(conversation.lastMessage).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: "16px", borderTop: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="iconBtn"
                        onClick={() => handleReplayConversation(conversation)}
                        style={{ flex: 1 }}
                      >
                        Replay Conversation
                      </button>
                      <button className="iconBtn" style={{ flex: 1 }}>
                        Export
                      </button>
                      <button className="iconBtn" style={{ flex: 1 }}>
                        Analytics
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conversation Replay Panel */}
      {selectedConversation && (
        <div className="card" style={{ marginTop: "16px" }}>
          <div className="cardHeader">
            <div>
              <div className="cardTitle">Conversation Replay: {selectedConversation.subject}</div>
              <div className="cardSub">{selectedConversation.customer}</div>
            </div>
            <button className="iconBtn" onClick={() => setSelectedConversation(null)}>
              Close
            </button>
          </div>
          <div style={{ padding: "16px" }}>
            <div
              style={{
                padding: "24px",
                background: "#f8fafc",
                borderRadius: "8px",
                textAlign: "center",
                color: "var(--textMuted)",
              }}
            >
              Conversation replay viewer would display full message history here
              <div style={{ marginTop: "12px", fontSize: "13px" }}>
                {selectedConversation.messageCount} messages · Started{" "}
                {new Date(selectedConversation.started).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
