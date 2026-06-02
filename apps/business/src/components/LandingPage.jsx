import React, { useState, useRef, useCallback } from "react";
import sociiiMarkUrl from "../assets/sociii-brand/icon/sociii-icon-mark.svg";

export default function LandingPage() {
  const appBase = window.location.hostname === "localhost"
    ? ""
    : window.location.origin;

  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [fading, setFading] = useState(false);
  const [fadeVisible, setFadeVisible] = useState(false);
  const recognitionRef = useRef(null);

  function navigateWithFade(url) {
    setFading(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadeVisible(true));
    });
    setTimeout(() => { window.location.href = url; }, 400);
  }

  function handleSubmit() {
    const text = query.trim();
    if (!text) return;
    navigateWithFade(`${appBase}/meet-alex?prompt=${encodeURIComponent(text)}`);
  }

  const toggleMic = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => { setQuery(e.results[0][0].transcript); setListening(false); };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  return (
    <div style={S.page}>
      {fading && (
        <div style={{
          position: "fixed", inset: 0, background: "#ffffff", zIndex: 9999,
          opacity: fadeVisible ? 1 : 0, transition: "opacity 350ms ease",
        }} />
      )}

      <header style={S.header}>
        <div style={S.logoWrap}>
          <img src={sociiiMarkUrl} alt="SOCIII" width={32} height={32} style={{ display: "block" }} />
          <span style={S.logoText}>SOCIII</span>
        </div>
        <div style={S.headerRight}>
          <a href={`${appBase}/creator`} style={S.headerLink}>OF for Smart People →</a>
          <a href={`${appBase}/meet-alex?action=signin`} style={S.headerLink}>Sign in</a>
          <a href={`${appBase}/meet-alex`} style={S.headerCta}>Start free</a>
        </div>
      </header>

      <main style={S.main}>
        <div style={S.heroInner}>
          <h1 style={S.heroH1}>Digital Workers for the work that matters.</h1>
          <p style={S.heroSub}>
            Built by the experts in your field. Trained on the rules of your industry.
            Tell Alex what you need — or{" "}
            <a href={`${appBase}/creator`} style={{ color: "#7c3aed", fontWeight: 600, textDecoration: "underline" }}>
              browse the OF for Smart People gallery
            </a>{" "}
            to meet them.
          </p>

          <div style={S.chatBar}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Ask Alex anything..."
              autoFocus
              style={S.chatInput}
            />
            <button
              type="button"
              onClick={toggleMic}
              style={{ ...S.chatBtn, color: listening ? "#7c3aed" : "#9ca3af" }}
              title="Voice input"
              aria-label="Voice input"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!query.trim()}
              style={{ ...S.chatBtn, color: query.trim() ? "#7c3aed" : "#d1d5db" }}
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          <div style={S.subActions}>
            <a href={`${appBase}/meet-alex`} style={S.subActionPrimary}>Start free</a>
            <a href={`${appBase}/meet-alex?action=signin`} style={S.subActionSecondary}>I already have an account</a>
          </div>
        </div>
      </main>

      <footer style={S.footer}>
        <div style={S.footerInner}>
          <div style={S.footerBrand}>SOCIII, Inc.</div>
          <div style={S.footerLinks}>
            <a href={`${appBase}/whitepaper`} style={S.footerLink}>Whitepaper</a>
            <a href="https://github.com/Titleapp/titleapp-platform" style={S.footerLink} target="_blank" rel="noreferrer">Open Source</a>
            <a href={`${appBase}/legal/privacy-policy`} style={S.footerLink}>Privacy</a>
            <a href={`${appBase}/legal/terms-of-service`} style={S.footerLink}>Terms</a>
          </div>
          <div style={S.footerAddress}>
            1810 E Sahara Ave Ste 75942, Las Vegas NV 89104
          </div>
        </div>
      </footer>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#ffffff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#111827",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 32px",
    borderBottom: "1px solid #f0f0f0",
  },
  logoWrap: { display: "flex", alignItems: "center", gap: 10 },
  logoText: { fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: "-0.3px" },
  headerRight: { display: "flex", alignItems: "center", gap: 20 },
  headerLink: { fontSize: 14, color: "#6b7280", textDecoration: "none" },
  headerCta: {
    fontSize: 14,
    fontWeight: 600,
    color: "white",
    textDecoration: "none",
    padding: "8px 20px",
    borderRadius: 8,
    background: "#7c3aed",
  },

  main: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
  },
  heroInner: { maxWidth: 640, width: "100%", textAlign: "center" },
  heroH1: {
    fontSize: 44,
    fontWeight: 800,
    lineHeight: 1.15,
    marginBottom: 16,
    color: "#111827",
    letterSpacing: "-1px",
  },
  heroSub: {
    fontSize: 18,
    color: "#6b7280",
    marginBottom: 32,
    lineHeight: 1.5,
  },

  chatBar: {
    display: "flex",
    alignItems: "center",
    gap: 0,
    maxWidth: 560,
    margin: "0 auto 24px",
    padding: "4px 4px 4px 20px",
    borderRadius: 16,
    border: "2px solid #e5e7eb",
    background: "#ffffff",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
  },
  chatInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 16,
    color: "#111827",
    background: "transparent",
    padding: "12px 0",
    fontFamily: "inherit",
  },
  chatBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  subActions: {
    display: "flex",
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
  },
  subActionPrimary: {
    background: "#7c3aed",
    color: "white",
    textDecoration: "none",
    padding: "12px 28px",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 15,
  },
  subActionSecondary: {
    color: "#6b7280",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
  },

  footer: {
    borderTop: "1px solid #f0f0f0",
    padding: "24px 32px",
  },
  footerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
  },
  footerBrand: { fontWeight: 700, color: "#111827", fontSize: 14 },
  footerLinks: { display: "flex", gap: 20, flexWrap: "wrap" },
  footerLink: { color: "#6b7280", textDecoration: "none", fontSize: 13 },
  footerAddress: { fontSize: 12, color: "#9ca3af" },
};
