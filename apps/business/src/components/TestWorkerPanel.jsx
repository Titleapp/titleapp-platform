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
  const [starterPromptsVisible, setStarterPromptsVisible] = useState(true);

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
    if (workerCardData?.welcomeMessage) return workerCardData.welcomeMessage;
    const target = workerCardData?.targetUser;
    const desc = workerDesc ? workerDesc.charAt(0).toUpperCase() + workerDesc.slice(1).split(".")[0] : "";
    let greeting = `Hi, I'm ${workerName}.`;
    if (target && desc) {
      greeting += ` I help ${target.toLowerCase()} with ${desc.toLowerCase()}.`;
    } else if (desc) {
      greeting += ` ${desc}.`;
    }
    greeting += "\n\nTo get started, describe what you're working on and I'll take it from there.";
    return greeting;
  }

  function getStarterPrompts() {
    if (workerCardData?.starterPrompts?.length > 0) return workerCardData.starterPrompts.slice(0, 3);
    const desc = (workerCardData?.description || workerDesc || "").split(".")[0].toLowerCase();
    const prompts = [];
    if (desc) prompts.push(`Walk me through how you handle ${desc}`);
    prompts.push("What do you need from me to get started?");
    prompts.push("Show me an example of your output");
    return prompts.slice(0, 3);
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
    setStarterPromptsVisible(false);

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
          workerSpec: {
            name: workerName,
            description: workerDesc,
            targetUser: workerCardData?.targetUser || "",
            complianceRules: workerCardData?.complianceRules || "",
            raasRules: workerCardData?.raasRules || "",
          },
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
            body: JSON.stringify({ tenantId, workerId: worker?.id, userMessage: text, testSessionId, workerSpec: {
              name: workerName, description: workerDesc,
              targetUser: workerCardData?.targetUser || "",
              complianceRules: workerCardData?.complianceRules || "",
              raasRules: workerCardData?.raasRules || "",
            } }),
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
    vaultBar: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px 12px 0 0", marginBottom: 0, flexShrink: 0 },
    vaultTitle: { fontSize: 14, fontWeight: 600, color: "#64748B" },
    vaultTab: { padding: "6px 14px", background: "rgba(107,70,193,0.08)", color: "#6B46C1", borderRadius: 6, fontSize: 13, fontWeight: 600 },
    testBadge: { padding: "3px 8px", background: "rgba(16,185,129,0.1)", color: "#10b981", borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" },
    chatArea: { flex: 1, minHeight: 0, overflowY: "auto", background: "#FFFFFF", border: "1px solid #E2E8F0", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 16, display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 },
    msgUser: { alignSelf: "flex-end", background: "#6B46C1", color: "white", padding: "8px 12px", borderRadius: "12px 12px 4px 12px", maxWidth: "85%", fontSize: 13, lineHeight: 1.5 },
    msgAssistant: { alignSelf: "flex-start", background: "#F4F4F8", color: "#1a1a2e", padding: "8px 12px", borderRadius: "12px 12px 12px 4px", maxWidth: "85%", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" },
    msgSystem: { alignSelf: "center", color: "#64748B", fontSize: 12, textAlign: "center", padding: "6px 12px", background: "rgba(100,116,139,0.06)", borderRadius: 8, maxWidth: "90%" },
    inputLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 4, flexShrink: 0 },
    inputWrap: { display: "flex", gap: 8, marginBottom: 16, flexShrink: 0 },
    input: { flex: 1, padding: "10px 14px", background: "#F8F9FC", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1a1a2e", fontSize: 13, outline: "none", resize: "none" },
    sendBtn: { padding: "10px 16px", background: "#10b981", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
    edgeCaseWrap: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, flexShrink: 0 },
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
    height: "min(85vh, 700px)",
  } : {};

  // Simulated Vault nav (left column)
  const vaultNav = (
    <div style={{ width: mobileView ? 0 : 200, flexShrink: 0, background: "#F8F9FC", borderRight: "1px solid #E2E8F0", display: mobileView ? "none" : "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "16px 14px 12px", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>My Vault</div>
        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Test Workspace</div>
      </div>
      <div style={{ padding: "10px 8px", flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 8px", marginBottom: 4 }}>Workers</div>
        <div style={{ padding: "8px 10px", background: "rgba(107,70,193,0.04)", borderRadius: 6, marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>&#9733;</span>
          <span style={{ fontSize: 12, color: "#64748B" }}>Alex (Chief of Staff)</span>
        </div>
        <div style={{ padding: "8px 10px", background: "rgba(107,70,193,0.1)", border: "1px solid rgba(107,70,193,0.2)", borderRadius: 6, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: "#10b981", flexShrink: 0 }}></span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#6B46C1" }}>{workerName}</span>
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 8px", marginTop: 12, marginBottom: 4 }}>My Work</div>
        {["Dashboard", "Documents", "Signatures", "Reports", "Clients & Contacts"].map(item => (
          <div key={item} style={{ padding: "6px 10px", fontSize: 12, color: "#CBD5E1", cursor: "default" }}>{item}</div>
        ))}
      </div>
      <div style={{ padding: "12px 14px", borderTop: "1px solid #E2E8F0" }}>
        <div style={{ fontSize: 11, color: "#94A3B8" }}>Browse Marketplace</div>
      </div>
    </div>
  );

  // Chat column (center)
  const chatColumn = (
    <div style={S.panel}>
      {/* Test mode header */}
      <div style={S.vaultBar}>
        <span style={S.testBadge}>Test Mode</span>
        <span style={S.vaultTab}>{workerName}</span>
        {interfacePref === "both" && (
          <button onClick={() => setMobileView(!mobileView)}
            style={{ marginLeft: "auto", padding: "4px 10px", background: "rgba(107,70,193,0.08)", color: "#6B46C1", border: "1px solid rgba(107,70,193,0.15)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {mobileView ? "Desktop view" : "Mobile view"}
          </button>
        )}
      </div>
      <div style={S.chatArea}>
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === "user" ? S.msgUser : msg.role === "system" ? S.msgSystem : S.msgAssistant}>
            {msg.text}
          </div>
        ))}
        {starterPromptsVisible && messages.length === 1 && !sending && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {getStarterPrompts().map((prompt, i) => (
              <button key={i} onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                style={{ alignSelf: "flex-start", padding: "8px 14px", background: "rgba(107,70,193,0.06)", color: "#6B46C1", border: "1px solid rgba(107,70,193,0.15)", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: 500, textAlign: "left" }}>
                {prompt}
              </button>
            ))}
          </div>
        )}
        {sending && <div style={{ color: "#94A3B8", fontSize: 12, padding: "4px 0" }}>{workerName} is thinking...</div>}
        {authError && (
          <div style={{ alignSelf: "center", padding: "8px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 12, color: "#1a1a2e", textAlign: "center" }}>
            Having trouble connecting —{" "}
            <span onClick={handleAuthRefresh} style={{ color: "#6B46C1", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>click here to refresh</span>.
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {edgeCases.length > 0 && (
        <div style={S.edgeCaseWrap}>
          <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, alignSelf: "center" }}>Try:</span>
          {edgeCases.map((ec, i) => (
            <button key={i} style={S.edgeCaseChip} onClick={() => handleEdgeCaseClick(ec)}>{ec}</button>
          ))}
        </div>
      )}
      <div style={S.inputLabel}>You're testing as a subscriber. Ask it anything.</div>
      <div style={S.inputWrap}>
        <textarea ref={inputRef} style={{ ...S.input, overflowY: "auto", minHeight: 44 }} value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Ask your worker something..." rows={2} />
        <button style={S.sendBtn} onClick={handleSend} disabled={sending}>Send</button>
      </div>
    </div>
  );

  // Workspace column (right) — simulated worker dashboard
  const workspaceColumn = (
    <div style={{ width: mobileView ? 0 : 260, flexShrink: 0, background: "#FAFBFC", borderLeft: "1px solid #E2E8F0", display: mobileView ? "none" : "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "16px 14px 12px", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>Workspace</div>
        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{workerName}</div>
      </div>
      <div style={{ padding: 14, flex: 1, overflowY: "auto" }}>
        {/* Sample data cards */}
        {[
          { title: "Recent Activity", items: ["Waiting for first interaction..."] },
          { title: "Quick Stats", items: ["Conversations: 0", "Tasks completed: 0", "Compliance checks: 0"] },
          { title: "Documents", items: ["No documents generated yet"] },
        ].map((card, ci) => (
          <div key={ci} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>{card.title}</div>
            {card.items.map((item, ii) => (
              <div key={ii} style={{ fontSize: 12, color: "#CBD5E1", padding: "3px 0", fontStyle: "italic" }}>{item}</div>
            ))}
          </div>
        ))}
        <div style={{ fontSize: 10, color: "#CBD5E1", textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
          Sample data — will populate from subscriber inputs
        </div>
      </div>
    </div>
  );

  // Three-column Vault layout
  const vaultLayout = (
    <div style={{ display: "flex", height: mobileView ? "100%" : "min(85vh, 700px)", background: "#FFFFFF", border: mobileView ? "none" : "1px solid #E2E8F0", borderRadius: mobileView ? 0 : 12, overflow: "hidden" }}>
      {vaultNav}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {chatColumn}
      </div>
      {workspaceColumn}
    </div>
  );

  if (mobileView) {
    return <div style={phoneFrame}><div style={{ background: "#F8F9FC", borderRadius: 24, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>{chatColumn}</div></div>;
  }

  return vaultLayout;
}
