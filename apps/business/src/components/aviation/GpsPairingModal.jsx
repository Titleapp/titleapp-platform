/**
 * GpsPairingModal.jsx — scan → list found devices → pair → show connection
 * state, per CODEX 64's pairing flow:
 *   1. App checks for a GPS peripheral (NMEA over BT/BLE)
 *   2. If none found → onboarding: "CoPilot uses an external GPS... Tap to
 *      pair Sentry, Bad Elf, or any NMEA GPS device."
 *   3. Paired device remembered; reconnects automatically in range
 *      (remembering the device id is a real follow-up once this has been
 *      tested against real hardware — see report; not implemented here).
 */
import React from "react";

export default function GpsPairingModal({ gps, onClose }) {
  const { devices, scanning, scan, connect, disconnectBle, bleConnecting, bleError, source, bleDeviceName, status } = gps;

  return (
    <div
      role="dialog" aria-modal="true"
      style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420, maxWidth: "92vw", maxHeight: "80vh", overflowY: "auto", background: "#0f172a", border: "1px solid #334155", borderRadius: 14, padding: 20, color: "#e2e8f0" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Pair GPS Device</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <p style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.5, marginTop: 0 }}>
          CoPilot uses an external GPS for reliable position tracking — most Wi-Fi iPads have no
          built-in GPS chip. Tap to pair a Sentry, Bad Elf, Dual, or any NMEA-over-Bluetooth GPS device.
        </p>

        {source === "ble" && (
          <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(22,101,52,0.25)", border: "1px solid #16a34a", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{status === "connected" ? "🟢" : "🟡"} Connected — {bleDeviceName}</div>
            <button
              onClick={disconnectBle}
              style={{ marginTop: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, background: "transparent", color: "#fca5a5", border: "1px solid #b91c1c", borderRadius: 6, cursor: "pointer" }}
            >
              Disconnect
            </button>
          </div>
        )}

        <button
          onClick={scan}
          disabled={scanning}
          style={{ width: "100%", padding: "9px 14px", fontSize: 13, fontWeight: 700, color: "#fff", background: scanning ? "#334155" : "linear-gradient(135deg, #0284c7, #0369a1)", border: "none", borderRadius: 8, cursor: scanning ? "default" : "pointer", marginBottom: 10 }}
        >
          {scanning ? "Scanning… (8s)" : "Scan for GPS devices"}
        </button>

        {bleError && (
          <div style={{ fontSize: 12, color: "#fca5a5", background: "rgba(127,29,29,0.35)", border: "1px solid #b91c1c", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
            {bleError}
          </div>
        )}

        {devices.length === 0 && !scanning && !bleError && (
          <div style={{ fontSize: 12, color: "#64748b", textAlign: "center", padding: "16px 0" }}>
            No devices found yet. Make sure your GPS puck is powered on and in range, then tap Scan.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {devices.map((d) => (
            <div key={d.deviceId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 8, background: "#1e293b", border: d.likelyGps ? "1px solid #0284c7" : "1px solid #334155" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {d.name}{d.likelyGps && <span style={{ marginLeft: 6, fontSize: 10, color: "#38bdf8" }}>likely GPS</span>}
                </div>
                <div style={{ fontSize: 10.5, color: "#64748b" }}>{d.deviceId}{d.rssi != null ? ` · RSSI ${d.rssi}dBm` : ""}</div>
              </div>
              <button
                onClick={() => connect(d.deviceId, d.name)}
                disabled={bleConnecting}
                style={{ padding: "5px 12px", fontSize: 12, fontWeight: 700, color: "#0284c7", background: "#fff", border: "none", borderRadius: 6, cursor: "pointer", flexShrink: 0 }}
              >
                {bleConnecting ? "Connecting…" : "Pair"}
              </button>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 10.5, color: "#475569", lineHeight: 1.5, marginTop: 14, marginBottom: 0 }}>
          Per-device NMEA output isn't confirmed against real hardware yet — this pairs and reads
          any device exposing a standard notify-capable BLE characteristic, then parses the stream
          as NMEA-0183 (GGA/RMC). If your specific puck uses a proprietary binary protocol instead
          of raw NMEA, position data won't decode; that's a real follow-up requiring the physical
          device, not something fixable from this screen.
        </p>
      </div>
    </div>
  );
}
