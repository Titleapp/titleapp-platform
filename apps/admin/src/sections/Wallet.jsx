import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import * as api from "../api/client";

/**
 * Wallet - Personal vault with memecoin and cap table creator
 */
export default function Wallet() {
  const [assets, setAssets] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [capTables, setCapTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showCapTableModal, setShowCapTableModal] = useState(false);
  const [activeTab, setActiveTab] = useState("balance");
  const [tokenFormData, setTokenFormData] = useState({
    name: "",
    symbol: "",
    supply: "",
    network: "polygon",
  });
  const [capTableFormData, setCapTableFormData] = useState({
    companyName: "",
    totalShares: "",
    shareholders: [{ name: "", shares: "", percentage: "" }],
  });

  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "IL";

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "balance") {
        const result = await api.getWalletAssets({ vertical, jurisdiction });
        setAssets(result.assets);
      } else if (activeTab === "tokens") {
        const result = await api.getTokens({ vertical, jurisdiction });
        setTokens(result.tokens || []);
      } else if (activeTab === "captables") {
        const result = await api.getCapTables({ vertical, jurisdiction });
        setCapTables(result.capTables || []);
      }
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to load wallet data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleTokenSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createToken({
        vertical,
        jurisdiction,
        token: tokenFormData,
      });
      setShowTokenModal(false);
      setTokenFormData({ name: "", symbol: "", supply: "", network: "polygon" });
      await loadData();
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to create token:", e);
    }
  }

  async function handleCapTableSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createCapTable({
        vertical,
        jurisdiction,
        capTable: {
          companyName: capTableFormData.companyName,
          totalShares: parseInt(capTableFormData.totalShares),
          shareholders: capTableFormData.shareholders.map(s => ({
            name: s.name,
            shares: parseInt(s.shares),
            percentage: parseFloat(s.percentage),
          })),
        },
      });
      setShowCapTableModal(false);
      setCapTableFormData({
        companyName: "",
        totalShares: "",
        shareholders: [{ name: "", shares: "", percentage: "" }],
      });
      await loadData();
    } catch (e) {
      setError(e?.message || String(e));
      console.error("Failed to create cap table:", e);
    }
  }

  function addShareholder() {
    setCapTableFormData({
      ...capTableFormData,
      shareholders: [
        ...capTableFormData.shareholders,
        { name: "", shares: "", percentage: "" },
      ],
    });
  }

  function updateShareholder(index, field, value) {
    const updated = [...capTableFormData.shareholders];
    updated[index][field] = value;

    // Auto-calculate percentage if shares are entered
    if (field === "shares" && capTableFormData.totalShares) {
      const percentage = ((parseFloat(value) / parseFloat(capTableFormData.totalShares)) * 100).toFixed(2);
      updated[index].percentage = percentage;
    }

    setCapTableFormData({ ...capTableFormData, shareholders: updated });
  }

  function removeShareholder(index) {
    setCapTableFormData({
      ...capTableFormData,
      shareholders: capTableFormData.shareholders.filter((_, i) => i !== index),
    });
  }

  const totalValue = assets.reduce((sum, a) => sum + a.value, 0);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">Wallet</h1>
          <p className="subtle">Personal vault with memecoin and cap table creator</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="iconBtn"
            onClick={() => setShowTokenModal(true)}
            style={{
              background: "var(--accent)",
              color: "white",
              borderColor: "var(--accent)",
            }}
          >
            + Create Token
          </button>
          <button className="iconBtn" onClick={() => setShowCapTableModal(true)}>
            + Cap Table
          </button>
        </div>
      </div>

      {/* Total Value */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ padding: "24px", textAlign: "center" }}>
          <div style={{ fontSize: "13px", color: "var(--textMuted)", marginBottom: "8px" }}>
            Total Net Worth
          </div>
          <div style={{ fontSize: "48px", fontWeight: 700, color: "var(--accent)" }}>
            ${totalValue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button
          className={`iconBtn ${activeTab === "balance" ? "navItemActive" : ""}`}
          onClick={() => setActiveTab("balance")}
          style={{
            background: activeTab === "balance" ? "rgba(124,58,237,0.16)" : "#fff",
            borderColor: activeTab === "balance" ? "rgba(124,58,237,0.35)" : "var(--line)",
          }}
        >
          Balance Sheet
        </button>
        <button
          className={`iconBtn ${activeTab === "tokens" ? "navItemActive" : ""}`}
          onClick={() => setActiveTab("tokens")}
          style={{
            background: activeTab === "tokens" ? "rgba(124,58,237,0.16)" : "#fff",
            borderColor: activeTab === "tokens" ? "rgba(124,58,237,0.35)" : "var(--line)",
          }}
        >
          Tokens ({tokens.length})
        </button>
        <button
          className={`iconBtn ${activeTab === "captables" ? "navItemActive" : ""}`}
          onClick={() => setActiveTab("captables")}
          style={{
            background: activeTab === "captables" ? "rgba(124,58,237,0.16)" : "#fff",
            borderColor: activeTab === "captables" ? "rgba(124,58,237,0.35)" : "var(--line)",
          }}
        >
          Cap Tables ({capTables.length})
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card">
          <div className="empty">Loading wallet...</div>
        </div>
      )}

      {/* Balance Sheet Tab */}
      {!loading && activeTab === "balance" && (
        <div className="kpiRow">
          {assets.map((asset) => (
            <div key={asset.type} className="card kpiCard">
              <div className="kpiLabel">{asset.type}</div>
              <div className="kpiValue">${asset.value.toLocaleString()}</div>
              <div className="kpiChange">{asset.count} asset{asset.count !== 1 ? "s" : ""}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tokens Tab */}
      {!loading && activeTab === "tokens" && (
        <div>
          {tokens.length === 0 ? (
            <div className="card">
              <div className="empty">
                <p>No tokens created yet.</p>
                <p style={{ marginTop: "8px" }}>
                  <button
                    className="iconBtn"
                    onClick={() => setShowTokenModal(true)}
                    style={{
                      background: "var(--accent)",
                      color: "white",
                      borderColor: "var(--accent)",
                    }}
                  >
                    Create your first token
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {tokens.map((token) => (
                <div key={token.id} className="card">
                  <div className="cardHeader">
                    <div>
                      <div className="cardTitle">
                        {token.name} ({token.symbol})
                      </div>
                      <div className="cardSub">{token.network} network</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "18px" }}>{token.currentValue}</div>
                  </div>
                  <div className="detail">
                    <div className="kvRow">
                      <div className="k">Total Supply</div>
                      <div className="v">{parseInt(token.supply).toLocaleString()}</div>
                    </div>
                    <div className="kvRow">
                      <div className="k">Holders</div>
                      <div className="v">{token.holders}</div>
                    </div>
                    <div className="kvRow">
                      <div className="k">Created</div>
                      <div className="v">{new Date(token.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div style={{ padding: "16px", borderTop: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="iconBtn" style={{ flex: 1 }}>
                        View Details
                      </button>
                      <button className="iconBtn" style={{ flex: 1 }}>
                        Send
                      </button>
                      <button className="iconBtn" style={{ flex: 1 }}>
                        Burn
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cap Tables Tab */}
      {!loading && activeTab === "captables" && (
        <div>
          {capTables.length === 0 ? (
            <div className="card">
              <div className="empty">
                <p>No cap tables created yet.</p>
                <p style={{ marginTop: "8px" }}>
                  <button
                    className="iconBtn"
                    onClick={() => setShowCapTableModal(true)}
                    style={{
                      background: "var(--accent)",
                      color: "white",
                      borderColor: "var(--accent)",
                    }}
                  >
                    Create your first cap table
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {capTables.map((capTable) => (
                <div key={capTable.id} className="card">
                  <div className="cardHeader">
                    <div>
                      <div className="cardTitle">{capTable.companyName}</div>
                      <div className="cardSub">
                        {capTable.totalShares.toLocaleString()} total shares
                      </div>
                    </div>
                  </div>
                  <div className="tableWrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Shareholder</th>
                          <th>Shares</th>
                          <th>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {capTable.shareholders.map((sh, i) => (
                          <tr key={i}>
                            <td className="tdStrong">{sh.name}</td>
                            <td>{sh.shares.toLocaleString()}</td>
                            <td>{sh.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding: "16px", borderTop: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="iconBtn" style={{ flex: 1 }}>
                        Edit
                      </button>
                      <button className="iconBtn" style={{ flex: 1 }}>
                        Export
                      </button>
                      <button className="iconBtn" style={{ flex: 1 }}>
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Token Modal */}
      <FormModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        title="Create Memecoin"
        onSubmit={handleTokenSubmit}
        submitLabel="Create Token"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Token Name *
            </label>
            <input
              type="text"
              placeholder="e.g., MyFamily Coin"
              value={tokenFormData.name}
              onChange={(e) => setTokenFormData({ ...tokenFormData, name: e.target.value })}
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
              Symbol *
            </label>
            <input
              type="text"
              placeholder="e.g., MFAM (3-5 characters)"
              value={tokenFormData.symbol}
              onChange={(e) =>
                setTokenFormData({ ...tokenFormData, symbol: e.target.value.toUpperCase() })
              }
              maxLength={5}
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
              Total Supply *
            </label>
            <input
              type="number"
              placeholder="e.g., 1000000"
              value={tokenFormData.supply}
              onChange={(e) => setTokenFormData({ ...tokenFormData, supply: e.target.value })}
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
              Network *
            </label>
            <select
              value={tokenFormData.network}
              onChange={(e) => setTokenFormData({ ...tokenFormData, network: e.target.value })}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "12px",
                border: "1px solid var(--line)",
              }}
              required
            >
              <option value="polygon">Polygon</option>
              <option value="ethereum">Ethereum</option>
              <option value="base">Base</option>
              <option value="solana">Solana</option>
            </select>
          </div>
        </div>
      </FormModal>

      {/* Create Cap Table Modal */}
      <FormModal
        isOpen={showCapTableModal}
        onClose={() => setShowCapTableModal(false)}
        title="Create Cap Table"
        onSubmit={handleCapTableSubmit}
        submitLabel="Create Cap Table"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
              Company Name *
            </label>
            <input
              type="text"
              placeholder="e.g., Smith Family LLC"
              value={capTableFormData.companyName}
              onChange={(e) =>
                setCapTableFormData({ ...capTableFormData, companyName: e.target.value })
              }
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
              Total Shares *
            </label>
            <input
              type="number"
              placeholder="e.g., 10000"
              value={capTableFormData.totalShares}
              onChange={(e) =>
                setCapTableFormData({ ...capTableFormData, totalShares: e.target.value })
              }
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
            <div style={{ fontWeight: 600, marginBottom: "8px" }}>Shareholders *</div>
            {capTableFormData.shareholders.map((sh, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: "8px",
                  alignItems: "flex-start",
                }}
              >
                <input
                  type="text"
                  placeholder="Name"
                  value={sh.name}
                  onChange={(e) => updateShareholder(index, "name", e.target.value)}
                  style={{
                    flex: 2,
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                  required
                />
                <input
                  type="number"
                  placeholder="Shares"
                  value={sh.shares}
                  onChange={(e) => updateShareholder(index, "shares", e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                  }}
                  required
                />
                <input
                  type="text"
                  placeholder="%"
                  value={sh.percentage}
                  readOnly
                  style={{
                    width: "60px",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "1px solid var(--line)",
                    background: "#f8fafc",
                  }}
                />
                {capTableFormData.shareholders.length > 1 && (
                  <button
                    type="button"
                    className="iconBtn"
                    onClick={() => removeShareholder(index)}
                    style={{ color: "var(--danger)" }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="iconBtn"
              onClick={addShareholder}
              style={{ marginTop: "8px" }}
            >
              + Add Shareholder
            </button>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
