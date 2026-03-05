import { useState, useRef } from "react";
import * as api from "../api/client";

export default function SignatureCapture({ requestId, signUrl, method, documentTitle, onSigned, onDeclined }) {
  const [step, setStep] = useState("ready"); // ready, signing, typed_consent, complete, declined
  const [typedName, setTypedName] = useState("");
  const [saving, setSaving] = useState(false);
  const iframeRef = useRef(null);

  const vertical = localStorage.getItem("VERTICAL") || "analyst";
  const jurisdiction = localStorage.getItem("JURISDICTION") || "GLOBAL";

  // If method is hellosign and signUrl exists, try embedded signing
  // If method is typed_consent, show text input

  function startSigning() {
    if (method === "hellosign" && signUrl) {
      setStep("signing");
      // Try loading HelloSign embedded SDK
      // If available, use HelloSign.open()
      // Otherwise, show iframe
    } else {
      setStep("typed_consent");
    }
  }

  async function handleTypedConsent() {
    if (!typedName.trim() || typedName.trim().length < 2) return;
    setSaving(true);
    try {
      const result = await api.countersignRequest({ vertical, jurisdiction, requestId });
      if (result.ok) {
        setStep("complete");
        if (onSigned) onSigned({ requestId, method: "typed_consent" });
      } else {
        throw new Error(result.error || "Signing failed");
      }
    } catch (e) {
      console.error("Typed consent failed:", e);
    }
    setSaving(false);
  }

  function handleDecline() {
    setStep("declined");
    if (onDeclined) onDeclined({ requestId, reason: "User declined" });
  }

  // Render based on step
  if (step === "ready") {
    return (
      <div style={{ padding: "16px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#fafafa" }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>
          Signature Required
        </div>
        <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
          {documentTitle || "This document requires your signature to proceed."}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={startSigning} style={{
            flex: 1, padding: "10px 16px", fontSize: "14px", fontWeight: 600,
            border: "none", borderRadius: "8px", cursor: "pointer",
            color: "#fff", background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
            minHeight: "44px",
          }}>
            Sign Now
          </button>
          <button onClick={handleDecline} style={{
            padding: "10px 16px", fontSize: "14px", fontWeight: 600,
            border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer",
            background: "transparent", color: "#64748b", minHeight: "44px",
          }}>
            Decline
          </button>
        </div>
      </div>
    );
  }

  if (step === "signing") {
    // HelloSign iframe
    return (
      <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
        <iframe ref={iframeRef} src={signUrl} title="Sign Document"
          style={{ width: "100%", height: "600px", border: "none" }} />
      </div>
    );
  }

  if (step === "typed_consent") {
    return (
      <div style={{ padding: "20px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#fafafa" }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>
          Type Your Full Legal Name to Sign
        </div>
        <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
          By typing your name below, you acknowledge that this constitutes your electronic signature.
        </div>
        <input
          type="text" value={typedName} onChange={(e) => setTypedName(e.target.value)}
          placeholder="Full legal name"
          style={{
            width: "100%", padding: "12px 14px", fontSize: "16px", border: "1px solid #d1d5db",
            borderRadius: "8px", marginBottom: "12px", boxSizing: "border-box",
            fontFamily: "'Caveat', cursive, sans-serif",
          }}
        />
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleTypedConsent} disabled={saving || typedName.trim().length < 2}
            style={{
              flex: 1, padding: "10px 16px", fontSize: "14px", fontWeight: 600,
              border: "none", borderRadius: "8px", cursor: saving ? "wait" : "pointer",
              color: "#fff", background: typedName.trim().length < 2 ? "#94a3b8" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
              minHeight: "44px", opacity: saving ? 0.7 : 1,
            }}>
            {saving ? "Signing..." : "Confirm Signature"}
          </button>
          <button onClick={() => setStep("ready")} style={{
            padding: "10px 16px", fontSize: "14px", fontWeight: 600,
            border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer",
            background: "transparent", color: "#64748b", minHeight: "44px",
          }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div style={{ padding: "16px", border: "1px solid #dcfce7", borderRadius: "12px", background: "#f0fdf4" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#16a34a" }}>Signed successfully</div>
        </div>
      </div>
    );
  }

  if (step === "declined") {
    return (
      <div style={{ padding: "16px", border: "1px solid #fecaca", borderRadius: "12px", background: "#fef2f2" }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#dc2626" }}>Signature declined</div>
        <div style={{ fontSize: "13px", color: "#dc2626", marginTop: "4px" }}>
          The document has not been signed. The requesting party will be notified.
        </div>
      </div>
    );
  }

  return null;
}
