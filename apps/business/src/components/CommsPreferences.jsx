import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIMES = ["Morning (8-10am)", "Midday (11am-1pm)", "Afternoon (2-5pm)", "Evening (6-8pm)"];

function isTestMode() {
  return window.location.pathname.includes("/sandbox") || window.location.search.includes("testMode=true");
}

export default function CommsPreferences({ worker, workerCardData, onComplete }) {
  const [channel, setChannel] = useState("both"); // sms | email | both
  const [preferredDay, setPreferredDay] = useState("Monday");
  const [preferredTime, setPreferredTime] = useState("Morning (8-10am)");
  const [phone, setPhone] = useState(localStorage.getItem("PHONE_NUMBER") || "");
  const [email, setEmail] = useState(localStorage.getItem("USER_EMAIL") || "");
  const [saving, setSaving] = useState(false);
  const [welcomeSent, setWelcomeSent] = useState(false);
  const [error, setError] = useState(null);

  const slug = (worker?.name || workerCardData?.name || "worker").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const workerUrl = `https://titleapp.ai/workers/${slug}`;
  const workerName = workerCardData?.name || worker?.name || "Your Worker";

  async function handleSaveAndSendWelcome() {
    setSaving(true);
    setError(null);
    const testMode = isTestMode();
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Tenant-Id": tenantId,
        "X-Vertical": "developer",
        "X-Jurisdiction": "GLOBAL",
      };

      const prefs = { channel, preferredDay, preferredTime, phone, email, workerId: worker?.id, savedAt: new Date().toISOString() };

      // Save comms preferences — persist locally as fallback
      localStorage.setItem("ta_comms_prefs", JSON.stringify(prefs));

      // Try backend save (non-blocking in test mode)
      try {
        await fetch(`${API_BASE}/api?path=/v1/creator:commsPreferences`, {
          method: "POST", headers,
          body: JSON.stringify({ tenantId, ...prefs }),
        });
      } catch {
        if (!testMode) throw new Error("Failed to save preferences");
      }

      // Trigger Twilio welcome SMS (skip in test mode)
      if (!testMode && (channel === "sms" || channel === "both")) {
        await fetch(`${API_BASE}/api?path=/v1/twilio:sendSms`, {
          method: "POST", headers,
          body: JSON.stringify({
            tenantId, to: phone,
            message: `Your worker "${workerName}" is live on TitleApp. Here is your link: ${workerUrl}. Alex will check in with you weekly. Reply anytime to ask questions.`,
          }),
        });
      }

      // Trigger welcome email (skip in test mode)
      if (!testMode && (channel === "email" || channel === "both")) {
        await fetch(`${API_BASE}/api?path=/v1/email:send`, {
          method: "POST", headers,
          body: JSON.stringify({
            tenantId, to: email,
            subject: `${workerName} is live on TitleApp`,
            template: "creator_welcome",
            data: { workerName, workerUrl, workerDesc: workerCardData?.description || "" },
          }),
        });
      }

      setWelcomeSent(true);
      if (onComplete) onComplete();
    } catch (e) {
      if (testMode) {
        // In sandbox, accept the save and move on
        setWelcomeSent(true);
        if (onComplete) onComplete();
      } else {
        setError(e.message || "Something went wrong. Your preferences were saved.");
      }
    }
    setSaving(false);
  }

  if (welcomeSent) {
    return (
      <div style={{ maxWidth: 500, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.8 }}>{"\u2713"}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#10b981", marginBottom: 8 }}>You are all set</div>
        <div style={{ fontSize: 15, color: "#64748B", lineHeight: 1.6, marginBottom: 24 }}>
          Got it — Alex will check in with you on {preferredDay} ({preferredTime}). You can update this anytime in Settings.
          {channel === "both" ? " You will get both SMS and email." : channel === "sms" ? " Check your texts." : " Check your inbox."}
        </div>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, textAlign: "left" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 12 }}>What Alex sends you weekly</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "Earnings summary — subscription share (75%) and overage share (20% of TitleApp inference margin)",
              "Usage insights in plain English — not charts, sentences",
              "Jurisdiction alerts — if rules that affect your worker change",
              "Competitive intel — new workers published in your vertical",
              "Growth nudges — context-aware prompts to drive subscriber growth",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#6B46C1", fontSize: 13, marginTop: 2, flexShrink: 0 }}>{"\u2022"}</span>
                <span style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 16, lineHeight: 1.5 }}>
          You can text or email Alex back anytime. "How am I doing?" "Draft me a LinkedIn post." "What are my earnings this month?"
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>Stay connected with Alex</div>
      <div style={{ fontSize: 14, color: "#64748B", marginBottom: 24, lineHeight: 1.5 }}>
        Alex will send you weekly updates — earnings, usage insights, and growth tips. No dashboard to log into. Alex comes to you.
      </div>

      {/* Channel selection */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 12 }}>How should Alex reach you?</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "sms", label: "SMS only" },
            { id: "email", label: "Email only" },
            { id: "both", label: "Both (Recommended)" },
          ].map(opt => (
            <div
              key={opt.id}
              onClick={() => setChannel(opt.id)}
              style={{
                flex: 1, padding: "12px 10px", textAlign: "center", cursor: "pointer", borderRadius: 8,
                background: channel === opt.id ? "rgba(107,70,193,0.08)" : "#F8F9FC",
                border: `1px solid ${channel === opt.id ? "#6B46C1" : "#E2E8F0"}`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: channel === opt.id ? "#6B46C1" : "#1a1a2e" }}>{opt.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact info */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 12 }}>Contact info</div>
        {(channel === "sms" || channel === "both") && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>Phone number</label>
            <input
              type="tel"
              style={{ width: "100%", padding: "10px 12px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1a1a2e", fontSize: 14, outline: "none" }}
              value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        )}
        {(channel === "email" || channel === "both") && (
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>Email address</label>
            <input
              type="email"
              style={{ width: "100%", padding: "10px 12px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1a1a2e", fontSize: 14, outline: "none" }}
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
        )}
      </div>

      {/* Preferred schedule */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 12 }}>Weekly check-in schedule</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>Day</label>
            <select
              style={{ width: "100%", padding: "10px 12px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1a1a2e", fontSize: 14, outline: "none", cursor: "pointer" }}
              value={preferredDay} onChange={e => setPreferredDay(e.target.value)}
            >
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 4 }}>Time</label>
            <select
              style={{ width: "100%", padding: "10px 12px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1a1a2e", fontSize: 14, outline: "none", cursor: "pointer" }}
              value={preferredTime} onChange={e => setPreferredTime(e.target.value)}
            >
              {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button
        style={{ width: "100%", padding: "16px 24px", background: "#6B46C1", color: "white", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer" }}
        onClick={handleSaveAndSendWelcome}
        disabled={saving || (!phone && (channel === "sms" || channel === "both")) || (!email && (channel === "email" || channel === "both"))}
      >
        {saving ? "Sending welcome message..." : "Save preferences and send welcome"}
      </button>
      <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 8 }}>
        Alex will send your first check-in on {preferredDay}. You can update these preferences anytime.
      </div>
    </div>
  );
}
