/**
 * BriefStalenessBanner.jsx — persistent brief-age indicator, per CODEX 64:
 *
 *   ┌─────────────────────────────────┐
 *   │ BRIEF DOWNLOADED 0815Z          │
 *   │ Live updates unavailable        │
 *   │ Check NOTAMs when online        │
 *   └─────────────────────────────────┘
 *
 * "Color: WHITE normally, YELLOW if brief is > 2 hours old, RED if > 4
 * hours old." Two variants:
 *   - "banner": full-width, top-of-screen, for backup instrument mode
 *     ("cannot be dismissed during flight").
 *   - "inline": compact chip for the cockpit view's right-pane header
 *     ("BRIEF: 0815Z 🟢 (+0:22)").
 */
import React, { useEffect, useState } from "react";

function zTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}Z`;
}

function elapsedLabel(ts, now) {
  if (!ts) return "—";
  const mins = Math.max(0, Math.round((now - ts) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `+${h}:${String(m).padStart(2, "0")}`;
}

function ageBand(ts, now) {
  if (!ts) return "unknown";
  const hrs = (now - ts) / 3600000;
  if (hrs > 4) return "red";
  if (hrs > 2) return "yellow";
  return "white";
}

const COLORS = {
  white: { bg: "rgba(15,23,42,0.85)", border: "rgba(255,255,255,0.2)", fg: "#e2e8f0", dot: "⚪" },
  yellow: { bg: "rgba(113,63,18,0.9)", border: "#f59e0b", fg: "#fde68a", dot: "🟡" },
  red: { bg: "rgba(127,29,29,0.92)", border: "#ef4444", fg: "#fecaca", dot: "🔴" },
  unknown: { bg: "rgba(15,23,42,0.85)", border: "rgba(255,255,255,0.2)", fg: "#94a3b8", dot: "⚪" },
};

export default function BriefStalenessBanner({ loadedAt, variant = "inline" }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const band = ageBand(loadedAt, now);
  const c = COLORS[band];

  if (variant === "banner") {
    return (
      <div style={{
        width: "100%", padding: "8px 14px", background: c.bg, border: `1px solid ${c.border}`,
        color: c.fg, fontFamily: "monospace", fontSize: 13, lineHeight: 1.5, textAlign: "center",
      }}>
        <div style={{ fontWeight: 700 }}>{c.dot} BRIEF DOWNLOADED {zTime(loadedAt)}</div>
        <div style={{ fontSize: 11, opacity: 0.9 }}>Live updates unavailable{loadedAt ? "" : " — no brief downloaded this session"}</div>
        <div style={{ fontSize: 11, opacity: 0.9 }}>Check NOTAMs when online</div>
      </div>
    );
  }

  return (
    <div
      title="Time since weather/NOTAM data was last refreshed"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "3px 9px", borderRadius: 8, background: c.bg, border: `1px solid ${c.border}`,
        color: c.fg, fontSize: 11.5, fontFamily: "monospace", fontWeight: 600, whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden>{c.dot}</span>
      <span>BRIEF: {zTime(loadedAt)} ({elapsedLabel(loadedAt, now)})</span>
    </div>
  );
}
