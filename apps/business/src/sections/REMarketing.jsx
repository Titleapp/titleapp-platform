import React, { useState } from "react";

const CAMPAIGNS = [
  {
    id: 1,
    name: "567 Mandarin Rd — Executive Home",
    type: "listing",
    status: "active",
    budget: 500,
    spent: 312,
    leads: 8,
    channels: [
      { name: "Zillow", status: "active", impressions: 2400, clicks: 45, leads: 3 },
      { name: "Realtor.com", status: "active", impressions: 1800, clicks: 32, leads: 2 },
      { name: "Facebook", status: "active", impressions: 5200, clicks: 89, leads: 2 },
      { name: "Yard Sign", status: "active", impressions: null, clicks: null, leads: 1 },
    ],
    startDate: "2026-02-11",
  },
  {
    id: 2,
    name: "Southside Flats Unit 3 — Vacancy",
    type: "vacancy",
    status: "active",
    budget: 200,
    spent: 145,
    leads: 3,
    channels: [
      { name: "Apartments.com", status: "active", impressions: 890, clicks: 22, leads: 1 },
      { name: "Zillow Rentals", status: "active", impressions: 1200, clicks: 34, leads: 1 },
      { name: "Facebook Marketplace", status: "active", impressions: 3100, clicks: 56, leads: 1 },
    ],
    startDate: "2026-02-05",
  },
  {
    id: 3,
    name: "Spring Open House Series",
    type: "event",
    status: "scheduled",
    budget: 300,
    spent: 0,
    leads: 0,
    channels: [
      { name: "Facebook Event", status: "scheduled", impressions: null, clicks: null, leads: 0 },
      { name: "Email Blast", status: "draft", impressions: null, clicks: null, leads: 0 },
      { name: "Direct Mail", status: "pending", impressions: null, clicks: null, leads: 0 },
    ],
    startDate: "2026-03-08",
  },
];

const CHANNEL_PERFORMANCE = [
  { channel: "Zillow", leads: 12, cost: 450, conversionRate: 4.2 },
  { channel: "Realtor.com", leads: 8, cost: 320, conversionRate: 3.1 },
  { channel: "Facebook/Instagram", leads: 15, cost: 280, conversionRate: 2.8 },
  { channel: "Google Ads", leads: 6, cost: 520, conversionRate: 1.9 },
  { channel: "Direct Mail", leads: 3, cost: 180, conversionRate: 1.2 },
  { channel: "Yard Signs", leads: 4, cost: 60, conversionRate: null },
];

const LEAD_SOURCES = [
  { source: "Zillow", count: 12, pct: 25 },
  { source: "Facebook", count: 15, pct: 31 },
  { source: "Realtor.com", count: 8, pct: 17 },
  { source: "Google", count: 6, pct: 13 },
  { source: "Referral", count: 3, pct: 6 },
  { source: "Walk-in/Sign", count: 4, pct: 8 },
];

const SOCIAL_QUEUE = [
  { id: 1, platform: "Instagram", content: "Just listed: 567 Mandarin Rd — 5BR executive home with pool", scheduledDate: "2026-02-20", status: "scheduled" },
  { id: 2, platform: "Facebook", content: "Open house this Saturday at 1247 Palm Ave — San Marco charmer", scheduledDate: "2026-02-21", status: "scheduled" },
  { id: 3, platform: "LinkedIn", content: "Market update: Jacksonville median home price up 4.2% YoY", scheduledDate: "2026-02-22", status: "draft" },
];

const TYPE_BADGES = {
  listing: { background: "#dcfce7", color: "#16a34a" },
  vacancy: { background: "#dbeafe", color: "#2563eb" },
  event: { background: "#f3e8ff", color: "#7c3aed" },
};

const STATUS_BADGES = {
  active: { background: "#dcfce7", color: "#16a34a" },
  scheduled: { background: "#fef3c7", color: "#92400e" },
  draft: { background: "#f1f5f9", color: "#64748b" },
  pending: { background: "#f1f5f9", color: "#64748b" },
};

const SOURCE_COLORS = [
  "#7c3aed", "#2563eb", "#16a34a", "#d97706", "#dc2626", "#64748b",
];

const SYNDICATION = [
  { listing: "567 Mandarin Rd", platforms: [{ name: "Zillow", active: true }, { name: "Realtor.com", active: true }, { name: "Redfin", active: true }, { name: "MLS", active: true }, { name: "Trulia", active: false }] },
  { listing: "892 Riverside Dr #4B", platforms: [{ name: "Zillow", active: true }, { name: "Realtor.com", active: true }, { name: "Redfin", active: false }, { name: "MLS", active: true }, { name: "Trulia", active: true }] },
  { listing: "7891 Baymeadows Rd", platforms: [{ name: "Zillow", active: true }, { name: "Realtor.com", active: true }, { name: "Redfin", active: true }, { name: "MLS", active: true }, { name: "Trulia", active: true }] },
  { listing: "Southside Flats Unit 3", platforms: [{ name: "Apartments.com", active: true }, { name: "Zillow Rentals", active: true }, { name: "Facebook Marketplace", active: true }, { name: "Craigslist", active: false }, { name: "HotPads", active: true }] },
];

export default function REMarketing() {
  const [expandedCampaign, setExpandedCampaign] = useState(null);

  function openChat(prompt) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: prompt } }));
  }

  const totalLeads = 48;
  const adSpendMTD = 1810;
  const costPerLead = 37.71;
  const activeCampaigns = CAMPAIGNS.filter((c) => c.status === "active").length;

  const maxChannelLeads = Math.max(...CHANNEL_PERFORMANCE.map((c) => c.leads));

  return (
    <div>
      {/* Page Header */}
      <div className="pageHeader">
        <div>
          <h1 className="h1">Marketing</h1>
          <p className="subtle">Campaign performance, lead sources, and content calendar</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            className="iconBtn"
            onClick={() => openChat("Give me a marketing performance brief. Summarize campaign ROI, top lead sources, cost per lead trends, and recommend where to reallocate ad spend for best results.")}
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
          >
            AI Marketing Brief
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpiRow" style={{ marginBottom: "20px" }}>
        <div className="card kpiCard">
          <div className="kpiLabel">Total Leads</div>
          <div className="kpiValue" style={{ color: "#7c3aed" }}>{totalLeads}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Ad Spend MTD</div>
          <div className="kpiValue" style={{ color: "#1e293b" }}>${adSpendMTD.toLocaleString()}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Cost Per Lead</div>
          <div className="kpiValue" style={{ color: "#16a34a" }}>${costPerLead.toFixed(2)}</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Active Campaigns</div>
          <div className="kpiValue" style={{ color: "#2563eb" }}>{activeCampaigns}</div>
        </div>
      </div>

      {/* Campaign Cards */}
      <div style={{ marginBottom: "24px" }}>
        <div className="cardHeader" style={{ marginBottom: "12px" }}>
          <span style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b" }}>Campaigns</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {CAMPAIGNS.map((campaign) => {
            const isExpanded = expandedCampaign === campaign.id;
            const typeBadge = TYPE_BADGES[campaign.type] || TYPE_BADGES.listing;
            const statusBadge = STATUS_BADGES[campaign.status] || STATUS_BADGES.draft;
            const budgetPct = campaign.budget > 0 ? Math.round((campaign.spent / campaign.budget) * 100) : 0;

            return (
              <div
                key={campaign.id}
                className="card"
                style={{ padding: "16px", cursor: "pointer" }}
                onClick={() => setExpandedCampaign(isExpanded ? null : campaign.id)}
              >
                {/* Campaign Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b", marginBottom: "6px" }}>
                      {campaign.name}
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        background: typeBadge.background,
                        color: typeBadge.color,
                        textTransform: "uppercase",
                      }}>
                        {campaign.type}
                      </span>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        background: statusBadge.background,
                        color: statusBadge.color,
                        textTransform: "uppercase",
                      }}>
                        {campaign.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>{campaign.leads}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>leads</div>
                  </div>
                </div>

                {/* Budget Progress Bar */}
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ color: "#64748b" }}>${campaign.spent.toLocaleString()} of ${campaign.budget.toLocaleString()} budget</span>
                    <span style={{ fontWeight: 600, color: budgetPct > 80 ? "#d97706" : "#64748b" }}>{budgetPct}%</span>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.min(budgetPct, 100)}%`,
                      height: "100%",
                      background: budgetPct > 90 ? "#dc2626" : budgetPct > 70 ? "#d97706" : "#7c3aed",
                      borderRadius: "3px",
                      transition: "width 0.3s",
                    }} />
                  </div>
                </div>

                {/* Channels Summary */}
                <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: "#94a3b8" }}>
                  <span>{campaign.channels.length} channels</span>
                  <span>Started {new Date(campaign.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>

                {/* Expanded Channel Detail */}
                {isExpanded && (
                  <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
                    <div className="tableWrap">
                      <table className="table" style={{ fontSize: "12px" }}>
                        <thead>
                          <tr>
                            <th>Channel</th>
                            <th>Status</th>
                            <th>Impressions</th>
                            <th>Clicks</th>
                            <th>Leads</th>
                          </tr>
                        </thead>
                        <tbody>
                          {campaign.channels.map((ch, idx) => {
                            const chStatus = STATUS_BADGES[ch.status] || STATUS_BADGES.draft;
                            return (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600 }}>{ch.name}</td>
                                <td>
                                  <span style={{
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    padding: "2px 6px",
                                    borderRadius: "9999px",
                                    background: chStatus.background,
                                    color: chStatus.color,
                                    textTransform: "uppercase",
                                  }}>
                                    {ch.status}
                                  </span>
                                </td>
                                <td>{ch.impressions != null ? ch.impressions.toLocaleString() : "--"}</td>
                                <td>{ch.clicks != null ? ch.clicks : "--"}</td>
                                <td style={{ fontWeight: 600 }}>{ch.leads}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Campaign AI Actions */}
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="iconBtn"
                        onClick={() => openChat(`Analyze campaign "${campaign.name}". Budget: $${campaign.budget}, spent: $${campaign.spent}, leads: ${campaign.leads}. Channels: ${campaign.channels.map((c) => c.name + " (" + c.leads + " leads)").join(", ")}. What is working, what should I change, and how can I improve cost per lead?`)}
                        style={{ padding: "6px 12px", fontSize: "12px", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
                      >
                        AI: Analyze Campaign
                      </button>
                      <button
                        className="iconBtn"
                        onClick={() => openChat(`Suggest ad copy and creative ideas for campaign "${campaign.name}". Campaign type: ${campaign.type}. Current channels: ${campaign.channels.map((c) => c.name).join(", ")}.`)}
                        style={{ padding: "6px 12px", fontSize: "12px", background: "#f1f5f9", color: "#475569", border: "none" }}
                      >
                        AI: Write Ad Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-Column: Channel Performance + Lead Sources */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        {/* Channel Performance */}
        <div className="card" style={{ padding: "16px" }}>
          <div className="cardHeader" style={{ marginBottom: "14px" }}>
            <span style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b" }}>Channel Performance</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {CHANNEL_PERFORMANCE.map((ch, idx) => {
              const barWidth = maxChannelLeads > 0 ? Math.round((ch.leads / maxChannelLeads) * 100) : 0;
              const costPerLd = ch.leads > 0 ? (ch.cost / ch.leads).toFixed(0) : "--";
              return (
                <div key={idx}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                    <span style={{ fontWeight: 600, color: "#1e293b" }}>{ch.channel}</span>
                    <span style={{ color: "#64748b" }}>
                      {ch.leads} leads -- ${ch.cost} spent -- ${costPerLd}/lead
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{
                      width: `${barWidth}%`,
                      height: "100%",
                      background: SOURCE_COLORS[idx % SOURCE_COLORS.length],
                      borderRadius: "4px",
                      transition: "width 0.3s",
                    }} />
                  </div>
                  {ch.conversionRate != null && (
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                      {ch.conversionRate}% conversion rate
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Source Attribution */}
        <div className="card" style={{ padding: "16px" }}>
          <div className="cardHeader" style={{ marginBottom: "14px" }}>
            <span style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b" }}>Lead Source Attribution</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {LEAD_SOURCES.map((src, idx) => (
              <div key={idx}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>{src.source}</span>
                  <span style={{ color: "#64748b" }}>{src.count} leads ({src.pct}%)</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{
                    width: `${src.pct}%`,
                    height: "100%",
                    background: SOURCE_COLORS[idx % SOURCE_COLORS.length],
                    borderRadius: "4px",
                    transition: "width 0.3s",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two-Column: Social Queue + Syndication */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Social Media Queue */}
        <div className="card" style={{ padding: "16px" }}>
          <div className="cardHeader" style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b" }}>Social Media Queue</span>
            <button
              className="iconBtn"
              onClick={() => openChat("Draft 3 social media posts for my real estate listings. Include one for Instagram, one for Facebook, and one market update for LinkedIn. Keep them professional and engaging.")}
              style={{ padding: "4px 10px", fontSize: "11px", background: "#f1f5f9", color: "#475569", border: "none" }}
            >
              AI: Draft Posts
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {SOCIAL_QUEUE.map((post) => {
              const postStatus = STATUS_BADGES[post.status] || STATUS_BADGES.draft;
              return (
                <div key={post.id} style={{ padding: "10px", background: "#fafafa", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>{post.platform}</span>
                    <span style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: "9999px",
                      background: postStatus.background,
                      color: postStatus.color,
                      textTransform: "uppercase",
                    }}>
                      {post.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#475569", lineHeight: 1.4, marginBottom: "4px" }}>
                    {post.content}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                    {new Date(post.scheduledDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Syndication Status */}
        <div className="card" style={{ padding: "16px" }}>
          <div className="cardHeader" style={{ marginBottom: "14px" }}>
            <span style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b" }}>Syndication Status</span>
          </div>
          <div className="tableWrap">
            <table className="table" style={{ fontSize: "12px" }}>
              <thead>
                <tr>
                  <th>Listing</th>
                  {SYNDICATION[0].platforms.map((p) => (
                    <th key={p.name} style={{ textAlign: "center" }}>{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SYNDICATION.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{row.listing}</td>
                    {row.platforms.map((p, pIdx) => (
                      <td key={pIdx} style={{ textAlign: "center" }}>
                        <span style={{
                          display: "inline-block",
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: p.active ? "#16a34a" : "#e2e8f0",
                        }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
