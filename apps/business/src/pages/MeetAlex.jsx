import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth } from "../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";

// Map URL vertical params to backend sales verticals
const VERTICAL_MAP = {
  "auto-dealer": "auto_dealer", "auto": "auto_dealer", "dealer": "auto_dealer",
  "solar": "solar_vpp", "solar-vpp": "solar_vpp",
  "real-estate": "real_estate_development", "re": "real_estate_development",
  "property-management": "re_operations", "pm": "re_operations",
  "aviation": "aviation", "pilot": "aviation",
  "creator": "creators", "creators": "creators", "developer": "creators",
  "web3": "web3", "crypto": "web3", "nft": "web3",
};

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
  const [showAuth, setShowAuth] = useState(false);
  const [authInProgress, setAuthInProgress] = useState(false);
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
    return VERTICAL_MAP[v] || v || "";
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

    // Add user message to UI (skip for initial empty ping)
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

        // Parse [SANDBOX_OPEN:workerName] marker — open sandbox in right panel
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
        if (data.suggestAuth) setShowAuth(true);
        // Panel sync: emit worker highlights for right panel
        if (data.workerCards && data.workerCards.length > 0) {
          const ids = data.workerCards.map(c => c.slug || c.workerId).filter(Boolean);
          if (ids.length === 1) {
            window.dispatchEvent(new CustomEvent("ta:panel-highlight-worker", { detail: { workerId: ids[0] } }));
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Something went wrong. Try again." }]);
    }
    setSending(false);
  }, [sessionId, vertical]);

  // On mount: send initial message to get Alex's opening
  useEffect(() => {
    if (messages.length === 0) {
      sendMessage(prompt || "");
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

  // Google SSO
  async function handleGoogleAuth() {
    setAuthInProgress(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const token = await cred.user.getIdToken(true);
      localStorage.setItem("ID_TOKEN", token);

      // Store UTM
      sessionStorage.setItem("ta_utm", JSON.stringify({
        source: "meet-alex", medium: "guest-chat",
        campaign: vertical || "direct", capturedAt: new Date().toISOString(),
      }));

      // Store full guest conversation for ChatPanel to render
      const guestConvo = messages.filter(m => m.text && m.text.trim());
      if (guestConvo.length > 0) {
        sessionStorage.setItem("ta_guest_promoted", JSON.stringify(guestConvo));
      }

      // Promote guest session
      try {
        await fetch(`${API_BASE}/api?path=/v1/alex:promoteGuest`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ guestId: sessionId, uid: cred.user.uid }),
        });
      } catch { /* non-fatal */ }

      // Store campaign context for sales mode continuity
      if (vertical) {
        sessionStorage.setItem("ta_campaign_context", JSON.stringify({ slug: vertical, persona: vertical, vertical }));
      }

      // Show disclaimer inline, then unlock shell
      setShowAuth(false);
      setShowDisclaimer(true);
    } catch (err) {
      console.error("Google auth failed:", err);
      setAuthInProgress(false);
    }
  }

  // Disclaimer acceptance — fires after SSO success
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const ID_CHECK_VERTICALS = ["solar_vpp", "aviation", "real_estate_development", "title", "health", "finance"];

  function handleDisclaimerAccept() {
    setShowDisclaimer(false);
    setAuthInProgress(false);

    // ID check message for high-trust verticals
    if (ID_CHECK_VERTICALS.includes(vertical)) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Just so you know — because you're working with " + (vertical.replace(/_/g, " ")) + ", we may do a quick ID check at some point. Takes 60 seconds, keeps everything secure. I'll let you know when it comes up.",
      }]);
    }

    // Redirect to authenticated shell
    window.location.href = "/?promoted=true" + (vertical ? "&vertical=" + vertical : "") + "&utm_source=meet-alex&utm_medium=guest-chat" + (vertical ? "&utm_campaign=" + vertical : "");
  }

  // Disclaimer + auth state
  const [tosChecked, setTosChecked] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // Magic link state
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSending, setMagicSending] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  async function handleMagicLink(e) {
    e.preventDefault();
    if (!magicEmail.trim() || magicSending) return;
    setMagicSending(true);
    try {
      const res = await fetch(`${API_BASE}/api?path=/v1/auth:sendMagicLink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: magicEmail.trim(), guestId: sessionId, vertical }),
      });
      const data = await res.json();
      if (data.ok) {
        setMagicSent(true);
        setMessages(prev => [...prev, { role: "assistant", text: "I just sent you a magic link. Check your email and tap the link to pick up right where we left off." }]);
      }
    } catch { /* non-fatal */ }
    setMagicSending(false);
  }

  // Email flow — simple email input + signInWithEmailAndPassword or redirect to login
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");

  async function handleEmailAuth(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setAuthInProgress(true);

    // Store context before redirect
    sessionStorage.setItem("ta_utm", JSON.stringify({
      source: "meet-alex", medium: "guest-chat",
      campaign: vertical || "direct", capturedAt: new Date().toISOString(),
    }));
    const guestConvo = messages.filter(m => m.text && m.text.trim());
    if (guestConvo.length > 0) {
      sessionStorage.setItem("ta_guest_promoted", JSON.stringify(guestConvo));
    }
    if (vertical) {
      sessionStorage.setItem("ta_campaign_context", JSON.stringify({ slug: vertical, persona: vertical, vertical }));
    }
    sessionStorage.setItem("ta_guest_email", email.trim());

    // Redirect to main app which will show the login flow
    window.location.href = "/?promoted=true" + (vertical ? "&vertical=" + vertical : "") + "&utm_source=meet-alex&utm_medium=guest-chat" + (vertical ? "&utm_campaign=" + vertical : "");
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
    sendBtn: { width: 42, height: 42, borderRadius: "50%", background: "#7c3aed", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: 1, transition: "opacity 0.15s" },
    typing: { display: "flex", gap: 4, padding: "10px 14px", borderRadius: 16, background: "#f3f4f6", borderBottomLeftRadius: 4, maxWidth: "80%" },
    dot: (i) => ({ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8", animation: `typingDot 1.2s infinite ${i * 0.2}s` }),
    // Auth card
    authCard: { margin: "0 16px 8px", padding: "16px 20px", background: "#f3f0ff", border: "1px solid #e9d5ff", borderRadius: 16 },
    authTitle: { fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 12 },
    authBtn: (bg) => ({ width: "100%", padding: "12px", fontSize: 14, fontWeight: 600, color: "#fff", background: bg, border: "none", borderRadius: 10, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }),
    authDivider: { fontSize: 12, color: "#94a3b8", textAlign: "center", margin: "4px 0 8px" },
    emailInput: { width: "100%", padding: "10px 14px", fontSize: 14, border: "1px solid #e5e7eb", borderRadius: 10, outline: "none", background: "#f8fafc", color: "#1e293b", boxSizing: "border-box", marginBottom: 8 },
    workerCard: { display: "flex", gap: 12, padding: "12px 14px", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 12, marginTop: 8 },
    wcName: { fontSize: 13, fontWeight: 600, color: "#111827" },
    wcDesc: { fontSize: 12, color: "#6b7280", marginTop: 2 },
    wcPrice: { fontSize: 12, fontWeight: 600, color: "#7c3aed", marginTop: 4 },
  };

  return (
    <div style={S.page}>
      {/* Typing animation keyframes */}
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
            {/* Worker cards */}
            {m.workerCards && m.workerCards.length > 0 && (
              <div style={{ marginLeft: 36, marginTop: 4 }}>
                {m.workerCards.map((wc, wi) => (
                  <div key={wi} style={S.workerCard}>
                    <div style={{ flex: 1 }}>
                      <div style={S.wcName}>{wc.name}</div>
                      <div style={S.wcDesc}>{wc.description}</div>
                      <div style={S.wcPrice}>{wc.price === 0 ? "Free" : `$${wc.price}/mo`}</div>
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

      {/* Auth card — disclaimer FIRST, then auth options */}
      {showAuth && !authInProgress && !disclaimerAccepted && (
        <div style={S.authCard}>
          <div style={S.authTitle}>Before we continue</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 12, maxHeight: 120, overflowY: "auto" }}>
            TitleApp Digital Workers provide information and automation within defined business rules. They do not constitute professional advice (legal, financial, medical, or aviation). All outputs include an audit trail. By continuing, you agree to the TitleApp Terms of Service and Privacy Policy.
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#e2e8f0" }}>
            <input type="checkbox" checked={tosChecked} onChange={e => setTosChecked(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#7c3aed" }} />
            I agree to the TitleApp Terms of Service
          </label>
          {tosChecked && (
            <button onClick={() => setDisclaimerAccepted(true)} style={{ ...S.sendBtn, width: "100%", borderRadius: 10, height: "auto", padding: "12px 24px", fontSize: 14, fontWeight: 600, marginTop: 12 }}>
              Continue
            </button>
          )}
        </div>
      )}

      {showAuth && !authInProgress && disclaimerAccepted && (
        <div style={S.authCard}>
          <div style={S.authTitle}>Sign in to continue</div>
          {/* Primary: magic link */}
          <form onSubmit={handleMagicLink} style={{ marginBottom: 8 }}>
            <input
              type="email"
              value={magicEmail}
              onChange={e => setMagicEmail(e.target.value)}
              placeholder="your@email.com"
              autoFocus
              style={S.emailInput}
            />
            <button type="submit" style={S.authBtn("#7c3aed")} disabled={!magicEmail.trim() || magicSending}>
              {magicSending ? "Sending..." : magicSent ? "Link sent — check your email" : "Send magic link"}
            </button>
          </form>
          <div style={S.authDivider}>or</div>
          {/* Secondary: Google SSO */}
          <button onClick={handleGoogleAuth} style={S.authBtn("#4285f4")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
        </div>
      )}

      {authInProgress && !showDisclaimer && (
        <div style={{ ...S.authCard, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Setting things up...</div>
        </div>
      )}

      {/* Disclaimer — inline after SSO success */}
      {showDisclaimer && (
        <div style={S.authCard}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Before we continue</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 16 }}>
            TitleApp Digital Workers provide information and automation within defined business rules. They do not constitute professional advice (legal, financial, medical, or aviation). All outputs include an audit trail. By continuing, you agree to the TitleApp Terms of Service and Privacy Policy.
          </div>
          <button onClick={handleDisclaimerAccept} style={{ ...S.sendBtn, width: "100%", borderRadius: 10, height: "auto", padding: "12px 24px", fontSize: 14, fontWeight: 600 }}>
            I understand — let's go
          </button>
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSubmit} style={S.inputBar}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message Alex..."
          disabled={sending || authInProgress}
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
