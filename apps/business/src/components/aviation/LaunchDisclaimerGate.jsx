/**
 * LaunchDisclaimerGate.jsx — the CODEX 64-required launch-screen disclaimer:
 * "dismissible after first read, persistent in settings." Shows once (per
 * device/browser, via localStorage) then collapses to a small "ⓘ Disclaimer"
 * re-open link that renders the same text on demand — that's the
 * "persistent in settings" half of the requirement.
 */
import React, { useState } from "react";
import { LAUNCH_DISCLAIMER, LAUNCH_DISCLAIMER_STORAGE_KEY } from "./aviationDisclaimers";

export default function LaunchDisclaimerGate({ dark = true }) {
  const [ack, setAck] = useState(() => {
    try { return localStorage.getItem(LAUNCH_DISCLAIMER_STORAGE_KEY) === "1"; } catch { return false; }
  });
  const [reopened, setReopened] = useState(false);

  const fg = dark ? "#e2e8f0" : "#1e293b";
  const sub = dark ? "#94a3b8" : "#64748b";
  const bg = dark ? "#0f172a" : "#fff";
  const border = dark ? "#334155" : "#e2e8f0";

  if (ack && !reopened) {
    return (
      <button
        type="button"
        onClick={() => setReopened(true)}
        style={{ fontSize: 10.5, color: sub, background: "none", border: "none", cursor: "pointer", padding: "2px 0", textDecoration: "underline" }}
      >
        ⓘ Disclaimer
      </button>
    );
  }

  return (
    <div style={{ position: reopened && ack ? "fixed" : "static", inset: reopened && ack ? 0 : undefined, zIndex: 4000, background: reopened && ack ? "rgba(15,23,42,0.6)" : "transparent", display: reopened && ack ? "flex" : "block", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 420, margin: reopened && ack ? undefined : "0", padding: 16, borderRadius: 12, background: bg, border: `1px solid ${border}`, color: fg }}>
        <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>{LAUNCH_DISCLAIMER}</div>
        <button
          type="button"
          onClick={() => {
            try { localStorage.setItem(LAUNCH_DISCLAIMER_STORAGE_KEY, "1"); } catch { /* ignore */ }
            setAck(true);
            setReopened(false);
          }}
          style={{ padding: "7px 16px", fontSize: 12.5, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, #0284c7, #0369a1)", border: "none", borderRadius: 8, cursor: "pointer" }}
        >
          I understand
        </button>
      </div>
    </div>
  );
}
