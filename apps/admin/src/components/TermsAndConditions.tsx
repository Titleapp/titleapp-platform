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
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "700px",
          padding: "32px",
          background: "white",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
        }}
      >
        <h1 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 700 }}>
          Terms of Service & Release of Liability
        </h1>
        <p style={{ margin: "0 0 20px 0", color: "#6b7280", fontSize: "14px" }}>
          Please read carefully before using TitleApp AI
        </p>

        <div
          onScroll={handleScroll}
          style={{
            maxHeight: "400px",
            overflowY: "auto",
            padding: "20px",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "13px",
            lineHeight: "1.6",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ fontSize: "15px", fontWeight: 700, marginTop: 0 }}>
            1. NO FINANCIAL, LEGAL, OR PROFESSIONAL ADVICE
          </h3>
          <p>
            <strong>CRITICAL:</strong> TitleApp AI is a software tool only. It does NOT provide financial, investment,
            legal, tax, accounting, aviation safety, real estate, or any other professional advice. All AI-generated
            analyses, suggestions, recommendations, and outputs are for informational purposes only.
          </p>
          <p>
            <strong>You acknowledge that:</strong>
          </p>
          <ul>
            <li>AI analysis may be incomplete, inaccurate, or misleading</li>
            <li>Investment decisions based on this platform are YOUR responsibility alone</li>
            <li>You will consult licensed professionals (lawyers, CPAs, CFPs, etc.) before making decisions</li>
            <li>We are NOT fiduciaries, advisors, or professionals in any regulated field</li>
            <li>No attorney-client, advisor-client, or professional relationship is created</li>
          </ul>

          <h3 style={{ fontSize: "15px", fontWeight: 700 }}>2. RELEASE OF LIABILITY</h3>
          <p>
            <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW, YOU RELEASE AND HOLD HARMLESS</strong> TitleApp AI,
            its officers, directors, employees, contractors, and affiliates from ANY AND ALL claims, damages,
            losses, liabilities, costs, or expenses arising from:
          </p>
          <ul>
            <li>Investment losses or financial damages of any kind</li>
            <li>Errors, omissions, or inaccuracies in AI analysis or data</li>
            <li>Reliance on any information, analysis, or recommendation provided by the platform</li>
            <li>Third-party integrations (ForeFlight, Jeppesen, Salesforce, etc.)</li>
            <li>Data breaches, unauthorized access, or security incidents</li>
            <li>Aviation safety incidents, accidents, or regulatory violations</li>
            <li>Real estate transaction failures or title defects</li>
            <li>Copyright, trademark, or intellectual property claims</li>
            <li>Loss of data, documents, or blockchain records</li>
            <li>Downtime, service interruptions, or technical failures</li>
          </ul>

          <h3 style={{ fontSize: "15px", fontWeight: 700 }}>3. NO WARRANTY — AS-IS SERVICE</h3>
          <p>
            THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES OF ANY KIND,
            EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS
            FOR A PARTICULAR PURPOSE, ACCURACY, OR NON-INFRINGEMENT.
          </p>
          <p>
            We do not warrant that:
          </p>
          <ul>
            <li>The service will be uninterrupted, secure, or error-free</li>
            <li>AI analysis will be accurate, complete, or reliable</li>
            <li>Blockchain anchoring will prevent data tampering</li>
            <li>API integrations will function correctly</li>
            <li>Your data will be preserved indefinitely</li>
          </ul>

          <h3 style={{ fontSize: "15px", fontWeight: 700 }}>4. USER RESPONSIBILITY</h3>
          <p>
            <strong>You are solely responsible for:</strong>
          </p>
          <ul>
            <li>All decisions made using this platform</li>
            <li>Verifying all data, documents, and analysis independently</li>
            <li>Compliance with all applicable laws and regulations</li>
            <li>Maintaining backups of critical data</li>
            <li>Securing your account credentials</li>
            <li>Any content you upload or create</li>
          </ul>

          <h3 style={{ fontSize: "15px", fontWeight: 700 }}>5. INDEMNIFICATION</h3>
          <p>
            You agree to indemnify, defend, and hold harmless TitleApp AI from any claims, damages,
            or expenses (including attorney fees) arising from:
          </p>
          <ul>
            <li>Your use or misuse of the platform</li>
            <li>Your violation of these terms</li>
            <li>Your violation of any laws or third-party rights</li>
            <li>Content you upload or share</li>
          </ul>

          <h3 style={{ fontSize: "15px", fontWeight: 700 }}>6. LIMITATION OF LIABILITY</h3>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM
            ARISING FROM YOUR USE OF THE PLATFORM SHALL NOT EXCEED THE AMOUNT YOU PAID US IN
            THE PAST 12 MONTHS, OR $100, WHICHEVER IS LESS.
          </p>
          <p>
            WE SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
            PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST DATA, OR BUSINESS INTERRUPTION.
          </p>

          <h3 style={{ fontSize: "15px", fontWeight: 700 }}>7. COPYRIGHT & INTELLECTUAL PROPERTY</h3>
          <p>
            You retain ownership of content you upload. By using the platform, you grant us a
            license to process, analyze, and display your content to provide the service.
          </p>
          <p>
            <strong>AI-Generated Content:</strong> AI outputs may inadvertently include copyrighted
            material. You are responsible for ensuring your use complies with copyright law. We
            are not liable for any copyright infringement claims.
          </p>

          <h3 style={{ fontSize: "15px", fontWeight: 700 }}>8. AVIATION SAFETY DISCLAIMER</h3>
          <p>
            <strong>FOR PILOTS:</strong> This platform is NOT certified for flight operations.
            Flight logs, currency tracking, and DTC records are for informational purposes only.
            You are responsible for maintaining official FAA logbooks and ensuring compliance
            with all FARs. Do not use this platform as your sole flight record system.
          </p>

          <h3 style={{ fontSize: "15px", fontWeight: 700 }}>9. SECURITIES & INVESTMENT DISCLAIMER</h3>
          <p>
            <strong>FOR INVESTORS:</strong> We are NOT registered broker-dealers, investment advisors,
            or securities professionals. Deal analysis is NOT investment advice. Consult a registered
            investment advisor before making investment decisions. Past performance does not guarantee
            future results.
          </p>

          <h3 style={{ fontSize: "15px", fontWeight: 700 }}>10. GOVERNING LAW & DISPUTE RESOLUTION</h3>
          <p>
            These terms are governed by the laws of Delaware, USA. Any disputes shall be resolved
            through binding arbitration in Delaware, with each party bearing their own costs.
          </p>
          <p>
            <strong>CLASS ACTION WAIVER:</strong> You agree to resolve disputes individually and
            waive the right to participate in class actions.
          </p>

          <h3 style={{ fontSize: "15px", fontWeight: 700 }}>11. CHANGES TO TERMS</h3>
          <p>
            We may update these terms at any time. Continued use after changes constitutes acceptance.
            Material changes will be communicated via email or platform notification.
          </p>

          <h3 style={{ fontSize: "15px", fontWeight: 700 }}>12. ACKNOWLEDGMENT</h3>
          <p>
            <strong>BY CLICKING "I AGREE" BELOW, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD,
            AND AGREE TO BE BOUND BY THESE TERMS. YOU EXPRESSLY WAIVE ANY RIGHTS TO HOLD TITLEAPP AI
            LIABLE FOR ANY DAMAGES ARISING FROM YOUR USE OF THE PLATFORM.</strong>
          </p>

          <p style={{ marginTop: "20px", fontStyle: "italic", color: "#6b7280" }}>
            Last Updated: February 15, 2026
          </p>
        </div>

        {!scrolledToBottom && (
          <div
            style={{
              padding: "12px",
              background: "#fef3c7",
              border: "1px solid #fbbf24",
              borderRadius: "6px",
              fontSize: "13px",
              marginBottom: "16px",
              color: "#92400e",
            }}
          >
            ⚠️ Please scroll to the bottom to read all terms
          </div>
        )}

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px",
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
            style={{
              width: "20px",
              height: "20px",
              cursor: scrolledToBottom ? "pointer" : "not-allowed",
            }}
          />
          <div style={{ fontSize: "14px" }}>
            <strong>I have read and agree to the Terms of Service and Release of Liability.</strong>
            <br />
            <span style={{ fontSize: "12px", color: "#6b7280" }}>
              I understand I am solely responsible for all decisions made using this platform.
            </span>
          </div>
        </label>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onAccept}
            disabled={!agreed}
            style={{
              flex: 1,
              padding: "14px",
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
              padding: "14px 24px",
              fontSize: "15px",
              fontWeight: 600,
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
  );
}
