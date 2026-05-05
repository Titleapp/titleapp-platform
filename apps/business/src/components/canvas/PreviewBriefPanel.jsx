/**
 * PreviewBriefPanel.jsx (49.32) — Control Center Pro home action.
 *
 * Renders an inline cadence picker + "Preview my brief" button on the
 * Control Center Pro worker home. Clicking Preview hits
 * /v1/user:previewDigest (dryRun) and renders the generated plain text
 * inline, so the user can see what their daily/weekly/monthly digest
 * will look like without having to navigate to the Control Center
 * section under MY WORK. (Sean said the prior nav was "not at all
 * intuitive" — this surfaces the action where users actually look for it.)
 */

import React, { useEffect, useState, useCallback } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const CADENCES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "none", label: "Off" },
];

const S = {
  card: {
    border: "1px solid rgba(124,58,237,0.18)",
    background: "linear-gradient(180deg, rgba(124,58,237,0.04), rgba(124,58,237,0.01))",
    borderRadius: 12, padding: 16, marginBottom: 16,
  },
  title: { fontSize: 13, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 },
  subtitle: { fontSize: 13, color: "rgba(0,0,0,0.55)", lineHeight: 1.5, marginBottom: 12 },
  row: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 },
  pickerLabel: { fontSize: 12, color: "rgba(0,0,0,0.55)", marginRight: 4 },
  chip: (active) => ({
    padding: "6px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600,
    border: `1px solid ${active ? "#7c3aed" : "rgba(0,0,0,0.12)"}`,
    background: active ? "#7c3aed" : "transparent",
    color: active ? "#fff" : "rgba(0,0,0,0.7)",
    cursor: "pointer", fontFamily: "inherit",
  }),
  primary: {
    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    background: "#7c3aed", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit",
  },
  primaryDisabled: {
    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    background: "rgba(124,58,237,0.4)", color: "#fff", border: "none", cursor: "wait", fontFamily: "inherit",
  },
  preview: {
    marginTop: 12, padding: 12, borderRadius: 8,
    background: "#fff", border: "1px solid rgba(0,0,0,0.08)",
    fontSize: 12.5, lineHeight: 1.55, color: "#1e293b", whiteSpace: "pre-wrap",
    maxHeight: 320, overflowY: "auto",
  },
  meta: { fontSize: 11, color: "rgba(0,0,0,0.4)", marginTop: 6 },
  err: { color: "#dc2626", fontSize: 12, marginTop: 8 },
};

export default function PreviewBriefPanel() {
  const [cadence, setCadence] = useState("weekly");
  const [loading, setLoading] = useState(false);
  const [savingCadence, setSavingCadence] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  // Load saved cadence preference.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const snap = await getDoc(doc(db, "users", uid));
        if (!cancelled && snap.exists()) {
          const c = snap.data().digestCadence;
          if (c && CADENCES.find(x => x.value === c)) setCadence(c);
        }
      } catch (_) { /* non-fatal */ }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const persistCadence = useCallback(async (next) => {
    setCadence(next);
    setSavingCadence(true);
    try {
      const uid = auth.currentUser?.uid;
      if (uid) {
        await setDoc(doc(db, "users", uid), { digestCadence: next }, { merge: true });
      }
    } catch (e) {
      // Non-fatal — preference will retry on next change.
      console.warn("PreviewBriefPanel: cadence save failed", e.message);
    } finally {
      setSavingCadence(false);
    }
  }, []);

  const runPreview = useCallback(async () => {
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Sign in to preview your brief");
      const idToken = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api?path=/v1/user:previewDigest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ cadence }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || data.message || `HTTP ${res.status}`);
      // Endpoint returns { ok, cadence, brief: { plainText, priority, ... } }
      setPreview(data.brief || data);
    } catch (e) {
      setError(e.message || "Preview failed");
    } finally {
      setLoading(false);
    }
  }, [cadence]);

  return (
    <div style={S.card}>
      <div style={S.title}>Executive Brief</div>
      <div style={S.subtitle}>
        Choose how often Alex sends your brief, then preview what it will look like — generated live from your business state.
      </div>
      <div style={S.row}>
        <span style={S.pickerLabel}>Cadence:</span>
        {CADENCES.map(c => (
          <button
            key={c.value}
            type="button"
            disabled={savingCadence}
            onClick={() => persistCadence(c.value)}
            style={S.chip(cadence === c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <button type="button" onClick={runPreview} disabled={loading} style={loading ? S.primaryDisabled : S.primary}>
        {loading ? "Generating..." : "Preview my brief"}
      </button>
      {error && <div style={S.err}>{error}</div>}
      {preview && (
        <>
          <div style={S.preview}>{preview.plainText || "(no content)"}</div>
          {preview.priority?.text && (
            <div style={S.meta}>Priority: {preview.priority.text}</div>
          )}
        </>
      )}
    </div>
  );
}
