import React, { useState } from "react";

interface IDVerifyModalProps {
  onVerified: () => void;
  onClose: () => void;
}

export default function IDVerifyModal({ onVerified, onClose }: IDVerifyModalProps) {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  async function handleVerify() {
    setVerifying(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = (import.meta as any).env?.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

      await fetch(`${apiBase}/api?path=/v1/me:update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idVerified: true,
          idVerifiedAt: new Date().toISOString(),
        }),
      });

      setVerified(true);
      setTimeout(() => onVerified(), 1200);
    } catch (err) {
      console.error("ID verification failed:", err);
      setVerifying(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "32px",
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
          textAlign: "center",
        }}
      >
        {verified ? (
          <>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>&#10003;</div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: 700 }}>
              Identity Verified
            </h3>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
              Completing your request...
            </p>
          </>
        ) : (
          <>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: 700 }}>
              Identity Verification Required
            </h3>
            <p style={{ margin: "0 0 24px 0", color: "#6b7280", fontSize: "14px", lineHeight: 1.5 }}>
              Publishing records requires a verified identity. Quick check, $2, takes about a minute. Valid for one year.
            </p>
            <div style={{ display: "grid", gap: "10px" }}>
              <button
                onClick={handleVerify}
                disabled={verifying}
                style={{
                  padding: "12px",
                  fontSize: "14px",
                  fontWeight: 600,
                  background: verifying ? "#9ca3af" : "rgb(124, 58, 237)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: verifying ? "not-allowed" : "pointer",
                }}
              >
                {verifying ? "Verifying..." : "Verify Now"}
              </button>
              <button
                onClick={onClose}
                disabled={verifying}
                style={{
                  padding: "12px",
                  fontSize: "14px",
                  background: "transparent",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  cursor: verifying ? "not-allowed" : "pointer",
                  color: "#6b7280",
                }}
              >
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
