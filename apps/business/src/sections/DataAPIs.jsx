import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import * as api from "../api/client";

/**
 * DataAPIs - Third-party integrations and API management
 */
export default function DataAPIs() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);

  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";

  const availableIntegrations = [
    { id: "salesforce", name: "Salesforce", type: "CRM", icon: "SF" },
    { id: "hubspot", name: "HubSpot", type: "CRM", icon: "HS" },
    { id: "quickbooks", name: "QuickBooks", type: "Accounting", icon: "QB" },
    { id: "stripe", name: "Stripe", type: "Payments", icon: "ST" },
    { id: "square", name: "Square", type: "Payments", icon: "SQ" },
    { id: "twilio", name: "Twilio", type: "SMS", icon: "TW" },
    { id: "sendgrid", name: "SendGrid", type: "Email", icon: "SG" },
    { id: "foreflight", name: "ForeFlight", type: "Aviation", icon: "FF" },
  ];

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    setLoading(true);
    setError("");
    try {
      const result = await api.getIntegrations({ vertical, jurisdiction });
      setIntegrations(result.integrations || []);
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to load integrations:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect(integrationId) {
    if (confirm("Are you sure you want to disconnect this integration?")) {
      setError("");
      try {
        await api.disconnectIntegration({ vertical, jurisdiction, integrationId });
        await loadIntegrations();
      } catch (e) {
        setError(e?.message || String(e));
        console.error("Failed to disconnect integration:", e);
      }
    }
  }

  async function handleSync(integrationId) {
    setError("");
    try {
      await api.syncIntegration({ vertical, jurisdiction, integrationId });
      await loadIntegrations();
      alert("Sync started successfully!");
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to sync integration:", e);
      alert("Sync failed: " + (e?.message || String(e)));
    }
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Data & APIs</h1>
          <p className="subtle">Third-party integrations and data synchronization</p>
        </div>
        <button
          className="iconBtn"
          onClick={() => setShowAddModal(true)}
          style={{
            background: "var(--accent)",
            color: "white",
            borderColor: "var(--accent)",
          }}
        >
          + Add Integration
        </button>
      </div>

      {/* Active Integrations */}
      {integrations.length > 0 && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <div className="cardHeader">
            <div className="cardTitle">Active Integrations ({integrations.length})</div>
          </div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {integrations.map((integration) => (
              <div
                key={integration.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px",
                  border: "1px solid var(--line)",
                  borderRadius: "12px",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedIntegration(integration)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "16px", marginBottom: "4px" }}>
                    {integration.name}
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--textMuted)", marginBottom: "8px" }}>
                    {integration.description}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--textMuted)" }}>
                    Last synced: {new Date(integration.lastSync).toLocaleString()} •{" "}
                    {integration.recordsSync} records
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", marginLeft: "16px" }}>
                  <button
                    className="iconBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSync(integration.id);
                    }}
                  >
                    Sync Now
                  </button>
                  <button
                    className="iconBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDisconnect(integration.id);
                    }}
                    style={{ color: "var(--danger)" }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Integration Details Panel */}
      {selectedIntegration && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <div className="cardHeader">
            <div>
              <div className="cardTitle">{selectedIntegration.name}</div>
              <div className="cardSub">Integration Details</div>
            </div>
            <button className="iconBtn" onClick={() => setSelectedIntegration(null)}>
              Close
            </button>
          </div>
          <div className="detail">
            <div className="kvRow">
              <div className="k">Status</div>
              <div className="v">
                <span className="badge badge-completed">Connected</span>
              </div>
            </div>
            <div className="kvRow">
              <div className="k">Type</div>
              <div className="v">{selectedIntegration.type}</div>
            </div>
            <div className="kvRow">
              <div className="k">Last Sync</div>
              <div className="v">{new Date(selectedIntegration.lastSync).toLocaleString()}</div>
            </div>
            <div className="kvRow">
              <div className="k">Records Synced</div>
              <div className="v">{selectedIntegration.recordsSync}</div>
            </div>
          </div>
          <div style={{ padding: "16px", borderTop: "1px solid var(--line)" }}>
            <div style={{ fontWeight: 600, marginBottom: "12px" }}>Sync Settings</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" defaultChecked />
                <span>Auto-sync every hour</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" defaultChecked />
                <span>Sync customer data</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" defaultChecked />
                <span>Sync transactions</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" />
                <span>Sync inventory</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Webhooks</div>
            <div className="cardSub">Receive real-time notifications</div>
          </div>
          <button className="iconBtn">+ Add Webhook</button>
        </div>
        <div style={{ padding: "16px" }}>
          <div
            style={{
              padding: "16px",
              border: "1px solid var(--line)",
              borderRadius: "12px",
              fontFamily: "monospace",
              fontSize: "13px",
              background: "#f8fafc",
            }}
          >
            <div style={{ marginBottom: "8px", fontWeight: 600 }}>
              POST https://your-app.com/webhooks/titleapp
            </div>
            <div style={{ color: "var(--textMuted)" }}>
              Events: customer.created, deal.updated, payment.received
            </div>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">API Keys</div>
            <div className="cardSub">Programmatic access to your data</div>
          </div>
          <button className="iconBtn">Generate New Key</button>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
              Production API Key
            </div>
            <div
              style={{
                fontFamily: "monospace",
                padding: "12px",
                background: "#f8fafc",
                borderRadius: "8px",
                fontSize: "13px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>ta_prod_••••••••••••••••••••••••</span>
              <button className="iconBtn">Reveal</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>Test API Key</div>
            <div
              style={{
                fontFamily: "monospace",
                padding: "12px",
                background: "#f8fafc",
                borderRadius: "8px",
                fontSize: "13px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>ta_test_••••••••••••••••••••••••</span>
              <button className="iconBtn">Reveal</button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Integration Modal */}
      <FormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Integration"
        onSubmit={(e) => {
          e.preventDefault();
          setShowAddModal(false);
        }}
        submitLabel="Connect"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontSize: "14px", color: "var(--textMuted)", marginBottom: "8px" }}>
            Select an integration to connect
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "12px",
            }}
          >
            {availableIntegrations.map((integration) => (
              <button
                key={integration.id}
                type="button"
                style={{
                  padding: "16px",
                  border: "1px solid var(--line)",
                  borderRadius: "12px",
                  background: "white",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onClick={() => {
                  alert(`Connecting to ${integration.name}...`);
                  setShowAddModal(false);
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>{integration.name}</div>
                <div style={{ fontSize: "13px", color: "var(--textMuted)" }}>
                  {integration.type}
                </div>
              </button>
            ))}
          </div>
        </div>
      </FormModal>
    </div>
  );
}
