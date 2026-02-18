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
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px", marginBottom: "16px" }}>
            {/* Chief of Staff card */}
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ height: "80px", background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b" }}>Chief of Staff</span>
                  <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: "#f0fdf4", color: "#16a34a" }}>Active</span>
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6, marginBottom: "12px" }}>
                  Your personal assistant that manages vehicles, properties, documents, certifications, and your entire Vault.
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('CHAT_CONTEXT_OVERRIDE');
                    window.dispatchEvent(new CustomEvent("ta:switchChatContext", { detail: { context: null } }));
                    const chatInput = document.querySelector('textarea[placeholder="Ask me anything..."]');
                    if (chatInput) chatInput.focus();
                  }}
                  style={{ padding: "8px 16px", fontSize: "13px", fontWeight: 600, background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
                >
                  Open Chat
                </button>
              </div>
            </div>

            {/* Investment Analyst card */}
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ height: "80px", background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="20" x2="12" y2="10"></line>
                  <line x1="18" y1="20" x2="18" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="16"></line>
                </svg>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b" }}>Investment Analyst</span>
                  <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: "#ecfdf5", color: "#059669" }}>Active</span>
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6, marginBottom: "12px" }}>
                  Screens deals, analyzes risk profiles, evaluates investment opportunities, and generates due diligence reports.
                </div>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("ta:switchChatContext", { detail: { context: 'analyst' } }));
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: "I want to analyze an investment opportunity" } }));
                    }, 300);
                  }}
                  style={{ padding: "8px 16px", fontSize: "13px", fontWeight: 600, background: "linear-gradient(135deg, #059669 0%, #047857 100%)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
                >
                  Open Chat
                </button>
              </div>
            </div>
          </div>

          <div style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", lineHeight: "1.6" }}>
            More specialist AIs coming soon. Your conversation history will appear here as you use each tool.
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
