import React, { useState, useEffect, useRef, useCallback } from "react";
import { VERTICAL_MAP } from "../hooks/useVisitorContext";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function MeetAlex() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Session & URL params (stable across renders)
  const [sessionId] = useState(() => {
    let sid = sessionStorage.getItem("ta_guest_sid");
    if (!sid) { sid = uuid(); sessionStorage.setItem("ta_guest_sid", sid); }
    return sid;
  });
  const [vertical] = useState(() => {
    const v = new URLSearchParams(window.location.search).get("vertical") || "";
    return VERTICAL_MAP[v]?.firestoreValue || v || "";
  });
  const [prompt] = useState(() =>
    new URLSearchParams(window.location.search).get("prompt") || ""
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Send message to backend
  const sendMessage = useCallback(async (userText) => {
    const trimmed = (userText || "").trim();
    if (trimmed) {
      setMessages(prev => [...prev, { role: "user", text: trimmed }]);
    }
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/api?path=/v1/chat:message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userInput: trimmed || "(initial)",
          surface: "sales",
          campaignSlug: vertical,
          utmSource: "meet-alex",
          utmMedium: "guest-chat",
        }),
      });
      const data = await res.json();
      if (data.ok && data.message) {
        let displayText = data.message;

        // Parse [SANDBOX_OPEN:workerName] marker
        const sandboxMatch = displayText.match(/\[SANDBOX_OPEN:([^\]]+)\]/);
        if (sandboxMatch) {
          displayText = displayText.replace(/\s*\[SANDBOX_OPEN:[^\]]+\]\s*/g, "").trim();
          window.dispatchEvent(new CustomEvent("ta:panel-open-sandbox", { detail: { workerName: sandboxMatch[1] } }));
        }

        // Parse [OPEN_SANDBOX] marker (legacy)
        if (/\[OPEN_SANDBOX\]/i.test(displayText)) {
          displayText = displayText.replace(/\s*\[OPEN_SANDBOX\]\s*/gi, "").trim();
          window.dispatchEvent(new CustomEvent("ta:panel-open-sandbox", { detail: {} }));
        }

        setMessages(prev => [...prev, {
          role: "assistant",
          text: displayText,
          workerCards: data.workerCards || null,
        }]);

        // Panel sync: emit worker highlights for right panel
        if (data.workerCards && data.workerCards.length > 0) {
          const ids = data.workerCards.map(c => c.slug || c.workerId).filter(Boolean);
          if (ids.length === 1) {
            window.dispatchEvent(new CustomEvent("ta:panel-highlight-worker", { detail: { workerId: ids[0] } }));
          }
        }

        // Vertical detection → dispatch to right panel
        if (data.detectedVertical) {
          const mapped = VERTICAL_MAP[data.detectedVertical];
          window.dispatchEvent(new CustomEvent("ta:panel-show-recommendations", {
            detail: {
              vertical: mapped ? mapped.firestoreValue : data.detectedVertical,
              workers: data.workerCards || [],
              verticalLabel: mapped ? mapped.label : data.detectedVertical,
            }
          }));
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Something went wrong. Try again." }]);
    }
    setSending(false);
  }, [sessionId, vertical]);

  // Listen for "Get this worker" taps from right panel
  useEffect(() => {
    function onWorkerTapped(e) {
      const { name } = e.detail || {};
      if (name) {
        setMessages(prev => [...prev, {
          role: "assistant",
          text: `Good pick. Create an account below the card to get ${name}.`,
        }]);
      }
    }
    window.addEventListener("ta:panel-worker-tapped", onWorkerTapped);
    return () => window.removeEventListener("ta:panel-worker-tapped", onWorkerTapped);
  }, []);

  // Listen for subscribe completion — show Alex confirmation
  useEffect(() => {
    function onSubscribed(e) {
      const { name } = e.detail || {};
      setMessages(prev => [...prev, {
        role: "assistant",
        text: `You're all set. ${name || "Your worker"} is on your team now.`,
      }]);
    }
    window.addEventListener("ta:worker-subscribed", onSubscribed);
    return () => window.removeEventListener("ta:worker-subscribed", onSubscribed);
  }, []);

  // Opening message — hardcoded, no API round-trip
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: "assistant",
        text: "Hey \u2014 I'm Alex. Pick a worker or tell me what you do.",
      }]);
      if (prompt) sendMessage(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const msg = input;
    setInput("");
    sendMessage(msg);
  }

  // Styles
  const S = {
    page: { height: "100%", background: "#ffffff", display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
    header: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #e5e7eb", flexShrink: 0, background: "#ffffff" },
    headerAvatar: { width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    headerName: { fontSize: 15, fontWeight: 600, color: "#111827" },
    headerSub: { fontSize: 12, color: "#94a3b8" },
    logo: { marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#cbd5e1", letterSpacing: "0.05em" },
    messageList: { flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12, WebkitOverflowScrolling: "touch" },
    msgRow: (isUser) => ({ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }),
    bubble: (isUser) => ({
      maxWidth: "80%", padding: "10px 14px", borderRadius: 16, fontSize: 14, lineHeight: 1.5,
      whiteSpace: "pre-wrap", wordBreak: "break-word",
      ...(isUser
        ? { background: "#7c3aed", color: "#fff", borderBottomRightRadius: 4 }
        : { background: "#f3f4f6", color: "#1e293b", borderBottomLeftRadius: 4 }),
    }),
    miniAvatar: { width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    inputBar: { display: "flex", gap: 8, padding: "12px 16px", borderTop: "1px solid #e5e7eb", background: "#ffffff", flexShrink: 0 },
    input: { flex: 1, padding: "12px 16px", fontSize: 15, border: "1px solid #e5e7eb", borderRadius: 24, outline: "none", background: "#f8fafc", color: "#1e293b", boxSizing: "border-box", resize: "none", fontFamily: "inherit" },
    sendBtn: { width: 42, height: 42, borderRadius: "50%", background: "#7c3aed", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "opacity 0.15s" },
    typing: { display: "flex", gap: 4, padding: "10px 14px", borderRadius: 16, background: "#f3f4f6", borderBottomLeftRadius: 4, maxWidth: "80%" },
    dot: (i) => ({ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8", animation: `typingDot 1.2s infinite ${i * 0.2}s` }),
    workerCard: { display: "flex", gap: 12, padding: "12px 14px", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 12, marginTop: 8, cursor: "pointer", transition: "box-shadow 0.15s ease, border-color 0.15s ease" },
    wcName: { fontSize: 13, fontWeight: 600, color: "#111827" },
    wcDesc: { fontSize: 12, color: "#6b7280", marginTop: 2 },
    wcPrice: { fontSize: 12, fontWeight: 600, color: "#7c3aed", marginTop: 4 },
    wcCta: { fontSize: 11, fontWeight: 600, color: "#fff", background: "#7c3aed", borderRadius: 6, padding: "4px 10px", marginTop: 6, display: "inline-block" },
  };

  return (
    <div style={S.page}>
      <style>{`@keyframes typingDot { 0%,60%,100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }`}</style>

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerAvatar}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div>
          <div style={S.headerName}>Alex</div>
          <div style={S.headerSub}>Chief of Staff</div>
        </div>
        <div style={S.logo}>TITLEAPP</div>
      </div>

      {/* Messages */}
      <div style={S.messageList}>
        {messages.map((m, i) => (
          <div key={i}>
            <div style={S.msgRow(m.role === "user")}>
              {m.role === "assistant" && (
                <div style={S.miniAvatar}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
              )}
              <div style={S.bubble(m.role === "user")}>{m.text}</div>
            </div>
            {/* Worker cards inline */}
            {m.workerCards && m.workerCards.length > 0 && (
              <div style={{ marginLeft: 36, marginTop: 4 }}>
                {m.workerCards.map((wc, wi) => (
                  <div key={wi} style={S.workerCard}>
                    <div style={{ flex: 1 }}>
                      <div style={S.wcName}>{wc.name}</div>
                      <div style={S.wcDesc}>{wc.description}</div>
                      <div style={S.wcPrice}>{wc.price === 0 ? "Free" : `$${wc.price}/mo`}</div>
                      <div style={S.wcCta}>{wc.price === 0 ? "Get this worker" : `Subscribe \u2014 $${wc.price}/mo`}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div style={S.msgRow(false)}>
            <div style={S.miniAvatar}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div style={S.typing}>
              <div style={S.dot(0)} /><div style={S.dot(1)} /><div style={S.dot(2)} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} style={S.inputBar}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message Alex..."
          disabled={sending}
          style={{ ...S.input, opacity: sending ? 0.6 : 1 }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          style={{ ...S.sendBtn, opacity: !input.trim() || sending ? 0.4 : 1 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
