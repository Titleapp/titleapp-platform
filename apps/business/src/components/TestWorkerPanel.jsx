import React, { useState, useRef, useEffect, useCallback } from "react";
import { auth as firebaseAuth } from "../firebase";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// Robust token getter — uses real Firebase auth instance
async function getToken() {
  if (firebaseAuth?.currentUser) {
    try {
      const token = await firebaseAuth.currentUser.getIdToken(true);
      localStorage.setItem("ID_TOKEN", token);
      return token;
    } catch (_) {}
  }
  if (firebaseAuth) {
    try {
      return await new Promise((resolve, reject) => {
        const unsub = firebaseAuth.onAuthStateChanged(user => {
          unsub();
          if (user) {
            user.getIdToken(true).then(t => { localStorage.setItem("ID_TOKEN", t); resolve(t); }).catch(reject);
          } else {
            reject(new Error("Not authenticated"));
          }
        });
        setTimeout(() => { unsub(); reject(new Error("Auth timeout")); }, 5000);
      });
    } catch (_) {}
  }
  const stored = localStorage.getItem("ID_TOKEN");
  if (stored && stored !== "undefined" && stored !== "null") return stored;
  return null;
}

export default function TestWorkerPanel({ worker, workerCardData, sessionId, onExchange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [testSessionId, setTestSessionId] = useState(null);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [edgeCases, setEdgeCases] = useState([]);
  const [authError, setAuthError] = useState(false);

  // Interface preference
  const [interfacePref, setInterfacePref] = useState(null);
  const [mobileView, setMobileView] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // BUG-005: Auto-expand test chat input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + "px";
    }
  }, [input]);

  const workerName = workerCardData?.name || worker?.name || "Your Worker";
  const workerDesc = workerCardData?.description || worker?.description || "";

  function getWorkerIntro() {
    const desc = workerDesc ? ` ${workerDesc.charAt(0).toUpperCase() + workerDesc.slice(1).split(".")[0]}.` : "";
    return `Hi, I'm ${workerName}.${desc} What's your name?`;
  }

  function handleInterfaceChoice(pref) {
    setInterfacePref(pref);
    setMobileView(pref === "mobile");
    setMessages([{ role: "assistant", text: getWorkerIntro() }]);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setSending(true);
    setAuthError(false);

    try {
      const token = await getToken();
      if (!token) {
        setAuthError(true);
        setSending(false);
        return;
      }

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
          workerSpec: exchangeCount === 0 ? {
            name: workerName,
            description: workerDesc,
            targetUser: workerCardData?.targetUser || "",
            complianceRules: workerCardData?.complianceRules || "",
            raasRules: workerCardData?.raasRules || "",
          } : undefined,
        }),
      });

      if (res.status === 401) {
        const freshToken = await getToken();
        if (freshToken) {
          const retry = await fetch(`${API_BASE}/api?path=/v1/worker:test:chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${freshToken}`,
              "X-Tenant-Id": tenantId,
              "X-Vertical": "developer",
              "X-Jurisdiction": "GLOBAL",
            },
            body: JSON.stringify({ tenantId, workerId: worker?.id, userMessage: text, testSessionId }),
          });
          const retryData = await retry.json();
          if (retryData.ok) {
            handleSuccessResponse(retryData);
            return;
          }
        }
        setAuthError(true);
        setSending(false);
        return;
      }

      const data = await res.json();
      if (data.ok) {
        handleSuccessResponse(data);
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

  function handleSuccessResponse(data) {
    setMessages(prev => [...prev, { role: "assistant", text: data.workerResponse }]);
    if (data.testSessionId) setTestSessionId(data.testSessionId);
    const newCount = data.exchangeCount || (exchangeCount + 1);
    setExchangeCount(newCount);
    if (onExchange) onExchange(newCount);

    if (data.suggestedEdgeCases && data.suggestedEdgeCases.length > 0) {
      setEdgeCases(data.suggestedEdgeCases);
    }
  }

  function handleAuthRefresh() {
    setAuthError(false);
    window.location.reload();
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

  const S = {
    panel: { display: "flex", flexDirection: "column", height: "100%" },
    vaultBar: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px 12px 0 0", marginBottom: 0 },
    vaultTitle: { fontSize: 14, fontWeight: 600, color: "#64748B" },
    vaultTab: { padding: "6px 14px", background: "rgba(107,70,193,0.08)", color: "#6B46C1", borderRadius: 6, fontSize: 13, fontWeight: 600 },
    testBadge: { padding: "3px 8px", background: "rgba(16,185,129,0.1)", color: "#10b981", borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" },
    chatArea: { flex: 1, minHeight: 200, maxHeight: 400, overflowY: "auto", background: "#FFFFFF", border: "1px solid #E2E8F0", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 16, display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 },
    msgUser: { alignSelf: "flex-end", background: "#6B46C1", color: "white", padding: "8px 12px", borderRadius: "12px 12px 4px 12px", maxWidth: "85%", fontSize: 13, lineHeight: 1.5 },
    msgAssistant: { alignSelf: "flex-start", background: "#F4F4F8", color: "#1a1a2e", padding: "8px 12px", borderRadius: "12px 12px 12px 4px", maxWidth: "85%", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" },
    msgSystem: { alignSelf: "center", color: "#64748B", fontSize: 12, textAlign: "center", padding: "6px 12px", background: "rgba(100,116,139,0.06)", borderRadius: 8, maxWidth: "90%" },
    inputLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 4 },
    inputWrap: { display: "flex", gap: 8, marginBottom: 16 },
    input: { flex: 1, padding: "10px 14px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1a1a2e", fontSize: 13, outline: "none", resize: "none" },
    sendBtn: { padding: "10px 16px", background: "#10b981", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
    edgeCaseWrap: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 },
    edgeCaseChip: { padding: "6px 12px", background: "rgba(107,70,193,0.06)", color: "#6B46C1", border: "1px solid rgba(107,70,193,0.15)", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: 500 },
  };

  // Interface preference chooser — shown before test begins
  if (!interfacePref) {
    return (
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>How will most of your subscribers use this worker?</div>
        <div style={{ fontSize: 14, color: "#64748B", marginBottom: 24 }}>This sets up the right test environment.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { value: "mobile", icon: "\uD83D\uDCF1", label: "Mobile", desc: "Phone or tablet" },
            { value: "desktop", icon: "\uD83D\uDCBB", label: "Desktop", desc: "Browser or app" },
            { value: "both", icon: "\u2194\uFE0F", label: "Both", desc: "Desktop default, toggle to mobile" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => handleInterfaceChoice(opt.value)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "16px 20px",
                background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10,
                cursor: "pointer", textAlign: "left", transition: "border-color 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#6B46C1"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#E2E8F0"}
            >
              <span style={{ fontSize: 24 }}>{opt.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: "#64748B" }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Phone frame wrapper for mobile view
  const phoneFrame = mobileView ? {
    width: 390, maxWidth: "100%", margin: "0 auto",
    border: "8px solid #1a1a2e", borderRadius: 32,
    padding: "8px 0", background: "#1a1a2e", overflow: "hidden",
  } : {};

  const innerPanel = (
    <div style={S.panel}>
      {/* Vault-style top bar */}
      <div style={S.vaultBar}>
        <span style={S.testBadge}>Test Mode</span>
        <span style={S.vaultTitle}>My Vault</span>
        <span style={{ fontSize: 13, color: "#94A3B8" }}>/</span>
        <span style={S.vaultTab}>{workerName}</span>
        {interfacePref === "both" && (
          <button
            onClick={() => setMobileView(!mobileView)}
            style={{ marginLeft: "auto", padding: "4px 10px", background: "rgba(107,70,193,0.08)", color: "#6B46C1", border: "1px solid rgba(107,70,193,0.15)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            {mobileView ? "Desktop view" : "Mobile view"}
          </button>
        )}
      </div>

      {/* Test Chat */}
      <div style={S.chatArea}>
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === "user" ? S.msgUser : msg.role === "system" ? S.msgSystem : S.msgAssistant}>
            {msg.text}
          </div>
        ))}
        {sending && <div style={{ color: "#94A3B8", fontSize: 12, padding: "4px 0" }}>{workerName} is thinking...</div>}

        {authError && (
          <div style={{ alignSelf: "center", padding: "8px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 12, color: "#1a1a2e", textAlign: "center" }}>
            Having trouble connecting —{" "}
            <span onClick={handleAuthRefresh} style={{ color: "#6B46C1", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>click here to refresh</span>.
          </div>
        )}

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
      <div style={S.inputLabel}>You're testing as a subscriber. Ask it anything.</div>
      <div style={S.inputWrap}>
        <textarea
          ref={inputRef}
          style={{ ...S.input, overflowY: "auto", minHeight: 44 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your worker something..."
          rows={2}
        />
        <button style={S.sendBtn} onClick={handleSend} disabled={sending}>Send</button>
      </div>
    </div>
  );

  if (mobileView) {
    return <div style={phoneFrame}><div style={{ background: "#F8F9FC", borderRadius: 24, overflow: "hidden", height: "100%" }}>{innerPanel}</div></div>;
  }

  return innerPanel;
}
