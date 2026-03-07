import React, { useState, useEffect, useRef } from "react";

const MAX_W = 1200;

export default function LandingPage({ vertical, headlines, problems, workers, testimonials, metrics, pricing, faq, promoCode }) {
  const [mobileNav, setMobileNav] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [openFaqs, setOpenFaqs] = useState(new Set());
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSent, setChatSent] = useState(false);
  const [chatEmail, setChatEmail] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formPromo, setFormPromo] = useState(promoCode || "");
  const [promoValid, setPromoValid] = useState(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [transitionStep, setTransitionStep] = useState(0);
  const [transitionActive, setTransitionActive] = useState(false);
  const [utmParams, setUtmParams] = useState({});
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  const pricingRef = useRef(null);
  const signupRef = useRef(null);

  const isMobile = windowWidth < 860;
  const isSmall = windowWidth < 640;
  const isTiny = windowWidth < 480;

  // ── Window resize listener ────────────────────────────────
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── UTM extraction ────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUtmParams({
      utm_source: params.get("utm_source") || null,
      utm_medium: params.get("utm_medium") || null,
      utm_campaign: params.get("utm_campaign") || null,
      utm_content: params.get("utm_content") || null,
      ref: params.get("ref") || null,
    });
  }, []);

  // ── Rotating headlines ────────────────────────────────────
  useEffect(() => {
    if (!headlines || headlines.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % headlines.length);
        setFade(true);
      }, 500);
    }, 6000);
    return () => clearInterval(interval);
  }, [headlines]);

  // ── Promo code validation ─────────────────────────────────
  const validatePromo = async (code) => {
    if (!code || !code.trim()) { setPromoValid(null); return; }
    try {
      const base = import.meta.env.VITE_API_BASE || "";
      const res = await fetch(`${base}/api?path=/v1/promo:validate&code=${encodeURIComponent(code)}`);
      const data = await res.json();
      setPromoValid(data.valid === true);
    } catch {
      setPromoValid(false);
    }
  };

  // ── Form submit — animated transition to sandbox ──────────
  const TRANSITION_MESSAGES = [
    "Setting up your space...",
    "Loading your industry tools...",
    "Alex is ready.",
  ];

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formEmail) return;
    setFormSubmitting(true);

    // Fire lead capture (non-blocking)
    try {
      const base = import.meta.env.VITE_API_BASE || "";
      fetch(`${base}/api?path=/v1/leads:capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          company: formCompany,
          vertical,
          promo_code: formPromo || null,
          headline_index: activeIndex,
          source: "signup_form",
          ...utmParams,
        }),
      }).catch(() => {});
    } catch {}

    // Start transition animation
    setFormSubmitted(true);
    setTransitionActive(true);
    setTransitionStep(0);

    // Store name for sandbox greeting
    if (formName) localStorage.setItem("DISPLAY_NAME", formName);

    // Animate through status messages then navigate
    setTimeout(() => setTransitionStep(1), 800);
    setTimeout(() => setTransitionStep(2), 1600);
    setTimeout(() => {
      window.location.href = "/sandbox";
    }, 2100);
  };

  // ── Chat widget send ──────────────────────────────────────
  const handleChatSend = async () => {
    if (!chatEmail) return;
    try {
      const base = import.meta.env.VITE_API_BASE || "";
      await fetch(`${base}/api?path=/v1/leads:capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: chatEmail,
          message: chatMessage,
          vertical,
          source: "chat_widget",
          ...utmParams,
        }),
      });
    } catch { /* silent */ }
    setChatSent(true);
    setTimeout(() => { setChatOpen(false); setChatSent(false); setChatEmail(""); setChatMessage(""); }, 3000);
  };

  const scrollTo = (ref) => {
    if (ref && ref.current) ref.current.scrollIntoView({ behavior: "smooth" });
  };

  const toggleFaq = (i) => {
    setOpenFaqs((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const currentHeadline = headlines && headlines[activeIndex] ? headlines[activeIndex] : { headline: "", subhead: "" };

  // ── Styles ────────────────────────────────────────────────
  const S = {
    page: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#1a202c", background: "#fff", minHeight: "100vh", overflowX: "hidden" },
    // Nav
    nav: { position: "fixed", top: 0, left: 0, right: 0, background: "#fff", borderBottom: "1px solid #e5e7eb", zIndex: 900, padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" },
    navInner: { maxWidth: MAX_W, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" },
    logo: { fontWeight: 700, fontSize: 20, color: "#7c3aed", textDecoration: "none" },
    navLinks: { display: isMobile ? "none" : "flex", gap: 28, alignItems: "center" },
    navLink: { color: "#4b5563", textDecoration: "none", fontSize: 14, fontWeight: 500, cursor: "pointer", background: "none", border: "none", padding: 0, fontFamily: "inherit" },
    navRight: { display: "flex", gap: 16, alignItems: "center" },
    signIn: { color: "#4b5563", textDecoration: "none", fontSize: 14, fontWeight: 500 },
    startBtn: { background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 44 },
    hamburger: { display: isMobile ? "flex" : "none", background: "none", border: "none", cursor: "pointer", flexDirection: "column", gap: 4, padding: 8 },
    hamburgerLine: { width: 20, height: 2, background: "#1a202c", borderRadius: 1 },
    mobileMenu: { position: "fixed", top: 64, left: 0, right: 0, background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "16px 24px", zIndex: 899, display: "flex", flexDirection: "column", gap: 16 },
    mobileLink: { color: "#4b5563", textDecoration: "none", fontSize: 16, fontWeight: 500, padding: "8px 0" },
    // Hero
    hero: { paddingTop: 128, paddingBottom: 80, textAlign: "center", paddingLeft: 24, paddingRight: 24 },
    heroHeadline: { fontSize: isMobile ? "1.8rem" : "2.8rem", fontWeight: 700, lineHeight: 1.2, maxWidth: 800, margin: "0 auto 16px" },
    heroSub: { fontSize: isMobile ? 16 : 20, color: "#64748b", maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.5 },
    heroCta: { background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", borderRadius: 8, padding: "14px 40px", fontSize: 16, fontWeight: 600, cursor: "pointer", minHeight: 48, width: 200 },
    // Sections
    section: (bg) => ({ background: bg || "#fff", padding: isMobile ? "48px 24px" : "80px 24px" }),
    sectionInner: { maxWidth: MAX_W, margin: "0 auto" },
    sectionTitle: { fontSize: isMobile ? 22 : 28, fontWeight: 700, marginBottom: 40, textAlign: "center" },
    // Problem cards
    problemGrid: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 24 },
    problemCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 24 },
    problemTitle: { fontSize: 16, fontWeight: 600, marginBottom: 8 },
    problemDesc: { fontSize: 14, color: "#64748b", lineHeight: 1.6 },
    // Worker cards
    workerGrid: { display: isMobile ? "flex" : "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24, overflowX: isMobile ? "auto" : "visible", paddingBottom: isMobile ? 8 : 0 },
    workerCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 24, minWidth: isMobile ? 260 : "auto", flexShrink: 0, transition: "box-shadow 0.2s ease" },
    workerName: { fontSize: 16, fontWeight: 600, marginBottom: 8 },
    workerDesc: { fontSize: 14, color: "#64748b", lineHeight: 1.6, marginBottom: 12 },
    workerPrice: { display: "inline-block", background: "#f5f3ff", color: "#7c3aed", fontSize: 13, fontWeight: 600, padding: "4px 12px", borderRadius: 12, marginBottom: 12 },
    workerLink: { color: "#7c3aed", fontSize: 14, fontWeight: 500, textDecoration: "none" },
    // Testimonials
    testimonialGrid: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 24, marginBottom: 40 },
    testimonialCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 24 },
    testimonialQuote: { fontSize: 15, fontStyle: "italic", color: "#374151", lineHeight: 1.6, marginBottom: 16 },
    testimonialAuthor: { fontSize: 14, fontWeight: 600, color: "#1a202c" },
    testimonialRole: { fontSize: 13, color: "#64748b" },
    metricsBar: { display: "flex", justifyContent: "center", gap: isMobile ? 24 : 48, flexWrap: "wrap" },
    metricBlock: { textAlign: "center" },
    metricValue: { fontSize: isMobile ? 28 : 36, fontWeight: 700, color: "#7c3aed" },
    metricLabel: { fontSize: 14, color: "#64748b", marginTop: 4 },
    // Guarantee
    guarantee: { background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", padding: isMobile ? "40px 24px" : "60px 24px", textAlign: "center" },
    guaranteeText: { fontSize: isMobile ? 16 : 20, fontWeight: 500, maxWidth: 700, margin: "0 auto", lineHeight: 1.5 },
    // Referral
    referral: { background: "#f5f3ff", padding: isMobile ? "40px 24px" : "48px 24px", textAlign: "center" },
    referralText: { fontSize: isMobile ? 16 : 18, color: "#1a202c", marginBottom: 12 },
    referralLink: { color: "#7c3aed", fontWeight: 600, textDecoration: "none", fontSize: 14 },
    // Pricing
    pricingGrid: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${Math.min(pricing?.length || 2, 3)}, 1fr)`, gap: 24, maxWidth: pricing?.length === 2 ? 640 : 960, margin: "0 auto" },
    pricingCard: (highlighted) => ({
      background: "#fff",
      border: highlighted ? "2px solid #7c3aed" : "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 32,
      position: "relative",
      display: "flex",
      flexDirection: "column",
    }),
    pricingBadge: { position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#7c3aed", color: "#fff", fontSize: 12, fontWeight: 600, padding: "4px 16px", borderRadius: 12 },
    pricingName: { fontSize: 18, fontWeight: 600, marginBottom: 8 },
    pricingPrice: { fontSize: 36, fontWeight: 700, color: "#1a202c" },
    pricingPeriod: { fontSize: 14, color: "#64748b", fontWeight: 400 },
    pricingFeatures: { listStyle: "none", padding: 0, margin: "24px 0", flex: 1 },
    pricingFeature: { fontSize: 14, color: "#4b5563", padding: "6px 0", display: "flex", alignItems: "flex-start", gap: 8 },
    pricingCta: (highlighted) => ({
      background: highlighted ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "#fff",
      color: highlighted ? "#fff" : "#7c3aed",
      border: highlighted ? "none" : "1px solid #7c3aed",
      borderRadius: 8,
      padding: "12px 24px",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      minHeight: 44,
      width: "100%",
    }),
    promoBadge: { background: "#f5f3ff", color: "#7c3aed", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 8, marginTop: 8, display: "inline-block" },
    // Signup form
    formWrap: { maxWidth: 480, margin: "0 auto" },
    input: { width: "100%", padding: "12px 16px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15, outline: "none", boxSizing: "border-box", minHeight: 44 },
    inputGroup: { marginBottom: 16 },
    inputLabel: { display: "block", fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 6 },
    promoStatus: (valid) => ({ fontSize: 13, marginTop: 4, color: valid ? "#16a34a" : "#dc2626", fontWeight: 500 }),
    submitBtn: { background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", borderRadius: 8, padding: "14px 24px", fontSize: 16, fontWeight: 600, cursor: "pointer", minHeight: 48, width: "100%" },
    successMsg: { textAlign: "center", fontSize: 18, color: "#16a34a", fontWeight: 600, padding: "40px 0" },
    // FAQ
    faqItem: { borderBottom: "1px solid #e5e7eb" },
    faqQuestion: { width: "100%", textAlign: "left", background: "none", border: "none", padding: "20px 0", fontSize: 16, fontWeight: 500, cursor: "pointer", color: "#1a202c", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "inherit" },
    faqAnswer: { fontSize: 15, color: "#64748b", lineHeight: 1.6, paddingBottom: 20 },
    faqChevron: (open) => ({ fontSize: 18, color: "#64748b", transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }),
    // Footer
    footer: { background: "#1a202c", color: "#9ca3af", padding: isMobile ? "48px 24px" : "64px 24px" },
    footerGrid: { maxWidth: MAX_W, margin: "0 auto", display: "grid", gridTemplateColumns: isTiny ? "1fr" : isSmall ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 32, marginBottom: 40 },
    footerColTitle: { color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 16 },
    footerLink: { display: "block", color: "#9ca3af", textDecoration: "none", fontSize: 13, padding: "4px 0" },
    footerBottom: { maxWidth: MAX_W, margin: "0 auto", borderTop: "1px solid #374151", paddingTop: 24, textAlign: "center" },
    footerBottomText: { fontSize: 13, color: "#6b7280", marginBottom: 8 },
    // Chat widget
    chatBtn: { position: "fixed", bottom: 24, right: 24, zIndex: 1000, width: 56, height: 56, borderRadius: 28, background: "#7c3aed", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" },
    chatPanel: { position: "fixed", bottom: 88, right: 24, zIndex: 1001, width: 320, height: 400, background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" },
    chatHeader: { padding: "20px 20px 12px", borderBottom: "1px solid #e5e7eb" },
    chatBody: { padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 12 },
    chatInput: { width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", minHeight: 44 },
    chatTextarea: { width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", resize: "none", flex: 1, minHeight: 80, fontFamily: "inherit" },
    chatSendBtn: { background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 44 },
    chatSuccess: { textAlign: "center", fontSize: 15, color: "#16a34a", fontWeight: 500, padding: "40px 20px" },
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={S.page}>
      {/* ═══ GlobalNav ═══ */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <a href="https://titleapp.ai" style={S.logo}>TitleApp</a>
          <div style={S.navLinks}>
            <a href="/workers" style={S.navLink}>Workers</a>
            <a href="/developers" style={S.navLink}>Developers</a>
            <a href="/invest/room" style={S.navLink}>Investors</a>
            <button style={S.navLink} onClick={() => scrollTo(pricingRef)}>Pricing</button>
          </div>
          <div style={S.navRight}>
            {!isMobile && <a href="/login" style={S.signIn}>Sign In</a>}
            {!isMobile && <button style={S.startBtn} onClick={() => scrollTo(signupRef)}>Start Free</button>}
            <button style={S.hamburger} onClick={() => setMobileNav(!mobileNav)} aria-label="Menu">
              <span style={S.hamburgerLine} />
              <span style={S.hamburgerLine} />
              <span style={S.hamburgerLine} />
            </button>
          </div>
        </div>
      </nav>
      {mobileNav && (
        <div style={S.mobileMenu}>
          <a href="/workers" style={S.mobileLink}>Workers</a>
          <a href="/developers" style={S.mobileLink}>Developers</a>
          <a href="/invest/room" style={S.mobileLink}>Investors</a>
          <button style={{ ...S.mobileLink, background: "none", border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }} onClick={() => { setMobileNav(false); scrollTo(pricingRef); }}>Pricing</button>
          <a href="/login" style={S.mobileLink}>Sign In</a>
          <button style={{ ...S.startBtn, width: "100%", marginTop: 8 }} onClick={() => { setMobileNav(false); scrollTo(signupRef); }}>Start Free</button>
        </div>
      )}

      {/* ═══ RotatingHero ═══ */}
      <section style={S.hero}>
        <h1 style={{ ...S.heroHeadline, opacity: fade ? 1 : 0, transition: `opacity 0.4s ${fade ? "ease-in" : "ease-out"}` }}>{currentHeadline.headline}</h1>
        <p style={{ ...S.heroSub, opacity: fade ? 1 : 0, transition: `opacity 0.4s ${fade ? "ease-in" : "ease-out"}` }}>{currentHeadline.subhead}</p>
        <button style={S.heroCta} onClick={() => scrollTo(signupRef)}>Start Free</button>
      </section>

      {/* ═══ ProblemSection ═══ */}
      {problems && problems.length > 0 && (
        <section style={S.section("#f8fafc")}>
          <div style={S.sectionInner}>
            <h2 style={S.sectionTitle}>The problems we solve</h2>
            <div style={S.problemGrid}>
              {problems.map((p, i) => (
                <div key={i} style={S.problemCard}>
                  <div style={S.problemTitle}>{p.title}</div>
                  <div style={S.problemDesc}>{p.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ WorkerShowcase ═══ */}
      {workers && workers.length > 0 && (
        <section style={S.section()}>
          <div style={S.sectionInner}>
            <h2 style={S.sectionTitle}>Meet your Digital Workers</h2>
            <div style={S.workerGrid}>
              {workers.map((w, i) => (
                <div
                  key={i}
                  style={S.workerCard}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={S.workerName}>{w.name}</div>
                  <div style={S.workerDesc}>{w.description}</div>
                  <div style={S.workerPrice}>{w.price}</div>
                  <div><a href={`/workers/${w.slug}`} style={S.workerLink}>{"Learn More \u2192"}</a></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ SocialProof ═══ */}
      {((testimonials && testimonials.length > 0) || (metrics && metrics.length > 0)) && (
        <section style={S.section("#f8fafc")}>
          <div style={S.sectionInner}>
            {testimonials && testimonials.length > 0 && (
              <div style={S.testimonialGrid}>
                {testimonials.map((t, i) => (
                  <div key={i} style={S.testimonialCard}>
                    <div style={S.testimonialQuote}>"{t.quote}"</div>
                    <div style={S.testimonialAuthor}>{t.author}</div>
                    <div style={S.testimonialRole}>{t.company}{t.role ? `, ${t.role}` : ""}</div>
                  </div>
                ))}
              </div>
            )}
            {metrics && metrics.length > 0 && (
              <div style={S.metricsBar}>
                {metrics.map((m, i) => (
                  <div key={i} style={S.metricBlock}>
                    <div style={S.metricValue}>{m.value}</div>
                    <div style={S.metricLabel}>{m.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ GuaranteeBar ═══ */}
      <section style={S.guarantee}>
        <div style={S.guaranteeText}>
          Start Free. 60-Day Money Back. Cancel Anytime. Your Data Is Always Yours.
        </div>
      </section>

      {/* ═══ ReferralBanner ═══ */}
      <section style={S.referral}>
        <div style={S.referralText}>Know someone who needs this? Earn 30% recurring commission.</div>
        <a href="/referrals" style={S.referralLink}>Learn More</a>
      </section>

      {/* ═══ PricingSection ═══ */}
      {pricing && pricing.length > 0 && (
        <section ref={pricingRef} style={S.section()}>
          <div style={S.sectionInner}>
            <h2 style={S.sectionTitle}>Pricing</h2>
            <div style={S.pricingGrid}>
              {pricing.map((tier, i) => (
                <div key={i} style={S.pricingCard(tier.highlighted)}>
                  {tier.highlighted && <div style={S.pricingBadge}>Most Popular</div>}
                  <div style={S.pricingName}>{tier.name}</div>
                  <div style={{ marginBottom: 4 }}>
                    <span style={S.pricingPrice}>{tier.price}</span>
                    <span style={S.pricingPeriod}>{tier.period}</span>
                  </div>
                  {tier.highlighted && promoCode && (
                    <div style={S.promoBadge}>Code: {promoCode}</div>
                  )}
                  <ul style={S.pricingFeatures}>
                    {tier.features.map((f, j) => (
                      <li key={j} style={S.pricingFeature}>
                        <span style={{ color: "#7c3aed", fontWeight: 700, flexShrink: 0 }}>{"\u2713"}</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button style={S.pricingCta(tier.highlighted)} onClick={() => scrollTo(signupRef)}>{tier.cta}</button>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#64748b" }}>
              Both plans include the full Vibe Coding Sandbox, Alex, and the TitleApp distribution network.
            </div>
          </div>
        </section>
      )}

      {/* ═══ SignupForm ═══ */}
      <section ref={signupRef} style={S.section("#f8fafc")}>
        <div style={S.sectionInner}>
          <h2 style={S.sectionTitle}>Get started in 60 seconds</h2>
          {formSubmitted ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#1a202c", marginBottom: 20 }}>
                {TRANSITION_MESSAGES[transitionStep]}
              </div>
              <div style={{ width: "100%", maxWidth: 320, height: 6, background: "#e5e7eb", borderRadius: 3, margin: "0 auto", overflow: "hidden" }}>
                <div style={{
                  width: `${((transitionStep + 1) / TRANSITION_MESSAGES.length) * 100}%`,
                  height: "100%",
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  borderRadius: 3,
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} style={S.formWrap}>
              <div style={S.inputGroup}>
                <label style={S.inputLabel}>Name</label>
                <input style={S.input} type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Your name" />
              </div>
              <div style={S.inputGroup}>
                <label style={S.inputLabel}>Email *</label>
                <input style={S.input} type="email" required value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <div style={S.inputGroup}>
                <label style={S.inputLabel}>Company (optional)</label>
                <input style={S.input} type="text" value={formCompany} onChange={(e) => setFormCompany(e.target.value)} placeholder="Company name" />
              </div>
              <div style={S.inputGroup}>
                <label style={S.inputLabel}>Promo Code (optional)</label>
                <input
                  style={S.input}
                  type="text"
                  value={formPromo}
                  onChange={(e) => setFormPromo(e.target.value)}
                  onBlur={() => validatePromo(formPromo)}
                  placeholder="e.g. AUTOLAUNCH"
                />
                {promoValid !== null && (
                  <div style={S.promoStatus(promoValid)}>{promoValid ? "Valid" : "Invalid"}</div>
                )}
              </div>
              <button type="submit" style={S.submitBtn} disabled={formSubmitting}>
                {formSubmitting ? "Submitting..." : "Start Free"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      {faq && faq.length > 0 && (
        <section style={S.section()}>
          <div style={{ ...S.sectionInner, maxWidth: 720 }}>
            <h2 style={S.sectionTitle}>Frequently asked questions</h2>
            {faq.map((item, i) => (
              <div key={i} style={S.faqItem}>
                <button style={S.faqQuestion} onClick={() => toggleFaq(i)}>
                  <span>{item.question}</span>
                  <span style={S.faqChevron(openFaqs.has(i))}>{"\u25BE"}</span>
                </button>
                {openFaqs.has(i) && <div style={S.faqAnswer}>{item.answer}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ GlobalFooter ═══ */}
      <footer style={S.footer}>
        <div style={S.footerGrid}>
          <div>
            <div style={S.footerColTitle}>Product</div>
            <a href="/workers" style={S.footerLink}>Workers</a>
            <a href="#" onClick={(e) => { e.preventDefault(); scrollTo(pricingRef); }} style={S.footerLink}>Pricing</a>
            <a href="/developers" style={S.footerLink}>Developers</a>
            <a href="/pilot" style={S.footerLink}>Pilot Suite</a>
            <a href="/workers" style={S.footerLink}>Marketplace</a>
          </div>
          <div>
            <div style={S.footerColTitle}>Company</div>
            <a href="https://titleapp.ai" style={S.footerLink}>About</a>
            <a href="/invest/room" style={S.footerLink}>Investors</a>
            <a href="#" style={S.footerLink}>Blog</a>
            <a href="mailto:sean@titleapp.ai" style={S.footerLink}>Contact</a>
          </div>
          <div>
            <div style={S.footerColTitle}>Programs</div>
            <a href="/referrals" style={S.footerLink}>Referral Program</a>
            <a href="/developers" style={S.footerLink}>Developer Program</a>
            <a href="#" style={S.footerLink}>Bug Bounty</a>
            <a href="/apply" style={S.footerLink}>Creators</a>
          </div>
          <div>
            <div style={S.footerColTitle}>Support</div>
            <a href="#" style={S.footerLink}>Help Center</a>
            <a href="#" style={S.footerLink}>Status</a>
            <a href="#" style={S.footerLink}>Privacy Policy</a>
            <a href="#" style={S.footerLink}>Terms</a>
          </div>
        </div>
        <div style={S.footerBottom}>
          <div style={S.footerBottomText}>&copy; 2026 TitleApp LLC | sean@titleapp.ai | +1 707-654-9864</div>
          <div style={{ ...S.footerBottomText, fontSize: 12 }}>Start Free. 60-Day Money Back. Your Data Is Always Yours.</div>
        </div>
      </footer>

      {/* ═══ ChatWidget ═══ */}
      <button style={S.chatBtn} onClick={() => setChatOpen(!chatOpen)} aria-label="Chat with Alex">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </button>
      {chatOpen && (
        <div style={S.chatPanel}>
          <div style={S.chatHeader}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1a202c" }}>Hi! I'm Alex.</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>How can I help you get started?</div>
          </div>
          {chatSent ? (
            <div style={S.chatSuccess}>Thanks! Alex will follow up shortly.</div>
          ) : (
            <div style={S.chatBody}>
              <input
                style={S.chatInput}
                type="email"
                placeholder="Your email"
                value={chatEmail}
                onChange={(e) => setChatEmail(e.target.value)}
              />
              <textarea
                style={S.chatTextarea}
                placeholder="What are you looking for?"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
              <button style={S.chatSendBtn} onClick={handleChatSend}>Send</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
