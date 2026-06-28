/**
 * EmailCampaignCard.jsx — Email campaign canvas card (44.9)
 * Signal: card:marketing-email
 * Data source: conversation context
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";
import CanvasFallbackView from "./CanvasFallbackView";

const S = {
  campaign: { padding: "12px 0", borderBottom: "1px solid #f1f5f9" },
  subject: { fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 4 },
  preview: { fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 8 },
  body: { fontSize: 12, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap", background: "#f8fafc", borderRadius: 6, padding: "8px 10px", marginBottom: 8 },
  smsRow: { display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 8, background: "#f0fdf4", borderRadius: 6, padding: "8px 10px" },
  smsLabel: { fontSize: 10, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0, marginTop: 2 },
  smsText: { fontSize: 12, color: "#374151", lineHeight: 1.5 },
  stats: { display: "flex", gap: 12, flexWrap: "wrap" },
  stat: { display: "flex", flexDirection: "column", alignItems: "center", minWidth: 48 },
  statVal: { fontSize: 14, fontWeight: 700, color: "#1e293b" },
  statLabel: { fontSize: 10, color: "#9ca3af" },
  badge: { fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, marginBottom: 6 },
  draft: { background: "#fefce8", color: "#a16207" },
  sent: { background: "#dcfce7", color: "#166534" },
  scheduled: { background: "#e0e7ff", color: "#4338ca" },
};

function statusBadge(status) {
  if (status === "sent") return S.sent;
  if (status === "scheduled") return S.scheduled;
  return S.draft;
}

export default function EmailCampaignCard({ resolved, context, onDismiss }) {
  // 49.31 — payload-first.
  const payload = context?.payload;
  const campaigns = (payload && (Array.isArray(payload) ? payload : (payload.campaigns || payload.emailCampaigns))) || context?.emailCampaigns || null;

  const hasCampaigns = campaigns && campaigns.length > 0;

  return (
    <CanvasCardShell
      title="Email Campaigns"
      emptyPrompt={resolved?.emptyPrompt || "Ask Alex about your email campaigns to see them here."}
      onDismiss={onDismiss}
    >
      {hasCampaigns
        ? campaigns.map((c, i) => (
            <div key={i} style={S.campaign}>
              <span style={{ ...S.badge, ...statusBadge(c.status) }}>{c.status || "draft"}</span>
              <div style={S.subject}>{c.subject || `Campaign ${i + 1}`}</div>
              {c.preview && !c.body && <div style={S.preview}>{c.preview}</div>}
              {c.body && <div style={S.body}>{c.body}</div>}
              {c.smsVersion && (
                <div style={S.smsRow}>
                  <span style={S.smsLabel}>SMS</span>
                  <span style={S.smsText}>{c.smsVersion}</span>
                </div>
              )}
              {(c.recipients != null || c.openRate != null || c.clickRate != null) && (
                <div style={S.stats}>
                  {c.recipients != null && <div style={S.stat}><span style={S.statVal}>{Number(c.recipients).toLocaleString()}</span><span style={S.statLabel}>Recipients</span></div>}
                  {c.openRate != null && <div style={S.stat}><span style={S.statVal}>{c.openRate}%</span><span style={S.statLabel}>Open rate</span></div>}
                  {c.clickRate != null && <div style={S.stat}><span style={S.statVal}>{c.clickRate}%</span><span style={S.statLabel}>Click rate</span></div>}
                </div>
              )}
            </div>
          ))
        : <CanvasFallbackView payload={payload} context={context} />}
    </CanvasCardShell>
  );
}
