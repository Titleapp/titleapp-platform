import React, { useState } from "react";

interface TermsProps {
  onAccept: () => void;
  onDecline: () => void;
}

export default function TermsAndConditions({ onAccept, onDecline }: TermsProps) {
  const [agreed, setAgreed] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const element = e.currentTarget;
    const isBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    if (isBottom) setScrolledToBottom(true);
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
          maxWidth: "640px",
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "32px 32px 0" }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "22px", fontWeight: 700 }}>
            Terms of Service
          </h2>
          <p style={{ margin: "0 0 20px 0", color: "#6b7280", fontSize: "14px" }}>
            Please read and accept before continuing
          </p>
        </div>

        <div
          onScroll={handleScroll}
          style={{
            maxHeight: "340px",
            overflowY: "auto",
            margin: "0 32px",
            padding: "20px",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "13px",
            lineHeight: "1.6",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: 700, marginTop: 0 }}>
            1. NO FINANCIAL, LEGAL, OR PROFESSIONAL ADVICE
          </h3>
          <p>
            TitleApp AI is a software tool only. It does NOT provide financial, investment,
            legal, tax, accounting, or any other professional advice. All AI-generated
            analyses are for informational purposes only.
          </p>
          <p>You acknowledge that:</p>
          <ul>
            <li>AI analysis may be incomplete, inaccurate, or misleading</li>
            <li>Investment decisions are YOUR responsibility alone</li>
            <li>You will consult licensed professionals before making decisions</li>
            <li>No professional relationship is created</li>
          </ul>

          <h3 style={{ fontSize: "14px", fontWeight: 700 }}>2. RELEASE OF LIABILITY</h3>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, YOU RELEASE AND HOLD HARMLESS TitleApp AI
            from ANY AND ALL claims, damages, losses, or expenses arising from your use of the platform,
            including investment losses, data errors, third-party integrations, and service interruptions.
          </p>

          <h3 style={{ fontSize: "14px", fontWeight: 700 }}>3. NO WARRANTY</h3>
          <p>
            THE PLATFORM IS PROVIDED "AS IS" WITHOUT ANY WARRANTIES OF ANY KIND. We do not warrant
            that the service will be uninterrupted, accurate, or error-free.
          </p>

          <h3 style={{ fontSize: "14px", fontWeight: 700 }}>4. USER RESPONSIBILITY</h3>
          <p>You are solely responsible for all decisions made using this platform, verifying
            all data independently, compliance with applicable laws, and securing your credentials.</p>

          <h3 style={{ fontSize: "14px", fontWeight: 700 }}>5. LIMITATION OF LIABILITY</h3>
          <p>
            Our total liability shall not exceed the amount you paid us in the past 12 months,
            or $100, whichever is less. We shall not be liable for indirect, incidental,
            special, or consequential damages.
          </p>

          <h3 style={{ fontSize: "14px", fontWeight: 700 }}>6. INDUSTRY DISCLAIMERS</h3>
          <p>
            <strong>Investors:</strong> We are NOT registered broker-dealers or investment advisors.
            Deal analysis is NOT investment advice.
          </p>
          <p>
            <strong>Pilots:</strong> This platform is NOT certified for flight operations.
            Maintain official FAA logbooks separately.
          </p>

          <h3 style={{ fontSize: "14px", fontWeight: 700 }}>7. GOVERNING LAW</h3>
          <p>
            Governed by Delaware law. Disputes resolved through binding arbitration.
            Class action waiver applies.
          </p>

          <p style={{ marginTop: "16px", fontStyle: "italic", color: "#6b7280", fontSize: "12px" }}>
            Last Updated: February 15, 2026
          </p>
        </div>

        <div style={{ padding: "20px 32px 32px" }}>
          {!scrolledToBottom && (
            <div
              style={{
                padding: "10px 14px",
                background: "#fef3c7",
                border: "1px solid #fbbf24",
                borderRadius: "6px",
                fontSize: "13px",
                marginBottom: "16px",
                color: "#92400e",
              }}
            >
              Please scroll to the bottom to read all terms
            </div>
          )}

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px",
              background: scrolledToBottom ? "#f0fdf4" : "#f9fafb",
              border: scrolledToBottom ? "2px solid #86efac" : "1px solid #e5e7eb",
              borderRadius: "8px",
              marginBottom: "16px",
              cursor: scrolledToBottom ? "pointer" : "not-allowed",
              opacity: scrolledToBottom ? 1 : 0.5,
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={!scrolledToBottom}
              style={{ width: "18px", height: "18px", cursor: scrolledToBottom ? "pointer" : "not-allowed" }}
            />
            <div style={{ fontSize: "14px" }}>
              <strong>I have read and agree to the Terms of Service.</strong>
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                I am solely responsible for all decisions made using this platform.
              </div>
            </div>
          </label>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={onAccept}
              disabled={!agreed}
              style={{
                flex: 1,
                padding: "12px",
                fontSize: "15px",
                fontWeight: 600,
                background: agreed ? "rgb(124,58,237)" : "#9ca3af",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: agreed ? "pointer" : "not-allowed",
              }}
            >
              I Agree - Continue
            </button>
            <button
              onClick={onDecline}
              style={{
                padding: "12px 20px",
                fontSize: "15px",
                background: "white",
                color: "#6b7280",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
