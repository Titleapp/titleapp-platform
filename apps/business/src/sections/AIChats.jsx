import React from "react";

const AUTO_AI_KPIS = [
  { label: "Active Conversations", value: "52" },
  { label: "Sales Conversations", value: "24" },
  { label: "Service Follow-ups", value: "4" },
  { label: "Follow-ups Pending", value: "18" },
  { label: "Messages Sent Today", value: "87" },
];

const AUTO_CONVERSATION_CATEGORIES = [
  { category: "Lease Expiration Outreach", count: 14, status: "active", description: "AI contacting customers with leases expiring within 90 days" },
  { category: "Service Appointment Reminders", count: 9, status: "active", description: "Automated reminders for upcoming scheduled maintenance" },
  { category: "Post-Sale Follow-up", count: 8, status: "active", description: "Satisfaction check-ins and F&I product education after delivery" },
  { category: "Trade-In Value Alerts", count: 7, status: "active", description: "Notifying customers when their vehicle trade value peaks" },
  { category: "New Inventory Matches", count: 6, status: "active", description: "Matching arriving inventory to customer wish lists" },
  { category: "F&I Product Renewals", count: 5, status: "paused", description: "Warranty and protection plan renewal outreach for expiring coverage" },
  { category: "Recall Notifications", count: 3, status: "active", description: "Safety recall notices with pre-scheduled service appointments" },
];

const AUTO_RECENT_AI_ACTIONS = [
  { time: "12 min ago", action: "Sent lease expiration offer to Maria Gonzalez -- 2024 Corolla LE lease ends April 2026", type: "outreach" },
  { time: "28 min ago", action: "Generated trade-in appraisal estimate for Robert Chen -- 2022 Civic valued at $19,400", type: "analysis" },
  { time: "45 min ago", action: "Scheduled service reminder for James Mitchell -- brake inspection due at 45K miles", type: "service" },
  { time: "1h ago", action: "Matched new 2025 RAV4 Hybrid arrival to Steven Park's wish list -- notification sent", type: "match" },
  { time: "1h ago", action: "Post-delivery follow-up sent to Patricia Adams -- Camry LE delivered yesterday", type: "follow-up" },
  { time: "2h ago", action: "Drafted Facebook Marketplace listing for 2022 Ford Explorer XLT -- pending approval", type: "content" },
  { time: "2h ago", action: "Identified upsell opportunity for Charles Cox -- Extra Care Gold warranty pitch at 60K service", type: "analysis" },
  { time: "3h ago", action: "Sent recall notice to Thomas Garcia -- seat belt retractor campaign, appointment pre-booked", type: "service" },
  { time: "4h ago", action: "Trade-in value alert sent to Angela Williams -- 2021 Prius Prime at peak residual value", type: "outreach" },
  { time: "5h ago", action: "Completed competitive price analysis -- 3 units adjusted to match market", type: "analysis" },
  { time: "Yesterday", action: "Sent 4 lease-expiration offers to qualifying customers in DFW territory", type: "outreach" },
  { time: "Yesterday", action: "Generated weekly service revenue report -- $8,450 across 32 appointments", type: "report" },
  { time: "Yesterday", action: "AI closed 2 unsold lead follow-ups -- re-engaged with updated pricing", type: "follow-up" },
  { time: "2 days ago", action: "Created inventory aging report -- flagged 12 units over 90 days", type: "report" },
  { time: "2 days ago", action: "Sent 6 service appointment confirmations for Monday schedule", type: "service" },
];

const ACTION_TYPE_COLORS = {
  outreach: "#2563eb",
  analysis: "#7c3aed",
  service: "#06b6d4",
  match: "#16a34a",
  "follow-up": "#d97706",
  content: "#ec4899",
  report: "#64748b",
};

export default function AIChats() {
  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const isPersonal = vertical === "consumer";
  const isAuto = vertical === "auto";

  function openChat(prompt) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", {
      detail: { message: prompt }
    }));
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="h1">{isPersonal ? "Your Personal AI Apps" : "AI Activity"}</h1>
          <p className="subtle">{isPersonal
            ? "Each AI here is a specialist that manages a different part of your Vault"
            : "AI communications, automated workflows, and conversation activity"
          }</p>
        </div>
        {!isPersonal && (
          <button
            className="iconBtn"
            onClick={() => openChat("Show me a summary of all AI activity this week")}
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", border: "none" }}
          >
            AI Activity Report
          </button>
        )}
      </div>

      {isPersonal ? (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px", marginBottom: "16px" }}>
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ height: "80px", background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b" }}>AI Assistant</span>
                  <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: "#f0fdf4", color: "#16a34a" }}>Active</span>
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6, marginBottom: "12px" }}>
                  Your personal assistant that manages vehicles, properties, documents, certifications, and your entire Vault.
                </div>
                <button
                  onClick={() => {
                    const chatInput = document.querySelector('textarea[placeholder="Ask me anything..."]');
                    if (chatInput) chatInput.focus();
                  }}
                  style={{ padding: "8px 16px", fontSize: "13px", fontWeight: 600, background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
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
      ) : isAuto ? (
        <div>
          {/* KPIs */}
          <div className="kpiRow" style={{ marginBottom: "20px" }}>
            {AUTO_AI_KPIS.map((kpi, i) => (
              <div key={i} className="card kpiCard">
                <div className="kpiLabel">{kpi.label}</div>
                <div className="kpiValue">{kpi.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Conversation Categories */}
            <div className="card">
              <div className="cardHeader">
                <div className="cardTitle">Active Workflows</div>
              </div>
              <div style={{ padding: "4px 16px 16px" }}>
                {AUTO_CONVERSATION_CATEGORIES.map((cat, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < AUTO_CONVERSATION_CATEGORIES.length - 1 ? "1px solid #f1f5f9" : "none", cursor: "pointer" }}
                    onClick={() => openChat(`Show me details on the ${cat.category} workflow`)}
                  >
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px", color: "#7c3aed", flexShrink: 0 }}>
                      {cat.count}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.category}</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.description}</div>
                    </div>
                    <span style={{
                      fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", flexShrink: 0,
                      background: cat.status === "active" ? "#f0fdf4" : "#fefce8",
                      color: cat.status === "active" ? "#16a34a" : "#ca8a04",
                    }}>
                      {cat.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent AI Actions */}
            <div className="card">
              <div className="cardHeader">
                <div className="cardTitle">Recent AI Actions</div>
              </div>
              <div style={{ padding: "4px 16px 16px", maxHeight: "480px", overflowY: "auto" }}>
                {AUTO_RECENT_AI_ACTIONS.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "8px 0", borderBottom: i < AUTO_RECENT_AI_ACTIONS.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: ACTION_TYPE_COLORS[item.type] || "#94a3b8", flexShrink: 0, marginTop: "5px" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.5 }}>{item.action}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty">
            <p>No AI conversations yet. AI activity will appear here as you use the platform.</p>
          </div>
        </div>
      )}
    </div>
  );
}
