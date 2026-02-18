import React, { useState, useEffect } from "react";
import FormModal from "../components/FormModal";
import * as api from "../api/client";

const WALLETS = [
  { id: "titleapp", name: "TitleApp Wallet", desc: "Built-in wallet powered by Venly. Your records are stored on Polygon blockchain.", color: "#7c3aed", connected: true },
  { id: "phantom", name: "Phantom", desc: "Connect your Phantom wallet for Solana-based tokens and NFTs.", color: "#ab9ff2", connected: false },
  { id: "metamask", name: "MetaMask", desc: "Connect MetaMask for Ethereum and Polygon assets.", color: "#f6851b", connected: false },
  { id: "coinbase", name: "Coinbase Wallet", desc: "Connect Coinbase Wallet for multi-chain support.", color: "#0052ff", connected: false },
];

export default function MyWallet() {
  const [assets, setAssets] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [capTables, setCapTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("wallets");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showCapTableModal, setShowCapTableModal] = useState(false);
  const [tokenForm, setTokenForm] = useState({ name: "", symbol: "", supply: "", network: "polygon" });
  const [capForm, setCapForm] = useState({ companyName: "", totalShares: "", shareholders: [{ name: "", shares: "", percentage: "" }] });

  const vertical = "consumer";
  const jurisdiction = "GLOBAL";

  useEffect(() => { loadData(); }, [activeTab]);

  async function loadData() {
    if (activeTab === "wallets") return;
    setLoading(true);
    try {
      if (activeTab === "tokens") {
        const result = await api.getTokens({ vertical, jurisdiction });
        setTokens(result.tokens || []);
      } else if (activeTab === "captables") {
        const result = await api.getCapTables({ vertical, jurisdiction });
        setCapTables(result.capTables || []);
      } else if (activeTab === "balance") {
        const result = await api.getWalletAssets({ vertical, jurisdiction });
        setAssets(result.assets || []);
      }
    } catch (e) {
      console.error("Failed to load wallet data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleTokenSubmit(e) {
    e.preventDefault();
    try {
      await api.createToken({ vertical, jurisdiction, token: tokenForm });
      setShowTokenModal(false);
      setTokenForm({ name: "", symbol: "", supply: "", network: "polygon" });
      setActiveTab("tokens");
      await loadData();
    } catch (e) {
      console.error("Failed to create token:", e);
    }
  }

  async function handleCapTableSubmit(e) {
    e.preventDefault();
    try {
      await api.createCapTable({
        vertical, jurisdiction,
        capTable: {
          companyName: capForm.companyName,
          totalShares: parseInt(capForm.totalShares),
          shareholders: capForm.shareholders.map((s) => ({ name: s.name, shares: parseInt(s.shares), percentage: parseFloat(s.percentage) })),
        },
      });
      setShowCapTableModal(false);
      setCapForm({ companyName: "", totalShares: "", shareholders: [{ name: "", shares: "", percentage: "" }] });
      setActiveTab("captables");
      await loadData();
    } catch (e) {
      console.error("Failed to create cap table:", e);
    }
  }

  function updateShareholder(index, field, value) {
    const updated = [...capForm.shareholders];
    updated[index][field] = value;
    if (field === "shares" && capForm.totalShares) {
      updated[index].percentage = ((parseFloat(value) / parseFloat(capForm.totalShares)) * 100).toFixed(2);
    }
    setCapForm({ ...capForm, shareholders: updated });
  }

  const inputStyle = { width: "100%", padding: "10px", borderRadius: "12px", border: "1px solid var(--line)" };
  const selectStyle = { ...inputStyle, background: "white" };

  const tabs = [
    { id: "wallets", label: "Wallets" },
    { id: "balance", label: "Balance" },
    { id: "tokens", label: "Tokens" },
    { id: "captables", label: "Cap Tables" },
  ];

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">My Wallet</h1>
          <p className="subtle">Connect and manage your on-chain assets and wallets</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="iconBtn" onClick={() => setShowTokenModal(true)} style={{ background: "var(--accent)", color: "white", borderColor: "var(--accent)" }}>+ Create Token</button>
          <button className="iconBtn" onClick={() => setShowCapTableModal(true)}>+ Cap Table</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className="iconBtn"
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? "rgba(124,58,237,0.16)" : "#fff",
              borderColor: activeTab === tab.id ? "rgba(124,58,237,0.35)" : "var(--line)",
              fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Wallets Tab */}
      {activeTab === "wallets" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
          {WALLETS.map((w) => (
            <div key={w.id} className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: `${w.color}15`, border: `1px solid ${w.color}35`, display: "grid", placeItems: "center", fontWeight: 700, fontSize: "16px", color: w.color }}>
                    {w.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b" }}>{w.name}</div>
                  </div>
                </div>
                {w.connected && <span className="badge badge-completed" style={{ fontSize: "11px" }}>Connected</span>}
              </div>
              <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6", marginBottom: "14px" }}>{w.desc}</div>
              <button className="iconBtn" style={w.connected ? { opacity: 0.5, cursor: "default" } : {}}>
                {w.connected ? "Connected" : "Connect"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Balance Tab */}
      {activeTab === "balance" && (
        loading ? (
          <div className="card" style={{ padding: "24px", textAlign: "center" }}>Loading balance...</div>
        ) : assets && assets.length > 0 ? (
          <>
            <div className="card" style={{ marginBottom: "16px" }}>
              <div style={{ padding: "24px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>Total Net Worth</div>
                <div style={{ fontSize: "48px", fontWeight: 700, color: "var(--accent)" }}>
                  ${(assets.reduce((sum, a) => sum + (a.value || 0), 0)).toLocaleString()}
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
              {assets.map((asset) => (
                <div key={asset.type} className="card" style={{ padding: "20px", textAlign: "center" }}>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "6px" }}>{asset.type}</div>
                  <div style={{ fontSize: "24px", fontWeight: 700 }}>${(asset.value || 0).toLocaleString()}</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>{asset.count || 0} asset{(asset.count || 0) !== 1 ? "s" : ""}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>No assets found. Add items to your Vault to see their value here.</div>
        )
      )}

      {/* Tokens Tab */}
      {activeTab === "tokens" && (
        loading ? (
          <div className="card" style={{ padding: "24px", textAlign: "center" }}>Loading tokens...</div>
        ) : tokens.length === 0 ? (
          <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "10px" }}>No tokens yet</div>
            <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>Create your first memecoin or utility token.</div>
            <button className="iconBtn" onClick={() => setShowTokenModal(true)} style={{ background: "var(--accent)", color: "white", borderColor: "var(--accent)" }}>Create Token</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {tokens.map((token) => (
              <div key={token.id} className="card">
                <div className="cardHeader">
                  <div>
                    <div className="cardTitle">{token.name} ({token.symbol})</div>
                    <div className="cardSub">{token.network} network</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "18px" }}>{token.currentValue || "--"}</div>
                </div>
                <div className="detail">
                  <div className="kvRow"><div className="k">Total Supply</div><div className="v">{parseInt(token.supply).toLocaleString()}</div></div>
                  <div className="kvRow"><div className="k">Holders</div><div className="v">{token.holders || 0}</div></div>
                  <div className="kvRow"><div className="k">Created</div><div className="v">{new Date(token.createdAt).toLocaleDateString()}</div></div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Cap Tables Tab */}
      {activeTab === "captables" && (
        loading ? (
          <div className="card" style={{ padding: "24px", textAlign: "center" }}>Loading cap tables...</div>
        ) : capTables.length === 0 ? (
          <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "10px" }}>No cap tables yet</div>
            <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>Create a cap table to track ownership and equity.</div>
            <button className="iconBtn" onClick={() => setShowCapTableModal(true)} style={{ background: "var(--accent)", color: "white", borderColor: "var(--accent)" }}>Create Cap Table</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {capTables.map((ct) => (
              <div key={ct.id} className="card">
                <div className="cardHeader">
                  <div>
                    <div className="cardTitle">{ct.companyName}</div>
                    <div className="cardSub">{(ct.totalShares || 0).toLocaleString()} total shares</div>
                  </div>
                </div>
                {ct.shareholders && ct.shareholders.length > 0 && (
                  <div className="tableWrap">
                    <table className="table">
                      <thead><tr><th>Shareholder</th><th>Shares</th><th>%</th></tr></thead>
                      <tbody>
                        {ct.shareholders.map((sh, i) => (
                          <tr key={i}><td className="tdStrong">{sh.name}</td><td>{(sh.shares || 0).toLocaleString()}</td><td>{sh.percentage}%</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Create Token Modal */}
      <FormModal isOpen={showTokenModal} onClose={() => setShowTokenModal(false)} title="Create Token" onSubmit={handleTokenSubmit} submitLabel="Create Token">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Token Name</label><input type="text" value={tokenForm.name} onChange={(e) => setTokenForm({ ...tokenForm, name: e.target.value })} placeholder="e.g., MyFamily Coin" style={inputStyle} required /></div>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Symbol</label><input type="text" value={tokenForm.symbol} onChange={(e) => setTokenForm({ ...tokenForm, symbol: e.target.value.toUpperCase() })} placeholder="e.g., MFAM" maxLength={5} style={inputStyle} required /></div>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Total Supply</label><input type="number" value={tokenForm.supply} onChange={(e) => setTokenForm({ ...tokenForm, supply: e.target.value })} placeholder="e.g., 1000000" style={inputStyle} required /></div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Network</label>
            <select value={tokenForm.network} onChange={(e) => setTokenForm({ ...tokenForm, network: e.target.value })} style={selectStyle}>
              <option value="polygon">Polygon</option><option value="ethereum">Ethereum</option><option value="base">Base</option><option value="solana">Solana</option>
            </select>
          </div>
        </div>
      </FormModal>

      {/* Create Cap Table Modal */}
      <FormModal isOpen={showCapTableModal} onClose={() => setShowCapTableModal(false)} title="Create Cap Table" onSubmit={handleCapTableSubmit} submitLabel="Create Cap Table">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Company Name</label><input type="text" value={capForm.companyName} onChange={(e) => setCapForm({ ...capForm, companyName: e.target.value })} placeholder="e.g., Smith Family LLC" style={inputStyle} required /></div>
          <div><label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Total Shares</label><input type="number" value={capForm.totalShares} onChange={(e) => setCapForm({ ...capForm, totalShares: e.target.value })} placeholder="e.g., 10000" style={inputStyle} required /></div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "13px" }}>Shareholders</div>
            {capForm.shareholders.map((sh, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input type="text" placeholder="Name" value={sh.name} onChange={(e) => updateShareholder(i, "name", e.target.value)} style={{ ...inputStyle, flex: 2 }} required />
                <input type="number" placeholder="Shares" value={sh.shares} onChange={(e) => updateShareholder(i, "shares", e.target.value)} style={{ ...inputStyle, flex: 1 }} required />
                <input type="text" placeholder="%" value={sh.percentage} readOnly style={{ ...inputStyle, width: "60px", background: "#f8fafc" }} />
                {capForm.shareholders.length > 1 && (
                  <button type="button" className="iconBtn" onClick={() => setCapForm({ ...capForm, shareholders: capForm.shareholders.filter((_, idx) => idx !== i) })} style={{ color: "var(--danger)" }}>x</button>
                )}
              </div>
            ))}
            <button type="button" className="iconBtn" onClick={() => setCapForm({ ...capForm, shareholders: [...capForm.shareholders, { name: "", shares: "", percentage: "" }] })} style={{ marginTop: "4px" }}>+ Add Shareholder</button>
          </div>
        </div>
      </FormModal>
    </div>
  );
}
