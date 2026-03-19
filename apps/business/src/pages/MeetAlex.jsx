import React, { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";
import { signInWithCustomToken } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const S = {
  page: { minHeight: "100vh", minHeight: "100dvh", background: "#0f172a", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" },
  logo: { fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 48, letterSpacing: "0.05em" },
  avatar: { width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 0 40px rgba(124,58,237,0.3)" },
  heading: { fontSize: 28, fontWeight: 700, color: "#ffffff", marginBottom: 6 },
  subtext: { fontSize: 15, color: "rgba(255,255,255,0.6)", marginBottom: 32 },
  form: { width: "100%", maxWidth: 360 },
  label: { fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 8, display: "block" },
  input: { width: "100%", padding: "14px 16px", fontSize: 18, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, outline: "none", textAlign: "center", boxSizing: "border-box", background: "rgba(255,255,255,0.08)", color: "#ffffff" },
  btn: { width: "100%", padding: "14px", fontSize: 16, fontWeight: 600, color: "#fff", background: "#7c3aed", border: "none", borderRadius: 12, cursor: "pointer", marginTop: 12 },
  otpInput: { width: "100%", padding: "14px 16px", fontSize: 24, fontWeight: 600, letterSpacing: "0.3em", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, outline: "none", textAlign: "center", boxSizing: "border-box", background: "rgba(255,255,255,0.08)", color: "#ffffff" },
  otpHint: { fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: 12 },
  backBtn: { background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", marginTop: 8, display: "block", margin: "8px auto 0" },
  status: { fontSize: 13, textAlign: "center", marginTop: 8, padding: "8px 12px", borderRadius: 8 },
  footer: { position: "fixed", bottom: 24, left: 0, right: 0, textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.35)" },
};

export default function MeetAlex() {
  const [mode, setMode] = useState("phone"); // phone | otp | verifying | done
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("");
  const phoneRef = useRef(null);
  const otpRef = useRef(null);

  // Read URL params
  const [prompt] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("prompt") || "";
  });
  const [vertical] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("vertical") || "";
  });

  useEffect(() => {
    if (mode === "phone" && phoneRef.current) phoneRef.current.focus();
    if (mode === "otp" && otpRef.current) otpRef.current.focus();
  }, [mode]);

  async function handleSendOtp(e) {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) return;
    setStatus("Sending code...");
    try {
      const res = await fetch(`${API_BASE}/api?path=/v1/auth/sendOtp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmed }),
      });
      const data = await res.json();
      if (data.ok) {
        setMode("otp");
        setStatus("");
      } else {
        setStatus(data.error || "Failed to send code.");
      }
    } catch {
      setStatus("Failed to send code. Try again.");
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (otp.length < 6) return;
    setMode("verifying");
    setStatus("Verifying...");
    try {
      const utmData = { source: "sms", medium: "meet-alex", campaign: vertical || "intro-text", capturedAt: new Date().toISOString() };
      sessionStorage.setItem("ta_utm", JSON.stringify(utmData));

      const res = await fetch(`${API_BASE}/api?path=/v1/auth/verifyOtp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          otp: otp.trim(),
          utmAttribution: utmData,
        }),
      });
      const data = await res.json();
      if (data.ok && data.customToken) {
        const cred = await signInWithCustomToken(auth, data.customToken);
        const token = await cred.user.getIdToken(true);
        localStorage.setItem("ID_TOKEN", token);
        // Store prompt for ChatPanel auto-send
        if (prompt) {
          sessionStorage.setItem("ta_landing_chat", prompt);
        }
        // Store campaign context for sales mode
        if (vertical) {
          sessionStorage.setItem("ta_campaign_context", JSON.stringify({ slug: vertical, persona: vertical, vertical }));
        }
        setMode("done");
        const redirectParams = new URLSearchParams();
        redirectParams.set("utm_source", "sms");
        redirectParams.set("utm_medium", "meet-alex");
        if (vertical) redirectParams.set("utm_campaign", vertical);
        window.location.href = "/?" + redirectParams.toString();
      } else {
        setStatus(data.error || "Invalid code. Try again.");
        setMode("otp");
      }
    } catch {
      setStatus("Verification failed. Try again.");
      setMode("otp");
    }
  }

  const isError = status.includes("Failed") || status.includes("failed") || status.includes("Invalid");

  return (
    <div style={S.page}>
      <div style={S.logo}>TITLEAPP</div>

      {/* Alex Avatar */}
      <div style={S.avatar}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </div>

      <div style={S.heading}>Hey, I'm Alex</div>
      <div style={S.subtext}>Your Chief of Staff</div>

      {prompt && (
        <div style={{ maxWidth: 360, padding: "12px 20px", background: "rgba(124,58,237,0.15)", borderRadius: 12, fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 24, textAlign: "center", fontStyle: "italic" }}>
          "{prompt}"
        </div>
      )}

      <div style={S.form}>
        {mode === "phone" && (
          <form onSubmit={handleSendOtp}>
            <label style={S.label}>Enter your number to talk to Alex</label>
            <input
              ref={phoneRef}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 555-5555"
              autoComplete="tel"
              style={S.input}
            />
            <button type="submit" style={{ ...S.btn, opacity: phone.trim() ? 1 : 0.6 }}>
              Send Code
            </button>
          </form>
        )}

        {(mode === "otp" || mode === "verifying") && (
          <form onSubmit={handleVerifyOtp}>
            <div style={S.otpHint}>We sent a 6-digit code to {phone}</div>
            <input
              ref={otpRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              autoComplete="one-time-code"
              style={S.otpInput}
            />
            <button
              type="submit"
              disabled={mode === "verifying" || otp.length < 6}
              style={{ ...S.btn, opacity: mode === "verifying" || otp.length < 6 ? 0.6 : 1 }}
            >
              {mode === "verifying" ? "Verifying..." : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("phone"); setOtp(""); setStatus(""); }}
              style={S.backBtn}
            >
              Use a different number
            </button>
          </form>
        )}

        {mode === "done" && (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 15 }}>
            Connecting you to Alex...
          </div>
        )}

        {status && mode !== "done" && (
          <div style={{
            ...S.status,
            background: isError ? "rgba(220,38,38,0.15)" : "rgba(22,163,74,0.15)",
            color: isError ? "#fca5a5" : "#86efac",
          }}>
            {status}
          </div>
        )}
      </div>

      <div style={S.footer}>14-day free trial. No credit card required.</div>
    </div>
  );
}
