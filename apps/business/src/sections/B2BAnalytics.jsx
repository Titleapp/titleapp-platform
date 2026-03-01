import React, { useEffect, useState } from "react";

export default function B2BAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeploy, setShowDeploy] = useState(false);
  const [deployEmail, setDeployEmail] = useState("");
  const [deployWorkerName, setDeployWorkerName] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-tenant-id": tenantId,
      };

      const [analyticsResp, deploymentsResp] = await Promise.all([
        fetch(`${apiBase}/api?path=/v1/b2b:analytics`, { headers }),
        fetch(`${apiBase}/api?path=/v1/b2b:deployments`, { headers }),
      ]);

      const analyticsData = await analyticsResp.json();
      const deploymentsData = await deploymentsResp.json();

      if (analyticsData.ok) setAnalytics(analyticsData.analytics);
      if (deploymentsData.ok) setDeployments(deploymentsData.deployments || []);
    } catch (err) {
      console.error("Failed to load B2B data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeploy() {
    if (!deployEmail.trim()) {
      setDeployError("Email is required");
      return;
    }
    setDeploying(true);
    setDeployError(null);

    try {
      const token = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID") || localStorage.getItem("WORKSPACE_ID");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const resp = await fetch(`${apiBase}/api?path=/v1/b2b:deploy`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          recipientEmail: deployEmail.trim(),
          workerIds: ["default-worker"],
          workerName: deployWorkerName.trim() || "Shared Worker",
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        setShowDeploy(false);
        setDeployEmail("");
        setDeployWorkerName("");
        loadData();
      } else {
        setDeployError(data.error || "Deploy failed");
      }
    } catch (err) {
      setDeployError("Deploy failed");
    } finally {
      setDeploying(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
        Loading B2B analytics...
      </div>
    );
  }

  const kpis = [
    { label: "Total Deployments", value: analytics?.totalDeployments || 0, color: "#7c3aed" },
    { label: "Active Recipients", value: analytics?.activeRecipients || 0, color: "#22c55e" },
    { label: "Total Interactions", value: analytics?.totalInteractions || 0, color: "#06b6d4" },
    { label: "Avg. Engagement", value: analytics?.avgInteractionsPerRecipient || 0, color: "#f59e0b" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>B2B Distribution</div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>
            Deploy Digital Workers to your customers and partners
          </div>
        </div>
        <button
          onClick={() => setShowDeploy(true)}
          style={{
            padding: "10px 20px", border: "none", borderRadius: 8,
            background: "#7c3aed", color: "white", cursor: "pointer",
            fontSize: 14, fontWeight: 600,
          }}
        >
          Deploy Workers
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: "white", borderRadius: 12, padding: 20,
              border: "1px solid var(--line)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Deployments Table */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--line)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 15, color: "var(--text)" }}>
          Deployments ({deployments.length})
        </div>

        {deployments.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            No deployments yet. Deploy workers to your customers to get started.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Worker</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Recipients</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Interactions</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((dep) => (
                <React.Fragment key={dep.id}>
                  <tr
                    onClick={() => setExpandedRow(expandedRow === dep.id ? null : dep.id)}
                    style={{ borderBottom: "1px solid var(--line)", cursor: "pointer" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                      {dep.workerName || "Shared Worker"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, color: "var(--text)" }}>
                      {dep.activeRecipientCount || 0} / {dep.recipientCount || 0}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        display: "inline-block", padding: "2px 10px", borderRadius: 20,
                        fontSize: 12, fontWeight: 600,
                        background: dep.status === "active" ? "#dcfce7" : dep.status === "revoked" ? "#fee2e2" : "#f1f5f9",
                        color: dep.status === "active" ? "#16a34a" : dep.status === "revoked" ? "#dc2626" : "#64748b",
                      }}>
                        {dep.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, color: "var(--text)" }}>
                      {dep.analytics?.totalInteractions || 0}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)" }}>
                      {dep.createdAt?._seconds
                        ? new Date(dep.createdAt._seconds * 1000).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                  {expandedRow === dep.id && (
                    <tr>
                      <td colSpan={5} style={{ padding: "12px 16px", background: "#f8fafc" }}>
                        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
                          Deployment ID: {dep.id}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text)" }}>
                          Workers: {(dep.workerIds || []).join(", ") || "—"}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text)", marginTop: 4 }}>
                          Avg. interactions per recipient: {dep.analytics?.avgInteractionsPerRecipient || 0}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Deploy Modal */}
      {showDeploy && (
        <>
          <div
            onClick={() => setShowDeploy(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)",
              zIndex: 200, backdropFilter: "blur(4px)",
            }}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "white", borderRadius: 16, padding: 32, zIndex: 201,
            width: 480, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>
              Deploy Workers to a Recipient
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Recipient Email
              </label>
              <input
                type="email"
                value={deployEmail}
                onChange={e => setDeployEmail(e.target.value)}
                placeholder="customer@example.com"
                style={{
                  width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
                  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                Worker Name (optional)
              </label>
              <input
                type="text"
                value={deployWorkerName}
                onChange={e => setDeployWorkerName(e.target.value)}
                placeholder="Claims Management"
                style={{
                  width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
                  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {deployError && (
              <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{deployError}</div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                onClick={() => setShowDeploy(false)}
                style={{
                  padding: "10px 20px", border: "1px solid #e2e8f0", borderRadius: 8,
                  background: "white", cursor: "pointer", fontSize: 14, color: "#64748b",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeploy}
                disabled={deploying}
                style={{
                  flex: 1, padding: "10px 20px", border: "none", borderRadius: 8,
                  background: deploying ? "#a78bfa" : "#7c3aed", color: "white",
                  cursor: deploying ? "default" : "pointer", fontSize: 14, fontWeight: 600,
                }}
              >
                {deploying ? "Deploying..." : "Deploy"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
