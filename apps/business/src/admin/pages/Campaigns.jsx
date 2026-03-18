import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  where,
  onSnapshot,
  getCountFromServer,
} from "firebase/firestore";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const TABS = [
  { id: "all", label: "All" },
  { id: "pre-subscription", label: "Pre-Subscription" },
  { id: "onboarding", label: "Onboarding" },
  { id: "retention", label: "Retention" },
  { id: "churn", label: "Churn Prevention" },
  { id: "creator", label: "Creator" },
  { id: "sandbox", label: "Sandbox" },
];

const TYPE_BADGE = {
  email: { bg: "rgba(124,58,237,0.08)", color: "#7c3aed" },
  sms: { bg: "rgba(16,185,129,0.08)", color: "#10b981" },
  both: { bg: "rgba(245,158,11,0.08)", color: "#f59e0b" },
};

function StatusBadge({ active }) {
  return (
    <span
      className="ac-badge"
      style={{
        background: active ? "rgba(16,185,129,0.08)" : "rgba(148,163,184,0.08)",
        color: active ? "#10b981" : "#94a3b8",
        borderColor: active ? "rgba(16,185,129,0.3)" : "rgba(148,163,184,0.3)",
      }}
    >
      {active ? "Active" : "Paused"}
    </span>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [tab, setTab] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [queueStats, setQueueStats] = useState({ sent: 0, queued: 0, failed: 0 });
  const [showTestModal, setShowTestModal] = useState(false);
  const [testCampaignId, setTestCampaignId] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Load campaigns from Firestore
  useEffect(() => {
    const q = query(collection(db, "campaigns"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setCampaigns(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Load queue stats
  useEffect(() => {
    async function loadQueueStats() {
      try {
        const token = localStorage.getItem("ID_TOKEN");
        if (!token) return;
        const res = await fetch(`${API_BASE}/api?path=/v1/admin:messageQueue`, {
          headers: { Authorization: `Bearer ${token}`, "X-Tenant-Id": "admin" },
        });
        const data = await res.json();
        if (data.ok) {
          setQueueStats({ sent: data.sent || 0, queued: data.queued || 0, failed: data.failed || 0 });
        }
      } catch {
        // Queue API not available yet — counts stay at 0
      }
    }
    loadQueueStats();
  }, []);

  const filtered = tab === "all" ? campaigns : campaigns.filter((c) => c.category === tab);
  const activeCampaigns = campaigns.filter((c) => c.active).length;

  async function handleSendTest(campaignId) {
    setTestSending(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const res = await fetch(`${API_BASE}/api?path=/v1/admin:campaign:test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-Id": "admin",
        },
        body: JSON.stringify({
          campaignId: campaignId || testCampaignId,
          testEmail: "sean@titleapp.ai",
          testPhone: "+17076549864",
        }),
      });
      const data = await res.json();
      setTestResult(data.ok ? "Test sent successfully." : (data.error || "Failed to send test."));
    } catch {
      setTestResult("Connection error.");
    }
    setTestSending(false);
  }

  return (
    <div>
      <div className="ac-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="ac-page-title">Campaigns</h1>
          <p className="ac-page-subtitle">Messaging campaigns and subscriber engagement</p>
        </div>
        <button
          onClick={() => setShowTestModal(true)}
          style={{
            padding: "10px 18px", background: "#6B46C1", color: "white", border: "none",
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Send Test Message
        </button>
      </div>

      {/* Top metrics */}
      <div className="ac-metrics" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Active Campaigns</div>
          <div className="ac-metric-value">{activeCampaigns}</div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Messages Sent</div>
          <div className="ac-metric-value">{queueStats.sent.toLocaleString()}</div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Queued</div>
          <div className="ac-metric-value">{queueStats.queued.toLocaleString()}</div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Failed</div>
          <div className="ac-metric-value" style={{ color: queueStats.failed > 0 ? "#ef4444" : undefined }}>
            {queueStats.failed.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ac-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`ac-tab ${tab === t.id ? "ac-tab-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Campaign Table */}
      <div className="ac-card" style={{ overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e8ebf3", textAlign: "left" }}>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b", fontSize: 11 }}>Name</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b", fontSize: 11 }}>Type</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b", fontSize: 11 }}>Trigger</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b", fontSize: 11 }}>Audience</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b", fontSize: 11 }}>Stages</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b", fontSize: 11 }}>Sent</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b", fontSize: 11 }}>Open Rate</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b", fontSize: 11 }}>Status</th>
              <th style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b", fontSize: 11 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: "24px 12px", textAlign: "center", color: "#94a3b8" }}>
                  No campaigns found.
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const typeStyle = TYPE_BADGE[c.type] || TYPE_BADGE.email;
              const stages = c.stages || c.sequence || [];
              const isExpanded = expanded === c.id;
              return (
                <React.Fragment key={c.id}>
                  <tr
                    style={{ borderBottom: "1px solid #f1f5f9", cursor: stages.length > 0 ? "pointer" : "default" }}
                    onClick={() => stages.length > 0 && setExpanded(isExpanded ? null : c.id)}
                  >
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                      {stages.length > 0 && <span style={{ fontSize: 10, marginRight: 4 }}>{isExpanded ? "\u25BC" : "\u25B6"}</span>}
                      {c.name}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: typeStyle.bg, color: typeStyle.color }}>
                        {c.type || "email"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#64748b", fontSize: 12 }}>{c.trigger || "--"}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b", fontSize: 12 }}>{c.audience || "--"}</td>
                    <td style={{ padding: "10px 12px" }}>{stages.length || "--"}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{(c.sentCount || 0).toLocaleString()}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {c.openRate != null ? (c.openRate * 100).toFixed(1) + "%" : "--"}
                    </td>
                    <td style={{ padding: "10px 12px" }}><StatusBadge active={c.active} /></td>
                    <td style={{ padding: "10px 12px" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSendTest(c.id); }}
                        style={{
                          padding: "4px 10px", background: "transparent", color: "#6B46C1",
                          border: "1px solid rgba(107,70,193,0.3)", borderRadius: 4,
                          fontSize: 11, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        Send Test
                      </button>
                    </td>
                  </tr>
                  {isExpanded && stages.map((stage, si) => (
                    <tr key={si} style={{ background: "#f8f9fc", borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 12px 8px 36px", fontSize: 12, color: "#64748b" }}>
                        Stage {si + 1}: {stage.name || stage.subject || `Step ${si + 1}`}
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: 12, color: "#64748b" }}>{stage.channel || c.type || "email"}</td>
                      <td style={{ padding: "8px 12px", fontSize: 12, color: "#64748b" }}>{stage.delay || "--"}</td>
                      <td colSpan={6} style={{ padding: "8px 12px", fontSize: 12, color: "#94a3b8" }}>
                        {stage.subject || stage.body?.slice(0, 60) || ""}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Send Test Modal */}
      {showTestModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }} onClick={() => { setShowTestModal(false); setTestResult(null); }}>
          <div style={{ background: "white", borderRadius: 16, maxWidth: 440, width: "90%", padding: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Send Test Message</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Campaign</div>
              <select
                value={testCampaignId}
                onChange={e => setTestCampaignId(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13 }}
              >
                <option value="">Select a campaign</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Email: sean@titleapp.ai</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>Phone: +1 (707) 654-9864</div>
            {testResult && (
              <div style={{ fontSize: 13, padding: "8px 12px", borderRadius: 6, marginBottom: 12, background: testResult.includes("success") ? "#f0fdf4" : "#fff5f5", color: testResult.includes("success") ? "#16a34a" : "#dc2626" }}>
                {testResult}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowTestModal(false); setTestResult(null); }} style={{ padding: "10px 18px", background: "#f1f5f9", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                onClick={() => handleSendTest()}
                disabled={!testCampaignId || testSending}
                style={{ padding: "10px 18px", background: "#6B46C1", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: !testCampaignId || testSending ? 0.6 : 1 }}
              >
                {testSending ? "Sending..." : "Send Test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
