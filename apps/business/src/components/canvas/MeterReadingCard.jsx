/**
 * MeterReadingCard.jsx — "no penmanship, no pilot math" (Sean, CAN-as-
 * centerpiece directive). Photo of a panel hour meter in, a confirmed
 * numeric reading + computed delta out, ready to drop into a real
 * Flight/Maintenance Log entry (Hobbs In / Flight Time fields, matching
 * Life Flight Network's real paper form).
 *
 * Two-step RAAS shape, not one auto-commit step:
 *   1. Upload photo → POST /v1/mx:readMeterPhoto → a confidence-scored
 *      proposed reading (never written anywhere yet).
 *   2. Human confirms or corrects the number → POST /v1/mx:commitMeterReading
 *      → only then does it become part of the aircraft's real record.
 *
 * A low-confidence read (verified this session against a real upside-down
 * panel meter photo — the model correctly flagged low confidence rather
 * than guessing) always requires the human to type/confirm the number
 * before Confirm is enabled — never silently trusted.
 */

import React, { useState, useRef } from "react";
import { getAuth } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

async function apiPost(path, payload) {
  const auth = getAuth();
  const token = auth.currentUser ? await auth.currentUser.getIdToken(false).catch(() => null) : null;
  const url = `${API_BASE}/api?path=${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MeterReadingCard({ tailNumber = "N661LF" }) {
  const [photoPreview, setPhotoPreview] = useState(null);
  const [reading, setReading] = useState(null);
  const [confirmedValue, setConfirmedValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [committed, setCommitted] = useState(null);
  const fileRef = useRef(null);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setCommitted(null);
    setReading(null);
    setPhotoPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await apiPost("/v1/mx:readMeterPhoto", { tailNumber, imageBase64: base64, mediaType: file.type || "image/jpeg" });
      setReading(result);
      setConfirmedValue(result.reading != null ? String(result.reading) : "");
    } catch (e2) {
      setErr(e2.message);
    }
    setBusy(false);
  }

  async function onConfirm() {
    if (!reading) return;
    const value = Number(confirmedValue);
    if (!Number.isFinite(value)) { setErr("Enter a real number before confirming."); return; }
    setBusy(true);
    setErr(null);
    try {
      await apiPost("/v1/mx:commitMeterReading", {
        tailNumber,
        meterType: reading.meterType && reading.meterType !== "AMBIGUOUS" ? reading.meterType : "unconfirmed-meter-type",
        reading: value,
        source: "photo",
      });
      setCommitted({ meterType: reading.meterType, reading: value, delta: reading.delta });
    } catch (e2) {
      setErr(e2.message);
    }
    setBusy(false);
  }

  const confidenceColor = reading?.confidence === "high" ? "#16a34a" : reading?.confidence === "medium" ? "#d97706" : "#dc2626";

  return (
    <div style={{ maxWidth: 420, fontFamily: "inherit" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Read meter — {tailNumber}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14, lineHeight: 1.4 }}>
        Photograph the panel meter. Skye reads it and does the math — you confirm the number before it's logged.
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: "none" }} />
      <button onClick={() => fileRef.current?.click()} disabled={busy} style={{
        width: "100%", padding: "12px", borderRadius: 10, border: "1.5px dashed #cbd5e1", background: "#f8fafc",
        color: "#334155", fontSize: 14, fontWeight: 600, cursor: busy ? "default" : "pointer", marginBottom: 12,
      }}>{busy ? "Reading…" : "📷 Take or choose a photo"}</button>

      {photoPreview && (
        <img src={photoPreview} alt="meter" style={{ width: "100%", borderRadius: 8, marginBottom: 12, maxHeight: 180, objectFit: "cover" }} />
      )}

      {err && <div style={{ fontSize: 13, color: "#b91c1c", background: "#fef2f2", padding: 10, borderRadius: 8, marginBottom: 12 }}>{err}</div>}

      {reading && !committed && (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{reading.meterType || "Unknown meter"}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: confidenceColor, textTransform: "uppercase" }}>{reading.confidence} confidence</span>
          </div>
          {reading.notes && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, lineHeight: 1.4 }}>{reading.notes}</div>}
          {reading.delta != null && (
            <div style={{ fontSize: 12, color: "#334155", marginBottom: 8 }}>
              Prior reading: {reading.priorReading} → delta: <strong>{reading.delta}</strong>
            </div>
          )}
          {reading.priorReading == null && (
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>No prior reading on file for this meter — first entry, no delta computed.</div>
          )}
          {reading.requiresManualConfirmation && (
            <div style={{ fontSize: 12, color: "#92400e", background: "#fffbeb", padding: 8, borderRadius: 6, marginBottom: 10 }}>
              ⚠ Low confidence or ambiguous read — please confirm or correct the number below before logging.
            </div>
          )}
          <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Reading to log</label>
          <input type="number" step="0.1" value={confirmedValue} onChange={e => setConfirmedValue(e.target.value)}
            style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 15, marginBottom: 10 }} />
          <button onClick={onConfirm} disabled={busy} style={{
            width: "100%", padding: "11px", borderRadius: 8, border: "none", background: "#0f766e", color: "#fff",
            fontSize: 14, fontWeight: 700, cursor: busy ? "default" : "pointer",
          }}>{busy ? "Logging…" : "Confirm and log"}</button>
        </div>
      )}

      {committed && (
        <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#166534", marginBottom: 4 }}>✓ Logged</div>
          <div style={{ fontSize: 12, color: "#166534" }}>{committed.meterType}: {committed.reading}{committed.delta != null ? ` (Δ ${committed.delta})` : ""}</div>
        </div>
      )}
    </div>
  );
}
