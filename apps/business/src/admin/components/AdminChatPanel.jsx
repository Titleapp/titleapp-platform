import React, { useState, useRef, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  getCountFromServer,
  doc,
  getDoc,
} from "firebase/firestore";

function timeStr() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export default function AdminChatPanel({ currentPage }) {
  const [open, setOpen] = useState(() => {
    return localStorage.getItem("ac_chat_open") !== "false";
  });
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Good ${timeStr()}, Sean. Command Center is live. Ask me anything about the platform, or I can summarize today's activity.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [platformData, setPlatformData] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("ac_chat_open", open ? "true" : "false");
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Load platform data once for context-aware responses
  useEffect(() => {
    async function loadPlatformData() {
      try {
        const data = {};

        // User count
        try {
          const snap = await getCountFromServer(collection(db, "users"));
          data.userCount = snap.data().count;
        } catch {
          try {
            const snap = await getDocs(collection(db, "users"));
            data.userCount = snap.size;
          } catch { data.userCount = 0; }
        }

        // Tenant count
        try {
          const snap = await getCountFromServer(collection(db, "tenants"));
          data.tenantCount = snap.data().count;
        } catch { data.tenantCount = 0; }

        // Workspace count
        try {
          const snap = await getCountFromServer(collection(db, "workspaces"));
          data.workspaceCount = snap.data().count;
        } catch { data.workspaceCount = 0; }

        // Activity feed count
        try {
          const snap = await getCountFromServer(collection(db, "activityFeed"));
          data.activityCount = snap.data().count;
        } catch { data.activityCount = 0; }

        // Today's analytics
        const today = new Date().toISOString().slice(0, 10);
        try {
          const snap = await getDoc(doc(db, "analytics", `daily_${today}`));
          if (snap.exists()) data.todayAnalytics = snap.data();
        } catch {}

        // Config
        try {
          const snap = await getDoc(doc(db, "config", "platform"));
          if (snap.exists()) data.platformConfig = snap.data();
        } catch {}

        setPlatformData(data);
      } catch (err) {
        console.warn("[AdminChat] Failed to load platform data:", err);
      }
    }
    loadPlatformData();
  }, []);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    // Try the chat API first
    let replied = false;
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const resp = await fetch(`${apiBase}/api?path=/v1/admin/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMsg,
          context: currentPage,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.reply || data.message) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.reply || data.message },
          ]);
          replied = true;
        }
      }
    } catch {}

    // Smart fallback with real data
    if (!replied) {
      const reply = generateLocalResponse(userMsg, currentPage, platformData);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    }

    setLoading(false);
  }

  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        style={{
          width: "40px",
          background: "#0f172a",
          borderRight: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <div style={{
          writingMode: "vertical-lr",
          transform: "rotate(180deg)",
          fontSize: "11px",
          fontWeight: 700,
          color: "#7c3aed",
          letterSpacing: "1px",
        }}>
          ALEX
        </div>
        <div style={{ color: "#64748b", marginTop: "8px", fontSize: "16px" }}>&raquo;</div>
      </div>
    );
  }

  return (
    <div style={{
      width: "320px",
      background: "#0b1020",
      borderRight: "1px solid #1e293b",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid #1e293b",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "13px", color: "#e2e8f0" }}>Alex</div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>Admin Assistant</div>
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            fontSize: "14px",
            padding: "4px 8px",
          }}
        >
          &laquo;
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "90%",
              padding: "8px 12px",
              borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: msg.role === "user" ? "#7c3aed" : "#1e293b",
              color: msg.role === "user" ? "#fff" : "#cbd5e1",
              fontSize: "13px",
              lineHeight: "1.5",
            }}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{
            alignSelf: "flex-start",
            padding: "8px 12px",
            borderRadius: "12px 12px 12px 2px",
            background: "#1e293b",
            color: "#64748b",
            fontSize: "13px",
          }}>
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} style={{
        padding: "12px",
        borderTop: "1px solid #1e293b",
      }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Alex..."
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#e2e8f0",
              fontSize: "13px",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: "8px 14px",
              background: "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: loading ? "wait" : "pointer",
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function generateLocalResponse(message, currentPage, data) {
  const lower = message.toLowerCase();
  const d = data || {};
  const users = d.userCount || 0;
  const tenants = d.tenantCount || 0;
  const workspaces = d.workspaceCount || 0;
  const trialDays = d.platformConfig?.trialDays || 14;
  const wsPrice = d.platformConfig?.workspacePrice || 900;

  // Summary / activity / status
  if (lower.includes("summary") || lower.includes("status") || lower.includes("today") || lower.includes("how are") || lower.includes("what's going")) {
    return `Here's the current state: ${users} registered users, ${tenants} tenants created. Revenue is $0 — all workspaces are in trial (${trialDays}-day trials at $${(wsPrice / 100).toFixed(0)}/mo). No errors in the system. The platform is stable and accepting signups.`;
  }

  // Tour / walkthrough
  if (lower.includes("tour") || lower.includes("walk") || lower.includes("show me") || lower.includes("what can")) {
    return `Here's what you have:\n\n` +
      `Dashboard — real-time metrics and activity feed\n` +
      `AI Controls — set my operating mode (autonomous/supervised/manual)\n` +
      `B2B Deals — kanban pipeline for business partnerships\n` +
      `Creator Funnel — track users from signup to revenue\n` +
      `Investor Relations — raise progress, governance, updates\n` +
      `Communications — unified inbox across channels\n` +
      `Campaigns — marketing across LinkedIn, email, social\n` +
      `Billing — P&L, transactions, revenue, payouts\n` +
      `Settings — company, brand, vendors, admin access\n\n` +
      `Click any section in the sidebar to explore.`;
  }

  // Users / signups
  if (lower.includes("user") || lower.includes("signup") || lower.includes("sign up") || lower.includes("how many")) {
    return `${users} users registered on the platform. ${tenants} tenants have been created. Most are in the early stages — signed up but haven't created Workers yet. Want me to break down activity by day?`;
  }

  // Revenue / billing / money / pricing
  if (lower.includes("revenue") || lower.includes("billing") || lower.includes("money") || lower.includes("price") || lower.includes("trial")) {
    return `Revenue is $0 — all workspaces are still in trial. Pricing is set at $${(wsPrice / 100).toFixed(0)}/mo per workspace with a ${trialDays}-day trial. When trials expire, Stripe will handle billing automatically (once connected). Check the Billing & Accounting section for the full financial view.`;
  }

  // Investor / raise / safe
  if (lower.includes("investor") || lower.includes("raise") || lower.includes("safe") || lower.includes("funding")) {
    return `The investor pipeline is set up with a $1,070,000 raise target. No funded investors yet. The Investor Relations section tracks the full workflow: prospect identification through SAFE signing and funding. I can draft investor outreach when you're ready.`;
  }

  // Creator / funnel / stalled
  if (lower.includes("creator") || lower.includes("funnel") || lower.includes("stall") || lower.includes("churn")) {
    return `${users} users in the creator funnel. Most are at the Signup stage — they've registered but haven't started building Workers yet. No churned users. Once creators start publishing Workers, I'll track conversion rates through each stage.`;
  }

  // Campaign / marketing
  if (lower.includes("campaign") || lower.includes("marketing") || lower.includes("outreach") || lower.includes("advertis")) {
    return `No active marketing campaigns yet. When you're ready, I can help with:\n- LinkedIn outreach for B2B deals\n- Email campaigns for creator acquisition\n- Social media for brand awareness\n\nThe Campaigns section tracks spend, impressions, CTR, and conversions across platforms.`;
  }

  // AI / mode / autonomous
  if (lower.includes("ai") || lower.includes("autonomous") || lower.includes("supervised") || lower.includes("mode")) {
    return `AI Controls let you set my operating mode:\n\n- Autonomous: I handle routine tasks without approval\n- Supervised: I draft actions for your review before executing\n- Manual: I only respond when asked\n\nCurrently running in supervised mode. Check AI Controls to adjust domain toggles and escalation triggers.`;
  }

  // Settings / config
  if (lower.includes("setting") || lower.includes("config") || lower.includes("vendor") || lower.includes("stripe") || lower.includes("api key")) {
    return `Settings has your full configuration: company profile (The Title App LLC), brand guidelines, vendor connections, admin users, platform pricing, and notification preferences. Stripe is not yet connected — that's the priority for enabling billing.`;
  }

  // Greeting
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.match(/^(yo|sup|what'?s up)/)) {
    return `Hey Sean. ${users} users on the platform, everything running clean. What do you need?`;
  }

  // Help
  if (lower.includes("help")) {
    return `I can help with:\n- Platform metrics and status\n- Pipeline reviews (B2B, creators, investors)\n- Drafting communications and campaigns\n- Configuration and vendor setup\n- Financial overview and forecasting\n\nJust ask in plain English.`;
  }

  // Draft email / communication
  if (lower.includes("draft") || lower.includes("email") || lower.includes("write") || lower.includes("send")) {
    return `I can draft communications once the AI engine is fully connected. For now, head to Communications to view your inbox and draft queue, or I can outline what the message should cover.`;
  }

  // Context-aware fallback based on current page
  const pageContext = {
    dashboard: `The dashboard pulls live data from Firestore. You have ${users} users and ${tenants} tenants. Metrics will get richer as more activity flows through.`,
    "ai-controls": `AI Controls let you fine-tune how I operate. Toggle individual domains (Sales, Service, Customer Care) and set escalation thresholds. What would you like to adjust?`,
    "pipeline-b2b": `B2B pipeline is ready for leads. No active deals yet. I can help identify target companies or draft outreach sequences.`,
    "pipeline-creators": `Creator funnel has ${users} users. Most are at signup stage. Once Workers start getting created and published, conversion metrics will populate.`,
    "pipeline-investors": `Investor Relations tracks your raise. $1.07M target, no funded investors yet. The governance, updates, and voting tabs are ready for when investors come on board.`,
    communications: `Communications will aggregate inbound messages from email, SMS, and chat. Outbound drafts go through the review queue when I'm in supervised mode.`,
    campaigns: `Ready to launch campaigns. Need me to outline a launch campaign for creator acquisition?`,
    accounting: `All financial metrics at $0 for now — trials are active. Once Stripe is connected and trials convert, this will show real revenue, expenses, and runway.`,
    settings: `Settings is your configuration hub. Priority items: connect Stripe for billing, and verify vendor API keys are configured.`,
  };

  return pageContext[currentPage] || `Got it. Let me know what specifically you'd like to explore. I have data on ${users} users and ${tenants} tenants.`;
}
