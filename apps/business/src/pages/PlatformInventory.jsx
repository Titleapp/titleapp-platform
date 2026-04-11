import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const STATUS_COLORS = {
  live: { bg: "#DCFCE7", fg: "#166534", label: "Live" },
  development: { bg: "#FEF3C7", fg: "#92400E", label: "In Dev" },
  waitlist: { bg: "#E0E7FF", fg: "#3730A3", label: "Waitlist" },
  deprecated: { bg: "#FEE2E2", fg: "#991B1B", label: "Deprecated" },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.development;
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: c.bg, color: c.fg }}>
      {c.label}
    </span>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "20px 24px", border: "1px solid #E2E8F0", flex: "1 1 200px", minWidth: 160 }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function PlatformInventory() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("workers");
  const [expandedVertical, setExpandedVertical] = useState(null);
  const [tokenInput, setTokenInput] = useState("");
  const [needsToken, setNeedsToken] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const investorToken = urlParams.get("token");

  async function fetchInventory(token) {
    setLoading(true);
    setError(null);
    try {
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
      const headers = {};
      const idToken = localStorage.getItem("ID_TOKEN");
      if (idToken) headers.Authorization = `Bearer ${idToken}`;

      const res = await fetch(`${API_BASE}/api?path=/v1/inventory:data${tokenParam}`, { headers });
      const json = await res.json();
      if (!json.ok) {
        if (res.status === 401) {
          setNeedsToken(true);
          setLoading(false);
          return;
        }
        throw new Error(json.error || "Failed to load");
      }
      setData(json);
      setNeedsToken(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInventory(investorToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTokenSubmit(e) {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    const url = new URL(window.location.href);
    url.searchParams.set("token", tokenInput.trim());
    window.history.replaceState({}, "", url.toString());
    fetchInventory(tokenInput.trim());
  }

  async function handleExport() {
    const tokenParam = investorToken ? `&token=${encodeURIComponent(investorToken)}` : "";
    const headers = {};
    const idToken = localStorage.getItem("ID_TOKEN");
    if (idToken) headers.Authorization = `Bearer ${idToken}`;

    try {
      const res = await fetch(`${API_BASE}/api?path=/v1/inventory:snapshot${tokenParam}`, { headers });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e) {
      alert("Failed to generate PDF: " + e.message);
    }
  }

  // Token input screen
  if (needsToken) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D1B2A", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#A78BFA", letterSpacing: 2, marginBottom: 24 }}>TITLEAPP</div>
          <div style={{ fontSize: 16, color: "#E2E8F0", marginBottom: 24 }}>Platform Inventory</div>
          <form onSubmit={handleTokenSubmit}>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Enter access token"
              autoFocus
              style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid #334155", background: "#1E293B", color: "#E2E8F0", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
            />
            <button type="submit" style={{ width: "100%", padding: "12px 24px", background: "#6B46C1", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Access Inventory
            </button>
          </form>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 16 }}>Authorized access only. Contact team@titleapp.ai for credentials.</div>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FC" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#6B46C1", marginBottom: 16 }}>TitleApp</div>
          <div style={{ fontSize: 16, color: "#64748B" }}>Loading inventory...</div>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FC" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#6B46C1", marginBottom: 12 }}>TitleApp</div>
          <div style={{ fontSize: 14, color: "#DC2626" }}>{error}</div>
          <button onClick={() => fetchInventory(investorToken)} style={{ marginTop: 16, padding: "10px 24px", background: "#6B46C1", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, verticals, integrations, recentChanges } = data;
  const isInvestor = data.accessSource === "investor";
  const tabs = isInvestor
    ? [{ id: "workers", label: "Workers" }, { id: "integrations", label: "Integrations" }]
    : [{ id: "workers", label: "Workers" }, { id: "integrations", label: "Integrations" }, { id: "changes", label: "Recent Changes" }];

  return (
    <div style={{ minHeight: "100vh", background: "#F8F9FC", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#1a1a2e" }}>
      {/* Header */}
      <div style={{ background: "#0D1B2A", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#A78BFA", letterSpacing: 2 }}>TITLEAPP</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#E2E8F0", marginTop: 2 }}>Platform Inventory</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 12, color: "#64748B" }}>
            Updated {summary.lastUpdated ? new Date(summary.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "now"}
          </div>
          <button onClick={handleExport} style={{ padding: "8px 16px", background: "#6B46C1", color: "white", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ padding: "24px 32px 0", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <MetricCard label="Live Workers" value={summary.liveWorkers} sub={isInvestor ? undefined : `${summary.developmentWorkers} in development`} />
        {!isInvestor && <MetricCard label="Total Workers" value={summary.totalWorkers} />}
        <MetricCard label="Verticals" value={summary.totalVerticals} />
        <MetricCard label="API Integrations" value={summary.totalIntegrations} />
      </div>

      {/* Tabs */}
      <div style={{ padding: "24px 32px 0", display: "flex", gap: 0, borderBottom: "1px solid #E2E8F0" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "10px 20px",
              background: "none",
              border: "none",
              borderBottom: activeTab === t.id ? "2px solid #6B46C1" : "2px solid transparent",
              color: activeTab === t.id ? "#6B46C1" : "#64748B",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: "24px 32px 48px" }}>
        {activeTab === "workers" && (
          <div>
            {verticals?.map((v) => (
              <div key={v.key} style={{ background: "#FFFFFF", borderRadius: 10, border: "1px solid #E2E8F0", marginBottom: 12, overflow: "hidden" }}>
                <button
                  onClick={() => setExpandedVertical(expandedVertical === v.key ? null : v.key)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                >
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>{v.name}</span>
                    <span style={{ fontSize: 13, color: "#64748B", marginLeft: 12 }}>{v.live} live{!isInvestor && v.total > v.live ? ` / ${v.total} total` : ""}</span>
                  </div>
                  <span style={{ fontSize: 14, color: "#94A3B8", transform: expandedVertical === v.key ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>&rsaquo;</span>
                </button>
                {expandedVertical === v.key && v.workers && (
                  <div style={{ padding: "0 20px 14px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
                      {v.workers.map((w) => (
                        <div key={w.slug} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 6, background: "#F8FAFC" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{w.name}</div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}>{w.suite}{w.price && w.price !== "FREE" ? ` · ${w.price}` : ""}</div>
                          </div>
                          <StatusBadge status={w.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "integrations" && integrations && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {integrations.categories?.map((cat) => (
              <div key={cat.name} style={{ background: "#FFFFFF", borderRadius: 10, border: "1px solid #E2E8F0", padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{cat.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#6B46C1", background: "#F3F0FF", padding: "2px 8px", borderRadius: 999 }}>{cat.count}</span>
                </div>
                {cat.connectors?.map((c) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #F1F5F9" }}>
                    <span style={{ fontSize: 13, color: "#334155" }}>{c.label}</span>
                    <span style={{ fontSize: 11, color: c.tier === "Free" ? "#16A34A" : "#6B46C1", fontWeight: 600 }}>{c.tier}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {activeTab === "changes" && recentChanges && (
          <div style={{ background: "#FFFFFF", borderRadius: 10, border: "1px solid #E2E8F0" }}>
            {recentChanges.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>No recent changes</div>
            ) : (
              recentChanges.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < recentChanges.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: c.eventType === "worker_approved" ? "#16A34A" : c.eventType === "worker_deprecated" ? "#EAB308" : "#94A3B8", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
                      {c.eventType === "worker_approved" ? "Worker approved" : c.eventType === "worker_deprecated" ? "Worker deprecated" : c.eventType}
                    </span>
                    <span style={{ fontSize: 13, color: "#64748B", marginLeft: 8 }}>{c.workerName || c.workerId}</span>
                    {c.vertical && <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8 }}>({c.vertical})</span>}
                  </div>
                  {c.timestamp && <span style={{ fontSize: 11, color: "#94A3B8", flexShrink: 0 }}>{new Date(c.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
