import React from "react";

export default function AIChats() {
  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const isPersonal = vertical === "consumer";

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">{isPersonal ? "Your Personal AI Apps" : "AI, GPTs & Chats"}</h1>
          <p className="subtle">{isPersonal
            ? "Each AI here is a specialist that manages a different part of your Vault"
            : "AI worker activity log and conversation history"
          }</p>
        </div>
      </div>

      {isPersonal ? (
        <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", marginBottom: "10px" }}>
            Your Personal AI Apps
          </div>
          <div style={{ fontSize: "14px", color: "#64748b", maxWidth: "480px", margin: "0 auto 16px", lineHeight: "1.7" }}>
            Think of this as your own personal app store for AI. Each AI here is a specialist -- one manages your vehicle records, another tracks your property documents, another monitors your certification renewals. As you use your Vault, your AI team grows and learns your preferences. You'll see your conversation history and can pick up any thread where you left off.
          </div>
          <div style={{ fontSize: "13px", color: "#94a3b8", maxWidth: "420px", margin: "0 auto", lineHeight: "1.6" }}>
            No AI activity yet. Start by adding items to your Vault or chatting with your Chief of Staff. Your AI conversations and specialist tools will appear here.
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty">
            <p>No AI conversations yet. AI activity will appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
