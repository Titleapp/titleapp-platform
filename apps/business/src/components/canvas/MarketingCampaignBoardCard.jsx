/**
 * MarketingCampaignBoardCard.jsx — visual, picture-first marketing board.
 * Signal: card:marketing-board   Data: live (buildMarketingPayload → /marketing:campaigns)
 *
 * The Trump Rule for marketing: you should SEE what's winning at a glance —
 * KPI tiles with up/down arrows, a spotlight on the winning campaign, and a
 * ranked board where each campaign shows its creative, a CTR bar, and a 7-day
 * sparkline. payload.view selects overview | campaigns | creative.
 */

import React from "react";
import CanvasCardShell from "./CanvasCardShell";

// Channel → tasteful gradient + glyph (refined, not loud — "Switzerland not Disneyland").
const CHANNEL = {
  email:     { g: "linear-gradient(135deg,#6366f1,#8b5cf6)", label: "Email" },
  instagram: { g: "linear-gradient(135deg,#f472b6,#fb7185)", label: "Instagram" },
  facebook:  { g: "linear-gradient(135deg,#3b82f6,#2563eb)", label: "Facebook" },
  google:    { g: "linear-gradient(135deg,#10b981,#059669)", label: "Google" },
  tiktok:    { g: "linear-gradient(135deg,#0f172a,#334155)", label: "TikTok" },
  default:   { g: "linear-gradient(135deg,#94a3b8,#64748b)", label: "Channel" },
};
const ch = (c) => CHANNEL[String(c || "").toLowerCase()] || CHANNEL.default;

function fmt(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
function money(n) {
  if (n == null) return "—";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}

// Tiny inline sparkline (no chart lib) — 7-ish points, area fill.
function Sparkline({ data = [], color = "#7c3aed" }) {
  if (!data.length) return null;
  const w = 96, h = 28, max = Math.max(...data, 1), min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - ((v - min) / span) * h]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <path d={area} fill={color} opacity={0.10} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Delta({ v }) {
  if (v == null) return null;
  const up = v >= 0;
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: up ? "#16a34a" : "#dc2626", marginLeft: 6 }}>
      {up ? "▲" : "▼"} {Math.abs(v)}%
    </span>
  );
}

function Thumb({ campaign, size = 56 }) {
  const c = ch(campaign.channel);
  const initials = (campaign.name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  if (campaign.imageUrl) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 10, flexShrink: 0,
        backgroundImage: `url("${campaign.imageUrl}")`, backgroundSize: "cover", backgroundPosition: "center",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
      }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, background: campaign.gradient || c.g,
      flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 800, fontSize: size * 0.32, letterSpacing: 0.5,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
    }}>{initials}</div>
  );
}

function CampaignRow({ c }) {
  const ctr = c.ctr != null ? c.ctr : (c.impressions ? (c.clicks / c.impressions) * 100 : 0);
  const barPct = Math.min(100, (ctr / 6) * 100); // 6% CTR = full bar
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "12px 0",
      borderBottom: "1px solid #f1f5f9",
    }}>
      <Thumb campaign={c} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{c.name}</span>
          {c.winning && <span style={{ fontSize: 11 }}>🏆</span>}
          <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b", background: "#f1f5f9", padding: "1px 7px", borderRadius: 20 }}>{ch(c.channel).label}</span>
        </div>
        {c.headline && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.headline}</div>}
        <div style={{ height: 5, background: "#f1f5f9", borderRadius: 4, marginTop: 7, overflow: "hidden" }}>
          <div style={{ width: `${barPct}%`, height: "100%", background: ctr >= 3 ? "#16a34a" : "#7c3aed", borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ textAlign: "right", width: 64 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{ctr.toFixed(1)}%</div>
        <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 }}>CTR</div>
      </div>
      <div style={{ textAlign: "right", width: 64 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{fmt(c.conversions)}</div>
        <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 }}>Leads</div>
      </div>
      <Sparkline data={c.trend} color={ch(c.channel).g.includes("#16") || ctr >= 3 ? "#16a34a" : "#7c3aed"} />
    </div>
  );
}

export default function MarketingCampaignBoardCard({ resolved, context, onDismiss }) {
  const p = context?.payload || {};
  const view = p.view || "overview";
  const campaigns = Array.isArray(p.campaigns) ? p.campaigns : [];
  const kpis = Array.isArray(p.kpis) ? p.kpis : [];
  const winner = p.winner || campaigns.find(c => c.winning) || campaigns[0];

  return (
    <CanvasCardShell title={p.title || "Marketing"} emptyPrompt={resolved?.emptyPrompt} onDismiss={onDismiss}>
      {/* KPI tiles with up/down arrows */}
      {view === "overview" && kpis.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)},1fr)`, gap: 12, marginBottom: 18 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{k.label}</div>
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{k.value}</span>
                <Delta v={k.delta} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Winning campaign spotlight — Trump Rule: image-first when creative exists */}
      {view === "overview" && winner && (
        winner.imageUrl ? (
          // Full-width creative hero when real image is available
          <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 18, position: "relative" }}>
            <div style={{
              height: 190, position: "relative",
              backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.08) 55%), url("${winner.imageUrl}")`,
              backgroundSize: "cover", backgroundPosition: "center",
            }}>
              <div style={{ position: "absolute", inset: 0, padding: "16px 18px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>🏆 Winning campaign</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 8, textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}>{winner.headline || winner.name}</div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div><span style={{ fontSize: 20, fontWeight: 800, color: "#4ade80" }}>{(winner.ctr ?? 0).toFixed(1)}%</span><span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginLeft: 4, textTransform: "uppercase" }}>CTR</span></div>
                  <div><span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{fmt(winner.conversions)}</span><span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginLeft: 4, textTransform: "uppercase" }}>Leads</span></div>
                  {winner.roi != null && <div><span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{winner.roi}x</span><span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginLeft: 4, textTransform: "uppercase" }}>ROI</span></div>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Compact spotlight when no image
          <div style={{ display: "flex", gap: 16, alignItems: "center", padding: 16, borderRadius: 14, marginBottom: 18,
            background: "linear-gradient(135deg,#faf5ff,#eff6ff)", border: "1px solid #ede9fe" }}>
            <Thumb campaign={winner} size={76} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5 }}>🏆 Winning campaign</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", margin: "2px 0" }}>{winner.name}</div>
              {winner.headline && <div style={{ fontSize: 13, color: "#64748b" }}>{winner.headline}</div>}
            </div>
            <div style={{ display: "flex", gap: 20, textAlign: "center" }}>
              <div><div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a" }}>{(winner.ctr ?? 0).toFixed(1)}%</div><div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>CTR</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{fmt(winner.conversions)}</div><div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>Leads</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{winner.roi != null ? `${winner.roi}x` : "—"}</div><div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>ROI</div></div>
            </div>
          </div>
        )
      )}

      {/* Creative gallery */}
      {view === "creative" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
          {campaigns.map((c, i) => (
            <div key={i} style={{ border: "1px solid #f1f5f9", borderRadius: 12, overflow: "hidden" }}>
              <div style={{
                height: 140, position: "relative", display: "flex", alignItems: "flex-end", padding: 14,
                ...(c.imageUrl
                  ? { backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 55%), url("${c.imageUrl}")`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: c.gradient || ch(c.channel).g, alignItems: "center", justifyContent: "center" }),
              }}>
                <div style={{ color: "#fff", fontSize: 15, fontWeight: 800, textAlign: c.imageUrl ? "left" : "center", lineHeight: 1.25, textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}>{c.headline || c.name}</div>
              </div>
              <div style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{c.name}{c.winning ? " 🏆" : ""}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: (c.ctr ?? 0) >= 3 ? "#16a34a" : "#7c3aed" }}>{(c.ctr ?? 0).toFixed(1)}% CTR</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>
            {view === "overview" ? "Top campaigns" : "All campaigns"} · by performance
          </div>
          {(view === "overview" ? campaigns.slice(0, 5) : campaigns).map((c, i) => <CampaignRow key={c.id || i} c={c} />)}
        </>
      )}
    </CanvasCardShell>
  );
}
