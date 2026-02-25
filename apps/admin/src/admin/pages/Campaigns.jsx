import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

const PLATFORM_COLORS = {
  linkedin: "#0a66c2",
  tiktok: "#000000",
  email: "#7c3aed",
  google: "#ea4335",
  facebook: "#1877f2",
};

function fmtDollars(n) {
  if (!n && n !== 0) return "--";
  return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n) {
  if (!n && n !== 0) return "--";
  return Number(n).toFixed(1) + "%";
}

function StatusBadge({ status }) {
  const map = {
    active: "ac-badge-success",
    paused: "ac-badge-warning",
    completed: "ac-badge-info",
    draft: "",
  };
  return <span className={`ac-badge ${map[status] || ""}`}>{status}</span>;
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    const q = query(collection(db, "campaigns"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setCampaigns(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const platforms = [...new Set(campaigns.map((c) => c.platform))].filter(Boolean);
  const filtered = tab === "all" ? campaigns : campaigns.filter((c) => c.platform === tab);

  // Aggregate stats
  const totalSpend = campaigns.reduce((s, c) => s + (c.budget?.spent || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.metrics?.conversions || 0), 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;

  return (
    <div>
      <div className="ac-page-header">
        <h1 className="ac-page-title">Campaigns</h1>
        <p className="ac-page-subtitle">Marketing campaigns and outreach</p>
      </div>

      <div className="ac-metrics" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Active Campaigns</div>
          <div className="ac-metric-value">{activeCampaigns}</div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Total Spend</div>
          <div className="ac-metric-value">{fmtDollars(totalSpend)}</div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Total Conversions</div>
          <div className="ac-metric-value">{totalConversions}</div>
        </div>
        <div className="ac-metric-card">
          <div className="ac-metric-label">Avg CPC</div>
          <div className="ac-metric-value">
            {fmtDollars(
              campaigns.reduce((s, c) => s + (c.metrics?.cpc || 0), 0) /
              (campaigns.filter((c) => c.metrics?.cpc).length || 1)
            )}
          </div>
        </div>
      </div>

      <div className="ac-tabs">
        <button
          className={`ac-tab ${tab === "all" ? "ac-tab-active" : ""}`}
          onClick={() => setTab("all")}
        >
          All
        </button>
        {platforms.map((p) => (
          <button
            key={p}
            className={`ac-tab ${tab === p ? "ac-tab-active" : ""}`}
            onClick={() => setTab(p)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Campaign Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
        {filtered.length === 0 && (
          <div className="ac-card">
            <div className="ac-card-body">
              <div className="ac-empty">No campaigns yet.</div>
            </div>
          </div>
        )}
        {filtered.map((campaign) => {
          const m = campaign.metrics || {};
          const b = campaign.budget || {};
          const spendPct = b.total > 0 ? Math.round((b.spent / b.total) * 100) : 0;

          return (
            <div key={campaign.id} className="ac-card">
              <div className="ac-card-header">
                <div>
                  <div className="ac-card-title">{campaign.name}</div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                    <span
                      className="ac-badge"
                      style={{
                        borderColor: PLATFORM_COLORS[campaign.platform] || "#e8ebf3",
                        color: PLATFORM_COLORS[campaign.platform] || "#64748b",
                      }}
                    >
                      {campaign.platform}
                    </span>
                    <StatusBadge status={campaign.status} />
                    {campaign.vertical && <span className="ac-badge">{campaign.vertical}</span>}
                  </div>
                </div>
              </div>
              <div className="ac-card-body">
                {/* Budget bar */}
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>
                    <span>{fmtDollars(b.spent)} spent</span>
                    <span>{fmtDollars(b.total)} budget</span>
                  </div>
                  <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "3px" }}>
                    <div style={{
                      height: "100%",
                      width: `${spendPct}%`,
                      background: spendPct > 90 ? "#ef4444" : "#7c3aed",
                      borderRadius: "3px",
                    }} />
                  </div>
                </div>

                {/* Metrics grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Impressions</div>
                    <div style={{ fontWeight: 800, fontSize: "14px" }}>{(m.impressions || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Clicks</div>
                    <div style={{ fontWeight: 800, fontSize: "14px" }}>{(m.clicks || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>CTR</div>
                    <div style={{ fontWeight: 800, fontSize: "14px" }}>{fmtPct(m.ctr)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>CPC</div>
                    <div style={{ fontWeight: 800, fontSize: "14px" }}>{fmtDollars(m.cpc)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Conversions</div>
                    <div style={{ fontWeight: 800, fontSize: "14px" }}>{m.conversions || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Daily</div>
                    <div style={{ fontWeight: 800, fontSize: "14px" }}>{fmtDollars(b.daily)}</div>
                  </div>
                </div>

                {/* Alex recommendations */}
                {campaign.alexRecommendations && campaign.alexRecommendations.length > 0 && (
                  <div style={{ marginTop: "12px", padding: "8px", background: "rgba(124,58,237,0.04)", borderRadius: "6px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#7c3aed", marginBottom: "4px" }}>Alex Recommendation</div>
                    <div style={{ fontSize: "12px", color: "#334155" }}>
                      {campaign.alexRecommendations[0]}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
