import React, { useEffect } from "react";

export default function SubscribeSuccess() {
  const params = new URLSearchParams(window.location.search);
  const workerId = params.get("workerId");

  useEffect(() => {
    const timer = setTimeout(() => { window.location.href = "/"; }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8 }}>You're in.</div>
        <div style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.6 }}>Your worker is active and ready. Taking you there now.</div>
      </div>
    </div>
  );
}
