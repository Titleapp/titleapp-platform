import React, { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

const HE_MD_GATE_WORKERS = ["HE-013", "HE-025", "HE-027", "HE-028", "HE-030"];

const TIERS = [
  { id: 1, label: "Tier 1", price: 29, credits: 500 },
  { id: 2, label: "Tier 2", price: 49, credits: 1500 },
  { id: 3, label: "Tier 3", price: 79, credits: 3000 },
];

export default function TestWorkerPanel({ worker, workerCardData, sessionId, onTestComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [testSessionId, setTestSessionId] = useState(null);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [edgeCases, setEdgeCases] = useState([]);
  const [publishing, setPublishing] = useState(false);

  // Checklist
  const [coreJobDone, setCoreJobDone] = useState(false);
  const [complianceFired, setComplianceFired] = useState(false);
  const [badInputHandled, setBadInputHandled] = useState(false);

  // MD gate (moved from BuildProgress)
  const needsMdGate = workerCardData?.mdGateRequired || false;
  const [mdName, setMdName] = useState("");
  const [mdNpi, setMdNpi] = useState("");
  const [mdSigned, setMdSigned] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Initial message
  useEffect(() => {
    const name = workerCardData?.name || worker?.name || "your worker";
    setMessages([{
      role: "system",
      text: `Test Mode -- You are now talking to "${name}" as a subscriber would. Try asking it to do its job. The checklist below tracks whether the core features work.`,
    }]);
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setSending(true);

    try {
      const token = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID");
      const res = await fetch(`${API_BASE}/api?path=/v1/worker:test:chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-Id": tenantId,
          "X-Vertical": "developer",
          "X-Jurisdiction": "GLOBAL",
        },
        body: JSON.stringify({
          tenantId,
          workerId: worker?.id,
          userMessage: text,
          testSessionId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessages(prev => [...prev, { role: "assistant", text: data.workerResponse }]);
        if (data.testSessionId) setTestSessionId(data.testSessionId);
        setExchangeCount(data.exchangeCount || 0);

        // Auto-fill checklist from assessment
        if (data.testAssessment) {
          if (data.testAssessment.coreJobDone) setCoreJobDone(true);
          if (data.testAssessment.complianceFired) setComplianceFired(true);
          if (data.testAssessment.badInputHandled) setBadInputHandled(true);
        }

        // Edge cases (first exchange)
        if (data.suggestedEdgeCases && data.suggestedEdgeCases.length > 0) {
          setEdgeCases(data.suggestedEdgeCases);
        }
      } else {
        setMessages(prev => [...prev, { role: "assistant", text: data.error || "Something went wrong. Try again." }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: "Connection error. Try again." }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleEdgeCaseClick(text) {
    setInput(text);
    inputRef.current?.focus();
  }

  const allChecked = coreJobDone && complianceFired && badInputHandled;
  const canPublish = allChecked || exchangeCount >= 1;
  const publishBlocked = needsMdGate && !mdSigned;

  async function handlePublish() {
    if (publishBlocked) return;
    setPublishing(true);
    try {
      const token = localStorage.getItem("ID_TOKEN");
      const tenantId = localStorage.getItem("TENANT_ID");
      const res = await fetch(`${API_BASE}/api?path=/v1/worker1:submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-Id": tenantId,
          "X-Vertical": "developer",
          "X-Jurisdiction": "GLOBAL",
        },
        body: JSON.stringify({
          tenantId,
          workerId: worker?.id,
          pricingTier: worker?.pricingTier || workerCardData?.pricingTier || 2,
          waiverSigned: true,
          identityVerified: true,
          paymentComplete: true,
          ...(needsMdGate && { mdName, mdNpi }),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        onTestComplete({ ...worker, buildPhase: "live", pricingTier: worker?.pricingTier || 2 });
      }
    } catch {}
    setPublishing(false);
  }

  const S = {
    panel: { display: "flex", flexDirection: "column", height: "100%" },
    header: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
    badge: { padding: "4px 10px", background: "rgba(16,185,129,0.1)", color: "#10b981", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" },
    workerName: { fontSize: 16, fontWeight: 700, color: "#1a1a2e" },
    chatArea: { flex: 1, minHeight: 200, maxHeight: 360, overflowY: "auto", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 },
    msgUser: { alignSelf: "flex-end", background: "#6B46C1", color: "white", padding: "8px 12px", borderRadius: "12px 12px 4px 12px", maxWidth: "85%", fontSize: 13, lineHeight: 1.5 },
    msgAssistant: { alignSelf: "flex-start", background: "#F4F4F8", color: "#1a1a2e", padding: "8px 12px", borderRadius: "12px 12px 12px 4px", maxWidth: "85%", fontSize: 13, lineHeight: 1.5 },
    msgSystem: { alignSelf: "center", color: "#64748B", fontSize: 12, textAlign: "center", padding: "6px 12px", background: "rgba(100,116,139,0.06)", borderRadius: 8, maxWidth: "90%" },
    inputWrap: { display: "flex", gap: 8, marginBottom: 16 },
    input: { flex: 1, padding: "10px 14px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1a1a2e", fontSize: 13, outline: "none", resize: "none" },
    sendBtn: { padding: "10px 16px", background: "#10b981", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
    edgeCaseWrap: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 },
    edgeCaseChip: { padding: "6px 12px", background: "rgba(107,70,193,0.06)", color: "#6B46C1", border: "1px solid rgba(107,70,193,0.15)", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: 500 },
    checklist: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, marginBottom: 16 },
    checkItem: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" },
    checkBox: (checked) => ({ width: 20, height: 20, borderRadius: 4, border: `2px solid ${checked ? "#10b981" : "#CBD5E1"}`, background: checked ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "white", fontSize: 12, fontWeight: 700, transition: "all 0.2s" }),
    checkLabel: { fontSize: 13, color: "#1a1a2e" },
  };

  return (
    <div style={S.panel}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.badge}>Test Mode</span>
        <span style={S.workerName}>{workerCardData?.name || worker?.name || "Your Worker"}</span>
      </div>
      {workerCardData?.description && (
        <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, marginBottom: 16 }}>{workerCardData.description}</div>
      )}

      {/* Test Chat */}
      <div style={S.chatArea}>
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === "user" ? S.msgUser : msg.role === "system" ? S.msgSystem : S.msgAssistant}>
            {msg.text}
          </div>
        ))}
        {sending && <div style={{ color: "#94A3B8", fontSize: 12, padding: "4px 0" }}>Worker is responding...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Edge case chips */}
      {edgeCases.length > 0 && (
        <div style={S.edgeCaseWrap}>
          <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, alignSelf: "center" }}>Try:</span>
          {edgeCases.map((ec, i) => (
            <button key={i} style={S.edgeCaseChip} onClick={() => handleEdgeCaseClick(ec)}>{ec}</button>
          ))}
        </div>
      )}

      {/* Chat input */}
      <div style={S.inputWrap}>
        <textarea
          ref={inputRef}
          style={S.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Talk to your worker as a subscriber would..."
          rows={1}
        />
        <button style={S.sendBtn} onClick={handleSend} disabled={sending}>Send</button>
      </div>

      {/* Checklist */}
      <div style={S.checklist}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", marginBottom: 10 }}>Test checklist</div>
        <div style={S.checkItem} onClick={() => setCoreJobDone(!coreJobDone)}>
          <div style={S.checkBox(coreJobDone)}>{coreJobDone ? "\u2713" : ""}</div>
          <span style={S.checkLabel}>Core job done correctly</span>
        </div>
        <div style={S.checkItem} onClick={() => setComplianceFired(!complianceFired)}>
          <div style={S.checkBox(complianceFired)}>{complianceFired ? "\u2713" : ""}</div>
          <span style={S.checkLabel}>Compliance rules fired when triggered</span>
        </div>
        <div style={S.checkItem} onClick={() => setBadInputHandled(!badInputHandled)}>
          <div style={S.checkBox(badInputHandled)}>{badInputHandled ? "\u2713" : ""}</div>
          <span style={S.checkLabel}>Bad input handled gracefully</span>
        </div>
        {!allChecked && exchangeCount >= 1 && (
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 6 }}>
            You can publish without all checks, but we recommend testing each area.
          </div>
        )}
      </div>

      {/* MD Gate */}
      {needsMdGate && (
        <div style={{ background: "#FFFFFF", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: "#dc2626" }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626" }}>Medical Director Co-Sign Required</div>
          </div>
          <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5, marginBottom: 12 }}>
            This worker provides clinical protocol or drug reference content. A Medical Director must co-sign before it can go live.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              style={{ width: "100%", padding: "8px 10px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 6, color: "#1a1a2e", fontSize: 13, outline: "none" }}
              value={mdName} onChange={e => setMdName(e.target.value)}
              placeholder="Medical Director name"
            />
            <input
              style={{ width: "100%", padding: "8px 10px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 6, color: "#1a1a2e", fontSize: 13, outline: "none" }}
              value={mdNpi} onChange={e => setMdNpi(e.target.value)}
              placeholder="NPI number"
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#F8F9FC", borderRadius: 6, cursor: "pointer" }} onClick={() => setMdSigned(!mdSigned)}>
              <input type="checkbox" checked={mdSigned} readOnly style={{ accentColor: "#6B46C1" }} />
              <span style={{ fontSize: 12, color: "#1a1a2e" }}>Medical Director has reviewed and agrees to co-sign</span>
            </div>
          </div>
        </div>
      )}

      {/* Publish */}
      <button
        style={{
          width: "100%", padding: "14px 24px", fontSize: 15, fontWeight: 700,
          background: (!canPublish || publishBlocked) ? "#E2E8F0" : "#6B46C1",
          color: (!canPublish || publishBlocked) ? "#94A3B8" : "white",
          border: "none", borderRadius: 10,
          cursor: (!canPublish || publishBlocked) ? "not-allowed" : "pointer",
        }}
        onClick={handlePublish}
        disabled={publishing || !canPublish || publishBlocked}
      >
        {publishing ? "Publishing..." : allChecked ? "Publish to marketplace" : "Looks good -- publish it"}
      </button>
      {exchangeCount === 0 && (
        <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", marginTop: 6 }}>
          Send at least one test message to enable publishing.
        </div>
      )}
    </div>
  );
}
