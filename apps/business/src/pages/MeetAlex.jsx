import React, { useState, useEffect, useRef, useCallback } from "react";
import { signInAnonymously, GoogleAuthProvider, linkWithPopup, linkWithRedirect, signInWithCredential } from "firebase/auth";
import { auth } from "../firebase";
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
  const [nameCollected, setNameCollected] = useState(false);
  const userMsgCount = useRef(0);
  const [showSave, setShowSave] = useState(false);
  const [savedAccount, setSavedAccount] = useState(false);
  const [saveEmail, setSaveEmail] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSending, setSaveSending] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); // "" | "check-inbox"
  const [resendCountdown, setResendCountdown] = useState(0);

  // Worker preview lead capture
  const previewWorkerRef = useRef(null);       // { workerId, workerName, slug }
  const [leadCaptureQueued, setLeadCaptureQueued] = useState(false);
  const [awaitingLead, setAwaitingLead] = useState(false);
  const previewMsgCount = useRef(0);

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

  // Anonymous auth on mount — gives the user a Firebase UID for subscriptions
  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(err => console.error("[MeetAlex] anon auth:", err));
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

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

  // Listen for paid worker preview — send greeting + queue lead capture
  useEffect(() => {
    function onPreview(e) {
      const { workerId, workerName, slug } = e.detail || {};
      if (!workerId) return;
      previewWorkerRef.current = { workerId, workerName, slug };
      previewMsgCount.current = 0;
      // Alex greeting with worker context
      setMessages(prev => [...prev, {
        role: "assistant",
        text: `Hey \u2014 I'm your ${workerName || "Digital Worker"}. Ask me anything.`,
      }]);
      setLeadCaptureQueued(true);
    }
    window.addEventListener("ta:worker-preview-opened", onPreview);
    return () => window.removeEventListener("ta:worker-preview-opened", onPreview);
  }, []);

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
      const { name, price } = e.detail || {};
      const msg = (price && price > 0)
        ? `You're all set. Your 14-day trial of ${name || "your worker"} starts now. No charge today.`
        : `You're all set. ${name || "Your worker"} is on your team now.`;
      setMessages(prev => [...prev, { role: "assistant", text: msg }]);
    }
    window.addEventListener("ta:worker-subscribed", onSubscribed);
    return () => window.removeEventListener("ta:worker-subscribed", onSubscribed);
  }, []);

  // Opening message — name-first, no API round-trip
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: "assistant",
        text: "Hey \u2014 what's your name?",
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shared transition after successful auth upgrade
  function completeAuthUpgrade(idToken, uid) {
    localStorage.setItem("ID_TOKEN", idToken);
    localStorage.setItem("DISCLAIMER_ACCEPTED", "true");
    setSavedAccount(true);
    setShowSave(false);

    const guestName = sessionStorage.getItem("ta_guest_name") || "";
    setMessages(prev => [...prev, {
      role: "assistant",
      text: `Saved${guestName ? `, ${guestName}` : ""}. Taking you to your workspace.`,
    }]);

    // Promote guest session
    const guestId = sessionStorage.getItem("ta_guest_sid");
    if (guestId) {
      fetch(`${API_BASE}/api?path=/v1/alex:promoteGuest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ guestId, uid }),
      }).catch(() => {});
    }

    sessionStorage.setItem("ta_utm", JSON.stringify({
      source: "meet-alex", medium: "guest-chat",
      campaign: vertical || "direct", capturedAt: new Date().toISOString(),
    }));
    sessionStorage.setItem("ta_guest_promoted", "true");

    setTimeout(() => {
      const v = vertical ? `&vertical=${vertical}` : "";
      window.history.replaceState({}, "", `/?promoted=true${v}&utm_source=meet-alex&utm_medium=guest-chat`);
      window.dispatchEvent(new CustomEvent("ta:meet-alex-unlock"));
    }, 2500);
  }

  // Save moment — Google auth (primary)
  async function handleGoogleSave() {
    setSaveSending(true);
    setSaveError("");
    window.dispatchEvent(new CustomEvent("ta:meet-alex-lock"));

    const anonUid = auth.currentUser?.uid;
    sessionStorage.setItem("ta_pre_link_anon_uid", anonUid || "");

    try {
      const provider = new GoogleAuthProvider();
      const result = await linkWithPopup(auth.currentUser, provider);
      const idToken = await result.user.getIdToken(true);
      completeAuthUpgrade(idToken, result.user.uid);
    } catch (err) {
      if (err?.code === "auth/popup-blocked") {
        // Mobile fallback — redirect-based flow
        try {
          await linkWithRedirect(auth.currentUser, new GoogleAuthProvider());
        } catch { /* redirect will navigate away */ }
        return;
      }

      if (err?.code === "auth/credential-already-in-use") {
        // Google account already exists — sign in and transfer subscriptions
        try {
          const credential = GoogleAuthProvider.credentialFromError(err);
          const result = await signInWithCredential(auth, credential);
          const idToken = await result.user.getIdToken(true);

          // Transfer subscriptions from anonymous UID to real UID
          if (anonUid && anonUid !== result.user.uid) {
            fetch(`${API_BASE}/api?path=/v1/subscription:transfer`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({ fromUid: anonUid, toUid: result.user.uid }),
            }).catch(() => {});
          }

          completeAuthUpgrade(idToken, result.user.uid);
          return;
        } catch {
          setSaveError("Sign-in failed. Try again.");
        }
      }

      // Cancelled or other error
      if (err?.code !== "auth/cancelled-popup-request" && err?.code !== "auth/popup-closed-by-user") {
        setSaveError("Google sign-in failed. Try again.");
      }
      setSaveSending(false);
      window.dispatchEvent(new CustomEvent("ta:meet-alex-unlock"));
    }
  }

  // Save moment — Magic link (fallback)
  async function handleMagicLinkSave() {
    if (!saveEmail || !saveEmail.includes("@")) { setSaveError("Enter a valid email."); return; }
    setSaveSending(true);
    setSaveError("");

    sessionStorage.setItem("ta_pre_magic_uid", auth.currentUser?.uid || "");

    try {
      const res = await fetch(`${API_BASE}/api?path=/v1/magic-link:send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: saveEmail,
          workerId: "alex-platform",
          workerSlug: "alex",
          workerName: "Alex",
          preAuthUid: auth.currentUser?.uid || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaveStatus("check-inbox");
        setResendCountdown(60);
      } else {
        setSaveError(data.error || "Could not send link. Try again.");
      }
    } catch {
      setSaveError("Something went wrong. Try again.");
    }
    setSaveSending(false);
  }

  // Resend magic link
  async function handleResendMagicLink() {
    setResendCountdown(60);
    setSaveError("");
    try {
      await fetch(`${API_BASE}/api?path=/v1/magic-link:send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: saveEmail,
          workerId: "alex-platform",
          workerSlug: "alex",
          workerName: "Alex",
          preAuthUid: auth.currentUser?.uid || null,
        }),
      });
    } catch { /* non-fatal */ }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const msg = input;
    setInput("");

    // First message = name
    if (!nameCollected) {
      const name = msg.trim();
      setNameCollected(true);
      sessionStorage.setItem("ta_guest_name", name);
      setMessages(prev => [
        ...prev,
        { role: "user", text: name },
        { role: "assistant", text: `Got it ${name}. Pick a worker from the panel and let's go.` },
      ]);
      if (prompt) sendMessage(prompt);
      return;
    }

    // Lead capture: detect email or phone when awaiting
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phoneRegex = /[+]?[1-9][0-9]{7,14}/;
    if (awaitingLead) {
      const match = msg.match(emailRegex) || msg.match(phoneRegex);
      if (match) {
        // Store lead
        const contact = match[0];
        const pw = previewWorkerRef.current;
        const uid = auth.currentUser?.uid || sessionStorage.getItem("ta_guest_sid") || "unknown";
        fetch(`${API_BASE}/api?path=/v1/guestLead:save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, contact, workerSlug: pw?.slug || pw?.workerId || "", vertical }),
        }).catch(() => {});
        setMessages(prev => [
          ...prev,
          { role: "user", text: msg },
          { role: "assistant", text: "Got it. Now \u2014 what do you want to know?" },
        ]);
        setAwaitingLead(false);
      } else if (/\b(no|skip|later|nah|not now)\b/i.test(msg)) {
        setMessages(prev => [
          ...prev,
          { role: "user", text: msg },
          { role: "assistant", text: "No problem. What can I help you with?" },
        ]);
        setAwaitingLead(false);
      } else {
        // Not recognized — send normally
        sendMessage(msg);
        setAwaitingLead(false);
      }
    } else if (leadCaptureQueued) {
      // Send the user message normally, then queue lead capture as Alex's next message
      sendMessage(msg);
      setLeadCaptureQueued(false);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: "assistant",
          text: "Before we dive in \u2014 what's a good email or number so I can save this for you?",
        }]);
        setAwaitingLead(true);
      }, 1500);
    } else {
      sendMessage(msg);
    }

    // Track message count for worker preview (TrialBanner)
    if (previewWorkerRef.current) {
      previewMsgCount.current++;
      window.dispatchEvent(new CustomEvent("ta:worker-message-count", {
        detail: { count: previewMsgCount.current, workerSlug: previewWorkerRef.current.slug || previewWorkerRef.current.workerId },
      }));
    }

    // After 3 user messages, show save prompt
    userMsgCount.current++;
    if (userMsgCount.current >= 3 && !showSave && !savedAccount) {
      setTimeout(() => setShowSave(true), 3000);
    }
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
                      <div style={S.wcCta}>{wc.price === 0 ? "Get this worker" : "Start 14-day free trial"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Save prompt — inline after 3+ exchanges */}
        {showSave && !savedAccount && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={S.miniAvatar}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div style={{ maxWidth: "80%", padding: "12px 14px", borderRadius: 16, background: "#f3f0ff", border: "1px solid #e9d5ff", borderBottomLeftRadius: 4 }}>
              <div style={{ fontSize: 14, color: "#1e293b", marginBottom: 10 }}>Save your stuff? Quick sign-in so you can come back anytime.</div>

              {saveStatus !== "check-inbox" ? (
                <>
                  {/* Primary: Google */}
                  <button onClick={handleGoogleSave} disabled={saveSending} style={{ width: "100%", padding: "10px", fontSize: 14, fontWeight: 600, color: "#1e293b", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 8, cursor: saveSending ? "wait" : "pointer", opacity: saveSending ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit", marginBottom: 10 }}>
                    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                    {saveSending ? "Signing in..." : "Continue with Google"}
                  </button>

                  {/* Divider */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>or</span>
                    <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                  </div>

                  {/* Fallback: Magic link */}
                  <input type="email" value={saveEmail} onChange={e => setSaveEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" style={{ width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
                  <button onClick={handleMagicLinkSave} disabled={saveSending} style={{ width: "100%", padding: "10px", fontSize: 14, fontWeight: 600, color: "#7c3aed", background: "transparent", border: "1px solid #e9d5ff", borderRadius: 8, cursor: saveSending ? "wait" : "pointer", opacity: saveSending ? 0.7 : 1, fontFamily: "inherit" }}>
                    {saveSending ? "Sending..." : "Send me a sign-in link"}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 14, color: "#10b981", fontWeight: 600 }}>Check your inbox</div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4, marginBottom: 8 }}>
                    We sent a link to {saveEmail}. Click it to save your progress.
                  </div>
                  <button
                    onClick={handleResendMagicLink}
                    disabled={resendCountdown > 0}
                    style={{ fontSize: 13, color: resendCountdown > 0 ? "#94a3b8" : "#7c3aed", background: "none", border: "none", cursor: resendCountdown > 0 ? "default" : "pointer", padding: 0, fontFamily: "inherit" }}
                  >
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend link"}
                  </button>
                </>
              )}

              {saveError && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>{saveError}</div>}
            </div>
          </div>
        )}

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
          placeholder={nameCollected ? "Message Alex..." : "Your name..."}
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
