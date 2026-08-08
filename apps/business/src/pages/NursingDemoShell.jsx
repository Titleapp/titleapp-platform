// Full-screen focused chat with Hannah — no sidebar, no full app nav.
// Handles its own sign-in: signs in as demo persona, then becomes the chat UI.
// Used for /demo/nursing (faculty) and /demo/nursing/student.
import React, { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";
import { signInWithCustomToken } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api-feyfibglbq-uc.a.run.app";

const PERSONAS = {
  "nursing-admin": {
    label: "Dr. Kealani Moku, Course Lead",
    workspace: "Makai School of Nursing",
    worker: "nursing-education-001",
    greeting: "Hi — I'm Hannah. Tell me about a student's clinical evaluation entry and I'll help you write substantive faculty feedback, or coach you on applying the Tanner Clinical Judgment Model to what you observed.",
  },
  "nursing-student": {
    label: "Sara Kahele, BSN Student",
    workspace: "Makai School of Nursing",
    worker: "nursing-education-001",
    greeting: "Hi — I'm Hannah. I can coach you on writing a strong CET reflection, quiz you on the Tanner Clinical Judgment phases, or help you understand what your instructor is looking for. What are you working on today?",
  },
};

export default function NursingDemoShell({ persona }) {
  const cfg = PERSONAS[persona] || PERSONAS["nursing-admin"];
  const [phase, setPhase] = useState("signing-in");
  const [errMsg, setErrMsg] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", content: cfg.greeting }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const userRef = useRef(null);
  const tenantRef = useRef(null);
  const sessionIdRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Generate a stable demo session ID for this browser session
  useEffect(() => {
    const key = `demo_sid_${persona}`;
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = `demo_${persona}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(key, sid);
    }
    sessionIdRef.current = sid;
  }, [persona]);

  // Sign in as demo persona
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const watchdog = setTimeout(() => {
      if (!cancelled) {
        ctrl.abort();
        setErrMsg("The demo is taking longer than usual to load.");
        setPhase("error");
      }
    }, 15000);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api?path=/v1/demo:token&persona=${persona}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!data.ok || !data.token) throw new Error(data.error || "Demo unavailable.");
        const cred = await signInWithCustomToken(auth, data.token);
        if (cancelled) return;
        clearTimeout(watchdog);
        userRef.current = cred.user;
        tenantRef.current = data.tenantId || "";
        setPhase("ready");
      } catch (e) {
        if (!cancelled) {
          clearTimeout(watchdog);
          setErrMsg(e.name === "AbortError" ? "The demo is taking longer than usual." : (e.message || "Could not load the demo."));
          setPhase("error");
        }
      }
    })();
    return () => { cancelled = true; clearTimeout(watchdog); ctrl.abort(); };
  }, [persona]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    try {
      const token = await (userRef.current?.getIdToken(false) ?? Promise.resolve(null));
      const res = await fetch(`${API_BASE}/api?path=/v1/chat:message`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Tenant-Id": tenantRef.current || "",
          "X-Vertical": "healthcare",
        },
        body: JSON.stringify({
          message: text,
          userInput: text,
          selectedWorker: cfg.worker,
          subscribedWorkers: [{ slug: cfg.worker, workerId: cfg.worker }],
          sessionId: sessionIdRef.current || `demo_${persona}`,
        }),
      });
      const data = await res.json();
      const reply = data.message || data.response || data.content || "I'm sorry, I couldn't process that. Please try again.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "I'm having trouble connecting right now. Please try again in a moment." }]);
    }
    setSending(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (phase === "signing-in" || phase === "error") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, background: "#0b0b12", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Loading SOCIII demo…</div>
        <div style={{ fontSize: 14, color: "#a78bfa" }}>{cfg.workspace} · {cfg.label}</div>
        {phase === "error"
          ? <div style={{ color: "#f87171", fontSize: 13 }}>{errMsg} — <a href={window.location.href} style={{ color: "#a78bfa" }}>retry</a></div>
          : <div style={{ width: 28, height: 28, border: "3px solid #2a2a3a", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#fff", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6C47FF", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {cfg.workspace}
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Hannah · AI Clinical Education Worker</div>
        </div>
        <HannahAvatar size={32} />
      </div>

      {/* Message list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0 12px", display: "flex", flexDirection: "column", gap: 0 }}>
        {messages.map((msg, i) => (
          <MessageRow key={i} msg={msg} />
        ))}
        {sending && <TypingRow />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div style={{ padding: "12px 24px 20px", borderTop: "1px solid #E2E8F0", background: "#fff", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask Hannah something…"
            rows={1}
            style={{
              flex: 1, padding: "10px 14px", border: "1.5px solid #E2E8F0",
              borderRadius: 10, fontSize: 14, resize: "none", outline: "none",
              fontFamily: "inherit", background: "#F8FAFC", lineHeight: 1.5,
              maxHeight: 120, overflowY: "auto",
              transition: "border-color 0.15s",
            }}
            onFocus={e => { e.target.style.borderColor = "#6C47FF"; }}
            onBlur={e => { e.target.style.borderColor = "#E2E8F0"; }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            style={{
              padding: "0 18px", background: "#6C47FF", color: "#fff", border: "none",
              borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: sending || !input.trim() ? "not-allowed" : "pointer",
              opacity: sending || !input.trim() ? 0.45 : 1,
              height: 40, flexShrink: 0,
              transition: "opacity 0.15s",
            }}
          >
            Send
          </button>
        </div>
        <div style={{ fontSize: 11, color: "#CBD5E1", marginTop: 8, textAlign: "center" }}>
          Powered by SOCIII · Hannah knows your curriculum and clinical evaluation rubrics
        </div>
      </div>
    </div>
  );
}

function HannahAvatar({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg, #6C47FF 0%, #a78bfa 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <span style={{ fontSize: size * 0.44, color: "#fff", fontWeight: 700, lineHeight: 1 }}>H</span>
    </div>
  );
}

function MessageRow({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      padding: "8px 24px",
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: 10,
      alignItems: "flex-start",
    }}>
      {!isUser && <HannahAvatar size={28} />}
      {isUser && (
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>U</span>
        </div>
      )}
      <div style={{
        maxWidth: "72%", padding: "11px 15px", fontSize: 14, lineHeight: 1.65,
        borderRadius: isUser ? "12px 12px 0 12px" : "0 12px 12px 12px",
        background: isUser ? "#6C47FF" : "#F8FAFC",
        color: isUser ? "#fff" : "#1E293B",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {msg.content}
      </div>
    </div>
  );
}

function TypingRow() {
  return (
    <div style={{ padding: "8px 24px", display: "flex", gap: 10, alignItems: "flex-start" }}>
      <HannahAvatar size={28} />
      <div style={{ background: "#F8FAFC", borderRadius: "0 12px 12px 12px", padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%", background: "#94A3B8",
              animation: `hannahBounce 1.2s ease-in-out ${i * 0.18}s infinite`,
            }} />
          ))}
        </div>
        <style>{`@keyframes hannahBounce{0%,80%,100%{transform:translateY(0);opacity:0.5}40%{transform:translateY(-4px);opacity:1}}`}</style>
      </div>
    </div>
  );
}
