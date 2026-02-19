import React, { useState } from "react";

// ── Auto Dealer AI Activity Data ──
const AUTO_AI_KPIS_ROW1 = [
  { label: "Active Conversations", value: "52" },
  { label: "Sales Conversations", value: "24" },
  { label: "Service Conversations", value: "4" },
  { label: "Follow-ups Pending", value: "18" },
];

const AUTO_AI_KPIS_ROW2 = [
  { label: "Messages Sent Today", value: "87" },
  { label: "Emails Sent Today", value: "23" },
  { label: "Texts Sent Today", value: "41" },
  { label: "Phone Calls", value: "0", badge: "Coming Soon" },
];

const AUTO_CONVERSATION_SUMMARIES = [
  {
    title: "Sales Activity",
    accent: "#16a34a",
    summary: "24 customers in active sales conversations:",
    details: ["8 in active negotiation", "6 scheduling test drives", "10 in initial inquiry"],
    highlight: "Top opportunity: Maria Gonzalez -- lease expiring, $2,800 potential",
  },
  {
    title: "Service Activity",
    accent: "#2563eb",
    summary: "4 service customers in communication:",
    details: ["2 appointment confirmations", "1 recall notification", "1 warranty follow-up"],
    highlight: "Next appointment: Charles Cox, 60K Major Service, Monday 8:00 AM",
  },
  {
    title: "Outbound Queue",
    accent: "#d97706",
    summary: "18 follow-ups queued:",
    details: ["7 post-test-drive follow-ups (24-48hr window)", "5 lease expiration outreach (60-day window)", "6 service reminders (upcoming appointments)"],
    highlight: "Estimated value of queued outreach: $34,200",
  },
];

const AUTO_AI_ACTION_LOG = [
  { time: "6:02 AM", action: "Sent lease offer", context: "Maria Gonzalez -- 2024 Corolla LE", channel: "Text", status: "Delivered", detail: "Personalized upgrade offer highlighting 2025 Corolla LE inventory availability. Included monthly payment comparison." },
  { time: "5:45 AM", action: "Confirmed appointment", context: "Charles Cox -- 60K Service", channel: "Text", status: "Delivered", detail: "Confirmation for Monday 8:00 AM. Included estimated cost ($449) and mention of warranty expiration -- Extra Care Gold pitch prepared." },
  { time: "5:30 AM", action: "Generated trade-in estimate", context: "Mark Brown -- 2025 Corolla Cross", channel: "Email", status: "Delivered", detail: "KBB-sourced trade estimate of $22,400. Paired with RAV4 XLE Premium offer showing positive equity of $4,200." },
  { time: "5:15 AM", action: "Drafted conquest offer", context: "Amanda Liu -- 2025 RAV4 XLE", channel: "Email", status: "Queued", detail: "TrueCar lead response with Lunar Rock RAV4 availability, competitive pricing vs Honda CR-V, and Saturday test drive invitation." },
  { time: "Yesterday 4:30 PM", action: "Sent F&I options", context: "Robert Chen -- 2025 Camry XSE", channel: "Email", status: "Opened", detail: "Menu presentation: Extended warranty options, GAP coverage, paint protection. Financing at 5.49% through Chase Auto." },
  { time: "Yesterday 3:15 PM", action: "Post-test-drive follow-up", context: "Sandra Lee -- Highlander XLE", channel: "Text", status: "Delivered", detail: "Thank-you message with lease special details. Highlighted family-friendly features discussed during test drive." },
  { time: "Yesterday 2:00 PM", action: "Service upsell pitch", context: "Patricia Adams -- Oil Change", channel: "In-person (prep)", status: "Complete", detail: "Prepared talking points for advisor: cabin air filter replacement ($45), next service interval reminder, satisfaction survey." },
  { time: "Yesterday 11:30 AM", action: "Price reduction alert", context: "Internal -- 2021 BMW X3 (143 days)", channel: "Dashboard", status: "Flagged", detail: "Recommended markdown from $34,169 to $31,999. Floor plan interest loss: $500/month. Market comp analysis attached." },
  { time: "Yesterday 10:00 AM", action: "Appointment reminder", context: "Angela Williams -- Battery Check", channel: "Text", status: "Delivered", detail: "Hybrid battery check + multi-point inspection reminder. Included trade-up suggestion for 2025 Prius Prime." },
  { time: "2 days ago 9:00 AM", action: "Inventory acquisition alert", context: "Internal -- 3 trade-ins received", channel: "Dashboard", status: "Complete", detail: "3 trade-ins processed: 2021 BMW X3 ($28,500), 2022 Civic ($19,400), 2020 Camry ($16,800). Recon estimates prepared." },
  { time: "2 days ago 8:15 AM", action: "Lease expiration batch", context: "4 customers -- 60-day window", channel: "Text", status: "Delivered", detail: "Batch outreach to Maria Gonzalez, Sandra Lee, and 2 others with leases expiring within 60 days. Personalized vehicle matches included." },
  { time: "3 days ago 4:00 PM", action: "Facebook listing generated", context: "2025 Camry LE -- Stock N25000", channel: "Facebook", status: "Complete", detail: "Marketplace listing with 12 photos, feature highlights, and competitive pricing. 70 days on lot trigger." },
  { time: "3 days ago 2:30 PM", action: "Service-to-sales flag", context: "Angela Williams -- 2021 Prius Prime", channel: "Dashboard", status: "Flagged", detail: "Vehicle 4+ years old, hybrid battery showing wear. Trade-up candidate for 2025 Prius Prime ($34,800). High equity position." },
  { time: "4 days ago 9:00 AM", action: "Post-purchase batch", context: "12 customers -- 7-day check-in", channel: "Email", status: "Delivered", detail: "Satisfaction survey + F&I product education emails sent to 12 recent buyers. 7 opened within 24 hours." },
  { time: "5 days ago 3:00 PM", action: "Inventory aging report", context: "Internal -- 12 units over 90 days", channel: "Dashboard", status: "Complete", detail: "Weekly aging report: 12 units over 90 days, estimated carrying cost $6,000/month. Price reduction recommendations for top 5." },
];

// ── Analyst AI Activity Data ──
const ANALYST_AI_KPIS_ROW1 = [
  { label: "Active Research Tasks", value: "15" },
  { label: "Client Communications", value: "8" },
  { label: "Market Alerts Sent", value: "12" },
  { label: "Models Updated", value: "3" },
];

const ANALYST_AI_KPIS_ROW2 = [
  { label: "Messages Today", value: "34" },
  { label: "Emails Sent Today", value: "11" },
  { label: "LinkedIn Posts", value: "1" },
  { label: "Compliance Reviews", value: "4" },
];

const ANALYST_CONVERSATION_SUMMARIES = [
  {
    title: "Research Activity",
    accent: "#16a34a",
    summary: "15 active research items:",
    details: ["6 earnings analyses", "4 sector reviews", "3 deal evaluations", "2 macro briefings"],
    highlight: "Top priority: Meridian Healthcare earnings tomorrow -- model needs updating",
  },
  {
    title: "Client / LP Activity",
    accent: "#2563eb",
    summary: "8 client communications:",
    details: ["3 quarterly update drafts", "2 meeting prep briefs", "2 LP inquiry responses", "1 capital call notice"],
    highlight: "Action needed: Blackstone LP quarterly letter due Friday",
  },
  {
    title: "Market Watch",
    accent: "#d97706",
    summary: "12 alerts sent today:",
    details: ["4 price movements", "3 news items", "2 earnings surprises", "2 sector shifts", "1 macro event"],
    highlight: "Overnight: NovaTech beat estimates by 12%, stock up 8% pre-market",
  },
];

const ANALYST_AI_ACTION_LOG = [
  { time: "6:30 AM", action: "Generated earnings summary", context: "NovaTech Corp -- Q4 Earnings", channel: "Dashboard", status: "Complete", detail: "Revenue $2.1B (+18% YoY), EPS $1.42 vs $1.27 consensus. Raised FY guidance. Updated DCF model -- fair value now $89 vs $76 prior." },
  { time: "6:15 AM", action: "Drafted LP letter", context: "Blackstone Partners -- Q4 Update", channel: "Email", status: "Queued", detail: "Quarterly performance letter: fund +8.4% YTD, 3 new positions, 1 exit (Apex Industries, +34% realized). Pending compliance review." },
  { time: "6:00 AM", action: "Flagged price movement", context: "Sentinel Defense -- -6.2%", channel: "Alert", status: "Delivered", detail: "Portfolio position dropped 6.2% on contract delay news. Current position: 4.2% of portfolio. Stop-loss at $42 not triggered ($44.80 current)." },
  { time: "5:45 AM", action: "Updated DCF model", context: "Meridian Healthcare", channel: "Dashboard", status: "Complete", detail: "Incorporated new CMS reimbursement rates effective Q2. Fair value revised from $156 to $148. Recommendation unchanged: HOLD." },
  { time: "5:30 AM", action: "Scheduled meeting prep", context: "Atlas Capital -- Due Diligence", channel: "Dashboard", status: "Complete", detail: "Prepared briefing package for Thursday meeting: company overview, financial summary, risk factors, competitive positioning, key questions." },
  { time: "Yesterday 4:00 PM", action: "Sector analysis", context: "Healthcare IT -- Monthly Review", channel: "Dashboard", status: "Complete", detail: "Sector up 4.2% MTD. Top performers: telehealth (+8%), EHR vendors (+5%). Laggards: medical devices (-2%). 3 portfolio companies in sector." },
  { time: "Yesterday 2:30 PM", action: "Compliance flag", context: "Marketing draft -- LinkedIn post", channel: "Dashboard", status: "Flagged", detail: "Flagged performance claim in draft post: 'Our fund returned 18% last year.' Requires net-of-fees disclosure and benchmark comparison per SEC rules." },
  { time: "Yesterday 11:00 AM", action: "LP inquiry response", context: "Smith Family Office", channel: "Email", status: "Delivered", detail: "Responded to capital commitment inquiry with fund overview, performance attribution, and meeting availability. Compliance reviewed." },
  { time: "2 days ago 3:00 PM", action: "Research gap alert", context: "3 companies need updates", channel: "Dashboard", status: "Flagged", detail: "Models older than 30 days: Apex Industries (42 days), ClearView Analytics (38 days), Summit Energy (35 days). Recommend refreshing before month-end." },
  { time: "2 days ago 10:00 AM", action: "Deal evaluation", context: "TechBridge Acquisition Target", channel: "Dashboard", status: "Complete", detail: "Screened potential acquisition: $45M revenue, 22% EBITDA margin, 3.2x revenue ask. Risk score: 58/100. Comparable transactions suggest 2.8x fair." },
];

// ── Vault AI Activity Data ──
const VAULT_AI_KPIS = [
  { label: "Documents Stored", value: "12" },
  { label: "Upcoming Deadlines", value: "3" },
  { label: "Assets Tracked", value: "5" },
  { label: "Last Updated", value: "Today" },
];

const VAULT_SUMMARIES = [
  {
    title: "Upcoming Deadlines",
    accent: "#d97706",
    summary: "3 items need attention:",
    details: [
      "Car registration expires Aug 2026 (6 months)",
      "Passport expires Mar 2028 (24 months)",
      "Homeowner's insurance renewal Nov 2026 (9 months)",
    ],
    highlight: "Next deadline: Car registration -- Aug 2026",
  },
  {
    title: "Recent Activity",
    accent: "#16a34a",
    summary: "Last 7 days:",
    details: [
      "2 documents added",
      "1 market value update (RAV4: $27,500)",
      "0 expired items",
    ],
    highlight: "Your vault is up to date",
  },
];

const VAULT_AI_ACTION_LOG = [
  { time: "Today", action: "Added document", context: "2022 RAV4 -- Registration", channel: "Vault", status: "Complete", detail: "Vehicle registration scanned and filed. Expiration date detected: August 2026. Reminder set for 30 days prior." },
  { time: "Today", action: "Updated value estimate", context: "2022 RAV4 XLE", channel: "Vault", status: "Complete", detail: "Market value updated to $27,500 based on current KBB and market data. Previous estimate: $28,200 (30 days ago)." },
  { time: "Yesterday", action: "Added document", context: "Homeowner's Insurance", channel: "Vault", status: "Complete", detail: "Insurance declaration page filed. Coverage: $425,000 dwelling, $100K liability. Renewal date: November 2026." },
  { time: "3 days ago", action: "Sent reminder", context: "Car Insurance -- Payment Due", channel: "Vault", status: "Delivered", detail: "Monthly auto insurance payment reminder sent. Progressive policy, $142/month due on the 15th." },
  { time: "5 days ago", action: "Flagged expiration", context: "Passport -- Expires Mar 2028", channel: "Vault", status: "Flagged", detail: "Passport expires in 24 months. Some countries require 6+ months validity. Consider renewal if traveling internationally in 2027." },
];

const STATUS_COLORS = {
  Delivered: { bg: "#dcfce7", color: "#16a34a" },
  Opened: { bg: "#dbeafe", color: "#2563eb" },
  Queued: { bg: "#fef3c7", color: "#d97706" },
  Complete: { bg: "#f1f5f9", color: "#475569" },
  Flagged: { bg: "#fee2e2", color: "#dc2626" },
};

export default function AIChats() {
  const vertical = localStorage.getItem("VERTICAL") || "auto";
  const isPersonal = vertical === "consumer";
  const isAuto = vertical === "auto";
  const isAnalyst = vertical === "analyst";
  const [expandedRow, setExpandedRow] = useState(null);

  // Pick data based on vertical
  const kpisRow1 = isAuto ? AUTO_AI_KPIS_ROW1 : isAnalyst ? ANALYST_AI_KPIS_ROW1 : VAULT_AI_KPIS;
  const kpisRow2 = isAuto ? AUTO_AI_KPIS_ROW2 : isAnalyst ? ANALYST_AI_KPIS_ROW2 : null;
  const summaries = isAuto ? AUTO_CONVERSATION_SUMMARIES : isAnalyst ? ANALYST_CONVERSATION_SUMMARIES : VAULT_SUMMARIES;
  const actionLog = isAuto ? AUTO_AI_ACTION_LOG : isAnalyst ? ANALYST_AI_ACTION_LOG : VAULT_AI_ACTION_LOG;

  function openChat(prompt) {
    window.dispatchEvent(new CustomEvent("ta:chatPrompt", { detail: { message: prompt } }));
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
        /* ── Consumer Vault: Personal AI Apps ── */
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
      ) : (
        /* ── Business AI Activity (auto + analyst) ── */
        <div>
          {/* KPI Row 1 */}
          <div className="kpiRow" style={{ marginBottom: "12px" }}>
            {kpisRow1.map((kpi, i) => (
              <div key={i} className="card kpiCard">
                <div className="kpiLabel">{kpi.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div className="kpiValue">{kpi.value}</div>
                  {kpi.badge && (
                    <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", background: "#f1f5f9", color: "#94a3b8" }}>{kpi.badge}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* KPI Row 2 (auto + analyst only) */}
          {kpisRow2 && (
            <div className="kpiRow" style={{ marginBottom: "20px" }}>
              {kpisRow2.map((kpi, i) => (
                <div key={i} className="card kpiCard">
                  <div className="kpiLabel">{kpi.label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div className="kpiValue">{kpi.value}</div>
                    {kpi.badge && (
                      <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", background: "#f1f5f9", color: "#94a3b8" }}>{kpi.badge}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Conversation Summaries */}
          <div style={{ display: "grid", gridTemplateColumns: summaries.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr", gap: "14px", marginBottom: "20px" }}>
            {summaries.map((card, i) => (
              <div key={i} className="card" style={{ padding: "20px", borderLeft: `4px solid ${card.accent}` }}>
                <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b", marginBottom: "10px" }}>{card.title}</div>
                <div style={{ fontSize: "13px", color: "#475569", marginBottom: "8px" }}>{card.summary}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
                  {card.details.map((d, j) => (
                    <div key={j} style={{ fontSize: "13px", color: "#64748b", paddingLeft: "12px", position: "relative" }}>
                      <span style={{ position: "absolute", left: 0 }}>-</span> {d}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: card.accent, lineHeight: 1.4 }}>
                  {card.highlight}
                </div>
              </div>
            ))}
          </div>

          {/* AI Action Log */}
          <div className="card">
            <div className="cardHeader">
              <div className="cardTitle">AI Action Log</div>
            </div>
            <div className="tableWrap">
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>{isAnalyst ? "Subject / Context" : "Customer / Context"}</th>
                    <th>Channel</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {actionLog.map((row, i) => {
                    const sc = STATUS_COLORS[row.status] || STATUS_COLORS.Complete;
                    return (
                      <React.Fragment key={i}>
                        <tr
                          style={{ cursor: "pointer" }}
                          onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                        >
                          <td style={{ whiteSpace: "nowrap", fontSize: "12px", color: "#64748b" }}>{row.time}</td>
                          <td className="tdStrong">{row.action}</td>
                          <td style={{ fontSize: "13px" }}>{row.context}</td>
                          <td style={{ fontSize: "12px", color: "#64748b" }}>{row.channel}</td>
                          <td>
                            <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "9999px", background: sc.bg, color: sc.color }}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                        {expandedRow === i && (
                          <tr>
                            <td colSpan={5} style={{ padding: "12px 16px", background: "#f8fafc", fontSize: "13px", color: "#475569", lineHeight: 1.6, borderBottom: "2px solid #e2e8f0" }}>
                              {row.detail}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
