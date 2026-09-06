/**
 * GpsStatusStrip.jsx — always-visible GPS state indicator, per CODEX 64:
 *
 *   🟢 SENTRY · 8 sats · 12ft accuracy
 *   🟡 SENTRY · searching…
 *   🔴 NO GPS · map only — position not available
 *
 * Renders whichever source is actually active (BLE puck name, or "DEVICE
 * GPS" for the background-geolocation fallback) rather than hardcoding
 * "SENTRY" — CODEX 64 uses Sentry as the reference device, but the same
 * strip must be honest about a Bad Elf, Dual, or plain device GPS too.
 */
import React from "react";

export default function GpsStatusStrip({ gps, onTapPair, compact = false }) {
  const { status, source, fix, bleDeviceName } = gps;

  const sourceLabel =
    source === "ble" ? (bleDeviceName || "GPS DEVICE").toUpperCase() :
    source === "device" ? "DEVICE GPS" :
    "NO GPS";

  let dot = "🔴";
  let text;
  if (status === "connected") {
    dot = "🟢";
    const sats = fix?.satellites != null ? ` · ${fix.satellites} sats` : "";
    const acc = fix?.accuracyFt != null ? ` · ${Math.round(fix.accuracyFt)}ft accuracy` : "";
    text = `${sourceLabel}${sats}${acc}`;
  } else if (status === "searching") {
    dot = "🟡";
    text = `${sourceLabel} · searching…`;
  } else {
    dot = "🔴";
    text = "NO GPS · map only — position not available";
  }

  return (
    <button
      type="button"
      onClick={onTapPair}
      title="Tap to pair or manage GPS device"
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: compact ? "3px 8px" : "5px 10px",
        borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
        background: "rgba(15,23,42,0.85)", color: "#e2e8f0",
        fontSize: compact ? 11 : 12.5, fontFamily: "monospace", fontWeight: 600,
        cursor: "pointer", whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden>{dot}</span>
      <span>{text}</span>
    </button>
  );
}
