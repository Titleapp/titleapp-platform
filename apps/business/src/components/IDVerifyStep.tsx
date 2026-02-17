import React, { useState } from "react";

interface IDVerifyStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function IDVerifyStep({ onComplete, onSkip }: IDVerifyStepProps) {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  async function handleVerify() {
    setVerifying(true);
    try {
      // Simulated verification (Stripe Identity will replace this)
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
      setTimeout(() => onComplete(), 1200);
    } catch (err) {
      console.error("ID verification failed:", err);
      setVerifying(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 20px",
        minHeight: "100%",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "40px",
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
          textAlign: "center",
        }}
      >
        {verified ? (
          <>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>&#10003;</div>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
              Identity Verified
            </h2>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
              Setting up your account...
            </p>
          </>
        ) : (
          <>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                background: "rgba(124, 58, 237, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                fontSize: "28px",
              }}
            >
              ID
            </div>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
              Verify Your Identity
            </h2>
            <p style={{ margin: "0 0 24px 0", color: "#6b7280", fontSize: "15px", lineHeight: 1.5 }}>
              A quick identity check helps protect your records and enables publishing.
              It costs $2 and takes about a minute. Valid for one year.
            </p>

            <div style={{ display: "grid", gap: "12px" }}>
              <button
                onClick={handleVerify}
                disabled={verifying}
                style={{
                  padding: "14px",
                  fontSize: "15px",
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
                onClick={onSkip}
                disabled={verifying}
                style={{
                  padding: "14px",
                  fontSize: "15px",
                  background: "transparent",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  cursor: verifying ? "not-allowed" : "pointer",
                  color: "#6b7280",
                }}
              >
                I'll do it later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
