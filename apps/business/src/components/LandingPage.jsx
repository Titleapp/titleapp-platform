import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";

// ── Slide Data ─────────────────────────────────────────────────────

const SLIDES = [
  {
    id: "personal",
    headline: "Your stuff really matters.\nNow it's really protected.",
    subtitle: "Vehicles, property, documents, deadlines -- tracked and organized by AI.",
    bubbles: [
      "Track my car's value",
      "When does my passport expire?",
      "Organize my documents",
      "I just need something simple",
    ],
  },
  {
    id: "entrepreneur",
    headline: "You have the expertise.\nNow build your AI business.",
    subtitle: "Turn what you know into a service people pay for. No code. 30 minutes.",
    bubbles: [
      "I help people relocate abroad",
      "I want to build an AI service",
      "Turn my consulting into a product",
      "What can I build?",
    ],
  },
  {
    id: "compliance",
    headline: "Compliance shouldn't keep\nyou up at night.",
    subtitle: "Rules change constantly. TitleApp keeps up so you don't have to.",
    bubbles: [
      "Set up compliance monitoring",
      "Audit my current records",
      "Industry regulation updates",
      "Document retention policies",
    ],
  },
  {
    id: "sales",
    headline: "While you were living your life,\nyour AI was closing deals.",
    subtitle: "Every lead remembered. Every follow-up sent. Every deal tracked.",
    bubbles: [
      "Show me my stale inventory",
      "Who's my hottest lead?",
      "Draft a follow-up",
      "How much could I save?",
    ],
  },
];

const REF_MAP = {
  expat: "entrepreneur",
  builder: "entrepreneur",
  realestate: "sales",
  auto: "sales",
  aviation: "compliance",
};

const UTM_MAP = {
  linkedin: "compliance",
  tiktok: "entrepreneur",
};

function getLockedSlideIndex() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  const utm = params.get("utm_source");

  let targetId = null;
  if (ref && REF_MAP[ref]) targetId = REF_MAP[ref];
  else if (utm && UTM_MAP[utm]) targetId = UTM_MAP[utm];

  if (targetId) {
    const idx = SLIDES.findIndex((s) => s.id === targetId);
    if (idx >= 0) return idx;
  }
  return null;
}

// ── Logo SVG ───────────────────────────────────────────────────────

function LogoIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="95" fill="#7c3aed" />
      <circle cx="100" cy="100" r="80" fill="#7c3aed" stroke="white" strokeWidth="2" />
      <circle cx="100" cy="100" r="70" fill="none" stroke="white" strokeWidth="1" strokeDasharray="3,5" />
      <line x1="100" y1="5" x2="100" y2="30" stroke="white" strokeWidth="2" />
      <line x1="100" y1="170" x2="100" y2="195" stroke="white" strokeWidth="2" />
      <line x1="5" y1="100" x2="30" y2="100" stroke="white" strokeWidth="2" />
      <line x1="170" y1="100" x2="195" y2="100" stroke="white" strokeWidth="2" />
      <circle cx="100" cy="80" r="18" fill="white" />
      <circle cx="100" cy="80" r="8" fill="#7c3aed" />
      <rect x="94" y="90" width="12" height="35" fill="white" />
      <rect x="94" y="115" width="8" height="4" fill="white" />
      <rect x="94" y="122" width="5" height="3" fill="white" />
    </svg>
  );
}

// ── Auth Modal ─────────────────────────────────────────────────────

function AuthModal({ isOpen, onClose, defaultMode }) {
  const [mode, setMode] = useState(defaultMode || "magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => {
    if (isOpen) setMode(defaultMode || "magic");
  }, [isOpen, defaultMode]);

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      handleMagicLinkCallback();
    }
  }, []);

  async function handleMagicLinkCallback() {
    let emailForSignIn = window.localStorage.getItem("emailForSignIn");
    if (!emailForSignIn) {
      emailForSignIn = window.prompt("Please provide your email for confirmation");
    }
    if (!emailForSignIn) return;

    try {
      setStatus("Completing sign in...");
      const cred = await signInWithEmailLink(auth, emailForSignIn, window.location.href);
      const token = await cred.user.getIdToken(true);
      localStorage.setItem("ID_TOKEN", token);
      window.localStorage.removeItem("emailForSignIn");
      window.history.replaceState({}, "", window.location.pathname);
    } catch (err) {
      console.error(err);
      setStatus("Failed to complete sign in: " + (err?.message || String(err)));
    }
  }

  async function handleMagicLink(e) {
    e.preventDefault();
    setStatus("Sending magic link...");
    const actionCodeSettings = { url: window.location.origin + "/", handleCodeInApp: true };
    try {
      const trimmedEmail = email.trim().toLowerCase();
      await sendSignInLinkToEmail(auth, trimmedEmail, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", trimmedEmail);
      setLinkSent(true);
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus("Failed to send link: " + (err?.message || String(err)));
    }
  }

  async function handlePasswordLogin(e) {
    e.preventDefault();
    setStatus("Signing in...");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken(true);
      localStorage.setItem("ID_TOKEN", token);
      setStatus("Signed in successfully");
    } catch (err) {
      console.error(err);
      const code = err?.code || "";
      if (code === "auth/wrong-password" || code === "auth/user-not-found" || code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") {
        setStatus("No password set for this account. Please use Magic Link or Google to sign in.");
      } else {
        setStatus("Login failed: " + (err?.message || String(err)));
      }
    }
  }

  async function handleGoogleLogin() {
    setStatus("Signing in with Google...");
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const token = await cred.user.getIdToken(true);
      localStorage.setItem("ID_TOKEN", token);
      setStatus("Signed in successfully");
    } catch (err) {
      console.error(err);
      if (err?.code === "auth/popup-closed-by-user") {
        setStatus("");
      } else {
        setStatus("Google sign-in failed: " + (err?.message || String(err)));
      }
    }
  }

  if (!isOpen) return null;

  const isError = status.includes("Failed") || status.includes("failed") || status.includes("No password");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 500,
        background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "420px", padding: "32px", background: "white",
          borderRadius: "16px", border: "1px solid #e5e7eb", position: "relative",
          animation: "slideUp 0.3s ease-out",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "16px", right: "16px", background: "none",
            border: "none", fontSize: "20px", color: "#94a3b8", cursor: "pointer",
          }}
        >x</button>

        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
            <LogoIcon size={48} />
          </div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
            {defaultMode === "signup" ? "Create your free account" : "Sign in to TitleApp AI"}
          </h2>
        </div>

        {linkSent ? (
          <div style={{ padding: "20px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>Check your email</div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>We sent a magic link to <strong>{email}</strong></div>
            <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "12px" }}>Click the link in your email to sign in</div>
            <button onClick={() => { setLinkSent(false); setEmail(""); }} style={{ marginTop: "16px", padding: "10px 20px", background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}>
              Use different email
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {["magic", "password"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "8px", cursor: "pointer", fontSize: "14px",
                    background: mode === m ? "rgba(124,58,237,0.1)" : "white",
                    border: mode === m ? "1px solid rgba(124,58,237,0.3)" : "1px solid #e5e7eb",
                    fontWeight: mode === m ? 600 : 400,
                  }}
                >
                  {m === "magic" ? "Magic Link" : "Password"}
                </button>
              ))}
            </div>

            {mode === "magic" && (
              <form onSubmit={handleMagicLink} style={{ display: "grid", gap: "14px" }}>
                <label style={{ display: "grid", gap: "6px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>Email</div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required style={{ padding: "12px", fontSize: "14px", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                </label>
                <button type="submit" style={{ padding: "12px", fontSize: "14px", fontWeight: 600, background: "#7c3aed", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                  Send Magic Link
                </button>
              </form>
            )}

            {mode === "password" && (
              <form onSubmit={handlePasswordLogin} style={{ display: "grid", gap: "14px" }}>
                <label style={{ display: "grid", gap: "6px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>Email</div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required style={{ padding: "12px", fontSize: "14px", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                </label>
                <label style={{ display: "grid", gap: "6px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>Password</div>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="--------" autoComplete="current-password" required style={{ padding: "12px", fontSize: "14px", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                </label>
                <button type="submit" style={{ padding: "12px", fontSize: "14px", fontWeight: 600, background: "#7c3aed", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                  Sign In
                </button>
              </form>
            )}

            {status && (
              <div style={{ marginTop: "14px", padding: "12px", background: isError ? "#fff5f5" : "#f0fdf4", border: isError ? "1px solid #fecaca" : "1px solid #86efac", borderRadius: "8px", fontSize: "13px", color: isError ? "#dc2626" : "#16a34a" }}>
                {status}
              </div>
            )}

            <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "13px", color: "#6b7280", textAlign: "center", marginBottom: "10px" }}>Or continue with</div>
              <button onClick={handleGoogleLogin} style={{ width: "100%", padding: "12px", fontSize: "14px", background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer" }}>
                Google
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Landing Page ───────────────────────────────────────────────────

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("magic"); // "magic" | "signup"
  const [chatActive, setChatActive] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatTyping, setChatTyping] = useState(false);
  const [discoveredContext, setDiscoveredContext] = useState(null);
  const chatRef = useRef(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const lockedSlide = useRef(getLockedSlideIndex());
  const rotationRef = useRef(null);
  const pausedRef = useRef(false);

  // Inline auth state (for sign-in rendered inside chat)
  const [inlineAuthMode, setInlineAuthMode] = useState("magic"); // "magic" | "password"
  const [inlineEmail, setInlineEmail] = useState("");
  const [inlinePassword, setInlinePassword] = useState("");
  const [inlineStatus, setInlineStatus] = useState("");
  const [inlineLinkSent, setInlineLinkSent] = useState(false);

  // ── Inline auth handlers (for chat-embedded sign-in) ──────────

  async function handleInlineMagicLink(e) {
    e.preventDefault();
    setInlineStatus("Sending magic link...");
    const actionCodeSettings = { url: window.location.origin + "/", handleCodeInApp: true };
    try {
      const trimmedEmail = inlineEmail.trim().toLowerCase();
      await sendSignInLinkToEmail(auth, trimmedEmail, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", trimmedEmail);
      setInlineLinkSent(true);
      setInlineStatus("");
    } catch (err) {
      console.error(err);
      setInlineStatus("Failed to send link: " + (err?.message || String(err)));
    }
  }

  async function handleInlinePasswordLogin(e) {
    e.preventDefault();
    setInlineStatus("Signing in...");
    try {
      const cred = await signInWithEmailAndPassword(auth, inlineEmail, inlinePassword);
      const token = await cred.user.getIdToken(true);
      localStorage.setItem("ID_TOKEN", token);
      setInlineStatus("Signed in successfully");
    } catch (err) {
      console.error(err);
      const code = err?.code || "";
      if (code === "auth/wrong-password" || code === "auth/user-not-found" || code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") {
        setInlineStatus("No password set for this account. Use Magic Link or Google instead.");
      } else {
        setInlineStatus("Login failed: " + (err?.message || String(err)));
      }
    }
  }

  async function handleInlineGoogleLogin() {
    setInlineStatus("Signing in with Google...");
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const token = await cred.user.getIdToken(true);
      localStorage.setItem("ID_TOKEN", token);
      setInlineStatus("Signed in successfully");
    } catch (err) {
      console.error(err);
      if (err?.code === "auth/popup-closed-by-user") {
        setInlineStatus("");
      } else {
        setInlineStatus("Google sign-in failed: " + (err?.message || String(err)));
      }
    }
  }

  // Auto-rotate slides
  useEffect(() => {
    if (lockedSlide.current !== null) {
      setCurrentSlide(lockedSlide.current);
      return;
    }

    function tick() {
      if (!pausedRef.current) {
        setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
      }
    }
    rotationRef.current = setInterval(tick, 5000);
    return () => clearInterval(rotationRef.current);
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatTyping]);

  // Check for magic link callback on mount
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      setAuthOpen(true);
    }
  }, []);

  // When user signs in, persist landing context for the dashboard to pick up
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && chatMessages.length > 0) {
        const ctx = discoveredContext || {};
        const chatSummary = chatMessages
          .filter((m) => m.role === "user")
          .map((m) => m.content)
          .join(" | ");
        const landingContext = {
          ...ctx,
          chatSummary,
          messageCount: chatMessages.length,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem("LANDING_CONTEXT", JSON.stringify(landingContext));
      }
    });
    return () => unsubscribe();
  }, [chatMessages, discoveredContext]);

  function goToSlide(idx) {
    setCurrentSlide(idx);
    if (rotationRef.current) clearInterval(rotationRef.current);
    if (lockedSlide.current === null) {
      rotationRef.current = setInterval(() => {
        if (!pausedRef.current) setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
      }, 5000);
    }
  }

  function handleBubbleClick(text) {
    setChatInput(text);
    activateChat(text);
  }

  function activateChat(initialMessage) {
    setChatActive(true);
    if (rotationRef.current) clearInterval(rotationRef.current);

    const welcome = { role: "assistant", content: "Hey! Welcome to TitleApp. What brings you here today?" };
    const msg = initialMessage || chatInput.trim();
    if (msg) {
      setChatMessages([welcome, { role: "user", content: msg }]);
      setChatInput("");
      sendChatMessage(msg);
    } else {
      setChatMessages([welcome]);
    }
  }

  async function sendChatMessage(message) {
    setChatTyping(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE || "https://titleapp-frontdoor.titleapp-core.workers.dev";
      const sessionId = sessionStorage.getItem("ta_sid") || ("sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 8));
      sessionStorage.setItem("ta_sid", sessionId);

      const response = await fetch(`${apiBase}/api?path=/v1/chat:message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, surface: "landing", userInput: message }),
      });
      const result = await response.json();
      setChatTyping(false);

      if (result.ok && result.message) {
        // Detect [SHOW_SIGNUP] token — strip it and show setup button (no auto-popup)
        let displayMessage = result.message;
        let shouldShowButton = result.suggestSignup || result.showSignup || false;
        if (/\[SHOW[_\s]?SIGNUP\]/i.test(displayMessage)) {
          displayMessage = displayMessage.replace(/\s*\[SHOW[_\s]?SIGNUP\]\s*/gi, "").trim();
          shouldShowButton = true;
        }

        setChatMessages((prev) => [...prev, {
          role: "assistant",
          content: displayMessage,
          showSetupButton: shouldShowButton,
        }]);
      } else {
        setChatMessages((prev) => [...prev, { role: "assistant", content: "Tell me more about what you're looking for." }]);
      }

      // Track discovered context
      if (result.discoveredContext) {
        setDiscoveredContext(result.discoveredContext);
        sessionStorage.setItem("ta_discovered_context", JSON.stringify(result.discoveredContext));
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatTyping(false);
      setChatMessages((prev) => [...prev, { role: "assistant", content: "I'm having trouble connecting. Let me try that again." }]);
    }
  }

  function handleChatSubmit(e) {
    e?.preventDefault();
    const msg = chatInput.trim();
    if (!msg) return;

    if (!chatActive) {
      activateChat(msg);
    } else {
      setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
      setChatInput("");
      sendChatMessage(msg);
    }
  }

  function handleBackToLanding() {
    setChatActive(false);
    setChatMessages([]);
    setChatInput("");
    if (lockedSlide.current === null) {
      rotationRef.current = setInterval(() => {
        if (!pausedRef.current) setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
      }, 5000);
    }
  }

  const slide = SLIDES[currentSlide];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", color: "#2c3e50", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, display: "flex", justifyContent: "space-between",
        alignItems: "center", padding: "1.5rem 3rem", background: "rgba(255,255,255,0.95)", boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      }}>
        <div
          onClick={chatActive ? handleBackToLanding : undefined}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#7c3aed", cursor: chatActive ? "pointer" : "default" }}
        >
          <LogoIcon size={40} />
          <span>TitleApp AI</span>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <a
            href="https://us-central1-title-app-alpha.cloudfunctions.net/publicApi/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "14px", color: "#64748b", textDecoration: "none", cursor: "pointer", transition: "color 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3aed"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#64748b"; }}
          >
            Developers
          </a>
          <span
            onClick={() => {
              const investorMsg = "Tell me about investing in TitleApp";
              setChatInput(investorMsg);
              activateChat(investorMsg);
            }}
            style={{ fontSize: "14px", color: "#64748b", textDecoration: "none", cursor: "pointer", transition: "color 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3aed"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#64748b"; }}
          >
            Investors
          </span>
          <button
            onClick={() => { setAuthMode("magic"); setAuthOpen(true); }}
            style={{ padding: "0.75rem 1.5rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer", border: "2px solid transparent", background: "transparent", color: "#7c3aed", fontSize: "1rem", transition: "all 0.3s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setAuthMode("signup"); setAuthOpen(true); }}
            style={{ padding: "0.75rem 1.5rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer", border: "none", background: "#7c3aed", color: "white", fontSize: "1rem", transition: "all 0.3s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#6d28d9"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(124,58,237,0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#7c3aed"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
          >
            Start Free
          </button>
        </div>
      </header>

      {/* Page content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingTop: "90px" }}>

        {/* Hero + Chat Landing */}
        {!chatActive && (
          <>
            <div
              style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 2rem 1rem", textAlign: "center" }}
              onMouseEnter={() => { pausedRef.current = true; }}
              onMouseLeave={() => { pausedRef.current = false; }}
            >
              {/* Slides */}
              <div style={{ display: "grid", minHeight: "200px" }}>
                {SLIDES.map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      gridArea: "1 / 1", opacity: i === currentSlide ? 1 : 0,
                      transition: "opacity 0.6s ease", pointerEvents: i === currentSlide ? "auto" : "none",
                    }}
                  >
                    <h1 style={{ fontSize: "3.5rem", fontWeight: 800, lineHeight: 1.2, marginBottom: "1.5rem", color: "#1a202c", whiteSpace: "pre-line" }}>
                      {s.headline}
                    </h1>
                    <p style={{ fontSize: "1.25rem", color: "#64748b", marginBottom: "2rem", lineHeight: 1.6 }}>
                      {s.subtitle}
                    </p>
                  </div>
                ))}
              </div>

              {/* Dots */}
              <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "1rem" }}>
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    style={{
                      width: "8px", height: "8px", borderRadius: "50%", border: "none", padding: 0,
                      background: i === currentSlide ? "#7c3aed" : "#cbd5e1", cursor: "pointer", transition: "background 0.3s",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <div style={{ maxWidth: "600px", width: "100%", margin: "2rem auto 1rem", padding: "0 2rem", display: "flex", gap: "0.75rem" }}>
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleChatSubmit(e); }}
                placeholder="Ask me anything about TitleApp AI..."
                style={{
                  flex: 1, height: "48px", padding: "0 1.5rem", border: "2px solid #e2e8f0",
                  borderRadius: "12px", fontSize: "1.1rem", outline: "none", transition: "all 0.3s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#7c3aed"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
              />
              <button
                onClick={handleChatSubmit}
                style={{
                  width: "50px", height: "50px", background: "#7c3aed", border: "none", borderRadius: "12px",
                  color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.3s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#6d28d9"; e.currentTarget.style.transform = "scale(1.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#7c3aed"; e.currentTarget.style.transform = "none"; }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>

            {/* Suggestion Bubbles */}
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 2rem" }}>
              <div style={{ display: "grid" }}>
                {SLIDES.map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      gridArea: "1 / 1", opacity: i === currentSlide ? 1 : 0,
                      transition: "opacity 0.6s ease", pointerEvents: i === currentSlide ? "auto" : "none",
                      display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center", padding: "0.5rem 0",
                    }}
                  >
                    {s.bubbles.map((b) => (
                      <button
                        key={b}
                        onClick={() => handleBubbleClick(b)}
                        style={{
                          padding: "0.75rem 1.25rem", background: "#f1f5f9", border: "2px solid #e2e8f0",
                          borderRadius: "20px", color: "#475569", cursor: "pointer", fontSize: "0.95rem",
                          transition: "all 0.3s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.background = "#f3e8ff"; e.currentTarget.style.color = "#7c3aed"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#475569"; }}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Chat Mode */}
        {chatActive && (
          <div style={{ maxWidth: "800px", margin: "0 auto", padding: "1rem 2rem", paddingBottom: "100px" }}>
            <div ref={chatRef} style={{ display: "flex", flexDirection: "column" }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ marginBottom: "1rem" }}>
                  <div
                    style={{
                      padding: "1rem", borderRadius: "12px",
                      animation: "slideIn 0.3s ease",
                      ...(msg.role === "user"
                        ? { background: "#7c3aed", color: "white", marginLeft: "20%" }
                        : { background: "#f1f5f9", color: "#1a202c", marginRight: "20%" }),
                      whiteSpace: "pre-line",
                    }}
                  >
                    {msg.content}
                  </div>
                  {msg.showSetupButton && (
                    <div style={{ marginRight: "10%", marginTop: "12px" }}>
                      <div style={{
                        background: "white", borderRadius: "16px", border: "1px solid #e5e7eb",
                        padding: "24px", animation: "slideIn 0.3s ease",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                      }}>
                        {inlineLinkSent ? (
                          <div style={{ padding: "8px", textAlign: "center" }}>
                            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: "24px" }}>&#10003;</div>
                            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>Check your email</div>
                            <div style={{ fontSize: "14px", color: "#6b7280" }}>We sent a sign-in link to <strong>{inlineEmail}</strong></div>
                            <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>Click the link in your email to continue</div>
                            <button
                              onClick={() => { setInlineLinkSent(false); setInlineEmail(""); }}
                              style={{ marginTop: "16px", padding: "8px 16px", background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}
                            >
                              Use different email
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px", color: "#1e293b" }}>
                              Create your free account
                            </div>
                            <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}>
                              Sign in to set up your workspace
                            </div>

                            {/* Mode toggle */}
                            <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
                              {["magic", "password"].map((m) => (
                                <button
                                  key={m}
                                  onClick={() => setInlineAuthMode(m)}
                                  style={{
                                    padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "13px",
                                    background: inlineAuthMode === m ? "rgba(124,58,237,0.1)" : "white",
                                    border: inlineAuthMode === m ? "1px solid rgba(124,58,237,0.3)" : "1px solid #e5e7eb",
                                    fontWeight: inlineAuthMode === m ? 600 : 400,
                                  }}
                                >
                                  {m === "magic" ? "Magic Link" : "Password"}
                                </button>
                              ))}
                            </div>

                            {/* Magic Link form */}
                            {inlineAuthMode === "magic" && (
                              <form onSubmit={handleInlineMagicLink} style={{ display: "grid", gap: "10px" }}>
                                <input
                                  type="email" value={inlineEmail}
                                  onChange={(e) => setInlineEmail(e.target.value)}
                                  placeholder="you@example.com" autoComplete="email" required
                                  style={{ padding: "11px 14px", fontSize: "14px", border: "1px solid #e5e7eb", borderRadius: "8px", outline: "none" }}
                                  onFocus={(e) => { e.target.style.borderColor = "#7c3aed"; }}
                                  onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
                                />
                                <button type="submit" style={{
                                  padding: "11px", fontSize: "14px", fontWeight: 600,
                                  background: "#7c3aed", color: "white", border: "none", borderRadius: "8px", cursor: "pointer",
                                }}>
                                  Send Magic Link
                                </button>
                              </form>
                            )}

                            {/* Password form */}
                            {inlineAuthMode === "password" && (
                              <form onSubmit={handleInlinePasswordLogin} style={{ display: "grid", gap: "10px" }}>
                                <input
                                  type="email" value={inlineEmail}
                                  onChange={(e) => setInlineEmail(e.target.value)}
                                  placeholder="you@example.com" autoComplete="email" required
                                  style={{ padding: "11px 14px", fontSize: "14px", border: "1px solid #e5e7eb", borderRadius: "8px", outline: "none" }}
                                  onFocus={(e) => { e.target.style.borderColor = "#7c3aed"; }}
                                  onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
                                />
                                <input
                                  type="password" value={inlinePassword}
                                  onChange={(e) => setInlinePassword(e.target.value)}
                                  placeholder="Password" autoComplete="current-password" required
                                  style={{ padding: "11px 14px", fontSize: "14px", border: "1px solid #e5e7eb", borderRadius: "8px", outline: "none" }}
                                  onFocus={(e) => { e.target.style.borderColor = "#7c3aed"; }}
                                  onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
                                />
                                <button type="submit" style={{
                                  padding: "11px", fontSize: "14px", fontWeight: 600,
                                  background: "#7c3aed", color: "white", border: "none", borderRadius: "8px", cursor: "pointer",
                                }}>
                                  Sign In
                                </button>
                              </form>
                            )}

                            {/* Status message */}
                            {inlineStatus && (
                              <div style={{
                                marginTop: "10px", padding: "10px", borderRadius: "8px", fontSize: "13px",
                                background: inlineStatus.includes("ailed") || inlineStatus.includes("No password") ? "#fff5f5" : "#f0fdf4",
                                border: inlineStatus.includes("ailed") || inlineStatus.includes("No password") ? "1px solid #fecaca" : "1px solid #86efac",
                                color: inlineStatus.includes("ailed") || inlineStatus.includes("No password") ? "#dc2626" : "#16a34a",
                              }}>
                                {inlineStatus}
                              </div>
                            )}

                            {/* Google divider + button */}
                            <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #e5e7eb" }}>
                              <div style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", marginBottom: "10px" }}>or continue with</div>
                              <button
                                onClick={handleInlineGoogleLogin}
                                style={{
                                  width: "100%", padding: "11px", fontSize: "14px", fontWeight: 500,
                                  background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer",
                                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.background = "#faf5ff"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "white"; }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                Google
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {chatTyping && (
                <div style={{ marginBottom: "1rem", padding: "1rem", borderRadius: "12px", background: "#f1f5f9", marginRight: "20%", display: "flex", alignItems: "center", gap: "10px" }}>
                  <svg width="28" height="28" viewBox="0 0 200 200" fill="none" style={{ animation: "spinKey 1.5s ease-in-out infinite", flexShrink: 0 }}>
                    <circle cx="100" cy="100" r="95" fill="#7c3aed"/>
                    <circle cx="100" cy="100" r="80" fill="#7c3aed" stroke="white" strokeWidth="2"/>
                    <circle cx="100" cy="100" r="70" fill="none" stroke="white" strokeWidth="1" strokeDasharray="3,5"/>
                    <circle cx="100" cy="80" r="18" fill="white"/>
                    <circle cx="100" cy="80" r="8" fill="#7c3aed"/>
                    <rect x="94" y="90" width="12" height="35" fill="white"/>
                    <rect x="94" y="115" width="8" height="4" fill="white"/>
                    <rect x="94" y="122" width="5" height="3" fill="white"/>
                  </svg>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

          </div>
        )}
      </div>

      {/* Fixed chat input when in chat mode */}
      {chatActive && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: "800px", margin: "0 auto",
          padding: "0.75rem 2rem", background: "white", boxShadow: "0 -2px 12px rgba(0,0,0,0.05)", zIndex: 100,
          display: "flex", gap: "0.75rem",
        }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleChatSubmit(e); }}
            placeholder="Type a message..."
            autoFocus
            style={{
              flex: 1, height: "48px", padding: "0 1.5rem", border: "2px solid #e2e8f0",
              borderRadius: "12px", fontSize: "1.1rem", outline: "none",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#7c3aed"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
            onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
          />
          <button
            onClick={handleChatSubmit}
            style={{
              width: "50px", height: "50px", background: "#7c3aed", border: "none", borderRadius: "12px",
              color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      )}

      {/* Footer */}
      {!chatActive && (
        <footer style={{
          background: "#f8fafc", padding: "24px 2rem", textAlign: "center",
          borderTop: "1px solid #e2e8f0", fontSize: "13px", color: "#94a3b8",
        }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "8px" }}>
            <span style={{ fontWeight: 600, color: "#64748b" }}>TitleApp AI</span>
            <span style={{ color: "#cbd5e1" }}>&middot;</span>
            <a
              href="https://us-central1-title-app-alpha.cloudfunctions.net/publicApi/v1/docs"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#64748b", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3aed"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#64748b"; }}
            >
              Developers
            </a>
            <span style={{ color: "#cbd5e1" }}>&middot;</span>
            <span
              onClick={() => {
                const investorMsg = "Tell me about investing in TitleApp";
                setChatInput(investorMsg);
                activateChat(investorMsg);
              }}
              style={{ color: "#64748b", textDecoration: "none", cursor: "pointer", transition: "color 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#7c3aed"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#64748b"; }}
            >
              Investors
            </span>
            <span style={{ color: "#cbd5e1" }}>&middot;</span>
            <span style={{ color: "#94a3b8" }}>Privacy</span>
            <span style={{ color: "#cbd5e1" }}>&middot;</span>
            <span style={{ color: "#94a3b8" }}>Terms</span>
          </div>
          <div>&copy; 2026 TitleApp AI</div>
        </footer>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultMode={authMode}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spinKey {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
