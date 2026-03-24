import React, { useState, useRef, useCallback } from "react";

// ── TitleApp Landing Page ─────────────────────────────────────────
// White premium aesthetic. Chat bar hero. Four vertical CTAs. No auth — that happens on /meet-alex.

const VERTICALS = [
  { label: "Aviation", desc: "CoPilots for PC12-NG, King Air, Caravan, and more. Logbook, currency, training.", param: "aviation", count: "56 workers" },
  { label: "Auto Dealer", desc: "F&I, deal jacket, inventory, compliance. Every phase of the deal lifecycle.", param: "auto-dealer", count: "29 workers" },
  { label: "Real Estate", desc: "Title search, closing coordination, compliance monitoring. 8 development phases.", param: "real-estate", count: "67 workers" },
  { label: "Web3", desc: "Tokenomics, regulatory compliance, community management. Team verification built in.", param: "web3", count: "11 workers" },
];

const STATS = [
  { num: "1,000+", label: "Digital Workers" },
  { num: "14", label: "Industry Suites" },
  { num: "20+", label: "Languages" },
  { num: "24/7", label: "Always On" },
];

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Portuguese", "Italian", "Dutch",
  "Polish", "Swedish", "Norwegian", "Danish", "Finnish", "Japanese", "Korean",
  "Chinese", "Arabic", "Hindi", "Turkish", "Thai", "Vietnamese", "Indonesian",
];

const CHIPS = [
  { label: "I'm a pilot looking for a CoPilot", prompt: "I'm a pilot and I'm looking for a CoPilot for my aircraft" },
  { label: "My dealership needs compliance help", prompt: "I run an auto dealership and need help with compliance and F&I" },
  { label: "I work in real estate development", prompt: "I work in real estate development and need help with title and closing" },
];

const HOW_IT_WORKS = [
  { step: "1", title: "Pick a worker", desc: "Browse by industry. Every worker is trained on the rules of your field." },
  { step: "2", title: "Start free", desc: "14-day free trial. No credit card. Cancel anytime." },
  { step: "3", title: "Work gets done", desc: "Your Digital Worker handles the compliance-heavy work. You keep the audit trail." },
];

export default function LandingPage() {
  const appBase = window.location.hostname === "localhost"
    ? ""
    : "https://app.titleapp.ai";

  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [fading, setFading] = useState(false);
  const [fadeVisible, setFadeVisible] = useState(false);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  function navigateWithFade(url) {
    setFading(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadeVisible(true));
    });
    setTimeout(() => { window.location.href = url; }, 450);
  }

  function handleSubmit() {
    const text = query.trim();
    if (!text) return;
    navigateWithFade(`${appBase}/meet-alex?prompt=${encodeURIComponent(text)}`);
  }

  function handleChip(prompt) {
    setQuery(prompt);
    navigateWithFade(`${appBase}/meet-alex?prompt=${encodeURIComponent(prompt)}`);
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
      {/* Fade overlay */}
      {fading && (
        <div style={{
          position: "fixed", inset: 0, background: "#ffffff", zIndex: 9999,
          opacity: fadeVisible ? 1 : 0, transition: "opacity 400ms ease",
        }} />
      )}

      {/* ── Header ── */}
      <header style={S.header}>
        <div style={S.logoWrap}>
          <div style={S.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <span style={S.logoText}>TitleApp</span>
        </div>
        <div style={S.headerRight}>
          <a href={`${appBase}/meet-alex`} style={S.headerLink}>Meet Alex</a>
          <a href={`${appBase}/sandbox`} style={S.headerLink}>Creators</a>
          <a href={`${appBase}/meet-alex`} style={S.headerCta}>Start Free</a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={S.hero}>
        <div style={S.heroInner}>
          <div style={S.heroTag}>The Digital Worker Platform</div>
          <h1 style={S.heroH1}>They're on your team now.</h1>
          <p style={S.heroSub}>Real expertise. On call. Forever.</p>

          {/* Chat bar */}
          <div style={S.chatBar}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Ask Alex anything..."
              style={S.chatInput}
            />
            <button onClick={toggleMic} style={{ ...S.chatBtn, color: listening ? "#7c3aed" : "#9ca3af" }} title="Voice input">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
            <button onClick={handleSubmit} disabled={!query.trim()} style={{ ...S.chatBtn, color: query.trim() ? "#7c3aed" : "#d1d5db" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          {/* Prompt chips */}
          <div style={S.chipRow}>
            {CHIPS.map(c => (
              <button key={c.label} onClick={() => handleChip(c.prompt)} style={S.chip}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section style={S.statsBar}>
        <div style={S.statsInner}>
          {STATS.map(s => (
            <div key={s.label} style={S.statItem}>
              <div style={S.statNum}>{s.num}</div>
              <div style={S.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Language Pills ── */}
      <section style={S.langSection}>
        <div style={S.langLabel}>Every worker speaks your language</div>
        <div style={S.langPills}>
          {LANGUAGES.map(l => (
            <span key={l} style={S.langPill}>{l}</span>
          ))}
        </div>
      </section>

      {/* ── Verticals ── */}
      <section id="verticals" style={S.section}>
        <div style={S.sectionInner}>
          <h2 style={S.sectionH2}>Choose your industry.</h2>
          <p style={S.sectionSub}>Every vertical has dedicated Digital Workers built by people who know the rules.</p>
          <div style={S.verticalGrid}>
            {VERTICALS.map(v => (
              <a key={v.param} href={`${appBase}/meet-alex?vertical=${v.param}&v=2`} style={S.verticalCard}>
                <div style={S.verticalName}>{v.label}</div>
                <div style={S.verticalDesc}>{v.desc}</div>
                <div style={S.verticalFooter}>
                  <span style={S.verticalCount}>{v.count}</span>
                  <span style={S.verticalArrow}>&rarr;</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ ...S.section, background: "#f9fafb" }}>
        <div style={S.sectionInner}>
          <h2 style={S.sectionH2}>Three steps. Under 60 seconds.</h2>
          <div style={S.stepsGrid}>
            {HOW_IT_WORKS.map(h => (
              <div key={h.step} style={S.stepCard}>
                <div style={S.stepNum}>{h.step}</div>
                <div style={S.stepTitle}>{h.title}</div>
                <div style={S.stepDesc}>{h.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Alex ── */}
      <section style={S.section}>
        <div style={S.sectionInner}>
          <div style={S.alexCard}>
            <div style={S.alexAvatar}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <div style={S.alexName}>Alex</div>
              <div style={S.alexRole}>Chief of Staff</div>
            </div>
            <div style={S.alexBody}>
              Alex is your first hire. Free on every account. She knows every worker in the marketplace,
              helps you pick the right ones for your field, and coordinates everything once they're on your team.
            </div>
            <a href={`${appBase}/meet-alex`} style={S.btnPrimary}>Talk to Alex</a>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ ...S.section, background: "#f9fafb" }}>
        <div style={S.sectionInner}>
          <h2 style={S.sectionH2}>Simple pricing. No surprises.</h2>
          <p style={S.sectionSub}>Every worker includes a 14-day free trial. No credit card required.</p>
          <div style={S.pricingGrid}>
            {[
              { tier: "Free", price: "$0", desc: "Digital Logbook, Currency Tracker, Alex. Always free." },
              { tier: "Standard", price: "$29/mo", desc: "Single-domain workers. My Aircraft, Training & Proficiency, and more." },
              { tier: "Professional", price: "$49/mo", desc: "Multi-domain workers. Title Search, F&I Products, Tokenomics Analyst." },
              { tier: "Enterprise", price: "$79/mo", desc: "Type-specific CoPilots. PC12-NG, King Air B200, King Air 350, C90GTx, Caravan 208B." },
            ].map(p => (
              <div key={p.tier} style={S.priceCard}>
                <div style={S.priceTier}>{p.tier}</div>
                <div style={S.priceAmount}>{p.price}</div>
                <div style={S.priceDesc}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={S.finalCta}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Meet your team at TitleApp.</h2>
        <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 28 }}>Start free. No credit card. Workers ready in seconds.</p>
        <a href={`${appBase}/meet-alex`} style={{ ...S.btnPrimary, fontSize: 16, padding: "14px 36px" }}>Start Free</a>
      </section>

      {/* ── Footer ── */}
      <footer style={S.footer}>
        <div style={S.footerInner}>
          <div style={S.footerBrand}>
            <span style={{ fontWeight: 700, color: "#111827" }}>TitleApp</span>
            <span style={{ color: "#9ca3af", fontSize: 13, marginLeft: 8 }}>The Digital Worker Platform</span>
          </div>
          <div style={S.footerLinks}>
            <a href={`${appBase}/legal/privacy-policy`} style={S.footerLink}>Privacy</a>
            <a href={`${appBase}/legal/terms-of-service`} style={S.footerLink}>Terms</a>
            <a href={`${appBase}/meet-alex?prompt=I%20want%20to%20invest`} style={S.footerLink}>Investors</a>
            <a href={`${appBase}/sandbox`} style={S.footerLink}>Creators</a>
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            The Title App LLC &middot; 1209 N Orange St, Wilmington DE 19801
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: "100vh", background: "#ffffff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#111827", overflowX: "hidden",
  },

  // Header
  header: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 32px", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
    borderBottom: "1px solid #f0f0f0",
  },
  logoWrap: { display: "flex", alignItems: "center", gap: 10 },
  logoIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: "linear-gradient(135deg, #7c3aed, #6366f1)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoText: { fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: "-0.3px" },
  headerRight: { display: "flex", alignItems: "center", gap: 24 },
  headerLink: { fontSize: 14, color: "#6b7280", textDecoration: "none" },
  headerCta: {
    fontSize: 14, fontWeight: 600, color: "white", textDecoration: "none",
    padding: "8px 20px", borderRadius: 8, background: "#7c3aed",
  },

  // Hero
  hero: { paddingTop: 140, paddingBottom: 48, background: "#ffffff" },
  heroInner: { maxWidth: 720, margin: "0 auto", textAlign: "center", padding: "0 24px" },
  heroTag: {
    fontSize: 13, fontWeight: 600, color: "#7c3aed", letterSpacing: "0.05em",
    textTransform: "uppercase", marginBottom: 20,
  },
  heroH1: { fontSize: 52, fontWeight: 800, lineHeight: 1.1, marginBottom: 12, color: "#111827", letterSpacing: "-1px" },
  heroSub: { fontSize: 22, color: "#6b7280", marginBottom: 28, fontWeight: 400 },

  // Chat bar
  chatBar: {
    display: "flex", alignItems: "center", gap: 0,
    maxWidth: 560, margin: "0 auto 16px", padding: "4px 4px 4px 20px",
    borderRadius: 16, border: "2px solid #e5e7eb", background: "#ffffff",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)", transition: "border-color 0.2s",
  },
  chatInput: {
    flex: 1, border: "none", outline: "none", fontSize: 16, color: "#111827",
    background: "transparent", padding: "12px 0", fontFamily: "inherit",
  },
  chatBtn: {
    width: 40, height: 40, borderRadius: 10, border: "none", background: "transparent",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    transition: "color 0.15s",
  },

  // Chips
  chipRow: {
    display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap",
    maxWidth: 600, margin: "0 auto",
  },
  chip: {
    fontSize: 13, color: "#6b7280", background: "#f3f4f6", border: "1px solid #e5e7eb",
    borderRadius: 20, padding: "6px 16px", cursor: "pointer",
    fontFamily: "inherit", transition: "background 0.15s, border-color 0.15s",
  },

  // Stats
  statsBar: { borderTop: "1px solid #f0f0f0", borderBottom: "1px solid #f0f0f0", marginTop: 20 },
  statsInner: {
    maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-around",
    padding: "28px 24px", flexWrap: "wrap", gap: 16,
  },
  statItem: { textAlign: "center", minWidth: 100 },
  statNum: { fontSize: 28, fontWeight: 800, color: "#111827" },
  statLabel: { fontSize: 13, color: "#9ca3af", marginTop: 2 },

  // Language section
  langSection: { padding: "20px 24px 0", textAlign: "center" },
  langLabel: { fontSize: 14, fontWeight: 600, color: "#6b7280", marginBottom: 10 },
  langPills: {
    display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap",
    maxWidth: 640, margin: "0 auto",
  },
  langPill: {
    fontSize: 11, color: "#6b7280", background: "#f9fafb", border: "1px solid #e5e7eb",
    borderRadius: 12, padding: "3px 10px",
  },

  // Sections
  section: { padding: "72px 24px", background: "#ffffff" },
  sectionInner: { maxWidth: 960, margin: "0 auto" },
  sectionH2: { fontSize: 32, fontWeight: 800, color: "#111827", textAlign: "center", marginBottom: 8 },
  sectionSub: { fontSize: 16, color: "#6b7280", textAlign: "center", marginBottom: 40 },

  // Vertical cards
  verticalGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  verticalCard: {
    display: "block", padding: "24px 20px", borderRadius: 14,
    background: "#ffffff", border: "1px solid #e5e7eb",
    textDecoration: "none", transition: "border-color 0.2s, box-shadow 0.2s",
    cursor: "pointer",
  },
  verticalName: { fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 },
  verticalDesc: { fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 16 },
  verticalFooter: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  verticalCount: { fontSize: 12, color: "#7c3aed", fontWeight: 600 },
  verticalArrow: { fontSize: 16, color: "#7c3aed" },

  // Steps
  stepsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 },
  stepCard: { padding: "28px 24px", borderRadius: 14, background: "#ffffff", border: "1px solid #e5e7eb" },
  stepNum: { fontSize: 32, fontWeight: 800, color: "#7c3aed", marginBottom: 12 },
  stepTitle: { fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 6 },
  stepDesc: { fontSize: 14, color: "#6b7280", lineHeight: 1.6 },

  // Alex
  alexCard: {
    maxWidth: 560, margin: "0 auto", padding: "32px 28px", borderRadius: 16,
    background: "#faf5ff", border: "1px solid #e9d5ff",
    textAlign: "center",
  },
  alexAvatar: {
    width: 56, height: 56, borderRadius: "50%", margin: "0 auto 8px",
    background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #0ea5e9 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  alexName: { fontSize: 18, fontWeight: 700, color: "#111827" },
  alexRole: { fontSize: 13, color: "#6b7280", marginBottom: 16 },
  alexBody: { fontSize: 14, color: "#6b7280", lineHeight: 1.7, marginBottom: 20 },

  // Pricing
  pricingGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 },
  priceCard: {
    padding: "24px 20px", borderRadius: 14,
    background: "#ffffff", border: "1px solid #e5e7eb",
    textAlign: "center",
  },
  priceTier: { fontSize: 13, fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 },
  priceAmount: { fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 8 },
  priceDesc: { fontSize: 13, color: "#6b7280", lineHeight: 1.6 },

  // Final CTA
  finalCta: { padding: "72px 24px", textAlign: "center", background: "#faf5ff" },

  // Buttons
  btnPrimary: {
    display: "inline-block", padding: "12px 28px", fontSize: 15, fontWeight: 600,
    color: "white", background: "#7c3aed", borderRadius: 10, textDecoration: "none",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  btnSecondary: {
    display: "inline-block", padding: "12px 28px", fontSize: 15, fontWeight: 600,
    color: "#6b7280", background: "#f3f4f6",
    border: "1px solid #e5e7eb", borderRadius: 10, textDecoration: "none",
  },

  // Footer
  footer: { padding: "32px 24px", borderTop: "1px solid #f0f0f0" },
  footerInner: {
    maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 12, textAlign: "center",
  },
  footerBrand: { fontSize: 15 },
  footerLinks: { display: "flex", gap: 20 },
  footerLink: { fontSize: 13, color: "#9ca3af", textDecoration: "none" },
};
