import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// ── SMS Templates ─────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: "auto-dealer",
    label: "Auto Dealer",
    message: "Hey {{name}} \u2014 just set up something I think your dealership would actually use. Takes 2 min to see it: {{link}}",
    defaultPrompt: "I run a dealership and I'm curious what TitleApp can do for me",
  },
  {
    id: "solar-vpp",
    label: "Solar / VPP",
    message: "{{name}} \u2014 found a platform that handles the compliance side of solar installs. Worth 2 minutes: {{link}}",
    defaultPrompt: "I work in solar energy and want to see what you offer",
  },
  {
    id: "generic",
    label: "Generic Referral",
    message: "Hey {{name}} \u2014 I've been using this AI platform for work and thought of you. Check it out: {{link}}",
    defaultPrompt: "",
  },
];

// ── Styles ────────────────────────────────────────────────────────

const S = {
  container: { padding: 32, maxWidth: 960 },
  h1: { fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 24 },
  tabs: { display: "flex", gap: 0, borderBottom: "2px solid #e5e7eb", marginBottom: 24 },
  tab: (active) => ({
    padding: "10px 20px", fontSize: 14, fontWeight: active ? 600 : 400,
    color: active ? "#7c3aed" : "#6b7280", background: "none", border: "none",
    borderBottom: active ? "2px solid #7c3aed" : "2px solid transparent",
    marginBottom: -2, cursor: "pointer",
  }),
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 6, display: "block" },
  input: { width: "100%", padding: "10px 14px", fontSize: 14, border: "1px solid #e5e7eb", borderRadius: 8, outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 14px", fontSize: 14, border: "1px solid #e5e7eb", borderRadius: 8, outline: "none", boxSizing: "border-box", resize: "vertical", minHeight: 60, fontFamily: "inherit" },
  templateCard: (sel) => ({
    padding: "14px 18px", border: sel ? "2px solid #7c3aed" : "1px solid #e5e7eb",
    borderRadius: 10, cursor: "pointer", background: sel ? "#faf5ff" : "#fff", marginBottom: 8,
  }),
  templateLabel: { fontSize: 14, fontWeight: 600, color: "#111827" },
  templateMsg: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  btn: { padding: "12px 28px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#7c3aed", border: "none", borderRadius: 10, cursor: "pointer" },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  preview: { padding: 16, background: "#f8fafc", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, color: "#1e293b", lineHeight: 1.6, whiteSpace: "pre-wrap" },
  previewLabel: { fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 },
  status: { fontSize: 13, padding: "10px 14px", borderRadius: 8, marginTop: 12 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "10px 14px", borderBottom: "2px solid #e5e7eb", color: "#6b7280", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" },
  td: { padding: "10px 14px", borderBottom: "1px solid #f3f4f6", color: "#111827" },
  statCard: { flex: "1 1 140px", padding: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, textAlign: "center" },
  statValue: { fontSize: 28, fontWeight: 700, color: "#111827" },
  statLabel: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  placeholder: { padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 },
};

// ── Component ─────────────────────────────────────────────────────

export default function SalesPanel() {
  const [activeTab, setActiveTab] = useState("send");
  const TABS = [
    { id: "send", label: "Send Intro Text" },
    { id: "prospects", label: "Prospect Sessions" },
    { id: "escalations", label: "Escalations" },
    { id: "funnel", label: "Conversion Funnel" },
  ];

  return (
    <div style={S.container}>
      <h1 style={S.h1}>Sales</h1>
      <div style={S.subtitle}>Send intro texts, monitor prospect sessions, and track conversions.</div>

      <div style={S.tabs}>
        {TABS.map((t) => (
          <button key={t.id} style={S.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "send" && <SendIntroText />}
      {activeTab === "prospects" && <ProspectSessions />}
      {activeTab === "escalations" && <Escalations />}
      {activeTab === "funnel" && <ConversionFunnel />}
    </div>
  );
}

// ── Tab 1: Send Intro Text ────────────────────────────────────────

function SendIntroText() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("auto-dealer");
  const [customPrompt, setCustomPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  const template = TEMPLATES.find((t) => t.id === selectedTemplate);
  const prompt = customPrompt || template?.defaultPrompt || "";
  const link = prompt
    ? `https://app.titleapp.ai/meet-alex?prompt=${encodeURIComponent(prompt)}`
    : "https://app.titleapp.ai/meet-alex";
  const resolvedMessage = template
    ? template.message.replace("{{name}}", name || "there").replace("{{link}}", link)
    : "";

  async function handleSend() {
    if (!phone.trim()) return;
    setSending(true);
    setStatus(null);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const res = await fetch(`${API_BASE}/api?path=/v1/admin:sendIntroText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-Id": "admin",
        },
        body: JSON.stringify({
          phone: phone.trim(),
          name: name.trim(),
          template: selectedTemplate,
          message: resolvedMessage,
          link,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus({ type: "success", text: "Text sent successfully." });
        setPhone("");
        setName("");
      } else {
        setStatus({ type: "error", text: data.error || "Failed to send." });
      }
    } catch {
      setStatus({ type: "error", text: "Failed to send. Check your connection." });
    }
    setSending(false);
  }

  return (
    <div>
      <div style={S.card}>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", marginBottom: 20 }}>
          <div>
            <label style={S.label}>Recipient Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 555-5555"
              style={S.input}
            />
          </div>
          <div>
            <label style={S.label}>Recipient Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name"
              style={S.input}
            />
          </div>
        </div>

        <label style={{ ...S.label, marginBottom: 10 }}>Template</label>
        {TEMPLATES.map((t) => (
          <div
            key={t.id}
            style={S.templateCard(selectedTemplate === t.id)}
            onClick={() => setSelectedTemplate(t.id)}
          >
            <div style={S.templateLabel}>{t.label}</div>
            <div style={S.templateMsg}>{t.message.replace("{{name}}", "Name").replace("{{link}}", "[link]")}</div>
          </div>
        ))}

        <div style={{ marginTop: 16 }}>
          <label style={S.label}>Custom Prompt (optional)</label>
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={template?.defaultPrompt || "Override the default prompt for the /meet-alex link"}
            style={S.input}
          />
        </div>
      </div>

      <div style={S.card}>
        <div style={S.previewLabel}>Message Preview</div>
        <div style={S.preview}>{resolvedMessage}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={handleSend}
          disabled={sending || !phone.trim()}
          style={{ ...S.btn, ...(sending || !phone.trim() ? S.btnDisabled : {}) }}
        >
          {sending ? "Sending..." : "Send Text"}
        </button>
      </div>

      {status && (
        <div
          style={{
            ...S.status,
            background: status.type === "error" ? "#fef2f2" : "#f0fdf4",
            color: status.type === "error" ? "#dc2626" : "#16a34a",
          }}
        >
          {status.text}
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Prospect Sessions ──────────────────────────────────────

function ProspectSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("ID_TOKEN");
        const res = await fetch(`${API_BASE}/api?path=/v1/admin:prospectSessions`, {
          headers: { Authorization: `Bearer ${token}`, "X-Tenant-Id": "admin" },
        });
        const data = await res.json();
        if (data.ok && data.sessions) {
          setSessions(data.sessions);
        }
      } catch { /* empty until backend wired */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div style={S.placeholder}>Loading prospect sessions...</div>;

  if (!sessions.length) {
    return (
      <div style={S.card}>
        <div style={S.placeholder}>
          No prospect sessions yet. Send an intro text to get started.
        </div>
      </div>
    );
  }

  return (
    <table style={S.table}>
      <thead>
        <tr>
          <th style={S.th}>Phone</th>
          <th style={S.th}>Name</th>
          <th style={S.th}>Source</th>
          <th style={S.th}>Status</th>
          <th style={S.th}>First Message</th>
          <th style={S.th}>Time</th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((s, i) => (
          <tr key={i}>
            <td style={S.td}>{s.phone ? s.phone.replace(/(\d{3})\d{4}(\d{3})/, "$1****$2") : "\u2014"}</td>
            <td style={S.td}>{s.name || "\u2014"}</td>
            <td style={S.td}>{s.source || "\u2014"}</td>
            <td style={S.td}>
              <span style={{
                display: "inline-block", padding: "2px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: s.status === "engaged" ? "#f0fdf4" : s.status === "authed" ? "#fef3c7" : "#f3f4f6",
                color: s.status === "engaged" ? "#16a34a" : s.status === "authed" ? "#d97706" : "#6b7280",
              }}>
                {s.status || "started"}
              </span>
            </td>
            <td style={{ ...S.td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.firstMessage || "\u2014"}</td>
            <td style={S.td}>{s.timestamp ? new Date(s.timestamp).toLocaleString() : "\u2014"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Tab 3: Escalations ────────────────────────────────────────────

function Escalations() {
  return (
    <div style={S.card}>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Escalations</div>
      <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
        When a prospect asks to speak with a person or Alex can't answer a question, it will appear here for follow-up.
      </div>
      <div style={{ ...S.placeholder, marginTop: 24 }}>
        No escalations yet. Coming in 34.9-T2.
      </div>
    </div>
  );
}

// ── Tab 4: Conversion Funnel ──────────────────────────────────────

function ConversionFunnel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("ID_TOKEN");
        const res = await fetch(`${API_BASE}/api?path=/v1/admin:salesFunnel`, {
          headers: { Authorization: `Bearer ${token}`, "X-Tenant-Id": "admin" },
        });
        const data = await res.json();
        if (data.ok) {
          setStats(data);
        }
      } catch { /* empty until backend wired */ }
      setLoading(false);
    }
    load();
  }, []);

  const funnelSteps = stats
    ? [
        { label: "Links Sent", value: stats.linksSent || 0 },
        { label: "Page Visits", value: stats.pageVisits || 0 },
        { label: "OTP Started", value: stats.otpStarted || 0 },
        { label: "Authenticated", value: stats.authenticated || 0 },
        { label: "First Message", value: stats.firstMessage || 0 },
        { label: "Subscribed", value: stats.subscribed || 0 },
      ]
    : [
        { label: "Links Sent", value: "\u2014" },
        { label: "Page Visits", value: "\u2014" },
        { label: "OTP Started", value: "\u2014" },
        { label: "Authenticated", value: "\u2014" },
        { label: "First Message", value: "\u2014" },
        { label: "Subscribed", value: "\u2014" },
      ];

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        {funnelSteps.map((step, i) => (
          <div key={i} style={S.statCard}>
            <div style={S.statValue}>{loading ? "..." : step.value}</div>
            <div style={S.statLabel}>{step.label}</div>
          </div>
        ))}
      </div>
      {!stats && !loading && (
        <div style={{ ...S.placeholder, fontSize: 13 }}>
          Live data coming in 34.9-T2.
        </div>
      )}
    </div>
  );
}
