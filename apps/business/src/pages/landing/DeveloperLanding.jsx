import React from "react";

export default function DeveloperLanding() {
  return (
    <div style={{
      minHeight: "100vh", background: "#0f172a",
      color: "white", padding: "64px 24px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>

        <span style={{
          background: "#6B46C1", color: "white",
          fontSize: "10px", fontWeight: "700",
          padding: "2px 8px", borderRadius: "999px",
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>BETA</span>

        <h1 style={{ fontSize: "36px", fontWeight: "700", margin: "16px 0 8px" }}>
          TitleApp Developer Hub
        </h1>

        <p style={{ color: "#94a3b8", fontSize: "16px", marginBottom: "40px", lineHeight: "1.6" }}>
          Build on TitleApp using the SDK and public API.
          Spine endpoints (contacts, transactions, assets) coming in v0.2.
        </p>

        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px", color: "#e2e8f0" }}>
          Quick Start
        </h2>
        <pre style={{
          background: "#1e293b", padding: "20px",
          borderRadius: "8px", fontSize: "14px",
          color: "#00FF00", overflowX: "auto",
          marginBottom: "32px",
        }}>
          {"npm install @titleapp/sdk"}
        </pre>

        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px", color: "#e2e8f0" }}>
          Resources
        </h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {[
            ["SDK Documentation", "https://github.com/Titleapp/titleapp-platform/tree/main/packages/sdk"],
            ["API Reference", "/api/v1/docs"],
            ["Engineering Protocol", "https://github.com/Titleapp/titleapp-platform/blob/main/docs/ENGINEERING_PROTOCOL.md"],
            ["Contributor Onboarding", "https://github.com/Titleapp/titleapp-platform/blob/main/docs/CODEX-49.2-Contributor-Onboarding.md"],
          ].map(([label, href]) => (
            <li key={label} style={{ marginBottom: "12px" }}>
              <a href={href} style={{
                color: "#7c3aed", fontSize: "16px",
                textDecoration: "none",
              }}>
                {label} →
              </a>
            </li>
          ))}
        </ul>

        <div style={{ borderTop: "1px solid #1e293b", marginTop: "48px", paddingTop: "24px" }}>
          <p style={{ color: "#475569", fontSize: "12px" }}>
            TitleApp — BETA — APIs subject to change.
          </p>
        </div>
      </div>
    </div>
  );
}
